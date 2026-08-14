import pandas as pd

from algorithm.forecastEngine.stationarity.StationarityEngine import StationarityEngine
from algorithm.forecastEngine.differencing.DifferencingEngine import DifferencingEngine
from algorithm.forecastEngine.SARIMA.SARIMAEngine import SARIMAEngine
from algorithm.forecastEngine.optimizeSARIMA.SARIMAOptimizer import SARIMAOptimizer


class ForecastEngine:
    """
    Control class coordinating the full forecasting workflow
    (per the system class diagram):

        applyConfig() -> runForecast()

    Contract defaults (Methodology Ch. 3):
    - 30-day forecast horizon with 95% confidence intervals
      (FR7, FR8)
    - seasonal period s in {7, 30}, selected dynamically from
      the dominant cycle in the data (3.3.3)
    - clip-to-zero on forecast outputs (System Design 4.4.3.2)

    The model is fitted on 100% of the supplied series. No data is
    withheld: this is an operational forecasting system, so every
    available observation informs the prediction. Accuracy
    evaluation is a separate concern and belongs to a dedicated
    backtesting / rolling-origin process, not to this run.

    Composes StationarityEngine, DifferencingEngine,
    SARIMAOptimizer and SARIMAEngine. Pure computation:
    no Django dependencies.
    """

    # Candidate seasonal periods for daily data
    # (Methodology 3.3.3: s in {7, 30}).
    SEASONAL_PERIODS = (7, 30)

    DEFAULT_CONFIG = {
        "seasonality": "auto",  # dynamic selection from {7, 30}
        "forecast_horizon": 30,  # FR7: 30-day forecast
        "confidence": 0.95,  # FR8: 95% confidence intervals
        "clip_negative": True,  # 4.4.3.2: clip-to-zero constraint
        "algorithm": "SARIMA",
        "p_range": SARIMAOptimizer.DEFAULT_P_RANGE,
        "q_range": SARIMAOptimizer.DEFAULT_Q_RANGE,
        "P_range": SARIMAOptimizer.DEFAULT_SEASONAL_P_RANGE,
        "Q_range": SARIMAOptimizer.DEFAULT_SEASONAL_Q_RANGE,
    }

    def __init__(self, configuration: dict | None = None):
        self.configuration = dict(self.DEFAULT_CONFIG)

        if configuration:
            self.apply_config(configuration)

    def apply_config(self, configuration: dict) -> dict:
        """
        Merge a configuration dict over the current one.
        Unknown keys are rejected to surface typos early.
        """
        if not isinstance(configuration, dict):
            raise ValueError("configuration must be a dict.")

        unknown = set(configuration) - set(self.DEFAULT_CONFIG)

        if unknown:
            raise ValueError(f"Unknown configuration keys: {sorted(unknown)}")

        self.configuration.update(configuration)

        if self.configuration["algorithm"] != "SARIMA":
            raise ValueError(
                f"Unsupported algorithm '{self.configuration['algorithm']}'."
            )

        seasonality = self.configuration["seasonality"]

        if seasonality != "auto" and (
            not isinstance(seasonality, int) or seasonality < 2
        ):
            raise ValueError(
                "seasonality must be 'auto' or an integer >= 2."
            )

        return self.configuration

    @classmethod
    def detect_seasonal_period(cls, series: pd.Series) -> int:
        """
        Select the seasonal period s dynamically from the
        dominant recurring cycle (Methodology 3.3.3 / System
        Design 4.4.2): the candidate in {7, 30} with the
        strongest autocorrelation wins.
        """
        cleaned = series.dropna()

        candidates = [
            s for s in cls.SEASONAL_PERIODS if len(cleaned) >= 2 * s
        ]

        if not candidates:
            return cls.SEASONAL_PERIODS[0]

        strengths = {
            s: abs(cleaned.autocorr(lag=s)) for s in candidates
        }

        return max(strengths, key=strengths.get)

    def run_forecast(self, series: pd.Series, progress_callback=None) -> dict:
        """
        Execute the full pipeline on a prepared series:

        1. Detect the seasonal period s (if configured 'auto').
        2. Recommend differencing orders (d, D) via ADF testing.
        3. Grid-search (p, q)(P, Q) ranked by AIC.
        4. Fit on the full series and forecast the horizon.

        Nothing is held back: the fit uses every observation
        supplied.

        Returns one dict containing every intermediate artifact
        so results are fully reproducible.

        progress_callback, if given, is called as
        progress_callback(phase, done, total, evaluated, best);
        done/total are None for phases without step counts, and
        evaluated/best are populated only during the grid search.
        """
        if series is None or len(series) == 0:
            raise ValueError("Series is empty.")

        def report(phase, done=None, total=None, evaluated=None, best=None):
            if progress_callback:
                progress_callback(phase, done, total, evaluated, best)

        config = self.configuration

        seasonality = config["seasonality"]

        if seasonality == "auto":
            seasonality = self.detect_seasonal_period(series)

        report("differencing")

        differencing = DifferencingEngine.recommend(
            series,
            seasonal_period=seasonality,
        )

        if differencing["recommended_d"] is None:
            # Methodology 3.5.2: if stationarity cannot be
            # achieved within the allowed differencing orders,
            # halt with a diagnostic failure state.
            raise ValueError(
                "Stationarity could not be achieved within the "
                "supported differencing orders (d <= 2, D <= 1); "
                "forecasting halted. Review preprocessing."
            )

        d = differencing["recommended_d"]
        D = differencing["recommended_D"]

        report("optimizing")

        optimization = SARIMAOptimizer.grid_search(
            series,
            d=d,
            D=D,
            seasonal_period=seasonality,
            p_range=config["p_range"],
            q_range=config["q_range"],
            P_range=config["P_range"],
            Q_range=config["Q_range"],
            progress_callback=lambda done, total, evaluated, best: report(
                "optimizing", done, total, evaluated, best
            ),
        )

        best = optimization["best"]
        order = tuple(best["order"])
        seasonal_order = tuple(best["seasonal_order"])

        report("forecasting")

        forecast = SARIMAEngine.forecast(
            series,
            order,
            seasonal_order,
            horizon=config["forecast_horizon"],
            confidence=config["confidence"],
            clip_negative=config["clip_negative"],
        )

        resolved_config = {**config, "seasonality": seasonality}

        return {
            "configuration": resolved_config,
            "differencing": differencing,
            "optimization": optimization,
            "forecast": forecast,
        }
