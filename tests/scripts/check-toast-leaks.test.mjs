// Testa scripts/check-toast-leaks.mjs: gate estático contra vazamento de texto
// técnico em toasts (`toast.error(err.message)` etc.), com baseline de legado
// em `.toast-leaks-baseline.json`.
//
// O script não exporta funções (main() roda direto no import) e depende de
// `git ls-files src`, então os testes rodam via CLI real (spawnSync) em um
// sandbox git próprio em /tmp — nunca toca no `.toast-leaks-baseline.json`
// real do repo.
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/check-toast-leaks.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** Monta um sandbox git próprio com o script e um src/ configurável. */
function buildSandbox(files) {
  const sbx = mkdtempSync(join(tmpdir(), 'toast-leaks-sbx-'));
  temporaryRoots.push(sbx);
  mkdirSync(join(sbx, 'scripts'), { recursive: true });
  cpSync(REAL_SCRIPT, join(sbx, 'scripts/check-toast-leaks.mjs'));
  for (const [relPath, content] of Object.entries(files ?? {})) {
    const abs = join(sbx, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  execFileSync('git', ['init', '-q'], { cwd: sbx });
  execFileSync('git', ['config', 'user.email', 'a@a.com'], { cwd: sbx });
  execFileSync('git', ['config', 'user.name', 'a'], { cwd: sbx });
  execFileSync('git', ['add', '-A'], { cwd: sbx });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: sbx });
  return { sbx, script: join(sbx, 'scripts/check-toast-leaks.mjs') };
}

function run(script, cwd, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  return spawnSync('node', [script], { cwd, env, encoding: 'utf8' });
}

// ─── Bug real encontrado e corrigido: BOM UTF-8 na baseline ───────────────
// Antes da correção, uma baseline salva com BOM (comum em editores Windows,
// PowerShell `Out-File` etc.) quebrava o JSON.parse; o catch silencioso
// descartava a baseline inteira (`{ entries: [] }`), fazendo TODO o legado
// virar "novo" e o gate falhar em CI mesmo sem nenhuma regressão real.
// Prova: sem o `.replace(/^﻿/, '')`, este teste falha (exit 1 em vez
// de 0, e a saída não contém "0 novo(s)").
describe('BOM UTF-8 na baseline não quebra o gate (regressão)', () => {
  it('baseline com BOM continua tratando o legado como legado', () => {
    const { sbx, script } = buildSandbox({
      'src/components/Foo.tsx': "toast.error(err.message);\n",
    });
    const baselinePath = join(sbx, '.toast-leaks-baseline.json');
    const payload = JSON.stringify({
      entries: [
        { file: 'src/components/Foo.tsx', line: 1, snippet: 'toast.error(err.message);' },
      ],
    });
    writeFileSync(baselinePath, '﻿' + payload);

    const result = run(script, sbx);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 novo(s)');
  });
});

// ─── Bug real encontrado e corrigido: paths não-ASCII ficavam "quoted" ────
// pelo `git ls-files` sem `-z`, gerando um caminho com aspas/escapes em
// octal (ex.: "src/componentes/pasta com espa\303\247o/Foo.tsx") que o
// readFileSync não conseguia abrir — o catch por-arquivo então pulava o
// arquivo em silêncio, e um leak real nunca era reportado (falso-negativo
// do gate). Prova: sem `git ls-files -z` + split em '\0', este teste falha
// (exit 0 em vez de 1, leak não aparece na saída).
describe('Arquivos com caracteres não-ASCII no path são verificados (regressão)', () => {
  it('detecta leak em arquivo dentro de pasta com acento', () => {
    const { sbx, script } = buildSandbox({
      'src/componentes/pasta com acentuação/Foo.tsx': 'toast.error(err.message);\n',
    });

    const result = run(script, sbx);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('pasta com acentuação/Foo.tsx');
  });
});

describe('Comportamento básico do gate (sanity)', () => {
  it('sem leaks e sem baseline: passa com 0 legado(s), 0 novo(s)', () => {
    const { sbx, script } = buildSandbox({
      'src/components/Clean.tsx': "console.log('ok');\n",
    });
    const result = run(script, sbx);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 legado(s), 0 novo(s)');
  });

  it('UPDATE_BASELINE=1 regrava a baseline e a corrida seguinte passa', () => {
    const { sbx, script } = buildSandbox({
      'src/components/Foo.tsx': 'toast.error(err.message);\n',
    });
    const first = run(script, sbx, { UPDATE_BASELINE: '1' });
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('Baseline regravada');

    const second = run(script, sbx);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('1 legado(s), 0 novo(s)');
  });
});
