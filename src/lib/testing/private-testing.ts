import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type PrivateTestFlow = "guest" | "owner";

export type PrivateTestInvite = {
  id: string;
  token: string;
  flow_type: PrivateTestFlow;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  campaign_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type PrivateTestSession = {
  id: string;
  invite_id: string;
  user_id: string;
  flow_type: PrivateTestFlow;
  status: "started" | "in_progress" | "completed" | string;
  flow_completion_status: "started" | "intake_complete" | "completed" | string | null;
  confidentiality_accepted: boolean;
  consent_accepted: boolean;
  intake_answers: Record<string, unknown>;
  completed_at: string | null;
};

type FlowCompletionStatus = PrivateTestSession["flow_completion_status"];

export const PRIVATE_TEST_FLOW_CONTENT: Record<
  PrivateTestFlow,
  {
    title: string;
    intro: string;
    platformHref: string;
    tasks: string[];
  }
> = {
  guest: {
    title: "Guest Flow",
    intro:
      "Use your private test link to evaluate the guest booking journey from discovery to request confidence.",
    platformHref: "/",
    tasks: [
      "Find a resort and identify the difference between request matching and Ready Stays.",
      "Create or sign in to your account and evaluate how smooth the process feels.",
      "Try building a stay estimate and reviewing next-step clarity before submitting.",
      "Review trust, pricing clarity, and whether you would continue with this flow.",
    ],
  },
  owner: {
    title: "Owner Flow",
    intro:
      "Use your private test link to evaluate owner onboarding, listing confidence, and payout clarity.",
    platformHref: "/owner/onboarding",
    tasks: [
      "Create or sign in to your account using the standard owner flow.",
      "Review onboarding expectations and note any confusion in verification or listing setup.",
      "Evaluate confidence in pricing, payout timing, and control over your listing process.",
      "Assess whether the owner dashboard and next steps feel trustworthy and complete.",
    ],
  },
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeToken(token: string) {
  return token.trim().toLowerCase();
}

async function getServerOrAdminClient() {
  const adminClient = getSupabaseAdminClient();
  if (adminClient) return adminClient;
  return createSupabaseServerClient();
}

export async function getPrivateTestInviteByToken(rawToken: string): Promise<PrivateTestInvite | null> {
  const token = normalizeToken(rawToken);
  if (!token) return null;

  const client = await getServerOrAdminClient();
  const { data, error } = await client
    .from("private_test_invites")
    .select("id, token, flow_type, label, is_active, expires_at, max_uses, campaign_id, metadata")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as PrivateTestInvite;
}

export function isInviteUsable(invite: PrivateTestInvite | null) {
  if (!invite) return false;
  if (!invite.is_active) return false;
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) return false;
  return true;
}

export async function getPrivateTestSession(
  inviteId: string,
  userId: string,
): Promise<PrivateTestSession | null> {
  const client = await getServerOrAdminClient();
  const { data, error } = await client
    .from("private_test_sessions")
    .select(
      "id, invite_id, user_id, flow_type, status, flow_completion_status, confidentiality_accepted, consent_accepted, intake_answers, completed_at",
    )
    .eq("invite_id", inviteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PrivateTestSession;
}

export async function ensurePrivateTestSession(
  invite: PrivateTestInvite,
  userId: string,
): Promise<PrivateTestSession | null> {
  const existing = await getPrivateTestSession(invite.id, userId);
  if (existing) {
    const client = await getServerOrAdminClient();
    const patch: Record<string, unknown> = { last_returned_at: nowIso() };
    if (!existing.status) patch.status = "started";
    if (!existing.flow_completion_status) patch.flow_completion_status = "started";

    const { data } = await client
      .from("private_test_sessions")
      .update(patch)
      .eq("id", existing.id)
      .select(
        "id, invite_id, user_id, flow_type, status, flow_completion_status, confidentiality_accepted, consent_accepted, intake_answers, completed_at",
      )
      .single();

    return ((data as PrivateTestSession | null) ?? existing) as PrivateTestSession;
  }

  const client = await getServerOrAdminClient();
  const { data, error } = await client
    .from("private_test_sessions")
    .insert({
      invite_id: invite.id,
      user_id: userId,
      flow_type: invite.flow_type,
      status: "started",
      flow_completion_status: "started",
      last_returned_at: nowIso(),
    })
    .select(
      "id, invite_id, user_id, flow_type, status, flow_completion_status, confidentiality_accepted, consent_accepted, intake_answers, completed_at",
    )
    .single();

  if (error || !data) return null;
  return data as PrivateTestSession;
}

export async function savePrivateTestIntake(input: {
  invite: PrivateTestInvite;
  userId: string;
  confidentialityAccepted: boolean;
  consentAccepted: boolean;
  answers: Record<string, unknown>;
}) {
  const session = await ensurePrivateTestSession(input.invite, input.userId);
  if (!session) return null;

  const client = await getServerOrAdminClient();
  const acceptedAt = nowIso();
  const { data, error } = await client
    .from("private_test_sessions")
    .update({
      confidentiality_accepted: input.confidentialityAccepted,
      confidentiality_accepted_at: input.confidentialityAccepted ? acceptedAt : null,
      consent_accepted: input.consentAccepted,
      consent_accepted_at: input.consentAccepted ? acceptedAt : null,
      intake_answers: input.answers,
      status: input.confidentialityAccepted && input.consentAccepted ? "in_progress" : "started",
      flow_completion_status: input.confidentialityAccepted && input.consentAccepted ? "intake_complete" : "started",
      last_returned_at: acceptedAt,
    })
    .eq("id", session.id)
    .select(
      "id, invite_id, user_id, flow_type, status, flow_completion_status, confidentiality_accepted, consent_accepted, intake_answers, completed_at",
    )
    .single();

  if (error || !data) return null;

  await client.from("private_test_events").insert({
    session_id: session.id,
    event_type: "intake_saved",
    payload: {
      confidentiality_accepted: input.confidentialityAccepted,
      consent_accepted: input.consentAccepted,
    },
  });

  return data as PrivateTestSession;
}

export async function getPrivateTestSurveyBySession(sessionId: string) {
  const client = await getServerOrAdminClient();
  const { data, error } = await client
    .from("private_test_survey_responses")
    .select("id, session_id, response_answers, submitted_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !data) return null;
  return data as {
    id: string;
    session_id: string;
    response_answers: Record<string, unknown>;
    submitted_at: string;
  };
}

export async function savePrivateTestSurvey(input: {
  sessionId: string;
  surveyAnswers: Record<string, unknown>;
  wouldUse?: "yes" | "no" | "maybe" | null;
  wouldList?: "yes" | "no" | "maybe" | null;
  trustScore?: number | null;
}) {
  const client = await getServerOrAdminClient();
  const submittedAt = nowIso();
  const { data, error } = await client
    .from("private_test_survey_responses")
    .upsert(
      {
        session_id: input.sessionId,
        response_answers: input.surveyAnswers,
        submitted_at: submittedAt,
      },
      { onConflict: "session_id" },
    )
    .select("id, session_id, response_answers, submitted_at")
    .single();

  if (error || !data) return null;

  await client
    .from("private_test_sessions")
    .update({
      status: "completed",
      flow_completion_status: "completed",
      completed_at: submittedAt,
      would_use: input.wouldUse ?? null,
      would_list: input.wouldList ?? null,
      trust_score: input.trustScore ?? null,
    })
    .eq("id", input.sessionId);

  await client.from("private_test_events").insert({
    session_id: input.sessionId,
    event_type: "survey_submitted",
    payload: { submitted_at: submittedAt },
  });

  return data as {
    id: string;
    session_id: string;
    response_answers: Record<string, unknown>;
    submitted_at: string;
  };
}

export async function updatePrivateTestSessionProgress(input: {
  sessionId: string;
  flowCompletionStatus: FlowCompletionStatus;
  eventType?: string;
  eventPayload?: Record<string, unknown>;
}) {
  const client = await getServerOrAdminClient();

  await client
    .from("private_test_sessions")
    .update({
      flow_completion_status: input.flowCompletionStatus,
      last_returned_at: nowIso(),
    })
    .eq("id", input.sessionId);

  if (input.eventType) {
    await client.from("private_test_events").insert({
      session_id: input.sessionId,
      event_type: input.eventType,
      payload: input.eventPayload ?? {},
    });
  }
}
