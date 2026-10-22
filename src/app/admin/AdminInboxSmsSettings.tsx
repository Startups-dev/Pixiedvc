"use client";

import { useEffect, useState } from "react";

type Settings = {
  phoneLast4: string | null;
  phoneVerified: boolean;
  optedIn: boolean;
  enabled: boolean;
  newInquiryEnabled: boolean;
  assignedReplyEnabled: boolean;
  escalationDelayMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timeZone: string;
};

type SettingsResponse = {
  ok?: boolean;
  error?: string;
  configuration?: { ready: boolean; missing: string[] };
  settings?: Settings;
  challengeId?: string;
  phoneLast4?: string;
  deliveryStatus?: "accepted" | "delivered" | "unknown";
};

const DEFAULT_SETTINGS: Settings = {
  phoneLast4: null, phoneVerified: false, optedIn: false, enabled: false,
  newInquiryEnabled: true, assignedReplyEnabled: true, escalationDelayMinutes: 5,
  quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00", timeZone: "America/Toronto",
};

const ERROR_COPY: Record<string, string> = {
  SMS_PROVIDER_NOT_CONFIGURED: "SMS is not ready yet. Twilio sending and encryption settings are not configured.",
  PHONE_MUST_BE_E164: "Enter a valid phone number with country code, such as +1 416 555 0100.",
  VERIFICATION_RATE_LIMITED: "Too many verification codes were requested. Try again in an hour.",
  VERIFICATION_CODE_INCORRECT: "That code did not match. Check it and try again.",
  VERIFICATION_EXPIRED: "That code expired. Request a new one.",
  VERIFICATION_ATTEMPTS_EXHAUSTED: "Too many incorrect attempts. Request a new code.",
  SMS_RATE_LIMITED: "A message was sent recently. Wait a minute before trying again.",
  SMS_SEND_OUTCOME_UNKNOWN: "Twilio’s response was unclear. We did not retry, to avoid sending a duplicate. Check Twilio before requesting another code.",
  SMS_PROVIDER_REJECTED: "Twilio rejected the message. Check the sender and account setup, then try again.",
  SMS_NOT_ENABLED_FOR_THIS_ACCOUNT: "Verify your phone, opt in, and enable alerts before sending a test.",
  VERIFY_PHONE_FIRST: "Verify your phone before enabling SMS alerts.",
};

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => null) as SettingsResponse | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "SMS_SETTINGS_FAILED");
  return payload;
}

export default function AdminInboxSmsSettings() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [configurationReady, setConfigurationReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    void requestJson("/api/admin/inbox/sms/settings").then((payload) => {
      if (!active) return;
      setSettings(payload.settings ?? DEFAULT_SETTINGS);
      setConfigurationReady(payload.configuration?.ready === true);
    }).catch(() => {
      if (active) setStatus("SMS settings could not be loaded. Try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  async function saveSettings(next = settings) {
    setSaving(true);
    setStatus("");
    try {
      await requestJson("/api/admin/inbox/sms/settings", { method: "PATCH", body: JSON.stringify(next) });
      setSettings(next);
      setStatus("SMS preferences saved.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "SMS_SETTINGS_FAILED";
      setStatus(ERROR_COPY[code] ?? "SMS preferences could not be saved. Try again.");
    } finally { setSaving(false); }
  }

  async function startVerification() {
    setSaving(true);
    setStatus("");
    try {
      const result = await requestJson("/api/admin/inbox/sms/verify/start", { method: "POST", body: JSON.stringify({ phone }) });
      setChallengeId(result.challengeId ?? null);
      setCode("");
      setStatus(result.deliveryStatus === "unknown"
        ? "Twilio’s response was unclear. We did not retry. If the code arrives, enter it here; otherwise wait for it to expire before trying again."
        : "Twilio accepted the verification text. It expires in 10 minutes.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "SMS_SETTINGS_FAILED";
      setStatus(ERROR_COPY[reason] ?? "We could not send a verification code. Check your phone number and try again.");
    } finally { setSaving(false); }
  }

  async function confirmVerification() {
    if (!challengeId) return;
    setSaving(true);
    setStatus("");
    try {
      const result = await requestJson("/api/admin/inbox/sms/verify/confirm", { method: "POST", body: JSON.stringify({ challengeId, code }) });
      setSettings((current) => ({ ...current, phoneLast4: result.phoneLast4 ?? null, phoneVerified: true, optedIn: false, enabled: false }));
      setChallengeId(null);
      setPhone("");
      setCode("");
      setStatus("Phone verified. SMS alerts remain off until you opt in and enable them.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "SMS_SETTINGS_FAILED";
      setStatus(ERROR_COPY[reason] ?? "That code could not be verified. Try again or request a new code.");
    } finally { setSaving(false); }
  }

  async function sendTest() {
    setSaving(true);
    setStatus("");
    try {
      const result = await requestJson("/api/admin/inbox/sms/test", { method: "POST" });
      setStatus(result.deliveryStatus === "delivered" ? "Test SMS delivered." : "Twilio accepted the test SMS. Delivery confirmation may take a moment.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "SMS_SETTINGS_FAILED";
      setStatus(ERROR_COPY[reason] ?? "The test SMS could not be sent. Check the provider status before trying again.");
    } finally { setSaving(false); }
  }

  return (
    <div className="border-t border-slate-700 pt-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-100">
        <span>SMS escalation</span><span aria-hidden="true" className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {!open ? <p className="mt-1 text-xs text-slate-400">Optional staff alerts by text. Off by default.</p> : null}
      {open ? (
        <div className="mt-3 space-y-3 text-xs text-slate-200">
          <p className="leading-5 text-slate-300">SMS is sent only if an inquiry stays unanswered after the delay. Messages include a private Admin Inbox link, never customer details. Alerts require a running server scheduler.</p>
          {!configurationReady ? <p role="status" className="rounded-md border border-amber-400/40 bg-amber-950/30 p-2 text-amber-100">SMS sending is not configured yet. A production Twilio sender and secure credentials are required.</p> : null}
          {loading ? <p className="text-slate-400">Loading SMS settings…</p> : null}
          {settings.phoneVerified ? (
            <p className="rounded-md bg-slate-800 px-3 py-2">Verified phone ending in <strong>{settings.phoneLast4}</strong></p>
          ) : (
            <div className="space-y-2">
              <label className="block">Your mobile number
                <input inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 416 555 0100" className="mt-1 w-full rounded-md border border-slate-600 bg-[#17191f] px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              </label>
              {!challengeId ? <button disabled={saving || !configurationReady || phone.length < 8} type="button" onClick={() => void startVerification()} className="rounded-md bg-[#d8b65c] px-3 py-2 font-semibold text-[#15171d] disabled:opacity-50">Send verification code</button> : (
                <div className="space-y-2">
                  <label className="block">6-digit code
                    <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 w-full rounded-md border border-slate-600 bg-[#17191f] px-3 py-2 text-sm text-white" />
                  </label>
                  <button disabled={saving || code.length !== 6} type="button" onClick={() => void confirmVerification()} className="rounded-md bg-[#d8b65c] px-3 py-2 font-semibold text-[#15171d] disabled:opacity-50">Verify phone</button>
                </div>
              )}
            </div>
          )}

          <label className="flex items-start gap-2"><input type="checkbox" checked={settings.optedIn} disabled={!settings.phoneVerified || !configurationReady} onChange={(event) => setSettings((value) => ({ ...value, optedIn: event.target.checked, enabled: event.target.checked && value.enabled }))} />
            <span>I agree to receive operational Inbox escalation texts.</span>
          </label>
          <label className="flex items-start gap-2"><input type="checkbox" checked={settings.enabled} disabled={!settings.phoneVerified || !settings.optedIn || !configurationReady} onChange={(event) => setSettings((value) => ({ ...value, enabled: event.target.checked }))} />
            <span>Enable SMS escalation alerts</span>
          </label>
          <fieldset disabled={!settings.enabled} className="space-y-3 rounded-md border border-slate-700 p-3 disabled:opacity-60">
            <label className="flex items-center justify-between gap-3">Escalate after
              <select value={settings.escalationDelayMinutes} onChange={(event) => setSettings((value) => ({ ...value, escalationDelayMinutes: Number(event.target.value) }))} className="rounded-md border border-slate-600 bg-[#17191f] px-2 py-1 text-white">
                {[5, 10, 15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.newInquiryEnabled} onChange={(event) => setSettings((value) => ({ ...value, newInquiryEnabled: event.target.checked }))} /> New inquiries not yet claimed</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.assignedReplyEnabled} onChange={(event) => setSettings((value) => ({ ...value, assignedReplyEnabled: event.target.checked }))} /> Customer replies on conversations assigned to me</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.quietHoursEnabled} onChange={(event) => setSettings((value) => ({ ...value, quietHoursEnabled: event.target.checked }))} /> Use quiet hours</label>
            {settings.quietHoursEnabled ? <div className="grid grid-cols-2 gap-2">
              <label>From <input type="time" value={settings.quietHoursStart} onChange={(event) => setSettings((value) => ({ ...value, quietHoursStart: event.target.value }))} className="mt-1 w-full rounded border border-slate-600 bg-[#17191f] px-2 py-1 text-white" /></label>
              <label>Until <input type="time" value={settings.quietHoursEnd} onChange={(event) => setSettings((value) => ({ ...value, quietHoursEnd: event.target.value }))} className="mt-1 w-full rounded border border-slate-600 bg-[#17191f] px-2 py-1 text-white" /></label>
              <label className="col-span-2">Time zone <select value={settings.timeZone} onChange={(event) => setSettings((value) => ({ ...value, timeZone: event.target.value }))} className="mt-1 w-full rounded border border-slate-600 bg-[#17191f] px-2 py-1 text-white">
                {["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns"].map((zone) => <option key={zone} value={zone}>{zone.replace("America/", "").replaceAll("_", " ")}</option>)}
              </select></label>
            </div> : null}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving || !configurationReady} type="button" onClick={() => void saveSettings()} className="rounded-md bg-[#d8b65c] px-3 py-2 font-semibold text-[#15171d] disabled:opacity-50">Save SMS settings</button>
            <button disabled={saving || !configurationReady || !settings.enabled || !settings.optedIn} type="button" onClick={() => void sendTest()} className="rounded-md border border-slate-500 px-3 py-2 hover:bg-slate-700 disabled:opacity-50">Send test SMS</button>
          </div>
          {status ? <p role="status" className="rounded-md bg-slate-800 px-3 py-2 text-slate-100">{status}</p> : null}
          <p className="text-[11px] leading-4 text-slate-400">Up to 1 text per minute, 3 per hour, and 10 per day per staff phone. Quiet hours use local time. Preferences and your phone number are private to staff services.</p>
        </div>
      ) : null}
    </div>
  );
}
