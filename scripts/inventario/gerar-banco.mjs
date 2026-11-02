#!/usr/bin/env node
// Inventario gerado do lado do banco (somente leitura) -> inventario/estado/banco.json
//  - tabelas (linhas estimadas, RLS, policies, triggers, tamanho), views, mviews, funcoes SQL
//  - cron jobs com execucoes e falhas das ultimas 48 h
//  - edge functions publicadas x pastas em supabase/functions
//  - candidatas a orfas: tabelas de public com 0 linhas que nenhuma funcao/view/mview cita
//    (gerar-repo.mjs cruza com os .from() do codigo e grava a lista final em tabelas-uso.json)
// Uso: SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
//      (SUPABASE_PROJECT_REF padrao: doufsxqlfjyuvxuezpln). Usa o endpoint read-only da Management API.
// Teste offline: INVENTARIO_OFFLINE_DIR=<pasta com sql.json e functions.json> node scripts/inventario/gerar-banco.mjs
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { querySupabaseReadOnly } from '../supabase-read-only-query.mjs';

const RAIZ = new URL('../../', import.meta.url).pathname;
const OUT = join(RAIZ, 'inventario/estado');
const REF = process.env.SUPABASE_PROJECT_REF || 'doufsxqlfjyuvxuezpln';
process.env.SUPABASE_PROJECT_REF = REF;
const OFFLINE = process.env.INVENTARIO_OFFLINE_DIR;
mkdirSync(OUT, { recursive: true });

const SCHEMAS = ['public', 'cf_recon', 'supplier_stricker', 'prod_audit', 'classification_audit', 'analytics', 'internal', 'pgmq', 'repack'];
const SQL = `with sch as (select unnest(array[${SCHEMAS.map((s) => `'${s}'`).join(',')}]) s)
select json_build_object(
 'versao_pg', current_setting('server_version'),
 'tamanho_mb', pg_database_size(current_database())/1024/1024,
 'extensoes', (select json_agg(extname order by extname) from pg_extension),
 'tabelas', (select json_agg(json_build_object('nome', n.nspname||'.'||c.relname, 'linhas_est', c.reltuples::bigint, 'rls', c.relrowsecurity,
     'policies', (select count(*) from pg_policy p where p.polrelid=c.oid),
     'triggers', (select count(*) from pg_trigger tg where tg.tgrelid=c.oid and not tg.tgisinternal),
     'kb', pg_total_relation_size(c.oid)/1024, 'particionada', c.relkind='p', 'particao', c.relispartition) order by n.nspname, c.relname)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in (select s from sch)),
 'views', (select json_agg(n.nspname||'.'||c.relname order by 1) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='v' and n.nspname in (select s from sch)),
 'mviews', (select json_agg(n.nspname||'.'||c.relname order by 1) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='m' and n.nspname in (select s from sch)),
 'funcoes', (select json_agg(json_build_object('nome', n.nspname||'.'||p.proname, 'args', pg_get_function_identity_arguments(p.oid), 'security_definer', p.prosecdef, 'tipo', p.prokind) order by n.nspname, p.proname)
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in (select s from sch) and n.nspname not in ('repack','pgmq')),
 'cron', (select json_agg(json_build_object('id', j.jobid, 'nome', j.jobname, 'agenda', j.schedule, 'ativo', j.active, 'comando', regexp_replace(j.command,'\\s+',' ','g'),
     'ok_48h', coalesce(r.ok,0), 'falhas_48h', coalesce(r.fail,0), 'ultimo_erro', r.err) order by j.jobname)
   from cron.job j left join (select jobid, count(*) filter (where status='succeeded') ok, count(*) filter (where status='failed') fail,
     (array_agg(left(return_message,160) order by start_time desc) filter (where status='failed'))[1] err
     from cron.job_run_details where start_time > now()-interval '48 hours' group by jobid) r on r.jobid=j.jobid),
 'candidatas_orfas', (select json_agg(c.relname order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition and c.reltuples <= 0
     and not exists (select 1 from pg_proc p join pg_namespace pn on pn.oid=p.pronamespace where pn.nspname='public' and p.prosrc ~ ('\\m'||c.relname||'\\M'))
     and not exists (select 1 from pg_views v where v.schemaname in ('public','analytics','internal') and v.definition ~ ('\\m'||c.relname||'\\M'))
     and not exists (select 1 from pg_matviews m where m.definition ~ ('\\m'||c.relname||'\\M')))
) as j`;

function falhar(msg) {
  console.error(`gerar-banco: ${msg}`);
  process.exit(1);
}

async function lerBanco() {
  if (OFFLINE) return JSON.parse(readFileSync(join(OFFLINE, 'sql.json'), 'utf8'));
  const r = await querySupabaseReadOnly(SQL);
  if (r.kind === 'missing-config') falhar('defina SUPABASE_ACCESS_TOKEN (token da Management API, uso somente leitura).');
  if (r.kind !== 'live') falhar(`consulta falhou: ${JSON.stringify(r)}`);
  return r.rows[0].j;
}

async function lerFunctions() {
  if (OFFLINE) return JSON.parse(readFileSync(join(OFFLINE, 'functions.json'), 'utf8'));
  const res = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(REF)}/functions`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
  });
  if (!res.ok) falhar(`lista de edge functions falhou: HTTP ${res.status}`);
  return res.json();
}

const banco = await lerBanco();
const publicadas = (await lerFunctions())
  .map((f) => ({
    slug: f.slug,
    versao: f.version,
    status: f.status,
    verify_jwt: f.verify_jwt,
    atualizada_em: new Date(f.updated_at).toISOString().slice(0, 16) + 'Z',
  }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

const FDIR = join(RAIZ, 'supabase/functions');
const noRepo = readdirSync(FDIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(FDIR, d.name, 'index.ts')))
  .map((d) => d.name);
const slugs = new Set(publicadas.map((f) => f.slug));

// Comandos de cron leem segredos via get_edge_function_secret(); se um dia vier valor literal, nao versionar.
const bruto = JSON.stringify(banco);
if (/Bearer\s+[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|sb_secret_/.test(bruto)) {
  falhar('a saida do banco contem algo com cara de credencial; nada foi gravado. Revise os comandos de cron.');
}

const saida = {
  fonte: `Management API /database/query/read-only + /functions do projeto ${REF} (scripts/inventario/gerar-banco.mjs)`,
  gerado_em: new Date().toISOString(),
  ...banco,
  edge_functions_publicadas: publicadas,
  edge_functions_diff: {
    publicadas_sem_codigo_no_repo: [...slugs].filter((s) => !noRepo.includes(s)).sort(),
    no_repo_sem_deploy: noRepo.filter((s) => !slugs.has(s)).sort(),
  },
};
writeFileSync(join(OUT, 'banco.json'), JSON.stringify(saida, null, 1) + '\n');
const falhas = (banco.cron ?? []).reduce((n, c) => n + c.falhas_48h, 0);
console.log(
  `banco: ${banco.tabelas?.length ?? 0} tabelas | ${banco.views?.length ?? 0} views | ${banco.funcoes?.length ?? 0} funcoes | ` +
    `${banco.cron?.length ?? 0} cron (${falhas} falhas/48h) | ${publicadas.length} edges publicadas`,
);
