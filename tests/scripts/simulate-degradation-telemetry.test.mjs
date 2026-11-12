/**
 * Testes para scripts/simulate-degradation-telemetry.mjs
 *
 * Cobre um falso-negativo real encontrado em auditoria adversarial: a Fase 1
 * (matriz determinística) só verificava `handle(...) === 'degraded'`,
 * `reg.all.length === 1` e o `scope` preservado — nunca o `reason`
 * efetivamente gravado. Como todo fixture de `DEGRADABLE` com `code` também
 * carrega uma `message` plausível, uma entrada de `CODE_MAP` trocada (ex.:
 * `'42501': 'quota_exceeded'` em vez de `'permission_denied'`) continuava
 * "degradando" o erro — só que com o motivo ERRADO — e o script terminava
 * com "0 falha(s)" e exit code 0, apesar da classificação estar incorreta.
 * Isso é exatamente o que o painel /admin/telemetria usaria para agrupar
 * eventos, então o gate não cumpria seu propósito declarado (I2).
 *
 * Corrigido adicionando `reason` esperado a cada fixture de `DEGRADABLE` e
 * uma asserção `reg.all[0].reason === err.reason` na Fase 1.
 *
 * Os dois testes abaixo reproduzem, numa cópia isolada do script em sandbox,
 * exatamente as duas regressões reais observadas (CODE_MAP com motivo
 * trocado para '42501' e para '42703') e confirmam que o gate corrigido as
 * rejeita (exit 1, com a mensagem "motivo correto" entre as falhas) — e que
 * o script sem alteração nenhuma continua passando limpo.
 */
import { test, expect } from 'vitest';
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/simulate-degradation-telemetry.mjs');

function makeSandboxCopy(prefix, transform) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  const scriptPath = join(sandbox, 'script.mjs');
  const original = readFileSync(REAL_SCRIPT, 'utf8');
  writeFileSync(scriptPath, transform ? transform(original) : original);
  return { sandbox, scriptPath };
}

function run(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test('script original (sem alteração) continua passando limpo (0 falhas, exit 0)', () => {
  const { sandbox, scriptPath } = makeSandboxCopy('degr-ok-');
  try {
    const { code, stdout } = run(scriptPath);
    expect(code).toBe(0);
    expect(stdout).toMatch(/0 falha\(s\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('CODE_MAP com motivo trocado (42501 -> quota_exceeded) é detectado pelo gate (regressão real)', () => {
  const { sandbox, scriptPath } = makeSandboxCopy('degr-bug-42501-', (src) =>
    src.replace("42501: 'permission_denied',", "42501: 'quota_exceeded',"),
  );
  try {
    const { code, stdout, stderr } = run(scriptPath);
    // Antes da correção: exit 0, "0 falha(s)" — o motivo errado passava
    // despercebido porque a Fase 1 nunca comparava `reason` ao esperado.
    expect(code).toBe(1);
    expect(stderr).toMatch(/motivo correto \(esperado permission_denied, obteve quota_exceeded\)/);
    expect(stdout).not.toMatch(/0 falha\(s\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('CODE_MAP com motivo trocado (42703 -> permission_denied) é detectado pelo gate (regressão real)', () => {
  const { sandbox, scriptPath } = makeSandboxCopy('degr-bug-42703-', (src) =>
    src.replace("42703: 'schema_mismatch',", "42703: 'permission_denied',"),
  );
  try {
    const { code, stderr } = run(scriptPath);
    expect(code).toBe(1);
    expect(stderr).toMatch(/motivo correto \(esperado schema_mismatch, obteve permission_denied\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('arquivo truncado é rejeitado com erro de sintaxe (fail-closed), nunca exit 0', () => {
  const { sandbox, scriptPath } = makeSandboxCopy('degr-trunc-', (src) => src.slice(0, Math.floor(src.length / 2)));
  try {
    const { code } = run(scriptPath);
    expect(code).not.toBe(0);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
