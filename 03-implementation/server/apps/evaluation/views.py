from rest_framework.views import APIView
from rest_framework.response import Response


class RunView(APIView):
    def post(self, request):
        return Response(request.data)


class MetricsView(APIView):
    def get(self, request):
        return Response(request.data)
