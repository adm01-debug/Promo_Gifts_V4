#!/usr/bin/env node
/**
 * check-edge-zod-ratchet.mjs
 *
 * Ratchet de validação Zod nas Edge Functions que aceitam body
 * (auditoria 20-dim — Top-10 #8: "contrato zod nas edges de escrita").
 *
 * Regra: toda edge em `supabase/functions/<nome>/index.ts` que lê body
 * (`req.json()`/`req.text()`) e não está em NO_BODY_EXEMPT deve chamar uma
 * validação de schema (zod/safeParse/parseBodyWithSchema/validateBody).
 *
 * A dívida atual (edges que hoje não validam) está congelada em
 * `.security/edge-zod-ratchet.json`. O gate FALHA só quando surge uma edge
 * nova não-validada — igual aos ratchets TODO/as/file-size: o débito não
 * pode crescer, e quitar dívida (adicionar zod numa edge baselined) dispara
 * aviso para regenar a baseline com `--update-baseline`.
 *
 * Modo interativo:
 *   `--update-baseline` regrava o snapshot com o conjunto atual de edges
 *   não-validadas (usar só após revisão humana).
 *
 * Exit codes: 0 (ok), 1 (nova edge sem validação), 2 (erro de config).
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FN_DIR = join(ROOT, 'supabase/functions');
const REGISTRY = join(ROOT, 'tests/contracts/webhook-schemas.ts');
const BASELINE_PATH = join(ROOT, '.security/edge-zod-ratchet.json');

const UPDATE = process.argv.slice(2).includes('--update-baseline');

// Heurística de validação: qualquer referência a schema/parsing estruturado.
// Cobre os padrões já usados no repo: _shared/zod-validate.ts
// (parseBodyWithSchema), `import { z } from "npm:zod..."`, `.safeParse(`,
// helpers locais validateBody/validatePayload.
const VALIDATION_RE =
  /parseBodyWithSchema|safeParse|validateBody|validatePayload|from\s+["']npm:zod|from\s+["']\.\.\/_shared\/zod/i;

// A regex acima vale sobre código executável — um "safeParse" dentro de
// comentário não pode contar como validação. Remove // e /* */ antes de
// testar (o lookahead preserva "://" dentro de strings/URLs).
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:.'"\\])\/\/.*/gm, '$1');
}

if (!existsSync(REGISTRY)) {
  console.error(`❌ ${REGISTRY} não encontrado.`);
  process.exit(2);
}
const registrySource = readFileSync(REGISTRY, 'utf8');

function parseExemptSet(src) {
  const m = src.match(/NO_BODY_EXEMPT[\s\S]*?new Set<string>\(\[([\s\S]*?)\]\)/);
  if (!m) return new Set();
  const out = new Set();
  for (const lit of m[1].matchAll(/"([^"]+)"/g)) out.add(lit[1]);
  return out;
}

const exemptKeys = parseExemptSet(registrySource);

const fnDirs = readdirSync(FN_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '_shared' && d.name !== 'tests')
  .map((d) => d.name)
  .sort();

const bodyAccepting = [];
const unvalidated = [];

for (const fn of fnDirs) {
  const idx = join(FN_DIR, fn, 'index.ts');
  if (!existsSync(idx)) continue;
  const src = stripComments(readFileSync(idx, 'utf8'));
  if (!/req\.json\(\)|req\.text\(\)/.test(src)) continue;
  if (exemptKeys.has(fn)) continue;
  bodyAccepting.push(fn);
  if (!VALIDATION_RE.test(src)) unvalidated.push(fn);
}

function loadBaseline() {
  try {
    const doc = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
    if (!Array.isArray(doc.functions)) throw new Error('functions não é array');
    return new Set(doc.functions);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    console.error(`❌ baseline inválida: ${e.message}`);
    process.exit(2);
  }
}

const baseline = loadBaseline();

if (UPDATE || baseline === null) {
  const doc = {
    version: 1,
    generated_at: new Date().toISOString(),
    description:
      'Edges que aceitam body SEM validação zod hoje (dívida congelada — não pode crescer). Regenere com check:edge-zod-ratchet:update ao quitar dívida.',
    functions: unvalidated,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(doc, null, 2) + '\n');
  console.log(
    `[edge-zod-ratchet] baseline ${baseline === null ? 'criada' : 'atualizada'}: ${unvalidated.length} edge(s) não-validadas congeladas (de ${bodyAccepting.length} body-accepting).`,
  );
  process.exit(0);
}

const newUnvalidated = unvalidated.filter((fn) => !baseline.has(fn));
const staleBaseline = [...baseline].filter((fn) => !unvalidated.includes(fn));

if (staleBaseline.length) {
  console.log(
    `⚠️  ${staleBaseline.length} edge(s) saíram da baseline (ganharam validação ou deixaram de aceitar body):\n` +
      staleBaseline.map((fn) => `   - ${fn}`).join('\n') +
      `\n   Rode: npm run check:edge-zod-ratchet:update`,
  );
}

if (newUnvalidated.length) {
  console.error(
    `\n🚨 ${newUnvalidated.length} edge(s) NOVA(S) aceitando body SEM validação zod:\n` +
      newUnvalidated.map((fn) => `   - supabase/functions/${fn}/index.ts`).join('\n') +
      `\n\nPadrão do repo: import { parseBodyWithSchema } from '../_shared/zod-validate.ts' ` +
      `+ schema zod ("npm:zod@3.23.8").\n` +
      `Se a edge for legítima sem schema (webhook de terceiro, proxy), ` +
      `rode npm run check:edge-zod-ratchet:update após revisão humana.\n`,
  );
  process.exit(1);
}

console.log(
  `✅ edge-zod-ratchet: ${unvalidated.length} edge(s) não-validadas — dentro da baseline congelada (${bodyAccepting.length} body-accepting no total).`,
);
process.exit(0);
