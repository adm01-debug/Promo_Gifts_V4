/**
 * Testes para scripts/check-doc-refs.mjs
 *
 * Cobre dois bugs reais encontrados em auditoria adversarial do script:
 *
 * 1) Performance O(refs × tamanho do arquivo): `countLines()` relia o
 *    arquivo-alvo do zero para CADA referência `path:linha` encontrada no
 *    documento, mesmo quando múltiplas referências apontam para o mesmo
 *    arquivo. Um documento com muitas referências de linha distintas para um
 *    mesmo arquivo grande (ex.: types.ts gerado) fica proibitivamente lento
 *    (demonstrado: 4000 refs × arquivo de 60k linhas ~7.3s sem cache vs
 *    ~0.05s com cache). Corrigido com um `Map` de cache por caminho absoluto.
 *
 * 2) Crash não tratado: quando o argumento passado é um caminho que existe
 *    mas é um DIRETÓRIO (não arquivo), `readFileSync(abs, 'utf8')` lançava
 *    `EISDIR` sem tratamento, derrubando o processo com stack trace do
 *    Node em vez do relatório de erro controlado do próprio script.
 *    Corrigido com try/catch (mesmo padrão já usado para `statSync` no
 *    arquivo-alvo, poucas linhas abaixo no script original).
 */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-doc-refs.mjs');

function run(sandbox, args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: sandbox,
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'docs'), { recursive: true });
  mkdirSync(join(sandbox, 'src/components'), { recursive: true });
  return sandbox;
}

// ─────────────────────────────────────────────────────────────────────────
// Bug 1: performance — cache de countLines() por arquivo
// ─────────────────────────────────────────────────────────────────────────

test('muitas referências de linha distintas para o mesmo arquivo grande resolvem rápido (regressão de performance)', () => {
  const sandbox = makeSandbox('doc-refs-perf-');
  try {
    // Arquivo-alvo com 60.000 linhas (~800KB) — grande o suficiente para que
    // reler e re-escanear o arquivo a cada referência seja perceptível.
    const lines = [];
    for (let i = 0; i < 60000; i++) lines.push(`const x${i} = ${i};`);
    writeFileSync(join(sandbox, 'src/components/Big.tsx'), lines.join('\n') + '\n');

    // 4000 referências de LINHA DISTINTA para o mesmo arquivo.
    const docLines = [];
    for (let i = 1; i <= 4000; i++) {
      docLines.push(`Ref: \`src/components/Big.tsx:${i}\` detalhe.`);
    }
    writeFileSync(join(sandbox, 'docs/big.md'), docLines.join('\n') + '\n');

    const start = Date.now();
    const { code, stdout } = run(sandbox, ['docs/big.md']);
    const elapsedMs = Date.now() - start;

    expect(code).toBe(0);
    expect(stdout).toMatch(/4000 referência\(s\) verificada\(s\)/);
    // Sem cache, este mesmo cenário mediu ~7.3s neste ambiente; com cache,
    // ~0.05s. 3000ms dá margem generosa sobre variação de máquina/CI sem
    // deixar a regressão (O(refs × tamanho do arquivo)) passar batido.
    expect(
      elapsedMs,
      `esperado completar bem abaixo de 3000ms com cache; levou ${elapsedMs}ms`,
    ).toBeLessThan(3000);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('detecta referência de linha inválida mesmo com cache de contagem de linhas (correção não quebra o gate)', () => {
  const sandbox = makeSandbox('doc-refs-perf-regress-');
  try {
    writeFileSync(join(sandbox, 'src/components/Foo.tsx'), 'a\nb\nc\n');
    writeFileSync(
      join(sandbox, 'docs/refs.md'),
      'Válida: `src/components/Foo.tsx:2`\nInválida: `src/components/Foo.tsx:99`\n',
    );

    const { code, stderr } = run(sandbox, ['docs/refs.md']);

    expect(code).toBe(1);
    expect(stderr).toMatch(/src\/components\/Foo\.tsx:99: linha 99 não existe \(.*3 linhas\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 2: crash EISDIR ao passar um diretório como argumento
// ─────────────────────────────────────────────────────────────────────────

test('argumento que é um diretório (não arquivo) reporta erro controlado em vez de crashar com EISDIR', () => {
  const sandbox = makeSandbox('doc-refs-eisdir-');
  try {
    // Caminho que "parece" um .md mas é, na verdade, um diretório.
    mkdirSync(join(sandbox, 'docs/weird.md'), { recursive: true });

    const { code, stdout, stderr } = run(sandbox, ['docs/weird.md']);

    // Antes da correção: processo morria com stack trace do Node
    // (`Error: EISDIR...` não capturado) e sem seguir o formato de
    // relatório do próprio script.
    expect(stderr).not.toMatch(/at readFileSync/);
    expect(stderr).not.toMatch(/at ModuleJob\.run/);

    // Depois da correção: erro reportado no formato padrão do script,
    // exit code 1 (referência inválida), não um crash não controlado.
    expect(code).toBe(1);
    expect(stdout + stderr).toMatch(/docs\/weird\.md: erro ao ler/);
    expect(stdout + stderr).toMatch(/EISDIR/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Regressão geral: comportamento documentado no cabeçalho do script
// ─────────────────────────────────────────────────────────────────────────

test('exit 2 sem argumentos', () => {
  const sandbox = makeSandbox('doc-refs-noargs-');
  try {
    const { code, stderr } = run(sandbox, []);
    expect(code).toBe(2);
    expect(stderr).toMatch(/Uso: node scripts\/check-doc-refs\.mjs/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('documento inexistente reporta erro e exit 1', () => {
  const sandbox = makeSandbox('doc-refs-missingdoc-');
  try {
    const { code, stderr } = run(sandbox, ['docs/nope.md']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/Documento não encontrado: docs\/nope\.md/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('referência dentro de bloco de código (fence) é ignorada', () => {
  const sandbox = makeSandbox('doc-refs-fence-');
  try {
    writeFileSync(
      join(sandbox, 'docs/fence.md'),
      '```\nsrc/components/NaoExiste.tsx:999\n```\nTexto real.\n',
    );
    const { code, stdout } = run(sandbox, ['docs/fence.md']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/0 referência\(s\) verificada\(s\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('referência para arquivo fora do allowlist de prefixos é ignorada', () => {
  const sandbox = makeSandbox('doc-refs-notallowed-');
  try {
    writeFileSync(join(sandbox, 'docs/outside.md'), 'Ver foo.bar:12 e example.com para mais.\n');
    const { code, stdout } = run(sandbox, ['docs/outside.md']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/0 referência\(s\) verificada\(s\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
