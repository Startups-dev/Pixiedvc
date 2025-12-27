const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function buildSupabasePublicUrl(bucket: string, objectPath: string) {
  if (!SUPABASE_PUBLIC_URL) {
    return "";
  }

  let origin: string;
  try {
    origin = new URL(SUPABASE_PUBLIC_URL).origin;
  } catch {
    return "";
  }

  const cleanPath = objectPath.replace(/^\/+/, "");
  return `${origin}/storage/v1/object/public/${bucket}/${cleanPath}`;
}
