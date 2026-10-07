#!/usr/bin/env node
/**
 * E93 — Coleta métricas de CI da última semana via GitHub REST API
 * Saída: docs/ci/METRICAS_SEMANAIS.md
 *
 * Uso: GH_TOKEN=<token> GITHUB_REPOSITORY=owner/repo node scripts/ci-metrics.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'adm01-debug/Promo_Gifts_V4';
const [OWNER, REPO_NAME] = REPO.split('/');

if (!TOKEN) {
  console.error('GH_TOKEN ou GITHUB_TOKEN obrigatório');
  process.exit(1);
}

const BASE = `https://api.github.com/repos/${OWNER}/${REPO_NAME}`;
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'ci-metrics/1.0',
};

async function ghGet(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status} ${r.statusText}`);
  return r.json();
}

async function paginate(url, key) {
  const results = [];
  let page = 1;
  while (true) {
    const sep = url.includes('?') ? '&' : '?';
    const data = await ghGet(`${url}${sep}per_page=100&page=${page}`);
    const items = key ? data[key] : data;
    results.push(...items);
    if (items.length < 100) break;
    page++;
    if (page > 5) break; // safety cap: max 500 items
  }
  return results;
}

function p95(durations) {
  if (!durations.length) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

function fmtDuration(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m${rem}s` : `${m}m`;
}

function fmtMin(ms) {
  if (!ms) return 0;
  return (ms / 60000).toFixed(1);
}

async function main() {
  const now = new Date();
  const since7d = new Date(now - 7 * 86400 * 1000).toISOString();
  const since30d = new Date(now - 30 * 86400 * 1000).toISOString();

  console.log(`Coletando workflows de ${OWNER}/${REPO_NAME}...`);
  const workflows = await paginate(`${BASE}/actions/workflows`, 'workflows');
  console.log(`  ${workflows.length} workflows encontrados`);

  const rows = [];

  for (const wf of workflows) {
    if (wf.state !== 'active') continue;

    // runs dos últimos 30 dias (p95 precisa de mais amostras)
    let runs30 = [];
    try {
      runs30 = await paginate(
        `${BASE}/actions/workflows/${wf.id}/runs?created=>=${since30d}&status=completed`,
        'workflow_runs',
      );
    } catch {
      runs30 = [];
    }

    const runs7 = runs30.filter((r) => r.created_at >= since7d);

    const total = runs7.length;
    const failures = runs7.filter(
      (r) => r.conclusion === 'failure' || r.conclusion === 'startup_failure',
    ).length;
    const skipped = runs7.filter((r) => r.conclusion === 'skipped').length;
    const successRuns = runs7.filter(
      (r) => r.conclusion === 'success' || r.conclusion === 'neutral',
    );

    // durations in ms
    const durations = runs30
      .filter((r) => r.run_started_at && r.updated_at)
      .map((r) => new Date(r.updated_at) - new Date(r.run_started_at))
      .filter((d) => d > 0);

    const p95ms = p95(durations);

    // minutes billed approximation (GitHub rounds up per job; we approximate)
    const totalMinutes = runs7.reduce((acc, r) => {
      const dur = r.updated_at
        ? new Date(r.updated_at) - new Date(r.run_started_at || r.created_at)
        : 0;
      return acc + Math.ceil(Math.max(dur, 0) / 60000);
    }, 0);

    // consecutive failures (look at last 5 runs ordered by created_at desc)
    const lastRuns = runs30
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
    let consecutiveFails = 0;
    for (const r of lastRuns) {
      if (r.conclusion === 'failure' || r.conclusion === 'startup_failure') {
        consecutiveFails++;
      } else {
        break;
      }
    }

    // last run timestamp
    const lastRun = runs30[0]
      ? new Date(runs30[0].created_at).toISOString().slice(0, 10)
      : null;
    const daysSinceLastRun = lastRun
      ? Math.floor((now - new Date(lastRun)) / 86400000)
      : 999;

    const alerts = [];
    if (daysSinceLastRun >= 7 && total === 0)
      alerts.push(`⚠️ sem run em ≥7d`);
    if (consecutiveFails >= 3)
      alerts.push(`🔴 ${consecutiveFails} falhas consecutivas`);

    rows.push({
      name: wf.name,
      path: wf.path.replace('.github/workflows/', ''),
      total,
      failures,
      failureRate:
        total > 0 ? ((failures / total) * 100).toFixed(0) + '%' : '—',
      skipped,
      minutesTotal: totalMinutes,
      p95ms,
      lastRun: lastRun || '—',
      daysSinceLast: daysSinceLastRun,
      alerts: alerts.join(' '),
      consecutiveFails,
    });
  }

  rows.sort((a, b) => b.failures - a.failures || b.total - a.total);

  const dateStr = now.toISOString().slice(0, 10);
  const weekStr = `semana de ${since7d.slice(0, 10)} a ${dateStr}`;

  const alertRows = rows.filter((r) => r.alerts);
  const totalRuns = rows.reduce((s, r) => s + r.total, 0);
  const totalFails = rows.reduce((s, r) => s + r.failures, 0);
  const totalMins = rows.reduce((s, r) => s + r.minutesTotal, 0);

  const md = [
    `# Métricas de CI — ${dateStr}`,
    ``,
    `> **Período:** ${weekStr}  `,
    `> **Gerado por:** \`scripts/ci-metrics.mjs\` (E93)  `,
    `> **Repo:** ${OWNER}/${REPO_NAME}`,
    ``,
    `## Resumo`,
    ``,
    `| Métrica | Valor |`,
    `|---|---|`,
    `| Workflows ativos | ${rows.length} |`,
    `| Total de runs (7d) | ${totalRuns} |`,
    `| Total de falhas (7d) | ${totalFails} |`,
    `| Taxa de falha global | ${totalRuns > 0 ? ((totalFails / totalRuns) * 100).toFixed(1) : 0}% |`,
    `| Minutos estimados (7d) | ~${totalMins} |`,
    `| Alertas ativos | ${alertRows.length} |`,
    ``,
  ];

  if (alertRows.length > 0) {
    md.push(`## Alertas`, ``);
    for (const r of alertRows) {
      md.push(`- **${r.name}** (\`${r.path}\`): ${r.alerts}`);
    }
    md.push(``);
  }

  md.push(
    `## Por workflow`,
    ``,
    `| Workflow | Runs | Falhas | Taxa | Skipped | Min est. | p95 (30d) | Último run | Alertas |`,
    `|---|---|---|---|---|---|---|---|---|`,
  );

  for (const r of rows) {
    md.push(
      `| ${r.name} | ${r.total} | ${r.failures} | ${r.failureRate} | ${r.skipped} | ${r.minutesTotal} | ${fmtDuration(r.p95ms)} | ${r.lastRun} | ${r.alerts || '✅'} |`,
    );
  }

  md.push(``, `---`, `_Gerado automaticamente. Não editar manualmente._`);

  const outPath = join(ROOT, 'docs/ci/METRICAS_SEMANAIS.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md.join('\n') + '\n');
  console.log(`Relatório escrito em docs/ci/METRICAS_SEMANAIS.md`);
  console.log(`  ${rows.length} workflows, ${totalRuns} runs, ${totalFails} falhas, ${alertRows.length} alertas`);

  if (alertRows.length > 0) {
    console.log('\nAlertas:');
    for (const r of alertRows) console.log(`  ${r.name}: ${r.alerts}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
