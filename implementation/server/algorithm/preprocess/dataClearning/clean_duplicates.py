import pandas as pd


def clean_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Removes duplicate rows based on 'Date' column.
    Keeps the last occurrence of each Date.

    Parameters:
        df (pd.DataFrame): Input dataframe with 'Date' column.

    Returns:
        pd.DataFrame: Deduplicated dataframe.
    """

    # Ensure Date is treated consistently (important for silent duplicate formats)
    df = df.copy()
    df["Date"] = pd.to_datetime(df["Date"])

    # Drop duplicates, keeping the last occurrence
    df = df.drop_duplicates(subset="Date", keep="last")

    # Optional but usually correct for time series work
    df = df.sort_values("Date").reset_index(drop=True)

    return df
