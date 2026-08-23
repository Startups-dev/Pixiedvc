import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

let supabaseMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
};

let adminMock: {
  from: ReturnType<typeof vi.fn>;
};

const ownerRow = { id: "owner-record-1", user_id: "owner-user-1", lifecycle_status: "active" };
const membershipRow = {
  id: "membership-1",
  owner_id: "owner-record-1",
  points_available: 160,
  points_reserved: 20,
  points_rented: 10,
  banked_assumed_at: null,
  banked_points_amount: null,
  expired_assumed_at: null,
};
const notificationRow = {
  id: "notification-1",
  user_id: "owner-user-1",
  type: "point_status_banking_deadline",
  link: "/owner/notifications?membershipId=membership-1&pointStatus=banking_deadline",
  read_at: null,
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn() })),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminMock),
}));

function selectMaybeSingle(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eqSecond = vi.fn(() => ({ maybeSingle }));
  const eqFirst = vi.fn(() => ({ eq: eqSecond, maybeSingle }));
  const or = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: eqFirst, or, maybeSingle }));
  return { select, eqFirst, eqSecond, maybeSingle, or };
}

function updateChain() {
  const result = { error: null };
  const isSecond = vi.fn(() => result);
  const isFirst = vi.fn(() => ({ is: isSecond }));
  const eqSecond = vi.fn(() => ({ is: isFirst }));
  const eqFirst = vi.fn(() => ({ eq: eqSecond }));
  const update = vi.fn(() => ({ eq: eqFirst }));
  return { update, eqFirst, eqSecond, isFirst, isSecond };
}

function setupAdmin(overrides: { notification?: typeof notificationRow | null; membership?: typeof membershipRow | null } = {}) {
  const owners = selectMaybeSingle(ownerRow);
  const memberships = selectMaybeSingle(overrides.membership === undefined ? membershipRow : overrides.membership);
  const notifications = selectMaybeSingle(overrides.notification === undefined ? notificationRow : overrides.notification);
  const membershipUpdate = updateChain();
  const notificationUpdateEqSecond = vi.fn().mockResolvedValue({ error: null });
  const notificationUpdateEqFirst = vi.fn(() => ({ eq: notificationUpdateEqSecond }));
  const notificationUpdate = vi.fn(() => ({ eq: notificationUpdateEqFirst }));
  const insert = vi.fn().mockResolvedValue({ error: null });

  adminMock = {
    from: vi.fn((table: string) => {
      if (table === "owners") return { select: owners.select };
      if (table === "owner_memberships") return { select: memberships.select, update: membershipUpdate.update };
      if (table === "notifications") return { select: notifications.select, update: notificationUpdate, insert };
      if (table === "owner_points_events") return { insert };
      return { select: vi.fn(), insert };
    }),
  };

  return { owners, memberships, notifications, membershipUpdate, notificationUpdate, insert };
}

function setupAdminWithOwner(owner: typeof ownerRow) {
  const owners = selectMaybeSingle(owner);
  adminMock = {
    from: vi.fn((table: string) => {
      if (table === "owners") return { select: owners.select };
      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() };
    }),
  };
  return { owners };
}

describe("POST /api/owner/memberships/[membershipId]/point-status", () => {
  beforeEach(() => {
    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-user-1" } },
          error: null,
        }),
      },
    };
  });

  test("marks owned points as banked using a server-derived quantity", async () => {
    const mocks = setupAdmin();

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: "notification-1", action: "mark_banked" }),
      }),
      { params: Promise.resolve({ membershipId: "membership-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pointsAmount).toBe(130);
    expect(mocks.membershipUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        banked_points_amount: 130,
        banked_assumed_reason: "Owner confirmed from notification",
        expired_assumed_at: null,
      }),
    );
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "owner-record-1",
        owner_membership_id: "membership-1",
        event_type: "banked_points",
        points_amount: 130,
      }),
    );
  });

  test("rejects a notification that does not belong to the membership", async () => {
    setupAdmin({
      notification: {
        ...notificationRow,
        link: "/owner/notifications?membershipId=other-membership&pointStatus=banking_deadline",
      },
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: "notification-1", action: "mark_banked" }),
      }),
      { params: Promise.resolve({ membershipId: "membership-1" }) },
    );

    expect(response.status).toBe(403);
  });

  test("records still-available without changing membership availability", async () => {
    const mocks = setupAdmin();

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: "notification-1", action: "still_available" }),
      }),
      { params: Promise.resolve({ membershipId: "membership-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.membershipUpdate.update).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "point_status_still_available",
        points_amount: null,
      }),
    );
  });

  test("rejects still-available confirmation for a deactivated owner", async () => {
    setupAdminWithOwner({ ...ownerRow, lifecycle_status: "deactivated" });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: "notification-1", action: "still_available" }),
      }),
      { params: Promise.resolve({ membershipId: "membership-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Owner account is not active for available point confirmation.");
  });
});
