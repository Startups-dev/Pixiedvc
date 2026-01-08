import {
  calculatePayoutAmountCents,
  getMissingApprovalPrerequisites,
  getNextOwnerAction,
  getPayoutStageForMilestone,
  type MilestoneRow,
} from "@/lib/owner-portal";

describe("owner portal helpers", () => {
  it("maps milestones to payout stages", () => {
    expect(getPayoutStageForMilestone("disney_confirmation_uploaded")).toBe(70);
    expect(getPayoutStageForMilestone("check_out")).toBe(30);
    expect(getPayoutStageForMilestone("matched")).toBeNull();
  });

  it("calculates payout amounts", () => {
    expect(calculatePayoutAmountCents(10000, 70)).toBe(7000);
    expect(calculatePayoutAmountCents(10000, 30)).toBe(3000);
    expect(calculatePayoutAmountCents(null, 70)).toBe(0);
  });

  it("computes next owner action", () => {
    const milestones: MilestoneRow[] = [
      { code: "owner_approved", status: "pending", occurred_at: null },
    ];
    expect(getNextOwnerAction(milestones)?.label).toContain("Awaiting");

    const prerequisitesReady: MilestoneRow[] = [
      { code: "guest_verified", status: "completed", occurred_at: null },
      { code: "payment_verified", status: "completed", occurred_at: null },
      { code: "booking_package_sent", status: "completed", occurred_at: null },
      { code: "agreement_sent", status: "completed", occurred_at: null },
      { code: "owner_approved", status: "pending", occurred_at: null },
    ];
    expect(getMissingApprovalPrerequisites(prerequisitesReady)).toEqual([]);
    expect(getNextOwnerAction(prerequisitesReady)?.label).toContain("Approve");

    const milestonesAfterApproval: MilestoneRow[] = [
      { code: "owner_approved", status: "completed", occurred_at: null },
      { code: "disney_confirmation_uploaded", status: "pending", occurred_at: null },
    ];
    expect(getNextOwnerAction(milestonesAfterApproval)?.label).toContain("Upload");
  });
});
