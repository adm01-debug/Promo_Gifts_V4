/**
 * Testes para scripts/round-quality-report.mjs
 *
 * Cobre dois falso-negativos reais encontrados em auditoria adversarial do
 * script e um crash não tratado:
 *
 * 1) `runTypescript()`: quando o `tsc` falha antes de chegar a checar
 *    arquivos (ex.: `tsconfig.app.json` ausente/inválido), a saída não bate
 *    no regex `ERR_RE` (que exige `arquivo(linha,col): error TSxxxx:`) — o
 *    script contava `total = 0` e reportava "TypeScript: 0" como se a rodada
 *    estivesse limpa, mascarando a falha real do `tsc` (exit code != 0).
 *    Corrigido: se `res.status !== 0` e nenhuma linha bateu no regex, o
 *    resultado vira `{ error: ... }` em vez de `{ total: 0 }`.
 *
 * 2) `runEslintCheck()`: quando o `eslint` crasha antes de emitir o JSON
 *    (ex.: `eslint.config.js` ausente — ESLint 9 sai com código 2 e stdout
 *    vazio, erro só no stderr), `JSON.parse(res.stdout || '[]')` silenciava
 *    o crash como `[]`, e o script reportava "ESLint: 0" como se não
 *    houvesse nenhum erro. Corrigido: stdout vazio após um `spawnSync` bem
 *    formado agora é tratado como crash, reportando o stderr do eslint.
 *
 * 3) Persistência (`writeFileSync`/`appendFileSync` em qa/quality-rounds/)
 *    sem try/catch: um diretório de saída sem permissão de escrita (EACCES)
 *    derrubava o processo com stack trace cru do Node e código de saída 1
 *    (fora do contrato documentado: 0 ou 2). Corrigido com try/catch que
 *    reporta a falha e sai com código 2, igual ao caso de tsc/eslint
 *    crashando.
 */
import { test, expect } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  rmSync,
  chmodSync,
  symlinkSync,
  existsSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/round-quality-report.mjs');
const REAL_NODE_MODULES = join(ROOT, 'node_modules');

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  chmodSync(sandbox, 0o755);
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, 'src'), { recursive: true });
  copyFileSync(REAL_SCRIPT, join(sandbox, 'scripts/round-quality-report.mjs'));
  // O script importa scripts/lib/tsc-run.mjs (heap explícito do tsc, #3406): o sandbox precisa dele.
  mkdirSync(join(sandbox, 'scripts/lib'), { recursive: true });
  copyFileSync(join(ROOT, 'scripts/lib/tsc-run.mjs'), join(sandbox, 'scripts/lib/tsc-run.mjs'));
  // ROOT do script é `process.cwd()` (não __dirname) — node_modules real via
  // symlink, para usar o tsc/eslint já instalados sem copiar ~870MB.
  symlinkSync(REAL_NODE_MODULES, join(sandbox, 'node_modules'));
  writeFileSync(
    join(sandbox, 'tsconfig.app.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include: ['src'],
    }),
  );
  // `files: ["**/*.mjs"]` evita que o eslint tente parsear `src/ok.ts`
  // (sintaxe TS) com o parser JS padrão, o que daria um erro de parse
  // espúrio e não um "0 erros" real.
  writeFileSync(
    join(sandbox, 'eslint.config.js'),
    'export default [{ files: ["**/*.mjs"], rules: {} }];\n',
  );
  writeFileSync(join(sandbox, 'src/ok.ts'), 'export const x: number = 1;\n');
  spawnSync('git', ['init', '-q'], { cwd: sandbox });
  spawnSync('git', ['add', '-A'], { cwd: sandbox });
  spawnSync('git', ['-c', 'user.email=a@a.com', '-c', 'user.name=a', 'commit', '-q', '-m', 'base'], {
    cwd: sandbox,
  });
  return sandbox;
}

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
const SETPRIV = '/usr/bin/setpriv';
const canDropPrivileges = isRoot && existsSync(SETPRIV);
const eaccesReproducible = !isRoot || canDropPrivileges;

function run(sandbox, args = []) {
  const scriptPath = join(sandbox, 'scripts/round-quality-report.mjs');
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: sandbox,
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function runAsUnprivileged(sandbox, args = []) {
  const scriptPath = join(sandbox, 'scripts/round-quality-report.mjs');
  const result = spawnSync(
    SETPRIV,
    ['--reuid=1', '--regid=1', '--clear-groups', process.execPath, scriptPath, ...args],
    { cwd: sandbox, encoding: 'utf8' },
  );
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function readLatestJson(sandbox) {
  return JSON.parse(readFileSync(join(sandbox, 'qa/quality-rounds/latest.json'), 'utf8'));
}

// ─────────────────────────────────────────────────────────────────────────
// Bug 1: tsc falha (tsconfig ausente) virava falso-negativo "0 erros".
// ─────────────────────────────────────────────────────────────────────────

test('tsc falhando antes de checar arquivos é reportado como erro, não como "0" (falso-negativo), e sai com código 2', () => {
  const sandbox = makeSandbox('rqr-tsc-crash-');
  try {
    rmSync(join(sandbox, 'tsconfig.app.json'));

    const { code, stdout, stderr } = run(sandbox, ['--no-eslint']);

    // Antes da correção: total=0, exit 0, sem indicação de que o tsc nem
    // rodou de verdade.
    expect(code).toBe(2);
    expect(stdout + stderr).toMatch(/⚠ TypeScript:/);

    const report = readLatestJson(sandbox);
    expect(report.typescript.error).toBeTruthy();
    expect(report.typescript.total).toBeUndefined();
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 2: eslint crashando sem emitir JSON virava falso-negativo "0 erros".
// ─────────────────────────────────────────────────────────────────────────

test('eslint crashando sem emitir JSON (config ausente) é reportado como erro, não como "0", e sai com código 2', () => {
  const sandbox = makeSandbox('rqr-eslint-crash-');
  try {
    rmSync(join(sandbox, 'eslint.config.js'));

    const { code, stdout, stderr } = run(sandbox, ['--no-ts']);

    // Antes da correção: stdout vazio do eslint (crash) virava `JSON.parse('[]')`
    // = total 0, exit 0 — como se a rodada estivesse 100% limpa.
    expect(code).toBe(2);
    expect(stdout + stderr).toMatch(/⚠ ESLint:/);

    const report = readLatestJson(sandbox);
    expect(report.eslint.error).toBeTruthy();
    expect(report.eslint.total).toBeUndefined();
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 3: diretório de saída sem permissão de escrita crashava com exceção crua.
// ─────────────────────────────────────────────────────────────────────────

test('diretório de saída sem permissão de escrita (EACCES) não crasha com exceção crua — sai com código 2', () => {
  const sandbox = makeSandbox('rqr-eacces-');
  try {
    mkdirSync(join(sandbox, 'qa/quality-rounds'), { recursive: true });
    chmodSync(sandbox, 0o755);
    chmodSync(join(sandbox, 'qa'), 0o755);
    chmodSync(join(sandbox, 'qa/quality-rounds'), 0o555);

    const { code, stdout, stderr } = eaccesReproducible
      ? canDropPrivileges
        ? runAsUnprivileged(sandbox, ['--no-ts', '--no-eslint'])
        : run(sandbox, ['--no-ts', '--no-eslint'])
      : { code: null, stdout: '', stderr: '' };

    if (eaccesReproducible) {
      const combined = stdout + stderr;
      // Antes da correção: Error: EACCES não tratado, stack trace cru do
      // Node, process exit code 1 (fora do contrato documentado 0/2).
      expect(combined).not.toMatch(/at writeFileSync/);
      expect(combined).toMatch(/⚠ Falha ao gravar/);
      expect(code).toBe(2);
    }
  } finally {
    chmodSync(join(sandbox, 'qa/quality-rounds'), 0o755);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Regressão: rodada normal (sem erros reais) continua reportando 0/0 e exit 0.
// ─────────────────────────────────────────────────────────────────────────

test('rodada normal com tsc e eslint limpos reporta 0/0 e sai com código 0 (sem falso-positivo)', () => {
  const sandbox = makeSandbox('rqr-happy-');
  try {
    const { code, stdout } = run(sandbox, []);

    expect(code).toBe(0);
    expect(stdout).toMatch(/TypeScript\s*:\s*0/);
    expect(stdout).toMatch(/ESLint\s*:\s*0/);

    const report = readLatestJson(sandbox);
    expect(report.typescript.total).toBe(0);
    expect(report.eslint.total).toBe(0);
    expect(report.typescript.error).toBeUndefined();
    expect(report.eslint.error).toBeUndefined();
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
