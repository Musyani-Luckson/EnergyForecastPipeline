import pandas as pd


class FrequencyAnalysisAnalyzer:

    @staticmethod
    def analyze(df, datetime_col="Date"):

        df = df.copy()

        df[datetime_col] = pd.to_datetime(df[datetime_col])

        df = df.sort_values(datetime_col)

        full_range = pd.date_range(
            start=df[datetime_col].min(), end=df[datetime_col].max(), freq="D"
        )

        existing_dates = set(df[datetime_col])

        missing_dates = [str(d) for d in full_range if d not in existing_dates]

        diffs = df[datetime_col].diff().dropna()

        violations = int((diffs != pd.Timedelta(days=1)).sum())

        return {
            "expected_frequency": "Daily",
            "frequency_violations": violations,
            "missing_timestamp_count": len(missing_dates),
            "missing_timestamps": missing_dates,
        }
