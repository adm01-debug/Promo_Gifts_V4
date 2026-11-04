# Schemas

Schemas internos do Supabase ficam fora da introspecção geral (`_analytics, _realtime, _supavisor, auth, cron, extensions, graphql, graphql_public, net, pg_stat_statements, pgbouncer, pgmq, pgsodium, pgsodium_masks, pgtle, realtime, repack, storage, supabase_functions, supabase_migrations, vault`).

| schema | owner | USAGE para roles da API | comentário |
|---|---|---|---|
| analytics | postgres | anon, authenticated, service_role | Materialized views internas/analíticas. Não exposto via PostgREST. Acesso via views wrapper em public ou via service_role. Criado em T20 do redeploy 2026-05. |
| api | postgres | anon, authenticated |  |
| cf_recon | postgres |  | Schema de reconciliação Cloudflare Images × DB. Criado 2026-06-16 durante auditoria forense. Contém: cf_image (mirror CF), crawl_run (histórico de crawls), cf_ghost_check_queue (IDs suspeitos), action_log (log imutável de decisões), remediation (plano de remediações), metric_snapshot (KPIs). |
| classification_audit | postgres |  |  |
| internal | postgres | anon, authenticated |  |
| prod_audit | postgres |  |  |
| public | pg_database_owner | anon, authenticated, service_role | @graphql({"max_rows": 30, "inflect_names": false}) |
| supplier_stricker | postgres | service_role | Dados brutos sincronizados da API Stricker (SPOT Gifts Brasil) |
