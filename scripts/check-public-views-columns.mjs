#!/usr/bin/env node
/**
 * Contrato de colunas das views SECURITY DEFINER públicas (catálogo anônimo).
 *
 * POR QUE ISSO EXISTE
 * -------------------
 * As 8 views v_*_public rodam como owner para ler tabelas sensíveis (products.cost_price,
 * suppliers.api_credentials, tabela_preco_gravacao.custo_setup...) sem conceder essas tabelas
 * ao anon. O advisor do Supabase as marca como ERROR (security_definer_view) — o design é
 * intencional (ver COMMENT ON VIEW), mas qualquer `CREATE OR REPLACE VIEW` que adicione uma
 * coluna passa a expor dado ao anon sem ninguém perceber. Este script trava a lista.
 *
 * MODOS
 *   node scripts/check-public-views-columns.mjs            # valida a estrutura do contrato
 *   node scripts/check-public-views-columns.mjs --live f   # compara com JSON exportado do banco
 *
 * O JSON "live" é a saída da query em `.security/public-views-columns.json#query`
 * (array de {relname, columns}). Sem --live só a consistência interna é verificada.
 */
import { readFileSync } from 'node:fs';

const CONTRACT_PATH = '.security/public-views-columns.json';
const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));
const views = contract.views ?? {};
const errors = [];

for (const [view, spec] of Object.entries(views)) {
  if (!Array.isArray(spec.columns) || spec.columns.length === 0) {
    errors.push(`${view}: lista de colunas vazia`);
    continue;
  }
  const dup = spec.columns.filter((c, i) => spec.columns.indexOf(c) !== i);
  if (dup.length) errors.push(`${view}: colunas duplicadas ${dup.join(', ')}`);
  for (const f of spec.forbidden ?? []) {
    if (spec.columns.includes(f)) errors.push(`${view}: coluna proibida presente no contrato: ${f}`);
  }
  for (const m of spec.masked_null ?? []) {
    if (!spec.columns.includes(m)) errors.push(`${view}: masked_null referencia coluna inexistente: ${m}`);
  }
}

const liveIdx = process.argv.indexOf('--live');
if (liveIdx !== -1) {
  const livePath = process.argv[liveIdx + 1];
  if (!livePath) {
    console.error('--live exige o caminho do JSON exportado do banco');
    process.exit(2);
  }
  const live = JSON.parse(readFileSync(livePath, 'utf8'));
  const byName = new Map(live.map((r) => [r.relname, r.columns]));
  for (const [view, spec] of Object.entries(views)) {
    const cols = byName.get(view);
    if (!cols) {
      errors.push(`${view}: ausente no banco`);
      continue;
    }
    const extra = cols.filter((c) => !spec.columns.includes(c));
    const missing = spec.columns.filter((c) => !cols.includes(c));
    if (extra.length) errors.push(`${view}: colunas NOVAS no banco (revisar exposição ao anon): ${extra.join(', ')}`);
    if (missing.length) errors.push(`${view}: colunas do contrato ausentes no banco: ${missing.join(', ')}`);
    for (const f of spec.forbidden ?? []) {
      if (cols.includes(f)) errors.push(`${view}: coluna PROIBIDA exposta no banco: ${f}`);
    }
  }
  for (const r of live) {
    if (!views[r.relname]) errors.push(`${r.relname}: view pública no banco sem entrada no contrato`);
  }
}

if (errors.length) {
  console.error(`✗ public-views-columns: ${errors.length} problema(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ public-views-columns: ${Object.keys(views).length} views${liveIdx !== -1 ? ' (live OK)' : ''}`);
