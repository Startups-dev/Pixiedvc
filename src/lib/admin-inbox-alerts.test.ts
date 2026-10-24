import { describe, expect, it, vi } from "vitest";
import {
  claimInboxAlertLeader,
  DEFAULT_INBOX_ALERT_PREFERENCES,
  getInboxAlertPanelPosition,
  isAlertableCustomerMessage,
  isSoundEnabled,
  parseInboxAlertPreferences,
  playInboxAlertSoundOnce,
  readSeenInboxAlertIds,
  rememberSeenInboxAlertId,
  requestInboxNotificationPermission,
  resumeInboxAudio,
  shouldUseInboxAlertBaseline,
} from "@/lib/admin-inbox-alerts";

function storageMock() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
  };
}

describe("admin Inbox alert behavior", () => {
  it("suppresses only the initial baseline and resumes from its cursor after outages or sleep", () => {
    expect(shouldUseInboxAlertBaseline({})).toBe(true);
    expect(shouldUseInboxAlertBaseline({ cursor: "not-a-date" })).toBe(true);
    expect(shouldUseInboxAlertBaseline({ cursor: "2026-10-20T10:00:00.000Z" })).toBe(false);
  });

  it("elects one tab as leader and lets another take over after the lease expires", () => {
    const storage = storageMock();
    expect(claimInboxAlertLeader(storage, "leader", "tab-a", 1_000, 100)).toBe(true);
    expect(claimInboxAlertLeader(storage, "leader", "tab-b", 1_050, 100)).toBe(false);
    expect(claimInboxAlertLeader(storage, "leader", "tab-b", 1_101, 100)).toBe(true);
  });

  it("deduplicates a message across poll overlap and tab handoff", () => {
    const storage = storageMock();
    expect(rememberSeenInboxAlertId(storage, "seen", "message-1")).toBe(true);
    expect(rememberSeenInboxAlertId(storage, "seen", "message-1")).toBe(false);
    expect(readSeenInboxAlertIds(storage, "seen")).toEqual(["message-1"]);
  });

  it("releases a blocked automatic chime for a user-gesture retry, then deduplicates successful playback", async () => {
    const storage = storageMock();
    const blocked = await playInboxAlertSoundOnce(storage, "sounds", "message-1", async () => {
      throw new Error("autoplay blocked");
    });
    expect(blocked).toBe("blocked");
    expect(readSeenInboxAlertIds(storage, "sounds")).toEqual([]);

    const play = vi.fn(async () => undefined);
    expect(await playInboxAlertSoundOnce(storage, "sounds", "message-1", play)).toBe("played");
    expect(await playInboxAlertSoundOnce(storage, "sounds", "message-1", play)).toBe("duplicate");
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("keeps the alert settings panel inside narrow and desktop viewports", () => {
    expect(getInboxAlertPanelPosition({ right: 362, bottom: 80 }, 390)).toEqual({ left: 12, top: 88 });
    expect(getInboxAlertPanelPosition({ right: 520, bottom: 80 }, 1440)).toEqual({ left: 136, top: 88 });
  });

  it("allows only inbound customer messages and excludes notes, staff replies, and historical imports", () => {
    expect(isAlertableCustomerMessage({ id: "1", conversation_id: "c", sender_type: "guest", visibility: "customer" })).toBe(true);
    expect(isAlertableCustomerMessage({ id: "2", conversation_id: "c", sender: "guest", visibility: null })).toBe(true);
    expect(isAlertableCustomerMessage({ id: "3", conversation_id: "c", sender_type: "agent", visibility: "customer" })).toBe(false);
    expect(isAlertableCustomerMessage({ id: "4", conversation_id: "c", sender_type: "guest", visibility: "internal" })).toBe(false);
    expect(isAlertableCustomerMessage({ id: "5", conversation_id: "c", sender_type: "guest", metadata: { historical_import: true } })).toBe(false);
  });

  it("persists mute and volume preferences and suppresses sound when muted or silent", () => {
    expect(parseInboxAlertPreferences(null)).toEqual(DEFAULT_INBOX_ALERT_PREFERENCES);
    const prefs = parseInboxAlertPreferences(JSON.stringify({ soundEnabled: true, muted: true, volume: 1.5 }));
    expect(prefs).toMatchObject({ soundEnabled: true, muted: true, volume: 1 });
    expect(isSoundEnabled(prefs)).toBe(false);
    expect(isSoundEnabled({ ...prefs, muted: false })).toBe(true);
    expect(isSoundEnabled({ ...prefs, muted: false, volume: 0 })).toBe(false);
  });

  it("handles denied, unsupported, granted, and failed notification permission", async () => {
    const requestPermission = vi.fn(async () => "granted" as NotificationPermission);
    expect(await requestInboxNotificationPermission(null)).toBe("unsupported");
    expect(await requestInboxNotificationPermission({ permission: "denied", requestPermission })).toBe("denied");
    expect(requestPermission).not.toHaveBeenCalled();
    expect(await requestInboxNotificationPermission({ permission: "default", requestPermission })).toBe("granted");
    const fail = vi.fn(async () => { throw new Error("permission blocked"); });
    expect(await requestInboxNotificationPermission({ permission: "default", requestPermission: fail })).toBe("default");
  });

  it("surfaces audio-context playback failure for the UI to report", async () => {
    await expect(resumeInboxAudio({ state: "suspended", resume: async () => undefined })).rejects.toThrow("AUDIO_CONTEXT_BLOCKED");
    await expect(resumeInboxAudio({ state: "suspended", resume: async () => undefined })).rejects.toThrow("AUDIO_CONTEXT_BLOCKED");
    await expect(resumeInboxAudio({ state: "running", resume: async () => undefined })).resolves.toBeUndefined();
  });
});
