from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class StationarityView(APIView):
    def post(self, request):
        return Response(
            {
                "success": True,
                "message": "StationarityView received request.",
                "data": {"dataset_id": None, "status": "not_implemented"},
            },
            status=status.HTTP_200_OK,
        )
