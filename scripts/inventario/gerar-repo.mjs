#!/usr/bin/env node
// Inventario gerado do lado do repositorio (sem acesso ao banco). Mesmo formato do Zapp_Web_V2.
//  - edge functions: linhas, segredos lidos (Deno.env.get) e quem as invoca (src, migrations, outras edges, e2e, CI)
//  - rotas: cada <Route path=...> de src/routes/*.tsx com o componente e o arquivo
//  - tabelas: para cada tabela de public em inventario/estado/banco.json (gerado por gerar-banco.mjs),
//    quantos .from('tabela') ha em src/ e supabase/functions/, e a lista final de tabelas orfas
// Uso: node scripts/inventario/gerar-repo.mjs -> escreve edges.json e rotas.json; se banco.json existir, tambem tabelas-uso.json
//      Tudo de uma vez: node scripts/inventario/gerar-banco.mjs && node scripts/inventario/gerar-repo.mjs
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const RAIZ = new URL('../../', import.meta.url).pathname;
const FDIR = join(RAIZ, 'supabase/functions');
const OUT = join(RAIZ, 'inventario/estado');
mkdirSync(OUT, { recursive: true });

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rgCount(pattern, paths) {
  try {
    const out = execFileSync('rg', ['-c', '--no-messages', pattern, ...paths.map((p) => join(RAIZ, p))], { encoding: 'utf8' });
    return out.split('\n').filter(Boolean).reduce((n, l) => n + Number(l.slice(l.lastIndexOf(':') + 1)), 0);
  } catch { return 0; }
}
function rgFiles(pattern, paths) {
  try {
    return execFileSync('rg', ['-l', '--no-messages', pattern, ...paths.map((p) => join(RAIZ, p))], { encoding: 'utf8' })
      .split('\n').filter(Boolean).map((f) => f.slice(RAIZ.length));
  } catch { return []; }
}

const edges = readdirSync(FDIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(FDIR, d.name, 'index.ts')))
  .map((d) => d.name).sort();

const inventario = {};
for (const f of edges) {
  const q = esc(f);
  const code = readFileSync(join(FDIR, f, 'index.ts'), 'utf8');
  const envs = [...new Set([...code.matchAll(/Deno\.env\.get\(\s*['"]([A-Z0-9_]+)['"]/g)].map((m) => m[1]))].sort();
  const src = rgFiles(`(functions\\.invoke\\(\\s*['"\`]${q}['"\`]|functions/v1/${q}\\b|['"\`]${q}['"\`]\\s*[,)])`, ['src']);
  const migrations = rgFiles(`functions/v1/${q}\\b`, ['supabase/migrations']);
  const outrasEdges = rgFiles(`functions/v1/${q}\\b|['"\`]${q}['"\`]`, ['supabase/functions']).filter((p) => !p.startsWith(`supabase/functions/${f}/`))
    // _shared/ guarda listas de nomes (CORS, authz) e README.md é documentação: não são chamadores.
    .filter((p) => !p.startsWith('supabase/functions/_shared/') && !p.endsWith('README.md'));
  const e2e = rgFiles(q, ['e2e']);
  const ci = rgFiles(q, ['.github/workflows', 'supabase/config.toml']);
  inventario[f] = {
    linhas: code.split('\n').length,
    segredos_lidos: envs,
    chamada_em: { src: src.length, migrations: migrations.length, outras_edges: outrasEdges.length, e2e: e2e.length, ci_config: ci.length },
    sem_chamador: src.length + migrations.length + outrasEdges.length === 0,
  };
}
const semChamador = Object.entries(inventario).filter(([, v]) => v.sem_chamador).map(([k]) => k);
writeFileSync(join(OUT, 'edges.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: edges.length, sem_chamador_no_repo: semChamador, edge_functions: inventario }) + '\n');
console.log(`edges: ${edges.length} | sem chamador no repo (src/migrations/edges): ${semChamador.length}`);

// Rotas do front: <Route ... path="..." element={<Tela/>}> em src/routes/*.tsx -> tela (arquivo) -> hooks -> dados.
// Guardas vêm da própria rota e dos <Route element={<XRoute/>}> que a envolvem (layout routes).
// Grupos montados em AppRoutes.tsx ({productRoutes} dentro de <ProtectedRoute/>) herdam as guardas de lá.
// "dados" = .from('tabela'), .rpc('funcao') e edge functions (functions.invoke / invokeEdge / functions/v1/x)
// alcançáveis a partir da tela seguindo imports locais até PROFUNDIDADE níveis (fora src/components/ui,
// src/integrations, src/contexts e testes, que são compartilhados por tudo e só gerariam ruído).
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
for (const m of lazy.matchAll(/export const (\w+)\s*=\s*lazyWithRetry\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]/g)) {
  telaArquivo[m[1]] = resolver(m[2], join(RDIR, 'lazy-pages.ts'));
}
function importsDe(code, deArquivo) {
  const out = {};
  for (const m of code.matchAll(/import\s+(?:type\s+)?([\w$]+)?\s*,?\s*(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g)) {
    const alvo = resolver(m[3], deArquivo);
    if (m[1]) out[m[1]] = alvo;
    for (const nome of (m[2] ?? '').split(',').map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)) out[nome] = alvo;
  }
  return out;
}
function dadosDe(code) {
  const pegar = (re) => [...new Set([...code.matchAll(re)].map((m) => m[1]))].sort();
  return {
    tabelas: pegar(/(?<!storage\s*)\.from\(\s*['"`]([A-Za-z_][\w.]*)['"`]/g),
    buckets: pegar(/storage\s*\.from\(\s*['"`]([\w.-]+)['"`]/g),
    rpcs: pegar(/\.rpc\(\s*['"`]([A-Za-z_][\w.]*)['"`]/g),
    edges: pegar(/(?:functions\.invoke|invokeEdge\w*)\(\s*['"`]([\w-]+)['"`]|functions\/v1\/([\w-]+)/g).filter(Boolean),
  };
}
const juntar = (lista) => {
  const r = { tabelas: new Set(), buckets: new Set(), rpcs: new Set(), edges: new Set() };
  for (const d of lista) for (const k of Object.keys(r)) d[k].forEach((x) => r[k].add(x));
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [...v].sort()]));
};
const PROFUNDIDADE = 4;
const IGNORAR = /^src\/(components\/ui|integrations|contexts)\/|\.(test|spec)\.[tj]sx?$|__tests__/;
const cacheArq = new Map();
function infoArq(arq) {
  if (!cacheArq.has(arq)) {
    const code = readFileSync(arq, 'utf8');
    const locais = [...new Set(Object.values(importsDe(code, arq)).filter((f) => f && !IGNORAR.test(rel(f))))];
    for (const m of code.matchAll(/export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g)) {
      const f = resolver(m[1], arq);
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
// Guardas herdadas: AppRoutes.tsx monta grupos ({xRoutes}) dentro de <Route element={<Guarda/>}>
const guardasDoGrupo = {};
{
  const app = lerSeExiste(join(RDIR, 'AppRoutes.tsx')) ?? '';
  const pilha = [];
  for (const m of app.matchAll(/<Route\b([^>]*?(?:\{[^}]*\}[^>]*?)*)(\/?)>|<\/Route>|\{\s*(\w+Routes?)\s*\}/gs)) {
    if (m[0] === '</Route>') { pilha.pop(); continue; }
    if (m[3]) { guardasDoGrupo[m[3]] = pilha.filter(Boolean); continue; }
    if (m[2] !== '/') {
      const el = m[1].match(/element=\{\s*<\s*([A-Za-z0-9_.]+)/)?.[1] ?? null;
      pilha.push(el && /(Route|Guard)$/.test(el) ? el : null);
    }
  }
}
const rotas = [];
for (const arq of readdirSync(RDIR).filter((n) => n.endsWith('.tsx') && !n.includes('.test.')).sort()) {
  const caminho = join(RDIR, arq);
  const code = readFileSync(caminho, 'utf8');
  Object.assign(telaArquivo, Object.fromEntries(Object.entries(importsDe(code, caminho)).filter(([k, v]) => v && !(k in telaArquivo))));
  const exportsGrupo = [...code.matchAll(/export const (\w+)\s*=/g)].map((m) => ({ nome: m[1], pos: m.index }));
  const pilha = [];
  for (const m of code.matchAll(/<Route\b([^>]*?(?:\{[^}]*\}[^>]*?)*)(\/?)>|<\/Route>/gs)) {
    if (m[0] === '</Route>') { pilha.pop(); continue; }
    const attrs = m[1];
    const autoFecha = m[2] === '/';
    // element={<Wrapper><Tela/></Wrapper>}: a tela é o primeiro componente que não termina em Route/Guard
    const nomesEl = [...(attrs.match(/element=\{([^}]*)\}/)?.[1] ?? '').matchAll(/<\s*([A-Z][\w.]*)/g)].map((x) => x[1]);
    const el = nomesEl.find((n) => !/(Route|Guard)$/.test(n)) ?? nomesEl[0] ?? null;
    const path = attrs.match(/\bpath=["'{`]+([^"'`}]+)/)?.[1];
    const guardasProprias = nomesEl.filter((n) => n !== el && /(Route|Guard)$/.test(n));
    if (!autoFecha) pilha.push(el && /(Route|Guard)$/.test(el) ? el : null);
    if (!path) continue;
    const grupo = exportsGrupo.filter((e) => e.pos < m.index).pop()?.nome;
    const herdadas = arq === 'AppRoutes.tsx' ? [] : guardasDoGrupo[grupo] ?? [];
    const guardas = [...new Set([...herdadas, ...pilha.slice(0, autoFecha ? pilha.length : -1).filter(Boolean), ...guardasProprias.filter((g) => g !== el)])];
    // componente definido no próprio arquivo de rotas (function X / const X =) -> a tela é esse arquivo
    const local = el && new RegExp(`(?:function|const)\\s+${el}\\b`).test(code) ? caminho : null;
    const tela = el ? telaArquivo[el] ?? local : null;
    const hooks = tela
      ? Object.entries(importsDe(readFileSync(tela, 'utf8'), tela)).filter(([n, f]) => f && /^use[A-Z]/.test(n)).map(([n, f]) => ({ hook: n, arquivo: rel(f) }))
      : [];
    const dados = tela ? dadosAlcancaveis(tela) : { tabelas: [], buckets: [], rpcs: [], edges: [], arquivos_lidos: 0 };
    rotas.push({ path, componente: el, tela: rel(tela), grupo: grupo ?? null, guardas, hooks, dados, arquivo: `src/routes/${arq}`, linha: code.slice(0, m.index).split('\n').length });
  }
}
const semTela = rotas.filter((r) => r.componente && !r.tela && !/^(Navigate|Deprecated)/.test(r.componente)).map((r) => `${r.path} -> ${r.componente}`);
writeFileSync(join(OUT, 'rotas.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: rotas.length, sem_tela_resolvida: semTela, rotas }, null, 1) + '\n');
console.log(`rotas: ${rotas.length} | tela resolvida: ${rotas.filter((r) => r.tela).length} | sem tela resolvida: ${semTela.length}`);

const BANCO = join(OUT, 'banco.json');
if (existsSync(BANCO)) {
  const banco = JSON.parse(readFileSync(BANCO, 'utf8'));
  const nomes = banco.tabelas.filter((t) => t.nome.startsWith('public.') && !t.particao).map((t) => t.nome.slice(7));
  const uso = {};
  for (const t of nomes) {
    const q = esc(t);
    uso[t] = {
      from_src: rgCount(`\\.from\\(\\s*['"\`]${q}['"\`]`, ['src']),
      from_edges: rgCount(`\\.from\\(\\s*['"\`]${q}['"\`]`, ['supabase/functions']),
      em_types_ts: rgCount(`^\\s+${q}: \\{`, ['src/integrations/supabase/types.ts']) > 0,
    };
  }
  const semFrom = Object.entries(uso).filter(([, v]) => v.from_src + v.from_edges === 0).map(([k]) => k);
  // Orfa = 0 linhas + nenhuma funcao/view/mview cita (banco.json) + nenhum .from() no codigo.
  const orfas = (banco.candidatas_orfas ?? []).filter((t) => semFrom.includes(t));
  writeFileSync(join(OUT, 'tabelas-uso.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: nomes.length, sem_from_em_src_nem_edges: semFrom, tabelas_orfas: orfas, tabelas: uso }, null, 1) + '\n');
  console.log(`tabelas: ${nomes.length} | sem .from() em src nem edges: ${semFrom.length} | orfas: ${orfas.length}`);
}
