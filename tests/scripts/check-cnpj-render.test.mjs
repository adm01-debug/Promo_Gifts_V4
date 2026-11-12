import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-cnpj-render.mjs');

/** Cria um diretório temporário com os arquivos dados (relativos, dentro de src/). */
function makeFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'cnpj-gate-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return dir;
}

function runGate(dir) {
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

test('detecta render cru de CNPJ em JSX', () => {
  const dir = makeFixture({
    'src/A.tsx': 'export const A = ({ company }) => <div>{company.cnpj}</div>;\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /src\/A\.tsx/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignora quando maskCnpj já envolve o valor na mesma linha', () => {
  const dir = makeFixture({
    'src/B.tsx':
      "import { maskCnpj } from '@/utils/masks';\nexport const B = ({ c }) => <div>{maskCnpj(c.cnpj)}</div>;\n",
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detecta mutação insert/update/upsert com cnpj sem SSOT por perto', () => {
  const dir = makeFixture({
    'src/M.ts':
      "async function save(x) {\n  await supabase.from('clients').insert({\n    name: x.name,\n    cnpj: x.cnpj,\n  });\n}\n",
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /B6/);
    assert.match(r.out, /src\/M\.ts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignora mutação quando normalizeCnpj aparece antes do insert', () => {
  const dir = makeFixture({
    'src/M2.ts':
      "import { normalizeCnpj } from '@/utils/cnpj-schema';\nasync function save(x) {\n  const cnpj = normalizeCnpj(x.cnpj);\n  await supabase.from('clients').insert({\n    name: x.name,\n    cnpj,\n  });\n}\n",
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignora arquivos allowlistados (masks.ts, __tests__, .test.tsx)', () => {
  const dir = makeFixture({
    'src/utils/masks.ts': 'export const demo = () => <div>{x.cnpj}</div>;\n',
    'src/utils/__tests__/masks.spec.tsx': 'export const demo = () => <div>{x.cnpj}</div>;\n',
    'src/Comp.test.tsx': 'export const demo = () => <div>{x.cnpj}</div>;\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('funciona com BOM UTF-8 e CRLF sem crashar e sem perder a violação', () => {
  const dir = makeFixture({});
  try {
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/Bom.tsx'),
      '﻿export const A = ({ c }) => <div>{c.cnpj}</div>;\r\n',
    );
    const r = runGate(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /src\/Bom\.tsx/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Bug real encontrado: um comentário de bloco de uma linha só, ex.
// `/* {x.cnpj} nota antiga */`, não batia em nenhum padrão de
// CONTEXT_IGNORES (só `// ...` e ` * ...` de continuação eram cobertos) e
// virava falso-positivo de B1. Sem o fix, este teste falha (code === 1).
test('não gera falso-positivo em comentário de bloco de uma linha (/* ... */)', () => {
  const dir = makeFixture({
    'src/Commented.tsx':
      '// exemplo antigo: {x.cnpj} já corrigido\n/* {x.cnpj} nota antiga, código morto */\nexport const ok = () => <div>seguro</div>;\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Bug real encontrado: readFileSync sem try/catch. Se um arquivo listado pelo
// walk() some do disco exatamente entre a listagem (readdirSync) e a leitura
// (readFileSync) — uma race condition real, mesma classe de bug já corrigida
// em check-auth-direct-calls.mjs — o processo morria com uma exceção não
// tratada (stack trace cru) em vez de reportar o gate normalmente. Reproduz a
// race de verdade (não apenas apagar o arquivo antes de rodar, o que faria o
// readdirSync nem listá-lo): um harness intercepta fs.readFileSync e apaga o
// arquivo-alvo bem no instante em que o gate tenta lê-lo. Sem o fix, este
// teste falha: o processo sai com uma exceção Node não tratada e stderr não
// contém o aviso esperado.
test('não quebra quando um arquivo listado some do disco bem entre a listagem e a leitura (race condition)', () => {
  const dir = makeFixture({
    'src/A_desaparece.ts': 'export const a = 1;\n',
    'src/B_fica.tsx': 'export const b = () => <div>{x.cnpj}</div>;\n',
  });
  // .cjs (não .mjs): só o `require('node:fs')` do CommonJS retorna o objeto
  // de exports mutável que o binding nomeado do ESM (`import { readFileSync }`)
  // de fato relê em tempo de chamada — um `import fsmod from 'node:fs'` em
  // outro módulo ESM captura um valor estático e NÃO reflete o monkeypatch.
  const harness = join(dir, '_race-harness.cjs');
  try {
    const target = join(dir, 'src/A_desaparece.ts');
    const scriptUrl = new URL(`file://${SCRIPT.replace(/\\/g, '/')}`).href;
    writeFileSync(
      harness,
      [
        "const fsmod = require('node:fs');",
        `const TARGET = ${JSON.stringify(target)};`,
        'const origRead = fsmod.readFileSync;',
        'fsmod.readFileSync = function (path, ...rest) {',
        '  if (String(path) === TARGET) {',
        '    try { fsmod.unlinkSync(path); } catch {}',
        '  }',
        '  return origRead.call(this, path, ...rest);',
        '};',
        `import(${JSON.stringify(scriptUrl)});`,
      ].join('\n'),
    );
    const r = spawnSync(process.execPath, [harness], { cwd: dir, encoding: 'utf8' });
    const out = `${r.stdout}\n${r.stderr}`;
    assert.equal(r.status, 1); // ainda deve reportar a violação real em B_fica.tsx
    assert.doesNotMatch(out, /Error: ENOENT[\s\S]*at readFileSync/);
    assert.match(out, /Não foi possível ler/);
    assert.match(out, /src[\\/]A_desaparece\.ts/);
    assert.match(out, /src[\\/]B_fica\.tsx/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('não quebra quando um arquivo listado perde permissão de leitura', () => {
  if (process.getuid && process.getuid() === 0) {
    // Em CI/sandbox rodando como root, chmod 000 não bloqueia a leitura —
    // o cenário de EACCES não é reproduzível nesse contexto.
    return;
  }
  const dir = makeFixture({
    'src/Secreto.tsx': 'export const s = () => <div>{x.cnpj}</div>;\n',
    'src/Ok.tsx': 'export const ok = () => <div>seguro</div>;\n',
  });
  try {
    chmodSync(join(dir, 'src/Secreto.tsx'), 0o000);
    const r = runGate(dir);
    assert.equal(r.code, 0);
    assert.match(r.out, /Não foi possível ler/);
    assert.doesNotMatch(r.out, /Error: EACCES[\s\S]*at readFileSync/);
  } finally {
    chmodSync(join(dir, 'src/Secreto.tsx'), 0o644);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('src/ vazio não falha e reporta 0 arquivos escaneados', () => {
  const dir = makeFixture({});
  mkdirSync(join(dir, 'src'), { recursive: true });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
    assert.match(r.out, /arquivos escaneados: 0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
