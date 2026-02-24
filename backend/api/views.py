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

from api.models import County, SubCounty, FloodAlert, AuditLog
from api.permissions import IsCountyOfficer, IsResponder, IsCountyMember, _NAT
from api.serializers import (
    CountyListSerializer,
    CountyDetailSerializer,
    SubCountyListSerializer,
    SubCountyDetailSerializer,
    FloodAlertSerializer,

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
