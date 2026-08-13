import { useCallback, useState } from "react";
import { uploadDataset, type UploadResult } from "../../../api/datasetsAPI";

interface UseDatasetUploadResult {
  upload: (file: File) => Promise<UploadResult | null>;
  uploading: boolean;
  error: string | null;
}

/** Uploads a dataset file; returns the created RAW version + run ids. */
export function useDatasetUpload(): UseDatasetUploadResult {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);
    try {
      return await uploadDataset(file);
    } catch {
      setError("Upload failed. Please choose a valid CSV or Excel file.");
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error };
}
