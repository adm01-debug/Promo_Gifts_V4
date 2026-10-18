#!/usr/bin/env node
// Gate: nenhuma importação NOVA cruzando domínios de src/pages/<domínio>.
// Um arquivo em pages/<A>/ não pode importar de pages/<B>/ (B≠A) — código
// compartilhado deve viver em src/components, src/lib, src/hooks ou src/services.
// Violações históricas vivem em .boundary-baseline.json (ratchet: não podem
// aumentar). Aceitar novo estado (só com revisão): --update
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASELINE = '.boundary-baseline.json';
const UPDATE = process.argv.includes('--update');
const IMPORT_RE = /from\s+['"](@\/pages\/([A-Za-z0-9_-]+)|(?:\.+\/)+pages\/([A-Za-z0-9_-]+))/g;

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(e)) yield p;
  }
}

const violations = [];
for (const f of walk('src/pages')) {
  const rel = relative('src', f).split('\\').join('/');
  const srcDom = rel.split('/')[1].split('.')[0];
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) {
    const targetDom = m[2] || m[3];
    if (!targetDom || targetDom === srcDom) continue;
    const line = src.slice(0, m.index).split('\n').length;
    violations.push({ file: rel, line, from: srcDom, to: targetDom });
  }
}
violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.to.localeCompare(b.to),
);

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const allowed = new Set((baseline.violations || []).map((v) => `${v.file}:${v.from}->${v.to}`));

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

const news = violations.filter((v) => !allowed.has(`${v.file}:${v.from}->${v.to}`));
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
