"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { buildReservationReviewUrl, RESERVATION_ALERT_COPY, type ReservationAlertEvent } from "@/lib/admin-reservation-alerts";
import AdminInboxSmsSettings from "./AdminInboxSmsSettings";
import {
  buildInboxConversationUrl,
  claimInboxAlertLeader,
  DEFAULT_INBOX_ALERT_PREFERENCES,
  getInboxAlertPanelPosition,
  INBOX_CUSTOMER_MESSAGE_EVENT,
  isSoundEnabled,
  parseInboxAlertPreferences,
  playInboxAlertSoundOnce,
  readSeenInboxAlertIds,
  releaseInboxAlertLeader,
  rememberSeenInboxAlertId,
  requestInboxNotificationPermission,
  resumeInboxAudio,
  shouldUseInboxAlertBaseline,
  type InboxAlertEvent,
  type InboxAlertPreferences,
} from "@/lib/admin-inbox-alerts";

type AdminAlertEvent = InboxAlertEvent | ReservationAlertEvent;
type CrossTabMessage =
  | { type: "alert"; event: AdminAlertEvent; nonce: string }
  | { type: "badge"; count: number; nonce: string }
  | { type: "reservation_badge"; count: number; latest: ReservationAlertEvent | null; nonce: string };

type AlertsPayload = {
  ok?: boolean;
  error?: string;
  cursor?: string;
  unreadCount?: number;
  events?: InboxAlertEvent[];
};

type ReservationAlertsPayload = Omit<AlertsPayload, "events"> & {
  latestUnread?: ReservationAlertEvent | null;
  events?: ReservationAlertEvent[];
};

function isReservationAlert(event: AdminAlertEvent): event is ReservationAlertEvent {
  return "kind" in event && event.kind === "reservation";
}

function alertKey(event: AdminAlertEvent) {
  return isReservationAlert(event) ? `reservation:${event.id}` : event.id;
}

function alertUrl(event: AdminAlertEvent) {
  return isReservationAlert(event) ? buildReservationReviewUrl(event) : buildInboxConversationUrl(event.conversationId);
}

const POLL_INTERVAL_MS = 5_000;
const LEASE_INTERVAL_MS = 1_000;
const LEADER_LEASE_MS = 5_000;

function safeRead(storage: Storage, key: string) {
  try { return storage.getItem(key); } catch { return null; }
}

function getBrowserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

function safeWrite(storage: Storage, key: string, value: string) {
  try { storage.setItem(key, value); return true; } catch { return false; }
}

export default function AdminInboxAlerts({ staffUserId }: { staffUserId: string }) {
  const [preferences, setPreferences] = useState<InboxAlertPreferences>({ ...DEFAULT_INBOX_ALERT_PREFERENCES });
  const preferencesRef = useRef(preferences);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reservationUnreadCount, setReservationUnreadCount] = useState(0);
  const [latestReservationUnread, setLatestReservationUnread] = useState<ReservationAlertEvent | null>(null);
  const [alerts, setAlerts] = useState<AdminAlertEvent[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPosition, setSettingsPosition] = useState<{ left: number; top: number } | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [soundStatus, setSoundStatus] = useState("");
  const [soundRecoveryEvent, setSoundRecoveryEvent] = useState<AdminAlertEvent | null>(null);
  const [notificationStatus, setNotificationStatus] = useState("");
  const [coordinationStatus, setCoordinationStatus] = useState("");
  const audioContext = useRef<AudioContext | null>(null);
  const audioUnlocked = useRef(false);
  const soundRecoveryEventRef = useRef<AdminAlertEvent | null>(null);

  useEffect(() => { soundRecoveryEventRef.current = soundRecoveryEvent; }, [soundRecoveryEvent]);

  const keys = {
    preferences: `hannadvc:admin-inbox-alerts:${staffUserId}:preferences`,
    leader: `hannadvc:admin-inbox-alerts:${staffUserId}:leader`,
    cursor: `hannadvc:admin-inbox-alerts:${staffUserId}:cursor`,
    reservationCursor: `hannadvc:admin-inbox-alerts:${staffUserId}:reservation-cursor`,
    seen: `hannadvc:admin-inbox-alerts:${staffUserId}:seen`,
    events: `hannadvc:admin-inbox-alerts:${staffUserId}:events`,
    channel: `hannadvc-admin-inbox-alerts-${staffUserId}`,
  };

  const updatePreferences = useCallback((update: Partial<InboxAlertPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...update };
      preferencesRef.current = next;
      const storage = getBrowserStorage();
      if (storage) safeWrite(storage, keys.preferences, JSON.stringify(next));
      return next;
    });
  }, [keys.preferences]);

  const playChime = useCallback(async (kind: "inbox" | "reservation" = "inbox") => {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) throw new Error("A sound-capable browser is not available.");
    const context = audioContext.current ?? new AudioContextConstructor();
    audioContext.current = context;
    await resumeInboxAudio(context);
    const volume = Math.min(1, Math.max(0, preferencesRef.current.volume));
    const notes = kind === "reservation" ? [523.25, 783.99, 1046.5, 783.99] : [659.25, 783.99, 987.77];
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * 0.105;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.22), start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.21);
    });
  }, []);

  const openDesktopNotification = useCallback((event: AdminAlertEvent) => {
    if (!preferencesRef.current.desktopNotificationsEnabled || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const notification = new Notification(isReservationAlert(event) ? "HannaDVC reservation request" : "HannaDVC Inbox", {
        body: isReservationAlert(event) ? RESERVATION_ALERT_COPY : "A customer message needs your attention.",
        icon: "/favicon.ico",
        tag: `hanna-${alertKey(event)}`,
      });
      notification.onclick = () => {
        window.focus();
        window.location.assign(alertUrl(event));
        notification.close();
      };
    } catch {
      setNotificationStatus("Desktop notifications are blocked by this browser or computer setting.");
    }
  }, []);

  const displayAlert = useCallback((event: AdminAlertEvent) => {
    setAlerts((current) => current.some((item) => alertKey(item) === alertKey(event)) ? current : [...current, event].slice(-3));
    if (!isReservationAlert(event)) window.dispatchEvent(new CustomEvent(INBOX_CUSTOMER_MESSAGE_EVENT, { detail: event }));
  }, []);

  const updateSettingsPosition = useCallback(() => {
    const button = settingsButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setSettingsPosition(getInboxAlertPanelPosition(rect, window.innerWidth));
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    updateSettingsPosition();
    window.addEventListener("resize", updateSettingsPosition);
    window.addEventListener("scroll", updateSettingsPosition, true);
    return () => {
      window.removeEventListener("resize", updateSettingsPosition);
      window.removeEventListener("scroll", updateSettingsPosition, true);
    };
  }, [settingsOpen, updateSettingsPosition]);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      setCoordinationStatus("Browser storage is unavailable; cross-tab alerts are paused.");
      return;
    }
    const stored = parseInboxAlertPreferences(safeRead(storage, keys.preferences));
    preferencesRef.current = stored;
    setPreferences(stored);
    if ("Notification" in window) {
      if (Notification.permission === "denied") setNotificationStatus("Notifications are blocked in browser settings.");
      else if (stored.desktopNotificationsEnabled && Notification.permission === "granted") setNotificationStatus("Desktop notifications are enabled.");
    } else {
      setNotificationStatus("This browser does not support desktop notifications.");
    }

    const tabId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const localDisplayed = new Set<string>();
    const seen = new Set(readSeenInboxAlertIds(storage, keys.seen));
    let active = true;
    let leader = false;
    let pollInFlight = false;
    let reservationAuthorized = true;
    let lastPollAt = 0;
    let channel: BroadcastChannel | null = null;
    let unsubscribeAuth = () => {};

    const tryPlayAlertSound = (event: AdminAlertEvent) => {
      if (!isSoundEnabled(preferencesRef.current)) return;
      const soundSeenKey = `${keys.seen}:sound`;
      const key = alertKey(event);
      if (readSeenInboxAlertIds(storage, soundSeenKey).includes(key)) return;
      if (!audioUnlocked.current) {
        setSoundStatus("Click Enable sound in an open admin tab to activate audio for this browser.");
        setSoundRecoveryEvent(event);
        return;
      }
      void playInboxAlertSoundOnce(storage, soundSeenKey, key, () => playChime(isReservationAlert(event) ? "reservation" : "inbox")).then((result) => {
        if (result === "played") {
          setSoundStatus("Sound is playing.");
          setSoundRecoveryEvent((pending) => pending?.id === event.id ? null : pending);
          return;
        }
        if (result === "duplicate") return;
        setSoundStatus("Sound playback was blocked. Click Enable sound again, then Test sound.");
        setSoundRecoveryEvent(event);
      });
    };

    const receive = (message: CrossTabMessage) => {
      if (!message || typeof message !== "object") return;
      if (message.type === "badge" && Number.isFinite(message.count)) setUnreadCount(Math.max(0, message.count));
      if (message.type === "reservation_badge" && Number.isFinite(message.count)) {
        setReservationUnreadCount(Math.max(0, message.count));
        setLatestReservationUnread(message.latest);
      }
      if (message.type === "alert" && message.event?.id && alertUrl(message.event)) {
        const key = alertKey(message.event);
        if (!localDisplayed.has(key)) {
          localDisplayed.add(key);
          displayAlert(message.event);
          tryPlayAlertSound(message.event);
        }
      }
    };

    try {
      channel = new BroadcastChannel(keys.channel);
      channel.onmessage = (message: MessageEvent<CrossTabMessage>) => receive(message.data);
    } catch {
      channel = null;
    }

    const broadcast = (message: CrossTabMessage) => {
      if (channel) channel.postMessage(message);
      safeWrite(storage, keys.events, JSON.stringify(message));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === keys.events && event.newValue) {
        try { receive(JSON.parse(event.newValue) as CrossTabMessage); } catch { /* Ignore malformed cross-tab messages. */ }
      }
      if (event.key === keys.preferences) {
        const next = parseInboxAlertPreferences(event.newValue);
        preferencesRef.current = next;
        setPreferences(next);
      }
    };
    window.addEventListener("storage", onStorage);

    const announceBadge = (count: number) => {
      setUnreadCount(count);
      broadcast({ type: "badge", count, nonce: `${Date.now()}-${tabId}` });
    };

    const announceReservationBadge = (count: number, latest: ReservationAlertEvent | null) => {
      setReservationUnreadCount(count);
      setLatestReservationUnread(latest);
      broadcast({ type: "reservation_badge", count, latest, nonce: `${Date.now()}-${tabId}` });
    };

    const poll = async () => {
      if (!active || pollInFlight) return;
      pollInFlight = true;
      let inboxUnavailable = false;
      let reservationUnavailable = false;
      try {
        try {
        const saved = safeRead(window.localStorage, keys.cursor);
        let savedCursor: { cursor?: string; checkedAt?: number } = {};
        try { savedCursor = saved ? JSON.parse(saved) as typeof savedCursor : {}; } catch { savedCursor = {}; }
        const baseline = shouldUseInboxAlertBaseline({
          ...savedCursor,
        });
        const query = baseline ? "?baseline=1" : `?after=${encodeURIComponent(savedCursor.cursor!)}`;
        const response = await fetch(`/api/admin/inbox/alerts${query}`, { cache: "no-store", credentials: "same-origin" });
        if (response.status === 401 || response.status === 403) {
          active = false;
          setCoordinationStatus("Inbox alerts stopped because this staff session is no longer authorized.");
          return;
        }
        const payload = await response.json().catch(() => null) as AlertsPayload | null;
        if (!response.ok || !payload?.ok || !payload.cursor) throw new Error(payload?.error ?? "Inbox alerts are unavailable.");

        announceBadge(payload.unreadCount ?? 0);
        const checkedAt = Date.now();
        if (!baseline) {
          for (const incoming of payload.events ?? []) {
            if (!incoming?.id || !incoming.conversationId || seen.has(incoming.id)) continue;
            seen.add(incoming.id);
            if (!rememberSeenInboxAlertId(storage, keys.seen, incoming.id)) continue;
            localDisplayed.add(incoming.id);
            displayAlert(incoming);
            tryPlayAlertSound(incoming);
            broadcast({ type: "alert", event: incoming, nonce: `${checkedAt}-${incoming.id}` });
            openDesktopNotification(incoming);
          }
        }
        safeWrite(storage, keys.cursor, JSON.stringify({ cursor: payload.cursor, checkedAt }));
        } catch {
          inboxUnavailable = true;
        }
        if (reservationAuthorized) try {
        const savedReservation = safeRead(storage, keys.reservationCursor);
        let reservationCursor: { cursor?: string } = {};
        try { reservationCursor = savedReservation ? JSON.parse(savedReservation) as typeof reservationCursor : {}; } catch { reservationCursor = {}; }
        // New installs and expired browser storage still recover recent alerts.
        const reservationAfter = reservationCursor.cursor && Number.isFinite(Date.parse(reservationCursor.cursor))
          ? reservationCursor.cursor
          : new Date(Date.now() - 24 * 60 * 60_000).toISOString();
        const reservationQuery = `?after=${encodeURIComponent(reservationAfter)}`;
        const reservationResponse = await fetch(`/api/admin/reservations/alerts${reservationQuery}`, { cache: "no-store", credentials: "same-origin" });
        if (reservationResponse.status === 401 || reservationResponse.status === 403) {
          reservationAuthorized = false;
          announceReservationBadge(0, null);
        } else {
          const reservationPayload = await reservationResponse.json().catch(() => null) as ReservationAlertsPayload | null;
          if (!reservationResponse.ok || !reservationPayload?.ok || !reservationPayload.cursor) throw new Error(reservationPayload?.error ?? "Reservation alerts are unavailable.");
          announceReservationBadge(reservationPayload.unreadCount ?? 0, reservationPayload.latestUnread ?? null);
          const checkedAt = Date.now();
          for (const incoming of reservationPayload.events ?? []) {
              if (!incoming?.id || !incoming.requestId || !["booking", "renter"].includes(incoming.source)) continue;
              const key = alertKey(incoming);
              if (seen.has(key)) continue;
              seen.add(key);
              if (!rememberSeenInboxAlertId(storage, keys.seen, key)) continue;
              localDisplayed.add(key);
              displayAlert(incoming);
              tryPlayAlertSound(incoming);
              broadcast({ type: "alert", event: incoming, nonce: `${checkedAt}-${key}` });
              openDesktopNotification(incoming);
          }
          safeWrite(storage, keys.reservationCursor, JSON.stringify({ cursor: reservationPayload.cursor, checkedAt }));
        }
        } catch {
          reservationUnavailable = true;
        }
      } catch {
        inboxUnavailable = true;
      } finally {
        lastPollAt = Date.now();
        setCoordinationStatus(inboxUnavailable || reservationUnavailable ? "Admin alerts will reconnect automatically." : "");
        pollInFlight = false;
      }
    };

    const coordinate = () => {
      if (!active) return;
      const ownsLease = claimInboxAlertLeader(storage, keys.leader, tabId, Date.now(), LEADER_LEASE_MS);
      if (ownsLease) {
        if (!leader) {
          leader = true;
          lastPollAt = 0;
        }
        if (!lastPollAt || Date.now() - lastPollAt >= POLL_INTERVAL_MS) void poll();
      } else {
        leader = false;
      }
    };
    const refreshWhenVisible = () => {
      if (!active || !leader || document.visibilityState !== "visible") return;
      lastPollAt = 0;
      void poll();
    };
    const timer = window.setInterval(coordinate, LEASE_INTERVAL_MS);
    coordinate();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    const stop = () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      releaseInboxAlertLeader(storage, keys.leader, tabId);
      channel?.close();
      if (audioContext.current) void audioContext.current.close().catch(() => undefined);
      audioContext.current = null;
      audioUnlocked.current = false;
      unsubscribeAuth();
      unsubscribeAuth = () => {};
    };
    const onSignedOut = () => stop();
    window.addEventListener("hanna-admin-signout", onSignedOut);
    const { data: authListener } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") stop();
    });
    unsubscribeAuth = () => authListener.subscription.unsubscribe();

    return () => {
      stop();
      unsubscribeAuth();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hanna-admin-signout", onSignedOut);
    };
  }, [displayAlert, keys.channel, keys.cursor, keys.events, keys.leader, keys.preferences, keys.reservationCursor, keys.seen, openDesktopNotification, playChime]);

  async function enableSound() {
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) throw new Error("This browser does not support sound alerts.");
      const context = audioContext.current ?? new AudioContextConstructor();
      audioContext.current = context;
      await resumeInboxAudio(context);
      audioUnlocked.current = true;
      updatePreferences({ soundEnabled: true });
      setSoundStatus("Sound is enabled. Use Test sound to check your volume.");
    } catch {
      setSoundStatus("Sound playback was blocked. Check browser audio settings, then try Enable sound again.");
    }
  }

  async function recoverBlockedSound() {
    const event = soundRecoveryEventRef.current;
    const storage = getBrowserStorage();
    if (!event || !storage) {
      setSoundStatus("Sound recovery is unavailable in this browser. Try Enable sound, then Test sound.");
      return;
    }
    const result = await playInboxAlertSoundOnce(storage, `${keys.seen}:sound`, alertKey(event), () => playChime(isReservationAlert(event) ? "reservation" : "inbox"));
    if (result === "played") {
      audioUnlocked.current = true;
      updatePreferences({ soundEnabled: true });
      setSoundRecoveryEvent(null);
      setSoundStatus(isReservationAlert(event) ? "Sound is enabled, and the missed reservation alert played." : "Sound is enabled, and the missed Inbox chime played.");
    } else if (result === "duplicate") {
      setSoundRecoveryEvent(null);
      setSoundStatus("This alert already chimed in another tab.");
    } else {
      setSoundStatus("Sound playback is still blocked. Check browser audio settings, then try again.");
    }
  }

  async function enableDesktopNotifications() {
    if (!("Notification" in window)) {
      setNotificationStatus("This browser does not support desktop notifications.");
      return;
    }
    const permission = await requestInboxNotificationPermission(Notification);
    if (permission === "granted") {
      updatePreferences({ desktopNotificationsEnabled: true });
      setNotificationStatus("Desktop notifications are enabled.");
    } else if (permission === "denied") {
      updatePreferences({ desktopNotificationsEnabled: false });
      setNotificationStatus("Notifications were denied. Allow them in your browser’s site settings to enable alerts.");
    } else {
      setNotificationStatus("Choose Allow in the browser prompt to enable desktop notifications.");
    }
  }

  function testNotification() {
    if (!("Notification" in window)) {
      setNotificationStatus("This browser does not support desktop notifications.");
      return;
    }
    if (Notification.permission !== "granted" || !preferences.desktopNotificationsEnabled) {
      setNotificationStatus(Notification.permission === "denied"
        ? "Notifications are blocked in browser settings."
        : "Enable notifications before testing them.");
      return;
    }
    try {
      const notification = new Notification("HannaDVC Inbox", { body: "Your desktop alerts are working." });
      window.setTimeout(() => notification.close(), 5_000);
      setNotificationStatus("Test notification sent to this browser.");
    } catch {
      setNotificationStatus("The browser blocked this notification. Check browser and Mac notification settings.");
    }
  }

  async function testSound(kind: "inbox" | "reservation" = "inbox") {
    if (!preferences.soundEnabled) {
      setSoundStatus("Click Enable sound before testing it.");
      return;
    }
    try {
      audioUnlocked.current = true;
      await playChime(kind);
      setSoundStatus(kind === "reservation" ? "Reservation sound played." : "Test sound played.");
    } catch {
      setSoundStatus("Sound playback was blocked. Click Enable sound again, then Test sound.");
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {soundRecoveryEvent ? (
        <div role="alert" className="fixed bottom-4 right-4 z-[60] w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-amber-300/70 bg-[#20232a] p-4 text-sm text-white shadow-2xl">
          <p className="font-semibold">{soundRecoveryEvent && isReservationAlert(soundRecoveryEvent) ? "The reservation sound could not play." : "The Inbox chime could not play."}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">Your browser may need another sound gesture. Recover the missed chime here.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void recoverBlockedSound()} className="rounded-md bg-[#d8b65c] px-3 py-2 text-xs font-semibold text-[#15171d]">Enable sound &amp; play missed chime</button>
            <button type="button" onClick={() => setSoundRecoveryEvent(null)} className="rounded-md border border-slate-500 px-3 py-2 text-xs text-slate-100">Dismiss</button>
          </div>
        </div>
      ) : null}
      <Link href="/admin/inbox" className="inline-flex items-center gap-2 text-slate-300 hover:text-white">
        Inbox
        {unreadCount > 0 ? <span aria-label={`${unreadCount} unread conversations`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#d8b65c] px-1.5 py-0.5 text-[11px] font-bold text-[#15171d]">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </Link>
      <Link href={latestReservationUnread ? buildReservationReviewUrl(latestReservationUnread) : "/admin/requests"} className="inline-flex items-center gap-2 text-slate-300 hover:text-white">
        Requests
        {reservationUnreadCount > 0 ? <span aria-label={`${reservationUnreadCount} unread reservation requests`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold text-[#15171d]">{reservationUnreadCount > 99 ? "99+" : reservationUnreadCount}</span> : null}
      </Link>
      <button
        ref={settingsButtonRef}
        type="button"
        aria-expanded={settingsOpen}
        aria-controls="admin-inbox-alert-settings"
        onClick={() => {
          if (!settingsOpen) updateSettingsPosition();
          setSettingsOpen((open) => !open);
        }}
        className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
      >
        Alerts
      </button>

      {settingsOpen ? (
        <section id="admin-inbox-alert-settings" aria-label="Inbox alert settings" style={settingsPosition ?? undefined} className="fixed z-50 max-h-[calc(100dvh-7rem)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-slate-600 bg-[#20232a] p-4 text-sm text-slate-100 shadow-2xl">
          <h2 className="font-semibold text-white">Admin alerts</h2>
          <p className="mt-1 text-xs leading-5 text-slate-300">Keep an admin tab open for Inbox and reservation sounds and desktop notifications. Browser or computer sleep can pause them. Persistent request badges remain when you return.</p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void enableSound()} className="rounded-md bg-[#d8b65c] px-3 py-1.5 text-xs font-semibold text-[#15171d]">Enable sound</button>
                <button type="button" onClick={() => void testSound()} className="rounded-md border border-slate-500 px-3 py-1.5 text-xs hover:bg-slate-700">Test sound</button>
                <button type="button" onClick={() => void testSound("reservation")} className="rounded-md border border-slate-500 px-3 py-1.5 text-xs hover:bg-slate-700">Test reservation sound</button>
                <label className="ml-auto inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={preferences.muted} onChange={(event) => updatePreferences({ muted: event.target.checked })} /> Mute</label>
              </div>
              <label className="mt-3 flex items-center gap-3 text-xs text-slate-300">Volume
                <input aria-label="Alert volume" type="range" min="0" max="100" value={Math.round(preferences.volume * 100)} onChange={(event) => updatePreferences({ volume: Number(event.target.value) / 100 })} className="min-w-0 flex-1 accent-[#d8b65c]" />
                <span className="w-8 text-right tabular-nums">{Math.round(preferences.volume * 100)}%</span>
              </label>
              {soundStatus ? <p role="status" className="mt-2 text-xs text-slate-300">{soundStatus}</p> : null}
            </div>
            <div className="border-t border-slate-700 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void enableDesktopNotifications()} className="rounded-md bg-[#d8b65c] px-3 py-1.5 text-xs font-semibold text-[#15171d]">Enable notifications</button>
                <button type="button" onClick={testNotification} className="rounded-md border border-slate-500 px-3 py-1.5 text-xs hover:bg-slate-700">Test notification</button>
              </div>
              {notificationStatus ? <p role="status" className="mt-2 text-xs text-slate-300">{notificationStatus}</p> : null}
            </div>
            <AdminInboxSmsSettings />
            {coordinationStatus ? <p role="status" className="border-t border-slate-700 pt-3 text-xs text-amber-200">{coordinationStatus}</p> : null}
          </div>
        </section>
      ) : null}

      <div aria-live="polite" aria-label="Admin alerts" className="fixed right-4 top-20 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {alerts.map((alert) => (
          <div key={alertKey(alert)} className="rounded-xl border border-[#d8b65c]/60 bg-[#20232a] p-4 text-sm text-white shadow-2xl">
            <p className="font-semibold">{isReservationAlert(alert) ? RESERVATION_ALERT_COPY : "New customer message"}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Link href={alertUrl(alert)} onClick={() => setAlerts((current) => current.filter((item) => alertKey(item) !== alertKey(alert)))} className="rounded-md bg-[#d8b65c] px-3 py-1.5 text-xs font-semibold text-[#15171d]">{isReservationAlert(alert) ? "Review dates" : "Open conversation"}</Link>
              <button type="button" onClick={() => setAlerts((current) => current.filter((item) => alertKey(item) !== alertKey(alert)))} aria-label={isReservationAlert(alert) ? "Dismiss reservation alert" : "Dismiss new message alert"} className="text-xs text-slate-300 underline">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
