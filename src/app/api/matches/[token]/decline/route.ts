import { NextRequest } from 'next/server';

import { processMatchDecision } from '@/lib/match-decisions';
import { renderMatchResponse } from '../response';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return renderMatchResponse({ title: 'Missing token', message: 'The link is incomplete. Please contact concierge.', status: 400 });
  }

  const result = await processMatchDecision(token, 'declined');
  const title = result.ok ? 'Thanks for letting us know' : 'Unable to update match';
  return renderMatchResponse({ title, message: result.message, status: result.status });
}
