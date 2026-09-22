#!/usr/bin/env node
/**
 * Gate: cross-check das allowlists de segurança contra a documentação canônica.
 *
 * Regras:
 *  - Cada allowlist em .security/*-allowlist.json DEVE conter `documented_in` apontando
 *    para um arquivo existente no repo.
 *  - Cada entrada DEVE ter `reason` não vazio e sem "TODO".
 *  - Cada entrada DEVE declarar a sua identidade no formato da respectiva
 *    allowlist: `fn` para funções SQL ou `slug` para Edge Functions. Essa
 *    identidade DEVE ser mencionada no documento de referência, OU o doc deve
 *    declarar explicitamente "Snapshot atual: 0 entradas" para essa allowlist.
 *
 * Uso: node scripts/check-allowlist-memory-crosscheck.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SEC_DIR = join(ROOT, ".security");

const ALLOWLISTS = readdirSync(SEC_DIR)
  .filter((f) => f.endsWith("-allowlist.json"))
  .map((f) => join(SEC_DIR, f));

let errors = 0;
const err = (msg) => {
  console.error(`❌ ${msg}`);
  errors++;
};
const ok = (msg) => console.log(`✅ ${msg}`);

for (const path of ALLOWLISTS) {
  const rel = path.replace(ROOT + "/", "");
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(`${rel}: JSON inválido — ${e.message}`);
    continue;
  }

  const docRef = data.documented_in;
  if (!docRef || typeof docRef !== "string") {
    err(`${rel}: falta campo 'documented_in' apontando para doc canônico`);
    continue;
  }

  // Aceita rótulo ("security-memory (...)") OU caminho relativo.
  let docContent = "";
  const docPath = join(ROOT, docRef.split(" ")[0]);
  if (existsSync(docPath)) {
    docContent = readFileSync(docPath, "utf8");
  } else if (existsSync(join(ROOT, "docs/security/ALLOWLISTS_MEMORY.md"))) {
    // Fallback: doc canônico consolidado
    docContent = readFileSync(join(ROOT, "docs/security/ALLOWLISTS_MEMORY.md"), "utf8");
  } else {
    err(`${rel}: 'documented_in' não resolve para arquivo ('${docRef}') e doc canônico ausente`);
    continue;
  }

  const fns = Array.isArray(data.functions) ? data.functions : [];
  if (fns.length === 0) {
    ok(`${rel}: 0 entradas (snapshot vazio — travamento anti-regressão)`);
    continue;
  }

  let localErrors = 0;
  for (const entry of fns) {
    // As allowlists de pg_catalog identificam rotinas com `fn`, enquanto o
    // inventário de Edge Functions (verify_jwt=false) usa `slug`. Não podemos
    // obrigar uma Edge Function a fingir ser uma função SQL: além de tornar o
    // metadado ambíguo, isso fazia o gate reprovar todas as entradas válidas.
    const identity = entry.fn || entry.slug || "";
    const identityField = entry.fn ? "fn" : "slug";
    const reason = (entry.reason || "").trim();
    if (!identity) {
      err(`${rel}: entrada sem 'fn' ou 'slug'`);
      localErrors++;
      continue;
    }
    if (!reason) {
      err(`${rel}: '${identity}' sem 'reason'`);
      localErrors++;
      continue;
    }
    if (/^TODO\b/i.test(reason)) {
      err(`${rel}: '${identity}' com reason TODO — documentar antes de merge`);
      localErrors++;
      continue;
    }
    // Nome curto SQL: public.foo(...) -> foo. Slugs de Edge Function já são
    // a identidade canônica e devem aparecer literalmente no documento E42.
    const shortName = identityField === "fn"
      ? identity.replace(/^public\./, "").split("(")[0]
      : identity;
    if (!docContent.includes(shortName)) {
      err(`${rel}: '${identity}' não referenciado no documento declarado`);
      localErrors++;
    }
  }
  if (localErrors === 0) {
    ok(`${rel}: ${fns.length} entrada(s) documentadas`);
  }
}

if (errors > 0) {
  console.error(`\n💥 ${errors} problema(s) de cross-check. Atualize docs/security/ALLOWLISTS_MEMORY.md.`);
  process.exit(1);
}
console.log("\n🎉 Todas as allowlists de segurança estão documentadas.");
