#!/usr/bin/env node
/**
 * Inventario das rotas do front -> inventario/estado/rotas.json (fonte de consulta dos agentes).
 * Mesmo papel do scripts/inventario/gerar-rotas.mjs do Zapp_Web_V2.
 *
 * Para cada <Route path=...> de src/routes/*.tsx: componente, tela (arquivo), grupo, guardas (proprias,
 * dos <Route element={<XRoute/>}> que a envolvem e as herdadas do AppRoutes.tsx, ex.: ProtectedRoute),
 * hooks do projeto que a tela importa e dados alcancaveis (tabelas, buckets, RPCs, edges) seguindo
 * imports locais ate PROFUNDIDADE niveis. Harness /__* e rotas montadas com `X &&` saem com somente_dev.
 *
 * Uso: node scripts/inventario/gerar-rotas.mjs
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = new URL('../../', import.meta.url).pathname;
const OUT = join(RAIZ, 'inventario/estado');
// Acesso a tabela: .from('t') (fora storage), untypedFrom/goldFrom('t') e { table: 't' } (dbInvoke e afins)
const ACESSO_TABELA = /(?<!storage\s*)(?:\.from|\buntypedFrom|\bgoldFrom)(?:<[^>(]*>)?\(\s*['"`]([A-Za-z_][\w.]*)['"`]|\btable:\s*['"`]([A-Za-z_][\w.]*)['"`]/g;
const RDIR = join(RAIZ, 'src/routes');
const SRC = join(RAIZ, 'src');
const lerSeExiste = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
function resolver(spec, deArquivo) {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = join(deArquivo, '..', spec);
  else return null;
  for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const p = base + ext;
    if (/\.(tsx?|jsx?)$/.test(p) && existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}
const rel = (p) => (p ? p.slice(RAIZ.length) : null);
// componente -> arquivo: lazy-pages.ts (lazyWithRetry(() => import('...'))) e imports diretos nos arquivos de rota
const telaArquivo = {};
const lazy = lerSeExiste(join(RDIR, 'lazy-pages.ts')) ?? '';
// const X = lazy*(() => import('...'))  — em lazy-pages.ts e nos proprios arquivos de rota (harness)
// aceita prefixo condicional curto: const X = import.meta.env.DEV ? lazyWithRetry(() => import('...')) : null
const RE_LAZY = /(?:export\s+)?const\s+(\w+)\s*=[^;]{0,120}?\w*[lL]azy\w*\(\s*\(\)\s*=>\s*import\(\s*['"`]([^'"`]+)['"`]/g;
function lazysDe(code, deArquivo) {
  return Object.fromEntries([...code.matchAll(RE_LAZY)].map((m) => [m[1], resolver(m[2], deArquivo)]).filter(([, f]) => f));
}
Object.assign(telaArquivo, lazysDe(lazy, join(RDIR, 'lazy-pages.ts')));
function importsDe(code, deArquivo) {
  const out = {};
  for (const m of code.matchAll(/import\s+(?:type\s+)?([\w$]+)?\s*,?\s*(?:\{([^}]*)\})?\s*from\s*['"`]([^'"`]+)['"`]/g)) {
    const alvo = resolver(m[3], deArquivo);
    if (m[1]) out[m[1]] = alvo;
    for (const nome of (m[2] ?? '').split(',').map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)) out[nome] = alvo;
  }
  return out;
}
/** Nomes de edge functions chamadas no codigo: functions.invoke / invokeEdge* / callEdge* (com generico em
 * varias linhas, nome em constante ou condicional) e URLs /functions/v1/<nome> ou `${...FUNCTIONS_URL}/<nome>`. */
/** Tira comentarios de bloco e linhas inteiras de comentario (// no inicio da linha). Nao mexe em strings com URL. */
export function semComentarios(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

export function edgesChamadasNoCodigo(bruto) {
  const code = semComentarios(bruto);
  const nomes = new Set();
  const consts = Object.fromEntries([...code.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]([a-z0-9][a-z0-9-]*)['"`]/g)].map((m) => [m[1], m[2]]));
  for (const m of code.matchAll(/functions\/v1\/([a-z0-9][a-z0-9-]*)/g)) nomes.add(m[1]);
  for (const m of code.matchAll(/FUNCTIONS(?:_BASE)?_URL\s*\}?\s*\/\s*([a-z0-9][a-z0-9-]*)/gi)) nomes.add(m[1]);
  // helper com opcoes em objeto: invokeFullScopeFunction({ functionName: 'mcp-keys-rotate', ... })
  for (const m of code.matchAll(/\bfunctionName\s*:\s*['"`]([a-z0-9][a-z0-9-]*)['"`]/g)) nomes.add(m[1]);
  for (const m of code.matchAll(/(?:functions\s*\.\s*invoke|\binvokeEdge\w*|\bcallEdge\w*)\s*(?=[<(])/g)) {
    let i = m.index + m[0].length;
    if (code[i] === '<') { // pula o generico contando < >, ignorando =>
      let prof = 0;
      for (; i < code.length && i < m.index + 4000; i++) {
        if (code[i] === '<') prof++;
        else if (code[i] === '>' && code[i - 1] !== '=') { prof--; if (prof === 0) { i++; break; } }
      }
    }
    const trecho = code.slice(i, i + 300);
    const arg = trecho.match(/^\s*\(\s*(?:['"`]([a-z0-9][a-z0-9-]*)['"`]|([A-Za-z_$][\w$]*))/);
    if (!arg) continue;
    if (arg[1]) { nomes.add(arg[1]); continue; }
    if (consts[arg[2]]) nomes.add(consts[arg[2]]);
    // primeiro argumento condicional (cond ? 'a' : 'b'): literais ate a primeira virgula/parentese
    // so os ramos (depois do ?), nao a condicao: mode === 'audit' ? 'audit-suite' : 'simulation-orchestrator'
    const primeiro = trecho.match(/^\s*\(([^,)]*)/)?.[1] ?? '';
    const ramos = primeiro.includes('?') ? primeiro.slice(primeiro.indexOf('?') + 1) : '';
    for (const l of ramos.matchAll(/['"`]([a-z0-9][a-z0-9-]*)['"`]/g)) nomes.add(l[1]);
  }
  return nomes;
}

// Nomes passados ao resolvedor de credenciais (_shared/credentials.ts), que le o env com esse nome (comentarios ignorados):
// resolveCredential('X') / getCredential('X'), resolveCredentials(['A', 'B']) e resolveCredentials([...LISTA]) com LISTA no mesmo arquivo.
export function segredosViaResolver(bruto) {
  const code = semComentarios(bruto);
  const nomes = new Set();
  const literais = (txt) => [...txt.matchAll(/['"`]([A-Z][A-Z0-9_]+)['"`]/g)].map((m) => m[1]);
  for (const m of code.matchAll(/\b(?:resolveCredential|getCredential)\s*\(\s*['"`]([A-Z][A-Z0-9_]+)['"`]/g)) nomes.add(m[1]);
  for (const m of code.matchAll(/\bresolveCredentials\s*\(\s*(\[[^\]]*\]|[A-Za-z_$][\w$]*)/g)) {
    for (const n of literais(m[1])) nomes.add(n);
    for (const ref of m[1].matchAll(/(?:\.\.\.)?\b([A-Za-z_$][\w$]*)\b/g)) {
      const def = code.match(new RegExp(`\\bconst\\s+${ref[1]}\\b[^=]*=\\s*(\\[[^\\]]*\\])`));
      if (def) for (const n of literais(def[1])) nomes.add(n);
    }
  }
  return nomes;
}

export function dadosDe(bruto) {
  const code = semComentarios(bruto);
  const pegar = (re) => [...new Set([...code.matchAll(re)].map((m) => m[1] ?? m[2]).filter(Boolean))].sort();
  return {
    tabelas: pegar(ACESSO_TABELA),
    buckets: pegar(/storage\s*\.from\(\s*['"`]([\w.-]+)['"`]/g),
    // .rpc('fn') e o helper untypedRpc('fn') / untypedRpc<T>('fn') (src/lib/supabase-untyped.ts)
    rpcs: pegar(/(?:\.rpc|\buntypedRpc)\s*(?:<[^()]*?>)?\(\s*['"`]([A-Za-z_][\w.]*)['"`]/g),
    edges: [...edgesChamadasNoCodigo(code)].sort(),
  };
}
const juntar = (lista) => {
  const r = { tabelas: new Set(), buckets: new Set(), rpcs: new Set(), edges: new Set() };
  for (const d of lista) for (const k of Object.keys(r)) d[k].forEach((x) => r[k].add(x));
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [...v].sort()]));
};
const PROFUNDIDADE = 4;
// integrations/ entra (helpers com RPC); so o types.ts gerado fica de fora (enorme e sem chamadas)
const IGNORAR = /^src\/(components\/ui|contexts)\/|^src\/integrations\/supabase\/types\.ts$|\.(test|spec)\.[tj]sx?$|_test\.[tj]sx?$|__tests__/;
const cacheArq = new Map();
function infoArq(arq) {
  if (!cacheArq.has(arq)) {
    const code = readFileSync(arq, 'utf8');
    const locais = [...new Set(Object.values(importsDe(code, arq)).filter((f) => f && !IGNORAR.test(rel(f))))];
    // re-exports e imports dinamicos (abas/telas carregadas sob demanda) tambem sao arestas
    for (const m of code.matchAll(/export\s+(?:\*|\{[^}]*\})\s+from\s+['"`]([^'"`]+)['"`]|\bimport\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
      const f = resolver(m[1] ?? m[2], arq);
      if (f && !IGNORAR.test(rel(f))) locais.push(f);
    }
    cacheArq.set(arq, { dados: dadosDe(code), locais: [...new Set(locais)] });
  }
  return cacheArq.get(arq);
}
function dadosAlcancaveis(inicio) {
  const vistos = new Set([inicio]);
  let fronteira = [inicio];
  const coletados = [];
  for (let n = 0; n <= PROFUNDIDADE && fronteira.length; n++) {
    const prox = [];
    for (const f of fronteira) {
      const i = infoArq(f);
      coletados.push(i.dados);
      for (const g of i.locais) if (!vistos.has(g)) { vistos.add(g); prox.push(g); }
    }
    fronteira = prox;
  }
  return { ...juntar(coletados), arquivos_lidos: vistos.size };
}

// atributos: qualquer coisa menos > ou {, ou um bloco {..}; alternativas disjuntas (sem backtracking exponencial)
const RE_ROUTE = /<Route\b((?:[^>{]|\{[^}]*\})*?)(\/?)>|<\/Route>/gs;
const ehGuarda = (n) => /(Route|Guard)$/.test(n);

/** Guardas herdadas por grupo: AppRoutes.tsx monta {xRoutes} dentro de <Route element={<Guarda/>}>. */
export function guardasDosGrupos(appCode) {
  const guardas = {};
  const pilha = [];
  for (const m of appCode.matchAll(/<Route\b((?:[^>{]|\{[^}]*\})*?)(\/?)>|<\/Route>|\{\s*(\w+Routes?)\s*\}/gs)) {
    if (m[0] === '</Route>') { pilha.pop(); continue; }
    if (m[3]) { guardas[m[3]] = pilha.filter(Boolean); continue; }
    if (m[2] !== '/') {
      const el = m[1].match(/element=\{\s*<\s*([A-Za-z0-9_.]+)/)?.[1] ?? null;
      pilha.push(el && ehGuarda(el) ? el : null);
    }
  }
  return guardas;
}

/** Rotas declaradas num arquivo (sem resolver telas): path, componente, grupo, guardas, somente_dev, linha. */
export function extrairRotas(code, { arquivo = 'AppRoutes.tsx', guardasDoGrupo = {} } = {}) {
  const exportsGrupo = [...code.matchAll(/export const (\w+)\s*=/g)].map((m) => ({ nome: m[1], pos: m.index }));
  const pilha = [];
  const out = [];
  for (const m of code.matchAll(RE_ROUTE)) {
    if (m[0] === '</Route>') { pilha.pop(); continue; }
    const attrs = m[1];
    const autoFecha = m[2] === '/';
    // element={<Wrapper><Tela/></Wrapper>}: a tela e o primeiro componente que nao termina em Route/Guard
    const nomesEl = [...(attrs.match(/element=\{([^}]*)\}/)?.[1] ?? '').matchAll(/<\s*([A-Z][\w.]*)/g)].map((x) => x[1]);
    const el = nomesEl.find((n) => !ehGuarda(n)) ?? nomesEl[0] ?? null;
    const path = attrs.match(/\bpath=["'{`]+([^"'`}]+)/)?.[1];
    const guardasProprias = nomesEl.filter((n) => n !== el && ehGuarda(n));
    if (!autoFecha) pilha.push(el && ehGuarda(el) ? el : null);
    if (!path) continue;
    const grupo = exportsGrupo.filter((e) => e.pos < m.index).pop()?.nome ?? null;
    const herdadas = arquivo === 'AppRoutes.tsx' ? [] : guardasDoGrupo[grupo] ?? [];
    const guardas = [...new Set([...herdadas, ...pilha.slice(0, autoFecha ? pilha.length : -1).filter(Boolean), ...guardasProprias])];
    const somenteDev = path.startsWith('/__') || /&&\s*(\(\s*)?$/.test(code.slice(Math.max(0, m.index - 40), m.index));
    out.push({ path, componente: el, grupo, guardas, somente_dev: somenteDev, linha: code.slice(0, m.index).split('\n').length });
  }
  return out;
}

/** Componentes JSX renderizados por um componente declarado no proprio arquivo (function X / const X =). */
export function componentesDoLocal(code, nome) {
  const ini = code.search(new RegExp(`(?:function|const)\\s+${nome}\\b`));
  if (ini < 0) return [];
  const resto = code.slice(ini);
  const fim = resto.search(/\n\}/);
  const corpo = fim < 0 ? resto : resto.slice(0, fim);
  return [...new Set([...corpo.matchAll(/<\s*([A-Z][\w.]*)/g)].map((m) => m[1]))].filter((n) => n !== nome);
}

function main() {
  const guardasDoGrupo = guardasDosGrupos(lerSeExiste(join(RDIR, 'AppRoutes.tsx')) ?? '');
  const rotas = [];
  const redirecionamentos = new Set();
  for (const arq of readdirSync(RDIR).filter((n) => n.endsWith('.tsx') && !n.includes('.test.')).sort()) {
    const caminho = join(RDIR, arq);
    const code = readFileSync(caminho, 'utf8');
    Object.assign(telaArquivo, Object.fromEntries(Object.entries({ ...importsDe(code, caminho), ...lazysDe(code, caminho) }).filter(([k, v]) => v && !(k in telaArquivo))));
    for (const r of extrairRotas(code, { arquivo: arq, guardasDoGrupo })) {
      const el = r.componente;
      // componente definido no proprio arquivo de rotas (function X / const X =): a tela e o primeiro
      // componente que ele renderiza e que resolve para arquivo (KitBuilderRoute -> KitBuilderPage).
      // Se so renderiza <Navigate>, e redirecionamento: sem tela. Nunca usa o arquivo de rotas inteiro.
      const renderiza = el && !(el in telaArquivo) ? componentesDoLocal(code, el) : [];
      const tela = el ? telaArquivo[el] ?? renderiza.map((n) => telaArquivo[n]).find(Boolean) ?? null : null;
      if (!tela && renderiza.length && renderiza.every((n) => n === 'Navigate')) redirecionamentos.add(r.path);
      const hooks = tela
        ? Object.entries(importsDe(readFileSync(tela, 'utf8'), tela)).filter(([n, f]) => f && /^use[A-Z]/.test(n)).map(([n, f]) => ({ hook: n, arquivo: rel(f) }))
        : [];
      const dados = tela ? dadosAlcancaveis(tela) : { tabelas: [], buckets: [], rpcs: [], edges: [], arquivos_lidos: 0 };
      rotas.push({ ...r, tela: rel(tela), hooks, dados, arquivo: `src/routes/${arq}` });
    }
  }
  const semTela = rotas.filter((r) => r.componente && !r.tela && !redirecionamentos.has(r.path) && !/^(Navigate|Deprecated)/.test(r.componente)).map((r) => `${r.path} -> ${r.componente}`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'rotas.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: rotas.length, total_producao: rotas.filter((r) => !r.somente_dev).length, sem_tela_resolvida: semTela, rotas }, null, 1) + '\n');
  console.log(`rotas: ${rotas.length} (${rotas.filter((r) => !r.somente_dev).length} de producao) | tela resolvida: ${rotas.filter((r) => r.tela).length} | sem tela resolvida: ${semTela.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
