import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crisislens.settings')
django.setup()

from django.test import Client
from accounts.models import User
from api.models import FloodAlert

c = Client()
users = {
    "admin": User.objects.get(email="admin@crisislens.ke"),
    "ops": User.objects.get(email="ops@crisislens.ke"),
    "officer": User.objects.get(email="officer@kisumu.ke"),
    "responder": User.objects.get(email="responder@siaya.ke"),
    "analyst": User.objects.get(email="analyst@crisislens.ke"),
}

print("1. analyst POST -> 403")
c.force_login(users["analyst"])
res = c.post("/api/alerts/", {"title": "Test", "county": 1, "severity": "low"})
print("Status:", res.status_code) # Should be 403

print("\n2. county_officer POST own county -> 201")
c.force_login(users["officer"])
# officer is from Kisumu. Assume Kisumu is county 1 from seed
kisumu = users["officer"].county
res = c.post("/api/alerts/", {"title": "Officer Alert", "county": kisumu.id, "severity": "high"})
print("Status:", res.status_code) # Should be 201

print("\n3. county_officer POST other county -> 403")
siaya = users["responder"].county
res = c.post("/api/alerts/", {"title": "Officer Alert Siaya", "county": siaya.id, "severity": "high"})
print("Status:", res.status_code) # Should be 403

print("\n4. responder PATCH acknowledge -> 200 + acknowledged_at populated")
c.force_login(users["responder"])
# Find an alert in Siaya
alert = FloodAlert.objects.filter(county=siaya, status="active").first()
if alert:
    res = c.patch(f"/api/alerts/{alert.id}/acknowledge/")
    print("Status:", res.status_code) # Should be 200
    if res.status_code == 200:
        print("acknowledged_at:", res.json().get("acknowledged_at"))

print("\n5. List endpoint is paginated")
res = c.get("/api/alerts/")
print("Status:", res.status_code)
data = res.json()
print("Contains 'results':", 'results' in data)
if 'results' in data:
    print("Count:", data['count'])
