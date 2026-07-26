#!/usr/bin/env node
/**
 * simulate-ai-key-scenarios.mjs
 *
 * Simulação exaustiva + gate estático do contrato "credencial de IA ausente"
 * nas edge functions (ver supabase/functions/_shared/ai-credentials.ts).
 *
 * Duas frentes:
 *  1) SIMULAÇÃO (centenas de cenários): matriz determinística + fuzz sobre a
 *     árvore de decisão (valor no DB × valor no env × falha do resolver ×
 *     formatos degenerados de chave). Invariantes verificadas:
 *       - nunca lança;
 *       - chave só é usada quando não-vazia após trim;
 *       - ausência ⇒ HTTP 503 com body { error: "ai_not_configured" };
 *       - mensagem pública nunca contém o nome do secret nem stack.
 *  2) GATE ESTÁTICO: nenhuma edge pode ler LOVABLE_API_KEY direto do env nem
 *     lançar/retornar 500 quando a chave está ausente.
 *
 * Uso: node scripts/simulate-ai-key-scenarios.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FUNCTIONS_DIR = 'supabase/functions';
const SECRET = 'LOVABLE_API_KEY';

// Funções que resolvem a credencial por um router multi-provider próprio e
// possuem fallback documentado (não exigem o helper compartilhado).
const ALLOWLIST = new Set(['semantic-search', 'visual-search', 'trends-insights']);
// Funções que já usam o SSOT resolveCredential() diretamente.
const SSOT_DIRECT = new Set(['bi-copilot', 'ai-recommendations', 'analyze-logo-colors']);

let failures = 0;
let checks = 0;
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const ok = () => { checks++; };

// ───────────────────────── 1. Simulação (lógica pura) ─────────────────────────

/** Espelha normalizeApiKey() do módulo compartilhado. */
function normalizeApiKey(raw) {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

/** Espelha resolveAiApiKey() + requireAiApiKey(). */
function simulateHandler({ dbValue, envValue, resolverThrows }) {
  let apiKey = null;
  let source = 'none';
  try {
    if (resolverThrows) throw new Error('db unreachable');
    const v = normalizeApiKey(dbValue);
    if (v) { apiKey = v; source = 'db'; }
  } catch {
    /* degradação silenciosa — cai no env */
  }
  if (!apiKey) {
    const v = normalizeApiKey(envValue);
    if (v) { apiKey = v; source = 'env'; }
  }
  if (apiKey) return { status: 200, apiKey, source, threw: false };
  return {
    status: 503,
    body: {
      error: 'ai_not_configured',
      message: 'Recurso de IA indisponível no momento. Tente novamente mais tarde.',
      function: 'simulated',
    },
    source: 'none',
    threw: false,
  };
}

const DEGENERATE = [
  undefined, null, '', ' ', '\t', '\n', '   \n\t  ', 0, 1, false, true, NaN,
  {}, [], () => {}, Symbol.iterator?.toString?.() ?? 'sym',
];
const VALID = ['sk-abc', ' sk-abc ', 'lv_live_123', 'x'.repeat(512), '\tkey\n'];

console.log('▶ Simulação da árvore de decisão da credencial de IA');
let simCount = 0;
for (const dbValue of [...DEGENERATE, ...VALID]) {
  for (const envValue of [...DEGENERATE, ...VALID]) {
    for (const resolverThrows of [false, true]) {
      simCount++;
      let r;
      try {
        r = simulateHandler({ dbValue, envValue, resolverThrows });
      } catch (e) {
        fail(`cenário lançou exceção: db=${String(dbValue)} env=${String(envValue)} throws=${resolverThrows} → ${e.message}`);
        continue;
      }
      const expectedDb = resolverThrows ? null : normalizeApiKey(dbValue);
      const expectedKey = expectedDb ?? normalizeApiKey(envValue);
      if (expectedKey) {
        if (r.status !== 200) fail(`esperado 200 com chave válida (db=${String(dbValue)} env=${String(envValue)})`);
        else if (r.apiKey !== expectedKey) fail(`chave não normalizada: "${r.apiKey}" ≠ "${expectedKey}"`);
        else if (r.apiKey.trim() !== r.apiKey) fail('chave com espaços nas bordas foi aceita');
        else ok();
      } else {
        if (r.status !== 503) fail(`esperado 503 sem chave (db=${String(dbValue)} env=${String(envValue)})`);
        else if (r.body.error !== 'ai_not_configured') fail('código de erro instável');
        else if (r.body.message.includes(SECRET)) fail('mensagem pública vaza nome do secret');
        else if (/Error|stack|Deno\./.test(r.body.message)) fail('mensagem pública vaza detalhe técnico');
        else ok();
      }
    }
  }
}

// Fuzz adicional com strings aleatórias
const rnd = (n) => Array.from({ length: n }, () => String.fromCharCode(32 + Math.floor(Math.random() * 95))).join('');
for (let i = 0; i < 300; i++) {
  simCount++;
  const dbValue = Math.random() < 0.4 ? '   '.repeat(Math.floor(Math.random() * 4)) : rnd(Math.floor(Math.random() * 40));
  const envValue = Math.random() < 0.5 ? undefined : rnd(Math.floor(Math.random() * 40));
  const r = simulateHandler({ dbValue, envValue, resolverThrows: Math.random() < 0.3 });
  if (![200, 503].includes(r.status)) fail(`status inesperado ${r.status}`);
  else if (r.status === 200 && !r.apiKey) fail('200 sem chave');
  else ok();
}
console.log(`  ${simCount} cenários simulados`);

// ───────────────────────── 2. Gate estático nas edges ─────────────────────────

console.log('▶ Gate estático das edge functions que usam IA');
const dirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && d.name !== 'tests')
  .map((d) => d.name);

let audited = 0;
for (const fn of dirs) {
  const file = join(FUNCTIONS_DIR, fn, 'index.ts');
  if (!existsSync(file)) continue;
  const src = readFileSync(file, 'utf8');
  if (!src.includes(SECRET)) continue;
  audited++;
  if (ALLOWLIST.has(fn)) { ok(); continue; }

  const usesHelper = src.includes('_shared/ai-credentials.ts');
  const usesSsot = SSOT_DIRECT.has(fn) && src.includes('resolveCredential');
  if (!usesHelper && !usesSsot) {
    fail(`${fn}: lê ${SECRET} sem o SSOT (ai-credentials.ts ou resolveCredential)`);
  } else ok();

  if (new RegExp(`Deno\\.env\\.get\\(['"]${SECRET}['"]\\)`).test(src) && !usesSsot) {
    fail(`${fn}: leitura direta de Deno.env.get('${SECRET}') — use o SSOT`);
  } else ok();

  if (new RegExp(`throw new Error\\([^)]*${SECRET}`).test(src)) {
    fail(`${fn}: lança exceção quando ${SECRET} está ausente (deve retornar 503)`);
  } else ok();

  // 500 com o nome do secret no body é vazamento + status errado.
  if (new RegExp(`error:\\s*['"\`][^'"\`]*${SECRET}`).test(src)) {
    fail(`${fn}: expõe o nome do secret no body de erro`);
  } else ok();
}
console.log(`  ${audited} edge functions auditadas`);

// ───────────────────────────────── Resultado ─────────────────────────────────
console.log(`\n${failures === 0 ? '✅' : '❌'} ${checks} asserções OK, ${failures} falha(s)`);
process.exit(failures === 0 ? 0 : 1);
