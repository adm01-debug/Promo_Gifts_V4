# Revisão manual das 67 migrations "pendente" (E07, segunda passada)

**Data:** 2026-09-16 · **Base:** `docs/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`
**Método:** para cada objeto ausente, comparado o estado *atual* da tabela-alvo (policies/triggers
reais hoje) e, para funções, se há chamador vivo no código — não só "o nome não existe".

## Resultado por prioridade

### P1 — Requer decisão/investigação adicional (não resolvido aqui)

| Objeto | Tabela | Por quê importa |
|---|---|---|
| `trg_prevent_non_admin_quote_item_price_change` | `quote_items` | Trigger de **segurança de preço** ausente. `quote_items` tem 6 triggers hoje (`trg_quote_items_parent_immutable`, `discount_integrity_deferred`, etc.) mas nenhum com esse nome/propósito explícito. Não confirmei se a proteção existe sob outra forma — merece leitura da migration original + dos triggers atuais lado a lado antes de decidir. |
| `trg_enforce_seller_cart_ready_requires_items` | `seller_carts` | Trigger de integridade ausente. `seller_carts` tem 4 triggers hoje, nenhum cobrindo "carrinho pronto precisa ter itens". |
| `handle_password_reset_request` (função) | `password_reset_requests` | Função **não existe em lugar nenhum** do banco (não é "nome mudou" — é ausência total). A tabela tem `trg_anon_rate_guard`/`trg_password_reset_rate_limit` (rate limit), mas nenhum trigger chama essa função. Hipótese mais provável: fluxo de reset de senha migrou pro fluxo nativo do Supabase Auth e este handler ficou órfão — não confirmado. |

### P2 — Débito técnico real, baixa urgência

| Achado | Evidência |
|---|---|
| 7 índices de performance nunca aplicados em `products`/`stock_snapshots`/`product_images` | `idx_products_active_category`, `idx_products_active_sale_price`, `idx_products_keyset_active` (2 tentativas, datas diferentes), `idx_stock_snapshots_variant_id`, `idx_pcd_product_id_active`, `idx_product_images_cf_last_checked_at`. Relevante para a lentidão de RPC já medida na Fase 4 do plano DBA. |
| Limpeza "faxina" de tabelas órfãs nunca completou | 4 migrations tentaram criar schemas `archive`/`backup` para mover tabelas órfãs — **nenhum dos dois schemas existe hoje** (`objetos_em_schema_archive_ou_backup: 0`), e **3 tabelas `%_orphan_%` ainda estão em `public`**. A intenção (tirar lixo de `public`) nunca foi concluída. |

### P3 — Confirmado superado por trabalho posterior (sem ação necessária)

Tabela já tem cobertura equivalente sob nome diferente — checado policy-a-policy/trigger-a-trigger:

- **`user_roles`** (4 itens: `user_roles_self_read`, `_self_read_v4`, `_select_v2`, `_org_admin_manage`) — hoje tem `Users read own roles` (SELECT) + `_insert_guarded`/`_update_guarded`/`_delete_guarded`. CRUD completo coberto.
- **`admin_audit_log`** (2 itens) — hoje tem `Devs can read audit logs` + `Admins or above can insert audit entries`.
- **`color_groups`** (`color_groups_insert_own_org`) — hoje tem `color_groups_oa_ins`/`_upd`/`_del` + `_public_read`.
- **`category_ancestors`** (`category_ancestors_public_read`) — hoje tem `category_ancestors_select_public` (mesmo propósito, nome final diferente).
- **`tabela_preco_gravacao_oficial`** (`tpgo_authenticated_read`) — hoje tem `tabela_preco_gravacao_oficial_public_read` (anon **e** authenticated — cobertura maior que a pedida).
- **`kit_component_enrichment_raw`** (`kcer_admin_all`) — hoje tem `kcer_admin_insert`/`_update`/`_delete` + `_read_auth` (granularizado, não removido).
- **`discount_approval_requests`** (`enable_read_for_requesting_user` policy + `trg_discount_approval_updated_at` trigger) — hoje tem `dar_select_scope` e `trg_dar_updated_at` (10 triggers no total, cobertura extensa).
- **`password_reset_requests`** (`prr_insert_validated`) — hoje tem `Anyone can request a password reset (validated)` (mesmo propósito).
- **`user_notification_preferences`** (`update_user_notification_preferences_updated_at`) — hoje tem `trg_unp_updated_at`.
- **`kcpa_admin_delete`** (`kit_component_print_areas`) — hoje tem `kcpa_dev_delete`: DELETE não sumiu, só passou a exigir papel `dev` em vez de `admin` (`dev` é hierarquicamente acima de `admin` no enum `app_role`) — restrição ficou mais forte, não mais fraca.

### P4 — Tabela-alvo não existe mais (achado moot, não é gap)

- **`bitrix_clients`**, **`silver_products`**, **`ai_description_queue`** — não existem no banco hoje (confirmado via `pg_class`). As policies "pendente" associadas nunca tiveram onde pousar.
- **`kit_component_media`** — **o próprio código já documenta isso**: `src/components/admin/products/kit-components/api.ts:108` — *"nome bridge-era kit_component_media nunca existiu no [banco]"*. A tabela real é `component_media`; existe `v_kit_component_media_public` (view) cobrindo o caso de leitura pública.

### P5 — Funções sem chamador vivo, ou com chamador que já sabe que a função não existe

- `soft_delete_record`, `fn_sm_hex_from_similares`, `fn_parity_standardize_variant`, `fn_favorite_items_assign_position`, `fn_qa_orcamento_regression`, `check_seller_cart_limit`, `fn_check_dead_letters` — **zero referências no código**. Escritas, nunca consumidas, nunca aplicadas — trabalho especulativo abandonado.
- `check_auth_config_status` — chamada existe (`src/lib/auth/auth-audit.ts:12`), mas **o próprio código comenta a ausência como intencional**, verificada em 2026-06-11, com degradação graciosa. Não é bug novo.
- `check_webhook_dedup` — só aparece em **comentário** (`webhook-dispatcher/index.ts:252`), não é chamada real.
- `fn_convert_cart_to_quote` — só aparece em **comentário** dizendo que o código **não** usa mais essa RPC (`CartHeaderButton.tsx:12`).

### P6 — Utilitário/baixo risco, provavelmente superado ou não crítico

`trg_relink_former_deps_on_root_becomes_dep` (`product_images` já tem 21 triggers, incluindo lógica de canonical chain que pode cobrir o caso), `trg_fi_no_archived_list` (`favorite_items` tem `trg_fi_soft_delete`), `trg_fl_assign_position` (`favorite_lists` só tem `trg_fl_updated_at` — posição pode ser tratada em app), `trg_set_quote_sent_at` (`quotes` tem 10 triggers robustos, `sent_at` pode ser setado por RPC), `trg_crm_callback_events_updated_at` e `tr_system_kill_switches_updated_at` (triggers utilitários de `updated_at`, baixo risco se ausentes).

## Conclusão

Das 67 `pendente`: **~34 confirmadas superadas ou moot** (P3+P4, sem ação), **~7 são débito técnico real de baixa urgência** (P2), **~6 são utilitárias de baixo risco** (P6), **~7 funções são código morto sem consumidor** (P5), e **3 itens (P1) merecem investigação dedicada** antes de qualquer decisão — dois deles (`trg_prevent_non_admin_quote_item_price_change`, `trg_enforce_seller_cart_ready_requires_items`) tocam integridade financeira/operacional e não devem ser fechados só com esta revisão de superfície.

**Nenhuma migration foi aplicada, revertida ou alterada nesta revisão.** É levantamento para decisão do PO, conforme REGRA #8.
