"""API views for CrisisLens MVP."""
from __future__ import annotations

import os

import requests
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied

from django.http import HttpResponse
from api.models import County, SubCounty, FloodAlert, AuditLog, Report
from api.permissions import IsCountyOfficer, IsResponder, IsCountyMember, _NAT, IsAnalyst
from api.serializers import (
    CountyListSerializer,
    CountyDetailSerializer,
    SubCountyListSerializer,
    SubCountyDetailSerializer,
    FloodAlertSerializer,
    ReportSerializer,

    AIFeedbackRequest,
    AIFeedbackResponse,
    DroughtPredictionRequest,
    DroughtPredictionResponse,
    FloodPredictionRequest,
    FloodPredictionResponse,
)
from api.services import FLOOD_INDICATORS, score_drought, score_flood


def _fallback_ai_response(payload: dict) -> str:
    """Provide an MVP fallback response when the AI service is unavailable."""
    area = payload.get("area") or "countywide overview"
    question = (payload.get("question") or "").lower()
    wildlife_note = (
        "- Wildlife: likely presence of grazing wildlife near water sources; "
        "advise avoiding nighttime travel and securing food stores.\n"
        if "wild" in question or "animal" in question
        else ""
    )

    return (
        f"CrisisLens fallback briefing for {payload['county']} ({payload['risk_type']}):\n"
        f"- Focus area: {area}\n"
        "- Timing: impacts expected within 2-4 weeks, with escalation possible two weeks later.\n"
        "- Recommendations: relocate vulnerable livestock, prepare emergency supplies, and "
        "coordinate local alerts.\n"
        "- Food security: price volatility likely within 4-6 weeks; advise stocking staples and "
        "monitoring supply chain disruptions.\n"
        f"{wildlife_note}"
        f"- User question noted: {payload.get('question', 'N/A')}"
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def drought_predict(request):
    serializer = DroughtPredictionRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = score_drought(**serializer.validated_data)
    response = DroughtPredictionResponse(payload)
    return Response(response.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def flood_predict(request):
    serializer = FloodPredictionRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = score_flood(**serializer.validated_data)
    response = FloodPredictionResponse(payload)
    return Response(response.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def flood_scenario(request):
    """Return pre-scored flood risk for a specific Lake Victoria sub-county.

    Query params:
        county (str): County name, e.g. "Kisumu"
        area   (str): Sub-county name, e.g. "Nyando"

    Returns the same shape as /api/flood/predict/ plus the raw indicator values
    so the frontend can display them in the risk panel.
    """
    county = request.query_params.get("county", "").strip()
    area = request.query_params.get("area", "").strip()
    key = (county, area)

    if key not in FLOOD_INDICATORS:
        return Response(
            {"error": f"No flood scenario data for county='{county}', area='{area}'."},
            status=status.HTTP_404_NOT_FOUND,
        )

    indicators = FLOOD_INDICATORS[key]
    scored = score_flood(**indicators)
    response_data = FloodPredictionResponse(scored)
    return Response(
        {**response_data.data, "indicators": indicators},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_feedback(request):
    serializer = AIFeedbackRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        fallback = _fallback_ai_response(payload)
        output = AIFeedbackResponse({"response": fallback})
        return Response(output.data, status=status.HTTP_200_OK)

    prompt = (
        "You are CrisisLens, an early warning analyst. Answer the user's question directly and "
        "clearly, and include any helpful context about the county/area if it improves the answer. "
        f"County: {payload['county']}, area: {payload.get('area', 'N/A')}, "
        f"risk type: {payload['risk_type']}. "
        "If asked, estimate how many people may be affected, describe natural resources, explain "
        "how resources can support crisis response, and provide a 1-month outlook. "
        "Also include affected towns/areas, estimated % affected, timing (near-term and follow-on), "
        "likely impacts, food insecurity implications (prices/supply chains), and clear "
        "recommendations that are actionable for residents and responders. "
        "Be creative but realistic, and respond in short bullet points. "
        f"User question: {payload['question']}"
    )

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a crisis response analyst."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 400,
        },
        timeout=30,
    )

    if response.status_code != 200:
        fallback = _fallback_ai_response(payload)
        output = AIFeedbackResponse({"response": fallback})
        return Response(output.data, status=status.HTTP_200_OK)

    data = response.json()
    message = data["choices"][0]["message"]["content"]
    output = AIFeedbackResponse({"response": message})
    return Response(output.data, status=status.HTTP_200_OK)


class CountyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return CountyListSerializer
        return CountyDetailSerializer

    def get_queryset(self):
        qs = County.objects.prefetch_related("sub_counties__floodprediction_set").all()
        user = self.request.user
        if getattr(user, "role", None) == "county_officer":
            if user.county_id:
                qs = qs.filter(id=user.county_id)
            else:
                qs = qs.none()
        return qs

    @action(detail=True, methods=["get"])
    def risk(self, request, pk=None):
        county = self.get_object()
        subs = list(county.sub_counties.all())
        
        max_prob = 0.0
        min_lead = 7
        cats = []
        conf = 0.0
        latest_time = None
        
        for sub in subs:
            pred = sub.floodprediction_set.order_by("-predicted_at").first()
            if pred:
                max_prob = max(max_prob, pred.flood_probability)
                min_lead = min(min_lead, pred.lead_time_days)
                conf = max(conf, pred.confidence)
                cats.append(pred.risk_category)
                if not latest_time or pred.predicted_at > latest_time:
                    latest_time = pred.predicted_at
                    
        if max_prob >= 75 or "High" in cats:
            cat = "High"
        elif max_prob >= 50 or "Moderate" in cats:
            cat = "Moderate"
        elif cats:
            cat = "Low"
        else:
            cat = "Normal"
            
        return Response({
            "flood_probability": max_prob,
            "risk_category": cat,
            "lead_time_days": min_lead,
            "confidence": conf,
            "predicted_at": latest_time.isoformat() if latest_time else None,
        })


class SubCountyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return SubCountyListSerializer
        return SubCountyDetailSerializer

    def get_queryset(self):
        qs = SubCounty.objects.prefetch_related("floodprediction_set", "floodobservation_set").all()
        
        county_id = self.request.query_params.get("county")
        if county_id:
            qs = qs.filter(county_id=county_id)
            
        user = self.request.user
        if getattr(user, "role", None) == "county_officer":
            if user.county_id:
                qs = qs.filter(county_id=user.county_id)
            else:
                qs = qs.none()
        return qs


class AlertPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class FloodAlertViewSet(viewsets.ModelViewSet):
    serializer_class = FloodAlertSerializer
    pagination_class = AlertPagination

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsCountyOfficer()]
        elif self.action == "acknowledge":
            return [IsAuthenticated(), IsResponder()]
        elif self.action in ["resolve", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsCountyOfficer(), IsCountyMember()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = FloodAlert.objects.select_related("county", "sub_county", "created_by").all()
        user = self.request.user
        role = getattr(user, "role", None)

        # county_officer & responder only see their own county
        if user.county_id and role not in _NAT:
            qs = qs.filter(county_id=user.county_id)

        county_id = self.request.query_params.get("county")
        if county_id:
            qs = qs.filter(county_id=county_id)
            
        severity = self.request.query_params.get("severity")
        if severity:
            qs = qs.filter(severity=severity)
            
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        role = getattr(user, "role", None)
        county = serializer.validated_data.get("county")
        
        if role == "county_officer" and county.id != user.county_id:
            raise PermissionDenied("You can only create alerts for your own county.")
            
        alert = serializer.save(created_by=user)
        AuditLog.log(user, "Alert Created", alert)

    @action(detail=True, methods=["patch"])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        if alert.status != "active":
            return Response(
                {"detail": "Alert is already acknowledged or resolved."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alert.status = "acknowledged"
        alert.acknowledged_at = timezone.now()
        alert.acknowledged_by = request.user
        alert.save(update_fields=["status", "acknowledged_at", "acknowledged_by"])
        
        AuditLog.log(request.user, "Alert Acknowledged", alert)
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=["patch"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        if alert.status == "resolved":
            return Response({"detail": "Alert is already resolved."}, status=status.HTTP_400_BAD_REQUEST)
            
        alert.status = "resolved"
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["status", "resolved_at"])
        
        AuditLog.log(request.user, "Alert Resolved", alert)
        return Response(self.get_serializer(alert).data)

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated, IsAnalyst]
    
    def get_queryset(self):
        qs = Report.objects.select_related("county", "generated_by").all()
        county_id = self.request.query_params.get("county")
        report_type = self.request.query_params.get("report_type")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if county_id:
            qs = qs.filter(county_id=county_id)
        if report_type:
            qs = qs.filter(report_type=report_type)
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)
            
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        county = serializer.validated_data.get("county")
        user = self.request.user
        
        risk_summary = {}
        recommendations = "Standard recommendations apply."
        
        if county:
            subs = list(county.sub_counties.prefetch_related("floodprediction_set").all())
            max_prob = 0.0
            areas = []
            for sub in subs:
                pred = sub.floodprediction_set.order_by("-predicted_at").first()
                if pred:
                    max_prob = max(max_prob, pred.flood_probability)
                    areas.append({
                        "name": sub.name,
                        "probability": pred.flood_probability,
                        "category": pred.risk_category
                    })
            areas.sort(key=lambda x: x["probability"], reverse=True)
            
            risk_summary = {
                "level": "County",
                "county_name": county.name,
                "highest_probability": max_prob,
                "top_areas": areas[:5]
            }
            if max_prob >= 75:
                recommendations = "Immediate evacuation and resource mobilization required in high-risk sub-counties."
            elif max_prob >= 50:
                recommendations = "Heightened monitoring and preparation of emergency supplies."
        else:
            counties = County.objects.prefetch_related("sub_counties__floodprediction_set").all()
            top_counties = []
            for c in counties:
                subs = list(c.sub_counties.all())
                c_max = 0.0
                for sub in subs:
                    pred = sub.floodprediction_set.order_by("-predicted_at").first()
                    if pred and pred.flood_probability > c_max:
                        c_max = pred.flood_probability
                top_counties.append({"name": c.name, "probability": c_max})
            
            top_counties.sort(key=lambda x: x["probability"], reverse=True)
            risk_summary = {
                "level": "National",
                "top_counties": top_counties[:5]
            }
            recommendations = "Allocate national resources to top 5 at-risk counties."

        serializer.save(
            generated_by=user,
            risk_summary=risk_summary,
            recommendations=recommendations
        )
        AuditLog.log(user, "Report Generated", serializer.instance)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        import json
        import csv
        from django.http import HttpResponse
        report = self.get_object()
        
        fmt = request.query_params.get("fmt", "pdf").lower()
        
        if fmt == "csv":
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="report_{report.id}.csv"'
            writer = csv.writer(response)
            
            summary = report.risk_summary
            
            writer.writerow(['Report Title', report.title])
            writer.writerow(['Generated By', report.generated_by.get_full_name() if report.generated_by else 'System'])
            writer.writerow(['Date', report.created_at.strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow([])
            
            if summary.get("level") == "County":
                writer.writerow(['Level', 'County (' + summary.get("county_name", "") + ')'])
                writer.writerow(['Highest Probability', summary.get("highest_probability", 0)])
                writer.writerow([])
                writer.writerow(['Area Name', 'Risk Probability', 'Category'])
                for area in summary.get("top_areas", []):
                    writer.writerow([area.get("name"), f"{area.get('probability', 0)}%", area.get("category")])
            else:
                writer.writerow(['Level', 'National Overview'])
                writer.writerow([])
                writer.writerow(['County Name', 'Max Risk Probability'])
                for county in summary.get("top_counties", []):
                    writer.writerow([county.get("name"), f"{county.get('probability', 0)}%"])
                    
            writer.writerow([])
            writer.writerow(['Recommendations', report.recommendations])
            return response
            
        # Default PDF Generation using reportlab
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="report_{report.id}.pdf"'
        
        doc = SimpleDocTemplate(response, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph(report.title, styles['Title']))
        story.append(Spacer(1, 12))
        
        gen_by = report.generated_by.get_full_name() if report.generated_by else 'System'
        date_str = report.created_at.strftime('%B %d, %Y')
        
        story.append(Paragraph(f"Generated by: {gen_by}", styles['Normal']))
        story.append(Paragraph(f"Date: {date_str}", styles['Normal']))
        story.append(Spacer(1, 24))

        story.append(Paragraph("Risk Summary", styles['Heading2']))
        
        summary = report.risk_summary
        table_data = []
        
        if summary.get("level") == "County":
            # Columns: Area, Probability, Category
            table_data.append(["Sub-County Area", "Probability", "Risk Level"])
            for area in summary.get("top_areas", []):
                table_data.append([
                    area.get("name"), 
                    f"{area.get('probability', 0)}%", 
                    area.get("category")
                ])
        else:
            # Columns: County, Max Probability
            table_data.append(["County Name", "Max Risk Probability"])
            for county in summary.get("top_counties", []):
                table_data.append([
                    county.get("name"), 
                    f"{county.get('probability', 0)}%"
                ])

        if table_data:
            from reportlab.platypus import Table, TableStyle
            from reportlab.lib import colors
            
            t = Table(table_data, hAlign='LEFT', colWidths=[200, 100, 100] if len(table_data[0])==3 else [200, 150])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(t)
        else:
            story.append(Paragraph("No risk data available for this report.", styles['Normal']))

        story.append(Spacer(1, 24))

        story.append(Paragraph("Recommendations", styles['Heading2']))
        story.append(Paragraph(report.recommendations.replace('\n', '<br/>'), styles['Normal']))

        doc.build(story)
        return response
