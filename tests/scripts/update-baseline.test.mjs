// Testa scripts/update-baseline.sh.
//
// Regressão: o script não tinha `set -e`, então quando `bunx playwright test
// --update-snapshots` falhava (ex.: webserver do Playwright não sobe), o
// script seguia para as linhas seguintes e imprimia "✅ Baselines atualizados
// com sucesso!" com exit code 0 — sucesso falso-positivo que escondia uma
// falha real do Playwright.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(import.meta.dirname, '../../scripts/update-baseline.sh');

const dirs = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

// Cria um `bunx` falso no PATH que só repassa o exit code pedido, sem
// depender do Playwright/bun real.
function fakeBunx(exitCode) {
  const bin = mkdtempSync(join(tmpdir(), 'update-baseline-bin-'));
  dirs.push(bin);
  // O script roda o Playwright via npx (o projeto usa npm; bunx não é dependência).
  for (const name of ['npx', 'bunx']) {
    writeFileSync(join(bin, name), `#!/bin/sh\necho "fake ${name} $*"\nexit ${exitCode}\n`);
    chmodSync(join(bin, name), 0o755);
  }
  return bin;
}

function run(exitCode) {
  const bin = fakeBunx(exitCode);
  return spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    env: { PATH: `${bin}:${process.env.PATH}` },
  });
}

describe('update-baseline.sh', () => {
  it('falha fechado: não reporta sucesso quando o playwright falha', () => {
    const r = run(1);
    expect(r.status).not.toBe(0);
    expect(r.stdout).not.toContain('sucesso');
  });

  it('reporta sucesso só quando o playwright realmente passa', () => {
    const r = run(0);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Baselines atualizados com sucesso!');
  });
});
