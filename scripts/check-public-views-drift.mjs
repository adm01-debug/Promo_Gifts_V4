#!/usr/bin/env node
/**
 * check-public-views-drift.mjs
 *
 * Gate de drift para as 10 views do catálogo público (8 `v_*_public` expostas
 * ao anon + `v_compras_catalogo`/`v_compras_precos_faixa`, que tinham grant
 * anon revogado pela migration 20261124140000 e ficam com
 * `anon_select: false` no contrato). As 8 rodam como owner
 * (`security_invoker=false`, coloquialmente "SECURITY DEFINER" neste repo —
 * a rigor esse termo é de função, mas o efeito para uma view é o mesmo:
 * resolve as tabelas subjacentes com o privilégio do dono, não de quem
 * consulta) e têm `SELECT` liberado para `anon`. É o mecanismo que
 * substituiu os GRANTs diretos em tabela (P1 fechado em 2026-07-16 — ver
 * `docs/SCHEMA_REFERENCE.md` §P6). Qualquer `CREATE OR REPLACE VIEW` que
 * adicione uma coluna passa a expor dado ao anon sem ninguém perceber.
 *
 * Antes desta etapa (E16 do plano DBA) já existiam
 * `.security/public-views-columns.json`, este script (então chamado
 * `check-public-views-columns.mjs`) e `tests/security/public-views-columns.test.ts`
 * (PR #1830, auditoria r3, 2026-09-05) — cobrindo drift de coluna por view
 * via `--live <arquivo>` manual, sem gate automático no CI. Em vez de criar
 * um script paralelo para a mesma allowlist, esta revisão RENOMEIA o
 * arquivo (mantendo a lógica anterior) e adiciona: (1) fetch live
 * automático com graceful-degradation, no mesmo padrão de
 * `check-secdef-anon-drift.mjs`; (2) uma checagem GLOBAL de padrão sensível
 * (cost/supplier_price/ncm/bitrix_.../PII) — independente da checagem por
 * `forbidden` de cada view, que já existia mas é uma lista fixa por view,
 * não um padrão genérico.
 *
 * DUAS CHECAGENS INDEPENDENTES (cada uma pode falhar sozinha):
 *   1. DRIFT DE COLUNAS — coluna nova (ou removida) vs.
 *      `.security/public-views-columns.json`, e qualquer coluna da lista
 *      `forbidden` de uma view que apareça ao vivo.
 *   2. PADRÃO SENSÍVEL — qualquer coluna (na allowlist OU ao vivo) cujo
 *      nome bata em cost/supplier_price/ncm/bitrix_.../PII e que NÃO esteja
 *      em `masked_null` (mascarada para NULL na própria view, ou seja, sem
 *      dado real de fato trafegando) precisa estar documentada em
 *      `sensitive_acknowledged` daquela view, com `status`/`note`. Achado
 *      real (E16, 2026-09-16): `v_products_public.ncm_code`, `.ncm_id`,
 *      `.bitrix_product_id` — expostas sem máscara, hoje aceitas como
 *      `REQUER-PO` (ver `docs/E16_VIEWS_PUBLIC_SECDEF_2026-09-16.md`). Uma
 *      coluna sensível NOVA fora desse conjunto já reconhecido continua
 *      fail-closed.
 *
 * TERCEIRA CHECAGEM (QA etapa 005, 2026-11-24): EXPOSIÇÃO AO ANON — o gate
 * antigo só olhava as 8 views do contrato e, no CI, rodava sem credencial
 * (`static-pass`), então uma view NOVA criada em produção com `GRANT SELECT TO
 * anon` passava despercebida (foi o que a #4007 tentou cobrir sem allowlist).
 * Agora o live fetch descobre TODO objeto de `public` (view ou matview) que o
 * `anon` consegue ler — por `GRANT` na tabela ou por coluna — e compara com:
 *   1. o contrato (`.security/public-views-columns.json`, que declara
 *      `anon_select` por view) e
 *   2. `.security/anon-select-allowlist.json` (objetos internos que já eram
 *      legíveis pelo anon antes desta etapa, com colunas congeladas).
 * Objeto exposto sem contrato/allowlist = falha; allowlist sem efeito no banco
 * (entrada obsoleta) = falha; `anon_select=false` no contrato com SELECT vivo =
 * falha (re-concessão de grant, que foi o que a QA etapa 004 fechou em produção).
 * Escopo: schema `public`. `analytics`, `ops`, `internal` etc. continuam
 * cobertos por `check-secdef-anon-drift.mjs` e afins — o contrato deste arquivo
 * nunca cobriu esses schemas.
 *
 * MODOS
 *   node scripts/check-public-views-drift.mjs                 # contrato + tenta live fetch (graceful)
 *   node scripts/check-public-views-drift.mjs --live <path>   # compara com JSON já exportado do banco
 *   node scripts/check-public-views-drift.mjs --require-live  # sem credencial vira inconclusive, não static-pass
 *
 * Fontes de dados para o fetch automático (`supabase-read-only-query.mjs`,
 * mesmo padrão de `check-secdef-anon-drift.mjs`): Management API
 * (`SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`) ou pg-meta local
 * (`VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Sem nenhum dos dois →
 * `static-pass` (advisory) ou `inconclusive` com `--require-live`.
 *
 * Exit codes: 0 (passed/static-pass), 1 (drift ou coluna sensível nova —
 * falha), 2 (inconclusive/erro de config).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, '.security/public-views-columns.json');
const ANON_ALLOWLIST_PATH = path.join(ROOT, '.security/anon-select-allowlist.json');

// Views do contrato. As duas de compras entram com `anon_select: false`
// (grant anon revogado pela migration 20261124140000); as outras 8 seguem
// legíveis pelo anon.
export const PUBLIC_VIEWS = [
  'v_compras_catalogo',
  'v_compras_precos_faixa',
  'v_kit_component_media_public',
  'v_product_compositions_public',
  'v_product_properties_public',
  'v_product_tags_public',
  'v_products_public',
  'v_suppliers_public',
  'v_tabela_preco_gravacao_oficial_public',
  'v_variant_sale_prices_public',
];

// Padrões do achado central da E16 (CLAUDE.md → prompt da etapa): cost,
// supplier_price, ncm, bitrix_*, PII (email/telefone/CPF/CNPJ/endereço).
// `custo` (PT) entra ao lado de `cost` (EN) porque o schema é bilíngue —
// `v_tabela_preco_gravacao_oficial_public` é toda em português
// (`custo_setup_por_cor`, `custo_manuseio_por_peca`) e um padrão só em
// inglês deixaria essa view inteira fora da checagem de custo. Achado ao
// vivo (E16, 2026-09-16): as duas colunas `custo_*` dessa view são
// booleanas (flag "cobra taxa?"), não o valor monetário — reconhecidas em
// `sensitive_acknowledged`, não são um vazamento real.
export const SENSITIVE_PATTERNS = [
  { label: 'cost', re: /cost/i },
  { label: 'custo', re: /custo/i },
  { label: 'supplier_price', re: /supplier_price/i },
  { label: 'ncm', re: /^ncm/i },
  { label: 'bitrix', re: /^bitrix_/i },
  { label: 'pii-email', re: /email/i },
  { label: 'pii-phone', re: /phone|telefone/i },
  { label: 'pii-document', re: /\bcpf\b|\bcnpj\b/i },
  { label: 'pii-address', re: /endereco|address|\bcep\b/i },
];

function buildContractSql(viewNames) {
  return `
  SELECT c.relname,
         json_agg(a.attname ORDER BY a.attnum) AS columns
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND c.relname IN (${viewNames.map((v) => `'${v}'`).join(', ')})
  GROUP BY 1
  ORDER BY 1;
`.trim();
}

function buildAnonSql() {
  return `
  WITH obj AS (
    SELECT c.oid, c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
  )
  SELECT o.relname,
         o.relkind,
         has_table_privilege('anon', o.oid, 'SELECT') AS anon_select,
         (SELECT json_agg(a.attname ORDER BY a.attnum)
            FROM pg_attribute a
           WHERE a.attrelid = o.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
         (SELECT json_agg(a.attname ORDER BY a.attnum)
            FROM pg_attribute a
           WHERE a.attrelid = o.oid AND a.attnum > 0 AND NOT a.attisdropped
             AND has_column_privilege('anon', o.oid, a.attnum, 'SELECT')) AS anon_columns
  FROM obj o
  ORDER BY o.relname;
`.trim();
}

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const liveFlagIdx = argv.indexOf('--live');
const LIVE_FILE = liveFlagIdx !== -1 ? argv[liveFlagIdx + 1] : null;

export function loadContract(contractPath = CONTRACT_PATH) {
  return JSON.parse(readFileSync(contractPath, 'utf8'));
}

/**
 * Colunas de `columns` que batem num padrão sensível e que NÃO estão
 * mascaradas para NULL (`masked_null`) nem já documentadas
 * (`sensitive_acknowledged`) naquela view.
 */
export function findUnacknowledgedSensitiveColumns(columns, spec) {
  const maskedNull = new Set(spec.masked_null ?? []);
  const acknowledged = new Set(Object.keys(spec.sensitive_acknowledged ?? {}));
  const findings = [];
  for (const col of columns) {
    if (maskedNull.has(col) || acknowledged.has(col)) continue;
    const hit = SENSITIVE_PATTERNS.find((p) => p.re.test(col));
    if (hit) findings.push({ column: col, pattern: hit.label });
  }
  return findings;
}

export function validateContractStructure(contract) {
  const views = contract.views ?? {};
  const errors = [];
  for (const [view, spec] of Object.entries(views)) {
    if (spec.anon_select !== undefined && typeof spec.anon_select !== 'boolean') {
      errors.push(`${view}: anon_select precisa ser booleano`);
    }
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
    for (const s of Object.keys(spec.sensitive_acknowledged ?? {})) {
      if (!spec.columns.includes(s)) {
        errors.push(`${view}: sensitive_acknowledged referencia coluna inexistente: ${s}`);
      }
    }
    const unacknowledged = findUnacknowledgedSensitiveColumns(spec.columns, spec);
    for (const f of unacknowledged) {
      errors.push(
        `${view}: coluna '${f.column}' bate no padrão sensível '${f.pattern}' e não está em masked_null nem sensitive_acknowledged`,
      );
    }
  }
  return errors;
}

export function diffLive(contract, liveRows) {
  const views = contract.views ?? {};
  const errors = [];
  const byName = new Map(liveRows.map((r) => [r.relname, r.columns]));
  for (const [view, spec] of Object.entries(views)) {
    const cols = byName.get(view);
    if (!cols) {
      errors.push(`${view}: ausente no banco`);
      continue;
    }
    const extra = cols.filter((c) => !spec.columns.includes(c));
    const missing = spec.columns.filter((c) => !cols.includes(c));
    if (extra.length) {
      errors.push(`${view}: colunas NOVAS no banco (revisar exposição ao anon): ${extra.join(', ')}`);
    }
    if (missing.length) {
      errors.push(`${view}: colunas do contrato ausentes no banco: ${missing.join(', ')}`);
    }
    for (const f of spec.forbidden ?? []) {
      if (cols.includes(f)) errors.push(`${view}: coluna PROIBIDA exposta no banco: ${f}`);
    }
    const unacknowledgedLive = findUnacknowledgedSensitiveColumns(cols, spec);
    for (const f of unacknowledgedLive) {
      errors.push(
        `${view}: coluna '${f.column}' (ao vivo) bate no padrão sensível '${f.pattern}' sem allowlist/máscara`,
      );
    }
  }
  for (const r of liveRows) {
    if (!views[r.relname]) errors.push(`${r.relname}: view pública no banco sem entrada no contrato`);
  }
  return errors;
}

export function loadAnonAllowlist(allowlistPath = ANON_ALLOWLIST_PATH) {
  return JSON.parse(readFileSync(allowlistPath, 'utf8'));
}

/**
 * Integridade estática da allowlist de exposição: toda entrada precisa de
 * `reason` real (sem marcador de pendência), de `columns` congeladas e não pode
 * esconder coluna que bata num padrão sensível sem `sensitive_acknowledged`.
 */
export function validateAnonAllowlistIntegrity(doc) {
  const errors = [];
  const objects = doc.objects;
  if (!Array.isArray(objects)) return ['anon-select-allowlist: campo objects ausente ou inválido'];
  const seen = new Set();
  for (const entry of objects) {
    const name = entry.object;
    if (!name || typeof name !== 'string') {
      errors.push(`anon-select-allowlist: entrada sem 'object' válido: ${JSON.stringify(entry)}`);
      continue;
    }
    if (seen.has(name)) errors.push(`anon-select-allowlist: ${name} aparece mais de uma vez`);
    seen.add(name);
    if (!entry.reason || !String(entry.reason).trim()) {
      errors.push(`anon-select-allowlist: ${name} sem campo 'reason'`);
    } else if (/TODO|PENDENTE|FALTA|PLACEHOLDER/i.test(entry.reason)) {
      errors.push(`anon-select-allowlist: ${name} com marcador de pendência na reason`);
    }
    if (!Array.isArray(entry.columns) || entry.columns.length === 0) {
      errors.push(`anon-select-allowlist: ${name} sem 'columns' (colunas congeladas)`);
      continue;
    }
    for (const f of findUnacknowledgedSensitiveColumns(entry.columns, entry)) {
      errors.push(
        `anon-select-allowlist: ${name}.${f.column} bate no padrão sensível '${f.pattern}' e não está em sensitive_acknowledged`,
      );
    }
  }
  return errors;
}

/**
 * Terceira checagem: o que o `anon` consegue ler em `public` (view ou matview,
 * por GRANT de tabela ou de coluna) precisa estar no contrato ou na allowlist,
 * com colunas congeladas. Re-concessão de grant em view declarada
 * `anon_select: false` também falha.
 */
export function diffAnonExposure(contract, allowlist, anonRows) {
  const errors = [];
  const views = contract.views ?? {};
  const allowed = new Map((allowlist.objects ?? []).map((o) => [o.object, o]));
  const exposed = new Map();

  for (const row of anonRows ?? []) {
    const cols = Array.isArray(row.anon_columns) ? row.anon_columns : [];
    if (row.anon_select === true || cols.length > 0) {
      exposed.set(row.relname, {
        relkind: row.relkind ?? 'v',
        columns: cols.length > 0 ? cols : Array.isArray(row.columns) ? row.columns : [],
      });
    }
  }

  for (const [view, spec] of Object.entries(views)) {
    const declared = spec.anon_select !== false;
    const isExposed = exposed.has(view);
    if (declared && !isExposed) {
      errors.push(
        `${view}: o contrato espera SELECT para anon e o privilégio NÃO existe no banco (view pública quebrada)`,
      );
    }
    if (!declared && isExposed) {
      errors.push(
        `${view}: o contrato marca anon_select=false e o anon TEM SELECT no banco (re-concessão de grant)`,
      );
    }
  }

  for (const [name, info] of exposed) {
    if (views[name]) continue;
    if (allowed.has(name)) continue;
    const sensitive = findUnacknowledgedSensitiveColumns(info.columns, {});
    const hint = sensitive.length
      ? ` — colunas sensíveis: ${sensitive.map((f) => `${f.column} (${f.pattern})`).join(', ')}`
      : '';
    errors.push(
      `${name} (${info.relkind}): legível por anon sem entrada no contrato nem em ` +
        `.security/anon-select-allowlist.json${hint} — colunas: ${info.columns.join(', ')}`,
    );
  }

  for (const [name, entry] of allowed) {
    const info = exposed.get(name);
    if (!info) {
      errors.push(
        `${name}: entrada da allowlist sem efeito (anon não tem SELECT no objeto) — remover a entrada`,
      );
      continue;
    }
    const expected = entry.columns ?? [];
    const extra = info.columns.filter((c) => !expected.includes(c));
    const missing = expected.filter((c) => !info.columns.includes(c));
    if (extra.length) {
      errors.push(`${name}: colunas NOVAS legíveis por anon (revisar antes de expor): ${extra.join(', ')}`);
    }
    if (missing.length) {
      errors.push(`${name}: colunas da allowlist ausentes no banco: ${missing.join(', ')}`);
    }
    for (const f of findUnacknowledgedSensitiveColumns(info.columns, entry)) {
      errors.push(
        `${name}: coluna '${f.column}' bate no padrão sensível '${f.pattern}' sem sensitive_acknowledged`,
      );
    }
  }

  return errors;
}

function summarizeAcknowledged(contract) {
  const lines = [];
  for (const [view, spec] of Object.entries(contract.views ?? {})) {
    for (const [col, info] of Object.entries(spec.sensitive_acknowledged ?? {})) {
      const pattern = info.pattern ? ` (${info.pattern})` : '';
      lines.push(`${view}.${col} [${info.status ?? 'sem status'}]${pattern}`);
    }
  }
  return lines;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return JSON.parse(value);
}

async function fetchLive(contract) {
  const viewNames = Object.keys(contract.views ?? {});
  const contractRes = await querySupabaseReadOnly(buildContractSql(viewNames));
  if (contractRes.kind !== 'live') {
    return { ...contractRes, maskedUrl: maskUrl(contractRes.target) };
  }
  const anonRes = await querySupabaseReadOnly(buildAnonSql());
  if (anonRes.kind !== 'live') {
    return { ...anonRes, maskedUrl: maskUrl(anonRes.target) };
  }
  return {
    kind: 'live',
    source: contractRes.source,
    maskedUrl: maskUrl(contractRes.target),
    rows: contractRes.rows.map((r) => ({ relname: r.relname, columns: toArray(r.columns) })),
    anonRows: anonRes.rows.map((r) => ({
      relname: r.relname,
      relkind: r.relkind,
      anon_select: r.anon_select === true || r.anon_select === 't',
      columns: toArray(r.columns),
      anon_columns: toArray(r.anon_columns),
    })),
  };
}

export async function main() {
  const contract = loadContract();
  const anonAllowlist = loadAnonAllowlist();
  const structuralErrors = [
    ...validateContractStructure(contract),
    ...validateAnonAllowlistIntegrity(anonAllowlist),
  ];

  let liveRows = null;
  let anonRows = null;
  let liveStatusOverride = null;

  if (LIVE_FILE) {
    const parsed = JSON.parse(readFileSync(LIVE_FILE, 'utf8'));
    if (Array.isArray(parsed)) {
      liveRows = parsed;
    } else {
      liveRows = parsed.contract ?? [];
      anonRows = parsed.anon ?? [];
    }
  } else {
    const live = await fetchLive(contract);
    if (live.kind === 'live') {
      liveRows = live.rows;
      anonRows = live.anonRows;
    } else if (live.kind === 'missing-config') {
      liveStatusOverride = {
        status: REQUIRE_LIVE ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
        summary: REQUIRE_LIVE
          ? 'sem credenciais pg-meta; evidência live obrigatória não disponível'
          : 'sem credenciais pg-meta; verificação ficou em modo estático (contrato + allowlist)',
        details: { reason: live.kind, requireLive: REQUIRE_LIVE, maskedUrl: live.maskedUrl },
      };
    } else {
      liveStatusOverride = {
        status: CHECK_RESULT_STATUS.INCONCLUSIVE,
        summary: `pg-meta indisponível para consulta live (${live.kind})`,
        details: {
          reason: live.kind,
          maskedUrl: live.maskedUrl,
          httpStatus: live.httpStatus,
          responseType: live.responseType,
          bodyLength: live.bodyLength,
        },
      };
    }
  }

  const liveErrors = liveRows ? diffLive(contract, liveRows) : [];
  const anonErrors = anonRows ? diffAnonExposure(contract, anonAllowlist, anonRows) : [];
  const allErrors = [...structuralErrors, ...liveErrors, ...anonErrors];
  const acknowledgedLines = summarizeAcknowledged(contract);

  if (allErrors.length) {
    process.stderr.write(`\n✗ public-views-drift: ${allErrors.length} problema(s)\n`);
    for (const e of allErrors) process.stderr.write(`  - ${e}\n`);
    return concludeCheck({
      check: 'public-views-drift',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${allErrors.length} problema(s) no contrato das 8 views públicas`,
      details: { errors: allErrors, acknowledgedFindings: acknowledgedLines },
    });
  }

  if (acknowledgedLines.length) {
    process.stderr.write(
      `ℹ️  ${acknowledgedLines.length} achado(s) sensível(is) já reconhecido(s) (REQUER-PO, não corrigidos nesta etapa):\n` +
        acknowledgedLines.map((l) => `   - ${l}`).join('\n') +
        '\n',
    );
  }

  if (liveStatusOverride) {
    return concludeCheck({ check: 'public-views-drift', ...liveStatusOverride });
  }

  return concludeCheck({
    check: 'public-views-drift',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${PUBLIC_VIEWS.length} views do contrato OK (live); ${anonRows ? anonRows.length : 0} objeto(s) de public conferido(s) para anon; ${acknowledgedLines.length} achado(s) sensível(is) já reconhecido(s)`,
    details: { acknowledgedFindings: acknowledgedLines },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    process.stderr.write(`[public-views-drift] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
