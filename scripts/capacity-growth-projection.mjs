#!/usr/bin/env node
/**
 * capacity-growth-projection.mjs
 *
 * PLANO_DBA E30 — checagem somente-leitura usada por
 * `.github/workflows/capacity-growth-report.yml` (semanal). Lê a série
 * histórica gravada pelo cron `table-size-history-daily` em
 * `ops.table_size_history` (tabela criada pela migration da etapa E30,
 * ainda não aplicada — aguarda aprovação do PO) e projeta o tamanho de cada
 * tabela `public` 90 dias à frente por regressão linear simples entre o
 * primeiro e o último ponto da série.
 *
 * Não aplica DDL nenhuma, não escreve em `ops.table_size_history` — só lê e
 * decide. Mesmo contrato de graceful degradation dos outros checks deste
 * repo (`check-result-contract.mjs`): sem credenciais → static-pass/
 * inconclusive; tabela ainda não existe (E30 não aplicado) → inconclusive,
 * não failed (ausência de dado não é um achado de capacidade).
 *
 * Sinaliza (`flags`) uma tabela quando, projetando a taxa de crescimento
 * observada 90 dias à frente:
 *   - o tamanho projetado passaria de `objectSharePct` (default 20%) do
 *     tamanho total do banco, OU
 *   - a taxa de crescimento mensal projetada passaria de `monthlyGrowthPct`
 *     (default 30%).
 * Com menos de `minSeriesDays` (default 7) dias de série coletada, a
 * projeção é considerada prematura (`insufficientData: true`) — sem flags.
 *
 * Uso:
 *   node scripts/capacity-growth-projection.mjs --out=/tmp/capacity.json [--require-live]
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed — >=1 tabela sinalizada),
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

const HORIZON_DAYS = 90;
const MIN_SERIES_DAYS = 7;
const OBJECT_SHARE_PCT = 20;
const MONTHLY_GROWTH_PCT = 30;

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const outArg = argv.find((a) => a.startsWith('--out='));
const OUT_PATH = outArg ? outArg.slice('--out='.length) : null;

/**
 * Função pura central — recebe as linhas já coletadas (uma por
 * tabela×captured_at) e o tamanho total do banco no ponto mais recente, e
 * decide quais tabelas sinalizar. Sem I/O, testável por mutação (mesmo
 * padrão de `evaluatePreflight` em E15 / `computeViolations` em E22).
 */
export function computeProjections({
  rows,
  totalDbBytes,
  horizonDays = HORIZON_DAYS,
  minSeriesDays = MIN_SERIES_DAYS,
  objectSharePct = OBJECT_SHARE_PCT,
  monthlyGrowthPct = MONTHLY_GROWTH_PCT,
}) {
  if (rows.length === 0) {
    return { insufficientData: true, seriesDaysAvailable: 0, flags: [], projections: [] };
  }

  const timestamps = rows.map((r) => new Date(r.captured_at).getTime());
  const seriesDaysAvailable = (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000;

  if (seriesDaysAvailable < minSeriesDays) {
    return { insufficientData: true, seriesDaysAvailable, flags: [], projections: [] };
  }

  const byTable = new Map();
  for (const row of rows) {
    const key = `${row.schema_name}.${row.table_name}`;
    if (!byTable.has(key)) byTable.set(key, []);
    byTable.get(key).push(row);
  }

  const projections = [];
  for (const [key, tableRows] of byTable) {
    tableRows.sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
    const oldest = tableRows[0];
    const newest = tableRows[tableRows.length - 1];
    const tableSeriesDays = (new Date(newest.captured_at) - new Date(oldest.captured_at)) / 86_400_000;

    if (tableSeriesDays <= 0) {
      projections.push({ table: key, skipped: 'menos de 1 dia de série para esta tabela' });
      continue;
    }

    const growthBytesPerDay = (newest.total_bytes - oldest.total_bytes) / tableSeriesDays;
    const projectedBytes = Math.max(0, newest.total_bytes + growthBytesPerDay * horizonDays);
    const projectedSharePct = totalDbBytes > 0 ? (projectedBytes / totalDbBytes) * 100 : 0;
    const growthPctPerMonth = oldest.total_bytes > 0 ? ((growthBytesPerDay * 30) / oldest.total_bytes) * 100 : null;

    projections.push({
      table: key,
      currentBytes: newest.total_bytes,
      projectedBytes: Math.round(projectedBytes),
      projectedSharePct: Number(projectedSharePct.toFixed(2)),
      growthPctPerMonth: growthPctPerMonth == null ? null : Number(growthPctPerMonth.toFixed(2)),
      tableSeriesDays: Number(tableSeriesDays.toFixed(1)),
    });
  }

  const flags = projections.filter(
    (p) =>
      !p.skipped &&
      (p.projectedSharePct > objectSharePct || (p.growthPctPerMonth != null && p.growthPctPerMonth > monthlyGrowthPct)),
  );

  return { insufficientData: false, seriesDaysAvailable, flags, projections };
}

async function main() {
  const historyResult = await querySupabaseReadOnly(
    'SELECT schema_name, table_name, captured_at, total_bytes, live_tup FROM ops.table_size_history ORDER BY captured_at;',
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
      check: 'capacity-growth-projection',
      status,
      summary:
        historyResult.kind === 'missing-config'
          ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; projeção não pôde rodar ao vivo'
          : `Management API indisponível ou ops.table_size_history ainda não existe (${historyResult.kind}) — pacote E30 pode não ter sido aplicado ainda`,
      details: { reason: historyResult.kind, maskedUrl },
    });
  }

  const sizeResult = await querySupabaseReadOnly('SELECT pg_database_size(current_database()) AS total_bytes;');
  const totalDbBytes = sizeResult.kind === 'live' && sizeResult.rows[0] ? Number(sizeResult.rows[0].total_bytes) : 0;

  const { insufficientData, seriesDaysAvailable, flags, projections } = computeProjections({
    rows: historyResult.rows,
    totalDbBytes,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    horizonDays: HORIZON_DAYS,
    minSeriesDays: MIN_SERIES_DAYS,
    objectSharePct: OBJECT_SHARE_PCT,
    monthlyGrowthPct: MONTHLY_GROWTH_PCT,
    seriesDaysAvailable: Number(seriesDaysAvailable.toFixed(1)),
    insufficientData,
    totalDbBytes,
    flags,
    projections,
  };
  if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  if (insufficientData) {
    return concludeCheck({
      check: 'capacity-growth-projection',
      status: CHECK_RESULT_STATUS.PASSED,
      summary: `série com só ${seriesDaysAvailable.toFixed(1)} dia(s) coletados (mínimo ${MIN_SERIES_DAYS}) — projeção prematura, sem flags.`,
      details: { seriesDaysAvailable, minSeriesDays: MIN_SERIES_DAYS },
    });
  }

  if (flags.length > 0) {
    return concludeCheck({
      check: 'capacity-growth-projection',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${flags.length} tabela(s) projetada(s) acima do limiar (>${OBJECT_SHARE_PCT}% do banco ou >${MONTHLY_GROWTH_PCT}%/mês em ${HORIZON_DAYS}d): ${flags.map((f) => f.table).join(', ')}.`,
      details: { flags },
    });
  }

  return concludeCheck({
    check: 'capacity-growth-projection',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${projections.length} tabela(s) projetada(s), nenhuma acima do limiar (série de ${seriesDaysAvailable.toFixed(1)} dias).`,
    details: { projectionsCount: projections.length },
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[capacity-growth-projection] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
