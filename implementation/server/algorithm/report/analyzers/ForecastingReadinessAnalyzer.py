class ForecastingReadinessAnalyzer:

    @staticmethod
    def analyze(
        date_coverage,
        frequency_analysis,
        missing_values,
        duplicates,
        outlier_analysis,
        stationarity_analysis,
    ):

        score = 100
        issues = []

        # Missing data penalty
        missing_pct = missing_values.get("missing_percentage", 0)
        if missing_pct > 0:
            score -= min(30, missing_pct)
            issues.append("Missing values detected")

        # Duplicate penalty
        dup = duplicates.get("duplicate_rows", 0)
        if dup > 0:
            score -= min(15, dup * 0.1)
            issues.append("Duplicate records found")

        # Frequency penalty
        freq_violations = frequency_analysis.get("frequency_violations", 0)
        if freq_violations > 0:
            score -= min(20, freq_violations * 0.5)
            issues.append("Irregular time intervals")

        # Outliers penalty
        outliers = outlier_analysis.get("iqr_method", {}).get("outlier_percentage", 0)
        if outliers > 5:
            score -= min(10, outliers)

        # Stationarity bonus/penalty
        if not stationarity_analysis.get("is_stationary", False):
            score -= 10
            issues.append("Non-stationary series")

        # Coverage validation
        if not date_coverage.get("passes_minimum_requirement", True):
            score -= 20
            issues.append("Insufficient data length")

        score = max(0, min(100, round(score, 2)))

        grade = (
            "A+"
            if score >= 95
            else (
                "A"
                if score >= 90
                else (
                    "B"
                    if score >= 80
                    else "C" if score >= 70 else "D" if score >= 60 else "F"
                )
            )
        )

        recommended_models = []

        if stationarity_analysis.get("is_stationary", False):
            recommended_models.append("ARIMA")
        else:
            recommended_models.append("SARIMA")
            recommended_models.append("Prophet")

        return {
            "score": score,
            "grade": grade,
            "issues": issues,
            "recommended_models": recommended_models,
        }
