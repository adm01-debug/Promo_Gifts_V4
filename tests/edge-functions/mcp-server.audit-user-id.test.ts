import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

// admin_audit_log.user_id é NOT NULL (produção: ERROR 23502 no caminho de chave ausente).
// Todo insert do mcp-server precisa cair no SENTINEL_USER_ID quando não há usuário.
const source = fs.readFileSync(
  path.resolve(__dirname, '../../supabase/functions/mcp-server/index.ts'),
  'utf-8',
);

const userIdValues = [
  ...source.matchAll(/\.from\("admin_audit_log"\)\.insert\(\{\s*user_id:\s*([^,\n]+),/g),
].map((m) => m[1].trim());

describe('mcp-server — user_id nunca nulo em admin_audit_log', () => {
  it('encontra os inserts de auditoria', () => {
    expect(userIdValues.length).toBeGreaterThanOrEqual(4);
  });

  it('cada insert usa SENTINEL_USER_ID como fallback', () => {
    for (const value of userIdValues) {
      expect(value).not.toBe('null');
      expect(value).toMatch(/SENTINEL_USER_ID$/);
    }
  });
});
