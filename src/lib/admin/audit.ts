import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminAuditEventInput = {
  adminUserId?: string | null;
  adminEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown | null;
  after?: unknown | null;
  meta?: Record<string, unknown> | null;
};

export async function logAdminAuditEvent(
  client: SupabaseClient,
  input: AdminAuditEventInput,
) {
  const payload = {
    admin_user_id: input.adminUserId ?? null,
    admin_email: input.adminEmail ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    meta: input.meta ?? {},
  };

  return client.from('admin_audit_events').insert(payload);
}
