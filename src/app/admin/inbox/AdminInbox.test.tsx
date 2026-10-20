import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminInbox from "@/app/admin/inbox/AdminInbox";
import { INBOX_CUSTOMER_MESSAGE_EVENT } from "@/lib/admin-inbox-alerts";

vi.mock("@/app/admin/AdminSubnav", () => ({ default: () => null }));

const conversation = {
  id: "conversation-synthetic",
  guest_name: "Synthetic email visitor",
  guest_email: "visitor@example.test",
  guest_type: "anonymous",
  topic: "A new message",
  inbox_status: "needs_reply",
  inbox_source: "email",
  unread_for_staff: true,
  updated_at: "2026-10-20T12:00:00.000Z",
  handoff: null,
  lastMessage: { preview: "A synthetic customer message", at: "2026-10-20T12:00:00.000Z", sender: "guest" },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Admin Inbox automatic refresh", () => {
  it("shows a newly persisted conversation after the alert event without a manual sync or page reload", async () => {
    let listCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/admin/inbox?view=")) {
        listCalls += 1;
        return Response.json({
          ok: true,
          currentUserId: "synthetic-staff",
          counts: { needs_reply: listCalls > 1 ? 1 : 0, assigned_to_me: 0, waiting_customer: 0, closed: 0 },
          conversations: listCalls > 1 ? [conversation] : [],
        });
      }
      if (url === "/api/admin/inbox/zoho/status") return Response.json({ ok: true, connected: true, configured: true, mailbox: "hello@hannadvc.com" });
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInbox />);
    expect(await screen.findByText("Nothing in this view.")).toBeTruthy();

    act(() => window.dispatchEvent(new CustomEvent(INBOX_CUSTOMER_MESSAGE_EVENT, {
      detail: { id: "message-synthetic", conversationId: conversation.id, createdAt: conversation.updated_at },
    })));

    expect(await screen.findByText("Synthetic email visitor")).toBeTruthy();
    await waitFor(() => expect(listCalls).toBe(2));
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/api/admin/inbox/zoho/reconcile"))).toBe(false);
  });
});
