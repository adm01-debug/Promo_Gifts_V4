# Baseline de Imutabilidade da Produção

**Data de coleta:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln

## Medições no INÍCIO da Auditoria

| Métrica | Valor | Query |
|---------|-------|-------|
| Migrations aplicadas | **2.538** | `SELECT COUNT(*) FROM supabase_migrations.schema_migrations` |
| Cron jobs | **142** | `SELECT COUNT(*) FROM cron.job` |
| RLS Policies (public) | **960** | `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'` |
| Edge functions publicadas | **82** | `list_edge_functions` |

## Medições ao FINAL da Auditoria

**Data de coleta:** 2026-10-22 (mesma sessão, ao final da auditoria)

| Métrica | Valor | Diferença |
|---------|-------|-----------|
| Migrations aplicadas | **2.538** | **0** ✅ |
| Cron jobs | **142** | **0** ✅ |
| RLS Policies (public) | **960** | **0** ✅ |
| Edge functions publicadas | **82** | **0** ✅ |

**Query usada para verificação final:**
```sql
SELECT 
  (SELECT COUNT(*) FROM supabase_migrations.schema_migrations) AS migrations,
  (SELECT COUNT(*) FROM cron.job) AS crons,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS rls_policies
-- Resultado: {"migrations":2538,"crons":142,"rls_policies":960}
```

## Verificação

Nenhuma das ferramentas usadas nesta auditoria foi: apply_migration, db_insert, db_update, 
db_delete, db_upsert, db_alter_table, db_grant, rls_manage, auth_create/update/delete,
storage_upload, storage_delete, deploy_edge_function, functions_invoke (exceto leitura).

**Conclusão preliminar:** Somente SELECT, EXPLAIN, list_*, get_* e query_logs foram utilizados.
