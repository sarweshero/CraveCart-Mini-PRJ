"""
Migration: add cancellation_reason to Order model (BUG-04 fix).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="cancellation_reason",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
