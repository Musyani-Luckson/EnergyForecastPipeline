from django.db import migrations


def create_default_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Account = apps.get_model("accounts", "Account")

    if not User.objects.filter(email="admin@example.com").exists():
        user = User.objects.create_superuser(
            email="admin@example.com", password="admin123"
        )

        Account.objects.create(user=user, role="superadmin")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_remove_account_company_remove_account_created_at_and_more"),
        ("auth", "__latest__"),
    ]

    operations = [
        migrations.RunPython(create_default_admin),
    ]
