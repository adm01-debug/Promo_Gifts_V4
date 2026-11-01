# Cruzamento branch × migration × produção × auditoria (2026-11-01)

Produção: doufsxqlfjyuvxuezpln, SOMENTE LEITURA (SELECT em schema_migrations, pg_proc, pg_class, cron.job; list_migrations; list_edge_functions).

| Branch | Migration / objeto | No ledger de produção? | Estado real (catálogo) | Auditoria | Resultado |
|---|---|---|---|---|---|
| security-brechas-e30-e40-e18 (PR #2416 mergeada) | 20261022194000 revoke external_connections anon | SIM | anon INSERT/UPDATE/DELETE = false | E30 | DRIFT: nenhum |
| idem | 20261022194100 revoke mockup_approval_links anon | SIM | anon INSERT/UPDATE/DELETE = false | E40 | idem |
| idem | 20261022194200 revoke mcp_kv_get authenticated | SIM | mcp_kv_get(text,text): authenticated=false, anon=false, service_role=true | E18 | idem |
| fix-audit-acl-regrole-261024-1635 | 20261024163500 cast regrole | SIM | prosrc de audit_security_definer_acl sem `regrole` | correção de audit_acl | arquivo já em main |
| fix-rollback / gifted-dijkstra | 20261019000000 mirror OOB | SIM | constraint frontend_telemetry_size_caps_check e view v_system_health_dashboard existem | E99 | já em main |
| devin/probe-e184 | (probe) refs `pqpdolkae` | n/a | 0 cron.job e 0 funções public com a string | E184 | probe respondido |
| fix-contract-mag-reader, fix-sync-log-ci, fix-gitleaks-gate, chore-migrations-sync-log | sem migration | n/a | n/a | — | sem efeito em banco |
| 10 branches e15-receipt-* | 20261015150000, 20261018000041/42/43/47/48, 20261018160000/160100/170000/170100 | TODAS SIM | — | ledger | main diz "pendente"; só documentação diverge |

Propostas P01..P19: nenhuma das 9 branches resolve achado P-xx que ainda esteja aberto; as brechas E30/E40/E18 e o cast de audit_acl já estão aplicados, então não há risco de aplicar duas vezes. Nenhuma DDL foi executada por esta sessão.
