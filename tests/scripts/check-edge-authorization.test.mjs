// Testa scripts/check-edge-authorization.mjs — gate de CI que valida a
// cobertura/enforcement de autorização nas edge functions.
//
// Regressão coberta: o script lia `_shared/edge-authz-manifest.ts` com
// `readFileSync` sem try/catch. Quando o manifest não existe (ex.: PR que
// move/renomeia o arquivo, checkout parcial), o processo morria com uma
// stack trace crua do Node (ENOENT) em vez de uma mensagem de gate limpa —
// mesmo padrão de bug já corrigido em scripts irmãos desta sessão.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/check-edge-authorization.mjs');
const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-edge-authz-'));
  temporaryRoots.push(root);
  return root;
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

describe('check-edge-authorization: manifest ausente', () => {
  it('falha fechado com mensagem limpa (não crash de ENOENT) quando o manifest não existe', async () => {
    const root = fixtureRoot();
    // supabase/functions existe, mas _shared/edge-authz-manifest.ts não foi criado.
    mkdirSync(join(root, 'supabase', 'functions', 'some-fn'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'functions', 'some-fn', 'index.ts'), 'export default 1;\n');

    const { status, stderr } = await runScript(root);

    expect(status).toBe(2);
    expect(stderr).not.toMatch(/at readFileSync/);
    expect(stderr).not.toMatch(/node:fs:/);
    expect(stderr).toMatch(/edge-authz-manifest\.ts/);
  });
});
