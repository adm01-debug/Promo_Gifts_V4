/**
 * Testes para scripts/check-secrets-inventory.mjs
 *
 * Cobre um bug real encontrado em auditoria adversarial do script:
 *
 * 1) Crash não tratado quando um arquivo de workflow/action (.yml/.yaml em
 *    .github/workflows ou .github/actions) OU um arquivo de edge function
 *    (.ts em supabase/functions) existe mas não pode ser lido (ex.: EACCES
 *    por permissão negada). `readFileSync(file, 'utf8')` era chamado sem
 *    try/catch em três laços do script (varredura de refs, contagem de refs
 *    e varredura de Deno.env.get()), então uma permissão negada derrubava o
 *    processo com stack trace cru do Node em vez do relatório controlado do
 *    próprio script — e, em modo --gate, pior do que crashar seria ignorar
 *    o arquivo silenciosamente: um workflow ilegível poderia escond
 *    secrets não documentados sem o gate nunca acusar (falso-negativo de
 *    segurança). Corrigido com try/catch em cada leitura, reportando
 *    `::error::` e, em --gate, falhando o processo (fail-closed) com uma
 *    mensagem dedicada em vez de deixar passar silenciosamente.
 *
 * Nota: o script resolve `ROOT` como `join(__dirname, '..')` — relativo ao
 * próprio arquivo do script, não ao cwd do processo. Por isso o sandbox
 * precisa conter uma cópia do script em `<sandbox>/scripts/...`, para que
 * `ROOT` aponte para o próprio sandbox (e não para o repo real).
 */
import { test, expect } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  chmodSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/check-secrets-inventory.mjs');

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  // mkdtempSync cria o diretório com modo 0700 (só o dono acessa). O
  // processo filho usado nos testes de EACCES roda com outro uid (via
  // setpriv), então precisa conseguir pelo menos ATRAVESSAR o sandbox.
  chmodSync(sandbox, 0o755);
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, '.github/workflows'), { recursive: true });
  mkdirSync(join(sandbox, 'docs/ci'), { recursive: true });
  mkdirSync(join(sandbox, 'supabase/functions/hello'), { recursive: true });
  // ROOT do script é relativo ao próprio arquivo — precisa viver dentro do sandbox.
  copyFileSync(REAL_SCRIPT, join(sandbox, 'scripts/check-secrets-inventory.mjs'));
  return sandbox;
}

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
// `root` ignora bits de permissão DAC — chmod 000 não produz EACCES para
// root. Quando o próprio runner de teste roda como root (comum em
// containers de CI), cai o processo FILHO para um usuário sem privilégio
// (uid 1000) via `setpriv`, para que o cenário de permissão negada seja
// reproduzível de verdade em vez de ser só pulado.
const SETPRIV = '/usr/bin/setpriv';
const canDropPrivileges = isRoot && existsSync(SETPRIV);
// Se nem é root nem conseguimos dropar privilégio, o EACCES é reproduzível
// diretamente (ambiente de usuário comum).
const eaccesReproducible = !isRoot || canDropPrivileges;

function run(sandbox, args) {
  const scriptPath = join(sandbox, 'scripts/check-secrets-inventory.mjs');
  const [cmd, cmdArgs] = canDropPrivileges
    ? [SETPRIV, ['--reuid=1000', '--regid=1000', '--clear-groups', process.execPath, scriptPath, ...args]]
    : [process.execPath, [scriptPath, ...args]];
  const result = spawnSync(cmd, cmdArgs, { cwd: sandbox, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

// ─────────────────────────────────────────────────────────────────────────
// Bug: workflow/action .yml ilegível (EACCES) crashava em vez de reportar
// erro controlado e falhar o --gate (fail-closed).
// ─────────────────────────────────────────────────────────────────────────

test('workflow .yml sem permissão de leitura reporta erro controlado em vez de crashar com EACCES, e --gate falha fail-closed', () => {
  const sandbox = makeSandbox('secrets-inv-eacces-yml-');
  try {
    writeFileSync(
      join(sandbox, '.github/workflows/readable.yml'),
      'on: push\njobs:\n  x:\n    steps:\n      - run: echo ${{ secrets.OK_TOKEN }}\n',
    );
    writeFileSync(
      join(sandbox, '.github/workflows/noperm.yml'),
      'on: push\njobs:\n  x:\n    steps:\n      - run: echo ${{ secrets.HIDDEN_TOKEN }}\n',
    );
    writeFileSync(
      join(sandbox, 'docs/ci/SEGREDOS.md'),
      '| `OK_TOKEN` | x |\n| `HIDDEN_TOKEN` | x |\n',
    );
    chmodSync(join(sandbox, '.github/workflows/noperm.yml'), 0o000);

    const { code, stdout, stderr } = run(sandbox, ['--gate']);
    const combined = stdout + stderr;

    // Antes da correção: readFileSync sem try/catch subia EACCES como
    // exceção não tratada — stack trace cru do Node, processo morto fora
    // do fluxo de relatório do próprio script.
    expect(combined).not.toMatch(/at readFileSync/);
    expect(combined).not.toMatch(/at ModuleJob\.run/);
    expect(combined).not.toMatch(/Error: EACCES/);

    if (eaccesReproducible) {
      // Mensagem controlada do próprio script, não stack trace do Node.
      expect(combined).toMatch(/::error::check-secrets-inventory: erro ao ler .*noperm\.yml/);
      // Fail-closed: não pode passar silenciosamente só porque um arquivo
      // não pôde ser lido (poderia esconder secret não documentado).
      expect(combined).toMatch(
        /::error::check-secrets-inventory: um ou mais arquivos não puderam ser lidos/,
      );
      expect(code).toBe(1);
    }
  } finally {
    chmodSync(join(sandbox, '.github/workflows/noperm.yml'), 0o644);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('workflow .yml sem permissão de leitura, sem --gate, reporta erro mas não crasha (exit 0, mesmo comportamento de não-gate)', () => {
  const sandbox = makeSandbox('secrets-inv-eacces-yml-nogate-');
  try {
    writeFileSync(
      join(sandbox, '.github/workflows/noperm.yml'),
      'on: push\njobs:\n  x:\n    steps:\n      - run: echo ${{ secrets.HIDDEN_TOKEN }}\n',
    );
    writeFileSync(join(sandbox, 'docs/ci/SEGREDOS.md'), '| `HIDDEN_TOKEN` | x |\n');
    chmodSync(join(sandbox, '.github/workflows/noperm.yml'), 0o000);

    const { code, stdout, stderr } = run(sandbox, []);
    const combined = stdout + stderr;

    expect(combined).not.toMatch(/at readFileSync/);
    expect(combined).not.toMatch(/Error: EACCES/);

    if (eaccesReproducible) {
      expect(combined).toMatch(/::error::check-secrets-inventory: erro ao ler .*noperm\.yml/);
      expect(code).toBe(0);
    }
  } finally {
    chmodSync(join(sandbox, '.github/workflows/noperm.yml'), 0o644);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Mesmo bug, no laço de varredura de edge functions (E194).
// ─────────────────────────────────────────────────────────────────────────

test('edge function .ts sem permissão de leitura reporta erro controlado em vez de crashar com EACCES, e --scan-edge/--gate falha fail-closed', () => {
  const sandbox = makeSandbox('secrets-inv-eacces-ts-');
  try {
    writeFileSync(
      join(sandbox, 'supabase/functions/hello/index.ts'),
      'const a = Deno.env.get("SOME_EDGE_SECRET");\n',
    );
    writeFileSync(
      join(sandbox, 'supabase/functions/hello/noperm.ts'),
      'const b = Deno.env.get("HIDDEN_EDGE_SECRET");\n',
    );
    writeFileSync(
      join(sandbox, 'docs/ci/SEGREDOS.md'),
      '## Segredos de Edge Functions\n| Nome | Dono |\n|---|---|\n| `SOME_EDGE_SECRET` | x |\n',
    );
    chmodSync(join(sandbox, 'supabase/functions/hello/noperm.ts'), 0o000);

    const { code, stdout, stderr } = run(sandbox, ['--scan-edge']);
    const combined = stdout + stderr;

    expect(combined).not.toMatch(/at readFileSync/);
    expect(combined).not.toMatch(/Error: EACCES/);

    if (eaccesReproducible) {
      expect(combined).toMatch(/::error::check-secrets-inventory: erro ao ler .*noperm\.ts/);
      // Sem --gate, --scan-edge sozinho não força exit 1 (mesmo contrato
      // já existente do script para o relatório simples).
      expect(code).toBe(0);
    }
  } finally {
    chmodSync(join(sandbox, 'supabase/functions/hello/noperm.ts'), 0o644);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Regressão geral: comportamento documentado do script permanece correto.
// ─────────────────────────────────────────────────────────────────────────

test('secret referenciado e documentado passa o --gate (regressão geral)', () => {
  const sandbox = makeSandbox('secrets-inv-happy-');
  try {
    writeFileSync(
      join(sandbox, '.github/workflows/ci.yml'),
      'on: push\njobs:\n  x:\n    steps:\n      - run: echo ${{ secrets.OK_TOKEN }}\n      # secrets.COMMENTED_OUT não deve contar\n',
    );
    writeFileSync(join(sandbox, 'docs/ci/SEGREDOS.md'), '| `OK_TOKEN` | x |\n');

    const { code, stdout } = run(sandbox, ['--gate']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Todos os secrets\/vars referenciados estão documentados/);
    expect(stdout).not.toMatch(/COMMENTED_OUT/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('secret referenciado e NÃO documentado falha o --gate com mensagem clara', () => {
  const sandbox = makeSandbox('secrets-inv-undoc-');
  try {
    writeFileSync(
      join(sandbox, '.github/workflows/ci.yml'),
      'on: push\njobs:\n  x:\n    steps:\n      - run: echo ${{ secrets.UNDOCUMENTED_TOKEN }}\n',
    );
    writeFileSync(join(sandbox, 'docs/ci/SEGREDOS.md'), '# sem nada\n');

    const { code, stdout, stderr } = run(sandbox, ['--gate']);
    expect(code).toBe(1);
    expect(stdout + stderr).toMatch(/UNDOCUMENTED_TOKEN/);
    expect(stdout + stderr).toMatch(/::error::check-secrets-inventory/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
