import pandas as pd


def enforce_daily_continuity(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["Date"] = pd.to_datetime(df["Date"]).dt.normalize()
    df = df.drop_duplicates(subset="Date", keep="last")

    # Extract year range
    start_year = df["Date"].dt.year.min()
    end_year = df["Date"].dt.year.max()

    # Force full calendar expansion across years
    full_range = pd.date_range(
        start=f"{start_year}-01-01", end=f"{end_year}-12-31", freq="D"
    )

    df = df.set_index("Date").reindex(full_range)

    df.index.name = "Date"

    return df.reset_index()
