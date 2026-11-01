import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WORKFLOW_PATH = resolve(ROOT, '.github/workflows/db-apply-migration.yml');
const RECEIPT_SCRIPT = resolve(ROOT, 'scripts/append-migration-receipt.mjs');
const temporaryRoots = [];

afterEach(() => {
  for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

function temporaryRoot(prefix) {
  const path = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(path);
  return path;
}

function workflowStep(jobName, stepName) {
  const workflow = yaml.load(readFileSync(WORKFLOW_PATH, 'utf8'));
  const step = workflow.jobs[jobName].steps.find((candidate) => candidate.name === stepName);
  expect(step, `step ${stepName} existe em ${jobName}`).toBeDefined();
  return step;
}

function runBash(script, { cwd = ROOT, env = {} } = {}) {
  return spawnSync('bash', ['-e', '-u', '-o', 'pipefail', '-c', script], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 10_000,
  });
}

describe('workflow db-apply-migration E051 — ack de rotação', () => {
  const step = workflowStep('preflight', 'E051 — repair-only exige ack de rotação do baseline');

  it('falha e registra a ação obrigatória quando o ack é falso', () => {
    const root = temporaryRoot('e051-no-ack-');
    const summary = join(root, 'summary.md');
    writeFileSync(summary, '');

    const result = runBash(step.run, {
      env: { ACK_BASELINE_ROTATION: 'false', GITHUB_STEP_SUMMARY: summary },
    });

    expect(result.status).toBe(1);
    expect(readFileSync(summary, 'utf8')).toContain('force_rotate: true');
    expect(result.stderr + result.stdout).toContain('repair-only requer ack_baseline_rotation=true');
  });

  it('prossegue quando o operador confirma a rotação do baseline', () => {
    const root = temporaryRoot('e051-ack-');
    const summary = join(root, 'summary.md');
    writeFileSync(summary, '');

    const result = runBash(step.run, {
      env: { ACK_BASELINE_ROTATION: 'true', GITHUB_STEP_SUMMARY: summary },
    });

    expect(result.status).toBe(0);
    expect(readFileSync(summary, 'utf8')).toContain('force_rotate: true');
    expect(result.stdout).toContain('ack_baseline_rotation confirmado');
  });
});

describe('workflow db-apply-migration E052 — recibo fiel ao modo', () => {
  const step = workflowStep('receipt', 'Monta o recibo em MIGRATIONS_SYNC_LOG.md');

  function prepareReceiptRun(mode) {
    const root = temporaryRoot(`e052-${mode}-`);
    mkdirSync(join(root, 'scripts'), { recursive: true });
    mkdirSync(join(root, 'supabase'), { recursive: true });
    copyFileSync(RECEIPT_SCRIPT, join(root, 'scripts/append-migration-receipt.mjs'));
    writeFileSync(
      join(root, 'supabase/MIGRATIONS_SYNC_LOG.md'),
      [
        '# Log de teste',
        '',
        '## Recibos — E15 (workflow de aplicação controlada)',
        '',
        '| versão | sha256 arquivo | md5 statements | executor | método | data UTC | pós-check | status |',
        '|---|---|---|---|---|---|---|---|',
        '',
        '## Fim',
      ].join('\n'),
    );

    const script = step.run
      .replaceAll('${{ github.run_id }}', 'run-fixture-123')
      .replaceAll('${{ github.actor }}', 'actor-fixture')
      .replaceAll('${{ needs.apply.outputs.sha256 }}', 'sha256-fixture')
      .replaceAll('${{ needs.apply.outputs.applied_at }}', '2026-10-18 12:00:00 UTC');

    return { root, script };
  }

  it('registra repair-only sem afirmar que o SQL foi aplicado', () => {
    const { root, script } = prepareReceiptRun('repair-only');
    const result = runBash(script, {
      cwd: root,
      env: {
        APPROVED_BY: '@reviewer-fixture',
        MIGRATION_MODE: 'repair-only',
        MIGRATION_VERSION: '20990101000001',
      },
    });

    const log = readFileSync(join(root, 'supabase/MIGRATIONS_SYNC_LOG.md'), 'utf8');
    const row = log.split('\n').find((line) => line.includes('`20990101000001`'));
    expect(result.status, result.stderr).toBe(0);
    expect(row).toContain('| repair |');
    expect(row).toContain('| registrada-sem-aplicar |');
    expect(row).toContain('SQL não executado');
    expect(row).not.toContain('| aplicada |');
  });

  it('registra apply como E15 aplicada após o post-check', () => {
    const { root, script } = prepareReceiptRun('apply');
    const result = runBash(script, {
      cwd: root,
      env: {
        APPROVED_BY: '@reviewer-fixture',
        MIGRATION_MODE: 'apply',
        MIGRATION_VERSION: '20990101000002',
      },
    });

    const log = readFileSync(join(root, 'supabase/MIGRATIONS_SYNC_LOG.md'), 'utf8');
    const row = log.split('\n').find((line) => line.includes('`20990101000002`'));
    expect(result.status, result.stderr).toBe(0);
    expect(row).toContain('| E15 |');
    expect(row).toContain('| aplicada |');
    expect(row).toContain('post-check da run run-fixture-123');
  });
});
