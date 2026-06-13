from python.TLO.PreprocessingPipeline.clean_duplicates import clean_duplicates
from python.TLO.PreprocessingPipeline.enforce_daily_continuity import (
    enforce_daily_continuity,
)
from python.TLO.PreprocessingPipeline.split_by_year import split_by_year
from python.TLO.PreprocessingPipeline.validate_continuity import validate_continuity
from python.TLO.PreprocessingPipeline.clean_duplicates import clean_duplicates


def preprocess_pipeline(df):
    # Step 1: clean duplicates
    df = clean_duplicates(df)

    # Step 2: enforce continuous timeline
    df = enforce_daily_continuity(df)

    # Step 3: inspect yearly splits (optional)
    yearly = split_by_year(df)

    # Step 4: validate structure
    validate_continuity(df)

    # Step 5: fill missing values
    # df = fill_missing(df)

    return df  ##, yearly
