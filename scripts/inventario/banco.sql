-- Inventario do banco oficial (so leitura) para inventario/estado/banco.json.
-- Mesmo formato (format_version 1) do scripts/inventario/banco.sql do Zapp_Web_V2, sem a parte de
-- WhatsApp e com o que e proprio do Promo (schemas fora de public, objetos SQL, chamadas de edge no cron).
--
-- Uso (credencial viva):   SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
-- Uso (agente com MCP):     rodar este arquivo no MCP oficial (SUPABASE - GESTAO DE PRODUTOS, execute_sql),
--                           salvar a resposta e node scripts/inventario/gerar-banco.mjs --entrada <arquivo>
--
-- Imprime UMA linha com UM JSON. So SELECT em catalogo e em tabelas de estado; nada de texto livre
-- que possa carregar segredo: de cron.job sai so o nome das funcoes e das edge functions chamadas
-- (nunca o command inteiro, que pode ter URL/cabecalho) e de cron.job_run_details so contagens.
-- Ordem de toda lista e explicita para o diff ser estavel.

WITH
proprios AS (  -- schemas do projeto fora de public: todos, menos os de sistema/Supabase/extensao (inclui
               -- archive, cf_recon, supplier_stricker, ... automaticamente, sem lista fixa para esquecer)
  SELECT n.oid, n.nspname FROM pg_namespace n
   WHERE n.nspname NOT LIKE 'pg\_%'
     AND n.nspname NOT IN ('public', 'information_schema', 'auth', 'storage', 'realtime', '_realtime',
                           'supabase_functions', 'supabase_migrations', 'extensions', 'graphql',
                           'graphql_public', 'vault', 'net', 'cron', 'pgsodium', 'pgsodium_masks',
                           'pgbouncer', 'repack', 'pgmq')
),
-- Linhas: count(*) exato quando a estimativa do planner fica abaixo de 200 mil; acima disso, a
-- estimativa. reltuples = -1 (nunca analisada) tambem conta exato.
base AS (
  SELECT c.oid, c.relname AS nome, c.relrowsecurity AS rls, c.relforcerowsecurity AS rls_forcado,
         c.reltuples, c.relispartition AS particao, c.relkind = 'p' AS particionada,
         pg_total_relation_size(c.oid)::bigint AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
tabelas AS (
  SELECT b.oid, b.nome, b.rls, b.rls_forcado, b.bytes, b.particao, b.particionada,
         b.reltuples < 200000 AS linhas_exatas,
         CASE WHEN b.reltuples < 200000
              THEN (xpath('/row/n/text()',
                          query_to_xml(format('SELECT count(*) AS n FROM public.%I', b.nome), false, true, '')))[1]::text::bigint
              ELSE b.reltuples::bigint END AS linhas
    FROM base b
),
corpos AS (  -- tudo no banco que pode citar uma tabela: funcoes e views/mviews de public e dos schemas proprios
  SELECT p.prosrc AS txt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE (n.nspname = 'public' OR n.nspname IN (SELECT nspname FROM proprios)) AND p.prokind IN ('f', 'p')
  UNION ALL
  SELECT pg_get_viewdef(c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE (n.nspname = 'public' OR n.nspname IN (SELECT nspname FROM proprios)) AND c.relkind IN ('v', 'm')
),
policies AS (
  SELECT tablename AS nome, count(*)::int AS n FROM pg_policies WHERE schemaname = 'public' GROUP BY 1
),
gatilhos AS (
  SELECT t.tgrelid AS oid, count(*)::int AS n FROM pg_trigger t WHERE NOT t.tgisinternal GROUP BY 1
),
execucoes AS (
  SELECT d.jobid, d.status, d.return_message, d.start_time, d.end_time
    FROM cron.job_run_details d
   WHERE d.start_time > now() - interval '7 days'
),
por_job AS (
  SELECT e.jobid,
         count(*) FILTER (WHERE e.start_time > now() - interval '24 hours')::int AS exec_24h,
         count(*) FILTER (WHERE e.start_time > now() - interval '24 hours' AND e.status = 'failed')::int AS falhas_24h,
         count(*)::int AS exec_7d,
         count(*) FILTER (WHERE e.status = 'failed')::int AS falhas_7d,
         count(*) FILTER (WHERE e.status = 'failed' AND e.return_message LIKE 'job startup timeout%')::int AS startup_timeout_7d,
         count(*) FILTER (WHERE e.status = 'failed' AND e.return_message LIKE '%statement timeout%')::int AS statement_timeout_7d,
         max(e.start_time) FILTER (WHERE e.status = 'failed') AS ultima_falha,
         round(max(extract(epoch FROM e.end_time - e.start_time)) FILTER (WHERE e.status = 'succeeded'))::int AS duracao_max_s_7d
    FROM execucoes e GROUP BY e.jobid
),
por_hora AS (  -- falha por falta de worker do pg_cron (job startup timeout) = o agendador nao conseguiu rodar
  SELECT date_trunc('hour', e.start_time) AS hora, count(*)::int AS execucoes,
         count(*) FILTER (WHERE e.status = 'failed' AND e.return_message LIKE 'job startup timeout%')::int AS falhas
    FROM execucoes e GROUP BY 1
),
outros AS (  -- schemas proprios do projeto fora de public (ingestao, auditoria, filas)
  SELECT n.nspname || '.' || c.relname AS nome, c.relrowsecurity AS rls,
         (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS policies,
         greatest(c.reltuples, 0)::bigint AS linhas_estimadas
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relkind IN ('r', 'p')
     AND n.nspname IN (SELECT nspname FROM proprios)
)
SELECT jsonb_build_object(
  'format_version', 1,
  'medido_em', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),

  'resumo', jsonb_build_object(
    'postgres', current_setting('server_version'),
    'tabelas_public', (SELECT count(*) FROM tabelas),
    'tabelas_sem_rls', (SELECT count(*) FROM tabelas WHERE NOT rls),
    'policies', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
    'funcoes_public', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')),
    'funcoes_security_definer', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname = 'public' AND p.prosecdef),
    'views_public', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                      WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')),
    'triggers_public', (SELECT coalesce(sum(g.n), 0) FROM gatilhos g JOIN tabelas t ON t.oid = g.oid),
    'cron_jobs', (SELECT count(*) FROM cron.job),
    'cron_ativos', (SELECT count(*) FROM cron.job WHERE active),
    'ledger_registros', (SELECT count(*) FROM supabase_migrations.schema_migrations),
    'ledger_versao_max', (SELECT max(version) FROM supabase_migrations.schema_migrations),
    'extensoes', (SELECT jsonb_agg(extname ORDER BY extname) FROM pg_extension),
    'max_connections', current_setting('max_connections')::int,
    'tamanho_bytes', pg_database_size(current_database())
  ),

  'tabelas', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'nome', t.nome,
             'rls', t.rls,
             'rls_forcado', t.rls_forcado,
             'policies', coalesce(p.n, 0),
             'triggers', coalesce(g.n, 0),
             'linhas', t.linhas,
             'linhas_exatas', t.linhas_exatas,
             'bytes', t.bytes,
             'particao', t.particao,
             'particionada', t.particionada,
             'citada_no_banco', EXISTS (SELECT 1 FROM corpos c WHERE c.txt ~ ('\m' || t.nome || '\M'))
           ) ORDER BY t.nome), '[]'::jsonb)
      FROM tabelas t
      LEFT JOIN policies p ON p.nome = t.nome
      LEFT JOIN gatilhos g ON g.oid = t.oid
  ),

  'outros_schemas', (SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.nome), '[]'::jsonb) FROM outros o),

  'objetos', jsonb_build_object(
    'views', (SELECT coalesce(jsonb_agg(n.nspname || '.' || c.relname ORDER BY 1), '[]'::jsonb)
                FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE c.relkind = 'v' AND (n.nspname = 'public' OR n.nspname IN (SELECT nspname FROM proprios))),
    'mviews', (SELECT coalesce(jsonb_agg(n.nspname || '.' || c.relname ORDER BY 1), '[]'::jsonb)
                 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind = 'm' AND (n.nspname = 'public' OR n.nspname IN (SELECT nspname FROM proprios))),
    'funcoes_security_definer', (SELECT coalesce(jsonb_agg(DISTINCT p.proname ORDER BY p.proname), '[]'::jsonb)
                FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'public' AND p.prosecdef)
  ),

  'cron', jsonb_build_object(
    'config', (SELECT jsonb_object_agg(name, setting ORDER BY name) FROM pg_settings
                WHERE name IN ('cron.use_background_workers', 'cron.max_running_jobs', 'max_worker_processes')),
    'jobs', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'nome', j.jobname,
               'agenda', j.schedule,
               'ativo', j.active,
               'chama', (SELECT coalesce(jsonb_agg(DISTINCT m[1] ORDER BY m[1]), '[]'::jsonb)
                           FROM regexp_matches(j.command, '((?:public|net|cron|internal)\.[a-z_0-9]+)', 'g') AS m),
               'edges', (SELECT coalesce(jsonb_agg(DISTINCT m[1] ORDER BY m[1]), '[]'::jsonb)
                           FROM regexp_matches(j.command, 'functions/v1/([a-z0-9-]+)', 'g') AS m),
               'execucoes_24h', coalesce(pj.exec_24h, 0),
               'falhas_24h', coalesce(pj.falhas_24h, 0),
               'execucoes_7d', coalesce(pj.exec_7d, 0),
               'falhas_7d', coalesce(pj.falhas_7d, 0),
               'startup_timeout_7d', coalesce(pj.startup_timeout_7d, 0),
               'statement_timeout_7d', coalesce(pj.statement_timeout_7d, 0),
               'taxa_falha_7d_pct', CASE WHEN coalesce(pj.exec_7d, 0) = 0 THEN 0
                                         ELSE round(100.0 * pj.falhas_7d / pj.exec_7d, 1) END,
               'ultima_falha', to_char(pj.ultima_falha AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
               'duracao_max_s_7d', pj.duracao_max_s_7d
             ) ORDER BY j.jobname), '[]'::jsonb)
        FROM cron.job j LEFT JOIN por_job pj ON pj.jobid = j.jobid
    ),
    -- Hora com mais da metade das execucoes falhando por 'job startup timeout': o cron ficou parado naquela hora
    -- (erro da propria funcao nao conta: o agendador estava rodando).
    'horas_paradas_7d', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'hora', to_char(h.hora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24":00Z"'),
               'execucoes', h.execucoes, 'falhas', h.falhas) ORDER BY h.hora), '[]'::jsonb)
        FROM por_hora h WHERE h.falhas * 2 > h.execucoes
    ),
    'historico', jsonb_build_object(
      'linhas', (SELECT count(*) FROM cron.job_run_details),
      'mais_de_7_dias', (SELECT count(*) FROM cron.job_run_details WHERE start_time <= now() - interval '7 days'),
      'mais_antigo', (SELECT to_char(min(start_time) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') FROM cron.job_run_details),
      'bytes', pg_total_relation_size('cron.job_run_details')
    )
  )
) AS inventario;
