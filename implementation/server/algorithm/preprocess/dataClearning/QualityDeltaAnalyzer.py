class QualityDeltaAnalyzer:

    @staticmethod
    def compare(raw_report, clean_report):

        return {
            "missing_reduction": raw_report.missing_values.total_missing
            - clean_report.missing_values.total_missing,
            "duplicate_reduction": raw_report.duplicates.duplicate_count
            - clean_report.duplicates.duplicate_count,
            "iqr_change": clean_report.iqr.outlier_count,
        }


{
    "claern_dups",
    "continuity",
    "missing_values",
}
