import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/list-migration-drafts.mjs');

let workDirs = [];

afterEach(() => {
  for (const dir of workDirs) {
    rmSync(dir, { force: true, recursive: true });
  }
  workDirs = [];
});

function makeDraftDirWithoutReadme() {
  const dir = mkdtempSync(join(tmpdir(), 'list-migration-drafts-'));
  workDirs.push(dir);
  const draftDir = join(dir, 'qa', 'migrations-draft');
  mkdirSync(draftDir, { recursive: true });
  writeFileSync(join(draftDir, '001_exemplo.sql'), '-- Objetivo: exemplo\nSELECT 1;\n');
  // Propositalmente NÃO cria README.md — simula diretório recriado sem o
  // arquivo índice ainda, ou README apagado por engano.
  return dir;
}

function runScript(cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [SCRIPT_PATH], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', rejectRun);
    child.once('close', (status) => resolveRun({ status, stdout, stderr }));
  });
}

describe('list-migration-drafts — falha limpa quando README.md está ausente', () => {
  it('reporta erro claro, sem stack trace cru, quando o README não existe', async () => {
    const dir = makeDraftDirWithoutReadme();
    const result = await runScript(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[drafts]');
    expect(result.stderr).toContain('README.md');
    // Antes da correção: readFileSync sem try/catch jogava um ENOENT cru,
    // com stack trace do Node (frames "at Object.readFileSync" / "node:fs").
    expect(result.stderr).not.toMatch(/at Object\.readFileSync|node:fs/);
  });
});
