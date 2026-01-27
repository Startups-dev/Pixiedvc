import {
  appendRefToUrl,
  getReferral,
  getReferralMeta,
  isValidReferral,
  setReferral,
} from "@/lib/referral";

function clearReferralCookies() {
  document.cookie = "pixiedvc_ref=; max-age=0; path=/";
  document.cookie = "pixiedvc_ref_set_at=; max-age=0; path=/";
  document.cookie = "pixiedvc_ref_landing=; max-age=0; path=/";
}

describe("referral utilities", () => {
  beforeEach(() => {
    clearReferralCookies();
  });

  it("validates referral strings", () => {
    expect(isValidReferral("abc123")).toBe(true);
    expect(isValidReferral("aff_01")).toBe(true);
    expect(isValidReferral("a")).toBe(false);
    expect(isValidReferral("**bad**")).toBe(false);
    expect(isValidReferral(null)).toBe(false);
  });

  it("sets referral only once (first-touch wins)", () => {
    const first = setReferral("first_ref", "/calculator");
    const second = setReferral("second_ref", "/plan");

    expect(first).toBe("first_ref");
    expect(second).toBe("first_ref");
    expect(getReferral()).toBe("first_ref");

    const meta = getReferralMeta();
    expect(meta.referral).toBe("first_ref");
    expect(meta.landing).toBe("/calculator");
    expect(meta.setAt).toBeTruthy();
  });

  it("ignores invalid referrals", () => {
    const result = setReferral("!!", "/calculator");
    expect(result).toBeNull();
    expect(getReferral()).toBeNull();
  });

  it("appends ref to urls and preserves existing query params", () => {
    expect(appendRefToUrl("/plan", "abc123")).toBe("/plan?ref=abc123");
    expect(appendRefToUrl("/calculator?foo=bar", "abc123")).toBe("/calculator?foo=bar&ref=abc123");
    expect(appendRefToUrl("/calculator?ref=keep", "abc123")).toBe("/calculator?ref=keep");
  });
});
