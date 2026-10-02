#!/usr/bin/env node
/**
 * Gate de CI: ratchet de tamanho de arquivo em src/ (produção).
 *
 * Política:
 *   • Arquivos com mais de MAX_LINES (500) entram no baseline.
 *   • Falha se um arquivo NOVO (>MAX_LINES e ausente do baseline) aparecer,
 *     ou se um arquivo do baseline crescer além da contagem registrada.
 *   • Arquivos que encolherem abaixo do limite geram drift positivo (aviso).
 *
 * Uso:
 *   node scripts/check-file-size-baseline.mjs            # verifica
 *   node scripts/check-file-size-baseline.mjs --update   # regrava baseline
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, '.file-size-baseline.json');
const MAX_LINES = 500;
const UPDATE = process.argv.includes('--update');

const SKIP_DIRS = new Set(['__tests__', 'tests', 'node_modules']);
const SKIP_FILE = /\.(test|spec)\.(ts|tsx)$/;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      yield full;
    }
  }
}

function collectOversized() {
  const sizes = {};
  for (const file of walk(join(ROOT, 'src'))) {
    const lines = readFileSync(file, 'utf8').split('\n').length;
    if (lines > MAX_LINES) sizes[relative(ROOT, file)] = lines;
  }
  return sizes;
}

const current = collectOversized();

if (UPDATE) {
  const next = {
    generatedAt: new Date().toISOString(),
    description: `Baseline de arquivos src/ com mais de ${MAX_LINES} linhas (excluindo testes). Falha em arquivo novo acima do limite ou em crescimento.`,
    maxLines: MAX_LINES,
    files: current,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`✅ .file-size-baseline.json atualizado — ${Object.keys(current).length} arquivos acima de ${MAX_LINES} linhas.`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`❌ .file-size-baseline.json não encontrado. Gere com: node scripts/check-file-size-baseline.mjs --update`);
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const baselineFiles = baseline.files ?? {};
const baseMax = baseline.maxLines ?? MAX_LINES;

console.log(`File-size baseline gate — limite: ${baseMax} linhas · acima do limite: ${Object.keys(current).length} · baseline: ${Object.keys(baselineFiles).length}`);

const regressions = [];
let shrunk = 0;

for (const [file, lines] of Object.entries(current)) {
  const baseLines = baselineFiles[file];
  if (baseLines === undefined) {
    regressions.push({ file, lines, note: 'arquivo novo acima do limite' });
  } else if (lines > baseLines) {
    regressions.push({ file, lines, note: `cresceu ${lines - baseLines} linhas (baseline: ${baseLines})` });
  }
}
for (const [file, baseLines] of Object.entries(baselineFiles)) {
  if (!(file in current)) shrunk += 1;
}

if (regressions.length > 0) {
  console.error(`\n❌ Regressão de tamanho de arquivo — ${regressions.length} ocorrência(s):`);
  for (const r of regressions) console.error(`  ${r.file}: ${r.lines} linhas — ${r.note}`);
  console.error(`\nQuebre o arquivo em unidades menores (alvo: componentes/hooks < ${baseMax} linhas).`);
  console.error('Para aceitar o novo estado: node scripts/check-file-size-baseline.mjs --update');
  process.exit(1);
}

if (shrunk > 0) {
  console.log(`✨ Drift positivo: ${shrunk} arquivo(s) voltaram abaixo do limite. Considere: node scripts/check-file-size-baseline.mjs --update`);
}
console.log('✅ Nenhuma regressão de tamanho de arquivo detectada.');
process.exit(0);
