#!/usr/bin/env node
// Gate: nenhuma importação NOVA cruzando domínios de src/pages/<domínio>.
// Um arquivo em pages/<A>/ não pode importar de pages/<B>/ (B≠A) — código
// compartilhado deve viver em src/components, src/lib, src/hooks ou src/services.
// Violações históricas vivem em .boundary-baseline.json (ratchet: não podem
// aumentar — nem em contagem por par file:from->to). Aceitar novo estado
// (só com revisão): --update
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const BASELINE = '.boundary-baseline.json';
const UPDATE = process.argv.includes('--update');
// Specifiers: `from 'x'` (import/export estáticos) e `import('x')` (dinâmico).
const SPEC_RE =
  /from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(e)) yield p;
  }
}

// Resolve um specifier para o domínio em src/pages/<dom>, ou null se não
// aponta para pages/. Cobre alias `@/pages/x` e relativos (`../bar/B` a
// partir de pages/foo/ — sem exigir um segmento literal `pages/`).
function targetDomain(spec, importerFile) {
  let rel;
  if (spec.startsWith('@/')) {
    rel = spec.slice(2);
  } else if (spec.startsWith('.')) {
    rel = normalize(join(dirname(importerFile), spec)).split('\\').join('/');
  } else {
    return null;
  }
  const m = rel.match(/^pages\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

const violations = [];
for (const f of walk('src/pages')) {
  const rel = relative('src', f).split('\\').join('/');
  const srcDom = rel.split('/')[1].split('.')[0];
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(SPEC_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    const targetDom = targetDomain(spec, rel);
    if (!targetDom || targetDom === srcDom) continue;
    const line = src.slice(0, m.index).split('\n').length;
    violations.push({ file: rel, line, from: srcDom, to: targetDom });
  }
}
violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.to.localeCompare(b.to),
);

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
// Multiplicidade importa: N ocorrências baselinadas de file:from->to
// autorizam NO MÁXIMO N ocorrências — a N+1-ésima é violação nova.
const allowedCount = new Map();
for (const v of baseline.violations || []) {
  const k = `${v.file}:${v.from}->${v.to}`;
  allowedCount.set(k, (allowedCount.get(k) ?? 0) + 1);
}

if (UPDATE) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        description: baseline.description,
        violations: violations.map(({ file, from, to }) => ({ file, from, to })),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`✅ ${BASELINE} atualizado — ${violations.length} violações registradas.`);
  process.exit(0);
}

const seen = new Map();
const news = violations.filter((v) => {
  const k = `${v.file}:${v.from}->${v.to}`;
  const n = (seen.get(k) ?? 0) + 1;
  seen.set(k, n);
  return n > (allowedCount.get(k) ?? 0);
});
if (news.length) {
  console.error(`❌ boundary gate — ${news.length} importação(ões) cross-domain fora do baseline:`);
  for (const v of news)
    console.error(`   ${v.file}:${v.line}  pages/${v.from} → pages/${v.to}`);
  console.error(
    'Mova o código compartilhado para src/components|lib|hooks|services. Para aceitar revisado: --update',
  );
  process.exit(1);
}
console.log(
  `✅ boundary gate: ${violations.length} violações históricas no baseline, 0 novas.`,
);
