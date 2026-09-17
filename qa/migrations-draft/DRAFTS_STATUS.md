# Rastreamento draft → migration → DB

_Atualizado em 2026-09-09T22:33:29.580Z · 10 rascunho(s) · **sem acesso ao DB** (PGHOST ausente)._

Gerado por `scripts/map-drafts-to-migrations.mjs`. Não editar à mão.

## Legenda

- ✅ **aplicada** — existe migration versionada correspondente E o `version` está em `supabase_migrations.schema_migrations`.
- 🟠 **versionada, não aplicada** — foi promovida para `supabase/migrations/` mas o DB canônico ainda não a executou.
- 🟡 **não promovido** — só existe rascunho; nenhuma migration canônica bate com o slug.
- ❔ **sem acesso ao DB** — status não pôde ser consultado (PG indisponível ou sem permissão).

### Como ler a coluna "Candidatos"

- **🎯 slug exato** — o nome do arquivo canônico contém o slug completo do draft (match 100%).
- **N%** — fuzzy por tokens: `N = tokens do slug encontrados / total`. Só aparece se ≥ 60% e ≥ 3 tokens (ou todos, se slug tiver menos).
- `token` — apareceu no nome do arquivo canônico.
- ~~`token`~~ — está no slug do draft mas **não** no candidato (sinal de divergência semântica).

## Tabela

| Rascunho | Slug (tokens) | Candidatos em `supabase/migrations/` | Status no DB |
| --- | --- | --- | --- |
| `2026-06-18_security_definer_acl.sql` | `security_definer_acl`<br>`security` `definer` `acl` | `20260716000017_db_security_definer_acl_fix.sql` — **🎯 slug exato**<br>&nbsp;&nbsp;↳ bateu: `security` `definer` `acl`<br><br>`20260909210000_audit_security_definer_acl_allow_public_endpoints.sql` — **🎯 slug exato**<br>&nbsp;&nbsp;↳ bateu: `security` `definer` `acl` | ❔ PGHOST ausente |
| `2026-06-19_kit_dimensions_backfill.sql` | `kit_dimensions_backfill`<br>`kit` `dimensions` `backfill` | _(nenhum match)_ | 🟡 não promovido |
| `2026-06-19_reposicao_variants_summary.sql` | `reposicao_variants_summary`<br>`reposicao` `variants` `summary` | _(nenhum match)_ | 🟡 não promovido |
| `2026-06-20_revoke_secdef_from_authenticated.sql` | `revoke_secdef_from_authenticated`<br>`revoke` `secdef` `from` `authenticated` | `20260512222200_t28_pilot_revoke_admin_security_definer_from_anon_authenticated.sql` — **75%**<br>&nbsp;&nbsp;↳ bateu: `revoke` `from` `authenticated` · faltou: ~~`secdef`~~<br><br>`20260605014545_revoke_fn_process_raw_v2_execute_from_anon_authenticated.sql` — **75%**<br>&nbsp;&nbsp;↳ bateu: `revoke` `from` `authenticated` · faltou: ~~`secdef`~~ | ❔ PGHOST ausente |
| `2026-06-27_quotes_status_allow_cancelled.sql` | `quotes_status_allow_cancelled`<br>`quotes` `status` `allow` `cancelled` | _(nenhum match)_ | 🟡 não promovido |
| `2026-07-06_crm_callback_events.sql` | `crm_callback_events`<br>`crm` `callback` `events` | `20260706181356_crm_callback_events.sql` — **🎯 slug exato**<br>&nbsp;&nbsp;↳ bateu: `crm` `callback` `events` | ❔ PGHOST ausente |
| `2026-07-13_secdef_revoke_webhook_locks.sql` | `secdef_revoke_webhook_locks`<br>`secdef` `revoke` `webhook` `locks` | `20260713_001_secdef_revoke_webhook_locks.sql` — **🎯 slug exato**<br>&nbsp;&nbsp;↳ bateu: `secdef` `revoke` `webhook` `locks` | ❔ PGHOST ausente |
| `2026-07-13_secdef_revoke_webhook_locks_ROLLBACK.sql` | `secdef_revoke_webhook_locks_ROLLBACK`<br>`secdef` `revoke` `webhook` `locks` `ROLLBACK` | `20260713_001_secdef_revoke_webhook_locks.sql` — **80%**<br>&nbsp;&nbsp;↳ bateu: `secdef` `revoke` `webhook` `locks` · faltou: ~~`ROLLBACK`~~ | ❔ PGHOST ausente |
| `2026-07-23_get_edge_invoke_summary.sql` | `get_edge_invoke_summary`<br>`get` `edge` `invoke` `summary` | _(nenhum match)_ | 🟡 não promovido |
| `2026-09-09_magazine_rpc_only_contract.sql` | `magazine_rpc_only_contract`<br>`magazine` `rpc` `only` `contract` | _(nenhum match)_ | 🟡 não promovido |

## Como agir

- **🟡 não promovido** → revisar o rascunho e, quando aprovado, copiar para `supabase/migrations/<timestamp>_<slug>.sql` (ver `qa/migrations-draft/README.md`).
- **🟠 versionada, não aplicada** → verificar por que o `db push` não rodou; pode ser drift real ou marker faltando em `schema_migrations`.
- **✅ aplicada** → deletar o arquivo do `qa/migrations-draft/` (dupla verdade proibida).

---

## Decisão por objeto (E13 — 2026-09-16)

> A tabela acima (gerada por `scripts/map-drafts-to-migrations.mjs`) casa **slug de
> arquivo**, não o objeto real no banco, e ficou sem acesso a `PGHOST` na última
> execução (2026-09-09) — por isso todas as linhas mostram ❔/🟡 mesmo para drafts
> já absorvidos. Esta seção foi produzida com verificação **direta em `pg_catalog`**
> (via `mcp__supabase__execute_sql`, nunca PostgREST — REGRA #8 corolário) objeto por
> objeto: para cada draft, o SQL foi lido, os objetos (tabela/função/constraint/
> trigger) que ele cria/altera foram extraídos, e cada um foi verificado ao vivo em
> `pg_proc`, `pg_class`, `pg_constraint`, `pg_trigger` e
> `supabase_migrations.schema_migrations`. Ver metodologia completa e evidência em
> `docs/E13_DRAFTS_MIGRATIONS_2026-09-16.md`.
>
> **Contagem real:** 10 rascunhos ativos + **4** arquivados em `_archived/` = **14**,
> não 15 como o texto do plano (E13) afirmava. Confirmado por `find` em
> `qa/migrations-draft/*.sql` e `qa/migrations-draft/_archived/*.sql`.

| Rascunho | Status (E13) | Owner | Data | Próxima ação / etapa do plano |
| --- | --- | --- | --- | --- |
| `2026-06-18_security_definer_acl.sql` | `obsoleto` | auditoria-e13-2026-09-16 | 2026-09-16 | Nenhuma — os 4 alvos originais (`check_seller_cart_limit`, `handle_password_reset_request`, `check_auth_config_status`, `refresh_product_popularity`) não existem mais sob esse nome; 2 foram removidos e 2 renomeados/refatorados (`enforce_seller_cart_limit`, `enforce_password_reset_rate_limit`) e já têm grants corrigidos de forma independente. Pode ser removido do diretório em etapa de limpeza futura. |
| `2026-06-19_kit_dimensions_backfill.sql` | `pendente` | auditoria-e13-2026-09-16 | 2026-09-16 | **GAP** — 43 kits ainda com `length_cm`/`width_cm`/`height_cm` NULL (caiu de 301 para 43 por mecanismo não rastreado). Nenhuma etapa E01–E50 cobre este backfill. Requer decisão do PO: promover o draft ou abrir nova etapa. |
| `2026-06-19_reposicao_variants_summary.sql` | `absorvido (fora do fluxo de migration)` | auditoria-e13-2026-09-16 | 2026-09-16 | Função `fn_get_reposicao_variants_summary(uuid[])` existe ao vivo com grants e `COMMENT ON FUNCTION` **idênticos** ao draft (inclusive o texto "v3 2026-06-19"), mas **nenhuma** migration em `supabase/migrations/` a referencia — indício forte de DDL out-of-band (REGRA #8 corolário / E12). Ação: repair via `docs/db/POLITICA_DDL.md` (criar migration-recibo + `migration repair --status applied`) para fechar o ledger; remover a entrada de `REVIEWS.json` (está incorretamente listada como "aguardando validação em staging" quando já está em produção). |
| `2026-06-20_revoke_secdef_from_authenticated.sql` | `absorvido parcialmente` | auditoria-e13-2026-09-16 | 2026-09-16 | Maioria dos ~65 alvos já revogados (via outras migrations não individualmente rastreadas) ou inexistentes (5 nomes sumiram: `check_seller_cart_limit`, `handle_password_reset_request`, `check_auth_config_status`, `refresh_product_popularity`, `fn_relink_former_deps_on_root_becomes_dep`). **Residual/GAP:** 8 funções permanecem `EXECUTE` para anon+authenticated (`audit_security_definer_acl`, `fn_deploy_readiness_check`, `fn_check_coverage_regression`, `fn_refresh_media_health`, `fn_backfill_eco_links`, `fn_backfill_feminine_links`, `fn_backfill_product_attributes_safe`, `fn_backfill_product_categories`) — porém nenhuma é `SECURITY DEFINER` (`prosecdef=false`), então o risco original (bypass de RLS) não se aplica; E17/E18 são escopados só a SECDEF e não cobrem essas 8. Sugerir revisão de baixo risco em etapa futura. |
| `2026-06-27_quotes_status_allow_cancelled.sql` | `absorvido por 20260618102416` | auditoria-e13-2026-09-16 | 2026-09-16 | Nenhuma — `pg_get_constraintdef` confirma `valid_quote_status` já inclui `'cancelled'`, idêntico à migration `20260618102416_quotes_add_cancelled_status.sql` (aplicada **9 dias antes** da data do draft — o draft era redundante já ao ser escrito). Remover o rascunho do diretório em limpeza futura. |
| `2026-07-06_crm_callback_events.sql` | `absorvido por 20260706181356` | auditoria-e13-2026-09-16 | 2026-09-16 | Nenhuma — tabela `crm_callback_events` e migration com nome idêntico confirmadas em `supabase_migrations.schema_migrations`. Remover o rascunho. |
| `2026-07-13_secdef_revoke_webhook_locks.sql` | `absorvido por 20260713154845` | auditoria-e13-2026-09-16 | 2026-09-16 | Nenhuma — conteúdo de `supabase/migrations/20260713154845_secdef_revoke_webhook_locks.sql` é idêntico (3 REVOKE + 3 GRANT) ao draft; `claim_webhook_delivery`/`release_webhook_delivery_lock`/`cleanup_stale_webhook_locks` confirmados `service_role`-only ao vivo. Remover o rascunho. |
| `2026-07-13_secdef_revoke_webhook_locks_ROLLBACK.sql` | `obsoleto` | auditoria-e13-2026-09-16 | 2026-09-16 | Contingência do item acima; nunca precisou ser executado (a migration 20260713154845 está em produção sem incidente). Pode ser removido junto com o par em limpeza futura. |
| `2026-07-23_get_edge_invoke_summary.sql` | `pendente` | auditoria-e13-2026-09-16 | 2026-09-16 | **GAP** — função `get_edge_invoke_summary` não existe ao vivo; tabela-base `webhook_delivery_metrics` existe. `REVIEWS.json` já documenta adiamento deliberado do PO/Codex-DBA. Nenhuma etapa E01–E50 cobre a promoção. Requer decisão do PO. |
| `2026-09-09_magazine_rpc_only_contract.sql` | `pendente` | auditoria-e13-2026-09-16 | 2026-09-16 | **GAP (deliberado)** — nenhum dos 6 REVOKE EXECUTE nem os REVOKE de INSERT/UPDATE/DELETE em `magazines`/`magazine_items` foi aplicado; `authenticated` ainda tem grants diretos nas tabelas e EXECUTE nas 6 `*_atomic`. A migration `20260909200000_magazine_hardening_v2` (mesma data) criou uma família paralela `*_v2` com trigger `magazine_guard_and_version_v2` que já bloqueia `INSERT ... status='published'` direto, mas **não** revoga grants de tabela nem das funções `*_atomic` antigas — não substitui o draft. `REVIEWS.json` documenta adiamento intencional até frontend v2 READY + smoke autenticado. Nenhuma etapa E01–E50 cobre a aplicação. |
| `_archived/2026-07-12_magazines.sql` | `obsoleto` | auditoria-e13-2026-09-16 | 2026-09-16 | Nenhuma — schema vivo de `magazines` usa `branding` (jsonb) e tem `edit_version`, nenhum dos quais existe no draft; draft propunha `client_brand_colors`, inexistente. Confirma e reforça o motivo já em `_archived/README.md`. |
| `_archived/2026-07-12_magazine_items_unique_product.sql` | `absorvido (fora do fluxo de migration)` | auditoria-e13-2026-09-16 | 2026-09-16 | Constraint `UNIQUE(magazine_id, product_id)` existe ao vivo (`pg_constraint`, `contype='u'`) mas sob o nome `magazine_items_unique_product`, diferente do proposto (`magazine_items_magazine_product_key`); busca de conteúdo em `supabase/migrations/*.sql` não encontrou o `CREATE`/`ALTER` que a originou — outro indício de DDL out-of-band. Sem ação necessária além do registro (goal já atingido). |
| `_archived/2026-07-12_magazine_reader_state.sql` | `obsoleto` | auditoria-e13-2026-09-16 | 2026-09-16 | Tabela `magazine_reader_state` existe ao vivo com `magazine_token_hash` (SHA-256) em vez de `magazine_token` (texto puro) proposto no draft — já era referenciada em migrations de RLS/índice em 2026-07-16, mas nenhuma migration de `CREATE TABLE` foi encontrada (out-of-band, anterior a essa data). Design do draft (token em texto puro) nunca foi usado. |
| `_archived/2026-07-15_magazine_public_token_trigger.sql` | `obsoleto` | auditoria-e13-2026-09-16 | 2026-09-16 | Nenhum trigger `trg_magazine_public_token`/`fn_magazine_public_token` existe. O único trigger em `magazines` é `trg_magazines_guard_and_version_v2` → `magazine_guard_and_version_v2` (migration `20260909200000_magazine_hardening_v2`), que gera `public_token` como parte de um guard muito mais amplo. **Achado adicional:** `_archived/README.md` afirma que o trigger `generate_magazine_public_token` "já existe ao vivo" — essa afirmação está **desatualizada/incorreta** (nenhum trigger com esse nome existe); recomenda-se corrigir `_archived/README.md` em revisão futura. |

**Distribuição (14 drafts):** `absorvido por <versão>` = 3 · `absorvido (fora do fluxo de migration)` = 2 · `absorvido parcialmente` = 1 · `pendente` = 3 (todos são GAP — nenhuma etapa E01–E50 os cobre) · `obsoleto` = 5.

**Owner:** `auditoria-e13-2026-09-16` é um **placeholder de sessão** (a execução automatizada da etapa E13), não uma pessoa. Toda entrada acima deve ser revisada por um humano (PO/DBA) antes de qualquer promoção ou remoção de arquivo.
