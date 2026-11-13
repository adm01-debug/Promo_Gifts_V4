import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, unlinkSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-seller-scope.mjs');

function makeDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'seller-scope-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return dir;
}

function runGate(dir, args = []) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

test('detecta query sem seller scope em tabela crítica (orders)', () => {
  const dir = makeDir({
    'src/foo.ts':
      'supabase.from("orders").select("*");\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /src\/foo\.ts:1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('aceita .eq("seller_id", ...) como scope aplicado', () => {
  const dir = makeDir({
    'src/foo.ts':
      'supabase.from("orders").select("*").eq("seller_id", userId);\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('aceita anotação // rls-allow: na linha anterior', () => {
  const dir = makeDir({
    'src/foo.ts':
      '// rls-allow: admin scope documentado\nsupabase.from("orders").select("*");\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('não quebra quando src/ não existe (projeto sem o diretório) — antes crashava com ENOENT não tratado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'seller-scope-'));
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
    assert.doesNotMatch(r.out, /Error: ENOENT|at readdirSync/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Bug real encontrado: um arquivo listado por readdirSync podia desaparecer
// (deletado por outro processo, race condition) entre a varredura (walk) e a
// leitura (readFileSync). O readFileSync correspondente não tinha try/catch e
// derrubava o processo inteiro com uma stack trace crua de ENOENT em vez do
// relatório normal do gate. Sem o fix, este teste falha (o processo morre com
// exceção não tratada e o código de saída não reflete o resultado do gate).
test('não quebra quando um arquivo listado desaparece do disco antes da leitura (race condition)', async () => {
  // Muitos arquivos de enchimento para dar tempo real de parede entre o
  // walk() (que lista 'zzz_target.ts', alfabeticamente o último) e o
  // readFileSync() correspondente, enquanto um processo concorrente o apaga.
  const files = {};
  for (let i = 0; i < 2000; i++) {
    files[`src/filler_${String(i).padStart(4, '0')}.ts`] = `export const v${i} = ${i};\n`;
  }
  files['src/zzz_target.ts'] = 'supabase.from("orders").select("*");\n';
  const dir = makeDir(files);
  try {
    const child = spawn(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    setTimeout(() => {
      try {
        unlinkSync(join(dir, 'src/zzz_target.ts'));
      } catch {
        // já apagado ou processo terminou antes — não afeta a asserção principal
      }
    }, 30);
    const code = await new Promise((res) => child.on('close', res));
    assert.equal(code, 0);
    assert.doesNotMatch(out, /Error: ENOENT|at readFileSync/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Bug real encontrado: um symlink dentro de src/ apontando para um ancestral
// (loop) fazia statSync lançar ELOOP sem tratamento, derrubando o processo
// com stack trace crua em vez do relatório normal do gate. Sem o fix, este
// teste falha (exceção não tratada, exit code não determinístico).
test('não quebra com um symlink em loop dentro de src/ (ELOOP)', () => {
  const dir = makeDir({
    'src/sub/.keep': '',
  });
  try {
    symlinkSync(join(dir, 'src/sub'), join(dir, 'src/sub/loop'));
    const r = runGate(dir);
    assert.equal(r.code, 0);
    assert.doesNotMatch(r.out, /Error: ELOOP|at statSync/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Bug real encontrado: o regex de detecção de `.from(...)` só reconhecia
// aspas simples e duplas. `.from(\`orders\`)` (template literal, JS/TS válido
// e que de fato consulta a tabela real) passava batido, sem violação
// reportada — falso-negativo do próprio propósito do gate. Sem o fix, este
// teste falha (exit code 0 mesmo sem nenhum scope de seller aplicado).
test('detecta .from() com template literal (backtick) — antes era falso-negativo', () => {
  const dir = makeDir({
    'src/foo.ts': 'supabase.from(`orders`).select("*");\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /src\/foo\.ts:1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignora diretório __tests__ e arquivos .test.ts', () => {
  const dir = makeDir({
    'src/__tests__/foo.ts': 'supabase.from("orders").select("*");\n',
    'src/bar.test.ts': 'supabase.from("orders").select("*");\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('saída --json reporta violações em formato estruturado', () => {
  const dir = makeDir({
    'src/foo.ts': 'supabase.from("quotes").select("*");\n',
  });
  try {
    const r = runGate(dir, ['--json']);
    assert.equal(r.code, 1);
    const parsed = JSON.parse(r.out.split('\n').filter(Boolean).join('\n').match(/\{[\s\S]*\}/)[0]);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.violations.length, 1);
    assert.equal(parsed.violations[0].table, 'quotes');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
