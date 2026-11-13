// Testes para scripts/validate-cnpj-property-based.mjs (fuzzer standalone de
// CNPJ, órfão de CI — invocado manualmente por dev: ver
// docs/estado/09_CI_INFRA_SCRIPTS.md §D.1).
//
// Bug real encontrado em teste adversarial: o script fazia
// `const N = Number(process.argv[2] ?? 5000)` e usava N direto em
// `for (let i = 0; i < N; i++)` sem nenhuma validação. Isso causava:
//
//   1. Loop prático infinito (processo preso até ser matado por timeout,
//      exit code 124) com `N=Infinity` ou com um N numérico finito mas
//      absurdamente grande (ex.: um literal com 23 dígitos) — confirmado
//      rodando `node scripts/validate-cnpj-property-based.mjs Infinity`
//      sob `timeout 5s`: nunca retornava.
//   2. Falso-positivo silencioso: `N=NaN` (ex. argumento "abc") ou `N`
//      negativo faziam o loop não executar nenhuma iteração real, mas o
//      script ainda imprimia "✓ ... OK" e saía com exit 0 — dando a
//      impressão de que a validação de CNPJ rodou quando na verdade zero
//      asserções reais de fuzz foram feitas.
//
// Sem o fix (checagem de Number.isFinite + limite superior logo após
// calcular N), o teste "rejeita N=Infinity sem travar" trava até o timeout
// do spawnSync e falha a asserção de exit code; os testes de N inválido
// falhariam porque o script saía com 0 em vez de 1.
import { describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/validate-cnpj-property-based.mjs');

function run(args, timeoutMs = 10_000) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  return { code: r.status, timedOut: r.signal === 'SIGTERM' && r.status === null, out: `${r.stdout}\n${r.stderr}` };
}

describe('validate-cnpj-property-based.mjs — validação de N', () => {
  test('N=Infinity é rejeitado rapidamente, sem travar (antes: loop infinito)', () => {
    const r = run(['Infinity'], 5_000);
    expect(r.timedOut).toBe(false);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/N inválido/);
  });

  test('N finito absurdamente grande é rejeitado rapidamente (antes: loop infinito)', () => {
    const r = run(['99999999999999999999999'], 5_000);
    expect(r.timedOut).toBe(false);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/N inválido/);
  });

  test('N não numérico (NaN) sai com erro, não com falso "OK" silencioso', () => {
    const r = run(['abc']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/N inválido/);
    expect(r.out).not.toMatch(/✓/);
  });

  test('N negativo sai com erro, não com falso "OK" silencioso', () => {
    const r = run(['-5']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/N inválido/);
    expect(r.out).not.toMatch(/✓/);
  });

  test('N acima do limite superior é rejeitado', () => {
    const r = run(['1000001']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/N inválido/);
  });

  // Regressão: entradas válidas continuam funcionando normalmente.
  test('sem args usa o default (5000) e passa', () => {
    const r = run([], 15_000);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/✓/);
    expect(r.out).toMatch(/5000 amostras válidas/);
  });

  test('N=0 passa com zero amostras', () => {
    const r = run(['0']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/0 amostras válidas/);
  });

  test('N=1000000 (limite exato) ainda é aceito', () => {
    const r = run(['1000000'], 20_000);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/✓/);
  }, 25_000);
});
