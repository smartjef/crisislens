"""API views for CrisisLens MVP."""
from __future__ import annotations

import json as _json
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
from api.models import (
    County, SubCounty, FloodAlert, AuditLog, Report, AIChatMessage, AIRequestLog,
    Incident, IncidentUpdate, FieldUnit, FieldUnitPing,
    CameraFeed, SocialIntelItem, WeatherObservation,
    BroadcastRecipient, EarlyWarningBroadcast, AnnotatedZone,
)
from api.permissions import IsCountyOfficer, IsResponder, IsCountyMember, _NAT, IsAnalyst, IsNationalOps
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
    AIChatMessageSerializer,
    AIChatRequestSerializer,
    IncidentSerializer,
    IncidentUpdateSerializer,
    FieldUnitSerializer,
    FieldUnitPingSerializer,
    CameraFeedSerializer,
    SocialIntelItemSerializer,
    WeatherObservationSerializer,
    BroadcastRecipientSerializer,
    EarlyWarningBroadcastSerializer,
    AnnotatedZoneSerializer,
)
from api.services import FLOOD_INDICATORS, score_drought, score_flood

# ── Kenya-specific expert system prompt used by all AI endpoints ────────────
CRISISLENS_SYSTEM_PROMPT = """\
You are CrisisLens AI, a Kenya Government early-warning decision-support analyst.
You specialise in flood and drought risk for Kenya's monitored counties:
  Homa Bay, Kajiado, Kiambu, Kisumu, Machakos, Nairobi, Siaya.

Key geography and hydrology:
- Kisumu, Siaya, Homa Bay: Lake Victoria basin — flooding driven by lake levels,
  Nyando/Sondu/Awach rivers, and Indian Ocean rainfall patterns (March–May, Oct–Dec).
- Nairobi, Kiambu: Athi River basin — flash-flooding in urban low-lands (Mathare,
  Mukuru, Kibera) and Ngong/Ruiru rivers during heavy rains.
- Machakos, Kajiado: Semi-arid; drought primary risk; flash-flooding when El Niño active.

Critical infrastructure at risk:
- Nyando Bridge (Kisumu): isolates basin at water level > 2.1 m
- Ahero-Kisumu highway: floods when Nyando River overtops banks
- Nairobi drainage: Ngong River has 20-year flood return period in informal settlements
- Kajiado/Machakos: Mombasa road corridor vulnerable to washouts

Institutional context:
- NDMA (National Drought Management Authority) issues county-level drought alerts
- County governments activate Disaster Prevention & Preparedness (DPP) plans
- Kenya Red Cross and WFP operate relief corridors; pre-position at county level
- Population data: Kisumu ~1.2M, Homa Bay ~1.1M, Nairobi ~4.4M, Siaya ~1M,
  Kiambu ~2.4M, Machakos ~1.5M, Kajiado ~1.2M

Response style:
- Use short bullet points; be direct and actionable
- Always state timing: near-term (0–7 days), medium (7–30 days)
- Tailor recommendations to the user's role (officer, responder, analyst)
- If live probability data is provided, reference it explicitly
- Flag data gaps clearly; never fabricate statistics
- Respond in English; use standard Kenya emergency terminology
"""


CRISISLENS_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_active_alerts",
            "description": "Get current active flood alerts, optionally filtered by county",
            "parameters": {
                "type": "object",
                "properties": {
                    "county_name": {"type": "string", "description": "County name to filter by, or empty for all"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_county_risk",
            "description": "Get current flood risk scores and probabilities for a county's sub-counties",
            "parameters": {
                "type": "object",
                "properties": {
                    "county_name": {"type": "string", "description": "Name of the county"}
                },
                "required": ["county_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_incidents",
            "description": "Get recent open or active incidents",
            "parameters": {
                "type": "object",
                "properties": {
                    "county_name": {"type": "string", "description": "Filter by county name, or empty for all"},
                    "limit": {"type": "integer", "description": "Max number of incidents to return", "default": 5}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_social_intel_summary",
            "description": "Get social media and news intelligence summary for a county in the last 6 hours",
            "parameters": {
                "type": "object",
                "properties": {
                    "county_name": {"type": "string", "description": "County name"}
                },
                "required": []
            }
        }
    }
]


def _tool_get_active_alerts(county_name=""):
    qs = FloodAlert.objects.filter(status='active').select_related('county').order_by('-created_at')[:10]
    if county_name:
        qs = qs.filter(county__name__icontains=county_name)
    return [{'id': a.id, 'title': a.title, 'severity': a.severity, 'county': a.county.name, 'created_at': a.created_at.isoformat()} for a in qs]


def _tool_get_county_risk(county_name):
    from api.models import FloodPrediction
    county = County.objects.filter(name__icontains=county_name).first()
    if not county:
        return {'error': f'County {county_name} not found'}
    subs = SubCounty.objects.filter(county=county).prefetch_related('floodprediction_set')
    result = []
    for sub in subs:
        pred = sub.floodprediction_set.order_by('-predicted_at').first()
        if pred:
            result.append({'sub_county': sub.name, 'probability': pred.flood_probability, 'risk_category': pred.risk_category, 'lead_time_days': pred.lead_time_days})
    return result


def _tool_get_recent_incidents(county_name="", limit=5):
    qs = Incident.objects.filter(status__in=['open', 'active']).select_related('county').order_by('-created_at')[:limit]
    if county_name:
        qs = qs.filter(county__name__icontains=county_name)
    return [{'id': i.id, 'title': i.title, 'severity': i.severity, 'status': i.status, 'county': i.county.name, 'affected_population': i.affected_population} for i in qs]


def _tool_get_social_intel_summary(county_name=""):
    from django.utils import timezone
    from datetime import timedelta
    since = timezone.now() - timedelta(hours=6)
    qs = SocialIntelItem.objects.filter(ingested_at__gte=since)
    if county_name:
        qs = qs.filter(county__name__icontains=county_name)
    return {'total': qs.count(), 'urgent': qs.filter(sentiment='urgent').count(), 'negative': qs.filter(sentiment='negative').count(), 'top_items': list(qs.values('title', 'sentiment', 'source')[:3])}


TOOL_FUNCTIONS = {
    'get_active_alerts': _tool_get_active_alerts,
    'get_county_risk': _tool_get_county_risk,
    'get_recent_incidents': _tool_get_recent_incidents,
    'get_social_intel_summary': _tool_get_social_intel_summary,
}


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
        f"County: {payload['county']}, Area: {payload.get('area', 'N/A')}, "
        f"Risk type: {payload['risk_type']}.\n"
        "Answer the user's question directly. Include: affected towns/areas, "
        "estimated people affected, timing (near-term and medium-term), "
        "food insecurity or supply-chain implications if relevant, "
        "and specific actionable recommendations for residents and responders.\n"
        f"User question: {payload['question']}"
    )

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": CRISISLENS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.5,
            "max_tokens": 500,
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


class AIChatViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # Fetch last 20 messages for this user
        messages = AIChatMessage.objects.filter(user=request.user).order_by("-timestamp")[:20]
        serializer = AIChatMessageSerializer(reversed(list(messages)), many=True)
        return Response(serializer.data)

    def create(self, request):
        # 1. Rate Limiting (50/hr)
        hour_ago = timezone.now() - timezone.timedelta(hours=1)
        count = AIRequestLog.objects.filter(user=request.user, timestamp__gte=hour_ago).count()
        if count >= 50:
            return Response(
                {"error": "AI Rate Limit Exceeded: 50 requests per hour. Please wait."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        serializer = AIChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        # Log hit
        AIRequestLog.objects.create(user=request.user)

        # Save user message
        AIChatMessage.objects.create(user=request.user, message=payload["message"], is_ai=False)

        # 2. Extract Context
        role = getattr(request.user, 'role', 'analyst')
        county = payload.get("county") or "National"
        area = payload.get("area") or "General"

        # Role-specific focus instruction
        if role == 'responder':
            role_focus = "Focus on tactical evacuation safety, immediate field procedures, and logistics (staging points, access roads, relief corridors)."
        elif role == 'analyst':
            role_focus = "Focus on hydrological trends, model assumptions, confidence intervals, and data-driven forecasting."
        elif role == 'county_officer':
            role_focus = "Focus on county-level response coordination, resource mobilisation, inter-agency communication, and policy decisions."
        else:
            role_focus = "Provide a high-level situational overview suitable for national-level decision makers."

        # 3. Inject live DB risk data for the county
        from api.models import FloodPrediction
        live_risk_lines = []
        try:
            county_obj = County.objects.filter(name__iexact=county).first()
            if county_obj:
                subs = SubCounty.objects.filter(county=county_obj).prefetch_related("floodprediction_set")
                for sub in subs:
                    pred = sub.floodprediction_set.order_by("-predicted_at").first()
                    if pred:
                        live_risk_lines.append(
                            f"  - {sub.name}: {pred.flood_probability:.0f}% ({pred.risk_category}), {pred.lead_time_days}d lead"
                        )
                active_alerts_count = FloodAlert.objects.filter(county=county_obj, status="active").count()
            else:
                active_alerts_count = FloodAlert.objects.filter(status="active").count()
        except Exception:
            live_risk_lines = []
            active_alerts_count = 0

        live_data_block = ""
        if live_risk_lines:
            live_data_block = (
                f"\n\nLIVE DATABASE SNAPSHOT (use this data explicitly in your answer):"
                f"\nCounty: {county} — Active alerts: {active_alerts_count}"
                f"\nSub-county flood probabilities:\n" + "\n".join(live_risk_lines)
            )

        # 4. Recent conversation history (last 10 exchanges)
        history_msgs = AIChatMessage.objects.filter(user=request.user).order_by("-timestamp")[1:11]
        history_text = "\n".join(
            [f"{'AI' if m.is_ai else 'User'}: {m.message}" for m in reversed(list(history_msgs))]
        )

        prompt = (
            f"User role: {role}. {role_focus}\n"
            f"Current focus: County={county}, Sub-county={area}.{live_data_block}\n"
            f"\nConversation history:\n{history_text}\n"
            f"\nUser question: {payload['message']}"
        )

        # 5. Call OpenAI
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            ai_response = _fallback_ai_response({**payload, "risk_type": "flood", "question": payload["message"]})
        else:
            try:
                # Build messages for tool calling
                messages_for_api = [
                    {"role": "system", "content": CRISISLENS_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ]

                # First call with tools
                res = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "gpt-4o",
                        "messages": messages_for_api,
                        "tools": CRISISLENS_TOOLS,
                        "tool_choice": "auto",
                        "temperature": 0.5,
                        "max_tokens": 1200,
                    },
                    timeout=30
                )

                if res.status_code != 200:
                    ai_response = f"AI Service Error: {res.text[:100]}"
                else:
                    result = res.json()
                    choice = result["choices"][0]

                    # Handle tool calls
                    if choice.get("finish_reason") == "tool_calls":
                        tool_calls = choice["message"].get("tool_calls", [])
                        messages_for_api.append(choice["message"])  # append assistant message with tool_calls

                        # Execute each tool call
                        for tc in tool_calls:
                            fn_name = tc["function"]["name"]
                            try:
                                fn_args = _json.loads(tc["function"]["arguments"])
                            except Exception:
                                fn_args = {}

                            if fn_name in TOOL_FUNCTIONS:
                                try:
                                    tool_result = TOOL_FUNCTIONS[fn_name](**fn_args)
                                except Exception as e:
                                    tool_result = {'error': str(e)}
                            else:
                                tool_result = {'error': f'Unknown tool: {fn_name}'}

                            messages_for_api.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "content": _json.dumps(tool_result),
                            })

                        # Second call with tool results
                        res2 = requests.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers={"Authorization": f"Bearer {api_key}"},
                            json={
                                "model": "gpt-4o",
                                "messages": messages_for_api,
                                "temperature": 0.5,
                                "max_tokens": 1200,
                            },
                            timeout=30
                        )
                        if res2.status_code == 200:
                            ai_response = res2.json()["choices"][0]["message"]["content"]
                        else:
                            ai_response = f"AI Tool Error: {res2.text[:100]}"
                    else:
                        ai_response = choice["message"]["content"]
            except Exception as e:
                ai_response = f"Connection failed: {str(e)}"

        # Save AI response
        ai_msg = AIChatMessage.objects.create(user=request.user, message=ai_response, is_ai=True)
        return Response(AIChatMessageSerializer(ai_msg).data, status=status.HTTP_201_CREATED)


class FloodSimulationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        serializer = FloodPredictionRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Calculate simulation
        result = score_flood(**serializer.validated_data)
        
        return Response({
            "simulated": result,
            "inputs": serializer.validated_data
        })


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

    @action(detail=False, methods=["get"])
    def stats(self, request):
        from django.db.models import Avg, Sum, OuterRef, Subquery
        from api.models import FloodPrediction

        # 1. Active Alerts
        active_alerts = FloodAlert.objects.filter(status="active").count()

        # 2. Latest predictions subquery
        latest_preds = FloodPrediction.objects.filter(
            sub_county=OuterRef("pk")
        ).order_by("-predicted_at")

        # 3. High Risk Analysis
        high_risk_subs = SubCounty.objects.annotate(
            latest_prob=Subquery(latest_preds.values("flood_probability")[:1])
        ).filter(latest_prob__gte=75)

        high_risk_count = high_risk_subs.count()
        pop_at_risk = high_risk_subs.aggregate(total=Sum("population"))["total"] or 0

        # 4. Avg Lead Time
        avg_lead = SubCounty.objects.annotate(
            latest_lead=Subquery(latest_preds.values("lead_time_days")[:1])
        ).aggregate(avg=Avg("latest_lead"))["avg"] or 0

        return Response({
            "active_alerts": active_alerts,
            "high_risk_count": high_risk_count,
            "pop_at_risk": pop_at_risk,
            "avg_lead_time": round(float(avg_lead), 1)
        })

    @action(detail=False, methods=["get"])
    def trend(self, request):
        from api.models import FloodPrediction
        counties = County.objects.all()
        data = []
        
        # Get last 30 predictions grouped by date for each county
        for county in counties:
            preds = FloodPrediction.objects.filter(
                sub_county__county=county
            ).order_by("-predicted_at")[:30]
            
            for p in reversed(list(preds)):
                data.append({
                    "date": p.predicted_at.isoformat(),
                    "probability": p.flood_probability,
                    "county": county.name
                })
        
        return Response(data)

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

        # county_officer and responder are scoped to their own county only.
        # If their county_id is not set, return nothing (don't leak all alerts).
        if role not in _NAT:
            if user.county_id:
                qs = qs.filter(county_id=user.county_id)
            else:
                qs = qs.none()
        else:
            # national/super roles can optionally filter by county via query param
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


# ── Enterprise ViewSets ───────────────────────────────────────────────────────

class IncidentViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Incident.objects.select_related(
            "county", "sub_county", "opened_by"
        ).prefetch_related("updates").all()
        user = self.request.user
        role = getattr(user, "role", None)
        if role not in _NAT:
            if user.county_id:
                qs = qs.filter(county_id=user.county_id)
            else:
                qs = qs.none()

        status_param = self.request.query_params.get("status")
        severity_param = self.request.query_params.get("severity")
        county_param = self.request.query_params.get("county")
        if status_param:
            qs = qs.filter(status=status_param)
        if severity_param:
            qs = qs.filter(severity=severity_param)
        if county_param and role in _NAT:
            qs = qs.filter(county_id=county_param)
        return qs

    def perform_create(self, serializer):
        incident = serializer.save(opened_by=self.request.user)
        # Auto system timeline entry
        IncidentUpdate.objects.create(
            incident=incident,
            author=self.request.user,
            body=f"Incident opened by {self.request.user.get_full_name() or self.request.user.email}.",
            is_system=True,
        )
        AuditLog.log(self.request.user, "Incident Opened", incident)

    @action(detail=True, methods=["post"])
    def add_update(self, request, pk=None):
        incident = self.get_object()
        serializer = IncidentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = serializer.save(incident=incident, author=request.user)
        return Response(IncidentUpdateSerializer(update).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"])
    def close(self, request, pk=None):
        incident = self.get_object()
        incident.status = "closed"
        incident.closed_by = request.user
        incident.closed_at = timezone.now()
        incident.save(update_fields=["status", "closed_by", "closed_at"])
        IncidentUpdate.objects.create(
            incident=incident,
            author=request.user,
            body=f"Incident closed by {request.user.get_full_name() or request.user.email}.",
            is_system=True,
        )
        AuditLog.log(request.user, "Incident Closed", incident)
        return Response(self.get_serializer(incident).data)

    @action(detail=True, methods=["patch"])
    def change_status(self, request, pk=None):
        incident = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Incident.STATUS_CHOICES):
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        old = incident.status
        incident.status = new_status
        incident.save(update_fields=["status"])
        IncidentUpdate.objects.create(
            incident=incident,
            author=request.user,
            body=f"Status changed from '{old}' to '{new_status}'.",
            is_system=True,
        )
        return Response(self.get_serializer(incident).data)


class FieldUnitViewSet(viewsets.ModelViewSet):
    serializer_class = FieldUnitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = FieldUnit.objects.select_related(
            "county", "operator", "incident"
        ).prefetch_related("pings").all()
        user = self.request.user
        role = getattr(user, "role", None)
        if role not in _NAT:
            if user.county_id:
                qs = qs.filter(county_id=user.county_id)
            else:
                qs = qs.none()
        county_param = self.request.query_params.get("county")
        if county_param and role in _NAT:
            qs = qs.filter(county_id=county_param)
        return qs

    @action(detail=True, methods=["post"])
    def ping(self, request, pk=None):
        """Receive a GPS ping from a field unit device."""
        unit = self.get_object()
        serializer = FieldUnitPingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ping_obj = serializer.save(unit=unit)

        # Update unit's current position
        unit.current_lat = ping_obj.lat
        unit.current_lon = ping_obj.lon
        unit.last_ping = ping_obj.timestamp
        unit.status = "active"
        unit.save(update_fields=["current_lat", "current_lon", "last_ping", "status"])

        # Push to WebSocket group for this county
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"gps_{unit.county_id}",
                {
                    "type": "gps_ping",
                    "payload": {
                        "unit_id":   unit.id,
                        "unit_name": unit.name,
                        "unit_type": unit.unit_type,
                        "lat":       ping_obj.lat,
                        "lon":       ping_obj.lon,
                        "speed_kmh": ping_obj.speed_kmh,
                        "heading":   ping_obj.heading,
                        "battery":   ping_obj.battery_pct,
                        "ts":        ping_obj.timestamp.isoformat(),
                    },
                },
            )
        except Exception:
            pass

        return Response(FieldUnitPingSerializer(ping_obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def trail(self, request, pk=None):
        """Return the last 100 GPS pings forming the unit's trail."""
        unit = self.get_object()
        pings = unit.pings.all()[:100]
        return Response(FieldUnitPingSerializer(pings, many=True).data)


class CameraFeedViewSet(viewsets.ModelViewSet):
    serializer_class = CameraFeedSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsNationalOps()]

    def get_queryset(self):
        qs = CameraFeed.objects.select_related("county").all()
        county_param = self.request.query_params.get("county")
        feed_type = self.request.query_params.get("type")
        status_param = self.request.query_params.get("status")
        if county_param:
            qs = qs.filter(county_id=county_param)
        if feed_type:
            qs = qs.filter(feed_type=feed_type)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class SocialIntelViewSet(viewsets.ModelViewSet):
    serializer_class = SocialIntelItemSerializer
    permission_classes = [IsAuthenticated, IsAnalyst]
    pagination_class = AlertPagination
    http_method_names = ["get", "patch", "head", "options"]  # no create/delete via API

    def get_queryset(self):
        qs = SocialIntelItem.objects.select_related("county", "flagged_by").all()
        sentiment = self.request.query_params.get("sentiment")
        county_param = self.request.query_params.get("county")
        source = self.request.query_params.get("source")
        flag = self.request.query_params.get("flag")
        if sentiment:
            qs = qs.filter(sentiment=sentiment)
        if county_param:
            qs = qs.filter(county_id=county_param)
        if source:
            qs = qs.filter(source=source)
        if flag:
            qs = qs.filter(flag=flag)
        return qs

    @action(detail=True, methods=["patch"])
    def flag(self, request, pk=None):
        item = self.get_object()
        new_flag = request.data.get("flag")
        if new_flag not in dict(SocialIntelItem.FLAG_CHOICES):
            return Response({"detail": "Invalid flag."}, status=status.HTTP_400_BAD_REQUEST)
        item.flag = new_flag
        item.flagged_by = request.user
        item.save(update_fields=["flag", "flagged_by"])
        return Response(SocialIntelItemSerializer(item).data)


class BroadcastViewSet(viewsets.ModelViewSet):
    serializer_class = EarlyWarningBroadcastSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsCountyOfficer()]

    def get_queryset(self):
        return EarlyWarningBroadcast.objects.prefetch_related("counties").all()

    def perform_create(self, serializer):
        broadcast = serializer.save(sent_by=self.request.user, status="draft")
        AuditLog.log(self.request.user, "Broadcast Created", broadcast)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Trigger async dispatch of this broadcast."""
        broadcast = self.get_object()
        if broadcast.status in ("sending", "sent"):
            return Response(
                {"detail": f"Broadcast is already {broadcast.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from api.tasks import send_broadcast_task
        send_broadcast_task.delay(broadcast.id)
        broadcast.status = "sending"
        broadcast.save(update_fields=["status"])
        AuditLog.log(request.user, "Broadcast Dispatched", broadcast)
        return Response(EarlyWarningBroadcastSerializer(broadcast).data)


class BroadcastRecipientViewSet(viewsets.ModelViewSet):
    serializer_class = BroadcastRecipientSerializer
    permission_classes = [IsAuthenticated, IsNationalOps]

    def get_queryset(self):
        qs = BroadcastRecipient.objects.select_related("county", "sub_county").all()
        county_param = self.request.query_params.get("county")
        if county_param:
            qs = qs.filter(county_id=county_param)
        return qs

    def create(self, request, *args, **kwargs):
        """Override create to normalize phone and skip duplicates gracefully."""
        data = request.data.copy()
        phone = BroadcastRecipient.normalize_phone((data.get("phone") or "").strip())
        email = (data.get("email") or "").strip()
        channel = (data.get("channel") or "sms").strip()

        # Check for existing record on same phone+channel or email+channel
        if phone:
            if BroadcastRecipient.objects.filter(phone=phone, channel=channel).exists():
                existing = BroadcastRecipient.objects.filter(phone=phone, channel=channel).first()
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)
        if email and not phone:
            if BroadcastRecipient.objects.filter(email=email, channel=channel).exists():
                existing = BroadcastRecipient.objects.filter(email=email, channel=channel).first()
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        data["phone"] = phone
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        """
        POST /api/broadcast-recipients/import-csv/
        Accepts a multipart CSV file upload with columns:
          name, phone, email, channel, county_code, sub_county_name
        Creates BroadcastRecipient objects, skipping duplicates (same phone+county).
        Returns {created: N, skipped: N, errors: [...]}
        """
        import csv as csv_module
        import io

        # Permission check: IsCountyOfficer or IsNationalOps
        user = request.user
        role = getattr(user, 'role', None)
        if role not in ('county_officer', 'national_ops', 'superuser'):
            return Response(
                {"detail": "Permission denied. Requires County Officer or National Ops role."},
                status=status.HTTP_403_FORBIDDEN,
            )

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({"detail": "No file uploaded. Send file as 'file' field."}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        skipped_count = 0
        errors = []

        try:
            decoded = csv_file.read().decode('utf-8-sig')
            reader = csv_module.DictReader(io.StringIO(decoded))
        except Exception as exc:
            return Response({"detail": f"Could not parse CSV: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

        for row_num, row in enumerate(reader, start=2):  # row 1 = header
            name = (row.get('name') or '').strip()
            phone = (row.get('phone') or '').strip()
            email = (row.get('email') or '').strip()
            channel = (row.get('channel') or 'sms').strip()
            county_code = (row.get('county_code') or '').strip()
            sub_county_name = (row.get('sub_county_name') or '').strip()

            # Normalize phone to E.164
            phone = BroadcastRecipient.normalize_phone(phone)

            if not phone and not email:
                errors.append(f"Row {row_num}: 'phone' or 'email' is required.")
                continue

            # Resolve county by code first, then by name
            county = None
            if county_code:
                county = County.objects.filter(code__iexact=county_code).first()
                if not county:
                    county = County.objects.filter(name__iexact=county_code).first()
            if not county:
                errors.append(f"Row {row_num}: County '{county_code}' not found — skipping.")
                continue

            # Resolve sub-county by name within the matched county
            sub_county = None
            if sub_county_name:
                sub_county = SubCounty.objects.filter(county=county, name__iexact=sub_county_name).first()

            # Skip duplicates: same phone+channel or same email+channel
            if phone and BroadcastRecipient.objects.filter(phone=phone, channel=channel).exists():
                skipped_count += 1
                continue
            if email and not phone and BroadcastRecipient.objects.filter(email=email, channel=channel).exists():
                skipped_count += 1
                continue

            try:
                BroadcastRecipient.objects.create(
                    name=name,
                    phone=phone,
                    email=email or None,
                    channel=channel,
                    county=county,
                    sub_county=sub_county,
                )
                created_count += 1
            except Exception as exc:
                errors.append(f"Row {row_num}: Could not create record — {exc}")

        return Response({"created": created_count, "skipped": skipped_count, "errors": errors})


class WeatherObservationViewSet(viewsets.ModelViewSet):
    serializer_class = WeatherObservationSerializer
    pagination_class = AlertPagination

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsNationalOps()]

    def get_queryset(self):
        qs = WeatherObservation.objects.select_related("county").all()
        county_param = self.request.query_params.get("county")
        station = self.request.query_params.get("station")
        if county_param:
            qs = qs.filter(county_id=county_param)
        if station:
            qs = qs.filter(station_id=station)
        return qs


class AnnotatedZoneViewSet(viewsets.ModelViewSet):
    serializer_class = AnnotatedZoneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AnnotatedZone.objects.select_related("county", "incident", "created_by").all()
        county_param = self.request.query_params.get("county")
        incident_param = self.request.query_params.get("incident")
        if county_param:
            qs = qs.filter(county_id=county_param)
        if incident_param:
            qs = qs.filter(incident_id=incident_param)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ── Public (unauthenticated) endpoints ───────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def public_counties(request):
    """Public endpoint — returns all active counties (no auth required)."""
    counties = County.objects.filter(is_active=True).values("id", "name", "code").order_by("name")
    return Response(list(counties))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sensor_summary(request):
    """
    Returns the latest WeatherObservation per county, with county centroid
    coordinates for sensor dot display on the map.
    """
    from django.db.models import Max
    # Get the latest observation ID per county
    latest_ids = (
        WeatherObservation.objects
        .values("county_id")
        .annotate(latest_id=Max("id"))
        .values_list("latest_id", flat=True)
    )
    obs = (
        WeatherObservation.objects
        .filter(id__in=list(latest_ids))
        .select_related("county")
        .order_by("county__name")
    )
    from .serializers import WeatherObservationSerializer
    return Response(WeatherObservationSerializer(obs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_summary(request):
    """
    Public-facing summary endpoint used by the /public portal.
    Returns only non-sensitive aggregate data: active alerts, affected counties,
    and latest situation summary.
    """
    active_alerts = FloodAlert.objects.filter(status="active").select_related("county")
    alert_list = [
        {
            "id": a.id,
            "title": a.title,
            "severity": a.severity,
            "county": a.county.name,
            "issued_at": a.created_at.isoformat(),
        }
        for a in active_alerts.order_by("-created_at")[:10]
    ]

    county_count = active_alerts.values("county_id").distinct().count()
    incident_count = Incident.objects.filter(
        status__in=["open", "active"]
    ).count()

    # Latest verified intel items — urgent first, then by recency (no raw snippets in public)
    urgent_intel = SocialIntelItem.objects.filter(
        flag="verified"
    ).exclude(sentiment="positive").order_by("-ingested_at")[:10]
    intel_titles = [
        {
            "title": i.title,
            "source": i.source,
            "url": i.url or None,
            "ts": i.ingested_at.isoformat(),
            "sentiment": i.sentiment,
            "county_tag": i.county.name if i.county_id else None,
        }
        for i in urgent_intel.select_related("county")
    ]

    return Response({
        "active_alerts": alert_list,
        "affected_counties": county_count,
        "active_incidents": incident_count,
        "latest_intel": intel_titles,
        "as_of": timezone.now().isoformat(),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def public_cameras(request):
    """Return camera feeds marked as public — used by /public portal."""
    feeds = CameraFeed.objects.filter(is_public=True, status="online").select_related("county")
    return Response(CameraFeedSerializer(feeds, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_active_alerts(request):
    alerts = FloodAlert.objects.filter(status='active').select_related('county').order_by('-created_at')[:20]
    data = [{'id': a.id, 'title': a.title, 'severity': a.severity, 'county': a.county.name, 'created_at': a.created_at.isoformat()} for a in alerts]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def intel_summary(request):
    from django.utils import timezone
    from datetime import timedelta
    county_id = request.query_params.get('county')
    since = timezone.now() - timedelta(hours=6)
    qs = SocialIntelItem.objects.filter(ingested_at__gte=since)
    if county_id:
        qs = qs.filter(county_id=county_id)
    total = qs.count()
    urgent = qs.filter(sentiment='urgent').count()
    county = County.objects.filter(id=county_id).first() if county_id else None
    return Response({'total': total, 'urgent': urgent, 'county_name': county.name if county else None, 'hours': 6})


# ── Public CAP feed ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def cap_feed(request, alert_id=None):
    """Generate CAP 1.2 XML for an alert or all active alerts."""
    from django.utils import timezone as tz
    from xml.etree.ElementTree import Element, SubElement, tostring
    from xml.dom import minidom

    if alert_id:
        alerts = FloodAlert.objects.filter(id=alert_id, status='active').select_related('county')
    else:
        alerts = FloodAlert.objects.filter(status='active').select_related('county').order_by('-created_at')[:10]

    root = Element('alert', xmlns='urn:oasis:names:tc:emergency:cap:1.2')

    identifier = SubElement(root, 'identifier')
    identifier.text = f'crisislens-{tz.now().strftime("%Y%m%d%H%M%S")}'

    sender = SubElement(root, 'sender')
    sender.text = 'crisislens@gok.go.ke'

    sent = SubElement(root, 'sent')
    sent.text = tz.now().isoformat()

    status_el = SubElement(root, 'status')
    status_el.text = 'Actual'

    msg_type = SubElement(root, 'msgType')
    msg_type.text = 'Alert'

    scope = SubElement(root, 'scope')
    scope.text = 'Public'

    for alert in alerts:
        info = SubElement(root, 'info')

        language = SubElement(info, 'language')
        language.text = 'en-KE'

        cat = SubElement(info, 'category')
        cat.text = 'Met'

        event = SubElement(info, 'event')
        event.text = 'FloodAlert'

        urgency = SubElement(info, 'urgency')
        urgency.text = 'Immediate' if alert.severity in ['critical', 'high'] else 'Expected'

        severity_el = SubElement(info, 'severity')
        sev_map = {'critical': 'Extreme', 'high': 'Severe', 'medium': 'Moderate', 'low': 'Minor'}
        severity_el.text = sev_map.get(alert.severity, 'Unknown')

        certainty = SubElement(info, 'certainty')
        certainty.text = 'Observed'

        headline = SubElement(info, 'headline')
        headline.text = alert.title

        description = SubElement(info, 'description')
        description.text = alert.description

        area = SubElement(info, 'area')
        area_desc = SubElement(area, 'areaDesc')
        area_desc.text = alert.county.name

    xml_str = minidom.parseString(tostring(root, encoding='unicode')).toprettyxml(indent='  ')
    return HttpResponse(xml_str, content_type='application/xml')


# ── Public alert subscription ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def public_subscribe(request):
    from api.models import AlertSubscription
    phone = BroadcastRecipient.normalize_phone(request.data.get('phone', '').strip())
    email = request.data.get('email', '').strip()
    channel = request.data.get('channel', 'sms')
    county_id = request.data.get('county') or None

    if not phone and not email:
        return Response({'detail': 'Phone or email required.'}, status=400)

    # Record in AlertSubscription (notification tracking)
    sub, created = AlertSubscription.objects.get_or_create(
        phone=phone, email=email, county_id=county_id,
        defaults={'channel': channel}
    )

    # Also add to BroadcastRecipient so they appear in Contacts
    if county_id:
        county = County.objects.filter(id=county_id).first()
        if county:
            lookup = {}
            if phone:
                lookup = {'phone': phone, 'channel': channel}
            elif email:
                lookup = {'email': email, 'channel': channel}
            if lookup:
                BroadcastRecipient.objects.get_or_create(
                    **lookup,
                    defaults={
                        'name': email.split('@')[0] if email else phone,
                        'phone': phone,
                        'email': email,
                        'channel': channel,
                        'county': county,
                    }
                )

    return Response({'subscribed': created, 'detail': 'Subscription confirmed.' if created else 'Already subscribed.'})


# ── API Key management ────────────────────────────────────────────────────────

class APIKeyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from rest_framework import serializers

        class APIKeySerializer(serializers.ModelSerializer):
            class Meta:
                from api.models import APIKey
                model = APIKey
                fields = ['id', 'name', 'key', 'is_active', 'last_used', 'created_at']
                read_only_fields = ['key', 'last_used', 'created_at']

        return APIKeySerializer

    def get_queryset(self):
        from api.models import APIKey
        return APIKey.objects.filter(user=self.request.user)

    def perform_create(self, request, *args, **kwargs):
        pass

    def create(self, request, *args, **kwargs):
        from api.models import APIKey
        name = request.data.get('name', 'My API Key')
        key_obj = APIKey.generate(request.user, name)
        return Response({'id': key_obj.id, 'name': key_obj.name, 'key': key_obj.key, 'created_at': key_obj.created_at.isoformat()}, status=201)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=204)
