import numpy as np


class StatisticalSummaryAnalyzer:

    @staticmethod
    def analyze(df, value_col):

        series = df[value_col].dropna()

        return {
            "count": int(series.count()),
            "mean": round(float(series.mean()), 4),
            "median": round(float(series.median()), 4),
            "std": round(float(series.std()), 4),
            "variance": round(float(series.var()), 4),
            "min": round(float(series.min()), 4),
            "max": round(float(series.max()), 4),
            "range": round(float(series.max() - series.min()), 4),
            "sum": round(float(series.sum()), 4),
        }
