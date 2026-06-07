from statsmodels.tsa.stattools import adfuller


class DifferencingAnalysisAnalyzer:

    @staticmethod
    def analyze(df, value_col="Daily_kWh"):

        series = df[value_col].dropna()

        result = {}

        # Original Series
        adf = adfuller(series)

        original_stationary = adf[1] < 0.05

        result["original_series"] = {
            "adf_statistic": round(float(adf[0]), 6),
            "p_value": round(float(adf[1]), 6),
            "is_stationary": original_stationary,
        }

        # Already stationary -> stop here
        if original_stationary:
            result["recommended_d"] = 0
            result["differencing_required"] = False
            result["recommendation"] = (
                "Series is already stationary. No differencing required (d=0)."
            )
            return result

        # First Difference
        diff1 = series.diff().dropna()
        adf1 = adfuller(diff1)

        first_stationary = adf1[1] < 0.05

        result["first_difference"] = {
            "adf_statistic": round(float(adf1[0]), 6),
            "p_value": round(float(adf1[1]), 6),
            "is_stationary": first_stationary,
        }

        if first_stationary:
            result["recommended_d"] = 1
            result["differencing_required"] = True
            result["recommendation"] = (
                "First-order differencing achieves stationarity. Use d=1."
            )
            return result

        # Second Difference
        diff2 = diff1.diff().dropna()
        adf2 = adfuller(diff2)

        second_stationary = adf2[1] < 0.05

        result["second_difference"] = {
            "adf_statistic": round(float(adf2[0]), 6),
            "p_value": round(float(adf2[1]), 6),
            "is_stationary": second_stationary,
        }

        if second_stationary:
            result["recommended_d"] = 2
            result["differencing_required"] = True
            result["recommendation"] = (
                "Second-order differencing achieves stationarity. Use d=2."
            )
        else:
            result["recommended_d"] = None
            result["differencing_required"] = True
            result["recommendation"] = (
                "Series remains non-stationary after second-order differencing. "
                "Further investigation is required."
            )

        return result
