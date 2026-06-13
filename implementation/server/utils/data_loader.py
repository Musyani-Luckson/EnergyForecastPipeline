from pathlib import Path
import pandas as pd

SUPPORTED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
    ".ods",
}


class FileValidationError(Exception):
    pass


def load_dataset(filepath: str) -> dict:
    path = Path(filepath)
    # print(f"Loading dataset from: {path}")

    if not path.exists():
        raise FileNotFoundError(f"File not found: {filepath}")

    extension = path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise FileValidationError(f"Unsupported file type: {extension}")

    try:
        if extension == ".csv":
            df = pd.read_csv(filepath)

        elif extension in {".xlsx", ".xls"}:
            df = pd.read_excel(filepath)

        elif extension == ".ods":
            df = pd.read_excel(filepath, engine="odf")

    except Exception as exc:
        raise FileValidationError(f"Unable to read file: {str(exc)}")

    return {
        "dataframe": df,
        "row_count": int(df.shape[0]),
        "column_count": int(df.shape[1]),
        "columns": list(df.columns),
        "file_path": filepath,
    }
