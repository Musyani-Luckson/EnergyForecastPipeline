"""
Strict 30-day out-of-sample SARIMA validation.

Two experiments, each training on a fixed window and forecasting exactly
30 days beyond the end of its training data:

    2yrs.csv (2008-2009) -> 30-day forecast -> validated against 2010
    3yrs.csv (2007-2009) -> 30-day forecast -> validated against 2010

2010.csv is an independent validation set. It is not opened until the
forecast for an experiment has already been produced: `train_and_forecast`
receives only the training path, and the validation file is read inside
`validate`, which is called afterwards with the finished forecast. Nothing
derived from 2010 reaches preprocessing, outlier treatment, the ADF test,
the choice of d and D, the grid search, or the fit.

The model is never handed a differenced series. The differencing orders
are determined from the training data and declared to SARIMAX, which
differences internally and integrates back, so the forecast is returned in
kWh rather than in period-over-period change.

Run from the server directory:

    python experiments/sarima_30day_validation.py
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

SERVER_ROOT = Path(__file__).resolve().parent.parent
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from algorithm.forecastEngine.ForecastEngine import ForecastEngine          # noqa: E402
from algorithm.forecastEngine.SARIMA.SARIMAEngine import SARIMAEngine       # noqa: E402
from algorithm.forecastEngine.differencing.DifferencingEngine import (      # noqa: E402
    DifferencingEngine,
)
from algorithm.forecastEngine.optimizeSARIMA.SARIMAOptimizer import (       # noqa: E402
    SARIMAOptimizer,
)
from algorithm.forecastEngine.stationarity.StationarityEngine import (      # noqa: E402
    StationarityEngine,
)
from algorithm.preprocess.dataClearning.clean_duplicates import clean_duplicates  # noqa: E402
from algorithm.preprocess.dataClearning.enforce_daily_continuity import (   # noqa: E402
    enforce_daily_continuity,
)
from algorithm.preprocess.dataClearning.fill_missing_values import (        # noqa: E402
    fill_missing_values,
)
from algorithm.preprocess.outlierProcessing.IQRCleaner import IQRCleaner    # noqa: E402

DATA_DIR = SERVER_ROOT / "data_by_year"
RESULTS_DIR = SERVER_ROOT / "results"
VALIDATION_FILE = DATA_DIR / "2010.csv"

HORIZON = 30
CONFIDENCE = 0.95
DATE_COLUMN = "Date"
VALUE_COLUMN = "Daily_kWh"


# ── data integrity ───────────────────────────────────────────────────────────

@dataclass
class Integrity:
    """What inspecting a file found, reported rather than silently repaired."""

    name: str
    rows: int
    columns: list
    start: str
    end: str
    was_sorted: bool
    duplicate_dates: int
    missing_values: int
    calendar_days: int
    missing_dates: list = field(default_factory=list)
    numeric_values: bool = True

    def report(self) -> None:
        print(f"  {self.name}: {self.rows} rows, {self.start} -> {self.end}")
        print(f"    columns={self.columns}  numeric={self.numeric_values}")
        print(f"    chronologically sorted on disk: {self.was_sorted}")
        print(f"    duplicate dates: {self.duplicate_dates}   missing values: {self.missing_values}")
        print(
            f"    calendar span {self.calendar_days} days, "
            f"{len(self.missing_dates)} date(s) absent"
        )
        if self.missing_dates:
            shown = ", ".join(self.missing_dates[:8])
            more = "" if len(self.missing_dates) <= 8 else f" (+{len(self.missing_dates) - 8} more)"
            print(f"      absent: {shown}{more}")


def inspect(path: Path) -> tuple[pd.DataFrame, Integrity]:
    """Load a file and describe its condition without altering it."""
    df = pd.read_csv(path)
    numeric = pd.api.types.is_numeric_dtype(df[VALUE_COLUMN])
    df[DATE_COLUMN] = pd.to_datetime(df[DATE_COLUMN])

    was_sorted = bool(df[DATE_COLUMN].is_monotonic_increasing)
    ordered = df.sort_values(DATE_COLUMN)
    span = pd.date_range(ordered[DATE_COLUMN].min(), ordered[DATE_COLUMN].max(), freq="D")
    absent = span.difference(pd.DatetimeIndex(ordered[DATE_COLUMN]))

    info = Integrity(
        name=path.name,
        rows=len(df),
        columns=list(df.columns),
        start=str(ordered[DATE_COLUMN].min().date()),
        end=str(ordered[DATE_COLUMN].max().date()),
        was_sorted=was_sorted,
        duplicate_dates=int(df[DATE_COLUMN].duplicated().sum()),
        missing_values=int(df[VALUE_COLUMN].isna().sum()),
        calendar_days=len(span),
        missing_dates=[d.date().isoformat() for d in absent],
        numeric_values=bool(numeric),
    )
    return df, info


# ── training side ────────────────────────────────────────────────────────────

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """
    The project's own preprocessing, applied to training data only.

    Sorting is explicit because one of the supplied files is not stored in
    chronological order, and every step after this assumes a time-ordered
    series.
    """
    frame = df.copy()
    frame[DATE_COLUMN] = pd.to_datetime(frame[DATE_COLUMN])
    frame = frame.sort_values(DATE_COLUMN).reset_index(drop=True)

    frame = clean_duplicates(frame)
    frame = enforce_daily_continuity(frame)   # absent days become explicit gaps
    frame = fill_missing_values(frame)        # and are then imputed
    return frame


def treat_outliers(frame: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """IQR detection with radius-7 local-median replacement, as the app applies."""
    series = frame[VALUE_COLUMN]
    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    detected = int(((series < lower) | (series > upper) | (series < 0)).sum())

    treated = frame.copy()
    treated[VALUE_COLUMN] = IQRCleaner.clean(series, strategy="local_median", window=7)
    return treated, detected


def train_and_forecast(training_path: Path) -> dict:
    """
    Everything from raw training file to a finished 30-day forecast.

    Only `training_path` is read here. No validation data is available to
    this function, which is what keeps the experiment out-of-sample.
    """
    raw, info = inspect(training_path)
    info.report()

    frame = preprocess(raw)
    treated, outliers_detected = treat_outliers(frame)
    print(f"    preprocessed to {len(treated)} continuous daily records; "
          f"{outliers_detected} outlier(s) detected and replaced")

    series = (
        treated.set_index(DATE_COLUMN)[VALUE_COLUMN].astype(float).sort_index()
    )

    # Stationarity and differencing, decided on the training series alone.
    adf = StationarityEngine.analyze(series)
    seasonal_period = ForecastEngine.detect_seasonal_period(series)
    differencing = DifferencingEngine.recommend(series, seasonal_period=seasonal_period)
    if differencing["recommended_d"] is None:
        raise RuntimeError("Stationarity unreachable within d<=2, D<=1 for this series.")

    d, D = differencing["recommended_d"], differencing["recommended_D"]
    print(f"    ADF on training series: statistic={adf['statistic']:.4f} "
          f"p={adf['p_value']:.6g} -> stationary={adf['is_stationary']}")
    print(f"    seasonal period s={seasonal_period}; differencing d={d}, D={D}")

    # Grid search over the contract's bounded space, ranked by AIC.
    print(f"    grid search over 144 candidates ...", flush=True)
    optimisation = SARIMAOptimizer.grid_search(
        series, d=d, D=D, seasonal_period=seasonal_period
    )
    best = optimisation["best"]
    order = tuple(best["order"])
    seasonal_order = tuple(best["seasonal_order"])
    print(f"    selected SARIMA{order}{seasonal_order}  "
          f"AIC={best['aic']:.2f} BIC={best['bic']:.2f} "
          f"({len(optimisation['candidates'])} fitted, "
          f"{len(optimisation['failures'])} failed, "
          f"{optimisation['workers']} worker(s))")

    # Fit on the whole training window and project exactly HORIZON days.
    # The series handed over is undifferenced: SARIMAX applies d and D and
    # integrates back, so the result is in kWh.
    forecast = SARIMAEngine.forecast(
        series, order, seasonal_order, horizon=HORIZON, confidence=CONFIDENCE
    )

    last_training_date = series.index.max()
    forecast_dates = [
        (last_training_date + pd.Timedelta(days=i + 1)).normalize()
        for i in range(HORIZON)
    ]

    forecast_table = pd.DataFrame(
        {
            "Date": forecast_dates,
            "Forecast_kWh": forecast["values"],
            "Lower_95": forecast["lower_bound"],
            "Upper_95": forecast["upper_bound"],
        }
    )
    print(f"    forecast horizon: {len(forecast_table)} days, "
          f"{forecast_dates[0].date()} -> {forecast_dates[-1].date()}")

    return {
        "integrity": info,
        "training_observations": int(len(series)),
        "training_start": str(series.index.min().date()),
        "training_end": str(last_training_date.date()),
        "outliers_detected": outliers_detected,
        "adf": adf,
        "seasonal_period": int(seasonal_period),
        "d": int(d),
        "D": int(D),
        "order": [int(v) for v in order],
        "seasonal_order": [int(v) for v in seasonal_order],
        "aic": float(best["aic"]),
        "bic": float(best["bic"]),
        "candidates_fitted": len(optimisation["candidates"]),
        "candidates_failed": len(optimisation["failures"]),
        "forecast": forecast_table,
    }


# ── validation side (touches 2010 for the first time) ────────────────────────

def validate(forecast_table: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Match the finished forecast to the actuals, by date.

    Rows are joined on the date rather than by position, because a day is
    absent from the validation file and positional matching would silently
    compare a forecast against the wrong day's reading.
    """
    actuals = pd.read_csv(VALIDATION_FILE)
    actuals[DATE_COLUMN] = pd.to_datetime(actuals[DATE_COLUMN])
    actuals = actuals.sort_values(DATE_COLUMN)[[DATE_COLUMN, VALUE_COLUMN]]
    actuals = actuals.rename(columns={VALUE_COLUMN: "Actual_kWh"})

    table = forecast_table.merge(actuals, on="Date", how="left")
    table = table[["Date", "Actual_kWh", "Forecast_kWh", "Lower_95", "Upper_95"]]

    table["Error"] = table["Actual_kWh"] - table["Forecast_kWh"]
    table["Absolute_Error"] = table["Error"].abs()
    inside = (table["Actual_kWh"] >= table["Lower_95"]) & (
        table["Actual_kWh"] <= table["Upper_95"]
    )
    table["Inside_95_Interval"] = inside.where(table["Actual_kWh"].notna())

    matched = table.dropna(subset=["Actual_kWh"])
    n = len(matched)
    unmatched = table[table["Actual_kWh"].isna()]["Date"].dt.date.astype(str).tolist()

    errors = matched["Error"]
    widths = table["Upper_95"] - table["Lower_95"]
    n_inside = int(matched["Inside_95_Interval"].sum())

    metrics = {
        "forecast_horizon_days": int(len(table)),
        "observations_matched": n,
        "dates_without_an_actual": unmatched,
        "mae": float(matched["Absolute_Error"].mean()),
        "rmse": float(math.sqrt((errors ** 2).mean())),
        "mape_percent": float((errors.abs() / matched["Actual_kWh"]).mean() * 100),
        "bias_mean_error": float(errors.mean()),
        "observations_inside_interval": n_inside,
        "observations_outside_interval": n - n_inside,
        # Denominator is the number of days an actual exists for, not the
        # horizon: dividing by 30 when only 29 can be checked would report a
        # coverage lower than the interval actually achieved.
        "empirical_coverage_percent": float(n_inside / n * 100) if n else None,
        "coverage_denominator": n,
        "average_interval_width": float(widths.mean()),
        "minimum_interval_width": float(widths.min()),
        "maximum_interval_width": float(widths.max()),
    }
    return table, metrics


# ── orchestration ────────────────────────────────────────────────────────────

def run_experiment(label: str, training_file: str, out_dir: Path) -> dict:
    print(f"\n{'=' * 74}\nEXPERIMENT: {label}  (training on {training_file})\n{'=' * 74}")

    result = train_and_forecast(DATA_DIR / training_file)

    print("  --- forecast complete; opening the validation file now ---")
    table, metrics = validate(result["forecast"])

    out_dir.mkdir(parents=True, exist_ok=True)
    result["forecast"].assign(Date=lambda f: f["Date"].dt.strftime("%Y-%m-%d")).to_csv(
        out_dir / "forecast_30_days.csv", index=False
    )
    table.assign(Date=lambda f: f["Date"].dt.strftime("%Y-%m-%d")).to_csv(
        out_dir / "validation_30_days.csv", index=False
    )

    payload = {
        "experiment": label,
        "training_file": training_file,
        "validation_file": VALIDATION_FILE.name,
        "training_observations": result["training_observations"],
        "training_period": f"{result['training_start']} to {result['training_end']}",
        "outliers_detected": result["outliers_detected"],
        "adf_statistic": result["adf"]["statistic"],
        "adf_p_value": result["adf"]["p_value"],
        "adf_is_stationary": result["adf"]["is_stationary"],
        "seasonal_period": result["seasonal_period"],
        "differencing_d": result["d"],
        "differencing_D": result["D"],
        "selected_order": result["order"],
        "selected_seasonal_order": result["seasonal_order"],
        "aic": result["aic"],
        "bic": result["bic"],
        "candidates_fitted": result["candidates_fitted"],
        "candidates_failed": result["candidates_failed"],
        **metrics,
    }
    (out_dir / "metrics.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"  MAE={metrics['mae']:.4f}  RMSE={metrics['rmse']:.4f}  "
          f"MAPE={metrics['mape_percent']:.2f}%  bias={metrics['bias_mean_error']:+.4f}")
    print(f"  inside 95% interval: {metrics['observations_inside_interval']}"
          f"/{metrics['coverage_denominator']} "
          f"= {metrics['empirical_coverage_percent']:.2f}% "
          f"(avg width {metrics['average_interval_width']:.2f} kWh)")
    print(f"  written to {out_dir}")

    payload["_table"] = table
    return payload


def comparison(two: dict, three: dict) -> None:
    rows = [
        ("Training observations", two["training_observations"], three["training_observations"], "{:d}"),
        ("Forecast horizon (days)", two["forecast_horizon_days"], three["forecast_horizon_days"], "{:d}"),
        ("Observations validated", two["observations_matched"], three["observations_matched"], "{:d}"),
        ("Selected order", two["selected_order"], three["selected_order"], "{}"),
        ("Seasonal order", two["selected_seasonal_order"], three["selected_seasonal_order"], "{}"),
        ("MAE (kWh)", two["mae"], three["mae"], "{:.4f}"),
        ("RMSE (kWh)", two["rmse"], three["rmse"], "{:.4f}"),
        ("MAPE (%)", two["mape_percent"], three["mape_percent"], "{:.2f}"),
        ("Bias (kWh)", two["bias_mean_error"], three["bias_mean_error"], "{:+.4f}"),
        ("95% coverage (%)", two["empirical_coverage_percent"], three["empirical_coverage_percent"], "{:.2f}"),
        ("Inside interval", two["observations_inside_interval"], three["observations_inside_interval"], "{:d}"),
        ("Outside interval", two["observations_outside_interval"], three["observations_outside_interval"], "{:d}"),
        ("Avg interval width (kWh)", two["average_interval_width"], three["average_interval_width"], "{:.2f}"),
        ("Min interval width (kWh)", two["minimum_interval_width"], three["minimum_interval_width"], "{:.2f}"),
        ("Max interval width (kWh)", two["maximum_interval_width"], three["maximum_interval_width"], "{:.2f}"),
    ]
    print(f"\n{'=' * 74}\nCOMPARISON\n{'=' * 74}")
    print(f"{'Metric':<28}{'2-Year Model':>22}{'3-Year Model':>22}")
    print("-" * 74)
    for label, a, b, fmt in rows:
        print(f"{label:<28}{fmt.format(a):>22}{fmt.format(b):>22}")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "comparison.json").write_text(
        json.dumps(
            {"two_year": {k: v for k, v in two.items() if k != "_table"},
             "three_year": {k: v for k, v in three.items() if k != "_table"}},
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nwritten to {RESULTS_DIR / 'comparison.json'}")


def main() -> None:
    print("=" * 74)
    print("30-DAY OUT-OF-SAMPLE SARIMA VALIDATION")
    print("=" * 74)
    print("\nValidation file integrity (inspected only; not used until validation):")
    _, validation_info = inspect(VALIDATION_FILE)
    validation_info.report()

    two = run_experiment("2-year model", "2yrs.csv", RESULTS_DIR / "sarima_2yr")
    three = run_experiment("3-year model", "3yrs.csv", RESULTS_DIR / "sarima_3yr")
    comparison(two, three)


if __name__ == "__main__":
    main()
