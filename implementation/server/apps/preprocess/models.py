from django.db import models

# Preprocessing state is normalized into apps.processing
# (DatasetVersion + PreprocessingLog); this app is views-only.
