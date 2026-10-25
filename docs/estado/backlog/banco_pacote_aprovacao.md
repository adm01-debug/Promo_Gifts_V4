# Banco — pacote de aprovação (2026-10-25)

Nada aqui foi aplicado em produção (`doufsxqlfjyuvxuezpln`). Caminho único de aplicação: `.github/workflows/db-apply-migration.yml` (workflow_dispatch por versão, aprovação do PO). Evidência: leitura em produção (`cron.job`, `pg_class`, grants) e prova em Postgres temporário (ver `banco.md`).

## A. Aplicáveis (7 migrations já no repo) — recomendação: aprovar

| Migration | Efeito em produção | Estado lido hoje | Risco |
|---|---|---|---|
| `20260916202000_e23_force_rls_secret_tables` | `FORCE ROW LEVEL SECURITY` em 5 tabelas de segredo + `REVOKE ALL FROM anon` | as 5 existem, dono `postgres`, sem FORCE, `anon` sem nenhum grant (REVOKE vira no-op). Precondição passa. | Baixo: `postgres` e `service_role` têm `bypassrls`, então o FORCE não muda o acesso deles |
| `20260917070000_e38_unschedule_dead_cron_jobs` | `cron.unschedule` dos jobs 274 e 202 | ambos `active=false`; função alvo inexistente; `webhook_outbox` vazia | Baixo |
| `20260917090000_e47_fix_schema_drift_cron_split` | job 245 passa a 2 chamadas de `fn_cron_safe_run` | job 245 ativo, agenda e comando no padrão esperado | Baixo |
| `20260917100000_e37_split_genuine_multistatement_cron` | divide os jobs 233, 208 (e 195, 53, 244) | 233/208/195/53 no padrão esperado (4/3/10/22 statements) | Médio: muda o texto de 5 jobs de manutenção |
| `20261022100020_fix_cron_dispatcher_failure_alert` | job 296: de 4 para 6 execuções/hora | ativo, agenda antiga | Baixo |
| `20261022100021_fix_cron_hash_product_images` | job 243: de 4 para 6 execuções/hora | ativo, agenda antiga | Baixo (mais chamadas à edge function, timeout 55 s) |
| `20261022100022_fix_cron_sync_is_stockout_universal` | job 204: de 4 para 6 execuções/hora | ativo, agenda antiga | Baixo |

Ressalva: `cron.unschedule` + `cron.schedule` (as 3 agendas) recria o job com **novo jobid**. O rollback abaixo recria com outro jobid também.

### Rollback (SQL)

```sql
-- e23
ALTER TABLE public.integration_credentials NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.external_connections    NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.secret_rotation_log     NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.step_up_tokens          NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_token_revocations  NO FORCE ROW LEVEL SECURITY;
-- (o REVOKE não precisa de rollback: anon não tinha grant)

-- e38 (recria os 2 jobs como estavam: inativos)
SELECT cron.schedule('pipeline-classify-categories','2,12,22,32,42,52 * * * *',
  'SELECT public.fn_cron_safe_run(55::bigint, ''SELECT public.fn_pipeline_classify_pending_products(50);'', 580000, ''pipeline-classify'');');
SELECT cron.schedule('process-webhook-outbox','* * * * *',' SELECT public.fn_process_webhook_outbox_batch(10); ');
UPDATE cron.job SET active=false WHERE jobname IN ('pipeline-classify-categories','process-webhook-outbox');

-- e47
SELECT cron.alter_job(245, command := $cmd$
    SELECT public.fn_cron_safe_run(
      25::bigint,
      $$
        SELECT public.fn_check_schema_signature_drift();
        SELECT public.fn_sync_local_drift_to_schema_drift_log();
      $$,
      30000,
      'schema-drift-local-4x'
    );
$cmd$);

-- agendas (jobs 296, 243, 204 → agenda antiga)
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='dispatcher-failure-alert'), schedule := '5,20,35,50 * * * *');
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='hash-product-images'), schedule := '10,25,40,55 * * * *');
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='sync-is-stockout-universal'), schedule := '0,15,30,45 * * * *');
```

Rollback do e37 (comandos originais lidos hoje; `ANALYZE` listados na íntegra em `cron.job` jobid 53 e 195): restaurar o `command` de **233, 208, 195, 53 e 244** com `cron.alter_job(<id>, command := $cmd$...$cmd$)` usando o texto original — guardar o `SELECT jobid, command FROM cron.job WHERE jobid IN (53,195,208,233,244)` **antes** de aplicar. Original de 233: `fn_cron_safe_run(154, <4 UPDATEs em ai_enrichment_queue>, 30000, 'ai-queue-stuck')`; de 208: `fn_cron_safe_run(166, <3 UPDATEs em products>, 44000, 'fantasmas-guard')`; 195 e 53: lista de `ANALYZE public.<tabela>;` sem wrapper; 244: wrapper `fn_cron_safe_run(302, ..., 120000, ...)` → texto original salvo antes da aplicação.

## B. Endurecimentos (13) — recomendação: NÃO aplicar como estão

Revogam EXECUTE de `anon`/`authenticated` e **ainda não estão aplicadas** (conferido ao vivo: `anon` mantém EXECUTE em 18 funções, `authenticated` em 105). Uso real cruzado com `src/` e `supabase/functions/` (`/tmp/pgwork/end_used.json`, reproduzível por grep dos nomes):

- `20260619155129` (92 authenticated + 10 anon): 46 de 102 funções são chamadas pelo front ou por edge function (ex.: `fn_get_customization_price` 11 usos, `fn_get_product_customization_options` 8, `magazine_remove_items_v2` 2). Aplicar quebra essas telas.
- `20260716000063` e `20260716000067`: revogam `anon` em funções do catálogo público (`fn_global_search`, `get_catalog_bestseller_page`, `fn_super_filtro*`). Quebra o catálogo para visitante.
- Demais (`20260527200532`, `20260527214425`, `20260528102502`, `20260531135255`, `20260619154747`, `20260623172606`, `20260915113458`, `e18_*` ×2, `20261013180500`): revogações pequenas; `mcp_kv_get` (e18) já está revogada. Precisam de decisão por função.

Caminho seguro: migration nova que revoga **só** as funções com uso zero no front/edge (lista derivada de `end_used.json`), `anon` primeiro, uma função por vez em teste. Rollback por função: restaurar **apenas os roles efetivamente revogados** — ex. se a migration revogar só `anon`, o rollback é `GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO anon;`; não adicionar `authenticated` onde não existia antes (verificar o grant original em `pg_proc`/`information_schema.role_routine_grants` antes de aplicar).

## C. Não aplicar (descartar com motivo)
- 10 que regridem segurança (concedem `anon` o que o baseline não tem) e 34 que ampliam `authenticated` (ex.: `20260528102501_restore_authenticated_rpc_grants`, 587 grants): reverteriam hardening já feito.

## Decisões pedidas ao PO
1. Aprovar A (7 migrations) para aplicação via `db-apply-migration.yml`, na ordem e23 → e38 → e47 → e37 → 3 agendas.
2. Autorizar a migration nova de revogação seletiva (B) — escopo = funções sem uso no código.
