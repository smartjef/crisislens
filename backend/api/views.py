"""API views for CrisisLens MVP."""
from __future__ import annotations

import os

import requests
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.serializers import (
    AIFeedbackRequest,
    AIFeedbackResponse,
    DroughtPredictionRequest,
    DroughtPredictionResponse,
    FloodPredictionRequest,
    FloodPredictionResponse,
)
from api.services import score_drought, score_flood


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
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
def drought_predict(request):
    serializer = DroughtPredictionRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = score_drought(**serializer.validated_data)
    response = DroughtPredictionResponse(payload)
    return Response(response.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def flood_predict(request):
    serializer = FloodPredictionRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = score_flood(**serializer.validated_data)
    response = FloodPredictionResponse(payload)
    return Response(response.data, status=status.HTTP_200_OK)


@api_view(["POST"])
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
