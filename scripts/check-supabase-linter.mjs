#!/usr/bin/env node
/**
 * Gate de CI: roda o Supabase Linter via Management API e falha se houver
 * findings NÃO presentes em .security/supabase-linter-baseline.json.
 *
 * Env obrigatórias:
 *   SUPABASE_ACCESS_TOKEN  (PAT — Settings → Access Tokens)
 *   SUPABASE_PROJECT_REF   (ex.: doufsxqlfjyuvxuezpln)
 *
 * Opcional:
 *   UPDATE_BASELINE=1  → regrava o baseline com os findings atuais (use manualmente).
 *
 * Saída:
 *   exit 0 — sem regressões
 *   exit 1 — há findings novos OU baseline contém entradas que não existem mais
 *   exit 2 — erro de config/rede
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASELINE_PATH = resolve(".security/supabase-linter-baseline.json");
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const UPDATE = process.env.UPDATE_BASELINE === "1";

if (!TOKEN || !REF) {
  console.error("❌ SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF são obrigatórios.");
  process.exit(2);
}

const API = `https://api.supabase.com/v1/projects/${REF}/database/lint`;

async function fetchLints() {
  const res = await fetch(API, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) {
      console.error(
        `❌ /database/lint endpoint retornou 404 — indisponível para este projeto/plano.\n` +
          `   Isto NÃO é "sem findings": é ausência de verificação. Investigar antes de reabilitar:\n` +
          `   1) confirmar plano/permissão do SUPABASE_ACCESS_TOKEN para ${REF};\n` +
          `   2) se o endpoint foi descontinuado, substituir esta checagem por auditoria via pg_catalog\n` +
          `      (CLAUDE.md REGRA #8, corolário — nunca via PostgREST/OpenAPI).\n` +
          `   Falhando o gate (exit 2) em vez de reportar sucesso — ver docs/plans/PLANO_MELHORIAS_CORRECOES_50_ETAPAS_2026-09-13.md, etapa E09.`,
      );
      process.exit(2);
    }
    console.error(`❌ Management API ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(2);
  }
  return res.json();
}

/**
 * Normaliza um finding para uma chave estável `{lint, name}`.
 * O linter retorna `name` (slug do lint) + `metadata` com detalhes (schema, table, function, etc.).
 * Para 0029, o identificador relevante é metadata.name (nome da função).
 * Para outros lints, tentamos cair em metadata.name → metadata.table → metadata.relation → "*".
 */
function keyOf(finding) {
  const lint = finding.name || finding.lint || "unknown";
  const md = finding.metadata || {};
  const name = md.name || md.function || md.table || md.relation || md.entity || "*";
  return { lint, name, level: finding.level || "WARN" };
}

function tupleKey(k) {
  return `${k.lint}::${k.name}`;
}

function loadBaseline() {
  let text;
  try {
    text = readFileSync(BASELINE_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`⚠️  ${BASELINE_PATH} não existe — partindo de baseline vazio (primeira execução).`);
      return new Set();
    }
    console.error(`❌ Não foi possível ler ${BASELINE_PATH}: ${err.message}`);
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    // Fail-closed: um baseline corrompido/ilegível NÃO deve degradar para "sem exceções
    // aceitas" silenciosamente — isso mascarou 50 findings aceitos por ~2 meses (o arquivo
    // ficou em base64 desde o PR #1675, 2026-07-13, sem que este gate acusasse o problema).
    console.error(`❌ ${BASELINE_PATH} não é JSON válido: ${err.message}`);
    console.error("   Corrija o arquivo (ou regenere com UPDATE_BASELINE=1) antes de confiar neste gate.");
    process.exit(2);
  }
  return new Set((raw.accepted || []).map((e) => `${e.lint}::${e.name}`));
}

function writeBaseline(keys) {
  const accepted = [...keys]
    .map((k) => {
      const [lint, name] = k.split("::");
      return { lint, name };
    })
    .sort((a, b) =>
      a.lint === b.lint ? a.name.localeCompare(b.name) : a.lint.localeCompare(b.lint),
    );
  const payload = {
    _doc:
      "Whitelist de findings ACEITOS do supabase--linter. Use UPDATE_BASELINE=1 para regenerar.",
    generated_at: new Date().toISOString().slice(0, 10),
    accepted,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + "\n");
}

const findings = await fetchLints();
const current = new Set(findings.map((f) => tupleKey(keyOf(f))));

if (UPDATE) {
  writeBaseline(current);
  console.log(`✅ Baseline atualizado: ${current.size} findings em ${BASELINE_PATH}`);
  process.exit(0);
}

const baseline = loadBaseline();
const novos = [...current].filter((k) => !baseline.has(k));
const obsoletos = [...baseline].filter((k) => !current.has(k));

console.log(
  `📊 Linter: ${findings.length} findings | baseline: ${baseline.size} | novos: ${novos.length} | obsoletos: ${obsoletos.length}`,
);

if (novos.length) {
  console.error("\n❌ FINDINGS NOVOS (bloqueando merge):");
  for (const k of novos.sort()) console.error(`  + ${k}`);
  console.error(
    "\nSe forem aceitáveis, adicione-os em .security/supabase-linter-baseline.json com justificativa no commit.",
  );
}

if (obsoletos.length) {
  console.warn("\n⚠️  Baseline contém entradas que não aparecem mais (limpe via UPDATE_BASELINE=1):");
  for (const k of obsoletos.sort()) console.warn(`  - ${k}`);
}

process.exit(novos.length > 0 ? 1 : 0);
