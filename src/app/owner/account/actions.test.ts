import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwnerAccess: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  revalidatePath: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("@/lib/owner/requireOwnerAccess", () => ({
  requireOwnerAccess: mocks.requireOwnerAccess,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    storage: {
      from: mocks.from,
    },
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    from: mocks.from,
  }),
}));

import { removeOwnerAvatar, uploadOwnerAvatar } from "./actions";

function setupProfileQuery(previousAvatarUrl: string | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { avatar_url: previousAvatarUrl }, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, maybeSingle };
}

function setupProfileWrite(error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn(() => ({ eq }));
  const upsert = vi.fn().mockResolvedValue({ error });
  return { upsert, update, eq };
}

describe("owner account avatar actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOwnerAccess.mockResolvedValue({
      user: { id: "owner-user-1", email: "owner@example.com", user_metadata: {} },
      owner: { id: "owner-row-1" },
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Owners-images/owners/owner-user-1/avatar/123.png",
      },
    });
  });

  it("uploads an owner avatar to an authenticated owner-scoped path", async () => {
    const profileQuery = setupProfileQuery();
    const profileWrite = setupProfileWrite();
    mocks.from.mockImplementation((tableOrBucket: string) => {
      if (tableOrBucket === "profiles") {
        return profileQuery.select.mock.calls.length ? profileWrite : profileQuery;
      }
      return { upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl };
    });
    const formData = new FormData();
    const avatarFile = new File(["avatar"], "avatar.png", { type: "image/png" });
    Object.defineProperty(avatarFile, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new TextEncoder().encode("avatar").buffer),
    });
    formData.set("user_id", "owner-user-2");
    formData.set("avatar", avatarFile);

    await expect(uploadOwnerAvatar(formData)).rejects.toThrow("redirect:/owner/account?status=avatar-saved");

    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^owners\/owner-user-1\/avatar\/\d+\.png$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/png", upsert: true }),
    );
    expect(profileWrite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "owner-user-1",
        avatar_url: expect.stringContaining("/Owners-images/owners/owner-user-1/avatar/123.png"),
      }),
      { onConflict: "id" },
    );
  });

  it("rejects invalid avatar MIME types before upload", async () => {
    const formData = new FormData();
    formData.set("avatar", new File(["pdf"], "avatar.pdf", { type: "application/pdf" }));

    await expect(uploadOwnerAvatar(formData)).rejects.toThrow("redirect:/owner/account?status=invalid-avatar");

    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects oversized avatar uploads before upload", async () => {
    const formData = new FormData();
    formData.set("avatar", new File([new Uint8Array(3 * 1024 * 1024)], "avatar.png", { type: "image/png" }));

    await expect(uploadOwnerAvatar(formData)).rejects.toThrow("redirect:/owner/account?status=invalid-avatar");

    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("removes only an owned avatar path", async () => {
    const previousAvatarUrl =
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Owners-images/owners/owner-user-1/avatar/old.png";
    const profileQuery = setupProfileQuery(previousAvatarUrl);
    const profileWrite = setupProfileWrite();
    mocks.from.mockImplementation((tableOrBucket: string) => {
      if (tableOrBucket === "profiles") {
        return profileQuery.select.mock.calls.length ? profileWrite : profileQuery;
      }
      return { upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl };
    });

    await expect(removeOwnerAvatar()).rejects.toThrow("redirect:/owner/account?status=avatar-removed");

    expect(profileWrite.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: null }));
    expect(mocks.remove).toHaveBeenCalledWith(["owners/owner-user-1/avatar/old.png"]);
  });

  it("does not remove a cross-owner avatar path", async () => {
    const previousAvatarUrl =
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Owners-images/owners/owner-user-2/avatar/old.png";
    const profileQuery = setupProfileQuery(previousAvatarUrl);
    const profileWrite = setupProfileWrite();
    mocks.from.mockImplementation((tableOrBucket: string) => {
      if (tableOrBucket === "profiles") {
        return profileQuery.select.mock.calls.length ? profileWrite : profileQuery;
      }
      return { upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl };
    });

    await expect(removeOwnerAvatar()).rejects.toThrow("redirect:/owner/account?status=avatar-removed");

    expect(profileWrite.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: null }));
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
