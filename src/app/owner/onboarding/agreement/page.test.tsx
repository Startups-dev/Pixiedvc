import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  getUser: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("next/navigation", () => {
  const router = { replace: mocks.replace };
  return { useRouter: () => router };
});
vi.mock("@/lib/supabase", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser } }) }));
import OwnerAgreementPage from "./page";

let markerBottom = 2000;
let intersectionChanged: () => void;
let contentResized: () => void;
let observedEnd: Element | null;
const disconnectIntersection = vi.fn();
const disconnectResize = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  markerBottom = 2000;
  observedEnd = null;
  vi.stubGlobal("innerHeight", 768);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "synthetic-owner" } } });
  mocks.fetch.mockImplementation(async (_url: string, options?: RequestInit) => options?.method === "POST"
    ? { ok: true, status: 200, json: async () => ({ ok: true }) }
    : { ok: true, status: 200, json: async () => ({ acceptedAt: null, agreementVersion: null }) });
  vi.stubGlobal("fetch", mocks.fetch);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
    return { top: markerBottom - 1, bottom: markerBottom, height: 1, left: 0, right: 1, width: 1, x: 0, y: markerBottom - 1, toJSON: () => ({}) };
  });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: () => void) { intersectionChanged = callback; }
    observe(target: Element) { observedEnd = target; }
    disconnect = disconnectIntersection;
  });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { contentResized = callback; }
    observe() {}
    disconnect = disconnectResize;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function load() {
  const result = render(<OwnerAgreementPage />);
  await screen.findByRole("article", { name: "HannaDVC Owner Platform Agreement" });
  if (typeof IntersectionObserver !== "undefined") {
    await waitFor(() => expect(observedEnd).toBe(screen.getByTestId("agreement-end")));
  }
  return result;
}
const checkbox = () => screen.getByRole("checkbox");
const signature = () => screen.getByRole("textbox", { name: /Type your full legal name/ });
const button = () => screen.getByRole("button", { name: "Accept & Continue" });
const posts = () => mocks.fetch.mock.calls.filter(([, options]) => options?.method === "POST");

describe("Owner platform agreement page reading and acceptance", () => {
  it("renders the whole contract in page flow with acceptance controls after it", async () => {
    await load();
    const article = screen.getByRole("article");
    expect(article).not.toHaveAttribute("tabindex");
    expect(article.className).not.toMatch(/max-h|overflow/);
    expect(article).toHaveTextContent("17. Governing Law");
    expect(article).toHaveTextContent("The parties submit to the non-exclusive jurisdiction of Ontario courts.");
    expect(article.compareDocumentPosition(checkbox()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(checkbox()).toBeDisabled();
    expect(checkbox()).not.toBeChecked();
    expect(button()).toBeDisabled();
    expect(posts()).toHaveLength(0);
  });

  it("enables explicit consent when the end marker enters the viewport, without checking or submitting", async () => {
    await load();
    markerBottom = 700;
    act(() => intersectionChanged());
    expect(checkbox()).toBeEnabled();
    expect(checkbox()).not.toBeChecked();
    expect(button()).toBeDisabled();
    expect(posts()).toHaveLength(0);
  });

  it("handles a keyboard End/Tab jump past the marker into the form or page footer", async () => {
    await load();
    markerBottom = -300;
    fireEvent.scroll(window);
    expect(checkbox()).toBeEnabled();
    expect(checkbox()).not.toBeChecked();
  });

  it("handles short content already visible without requiring a scroll gesture", async () => {
    markerBottom = 400;
    await load();
    await waitFor(() => expect(checkbox()).toBeEnabled());
    expect(checkbox()).not.toBeChecked();
    expect(posts()).toHaveLength(0);
  });

  it("uses the new marker position after simulated text expansion and content reflow", async () => {
    await load();
    markerBottom = 4000;
    act(() => contentResized());
    expect(checkbox()).toBeDisabled();
    markerBottom = 740;
    act(() => contentResized());
    expect(checkbox()).toBeEnabled();
    expect(checkbox()).not.toBeChecked();
  });

  it("rechecks the viewport after resizing and keeps the existing once-read behavior", async () => {
    markerBottom = 900;
    await load();
    expect(checkbox()).toBeDisabled();
    vi.stubGlobal("innerHeight", 1000);
    fireEvent.resize(window);
    expect(checkbox()).toBeEnabled();
    markerBottom = 2000;
    fireEvent.resize(window);
    expect(checkbox()).toBeEnabled();
  });

  it("still works without IntersectionObserver or ResizeObserver", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.stubGlobal("ResizeObserver", undefined);
    await load();
    markerBottom = 700;
    fireEvent.scroll(window);
    expect(checkbox()).toBeEnabled();
  });

  it("requires deliberate consent and a valid name, and supports keyboard-only acceptance", async () => {
    markerBottom = 500;
    await load();
    const user = userEvent.setup();
    await user.tab();
    expect(checkbox()).toHaveFocus();
    await user.keyboard(" ");
    expect(checkbox()).toBeChecked();
    expect(posts()).toHaveLength(0);
    await user.tab();
    expect(signature()).toHaveFocus();
    await user.type(signature(), "Jo");
    expect(button()).toBeDisabled();
    await user.clear(signature());
    await user.type(signature(), "Jane Owner");
    expect(button()).toBeEnabled();
    await user.tab();
    expect(button()).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/owner/dashboard"));
    expect(posts()).toHaveLength(1);
    expect(posts()[0]).toEqual(["/api/owner/agreement/accept", expect.objectContaining({
      method: "POST", credentials: "include", body: JSON.stringify({ signedName: "Jane Owner" }),
    })]);
  });

  it("does not submit if a form submission bypasses the disabled button", async () => {
    await load();
    fireEvent.change(signature(), { target: { value: "Jane Owner" } });
    fireEvent.submit(screen.getByRole("form"));
    expect(posts()).toHaveLength(0);
    markerBottom = 700;
    fireEvent.scroll(window);
    fireEvent.submit(screen.getByRole("form"));
    expect(posts()).toHaveLength(0);
  });

  it("allows an explicit retry after a network error without automatically retrying acceptance", async () => {
    markerBottom = 500;
    await load();
    const user = userEvent.setup();
    await user.click(checkbox());
    await user.type(signature(), "Jane Owner");
    mocks.fetch.mockRejectedValueOnce(new Error("synthetic offline"));
    await user.click(button());
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again");
    expect(button()).toBeEnabled();
    expect(posts()).toHaveLength(1);
    await user.click(button());
    await waitFor(() => expect(posts()).toHaveLength(2));
  });

  it("cleans up observers on unmount", async () => {
    const view = await load();
    view.unmount();
    expect(disconnectIntersection).toHaveBeenCalled();
    expect(disconnectResize).toHaveBeenCalled();
  });
});
