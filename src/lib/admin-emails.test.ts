import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it("uses the server list in preference to the public fallback", async () => {
  vi.stubEnv("ADMIN_EMAILS", " Admin@Example.Test , second@example.test ");
  vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "fallback@example.test");
  vi.resetModules();
  expect((await import("./admin-emails")).adminEmails()).toEqual(["admin@example.test", "second@example.test"]);
});

it("uses the public fallback only when the server list is unset", async () => {
  vi.stubEnv("ADMIN_EMAILS", undefined);
  vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "Fallback@Example.Test");
  vi.resetModules();
  expect((await import("./admin-emails")).adminEmails()).toEqual(["fallback@example.test"]);
});

it("an explicitly empty server list disables recipients and never guesses a fallback", async () => {
  vi.stubEnv("ADMIN_EMAILS", "");
  vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "fallback@example.test");
  vi.resetModules();
  expect((await import("./admin-emails")).adminEmails()).toEqual([]);
});
