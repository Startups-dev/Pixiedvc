const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export function adminListIsEmpty() {
  return ADMIN_EMAILS.length === 0;
}

export function isAdminEmailStrict(email?: string | null) {
  if (!email) {
    return false;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function emailIsAllowedForAdmin(email?: string | null) {
  if (!email) {
    return false;
  }
  if (adminListIsEmpty()) {
    // Admin visibility/access must be explicit via role or configured admin emails.
    return false;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function adminEmails() {
  return ADMIN_EMAILS;
}
