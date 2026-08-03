export const OWNER_AVATAR_BUCKET = "Owners-images";
export const OWNER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const OWNER_AVATAR_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateOwnerAvatarFile(file: { size: number; type: string }) {
  if (!OWNER_AVATAR_ALLOWED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, WebP, or GIF image.";
  }

  if (file.size <= 0) {
    return "Choose an image before uploading.";
  }

  if (file.size > OWNER_AVATAR_MAX_BYTES) {
    return "Avatar image must be 2 MB or smaller.";
  }

  return null;
}

export function buildOwnerAvatarStoragePath(userId: string, mimeType: string, timestamp = Date.now()) {
  const extension = EXTENSION_BY_TYPE[mimeType] ?? "jpg";
  return `owners/${userId}/avatar/${timestamp}.${extension}`;
}

export function getOwnerAvatarPathFromPublicUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${encodeURIComponent(OWNER_AVATAR_BUCKET)}/`;
  const plainMarker = `/storage/v1/object/public/${OWNER_AVATAR_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  const plainIndex = publicUrl.indexOf(plainMarker);
  const pathStart = index >= 0 ? index + marker.length : plainIndex >= 0 ? plainIndex + plainMarker.length : -1;
  if (pathStart < 0) return null;
  return decodeURIComponent(publicUrl.slice(pathStart));
}

export function isOwnerAvatarStoragePath(path: string | null | undefined, userId: string) {
  return typeof path === "string" && path.startsWith(`owners/${userId}/avatar/`);
}
