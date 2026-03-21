from rest_framework import serializers
from .models import AITemplate

class AITemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AITemplate
        fields = ["id","name","description","tone","prompt_instructions","is_active","usage_count","created_at"]
        read_only_fields = ["id","usage_count","created_at"]

class AITemplateWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AITemplate
        fields = ["name","description","tone","prompt_instructions","is_active"]
