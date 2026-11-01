import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readWorkflow = (name) => yaml.load(readFileSync(resolve(ROOT, '.github/workflows', name), 'utf8'));

function findStep(workflow, predicate) {
  return Object.values(workflow.jobs)
    .flatMap((job) => job.steps ?? [])
    .find(predicate);
}

function runGateFinal({ eventName, isFork, e2eResult, docsOnly = false }) {
  const workflow = readWorkflow('deploy-gates.yml');
  const step = workflow.jobs['deploy-ready'].steps.find((candidate) =>
    candidate.name.startsWith('Require every blocking gate to pass'),
  );
  const result = spawnSync('bash', ['-e', '-u', '-o', 'pipefail', '-c', step.run], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: eventName,
      IS_DEPENDABOT: 'false',
      IS_FORK: String(isFork),
      DOCS_ONLY: String(docsOnly),
      R_SSOT: 'success',
      R_DEP_AUDIT: 'success',
      R_DEP_REVIEW: eventName === 'pull_request' && isFork ? 'skipped' : 'success',
      R_LINT: 'success',
      R_UNIT: 'success',
      R_DB_INT: eventName === 'pull_request' && isFork ? 'skipped' : 'success',
      R_E2E: e2eResult,
      R_SEO: 'success',
      R_RESTORE: eventName === 'pull_request' && isFork ? 'skipped' : 'success',
      R_BUILD: 'success',
      R_SECRET_SCAN: 'success',
      R_SCHEMA_DRIFT: 'success',
    },
  });
  return result;
}

describe('Deploy Gates E007/E008 — credenciais e auditoria live', () => {
  it('exige auditoria live em execução confiável e reserva static-pass a forks', () => {
    const workflow = readWorkflow('deploy-gates.yml');
    const live = findStep(workflow, (step) => step.name?.startsWith('Gate 1.13 — Policies baseline vs'));
    const forkStatic = findStep(workflow, (step) => step.name?.includes('estático em PR de fork'));

    expect(live.run).toContain('check-policies-baseline.mjs --require-live');
    expect(live.if).toContain('github.event.pull_request.head.repo.full_name == github.repository');
    expect(live.env.SUPABASE_ACCESS_TOKEN).toContain('secrets.SUPABASE_ACCESS_TOKEN');
    expect(forkStatic.if).toContain('github.event.pull_request.head.repo.full_name != github.repository');
    expect(forkStatic.run).toBe('node scripts/check-policies-baseline.mjs');
    expect(forkStatic.env).not.toHaveProperty('SUPABASE_ACCESS_TOKEN');
  });

  it('permite pular E2E em fork sem secrets, mas falha em PR confiável sem E2E', () => {
    const trustedPr = runGateFinal({ eventName: 'pull_request', isFork: false, e2eResult: 'skipped' });
    expect(trustedPr.status).toBe(1);
    expect(trustedPr.stderr).toContain('execução confiável');

    const forkPr = runGateFinal({ eventName: 'pull_request', isFork: true, e2eResult: 'skipped' });
    expect(forkPr.status).toBe(0);
    expect(forkPr.stdout).toContain('PR de fork sem secrets E2E');
  });

  it('mantém o E23 fora da agregação bloqueante do Gate Final', () => {
    const workflow = readWorkflow('deploy-gates.yml');
    const deployReady = workflow.jobs['deploy-ready'];
    const aggregate = deployReady.steps.find((candidate) =>
      candidate.name.startsWith('Require every blocking gate to pass'),
    );

    expect(deployReady.needs).not.toContain('secrets-check');
    expect(aggregate.env).not.toHaveProperty('R_SECRETS');
    expect(aggregate.run).not.toMatch(/R_SECRETS\s*==\s*["']success/);
  });

  it('não permite que push pule o E2E nem por falta dos secrets', () => {
    const push = runGateFinal({ eventName: 'push', isFork: false, e2eResult: 'skipped' });
    expect(push.status).toBe(1);
    expect(push.stderr).toContain('execução confiável');
  });

  it('executa as verificações live do Supabase em PRs do mesmo repositório', () => {
    const workflow = readWorkflow('supabase-security-gate.yml');
    const requiredChecks = [
      '🩺 RPC get_profile_and_roles smoke test',
      '🚫 Verify anon cannot execute RPC',
      '🔒 Audit SECURITY DEFINER functions',
      '🔓 Verify anon has no write GRANTs (E22)',
    ];

    for (const name of requiredChecks) {
      const step = findStep(workflow, (candidate) => candidate.name === name);
      expect(step, `${name} existe`).toBeDefined();
      expect(step.if).toContain('github.event.pull_request.head.repo.full_name == github.repository');
      expect(step.run).toContain('--require-live');
    }
  });
});
