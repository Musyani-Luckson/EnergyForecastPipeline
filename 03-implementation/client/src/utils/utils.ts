// import { createClient } from "@supabase/supabase-js";
// import type { PhotoItem } from "../types/space";

export const getFieldError = (
  fieldName: string,
  errors: Record<string, unknown>[],
) => {
  // Check that error exists and is actually an array
  if (!errors || !Array.isArray(errors) || errors.length === 0) return "";

  // Now TypeScript knows error is an array
  const fieldError = errors.find((err) => err.field === fieldName);

  return fieldError ? fieldError.message : "";
};

export function supplyIfMatch<T>(
  target: T,
  comparison: T,
  newValue: T,
): T | null {
  return target === comparison ? newValue : null;
}

// export function normalizePhotoUrls(photos: PhotoItem[]): string[] {
//   if (!Array.isArray(photos) || photos.length === 0) return [];

//   return photos
//     .map((item) => {
//       // number becomes string
//       if (typeof item === "number") return String(item);

//       // plain string, keep it
//       if (typeof item === "string") return item;

//       // object cases
//       if (item && "file" in item && item.file instanceof File) {
//         return URL.createObjectURL(item.file);
//       }
//       // nothing usable
//       return null;
//     })
//     .filter(Boolean) as string[];
// }

// Superbase
// Supabase client setup fr
// export const supabase = createClient(
//   import.meta.env.VITE_STORAGE_URL,
//   import.meta.env.VITE_STORAGE_ANON_KEY,
// );
