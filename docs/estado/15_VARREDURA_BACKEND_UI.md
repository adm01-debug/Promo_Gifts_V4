# 15 — Varredura backend → UI (medição de 2026-11-26)

> Medição feita contra o banco canônico de produtos (`doufsxqlfjyuvxuezpln`) e contra `main`
> no commit `cbe7b2d8b` (release 1.24.0). Objetivo: responder "existe objeto de banco sem tela?"
> com número, não com impressão. Somente leitura — nenhuma DDL foi executada para produzir esta
> medição.

## Método

**1. Universo de funções** (6 schemas de negócio, exclui `_*` que são internas por convenção):

```sql
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','internal','ops','cf_recon','classification_audit','prod_audit')
  and p.prokind='f' and p.proname not like '\_%';
```

**2. Órfãs de banco** — nome não aparece em `pg_proc.prosrc`, `pg_views.definition`,
`pg_policies.qual/with_check`, `pg_attrdef` (defaults) nem em `pg_trigger`. Implementação:
concatenar esses textos em uma linha (`string_agg`) e testar `position(proname in txt) = 0`.
Tentar a mesma checagem com subconsultas correlacionadas por nome estoura o
`statement_timeout` (o regex `\m…\M` roda 1371² vezes) — usar o `position` sobre um único texto.

**3. Órfãs que o app usa** — `rg -o -f <nomes> src supabase/functions scripts` e comparar os
nomes encontrados com a lista de entrada.

## Resultado

| Métrica | Valor |
|---|---|
| Funções nos 6 schemas | **1371** |
| Sem nenhuma referência dentro do próprio banco | **927** |
| Dessas, com `EXECUTE` para `authenticated`/`anon` | **398** |
| Dessas 398, referenciadas em `src/`, `supabase/functions/` ou `scripts/` | **295** |
| Sem referência no app | **103** |
| Das 103: funções de trigger (`pg_trigger.tgfoid`) | **87** |
| Das 103: sem trigger e sem referência | **16** |

As 16 restantes são todas de convenção de trigger ou helper puro — nenhuma é capacidade de
negócio sem tela: `acquire_ai_quota`, `fn_audit_role_changes`, `fn_auto_classify_packing`,
`fn_cor_generate_slug`, `fn_cor_updated_at`, `fn_force_user_logout`, `fn_hex_to_rgb`,
`fn_inherit_techniques_from_material`, `fn_log_login_attempt`, `fn_log_step_up_event`,
`fn_silver_set_updated_at`, `fn_sync_vss_to_variant`, `fn_trigger_auto_sync_dimensions`,
`fn_trigger_variant_price`, `fn_update_product_search_vector`, `fn_validate_role_change`.

Conclusão medida: **0 RPC de negócio sem consumidor**. O que não tem tela é automação interna
(trigger/cron/helper), que por definição não deve ter tela.

## Objetos de banco que ganharam tela em 2026-11-26

| Objeto | Antes | Tela | PR |
|---|---|---|---|
| `public.crm_seller_identity_links` (deny-all) + 3 RPCs admin | só escrita pelo bridge `crm-db-bridge` | `/admin/vinculos-vendedor-crm` | #4165 + #4178 |
| `public.ramo_atividade` (22 linhas) e `public.ramo_atividade_filho` (108) | só por SQL | aba `ramos` de `/admin/cadastros` | #4180 |
| `public.anon_catalog_grant_audit_log` (523 snapshots) + `fn_anon_catalog_grant_audit_run()` | só por SQL | aba `Exposição anon` de `/admin/seguranca-e-acesso` | #4182 |

Verificação de produção das duas últimas (medida, não inferida):

- `ramo_atividade` e `ramo_atividade_filho`: `relrowsecurity = t`, 4 policies cada,
  `anon` com `SELECT`, `authenticated` com `SELECT/INSERT/UPDATE/DELETE`; 22 e 108 linhas.
- `anon_catalog_grant_audit_log`: colunas `id bigint`, `checked_at timestamptz`,
  `violation_count integer`, `violations jsonb`; policy
  `anon_catalog_grant_audit_log_admin_read` (`USING is_admin_or_above(auth.uid())`) e
  `anon_catalog_grant_audit_log_service_all`; `authenticated` só com `SELECT`;
  `fn_verify_anon_catalog_grants`/`fn_anon_catalog_grant_audit_run` com EXECUTE apenas para
  `authenticated`/`service_role` (`anon`/`PUBLIC` = 0). O jsonb de cada violação traz as chaves
  `object_name`, `object_kind`, `issue` — exatamente o que `normalizarViolacao` lê.
  Último snapshot (`id 523`, `18:03 UTC`) com `violation_count = 0`.