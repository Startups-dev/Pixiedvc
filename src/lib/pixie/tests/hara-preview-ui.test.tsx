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

describe("Hara preview UI", () => {
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

  it("keeps the public disabled experience blocked without preview access", async () => {
    const user = userEvent.setup();
    render(<PixieClient enabled={false} />);

    const input = screen.getByLabelText(/tell hara about your trip/i);
    expect(input).toBeDisabled();
    expect(screen.getByText("not enabled")).toBeInTheDocument();
    expect(screen.getByText(/Hara is not publicly enabled in this environment yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Preview mode/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /send message to hara/i }));
    expect(sendPixieMessage).not.toHaveBeenCalled();
  });

  it("lets authorized preview testers send messages and see preview messaging", async () => {
    const user = userEvent.setup();
    render(<PixieClient enabled previewMode />);

    expect(screen.getByText("Preview mode")).toBeInTheDocument();
    expect(screen.getByText(/Hara preview mode - not yet available to public users/i)).toBeInTheDocument();

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
