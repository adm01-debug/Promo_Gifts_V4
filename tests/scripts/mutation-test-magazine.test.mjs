/**
 * Testes para scripts/mutation-test-magazine.mjs
 *
 * Cobre dois bugs reais encontrados em auditoria adversarial do script:
 *
 * O script roda `vitest` via `spawnSync`, que bloqueia a thread principal do
 * Node. Os handlers `process.on('SIGINT'/'SIGTERM', …)` registrados no topo
 * do arquivo (pensados para restaurar o arquivo mutado em caso de Ctrl-C)
 * NUNCA chegam a disparar enquanto uma rodada de `vitest` está em andamento
 * — e, quando o `spawnSync` retorna, o restante do script é 100% síncrono
 * até o `process.exit()` final, então o event loop também não tem chance de
 * entregar o sinal depois.
 *
 * Na prática, quando o `vitest` filho recebe SIGINT (Ctrl-C real no
 * terminal, que atinge todo o process group), `spawnSync` retorna com
 * `res.status === null` e `res.signal === 'SIGINT'`. O código antes da
 * correção fazia `code: res.status ?? -1` e classificava
 * `killed = run.code !== 0` → **a rodada interrompida era contada como
 * "KILLED"** (falso positivo de mutation score) e o laço `for` seguia
 * tranquilamente para a PRÓXIMA mutação, ignorando por completo o Ctrl-C do
 * usuário — contradizendo o próprio docstring do script ("restaurado …
 * mesmo em Ctrl-C").
 *
 * Corrigido: `runTests()` agora também devolve `signal`; ao detectar um
 * `run.signal` truthy, o laço aborta imediatamente (sem avaliar as
 * mutações restantes) e o script sai com `exit 130` em vez de reportar uma
 * "KILLED" fictícia e um mutation score de um run incompleto.
 *
 * Para reproduzir sem depender do `vitest` real (lento, ~9s por rodada), os
 * testes substituem `npx` no PATH por um script fake, no mesmo padrão usado
 * em `tests/scripts/magazine-flakiness-report.test.mjs`. Como o catálogo de
 * mutações (`M1..M6`) é hardcoded no script com caminhos relativos ao cwd,
 * o sandbox recria `tests/utils/tailwindRings.ts` com as duas linhas que
 * M1/M2 esperam encontrar.
 *
 * Segundo bug: uma falha de escrita (ex.: EPERM, disco cheio, arquivo
 * tornado imutável entre o baseline e a mutação) dentro de `applyMutation`
 * ou do restore que a segue não era capturada — virava uma exceção não
 * tratada (stack trace do Node, `exit 1`) em vez do `exit 2` documentado
 * para "erro de infraestrutura". Corrigido envolvendo as escritas
 * envolvidas em `try/catch`. Simulado com `chattr +i` (torna o arquivo
 * imutável mesmo para root); se o filesystem do CI não suportar o atributo,
 * o teste pula em vez de falhar por um motivo alheio ao que está sendo
 * verificado.
 */
import { test, expect, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  chmodSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/mutation-test-magazine.mjs');

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

// Conteúdo mínimo de `tests/utils/tailwindRings.ts` que satisfaz M1 e M2
// (cada `find` precisa aparecer exatamente 1 vez).
const TAILWIND_RINGS_CONTENT = `export const PRIMARY_RE_HOLDER = true;
const PRIMARY_RE = /^ring-primary(?:\\/\\d+)?$/;
const AMBER_RE = /^ring-amber-\\d+(?:\\/\\d+)?$/;
export { PRIMARY_RE, AMBER_RE };
`;

function setupSandboxRepo(sandbox) {
  const ringsFile = join(sandbox, 'tests/utils/tailwindRings.ts');
  mkdirSync(dirname(ringsFile), { recursive: true });
  writeFileSync(ringsFile, TAILWIND_RINGS_CONTENT);
  return ringsFile;
}

function runScript({ fakeNpxScript, args, env }) {
  const sandbox = makeSandbox('mutation-test-magazine-');
  const outDir = join(sandbox, 'out');
  const ringsFile = setupSandboxRepo(sandbox);
  const bin = makeFakeNpx(sandbox, fakeNpxScript);
  const callLog = join(sandbox, 'npx-calls.log');

  const res = spawnSync('node', [REAL_SCRIPT, ...(args ?? []), `--out-dir=${outDir}`], {
    cwd: sandbox,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      NPX_CALL_LOG: callLog,
      ...env,
    },
  });
  return { ...res, sandbox, outDir, ringsFile, callLog };
}

function callCount(callLog) {
  if (!existsSync(callLog)) return 0;
  return readFileSync(callLog, 'utf8').split('\n').filter(Boolean).length;
}

// Chamada 1 (baseline) → exit 0. Chamada 2 (rodada de M1) → o processo recebe
// SIGINT de si mesmo, simulando o `vitest` filho sendo atingido por um Ctrl-C
// real no terminal (que entrega o sinal a todo o process group). Chamada 3
// (M2, só ocorreria se o bug tivesse regredido) → exit 0.
const FAKE_NPX_SIGINT_ON_SECOND_CALL = `#!/usr/bin/env bash
touch "$NPX_CALL_LOG"
n=$(( $(wc -l < "$NPX_CALL_LOG") + 1 ))
echo "call $n: $*" >> "$NPX_CALL_LOG"
if [ "$n" -eq 2 ]; then
  kill -INT $$
  sleep 5
  exit 99
fi
exit 0
`;

test('SIGINT durante uma rodada aborta o script (exit 130) em vez de classificar como KILLED e seguir para a próxima mutação', () => {
  const res = runScript({
    fakeNpxScript: FAKE_NPX_SIGINT_ON_SECOND_CALL,
    args: ['--only=M1,M2'],
  });

  expect(res.status).toBe(130);
  expect(res.stderr).toMatch(/interrompid[ao]/i);

  // Sem a correção, o laço seguia para M2 após a interrupção de M1 — aqui
  // garantimos que `npx` foi chamado só 2x (baseline + M1), nunca para M2.
  expect(callCount(res.callLog)).toBe(2);

  // O arquivo mutado precisa ter sido restaurado ao conteúdo original.
  expect(readFileSync(res.ringsFile, 'utf8')).toBe(TAILWIND_RINGS_CONTENT);

  // Sem a correção, o script chegava a escrever um relatório de sucesso
  // (mutation score 100%, M1 "killed") para um run que na verdade foi
  // interrompido. Garantimos que isso não volta a acontecer.
  expect(existsSync(join(res.outDir, 'mutation-report.json'))).toBe(false);
  expect(res.stdout).not.toMatch(/KILLED/);
});

// Caminho feliz: baseline OK, M1 "killed" por uma falha real (exit 1, sem
// sinal) — garante que a correção não regrediu a classificação normal.
const FAKE_NPX_REAL_KILL = `#!/usr/bin/env bash
touch "$NPX_CALL_LOG"
n=$(( $(wc -l < "$NPX_CALL_LOG") + 1 ))
echo "call $n: $*" >> "$NPX_CALL_LOG"
if [ "$n" -eq 1 ]; then
  exit 0
fi
exit 1
`;

test('nao regride o caminho feliz: mutacao morta por falha real de teste (sem sinal) continua KILLED com exit 0', () => {
  const res = runScript({
    fakeNpxScript: FAKE_NPX_REAL_KILL,
    args: ['--only=M1'],
  });

  expect(res.status).toBe(0);
  expect(res.stdout).toMatch(/KILLED/);
  expect(res.stdout).toMatch(/Mutation score: 100\.0%/);
  expect(readFileSync(res.ringsFile, 'utf8')).toBe(TAILWIND_RINGS_CONTENT);

  const report = JSON.parse(readFileSync(join(res.outDir, 'mutation-report.json'), 'utf8'));
  expect(report.totals).toEqual({ total: 1, killed: 1, survived: 0, errored: 0, score: 100 });
});

// Baseline sempre OK (vitest fake nunca é chamado para julgar a mutação,
// pois o erro de escrita ocorre antes disso).
const FAKE_NPX_ALWAYS_PASS = `#!/usr/bin/env bash
exit 0
`;

function chattrSupported(dir) {
  const probe = join(dir, '.chattr-probe');
  writeFileSync(probe, 'x');
  const set = spawnSync('chattr', ['+i', probe]);
  if (set.status !== 0) return false;
  spawnSync('chattr', ['-i', probe]);
  rmSync(probe, { force: true });
  return true;
}

test('falha de escrita (EPERM) durante a mutacao vira erro de infraestrutura (exit 2, sem stack trace) em vez de crash', () => {
  const sandbox = makeSandbox('mutation-test-magazine-eperm-');
  if (!chattrSupported(sandbox)) {
    // Filesystem do ambiente (ex.: alguns overlayfs) não suporta o atributo
    // imutável — não há como simular EPERM de forma determinística aqui.
    return;
  }

  const outDir = join(sandbox, 'out');
  const ringsFile = setupSandboxRepo(sandbox);
  const bin = makeFakeNpx(sandbox, FAKE_NPX_ALWAYS_PASS);
  // Torna o arquivo-alvo imutável ANTES de rodar o script, simulando uma
  // falha de escrita (permissão negada / disco somente leitura) no exato
  // momento em que `applyMutation` tenta gravar a mutação.
  spawnSync('chattr', ['+i', ringsFile]);

  let res;
  try {
    res = spawnSync('node', [REAL_SCRIPT, '--only=M1', `--out-dir=${outDir}`], {
      cwd: sandbox,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
  } finally {
    spawnSync('chattr', ['-i', ringsFile]);
  }

  expect(res.status).toBe(2);
  expect(res.stderr).toMatch(/infra error/);
  expect(res.stderr).toMatch(/EPERM/);
  // Sem a correção, isso era uma exceção não tratada do Node (stack trace
  // com "at writeFileSync", exit code 1 em vez do 2 documentado).
  expect(res.stderr).not.toMatch(/at writeFileSync/);
  expect(res.status).not.toBe(1);

  // O arquivo nunca chegou a ser mutado de fato (a escrita falhou antes).
  expect(readFileSync(ringsFile, 'utf8')).toBe(TAILWIND_RINGS_CONTENT);
});
