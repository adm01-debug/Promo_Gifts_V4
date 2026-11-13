import { spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/guard-canonical-project.mjs');

let workDirs = [];

afterEach(() => {
  for (const dir of workDirs) {
    rmSync(dir, { force: true, recursive: true });
  }
  workDirs = [];
});

function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'guard-canonical-'));
  workDirs.push(dir);
  mkdirSync(join(dir, 'src'), { recursive: true });
  // Arquivo limpo — nenhuma menção ao ID proibido.
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const ok = true;\n');
  // Arquivos críticos da fase 2 (o guard falha fechado se faltarem — #3371).
  mkdirSync(join(dir, 'src', 'integrations', 'supabase'), { recursive: true });
  writeFileSync(
    join(dir, 'src', 'integrations', 'supabase', 'client.ts'),
    "export const CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln';\n",
  );
  mkdirSync(join(dir, 'supabase'), { recursive: true });
  writeFileSync(join(dir, 'supabase', 'config.toml'), 'project_id = "doufsxqlfjyuvxuezpln"\n');
  return dir;
}

// Simula uma instalação de `rg` que falha por um motivo REAL (status 2:
// flag inválida / erro de I/O), não por "sem match" (status 1). Um `rg`
// são deve devolver 1 quando não há match — aqui forçamos 2.
function makeBrokenRgBinDir() {
  const binDir = mkdtempSync(join(tmpdir(), 'guard-canonical-bin-'));
  workDirs.push(binDir);
  const rgPath = join(binDir, 'rg');
  writeFileSync(rgPath, '#!/bin/sh\necho "rg: erro fatal de leitura" 1>&2\nexit 2\n');
  chmodSync(rgPath, 0o755);
  return binDir;
}

function runGuard({ cwd, path }) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, '--skip-docs', '--skip-configs'], {
      cwd,
      env: { ...process.env, PATH: path },
    });
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

describe('guard-canonical-project — falha fechado quando o scanner falha', () => {
  it('reporta ERRO (não "OK") quando rg falha por motivo real, não por ausência de match', async () => {
    const repoDir = makeTempRepo();
    const binDir = makeBrokenRgBinDir();

    const result = await runGuard({ cwd: repoDir, path: `${binDir}:/usr/bin:/bin` });

    // Antes da correção, um `rg` que falha com status != 1 era tratado
    // como "nenhum hit encontrado" e o gate passava (status 0, "[OK]").
    // Isso é fail-open num gate de segurança: deve falhar fechado.
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('Guard canônico aprovado');
    expect(result.stderr).toContain('rg falhou ao escanear runtime');
  });

  it('continua aprovando normalmente quando rg roda sem erro e não há hits', async () => {
    const repoDir = makeTempRepo();

    const result = await runGuard({ cwd: repoDir, path: process.env.PATH });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Guard canônico aprovado');
  });
});
