from rest_framework.views import APIView
from rest_framework.response import Response


class CreateView(APIView):
    def post(self, request):
        return Response(
            {
                "message": "request received",
                "data": request.data,
                "headers": dict(request.headers),
            }
        )


class ListView(APIView):
    def get(self, request):
        return Response(
            {
                "message": "request received",
                "data": request.data,
                "headers": dict(request.headers),
            }
        )


class UpdateView(APIView):
    def put(self, request):
        return Response(
            {
                "message": "request received",
                "data": request.data,
                "headers": dict(request.headers),
            }
        )
