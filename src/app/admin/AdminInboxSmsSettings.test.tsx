import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminInboxSmsSettings from "./AdminInboxSmsSettings";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function settingsResponse() {
  return Response.json({
    ok: true,
    configuration: { ready: true, missing: [] },
    settings: {
      phoneLast4: null, phoneVerified: false, optedIn: false, enabled: false,
      newInquiryEnabled: true, assignedReplyEnabled: true, escalationDelayMinutes: 5,
      quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00", timeZone: "America/Toronto",
    },
  });
}

describe("Admin Inbox SMS settings", () => {
  it("shows an inline verification failure, sends normalized input, and keeps consent available while explaining prerequisites", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/admin/inbox/sms/settings") return settingsResponse();
      if (String(input) === "/api/admin/inbox/sms/verify/start") return Response.json({ ok: false, error: "PHONE_MUST_BE_E164" }, { status: 400 });
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInboxSmsSettings />);
    fireEvent.click(screen.getByRole("button", { name: "SMS escalation" }));

    const phoneInput = await screen.findByLabelText("Your mobile number");
    fireEvent.change(phoneInput, { target: { value: "+1 (365) 767-1900" } });
    const consent = screen.getByRole("checkbox", { name: /I agree to receive operational Inbox escalation texts/ });
    const enable = screen.getByRole("checkbox", { name: /Enable SMS escalation alerts/ });
    expect(consent).toBeEnabled();
    expect(enable).toBeDisabled();
    fireEvent.click(consent);
    expect(consent).toBeChecked();
    expect(screen.getByText("Your consent choice will be saved after your phone is verified.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Enter a valid phone number with country code");
    const verificationRequest = fetchMock.mock.calls.find(([input]) => String(input) === "/api/admin/inbox/sms/verify/start");
    expect(verificationRequest).toBeTruthy();
    const requestInit = verificationRequest?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({ phone: "+13657671900" });
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("twilio"), expect.anything());
  });

  it("shows sending state and reveals the code field only after the authorized API accepts the request", async () => {
    let finishStart!: (response: Response) => void;
    const pendingStart = new Promise<Response>((resolve) => { finishStart = resolve; });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/admin/inbox/sms/settings" && init?.method === "PATCH") return Promise.resolve(Response.json({ ok: true }));
      if (String(input) === "/api/admin/inbox/sms/settings") return Promise.resolve(settingsResponse());
      if (String(input) === "/api/admin/inbox/sms/verify/start") return pendingStart;
      if (String(input) === "/api/admin/inbox/sms/verify/confirm") return Promise.resolve(Response.json({ ok: true, phoneLast4: "0100" }));
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInboxSmsSettings />);
    fireEvent.click(screen.getByRole("button", { name: "SMS escalation" }));
    fireEvent.change(await screen.findByLabelText("Your mobile number"), { target: { value: "+13657671900" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree to receive operational Inbox escalation texts/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));

    expect(await screen.findByRole("button", { name: "Sending code…" })).toBeDisabled();
    expect(screen.queryByLabelText("6-digit code")).not.toBeInTheDocument();
    finishStart(Response.json({ ok: true, challengeId: "synthetic-challenge", deliveryStatus: "accepted" }));
    expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((status) => status.textContent?.includes("Twilio accepted the verification text"))).toBe(true);
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify phone" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Phone verified"));
    expect(screen.getByRole("checkbox", { name: /I agree to receive operational Inbox escalation texts/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Enable SMS escalation alerts/ })).toBeEnabled();
  });
});
