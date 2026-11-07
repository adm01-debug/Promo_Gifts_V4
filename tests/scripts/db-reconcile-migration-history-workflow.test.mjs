import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PATH = resolve(ROOT, '.github/workflows/db-reconcile-migration-history.yml');
const workflow = YAML.parse(readFileSync(PATH, 'utf8'));

describe('workflow de reconciliação do histórico', () => {
  it('usa projeto canônico, serializa execuções e exige environment production', () => {
    expect(workflow.env.SUPABASE_PROJECT_REF).toBe('doufsxqlfjyuvxuezpln');
    expect(workflow.concurrency['cancel-in-progress']).toBe(false);
    expect(workflow.jobs.reconcile.environment).toBe('production');
  });

  it('não executa SQL nem reaplica migration', () => {
    const source = readFileSync(PATH, 'utf8');
    expect(source).toContain('migration repair --status reverted');
    expect(source).not.toMatch(/\bpsql\b/);
    expect(source).not.toContain('migration repair --status applied');
    expect(source).not.toContain('supabase db push');
  });

  it('valida manifest antes e ausência no ledger depois', () => {
    const preflight = workflow.jobs.preflight.steps.find(
      (step) => step.name === 'Confirma versão presente e coberta pelo manifest',
    );
    const post = workflow.jobs['post-check'].steps.find(
      (step) => step.name === 'Confirma versão ausente após repair reverted',
    );
    expect(preflight.run).toContain('--require-live');
    expect(preflight.run).not.toContain('--expect-reverted');
    expect(post.run).toContain('--require-live --expect-reverted');
  });

  it('fixa actions por SHA, desliga persist-credentials e gera recibo fiel', () => {
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        if (step.uses?.startsWith('actions/')) expect(step.uses).toMatch(/@[0-9a-f]{40}$/);
        if (step.uses?.startsWith('actions/checkout')) {
          expect(step.with['persist-credentials']).toBe(false);
          expect(step.with.ref).toBe('main');
        }
      }
    }
    const receipt = workflow.jobs.receipt.steps.find(
      (step) => step.name === 'Monta recibo sem afirmar execução de DDL',
    );
    expect(receipt.run).toContain('--metodo="repair-reverted"');
    expect(receipt.run).toContain('--status="histórico-reconciliado"');
    expect(receipt.run).toContain('nenhum DDL executado');
  });
});
