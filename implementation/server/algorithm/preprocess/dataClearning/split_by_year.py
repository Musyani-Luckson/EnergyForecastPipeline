def split_by_year(df):
    df["Year"] = df["Date"].dt.year
    return {year: group.copy() for year, group in df.groupby("Year")}
