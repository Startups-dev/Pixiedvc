export function getPublicStorageUrl(bucket: string, path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to build storage URLs.");
  }
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return `${normalizedBase}/storage/v1/object/public/${bucket}/${path}`;
}

export const buildSupabasePublicUrl = getPublicStorageUrl;
