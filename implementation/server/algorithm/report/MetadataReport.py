from dataclasses import dataclass


@dataclass
class MetadataReport:

    dataset_overview: dict
    date_coverage: dict
    frequency_analysis: dict
    missing_values: dict
    duplicates: dict
    statistical_summary: dict
    distribution_analysis: dict
    energy_value_analysis: dict
    outlier_analysis: dict
    trend_analysis: dict
    seasonality_analysis: dict
    annual_breakdown: dict
    stationarity_analysis: dict
    differencing_analysis: dict
    forecasting_readiness: dict
