import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import { AgreementAndPayment } from "./AgreementAndPayment";

afterEach(cleanup);

function Fixture({ testMode = false, onTestSubmit = vi.fn() }: { testMode?: boolean; onTestSubmit?: () => void }) {
  const form = useForm({ defaultValues: { agreement: { gateway: "stripe" } } });
  return <FormProvider {...form}>
    <AgreementAndPayment
      onBack={vi.fn()}
      onSubmit={vi.fn()}
      onTestSubmit={testMode ? onTestSubmit : undefined}
      estimatedDeposit={99}
    />
  </FormProvider>;
}

describe("$99 agreement step", () => {
  it("shows only the no-charge action to an eligible TEST guest", async () => {
    const onTestSubmit = vi.fn();
    render(<Fixture testMode onTestSubmit={onTestSubmit} />);
    expect(screen.getByText(/TEST ·|TEST booking option/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit & Place Deposit" })).toBeNull();
    const button = screen.getByRole("button", { name: "Complete Test Booking — No Charge" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => { fireEvent.click(button); });
    expect(onTestSubmit).toHaveBeenCalledOnce();
  });

  it("keeps the regular deposit action for other guests", () => {
    render(<Fixture />);
    expect(screen.getByRole("button", { name: "Submit & Place Deposit" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Complete Test Booking — No Charge" })).toBeNull();
  });
});
