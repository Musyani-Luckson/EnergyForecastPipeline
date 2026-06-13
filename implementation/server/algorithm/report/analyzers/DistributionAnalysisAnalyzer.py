from scipy.stats import skew
from scipy.stats import kurtosis


class DistributionAnalysisAnalyzer:

    @staticmethod
    def analyze(df, value_col):

        series = df[value_col].dropna()

        return {
            "skewness": round(float(skew(series)), 4),
            "kurtosis": round(float(kurtosis(series)), 4),
            "is_right_skewed": skew(series) > 0,
            "is_left_skewed": skew(series) < 0,
        }
