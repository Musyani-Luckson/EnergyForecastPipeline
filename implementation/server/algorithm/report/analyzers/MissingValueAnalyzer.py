class MissingValueAnalyzer:

    @staticmethod
    def analyze(df):

        total_cells = df.shape[0] * df.shape[1]

        total_missing = int(df.isnull().sum().sum())

        missing_percentage = (
            round((total_missing / total_cells) * 100, 2) if total_cells else 0
        )

        affected_rows = int(df.isnull().any(axis=1).sum())

        affected_row_percentage = (
            round((affected_rows / len(df)) * 100, 2) if len(df) else 0
        )

        return {
            "total_missing": total_missing,
            "missing_percentage": missing_percentage,
            "affected_rows": affected_rows,
            "affected_row_percentage": affected_row_percentage,
            "column_missing": df.isnull().sum().to_dict(),
        }
