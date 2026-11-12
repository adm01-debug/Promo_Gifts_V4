#!/usr/bin/env node
// Inventario das edge functions do repositorio -> inventario/estado/edges.json. Mesmo formato do Zapp_Web_V2.
//  - linhas, segredos lidos (Deno.env.get no index.ts e nos modulos locais/_shared que ele importa)
//  - quem invoca cada uma: src, migrations, outras edges, cron (banco.json -> cron.jobs[].edges), e2e, CI
//  (rotas: gerar-rotas.mjs; banco, uso de tabelas e orfas: gerar-banco.mjs)
// Uso: node scripts/inventario/gerar-repo.mjs   (rode depois do gerar-banco.mjs para contar as chamadas por cron)
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { edgesChamadasNoCodigo, segredosViaResolver, semComentarios } from './gerar-rotas.mjs';

const RAIZ = new URL('../../', import.meta.url).pathname;
const FDIR = join(RAIZ, 'supabase/functions');
const OUT = join(RAIZ, 'inventario/estado');
mkdirSync(OUT, { recursive: true });

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// GUARD: sem ripgrep a busca NÃO pode virar "0 usos" (o inventário mentiria). Antes abortava, o que
// derrubava CI em runner sem rg; agora cai numa busca equivalente em Node (mesmo regex, mesmos alvos,
// pula node_modules e entradas ocultas na recursão, como o rg). GERAR_REPO_SEM_RG=1 força o fallback.
let TEM_RG = process.env.GERAR_REPO_SEM_RG !== '1';
if (TEM_RG) {
  try { execFileSync('rg', ['--version'], { stdio: 'ignore' }); } catch { TEM_RG = false; }
}
if (!TEM_RG) console.warn('gerar-repo: ripgrep (rg) ausente — usando busca equivalente em Node.');
function arquivosSob(p, acc = []) {
  if (!statSync(p).isDirectory()) { acc.push(p); return acc; }
  for (const e of readdirSync(p, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const filho = join(p, e.name);
    if (e.isDirectory()) arquivosSob(filho, acc);
    else if (e.isFile()) acc.push(filho);
  }
  return acc;
}
function rgFiles(pattern, paths) {
  const alvos = paths.map((p) => join(RAIZ, p)).filter((p) => existsSync(p));
  if (!alvos.length) return [];
  if (!TEM_RG) {
    const re = new RegExp(pattern);
    return alvos.flatMap((a) => arquivosSob(a))
      .filter((f) => re.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(RAIZ.length));
  }
  try {
    return execFileSync('rg', ['-l', '--no-messages', pattern, ...alvos], { encoding: 'utf8' })
      .split('\n').filter(Boolean).map((f) => f.slice(RAIZ.length));
  } catch (e) {
    if (e.status === 1) return []; // rg: 1 = nenhum resultado; qualquer outro código é erro real
    throw e;
  }
}
// Chamadas de edge lidas do arquivo inteiro (não por linha): functions.invoke / invokeEdge* / callEdge*,
// com genérico em várias linhas (invokeEdge<{...}>('nome')) e nome em constante (const FN = 'nome'; invoke(FN)),
// além de URLs /functions/v1/<nome>. Devolve Map nome -> Set(arquivos relativos).
function listarCodigo(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) listarCodigo(p, acc);
    // testes nao sao chamadores: .test./.spec./__tests__ (vitest) e *_test.ts / tests/ (Deno)
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name) && !/(\.test\.|\.spec\.|_test\.[jt]sx?$)/.test(e.name) && !p.includes('__tests__') && !p.includes('/tests/')) acc.push(p);
  }
  return acc;
}
function chamadasEdge(pastas) {
  const mapa = new Map();
  for (const pasta of pastas) {
    for (const arq of listarCodigo(join(RAIZ, pasta))) {
      for (const nome of edgesChamadasNoCodigo(readFileSync(arq, 'utf8'))) {
        if (!mapa.has(nome)) mapa.set(nome, new Set());
        mapa.get(nome).add(arq.slice(RAIZ.length));
      }
    }
  }
  return mapa;
}
const CHAMADAS_SRC = chamadasEdge(['src']);
const CHAMADAS_EDGES = chamadasEdge(['supabase/functions']);
// Segredos lidos pela edge: Deno.env.get no index.ts e nos módulos locais que ele importa (inclui _shared/)
function segredosDaEdge(arqInicial) {
  const vistos = new Set();
  const fila = [arqInicial];
  const nomes = new Set();
  while (fila.length) {
    const arq = fila.pop();
    if (vistos.has(arq) || !existsSync(arq)) continue;
    vistos.add(arq);
    const code = semComentarios(readFileSync(arq, 'utf8')); // exemplo em comentario nao e segredo lido
    for (const m of code.matchAll(/Deno\.env\.get\(\s*(['"][A-Z0-9_]+['"]|[A-Za-z_$][\w$]*)/g)) {
      const lit = m[1].match(/^['"]([A-Z0-9_]+)['"]$/);
      if (lit) nomes.add(lit[1]);
      else {
        // constante local (ex.: AI_CREDENTIAL_NAME em _shared/ai-credentials.ts) em vez de string literal
        const def = code.match(new RegExp(`\\b(?:const|let|var)\\s+${m[1]}\\b[^=]*=\\s*['"]([A-Z0-9_]+)['"]`));
        if (def) nomes.add(def[1]);
      }
    }
    for (const n of segredosViaResolver(code)) nomes.add(n);
    // imports estaticos e dinamicos locais (import('./x.ts') carrega modulos que tambem leem segredos)
    for (const m of code.matchAll(/(?:from\s+|\bimport\(\s*)['"`](\.{1,2}\/[^'"`]+)['"`]/g)) fila.push(join(arq, '..', m[1]));
  }
  return [...nomes].sort();
}

// Edges chamadas por cron (net.http_post para /functions/v1/<nome>), lidas do banco.json se ele existir.
const BANCO = join(OUT, 'banco.json');
const PELO_CRON = new Map();
if (existsSync(BANCO)) {
  for (const j of JSON.parse(readFileSync(BANCO, 'utf8')).cron?.jobs ?? []) {
    for (const e of j.edges ?? []) PELO_CRON.set(e, [...(PELO_CRON.get(e) ?? []), j.nome]);
  }
}

const edges = readdirSync(FDIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(FDIR, d.name, 'index.ts')))
  .map((d) => d.name).sort();

const inventario = {};
for (const f of edges) {
  const q = esc(f);
  const code = readFileSync(join(FDIR, f, 'index.ts'), 'utf8');
  const envs = segredosDaEdge(join(FDIR, f, 'index.ts'));
  const src = [...(CHAMADAS_SRC.get(f) ?? [])];
  const migrations = rgFiles(`functions/v1/${q}\\b`, ['supabase/migrations']);
  const outrasEdges = [...(CHAMADAS_EDGES.get(f) ?? [])].filter((p) => !p.startsWith(`supabase/functions/${f}/`));
  const e2e = rgFiles(q, ['e2e']);
  const ci = rgFiles(q, ['.github/workflows', 'supabase/config.toml']);
  inventario[f] = {
    linhas: code.split('\n').length,
    segredos_lidos: envs,
    chamada_em: { src: src.length, migrations: migrations.length, outras_edges: outrasEdges.length, cron: PELO_CRON.get(f) ?? [], e2e: e2e.length, ci_config: ci.length },
    sem_chamador: src.length + migrations.length + outrasEdges.length + (PELO_CRON.get(f)?.length ?? 0) === 0,
  };
}
const semChamador = Object.entries(inventario).filter(([, v]) => v.sem_chamador).map(([k]) => k);
writeFileSync(join(OUT, 'edges.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: edges.length, sem_chamador: semChamador, edge_functions: inventario }, null, 1) + '\n');
console.log(`edges: ${edges.length} | chamadas por cron: ${[...PELO_CRON.keys()].filter((e) => edges.includes(e)).length} | sem chamador (src/migrations/edges/cron): ${semChamador.length}`);
