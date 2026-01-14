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
    actor_user_id: input.adminUserId ?? null,
    actor_email: input.adminEmail ?? 'unknown',
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    meta: input.meta ?? {},
  };

  return client.from('admin_audit_events').insert(payload);
}

export async function logAdminEvent(options: {
  client: SupabaseClient;
  actorEmail: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
  req?: Request | null;
}) {
  const { client, actorEmail, actorUserId, action, entityType, entityId, meta, req } = options;
  const headers = req?.headers;
  const payload = {
    actor_email: actorEmail ?? 'unknown',
    actor_user_id: actorUserId ?? null,
    admin_email: actorEmail ?? null,
    admin_user_id: actorUserId ?? null,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    ip: headers?.get('x-forwarded-for') ?? null,
    user_agent: headers?.get('user-agent') ?? null,
    request_id: headers?.get('x-request-id') ?? null,
    meta: meta ?? {},
  };

  try {
    await client.from('admin_audit_events').insert(payload);
  } catch (error) {
    console.error('Failed to write admin audit event', error);
  }
}
