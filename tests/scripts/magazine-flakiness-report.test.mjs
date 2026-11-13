/**
 * Testes para scripts/magazine-flakiness-report.mjs
 *
 * Cobre um bug real encontrado em auditoria adversarial do script:
 *
 * Falso-positivo de gate (GAP ou BUG REAL): quando NENHUM teste é coletado
 * em NENHUMA das rodadas — pattern sem arquivo correspondente, `vitest` não
 * gera o arquivo de saída, ou o JSON gerado é inválido/corrompido — o script
 * terminava com `exit 0` e imprimia "✅ Nenhuma flakiness detectada", mesmo
 * reportando no próprio Markdown um aviso `⚠️ N rodada(s) sem JSON válido`.
 * Isso contradiz o docstring do script, que reserva `exit 2` para "erro de
 * infraestrutura" (vitest não gerou JSON), e faz o gate de CI ficar verde
 * sem nenhum teste ter rodado de fato.
 *
 * Corrigido com uma verificação após agregar os resultados: se nenhum teste
 * foi coletado em nenhuma rodada, o script agora sai com `exit 2` e imprime
 * o motivo, em vez de declarar sucesso vazio.
 *
 * Para reproduzir os três cenários que disparam o bug sem depender do
 * `vitest` real (lento e com side effects), os testes substituem `npx` no
 * PATH por um script fake que simula cada falha de infraestrutura.
 */
import { test, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/magazine-flakiness-report.mjs');

const sandboxes = [];
afterEach(() => {
  while (sandboxes.length) {
    const dir = sandboxes.pop();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
});

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  sandboxes.push(sandbox);
  return sandbox;
}

/** Cria um `npx` fake executável num diretório próprio e retorna o diretório. */
function makeFakeNpx(sandbox, script) {
  const bin = join(sandbox, 'fakebin');
  mkdirSync(bin, { recursive: true });
  const npxPath = join(bin, 'npx');
  writeFileSync(npxPath, script);
  chmodSync(npxPath, 0o755);
  return bin;
}

function runScript({ fakeNpxScript, args, patternDir }) {
  const sandbox = makeSandbox('magazine-flakiness-');
  const outDir = join(sandbox, 'out');
  const bin = makeFakeNpx(sandbox, fakeNpxScript);

  const res = spawnSync(
    'node',
    [REAL_SCRIPT, ...(args ?? []), `--out-dir=${outDir}`, ...(patternDir ? [`--pattern=${patternDir}`] : [])],
    {
      cwd: sandbox,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    },
  );
  return { ...res, sandbox, outDir };
}

const FAKE_NPX_NEVER_WRITES = `#!/usr/bin/env bash\nexit 1\n`;

const FAKE_NPX_INVALID_JSON = `#!/usr/bin/env bash
out=""
for arg in "$@"; do
  case "$arg" in
    --outputFile=*) out="\${arg#--outputFile=}" ;;
  esac
done
echo '{ nao e um JSON valido ]' > "$out"
exit 1
`;

const FAKE_NPX_NO_MATCH = `#!/usr/bin/env bash
out=""
for arg in "$@"; do
  case "$arg" in
    --outputFile=*) out="\${arg#--outputFile=}" ;;
  esac
done
echo '{"success":false,"testResults":[],"numTotalTests":0,"numTotalTestSuites":0}' > "$out"
exit 1
`;

test('exit 2 quando vitest nunca gera o arquivo de saida em nenhuma rodada', () => {
  const res = runScript({ fakeNpxScript: FAKE_NPX_NEVER_WRITES, args: ['--runs=2'] });
  expect(res.status).toBe(2);
  expect(res.stderr).toMatch(/ERRO DE INFRAESTRUTURA/);
  expect(res.stderr).toMatch(/JSON não gerado pelo vitest/);
});

test('exit 2 quando o JSON do vitest vem corrompido em todas as rodadas', () => {
  const res = runScript({ fakeNpxScript: FAKE_NPX_INVALID_JSON, args: ['--runs=2'] });
  expect(res.status).toBe(2);
  expect(res.stderr).toMatch(/ERRO DE INFRAESTRUTURA/);
  expect(res.stderr).toMatch(/JSON inválido/);
});

test('exit 2 quando o pattern nao casa com nenhum arquivo de teste (0 testes coletados)', () => {
  const res = runScript({ fakeNpxScript: FAKE_NPX_NO_MATCH, args: ['--runs=1'] });
  expect(res.status).toBe(2);
  expect(res.stderr).toMatch(/ERRO DE INFRAESTRUTURA/);
  // Sem a correção, o script chegava a escrever o relatório "sem flakiness"
  // e sair com 0 — aqui garantimos que isso não volta a acontecer.
  expect(res.stdout).not.toMatch(/Nenhuma flakiness detectada/);
});

test('nao regride o caminho feliz: testes reais coletados continuam exit 0', () => {
  const sandbox = makeSandbox('magazine-flakiness-happy-');
  const outDir = join(sandbox, 'out');
  const bin = makeFakeNpx(
    sandbox,
    `#!/usr/bin/env bash
out=""
for arg in "$@"; do
  case "$arg" in
    --outputFile=*) out="\${arg#--outputFile=}" ;;
  esac
done
cat > "$out" <<'JSON'
{
  "success": true,
  "testResults": [
    {
      "name": "tests/magazine/fake.test.ts",
      "assertionResults": [
        { "ancestorTitles": ["suite"], "title": "passa sempre", "fullName": "suite passa sempre", "status": "passed" }
      ]
    }
  ]
}
JSON
exit 0
`,
  );

  const res = spawnSync('node', [REAL_SCRIPT, '--runs=2', `--out-dir=${outDir}`], {
    cwd: sandbox,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });

  expect(res.status).toBe(0);
  expect(existsSync(join(outDir, 'magazine-flakiness.json'))).toBe(true);
  const report = JSON.parse(readFileSync(join(outDir, 'magazine-flakiness.json'), 'utf8'));
  expect(report.totals.tests).toBe(1);
  expect(report.totals.failAll).toBe(0);
});
