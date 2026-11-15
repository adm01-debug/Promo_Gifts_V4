import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const wf = readFileSync(join(import.meta.dirname, '..', '..', '.github/workflows/nightly-full.yml'), 'utf8');
const audit = wf.slice(wf.indexOf('  audit-report:'));

describe('nightly-full.yml → relatório de auditoria com veredito real', () => {
  it('quality-gate expõe o outcome de Typecheck e Lint como outputs', () => {
    expect(wf).toMatch(/outputs:\s*\n\s*typecheck: \$\{\{ steps\.typecheck\.outcome \}\}\s*\n\s*lint: \$\{\{ steps\.lint\.outcome \}\}/);
    expect(wf).toMatch(/- name: Typecheck\s*\n\s*id: typecheck/);
    expect(wf).toMatch(/- name: Lint\s*\n\s*id: lint/);
  });

  it('audit-report roda mesmo com gate falho e repassa AUDIT_TYPECHECK/LINT/E2E', () => {
    expect(audit).toMatch(/if: \$\{\{ !cancelled\(\) \}\}/);
    for (const v of ['AUDIT_TYPECHECK', 'AUDIT_LINT', 'AUDIT_E2E']) expect(audit).toContain(`${v}:`);
    expect(audit).toContain("needs.e2e-tests.result == 'success' && 'passed'");
  });

  it('segurança não é afirmada: não há AUDIT_SECURITY sem etapa que a execute', () => {
    expect(audit).not.toContain('AUDIT_SECURITY');
  });
});
