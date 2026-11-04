import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuestInfo } from "./GuestInfo";
import type { GuestInfoInput, TripDetailsInput } from "../schemas";

vi.mock("@/lib/google-places", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/google-places")>(),
  loadGooglePlaces: vi.fn().mockResolvedValue(undefined),
}));

const component = (type: string, long_name: string, short_name = long_name) => ({
  types: [type], long_name, short_name,
});
const place = {
  formatted_address: "100 Queen Street West, Toronto, ON M5H 2N2, Canada",
  address_components: [
    component("street_number", "100"), component("route", "Queen Street West"),
    component("locality", "Toronto"), component("administrative_area_level_1", "Ontario", "ON"),
    component("postal_code", "M5H 2N2"), component("country", "Canada", "CA"),
  ],
};
const instances: Array<{
  input: HTMLInputElement;
  options: unknown;
  select: () => void;
  active: boolean;
  setComponentRestrictions: ReturnType<typeof vi.fn>;
}> = [];

function Fixture({ disabled = false }: { disabled?: boolean }) {
  const form = useForm<{ trip: TripDetailsInput; guest: GuestInfoInput }>({
    defaultValues: {
      trip: { villaType: "Cabin", resortId: "CFW" },
      guest: { country: "United States", adultGuests: [], childGuests: [] },
    },
  });
  return <FormProvider {...form}>
    <GuestInfo onNext={vi.fn()} onBack={vi.fn()} resorts={[]} disableAddressAutocomplete={disabled} />
  </FormProvider>;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_PLACES_API_KEY", "test-browser-key");
  instances.length = 0;
  vi.stubGlobal("google", { maps: { places: { Autocomplete: class {
    instance: typeof instances[number];
    constructor(input: HTMLInputElement, options: unknown) {
      this.instance = { input, options, select: () => {}, active: false, setComponentRestrictions: vi.fn() };
      instances.push(this.instance);
    }
    addListener(_event: string, handler: () => void) {
      this.instance.active = true;
      this.instance.select = () => { if (this.instance.active) handler(); };
      return { remove: () => { this.instance.active = false; } };
    }
    getPlace() { return place; }
    setComponentRestrictions(restrictions: unknown) { this.instance.setComponentRestrictions(restrictions); }
  } } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("guest address autocomplete", () => {
  it("keeps selection active after typing and country changes, fills every field, and permits manual edits", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await waitFor(() => expect(instances).toHaveLength(1));
    expect(instances[0].options).toMatchObject({ componentRestrictions: { country: "us" } });
    await user.type(screen.getByLabelText("Address"), "3266 sh");
    await user.type(screen.getByLabelText("First name"), "Test");
    await user.click(screen.getByRole("button", { name: "Country" }));
    await user.click(screen.getByRole("option", { name: /^Canada$/ }));
    expect(instances).toHaveLength(1);
    expect(instances[0].setComponentRestrictions).toHaveBeenLastCalledWith({ country: "ca" });
    act(() => instances[0].select());
    expect(screen.getByLabelText("Address")).toHaveValue("100 Queen Street West");
    expect(screen.getByLabelText("City")).toHaveValue("Toronto");
    expect(screen.getByLabelText("State / Province")).toHaveValue("ON");
    expect(screen.getByLabelText("Postal code")).toHaveValue("M5H 2N2");
    expect(screen.getByRole("button", { name: "Country" })).toHaveTextContent("Canada");
    await user.clear(screen.getByLabelText("Address"));
    await user.type(screen.getByLabelText("Address"), "123 Manual Street");
    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "Ottawa");
    expect(screen.getByLabelText("Address")).toHaveValue("123 Manual Street");
    expect(screen.getByLabelText("City")).toHaveValue("Ottawa");
  });

  it("reattaches to the new address input after returning from the travel party section", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await waitFor(() => expect(instances).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Continue to travel party" }));
    await screen.findByRole("heading", { name: "Who else is joining this stay?" });
    await user.click(screen.getByRole("button", { name: "← Back" }));
    await screen.findByLabelText("Address");
    await waitFor(() => expect(instances).toHaveLength(2));
    expect(instances[0].active).toBe(false);
    expect(instances[1].input).toBe(screen.getByLabelText("Address"));
    act(() => instances[1].select());
    expect(screen.getByLabelText("Postal code")).toHaveValue("M5H 2N2");
  });

  it("keeps manual entry usable when autocomplete is disabled or unconfigured", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_PLACES_API_KEY", "");
    const user = userEvent.setup();
    render(<Fixture disabled />);
    await user.type(screen.getByLabelText("Address"), "123 Manual Street");
    await user.type(screen.getByLabelText("City"), "Toronto");
    await user.type(screen.getByLabelText("State / Province"), "ON");
    await user.type(screen.getByLabelText("Postal code"), "M5H 2N2");
    expect(screen.getByLabelText("Address")).toHaveValue("123 Manual Street");
    expect(screen.getByLabelText("City")).toHaveValue("Toronto");
    expect(screen.getByLabelText("State / Province")).toHaveValue("ON");
    expect(screen.getByLabelText("Postal code")).toHaveValue("M5H 2N2");
    expect(instances).toHaveLength(0);
  });
});
