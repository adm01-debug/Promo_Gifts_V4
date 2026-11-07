import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasE2ERuntimeChanges, isE2ERuntimeFile } from '../../.github/scripts/e2e-relevance.mjs';

const script = resolve(process.cwd(), '.github/scripts/e2e-relevance.mjs');

const callers = [
  '.github/workflows/delivery-quality.yml',
  '.github/workflows/deploy-gates.yml',
  '.github/workflows/e2e-flows.yml',
  '.github/workflows/e2e-focused.yml',
  '.github/workflows/e2e-personalization.yml',
  '.github/workflows/e2e-swatch-quickview.yml',
  '.github/workflows/e2e.yml',
  '.github/workflows/replenishment-quality.yml',
  '.github/workflows/visual-tests.yml',
];

const sharedInputs = [
  '.github/scripts/e2e-relevance.mjs',
  '.github/workflows/_e2e-relevance.yml',
  '.github/workflows/_secrets-check.yml',
  '.github/actions/e2e-setup/action.yml',
  '.github/actions/check-min-tests/action.yml',
  '.github/actions/setup-node-ci/action.yml',
  'scripts/check-playwright-min-executed.mjs',
  'scripts/run-smoke-filtered.mjs',
  'scripts/check-smoke-tags.mjs',
  'scripts/e2e-smoke-coverage-doc.mjs',
  'scripts/e2e-mock-auth-setup.mjs',
];

const filteredCallers = callers.filter((file) => !file.endsWith('/deploy-gates.yml'));
const sharedTriggerPaths = [
  '.github/workflows/_e2e-relevance.yml',
  '.github/workflows/_secrets-check.yml',
  '.github/actions/e2e-setup/**',
  '.github/actions/check-min-tests/**',
  '.github/actions/setup-node-ci/**',
  'scripts/check-playwright-min-executed.mjs',
  'scripts/run-smoke-filtered.mjs',
  'scripts/check-smoke-tags.mjs',
  'scripts/e2e-smoke-coverage-doc.mjs',
  'scripts/e2e-mock-auth-setup.mjs',
];

describe('e2e-relevance', () => {
  it('classifica runtime e exclui testes unitários de src', () => {
    expect(isE2ERuntimeFile('src/pages/Catalog.tsx')).toBe(true);
    expect(isE2ERuntimeFile('src/pages/__tests__/SSOCallbackPage.test.tsx')).toBe(false);
    expect(isE2ERuntimeFile('src/pages/__tests__/QuoteBuilderDeliveryTooltip.test.tsx')).toBe(true);
  });

  it.each([
    'supabase/functions/health-check/index.ts',
    'supabase/migrations/20261107_example.sql',
    'supabase/tests/database/rls.test.sql',
    'supabase/config.toml',
    'supabase/seed.sql',
    'vercel.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
  ])('classifica backend e configuração compartilhada como runtime: %s', (file) => {
    expect(isE2ERuntimeFile(file)).toBe(true);
  });

  it.each([...callers, ...sharedInputs])('trata infraestrutura E2E como relevante: %s', (file) => {
    expect(isE2ERuntimeFile(file)).toBe(true);
  });

  it('mantém documentação e workflows alheios fora do runtime', () => {
    expect(isE2ERuntimeFile('docs/CI.md')).toBe(false);
    expect(isE2ERuntimeFile('.github/workflows/release.yml')).toBe(false);
  });

  it('decide listas vazias, unit-only e mistas sem falso verde', () => {
    expect(hasE2ERuntimeChanges([])).toBe(false);
    expect(hasE2ERuntimeChanges(['src/pages/__tests__/SSOCallbackPage.test.tsx'])).toBe(false);
    expect(
      hasE2ERuntimeChanges([
        'src/pages/__tests__/SSOCallbackPage.test.tsx',
        '.github/workflows/e2e.yml',
      ]),
    ).toBe(true);
  });

  it('CLI publica relevant=true para mudança workflow-only', () => {
    const result = spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        CHANGED_FILES: JSON.stringify(['.github/workflows/e2e.yml']),
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('relevant=true\n');
  });

  it('CLI falha fechado quando CHANGED_FILES não é JSON válido', () => {
    const result = spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      env: { ...process.env, CHANGED_FILES: 'not-json' },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('SyntaxError');
  });

  it.each(filteredCallers)('caller filtrado dispara ao mudar infraestrutura: %s', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    const expectedOccurrences = file.endsWith('/e2e-focused.yml') ? 1 : 2;

    for (const triggerPath of sharedTriggerPaths) {
      const occurrences = source.split(`- '${triggerPath}'`).length - 1;
      expect(occurrences, `${file} não cobre ${triggerPath}`).toBeGreaterThanOrEqual(
        expectedOccurrences,
      );
    }
  });
});
