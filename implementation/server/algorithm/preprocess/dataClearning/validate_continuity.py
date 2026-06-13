def validate_continuity(df):
    expected_days = (df.index.max() - df.index.min()).days + 1
    actual_days = len(df)

    print("Expected days:", expected_days)
    print("Actual days:", actual_days)
    print("Missing entries:", df["Daily_kWh"].isna().sum())
