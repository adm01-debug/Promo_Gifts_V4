#!/usr/bin/env node
// Gate: nenhuma importação NOVA cruzando domínios de src/pages/<domínio>.
// Um arquivo em pages/<A>/ não pode importar de pages/<B>/ (B≠A) — código
// compartilhado deve viver em src/components, src/lib, src/hooks ou src/services.
// Violações históricas vivem em .boundary-baseline.json (ratchet por identidade
// do import: file + specifier resolvido — substituir um módulo por outro do
// mesmo domínio conta como violação nova). Aceitar novo estado (só com
// revisão): --update
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const BASELINE = '.boundary-baseline.json';
const UPDATE = process.argv.includes('--update');
// Specifiers literais: `from'x'` (import/export — com ou sem espaço),
// `import('x')`, bare `import 'x'`, `require('x')` (inclui TS
// `import x = require('y')`) e `import.meta.glob('x')`. Aspas simples,
// duplas ou template literal ESTÁTICO. `import x = require(...)` é pego
// pelo braço de `require`.
const SPEC_RE =
  /\bfrom\s*['"`]([^'"`]+)['"`]|\bimport\s*\(\s*['"`]([^'"`]+)['"`]|\bimport\s+['"`]([^'"`]+)['"`]|\brequire\s*\(\s*['"]([^'"]+)['"]|\bimport\.meta\.glob(?:Eager)?\s*\(\s*['"]([^'"]+)['"]/g;
// import.meta.glob também aceita array literal de padrões estáticos.
const GLOB_ARRAY_RE =
  /\bimport\.meta\.glob(?:Eager)?\s*\(\s*\[([^\]]*)\]/g;
// Specifier computado (não-literal): não podemos provar o destino, então
// conta como violação — sem isso `import(var)`/`require(var)`/`glob(var)`
// evadem o gate inteiro. Roda sobre a visão "masked" (conteúdo de strings
// apagado) — texto de UI citando `import(name)` não é chamada. O braço do
// glob exclui `[` porque array literal é tratado por GLOB_ARRAY_RE.
const DYNAMIC_RE =
  /\bimport\s*\(\s*[^'"`\s)]|\brequire\s*\(\s*[^'"\s)]|\bimport\.meta\.glob(?:Eager)?\s*\(\s*[^'"[]/g;
// Concatenação após literal no 1º argumento = computado:
// `require('@/' + x)` na visão masked vira `require(' ' + ...)`.
const CONCAT_RE =
  /\b(?:import|require|import\.meta\.glob(?:Eager)?)\s*\(\s*['"][^'"]*['"]\s*\+/g;

// Lexer mínimo string/comment-aware: produz duas visões preservando quebras
// de linha (line numbers corretos):
//   code   — comentários apagados, literais intactos (SPEC_RE/GLOB_ARRAY_RE)
//   masked — comentários + conteúdo de literais apagados (DYNAMIC_RE/CONCAT_RE)
// `//` e `/*` dentro de strings NÃO são comentários (evasão `'@/a//b'` e
// `//` em texto); `//`/`/*` fora de strings sempre são. Expressões `${...}`
// em template literal são código — conteúdo fica visível na visão masked.
function lexSource(src) {
  const code = [], masked = [];
  const keep = (c) => { code.push(c); masked.push(c); };
  const hide = (c) => { code.push(c); masked.push(c === '\n' ? '\n' : ' '); };
  // comentário: apagado das DUAS visões (SPEC_RE nunca vê specifier em comentário)
  const blank = (c) => { code.push(c === '\n' ? '\n' : ' '); masked.push(c === '\n' ? '\n' : ' '); };
  let i = 0, strQuote = null;
  while (i < src.length) {
    const c = src[i];
    if (strQuote === null) {
      if (c === '/' && src[i + 1] === '/') {
        while (i < src.length && src[i] !== '\n') { blank(src[i]); i++; }
        continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        blank(src[i]); blank(src[i + 1]); i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { blank(src[i]); i++; }
        if (i < src.length) { blank(src[i]); blank(src[i + 1]); i += 2; }
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { strQuote = c; keep(c); i++; continue; }
      keep(c); i++;
      continue;
    }
    if (c === '\\') { hide(c); if (i + 1 < src.length) hide(src[i + 1]); i += 2; continue; }
    if (c === strQuote) { strQuote = null; keep(c); i++; continue; }
    if (strQuote === '`' && c === '$' && src[i + 1] === '{') {
      keep('$'); keep('{'); i += 2;
      let depth = 1;
      while (i < src.length && depth > 0) {
        const e = src[i];
        if (e === "'" || e === '"' || e === '`') {
          keep(e); i++;
          while (i < src.length && src[i] !== e) {
            if (src[i] === '\\') { hide(src[i]); if (i + 1 < src.length) hide(src[i + 1]); i += 2; continue; }
            hide(src[i]); i++;
          }
          if (i < src.length) { keep(src[i]); i++; }
          continue;
        }
        if (e === '/' && src[i + 1] === '/') {
          while (i < src.length && src[i] !== '\n') { blank(src[i]); i++; }
          continue;
        }
        if (e === '/' && src[i + 1] === '*') {
          blank(e); blank(src[i + 1]); i += 2;
          while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { blank(src[i]); i++; }
          if (i < src.length) { blank(src[i]); blank(src[i + 1]); i += 2; }
          continue;
        }
        if (e === '{') depth++;
        if (e === '}') { depth--; if (depth === 0) { keep('}'); i++; break; } }
        keep(e); i++;
      }
      continue;
    }
    hide(c); i++;
  }
  return { code: code.join(''), masked: masked.join('') };
}

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(e)) yield p;
  }
}

// Resolve um specifier para o caminho normalizado sob src/ (ex.:
// 'pages/quotes/QuoteViewPage'), ou null se não resolve para dentro de
// src/pages. Cobre alias `@/...` e relativos (`../bar/B` a partir de
// pages/foo/ — sem exigir um segmento literal `pages/`).
function resolveTarget(spec, importerFile) {
  let rel;
  if (spec.startsWith('@/')) {
    // `@//pages/x` e `@/pages/foo/../bar/x` — normaliza barras e `..`.
    rel = normalize(spec.slice(2).replace(/^\/+/, '')).split('\\').join('/');
  } else if (spec.startsWith('.')) {
    rel = normalize(join(dirname(importerFile), spec)).split('\\').join('/');
    // `../../src/pages/x` escapa de pages/ e volta por src/ — mesma coisa.
    if (rel.startsWith('src/')) rel = rel.slice(4);
  } else {
    return null;
  }
  return rel.startsWith('pages/') ? rel : null;
}

const violations = [];
for (const f of walk('src/pages')) {
  const rel = relative('src', f).split('\\').join('/');
  // Testes importam a unidade sob teste — não são acoplamento de produção.
  if (/(__tests__\/|\.(test|spec)\.)/.test(rel)) continue;
  const srcDom = rel.split('/')[1].split('.')[0];
  const raw = readFileSync(f, 'utf8');
  const { code: src, masked } = lexSource(raw);
  const dynamic = (idx) => {
    const line = src.slice(0, idx).split('\n').length;
    violations.push({
      file: rel,
      line,
      from: srcDom,
      to: '?',
      target: 'specifier dinâmico não-literal',
    });
  };
  const checkSpec = (spec, idx) => {
    if (!spec) return;
    if (spec.includes('${')) {
      // template com ${} = specifier computado — não resolvível, viola.
      dynamic(idx);
      return;
    }
    const target = resolveTarget(spec, rel);
    if (!target) return;
    const targetDom = target.split('/')[1];
    if (targetDom === srcDom) return;
    const line = src.slice(0, idx).split('\n').length;
    violations.push({ file: rel, line, from: srcDom, to: targetDom, target });
  };
  for (const m of src.matchAll(SPEC_RE)) {
    checkSpec(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5], m.index);
  }
  // glob com array literal: cada elemento citado é specifier; elemento
  // não-literal (variável, template com ${}) é computado.
  const GLOB_LIT_RE = /(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  for (const m of src.matchAll(GLOB_ARRAY_RE)) {
    const body = m[1];
    const lits = [...body.matchAll(GLOB_LIT_RE)];
    const residue = body.replace(GLOB_LIT_RE, '').replace(/[\s,!]/g, '');
    if (residue !== '' || body.includes('${')) { dynamic(m.index); continue; }
    for (const lit of lits) checkSpec(lit[2], m.index);
  }
  for (const m of masked.matchAll(DYNAMIC_RE)) dynamic(m.index);
  for (const m of masked.matchAll(CONCAT_RE)) dynamic(m.index);
}
violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.to.localeCompare(b.to),
);

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
// Identidade do import = arquivo importador + specifier resolvido. N
// ocorrências baselinadas do MESMO specifier autorizam no máximo N —
// a N+1-ésima é violação nova.
const allowedCount = new Map();
for (const v of baseline.violations || []) {
  const key = v.target ? `${v.file}:${v.target}` : `${v.file}:pages/${v.to}`;
  allowedCount.set(key, (allowedCount.get(key) ?? 0) + 1);
}

if (UPDATE) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        description: baseline.description,
        violations: violations.map(({ file, from, to, target }) => ({
          file,
          from,
          to,
          target,
        })),
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
  const k = `${v.file}:${v.target}`;
  const n = (seen.get(k) ?? 0) + 1;
  seen.set(k, n);
  return n > (allowedCount.get(k) ?? 0);
});
if (news.length) {
  console.error(`❌ boundary gate — ${news.length} importação(ões) cross-domain fora do baseline:`);
  for (const v of news)
    console.error(`   ${v.file}:${v.line}  pages/${v.from} → ${v.target}`);
  console.error(
    'Mova o código compartilhado para src/components|lib|hooks|services. Para aceitar revisado: --update',
  );
  process.exit(1);
}
console.log(
  `✅ boundary gate: ${violations.length} violações históricas no baseline, 0 novas.`,
);
