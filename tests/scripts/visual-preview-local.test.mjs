/**
 * Regressão: o trap de limpeza do dev server (`trap 'kill ${DEV_PID} ...' EXIT`) só
 * enviava o sinal e nunca esperava o processo terminar de fato. O script podia
 * devolver o controle ao chamador (exit 0/1/124/130) com o dev server ainda VIVO
 * e a porta 8080 ainda ocupada — reproduzido manualmente de forma determinística
 * (5/5 execuções) antes da correção. Fix: `wait` após o `kill` no trap.
 *
 * Sandbox: stubs de node/npx/npm/curl/timeout via PATH, sem rede real, sem
 * Playwright real e sem porta 8080 real.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const SCRIPT = 'scripts/visual-preview-local.sh';
const NODE_BIN = process.execPath;
const KILL_DELAY_SECONDS = '0.3';

const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'visual-preview-local-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'fakebin'), { recursive: true });

  writeFileSync(join(dir, 'scripts/visual-preview-local.sh'), readFileSync(join(ROOT, SCRIPT)));
  chmodSync(join(dir, 'scripts/visual-preview-local.sh'), 0o755);

  // Guarda de presença (1/4): sempre passa.
  writeFileSync(join(dir, 'scripts/check-visual-preview-suite.mjs'), 'process.exit(0);\n');

  // node: delega para o node real via caminho absoluto (evita recursão via PATH).
  writeFileSync(
    join(dir, 'fakebin/node'),
    `#!/usr/bin/env bash\nexec "${NODE_BIN}" "$@"\n`,
  );
  // npx: "install" não faz nada; "test" também não faz nada (não é o foco deste teste).
  writeFileSync(
    join(dir, 'fakebin/npx'),
    '#!/usr/bin/env bash\nexit 0\n',
  );
  // npm: "run dev" sobe um processo que só morre ao receber TERM, e demora
  // KILL_DELAY_SECONDS para terminar de fato — amplia a janela de corrida para
  // tornar o teste determinístico em qualquer máquina.
  writeFileSync(
    join(dir, 'fakebin/npm'),
    [
      '#!/usr/bin/env bash',
      `trap 'sleep ${KILL_DELAY_SECONDS}; touch dev-stopped; exit 0' TERM INT`,
      'touch dev-started',
      'while true; do sleep 1; done',
      '',
    ].join('\n'),
  );
  // curl: reporta "up" assim que dev-started existir (simula health-check real).
  writeFileSync(
    join(dir, 'fakebin/curl'),
    '#!/usr/bin/env bash\n[ -f dev-started ] && exit 0 || exit 7\n',
  );
  // timeout: delega para o timeout real sem alterar a duração.
  writeFileSync(
    join(dir, 'fakebin/timeout'),
    '#!/usr/bin/env bash\nexec /usr/bin/timeout "$@"\n',
  );
  for (const f of ['node', 'npx', 'npm', 'curl', 'timeout']) {
    chmodSync(join(dir, `fakebin/${f}`), 0o755);
  }
  return dir;
}

const runScript = (dir) =>
  spawnSync('bash', ['scripts/visual-preview-local.sh'], {
    cwd: dir,
    encoding: 'utf8',
    env: { PATH: `${join(dir, 'fakebin')}:${process.env.PATH}` },
  });

describe('visual-preview-local.sh — cleanup do dev server no EXIT', () => {
  it('só devolve o controle ao chamador depois do dev server ter terminado de verdade (não só recebido o sinal)', () => {
    const dir = sandbox();
    const r = runScript(dir);

    expect(r.status).toBe(0);
    // Prova direta de que o trap ESPEROU o processo terminar: o marcador só é
    // escrito ~300ms após o TERM. Sem `wait` no trap, o script volta ao
    // chamador antes dessa escrita acontecer e esta asserção falha.
    expect(existsSync(join(dir, 'dev-stopped'))).toBe(true);
  });
});
