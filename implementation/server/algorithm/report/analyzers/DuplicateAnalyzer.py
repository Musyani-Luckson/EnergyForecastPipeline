class DuplicateAnalyzer:

    @staticmethod
    def analyze(df, datetime_col="Date"):

        duplicate_rows = int(df.duplicated().sum())

        duplicate_dates = int(df[datetime_col].duplicated().sum())

        duplicate_timestamps = (
            df[df[datetime_col].duplicated()][datetime_col].astype(str).tolist()
        )

        return {
            "duplicate_rows": duplicate_rows,
            "duplicate_dates": duplicate_dates,
            "duplicate_timestamps": duplicate_timestamps,
        }
