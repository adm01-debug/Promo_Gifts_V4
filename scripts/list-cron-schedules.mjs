#!/usr/bin/env node
/**
 * E19 — Gera tabela de crons de todos os workflows com schedule:.
 * Identifica quais usam SUPABASE_ACCESS_TOKEN (SAT) e valida:
 *   1. Nenhum minuto em :00 ou :30
 *   2. Nenhum minuto com > 1 cron SAT (acceptance criterion E19)
 *
 * Uso: node scripts/list-cron-schedules.mjs [--json]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKFLOWS_DIR = resolve(
  fileURLToPath(import.meta.url),
  '../../.github/workflows',
);

function parseCrons(content) {
  const crons = [];
  const scheduleMatch = content.match(/schedule:\s*([\s\S]*?)(?=\n\S|\n  \w+_dispatch|\n  push|\n  pull_request|$)/);
  if (!scheduleMatch) return crons;
  for (const m of scheduleMatch[1].matchAll(/cron:\s*'([^']+)'/g)) {
    crons.push(m[1]);
  }
  return crons;
}

function minuteOf(cron) {
  const part = cron.split(' ')[0];
  if (part.includes('/') || part === '*') return null; // */N or * — skip fixed-minute checks
  return parseInt(part, 10);
}

const rows = [];

for (const file of readdirSync(WORKFLOWS_DIR).sort()) {
  if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
  const path = join(WORKFLOWS_DIR, file);
  const content = readFileSync(path, 'utf8');
  const crons = parseCrons(content);
  if (crons.length === 0) continue;
  const usesSat = content.includes('SUPABASE_ACCESS_TOKEN');
  for (const cron of crons) {
    const minute = minuteOf(cron);
  rows.push({ workflow: basename(file, '.yml'), cron, minute, sat: usesSat });
  }
}

const violations = [];

// Rule 1: no :00 or :30 (skip null — variable-step crons like */15)
for (const row of rows) {
  const m = row.minute;
  if (m === null) continue;
  if (m === 0 || m === 30) {
    violations.push(`${row.workflow}: cron '${row.cron}' usa minuto :${String(m).padStart(2, '0')} (proibido)`);
  }
}

// Rule 2: no two SAT crons at the same minute (skip null)
const satByMinute = {};
for (const row of rows.filter((r) => r.sat && r.minute !== null)) {
  if (!satByMinute[row.minute]) satByMinute[row.minute] = [];
  satByMinute[row.minute].push(row.workflow);
}
for (const [min, workflows] of Object.entries(satByMinute)) {
  if (workflows.length > 1) {
    violations.push(`Minuto :${String(min).padStart(2, '0')} tem ${workflows.length} crons SAT: ${workflows.join(', ')}`);
  }
}

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ rows, violations }, null, 2) + '\n');
  process.exit(violations.length > 0 ? 1 : 0);
}

// Markdown table
const satRows = rows.filter((r) => r.sat);
const otherRows = rows.filter((r) => !r.sat);

console.log('## Tabela de Crons — Workflows com `SUPABASE_ACCESS_TOKEN`\n');
console.log('| Workflow | Cron | Minuto | Obs |');
console.log('|---|---|---|---|');
for (const row of satRows) {
  const minDisplay = row.minute === null ? 'variável' : `:${String(row.minute).padStart(2, '0')}`;
  const obs = row.minute === 0 || row.minute === 30 ? '⚠️ proibido' : '✅';
  console.log(`| \`${row.workflow}\` | \`${row.cron}\` | ${minDisplay} | ${obs} |`);
}

console.log('\n## Todos os Crons\n');
console.log('| Workflow | Cron | Minuto | SAT? |');
console.log('|---|---|---|---|');
for (const row of [...satRows, ...otherRows]) {
  const satLabel = row.sat ? '✅ SAT' : '';
  const minDisplay = row.minute === null ? 'variável' : `:${String(row.minute).padStart(2, '0')}`;
  console.log(`| \`${row.workflow}\` | \`${row.cron}\` | ${minDisplay} | ${satLabel} |`);
}

if (violations.length > 0) {
  console.error('\n### ❌ Violações\n');
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
} else {
  console.log('\n### ✅ Sem violações de E19\n');
  process.exit(0);
}
