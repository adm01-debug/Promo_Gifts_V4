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
// Lookbehind: `obj.import(`/`m.require(` são métodos chamados import/require,
// não loaders de módulo — não flagrar.
const LB = '(?<![.\\w$])';
// `import.meta.glob` tolera espaços/comentários entre os membros e bracket
// notation (`import .meta['glob']`) — comentários já viraram espaços na visão.
const GLOB_HEAD =
  `${LB}import\\s*\\.\\s*meta\\s*(?:\\.\\s*glob(?:Eager)?|\\[\\s*['"]glob(?:Eager)?['"]\\s*\\])`;
// `vi.*`/`jest.*` mocks com specifier — tolera espaços/comentários entre os
// membros (`vi . mock`, `vi/*c*/.mock` — comentário já virou espaço na visão).
const MOCK_HEAD =
  `${LB}(?:vi|jest)\\s*\\.\\s*` +
  `(?:mock|doMock|unmock|doUnmock|deepUnmock|importMock|importActual|requireActual|requireMock)`;
// `serviceWorker.register` com qualifier opcional (`navigator.`/`window.`).
const SW_HEAD = `${LB}(?:[A-Za-z_$][\\w$]*\\s*\\.\\s*)*serviceWorker\\s*\\.\\s*register`;
// `new Worker`/`new SharedWorker`: qualifier (`window.`/`self.`/`globalThis.`),
// parêntese extra (`new (Worker)`) e `new URL('x', import.meta.url)` de 1º arg.
const WORKER_HEAD =
  `${LB}new\\s*\\(?\\s*(?:[A-Za-z_$][\\w$]*\\s*\\.\\s*)*(?:Shared)?Worker\\s*\\)?\\s*\\(`;
const SPEC_RE = new RegExp(
  [
    `${LB}from\\s*['"\`]([^'"\`]+)['"\`]`,
    `${LB}import\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`,
    `${LB}import\\s*['"\`]([^'"\`]+)['"\`]`, // bare `import'x'` — sem espaço é sintaxe válida
    `${LB}require\\s*\\(\\s*['"]([^'"]+)['"]`,
    `${GLOB_HEAD}\\s*\\(\\s*['"]([^'"]+)['"]`,
    `${WORKER_HEAD}\\s*(?:new\\s+URL\\s*\\(\\s*)?['"]([^'"]+)['"]`,
    `${MOCK_HEAD}\\s*\\(\\s*['"]([^'"]+)['"]`,
    `${SW_HEAD}\\s*\\(\\s*['"]([^'"]+)['"]`,
  ].join('|'),
  'g',
);
// import.meta.glob também aceita array literal de padrões estáticos.
// O corpo é extraído por globArrayBody (aspas/escapes) — regex não pode,
// porque `['../x/[ab].ts']` tem `]` dentro de string.
const GLOB_ARRAY_RE = new RegExp(`${GLOB_HEAD}\\s*\\(\\s*\\[`, 'g');
function globArrayBody(src, openIdx) {
  let depth = 0, q = null, esc = false;
  for (let j = openIdx; j < src.length; j++) {
    const c = src[j];
    if (q !== null) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') depth++;
    if (c === ']' && --depth === 0) return src.slice(openIdx + 1, j);
  }
  return null;
}
// Specifier computado (não-literal): não podemos provar o destino, então
// conta como violação — sem isso `import(var)`/`require(var)`/`glob(var)`
// evadem o gate inteiro. Roda sobre a visão "masked" (conteúdo de strings
// apagado) — texto de UI citando `import(name)` não é chamada. O braço do
// glob exclui `[` porque array literal é tratado por GLOB_ARRAY_RE.
const DYNAMIC_RE = new RegExp(
  [
    `${LB}import\\s*\\(\\s*[^'"\`\\s)]`,
    `${LB}require\\s*\\(\\s*[^'"\\s)]`,
    `${GLOB_HEAD}\\s*\\(\\s*[^'"\\[\\s)]`,
    `${MOCK_HEAD}\\s*\\(\\s*[^'"\\s)]`,
    `${SW_HEAD}\\s*\\(\\s*[^'"\\s)]`,
    `${WORKER_HEAD}\\s*(?:new\\s+URL\\s*\\(\\s*)?[^'"\\s)]`,
  ].join('|'),
  'g',
);
// Concatenação após literal no 1º argumento = computado:
// `require('@/' + x)` e `require('@/'.concat(x))` na visão masked valem o mesmo.
const CONCAT_RE = new RegExp(
  [
    `${LB}(?:import|require)\\s*\\(\\s*['"][^'"]*['"]\\s*(?:\\+|\\.concat\\s*\\()`,
    `${GLOB_HEAD}\\s*\\(\\s*['"][^'"]*['"]\\s*(?:\\+|\\.concat\\s*\\()`,
    `${MOCK_HEAD}\\s*\\(\\s*['"][^'"]*['"]\\s*(?:\\+|\\.concat\\s*\\()`,
    `${SW_HEAD}\\s*\\(\\s*['"][^'"]*['"]\\s*(?:\\+|\\.concat\\s*\\()`,
    `${WORKER_HEAD}\\s*(?:new\\s+URL\\s*\\(\\s*)?['"][^'"]*['"]\\s*(?:\\+|\\.concat\\s*\\()`,
  ].join('|'),
  'g',
);
// Escape `\uXXXX`/`\u{...}`/`\xNN` em posição de código (visível na visão
// masked = fora de literal/comentário/regex): `requir\u0065`, `Work\u0065r`,
// `vi.moc\u006b` são identificadores válidos em runtime mas invisíveis para
// os braços de specifier — marcado como não-auditável (violação dinâmica).
const ESCAPE_CODE_RE = /\\u\{[0-9a-fA-F]{1,6}\}|\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/g;

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
  // JS encerra line-comment também em CR / U+2028 / U+2029 — sem isso
  // `// c␍import('x')` seria apagado mas executaria em runtime.
  const LINE_END_RE = /[\n\r\u2028\u2029]/;
  // `/` abre regex literal quando o token anterior é operador/abertura ou
  // keyword de expressão — senão é divisão. `/[//]/` e `/[/*]/` NÃO são
  // comentários: o `//` e `/*` vivem dentro da classe do regex.
  const REGEX_CTX_CHARS = new Set('=([{,;:!&|?+-*%^~<>/'.split(''));
  const REGEX_CTX_WORDS = new Set([
    'return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void',
    'instanceof', 'yield', 'await', 'else', 'do', 'throw',
  ]);
  let lastSig = null; // último char significativo de código (fora de literal/comentário)
  let prevSig = null; // char significativo anterior a lastSig
  let word = '';      // identificador/keyword em acumulação
  let wordPre = null; // char significativo imediatamente antes do token atual
  // `word` reseta em qualquer char não-palavra (espaço incluído) — então o
  // contexto de keyword NÃO pode ler `word` direto: `return /re/` tem espaço.
  // `lastWasKeyword` congela "o token que TERMINA em lastSig é keyword não-
  // pontuada" — `x.return /` desqualifica via wordPre === '.'. prevWasKeyword
  // é o mesmo flag um char antes (para o `!` prefix vs TS `x!` non-null).
  let lastWasKeyword = false, prevWasKeyword = false;
  // `/re/ /x` — o `/` que fecha uma regex já é operando completo: o `/`
  // seguinte é divisão, não outra regex.
  let afterRegex = false;
  const sig = (c) => {
    if (/[$\w]/.test(c)) {
      if (word === '') wordPre = lastSig;
      word += c;
    } else {
      word = '';
    }
    if (/\S/.test(c)) {
      prevSig = lastSig;
      prevWasKeyword = lastWasKeyword;
      lastSig = c;
      lastWasKeyword = word !== '' && wordPre !== '.' && REGEX_CTX_WORDS.has(word);
      afterRegex = false;
    }
  };
  const isRegexCtx = () => {
    if (lastSig === null) return true;
    // postfix/operando completo antes do `/`: divisão, não regex — sem isso
    // `x++\n/import(v)/y`, `x!/import(v)/2` e `/a/ /import(v)/2` escondem o
    // specifier dinâmico dentro da "regex" fantasma.
    if (lastSig === '/' && afterRegex) return false;
    if ((lastSig === '+' || lastSig === '-') && prevSig === lastSig) return false;
    if (
      lastSig === '!' && prevSig !== null && /[$\w)\]'`}]/.test(prevSig) &&
      !prevWasKeyword
    ) return false;
    if (REGEX_CTX_CHARS.has(lastSig)) return true;
    return lastWasKeyword;
  };
  let i = 0;
  // Regex literal não cruza linha — se não fecha antes do fim da linha era
  // divisão e o `/` volta a ser código comum (retorna false sem consumir).
  const consumeRegex = () => {
    let j = i + 1, inClass = false, esc = false;
    while (j < src.length) {
      const d = src[j];
      if (esc) { esc = false; j++; continue; }
      if (d === '\\') { esc = true; j++; continue; }
      if (LINE_END_RE.test(d)) return false;
      if (inClass) { if (d === ']') inClass = false; j++; continue; }
      if (d === '[') { inClass = true; j++; continue; }
      if (d === '/') {
        keep('/'); sig('/');
        for (let k = i + 1; k < j; k++) hide(src[k]);
        i = j + 1;
        while (i < src.length && /[$\w]/.test(src[i])) { keep(src[i]); i++; } // flags
        afterRegex = true;
        return true;
      }
      j++;
    }
    return false;
  };
  // Corpo de string/template: conteúdo escondido da visão masked; em
  // template, `${...}` é código — tratado por consumeExpr. Recursão mútua:
  // template dentro de `${}` volta a expor suas próprias expressões.
  const lexString = (quote) => {
    while (i < src.length) {
      const d = src[i];
      if (d === '\\') { hide(d); if (i + 1 < src.length) hide(src[i + 1]); i += 2; continue; }
      if (d === quote) { keep(d); i++; return; }
      if (quote === '`' && d === '$' && src[i + 1] === '{') {
        keep('$'); keep('{'); sig('{'); i += 2;
        consumeExpr();
        continue;
      }
      hide(d); i++;
    }
  };
  // Expressão `${...}` dentro de template: código real — mesmos scanners do
  // loop principal (comentários, regex literal, strings aninhadas). sig()
  // alimenta isRegexCtx para `${/[//]/.test(v) ? import(x) : null}`.
  const consumeExpr = () => {
    let depth = 1;
    while (i < src.length && depth > 0) {
      const e = src[i];
      if (e === "'" || e === '"' || e === '`') {
        keep(e); sig(e); i++;
        lexString(e); sig(e);
        continue;
      }
      if (e === '/' && src[i + 1] === '/') {
        while (i < src.length && !LINE_END_RE.test(src[i])) { blank(src[i]); i++; }
        continue;
      }
      if (e === '/' && src[i + 1] === '*') {
        blank(e); blank(src[i + 1]); i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { blank(src[i]); i++; }
        if (i < src.length) { blank(src[i]); blank(src[i + 1]); i += 2; }
        continue;
      }
      if (e === '/' && isRegexCtx() && consumeRegex()) continue;
      if (e === '{') depth++;
      if (e === '}') { depth--; if (depth === 0) { keep('}'); sig('}'); i++; return; } }
      keep(e); sig(e); i++;
    }
  };
  while (i < src.length) {
    const c = src[i];
    // `//` e `/*` SÃO sempre comentários — regex nunca pode começar com eles
    // (`/x/` começa com `/` seguido de qualquer coisa menos `/` ou `*`).
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && !LINE_END_RE.test(src[i])) { blank(src[i]); i++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      blank(src[i]); blank(src[i + 1]); i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { blank(src[i]); i++; }
      if (i < src.length) { blank(src[i]); blank(src[i + 1]); i += 2; }
      continue;
    }
    if (c === '/' && isRegexCtx() && consumeRegex()) continue;
    if (c === "'" || c === '"' || c === '`') { keep(c); sig(c); i++; lexString(c); continue; }
    keep(c); sig(c); i++;
  }
  return { code: code.join(''), masked: masked.join('') };
}

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i.test(e)) yield p;
  }
}

// Resolve um specifier para o caminho normalizado sob src/ (ex.:
// 'pages/quotes/QuoteViewPage'), ou null se não resolve para dentro de
// src/pages. Cobre alias `@/...` e relativos (`../bar/B` a partir de
// pages/foo/ — sem exigir um segmento literal `pages/`).
function resolveTarget(spec, importerFile) {
  // Escapes `\uXXXX`/`\xNN` no specifier são decodificados pelo runtime —
  // `@/\u0070ages/x` ≡ `@/pages/x` e precisa ser comparado decodificado.
  // Escapes no specifier são decodificados pelo runtime: `\uXXXX`, `\xNN`,
  // `\u{...}` e escapes de identidade (`\.` → `.`, `\p` → `p`).
  // `'..\u{2f}quotes'` ≡ `'../quotes'` e `'.\./x'` ≡ `'../x'`.
  const decoded = spec.replace(
    /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|\\([\s\S])/g,
    (_m, uc, u, x, c) => {
      if (uc !== undefined) return String.fromCodePoint(parseInt(uc, 16));
      if (u !== undefined || x !== undefined)
        return String.fromCharCode(parseInt(u ?? x, 16));
      if (c === '\n' || c === '\r') return ''; // continuação de linha
      return { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' }[c] ?? c;
    },
  );
  let rel;
  if (decoded.startsWith('@/')) {
    // `@/` é alias de `src/` — `@/../src/pages/x` ≡ `src/pages/x`.
    rel = normalize(join('src', decoded.slice(2))).split('\\').join('/');
  } else if (decoded.startsWith('.')) {
    rel = normalize(join(dirname(importerFile), decoded)).split('\\').join('/');
  } else if (decoded.startsWith('/')) {
    // Vite resolve `/x` a partir da raiz do projeto — `/src/pages/...`.
    rel = normalize(decoded.slice(1)).split('\\').join('/');
  } else {
    return null;
  }
  // `../../src/pages/x` escapa de pages/ e volta por src/ — mesma coisa.
  if (rel.startsWith('src/')) rel = rel.slice(4);
  return rel.startsWith('pages/') ? rel : null;
}

const violations = [];
for (const f of walk('src/pages')) {
  const rel = relative('src', f).split('\\').join('/');
  const segs = rel.split('/');
  // Testes importam a unidade sob teste — não são acoplamento de produção.
  // `__tests__` exige SEGMENTO exato: `x__tests__` não é isenção (lavadora).
  if (segs.includes('__tests__') || /\.(test|spec)\.[^.]+$/.test(segs.at(-1))) continue;
  // Domínio = 1º segmento de pages/ VERBATIM quando é diretório
  // (`pages/quotes.evil/` NÃO é `pages/quotes/`); arquivo solto em pages/
  // perde a extensão.
  const srcDom = statSync(join('src/pages', segs[1])).isDirectory()
    ? segs[1]
    : segs[1].split('.')[0];
  const raw = readFileSync(f, 'utf8');
  const { code: src, masked } = lexSource(raw);
  const dynamic = (idx) => {
    const line = src.slice(0, idx).split('\n').length;
    violations.push({
      file: rel,
      line,
      pos: idx,
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
    violations.push({ file: rel, line, pos: idx, from: srcDom, to: targetDom, target });
  };
  for (const m of src.matchAll(SPEC_RE)) {
    checkSpec(m.slice(1).find((g) => g !== undefined), m.index);
  }
  // glob com array literal: cada elemento citado é specifier; elemento
  // não-literal (variável, template com ${}) é computado.
  const GLOB_LIT_RE = /(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  for (const m of src.matchAll(GLOB_ARRAY_RE)) {
    const body = globArrayBody(src, m.index + m[0].length - 1);
    if (body === null) { dynamic(m.index); continue; }
    const lits = [...body.matchAll(GLOB_LIT_RE)];
    const residue = body.replace(GLOB_LIT_RE, '').replace(/[\s,!]/g, '');
    if (residue !== '' || body.includes('${')) { dynamic(m.index); continue; }
    for (const lit of lits) checkSpec(lit[2], m.index);
  }
  for (const m of masked.matchAll(DYNAMIC_RE)) dynamic(m.index);
  for (const m of masked.matchAll(CONCAT_RE)) dynamic(m.index);
  for (const m of masked.matchAll(ESCAPE_CODE_RE)) dynamic(m.index);
}
// Dedupe: o mesmo site pode ser flagrado por braços distintos
// (`import('x' + y)` = dinâmico + concat) — conta uma vez por
// arquivo:offset:target; dois imports distintos na mesma linha (offsets
// diferentes) continuam contando separado.
const bySite = new Map();
for (const v of violations) bySite.set(`${v.file}:${v.pos}:${v.target}`, v);
const deduped = [...bySite.values()];
deduped.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.to.localeCompare(b.to),
);
violations.length = 0;
violations.push(...deduped);

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
