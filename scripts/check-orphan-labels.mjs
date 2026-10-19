#!/usr/bin/env node
/**
 * A11y gate — Labels sem htmlFor (orphan labels).
 *
 * Regra: todo `<Label` (componente Shadcn/Radix, capital L) em JSX deve ter
 * `htmlFor=` para associar ao campo correspondente, OU `id=` para uso com
 * `aria-labelledby` em controles que não suportam associação nativa (Select,
 * Switch). Labels sem nenhum dos dois não são anunciados corretamente por
 * leitores de tela — o campo fica sem rótulo acessível.
 *
 * Modo ratchet: `.orphan-labels-baseline.json` congela violações existentes.
 * Apenas violações NOVAS quebram o build.
 *
 * Para regenerar após corrigir legados:
 *   UPDATE_BASELINE=1 node scripts/check-orphan-labels.mjs
 *
 * Para ver as violações atuais:
 *   node scripts/check-orphan-labels.mjs --list
 *
 * Escopo: `src/**` .tsx (componentes React).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = 'src';
const BASELINE_PATH = '.orphan-labels-baseline.json';
const UPDATE = process.env.UPDATE_BASELINE === '1';
const LIST = process.argv.includes('--list');

const SKIP_DIRS = new Set(['__tests__', 'tests', '__mocks__', 'stories', 'node_modules']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      out.push(...walk(full));
    } else {
      if (!entry.endsWith('.tsx')) continue;
      if (entry.endsWith('.test.tsx') || entry.endsWith('.spec.tsx')) continue;
      out.push(full);
    }
  }
  return out;
}

/**
 * Detecta `<Label` (JSX, capital L) sem `htmlFor=` e sem `id=`.
 *
 * Estratégia: varre o arquivo linha a linha. Quando encontra `<Label`
 * (que não seja `<LabelList`, `<LabelPrimitive`, etc. — só o componente
 * exato `Label` ou com ClassName como sufixo de className), acumula linhas
 * até encontrar o fechamento do JSX opening tag (`>` ou `/>`) e então
 * verifica se o bloco tem `htmlFor=` ou `id=`.
 */
function findOrphanLabels(src, file) {
  const lines = src.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detecta abertura de <Label (exatamente Label, não LabelX)
    const idx = line.search(/<Label(?=[\s/>])/);
    if (idx === -1) continue;

    // Acumula o bloco da tag de abertura até > ou />
    let block = '';
    let j = i;
    while (j < lines.length && j < i + 20) {
      block += lines[j] + '\n';
      // Para quando encontra o fechamento da tag de abertura
      if (lines[j].includes('>')) break;
      j++;
    }

    // Verifica se tem htmlFor= ou id= no bloco
    const hasHtmlFor = /htmlFor=/.test(block);
    const hasId = /\bid=/.test(block);
    if (!hasHtmlFor && !hasId) {
      // Extrai snippet da linha de abertura
      const snippet = line.trim().slice(0, 120);
      const hash = createHash('sha1')
        .update(`${file}::${i + 1}::${snippet}`)
        .digest('hex')
        .slice(0, 16);
      violations.push({ file, line: i + 1, snippet, hash });
    }
  }
  return violations;
}

const files = walk(ROOT);
/** @type {{ file: string; line: number; snippet: string; hash: string }[]} */
const violations = [];

for (const file of files) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (!src.includes('<Label')) continue;
  violations.push(...findOrphanLabels(src, file));
}

const currentKeys = new Set(violations.map((v) => `${v.file}::${v.hash}`));

if (LIST) {
  console.log(`Orphan labels encontrados: ${violations.length}`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}  ${v.snippet}`);
  }
  process.exit(0);
}

if (UPDATE) {
  const baseline = {
    generatedAt: new Date().toISOString().slice(0, 10),
    description:
      'Snapshot de Labels sem htmlFor/id pré-existentes. Novas violações são bloqueadas pelo gate. Regenerar com UPDATE_BASELINE=1.',
    totalAtGeneration: violations.length,
    entries: violations
      .map((v) => ({ file: v.file, hash: v.hash, snippet: v.snippet, line: v.line }))
      .sort((a, b) => (a.file + a.hash).localeCompare(b.file + b.hash)),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(
    `✏️  Baseline atualizado: ${BASELINE_PATH} (${violations.length} labels órfãos registrados)`,
  );
  process.exit(0);
}

const baselineKeys = new Set();
if (existsSync(BASELINE_PATH)) {
  try {
    const b = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
    for (const e of b.entries ?? []) baselineKeys.add(`${e.file}::${e.hash}`);
  } catch (e) {
    console.error(`❌ Falha ao ler ${BASELINE_PATH}: ${e.message}`);
    process.exit(1);
  }
} else {
  console.warn(
    `⚠️  ${BASELINE_PATH} não encontrado — gere com: UPDATE_BASELINE=1 node scripts/check-orphan-labels.mjs`,
  );
  process.exit(1);
}

const regressions = violations.filter((v) => !baselineKeys.has(`${v.file}::${v.hash}`));
const fixed = [...baselineKeys].filter((k) => !currentKeys.has(k));

if (regressions.length > 0) {
  console.error(
    `❌ Orphan labels gate falhou — ${regressions.length} Label${regressions.length === 1 ? '' : 's'} órfã${regressions.length === 1 ? 'o' : 'os'} NOVO${regressions.length === 1 ? '' : 'S'} (baseline: ${baselineKeys.size}).`,
  );
  console.error(
    `   Todo <Label> deve ter htmlFor= (Input/Textarea/Switch/Select nativo) ou id= (para aria-labelledby em controles Radix).\n`,
  );
  for (const v of regressions) {
    console.error(`  • ${v.file}:${v.line}`);
    console.error(`    ${v.snippet}`);
  }
  console.error(
    `\nFix: adicione htmlFor="campo-id" ao <Label> e id="campo-id" ao Input/Textarea/Switch correspondente.`,
  );
  console.error(
    `     Para Select Radix: adicione id="label-id" ao <Label> e aria-labelledby="label-id" ao <SelectTrigger>.`,
  );
  process.exit(1);
}

if (fixed.length > 0) {
  console.log(
    `ℹ️  ${fixed.length} entradas do baseline não aparecem mais — rode UPDATE_BASELINE=1 para encolher o baseline:`,
  );
  for (const k of fixed.slice(0, 10)) console.log(`   - ${k}`);
  if (fixed.length > 10) console.log(`   ... e mais ${fixed.length - 10}`);
}

console.log(
  `✅ Orphan labels gate: ${files.length} arquivos varridos, ${violations.length} legados (todos no baseline), 0 regressões.`,
);
