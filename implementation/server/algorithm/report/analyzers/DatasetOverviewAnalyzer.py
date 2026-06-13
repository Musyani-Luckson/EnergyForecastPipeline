import pandas as pd


class DatasetOverviewAnalyzer:

    @staticmethod
    def analyze(df, datetime_col="Date"):

        df = df.copy()

        df[datetime_col] = pd.to_datetime(df[datetime_col])

        start_date = df[datetime_col].min()
        end_date = df[datetime_col].max()

        duration_days = (end_date - start_date).days + 1
        duration_years = round(duration_days / 365.25, 2)

        return {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns),
            "start_date": str(start_date),
            "end_date": str(end_date),
            "duration_days": duration_days,
            "duration_years": duration_years,
        }
