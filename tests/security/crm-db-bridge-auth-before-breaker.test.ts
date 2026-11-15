import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
  'utf-8',
);

describe('crm-db-bridge — ordem entre autenticação e circuit breaker', () => {
  it('autentica antes de rejeitar por indisponibilidade do CRM', () => {
    const authIndex = source.indexOf('const auth = await authenticateRequest(req);');
    const authRejectionIndex = source.indexOf('if (auth.error) return auth.error;', authIndex);
    const breakerIndex = source.indexOf('if (!breaker.canRequest())');

    expect(authIndex).toBeGreaterThan(-1);
    expect(authRejectionIndex).toBeGreaterThan(authIndex);
    expect(breakerIndex).toBeGreaterThan(authRejectionIndex);
  });
});
