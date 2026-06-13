import numpy as np
from scipy.stats import zscore


class OutlierAnalysisAnalyzer:

    @staticmethod
    def analyze(df, value_col):

        series = df[value_col].dropna()

        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)

        iqr = q3 - q1

        lower_bound = q1 - (1.5 * iqr)
        upper_bound = q3 + (1.5 * iqr)

        iqr_outliers = series[(series < lower_bound) | (series > upper_bound)]

        z_scores = np.abs(zscore(series))

        zscore_outliers = series[z_scores > 3]

        return {
            "iqr_method": {
                "q1": round(float(q1), 4),
                "q3": round(float(q3), 4),
                "iqr": round(float(iqr), 4),
                "lower_bound": round(float(lower_bound), 4),
                "upper_bound": round(float(upper_bound), 4),
                "outlier_count": int(len(iqr_outliers)),
                "outlier_percentage": round(len(iqr_outliers) / len(series) * 100, 2),
            },
            "zscore_method": {
                "outlier_count": int(len(zscore_outliers)),
                "outlier_percentage": round(
                    len(zscore_outliers) / len(series) * 100, 2
                ),
            },
        }
