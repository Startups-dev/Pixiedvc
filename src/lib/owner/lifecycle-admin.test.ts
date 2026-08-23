import { describe, expect, it, vi } from "vitest";

import { updateOwnerLifecycleStatus } from "@/lib/owner/lifecycle-admin";

describe("owner lifecycle admin actions", () => {
  it("deactivates owner history without deleting rows and removes only unsold Ready Stays", async () => {
    const ownersUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    const readyStaySelect = vi.fn().mockResolvedValue({
      data: [{ id: "ready-unsold-1" }, { id: "ready-unsold-2" }],
      error: null,
    });
    const readyStayIs = vi.fn(() => ({ select: readyStaySelect }));
    const readyStayIn = vi.fn(() => ({ is: readyStayIs }));
    const readyStayEq = vi.fn(() => ({ in: readyStayIn }));
    const readyStaysUpdate = vi.fn(() => ({ eq: readyStayEq }));
    const readyStaysDelete = vi.fn();
    const commentsInsert = vi.fn().mockResolvedValue({ error: null });

    const client = {
      from: (table: string) => {
        if (table === "owners") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "owner-1", user_id: "profile-1", lifecycle_status: "active" },
                  error: null,
                }),
              })),
            })),
            update: ownersUpdate,
          };
        }
        if (table === "ready_stays") {
          return {
            update: readyStaysUpdate,
            delete: readyStaysDelete,
          };
        }
        if (table === "owner_comments") {
          return { insert: commentsInsert };
        }
        return {};
      },
    } as any;

    const result = await updateOwnerLifecycleStatus({
      client,
      ownerId: "owner-1",
      status: "deactivated",
      actorId: "admin-1",
      reason: "test deactivation",
    });

    expect(result).toMatchObject({
      ok: true,
      ownerId: "owner-1",
      previousStatus: "active",
      status: "deactivated",
      readyStaysRemoved: 2,
    });
    expect(ownersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycle_status: "deactivated",
        lifecycle_status_changed_by: "admin-1",
        lifecycle_status_reason: "test deactivation",
      }),
    );
    expect(readyStaysUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "removed",
        placement_home: false,
        placement_resort: false,
        placement_search: false,
      }),
    );
    expect(readyStayEq).toHaveBeenCalledWith("owner_id", "profile-1");
    expect(readyStayIn).toHaveBeenCalledWith("status", ["draft", "active", "test", "paused"]);
    expect(readyStayIs).toHaveBeenCalledWith("sold_booking_request_id", null);
    expect(readyStaysDelete).not.toHaveBeenCalled();
    expect(commentsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "owner-1",
        author_id: "admin-1",
        kind: "status_change",
      }),
    );
  });

  it("does not restore removed Ready Stays when an owner is reactivated", async () => {
    const ownersUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    const readyStaysUpdate = vi.fn();
    const commentsInsert = vi.fn().mockResolvedValue({ error: null });

    const client = {
      from: (table: string) => {
        if (table === "owners") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "owner-1", user_id: "profile-1", lifecycle_status: "deactivated" },
                  error: null,
                }),
              })),
            })),
            update: ownersUpdate,
          };
        }
        if (table === "ready_stays") {
          return { update: readyStaysUpdate };
        }
        if (table === "owner_comments") {
          return { insert: commentsInsert };
        }
        return {};
      },
    } as any;

    const result = await updateOwnerLifecycleStatus({
      client,
      ownerId: "owner-1",
      status: "active",
      actorId: "admin-1",
      reason: "reactivated after review",
    });

    expect(result).toMatchObject({
      ok: true,
      previousStatus: "deactivated",
      status: "active",
      readyStaysRemoved: 0,
    });
    expect(readyStaysUpdate).not.toHaveBeenCalled();
  });
});
