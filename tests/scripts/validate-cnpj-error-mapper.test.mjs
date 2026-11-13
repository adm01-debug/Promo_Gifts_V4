import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/validate-cnpj-error-mapper.mjs');

function runFile(path) {
  const r = spawnSync(process.execPath, [path], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

test('rodada normal (2.000 fuzz + 8 canônicos) passa com exit 0', () => {
  const r = runFile(SCRIPT);
  assert.equal(r.code, 0);
  assert.match(r.out, /Falhas: 0/);
  assert.match(r.out, /20[.,]008/);
  assert.match(r.out, /Todas as invariantes OK/);
});

// Bug real encontrado: o gate só reportava `process.exit(1)` quando
// `fails.length > 0`, mas `fails` só crescia se um `check()` recebesse
// `cond === false`. Se uma regressão futura esvaziasse o corpo do loop de
// fuzz (ex.: `for (let i = 0; i < 2000; i++)` virar `i < 0`, ou alguém
// comentar as chamadas de `check()`) e também a lista `cases`, nenhum
// `check()` chegava a rodar: `asserts` ficava em 0, `fails` continuava
// vazio, e o script imprimia "Asserções: 0 / Falhas: 0 / ✅ Todas as
// invariantes OK." com exit code 0 — um falso-positivo vacuoso: o gate
// "passa" sem ter verificado nada. Sem a guarda de contagem mínima
// (`EXPECTED_ASSERTS`), este teste falha (exit code 0 em vez de 1).
test('detecta regressão que esvazia o fuzzer sem falhar nenhum check (falso-positivo vacuoso)', () => {
  const src = readFileSync(SCRIPT, 'utf8');

  const patched = src
    .replace('for (let i = 0; i < 2000; i++) {', 'for (let i = 0; i < 0; i++) {')
    .replace(/const cases = \[[\s\S]*?\];\n/, 'const cases = [];\n');

  // Garante que as duas substituições realmente bateram (senão o teste
  // estaria validando o cenário errado silenciosamente).
  assert.notEqual(patched, src);
  assert.doesNotMatch(patched, /\['cnpj_length_invalid', new Error/);

  const dir = mkdtempSync(join(tmpdir(), 'cnpj-mapper-vacuous-'));
  const file = join(dir, 'vacuous.mjs');
  try {
    writeFileSync(file, patched);
    const r = runFile(file);
    assert.equal(r.code, 1, `esperava exit 1 (gate vazio detectado), saída:\n${r.out}`);
    assert.match(r.out, /contagem de asserções inesperada/);
    assert.match(r.out, /esperado \d+, veio 0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
