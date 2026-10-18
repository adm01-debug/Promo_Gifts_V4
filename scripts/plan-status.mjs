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
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md');

const args = process.argv.slice(2);
const filterWave = args.includes('--wave') ? args[args.indexOf('--wave') + 1] : null;
const filterPri = args.includes('--priority') ? args[args.indexOf('--priority') + 1] : null;
const filterTrail = args.includes('--trail') ? args[args.indexOf('--trail') + 1] : null;

let plan;
try {
  plan = readFileSync(PLAN_PATH, 'utf-8');
} catch {
  console.error(`Plano não encontrado: ${PLAN_PATH}`);
  process.exit(1);
}

// Parse etapas: linhas que começam com #### E001..E200
// Formato: #### E001 [A] P0 — Título
// Status: Pronto marcado com ✅ ou **Pronto:** no bloco

const etapaRe = /^#### (E\d{3})\s+\[([ABCD])\]\s+(P[0-3])\s+—\s+(.+)/m;
const etapas = [];

const sections = plan.split(/^(?=#### E\d{3})/m);
for (const section of sections) {
  const m = section.match(/^#### (E\d{3})\s+\[([ABCD])\]\s+(P[0-3])\s+—\s+(.+)/);
  if (!m) continue;
  const [, id, trail, priority, title] = m;
  
  // Detect wave from preceding context (not reliable in this approach — use ID range)
  const num = parseInt(id.slice(1));
  let wave;
  if (num <= 10) wave = 0;
  else if (num <= 25) wave = 1;
  else if (num <= 40) wave = 2;
  else if (num <= 55) wave = 3;
  else if (num <= 70) wave = 4;
  else if (num <= 85) wave = 5;
  else if (num <= 100) wave = 6;
  else if (num <= 115) wave = 7;
  else if (num <= 130) wave = 8;
  else if (num <= 145) wave = 9;
  else if (num <= 160) wave = 10;
  else if (num <= 175) wave = 11;
  else wave = Math.floor((num - 176) / 5) + 12;

  // Check status: look for Pronto block
  const done = /\*\*Pronto(?:\s+comportamental)?:\*\*/.test(section) ||
               /✅/.test(section.split('\n').slice(0, 3).join('\n'));
  const blocked = /\[C\]/.test(`[${trail}]`) &&
                  !/\*\*Pronto/.test(section);

  etapas.push({ id, trail, priority, title: title.trim(), wave, done, blocked: trail === 'C' && !done });
}

// Apply filters
let filtered = etapas;
if (filterWave !== null) filtered = filtered.filter(e => e.wave === parseInt(filterWave));
if (filterPri) filtered = filtered.filter(e => e.priority === filterPri);
if (filterTrail) filtered = filtered.filter(e => e.trail === filterTrail.toUpperCase());

// Summary
const done = filtered.filter(e => e.done).length;
const blocked = filtered.filter(e => e.blocked).length;
const todo = filtered.filter(e => !e.done && !e.blocked).length;

console.log(`\n📊 Plano de 200 Etapas — Status${filterWave !== null ? ` (Onda ${filterWave})` : ''}${filterPri ? ` (${filterPri})` : ''}${filterTrail ? ` (trilha ${filterTrail.toUpperCase()})` : ''}`);
console.log(`   Total: ${filtered.length} | ✅ Concluídas: ${done} | 🔒 Aguardam PO [C]: ${blocked} | ⏳ Pendentes: ${todo}`);
console.log('');

// Group by wave if no wave filter
if (filterWave === null) {
  const byWave = {};
  for (const e of filtered) {
    if (!byWave[e.wave]) byWave[e.wave] = [];
    byWave[e.wave].push(e);
  }
  for (const wave of Object.keys(byWave).sort((a, b) => +a - +b)) {
    const ws = byWave[wave];
    const wd = ws.filter(e => e.done).length;
    const wb = ws.filter(e => e.blocked).length;
    const wt = ws.filter(e => !e.done && !e.blocked).length;
    const pct = Math.round(wd / ws.length * 100);
    console.log(`  Onda ${wave.padStart(2)}: ${pct}% (${wd}/${ws.length}) ✅  ${wb} PO  ${wt} pending`);
  }
} else {
  // Show each step
  for (const e of filtered) {
    const icon = e.done ? '✅' : e.blocked ? '🔒' : '⏳';
    console.log(`  ${icon} ${e.id} [${e.trail}] ${e.priority} — ${e.title}`);
  }
}

console.log('');
