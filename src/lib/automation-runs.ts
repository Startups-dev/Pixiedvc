import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type AutomationRunStatus = 'running' | 'completed' | 'completed_with_errors' | 'failed';

type JsonPrimitive = string | number | boolean | null;
export type AutomationRunMetadata = JsonPrimitive | JsonPrimitive[] | { [key: string]: AutomationRunMetadata };

type StartParams = {
  client: AdminClient;
  automationKey: string;
  startedAt?: Date;
  metadata?: Record<string, AutomationRunMetadata>;
};

type CompleteParams = {
  client: AdminClient;
  runId: string | null;
  automationKey: string;
  startedAt: Date;
  completedAt?: Date;
  ok: boolean;
  candidates: number;
  sent: number;
  skipped: number;
  errors: number;
  lastError?: string | null;
  metadata?: Record<string, AutomationRunMetadata>;
};

function sanitizeCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function deriveCompletionStatus(params: Pick<CompleteParams, 'ok' | 'sent' | 'skipped' | 'errors'>): AutomationRunStatus {
  if (!params.ok && params.errors > 0 && params.sent === 0 && params.skipped === 0) {
    return 'failed';
  }
  if (params.errors > 0) {
    return 'completed_with_errors';
  }
  return 'completed';
}

export async function startAutomationRun(params: StartParams) {
  const startedAt = params.startedAt ?? new Date();

  try {
    const { data, error } = await params.client
      .from('automation_runs')
      .insert({
        automation_key: params.automationKey,
        status: 'running',
        started_at: startedAt.toISOString(),
        metadata: params.metadata ?? {},
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[automation_runs] failed to start ${params.automationKey}`, error.message);
      return null;
    }

    return {
      id: data.id as string,
      startedAt,
    };
  } catch (error) {
    console.error(`[automation_runs] failed to start ${params.automationKey}`, error);
    return null;
  }
}

export async function completeAutomationRun(params: CompleteParams) {
  if (!params.runId) return;

  const completedAt = params.completedAt ?? new Date();
  const durationMs = Math.max(0, completedAt.getTime() - params.startedAt.getTime());
  const status = deriveCompletionStatus(params);

  try {
    const { error } = await params.client
      .from('automation_runs')
      .update({
        status,
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        candidates: sanitizeCount(params.candidates),
        sent: sanitizeCount(params.sent),
        skipped: sanitizeCount(params.skipped),
        errors: sanitizeCount(params.errors),
        last_error: params.lastError ?? null,
        metadata: params.metadata ?? {},
      })
      .eq('id', params.runId);

    if (error) {
      console.error(`[automation_runs] failed to complete ${params.automationKey}`, error.message);
    }
  } catch (error) {
    console.error(`[automation_runs] failed to complete ${params.automationKey}`, error);
  }
}

