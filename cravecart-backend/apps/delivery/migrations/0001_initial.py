from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
from decimal import Decimal


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("accounts", "0002_user_delivery_partner_role"),
        ("orders", "0002_order_cancellation_reason"),
    ]
    operations = [
        migrations.CreateModel(
            name="DeliveryPartner",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("avatar", models.URLField(blank=True)),
                ("city", models.CharField(blank=True, max_length=100)),
                ("vehicle_type", models.CharField(choices=[("bike","Motorcycle"),("bicycle","Bicycle"),("scooter","Scooter"),("foot","On Foot")], default="bike", max_length=15)),
                ("vehicle_number", models.CharField(blank=True, max_length=20)),
                ("aadhar_number", models.CharField(blank=True, max_length=12)),
                ("pan_number", models.CharField(blank=True, max_length=10)),
                ("is_verified", models.BooleanField(default=False)),
                ("bank_account_number", models.CharField(blank=True, max_length=18)),
                ("bank_ifsc", models.CharField(blank=True, max_length=11)),
                ("bank_name", models.CharField(blank=True, max_length=100)),
                ("status", models.CharField(choices=[("active","Active"),("inactive","Inactive"),("suspended","Suspended")], default="active", max_length=15)),
                ("is_online", models.BooleanField(default=False)),
                ("current_lat", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("current_lng", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("total_deliveries", models.PositiveIntegerField(default=0)),
                ("total_earnings", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("rating_avg", models.DecimalField(decimal_places=1, default=5.0, max_digits=3)),
                ("rating_count", models.PositiveIntegerField(default=0)),
                ("today_deliveries", models.PositiveIntegerField(default=0)),
                ("today_earnings", models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ("last_active", models.DateTimeField(blank=True, null=True)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="delivery_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "delivery_partners"},
        ),
        migrations.CreateModel(
            name="DeliveryAssignment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("assigned","Assigned"),("accepted","Accepted"),("rejected","Rejected"),("expired","Expired"),("picked_up","Picked Up"),("delivered","Delivered"),("cancelled","Cancelled")], default="assigned", max_length=15)),
                ("base_earning", models.DecimalField(decimal_places=2, default=Decimal("25.00"), max_digits=6)),
                ("distance_km", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("bonus", models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ("total_earning", models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ("pickup_lat", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("pickup_lng", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("dropoff_lat", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("dropoff_lng", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("assigned_at", models.DateTimeField(auto_now_add=True)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("picked_up_at", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("customer_rating", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("customer_tip", models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ("order", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="delivery", to="orders.order")),
                ("partner", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assignments", to="delivery.deliverypartner")),
            ],
            options={"db_table": "delivery_assignments", "ordering": ["-assigned_at"]},
        ),
        migrations.CreateModel(
            name="EarningsSummary",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("date", models.DateField(db_index=True)),
                ("deliveries", models.PositiveSmallIntegerField(default=0)),
                ("earnings", models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ("online_hours", models.DecimalField(decimal_places=1, default=0, max_digits=4)),
                ("avg_rating", models.DecimalField(decimal_places=1, default=5.0, max_digits=3)),
                ("partner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="earnings_history", to="delivery.deliverypartner")),
            ],
            options={"db_table": "delivery_earnings_summary", "ordering": ["-date"]},
        ),
        migrations.AddIndex(model_name="deliverypartner", index=models.Index(fields=["is_online", "city"], name="dp_online_city_idx")),
        migrations.AddIndex(model_name="deliveryassignment", index=models.Index(fields=["partner", "status"], name="da_partner_status_idx")),
        migrations.AlterUniqueTogether(name="earningssummary", unique_together={("partner", "date")}),
    ]
