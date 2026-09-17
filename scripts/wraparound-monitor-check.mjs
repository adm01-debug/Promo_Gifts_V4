#!/usr/bin/env node
/**
 * wraparound-monitor-check.mjs
 *
 * PLANO_DBA E33 — checagem somente-leitura usada por
 * `.github/workflows/wraparound-monitor-report.yml` (diária). Lê a série
 * gravada pelo cron `wraparound-toast-sequence-monitor` em
 * `ops.wraparound_monitor_log` (tabela criada pela migration da etapa E33,
 * ainda não aplicada — aguarda aprovação do PO, que depende por sua vez do
 * schema `ops` de E30) e compara a captura mais recente de cada objeto
 * (banco atual, sequência, replication slot, tabela) contra os thresholds
 * de aviso/crítico documentados em docs/E33_MONITOR_WRAPAROUND_2026-09-16.md
 * §2.
 *
 * Não aplica DDL nenhuma, não escreve em `ops.wraparound_monitor_log` — só
 * lê e decide. Mesmo contrato de graceful degradation dos outros checks
 * deste repo (`check-result-contract.mjs`): sem credenciais →
 * static-pass/inconclusive; tabela ainda não existe (E33 não aplicado) →
 * inconclusive, não failed (ausência de dado não é um achado de risco).
 *
 * Métricas e regras de alerta (ver doc §2 para a justificativa de cada
 * threshold):
 *   - xid_age / mxid_age (banco atual): value_numeric > limiar
 *   - sequence_pct_used (uma linha por sequência int4/int2): value_pct > limiar
 *   - replication_slot_retained_bytes: só alerta quando o slot está INATIVO
 *     (detail.active === false) e value_numeric (bytes retidos) > limiar —
 *     um slot ativo retendo WAL é normal, o risco é WAL não sendo consumido
 *   - toast_pct_of_heap: composto — só alerta quando value_pct E
 *     value_numeric (bytes de TOAST) excedem o limiar juntos, evitando
 *     ruído de tabelas pequenas com proporção TOAST alta mas volume trivial
 *
 * Uso:
 *   node scripts/wraparound-monitor-check.mjs --out=/tmp/wraparound.json [--require-live]
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed — >=1 objeto em aviso ou
 *             crítico), 2 (inconclusive/erro).
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

const XID_LIMIT = 2_000_000_000;

export const THRESHOLDS = {
  xid_age: { warn: 1_000_000_000, crit: 1_500_000_000 },
  mxid_age: { warn: 1_000_000_000, crit: 1_500_000_000 },
  sequence_pct_used: { warn: 50, crit: 80 },
  replication_slot_retained_bytes: { warn: 1_073_741_824, crit: 5_368_709_120 },
  toast_pct_of_heap: {
    warn: { pct: 200, bytes: 50 * 1024 * 1024 },
    crit: { pct: 500, bytes: 200 * 1024 * 1024 },
  },
};

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const outArg = argv.find((a) => a.startsWith('--out='));
const OUT_PATH = outArg ? outArg.slice('--out='.length) : null;

/**
 * Função pura central — recebe as linhas já coletadas (mais de uma por
 * captured_at quando há vários objetos por métrica, ex.: 10 sequências) e
 * decide qual objeto está em aviso/crítico, usando só a captura mais
 * recente. Sem I/O, testável por mutação (mesmo padrão de
 * `computeProjections` em E30 / `evaluateSloBreaches` em E40).
 */
export function evaluateWraparoundAlerts({ rows, thresholds = THRESHOLDS }) {
  if (rows.length === 0) {
    return {
      insufficientData: true, capturedAt: null, evaluated: [], warnings: [], criticals: [],
    };
  }

  const latestCapturedAt = rows.reduce(
    (max, r) => (new Date(r.captured_at) > new Date(max) ? r.captured_at : max),
    rows[0].captured_at,
  );
  const latestRows = rows.filter((r) => r.captured_at === latestCapturedAt);

  const evaluated = [];
  for (const row of latestRows) {
    const t = thresholds[row.metric];
    if (!t) continue;

    let level = null;
    if (row.metric === 'replication_slot_retained_bytes') {
      const active = row.detail?.active !== false;
      if (!active) {
        if (row.value_numeric > t.crit) level = 'critical';
        else if (row.value_numeric > t.warn) level = 'warning';
      }
    } else if (row.metric === 'toast_pct_of_heap') {
      if (row.value_pct > t.crit.pct && row.value_numeric > t.crit.bytes) level = 'critical';
      else if (row.value_pct > t.warn.pct && row.value_numeric > t.warn.bytes) level = 'warning';
    } else if (row.value_pct != null && row.metric === 'sequence_pct_used') {
      if (row.value_pct > t.crit) level = 'critical';
      else if (row.value_pct > t.warn) level = 'warning';
    } else if (row.value_numeric != null) {
      if (row.value_numeric > t.crit) level = 'critical';
      else if (row.value_numeric > t.warn) level = 'warning';
    }

    evaluated.push({ ...row, level });
  }

  const warnings = evaluated.filter((e) => e.level === 'warning');
  const criticals = evaluated.filter((e) => e.level === 'critical');
  return {
    insufficientData: false, capturedAt: latestCapturedAt, evaluated, warnings, criticals,
  };
}

async function main() {
  const historyResult = await querySupabaseReadOnly(
    "SELECT metric, object_name, captured_at, value_numeric, value_pct, unit, detail FROM ops.wraparound_monitor_log WHERE captured_at > now() - interval '3 days' ORDER BY captured_at;",
  );
  const maskedUrl = historyResult.target ? maskUrl(historyResult.target) : undefined;

  if (historyResult.kind !== 'live') {
    const status = historyResult.kind === 'missing-config'
      ? (REQUIRE_LIVE ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS)
      : CHECK_RESULT_STATUS.INCONCLUSIVE;
    return concludeCheck({
      check: 'wraparound-monitor-check',
      status,
      summary: historyResult.kind === 'missing-config'
        ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem de wraparound não pôde rodar ao vivo'
        : `Management API indisponível ou ops.wraparound_monitor_log ainda não existe (${historyResult.kind}) — pacote E33 pode não ter sido aplicado ainda`,
      details: { reason: historyResult.kind, maskedUrl },
    });
  }

  const {
    insufficientData, capturedAt, evaluated, warnings, criticals,
  } = evaluateWraparoundAlerts({ rows: historyResult.rows });

  const report = {
    generatedAt: new Date().toISOString(),
    thresholds: THRESHOLDS,
    xidLimit: XID_LIMIT,
    insufficientData,
    capturedAt,
    evaluated,
    warnings,
    criticals,
  };
  if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  if (insufficientData) {
    return concludeCheck({
      check: 'wraparound-monitor-check',
      status: CHECK_RESULT_STATUS.PASSED,
      summary: 'ops.wraparound_monitor_log ainda sem nenhuma captura — nada a avaliar.',
      details: {},
    });
  }

  if (criticals.length > 0 || warnings.length > 0) {
    return concludeCheck({
      check: 'wraparound-monitor-check',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${criticals.length} objeto(s) crítico(s), ${warnings.length} em aviso (captura ${capturedAt}): ${[...criticals, ...warnings].map((e) => `${e.metric}:${e.object_name}`).join(', ')}.`,
      details: { warnings, criticals },
    });
  }

  return concludeCheck({
    check: 'wraparound-monitor-check',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${evaluated.length} objeto(s) avaliado(s) na captura de ${capturedAt}, nenhum em aviso ou crítico.`,
    details: { evaluatedCount: evaluated.length },
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[wraparound-monitor-check] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
