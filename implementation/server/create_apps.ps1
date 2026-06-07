$apps = @(
"accounts",
"core",
"datasets",
"parameters",
"models_registry",
"forecasting",
"evaluation",
"dashboard",
"reports",
"notifications",
"audit",
"preprocess"
)

foreach ($app in $apps) {
    python manage.py startapp $app "apps/$app"
}

# RUN THIS: .\create_apps.ps1