#!/usr/bin/env node
/**
 * E93 — Métricas de CI como artefato semanal.
 *
 * Consulta a API do GitHub (read-only) e gera docs/ci/METRICAS_SEMANAIS.md
 * com: runs/workflow, minutos, taxa de falha, skips, "verde vazio" (expected==0).
 *
 * Uso:
 *   node scripts/ci-metrics.mjs [--days 7] [--output docs/ci/METRICAS_SEMANAIS.md]
 *
 * Requer: GH_TOKEN (com actions:read) e GITHUB_REPOSITORY (owner/repo).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OWNER_REPO = process.env.GITHUB_REPOSITORY || 'adm01-debug/Promo_Gifts_V4';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const args = process.argv.slice(2);
const daysIdx = args.indexOf('--days');
const DAYS = daysIdx !== -1 ? parseInt(args[daysIdx + 1], 10) : 7;
const outIdx = args.indexOf('--output');
const OUTPUT = outIdx !== -1 ? args[outIdx + 1] : 'docs/ci/METRICAS_SEMANAIS.md';

if (!TOKEN) {
  console.error('ERRO: GH_TOKEN ou GITHUB_TOKEN não definido.');
  process.exit(1);
}

const [owner, repo] = OWNER_REPO.split('/');
const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

async function gh(path, params = {}) {
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function paginate(path, params = {}, key = null) {
  const items = [];
  let page = 1;
  while (true) {
    const data = await gh(path, { ...params, per_page: 100, page });
    const batch = key ? data[key] : data;
    items.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return items;
}

console.log(`Coletando métricas dos últimos ${DAYS} dias (desde ${since.slice(0, 10)})…`);

const workflows = await paginate('actions/workflows', {}, 'workflows');
console.log(`  ${workflows.length} workflows encontrados`);

const metrics = [];

for (const wf of workflows) {
  const runs = await paginate(`actions/workflows/${wf.id}/runs`, { created: `>=${since.slice(0, 10)}` }, 'workflow_runs');

  if (runs.length === 0) {
    metrics.push({ name: wf.name, path: wf.path, runs: 0, minutes: 0, failures: 0, skips: 0, noTests: 0, lastRun: null });
    continue;
  }

  let minutes = 0;
  let failures = 0;
  let skips = 0;
  let noTests = 0;

  for (const run of runs) {
    // Duração aproximada (created_at → updated_at)
    const dur = (new Date(run.updated_at) - new Date(run.created_at)) / 60000;
    minutes += dur;
    if (run.conclusion === 'failure') failures++;
    if (run.conclusion === 'skipped') skips++;
  }

  const lastRun = runs[0].created_at?.slice(0, 10) ?? null;

  metrics.push({ name: wf.name, path: wf.path, runs: runs.length, minutes: Math.round(minutes), failures, skips, noTests, lastRun });
}

metrics.sort((a, b) => b.minutes - a.minutes);

const totalRuns = metrics.reduce((s, m) => s + m.runs, 0);
const totalMinutes = metrics.reduce((s, m) => s + m.minutes, 0);
const totalFailures = metrics.reduce((s, m) => s + m.failures, 0);
const zeroRunCount = metrics.filter(m => m.runs === 0).length;

const now = new Date().toISOString().slice(0, 10);

const md = `# Métricas de CI — últimos ${DAYS} dias (${now})

> Gerado por \`scripts/ci-metrics.mjs\` (E93). Fonte: GitHub Actions API (read-only).

## Resumo

| Métrica | Valor |
| --- | --- |
| Total de runs | ${totalRuns} |
| Total de minutos | ${totalMinutes} |
| Total de falhas | ${totalFailures} |
| Taxa de falha | ${totalRuns > 0 ? ((totalFailures / totalRuns) * 100).toFixed(1) : 0}% |
| Workflows sem run | ${zeroRunCount} de ${metrics.length} |

## Por workflow (top 30 por minutos)

| Workflow | Runs | Min | Falhas | Último run |
| --- | --- | --- | --- | --- |
${metrics.slice(0, 30).map(m =>
  `| ${m.name} | ${m.runs} | ${m.minutes} | ${m.failures} | ${m.lastRun ?? '—'} |`
).join('\n')}

## Workflows sem run nos últimos ${DAYS} dias

${zeroRunCount === 0 ? '_Nenhum._' : metrics.filter(m => m.runs === 0).map(m => `- \`${m.path}\``).join('\n')}

---
_Gerado automaticamente por scripts/ci-metrics.mjs_
`;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, md);
console.log(`Relatório gravado em ${OUTPUT}`);
console.log(`  ${totalRuns} runs · ${totalMinutes} min · ${totalFailures} falhas · ${zeroRunCount} workflows sem run`);
