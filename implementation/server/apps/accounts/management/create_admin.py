from django.core.management.base import BaseCommand

from apps.accounts.models import User


class Command(BaseCommand):

    help = "Create initial admin user"

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **kwargs):

        email = kwargs["email"]
        password = kwargs["password"]

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR("User already exists"))
            return

        User.objects.create_superuser(
            email=email,
            password=password,
            role=User.Roles.ADMIN,
        )

        self.stdout.write(self.style.SUCCESS("Admin created successfully"))
