// Testa scripts/check-migration-receipts.mjs (gate E055 — recibo de migration
// em supabase/MIGRATIONS_SYNC_LOG.md).
//
// O script resolve o caminho do log como `path.resolve(__dirname, '..',
// 'supabase/MIGRATIONS_SYNC_LOG.md')`, relativo à sua própria localização
// (import.meta.url), não ao cwd. Por isso, para testar com um log isolado em
// diretório temporário (sem tocar no log real do repo), copiamos o script e
// seus dois módulos locais para `<tmp>/scripts/` e criamos `<tmp>/supabase/`
// ao lado — exatamente a estrutura que o script espera.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT_SRC = resolve(ROOT, 'scripts/check-migration-receipts.mjs');
const DEPS = ['check-result-contract.mjs', 'supabase-read-only-query.mjs'];

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** Monta <tmp>/scripts/{script sob teste + deps}/ e <tmp>/supabase/. */
function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'check-migration-receipts-'));
  temporaryRoots.push(root);
  const scriptsDir = join(root, 'scripts');
  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(join(root, 'supabase'), { recursive: true });
  copyFileSync(SCRIPT_SRC, join(scriptsDir, 'check-migration-receipts.mjs'));
  for (const dep of DEPS) {
    copyFileSync(resolve(ROOT, 'scripts', dep), join(scriptsDir, dep));
  }
  return {
    root,
    scriptPath: join(scriptsDir, 'check-migration-receipts.mjs'),
    logPath: join(root, 'supabase/MIGRATIONS_SYNC_LOG.md'),
  };
}

function run(scriptPath, args, opts = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...opts.env },
  });
}

// ─── --from-file com versão contendo metacaractere de regex ───────────────
//
// hasReceiptForVersion() interpolava `version` sem escapar dentro de
// `new RegExp(...)`. Uma versão com "(" desbalanceado (ou "*" isolado)
// produzia um RegExp inválido → SyntaxError não tratada → o script morria
// com exit 2 e uma mensagem interna do V8 ("Invalid regular expression: ...
// Unterminated group"), em vez de reportar a versão como sem recibo
// (exit 1, mensagem do próprio gate). Isso valia tanto para uma versão sem
// recibo quanto, pior, para uma QUE TINHA recibo: o gate explodia antes de
// conseguir confirmar o match.
describe('hasReceiptForVersion — versão com metacaractere de regex', () => {
  it('reporta "sem recibo" (exit 1) em vez de crashar com SyntaxError de regex', () => {
    const { scriptPath, logPath, root } = setupSandbox();
    writeFileSync(logPath, '| `20260623111612` | aplicada | ok |\n');
    const fromFile = join(root, 'versions.json');
    writeFileSync(fromFile, JSON.stringify(['20260623111612(malicious']));

    const result = run(scriptPath, [`--from-file=${fromFile}`]);

    expect(result.status).toBe(1);
    expect(result.stderr).not.toMatch(/Invalid regular expression/);
    expect(result.stderr).not.toMatch(/erro inesperado/);
    expect(result.stderr).toMatch(/sem recibo/);
    expect(result.stderr).toContain('20260623111612(malicious');
  });

  it('não crasha com um quantificador de regex isolado ("*") como versão', () => {
    const { scriptPath, logPath, root } = setupSandbox();
    writeFileSync(logPath, '| `20260623111612` | aplicada | ok |\n');
    const fromFile = join(root, 'versions.json');
    writeFileSync(fromFile, JSON.stringify(['*']));

    const result = run(scriptPath, [`--from-file=${fromFile}`]);

    expect(result.status).toBe(1);
    expect(result.stderr).not.toMatch(/Invalid regular expression/);
  });

  it('continua reconhecendo corretamente um recibo presente mesmo quando a versão contém metacaractere', () => {
    const { scriptPath, logPath, root } = setupSandbox();
    // A linha de recibo no log também contém o metacaractere na mesma posição.
    writeFileSync(logPath, '| `20260623111612(malicious` | aplicada | ok |\n');
    const fromFile = join(root, 'versions.json');
    writeFileSync(fromFile, JSON.stringify(['20260623111612(malicious']));

    const result = run(scriptPath, [`--from-file=${fromFile}`]);

    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/todas com recibo/);
  });
});

// ─── Regressão: comportamento normal (versão 100% numérica) ───────────────

describe('check-migration-receipts — regressão com versão canônica', () => {
  it('exit 0 quando a versão tem recibo "aplicada" no log', () => {
    const { scriptPath, logPath, root } = setupSandbox();
    writeFileSync(logPath, '| `20260623111612` | aplicada | ok |\n');
    const fromFile = join(root, 'versions.json');
    writeFileSync(fromFile, JSON.stringify(['20260623111612']));

    const result = run(scriptPath, [`--from-file=${fromFile}`]);

    expect(result.status).toBe(0);
  });

  it('exit 1 quando a versão não aparece no log', () => {
    const { scriptPath, logPath, root } = setupSandbox();
    writeFileSync(logPath, '| `20260623111612` | aplicada | ok |\n');
    const fromFile = join(root, 'versions.json');
    writeFileSync(fromFile, JSON.stringify(['20260623119999']));

    const result = run(scriptPath, [`--from-file=${fromFile}`]);

    expect(result.status).toBe(1);
  });
});
