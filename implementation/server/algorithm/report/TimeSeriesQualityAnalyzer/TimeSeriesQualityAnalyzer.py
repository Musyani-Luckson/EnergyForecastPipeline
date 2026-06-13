from algorithm.report.analyzers.DatasetOverviewAnalyzer import DatasetOverviewAnalyzer
from algorithm.report.analyzers.DateCoverageAnalyzer import DateCoverageAnalyzer
from algorithm.report.analyzers.FrequencyAnalysisAnalyzer import (
    FrequencyAnalysisAnalyzer,
)
from algorithm.report.analyzers.MissingValueAnalyzer import MissingValueAnalyzer
from algorithm.report.analyzers.DuplicateAnalyzer import DuplicateAnalyzer
from algorithm.report.analyzers.StatisticalSummaryAnalyzer import (
    StatisticalSummaryAnalyzer,
)
from algorithm.report.analyzers.DistributionAnalysisAnalyzer import (
    DistributionAnalysisAnalyzer,
)
from algorithm.report.analyzers.OutlierAnalysisAnalyzer import OutlierAnalysisAnalyzer
from algorithm.report.analyzers.TrendAnalysisAnalyzer import TrendAnalysisAnalyzer
from algorithm.report.analyzers.SeasonalityAnalysisAnalyzer import (
    SeasonalityAnalysisAnalyzer,
)
from algorithm.report.analyzers.AnnualBreakdownAnalyzer import AnnualBreakdownAnalyzer
from algorithm.report.analyzers.StationarityAnalysisAnalyzer import (
    StationarityAnalysisAnalyzer,
)
from algorithm.report.analyzers.ForecastingReadinessAnalyzer import (
    ForecastingReadinessAnalyzer,
)
from algorithm.report.analyzers.EnergyValueAnalyzer import EnergyValueAnalyzer
from algorithm.report.analyzers.DifferencingAnalysisAnalyzer import (
    DifferencingAnalysisAnalyzer,
)

from algorithm.report.MetadataReport import MetadataReport


class TimeSeriesQualityAnalyzer:

    @staticmethod
    def extract(
        df, datetime_col="Date", value_col="Daily_kWh", minimum_expected_records=365
    ):

        dataset_overview = DatasetOverviewAnalyzer.analyze(df, datetime_col)

        date_coverage = DateCoverageAnalyzer.analyze(
            df, datetime_col, minimum_expected_records
        )

        frequency_analysis = FrequencyAnalysisAnalyzer.analyze(df, datetime_col)

        missing_values = MissingValueAnalyzer.analyze(df)

        duplicates = DuplicateAnalyzer.analyze(df)

        statistical_summary = StatisticalSummaryAnalyzer.analyze(df, value_col)

        distribution_analysis = DistributionAnalysisAnalyzer.analyze(df, value_col)

        energy_value_analysis = EnergyValueAnalyzer.analyze(df, value_col)

        outlier_analysis = OutlierAnalysisAnalyzer.analyze(df, value_col)

        trend_analysis = TrendAnalysisAnalyzer.analyze(df, datetime_col, value_col)

        seasonality_analysis = SeasonalityAnalysisAnalyzer.analyze(
            df, datetime_col, value_col
        )

        annual_breakdown = AnnualBreakdownAnalyzer.analyze(df, datetime_col, value_col)

        stationarity_analysis = StationarityAnalysisAnalyzer.analyze(df, value_col)

        differencing_analysis = DifferencingAnalysisAnalyzer.analyze(df, value_col)

        forecasting_readiness = ForecastingReadinessAnalyzer.analyze(
            date_coverage,
            frequency_analysis,
            missing_values,
            duplicates,
            outlier_analysis,
            stationarity_analysis,
        )

        return MetadataReport(
            dataset_overview=dataset_overview,
            date_coverage=date_coverage,
            frequency_analysis=frequency_analysis,
            missing_values=missing_values,
            duplicates=duplicates,
            statistical_summary=statistical_summary,
            distribution_analysis=distribution_analysis,
            energy_value_analysis=energy_value_analysis,
            outlier_analysis=outlier_analysis,
            trend_analysis=trend_analysis,
            seasonality_analysis=seasonality_analysis,
            annual_breakdown=annual_breakdown,
            stationarity_analysis=stationarity_analysis,
            differencing_analysis=differencing_analysis,
            forecasting_readiness=forecasting_readiness,
        )
