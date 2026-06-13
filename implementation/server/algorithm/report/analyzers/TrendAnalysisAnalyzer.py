import numpy as np
from scipy.stats import linregress


class TrendAnalysisAnalyzer:

    @staticmethod
    def analyze(df, datetime_col, value_col):

        df = df.copy()
        df[datetime_col] = __import__("pandas").to_datetime(df[datetime_col])

        df = df.sort_values(datetime_col)

        # convert time into numeric index
        x = np.arange(len(df))
        y = df[value_col].values

        slope, intercept, r_value, p_value, std_err = linregress(x, y)

        direction = (
            "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable"
        )

        return {
            "slope": round(float(slope), 6),
            "intercept": round(float(intercept), 4),
            "r_squared": round(float(r_value**2), 4),
            "p_value": round(float(p_value), 6),
            "direction": direction,
        }
