import { describe, expect, it } from "vitest";

import {
  buildOwnerAvatarStoragePath,
  getOwnerAvatarPathFromPublicUrl,
  isOwnerAvatarStoragePath,
  validateOwnerAvatarFile,
} from "./avatar";

describe("owner avatar helpers", () => {
  it("validates image MIME type and size", () => {
    expect(validateOwnerAvatarFile({ type: "image/png", size: 1024 })).toBeNull();
    expect(validateOwnerAvatarFile({ type: "application/pdf", size: 1024 })).toBe("Use a JPG, PNG, WebP, or GIF image.");
    expect(validateOwnerAvatarFile({ type: "image/png", size: 0 })).toBe("Choose an image before uploading.");
    expect(validateOwnerAvatarFile({ type: "image/png", size: 3 * 1024 * 1024 })).toBe("Avatar image must be 2 MB or smaller.");
  });

  it("builds and validates owner-scoped storage paths", () => {
    const path = buildOwnerAvatarStoragePath("owner-user-1", "image/webp", 123);

    expect(path).toBe("owners/owner-user-1/avatar/123.webp");
    expect(isOwnerAvatarStoragePath(path, "owner-user-1")).toBe(true);
    expect(isOwnerAvatarStoragePath(path, "owner-user-2")).toBe(false);
  });

  it("extracts avatar paths from public storage URLs", () => {
    const url = "https://example.supabase.co/storage/v1/object/public/Owners-images/owners/owner-user-1/avatar/123.png";

    expect(getOwnerAvatarPathFromPublicUrl(url)).toBe("owners/owner-user-1/avatar/123.png");
    expect(getOwnerAvatarPathFromPublicUrl("https://example.test/not-storage/avatar.png")).toBeNull();
  });
});
