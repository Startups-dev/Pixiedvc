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

  it("opens the concierge request form from concierge CTA", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          assigned: false,
          conversationId: "conv-1",
        }),
      }),
    );
    render(<SupportPanel />);
    scrollToMock.mockClear();

    await user.click(screen.getByRole("button", { name: "💬 Talk to a Concierge Now" }));

    expect(screen.getByText("✨ Finding an available concierge...")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText(
          "All concierge are currently assisting other guests. We can follow up quickly — just leave your details.",
        ),
      ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(screen.getByText("Share a few details and we’ll follow up.")).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalled();
    });
  });

  it("opens concierge flow from in-chat handoff button", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => "application/json",
        },
        json: async () => ({
          answer: "I can help with that.",
          handoffSuggested: true,
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          assigned: false,
          conversationId: "conv-2",
        }),
      });
    vi.stubGlobal(
      "fetch",
      fetchMock,
    );

    render(<SupportPanel />);
    scrollToMock.mockClear();

    await user.type(screen.getByPlaceholderText("Ask anything DVC..."), "Need help with booking");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const conciergeButtons = await screen.findAllByRole("button", {
      name: "💬 Talk to a Concierge Now",
    });
    expect(conciergeButtons.length).toBeGreaterThan(0);

    await user.click(conciergeButtons[0]);

    expect(screen.getByText("✨ Finding an available concierge...")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText(
          "All concierge are currently assisting other guests. We can follow up quickly — just leave your details.",
        ),
      ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(screen.getByText("Share a few details and we’ll follow up.")).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalled();
    });
  });
});
