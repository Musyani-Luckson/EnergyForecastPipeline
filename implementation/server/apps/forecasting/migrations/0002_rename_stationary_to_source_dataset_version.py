from django.db import migrations


class Migration(migrations.Migration):
    """
    Rename Forecast.stationary_dataset_version to source_dataset_version.

    The column never held a STATIONARY version: the runner records the
    version the model was fitted on, which is the last one still carrying
    consumption in kWh (OUTLIERS, or CLEANED where outlier treatment was
    declined). SARIMAX receives that undifferenced series and applies the
    differencing orders itself, so the old name asserted something the
    data contradicted.

    RenameField is used rather than a drop-and-add so existing forecast
    rows keep their source version.
    """

    dependencies = [
        ("forecasting", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="forecast",
            old_name="stationary_dataset_version",
            new_name="source_dataset_version",
        ),
    ]
