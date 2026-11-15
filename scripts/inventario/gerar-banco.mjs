#!/usr/bin/env node
/**
 * Inventario do banco oficial -> inventario/estado/banco.json (fonte de consulta dos agentes).
 * Mesmo padrao do scripts/inventario/gerar-banco.mjs do Zapp_Web_V2 (format_version 1).
 *
 * Tudo sai de comando: o SQL de leitura `scripts/inventario/banco.sql` + o uso de cada tabela no
 * codigo (src/ e supabase/functions/) + as edge functions publicadas. Nada escrito a mao.
 *
 * Dois jeitos de rodar:
 *   1) Com credencial viva (CI / maquina com acesso), somente leitura pela Management API:
 *        SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
 *      (endpoint /database/query/read-only + /functions do projeto doufsxqlfjyuvxuezpln)
 *   2) Sessao de agente sem token: rodar banco.sql no MCP oficial (SUPABASE - GESTAO DE PRODUTOS,
 *      execute_sql) e list_edge_functions, salvar as respostas e
 *        node scripts/inventario/gerar-banco.mjs --entrada <resposta-sql> [--functions <resposta-functions>]
 *      Aceita a resposta crua do MCP, {"rows":[{"inventario":{...}}]}, a linha do psql ou o objeto direto.
 *
 * Exit: 0 = gravado; 2 = entrada invalida, credencial ausente ou consulta falhou (nada gravado).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { missingPrerequisite } from '../lib/missing-prerequisite.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SQL_PATH = path.join(RAIZ, 'scripts/inventario/banco.sql');
const SAIDA = path.join(RAIZ, 'inventario/estado/banco.json');
const PROJETO = 'doufsxqlfjyuvxuezpln';
const PASTAS_CODIGO = ['src', 'supabase/functions'];
const EXTENSOES = /\.(ts|tsx|js|jsx|mjs)$/;

// Limiares dos alertas: o que um agente precisa saber antes de mexer no sistema.
export const LIMIARES = {
  taxaFalhaCronPct: 5,
  historicoCronMaisDe7Dias: 50000,
};

// Acesso a tabela no codigo do Promo: .from('t') (fora storage), untypedFrom/goldFrom('t') e { table: 't' } (dbInvoke).
const ACESSO_TABELA = /(?<!storage\s*)(?:\.from|\buntypedFrom|\bgoldFrom)(?:<[^>(]*>)?\(\s*['"`]([A-Za-z0-9_]+)['"`]|\btable:\s*['"`]([A-Za-z0-9_]+)['"`]/g;

/** Tira o JSON de dentro da resposta crua do MCP (texto com o array de linhas embrulhado). */
function desembrulhar(texto) {
  const t = texto.trim();
  try {
    const obj = JSON.parse(t);
    if (obj && typeof obj.result === 'string') return desembrulhar(obj.result);
    return obj;
  } catch {
    const ini = t.indexOf('[{');
    const fim = t.lastIndexOf('}]');
    if (ini === -1 || fim === -1) throw new Error('resposta sem JSON reconhecivel');
    return JSON.parse(t.slice(ini, fim + 2));
  }
}

/** Extrai o objeto do inventario da resposta da Management API, do psql ou do MCP. */
export function extrairInventario(bruto) {
  let dado = typeof bruto === 'string' ? desembrulhar(bruto) : bruto;
  if (Array.isArray(dado)) dado = dado[0];
  if (dado && Array.isArray(dado.rows)) dado = dado.rows[0];
  if (dado && dado.inventario) dado = dado.inventario;
  if (typeof dado === 'string') dado = JSON.parse(dado);
  const faltando = ['format_version', 'medido_em', 'resumo', 'tabelas', 'cron']
    .filter((chave) => !(dado && chave in dado));
  if (faltando.length) throw new Error(`entrada sem as chaves: ${faltando.join(', ')}`);
  if (dado.format_version !== 1) throw new Error(`format_version ${dado.format_version} desconhecido (esperado 1)`);
  if (!Array.isArray(dado.tabelas) || dado.tabelas.length === 0) throw new Error('entrada sem tabelas');
  return dado;
}

/** Normaliza a lista de edge functions publicadas (Management API, MCP ou array direto). */
export function extrairFunctions(bruto) {
  let dado = typeof bruto === 'string' ? desembrulhar(bruto) : bruto;
  if (dado && Array.isArray(dado.functions)) dado = dado.functions;
  if (!Array.isArray(dado)) throw new Error('lista de edge functions invalida');
  return dado
    .map((f) => ({ slug: f.slug, status: f.status, verify_jwt: f.verify_jwt, versao: f.version }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function listarArquivos(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) listarArquivos(p, acc);
    else if (EXTENSOES.test(entrada.name)) acc.push(p);
  }
  return acc;
}

/** Quantos acessos a cada tabela existem em src/ e em supabase/functions/ (testes excluidos). */
export function contarUsoNoCodigo(raiz, nomes) {
  const uso = Object.fromEntries(nomes.map((n) => [n, { src: 0, edges: 0 }]));
  for (const pasta of PASTAS_CODIGO) {
    const chave = pasta === 'src' ? 'src' : 'edges';
    for (const arquivo of listarArquivos(path.join(raiz, pasta))) {
      // testes nao contam como uso: .test./.spec./__tests__ (vitest) e *_test.ts / tests/ (Deno)
      if (/(\.test\.|\.spec\.|__tests__|_test\.[jt]sx?$|\/tests\/)/.test(arquivo)) continue;
      // comentario com .from('x') antigo nao e uso
      const texto = fs.readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of texto.matchAll(ACESSO_TABELA)) {
        const nome = m[1] ?? m[2];
        if (uso[nome]) uso[nome][chave] += 1;
      }
    }
  }
  return uso;
}

/** Edge functions com index.ts no repositorio. */
export function edgesNoRepo(raiz) {
  const dir = path.join(raiz, 'supabase/functions');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(dir, d.name, 'index.ts')))
    .map((d) => d.name).sort();
}

/** Ordena chaves recursivamente: o diff entre execucoes fica so no que mudou. */
function ordenar(valor) {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((k) => [k, ordenar(valor[k])]));
  }
  return valor;
}

/** Junta banco + codigo (+ edges publicadas) e calcula orfas e alertas. Funcao pura (testada em tests/scripts/). */
export function montarInventario(dado, uso, publicadas = null, noRepo = []) {
  const tabelas = dado.tabelas.map((t) => ({ ...t, uso_no_codigo: uso[t.nome] ?? { src: 0, edges: 0 } }));
  const orfas = tabelas
    .filter((t) => !t.particao && t.linhas === 0 && !t.citada_no_banco && t.uso_no_codigo.src + t.uso_no_codigo.edges === 0)
    .map((t) => t.nome);

  const alertas = [];
  const semRls = tabelas.filter((t) => !t.rls).map((t) => t.nome);
  if (semRls.length) alertas.push({ tipo: 'tabela_sem_rls', detalhe: semRls });
  const semRlsFora = (dado.outros_schemas ?? []).filter((t) => !t.rls).map((t) => t.nome);
  if (semRlsFora.length) alertas.push({ tipo: 'tabela_sem_rls_fora_de_public', detalhe: semRlsFora });
  const cronRuim = dado.cron.jobs
    .filter((j) => j.ativo && j.taxa_falha_7d_pct >= LIMIARES.taxaFalhaCronPct)
    .map((j) => `${j.nome} (${j.taxa_falha_7d_pct}% em 7d)`);
  if (cronRuim.length) alertas.push({ tipo: 'cron_falhando', detalhe: cronRuim });
  if (dado.cron.horas_paradas_7d.length) {
    alertas.push({ tipo: 'cron_parado', detalhe: dado.cron.horas_paradas_7d.map((h) => h.hora) });
  }
  if (dado.cron.historico.mais_de_7_dias > LIMIARES.historicoCronMaisDe7Dias) {
    alertas.push({ tipo: 'historico_cron_sem_limpeza', detalhe: [`${dado.cron.historico.mais_de_7_dias} linhas com mais de 7 dias`] });
  }

  let edgeFunctions = null;
  if (publicadas) {
    const slugs = new Set(publicadas.map((f) => f.slug));
    const semCodigo = [...slugs].filter((s) => !noRepo.includes(s)).sort();
    const semDeploy = noRepo.filter((s) => !slugs.has(s));
    edgeFunctions = {
      publicadas,
      publicadas_sem_codigo_no_repo: semCodigo,
      no_repo_sem_deploy: semDeploy,
    };
    if (semCodigo.length) alertas.push({ tipo: 'edge_publicada_sem_codigo_no_repo', detalhe: semCodigo });
    if (semDeploy.length) alertas.push({ tipo: 'edge_no_repo_sem_deploy', detalhe: semDeploy });
  }

  return ordenar({
    ...dado,
    fonte: 'scripts/inventario/banco.sql + acesso a tabelas em src/ e supabase/functions/ + edge functions publicadas (scripts/inventario/gerar-banco.mjs)',
    tabelas,
    tabelas_orfas: {
      criterio: '0 linhas (count exato) + nao citada em funcao/view do banco + nenhum acesso (.from/untypedFrom/goldFrom/table:) em src/ ou supabase/functions/',
      lista: orfas,
    },
    edge_functions: edgeFunctions,
    alertas,
  });
}

async function lerDaApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('sem --entrada e sem SUPABASE_ACCESS_TOKEN: nada para ler (veja o cabecalho do script).');
  const ref = encodeURIComponent(process.env.SUPABASE_PROJECT_REF || PROJETO);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const sql = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query/read-only`, {
    method: 'POST', headers, body: JSON.stringify({ query: fs.readFileSync(SQL_PATH, 'utf8') }),
  });
  // Corpo de erro pode ecoar o SQL ou detalhes de conexao: so o status sai no log.
  if (!sql.ok) throw new Error(`consulta read-only falhou (HTTP ${sql.status}).`);
  const fns = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, { headers });
  if (!fns.ok) throw new Error(`lista de edge functions falhou (HTTP ${fns.status}).`);
  return { bruto: await sql.json(), functions: await fns.json() };
}

async function main(argv) {
  const arg = (nome) => { const i = argv.indexOf(nome); return i === -1 ? null : (argv[i + 1] ?? ''); };
  const entrada = arg('--entrada');
  let bruto;
  let functions = null;
  if (entrada !== null) {
    if (!entrada) throw new Error('--entrada exige o caminho do arquivo com a resposta do banco.sql');
    bruto = fs.readFileSync(entrada, 'utf8');
    const fArq = arg('--functions');
    if (fArq) functions = fs.readFileSync(fArq, 'utf8');
  } else {
    ({ bruto, functions } = await lerDaApi());
  }
  const dado = extrairInventario(bruto);
  const uso = contarUsoNoCodigo(RAIZ, dado.tabelas.map((t) => t.nome));
  const publicadas = functions ? extrairFunctions(functions) : null;
  const inventario = montarInventario(dado, uso, publicadas, edgesNoRepo(RAIZ));
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify(inventario, null, 2) + '\n');
  console.log(`banco.json: ${inventario.tabelas.length} tabelas, ${inventario.cron.jobs.length} cron jobs, `
    + `${inventario.tabelas_orfas.lista.length} orfas, ${inventario.alertas.length} alertas`
    + `${publicadas ? `, ${publicadas.length} edges publicadas` : ''} (medido_em ${inventario.medido_em}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    // Ausência de credenciais/entrada: static-pass só fora do CI; no CI falha fechado.
    const credMissing = error.message.includes('SUPABASE_ACCESS_TOKEN') || error.message.includes('sem --entrada');
    if (credMissing) missingPrerequisite('gerar-banco', error.message, { exitCode: 2 });
    console.error(`ERRO: ${error.message}`);
    process.exit(2);
  });
}
