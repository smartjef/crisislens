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
        return Response(
            {"detail": "OPENAI_API_KEY is not configured on the server."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    prompt = (
        "You are CrisisLens, an early warning analyst. Provide a concise, actionable briefing for "
        f"county: {payload['county']}, area: {payload.get('area', 'N/A')}, "
        f"risk type: {payload['risk_type']}. "
        "Include: affected towns/areas, % affected, timing, likely impacts, and recommendations. "
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
        return Response(
            {"detail": "Failed to fetch AI feedback."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    data = response.json()
    message = data["choices"][0]["message"]["content"]
    output = AIFeedbackResponse({"response": message})
    return Response(output.data, status=status.HTTP_200_OK)
