import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";

import { guestInfoSchema } from "../schemas";
import { CountrySelect } from "./CountrySelect";

afterEach(cleanup);

function Fixture() {
  const form = useForm({ defaultValues: { guest: { country: "United States" } } });
  const [showCountry, setShowCountry] = useState(true);
  const country = useWatch({ control: form.control, name: "guest.country" });
  return (
    <FormProvider {...form}>
      {showCountry ? (
        <>
          <label htmlFor="guest.country">Country</label>
          <Controller
            name="guest.country"
            control={form.control}
            render={({ field }) => (
              <CountrySelect id="guest.country" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </>
      ) : null}
      <output data-testid="country-value">{country}</output>
      <button type="button" onClick={() => setShowCountry((current) => !current)}>
        {showCountry ? "Next step" : "Back to guest information"}
      </button>
    </FormProvider>
  );
}

describe("guest country selection", () => {
  it("opens by mouse, selects Canada, validates, and persists between steps", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(screen.getByRole("button", { name: "Country" }));
    await user.click(screen.getByRole("option", { name: "Canada" }));
    expect(screen.getByTestId("country-value").textContent).toBe("Canada");
    expect(guestInfoSchema.shape.country.safeParse("Canada").success).toBe(true);

    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Back to guest information" }));
    expect(screen.getByRole("button", { name: "Country" }).textContent).toContain("Canada");
  });

  it("opens with the keyboard and selects Canada with ArrowDown and Enter", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    screen.getByRole("button", { name: "Country" }).focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(screen.getByTestId("country-value").textContent).toBe("Canada");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes on Escape without changing the selected country", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(screen.getByRole("button", { name: "Country" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByTestId("country-value").textContent).toBe("United States");
  });
});
