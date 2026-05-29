from rest_framework.views import APIView
from rest_framework.response import Response


class PredictView(APIView):
    def post(self, request):
        return Response(request.data)


class BatchPredictView(APIView):
    def post(self, request):
        return Response(request.data)
