#!/usr/bin/env node
// Gate: zero console.* fora do logger central em arquivos NOVOS de src/.
// Arquivos no .console-baseline.json não podem aumentar a contagem (ratchet).
// Aceitar novo estado (só com revisão): --update
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const BASELINE = '.console-baseline.json';
const UPDATE = process.argv.includes('--update');
const RE = /console\.(log|warn|error|info|debug)/g;
const ALLOW = /\.(test|spec)\.|__tests__|log-safety|structuredLogger|error-reporter|console-filter/;

// grep sai 1 quando não acha nada — lista vazia é o estado ideal do ratchet,
// não erro. Status >1 é erro real de execução.
const grep = spawnSync(
  'grep',
  ['-rlE', 'console\\.(log|warn|error|info|debug)', 'src/', '--include=*.ts', '--include=*.tsx'],
  { encoding: 'utf8', env: { PATH: '/usr/bin:/bin:/usr/local/bin' } },
);
if (grep.status !== 0 && grep.status !== 1) {
  console.error(`❌ grep falhou (status ${grep.status}): ${grep.stderr}`);
  process.exit(1);
}
const files = grep.stdout.trim().split('\n').filter((f) => f && !ALLOW.test(f)).sort((a, b) => a.localeCompare(b));

const counts = {};
for (const f of files) {
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
