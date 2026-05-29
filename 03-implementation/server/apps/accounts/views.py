from rest_framework.views import APIView
from rest_framework.response import Response


class LoginView(APIView):
    def post(self, request):
        return Response(
            {
                "message": "request received",
                "data": request.data,
                "headers": dict(request.headers),
            }
        )


class RegisterView(APIView):
    def post(self, request):
        return Response(
            {
                "message": "request received",
                "data": request.data,
                "headers": dict(request.headers),
            }
        )


class ProfileView(APIView):
    def get(self, request):
        return Response(
            {
                "message": "request received",
                "data": request.data,
                "headers": dict(request.headers),
            }
        )
