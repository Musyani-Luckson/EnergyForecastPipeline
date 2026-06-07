from rest_framework.views import APIView
from rest_framework.response import Response


class OverviewView(APIView):
    def get(self, request):
        return Response(request.data)


class AnalyticsView(APIView):
    def get(self, request):
        return Response(request.data)
