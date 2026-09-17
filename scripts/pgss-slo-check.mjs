#!/usr/bin/env node
/**
 * pgss-slo-check.mjs
 *
 * PLANO_DBA E40 — checagem somente-leitura usada por
 * `.github/workflows/pgss-slo-report.yml` (semanal). Lê a série histórica
 * gravada pelo cron `pgss-history-weekly` em `ops.pgss_history` (tabela
 * criada pela migration da etapa E40, ainda não aplicada — aguarda
 * aprovação do PO e depende do schema `ops` já existir via E30) e compara
 * a última captura de cada RPC contra o SLO declarado em `SLO_TARGETS_MS`.
 *
 * Não aplica DDL nenhuma, não escreve em `ops.pgss_history`, não chama
 * `pg_stat_statements_reset()` — só lê e decide. Mesmo contrato de graceful
 * degradation dos outros checks deste repo (`check-result-contract.mjs`):
 * sem credenciais → static-pass/inconclusive; tabela ainda não existe (E40
 * não aplicado) → inconclusive, não failed.
 *
 * `pg_stat_statements` não expõe percentil nativamente (só min/mean/max/
 * stddev por statement). p95 é aproximado por `mean + 1.645 * stddev`
 * (heurística de distribuição normal) — documentado como aproximação em
 * docs/E40_BASELINE_DESEMPENHO_SLO_2026-09-16.md, mesma honestidade sobre
 * limitação de método que E30 já documentou para sua regressão linear.
 *
 * Uso:
 *   node scripts/pgss-slo-check.mjs --out=/tmp/pgss-slo.json [--require-live]
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed — >=1 RPC acima do SLO),
 *             2 (inconclusive/erro).
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

// p95 aproximado (ms) — origem: docs/E40_BASELINE_DESEMPENHO_SLO_2026-09-16.md,
// medido ao vivo em pg_stat_statements/extensions.pg_stat_statements (2026-09-17)
// via padrão pgrst_call (chamada roteada por PostgREST, não job interno/cron).
// RPCs nomeadas no plano original (Kit Maker, orçamento, catálogo público,
// busca) tinham ZERO chamadas medidas na janela capturada — recebem o SLO
// padrão de 500 ms proativamente, sem baseline próprio ainda.
export const SLO_TARGETS_MS = {
  fn_process_raw_v2: 500,
  fn_asia_stock_fast_sync: 500,
  fn_spot_direct_prices_gold: 500,
  fn_spot_direct_stock_gold: 500,
  fn_get_stock_notification_counts: 500,
  fn_get_recent_restocks: 500,
  fn_get_product_intelligence_all: 500,
  create_kit_quote_transactional: 500,
  save_custom_kit_atomic: 500,
  fn_global_search: 500,
};

const P95_Z_SCORE = 1.645;

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const outArg = argv.find((a) => a.startsWith('--out='));
const OUT_PATH = outArg ? outArg.slice('--out='.length) : null;

/**
 * Função pura central — recebe as linhas já coletadas (uma por
 * fn_name×queryid×captured_at) e decide quais RPCs monitoradas estão acima
 * do SLO na captura mais recente de cada uma. Sem I/O, testável por
 * mutação (mesmo padrão de `computeProjections` em E30).
 */
export function evaluateSloBreaches({ rows, sloTargetsMs = SLO_TARGETS_MS, p95ZScore = P95_Z_SCORE }) {
  if (rows.length === 0) {
    return { insufficientData: true, evaluated: [], breaches: [], untrackedTargets: Object.keys(sloTargetsMs) };
  }

  const byFn = new Map();
  for (const row of rows) {
    if (!row.fn_name) continue;
    if (!byFn.has(row.fn_name)) byFn.set(row.fn_name, []);
    byFn.get(row.fn_name).push(row);
  }

  const evaluated = [];
  const untrackedTargets = [];

  for (const [fnName, sloMs] of Object.entries(sloTargetsMs)) {
    const fnRows = byFn.get(fnName);
    if (!fnRows || fnRows.length === 0) {
      untrackedTargets.push(fnName);
      continue;
    }
    fnRows.sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at));
    const latest = fnRows[0];
    const p95Estimate = latest.mean_exec_time + p95ZScore * (latest.stddev_exec_time ?? 0);

    evaluated.push({
      fnName,
      sloMs,
      capturedAt: latest.captured_at,
      calls: latest.calls,
      meanMs: Number(latest.mean_exec_time.toFixed(2)),
      p95EstimateMs: Number(p95Estimate.toFixed(2)),
      breach: p95Estimate > sloMs,
    });
  }

  const breaches = evaluated.filter((e) => e.breach);

  return { insufficientData: false, evaluated, breaches, untrackedTargets };
}

async function main() {
  const historyResult = await querySupabaseReadOnly(
    'SELECT fn_name, queryid, captured_at, calls, mean_exec_time, stddev_exec_time, max_exec_time FROM ops.pgss_history WHERE fn_name IS NOT NULL ORDER BY captured_at;',
  );
  const maskedUrl = historyResult.target ? maskUrl(historyResult.target) : undefined;

  if (historyResult.kind !== 'live') {
    const status =
      historyResult.kind === 'missing-config'
        ? REQUIRE_LIVE
          ? CHECK_RESULT_STATUS.INCONCLUSIVE
          : CHECK_RESULT_STATUS.STATIC_PASS
        : CHECK_RESULT_STATUS.INCONCLUSIVE;
    return concludeCheck({
      check: 'pgss-slo-check',
      status,
      summary:
        historyResult.kind === 'missing-config'
          ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem de SLO não pôde rodar ao vivo'
          : `Management API indisponível ou ops.pgss_history ainda não existe (${historyResult.kind}) — pacote E40 pode não ter sido aplicado ainda`,
      details: { reason: historyResult.kind, maskedUrl },
    });
  }

  const { insufficientData, evaluated, breaches, untrackedTargets } = evaluateSloBreaches({
    rows: historyResult.rows,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    sloTargetsMs: SLO_TARGETS_MS,
    p95ZScore: P95_Z_SCORE,
    insufficientData,
    evaluated,
    breaches,
    untrackedTargets,
  };
  if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  if (insufficientData) {
    return concludeCheck({
      check: 'pgss-slo-check',
      status: CHECK_RESULT_STATUS.PASSED,
      summary: 'ops.pgss_history ainda sem nenhuma captura — nada a avaliar.',
      details: {},
    });
  }

  if (breaches.length > 0) {
    return concludeCheck({
      check: 'pgss-slo-check',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${breaches.length} RPC(s) acima do SLO (p95 estimado): ${breaches.map((b) => `${b.fnName} (${b.p95EstimateMs}ms > ${b.sloMs}ms)`).join(', ')}.`,
      details: { breaches, untrackedTargets },
    });
  }

  return concludeCheck({
    check: 'pgss-slo-check',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${evaluated.length}/${Object.keys(SLO_TARGETS_MS).length} RPC(s) monitorada(s) com captura; nenhuma acima do SLO. ${untrackedTargets.length} sem captura ainda: ${untrackedTargets.join(', ') || 'nenhuma'}.`,
    details: { evaluatedCount: evaluated.length, untrackedTargets },
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[pgss-slo-check] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
