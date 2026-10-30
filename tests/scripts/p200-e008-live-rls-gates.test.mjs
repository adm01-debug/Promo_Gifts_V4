import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function stepsFor(path, job) {
  const workflow = yaml.load(readFileSync(resolve(ROOT, path), 'utf8'));
  return workflow.jobs[job].steps;
}

const INTERNAL_REPO_OR_PUSH =
  "github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository";

describe('P200 E008 — gates RLS exigem evidência live', () => {
  it('Gate 1.13 exige consulta live em push e PR interno e pula forks explicitamente', () => {
    const step = stepsFor('.github/workflows/deploy-gates.yml', 'lint-typecheck')
      .find(({ name }) => name?.startsWith('Gate 1.13 — Policies baseline'));

    expect(step).toBeDefined();
    expect(step.run).toBe('node scripts/check-policies-baseline.mjs --require-live');
    expect(step.if).toContain(INTERNAL_REPO_OR_PUSH);
  });

  it('Gate 5 só usa credenciais nos checks live em push ou PR interno', () => {
    const steps = stepsFor('.github/workflows/supabase-security-gate.yml', 'supabase-security-gate');
    const names = [
      '🩺 RPC get_profile_and_roles smoke test',
      '🚫 Verify anon cannot execute RPC',
    ];

    for (const name of names) {
      const step = steps.find((candidate) => candidate.name === name);
      expect(step, `step encontrado: ${name}`).toBeDefined();
      expect(step.run).toContain('--require-live');
      expect(step.if).toContain(INTERNAL_REPO_OR_PUSH);
    }
  });

  it('o script não aprova estaticamente quando --require-live está sem credenciais', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    delete env.VITE_SUPABASE_URL;
    delete env.SUPABASE_SERVICE_ROLE_KEY;

    const result = spawnSync(
      'node',
      ['scripts/check-policies-baseline.mjs', '--require-live'],
      { cwd: ROOT, env, encoding: 'utf8' },
    );

    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });
});
