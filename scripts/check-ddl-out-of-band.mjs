#!/usr/bin/env node
/**
 * check-ddl-out-of-band.mjs
 *
 * Etapa E12 (docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md).
 * Cruza a última rodada de `public.schema_signature_drift_log` (populada 4x/dia por
 * `fn_check_schema_signature_drift()` via pg_cron, job 245) com o ledger de migrations
 * (`supabase_migrations.schema_migrations`) e reporta, para cada tabela/coluna que apareceu
 * como "added"/"removed" contra `schema_signature_baseline`, se existe alguma migration cujo
 * `name`/`statements` menciona esse objeto (ou, quando o objeto é uma partição, o nome da
 * tabela-pai — para não marcar como out-of-band partições criadas por rotina, ex.
 * `magazine_ensure_view_event_partitions()`).
 *
 * O que NÃO faz: nenhuma escrita no banco. Não roda `apply_migration`/`migration repair`.
 * Não recaptura `schema_signature_baseline`. 100% leitura via Management API read-only
 * (REGRA #8, corolário: auditoria de schema só via pg_catalog/information_schema, nunca
 * PostgREST/OpenAPI — o endpoint usado aqui executa SQL direto, não passa pelo PostgREST).
 *
 * Heurística deliberadamente simples: correspondência textual (`ILIKE '%objeto%'`) contra
 * `name`/`statements` do ledger — não há `created_at` de objeto no catálogo do Postgres sem
 * um event trigger dedicado (que não existe hoje), então não é possível correlacionar por
 * timestamp exato. Ver docs/db/POLITICA_DDL.md para as limitações conhecidas.
 *
 * Fontes de dados: mesmo padrão de scripts/check-secdef-anon-drift.mjs —
 *   SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF (Management API, CI/canônico) via
 *   scripts/supabase-read-only-query.mjs. Sem credenciais → `inconclusive`/`static-pass`
 *   dependendo de --require-live (mesmo contrato de scripts/check-result-contract.mjs).
 *
 * Uso:
 *   node scripts/check-ddl-out-of-band.mjs --out=/tmp/ddl-out-of-band.json [--require-live]
 *
 * Exit codes: 0 (passed/static-pass — nada out-of-band ou sem credenciais em modo advisory),
 *             1 (failed — >=1 objeto out-of-band), 2 (inconclusive/erro).
 */

import { writeFileSync } from 'fs';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const outArg = argv.find((a) => a.startsWith('--out='));
const OUT_PATH = outArg ? outArg.slice('--out='.length) : null;

// Postgres devolve text[]/jsonb já tipado via essa API (JSON puro). Blindagem defensiva
// para o caso de vir como literal de array `{a,b,c}` (string) em vez de array JS nativo —
// não custa nada e evita quebrar o job por um detalhe de serialização não documentado.
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('{') && s.endsWith('}')) {
      const inner = s.slice(1, -1).trim();
      return inner ? inner.split(',').map((x) => x.trim().replace(/^"|"$/g, '')) : [];
    }
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asObject(v) {
  if (v == null) return {};
  if (typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

async function fetchLatestDrift() {
  const sql = `
    SELECT id, ran_at, has_drift, n_added, n_removed, n_retyped,
           columns_added, columns_removed, tables_added, tables_removed, baseline_label
    FROM public.schema_signature_drift_log
    ORDER BY ran_at DESC
    LIMIT 1;
  `.trim();
  return querySupabaseReadOnly(sql);
}

async function fetchLedgerCrossCheck(objects) {
  if (objects.length === 0) return { kind: 'live', rows: [] };
  const values = objects.map((o) => `('${sqlEscape(o)}')`).join(',\n    ');
  const sql = `
    WITH candidates(obj) AS (
      VALUES
    ${values}
    ),
    parents AS (
      SELECT c.relname AS obj, p.relname AS parent
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      WHERE c.relname IN (SELECT obj FROM candidates)
    )
    SELECT
      c.obj,
      COALESCE((
        SELECT array_agg(DISTINCT m.version ORDER BY m.version)
        FROM supabase_migrations.schema_migrations m
        WHERE m.name ILIKE '%' || c.obj || '%'
           OR EXISTS (SELECT 1 FROM unnest(m.statements) s WHERE s ILIKE '%' || c.obj || '%')
      ), ARRAY[]::text[]) AS versions_direct,
      par.parent AS partition_parent,
      COALESCE((
        SELECT array_agg(DISTINCT m.version ORDER BY m.version)
        FROM supabase_migrations.schema_migrations m
        WHERE par.parent IS NOT NULL AND (
              m.name ILIKE '%' || par.parent || '%'
           OR EXISTS (SELECT 1 FROM unnest(m.statements) s WHERE s ILIKE '%' || par.parent || '%')
        )
      ), ARRAY[]::text[]) AS versions_via_parent
    FROM candidates c
    LEFT JOIN parents par ON par.obj = c.obj
    ORDER BY c.obj;
  `.trim();
  return querySupabaseReadOnly(sql);
}

// Melhor esforço: Management API de logs (deprecated, mas ainda funcional em 2026-09) só
// aceita janelas <=24h. Se a DDL foi aplicada há mais tempo, isso volta vazio — documentado
// em docs/db/POLITICA_DDL.md. Nunca lança; falha silenciosamente para não derrubar o job.
async function fetchLogsExcerptBestEffort(object) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) return null;
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const sql = `select timestamp, event_message from postgres_logs where event_message ilike '%${sqlEscape(
    object,
  )}%' order by timestamp desc limit 5`;
  const url =
    `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/analytics/endpoints/logs.all` +
    `?sql=${encodeURIComponent(sql)}` +
    `&iso_timestamp_start=${encodeURIComponent(start.toISOString())}` +
    `&iso_timestamp_end=${encodeURIComponent(end.toISOString())}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { error: `http_${res.status}` };
    const json = await res.json();
    const rows = Array.isArray(json?.result) ? json.result : [];
    return rows.length
      ? rows.map((r) => `${r.timestamp ?? ''} ${r.event_message ?? ''}`.trim()).join('\n')
      : '(sem entradas em postgres_logs nas últimas 24h)';
  } catch (e) {
    return { error: e?.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

async function main() {
  const latest = await fetchLatestDrift();
  if (latest.kind !== 'live') {
    if (latest.kind === 'missing-config') {
      return concludeCheck({
        check: 'ddl-out-of-band',
        status: REQUIRE_LIVE ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
        summary: REQUIRE_LIVE
          ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; evidência live obrigatória não disponível'
          : 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem ficou em modo estático',
        details: { reason: latest.kind },
      });
    }
    return concludeCheck({
      check: 'ddl-out-of-band',
      status: CHECK_RESULT_STATUS.INCONCLUSIVE,
      summary: `Management API indisponível para consulta live (${latest.kind})`,
      details: {
        reason: latest.kind,
        maskedUrl: maskUrl(latest.target),
        httpStatus: latest.httpStatus,
      },
    });
  }

  if (!latest.rows.length) {
    return concludeCheck({
      check: 'ddl-out-of-band',
      status: CHECK_RESULT_STATUS.INCONCLUSIVE,
      summary:
        'public.schema_signature_drift_log está vazia — rode fn_check_schema_signature_drift() (pg_cron job 245 já faz isso 4x/dia) antes de confiar neste check',
      details: {},
    });
  }

  const row = latest.rows[0];
  const tablesAdded = asArray(row.tables_added);
  const tablesRemoved = asArray(row.tables_removed);
  const columnsAdded = asObject(row.columns_added);
  const columnsRemoved = asObject(row.columns_removed);

  const candidateSet = new Set([
    ...tablesAdded,
    ...tablesRemoved,
    ...Object.keys(columnsAdded),
    ...Object.keys(columnsRemoved),
  ]);
  const candidates = Array.from(candidateSet).sort();

  const baseReport = {
    checkedAt: new Date().toISOString(),
    driftLogId: row.id,
    ranAt: row.ran_at,
    baselineLabel: row.baseline_label,
    candidateCount: candidates.length,
  };

  if (candidates.length === 0) {
    const report = { ...baseReport, outOfBand: [] };
    if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
    return concludeCheck({
      check: 'ddl-out-of-band',
      status: CHECK_RESULT_STATUS.PASSED,
      summary: `0 diferenças na última rodada de schema_signature_drift_log (id=${row.id}, ${row.ran_at})`,
      details: report,
    });
  }

  const cross = await fetchLedgerCrossCheck(candidates);
  if (cross.kind !== 'live') {
    return concludeCheck({
      check: 'ddl-out-of-band',
      status: CHECK_RESULT_STATUS.INCONCLUSIVE,
      summary: `Management API indisponível na consulta de cruzamento com o ledger (${cross.kind})`,
      details: { reason: cross.kind, maskedUrl: maskUrl(cross.target) },
    });
  }

  const outOfBand = [];
  for (const r of cross.rows) {
    const direct = asArray(r.versions_direct);
    const viaParent = asArray(r.versions_via_parent);
    if (direct.length > 0 || viaParent.length > 0) continue; // explicado pelo ledger

    const kind = tablesAdded.includes(r.obj)
      ? 'table_added'
      : tablesRemoved.includes(r.obj)
        ? 'table_removed'
        : columnsAdded[r.obj]
          ? 'columns_added'
          : columnsRemoved[r.obj]
            ? 'columns_removed'
            : 'unknown';

    outOfBand.push({
      object: r.obj,
      kind,
      columns: columnsAdded[r.obj] || columnsRemoved[r.obj] || null,
      partitionParent: r.partition_parent || null,
    });
  }

  // Melhor esforço: anexa trecho de logs só para o que foi de fato marcado out-of-band,
  // e só para os primeiros N — evita dezenas de chamadas à Management API num job semanal.
  const LOG_EXCERPT_LIMIT = 8;
  for (const [i, item] of outOfBand.entries()) {
    if (i >= LOG_EXCERPT_LIMIT) {
      item.logsExcerpt = '(não consultado — limite de melhor esforço por rodada atingido)';
      continue;
    }
    const excerpt = await fetchLogsExcerptBestEffort(item.object);
    item.logsExcerpt =
      excerpt && typeof excerpt === 'object' && excerpt.error
        ? `(falha ao consultar postgres_logs: ${excerpt.error})`
        : excerpt || '(sem dados)';
  }

  const report = { ...baseReport, outOfBand };
  if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  if (outOfBand.length > 0) {
    return concludeCheck({
      check: 'ddl-out-of-band',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${outOfBand.length} objeto(s) sem correspondência em supabase_migrations.schema_migrations`,
      details: { objects: outOfBand.map((o) => o.object) },
    });
  }

  return concludeCheck({
    check: 'ddl-out-of-band',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${candidates.length} candidato(s) verificado(s) contra o ledger — todos explicados por alguma migration`,
    details: {},
  });
}

main().catch((e) => {
  process.stderr.write(`[ddl-out-of-band] erro: ${e.stack || e.message}\n`);
  process.exit(2);
});
