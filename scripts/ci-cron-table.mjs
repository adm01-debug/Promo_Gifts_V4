#!/usr/bin/env node
/**
 * E89: ci-cron-table.mjs
 *
 * Valida o espaçamento entre crons privilegiados (PAT/ci_readonly) e
 * gera a tabela de `docs/ci/PADRAO_WORKFLOW.md`.
 *
 * Regra: workflows que usam PAT ou CI_READONLY devem ter crons
 * separados por ≥ MIN_SPACING minutos quando disputam o mesmo slot semanal.
 *
 * Uso: node scripts/ci-cron-table.mjs [--json] [--min-spacing N]
 * Saída: tabela Markdown + resumo; exit 1 se colisão.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = join(__dirname, '..', '.github', 'workflows');
const DOW_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const minSpacingArg = args.indexOf('--min-spacing');
const MIN_SPACING = minSpacingArg !== -1 ? parseInt(args[minSpacingArg + 1]) : 20;

// Patterns that indicate a workflow uses a privileged token (PAT or read-only service token)
const PRIVILEGED_PATTERNS = [
  /secrets\.GH_PAT\b/,
  /secrets\.CI_READONLY\b/,
  /secrets\.GH_TOKEN\b/,
  /secrets\.DEPLOY_PAT\b/,
  /secrets\.ADMIN_TOKEN\b/,
  /secrets\.PAT\b/,
  /secrets\.SUPABASE_ACCESS_TOKEN\b/,
];

/** Returns all workflow YAML files */
function getWorkflowFiles() {
  try {
    return readdirSync(WORKFLOWS_DIR)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map(f => join(WORKFLOWS_DIR, f));
  } catch {
    console.error(`Erro: não encontrou ${WORKFLOWS_DIR}`);
    process.exit(1);
  }
}

/** Extracts all cron expressions from a workflow file's content */
function extractCrons(content) {
  const crons = [];
  const cronLineRe = /^\s+-\s+cron:\s*['"]?([^'"#\n]+?)['"]?\s*(?:#.*)?$/gm;
  let m;
  while ((m = cronLineRe.exec(content)) !== null) {
    const expr = m[1].trim();
    if (expr) crons.push(expr);
  }
  return crons;
}

/** Returns true if the workflow content uses a privileged token */
function isPrivileged(content) {
  return PRIVILEGED_PATTERNS.some(p => p.test(content));
}

/**
 * Parses a 5-field cron expression into a list of weekly firing times.
 * Returns null if unparseable. Each item: { day, hour, minute, weekMinute }.
 * weekMinute = day*1440 + hour*60 + minute (Mon=1 → 1440..2879)
 */
function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minuteF, hourF, , , dowF] = parts;

  const expand = (field, max) => {
    if (field === '*') return Array.from({ length: max + 1 }, (_, i) => i);
    if (/^\*\/\d+$/.test(field)) {
      const step = parseInt(field.slice(2));
      const r = [];
      for (let i = 0; i <= max; i += step) r.push(i);
      return r;
    }
    if (field.includes(',')) return field.split(',').map(Number);
    if (/^\d+-\d+$/.test(field)) {
      const [a, b] = field.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    }
    const n = parseInt(field);
    return isNaN(n) ? null : [n];
  };

  const minutes = expand(minuteF, 59);
  const hours = expand(hourF, 23);
  const rawDows = dowF === '*' ? [0, 1, 2, 3, 4, 5, 6] : expand(dowF, 7);
  if (!minutes || !hours || !rawDows) return null;
  const dows = [...new Set(rawDows.map(d => d % 7))];

  const times = [];
  for (const d of dows) {
    for (const h of hours) {
      for (const m of minutes) {
        times.push({ day: d, hour: h, minute: m, weekMinute: d * 1440 + h * 60 + m });
      }
    }
  }
  return times;
}

/** Returns the cadence label for a cron expression */
function cadenceLabel(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return '?';
  const [, , , , dow] = parts;
  if (dow === '*') return 'diário';
  if (/^\*\/\d+$/.test(dow)) return `cada ${dow.slice(2)}d`;
  const days = [...new Set(dow.split(',').map(d => DOW_NAMES[parseInt(d) % 7]))];
  return `semanal (${days.join('/')})`;
}

/**
 * Checks if two sets of firing times have any pair within minSpacing minutes
 * on the same calendar day.
 */
function hasConflict(timesA, timesB, minSpacing) {
  for (const a of timesA) {
    for (const b of timesB) {
      if (a.day !== b.day) continue;
      const diff = Math.abs(a.hour * 60 + a.minute - b.hour * 60 - b.minute);
      if (diff < minSpacing) {
        return {
          diff,
          aTime: `${String(a.hour).padStart(2,'0')}:${String(a.minute).padStart(2,'0')}`,
          bTime: `${String(b.hour).padStart(2,'0')}:${String(b.minute).padStart(2,'0')}`,
          day: a.day,
        };
      }
    }
  }
  return null;
}

function main() {
  const files = getWorkflowFiles();
  const entries = [];

  for (const file of files) {
    const name = basename(file);
    let content;
    try { content = readFileSync(file, 'utf8'); } catch { continue; }

    const crons = extractCrons(content);
    if (crons.length === 0) continue;

    const privileged = isPrivileged(content);

    for (const cron of crons) {
      const times = parseCron(cron);
      if (!times || times.length === 0) continue;

      const [, , , , dow] = cron.trim().split(/\s+/);
      const daily = dow === '*';

      entries.push({ workflow: name, cron, privileged, daily, times });
    }
  }

  // Sort by first firing time in the week
  entries.sort((a, b) => (a.times[0]?.weekMinute ?? 0) - (b.times[0]?.weekMinute ?? 0));

  const privilegedEntries = entries.filter(e => e.privileged);

  // --- Collision check ---
  const collisions = [];
  for (let i = 0; i < privilegedEntries.length; i++) {
    for (let j = i + 1; j < privilegedEntries.length; j++) {
      const a = privilegedEntries[i];
      const b = privilegedEntries[j];

      // For daily crons, project onto all days that the other also runs
      const allTimesA = a.daily
        ? [0,1,2,3,4,5,6].flatMap(d => a.times.map(t => ({ ...t, day: d })))
        : a.times;
      const allTimesB = b.daily
        ? [0,1,2,3,4,5,6].flatMap(d => b.times.map(t => ({ ...t, day: d })))
        : b.times;

      const conflict = hasConflict(allTimesA, allTimesB, MIN_SPACING);
      if (conflict) {
        collisions.push({ a: a.workflow, aCron: a.cron, b: b.workflow, bCron: b.cron, ...conflict });
      }
    }
  }

  if (JSON_MODE) {
    console.log(JSON.stringify({ entries: entries.map(e => ({ workflow: e.workflow, cron: e.cron, privileged: e.privileged, daily: e.daily })), privilegedCount: privilegedEntries.length, collisions }, null, 2));
    process.exit(collisions.length > 0 ? 1 : 0);
  }

  // --- Markdown table ---
  console.log('\n## Tabela de Crons CI — E89\n');
  console.log(`> Gerado por \`scripts/ci-cron-table.mjs\`. Espaçamento mínimo privilegiado: **${MIN_SPACING} min**.\n`);
  console.log('| Workflow | Expressão | Horário (UTC) | Cadência | Priv. |');
  console.log('|---|---|---|---|:---:|');

  for (const e of entries) {
    const t = e.times[0];
    const timeStr = t ? `${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}` : '—';
    const priv = e.privileged ? '✓' : '';
    console.log(`| \`${e.workflow}\` | \`${e.cron}\` | ${timeStr} | ${cadenceLabel(e.cron)} | ${priv} |`);
  }

  console.log(`\n**Total:** ${entries.length} crons • ${privilegedEntries.length} privilegiados\n`);

  if (collisions.length === 0) {
    console.log(`✅ **0 colisões** — todos os crons privilegiados estão separados por ≥${MIN_SPACING} min.\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ **${collisions.length} colisão(ões)** encontrada(s) entre crons privilegiados:\n`);
    for (const c of collisions) {
      const day = DOW_NAMES[c.day] ?? 'dia';
      console.error(`  ${c.a} (${c.aCron}, ${c.aTime}) ↔ ${c.b} (${c.bCron}, ${c.bTime}) no ${day}: ${c.diff}min < ${MIN_SPACING}min\n`);
    }
    process.exit(1);
  }
}

main();
