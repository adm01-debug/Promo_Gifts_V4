/**
 * Testes para scripts/check-timer-cleanup.mjs (E134)
 *
 * Cobre dois bugs reais encontrados em auditoria adversarial do script:
 *
 * 1) Falso-negativo em `extractUseEffectBodies`: a extração do corpo do
 *    useEffect conta profundidade de parênteses char-a-char sem saber que
 *    está dentro de uma string ou de um comentário. Um `)` solto numa
 *    string (ex.: `"valor)"`) ou num comentário (ex.: `// nota (sem fechar`)
 *    fecha o bloco antes da hora — o `setTimeout` real do código fica fora
 *    do `body` extraído e o gate não o vê (falso-negativo: um leak real
 *    passa batido). Corrigido ignorando parênteses dentro de strings/`` ` ``
 *    e de comentários `//` e `/* *​/` ao escanear o corpo.
 *
 * 2) Crash não tratado em `walkFiles`: `readdirSync`/`statSync` eram
 *    chamados sem try/catch. Um diretório sem permissão de leitura (EACCES)
 *    ou um symlink em loop (ELOOP) derrubava o processo com stack trace cru
 *    do Node em vez do relatório controlado do próprio script. Corrigido
 *    com try/catch, pulando a entrada ilegível (mesma política já usada
 *    pelo `readFileSync` do laço principal).
 *
 * Nota: o script resolve `SRC`/`ROOT` como `join(__dirname, '..', 'src')`
 * — relativo ao próprio arquivo do script, não ao cwd do processo. Por
 * isso o sandbox precisa conter uma cópia do script em
 * `<sandbox>/scripts/...`, para que `SRC` aponte para `<sandbox>/src`.
 */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/check-timer-cleanup.mjs');

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  // mkdtempSync cria o diretório com modo 0700. O processo filho usado no
  // teste de EACCES roda com outro uid (via setpriv), então precisa
  // conseguir pelo menos ATRAVESSAR o sandbox.
  chmodSync(sandbox, 0o755);
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, 'src'), { recursive: true });
  // SRC do script é relativo ao próprio arquivo — precisa viver no sandbox.
  copyFileSync(REAL_SCRIPT, join(sandbox, 'scripts/check-timer-cleanup.mjs'));
  return sandbox;
}

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
const SETPRIV = '/usr/bin/setpriv';
const canDropPrivileges = isRoot && existsSync(SETPRIV);
// `root` ignora bits de permissão DAC — chmod 000 não produz EACCES para
// root. Quando o runner de teste roda como root (comum em containers de
// CI), cai o processo FILHO para um usuário sem privilégio via `setpriv`,
// para que o cenário de permissão negada seja reproduzível de verdade.
const eaccesReproducible = !isRoot || canDropPrivileges;

function run(sandbox) {
  const scriptPath = join(sandbox, 'scripts/check-timer-cleanup.mjs');
  const [cmd, cmdArgs] = canDropPrivileges
    ? [SETPRIV, ['--reuid=1000', '--regid=1000', '--clear-groups', process.execPath, scriptPath]]
    : [process.execPath, [scriptPath]];
  const result = spawnSync(cmd, cmdArgs, { cwd: sandbox, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

// ─────────────────────────────────────────────────────────────────────────
// Bug 1: `)` dentro de string/comentário antes do setTimeout real.
// ─────────────────────────────────────────────────────────────────────────

test('setTimeout real some do gate quando precedido por uma string com `)` solto (falso-negativo)', () => {
  const sandbox = makeSandbox('timer-cleanup-string-paren-');
  try {
    writeFileSync(
      join(sandbox, 'src/a.tsx'),
      [
        "import { useEffect } from 'react';",
        'function Comp() {',
        '  useEffect(() => {',
        '    const label = "valor)";',
        '    setTimeout(() => { doWork(); }, 1000);',
        '  }, []);',
        '}',
        '',
      ].join('\n'),
    );

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    // Antes da correção: a extração cortava o body em "valor" (o `)` da
    // string fechava o contador de profundidade antes da hora), o
    // setTimeout ficava fora do body e o gate reportava exit 0 (OK) —
    // falso-negativo de um leak real.
    expect(code).toBe(1);
    expect(combined).toMatch(/src\/a\.tsx:3: setTimeout direto em useEffect sem clearTimeout/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('setTimeout real some do gate quando precedido por um comentário com `)` solto (falso-negativo)', () => {
  const sandbox = makeSandbox('timer-cleanup-comment-paren-');
  try {
    writeFileSync(
      join(sandbox, 'src/a.tsx'),
      [
        "import { useEffect } from 'react';",
        'function Comp() {',
        '  useEffect(() => {',
        '    // nota: fecha parenteses perdido)',
        '    setTimeout(() => { doWork(); }, 1000);',
        '  }, []);',
        '}',
        '',
      ].join('\n'),
    );

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    expect(code).toBe(1);
    expect(combined).toMatch(/src\/a\.tsx:3: setTimeout direto em useEffect sem clearTimeout/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 2: diretório sem permissão de leitura (EACCES) crashava o processo.
// ─────────────────────────────────────────────────────────────────────────

test('diretório sem permissão de leitura não crasha o processo (EACCES tratado, não exceção crua)', () => {
  const sandbox = makeSandbox('timer-cleanup-eacces-');
  try {
    mkdirSync(join(sandbox, 'src/noperm'), { recursive: true });
    writeFileSync(
      join(sandbox, 'src/noperm/x.ts'),
      "useEffect(() => { setTimeout(() => {}, 1); }, []);\n",
    );
    // Arquivo legível fora do diretório bloqueado, para garantir que o
    // resto da árvore continua sendo varrido normalmente.
    writeFileSync(
      join(sandbox, 'src/ok.ts'),
      [
        "import { useEffect } from 'react';",
        'function Comp() {',
        '  useEffect(() => {',
        '    const tid = setTimeout(() => {}, 1);',
        '    return () => clearTimeout(tid);',
        '  }, []);',
        '}',
        '',
      ].join('\n'),
    );
    chmodSync(join(sandbox, 'src/noperm'), 0o000);

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    // Antes da correção: readdirSync/statSync sem try/catch em walkFiles
    // subiam EACCES (ou ELOOP, em symlink em loop) como exceção não
    // tratada — stack trace cru do Node, processo morto fora do fluxo de
    // relatório do próprio script.
    expect(combined).not.toMatch(/at readdirSync/);
    expect(combined).not.toMatch(/at statSync/);
    expect(combined).not.toMatch(/Error: EACCES/);
    expect(combined).not.toMatch(/at ModuleJob\.run/);

    if (eaccesReproducible) {
      // Diretório ilegível é pulado silenciosamente (mesma política do
      // readFileSync no laço principal); src/ok.ts é seguro -> exit 0.
      expect(code).toBe(0);
      expect(combined).toMatch(/nenhum setTimeout sem clearTimeout/);
    }
  } finally {
    chmodSync(join(sandbox, 'src/noperm'), 0o755);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Regressão geral: comportamento documentado do script permanece correto.
// ─────────────────────────────────────────────────────────────────────────

test('useEffect sem setTimeout e sem clearTimeout passa o gate (sem falso-positivo)', () => {
  const sandbox = makeSandbox('timer-cleanup-happy-');
  try {
    writeFileSync(
      join(sandbox, 'src/a.tsx'),
      [
        "import { useEffect } from 'react';",
        'function Comp() {',
        '  useEffect(() => {',
        '    subscribe();',
        '    return () => unsubscribe();',
        '  }, []);',
        '}',
        '',
      ].join('\n'),
    );

    const { code, stdout } = run(sandbox);
    expect(code).toBe(0);
    expect(stdout).toMatch(/nenhum setTimeout sem clearTimeout/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('setTimeout com clearTimeout no cleanup não é reportado (padrão seguro)', () => {
  const sandbox = makeSandbox('timer-cleanup-safe-');
  try {
    writeFileSync(
      join(sandbox, 'src/a.tsx'),
      [
        "import { useEffect } from 'react';",
        'function Comp() {',
        '  useEffect(() => {',
        '    const tid = setTimeout(() => { doWork(); }, 1000);',
        '    return () => clearTimeout(tid);',
        '  }, []);',
        '}',
        '',
      ].join('\n'),
    );

    const { code, stdout } = run(sandbox);
    expect(code).toBe(0);
    expect(stdout).toMatch(/nenhum setTimeout sem clearTimeout/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('setTimeout direto em useEffect sem clearTimeout falha o gate com a linha correta', () => {
  const sandbox = makeSandbox('timer-cleanup-unsafe-');
  try {
    writeFileSync(
      join(sandbox, 'src/a.tsx'),
      [
        "import { useEffect } from 'react';",
        'function Comp() {',
        '  useEffect(() => {',
        '    setTimeout(() => { doSomething(); }, 1000);',
        '  }, []);',
        '}',
        '',
      ].join('\n'),
    );

    const { code, stdout, stderr } = run(sandbox);
    expect(code).toBe(1);
    expect(stdout + stderr).toMatch(/src\/a\.tsx:3: setTimeout direto em useEffect sem clearTimeout/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('setTimeout dentro de `new Promise` (delay utilitário) não é reportado (falso-negativo intencional)', () => {
  const sandbox = makeSandbox('timer-cleanup-promise-');
  try {
    writeFileSync(
      join(sandbox, 'src/a.tsx'),
      [
        "import { useEffect } from 'react';",
        'function Comp() {',
        '  useEffect(() => {',
        '    async function run() {',
        '      await new Promise((r) => setTimeout(r, 300));',
        '      doStuff();',
        '    }',
        '    run();',
        '  }, []);',
        '}',
        '',
      ].join('\n'),
    );

    const { code, stdout } = run(sandbox);
    expect(code).toBe(0);
    expect(stdout).toMatch(/nenhum setTimeout sem clearTimeout/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
