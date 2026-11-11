// Testa scripts/verify-build-integrity.mjs: gate que roda `vite build` real
// para validar integridade JSX (tags `<motion.*>` pareadas, etc.).
//
// Bug real encontrado em auditoria adversarial: o script usava `spawnSync`,
// que bloqueia a main thread até o filho terminar. Um SIGINT/SIGTERM enviado
// só ao processo do gate (ex.: timeout wrapper, supervisor, Ctrl+C fora do
// terminal foreground) matava o processo pai imediatamente (disposição
// default do sinal, que não espera handler JS) mas NÃO chegava ao `npx` →
// `npm exec` → `vite build` → workers do esbuild, que ficavam órfãos,
// continuando a rodar em background (resource leak) depois do gate já ter
// "terminado". Corrigido trocando para `spawn` assíncrono com o filho em
// grupo de processo próprio (`detached: true`) e repasse explícito de
// SIGINT/SIGTERM para `-child.pid` (o grupo inteiro).
//
// Os testes rodam a CLI real (child_process) contra um sandbox vite mínimo
// em /tmp, reaproveitando node_modules do repo via symlink (vite/React já
// instalados) — nunca builda o app real do repo.
import { afterEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/verify-build-integrity.mjs');
const REAL_NODE_MODULES = resolve(ROOT, 'node_modules');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * Monta um projeto vite mínimo, reaproveitando node_modules do repo via
 * symlink. `slowBuildMs`, quando setado, injeta um plugin cujo `buildStart`
 * dorme esse tempo — usado só pelo teste de SIGINT, pra garantir uma janela
 * larga e não-flaky em que o `vite build` real ainda está rodando quando o
 * sinal é enviado (sem isso, um build trivial termina sozinho em menos de
 * 400ms e o teste não consegue observar o processo órfão de forma confiável).
 */
function buildSandbox(mainSrc, { slowBuildMs } = {}) {
  const sbx = mkdtempSync(join(tmpdir(), 'verify-build-integrity-sbx-'));
  temporaryRoots.push(sbx);
  mkdirSync(join(sbx, 'scripts'), { recursive: true });
  mkdirSync(join(sbx, 'src'), { recursive: true });
  symlinkSync(REAL_NODE_MODULES, join(sbx, 'node_modules'));
  writeFileSync(join(sbx, 'scripts/verify-build-integrity.mjs'), readFileSync(REAL_SCRIPT));
  writeFileSync(
    join(sbx, 'package.json'),
    JSON.stringify({ name: 'vbi-sbx', private: true, type: 'module', version: '0.0.0' }),
  );
  const slowPlugin = slowBuildMs
    ? `{ name: 'slow-build-for-test', async buildStart() { await new Promise((r) => setTimeout(r, ${slowBuildMs})); } }`
    : '';
  writeFileSync(
    join(sbx, 'vite.config.js'),
    `import { defineConfig } from 'vite';\nexport default defineConfig({ plugins: [${slowPlugin}] });\n`,
  );
  writeFileSync(
    join(sbx, 'index.html'),
    '<!doctype html><html><body><script type="module" src="/src/main.js"></script></body></html>\n',
  );
  writeFileSync(join(sbx, 'src/main.js'), mainSrc);
  return sbx;
}

function runCli(sbx) {
  const result = spawnSync(process.execPath, [join(sbx, 'scripts/verify-build-integrity.mjs')], {
    cwd: sbx,
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('verify-build-integrity.mjs', () => {
  it('build válido passa o gate com exit 0', () => {
    const sbx = buildSandbox('export const x = 1;\n');
    const { code, stdout } = runCli(sbx);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Build OK/);
  });

  it('build com erro (import inexistente) falha o gate com exit 1', () => {
    const sbx = buildSandbox("import './nao-existe-arquivo-nenhum.js';\n");
    const { code, stdout, stderr } = runCli(sbx);
    expect(code).toBe(1);
    expect(stdout + stderr).toMatch(/Build falhou/);
  });

  // ───────────────────────────────────────────────────────────────────────
  // Bug real: SIGINT enviado só ao processo do gate deixava `npx`/`vite`
  // órfãos rodando em background (resource leak) em vez de serem
  // encerrados junto com o gate.
  // ───────────────────────────────────────────────────────────────────────
  it('SIGINT no gate encerra o processo filho (vite build) em vez de deixá-lo órfão', async () => {
    // Build artificialmente lento (3s) para que o processo real do `vite
    // build` esteja garantidamente no meio da execução quando o SIGINT é
    // enviado — sem isso o build termina sozinho antes do pgrep conseguir
    // observar o estado (falso "sem leak" por timing, não por correção).
    const sbx = buildSandbox('export const x = 1;\n', { slowBuildMs: 3000 });
    const scriptPath = join(sbx, 'scripts/verify-build-integrity.mjs');

    const child = spawn(process.execPath, [scriptPath], { cwd: sbx });
    let stdout = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    const exited = new Promise((res) => child.on('exit', (code, signal) => res({ code, signal })));

    // Espera o build começar de fato (linha de log inicial) antes de
    // interromper, para garantir que o `npx vite build` já foi spawnado.
    await new Promise((res) => {
      const check = setInterval(() => {
        if (stdout.includes('Rodando vite build')) {
          clearInterval(check);
          res();
        }
      }, 20);
    });
    // Dá tempo de npx/npm exec/vite realmente entrarem no buildStart (que
    // vai dormir por slowBuildMs) antes de interromper.
    await new Promise((res) => setTimeout(res, 600));

    child.kill('SIGINT');
    await exited;

    // Checa logo após o gate terminar — ainda bem dentro da janela de 3s
    // do plugin lento, então o filho só pode estar ausente se o sinal foi
    // de fato repassado a ele (fix), nunca por ter terminado sozinho.
    await new Promise((res) => setTimeout(res, 150));

    const ps = spawnSync('pgrep', ['-af', 'vite build'], { encoding: 'utf8' });
    const leaked = (ps.stdout ?? '').trim();
    expect(leaked).toBe('');
  }, 15000);

  it('gate sempre termina com exit 0 ou 1 (nunca propaga código de saída arbitrário do filho)', () => {
    // PATH sem `sh` utilizável faz `npm exec` falhar internamente com um
    // exit code não normalizado (ex.: 254) — o gate deve mapear qualquer
    // falha para exit 1, nunca vazar o código bruto do processo filho.
    const sbx = buildSandbox('export const x = 1;\n');
    const nodeDir = dirname(process.execPath);
    const result = spawnSync(
      process.execPath,
      [join(sbx, 'scripts/verify-build-integrity.mjs')],
      { cwd: sbx, encoding: 'utf8', env: { PATH: nodeDir } },
    );
    expect(result.status).not.toBeNull();
    expect([0, 1]).toContain(result.status);
  });
});
