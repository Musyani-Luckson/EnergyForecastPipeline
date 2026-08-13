"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/core/", include("apps.core.urls")),
    path("api/datasets/", include("apps.datasets.urls")),
    path("api/preprocess/", include("apps.preprocess.urls")),
    path("api/forecasting/", include("apps.forecasting.urls")),
    path("api/evaluation/", include("apps.evaluation.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/reports/", include("apps.reports.urls")),
]

if settings.DEBUG:
    # Serve exported reports (and only reports) for download in dev.
    # Scoped to the reports/ subtree so project source and the
    # database under BASE_DIR are never web-exposed.
    urlpatterns += [
        path(
            "media/reports/<path:path>",
            serve,
            {"document_root": settings.MEDIA_ROOT / "reports"},
        ),
    ]
