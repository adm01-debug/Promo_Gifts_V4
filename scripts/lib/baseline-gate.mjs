#!/usr/bin/env node
/**
 * Lib compartilhada dos gates de baseline/ratchet (auditoria 20-dim 2026-10-02).
 *
 * Política comum (mesma do `as any` baseline):
 *   • Falha SOMENTE em REGRESSÃO (arquivo com contagem maior que a baseline).
 *   • Drift positivo (count diminuiu) apenas avisa — não requer update.
 *
 * Contrato:
 *   import { runBaselineGate, countMatchesInSrc } from './lib/baseline-gate.mjs';
 *   runBaselineGate({ baselineFile, label, description, fixHint, scan });
 *
 * `scan()` deve retornar um Map<relativePath, count> com os arquivos que têm
 * pelo menos 1 ocorrência do padrão medido.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const SKIP_DIRS = new Set(['__tests__', 'tests', 'node_modules']);
const SKIP_FILE = /\.(test|spec)\.(ts|tsx)$/;
const SKIP_CONTENT = /^(\*|\/\/)/; // linha JSDoc solta ou comentário de linha

/** Varre src/ (produção, excluindo testes) e devolve os arquivos .ts/.tsx. */
export function* walkSrc(root) {
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
  yield* walk(join(root, 'src'));
}

/**
 * Conta TODAS as ocorrências de `pattern` (regex global) por arquivo,
 * pulando linhas que são só comentário. Múltiplas ocorrências na mesma
 * linha contam individualmente (evita bypass do ratchet).
 */
export function countMatchesInSrc(root, pattern, { includeCommentLines = false } = {}) {
  const counts = new Map();
  for (const file of walkSrc(root)) {
    let total = 0;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      // Para marcadores de débito (TODO/FIXME/HACK) a linha-comentário
      // também conta — um `// TODO:` novo não pode ser de graça.
      if (!includeCommentLines && SKIP_CONTENT.test(line.trimStart())) continue;
      total += [...line.matchAll(pattern)].length;
    }
    if (total > 0) counts.set(relative(root, file), total);
  }
  return counts;
}

/**
 * Executa o gate:
 *   --update → regrava a baseline com a contagem atual (exit 0)
 *   sem baseline → exit 2
 *   regressão → exit 1 com diff por arquivo
 *   ok → exit 0
 *
 * opts:
 *   baselineFile  nome do arquivo de baseline na raiz (ex.: '.todo-baseline.json')
 *   label         texto humano do gate (ex.: 'TODO/FIXME/HACK baseline gate')
 *   description   linha "description" gravada na baseline
 *   totalKey      chave do total na baseline (ex.: 'productionTodoCount')
 *   fixHint       instrução mostrada em caso de regressão
 *   scan          () => Map<relativePath, count>
 */
export function runBaselineGate({ baselineFile, label, description, totalKey, fixHint, scan }) {
  const ROOT = process.cwd();
  const BASELINE_PATH = join(ROOT, baselineFile);
  const UPDATE = process.argv.includes('--update');

  const currentCounts = Object.fromEntries(scan());
  const totalCurrent = Object.values(currentCounts).reduce((a, b) => a + b, 0);

  if (UPDATE) {
    const next = {
      generatedAt: new Date().toISOString(),
      description,
      [totalKey]: totalCurrent,
      counts: currentCounts,
    };
    writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
    console.log(
      `✅ ${baselineFile} atualizado — ${totalCurrent} ocorrências em ${Object.keys(currentCounts).length} arquivos.`,
    );
    process.exit(0);
  }

  if (!existsSync(BASELINE_PATH)) {
    console.error(`❌ ${baselineFile} não encontrado. Gere com --update.`);
    process.exit(2);
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const baselineCounts = baseline.counts ?? {};
  const totalBaseline = baseline[totalKey] ?? 0;

  console.log(`${label} — atual: ${totalCurrent} · baseline: ${totalBaseline}`);

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
    console.error(`\n❌ Regressão — ${regressions.length} arquivo(s) acima da baseline:`);
    for (const r of regressions) {
      console.error(`  ${r.file}: ${r.count} (baseline: ${r.baselineCount}, +${r.delta})`);
    }
    console.error(`\n${fixHint}`);
    process.exit(1);
  }

  if (positiveDrift > 0) {
    console.log(
      `✨ Drift positivo: ${positiveDrift} ocorrência(s) eliminada(s). Considere rodar com --update.`,
    );
  }
  console.log(`✅ ${label}: nenhuma regressão detectada.`);
  process.exit(0);
}
