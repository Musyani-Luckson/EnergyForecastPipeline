"""
Split an energy-consumption CSV into one file per calendar year.

Strictly a file-splitting operation: rows and values are carried through
unchanged. Every column is read as text (dtype=str) so no value is ever
re-parsed and re-formatted on the way out - a float round-trip would
rewrite 20.15293333333334, which would not be an exact copy. The Date
column is parsed only to derive the grouping year; the parsed value is
never written.
"""

from pathlib import Path

import pandas as pd

SOURCE = Path("daily_energy_consumption.csv")
OUTPUT_DIR = Path("data_by_year")

# Format of the source file as it actually exists on disk.
DELIMITER = ","
DATE_COLUMN = "Date"
DATE_FORMAT = "%Y-%m-%d"
LINE_TERMINATOR = "\r\n"


def main() -> None:
    frame = pd.read_csv(SOURCE, sep=DELIMITER, dtype=str, keep_default_na=False)
    total_rows = len(frame)

    years = pd.to_datetime(frame[DATE_COLUMN], format=DATE_FORMAT).dt.year

    OUTPUT_DIR.mkdir(exist_ok=True)

    written = {}
    for year in sorted(years.unique()):
        subset = frame[years == year]
        destination = OUTPUT_DIR / f"{year}.csv"
        subset.to_csv(
            destination,
            sep=DELIMITER,
            index=False,
            lineterminator=LINE_TERMINATOR,
        )
        written[int(year)] = len(subset)

    split_rows = sum(written.values())

    print(f"Source file            : {SOURCE}")
    print(f"Columns                : {list(frame.columns)}")
    print(f"Total rows in original : {total_rows}")
    print(f"Years found            : {[int(y) for y in sorted(years.unique())]}")
    print()
    print("Rows per yearly file:")
    for year, count in written.items():
        print(f"  {OUTPUT_DIR / f'{year}.csv'}  {count:>6} rows")
    print()
    print(f"Total across yearly files : {split_rows}")
    print(f"Total in original         : {total_rows}")
    print(f"Row counts match exactly  : {split_rows == total_rows}")


if __name__ == "__main__":
    main()
