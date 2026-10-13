#!/usr/bin/env node
// Gate: zero console.* fora do logger central em arquivos NOVOS de src/.
// Arquivos no .console-baseline.json não podem aumentar a contagem (ratchet).
// Aceitar novo estado (só com revisão): --update
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASELINE = '.console-baseline.json';
const UPDATE = process.argv.includes('--update');
const RE = /console\.(log|warn|error|info|debug)/g;
const ALLOW = /\.(test|spec)\.|__tests__|log-safety|structuredLogger|error-reporter|console-filter/;

// Walk em Node puro (sem subprocess → sem PATH controlável).
function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(e)) yield p;
  }
}

const counts = {};
for (const f of walk('src')) {
  if (ALLOW.test(f)) continue;
  const m = readFileSync(f, 'utf8').match(RE);
  if (m) counts[f] = m.length;
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const allowed = new Set(baseline.files || []);
const baselineCounts = baseline.counts || {};

if (UPDATE) {
  writeFileSync(BASELINE, JSON.stringify({
    description: baseline.description,
    files: Object.keys(counts).sort((a, b) => a.localeCompare(b)),
    counts,
  }, null, 2) + '\n');
  console.log(`✅ ${BASELINE} atualizado — ${Object.keys(counts).length} arquivos.`);
  process.exit(0);
}

const news = Object.keys(counts).filter((f) => !allowed.has(f));
const grown = Object.keys(counts).filter((f) => allowed.has(f) && baselineCounts[f] != null && counts[f] > baselineCounts[f]);
const notInCounts = Object.keys(counts).filter((f) => allowed.has(f) && baselineCounts[f] == null);

if (news.length || grown.length || notInCounts.length) {
  console.error(`❌ console.* baseline gate — ${Object.keys(counts).length} arquivos atuais.`);
  for (const f of news) console.error(`   NOVO arquivo com console.*: ${f}`);
  for (const f of grown) console.error(`   contagem cresceu: ${f} (${baselineCounts[f]} → ${counts[f]})`);
  for (const f of notInCounts) console.error(`   baseline sem contagem — rode --update para registrar: ${f}`);
  console.error('Use o logger central (structuredLogger) em código novo. Para aceitar revisado: --update');
  process.exit(1);
}
console.log(`✅ console.* baseline gate: ${Object.keys(counts).length} arquivos no baseline, 0 regressões.`);
