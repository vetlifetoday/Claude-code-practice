import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/files";

/** Short-lived signed URLs for contact photos. Returns a map of path -> URL. */
export async function signPhotoUrls(paths: (string | null | undefined)[], expiresIn = 3600) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, expiresIn);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  }
  return map;
}
