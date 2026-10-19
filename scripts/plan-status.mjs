#!/usr/bin/env node
/**
 * plan-status.mjs — E010
 * Lê docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md
 * e reporta o estado de execução por prioridade e trilha.
 *
 * Uso:
 *   node scripts/plan-status.mjs
 *   node scripts/plan-status.mjs --wave 0
 *   node scripts/plan-status.mjs --priority P0
 *   node scripts/plan-status.mjs --trail A
 *   node scripts/plan-status.mjs --json
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md');

const args = process.argv.slice(2);
const filterWave  = args.includes('--wave')     ? args[args.indexOf('--wave') + 1]     : null;
const filterPri   = args.includes('--priority') ? args[args.indexOf('--priority') + 1] : null;
const filterTrail = args.includes('--trail')    ? args[args.indexOf('--trail') + 1]    : null;
const jsonMode    = args.includes('--json');

let plan;
try {
  plan = readFileSync(PLAN_PATH, 'utf-8');
} catch {
  console.error(`Plano não encontrado: ${PLAN_PATH}`);
  process.exit(1);
}

// Formato real do plano: #### P200-E001 · [C] · P0 · Título
const HEADING_RE = /^#### P200-(E\d{3}) · \[([ABCD])\] · (P[0-3]) · (.+)/;

const etapas = [];
const sections = plan.split(/^(?=#### P200-E\d{3})/m);

for (const section of sections) {
  const firstLine = section.split('\n')[0];
  const m = firstLine.match(HEADING_RE);
  if (!m) continue;
  const [, id, trail, priority, title] = m;

  const num = parseInt(id.slice(1), 10); // 1-200
  const wave = Math.floor((num - 1) / 10); // 0-19, 10 etapas por onda

  // "Concluída" = heading contém ✅ (marcado manualmente ao fechar)
  const done = firstLine.includes('✅');
  // "Bloqueada PO" = trilha C e não concluída
  const blocked = trail === 'C' && !done;

  etapas.push({ id, trail, priority, title: title.trim(), wave, done, blocked });
}

// Apply filters
let filtered = etapas;
if (filterWave  !== null) filtered = filtered.filter(e => e.wave === parseInt(filterWave, 10));
if (filterPri)             filtered = filtered.filter(e => e.priority === filterPri);
if (filterTrail)           filtered = filtered.filter(e => e.trail === filterTrail.toUpperCase());

const doneCount    = filtered.filter(e => e.done).length;
const blockedCount = filtered.filter(e => e.blocked).length;
const todoCount    = filtered.filter(e => !e.done && !e.blocked).length;

if (jsonMode) {
  const byWave = {};
  for (const e of filtered) {
    if (!byWave[e.wave]) byWave[e.wave] = { wave: e.wave, total: 0, done: 0, blocked: 0, todo: 0 };
    byWave[e.wave].total++;
    if (e.done)    byWave[e.wave].done++;
    else if (e.blocked) byWave[e.wave].blocked++;
    else           byWave[e.wave].todo++;
  }
  console.log(JSON.stringify({
    total:   filtered.length,
    done:    doneCount,
    blocked: blockedCount,
    todo:    todoCount,
    waves:   Object.values(byWave).sort((a, b) => a.wave - b.wave),
    etapas:  filtered.map(e => ({ id: e.id, trail: e.trail, priority: e.priority, wave: e.wave, done: e.done, blocked: e.blocked, title: e.title })),
  }, null, 2));
  process.exit(0);
}

// Human-readable output
const label = [
  filterWave  !== null       ? ` (Onda ${filterWave})`           : '',
  filterPri                  ? ` (${filterPri})`                 : '',
  filterTrail                ? ` (trilha ${filterTrail.toUpperCase()})` : '',
].join('');

console.log(`\n📊 Plano de 200 Etapas — Status${label}`);
console.log(`   Total: ${filtered.length} | ✅ Concluídas: ${doneCount} | 🔒 Aguardam PO [C]: ${blockedCount} | ⏳ Pendentes: ${todoCount}`);
console.log('');

if (filterWave === null && !filterPri && !filterTrail) {
  // Agrupado por onda
  const byWave = {};
  for (const e of filtered) {
    if (!byWave[e.wave]) byWave[e.wave] = [];
    byWave[e.wave].push(e);
  }
  for (const w of Object.keys(byWave).sort((a, b) => +a - +b)) {
    const ws  = byWave[w];
    const wd  = ws.filter(e => e.done).length;
    const wb  = ws.filter(e => e.blocked).length;
    const wt  = ws.filter(e => !e.done && !e.blocked).length;
    const pct = Math.round(wd / ws.length * 100);
    console.log(`  Onda ${String(w).padStart(2)}: ${String(pct).padStart(3)}% (${wd}/${ws.length}) ✅  ${wb} PO  ${wt} pending`);
  }
} else {
  // Detalhe de cada etapa
  for (const e of filtered) {
    const icon = e.done ? '✅' : e.blocked ? '🔒' : '⏳';
    console.log(`  ${icon} ${e.id} [${e.trail}] ${e.priority} — ${e.title}`);
  }
}

console.log('');
