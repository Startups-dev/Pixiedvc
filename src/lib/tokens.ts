import crypto from 'crypto';

export function generateAcceptToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
