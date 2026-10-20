export type InboxAlertPreferences = {
  soundEnabled: boolean;
  muted: boolean;
  volume: number;
  desktopNotificationsEnabled: boolean;
};

export type InboxAlertEvent = {
  id: string;
  conversationId: string;
  createdAt: string;
};

export const DEFAULT_INBOX_ALERT_PREFERENCES: InboxAlertPreferences = {
  soundEnabled: false,
  muted: false,
  volume: 0.55,
  desktopNotificationsEnabled: false,
};

const MAX_SEEN_IDS = 500;

export function parseInboxAlertPreferences(value: string | null): InboxAlertPreferences {
  if (!value) return { ...DEFAULT_INBOX_ALERT_PREFERENCES };
  try {
    const parsed = JSON.parse(value) as Partial<InboxAlertPreferences>;
    return {
      soundEnabled: parsed.soundEnabled === true,
      muted: parsed.muted === true,
      volume: typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
        ? Math.min(1, Math.max(0, parsed.volume))
        : DEFAULT_INBOX_ALERT_PREFERENCES.volume,
      desktopNotificationsEnabled: parsed.desktopNotificationsEnabled === true,
    };
  } catch {
    return { ...DEFAULT_INBOX_ALERT_PREFERENCES };
  }
}

export function isAlertableCustomerMessage(message: {
  id?: unknown;
  conversation_id?: unknown;
  sender?: unknown;
  sender_type?: unknown;
  visibility?: unknown;
  metadata?: unknown;
}): boolean {
  const metadata = message.metadata && typeof message.metadata === "object"
    ? message.metadata as Record<string, unknown>
    : {};
  const isGuest = message.sender_type === "guest" || message.sender === "guest";
  return Boolean(
    message.id && message.conversation_id && isGuest &&
    message.visibility !== "internal" &&
    metadata.historical_import !== true && metadata.import_type !== "historical",
  );
}

export function claimInboxAlertLeader(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
  tabId: string,
  now: number,
  leaseMs = 12_000,
): boolean {
  try {
    const current = storage.getItem(key);
    if (current) {
      const [owner, expiryText] = current.split(":");
      const expiry = Number(expiryText);
      if (owner !== tabId && Number.isFinite(expiry) && expiry > now) return false;
    }
    storage.setItem(key, `${tabId}:${now + leaseMs}`);
    return storage.getItem(key)?.startsWith(`${tabId}:`) ?? false;
  } catch {
    return false;
  }
}

export function releaseInboxAlertLeader(
  storage: Pick<Storage, "getItem" | "removeItem">,
  key: string,
  tabId: string,
) {
  try {
    if (storage.getItem(key)?.startsWith(`${tabId}:`)) storage.removeItem(key);
  } catch {
    // Storage can be unavailable in strict privacy modes; the lease will expire.
  }
}

export function readSeenInboxAlertIds(storage: Pick<Storage, "getItem">, key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(-MAX_SEEN_IDS) : [];
  } catch {
    return [];
  }
}

export function rememberSeenInboxAlertId(storage: Pick<Storage, "getItem" | "setItem">, key: string, id: string): boolean {
  const seen = readSeenInboxAlertIds(storage, key);
  if (seen.includes(id)) return false;
  try {
    storage.setItem(key, JSON.stringify([...seen, id].slice(-MAX_SEEN_IDS)));
    return true;
  } catch {
    // In-memory leadership still suppresses duplicates for this tab.
    return true;
  }
}

export function buildInboxConversationUrl(conversationId: string) {
  return `/admin/inbox?conversation=${encodeURIComponent(conversationId)}`;
}

export function getInboxAlertPanelPosition(
  button: { right: number; bottom: number },
  viewportWidth: number,
  panelWidth = 384,
  gutter = 12,
) {
  const width = Math.max(0, Math.min(panelWidth, viewportWidth - gutter * 2));
  return {
    left: Math.max(gutter, Math.min(button.right - width, viewportWidth - width - gutter)),
    top: button.bottom + 8,
  };
}

export function isSoundEnabled(preferences: InboxAlertPreferences) {
  return preferences.soundEnabled && !preferences.muted && preferences.volume > 0;
}

export function shouldUseInboxAlertBaseline(input: {
  cursor?: string;
  checkedAt?: number;
  networkFailed: boolean;
  now: number;
  activeWindowMs: number;
}) {
  return input.networkFailed || !input.cursor || !input.checkedAt || input.now - input.checkedAt > input.activeWindowMs;
}

export async function requestInboxNotificationPermission(api: {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
} | null): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!api) return "unsupported";
  if (api.permission === "denied") return "denied";
  if (api.permission === "granted") return "granted";
  try {
    const permission = await api.requestPermission();
    return permission === "granted" || permission === "denied" ? permission : "default";
  } catch {
    return "default";
  }
}

export async function resumeInboxAudio(context: Pick<AudioContext, "state" | "resume">) {
  if (context.state !== "running") await context.resume();
  if (context.state !== "running") throw new Error("AUDIO_CONTEXT_BLOCKED");
}
