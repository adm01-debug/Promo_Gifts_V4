# Roles

> ⚠️ Seção `roles` não pôde ser atualizada nesta coleta (ver errors.md); mostrando a versão anterior.

`config` traz limites por role (ex.: `statement_timeout` de anon/authenticated).

| role | superuser | login | bypass RLS | create role | create db | conn limit | config | membro de |
|---|---|---|---|---|---|---|---|---|
| anon | não | não | não | não | não | -1 | statement_timeout=3s, idle_in_transaction_session_timeout=30000 |  |
| authenticated | não | não | não | não | não | -1 | statement_timeout=30s, idle_in_transaction_session_timeout=60000 |  |
| authenticator | não | sim | não | não | não | -1 | session_preload_libraries=safeupdate, statement_timeout=30s, lock_timeout=8s, idle_in_transaction_session_timeout=60000, idle_session_timeout=0 | anon, authenticated, service_role |
| cli_login_postgres | não | sim | não | não | não | -1 |  | postgres |
| dashboard_user | não | não | não | sim | sim | -1 |  |  |
| pgbouncer | não | sim | não | não | não | -1 |  |  |
| postgres | não | sim | sim | sim | sim | -1 | search_path="\$user", public, extensions, log_min_duration_statement=2000 | anon, authenticated, authenticator, pg_create_subscription, pg_monitor, pg_read_all_data, pg_signal_backend, service_role, supabase_functions_admin, supabase_privileged_role |
| service_role | não | não | sim | não | não | -1 | idle_in_transaction_session_timeout=60000, idle_session_timeout=300000 |  |
| supabase_admin | sim | sim | sim | sim | sim | -1 | search_path="$user", public, auth, extensions, log_statement=none, statement_timeout=0 |  |
| supabase_auth_admin | não | sim | não | sim | não | -1 | search_path=auth, idle_in_transaction_session_timeout=60000, log_statement=none |  |
| supabase_etl_admin | não | sim | sim | não | não | -1 |  | pg_monitor, pg_read_all_data, supabase_privileged_role |
| supabase_functions_admin | não | sim | não | sim | não | -1 | search_path=supabase_functions |  |
| supabase_privileged_role | não | não | não | não | não | -1 |  |  |
| supabase_read_only_user | não | sim | sim | não | não | -1 | default_transaction_read_only=on | pg_monitor, pg_read_all_data |
| supabase_realtime_admin | não | não | não | não | não | -1 |  |  |
| supabase_replication_admin | não | sim | não | não | não | -1 |  |  |
| supabase_storage_admin | não | sim | não | sim | não | -1 | search_path=storage, log_statement=none | authenticator |
