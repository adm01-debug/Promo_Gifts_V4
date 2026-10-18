#!/usr/bin/env node
/**
 * ci-cron-table.mjs — E89
 * Lê todos os .github/workflows/*.yml e produz:
 *   1. Tabela Markdown de crons ordenada por horário UTC
 *   2. Detecção de colisões entre workflows que usam PAT (SUPABASE_ACCESS_TOKEN)
 *      com menos de 20 min de intervalo
 *
 * Uso: node scripts/ci-cron-table.mjs [--check]
 *   --check  sai com código 1 se houver colisões de PAT
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const WORKFLOWS_DIR = '.github/workflows';
const PAT_MARKER = 'SUPABASE_ACCESS_TOKEN';
const GAP_MINUTES = 20;

// --- helpers ---

function parseCronFields(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hour, dom, month, dow] = parts;
  return { min, hour, dom, month, dow, raw: expr.trim() };
}

function cronToLabel(f) {
  if (!f) return '?';
  // */N pattern
  if (f.min.startsWith('*/')) {
    const n = f.min.slice(2);
    return `a cada ${n}min`;
  }
  if (f.hour.startsWith('*/')) {
    const n = f.hour.slice(2);
    const minPad = f.min.padStart(2, '0');
    return `a cada ${n}h (xx:${minPad})`;
  }
  // numeric hour:min
  const h = f.hour.padStart(2, '0');
  const m = f.min.padStart(2, '0');
  const timeStr = `${h}:${m} UTC`;
  const days = {
    '0': 'dom', '1': 'seg', '2': 'ter', '3': 'qua',
    '4': 'qui', '5': 'sex', '6': 'sáb',
    '*': 'diário',
  };
  const dayLabel = days[f.dow] ?? f.dow;
  if (f.dom !== '*') return `${timeStr} (dias ${f.dom})`;
  return f.dow === '*' ? `${timeStr} diário` : `${timeStr} ${dayLabel}`;
}

// Returns minutes-since-midnight for a simple cron, or null for */N patterns.
// For */N hour patterns (e.g. "17 */6"), expands to all firing minutes in 24h.
function cronToMinutes(f) {
  if (!f) return null;
  if (f.min.startsWith('*/') || f.hour.startsWith('*/')) return null;
  const h = parseInt(f.hour, 10);
  const m = parseInt(f.min, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Expands a cron into all minutes-since-midnight values it fires at in 24h.
// Simple "H M" → [H*60+M]; "M */N" → fires at 0,N,2N,... hours at minute M.
function cronToAllMinutes(f) {
  if (!f) return [];
  const m = parseInt(f.min, 10);
  if (isNaN(m) || f.min.startsWith('*/')) return [];
  if (f.hour.startsWith('*/')) {
    const step = parseInt(f.hour.slice(2), 10);
    if (isNaN(step) || step <= 0) return [];
    const result = [];
    for (let h = 0; h < 24; h += step) result.push(h * 60 + m);
    return result;
  }
  const h = parseInt(f.hour, 10);
  if (isNaN(h)) return [];
  return [h * 60 + m];
}

// --- read workflows ---

const files = readdirSync(WORKFLOWS_DIR)
  .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  .sort();

const rows = [];

for (const fname of files) {
  const path = join(WORKFLOWS_DIR, fname);
  const text = readFileSync(path, 'utf8');

  // Extract workflow name (first `name:` line)
  const nameMatch = text.match(/^name:\s*(.+)/m);
  const wfName = nameMatch ? nameMatch[1].trim() : fname.replace('.yml', '');

  // Extract cron expressions
  const cronMatches = [...text.matchAll(/- cron:\s*['"]([^'"]+)['"]/g)];
  if (cronMatches.length === 0) continue;

  // Check PAT usage (only in non-commented lines)
  const nonCommentLines = text
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');
  const usesPat = nonCommentLines.includes(PAT_MARKER);

  for (const m of cronMatches) {
    const raw = m[1];
    // Skip commented-out crons (the line before the match contains #)
    const matchIndex = m.index;
    const lineStart = text.lastIndexOf('\n', matchIndex) + 1;
    const lineContent = text.slice(lineStart, matchIndex + m[0].length);
    if (lineContent.trimStart().startsWith('#')) continue;

    const fields = parseCronFields(raw);
    rows.push({
      file: fname,
      name: wfName,
      raw,
      label: cronToLabel(fields),
      minutes: cronToMinutes(fields),
      fields,
      usesPat,
    });
  }
}

// Sort: null (*/N) first, then by minutes
rows.sort((a, b) => {
  if (a.minutes === null && b.minutes === null) return a.raw.localeCompare(b.raw);
  if (a.minutes === null) return -1;
  if (b.minutes === null) return 1;
  return a.minutes - b.minutes;
});

// --- detect PAT collisions ---

// Expand each PAT row into individual firing entries (handles */N patterns).
const patEntries = [];
for (const r of rows) {
  if (!r.usesPat) continue;
  const allMins = cronToAllMinutes(r.fields);
  for (const mins of allMins) {
    patEntries.push({ ...r, minutes: mins });
  }
}

const collisions = [];

// Group by day-of-week; a "daily (*)" entry overlaps every specific weekday.
const dowGroups = {};
for (const e of patEntries) {
  const key = e.fields?.dow ?? '*';
  if (!dowGroups[key]) dowGroups[key] = [];
  dowGroups[key].push(e);
}

// Also merge daily (*) entries into every weekday group for cross-day collision check.
const dailyEntries = dowGroups['*'] ?? [];

// For each group (including '*' vs specific day), check adjacent gaps
const allDowKeys = new Set([...Object.keys(dowGroups)]);
for (const dow of allDowKeys) {
  const group = [...(dowGroups[dow] ?? [])];
  // If this is a specific weekday, also include entries that run daily (dow='*')
  if (dow !== '*') {
    for (const de of dailyEntries) {
      if (!group.find((x) => x.file === de.file && x.minutes === de.minutes)) {
        group.push(de);
      }
    }
  }
  // Sort by minutes within group
  const sorted = [...group].sort((a, b) => a.minutes - b.minutes);
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].minutes - sorted[i].minutes;
    if (gap < GAP_MINUTES) {
      collisions.push({
        dow,
        a: sorted[i],
        b: sorted[i + 1],
        gap,
      });
    }
  }
}

// --- output ---

const checkMode = process.argv.includes('--check');

console.log('## Tabela de crons — CI (gerada por scripts/ci-cron-table.mjs)\n');
console.log('> Regra E89: workflows com `SUPABASE_ACCESS_TOKEN` (PAT) devem ter ≥ 20 min de intervalo.\n');

console.log('| Horário UTC | Dia | Arquivo | Usa PAT |');
console.log('|---|---|---|---|');

for (const r of rows) {
  const timeStr = r.minutes !== null
    ? `${String(r.fields.hour).padStart(2, '0')}:${String(r.fields.min).padStart(2, '0')}`
    : r.label;
  const dows = { '0': 'Dom', '1': 'Seg', '2': 'Ter', '3': 'Qua', '4': 'Qui', '5': 'Sex', '6': 'Sáb', '*': 'diário' };
  const dayStr = r.fields?.dow !== undefined ? (dows[r.fields.dow] ?? r.fields.dow) : '-';
  const patStr = r.usesPat ? '✓ PAT' : '';
  console.log(`| \`${timeStr}\` | ${dayStr} | \`${r.file}\` | ${patStr} |`);
}

if (collisions.length === 0) {
  console.log('\n✅ Nenhuma colisão de PAT detectada (intervalo mínimo: 20 min).');
} else {
  console.log(`\n❌ ${collisions.length} colisão(ões) de PAT detectada(s):\n`);
  for (const c of collisions) {
    const dows = { '0': 'Dom', '1': 'Seg', '2': 'Ter', '3': 'Qua', '4': 'Qui', '5': 'Sex', '6': 'Sáb', '*': 'diário' };
    const dayLabel = dows[c.dow] ?? c.dow;
    console.log(
      `  - ${dayLabel}: \`${c.a.file}\` (${c.a.label}) × \`${c.b.file}\` (${c.b.label}) — intervalo: ${c.gap} min`
    );
  }
}

if (checkMode && collisions.length > 0) {
  process.exit(1);
}
