#!/usr/bin/env node
// Inventario gerado do lado do repositorio (sem acesso ao banco). Mesmo formato do Zapp_Web_V2.
//  - edge functions: linhas, segredos lidos (Deno.env.get) e quem as invoca (src, migrations, outras edges, e2e, CI)
//  - rotas: cada <Route path=...> de src/routes/*.tsx com o componente e o arquivo
//  - tabelas: para cada tabela de public em inventario/estado/banco.json (gerado por gerar-banco.mjs),
//    quantos .from('tabela') ha em src/ e supabase/functions/, e a lista final de tabelas orfas
// Uso: node scripts/inventario/gerar-repo.mjs -> escreve edges.json e rotas.json; se banco.json existir, tambem tabelas-uso.json
//      Tudo de uma vez: node scripts/inventario/gerar-banco.mjs && node scripts/inventario/gerar-repo.mjs
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
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

// Rotas do front: <Route ... path="..." ... element={<Componente .../>} /> em src/routes/*.tsx
const RDIR = join(RAIZ, 'src/routes');
const rotas = [];
for (const arq of readdirSync(RDIR).filter((n) => n.endsWith('.tsx') && !n.includes('.test.')).sort()) {
  const code = readFileSync(join(RDIR, arq), 'utf8');
  for (const m of code.matchAll(/<Route\b([^>]*?(?:\{[^}]*\}[^>]*?)*)\/?>/gs)) {
    const attrs = m[1];
    const path = attrs.match(/\bpath=["'{`]+([^"'`}]+)/)?.[1];
    if (!path) continue;
    const el = attrs.match(/element=\{\s*<\s*([A-Za-z0-9_.]+)/)?.[1] ?? null;
    const guardas = [...attrs.matchAll(/<\s*([A-Za-z0-9_]*(?:Route|Guard)[A-Za-z0-9_]*)\b/g)].map((g) => g[1]).filter((g) => g !== el);
    rotas.push({ path, componente: el, guardas: [...new Set(guardas)], arquivo: `src/routes/${arq}`, linha: code.slice(0, m.index).split('\n').length });
  }
}
writeFileSync(join(OUT, 'rotas.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: rotas.length, rotas }, null, 1) + '\n');
console.log(`rotas: ${rotas.length}`);

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
