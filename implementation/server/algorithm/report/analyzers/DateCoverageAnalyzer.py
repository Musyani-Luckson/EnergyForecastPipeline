import pandas as pd


class DateCoverageAnalyzer:

    @staticmethod
    def analyze(df, datetime_col="Date", minimum_expected_records=365):

        df = df.copy()

        df[datetime_col] = pd.to_datetime(df[datetime_col])

        start_date = df[datetime_col].min()
        end_date = df[datetime_col].max()

        expected_records = len(pd.date_range(start=start_date, end=end_date, freq="D"))

        actual_records = len(df)

        missing_records = expected_records - actual_records

        completeness = round((actual_records / expected_records) * 100, 2)

        return {
            "expected_records": expected_records,
            "actual_records": actual_records,
            "missing_records": max(0, missing_records),
            "completeness_percent": completeness,
            "minimum_required_records": minimum_expected_records,
            "passes_minimum_requirement": actual_records >= minimum_expected_records,
        }
