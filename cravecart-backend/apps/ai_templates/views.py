from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import AITemplate
from .serializers import AITemplateSerializer, AITemplateWriteSerializer
from utils.permissions import IsHotelAdmin

class AITemplateListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def get(self, request):
        return Response(AITemplateSerializer(AITemplate.objects.filter(restaurant=request.user.restaurant), many=True).data)
    def post(self, request):
        s = AITemplateWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(AITemplateSerializer(s.save(restaurant=request.user.restaurant)).data, status=201)

class AITemplateDetailView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def patch(self, request, pk):
        t = get_object_or_404(AITemplate, pk=pk, restaurant=request.user.restaurant)
        s = AITemplateWriteSerializer(t, data=request.data, partial=True)
        s.is_valid(raise_exception=True); s.save()
        return Response(AITemplateSerializer(t).data)
    def delete(self, request, pk):
        get_object_or_404(AITemplate, pk=pk, restaurant=request.user.restaurant).delete()
        return Response(status=204)

class AITemplateSetActiveView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def post(self, request, pk):
        t = get_object_or_404(AITemplate, pk=pk, restaurant=request.user.restaurant)
        t.is_active = True; t.save()
        return Response({"message": f"{t.name!r} set as active template."})
