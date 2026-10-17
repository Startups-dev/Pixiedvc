import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ messageQueries: 0 }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "unrelated-user", email: "sample@example.test" } } }) } }),
}));
vi.mock("@/lib/support-agent-auth", () => ({
  getSupportAgentEligibility: async () => ({ user: { id: "unrelated-user" }, isAdmin: false, isSupportAgent: false }),
}));
vi.mock("@/lib/support/live-guest-token", () => ({ verifySupportLiveGuestToken: () => false }));
vi.mock("@/lib/supabase-service-client", () => ({
  createServiceClient: () => ({
    from(table: string) {
      if (table === "support_messages") {
        state.messageQueries += 1;
        throw new Error("Unauthorized transcript query must not run");
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { id: "conversation-1", status: "handoff", handoff_mode: "offline", guest_user_id: "different-user", guest_type: "authenticated" }, error: null }) }),
        }),
      };
    },
  }),
}));

import { GET } from "./route";

describe("support transcript authorization", () => {
  it("denies an unrelated signed-in user before querying messages", async () => {
    state.messageQueries = 0;
    const response = await GET(new Request("https://hannadvc.com/api/support/conversation?conversationId=conversation-1"));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: "FORBIDDEN" });
    expect(state.messageQueries).toBe(0);
  });
});
