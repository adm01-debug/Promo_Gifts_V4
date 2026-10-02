#!/usr/bin/env node
/**
 * Gate de CI: ratchet de marcadores TODO/FIXME/HACK em src/ (produção).
 *
 * Política (mesma do `as any` baseline):
 *   • Falha SOMENTE em REGRESSÃO (arquivo com contagem maior que a baseline).
 *   • Drift positivo (count diminuiu) apenas avisa — não requer update.
 *
 * Uso:
 *   node scripts/check-todo-baseline.mjs            # verifica
 *   node scripts/check-todo-baseline.mjs --update   # regrava .todo-baseline.json
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, '.todo-baseline.json');
const UPDATE = process.argv.includes('--update');

function countTodosInSrc() {
  const counts = {};
  let output = '';
  try {
    output = execSync(
      `grep -rniE "\\b(TODO|FIXME|HACK)\\b" src/ --include="*.ts" --include="*.tsx"`,
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
    if (content.startsWith('*')) continue; // linha de JSDoc solta

    const file = rawLine.slice(0, colonIdx);
    const relFile = relative(ROOT, file.startsWith('/') ? file : join(ROOT, file));
    counts[relFile] = (counts[relFile] ?? 0) + 1;
  }
  return counts;
}

const currentCounts = countTodosInSrc();
const totalCurrent = Object.values(currentCounts).reduce((a, b) => a + b, 0);

if (UPDATE) {
  const next = {
    generatedAt: new Date().toISOString(),
    description:
      'Baseline de marcadores TODO/FIXME/HACK em src/ (excluindo testes). Falha apenas em REGRESSÃO (contagem cresce).',
    productionTodoCount: totalCurrent,
    counts: currentCounts,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`✅ .todo-baseline.json atualizado — ${totalCurrent} marcadores em ${Object.keys(currentCounts).length} arquivos.`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error('❌ .todo-baseline.json não encontrado. Gere com: node scripts/check-todo-baseline.mjs --update');
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const baselineCounts = baseline.counts ?? {};
const totalBaseline = baseline.productionTodoCount ?? 0;

console.log(`TODO/FIXME/HACK baseline gate — atual: ${totalCurrent} · baseline: ${totalBaseline}`);

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
  console.error(`\n❌ Regressão de TODO/FIXME/HACK — ${regressions.length} arquivo(s) com marcadores novos:`);
  for (const r of regressions) {
    console.error(`  ${r.file}: ${r.count} (baseline: ${r.baselineCount}, +${r.delta})`);
  }
  console.error('\nResolva o débito ou vincule a uma issue rastreada.');
  console.error('Para atualizar o baseline (após revisão): node scripts/check-todo-baseline.mjs --update');
  process.exit(1);
}

if (positiveDrift > 0) {
  console.log(`✨ Drift positivo: ${positiveDrift} marcador(es) eliminado(s). Considere: node scripts/check-todo-baseline.mjs --update`);
}
console.log('✅ Nenhuma regressão de TODO/FIXME/HACK detectada.');
process.exit(0);
