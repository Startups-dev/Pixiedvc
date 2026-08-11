import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PixieClient from "@/app/pixie/PixieClient";
import { sendPixieMessage } from "@/lib/pixie/client/api";

vi.mock("@/lib/pixie/client/api", () => ({
  PixieChatApiError: class PixieChatApiError extends Error {},
  sendPixieMessage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/pixie/client/analytics", () => ({
  trackPixieEvent: vi.fn(),
}));

describe("Hara UI", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
    vi.mocked(sendPixieMessage).mockClear();
  });

  it("renders the composer enabled without preview or disabled banners", () => {
    render(<PixieClient />);

    const input = screen.getByLabelText(/tell hara about your trip/i);
    expect(input).toBeEnabled();
    expect(screen.queryByText("not enabled")).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hara is not publicly enabled/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hara preview mode/i)).not.toBeInTheDocument();
  });

  it("submits Hara messages normally", async () => {
    const user = userEvent.setup();
    render(<PixieClient />);

    const input = screen.getByLabelText(/tell hara about your trip/i);
    await user.type(input, "We are testing Hara.");
    await user.click(screen.getByRole("button", { name: /send message to hara/i }));

    expect(sendPixieMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "We are testing Hara.",
      }),
    );
  });
});
