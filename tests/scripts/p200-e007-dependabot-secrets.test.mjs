import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('P200 E007 — segredos E2E indisponíveis para Dependabot', () => {
  it('não exige credenciais de Actions em PRs de fork ou Dependabot', () => {
    const workflow = yaml.load(readFileSync(resolve(ROOT, '.github/workflows/deploy-gates.yml'), 'utf8'));
    const gate = workflow.jobs['secrets-check'];

    expect(gate.uses).toBe('./.github/workflows/_secrets-check.yml');
    expect(gate.secrets).toBe('inherit');
    expect(gate.with.fail_if_missing).toBe(
      "${{ github.event_name != 'pull_request' || (github.event.pull_request.head.repo.full_name == github.repository && github.actor != 'dependabot[bot]') }}",
    );
  });

  it('a política permite o gate estrito em push e PR interno de usuário comum', () => {
    const workflow = yaml.load(readFileSync(resolve(ROOT, '.github/workflows/deploy-gates.yml'), 'utf8'));
    const expression = workflow.jobs['secrets-check'].with.fail_if_missing;

    expect(expression).toContain("github.event_name != 'pull_request'");
    expect(expression).toContain('github.event.pull_request.head.repo.full_name == github.repository');
    expect(expression).toContain("github.actor != 'dependabot[bot]'");
  });
});
