import pandas as pd


class AnnualBreakdownAnalyzer:

    @staticmethod
    def analyze(df, datetime_col, value_col):

        df = df.copy()
        df[datetime_col] = pd.to_datetime(df[datetime_col])

        df["year"] = df[datetime_col].dt.year

        grouped = df.groupby("year")[value_col]

        result = {}

        for year, series in grouped:
            result[int(year)] = {
                "records": int(series.count()),
                "mean": round(float(series.mean()), 4),
                "min": round(float(series.min()), 4),
                "max": round(float(series.max()), 4),
            }

        return result
