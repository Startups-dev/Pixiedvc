'use server';

import { headers } from 'next/headers';

import { createServiceClient } from '@/lib/supabase-service-client';
import { logContractEvent } from '@/server/contracts';

export async function acceptContractAction(formData: FormData) {
  const token = formData.get('token');
  if (!token || typeof token !== 'string') {
    return { error: 'Missing token' };
  }

  const supabase = createServiceClient();

  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .or(`owner_accept_token.eq.${token},guest_accept_token.eq.${token}`)
    .maybeSingle();

  if (!contract) {
    throw new Error('Contract not found');
  }

  const role = contract.owner_accept_token === token ? 'owner' : contract.guest_accept_token === token ? 'guest' : null;
  if (!role) {
    throw new Error('Invalid token');
  }

  const column = role === 'owner' ? 'owner_accepted_at' : 'guest_accepted_at';
  if (contract[column]) {
    return { alreadyAccepted: true };
  }

  const updates: Record<string, unknown> = { [column]: new Date().toISOString() };
  if (contract.owner_accepted_at && contract.guest_accepted_at) {
    updates.status = 'accepted';
  }

  await supabase.from('contracts').update(updates).eq('id', contract.id);

  const meta = buildAuditMetadata(headers());

  await logContractEvent({
    contractId: contract.id,
    eventType: 'accepted',
    metadata: { role, ...meta },
  });

  return { success: true };
}

export async function declineContractAction(formData: FormData) {
  const token = formData.get('token');
  if (!token || typeof token !== 'string') {
    return { error: 'Missing token' };
  }

  const supabase = createServiceClient();
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .or(`owner_accept_token.eq.${token},guest_accept_token.eq.${token}`)
    .maybeSingle();

  if (!contract) {
    throw new Error('Contract not found');
  }

  const role = contract.owner_accept_token === token ? 'owner' : contract.guest_accept_token === token ? 'guest' : null;
  if (!role) {
    throw new Error('Invalid token');
  }

  await supabase
    .from('contracts')
    .update({ status: 'rejected' })
    .eq('id', contract.id);

  const meta = buildAuditMetadata(headers());
  await logContractEvent({
    contractId: contract.id,
    eventType: 'rejected',
    metadata: { role, ...meta },
  });

  return { success: true };
}

function buildAuditMetadata(hdrs: Headers) {
  const forwarded = hdrs.get('x-forwarded-for') ?? hdrs.get('cf-connecting-ip');
  const userAgent = hdrs.get('user-agent');
  return {
    ip: forwarded ?? 'unknown',
    userAgent: userAgent ?? 'unknown',
  };
}
