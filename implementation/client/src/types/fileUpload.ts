export type FileUploadStatus = "EMPTY" | "UPLOADING" | "VALID" | "INVALID";

export type FileUploadRow = {
  date: string;
  value: string;
};

export type FileUploadResult = {
  rows: FileUploadRow[];
  warnings: string[];
  errors: string[];
};
