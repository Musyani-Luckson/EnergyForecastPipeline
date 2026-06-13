from rest_framework.views import APIView
from rest_framework.response import Response


class GenerateView(APIView):
    def post(self, request):
        return Response(request.data)


class ExportView(APIView):
    def get(self, request):
        return Response(request.data)
