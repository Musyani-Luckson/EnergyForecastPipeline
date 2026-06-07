from statsmodels.tsa.stattools import adfuller


class StationarityAnalysisAnalyzer:

    @staticmethod
    def analyze(df, value_col):

        series = df[value_col].dropna()

        result = adfuller(series)

        adf_stat = result[0]
        p_value = result[1]
        critical_values = result[4]

        is_stationary = p_value < 0.05

        return {
            "adf_statistic": round(float(adf_stat), 6),
            "p_value": round(float(p_value), 6),
            "is_stationary": bool(is_stationary),
            "critical_values": {
                k: round(float(v), 6) for k, v in critical_values.items()
            },
        }
