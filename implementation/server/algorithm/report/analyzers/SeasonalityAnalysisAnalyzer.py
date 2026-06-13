import pandas as pd


class SeasonalityAnalysisAnalyzer:

    @staticmethod
    def analyze(df, datetime_col, value_col):

        df = df.copy()
        df[datetime_col] = pd.to_datetime(df[datetime_col])

        df["month"] = df[datetime_col].dt.month

        monthly_avg = df.groupby("month")[value_col].mean()

        peak_month = int(monthly_avg.idxmax())
        low_month = int(monthly_avg.idxmin())

        variation = ((monthly_avg.max() - monthly_avg.min()) / monthly_avg.mean()) * 100

        return {
            "monthly_averages": {
                int(k): round(float(v), 4) for k, v in monthly_avg.items()
            },
            "peak_month": peak_month,
            "lowest_month": low_month,
            "seasonal_variation_percent": round(float(variation), 2),
        }
