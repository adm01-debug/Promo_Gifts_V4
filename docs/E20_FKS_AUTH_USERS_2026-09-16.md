# E20 — Auditoria das FKs apontando para `auth.users`

**Data:** 2026-09-16
**Classificação:** `[DB-RO]` — somente leitura, nenhuma alteração de schema foi executada.
**Etapa do plano:** E20 (`docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`, linhas 455-462).
**Fonte:** consultas diretas a `pg_catalog` (`pg_constraint`, `pg_class`, `pg_attribute`, `pg_index`) no
projeto Supabase canônico `doufsxqlfjyuvxuezpln`, via `mcp__supabase__execute_sql` (somente-leitura).
Nenhuma consulta usou PostgREST/OpenAPI, conforme CLAUDE.md REGRA #8.

## Método

```sql
-- FKs que referenciam auth.users
SELECT con.* FROM pg_constraint con
WHERE con.contype = 'f' AND con.confrelid = 'auth.users'::regclass;

-- Cobertura de índice: o índice precisa ter as colunas da FK como PREFIXO
-- (mesma ordem), estar válido (indisvalid) e ser não-parcial (indpred IS NULL)
-- para cobrir 100% das linhas durante um DELETE FROM auth.users.
```

Todas as 82 FKs encontradas são de coluna única (`conkey` com 1 elemento), o que
simplificou a checagem de prefixo. `condeferrable = false` em todas — nenhuma é
`DEFERRABLE`, logo toda constraint `NO ACTION` é verificada de forma imediata
(comportamento equivalente a `RESTRICT` para efeitos práticos de um `DELETE`).

`auth.users` tem hoje ~13 linhas (estimativa via `pg_class.reltuples`). O achado é
estrutural/preventivo — o impacto de performance ainda é pequeno, mas o número de
FKs saltou de 69 (julho/2026) para 82 (setembro/2026), e cada FK sem índice vira um
seq scan na tabela referenciadora a cada exclusão de usuário.

## Resumo

| Métrica | Valor |
|---|---|
| Total de FKs → `auth.users` | **82** |
| FKs **sem** índice cobrindo a coluna referenciadora | **4** |
| FKs com índice válido cobrindo a coluna | 78 |

### Por `ON DELETE`

| ON DELETE | Quantidade |
|---|---|
| `CASCADE` | 38 |
| `SET NULL` | 25 |
| `NO ACTION` | 19 |
| `RESTRICT` (explícito) | 0 |

Nota: não há nenhuma FK com `RESTRICT` explícito. As 19 `NO ACTION` são o valor
*default* do Postgres quando `ON DELETE` não é especificado na migration — ou seja,
o efeito de bloqueio existe, mas não há evidência de que tenha sido uma decisão
deliberada de design em cada caso.

## Tabela completa (82 FKs)

| # | Tabela | Coluna | Constraint | ON DELETE | Tem índice |
|---|---|---|---|---|---|
| 1 | auth.identities | user_id | identities_user_id_fkey | CASCADE | sim |
| 2 | auth.mfa_factors | user_id | mfa_factors_user_id_fkey | CASCADE | sim |
| 3 | auth.mfa_recovery_code_sets | user_id | mfa_recovery_code_sets_user_id_fkey | CASCADE | sim |
| 4 | auth.oauth_authorizations | user_id | oauth_authorizations_user_id_fkey | CASCADE | **NÃO** |
| 5 | auth.oauth_consents | user_id | oauth_consents_user_id_fkey | CASCADE | sim |
| 6 | auth.one_time_tokens | user_id | one_time_tokens_user_id_fkey | CASCADE | sim |
| 7 | auth.scim_users | user_id | scim_users_user_id_fkey | SET NULL | sim |
| 8 | auth.sessions | user_id | sessions_user_id_fkey | CASCADE | sim |
| 9 | auth.webauthn_challenges | user_id | webauthn_challenges_user_id_fkey | CASCADE | sim |
| 10 | auth.webauthn_credentials | user_id | webauthn_credentials_user_id_fkey | CASCADE | sim |
| 11 | public.admin_settings | updated_by | fk_admin_settings_updated_by | SET NULL | sim |
| 12 | public.ai_function_routing | updated_by | ai_function_routing_updated_by_fkey | NO ACTION | sim |
| 13 | public.ai_providers | created_by | ai_providers_created_by_fkey | NO ACTION | sim |
| 14 | public.ai_providers | updated_by | ai_providers_updated_by_fkey | NO ACTION | sim |
| 15 | public.ai_routing_decisions | user_id | ai_routing_decisions_user_id_fkey | NO ACTION | sim |
| 16 | public.ai_usage_logs | user_id | ai_usage_logs_user_id_fkey | NO ACTION | sim |
| 17 | public.attribute_equivalences | verified_by | attribute_equivalences_verified_by_fkey | NO ACTION | sim |
| 18 | public.b2b_collections | created_by | collections_created_by_fkey | SET NULL | sim |
| 19 | public.cart_templates | user_id | cart_templates_user_id_fkey | CASCADE | sim |
| 20 | public.catalog_analytics | user_id | catalog_analytics_user_id_fkey | SET NULL | sim |
| 21 | public.categories | created_by | categories_created_by_fkey | NO ACTION | sim |
| 22 | public.categories | updated_by | categories_updated_by_fkey | NO ACTION | sim |
| 23 | public.content_articles | author_id | content_articles_author_id_fkey | SET NULL | sim |
| 24 | public.custom_kits | user_id | custom_kits_user_id_fkey | CASCADE | sim |
| 25 | public.device_login_notifications | user_id | device_login_notifications_user_id_fkey | CASCADE | sim |
| 26 | public.edge_function_invocations | invoked_by | edge_function_invocations_invoked_by_fkey | SET NULL | sim |
| 27 | public.favorite_items | user_id | favorite_items_user_id_fkey | CASCADE | sim |
| 28 | public.favorite_items_trash | user_id | favorite_items_trash_user_id_fkey | CASCADE | sim |
| 29 | public.favorite_lists | user_id | favorite_lists_user_id_fkey | CASCADE | sim |
| 30 | public.file_scan_logs | user_id | file_scan_logs_user_id_fkey | CASCADE | sim |
| 31 | public.frontend_telemetry | user_id | frontend_telemetry_user_id_fkey | SET NULL | sim |
| 32 | public.generated_mockups | approved_by_user_id | generated_mockups_approved_by_user_id_fkey | SET NULL | sim |
| 33 | public.generated_mockups | user_id | generated_mockups_user_id_fkey | CASCADE | sim |
| 34 | public.geo_allowed_countries | created_by | geo_allowed_countries_created_by_fkey | NO ACTION | sim |
| 35 | public.inbound_webhook_endpoints | created_by | inbound_webhook_endpoints_created_by_fkey | SET NULL | sim |
| 36 | public.integration_credentials | created_by | integration_credentials_created_by_fkey | SET NULL | sim |
| 37 | public.integration_credentials | updated_by | integration_credentials_updated_by_fkey | SET NULL | sim |
| 38 | public.ip_access_control | created_by | ip_access_control_created_by_fkey | SET NULL | sim |
| 39 | public.kit_component_enrichment_raw | imported_by | kit_component_enrichment_raw_imported_by_fkey | NO ACTION | sim |
| 40 | public.kit_component_padronizacao | reviewed_by | kit_component_padronizacao_reviewed_by_fkey | NO ACTION | sim |
| 41 | public.kit_quote_requests | user_id | kit_quote_requests_user_id_fkey | CASCADE | **NÃO** |
| 42 | public.kit_save_requests | user_id | kit_save_requests_user_id_fkey | CASCADE | **NÃO** |
| 43 | public.kit_templates | created_by | kit_templates_created_by_fkey | SET NULL | sim |
| 44 | public.login_attempts | user_id | login_attempts_user_id_fkey | SET NULL | sim |
| 45 | public.magazine_duplicate_requests | actor_id | magazine_duplicate_requests_actor_id_fkey | CASCADE | sim |
| 46 | public.magazine_reader_state | user_id | magazine_reader_state_user_id_fkey | SET NULL | sim |
| 47 | public.magazine_templates | owner_id | magazine_templates_owner_id_fkey | CASCADE | sim |
| 48 | public.magazines | owner_id | magazines_owner_id_fkey | CASCADE | **NÃO*** |
| 49 | public.mockup_credit_transactions | user_id | mockup_credit_transactions_user_id_fkey | CASCADE | sim |
| 50 | public.mockup_credits | user_id | mockup_credits_user_id_fkey | CASCADE | sim |
| 51 | public.mockup_generation_jobs | user_id | mockup_generation_jobs_user_id_fkey | CASCADE | sim |
| 52 | public.navigation_analytics | user_id | navigation_analytics_user_id_fkey | SET NULL | sim |
| 53 | public.orders | created_by | orders_created_by_fkey | NO ACTION | sim |
| 54 | public.orders | seller_id | orders_seller_id_fkey | SET NULL | sim |
| 55 | public.password_reset_requests | reviewed_by | password_reset_requests_reviewed_by_fkey | NO ACTION | sim |
| 56 | public.password_reset_requests | user_id | password_reset_requests_user_id_fkey | NO ACTION | sim |
| 57 | public.personalization_simulations | seller_id | personalization_simulations_seller_id_fkey | CASCADE | sim |
| 58 | public.product_deactivation_requests | approved_by | product_deactivation_requests_approved_by_fkey | NO ACTION | sim |
| 59 | public.product_deactivation_requests | rejected_by | product_deactivation_requests_rejected_by_fkey | NO ACTION | sim |
| 60 | public.product_deactivation_requests | requested_by | product_deactivation_requests_requested_by_fkey | NO ACTION | sim |
| 61 | public.product_price_freshness_overrides | updated_by | product_price_freshness_overrides_updated_by_fkey | SET NULL | sim |
| 62 | public.profiles | user_id | profiles_user_id_fkey | CASCADE | sim |
| 63 | public.quote_approval_tokens | seller_id | quote_approval_tokens_seller_id_fkey | CASCADE | sim |
| 64 | public.quote_history | user_id | quote_history_user_id_fkey | NO ACTION | sim |
| 65 | public.quote_templates | created_by | quote_templates_created_by_fkey | SET NULL | sim |
| 66 | public.quote_versions | created_by | quote_versions_created_by_fkey | SET NULL | sim |
| 67 | public.sales_goals | user_id | sales_goals_user_id_fkey | CASCADE | sim |
| 68 | public.secret_rotation_log | rotated_by | secret_rotation_log_rotated_by_fkey | SET NULL | sim |
| 69 | public.seller_carts | seller_id | seller_carts_seller_id_fkey | CASCADE | sim |
| 70 | public.system_kill_switches | updated_by | system_kill_switches_updated_by_fkey | SET NULL | sim |
| 71 | public.user_2fa_settings | user_id | user_2fa_settings_user_id_fkey | CASCADE | sim |
| 72 | public.user_allowed_ips | created_by | user_allowed_ips_created_by_fkey | SET NULL | sim |
| 73 | public.user_allowed_ips | user_id | user_allowed_ips_user_id_fkey | CASCADE | sim |
| 74 | public.user_ip_allowlist | created_by | user_ip_allowlist_created_by_fkey | NO ACTION | sim |
| 75 | public.user_ip_allowlist | user_id | user_ip_allowlist_user_id_fkey | CASCADE | sim |
| 76 | public.user_known_devices | user_id | user_known_devices_user_id_fkey | CASCADE | sim |
| 77 | public.user_notification_preferences | user_id | user_notification_preferences_user_id_fkey | CASCADE | sim |
| 78 | public.user_onboarding | user_id | user_onboarding_user_id_fkey | CASCADE | sim |
| 79 | public.user_roles | granted_by | user_roles_granted_by_fkey | SET NULL | sim |
| 80 | public.user_roles | user_id | user_roles_user_id_fkey | CASCADE | sim |
| 81 | public.visual_search_feedback | user_id | visual_search_feedback_user_id_fkey | SET NULL | sim |
| 82 | public.workspace_notifications | user_id | workspace_notifications_user_id_fkey | CASCADE | sim |

`*` `public.magazines.owner_id` tem um índice cujo prefixo é `owner_id`
(`idx_magazines_not_deleted`, `btree (owner_id, updated_at DESC) WHERE deleted_at IS NULL`),
mas é **parcial**: só cobre linhas com `deleted_at IS NULL`. Registros de magazines
já soft-deletados (`deleted_at IS NOT NULL`) não são cobertos por nenhum índice em
`owner_id` — na prática, uma fração do seq scan é evitada, mas não 100%. Por isso foi
classificado como "sem índice" nesta auditoria (nenhum índice cobre a coluna de forma
incondicional).

## Achados

### (a) FKs sem índice cobrindo a coluna referenciadora — candidatas a E29

4 de 82 (4,9%):

1. **`auth.oauth_authorizations.user_id`** (`oauth_authorizations_user_id_fkey`, `ON DELETE CASCADE`)
   — tabela do schema `auth`, gerenciado pelo GoTrue/Supabase Auth. Só existem índices
   únicos em `authorization_code`, `authorization_id`, `id` (pkey) e um parcial em
   `expires_at`. Nenhum índice em `user_id`. **Atenção:** criar índice em `auth.*`
   normalmente exige rodar como `supabase_auth_admin` ou via migration com privilégio
   elevado — sinalizar para quem executar E29 que este caso pode exigir tratamento
   diferente dos demais (tabela não é "nossa", é gerenciada pelo Auth).
2. **`public.kit_quote_requests.user_id`** (`kit_quote_requests_user_id_fkey`, `ON DELETE CASCADE`)
   — único índice na tabela é o pkey em `request_id`. Estatísticas nunca coletadas
   (`reltuples = -1`, indício de tabela nunca analisada/vacuumada).
3. **`public.kit_save_requests.user_id`** (`kit_save_requests_user_id_fkey`, `ON DELETE CASCADE`)
   — mesma situação: só pkey em `request_id`, `reltuples = -1`.
4. **`public.magazines.owner_id`** (`magazines_owner_id_fkey`, `ON DELETE CASCADE`)
   — índice existente é parcial (`WHERE deleted_at IS NULL`), não cobre 100% das linhas
   (ver nota acima). Recomenda-se, em E29, um índice não-parcial em `owner_id` ou
   ajustar a estratégia (ex.: índice parcial adicional para `deleted_at IS NOT NULL`,
   ou remover a condição parcial se o ganho de espaço não compensar a lacuna de
   cobertura).

Todas as 4 são `ON DELETE CASCADE` — ou seja, além do custo de seq scan, a ausência de
índice também torna lento o próprio `DELETE` em cascata nessas tabelas (não só a busca
de violação, mas a exclusão das linhas dependentes).

### (b) FKs com `NO ACTION`/`RESTRICT` potencialmente inconsistentes com exclusão de conta LGPD

Não há `RESTRICT` explícito, mas as 19 `NO ACTION` (default do Postgres, não-deferrable)
bloqueiam um `DELETE FROM auth.users` até que a linha dependente seja resolvida
manualmente. Divididas por risco:

**Risco mais alto — coluna liga diretamente ao titular dos dados (o próprio usuário
que pediria a exclusão), não a um terceiro que agiu sobre o registro:**

| Tabela.coluna | Observação |
|---|---|
| `password_reset_requests.user_id` | Histórico de pedidos de redefinição de senha do próprio titular. Praticamente todo usuário ativo gera linhas aqui. Bloqueia a exclusão até limpar manualmente. |
| `ai_usage_logs.user_id` | Log de uso de IA do titular — se usuários finais (não só admins) usam funções de IA, isso bloqueia a exclusão de conta deles. |
| `ai_routing_decisions.user_id` | Mesmo padrão de `ai_usage_logs`. |
| `quote_history.user_id` | Histórico de cotações do titular (vendedor ou cliente). |
| `orders.created_by` | Quem criou o pedido — normalmente o próprio cliente/vendedor. **Inconsistência notável:** na mesma tabela `orders`, `seller_id` é `SET NULL`, mas `created_by` é `NO ACTION`. Duas colunas que apontam para o mesmo tipo de ator (usuário autenticado) tratadas de forma assimétrica na mesma tabela — provável falta de decisão deliberada, não um design intencional. `orders` também pode ter retenção legal (nota fiscal/tributário) que justificaria bloquear a exclusão até anonimizar — mas isso deveria ser uma decisão explícita, documentada, não um `ON DELETE` default silencioso. |

**Risco mais baixo — colunas de auditoria/admin (`created_by`, `updated_by`,
`reviewed_by`, `approved_by`, `rejected_by`, `requested_by`, `verified_by`,
`imported_by`) em tabelas de configuração/backoffice, onde o titular normalmente é
um administrador/operador interno, não um cliente final. Ainda assim, sob a LGPD o
colaborador também é titular de dados pessoais, então o bloqueio é um risco
operacional real, só que de menor probabilidade de disparo (poucos titulares, menor
rotatividade):**

`ai_function_routing.updated_by`, `ai_providers.created_by`, `ai_providers.updated_by`,
`attribute_equivalences.verified_by`, `categories.created_by`, `categories.updated_by`,
`geo_allowed_countries.created_by`, `kit_component_enrichment_raw.imported_by`,
`kit_component_padronizacao.reviewed_by`, `password_reset_requests.reviewed_by`,
`product_deactivation_requests.approved_by`, `product_deactivation_requests.rejected_by`,
`product_deactivation_requests.requested_by`, `user_ip_allowlist.created_by`.

**Conclusão do achado (b):** nenhuma dessas 19 FKs foi encontrada com `DEFERRABLE`
(`condeferrable = false` em todas), então o bloqueio é imediato, não adiável dentro
da mesma transação. Como todas usam o valor *default* do Postgres (`NO ACTION`, sem
cláusula `ON DELETE` explícita na migration original), é provável que nenhuma delas
tenha sido pensada deliberadamente como proteção contra exclusão de conta — é
recomendável que quem desenhar o fluxo de exclusão LGPD (fora do escopo `[DB-RO]`
desta etapa) decida, caso a caso, entre `SET NULL` (se o dado deve sobreviver
anonimizado) e uma rotina explícita de "resolver antes de excluir" (se o dado deve
mesmo bloquear, ex. por retenção fiscal) — em vez de depender do comportamento
implícito atual.

## Não incluído nesta etapa

- Nenhuma migration, índice, `ALTER TABLE` ou mudança de `ON DELETE` foi executada.
- Criação dos índices faltantes fica para a etapa E29 do plano.
- Decisão sobre `SET NULL` vs. rotina de resolução manual para as FKs `NO ACTION`
  listadas no achado (b) requer aprovação explícita do PO (CLAUDE.md REGRA #8) e não
  foi tomada aqui.
