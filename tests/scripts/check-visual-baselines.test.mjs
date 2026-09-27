// E44 — testa scripts/check-visual-baselines.mjs
//
// Confirma que o gate:
// 1. Passa quando todas as specs protegidas têm baseline chromium-public-linux.png
//    commitado (simula o estado atual do repo).
// 2. Falha (exit 1) quando um baseline de spec protegida é removido.
// 3. Falha (exit 1) quando uma spec protegida não existe no disco.
//
// Usa um repositório git temporário isolado — nunca toca arquivos reais.

import { afterEach, describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const SCRIPT = resolve(import.meta.dirname, '../../scripts/check-visual-baselines.mjs');

// Helpers para criar repo git temporário

function initRepo(dir) {
  const run = (cmd, args, opts = {}) =>
    execFileSync(cmd, args, { cwd: dir, stdio: 'pipe', ...opts });
  run('git', ['init', '-b', 'main']);
  run('git', ['config', 'user.email', 'test@test.com']);
  run('git', ['config', 'user.name', 'Test']);
  return run;
}

function addAndCommit(dir, run, message = 'add') {
  run('git', ['add', '-A']);
  run('git', ['commit', '-m', message]);
}

function touch(dir, relPath, content = 'placeholder') {
  const abs = join(dir, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' });
}

// Specs protegidas pelo gate (deve espelhar PROTECTED em check-visual-baselines.mjs)
const PROTECTED_SPECS = [
  'e2e/ui/alert-dialog-visual.spec.ts',
  'e2e/ui/confirm-dialog-visual.spec.ts',
  'e2e/ui/dialog-visual.spec.ts',
  'e2e/ui/undo-toast-visual.spec.ts',
  'e2e/visual/preview-button.spec.ts',
  'e2e/quotes/quote-item-editor-sheet-header.spec.ts',
];

// Baseline PNG para chromium-public-linux
function baselinePng(spec) {
  return `${spec}-snapshots/test-chromium-public-linux.png`;
}

let tmpDir;

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

describe('check-visual-baselines gate', () => {
  it('passa quando todos os baselines estão commitados', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'e44-pass-'));
    const run = initRepo(tmpDir);

    // Cria spec + baseline para cada spec protegida
    for (const spec of PROTECTED_SPECS) {
      touch(tmpDir, spec, '// spec');
      touch(tmpDir, baselinePng(spec));
    }
    addAndCommit(tmpDir, run);

    const result = runScript(tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✅');
  });

  it('falha quando um baseline é removido', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'e44-fail-missing-'));
    const run = initRepo(tmpDir);

    // Commit inicial com todos os baselines
    for (const spec of PROTECTED_SPECS) {
      touch(tmpDir, spec, '// spec');
      touch(tmpDir, baselinePng(spec));
    }
    addAndCommit(tmpDir, run, 'baseline inicial');

    // Remove um baseline no working tree (mas já commitado no histório)
    // O gate usa git ls-files, então precisamos commitar a remoção
    const removedSpec = PROTECTED_SPECS[0];
    const removedPng = baselinePng(removedSpec);
    run('git', ['rm', removedPng]);
    addAndCommit(tmpDir, run, 'remove baseline');

    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(removedSpec);
    expect(result.stderr).toContain('sem baseline commitado');
  });

  it('falha quando spec protegida não existe no disco', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'e44-fail-spec-'));
    const run = initRepo(tmpDir);

    // Commit com baselines mas sem os spec files no disco
    for (const spec of PROTECTED_SPECS) {
      touch(tmpDir, baselinePng(spec));
    }
    addAndCommit(tmpDir, run, 'apenas baselines sem specs');

    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('spec não existe no disco');
  });
});
