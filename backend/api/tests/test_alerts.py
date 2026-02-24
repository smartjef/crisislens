from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from api.models import County, SubCounty, FloodAlert

class FloodAlertAPITests(APITestCase):
    def setUp(self):
        # Setup Counties
        self.kisumu = County.objects.create(name="Kisumu", code="KSM", population=100, centroid_lat=0, centroid_lon=0)
        self.siaya = County.objects.create(name="Siaya", code="SIA", population=100, centroid_lat=0, centroid_lon=0)

        # Setup SubCounties
        self.sub_ksm = SubCounty.objects.create(county=self.kisumu, name="ksm sub")
        self.sub_sia = SubCounty.objects.create(county=self.siaya, name="sia sub")

        # Setup Users
        self.admin = User.objects.create_user(username="admin", email="admin@crisislens.ke", password="test", role="super_admin")
        self.ops = User.objects.create_user(username="ops", email="ops@crisislens.ke", password="test", role="national_ops")
        self.officer_ksm = User.objects.create_user(username="officer_ksm", email="officer@kisumu.ke", password="test", role="county_officer", county=self.kisumu)
        self.officer_sia = User.objects.create_user(username="officer_sia", email="officer@siaya.ke", password="test", role="county_officer", county=self.siaya)
        self.responder_sia = User.objects.create_user(username="responder_sia", email="responder@siaya.ke", password="test", role="responder", county=self.siaya)
        self.analyst = User.objects.create_user(username="analyst", email="analyst@crisislens.ke", password="test", role="analyst")

    def test_analyst_post_returns_403(self):
        self.client.force_authenticate(user=self.analyst)
        url = reverse('alert-list')
        data = {"title": "Test", "county": self.kisumu.id, "sub_county": self.sub_ksm.id, "severity": "low", "description": "test"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_county_officer_post_own_county_returns_201(self):
        self.client.force_authenticate(user=self.officer_ksm)
        url = reverse('alert-list')
        data = {"title": "Officer Alert", "county": self.kisumu.id, "sub_county": self.sub_ksm.id, "severity": "high", "description": "test"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_county_officer_post_other_county_returns_403(self):
        self.client.force_authenticate(user=self.officer_ksm)
        url = reverse('alert-list')
        data = {"title": "Officer Alert Siaya", "county": self.siaya.id, "sub_county": self.sub_sia.id, "severity": "high", "description": "test"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_responder_patch_acknowledge_returns_200(self):
        alert = FloodAlert.objects.create(title="Test", county=self.siaya, sub_county=self.sub_sia, severity="high", status="active", description="test", created_by=self.admin)
        self.client.force_authenticate(user=self.responder_sia)
        url = reverse('alert-acknowledge', args=[alert.id])
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data.get("acknowledged_at"))

    def test_list_endpoint_is_paginated(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('alert-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
