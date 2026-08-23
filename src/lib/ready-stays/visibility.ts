export type ReadyStayVisibilityRow = {
  status?: string | null;
  is_test_listing?: boolean | null;
  is_visible_publicly?: boolean | null;
  slug?: string | null;
  title?: string | null;
  image_url?: string | null;
  check_out?: string | null;
  expires_at?: string | null;
  locked_until?: string | null;
  verification_status?: string | null;
  owner?: {
    lifecycle_status?: string | null;
    owners?: Array<{ lifecycle_status?: string | null }> | { lifecycle_status?: string | null } | null;
  } | null;
};

function getReadyStayOwnerLifecycleStatus(row: ReadyStayVisibilityRow) {
  if (row.owner?.lifecycle_status) return row.owner.lifecycle_status;
  const nestedOwners = row.owner?.owners;
  if (Array.isArray(nestedOwners)) return nestedOwners[0]?.lifecycle_status ?? 'active';
  return nestedOwners?.lifecycle_status ?? 'active';
}

export function isPublicReadyStayRow(row: ReadyStayVisibilityRow, nowMs = Date.now(), today = new Date().toISOString().slice(0, 10)) {
  const status = row.status ?? null;
  const isPublicStatus =
    status === 'active' ||
    (status === 'test' && Boolean(row.is_visible_publicly));

  if (!isPublicStatus) return false;
  if (!String(row.slug ?? '').trim()) return false;
  if (!String(row.title ?? '').trim()) return false;
  if (!String(row.image_url ?? '').trim()) return false;
  if (!row.check_out || row.check_out < today) return false;

  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= nowMs) {
      return false;
    }
  }

  if (row.locked_until) {
    const lockedUntil = new Date(row.locked_until);
    if (!Number.isNaN(lockedUntil.getTime()) && lockedUntil.getTime() >= nowMs) {
      return false;
    }
  }

  if (row.verification_status === 'proof_uploaded' || row.verification_status === 'rejected') {
    return false;
  }

  const ownerLifecycleStatus = getReadyStayOwnerLifecycleStatus(row);
  if (ownerLifecycleStatus !== 'active') {
    return false;
  }

  return true;
}

export function isAdminOrPublicReadyStayRow(row: ReadyStayVisibilityRow, isAdmin: boolean, nowMs = Date.now(), today = new Date().toISOString().slice(0, 10)) {
  if (isAdmin) {
    const status = row.status ?? null;
    if (status !== 'active' && status !== 'test') return false;
    if (!row.check_out || row.check_out < today) return false;
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= nowMs) {
        return false;
      }
    }
    return true;
  }

  return isPublicReadyStayRow(row, nowMs, today);
}
