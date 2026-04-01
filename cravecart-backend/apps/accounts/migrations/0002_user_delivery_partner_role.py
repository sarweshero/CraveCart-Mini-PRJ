"""Migration: add delivery_partner role to User.role choices."""
from django.db import migrations
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=__import__("django.db.models", fromlist=["CharField"]).CharField(
                choices=[
                    ("customer", "Customer"),
                    ("hotel_admin", "Hotel Admin"),
                    ("delivery_partner", "Delivery Partner"),
                ],
                default="customer",
                max_length=20,
            ),
        ),
    ]
