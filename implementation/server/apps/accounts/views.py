from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser

from .models import Account


class LoginView(APIView):
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(email=email, password=password)

        print(user)

        if user is None:
            return Response(
                {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )

        return Response(
            {
                "message": "Login successful",
                "user": {
                    "id": user.id,
                    "email": user.email,
                },
            },
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    # permission_classes = [IsAdminUser]

    # CREATE
    def post(self, request):
        data = request.data

        print(data)

        if Account.objects.filter(email=data.get("email")).exists():
            return Response({"error": "User already exists"}, status=400)

        # account = Account.objects.create(
        #     email=data.get("email"),
        #     first_name=data.get("first_name"),
        #     last_name=data.get("last_name"),
        #     role=data.get("role"),
        #     password=data.get("password"),
        # )

        return Response(
            {"message": "Account created", "account": data},
            status=201,
        )

    # READ ALL
    def get(self, request):
        accounts = Account.objects.all().values(
            "id", "email", "first_name", "last_name", "email", "role"
        )

        return Response(list(accounts), status=200)

    # UPDATE
    def put(self, request):
        account_id = request.data.get("id")

        try:
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)

        account.email = request.data.get("email", account.email)
        account.first_name = request.data.get("first_name", account.first_name)
        account.last_name = request.data.get("last_name", account.last_name)
        account.email = request.data.get("email", account.email)
        account.role = request.data.get("role", account.role)

        if request.data.get("password"):
            account.password = request.data["password"]

        account.save()

        return Response({"message": "Account updated"}, status=200)

    # DELETE
    def delete(self, request):
        account_id = request.data.get("id")

        try:
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)

        account.delete()

        return Response({"message": "Account deleted"}, status=200)
