/**
 * Regressão: quando o binário `npm` não existe no PATH (ex.: ambiente de CI mal configurado),
 * o spawn emite um evento 'error' sem listener e o Node derruba o processo com um stack trace
 * bruto ("Unhandled 'error' event" / "spawn npm ENOENT"), em vez da mensagem clara de falha
 * que o próprio script usa para os demais casos (❌ ...). Reproduzido com um PATH que só
 * contém o binário `node` (sem `npm`), forçando ENOENT no spawn.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-build-warnings.mjs');

const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** PATH isolado contendo só `node` (symlink), sem `npm`. */
function pathWithoutNpm() {
  const binDir = mkdtempSync(join(tmpdir(), 'cbw-no-npm-'));
  dirs.push(binDir);
  symlinkSync(process.execPath, join(binDir, 'node'));
  return binDir;
}

describe('check-build-warnings: npm ausente no PATH (spawn ENOENT)', () => {
  it('falha com mensagem clara e sem stack trace não tratado', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'cbw-cwd-'));
    dirs.push(cwd);

    const r = spawnSync(process.execPath, [SCRIPT], {
      cwd,
      encoding: 'utf8',
      env: { PATH: pathWithoutNpm() },
    });

    expect(r.status).toBe(1);
    // Mensagem de erro clara e acionável do próprio script.
    expect(r.stdout + r.stderr).toContain('Falha ao iniciar o build');
    // Antes da correção, o processo morria com um stack trace de evento não tratado.
    expect(r.stderr).not.toContain("Unhandled 'error' event");
    expect(r.stderr).not.toContain('spawn npm ENOENT');
  });
});
