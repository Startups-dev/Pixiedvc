export const OWNER_LIFECYCLE_STATUSES = ["active", "suspended", "deactivated"] as const;

export type OwnerLifecycleStatus = (typeof OWNER_LIFECYCLE_STATUSES)[number];

export type OwnerLifecycleRow = {
  lifecycle_status?: string | null;
};

export function normalizeOwnerLifecycleStatus(status: string | null | undefined): OwnerLifecycleStatus {
  if (status === "suspended" || status === "deactivated") return status;
  return "active";
}

export function isOwnerLifecycleActive(owner: OwnerLifecycleRow | null | undefined) {
  return normalizeOwnerLifecycleStatus(owner?.lifecycle_status) === "active";
}

export function isOwnerLifecycleInactive(owner: OwnerLifecycleRow | null | undefined) {
  return !isOwnerLifecycleActive(owner);
}

export function ownerLifecycleInactiveMessage(action = "new inventory") {
  return `Owner account is not active for ${action}.`;
}
