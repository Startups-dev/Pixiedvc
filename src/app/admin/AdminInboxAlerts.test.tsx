import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminInboxAlerts from "./AdminInboxAlerts";

const authUnsubscribe = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: authUnsubscribe } } }) } }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin Inbox automatic sound recovery", () => {
  it("offers a visible user-gesture recovery when saved sound preferences outlive audio unlock", async () => {
    const staffUserId = "staff-test";
    localStorage.setItem(`hannadvc:admin-inbox-alerts:${staffUserId}:preferences`, JSON.stringify({
      soundEnabled: true, muted: false, volume: 1, desktopNotificationsEnabled: false,
    }));
    localStorage.setItem(`hannadvc:admin-inbox-alerts:${staffUserId}:cursor`, JSON.stringify({ cursor: "2026-10-20T10:00:00.000Z" }));
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ok: true,
      cursor: "2026-10-23T20:00:00.000Z",
      unreadCount: 1,
      events: [{ id: "customer-message-1", conversationId: "conversation-1", createdAt: "2026-10-23T19:59:59.000Z" }],
    })));

    class AudioContextMock {
      state = "running";
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => undefined);
      close = vi.fn(async () => undefined);
      createOscillator() {
        return { type: "sine", frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: AudioContextMock });

    render(<AdminInboxAlerts staffUserId={staffUserId} />);

    const recovery = await screen.findByRole("alert");
    expect(recovery).toHaveTextContent("The Inbox chime could not play.");
    fireEvent.click(screen.getByRole("button", { name: "Enable sound & play missed chime" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem(`hannadvc:admin-inbox-alerts:${staffUserId}:seen:sound`) ?? "[]"))
        .toContain("customer-message-1");
    });
  });

  it("shows test reservations in the reservation toast and replays them with the reservation chime", async () => {
    const staffUserId = "staff-test-alert";
    localStorage.setItem(`hannadvc:admin-inbox-alerts:${staffUserId}:preferences`, JSON.stringify({
      soundEnabled: true, muted: false, volume: 1, desktopNotificationsEnabled: false,
    }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/reservations/alerts")) {
        return Response.json({
          ok: true,
          cursor: "2026-11-02T10:00:01.000Z",
          unreadCount: 1,
          latestUnread: { kind: "reservation", id: "test-alert-1", requestId: "test-booking-1", source: "booking", isTestBooking: true, createdAt: "2026-11-02T10:00:00.000Z" },
          events: [{ kind: "reservation", id: "test-alert-1", requestId: "test-booking-1", source: "booking", isTestBooking: true, createdAt: "2026-11-02T10:00:00.000Z" }],
        });
      }
      return Response.json({ ok: true, cursor: "2026-11-02T10:00:01.000Z", unreadCount: 0, events: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const frequencies: number[] = [];
    class AudioContextMock {
      state = "running";
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => undefined);
      close = vi.fn(async () => undefined);
      createOscillator() {
        return { type: "sine", frequency: { setValueAtTime: (value: number) => frequencies.push(value) }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: AudioContextMock });

    render(<AdminInboxAlerts staffUserId={staffUserId} />);
    expect(await screen.findByText("TEST RESERVATION — Test request; no reservation is confirmed.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Enable sound & play missed chime" }));

    await waitFor(() => expect(frequencies).toEqual([523.25, 783.99, 1046.5, 783.99]));
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/api/admin/reservations/alerts"))).toBe(true);
  });

  it("shows the sound state in Admin and turns sound on only after a user click", async () => {
    localStorage.setItem("hannadvc:admin-inbox-alerts:sound-state-admin:preferences", JSON.stringify({
      soundEnabled: true, muted: false, volume: 1, desktopNotificationsEnabled: false,
    }));
    class AudioContextMock {
      state = "running";
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => undefined);
      close = vi.fn(async () => undefined);
      createOscillator() { return { type: "sine", frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
      createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }; }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: AudioContextMock });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, cursor: "2026-11-02T10:00:00Z", unreadCount: 0, events: [] })));

    render(<AdminInboxAlerts staffUserId="sound-state-admin" />);
    const sound = await screen.findByRole("button", { name: "Sound OFF. Enable sound" });
    expect(sound).toBeInTheDocument();
    fireEvent.click(sound);
    expect(await screen.findByRole("button", { name: "Sound ON. Turn sound off" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sound ON. Turn sound off" }));
    expect(screen.getByRole("button", { name: "Sound OFF. Enable sound" })).toBeInTheDocument();
  });
});
