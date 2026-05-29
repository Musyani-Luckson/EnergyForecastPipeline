from rest_framework.views import APIView
from rest_framework.response import Response


class UploadView(APIView):
    def post(self, request):
        return Response(request.data)


class ListView(APIView):
    def get(self, request):
        return Response(request.data)


class DetailView(APIView):
    def get(self, request):
        return Response(request.data)
