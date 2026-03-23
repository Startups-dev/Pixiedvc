function envFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export const READY_STAYS_SHOWCASE_FLAGS = {
  enableHomeReadyStays: envFlag("READY_STAYS_SHOWCASE_HOME", true),
  enableResortReadyStays: envFlag("READY_STAYS_SHOWCASE_RESORT", true),
  enableSearchReadyStays: envFlag("READY_STAYS_SHOWCASE_SEARCH", true),
  enableReadyStaysLiveData: envFlag("READY_STAYS_LIVE_DATA", false),
  enableReadyStaysAdmin: envFlag("READY_STAYS_ADMIN", false),
} as const;
