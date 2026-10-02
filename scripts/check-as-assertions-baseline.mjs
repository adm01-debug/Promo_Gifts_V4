#!/usr/bin/env node
/**
 * Gate de CI: ratchet de asserções `as <Tipo>` em src/ (produção).
 *
 * Conta `as X` onde X é um tipo qualquer, EXCLUINDO os safe idioms:
 *   `as const`, `as unknown`, `as any` (este último tem gate próprio —
 *   scripts/check-any-type-baseline.mjs).
 *
 * Política (mesma do `as any` baseline):
 *   • Falha SOMENTE em REGRESSÃO (arquivo com contagem maior que a baseline).
 *   • Drift positivo apenas avisa — não requer update.
 *
 * Uso:
 *   node scripts/check-as-assertions-baseline.mjs            # verifica
 *   node scripts/check-as-assertions-baseline.mjs --update   # regrava baseline
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, '.as-assertions-baseline.json');
const UPDATE = process.argv.includes('--update');

function countAssertionsInSrc() {
  const counts = {};
  let output = '';
  try {
    output = execSync(
      `grep -rnP "\\bas\\s+(?!const\\b|unknown\\b|any\\b)[A-Za-z_$]" src/ --include="*.ts" --include="*.tsx"`,
      { encoding: 'utf8', cwd: ROOT },
    );
  } catch (e) {
    if (e.status !== 1) throw e;
  }

  for (const rawLine of output.split('\n')) {
    if (!rawLine) continue;
    if (rawLine.includes('.test.ts') || rawLine.includes('.test.tsx') ||
        rawLine.includes('__tests__/') || rawLine.includes('/src/tests/')) continue;

    const colonIdx = rawLine.indexOf(':');
    if (colonIdx === -1) continue;
    const rest = rawLine.slice(colonIdx + 1);
    const colonIdx2 = rest.indexOf(':');
    if (colonIdx2 === -1) continue;
    const content = rest.slice(colonIdx2 + 1).trimStart();
    if (content.startsWith('*') || content.startsWith('//')) continue;

    const file = rawLine.slice(0, colonIdx);
    const relFile = relative(ROOT, file.startsWith('/') ? file : join(ROOT, file));
    counts[relFile] = (counts[relFile] ?? 0) + 1;
  }
  return counts;
}

const currentCounts = countAssertionsInSrc();
const totalCurrent = Object.values(currentCounts).reduce((a, b) => a + b, 0);

if (UPDATE) {
  const next = {
    generatedAt: new Date().toISOString(),
    description:
      'Baseline de asserções `as <Tipo>` em src/ (excluindo testes, `as const`, `as unknown` e `as any`). Falha apenas em REGRESSÃO.',
    productionAsCount: totalCurrent,
    counts: currentCounts,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`✅ .as-assertions-baseline.json atualizado — ${totalCurrent} asserções em ${Object.keys(currentCounts).length} arquivos.`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error('❌ .as-assertions-baseline.json não encontrado. Gere com: node scripts/check-as-assertions-baseline.mjs --update');
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const baselineCounts = baseline.counts ?? {};
const totalBaseline = baseline.productionAsCount ?? 0;

console.log(`\`as <Tipo>\` baseline gate — atual: ${totalCurrent} · baseline: ${totalBaseline}`);

const regressions = [];
let positiveDrift = 0;

for (const [file, count] of Object.entries(currentCounts)) {
  const baselineCount = baselineCounts[file] ?? 0;
  if (count > baselineCount) {
    regressions.push({ file, count, baselineCount, delta: count - baselineCount });
  }
}
for (const [file, baselineCount] of Object.entries(baselineCounts)) {
  const currentCount = currentCounts[file] ?? 0;
  if (currentCount < baselineCount) positiveDrift += baselineCount - currentCount;
}

if (regressions.length > 0) {
  console.error(`\n❌ Regressão de \`as <Tipo>\` — ${regressions.length} arquivo(s) com asserções novas:`);
  for (const r of regressions) {
    console.error(`  ${r.file}: ${r.count} (baseline: ${r.baselineCount}, +${r.delta})`);
  }
  console.error('\nPrefira narrowing/guards a asserções de tipo.');
  console.error('Para atualizar o baseline (após revisão): node scripts/check-as-assertions-baseline.mjs --update');
  process.exit(1);
}

if (positiveDrift > 0) {
  console.log(`✨ Drift positivo: ${positiveDrift} asserção(ões) eliminada(s). Considere: node scripts/check-as-assertions-baseline.mjs --update`);
}
console.log('✅ Nenhuma regressão de `as <Tipo>` detectada.');
process.exit(0);
