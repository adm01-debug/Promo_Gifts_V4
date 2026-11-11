// Testa scripts/gen-edge-live-tests.mjs, o gerador idempotente de shims de
// teste LIVE (tests/edge-functions/live/<fn>.test.ts) para cada edge function
// deployada (supabase/functions/<fn>/index.ts).
//
// O script não exporta funções puras (tudo roda no top-level ao ser
// importado), então o padrão aqui é integração CLI real via spawnSync, com
// cwd apontando para uma fixture temporária — mesmo padrão de
// tests/scripts/check-edge-live-coverage.test.mjs.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/gen-edge-live-tests.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'gen-edge-live-tests-'));
  temporaryRoots.push(dir);
  return dir;
}

function writeFn(root, name, content = 'Deno.serve(() => new Response("ok"));') {
  const dir = join(root, 'supabase', 'functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), content);
}

function liveDirOf(root) {
  return join(root, 'tests', 'edge-functions', 'live');
}

function runGen(root, args = []) {
  return spawnSync('node', [SCRIPT, ...args], { cwd: root, encoding: 'utf8', timeout: 10000 });
}

describe('gen-edge-live-tests — cenários básicos', () => {
  it('cria um shim por função com index.ts, chamando runLiveSuite(descriptorFor(...))', () => {
    const root = tempRepo();
    writeFn(root, 'fn-a');
    writeFn(root, 'fn-b');
    const r = runGen(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/funções: 2, criados: 2, mantidos: 0/);
    const files = readdirSync(liveDirOf(root)).sort();
    expect(files).toEqual(['fn-a.test.ts', 'fn-b.test.ts']);
    const content = readFileSync(join(liveDirOf(root), 'fn-a.test.ts'), 'utf8');
    expect(content).toMatch(/runLiveSuite\(descriptorFor\("fn-a"\)\)/);
  });

  it('ignora supabase/functions/_shared e /tests mesmo com index.ts', () => {
    const root = tempRepo();
    writeFn(root, '_shared');
    writeFn(root, 'tests');
    const r = runGen(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/funções: 0, criados: 0, mantidos: 0/);
  });

  it('ignora pasta de função sem index.ts', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions', 'no-index'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'functions', 'no-index', 'README.md'), 'sem index');
    const r = runGen(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/funções: 0/);
  });

  it('é idempotente: segunda rodada sem --force não sobrescreve customização manual', () => {
    const root = tempRepo();
    writeFn(root, 'fn-a');
    runGen(root);
    const file = join(liveDirOf(root), 'fn-a.test.ts');
    writeFileSync(file, '// customizado a mão\n');
    const r = runGen(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/criados: 0, mantidos: 1/);
    expect(readFileSync(file, 'utf8')).toBe('// customizado a mão\n');
  });

  it('--force sobrescreve o shim mesmo que já exista', () => {
    const root = tempRepo();
    writeFn(root, 'fn-a');
    runGen(root);
    const file = join(liveDirOf(root), 'fn-a.test.ts');
    writeFileSync(file, '// customizado a mão\n');
    const r = runGen(root, ['--force']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/criados: 1/);
    expect(readFileSync(file, 'utf8')).toMatch(/runLiveSuite/);
  });
});

// Regressão: nomes de pasta de função eram interpolados sem escape dentro do
// template do shim (`descriptorFor("${fn}")`). Um nome de função contendo
// aspas duplas (caractere válido em nome de diretório no Linux) fechava a
// string JS prematuramente e o restante do nome virava código executável no
// arquivo gerado — ex.: fn = `evil"));console.log(1337);(function(){("".`
// produzia a linha
//   runLiveSuite(descriptorFor("evil"));console.log(1337);(function(){("".""));
// que, ao ser carregada pelo vitest como teste LIVE real, executaria o
// `console.log(1337)` injetado como código, não como dado. Rodado de fato
// (spawnSync real) antes e depois do fix, que agora usa JSON.stringify(fn)
// para escapar corretamente o nome da função ao gerar o literal de string.
describe('gen-edge-live-tests — injeção via nome de função com aspas (regressão)', () => {
  it('escapa aspas duplas no nome da função ao invés de quebrar o literal de string', () => {
    const root = tempRepo();
    const fn = 'evil"));console.log(1337);(function(){("".';
    writeFn(root, fn);
    const r = runGen(root);
    expect(r.status).toBe(0);

    const files = readdirSync(liveDirOf(root));
    expect(files).toHaveLength(1);
    const content = readFileSync(join(liveDirOf(root), files[0]), 'utf8');
    const callLine = content.split('\n').find((l) => l.startsWith('runLiveSuite'));

    // A chamada deve conter UMA única string literal fechada corretamente —
    // nunca duas chamadas/expressões (o que indicaria quebra de string).
    expect(callLine).toMatch(/^runLiveSuite\(descriptorFor\(".*"\)\);$/);

    // Confirma execução real: o literal gerado é sintaticamente válido e,
    // ao ser avaliado com runLiveSuite/descriptorFor mockados, o payload é
    // passado como argumento de string — console.log(1337) NUNCA é chamado.
    let loggedInjected = false;
    let receivedArg = null;
    vm.runInNewContext(callLine, {
      console: { log: (...a) => { if (a[0] === 1337) loggedInjected = true; } },
      descriptorFor: (x) => x,
      runLiveSuite: (x) => { receivedArg = x; },
    });
    expect(loggedInjected).toBe(false);
    expect(receivedArg).toBe(fn);
  });
});
