// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SupportPanel from "./SupportPanel";

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
  }),
}));

describe("SupportPanel concierge handoff", () => {
  const scrollToMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the initial concierge chat UI", () => {
    render(<SupportPanel />);

    expect(screen.getByText("✨ Pixie Concierge")).toBeInTheDocument();
    expect(
      screen.getByText("Hi 👋 I’m your Pixie Concierge. How can I help with your plans today?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("opens the concierge request form from 'Request concierge help'", async () => {
    const user = userEvent.setup();
    render(<SupportPanel />);
    scrollToMock.mockClear();

    await user.click(screen.getByRole("button", { name: "Request concierge help" }));

    expect(
      screen.getByText("I’ll connect you with a concierge. Please share a few details below."),
    ).toBeInTheDocument();
    expect(screen.getByText("Share a few details and we’ll follow up.")).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalled();
    });
  });

  it("opens the concierge request form from 'I want to speak to a human'", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => "application/json",
        },
        json: async () => ({
          answer: "I can help with that.",
          handoffSuggested: true,
        }),
      }),
    );

    render(<SupportPanel />);
    scrollToMock.mockClear();

    await user.type(screen.getByPlaceholderText("Ask anything DVC..."), "Need help with booking");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("button", { name: "I want to speak to a human" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "I want to speak to a human" }));

    expect(
      screen.getByText("I’ll connect you with a concierge. Please share a few details below."),
    ).toBeInTheDocument();
    expect(screen.getByText("Share a few details and we’ll follow up.")).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalled();
    });
  });
});
