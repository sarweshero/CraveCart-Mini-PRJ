from django.db import models

class AITemplate(models.Model):
    class Tone(models.TextChoices):
        WARM         = "warm",         "Warm & Grateful"
        APOLOGETIC   = "apologetic",   "Empathetic & Recovery"
        PROFESSIONAL = "professional", "Professional & Brief"
        CUSTOM       = "custom",       "Custom"

    restaurant           = models.ForeignKey("restaurants.Restaurant", on_delete=models.CASCADE, related_name="ai_templates")
    name                 = models.CharField(max_length=100)
    description          = models.CharField(max_length=300, blank=True)
    tone                 = models.CharField(max_length=20, choices=Tone.choices, default=Tone.WARM)
    prompt_instructions  = models.TextField()
    is_active            = models.BooleanField(default=False)
    usage_count          = models.PositiveIntegerField(default=0)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_templates"
        ordering = ["-is_active", "-usage_count"]

    def __str__(self):
        return f"{self.restaurant.name} — {self.name}"

    def save(self, *args, **kwargs):
        if self.is_active:
            AITemplate.objects.filter(
                restaurant=self.restaurant, is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
