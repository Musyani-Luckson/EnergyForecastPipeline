from django.test import TestCase

from apps.accounts.models import User
from apps.accounts.services.access_controller import AccessController
from apps.accounts.services.authentication_service import AuthenticationService


class UserModelTests(TestCase):

    def test_create_user_requires_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="password123")

    def test_email_is_username_field(self):
        self.assertEqual(User.USERNAME_FIELD, "email")

    def test_create_user_defaults_to_user_role(self):
        u = User.objects.create_user(email="a@test.com", password="password123")
        self.assertEqual(u.role, User.Roles.USER)
        self.assertTrue(u.check_password("password123"))

    def test_create_superuser_is_admin(self):
        u = User.objects.create_superuser(email="root@test.com", password="password123")
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.is_staff)
        self.assertEqual(u.role, User.Roles.ADMIN)


class AuthenticationServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="manager@test.com",
            password="password123",
            role=User.Roles.MANAGER,
        )

    def test_sign_in_issues_tokens(self):
        result = AuthenticationService.sign_in(None, "manager@test.com", "password123")
        self.assertIsNotNone(result)
        self.assertEqual(result["user"], self.user)
        self.assertTrue(str(result["access"]))
        self.assertTrue(str(result["refresh"]))

    def test_sign_in_rejects_bad_credentials(self):
        self.assertIsNone(
            AuthenticationService.sign_in(None, "manager@test.com", "wrong")
        )

    def test_sign_in_rejects_inactive_user(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertIsNone(
            AuthenticationService.sign_in(None, "manager@test.com", "password123")
        )


class AccessControllerTests(TestCase):

    def test_create_user_with_role(self):
        user = AccessController.create_user(
            email="new@test.com",
            password="securepass",
            role=User.Roles.MANAGER,
        )
        self.assertEqual(user.role, User.Roles.MANAGER)
        self.assertEqual(user.email, "new@test.com")

    def test_create_user_rejects_invalid_email(self):
        with self.assertRaises(ValueError):
            AccessController.create_user(
                email="not-an-email", password="securepass", role="user"
            )

    def test_create_user_rejects_short_password(self):
        with self.assertRaises(ValueError):
            AccessController.create_user(
                email="new@test.com", password="short", role="user"
            )

    def test_create_user_rejects_invalid_role(self):
        with self.assertRaises(ValueError):
            AccessController.create_user(
                email="new@test.com", password="securepass", role="superhero"
            )

    def test_create_user_rejects_duplicate_email(self):
        AccessController.create_user(
            email="new@test.com", password="securepass", role="user"
        )
        with self.assertRaises(ValueError):
            AccessController.create_user(
                email="new@test.com", password="securepass", role="user"
            )

    def test_update_permissions(self):
        user = AccessController.create_user(
            email="new@test.com", password="securepass", role="user"
        )
        AccessController.update_permissions(user.pk, User.Roles.ADMIN)
        user.refresh_from_db()
        self.assertEqual(user.role, User.Roles.ADMIN)

    def test_revoke_access_deactivates(self):
        user = AccessController.create_user(
            email="new@test.com", password="securepass", role="user"
        )
        AccessController.revoke_access(user.pk)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_revoke_superuser_rejected(self):
        admin = User.objects.create_superuser(
            email="root@test.com", password="password123"
        )
        with self.assertRaises(ValueError):
            AccessController.revoke_access(admin.pk)
