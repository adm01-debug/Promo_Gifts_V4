#!/usr/bin/env node
/**
 * CI gate: ensure every body-accepting Edge Function under
 * `supabase/functions/` is represented in the contract registry
 * (`tests/contracts/webhook-schemas.ts`).
 *
 * Exit codes:
 *   0 — every body-accepting function has an entry
 *   1 — at least one function is missing
 *   2 — script error (can't read the registry / fs problem)
 *
 * To exempt a function legitimately (GET-only, cron worker, etc.) add it to
 * `NO_BODY_EXEMPT` in `tests/contracts/webhook-schemas.ts`.
 *
 * Dívida conhecida (função lê o body mas ainda não tem contrato Zod):
 * `scripts/check-contract-coverage.allowlist.json` (`{ "<fn>": "motivo" }`). Entrada obsoleta
 * (função já coberta/removida/sem body) FALHA — a dívida só encolhe.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FN_DIR = join(ROOT, "supabase/functions");
const REGISTRY = join(ROOT, "tests/contracts/webhook-schemas.ts");

if (!existsSync(REGISTRY)) {
  console.error(`❌ ${REGISTRY} não encontrado.`);
  process.exit(2);
}

const registrySource = readFileSync(REGISTRY, "utf8");

/** Extract CONTRACTS keys via lightweight regex (no TS compiler dep). */
function parseContractKeys(src) {
  const start = src.indexOf("export const CONTRACTS");
  if (start < 0) return new Set();
  const open = src.indexOf("{", start);
  if (open < 0) return new Set();
  // Scan to matching brace
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const block = src.slice(open, end);
  const keys = new Set();
  for (const m of block.matchAll(/"([a-z][a-z0-9-]*)":\s*\{/gi)) keys.add(m[1]);
  return keys;
}

function parseExemptSet(src) {
  const m = src.match(/NO_BODY_EXEMPT[\s\S]*?new Set<string>\(\[([\s\S]*?)\]\)/);
  if (!m) return new Set();
  const out = new Set();
  for (const lit of m[1].matchAll(/"([^"]+)"/g)) out.add(lit[1]);
  return out;
}

/**
 * "Lê o body": além de req.json()/req.text(), os helpers compartilhados e as demais leituras.
 * Antes só `req.json()|req.text()` contavam — funções que usam `safeJson(req)` etc. eram
 * classificadas como "sem body" e escapavam do gate.
 */
const BODY_READ =
  /\b(?:req|request)\.(?:json|text|formData|blob|arrayBuffer)\(\)|\b(?:safeJson|safeParseBody|parseBodyWithSchema|parseVersionedBody|readBodyWithinLimit|readJsonBody|parseJsonBody)\s*\(/;

const ALLOWLIST_PATH = join(ROOT, "scripts/check-contract-coverage.allowlist.json");
let debt = {};
if (existsSync(ALLOWLIST_PATH)) {
  try {
    debt = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  } catch (e) {
    console.error(`❌ ${ALLOWLIST_PATH} inválido: ${e.message}`);
    process.exit(2);
  }
}
for (const [fn, reason] of Object.entries(debt)) {
  if (fn.startsWith("_")) continue;
  if (typeof reason !== "string" || reason.trim().length < 10 || /^\s*TODO\b/.test(reason)) {
    console.error(`❌ allowlist: "${fn}" precisa de motivo real (>=10 caracteres, sem TODO).`);
    process.exit(2);
  }
}

const contractKeys = parseContractKeys(registrySource);
const exemptKeys = parseExemptSet(registrySource);

if (!existsSync(FN_DIR)) {
  console.error(`❌ ${FN_DIR} não encontrado.`);
  process.exit(2);
}

const fnDirs = readdirSync(FN_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "_shared" && d.name !== "tests")
  .map((d) => d.name);

const missing = [];
const bodyless = [];
const knownDebt = [];

for (const fn of fnDirs) {
  const idx = join(FN_DIR, fn, "index.ts");
  if (!existsSync(idx)) continue;
  const src = readFileSync(idx, "utf8");
  const readsBody = BODY_READ.test(src);
  if (!readsBody) {
    bodyless.push(fn);
    continue;
  }
  if (exemptKeys.has(fn)) continue;
  if (!contractKeys.has(fn)) {
    if (Object.hasOwn(debt, fn)) { knownDebt.push(fn); continue; }
    missing.push(fn);
  }
}

// Dívida registrada que já não faz sentido (virou contrato, ganhou isenção ou não lê body).
const stale = Object.keys(debt)
  .filter((fn) => !fn.startsWith("_"))
  .filter((fn) => !knownDebt.includes(fn));

console.log(`Edge Functions inspected: ${fnDirs.length}`);
console.log(`  body-less (no body read):         ${bodyless.length}`);
console.log(`  known debt (allowlist):           ${knownDebt.length}`);
console.log(`  exempt by NO_BODY_EXEMPT:         ${exemptKeys.size}`);
console.log(`  in CONTRACTS registry:            ${contractKeys.size}`);

if (stale.length > 0) {
  console.error(`\n❌ Allowlist obsoleta — remova de scripts/check-contract-coverage.allowlist.json: ${stale.join(", ")}`);
  process.exit(1);
}

for (const fn of knownDebt) console.warn(`⚠️  dívida: ${fn} — ${debt[fn]}`);

if (missing.length === 0) {
  console.log("\n✅ Contract coverage OK — every body-accepting function has an entry.");
  process.exit(0);
}

console.error(`\n❌ Contract coverage gap — ${missing.length} function(s) missing from CONTRACTS:`);
for (const m of missing) console.error(`   • ${m}`);
console.error("\nTo fix:");
console.error("  1. Add a Zod schema for the function in tests/contracts/webhook-schemas.ts");
console.error("  2. Register it in the CONTRACTS map");
console.error("  3. OR, if the function legitimately has no body, add it to NO_BODY_EXEMPT");
console.error("  4. OR (dívida consciente) registre em scripts/check-contract-coverage.allowlist.json com motivo");
process.exit(1);
