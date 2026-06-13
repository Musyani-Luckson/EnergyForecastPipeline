import pandas as pd


def fill_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date")

    # 1. local smoothing
    df["Daily_kWh"] = df["Daily_kWh"].fillna(
        df["Daily_kWh"].rolling(7, min_periods=1).mean()
    )

    # 2. weekday correction (structure pattern)
    df["weekday"] = df["Date"].dt.dayofweek
    df["Daily_kWh"] = df["Daily_kWh"].fillna(
        df.groupby("weekday")["Daily_kWh"].transform("mean")
    )

    # 3. fallback cleanup
    df["Daily_kWh"] = df["Daily_kWh"].ffill().bfill()

    return df.drop(columns=["weekday"])
