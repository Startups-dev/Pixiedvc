import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FoundersBonusCalculator from "./FoundersBonusCalculator";

describe("FoundersBonusCalculator", () => {
  it("shows only the additional $2 per rented point and updates with the slider", () => {
    render(<FoundersBonusCalculator />);
    const slider = screen.getByRole("slider", { name: "Points rented through HannaDVC" });

    expect(screen.getByText("$600")).toBeTruthy();
    fireEvent.change(slider, { target: { value: "1000" } });
    expect(screen.getByText("$2,000")).toBeTruthy();
    expect(screen.getByText(/slider range is not a program limit/i)).toBeTruthy();
  });
});
