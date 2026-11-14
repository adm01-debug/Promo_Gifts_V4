# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `ee13f748c0` · branch `main` · 2026-11-14 19:21 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

### regras.md

# Regras de negócio — Promo Brindes (Promo Gifts V4)

> **Fonte de verdade manual.** Regras que o código não torna óbvias ou que não aparecem
> automaticamente no snapshot do banco. Atualizar neste arquivo quando uma decisão de
> negócio mudar. Versionado em `main`; entra em `07-REGRAS-DE-NEGOCIO.md` via contexto.yml.
>
> Atualizado em: 2026-11-04 (E071/E131 — criação inicial baseada em SCHEMA_REFERENCE,
> REGRA #2, análise de 500 commits e agents de auditoria; E2E PostgREST cold-start — 2026-11-05)

---

## 1. O que o sistema faz e para quem

O Promo Gifts V4 é um catálogo B2B de brindes corporativos gerenciado pela Promo Brindes
(São Paulo/SP). Compradores corporativos (empresas clientes) pesquisam produtos no catálogo,
configuram brindes personalizados (personalização gráfica, embalagem, quantidade mínima) e
solicitam orçamentos. Vendedores/gestores da Promo Brindes recebem os pedidos, negociam
condições, aprovam e encaminham para produção. Fornecedores (suppliers) alimentam o catálogo
via ingestão automática de dados brutos (Asia Ingestion, pipeline Bronze → Silver → Gold).

---

## 2. Atores / perfis e o que cada um pode fazer

| Perfil | Pode | Não pode |
|---|---|---|
| **authenticated** (usuário logado genérico) | SELECT em tabelas com RLS habilitado; invocar funções SECURITY DEFINER permitidas | Acesso direto a tabelas sem RLS; executar SECURITY DEFINER não autorizadas |
| **buyer** (comprador corporativo) | Pesquisar catálogo; criar e editar orçamentos próprios; visualizar status do pedido | Ver orçamentos de outros compradores; alterar preços; aprovar pedidos |
| **seller** (vendedor Promo Brindes) | Visualizar todos os orçamentos; responder com proposta; alterar status do orçamento; configurar promoções | Excluir registros históricos; alterar configuração de banco; acessar dados de outros fornecedores |
| **admin** | Gerenciar usuários, categorias, fornecedores e configurações; visualizar todos os dados; executar workflows de migration | Deploy direto sem PR; acesso ao banco sem auditoria |
| **service_role** (backend/edge functions) | Acesso irrestrito via SECURITY DEFINER; operador de cron jobs e webhooks | Não expor para frontend; não usar em edge functions sem credencial isolada |

---

## 3. Entidades principais e o que significam (glossário do negócio)

| Termo | Significa | Tabela/arquivo |
|---|---|---|
| **Product** | Item do catálogo com preço, descrição e categoria; unidade de venda para o comprador | `products` (schema public) |
| **ProductVariant** | Variação de um produto (cor, tamanho, material); cada variante tem precó e estoque próprios | `product_variants` |
| **Supplier** | Fornecedor do produto; pode ter vários produtos no catálogo | `suppliers` |
| **SupplierProductRaw** | Dado bruto do fornecedor antes da normalização (camada Bronze); ingerido via `asia-ingestion` | `supplier_products_raw` |
| **SupplierProductRawHistory** | Histórico particionado de `supplier_products_raw`; retido para auditoria de preço e disponibilidade | `supplier_products_raw_history` (particionada por mês) |
| **Quote** (orçamento) | Solicitação de preço criada pelo comprador para um ou mais produtos; passa por aprovação do vendedor | ver ciclo de vida §4 |
| **Magazine** | Catálogo visual gerado pelo vendedor com seleção de produtos para um cliente específico | `magazines`, `magazine_items`, `magazine_templates` |
| **PersonalizationTechnique** | Técnica de personalização gráfica (serigrafia, bordado, laser, etc.) aplicável ao produto | `personalization_techniques` |
| **CRM** | Sistema externo Bitrix24; integrado via edge function `crm-db-bridge` e `bitrix-sync` | `src/lib/crm-db.ts`, banco externo `pgxfvjmuubtbowutlide` |
| **PromoChampions** | Programa de fidelidade/desempenho para vendedores top; notificações via `quote-sync-promo-champions` | `quote-sync-promo-champions` edge function |

---

## 4. Ciclo de vida / estados e transições permitidas

### Orçamento (Quote)

```
rascunho (draft) → enviado (submitted) → em_análise (reviewing)
                                              ↓                ↓
                                        aprovado (approved)  recusado (rejected)
                                              ↓
                                         pedido (order)
```

- **draft**: criado pelo comprador; editável; não visível para o vendedor.
- **submitted**: comprador enviou; imutável para o comprador; gatilha notificação para vendedor.
- **reviewing**: vendedor abriu para análise; pode solicitar informações adicionais.
- **approved**: vendedor confirmou preço e prazo; gera pedido automaticamente.
- **rejected**: vendedor recusou; comprador pode criar novo orçamento.
- **Cancelamento**: possível apenas em `draft` ou `submitted` pelo próprio comprador ou pelo admin.
- **Gate 1.5** (`check-no-draft-save.mjs`): sem botão "Salvar Alterações" em fluxo de rascunho — rascunho é auto-salvo.

### Produto (Product)

- **ativo**: visível no catálogo; `sale_price` em uso.
- **inativo**: não aparece em buscas; mantido para histórico de pedidos.
- **rascunho**: em configuração pelo admin; invisível para compradores.

### Ingestão de dados (pipeline Bronze → Silver → Gold)

```
Fornecedor Asia → supplier_products_raw (Bronze) → normalização (Silver) → products/product_variants (Gold)
```

- Bronze: dado bruto, sem validação. Histórico em `supplier_products_raw_history` (particionado por mês).
- **ALERTA CRÍTICO**: `supplier_products_raw_history` não tem partições criadas além de dez/2026 —
  pipeline **para em 2027-01-01** se as partições de 2027 não forem criadas antes de 2026-12-15.
  Ver item E016 do plano de melhorias. **Requer aprovação do PO (DDL em produção)**.

---

## 5. Regras de cálculo

### Preços (interface `Product` — REGRA #2 do CLAUDE.md)

- **`price`** (obrigatório): preço original/tabela do produto.
- **`sale_price`** (opcional): preço de venda com desconto. Quando presente, é o preço exibido ao comprador.
- Se `sale_price` estiver ausente, exibir `price`.
- Renomear `price` ou `sale_price` exige atualizar todos os consumidores — Gate 1.1 bloqueia remoção.
- Preços em BRL (Real), sem casas decimais exibidas (arredondamento padrão bancoário).

### Desconto máximo

- Desconto máximo sem aprovação de supervisor: **15%** sobre `price`.
- Desconto entre 15% e 30%: requer aprovação do gerente de vendas (registro no CRM/Bitrix24).
- Desconto acima de 30%: requer aprovação do PO (Joaquim). DDL-class decision.
- `sale_price < price * 0.70` → sistema deve bloquear e exigir aprovação explícita.

### Frete e prazo

- Frete calculado pela edge function `freight-calculator` (se existir) ou informado manualmente pelo vendedor.
- Prazo de entrega: mínimo 15 dias úteis para brindes com personalização gráfica; mínimo 7 dias para
  produtos de prateleira sem personalização.

### Quantidade mínima de pedido (MOQ)

- MOQ padrão: definido por produto em `product_variants.min_quantity` (ou campo equivalente).
- MOQ abaixo do mínimo do fornecedor: não possível; sistema deve exibir erro antes do envio do orçamento.

---

## 6. Prazos, limites e quotas

| Regra | Valor | Fonte |
|---|---|---|
| Orçamento expira sem resposta do vendedor | 30 dias (a partir de `submitted`) | Decisão de produto |
| Rascunho expira sem submissão | 90 dias | Decisão de produto |
| Partições de `supplier_products_raw_history` para 2027 | Criar antes de 2026-12-15 | E016 — pipeline para em 2027-01-01 |
| Rotacão de `PGPASSWORD` e segredos service_role | A cada 6 meses | SEGREDOS.md |
| Magazine expira (link público) | 60 dias | Decisão de produto (NV) |
| Rate limit E2E cleanup | Configurado via `E2E_CLEANUP_RATE_LIMIT_MAX` e `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS` | edge `e2e-cleanup` |
| SCHEMA_REFERENCE revalidação | Máximo 30 dias entre regerações | Auditoria (atualmente com 49 dias — E015) |

---

## 7. Integrações: o que entra, o que sai, o que acontece se falhar

| Sistema | Direção | O que flui | Falha |
|---|---|---|---|
| **Bitrix24 / CRM** | Bi-direcional | Contatos, empresas, negócios; orçamentos aprovados sincronizados | `bitrix-sync` falha silenciosa; próximo cron tenta novamente |
| **Asia Ingestion** | Entrada (Bronze) | Produtos brutos de fornecedores asiáticos via `ASIA_BASE_URL` | Falha registrada em cron log; pipeline Bronze pausa; Gold não atualiza |
| **Supabase CRM externo** (`pgxfvjmuubtbowutlide`) | Saída (read-only) | Dados de clientes para o app via `crm-db-bridge` | Edge retorna 500; front exibe erro de carregamento do CRM |
| **Turnstile (Cloudflare)** | Entrada | Verificação de bot em `check-login` | Login bloqueado se Turnstile indisponível (fail-closed) |
| **N8N** | Saída | Webhook `N8N_QUOTE_WEBHOOK_URL` para automações de orçamento | Edge `quote-sync` falha silenciosa; N8N não recebe evento |
| **Vercel** | Deploy | Build do front a cada push em `main` | Deploy falha; produção continua servindo versão anterior |
| **GitHub Actions / Supabase Edge** | Deploy | Edge functions a cada push em `main` que toca `supabase/functions/` | Sem rollback automático; `deploy-edge-functions.yml` com `source_ref` para rollback manual |
| **PostgREST (Supabase)** | Interna | Consultas REST do front e dos testes E2E via PostgREST | Cold-start no CI ultrapassa 150s; testes E2E que chamam PostgREST devem usar `waitForFunction` com timeout ≥ 240s (PR #3072, 2026-11-05) |

---

## 8. Exceções comerciais e decisões já tomadas (o que NÃO mudar e por quê)

1. **`price` e `sale_price` em `Product`** — campos críticos da interface; Gate 1.1 bloqueia remoção.
   Renomear exige PR com atualização de todos os usos. Histórico: Lovable já reverteu `price→sale_price`
   silenciosamente causando erro em produção.

2. **ID do banco oficial: `doufsxqlfjyuvxuezpln`** — Gate 0 bloqueia qualquer uso de `pqpdolkaeqlyzpdpbizo`
   (banco legado). Não alterar `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts`.

3. **Projeto Vercel `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`** — âncora em `.vercel/project.json`. Criar
   novo projeto Vercel cria deploy duplo (incidente 2026-09-15). Não deletar nem sobrescrever.

4. **Tabelas obrigatórias em `types.ts`**: `personalization_techniques`, `products`, `product_variants`,
   `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates`.
   Regen de types sem essas tabelas já causou erros em produção (Gate 1.2 bloqueia).

5. **contexto.yml não usa `SUPABASE_ACCESS_TOKEN` nem `SUPABASE_SERVICE_ROLE_KEY`** — Gate E89.
   O cron de 10 min colidiria com crons privilegiados. Acesso ao banco feito via PG* com sessão
   read-only e URI vazia (`SUPABASE_DB_URL=\'postgresql://\'`).

6. **DDL fora do fluxo de migration proibido** — REGRA #8 do CLAUDE.md. O incidente de 2026-10-13
   (8 `cron.alter_job` via MCP) causou drift silencioso que não foi detectado pelo detector semanal.
   Toda DDL nasce como arquivo em `supabase/migrations/` com header `-- Rollback:`.

7. **Merge em `main` = deploy em produção** — Vercel e Supabase Edge deploiam automaticamente.
   Não mergear sem CI verde (todos os 5 required checks).

8. **Lovable (`gpt-engineer-app[bot]`) commita direto em `main`** — após cada commit do bot,
   rodar `validate-supabase-config.mjs` (Gate 0) e `check-product-type-fields.mjs` (Gate 1.1).

---

## 9. Dúvidas em aberto

| Dúvida | Impacto | Prioridade |
|---|---|---|
| Qual o prazo exato de expiração de orçamento e magazine? | Exibir contagem regressiva correta na UI | Média |
| Existe comissão por venda para o vendedor? Como é calculada? | Implementar dashboard de comissões se existir | Alta |
| Quais são os critérios de qualificação para PromoChampions? | Regras do programa de fidelidade de vendedores | Alta |
| Schemas `analytics`, `supplier_stricker`, `cf_recon`, `prod_audit`, `classification_audit` sem migration de criação — são oficiais? | Risco de drift silencioso se não documentados | Alta |
| Migration `20260716000055_dynamic_explicit_deny_rls_no_policy_tables.sql` não está no ledger (E046) | Drift entre ledger e schema real | Alta — [REQUER-PO] |
| `VERCEL_TOKEN` documentado em SEGREDOS.md mas não configurado como GitHub Secret — `deploy-vercel.yml` existe? | Se existir, deploy Vercel manual está quebrado | Alta |

## B. Quem pode ver/alterar o quê (RLS — conforme migrations do repo; schema real em `06`)

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `quotes_inbound` | quotes_inbound_service_all | ALL | service_role | permissive | `true` | `true` |
| `quotes_inbound` | quotes_inbound_authenticated_read | SELECT | authenticated | permissive | `true` |  |
| `webhook_inbound_dedupe` | webhook_inbound_dedupe_service_all | ALL | service_role | permissive | `true` | `true` |
| `webhook_inbound_log` | webhook_inbound_log_service_all | ALL | service_role | permissive | `true` | `true` |
| `webhook_inbound_log` | webhook_inbound_log_authenticated_read | SELECT | authenticated | permissive | `true` |  |
| `magazine_items` | magazine_items_select_owner_or_org | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND ( m.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role) OR ( m.organization_id IS NOT NULL AND EXISTS ( SELECT 1 FROM public.organization_members om WHERE om.organizatio …` |  |
| `magazine_reader_state` | public_read_own_state | SELECT | anon, authenticated | permissive | `true` |  |
| `magazine_reader_state` | public_upsert_own_state | INSERT | anon, authenticated | permissive |  | `magazine_token IS NOT NULL AND viewer_fingerprint IS NOT NULL AND cardinality(bookmarks) <= 500 AND last_page_index >= 0 AND last_page_index < 10000` |
| `magazine_reader_state` | public_update_own_state | UPDATE | anon, authenticated | permissive | `true` | `cardinality(bookmarks) <= 500 AND last_page_index >= 0 AND last_page_index < 10000` |
| `magazine_items` | magazine_items_via_magazine | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND ( m.owner_id = auth.uid() OR ( m.organization_id IS NOT NULL AND EXISTS ( SELECT 1 FROM public.organization_members om WHERE om.organization_id = m.organization_id AND om.user_id = auth.uid() ) ) ) )` | `EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND m.owner_id = auth.uid() )` |
| `magazine_templates` | magazine_templates_owner_all | ALL | authenticated | permissive | `owner_id = auth.uid()` | `owner_id = auth.uid()` |
| `magazine_templates` | magazine_templates_org_read | SELECT | authenticated | permissive | `shared_in_org = true AND organization_id IS NOT NULL AND EXISTS ( SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.magazine_templates.organization_id AND om.user_id = auth.uid() )` |  |
| `rls_denial_log` | Admins can delete old logs | DELETE | authenticated | permissive | `public.is_admin_strict(auth.uid())` |  |
| `kit_templates` | Admins can delete templates | DELETE | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `kit_templates` | Admins can insert templates | INSERT | authenticated | permissive |  | `public.is_admin(auth.uid())` |
| `permissions` | Admins can manage permissions | ALL | authenticated | permissive | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` |
| `ai_usage_quotas` | Admins can manage quotas | ALL | authenticated | permissive | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` |
| `role_permissions` | Admins can manage role_permissions | ALL | authenticated | permissive | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` |
| `video_variant_links` | Admins can manage video variant links | ALL | authenticated | permissive | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` |
| `custom_kits` | Admins can read all kits | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `login_attempts` | Admins can read all login attempts | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `kit_templates` | Admins can update templates | UPDATE | authenticated | permissive | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` |
| `ai_usage_logs` | Admins can view all AI usage logs | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `voice_command_logs` | Admins can view all voice logs | SELECT | authenticated | permissive | `public.is_manager_or_admin()` |  |
| `inbound_webhook_events` | Admins delete inbound_webhook_events | DELETE | public | permissive | `public.is_admin(auth.uid())` |  |
| `access_security_settings` | Admins e Devs podem atualizar configurações de segurança | UPDATE | authenticated | permissive | `(public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role))` | `(public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role))` |
| `access_security_settings` | Admins e Devs podem visualizar configurações de segurança | SELECT | authenticated | permissive | `(public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role))` |  |
| `audit_logs` | Admins e Devs podem visualizar logs de auditoria | SELECT | authenticated | permissive | `(public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role))` |  |
| `conversation_audit_logs` | Admins e Managers podem ver todos os logs de conversa | SELECT | authenticated | permissive | `(public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))` |  |
| `secret_rotation_log` | Admins insert secret_rotation_log | INSERT | public | permissive |  | `(public.is_admin(auth.uid()) AND (rotated_by = auth.uid()))` |
| `inbound_webhook_endpoints` | Admins manage inbound_webhook_endpoints | ALL | public | permissive | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` |
| `favorite_items` | Admins read all favorite items | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `favorite_lists` | Admins read all favorite lists | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `inbound_webhook_events` | Admins read inbound_webhook_events | SELECT | public | permissive | `public.is_admin(auth.uid())` |  |
| `rls_denial_log` | Admins read rls denials | SELECT | authenticated | permissive | `public.is_supervisor_or_above(auth.uid())` |  |
| `public_token_failures` | Admins read token failures | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `ownership_repair_logs` | Admins/devs read repair logs | SELECT | authenticated | permissive | `(public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role))` |  |
| `category_icons` | Anyone can read category icons | SELECT | public | permissive | `true` |  |
| `query_telemetry` | Authenticated users can insert own telemetry | INSERT | authenticated | permissive |  | `(user_id = auth.uid())` |
| `search_analytics` | Authenticated users can log searches | INSERT | authenticated | permissive |  | `(auth.uid() IS NOT NULL)` |
| `component_media` | Authenticated users can read component media | SELECT | authenticated | permissive | `true` |  |
| `product_components` | Authenticated users can read components | SELECT | authenticated | permissive | `true` |  |
| `product_groups` | Authenticated users can read groups | SELECT | authenticated | permissive | `true` |  |
| `product_group_members` | Authenticated users can read members | SELECT | authenticated | permissive | `true` |  |
| `permissions` | Authenticated users can read permissions | SELECT | authenticated | permissive | `true` |  |
| `ai_usage_quotas` | Authenticated users can read quotas | SELECT | authenticated | permissive | `true` |  |
| `role_permissions` | Authenticated users can read role_permissions | SELECT | authenticated | permissive | `true` |  |
| `video_variant_links` | Authenticated users can read video variant links | SELECT | authenticated | permissive | `true` |  |
| `kit_templates` | Authenticated users can view active templates | SELECT | authenticated | permissive | `((is_active = true) OR public.is_admin(auth.uid()))` |  |
| `product_component_locations` | Authenticated view component locations | SELECT | authenticated | permissive | `true` |  |
| `rls_denial_log` | Block direct insert | INSERT | authenticated | permissive |  | `false` |
| `rls_denial_log` | Block direct update | UPDATE | authenticated | permissive | `false` |  |
| `query_telemetry` | Devs can delete telemetry | DELETE | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `ip_access_control` | Devs can manage ip_access_control | ALL | authenticated | permissive | `public.is_dev(auth.uid())` | `public.is_dev(auth.uid())` |
| `admin_audit_log_old` | Devs can read audit logs | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `bot_detection_log` | Devs can read bot log | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `request_rate_limits` | Devs can read rate limits | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `query_telemetry` | Devs can read telemetry | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `step_up_audit_log` | Devs can view all audit logs | SELECT | public | permissive | `public.is_dev(auth.uid())` |  |
| `connection_test_history` | Devs delete connection_test_history | DELETE | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `external_connections` | Devs manage external_connections | ALL | authenticated | permissive | `public.is_dev(auth.uid())` | `public.is_dev(auth.uid())` |
| `optimization_queue` | Devs manage optimization queue | ALL | authenticated | permissive | `public.is_dev(auth.uid())` | `public.is_dev(auth.uid())` |
| `connection_test_history` | Devs read connection_test_history | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `hardening_health_snapshots` | Devs read hardening snapshots | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `mcp_api_keys` | Devs read mcp_api_keys | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `mcp_full_grantors` | Devs read mcp_full_grantors | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `secret_rotation_log` | Devs read secret_rotation_log | SELECT | authenticated | permissive | `public.is_dev(auth.uid())` |  |
| `conversation_event_history` | Inserção de eventos permitida para o dono da conversa | INSERT | authenticated | permissive |  | `(EXISTS ( SELECT 1 FROM public.conversation_audit_logs WHERE ((conversation_audit_logs.id = conversation_event_history.conversation_id) AND (conversation_audit_logs.user_id = auth.uid()))))` |
| `search_analytics` | Managers and admins can read search analytics | SELECT | authenticated | permissive | `public.is_manager_or_admin()` |  |
| `quote_comments` | Managers can read all comments | SELECT | authenticated | permissive | `public.is_manager_or_admin()` |  |
| `organization_members` | Members can view org members | SELECT | authenticated | permissive | `(organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids))` |  |
| `mcp_api_keys` | No direct delete via JWT | DELETE | authenticated | permissive | `false` |  |
| `mcp_api_keys` | No direct insert via JWT | INSERT | authenticated | permissive |  | `false` |
| `mcp_api_keys` | No direct update via JWT | UPDATE | authenticated | permissive | `false` | `false` |
| `organization_members` | Org owners can delete members | DELETE | authenticated | permissive | `(public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role) OR (user_id = auth.uid()))` |  |
| `organization_members` | Org owners can insert members any role | INSERT | authenticated | permissive |  | `public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role)` |
| `organization_members` | Org owners can update members | UPDATE | authenticated | permissive | `public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role)` | `public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role)` |
| `organizations` | Owners can update their organization | UPDATE | authenticated | permissive | `public.has_org_role(auth.uid(), id, 'owner'::public.org_role)` | `public.has_org_role(auth.uid(), id, 'owner'::public.org_role)` |
| `favorite_items` | Public can read items of shared lists | SELECT | authenticated, anon | permissive | `(EXISTS ( SELECT 1 FROM public.favorite_lists l WHERE ((l.id = favorite_items.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now())))))` |  |
| `favorite_lists` | Public can read shared lists by token | SELECT | authenticated, anon | permissive | `((shared_token IS NOT NULL) AND ((shared_expires_at IS NULL) OR (shared_expires_at > now())))` |  |
| `collection_items` | Public can view items of public collections | SELECT | public | permissive | `(EXISTS ( SELECT 1 FROM public.collections c WHERE ((c.id = collection_items.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now())))))` |  |
| `kit_share_tokens` | Sellers can manage own kit share tokens | ALL | authenticated | permissive | `(seller_id = auth.uid())` | `(seller_id = auth.uid())` |
| `quote_comments` | Sellers can read comments on own quotes | SELECT | authenticated | permissive | `(EXISTS ( SELECT 1 FROM public.quotes q WHERE (((q.id)::text = quote_comments.quote_id) AND (q.seller_id = auth.uid()))))` |  |
| `seller_discount_limits` | Sellers can read own discount limit | SELECT | authenticated | permissive | `(user_id = auth.uid())` |  |
| `request_rate_limits` | Service role can manage rate limits | ALL | service_role | permissive | `true` | `true` |
| `ai_usage_logs` | Service role can update AI usage logs | UPDATE | service_role | permissive | `true` | `true` |
| `ip_access_control` | Service role full access ip_access_control | ALL | service_role | permissive | `true` | `true` |
| `admin_audit_log_old` | Supervisors can insert audit entries | INSERT | authenticated | permissive |  | `public.is_supervisor_or_above(auth.uid())` |
| `seller_discount_limits` | Supervisors can manage all discount limits | ALL | authenticated | permissive | `public.can_approve_discount(auth.uid())` | `public.can_approve_discount(auth.uid())` |
| `user_token_revocations` | Supervisors can manage revocations | ALL | authenticated | permissive | `public.is_supervisor_or_above(auth.uid())` |  |
| `magic_up_comments` | Users can create comments on own Magic Up generations | INSERT | authenticated | permissive |  | `((auth.uid() = user_id) AND (EXISTS ( SELECT 1 FROM public.magic_up_generations g WHERE ((g.id = magic_up_comments.generation_id) AND (g.user_id = auth.uid())))))` |
| `magic_up_brand_kits` | Users can create own Magic Up brand kits | INSERT | authenticated | permissive |  | `(auth.uid() = user_id)` |
| `magic_up_campaigns` | Users can create own Magic Up campaigns | INSERT | authenticated | permissive |  | `(auth.uid() = user_id)` |
| `magic_up_public_shares` | Users can create own Magic Up public shares | INSERT | authenticated | permissive |  | `(auth.uid() = user_id)` |
| `scheduled_reports` | Users can create own scheduled reports | INSERT | authenticated | permissive |  | `(auth.uid() = user_id)` |
| `magic_up_reactions` | Users can create reactions on own Magic Up generations | INSERT | authenticated | permissive |  | `((auth.uid() = user_id) AND (EXISTS ( SELECT 1 FROM public.magic_up_generations g WHERE ((g.id = magic_up_reactions.generation_id) AND (g.user_id = auth.uid())))))` |
| `magic_up_comments` | Users can delete comments on own Magic Up generations | DELETE | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_brand_kits` | Users can delete own Magic Up brand kits | DELETE | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_campaigns` | Users can delete own Magic Up campaigns | DELETE | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_public_shares` | Users can delete own Magic Up public shares | DELETE | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `simulator_wizard_drafts` | Users can delete own drafts | DELETE | authenticated | permissive | `(user_id = auth.uid())` |  |
| `saved_filters` | Users can delete own filters | DELETE | authenticated | permissive | `(user_id = auth.uid())` |  |
| `user_onboarding` | Users can delete own onboarding | DELETE | authenticated | permissive | `(user_id = auth.uid())` |  |
| `scheduled_reports` | Users can delete own scheduled reports | DELETE | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_reactions` | Users can delete reactions on own Magic Up generations | DELETE | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `simulator_wizard_drafts` | Users can insert own drafts | INSERT | authenticated | permissive |  | `(user_id = auth.uid())` |
| `saved_filters` | Users can insert own filters | INSERT | authenticated | permissive |  | `(user_id = auth.uid())` |
| `profiles` | Users can insert own profile | INSERT | authenticated | permissive |  | `(user_id = auth.uid())` |
| `voice_command_logs` | Users can insert own voice logs | INSERT | authenticated | permissive |  | `(auth.uid() = user_id)` |
| `custom_kits` | Users can manage own kits | ALL | authenticated | permissive | `((user_id = auth.uid()) OR public.is_admin(auth.uid()))` | `((user_id = auth.uid()) OR public.is_admin(auth.uid()))` |
| `generated_mockups` | Users can manage own mockups | ALL | authenticated | permissive | `(seller_id = auth.uid())` | `(seller_id = auth.uid())` |
| `follow_up_reminders` | Users can manage own reminders | ALL | authenticated | permissive | `(seller_id = auth.uid())` | `(seller_id = auth.uid())` |
| `cart_templates` | Users can manage own templates | ALL | authenticated | permissive | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `favorites` | Users can manage their own favorites | ALL | public | permissive | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `magic_up_comments` | Users can update comments on own Magic Up generations | UPDATE | authenticated | permissive | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `magic_up_brand_kits` | Users can update own Magic Up brand kits | UPDATE | authenticated | permissive | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `magic_up_campaigns` | Users can update own Magic Up campaigns | UPDATE | authenticated | permissive | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `magic_up_public_shares` | Users can update own Magic Up public shares | UPDATE | authenticated | permissive | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `quote_comments` | Users can update own comments | UPDATE | authenticated | permissive | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `simulator_wizard_drafts` | Users can update own drafts | UPDATE | authenticated | permissive | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `saved_filters` | Users can update own filters | UPDATE | authenticated | permissive | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `scheduled_reports` | Users can update own scheduled reports | UPDATE | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_reactions` | Users can update reactions on own Magic Up generations | UPDATE | authenticated | permissive | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `magic_up_comments` | Users can view comments on own Magic Up generations | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `ai_usage_logs` | Users can view own AI usage logs | SELECT | authenticated | permissive | `(user_id = auth.uid())` |  |
| `magic_up_brand_kits` | Users can view own Magic Up brand kits | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_campaigns` | Users can view own Magic Up campaigns | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_public_shares` | Users can view own Magic Up public shares | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `simulator_wizard_drafts` | Users can view own drafts | SELECT | authenticated | permissive | `(user_id = auth.uid())` |  |
| `saved_filters` | Users can view own filters | SELECT | authenticated | permissive | `(user_id = auth.uid())` |  |
| `user_token_revocations` | Users can view own revocation | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `scheduled_reports` | Users can view own scheduled reports | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `voice_command_logs` | Users can view own voice logs | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `magic_up_reactions` | Users can view reactions on own Magic Up generations | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `mockup_templates` | Users delete own mockup templates | DELETE | public | permissive | `(auth.uid() = user_id)` |  |
| `mockup_templates` | Users insert own mockup templates | INSERT | public | permissive |  | `(auth.uid() = user_id)` |
| `favorite_items` | Users manage own favorite items | ALL | authenticated | permissive | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `favorite_lists` | Users manage own favorite lists | ALL | authenticated | permissive | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `favorite_items_trash` | Users manage own trash | ALL | authenticated | permissive | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `mockup_templates` | Users update own mockup templates | UPDATE | public | permissive | `(auth.uid() = user_id)` |  |
| `mockup_templates` | Users view own mockup templates | SELECT | public | permissive | `(auth.uid() = user_id)` |  |
| `conversation_audit_logs` | Usuários podem criar seus próprios logs de conversa | INSERT | authenticated | permissive |  | `(auth.uid() = user_id)` |
| `conversation_audit_logs` | Usuários podem ver seus próprios logs de conversa | SELECT | authenticated | permissive | `(auth.uid() = user_id)` |  |
| `admin_audit_log_old` | admin_audit_log_select_policy | SELECT | authenticated | permissive | `public.is_supervisor_or_above(auth.uid())` |  |
| `discount_approval_requests` | dar_delete_scope | DELETE | authenticated | permissive | `public.can_view_all_sales()` |  |
| `discount_approval_requests` | dar_insert_scope | INSERT | authenticated | permissive |  | `((seller_id = auth.uid()) OR public.can_view_all_sales())` |
| `discount_approval_requests` | dar_select_scope | SELECT | authenticated | permissive | `(public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role) OR (seller_id = auth.uid()))` |  |
| `discount_approval_requests` | dar_update_scope | UPDATE | authenticated | permissive | `(public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role))` | `(public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role))` |
| `orders` | orders_delete_scope | DELETE | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |  |
| `orders` | orders_insert_scope | INSERT | authenticated | permissive |  | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |
| `orders` | orders_manage_v10 | ALL | authenticated | permissive | `(seller_id = auth.uid())` | `(seller_id = auth.uid())` |
| `orders` | orders_select_scope | SELECT | authenticated | permissive | `(public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))` |  |
| `orders` | orders_update_scope | UPDATE | authenticated | permissive | `(public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))` | `(public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))` |
| `quote_approval_tokens` | qatokens_delete_scope | DELETE | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |  |
| `quote_approval_tokens` | qatokens_insert_scope | INSERT | authenticated | permissive |  | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |
| `quote_approval_tokens` | qatokens_select_scope | SELECT | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |  |
| `quote_approval_tokens` | qatokens_update_scope | UPDATE | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |
| `quote_comments` | qcomments_insert_scope | INSERT | authenticated | permissive |  | `((user_id = auth.uid()) AND (public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE (((q.id)::text = quote_comments.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN …` |
| `quote_templates` | qtemplates_delete_scope | DELETE | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |  |
| `quote_templates` | qtemplates_insert_scope | INSERT | authenticated | permissive |  | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |
| `quote_templates` | qtemplates_select_scope | SELECT | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |  |
| `quote_templates` | qtemplates_update_scope | UPDATE | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |
| `quote_item_personalizations` | quote_item_personalizations_delete_scope | DELETE | public | permissive | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM (public.quote_items qi JOIN public.quotes q ON ((q.id = qi.quote_id))) WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = auth.uid())))))` |  |
| `quote_item_personalizations` | quote_item_personalizations_insert_scope | INSERT | public | permissive |  | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM (public.quote_items qi JOIN public.quotes q ON ((q.id = qi.quote_id))) WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = auth.uid())))))` |
| `quote_item_personalizations` | quote_item_personalizations_select_scope | SELECT | public | permissive | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM (public.quote_items qi JOIN public.quotes q ON ((q.id = qi.quote_id))) WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organizatio …` |  |
| `quote_item_personalizations` | quote_item_personalizations_update_scope | UPDATE | public | permissive | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM (public.quote_items qi JOIN public.quotes q ON ((q.id = qi.quote_id))) WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organizatio …` | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM (public.quote_items qi JOIN public.quotes q ON ((q.id = qi.quote_id))) WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organizatio …` |
| `quote_items` | quote_items_delete_scope | DELETE | public | permissive | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE ((q.id = quote_items.quote_id) AND (q.seller_id = auth.uid())))))` |  |
| `quote_items` | quote_items_insert_scope | INSERT | public | permissive |  | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE ((q.id = quote_items.quote_id) AND (q.seller_id = auth.uid())))))` |
| `quote_items` | quote_items_select_scope | SELECT | public | permissive | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth. …` |  |
| `quote_items` | quote_items_update_scope | UPDATE | public | permissive | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth. …` | `(public.can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth. …` |
| `quotes` | quotes_delete_scope | DELETE | authenticated | permissive | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |  |
| `quotes` | quotes_insert_scope | INSERT | authenticated | permissive |  | `(public.can_view_all_sales() OR (seller_id = auth.uid()))` |
| `webhook_deliveries` | Admins delete webhook_deliveries | DELETE | public | permissive | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `mockup_prompt_history` | Admins insert prompt history | INSERT | public | permissive |  | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `outbound_webhooks` | Admins manage outbound_webhooks | ALL | public | permissive | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `mockup_prompt_configs` | Admins manage prompt configs | ALL | public | permissive | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `webhook_deliveries` | Admins read webhook_deliveries | SELECT | public | permissive | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `mockup_prompt_history` | Admins view prompt history | SELECT | public | permissive | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `commemorative_dates` | Anyone can view active commemorative dates | SELECT | public | permissive | `("is_active" = true)` |  |
| `variant_commemorative_dates` | Anyone can view variant commemorative dates | SELECT | public | permissive | `true` |  |
| `mcp_key_auto_revocations` | Devs can view auto-revocations | SELECT | public | permissive | `"public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `collection_item_reactions` | Service role inserts reactions | INSERT | public | permissive |  | `false` |
| `quote_drafts` | Users can manage own drafts | ALL | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| `user_known_devices` | Users can manage their own devices | ALL | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| `user_search_history` | Users can manage their own search history | ALL | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |
| `geo_allowed_countries` | Users can view allowed countries | SELECT | public | permissive | `true` |  |
| `step_up_audit_log` | Users can view own audit logs | SELECT | public | permissive | `("public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) OR (( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"))` |  |
| `step_up_challenges` | Users can view own challenges | SELECT | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| `step_up_tokens` | Users can view own tokens | SELECT | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| `collection_items_trash` | Users delete own collection trash | DELETE | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| `collection_items_trash` | Users insert own collection trash | INSERT | public | permissive |  | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |
| `user_preferences` | Users insert own preferences | INSERT | public | permissive |  | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |
| `user_preferences` | Users update own preferences | UPDATE | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |
| `collection_items_trash` | Users view own collection trash | SELECT | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| `user_preferences` | Users view own preferences | SELECT | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| `price_history` | admin_read_price_history | SELECT | public | permissive | `("public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'dev'::"public"."app_role") OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'supervisor': …` |  |
| `ai_function_routing` | ai_function_routing_dev_all | ALL | public | permissive | `"public"."is_dev"()` | `"public"."is_dev"()` |
| `ai_models` | ai_models_dev_all | ALL | public | permissive | `"public"."is_dev"()` | `"public"."is_dev"()` |
| `ai_providers` | ai_providers_dev_all | ALL | public | permissive | `"public"."is_dev"()` | `"public"."is_dev"()` |
| `ai_routing_decisions` | ai_routing_decisions_dev_read | SELECT | public | permissive | `("public"."is_dev"() OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'supervisor'::"public"."app_role") OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role"))` |  |
| `ai_usage_logs` | ai_usage_logs_user_own | SELECT | public | permissive | `("public"."is_dev"() OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'supervisor'::"public"."app_role") OR ("user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") A …` |  |
| `attribute_definitions` | attribute_definitions_delete_policy | DELETE | public | permissive | `("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `attribute_definitions` | attribute_definitions_insert_policy | INSERT | public | permissive |  | `("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |
| `attribute_definitions` | attribute_definitions_select_policy | SELECT | public | permissive | `("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `attribute_definitions` | attribute_definitions_update_policy | UPDATE | public | permissive | `("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `attribute_groups` | attribute_groups_delete_policy | DELETE | public | permissive | `("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `attribute_groups` | attribute_groups_insert_policy | INSERT | public | permissive |  | `("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |
| `attribute_groups` | attribute_groups_select_policy | SELECT | public | permissive | `("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `attribute_groups` | attribute_groups_update_policy | UPDATE | public | permissive | `("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `categories` | categories_delete | DELETE | public | permissive | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` |  |
| `categories` | categories_insert | INSERT | public | permissive |  | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` |
| `categories` | categories_update | UPDATE | public | permissive | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` |
| `category_attributes` | category_attributes_follows_category | ALL | public | permissive | `("category_id" IN ( SELECT "categories"."id" FROM "public"."categories" WHERE ("categories"."organization_id" IN ( SELECT "user_organizations"."organization_id" FROM "public"."user_organizations" WHERE ("user_organizations"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))))` |  |
| `category_relationships` | category_relationships_select_org | SELECT | public | permissive | `"public"."user_belongs_to_org"("organization_id")` |  |
| `commemorative_date_colors` | cdc_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `commemorative_date_colors` | cdc_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `commemorative_date_colors` | cdc_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `commemorative_date_colors` | cdc_select | SELECT | public | permissive | `true` |  |
| `commemorative_date_exclusions` | cde_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `commemorative_date_exclusions` | cde_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `commemorative_date_exclusions` | cde_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `commemorative_date_exclusions` | cde_select | SELECT | public | permissive | `true` |  |
| `collection_items` | collection_items_select | SELECT | public | permissive | `((EXISTS ( SELECT 1 FROM "public"."collections" WHERE (("collections"."id" = "collection_items"."collection_id") AND ("collections"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))) OR (EXISTS ( SELECT 1 FROM "public"."collections" "c" WHERE (("c"."id" = "collection_items"."collec …` |  |
| `color_equivalences` | color_equivalences_select_org | SELECT | public | permissive | `"public"."user_belongs_to_org"("organization_id")` |  |
| `commemorative_dates` | commemorative_dates_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `commemorative_dates` | commemorative_dates_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `commemorative_dates` | commemorative_dates_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `material_groups` | material_groups_select_own_org | SELECT | public | permissive | `"public"."user_belongs_to_org"("organization_id")` |  |
| `mockup_credits` | mc_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `mockup_credits` | mc_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `mockup_credits` | mc_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `mcp_full_grantors` | mcp_full_grantors_admin_delete | DELETE | public | permissive | `"public"."is_admin_strict"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `mcp_full_grantors` | mcp_full_grantors_admin_update | UPDATE | public | permissive | `"public"."is_admin_strict"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_strict"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `mcp_full_grantors` | mcp_full_grantors_admin_write | INSERT | public | permissive |  | `"public"."is_admin_strict"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `mockup_templates` | mt_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `mockup_templates` | mt_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `mockup_templates` | mt_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `material_types` | mt_delete | DELETE | public | permissive | `("organization_id" IN ( SELECT "material_types"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `material_types` | mt_insert | INSERT | public | permissive |  | `("organization_id" IN ( SELECT "material_types"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |
| `material_types` | mt_update | UPDATE | public | permissive | `("organization_id" IN ( SELECT "material_types"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `material_variations` | mv_delete | DELETE | public | permissive | `("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `material_variations` | mv_insert | INSERT | public | permissive |  | `("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |
| `material_variations` | mv_select | SELECT | public | permissive | `("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `material_variations` | mv_update | UPDATE | public | permissive | `("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))` |  |
| `notification_templates` | notification_templates_delete | DELETE | public | permissive | `false` |  |
| `notification_templates` | notification_templates_insert | INSERT | public | permissive |  | `false` |
| `notification_templates` | notification_templates_update | UPDATE | public | permissive | `false` |  |
| `order_item_personalizations` | order_item_p_select_scope | SELECT | public | permissive | `(EXISTS ( SELECT 1 FROM ("public"."order_items" "oi" JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id"))) WHERE (("oi"."id" = "order_item_personalizations"."order_item_id") AND (("o"."seller_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) OR "public"."can_view_all_sales"()))))` |  |
| `order_items` | order_items_delete | DELETE | public | permissive | `(EXISTS ( SELECT 1 FROM "public"."orders" "o" WHERE (("o"."id" = "order_items"."order_id") AND "public"."is_org_owner_or_admin"("o"."organization_id"))))` |  |
| `orders` | orders_delete | DELETE | public | permissive | `"public"."is_org_owner_or_admin"("organization_id")` |  |
| `organization_members` | org_members_admin_delete | DELETE | public | permissive | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `organization_members` | org_members_admin_update | UPDATE | public | permissive | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `organizations` | org_select_members | SELECT | public | permissive | `(EXISTS ( SELECT 1 FROM "public"."user_organizations" "uo" WHERE (("uo"."organization_id" = "organizations"."id") AND ("uo"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")))))` |  |
| `ownership_audit_reports` | ownership_audit_reports_admin_delete | DELETE | public | permissive | `("public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'dev'::"public"."app_role"))` |  |
| `ownership_audit_reports` | ownership_audit_reports_admin_insert | INSERT | public | permissive |  | `("public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'dev'::"public"."app_role"))` |
| `permissions` | permissions_dev_delete | DELETE | public | permissive | `"public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `permissions` | permissions_dev_insert | INSERT | public | permissive |  | `"public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `permissions` | permissions_dev_update | UPDATE | public | permissive | `"public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `product_category_assignments` | product_category_assignments_select_org | SELECT | public | permissive | `(EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_category_assignments"."product_id") AND ("p"."organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE ("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))))` |  |
| `product_customization_prices` | product_customization_prices_read_all | SELECT | public | permissive | `true` |  |
| `product_faqs` | product_faqs_public_read | SELECT | public | permissive | `("is_active" = true)` |  |
| `product_images` | product_images_delete | DELETE | public | permissive | `(EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_images"."product_id") AND ("p"."organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::" …` |  |
| `product_included_packagings` | product_included_packagings_public_read | SELECT | public | permissive | `true` |  |
| `product_kit_components` | product_kit_components_delete | DELETE | public | permissive | `(EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_kit_components"."kit_product_id") AND "public"."is_org_owner_or_admin"("p"."organization_id"))))` |  |
| `product_packaging_compatibility` | product_packaging_compatibility_public_read | SELECT | public | permissive | `true` |  |
| `product_packaging` | product_packaging_read_all | SELECT | public | permissive | `true` |  |
| `product_print_positions` | product_print_positions_read_all | SELECT | public | permissive | `true` |  |
| `product_relationships` | product_relationships_public_read | SELECT | public | permissive | `true` |  |
| `product_variants` | product_variants_delete | DELETE | public | permissive | `(EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_variants"."product_id") AND ("p"."organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner': …` |  |
| `product_videos` | product_videos_delete | DELETE | public | permissive | `(EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_videos"."product_id") AND "public"."is_org_owner_or_admin"("p"."organization_id"))))` |  |
| `product_videos` | product_videos_select | SELECT | public | permissive | `(("is_active" = true) OR (( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") IS NOT NULL))` |  |
| `products` | products_delete | DELETE | public | permissive | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` |  |
| `products` | products_insert | INSERT | public | permissive |  | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` |
| `products` | products_update | UPDATE | public | permissive | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` | `("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("uo"."role" = ANY (ARRAY['owner'::"public"."org_role", 'admin'::"public"."org_role"])))))` |
| `product_similarity_groups` | psg_public_read | SELECT | public | permissive | `true` |  |
| `product_similarity_group_members` | psgm_public_read | SELECT | public | permissive | `true` |  |
| `personalization_techniques` | pt_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `personalization_techniques` | pt_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `personalization_techniques` | pt_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `ramo_atividade` | ra_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `ramo_atividade` | ra_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `ramo_atividade` | ra_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `ramo_atividade_filho` | raf_admin_delete | DELETE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `ramo_atividade_filho` | raf_admin_insert | INSERT | public | permissive |  | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `ramo_atividade_filho` | raf_admin_update | UPDATE | public | permissive | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` | `"public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `binding_colors` | ref_select_public | SELECT | public | permissive | `true` |  |
| `binding_types` | ref_select_public | SELECT | public | permissive | `true` |  |
| `cover_finishes` | ref_select_public | SELECT | public | permissive | `true` |  |
| `cover_materials` | ref_select_public | SELECT | public | permissive | `true` |  |
| `cover_types` | ref_select_public | SELECT | public | permissive | `true` |  |
| `notebook_features` | ref_select_public | SELECT | public | permissive | `true` |  |
| `paper_colors` | ref_select_public | SELECT | public | permissive | `true` |  |
| `paper_formats` | ref_select_public | SELECT | public | permissive | `true` |  |
| `paper_rulings` | ref_select_public | SELECT | public | permissive | `true` |  |
| `paper_weights` | ref_select_public | SELECT | public | permissive | `true` |  |
| `product_notebook_features` | ref_select_public | SELECT | public | permissive | `true` |  |
| `product_notebook_specs` | ref_select_public | SELECT | public | permissive | `true` |  |
| `user_token_revocations` | revocations_supervisor_delete | DELETE | public | permissive | `"public"."is_supervisor_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |  |
| `user_token_revocations` | revocations_supervisor_insert | INSERT | public | permissive |  | `"public"."is_supervisor_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))` |
| `saved_filters` | saved_filters_delete | DELETE | public | permissive | `(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")` |  |
| … +497 linhas — lista completa em `context.json` | | | | | | |

## C. Restrições de dados (obrigatório / único / default / CHECK / FK / calculada)

| Tabela | Coluna | Regra |
|---|---|---|
| `optimization_queue` | `id` | PK; default gen_random_uuid() |
| `optimization_queue` | `title` | obrigatório |
| `optimization_queue` | `category` | default 'performance' |
| `optimization_queue` | `priority` | default 100 |
| `optimization_queue` | `status` | default 'pending' |
| `optimization_queue` | `created_at` | default now() |
| `optimization_queue` | `updated_at` | default now() |
| `optimization_queue` | `(tabela)` | CONSTRAINT optimization_queue_status_check CHECK (status IN ('pending','running','done','failed','skipped','blocked')) |
| `quotes` | `id` | PK; default gen_random_uuid() |
| `quotes` | `quote_number` | default '' |
| `quotes` | `client_name` | default '' |
| `quotes` | `organization_id` | obrigatório |
| `quotes` | `status` | default 'draft' |
| `quotes` | `subtotal` | default 0 |
| `quotes` | `discount_percent` | default 0 |
| `quotes` | `discount_amount` | default 0 |
| `quotes` | `total` | default 0 |
| `quotes` | `negotiation_markup_percent` | default 0 |
| `quotes` | `real_discount_percent` | default 0 |
| `quotes` | `shipping_cost` | default 0 |
| `categories` | `id` | PK; default gen_random_uuid() |
| `categories` | `name` | obrigatório |
| `categories` | `slug` | obrigatório; único |
| `categories` | `parent_id` | FK → categories.id ON DELETE SET NULL |
| `categories` | `display_order` | default 0 |
| `categories` | `is_active` | default true |
| `categories` | `created_at` | default NOW() |
| `categories` | `updated_at` | default NOW() |
| `categories` | `deleted_at` | default NULL |
| `categories` | `level` | default 1 |
| `categories` | `active` | CALCULADA = is_active |
| `categories` | `(tabela)` | constraint chk_icon_lucide_format CHECK ( icon IS NULL OR (icon ~ '^[A-Z][a-z][a-zA-Z0-9]*$') ) NOT VALID |
| `categories` | `(tabela)` | constraint chk_categories_image_url_format CHECK ( image_url IS NULL OR ( image_url ~ '^https://imagedelivery\.net/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$' ) ) |
| `categories` | `(tabela)` | constraint chk_categories_name_not_empty CHECK (name !~ E'^[[:space:]]*$') |
| `categories` | `(tabela)` | constraint chk_categories_slug_not_empty CHECK (slug !~ E'^[[:space:]]*$') |
| `category_ancestors` | `descendant_id` | obrigatório; FK → categories.id |
| `category_ancestors` | `ancestor_id` | obrigatório; FK → categories.id |
| `category_ancestors` | `depth` | default 1 |
| `category_ancestors` | `(tabela)` | PRIMARY KEY (descendant_id, ancestor_id) |
| `category_ancestors` | `(tabela)` | constraint category_ancestors_ancestor_id_fkey FOREIGN KEY (ancestor_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT category_ancestors_descendant_id_fkey FOREIGN KEY (descendant_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE |
| `product_category_assignments` | `id` | default "gen_random_uuid"() |
| `product_category_assignments` | `product_id` | obrigatório; FK → products.id ON DELETE CASCADE |
| `product_category_assignments` | `category_id` | obrigatório; FK → categories.id ON DELETE CASCADE |
| `product_category_assignments` | `is_primary` | default false |
| `product_category_assignments` | `display_order` | default 0 |
| `product_category_assignments` | `created_at` | default "now"() |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_pkey PRIMARY KEY ("id") |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_product_id_category_id_key UNIQUE ("product_id", "category_id") |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_category_id_fkey FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_product_id_fkey FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_pkey PRIMARY KEY ("id") |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_product_id_category_id_key UNIQUE ("product_id", "category_id") |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_category_id_fkey FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE |
| `product_category_assignments` | `(tabela)` | constraint product_category_assignments_product_id_fkey FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE |
| `products` | `id` | PK; default gen_random_uuid() |
| `products` | `is_active` | default true |
| `magazines` | `id` | PK; default gen_random_uuid() |
| `magazines` | `owner_id` | obrigatório; FK → users.id |
| `magazines` | `title` | default 'Nova |
| `magazines` | `subtitle` | default ''; CHECK char_length(subtitle) <= 300 |
| `magazines` | `template_id` | default 'editorial-vogue' |
| `magazines` | `branding` | default '{}'::JSONB |
| `magazines` | `content_settings` | default '{}'::JSONB |
| `magazines` | `status` | default 'draft' |
| `magazines` | `view_count` | default 0 |
| `magazines` | `created_at` | default now() |
| `magazines` | `updated_at` | default now() |
| `discount_approval_requests` | `id` | PK; default gen_random_uuid() |
| `discount_approval_requests` | `quote_id` | obrigatório |
| `discount_approval_requests` | `status` | obrigatório |
| `discount_approval_requests` | `requested_discount_percent` | obrigatório |
| `custom_kits` | `id` | PK; default gen_random_uuid() |
| `custom_kits` | `user_id` | obrigatório |
| `custom_kits` | `name` | default 'Kit |
| `custom_kits` | `status` | default 'draft' |
| `custom_kits` | `box_data` | default NULL |
| `custom_kits` | `items_data` | default '[]'::jsonb |
| `custom_kits` | `personalization_data` | default '{}'::jsonb |
| `custom_kits` | `kit_quantity` | default 1 |
| `custom_kits` | `box_price` | default 0 |
| `custom_kits` | `items_price` | default 0 |
| `custom_kits` | `personalization_price` | default 0 |
| `custom_kits` | `total_price` | default 0 |
| `custom_kits` | `volume_usage_percent` | default 0 |
| `custom_kits` | `created_at` | default now() |
| `custom_kits` | `updated_at` | default now() |
| `custom_kits` | `kit_type` | default 'montado' |
| `custom_kits` | `color` | default '#3B82F6' |
| `custom_kits` | `revision` | default 0 |
| `material_groups` | `id` | default "gen_random_uuid"() |
| `material_groups` | `organization_id` | obrigatório; FK → organizations.id ON DELETE CASCADE |
| `material_groups` | `name` | obrigatório |
| `material_groups` | `slug` | obrigatório |
| `material_groups` | `sort_order` | default 100 |
| `material_groups` | `is_active` | default true |
| `material_groups` | `created_at` | default "now"() |
| `material_groups` | `updated_at` | default "now"() |
| `material_groups` | `(tabela)` | CONSTRAINT "check_sort_order_positive_mg" CHECK (("sort_order" >= 0)) |
| `material_groups` | `(tabela)` | constraint material_groups_organization_id_name_key UNIQUE ("organization_id", "name") |
| `material_groups` | `(tabela)` | constraint material_groups_organization_id_slug_key UNIQUE ("organization_id", "slug") |
| `material_groups` | `(tabela)` | constraint material_groups_pkey PRIMARY KEY ("id") |
| `material_groups` | `(tabela)` | constraint material_groups_organization_id_fkey FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE |
| `material_groups` | `(tabela)` | constraint material_groups_organization_id_name_key UNIQUE ("organization_id", "name") |
| `material_groups` | `(tabela)` | constraint material_groups_organization_id_slug_key UNIQUE ("organization_id", "slug") |
| `material_groups` | `(tabela)` | constraint material_groups_pkey PRIMARY KEY ("id") |
| `material_groups` | `(tabela)` | constraint material_groups_organization_id_fkey FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE |
| `material_groups` | `(tabela)` | constraint material_groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE |
| `material_types` | `id` | default "gen_random_uuid"() |
| `material_types` | `organization_id` | obrigatório; FK → organizations.id ON DELETE CASCADE |
| `material_types` | `group_id` | obrigatório; FK → material_groups.id ON DELETE CASCADE |
| `material_types` | `name` | obrigatório |
| `material_types` | `slug` | obrigatório |
| `material_types` | `properties` | default '{}'::"jsonb" |
| `material_types` | `display_order` | default 0 |
| `material_types` | `is_active` | default true |
| `material_types` | `created_at` | default "now"() |
| `material_types` | `updated_at` | default "now"() |
| `material_types` | `(tabela)` | constraint material_types_organization_id_slug_key UNIQUE ("organization_id", "slug") |
| `material_types` | `(tabela)` | constraint material_types_pkey PRIMARY KEY ("id") |
| `material_types` | `(tabela)` | constraint material_types_group_id_fkey FOREIGN KEY ("group_id") REFERENCES "public"."material_groups"("id") ON DELETE CASCADE |
| `material_types` | `(tabela)` | constraint material_types_organization_id_fkey FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE |
| `material_types` | `(tabela)` | constraint material_types_organization_id_slug_key UNIQUE ("organization_id", "slug") |
| `material_types` | `(tabela)` | constraint material_types_pkey PRIMARY KEY ("id") |
| `material_types` | `(tabela)` | constraint material_types_group_id_fkey FOREIGN KEY ("group_id") REFERENCES "public"."material_groups"("id") ON DELETE CASCADE |
| `material_types` | `(tabela)` | constraint material_types_organization_id_fkey FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE |
| `product_materials` | `id` | default "gen_random_uuid"() |
| `product_materials` | `organization_id` | obrigatório |
| `product_materials` | `product_id` | obrigatório; FK → products.id ON DELETE CASCADE |
| `product_materials` | `material_id` | obrigatório; FK → material_types.id ON DELETE CASCADE |
| `product_materials` | `sort_order` | default 100 |
| `product_materials` | `created_at` | default "now"() |
| `product_materials` | `updated_at` | default "now"() |
| `product_materials` | `is_active` | default true |
| `product_materials` | `(tabela)` | CONSTRAINT "product_materials_percentage_check" CHECK ((("percentage" IS NULL) OR (("percentage" >= (0)::numeric) AND ("percentage" <= (100)::numeric)))) |
| `product_materials` | `(tabela)` | constraint product_materials_pkey PRIMARY KEY ("id") |
| `product_materials` | `(tabela)` | constraint product_materials_product_material_unique UNIQUE ("product_id", "material_id") |
| `product_materials` | `(tabela)` | constraint product_materials_material_id_fkey FOREIGN KEY ("material_id") REFERENCES "public"."material_types"("id") ON DELETE CASCADE |
| `product_materials` | `(tabela)` | constraint product_materials_product_id_fkey FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE |
| `product_materials` | `(tabela)` | constraint product_materials_pkey PRIMARY KEY ("id") |
| `product_materials` | `(tabela)` | constraint product_materials_product_material_unique UNIQUE ("product_id", "material_id") |
| `product_materials` | `(tabela)` | constraint product_materials_material_id_fkey FOREIGN KEY ("material_id") REFERENCES "public"."material_types"("id") ON DELETE CASCADE |
| `product_materials` | `(tabela)` | constraint product_materials_product_id_fkey FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE |
| `quotes_inbound` | `quote_id` | PK |
| `quotes_inbound` | `raw_payload` | obrigatório |
| `quotes_inbound` | `received_at` | default now() |
| `quotes_inbound` | `updated_at` | default now() |
| `webhook_inbound_dedupe` | `correlation_key` | PK |
| `webhook_inbound_dedupe` | `event` | obrigatório |
| `webhook_inbound_dedupe` | `source` | default 'promogifts' |
| `webhook_inbound_dedupe` | `first_seen_at` | default now() |
| `webhook_inbound_dedupe` | `hit_count` | default 1 |
| `webhook_inbound_log` | `id` | PK; default gen_random_uuid() |
| `webhook_inbound_log` | `received_at` | default now() |
| `webhook_inbound_log` | `source` | default 'promogifts' |
| `webhook_inbound_log` | `outcome` | obrigatório |
| `webhook_inbound_log` | `http_status` | obrigatório |
| `crm_callback_events` | `id` | PK; default gen_random_uuid() |
| `crm_callback_events` | `external_quote_id` | obrigatório |
| `crm_callback_events` | `event_type` | obrigatório |
| `crm_callback_events` | `occurred_at` | obrigatório |
| `crm_callback_events` | `result` | default 'applied' |
| `crm_callback_events` | `payload` | default '{}' |
| `crm_callback_events` | `created_at` | default NOW() |
| `crm_callback_events` | `updated_at` | default NOW() |
| `crm_callback_events` | `(tabela)` | constraint chk_crm_callback_events_event_type CHECK (event_type IN ('approved','rejected','order_created','sent_to_client','expired')) |
| `crm_callback_events` | `(tabela)` | constraint chk_crm_callback_events_result CHECK (result IN ('applied', 'error', 'duplicate_ignored')) |
| `magazine_items` | `id` | PK; default gen_random_uuid() |
| `magazine_items` | `magazine_id` | obrigatório; FK → magazines.id ON DELETE CASCADE |
| `magazine_items` | `product_id` | obrigatório |
| `magazine_items` | `position` | default 0 |
| `magazine_items` | `product_snapshot` | obrigatório |
| `magazine_items` | `overrides` | default '{}'::JSONB |
| `magazine_items` | `created_at` | default now() |
| `magazine_items` | `updated_at` | default now() |
| `magazine_items` | `(tabela)` | CONSTRAINT magazine_items_position_unique UNIQUE (magazine_id, position) DEFERRABLE INITIALLY DEFERRED |
| `magazine_items` | `(tabela)` | UNIQUE (magazine_id, product_id) |
| `magazine_reader_state` | `id` | default "gen_random_uuid"() |
| `magazine_reader_state` | `magazine_token_hash` | obrigatório |
| `magazine_reader_state` | `viewer_fingerprint` | obrigatório |
| `magazine_reader_state` | `last_page_index` | default 0 |
| `magazine_reader_state` | `bookmarks` | default '{}'::integer[] |
| `magazine_reader_state` | `user_id` | FK → users.id ON DELETE SET NULL |
| `magazine_reader_state` | `created_at` | default "now"() |
| `magazine_reader_state` | `updated_at` | default "now"() |
| `magazine_reader_state` | `(tabela)` | CONSTRAINT "reader_state_bookmarks_len" CHECK (("cardinality"("bookmarks") <= 500)) |
| `magazine_reader_state` | `(tabela)` | CONSTRAINT "reader_state_page_range" CHECK ((("last_page_index" >= 0) AND ("last_page_index" <= 9999))) |
| `magazine_reader_state` | `(tabela)` | constraint magazine_reader_state_magazine_token_hash_viewer_fingerprin_key UNIQUE ("magazine_token_hash", "viewer_fingerprint") |
| `magazine_reader_state` | `(tabela)` | constraint magazine_reader_state_pkey PRIMARY KEY ("id") |
| `magazine_reader_state` | `(tabela)` | constraint magazine_reader_state_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL |
| `magazine_templates` | `id` | default "gen_random_uuid"() |
| `magazine_templates` | `owner_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `magazine_templates` | `organization_id` | FK → organizations.id ON DELETE SET NULL |
| `magazine_templates` | `name` | obrigatório |
| `magazine_templates` | `template_id` | obrigatório; FK → magazine_templates_catalog.template_id |
| `magazine_templates` | `content_settings` | default '{}'::"jsonb" |
| `magazine_templates` | `branding` | default '{}'::"jsonb" |
| `magazine_templates` | `shared_in_org` | default false |
| `magazine_templates` | `created_at` | default "now"() |
| `magazine_templates` | `updated_at` | default "now"() |
| `magazine_templates` | `(tabela)` | CONSTRAINT "magazine_templates_name_check" CHECK (("char_length"("name") <= 120)) |
| `magazine_templates` | `(tabela)` | constraint magazine_templates_pkey PRIMARY KEY ("id") |
| `magazine_templates` | `(tabela)` | constraint magazine_templates_organization_id_fkey FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL |
| `magazine_templates` | `(tabela)` | constraint magazine_templates_owner_id_fkey FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `magazine_templates` | `(tabela)` | constraint magazine_templates_template_id_fkey FOREIGN KEY ("template_id") REFERENCES "public"."magazine_templates_catalog"("template_id") |
| `access_security_settings` | `id` | PK; default gen_random_uuid() |
| `access_security_settings` | `ip_whitelist_enabled` | default false |
| `access_security_settings` | `city_whitelist_enabled` | default false |
| `access_security_settings` | `block_unknown_locations` | default false |
| `access_security_settings` | `max_failed_attempts` | default 5 |
| `access_security_settings` | `lockout_duration_minutes` | default 15 |
| `access_security_settings` | `updated_by` | FK → users.id |
| `access_security_settings` | `updated_at` | default now() |
| `access_security_settings` | `strict_access_mode` | default false |
| `admin_audit_log` | `id` | PK; default gen_random_uuid() |
| `admin_audit_log` | `action` | obrigatório |
| `admin_audit_log` | `resource_type` | obrigatório |
| `admin_audit_log` | `details` | default '{}'::jsonb |
| `admin_audit_log` | `created_at` | default now() |
| `admin_audit_log_y2025m12` | `id` | default gen_random_uuid() |
| `admin_audit_log_y2025m12` | `user_id` | obrigatório |
| `admin_audit_log_y2025m12` | `action` | obrigatório |
| `admin_audit_log_y2025m12` | `resource_type` | obrigatório |
| `admin_audit_log_y2025m12` | `created_at` | default now() |
| `admin_audit_log_y2025m12` | `(tabela)` | constraint admin_audit_log_y2025m12_pkey PRIMARY KEY (id, created_at) |
| `admin_audit_log_y2026m01` | `id` | default gen_random_uuid() |
| `admin_audit_log_y2026m01` | `user_id` | obrigatório |
| `admin_audit_log_y2026m01` | `action` | obrigatório |
| `admin_audit_log_y2026m01` | `resource_type` | obrigatório |
| `admin_audit_log_y2026m01` | `created_at` | default now() |
| `admin_audit_log_y2026m01` | `(tabela)` | constraint admin_audit_log_y2026m01_pkey PRIMARY KEY (id, created_at) |
| `admin_audit_log_y2026m02` | `id` | default gen_random_uuid() |
| `admin_audit_log_y2026m02` | `user_id` | obrigatório |
| `admin_audit_log_y2026m02` | `action` | obrigatório |
| `admin_audit_log_y2026m02` | `resource_type` | obrigatório |
| `admin_audit_log_y2026m02` | `created_at` | default now() |
| `admin_audit_log_y2026m02` | `(tabela)` | constraint admin_audit_log_y2026m02_pkey PRIMARY KEY (id, created_at) |
| `admin_audit_log_y2026m03` | `id` | default gen_random_uuid() |
| `admin_audit_log_y2026m03` | `user_id` | obrigatório |
| `admin_audit_log_y2026m03` | `action` | obrigatório |
| `admin_audit_log_y2026m03` | `resource_type` | obrigatório |
| `admin_audit_log_y2026m03` | `created_at` | default now() |
| `admin_audit_log_y2026m03` | `(tabela)` | constraint admin_audit_log_y2026m03_pkey PRIMARY KEY (id, created_at) |
| `admin_audit_log_y2026m04` | `id` | default gen_random_uuid() |
| `admin_audit_log_y2026m04` | `user_id` | obrigatório |
| `admin_audit_log_y2026m04` | `action` | obrigatório |
| `admin_audit_log_y2026m04` | `resource_type` | obrigatório |
| `admin_audit_log_y2026m04` | `created_at` | default now() |
| `admin_audit_log_y2026m04` | `(tabela)` | constraint admin_audit_log_y2026m04_pkey PRIMARY KEY (id, created_at) |
| `admin_audit_log_y2026m05` | `id` | default gen_random_uuid() |
| `admin_audit_log_y2026m05` | `user_id` | obrigatório |
| `admin_audit_log_y2026m05` | `action` | obrigatório |
| `admin_audit_log_y2026m05` | `resource_type` | obrigatório |
| `admin_audit_log_y2026m05` | `created_at` | default now() |
| `admin_audit_log_y2026m05` | `(tabela)` | constraint admin_audit_log_y2026m05_pkey PRIMARY KEY (id, created_at) |
| `admin_audit_log_y2026m06` | `id` | default gen_random_uuid() |
| `admin_audit_log_y2026m06` | `user_id` | obrigatório |
| `admin_audit_log_y2026m06` | `action` | obrigatório |
| `admin_audit_log_y2026m06` | `resource_type` | obrigatório |
| `admin_audit_log_y2026m06` | `created_at` | default now() |
| `admin_audit_log_y2026m06` | `(tabela)` | constraint admin_audit_log_y2026m06_pkey PRIMARY KEY (id, created_at) |
| `admin_settings` | `id` | PK; default gen_random_uuid() |
| `admin_settings` | `key` | obrigatório; único |
| `admin_settings` | `value` | default '{}'::jsonb |
| `admin_settings` | `updated_by` | FK → users.id ON DELETE SET NULL |
| `admin_settings` | `created_at` | default now() |
| `admin_settings` | `updated_at` | default now() |
| `admin_settings` | `(tabela)` | constraint fk_admin_settings_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL |
| `admin_settings` | `(tabela)` | constraint chk_admin_settings_key_not_empty CHECK (trim(key) <> '') |
| `admin_settings` | `(tabela)` | constraint fk_admin_settings_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL |
| `admin_settings` | `(tabela)` | constraint chk_admin_settings_key_not_empty CHECK (trim(key) <> '') |
| `ai_usage_events` | `id` | PK; default gen_random_uuid() |
| `ai_usage_events` | `user_id` | obrigatório |
| `ai_usage_events` | `function_name` | obrigatório |
| `ai_usage_events` | `event_type` | obrigatório |
| `ai_usage_events` | `created_at` | default now() |
| `ai_usage_logs` | `id` | PK; default gen_random_uuid() |
| `ai_usage_logs` | `user_id` | obrigatório |
| `ai_usage_logs` | `function_name` | obrigatório |
| `ai_usage_logs` | `input_tokens` | default 0 |
| `ai_usage_logs` | `output_tokens` | default 0 |
| `ai_usage_logs` | `estimated_cost_usd` | default 0 |
| `ai_usage_logs` | `status` | default 'success' |
| `ai_usage_logs` | `metadata` | default '{}'::jsonb |
| `ai_usage_logs` | `created_at` | default now() |
| `ai_usage_logs` | `updated_at` | default now() |
| `ai_usage_quotas` | `id` | PK; default gen_random_uuid() |
| `ai_usage_quotas` | `role` | obrigatório; único |
| `ai_usage_quotas` | `monthly_limit` | default 100 |
| `ai_usage_quotas` | `is_unlimited` | default false |
| `ai_usage_quotas` | `created_at` | default now() |
| `ai_usage_quotas` | `updated_at` | default now() |
| `app_vitals` | `id` | default gen_random_uuid() |
| `app_vitals` | `metric_name` | obrigatório |
| `app_vitals` | `metric_value` | obrigatório |
| `app_vitals` | `created_at` | default now() |
| `app_vitals` | `(tabela)` | constraint app_vitals_pkey PRIMARY KEY (id) |
| `art_file_attachments` | `id` | PK; default gen_random_uuid() |
| `art_file_attachments` | `user_id` | obrigatório |
| `art_file_attachments` | `file_url` | obrigatório |
| `art_file_attachments` | `file_path` | obrigatório |
| … +3798 linhas — lista completa em `context.json` | | |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
| quotes_inbound_updated_at | BEFORE UPDATE | `quotes_inbound` | `set_updated_at` |  |
| magazine_reader_state_touch | BEFORE UPDATE | `magazine_reader_state` | `tg_magazine_reader_state_touch` |  |
| trg_magazine_public_token | BEFORE INSERT OR UPDATE OF STATUS | `magazines` | `fn_magazine_public_token` |  |
| collections_updated_at | BEFORE UPDATE | `collections` | `set_updated_at` |  |
| favorites_updated_at | BEFORE UPDATE | `favorites` | `set_updated_at` |  |
| tr_generate_order_number | BEFORE INSERT | `orders` | `generate_order_number_v5` |  |
| trg_owner__ai_insights_cache__user_id | BEFORE INSERT | `ai_insights_cache` | `enforce_user_id_owner` |  |
| trg_owner__art_file_attachments__user_id | BEFORE INSERT | `art_file_attachments` | `enforce_user_id_owner` |  |
| trg_owner__collections__user_id | BEFORE INSERT | `collections` | `enforce_user_id_owner` |  |
| trg_owner__custom_kits__user_id | BEFORE INSERT | `custom_kits` | `enforce_user_id_owner` |  |
| trg_owner__discount_approval_requests__seller_id | BEFORE INSERT | `discount_approval_requests` | `enforce_seller_id_owner` |  |
| trg_owner__external_connections__created_by | BEFORE INSERT | `external_connections` | `enforce_created_by_owner` |  |
| trg_owner__favorite_items__user_id | BEFORE INSERT | `favorite_items` | `enforce_user_id_owner` |  |
| trg_owner__favorite_lists__user_id | BEFORE INSERT | `favorite_lists` | `enforce_user_id_owner` |  |
| trg_owner__generated_mockups__seller_id | BEFORE INSERT | `generated_mockups` | `enforce_seller_id_owner` |  |
| trg_owner__inbound_webhook_endpoints__created_by | BEFORE INSERT | `inbound_webhook_endpoints` | `enforce_created_by_owner` |  |
| trg_owner__magic_up_brand_kits__user_id | BEFORE INSERT | `magic_up_brand_kits` | `enforce_user_id_owner` |  |
| trg_owner__magic_up_campaigns__user_id | BEFORE INSERT | `magic_up_campaigns` | `enforce_user_id_owner` |  |
| trg_owner__magic_up_comments__user_id | BEFORE INSERT | `magic_up_comments` | `enforce_user_id_owner` |  |
| trg_owner__magic_up_generations__user_id | BEFORE INSERT | `magic_up_generations` | `enforce_user_id_owner` |  |
| trg_owner__magic_up_public_shares__user_id | BEFORE INSERT | `magic_up_public_shares` | `enforce_user_id_owner` |  |
| trg_owner__magic_up_reactions__user_id | BEFORE INSERT | `magic_up_reactions` | `enforce_user_id_owner` |  |
| trg_owner__mcp_api_keys__created_by | BEFORE INSERT | `mcp_api_keys` | `enforce_created_by_owner` |  |
| trg_owner__mockup_templates__user_id | BEFORE INSERT | `mockup_templates` | `enforce_user_id_owner` |  |
| trg_owner__orders__seller_id | BEFORE INSERT | `orders` | `enforce_seller_id_owner` |  |
| trg_owner__outbound_webhooks__created_by | BEFORE INSERT | `outbound_webhooks` | `enforce_created_by_owner` |  |
| trg_owner__quote_comments__user_id | BEFORE INSERT | `quote_comments` | `enforce_user_id_owner` |  |
| trg_owner__quote_templates__seller_id | BEFORE INSERT | `quote_templates` | `enforce_seller_id_owner` |  |
| trg_owner__quotes__seller_id | BEFORE INSERT | `quotes` | `enforce_seller_id_owner` |  |
| trg_owner__saved_filters__user_id | BEFORE INSERT | `saved_filters` | `enforce_user_id_owner` |  |
| trigger_limit_recently_viewed_products | AFTER INSERT | `recently_viewed_products` | `limit_recently_viewed_products` |  |
| ai_function_routing_updated_at | BEFORE UPDATE | `ai_function_routing` | `tg_ai_providers_set_updated_at` |  |
| ai_models_updated_at | BEFORE UPDATE | `ai_models` | `tg_ai_providers_set_updated_at` |  |
| ai_providers_updated_at | BEFORE UPDATE | `ai_providers` | `tg_ai_providers_set_updated_at` |  |
| handle_updated_at | BEFORE UPDATE | `attribute_definitions` | `moddatetime` |  |
| handle_updated_at | BEFORE UPDATE | `attribute_groups` | `moddatetime` |  |
| handle_updated_at | BEFORE UPDATE | `supplier_attribute_definitions` | `moddatetime` |  |
| limit_user_search_history | AFTER INSERT | `user_search_history` | `cleanup_user_search_history` |  |
| material_groups_updated_at | BEFORE UPDATE | `material_groups` | `update_updated_at_column` |  |
| order_items_recalc_total | AFTER INSERT OR DELETE OR UPDATE | `order_items` | `recalc_order_total` |  |
| product_materials_updated_at | BEFORE UPDATE | `product_materials` | `update_updated_at_column` |  |
| set_audit_fields_material_groups | BEFORE INSERT OR UPDATE | `material_groups` | `set_audit_user_fields` |  |
| set_audit_fields_product_materials | BEFORE INSERT OR UPDATE | `product_materials` | `set_audit_user_fields` |  |
| set_updated_at_product_videos | BEFORE UPDATE | `product_videos` | `trg_video_queue_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `auto_tag_rules` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `b2b_collections` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `categories` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `category_attributes` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `category_colors` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `category_variation_types` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `color_equivalences` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `color_groups` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `color_nuances` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `color_variations` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `commemorative_dates` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `custom_kits` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `included_packaging_print_areas` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `kit_component_print_areas` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `markup_configurations` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `ncm_codes` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `notification_preferences` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `notification_templates` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `order_items` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `orders` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `packaging_types` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `packagings` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `print_area_techniques` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `product_included_packagings` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `product_packaging_compatibility` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `product_packagings` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `product_properties` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `product_target_audiences` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `product_variants` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `products` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `profiles` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `property_definitions` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `push_subscriptions` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `quote_items` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `quote_templates` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `quotes` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `saved_filters` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `supplier_branches` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `supplier_colors` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `supplier_field_mappings` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `supplier_packagings` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `supplier_property_mappings` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `supplier_value_mappings` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `supplier_video_requirements` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `suppliers` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `tabela_preco_gravacao_oficial_faixa` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `tags` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `target_audiences` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `tecnicas_gravacao` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `user_filter_presets` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `variation_types` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `variation_values` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `video_types` | `set_updated_at` |  |
| set_updated_at_trigger | BEFORE UPDATE | `xbz_gallery_staging` | `set_updated_at` |  |
| set_updated_at_video_import_queue | BEFORE UPDATE | `video_import_queue` | `trg_video_queue_updated_at` |  |
| tg_integration_credentials_derive_biu | BEFORE INSERT OR UPDATE | `integration_credentials` | `tg_integration_credentials_derive` |  |
| trg_aa_block_product_deactivation | BEFORE INSERT OR UPDATE | `products` | `fn_block_unauthorized_product_deactivation` |  |
| trg_ai_usage_quotas_updated_at | BEFORE UPDATE | `ai_usage_quotas` | `fn_set_updated_at` |  |
| trg_audit_discount_approval_requests | AFTER INSERT OR DELETE OR UPDATE | `discount_approval_requests` | `fn_audit_row_change` |  |
| trg_audit_gravacao | AFTER INSERT OR DELETE OR UPDATE | `tabela_preco_gravacao_oficial` | `fn_audit_gravacao_changes` |  |
| trg_audit_gravacao_faixa | AFTER INSERT OR DELETE OR UPDATE | `tabela_preco_gravacao_oficial_faixa` | `fn_audit_gravacao_changes` |  |
| trg_audit_orders | AFTER INSERT OR DELETE OR UPDATE | `orders` | `fn_audit_row_change` |  |
| trg_audit_profiles | AFTER INSERT OR DELETE OR UPDATE | `profiles` | `fn_audit_row_change` |  |
| trg_audit_quotes | AFTER INSERT OR DELETE OR UPDATE | `quotes` | `fn_audit_row_change` |  |
| trg_audit_seller_carts | AFTER INSERT OR DELETE OR UPDATE | `seller_carts` | `fn_audit_row_change` |  |
| trg_audit_suppliers | AFTER INSERT OR DELETE OR UPDATE | `suppliers` | `fn_audit_row_change` |  |
| trg_auto_classify_image | BEFORE INSERT | `product_images` | `fn_auto_classify_product_image` |  |
| trg_auto_criar_equivalencia_spot | AFTER INSERT | `supplier_colors` | `fn_auto_criar_equivalencia_spot` |  |
| trg_auto_resolve_variant_color | BEFORE INSERT OR UPDATE | `product_variants` | `fn_auto_vincular_cor_variante` |  |
| trg_auto_same_supplier | BEFORE INSERT OR UPDATE | `product_packaging_compatibility` | `fn_auto_set_same_supplier` |  |
| trg_binding_colors_updated_at | BEFORE UPDATE | `binding_colors` | `fn_update_updated_at` |  |
| trg_binding_types_updated_at | BEFORE UPDATE | `binding_types` | `fn_update_updated_at` |  |
| trg_capture_stock_snapshot | AFTER UPDATE | `variant_supplier_sources` | `fn_capture_stock_snapshot` |  |
| trg_cat_acc_updated | BEFORE UPDATE | `category_accessory_categories` | `fn_update_cat_acc_timestamp` |  |
| trg_cat_comm_updated | BEFORE UPDATE | `category_commemorative_dates` | `fn_update_cat_comm_timestamp` |  |
| trg_cat_tgt_updated | BEFORE UPDATE | `category_target_audiences` | `fn_update_target_aud_timestamp` |  |
| trg_categories_seo_autofill | BEFORE INSERT OR UPDATE | `categories` | `trg_categories_seo_autofill` |  |
| trg_category_copywriting_updated | BEFORE UPDATE | `category_copywriting_config` | `fn_category_copywriting_updated` |  |
| trg_cep_updated_at | BEFORE UPDATE | `company_email_patterns` | `li_update_updated_at` |  |
| trg_classify_registry_updated_at | BEFORE UPDATE | `classify_functions_registry` | `update_classify_registry_updated_at` |  |
| trg_cover_finishes_updated_at | BEFORE UPDATE | `cover_finishes` | `fn_update_updated_at` |  |
| trg_cover_materials_updated_at | BEFORE UPDATE | `cover_materials` | `fn_update_updated_at` |  |
| trg_cover_types_updated_at | BEFORE UPDATE | `cover_types` | `fn_update_updated_at` |  |
| trg_custom_kits_sync_user_id | BEFORE INSERT OR UPDATE | `custom_kits` | `fn_custom_kits_sync_user_id` |  |
| trg_dar_enforce_seller_id | BEFORE INSERT | `discount_approval_requests` | `fn_dar_enforce_seller_id` |  |
| trg_dar_set_snapshot_hash | BEFORE INSERT | `discount_approval_requests` | `fn_dar_set_snapshot_hash` |  |
| trg_dar_updated_at | BEFORE UPDATE | `discount_approval_requests` | `fn_set_updated_at` |  |
| trg_derive_similarity_on_member_insert | AFTER INSERT | `product_similarity_group_members` | `fn_derive_similarity_pairs_on_insert` |  |
| trg_ec_updated_at | BEFORE UPDATE | `enriched_contacts` | `li_update_updated_at` |  |
| trg_fi_soft_delete | BEFORE DELETE | `favorite_items` | `fn_favorite_items_soft_delete` |  |
| trg_fi_updated_at | BEFORE UPDATE | `favorite_items` | `fn_set_updated_at` |  |
| trg_fl_updated_at | BEFORE UPDATE | `favorite_lists` | `fn_set_updated_at` |  |
| trg_gerar_nome_variante | BEFORE INSERT | `product_variants` | `gerar_nome_variante` |  |
| trg_gm_update_job_progress | AFTER INSERT | `generated_mockups` | `update_mockup_job_progress` |  |
| trg_gm_updated_at | BEFORE UPDATE | `generated_mockups` | `fn_set_updated_at` |  |
| trg_grant_default_role | AFTER INSERT | `profiles` | `fn_grant_default_role_on_profile` |  |
| trg_image_types_updated_at | BEFORE UPDATE | `image_types` | `update_timestamp_column` |  |
| trg_inbound_webhook_endpoints_updated_at | BEFORE UPDATE | `inbound_webhook_endpoints` | `fn_set_updated_at` |  |
| trg_integration_credentials_updated_at | BEFORE UPDATE | `integration_credentials` | `fn_set_updated_at` |  |
| trg_kcer_updated_at | BEFORE UPDATE | `kit_component_enrichment_raw` | `set_updated_at` |  |
| trg_kcpad_updated_at | BEFORE UPDATE | `kit_component_padronizacao` | `set_updated_at` |  |
| trg_kct_updated_at | BEFORE UPDATE | `kit_component_types` | `fn_update_timestamp` |  |
| trg_kit_component_inherit_personalization | BEFORE INSERT | `product_kit_components` | `fn_kit_component_inherit_personalization` |  |
| trg_log_price_change | AFTER UPDATE | `product_variants` | `fn_log_price_change` |  |
| trg_magazine_templates_updated_at | BEFORE UPDATE | `magazine_templates` | `update_updated_at_column` |  |
| trg_mal_set_token | BEFORE INSERT | `mockup_approval_links` | `set_mockup_approval_token` |  |
| trg_mal_updated_at | BEFORE UPDATE | `mockup_approval_links` | `fn_set_updated_at` |  |
| trg_mc_updated_at | BEFORE UPDATE | `mockup_credits` | `fn_set_updated_at` |  |
| trg_mgj_increment_template_usage | AFTER INSERT | `mockup_generation_jobs` | `increment_mockup_template_usage` |  |
| trg_mgj_updated_at | BEFORE UPDATE | `mockup_generation_jobs` | `fn_set_updated_at` |  |
| trg_mt_updated_at | BEFORE UPDATE | `mockup_templates` | `fn_set_updated_at` |  |
| trg_notebook_features_updated_at | BEFORE UPDATE | `notebook_features` | `fn_update_updated_at` |  |
| trg_order_items_calc_subtotal | BEFORE INSERT OR UPDATE | `order_items` | `fn_order_items_calc_subtotal` |  |
| trg_orders_gen_number | BEFORE INSERT | `orders` | `generate_order_number_v5` |  |
| trg_orders_sync_seller | BEFORE INSERT OR UPDATE | `orders` | `fn_orders_sync_seller` |  |
| trg_orders_version | BEFORE UPDATE | `orders` | `increment_row_version` |  |
| trg_owner__cart_templates__user_id | BEFORE INSERT | `cart_templates` | `enforce_user_id_owner` |  |
| trg_owner__expert_conversations__seller_id | BEFORE INSERT | `expert_conversations` | `enforce_seller_id_owner` |  |
| trg_owner__follow_up_reminders__seller_id | BEFORE INSERT | `follow_up_reminders` | `enforce_seller_id_owner` |  |
| trg_owner__kit_share_tokens__seller_id | BEFORE INSERT | `kit_share_tokens` | `enforce_seller_id_owner` |  |
| trg_owner__mockup_drafts__user_id | BEFORE INSERT | `mockup_drafts` | `enforce_user_id_owner` |  |
| trg_owner__quote_approval_tokens__seller_id | BEFORE INSERT | `quote_approval_tokens` | `enforce_seller_id_owner` |  |
| trg_owner__saved_trends_views__user_id | BEFORE INSERT | `saved_trends_views` | `enforce_user_id_owner` |  |
| trg_owner__scheduled_reports__user_id | BEFORE INSERT | `scheduled_reports` | `enforce_user_id_owner` |  |
| trg_owner__seller_carts__seller_id | BEFORE INSERT | `seller_carts` | `enforce_seller_id_owner` |  |
| trg_paper_colors_updated_at | BEFORE UPDATE | `paper_colors` | `fn_update_updated_at` |  |
| trg_paper_formats_updated_at | BEFORE UPDATE | `paper_formats` | `fn_update_updated_at` |  |
| trg_paper_rulings_updated_at | BEFORE UPDATE | `paper_rulings` | `fn_update_updated_at` |  |
| trg_paper_weights_updated_at | BEFORE UPDATE | `paper_weights` | `fn_update_updated_at` |  |
| trg_pca_sync_products_count | AFTER INSERT OR DELETE OR UPDATE | `product_category_assignments` | `fn_trigger_sync_pca_products_count` |  |
| trg_pipeline_steps_updated_at | BEFORE UPDATE | `import_pipeline_steps` | `fn_pipeline_steps_updated_at` |  |
| trg_pkc_auto_enrich_status | BEFORE INSERT OR UPDATE | `product_kit_components` | `fn_pkc_auto_enrich_status` |  |
| trg_prod_comm_updated | BEFORE UPDATE | `product_commemorative_dates` | `fn_update_prod_comm_timestamp` |  |
| trg_prod_tgt_updated | BEFORE UPDATE | `product_target_audiences` | `fn_update_target_aud_timestamp` |  |
| trg_product_faqs_updated | BEFORE UPDATE | `product_faqs` | `trg_product_faqs_updated_at` |  |
| trg_product_images_seo_autofill | BEFORE INSERT OR UPDATE | `product_images` | `trg_product_images_seo_autofill` |  |
| trg_product_images_updated | BEFORE UPDATE | `product_images` | `fn_update_timestamp` |  |
| trg_product_status_sync_category_count | AFTER UPDATE | `products` | `fn_trigger_product_status_sync_category_count` |  |
| trg_product_views_delete | AFTER DELETE | `product_views` | `fn_sync_product_view_count` |  |
| trg_product_views_insert | AFTER INSERT | `product_views` | `fn_sync_product_view_count` |  |
| trg_pt_updated_at | BEFORE UPDATE | `personalization_techniques` | `fn_set_updated_at` |  |
| trg_qa_alert_activate_without_image | BEFORE UPDATE | `products` | `fn_qa_alert_on_activate_without_image` |  |
| trg_qip_parent_immutable | BEFORE INSERT OR DELETE OR UPDATE | `quote_item_personalizations` | `fn_quote_children_enforce_parent_immutability` |  |
| trg_qip_propagate | AFTER INSERT OR DELETE OR UPDATE | `quote_item_personalizations` | `fn_qip_propagate_to_quote_items` |  |
| trg_qip_updated_at | BEFORE UPDATE | `quote_item_personalizations` | `fn_set_updated_at` |  |
| trg_quote_items_parent_immutable | BEFORE INSERT OR DELETE OR UPDATE | `quote_items` | `fn_quote_children_enforce_parent_immutability` |  |
| trg_quotes_immutability | BEFORE UPDATE | `quotes` | `fn_quotes_enforce_immutability` |  |
| trg_quotes_recalc_from_items | AFTER INSERT OR DELETE OR UPDATE | `quote_items` | `fn_quotes_recalc_subtotal_from_items` |  |
| trg_quotes_sync_seller | BEFORE INSERT OR UPDATE | `quotes` | `fn_quotes_sync_seller` |  |
| trg_quotes_validate_discount | BEFORE INSERT OR UPDATE | `quotes` | `fn_quotes_validate_discount` |  |
| trg_reader_state_updated_at | BEFORE UPDATE | `magazine_reader_state` | `update_updated_at_column` |  |
| trg_reader_state_validate | BEFORE INSERT OR UPDATE | `magazine_reader_state` | `tg_reader_state_validate` |  |
| trg_remove_similarity_on_member_delete | AFTER DELETE | `product_similarity_group_members` | `fn_remove_similarity_pairs_on_delete` |  |
| trg_sdl_updated_at | BEFORE UPDATE | `seller_discount_limits` | `fn_set_updated_at` |  |
| trg_seller_cart_items_updated_at | BEFORE UPDATE | `seller_cart_items` | `update_updated_at_column` |  |
| trg_seller_carts_updated_at | BEFORE UPDATE | `seller_carts` | `update_updated_at_column` |  |
| trg_set_product_defaults | BEFORE INSERT OR UPDATE | `products` | `set_product_defaults_from_supplier` |  |
| trg_single_primary_video | BEFORE INSERT OR UPDATE | `product_videos` | `ensure_single_primary_video` | `("new"."is_primary" = true)` |
| trg_supplier_settings_updated_at | BEFORE UPDATE | `supplier_settings` | `update_supplier_settings_timestamp` |  |
| trg_sync_category_assignment | AFTER UPDATE | `products` | `fn_trg_sync_category_assignment` |  |
| trg_sync_dimensions_display | BEFORE INSERT OR UPDATE | `produtos_padronizacao` | `fn_sync_dimensions_display` |  |
| trg_sync_dimensions_display_gold | BEFORE INSERT OR UPDATE | `products` | `fn_sync_dimensions_display` |  |
| trg_sync_product_deactivation_to_similarity | AFTER UPDATE | `products` | `fn_sync_product_deactivation_to_similarity` |  |
| trg_sync_product_images | AFTER INSERT OR DELETE | `product_images` | `fn_sync_product_images_to_products` |  |
| trg_sync_product_images_update | AFTER UPDATE | `product_images` | `fn_sync_product_images_to_products` |  |
| trg_sync_product_status_fields | BEFORE UPDATE | `products` | `fn_trigger_sync_product_status_fields` |  |
| trg_tabela_preco_gravacao_updated_at | BEFORE UPDATE | `tabela_preco_gravacao_oficial` | `update_updated_at_column` |  |
| trg_target_aud_updated | BEFORE UPDATE | `target_audiences` | `fn_update_target_aud_timestamp` |  |
| trg_track_price_updated_products | BEFORE UPDATE | `products` | `fn_trigger_track_price_updated_products` |  |
| trg_track_price_updated_vss | BEFORE UPDATE | `variant_supplier_sources` | `fn_trigger_track_price_updated_vss` |  |
| trg_update_tag_usage_count | AFTER INSERT OR DELETE | `product_tags` | `trg_fn_update_tag_usage_count` |  |
| trg_user_orgs_owner_guard | BEFORE DELETE OR UPDATE | `user_organizations` | `prevent_removing_last_owner` |  |
| trg_user_orgs_updated_at | BEFORE UPDATE | `user_organizations` | `set_updated_at` |  |
| trg_validate_member_supplier | BEFORE INSERT OR UPDATE | `product_similarity_group_members` | `fn_validate_member_supplier` |  |
| trg_validate_packaging_type | BEFORE INSERT OR UPDATE | `product_packaging_compatibility` | `fn_validate_packaging_type_on_compat` |  |
| trg_validate_video_on_insert | AFTER INSERT | `product_videos` | `fn_validate_video_on_change` |  |
| trg_variant_automation | AFTER INSERT | `product_variants` | `fn_trigger_variant_automation` |  |
| trg_vss_updated_at | BEFORE UPDATE | `variant_supplier_sources` | `trg_fn_set_updated_at` |  |
| trigger_auto_increment_display_order | BEFORE INSERT | `product_kit_components` | `auto_increment_display_order` |  |
| trigger_limit_recently_viewed | AFTER INSERT OR UPDATE | `recently_viewed_products` | `limit_recently_viewed_items` |  |
| trigger_update_children_count | AFTER INSERT OR DELETE OR UPDATE | `categories` | `update_parent_children_count` |  |
| update_delivery_status_updated_at | BEFORE UPDATE | `conversation_delivery_status` | `update_updated_at_column` |  |
| update_material_equivalences_updated_at | BEFORE UPDATE | `material_equivalences` | `update_updated_at_column` |  |
| update_material_types_updated_at | BEFORE UPDATE | `material_types` | `update_updated_at_column` |  |
| update_material_variations_updated_at | BEFORE UPDATE | `material_variations` | `update_updated_at_column` |  |
| update_product_kit_components_updated_at | BEFORE UPDATE | `product_kit_components` | `update_updated_at_column` |  |
| update_ramo_atividade_filho_updated_at | BEFORE UPDATE | `ramo_atividade_filho` | `update_updated_at_column` |  |
| update_ramo_atividade_updated_at | BEFORE UPDATE | `ramo_atividade` | `update_updated_at_column` |  |
| update_supplier_materials_updated_at | BEFORE UPDATE | `supplier_materials` | `update_updated_at_column` |  |
| update_user_search_history_updated_at | BEFORE UPDATE | `user_search_history` | `update_updated_at_column` |  |
| validate_percentages_before_insert | BEFORE INSERT | `product_materials` | `validate_material_percentages` |  |
| validate_percentages_before_update | BEFORE UPDATE | `product_materials` | `validate_material_percentages` |  |
| trigger_saved_filters_updated_at | BEFORE UPDATE | `saved_filters` | `update_saved_filters_updated_at` |  |
| trigger_single_default_filter | BEFORE INSERT OR UPDATE OF IS_DEFAULT | `saved_filters` | `ensure_single_default_filter` | `NEW.is_default = true` |
| trigger_create_credit_account | AFTER INSERT | `auth.users` | `create_mockup_credit_account` |  |
| on_auth_user_created | AFTER INSERT | `auth.users` | `handle_new_user` |  |
| update_profiles_updated_at | BEFORE UPDATE | `profiles` | `update_updated_at_column` |  |
| update_bitrix_clients_updated_at | BEFORE UPDATE | `bitrix_clients` | `update_updated_at_column` |  |
| update_quotes_updated_at | BEFORE UPDATE | `quotes` | `update_updated_at_column` |  |
| update_quote_items_updated_at | BEFORE UPDATE | `quote_items` | `update_updated_at_column` |  |
| update_personalization_techniques_updated_at | BEFORE UPDATE | `personalization_techniques` | `update_updated_at_column` |  |
| update_products_updated_at | BEFORE UPDATE | `products` | `update_updated_at_column` |  |
| update_product_components_updated_at | BEFORE UPDATE | `product_components` | `update_updated_at_column` |  |
| update_product_groups_updated_at | BEFORE UPDATE | `product_groups` | `update_updated_at_column` |  |
| update_personalization_simulations_updated_at | BEFORE UPDATE | `personalization_simulations` | `update_updated_at_column` |  |
| update_expert_conversations_updated_at | BEFORE UPDATE | `expert_conversations` | `update_updated_at_column` |  |
| products_search_vector_trigger | BEFORE INSERT OR UPDATE | `products` | `products_generate_search_vector` |  |
| update_seller_gamification_updated_at | BEFORE UPDATE | `seller_gamification` | `update_updated_at_column` |  |
| update_quote_templates_updated_at | BEFORE UPDATE | `quote_templates` | `update_updated_at_column` |  |
| set_order_number | BEFORE INSERT | `orders` | `generate_order_number` |  |
| update_orders_updated_at | BEFORE UPDATE | `orders` | `update_updated_at_column` |  |
| update_sales_goals_updated_at | BEFORE UPDATE | `sales_goals` | `update_updated_at_column` |  |
| update_follow_up_reminders_updated_at | BEFORE UPDATE | `follow_up_reminders` | `update_updated_at_column` |  |
| update_user_onboarding_updated_at | BEFORE UPDATE | `user_onboarding` | `update_updated_at_column` |  |
| audit_quotes | AFTER INSERT OR UPDATE OR DELETE | `quotes` | `audit_trigger_func` |  |
| audit_orders | AFTER INSERT OR UPDATE OR DELETE | `orders` | `audit_trigger_func` |  |
| audit_products | AFTER INSERT OR UPDATE OR DELETE | `products` | `audit_trigger_func` |  |
| audit_bitrix_clients | AFTER INSERT OR UPDATE OR DELETE | `bitrix_clients` | `audit_trigger_func` |  |
| audit_sales_goals | AFTER INSERT OR UPDATE OR DELETE | `sales_goals` | `audit_trigger_func` |  |
| trigger_log_price | AFTER UPDATE | `products` | `log_price_change` |  |
| trigger_invalidate_token | BEFORE UPDATE OF APPROVED | `quote_approval_tokens` | `invalidate_approval_token` | `NEW.approved IS NOT NULL AND OLD.approved IS NULL` |
| update_user_2fa_settings_updated_at | BEFORE UPDATE | `user_2fa_settings` | `update_updated_at_column` |  |
| update_mockup_drafts_updated_at | BEFORE UPDATE | `mockup_drafts` | `update_updated_at_column` |  |
| update_companies_updated_at | BEFORE UPDATE | `companies` | `update_updated_at_column` |  |
| update_company_contacts_updated_at | BEFORE UPDATE | `company_contacts` | `update_updated_at_column` |  |
| update_company_addresses_updated_at | BEFORE UPDATE | `company_addresses` | `update_updated_at_column` |  |
| update_category_icons_updated_at | BEFORE UPDATE | `category_icons` | `update_updated_at_column` |  |
| update_product_novelties_updated_at | BEFORE UPDATE | `product_novelties` | `update_updated_at_column` |  |
| update_future_stock_entries_updated_at | BEFORE UPDATE | `future_stock_entries` | `update_updated_at_column` |  |
| update_simulator_wizard_drafts_updated_at | BEFORE UPDATE | `simulator_wizard_drafts` | `update_updated_at_column` |  |
| update_seller_carts_updated_at | BEFORE UPDATE | `seller_carts` | `update_updated_at_column` |  |
| update_seller_cart_items_updated_at | BEFORE UPDATE | `seller_cart_items` | `update_updated_at_column` |  |
| update_ip_whitelist_updated_at | BEFORE UPDATE | `ip_whitelist` | `update_updated_at_column` |  |
| update_city_whitelist_updated_at | BEFORE UPDATE | `city_whitelist` | `update_updated_at_column` |  |
| update_access_security_settings_updated_at | BEFORE UPDATE | `access_security_settings` | `update_updated_at_column` |  |
| trg_prevent_role_self_update | BEFORE UPDATE | `profiles` | `prevent_role_self_update` |  |
| prevent_profile_role_change_trigger | BEFORE UPDATE | `profiles` | `prevent_profile_role_change` |  |
| trigger_generate_quote_number | BEFORE INSERT | `quotes` | `generate_quote_number` |  |
| trg_generate_secure_approval_token | BEFORE INSERT | `quote_approval_tokens` | `generate_secure_token` |  |
| trg_invalidate_used_approval_token | BEFORE UPDATE | `quote_approval_tokens` | `invalidate_used_approval_token` |  |
| trg_validate_report_email | BEFORE INSERT OR UPDATE | `scheduled_reports` | `validate_scheduled_report_email` |  |
| trg_notify_new_order | AFTER INSERT | `orders` | `notify_new_order` |  |
| trg_notify_quote_client_response | AFTER UPDATE | `quote_approval_tokens` | `notify_quote_client_response` |  |
| update_collections_updated_at | BEFORE UPDATE | `collections` | `update_updated_at_column` |  |
| trg_validate_quote_status | BEFORE INSERT OR UPDATE | `quotes` | `validate_status_fields` |  |
| trg_validate_order_status | BEFORE INSERT OR UPDATE | `orders` | `validate_status_fields` |  |
| trg_validate_kit_status | BEFORE INSERT OR UPDATE | `custom_kits` | `validate_status_fields` |  |
| trg_validate_kit_share_token_status | BEFORE INSERT OR UPDATE | `kit_share_tokens` | `validate_status_fields` |  |
| trg_validate_approval_token_status | BEFORE INSERT OR UPDATE | `quote_approval_tokens` | `validate_status_fields` |  |
| update_seller_discount_limits_updated_at | BEFORE UPDATE | `seller_discount_limits` | `update_updated_at_column` |  |
| update_discount_approval_requests_updated_at | BEFORE UPDATE | `discount_approval_requests` | `update_updated_at_column` |  |
| validate_discount_approval_status_trigger | BEFORE INSERT OR UPDATE | `discount_approval_requests` | `validate_discount_approval_status` |  |
| notify_discount_approval_trigger | AFTER INSERT OR UPDATE | `discount_approval_requests` | `notify_discount_approval_request` |  |
| trg_validate_commission_status | BEFORE INSERT OR UPDATE | `commission_entries` | `validate_commission_status` |  |
| update_commission_rules_updated_at | BEFORE UPDATE | `commission_rules` | `update_updated_at_column` |  |
| update_commission_entries_updated_at | BEFORE UPDATE | `commission_entries` | `update_updated_at_column` |  |
| … +179 linhas — lista completa em `context.json` | | | | |

Erros lançados por funções SQL (`RAISE EXCEPTION` = regra de negócio no banco):

| Função | Mensagem | Origem |
|---|---|---|
| `fn_enrich_commercial_xbz` | XBZ nao encontrado | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `fn_extract_dimensions_from_text` | component % not found | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `get_vault_secret` | get_vault_secret: acesso negado (role: %) | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `send_digest_notification` | send_digest_notification: p_user_id não pode ser NULL | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `tg_reader_state_validate` | reader_state: máximo de 500 bookmarks por dispositivo | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `tg_reader_state_validate` | reader_state: last_page_index fora do intervalo permitido (0-9999) | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `broadcast_changes` | function can only be triggered for each row, not for each statement | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `broadcast_changes` | Unexpected operation type: % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `broadcast_changes` | Failed to process the row: % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `check_equality_op` | invalid value for is filter: must be null, true, false, or unknown | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `check_equality_op` | unsupported equality operator: % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | invalid column for filter % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | failed to lookup type for column % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | too many values for `in` filter. Maximum 100 | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | invalid value for is filter: must be null, true, false, or unknown | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | is % filter requires a boolean column, got % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | operator % requires a text-compatible column type, got % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | operator % requires a text-compatible column type, got % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | invalid regular expression for % filter: % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `subscription_check_filters` | invalid column for select % | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `enforce_bucket_name_length` | bucket name "%" is too long (% characters). Max is 100. | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `protect_delete` | Direct deletion from storage tables is not allowed. Use the Storage API instead. | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `http_request` | url argument is missing | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `http_request` | method argument is missing | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `http_request` | method argument % is invalid | `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` |
| `fn_magazine_public_token` | fn_magazine_public_token: falha ao gerar token único após % tentativas | `qa/migrations-draft/_archived/2026-07-15_magazine_public_token_trigger.sql` |
| `calculate_personalization_price` | Tecnica nao disponivel para este produto | `supabase/migrations/20250103070000_complete_catalog_structure.sql` |
| `charge_credits_for_job` | Saldo insuficiente. Necessário: R$ %, Disponível: R$ % | `supabase/migrations/20250103090000_mockup_ai_complete.sql` |
| `prevent_role_self_update` | Only admins can change roles | `supabase/migrations/20260326193116_2c55f931-6722-4778-bff4-71f5b4c39752.sql` |
| `prevent_profile_role_change` | Only admins can change the role field on profiles | `supabase/migrations/20260326193116_2c55f931-6722-4778-bff4-71f5b4c39752.sql` |
| `validate_scheduled_report_email` | email_to must match your registered email address | `supabase/migrations/20260404171222_ce98e80f-4714-4121-9a56-4dedf6e4349a.sql` |
| `validate_discount_approval_status` | Invalid discount approval status: % | `supabase/migrations/20260414193435_871210cd-f0d8-40ee-ae9f-401b4887727f.sql` |
| `validate_commission_status` | Invalid commission status: % | `supabase/migrations/20260416153503_5163f0f9-e6f0-4664-9f53-8cdb24d9150e.sql` |
| `validate_ip_access_control` | Invalid list_type: must be allow or block | `supabase/migrations/20260416184056_e28ea309-c50d-46b1-85e5-9e283352d97d.sql` |
| `validate_status_fields` | Invalid quote status: % | `supabase/migrations/20260417002650_32b39205-15c0-414a-806d-a6559212727d.sql` |
| `validate_status_fields` | Invalid order status: % | `supabase/migrations/20260417002650_32b39205-15c0-414a-806d-a6559212727d.sql` |
| `validate_status_fields` | Invalid fulfillment status: % | `supabase/migrations/20260417002650_32b39205-15c0-414a-806d-a6559212727d.sql` |
| `validate_status_fields` | Invalid kit status: % | `supabase/migrations/20260417002650_32b39205-15c0-414a-806d-a6559212727d.sql` |
| `validate_status_fields` | Invalid token status: % | `supabase/migrations/20260417002650_32b39205-15c0-414a-806d-a6559212727d.sql` |
| `validate_status_fields` | Invalid approval token status: % | `supabase/migrations/20260417002650_32b39205-15c0-414a-806d-a6559212727d.sql` |
| `get_web_vitals_regression` | Access denied | `supabase/migrations/20260417115234_fc88065c-9498-42e5-8acd-a10b991168fa.sql` |
| `get_web_vitals_summary` | Access denied: admin only | `supabase/migrations/20260417170750_40444ea3-f73b-48ab-b056-23f1624bef26.sql` |
| `increment_kit_template_usage` | Authentication required | `supabase/migrations/20260418183756_107f80f6-c724-4ce3-a61f-d3b256419118.sql` |
| `check_hardening_status` | Admin only | `supabase/migrations/20260419120255_fabedf0c-c79b-4592-90a7-7a95419763c1.sql` |
| `validate_secret_rotation_action_type` | Invalid action_type: must be set or rotate | `supabase/migrations/20260423163018_48a8bc1a-aa05-4f86-b4d2-c667c918ccbc.sql` |
| `set_connections_auto_test_interval` | forbidden: admin role required | `supabase/migrations/20260423184705_66fc9fa5-418b-4da9-af3e-f876550a4499.sql` |
| `set_connections_auto_test_interval` | invalid interval: must be one of 5, 10, 15, 30, 60, 120, 240 minutes | `supabase/migrations/20260423184705_66fc9fa5-418b-4da9-af3e-f876550a4499.sql` |
| `set_connections_auto_test_interval` | cron job connections-auto-test not found | `supabase/migrations/20260423184705_66fc9fa5-418b-4da9-af3e-f876550a4499.sql` |
| `set_connection_failure_window_minutes` | forbidden: admin role required | `supabase/migrations/20260423185624_0cc97b9f-b1ba-469a-914d-6ac6422b584d.sql` |
| `set_connection_failure_window_minutes` | invalid window: must be one of 0, 15, 30, 60, 120, 240 minutes | `supabase/migrations/20260423185624_0cc97b9f-b1ba-469a-914d-6ac6422b584d.sql` |
| `get_auto_test_job_status` | forbidden: admin role required | `supabase/migrations/20260423190831_794cb398-e9f7-4572-b089-46170a6da8c4.sql` |
| `request_step_up_challenge` | unauthorized: no session | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `request_step_up_challenge` | forbidden: dev role required | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `request_step_up_challenge` | rate_limited: too many step-up requests | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `verify_step_up_otp` | unauthorized | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `verify_step_up_otp` | invalid_or_expired_challenge | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `verify_step_up_otp` | password_not_verified_first | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `verify_step_up_otp` | max_attempts_exceeded | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `verify_step_up_otp` | invalid_otp | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` |
| `log_full_scope_grant` | unauthorized | `supabase/migrations/20260425212807_54b0bb33-1b1f-47d7-a5d3-4409ca43bf80.sql` |
| `guard_mcp_api_keys_writes` | Direct writes to mcp_api_keys are not allowed | `supabase/migrations/20260425214848_66d5769e-6e89-4d0d-b49b-c44d1dd2285b.sql` |
| `auto_revoke_orphan_full_keys` | invalid source: % | `supabase/migrations/20260426122751_c0bc82e4-dc78-47da-8da4-74691b181d3d.sql` |
| `execute_role_migration_batch` | forbidden: only admin can execute role migration batches | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | invalid items: expected non-empty jsonb array | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | label is required | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | reason is required (min 5 chars) | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | invalid operation: % | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `_rls_test_as` | forbidden | `supabase/migrations/20260426130639_eb1f50ad-de51-4942-95a7-e7f8b03f59d8.sql` |
| `log_rls_denial` | unauthenticated | `supabase/migrations/20260426131442_16ccbfea-d95c-4715-9650-8fa00b4709e7.sql` |
| `log_rls_denial` | invalid_operation | `supabase/migrations/20260426131442_16ccbfea-d95c-4715-9650-8fa00b4709e7.sql` |
| `enforce_seller_id_owner` | Não autorizado: seller_id (%) difere do usuário autenticado (%). | `supabase/migrations/20260426135521_227101ce-6c81-415d-9006-5c0f8545fc74.sql` |
| `enforce_user_id_owner` | Não autorizado: user_id (%) difere do usuário autenticado (%). | `supabase/migrations/20260426135521_227101ce-6c81-415d-9006-5c0f8545fc74.sql` |
| `enforce_created_by_owner` | Não autorizado: created_by (%) difere do usuário autenticado (%). | `supabase/migrations/20260426135521_227101ce-6c81-415d-9006-5c0f8545fc74.sql` |
| `audit_rls_matrix` | audit_rls_matrix: acesso negado | `supabase/migrations/20260426142609_139bf928-30ad-4935-97d4-dffcb46d9f05.sql` |
| `repair_ownership_orphans` | repair_ownership_orphans: acesso negado | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `repair_ownership_orphans` | repair_ownership_orphans: nenhum relatório encontrado | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `get_app_health_summary` | forbidden | `supabase/migrations/20260427143410_881dc2e9-21c1-43d6-9609-d11b9fa60876.sql` |
| `lookup_request_id` | forbidden | `supabase/migrations/20260427143410_881dc2e9-21c1-43d6-9609-d11b9fa60876.sql` |
| `lookup_request_id` | invalid_request_id | `supabase/migrations/20260427143410_881dc2e9-21c1-43d6-9609-d11b9fa60876.sql` |
| `block_ip_temp` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `calculate_category_hierarchy` | Parent category % not found | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `charge_mockup_credits_for_job` | Conta de créditos não encontrada pro user % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `charge_mockup_credits_for_job` | Saldo insuficiente: necessário R$ %, disponível R$ % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `clean_old_audit_logs` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `clear_user_token_revocations` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `complete_xbz_image_import` | Staging record not found: % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `enable_step_up_for_user` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `expert_chat_send_message` | Conversation not found or access denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_adicionar_mapeamento_fornecedor` | Variante de técnica não encontrada: % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_check_preco_minimo_faixa` | Preço unitário (R$ %) abaixo do mínimo da tabela % (R$ %). Para cadastrar este valor, ajuste preco_minimo_unitario na tabela-mãe primeiro ou revise se este preço está correto. | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_import_spot_image` | Filename não reconhecido: % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_quote_children_enforce_parent_immutability` | % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_quotes_enforce_immutability` | % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_quotes_enforce_immutability` | % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_quotes_enforce_immutability` | % | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_set_category_min_quantity` | Categoria com slug "%" não encontrada | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_validate_member_supplier` | Produto % não encontrado na tabela products | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_validate_packaging_type_on_compat` | packaging_id (%) não encontrado em products | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `fn_validate_packaging_type_on_compat` | O produto "%" tem product_type=%, deve ser "packaging" | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `force_logout_all_users` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `force_user_logout` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `grant_mcp_full_to_user` | Permission denied: only admins can grant MCP full to other users | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `ownership_repair` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `prevent_removing_last_owner` | Cannot remove the last owner of the organization | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `prevent_removing_last_owner` | Cannot demote the last owner of the organization | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `reset_user_step_up_state` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `revoke_mcp_full_from_user` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `revoke_user_step_up` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `rotate_mcp_key` | Key not found or access denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `step_up_token_create` | Challenge not verified | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `step_up_user_settings_set` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `store_user_token_revocation` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `toggle_user_step_up` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `trg_validate_allowed_techniques` | Técnica inválida em allowed_technique_ids: %. Valores válidos: consulte tecnicas_gravacao. | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `unblock_ip` | Permission denied | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `vault_delete_secret` | unauthorized: only dev role can delete from vault | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `vault_get_secret` | unauthorized: only dev role can read vault directly. Edge functions bypass via service_role. | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `vault_list_secret_names` | unauthorized: requires supervisor role or above | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `vault_set_secret` | unauthorized: only dev role can write to vault | `supabase/migrations/20260513000000_reconcile_orphan_functions_from_prod.sql` |
| `validate_quote_real_discount` | Vendedor sem limite de desconto cadastrado. Solicite ao administrador o cadastro em seller_discount_limits, ou peca aprovacao para o desconto de %%%. | `supabase/migrations/20260514165252_onda7_validate_quote_real_discount_fail_closed_null.sql` |
| `validate_quote_real_discount` | Desconto real (%%%) excede o limite do vendedor (%%%). Solicite aprovacao antes de salvar. | `supabase/migrations/20260514165252_onda7_validate_quote_real_discount_fail_closed_null.sql` |
| `create_organization_with_owner` | Not authenticated | `supabase/migrations/20260519230000_harden_create_organization_with_owner.sql` |
| `create_organization_with_owner` | Organization name is required | `supabase/migrations/20260519230000_harden_create_organization_with_owner.sql` |
| `create_organization_with_owner` | Organization slug is required | `supabase/migrations/20260519230000_harden_create_organization_with_owner.sql` |
| `create_organization_with_owner` | Limite de % organizações por usuário atingido. Contate suporte para aumentar. | `supabase/migrations/20260519230000_harden_create_organization_with_owner.sql` |
| `create_organization_with_owner` | Slug "%" ja esta em uso. Escolha outro. | `supabase/migrations/20260519230000_harden_create_organization_with_owner.sql` |
| `is_admin_or_above` | forbidden: cannot query role of another user | `supabase/migrations/20260522093521_rls_002_security_definer_hardening.sql` |
| `is_coord_or_above` | forbidden: cannot query role of another user | `supabase/migrations/20260522093521_rls_002_security_definer_hardening.sql` |
| `submit_quote_response` | Invalid response value | `supabase/migrations/20260522113334_lote_a_05_funcoes_quote_token.sql` |
| `start_step_up_challenge` | Nao autenticado | `supabase/migrations/20260522113351_lote_a_06_funcoes_step_up.sql` |
| `verify_step_up_password` | Nao autenticado | `supabase/migrations/20260522113351_lote_a_06_funcoes_step_up.sql` |
| `cron_invoke_edge` | Vault secret % not found | `supabase/migrations/20260522114648_lote_f_04_cron_invoke_edge.sql` |
| `cron_invoke_edge` | Vault secret edge_anon_key not found | `supabase/migrations/20260522114648_lote_f_04_cron_invoke_edge.sql` |
| `fn_trigger_schema_drift_fetch` | lovable_url nao configurado | `supabase/migrations/20260522151608_fase_4_gate_ci_drift_check_sql_native.sql` |
| `fn_trigger_schema_drift_fetch` | lovable_anon_key nao configurado | `supabase/migrations/20260522151608_fase_4_gate_ci_drift_check_sql_native.sql` |
| `enforce_password_reset_rate_limit` | Muitas solicitações de redefinição de senha. Tente novamente mais tarde. | `supabase/migrations/20260524210001_harden_anon_grants_and_password_reset_rate_limit.sql` |
| `get_edge_functions_base_url` | app.edge_functions_base_url invalido: % | `supabase/migrations/20260525113000_runtime_edge_function_base_url.sql` |
| `get_edge_functions_base_url` | Secret EDGE_FUNCTIONS_BASE_URL invalido no vault: % | `supabase/migrations/20260525113000_runtime_edge_function_base_url.sql` |
| `get_edge_functions_base_url` | Base URL das Edge Functions nao configurada. Defina app.edge_functions_base_url ou secret EDGE_FUNCTIONS_BASE_URL. | `supabase/migrations/20260525113000_runtime_edge_function_base_url.sql` |
| `soft_delete_record` | Invalid table name: % | `supabase/migrations/20260604000001_fix_security_definer_search_path.sql` |
| `restore_record` | Invalid table name: % | `supabase/migrations/20260604000001_fix_security_definer_search_path.sql` |
| `permanent_delete_record` | Invalid table name: % | `supabase/migrations/20260604000001_fix_security_definer_search_path.sql` |
| `fn_dryrun_raw_v2` | DRYRUN_ROLLBACK | `supabase/migrations/20260604174413_motor_v2_parity_harness_v3b.sql` |
| `fn_spr_history_purge` | p_keep_months deve ser >= 1 (recebido: %) | `supabase/migrations/20260605101342_fix_silver_safebool_purge_colormatch_dryrun_lockedfields.sql` |
| `fn_process_raw_v2` | Acesso negado: requer perfil admin ou superior | `supabase/migrations/20260605164232_silver_unify_03_redirect_direct_to_gold.sql` |
| `fn_process_asia_stock_pending` | Acesso negado: requer perfil admin ou superior | `supabase/migrations/20260606124338_asia_create_stock_pending_processor.sql` |
| `fn_silver_to_gold` | Silver product % nao encontrado | `supabase/migrations/20260606124749_fn_silver_to_gold_locked_parity_v2.sql` |
| `fn_silver_to_gold` | Silver product % sem nome | `supabase/migrations/20260606124749_fn_silver_to_gold_locked_parity_v2.sql` |
| `fn_import_stock_from_spot` | Fornecedor SPOT/Stricker não encontrado na tabela suppliers | `supabase/migrations/20260606134130_spot_import_stock_close_bronze_lifecycle.sql` |
| `fn_resolve_supplier` | Fornecedor % nao encontrado | `supabase/migrations/20260606142744_fase0_ingestao_bronze_foundation.sql` |
| `fn_resolve_supplier` | Fornecedor % inativo | `supabase/migrations/20260606142744_fase0_ingestao_bronze_foundation.sql` |
| `fn_ingest_bronze_batch` | feed invalido: % | `supabase/migrations/20260606142744_fase0_ingestao_bronze_foundation.sql` |
| `fn_ingest_bronze_batch` | p_items deve ser array jsonb | `supabase/migrations/20260606142744_fase0_ingestao_bronze_foundation.sql` |
| `fn_ingest_colors_batch` | organization_id não encontrado para supplier % | `supabase/migrations/20260606200931_fn_ingest_colors_batch_spot.sql` |
| `fn_ingest_colors_batch` | p_items deve ser array jsonb | `supabase/migrations/20260606200931_fn_ingest_colors_batch_spot.sql` |
| `fn_ingestion_run_open` | feed invalido: % | `supabase/migrations/20260607021829_extend_run_open_customization_options.sql` |
| `fn_ingest_customization_options_batch` | p_items deve ser array jsonb | `supabase/migrations/20260607024118_fix_customization_options_hotspot_extraction.sql` |
| `fn_upsert_asia_wp_batch` | fn_upsert_asia_wp_batch: p_items deve ser array jsonb | `supabase/migrations/20260607113213_asia_wp_batch_v1b_md5_hash.sql` |
| `fn_spot_direct_stock_gold` | fn_spot_direct_stock_gold: p_items deve ser array jsonb | `supabase/migrations/20260607120103_fn_spot_direct_stock_gold.sql` |
| `fn_spot_direct_prices_gold` | fn_spot_direct_prices_gold: p_items deve ser array jsonb | `supabase/migrations/20260607120216_fn_spot_direct_prices_gold.sql` |
| `fn_sync_asia_colors` | organization_id não encontrado para Asia Import | `supabase/migrations/20260607140915_fn_ingest_asia_hg_batch_v2_and_sync_colors.sql` |
| `fn_standardize_supplier` | Acesso negado: requer perfil admin ou superior | `supabase/migrations/20260610121713_p0_quarentena_01_promote_failures_marcam_bronze.sql` |
| `fn_standardize_supplier` | variante_falhou:% | `supabase/migrations/20260610121713_p0_quarentena_01_promote_failures_marcam_bronze.sql` |
| `fn_standardize_supplier` | pai_falhou:% | `supabase/migrations/20260610121713_p0_quarentena_01_promote_failures_marcam_bronze.sql` |
| `fn_ingest_supplier_raw` | fn_ingest_supplier_raw: supplier_id e reference sao obrigatorios | `supabase/migrations/20260610123510_p1_ingest_01_fn_ingest_supplier_raw_reset_condicional.sql` |
| `fn_ingest_supplier_raw` | fn_ingest_supplier_raw: raw deve ser um objeto jsonb | `supabase/migrations/20260610123510_p1_ingest_01_fn_ingest_supplier_raw_reset_condicional.sql` |
| `fn_apply_print_profiles` | Acesso negado: requer perfil admin ou superior | `supabase/migrations/20260611012351_fase9_03_fn_apply_print_profiles.sql` |
| `fn_promote_supplier` | pai_falhou:% | `supabase/migrations/20260611121000_fn_promote_supplier_sweep_orphan_variants.sql` |
| `fn_promote_supplier` | variantes_falharam:% | `supabase/migrations/20260611121000_fn_promote_supplier_sweep_orphan_variants.sql` |
| `fn_promote_supplier` | sweep_falhou:% | `supabase/migrations/20260611121000_fn_promote_supplier_sweep_orphan_variants.sql` |
| `fn_convert_cart_to_quote` | Nao autenticado. | `supabase/migrations/20260614210000_fix_convert_cart_to_quote_organization_id.sql` |
| `fn_convert_cart_to_quote` | Carrinho nao encontrado. | `supabase/migrations/20260614210000_fix_convert_cart_to_quote_organization_id.sql` |
| `fn_convert_cart_to_quote` | Este carrinho nao pertence ao usuario atual. | `supabase/migrations/20260614210000_fix_convert_cart_to_quote_organization_id.sql` |
| `fn_convert_cart_to_quote` | Carrinho vazio - adicione itens antes de gerar o orcamento. | `supabase/migrations/20260614210000_fix_convert_cart_to_quote_organization_id.sql` |
| `fn_convert_cart_to_quote` | Vendedor sem organizacao vinculada - nao e possivel gerar o orcamento. | `supabase/migrations/20260614210000_fix_convert_cart_to_quote_organization_id.sql` |
| `mcp_kv_get` | forbidden | `supabase/migrations/20260616161531_create_mcp_kv_token_store.sql` |
| `mcp_kv_set` | forbidden | `supabase/migrations/20260616161531_create_mcp_kv_token_store.sql` |
| `fn_cf_recon_dispatch` | CF_ACCOUNT_ID/CF_API_TOKEN ausentes no vault | `supabase/migrations/20260616175052_pi_cf_reconciliation_use_cf_api.sql` |
| `mcp_kv_try_lock` | unauthorized | `supabase/migrations/20260616211558_mcp_kv_refresh_lock.sql` |
| `soft_delete_quote` | Orçamento não encontrado ou sem permissão de acesso | `supabase/migrations/20260618102416_quotes_add_cancelled_status.sql` |
| `soft_delete_quote` | Não é possível cancelar um orçamento com status "%". Apenas orçamentos ativos podem ser cancelados. | `supabase/migrations/20260618102416_quotes_add_cancelled_status.sql` |
| `soft_delete_quote` | Sem permissão para cancelar este orçamento | `supabase/migrations/20260618102416_quotes_add_cancelled_status.sql` |
| `convert_quote_to_order` | Sem permissão: apenas o vendedor responsável ou um coordenador pode converter este orçamento | `supabase/migrations/20260618102650_convert_quote_to_order_auth_and_history.sql` |
| `convert_quote_to_order` | Orçamento não encontrado | `supabase/migrations/20260618102650_convert_quote_to_order_auth_and_history.sql` |
| `convert_quote_to_order` | Apenas orçamentos aprovados podem ser convertidos | `supabase/migrations/20260618102650_convert_quote_to_order_auth_and_history.sql` |
| `convert_quote_to_order` | Este orçamento já foi convertido em pedido | `supabase/migrations/20260618102650_convert_quote_to_order_auth_and_history.sql` |
| `fn_set_product_on_sale` | p_expires_at é obrigatório para promoções (constraint chk_on_sale_requires_expires) | `supabase/migrations/20260618173742_fix_secdef_functions_search_path.sql` |
| `fn_set_product_on_sale` | p_expires_at deve ser uma data futura (recebido: %) | `supabase/migrations/20260618173742_fix_secdef_functions_search_path.sql` |
| `fn_set_product_on_sale` | p_discount_pct deve estar entre 0 e 100 (recebido: %) | `supabase/migrations/20260618173742_fix_secdef_functions_search_path.sql` |
| `fn_set_product_on_sale` | Produto % não encontrado | `supabase/migrations/20260618173742_fix_secdef_functions_search_path.sql` |
| `fn_create_quote_v3` | Unauthorized | `supabase/migrations/20260619110000_fix_rpc_bugs_contact_id_clearable_fields_item_columns.sql` |
| `fn_favorite_items_no_archived_list` | cannot_add_to_archived_list | `supabase/migrations/20260620170001_fix_favorites_gaps_11_12.sql` |
| `fn_qa_orcamento_regression` | RBK | `supabase/migrations/20260621212000_fn_qa_orcamento_regression.sql` |
| `fn_qa_orcamento_regression` | RBK | `supabase/migrations/20260621212000_fn_qa_orcamento_regression.sql` |
| `fn_notify_user` | fn_notify_user: authentication required | `supabase/migrations/20260622143055_fix_workspace_notifications_cross_user_insert_regression.sql` |
| `fn_notify_user` | fn_notify_user: target user does not exist | `supabase/migrations/20260622143055_fix_workspace_notifications_cross_user_insert_regression.sql` |
| `fn_notify_user` | fn_notify_user: invalid type % | `supabase/migrations/20260622143055_fix_workspace_notifications_cross_user_insert_regression.sql` |
| `enforce_seller_cart_limit` | Limite de 10 carrinhos por vendedor atingido | `supabase/migrations/20260623111612_9ccac68e-356c-4f1c-96f5-a4399f651f1e.sql` |
| `check_seller_cart_limit` | Limite de 10 carrinhos por vendedor atingido | `supabase/migrations/20260623124424_6d7c15e4-9aba-4f70-8619-f3ba7af1d5c6.sql` |
| `fn_batch_update_cart_item_sort_order` | Não autenticado | `supabase/migrations/20260623130951_cart_batch_sort_order_rpc.sql` |
| `fn_resync_full_path_readable` | Category % not found or parent has no full_path_readable | `supabase/migrations/20260623132323_fix_fn_resync_fpr_subtree_ancestor_chain.sql` |
| `prevent_category_loops` | Self-reference: category % cannot be its own parent | `supabase/migrations/20260623134124_optimize_trigger_prevent_loops_cte_exists.sql` |
| `prevent_category_loops` | Circular reference: category % cannot be its own ancestor (detected in chain of %) | `supabase/migrations/20260623134124_optimize_trigger_prevent_loops_cte_exists.sql` |
| `prevent_category_loops` | Max hierarchy depth (%) exceeded: parent chain already has % levels | `supabase/migrations/20260623134124_optimize_trigger_prevent_loops_cte_exists.sql` |
| `update_quote_transactional` | Orçamento não encontrado: % | `supabase/migrations/20260623141532_fix_quote_rpcs_personalization_cost.sql` |
| `update_quote_transactional` | Conflito de versão: orçamento foi modificado por outro usuário (versão atual: %, versão esperada: %). Recarregue e tente novamente. | `supabase/migrations/20260623141532_fix_quote_rpcs_personalization_cost.sql` |
| `update_quote_transactional` | Orçamento não encontrado: % | `supabase/migrations/20260623141532_fix_quote_rpcs_personalization_cost.sql` |
| `fn_standardize_kit_component` | kit_component_enrichment_raw % não encontrado | `supabase/migrations/20260624135450_kit_silver_item_color_path.sql` |
| `fn_promote_kit_component_padronizacao` | kit_component_padronizacao % não encontrada ou não está approved | `supabase/migrations/20260624135450_kit_silver_item_color_path.sql` |
| `fn_pkc_guard_not_sellable` | component_code % colide com SKU vendável em products | `supabase/migrations/20260624153343_kit_component_identity_guards.sql` |
| `fn_pkc_guard_not_sellable` | component_sku % colide com SKU vendável em products | `supabase/migrations/20260624153343_kit_component_identity_guards.sql` |
| `fn_pkc_freeze_slot` | slot_code é imutável (% -> %) no componente % | `supabase/migrations/20260624153343_kit_component_identity_guards.sql` |
| `fn_kcvs_guard_not_sellable` | component_sku % colide com SKU vendável em products | `supabase/migrations/20260624153509_kit_component_variant_skus_table.sql` |
| `fn_decompose_kit_from_ficha` | kit % nao encontrado | `supabase/migrations/20260624204942_decompose_fn_support_legacy_colorcode.sql` |
| `fn_decompose_kit_from_ficha` | kit % tem % componentes (esperado 1) | `supabase/migrations/20260624204942_decompose_fn_support_legacy_colorcode.sql` |
| `fn_decompose_kit_from_ficha` | internal_code/cor nao extraivel do sku % - defer manual | `supabase/migrations/20260624204942_decompose_fn_support_legacy_colorcode.sql` |
| `fn_kit_from_ficha` | produto % nao encontrado | `supabase/migrations/20260624205955_kit_from_ficha_v2_fixes.sql` |
| `fn_kit_from_ficha` | produto % ja tem % componentes | `supabase/migrations/20260624205955_kit_from_ficha_v2_fixes.sql` |
| `fn_kit_from_ficha` | produto % tem so % pecas reais (<2) | `supabase/migrations/20260624205955_kit_from_ficha_v2_fixes.sql` |
| `fn_dar_enforce_initial_status` | discount_approval_requests deve nascer com status pending (recebido: %) | `supabase/migrations/20260625221758_enforce_dar_initial_status_pending.sql` |
| `fn_dar_check_valid_until_future` | valid_until nao pode estar no passado ao aprovar (recebido: %, hoje: %) | `supabase/migrations/20260626123517_enforce_dar_valid_until_future_on_approval.sql` |
| `fn_dar_forbid_reopen` | discount_approval_requests nao pode retornar para pending a partir de % (re-open proibido; crie nova solicitacao) | `supabase/migrations/20260626123656_forbid_dar_reopen_to_pending.sql` |
| `fn_sync_color_variation_group` | color_variations: group_id(%) <> color_group_id(%) — divergencia bloqueada (fn_sync_color_variation_group) | `supabase/migrations/20260626124627_sync_color_variations_dual_fk_and_notnull.sql` |
| `validate_material_percentages` | Total de percentuais da parte "%" excede 100%% (atual: %, novo: %) | `supabase/migrations/20260626134930_harden_validate_material_percentages_onconflict_safe.sql` |
| `fn_validate_packaging_config_hierarchy` | Hierarquia de folgas invalida (min<tight<good<=max) no(s) perfil(is): % | `supabase/migrations/20260626141721_packaging_robustness_v1.sql` |
| `fn_validate_selected_packaging` | selected_packaging_id % nao referencia produto type=packaging ativo | `supabase/migrations/20260626142542_quote_items_selected_packaging_foundation.sql` |
| `fn_import_stock_xbz` | Fornecedor XBZ nao encontrado | `supabase/migrations/20260626152721_m3_xbz_price_last_verified_honest_passo4_plus_backfill_20260626.sql` |
| `fn_link_images_to_variants_by_synonym` | fn_link_images_to_variants_by_synonym DESATIVADA: matching por codigo (_xbz_codes) e ambiguo e gera mislink de cor (ver migration color_revert_bad_synonym_variant_links / 2026-06). Use fn_color_link_all_suppliers(false) para vinculacao segura. | `supabase/migrations/20260626194642_color_disable_unsafe_synonym_linker.sql` |
| `fn_auto_classify_product_image` | fn_auto_classify: image_types incompleta — tipos essenciais (gallery, main) ausentes. fix_version:anti_uuid_hardcode_20260627 | `supabase/migrations/20260627112657_20260627000006_fix_fn_auto_classify_uuid_max_bug.sql` |
| `fn_pbd_block_system_delete` | Badge de sistema "%" nao pode ser excluida (apenas desabilitada via is_enabled). | `supabase/migrations/20260627140025_create_product_badge_definitions_registry_pbd_v1.sql` |
| `fn_pbd_before_write` | badge_key e imutavel (% -> %) | `supabase/migrations/20260627154718_harden_pbd_before_write_symmetric_is_system_insert_pbd_v1_3.sql` |
| `prevent_non_admin_quote_item_price_change` | Preço unitário (unit_price) não pode ser alterado por este usuário. O preço vem do catálogo e é somente leitura. | `supabase/migrations/20260629142224_7e644177-527b-4b92-93a3-79ffee40ca4a.sql` |
| `enforce_seller_cart_ready_requires_items` | EMPTY_CART: carrinho vazio não pode estar pronto para orçamento | `supabase/migrations/20260710203410_a9a3ddf5-a44e-4b3c-baa4-356225bfbe85.sql` |
| `get_profile_and_roles` | get_profile_and_roles: _user_id cannot be null | `supabase/migrations/20260714121410_fix_auth_hydration_v3_perf_safety.sql` |
| `get_profile_and_roles` | forbidden: cannot query profile of another user | `supabase/migrations/20260714121410_fix_auth_hydration_v3_perf_safety.sql` |
| `restore_seller_cart` | not_authenticated | `supabase/migrations/20260716164056_restore_seller_cart_fn.sql` |
| `restore_seller_cart` | invalid_snapshot | `supabase/migrations/20260716164056_restore_seller_cart_fn.sql` |
| `restore_seller_cart` | seller_mismatch | `supabase/migrations/20260716164056_restore_seller_cart_fn.sql` |
| `assert_quote_discount_integrity` | Vendedor sem limite de desconto cadastrado. | `supabase/migrations/20260829121000_discount_approval_orphan_fail_closed.sql` |
| `assert_quote_discount_integrity` | Orçamento pending_approval não possui solicitação pendente para o snapshot final. | `supabase/migrations/20260829121000_discount_approval_orphan_fail_closed.sql` |
| `assert_quote_discount_integrity` | Snapshot final do orçamento não possui aprovação de desconto válida. | `supabase/migrations/20260829121000_discount_approval_orphan_fail_closed.sql` |
| `request_discount_approval_transactional` | Autenticação obrigatória. | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `request_discount_approval_transactional` | Orçamento não encontrado. | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `request_discount_approval_transactional` | Somente o vendedor responsável ou criador pode solicitar aprovação. | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `request_discount_approval_transactional` | Status do orçamento não permite solicitar aprovação: % | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `request_discount_approval_transactional` | Orçamento sem vendedor responsável. | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `request_discount_approval_transactional` | Vendedor responsável sem limite de desconto cadastrado. | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `request_discount_approval_transactional` | O desconto real não excede a alçada do vendedor responsável. | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `request_discount_approval_transactional` | Já existe solicitação pendente para outro snapshot/percentual/vendedor. | `supabase/migrations/20260829123000_discount_approval_audit_exact_correlation.sql` |
| `fn_run_and_persist_smoke_tests` | not authorized | `supabase/migrations/20260903100000_fix_jwt_dual_read_guard_in_smoke_persist.sql` |
| `fn_anon_insert_rate_guard` | anon_insert_rate_limit_exceeded: % (limite %/min por IP) | `supabase/migrations/20260905033718_audit_r3_anon_insert_rate_guard.sql` |
| `magazine_remove_items_atomic` | magazine_auth_required | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_remove_items_atomic` | magazine_item_ids_invalid | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_remove_items_atomic` | magazine_item_ids_duplicated | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_remove_items_atomic` | magazine_not_found | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_remove_items_atomic` | magazine_forbidden | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_remove_items_atomic` | magazine_not_editable | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_remove_items_atomic` | magazine_edit_conflict | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_remove_items_atomic` | magazine_item_not_found | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_auth_required | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_item_ids_invalid | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_item_ids_duplicated | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_not_found | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_forbidden | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_not_editable | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_edit_conflict | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_reorder_items_atomic` | magazine_reorder_requires_complete_item_set | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `magazine_duplicate_atomic` | magazine_auth_required | `supabase/migrations/20260909190000_magazine_duplicate_remap_page_order.sql` |
| `magazine_duplicate_atomic` | magazine_not_found | `supabase/migrations/20260909190000_magazine_duplicate_remap_page_order.sql` |
| `magazine_duplicate_atomic` | magazine_forbidden | `supabase/migrations/20260909190000_magazine_duplicate_remap_page_order.sql` |
| `magazine_add_items_atomic` | magazine_auth_required | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_items_invalid | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_items_invalid | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_not_found | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_forbidden | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_not_editable | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_edit_conflict | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_items_invalid | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_add_items_atomic` | magazine_item_limit_exceeded | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `magazine_publish_atomic` | magazine_auth_required | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `magazine_publish_atomic` | magazine_not_found | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `magazine_publish_atomic` | magazine_forbidden | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `magazine_publish_atomic` | magazine_publish_token_missing | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `magazine_publish_atomic` | magazine_not_publishable | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `magazine_publish_atomic` | magazine_publish_requirements_not_met | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `magazine_publish_atomic` | magazine_publish_token_missing | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `magazine_update_metadata_atomic` | magazine_auth_required | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_patch_invalid | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_patch_unknown_fields: % | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_title_invalid | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_subtitle_invalid | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_branding_invalid | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_content_invalid | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_page_order_invalid | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_page_order_invalid | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_not_found | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_forbidden | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_update_metadata_atomic` | magazine_not_editable | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `magazine_guard_and_version_v2` | magazine_publish_requires_rpc | `supabase/migrations/20260909200000_magazine_hardening_v2.sql` |
| `magazine_guard_and_version_v2` | magazine_import_marker_forbidden | `supabase/migrations/20260909200000_magazine_hardening_v2.sql` |
| … +124 linhas — lista completa em `context.json` | | |

## E. Estados, máquinas de estado e transições

### E.1 Colunas de status no banco

| Tabela | Coluna | Valores permitidos (enum/CHECK) | Default |
|---|---|---|---|
| `optimization_queue` | `status` | `blocked`, `done`, `failed`, `pending`, `running`, `skipped` | `pending` |
| `optimization_queue` | `guardrail_status` | **livre (sem enum/CHECK)** |  |
| `quotes` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `magazines` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `discount_approval_requests` | `status` | **livre (sem enum/CHECK)** |  |
| `custom_kits` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `quotes_inbound` | `status` | **livre (sem enum/CHECK)** |  |
| `webhook_inbound_log` | `http_status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2025m12` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026m01` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026m02` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026m03` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026m04` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026m05` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026m06` | `status` | **livre (sem enum/CHECK)** |  |
| `ai_usage_logs` | `status` | **livre (sem enum/CHECK)** | `success` |
| `conversation_audit_logs` | `status` | **livre (sem enum/CHECK)** | `active` |
| `conversation_delivery_status` | `status` | **livre (sem enum/CHECK)** | `sent` |
| `e2e_cleanup_audit` | `status` | `auth_failed`, `error`, `forbidden`, `invalid`, `not_found`, `ok`, `partial_error`, `rate_limited`, `started`, `success`, `unauthorized` |  |
| `external_connections` | `status` | `active`, `degraded`, `disabled`, `error`, `unconfigured` | `unconfigured` |
| `external_connections_sync_log` | `status` | **livre (sem enum/CHECK)** | `ok` |
| `magic_up_campaigns` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `magic_up_public_shares` | `status` | **livre (sem enum/CHECK)** | `active` |
| `optimization_queue_runs` | `status` | **livre (sem enum/CHECK)** |  |
| `optimization_queue_runs` | `guardrail_status` | **livre (sem enum/CHECK)** |  |
| `orders` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `orders` | `fulfillment_status` | **livre (sem enum/CHECK)** | `unfulfilled` |
| `product_sync_logs` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `role_migration_batches` | `status` | `pending`, `running`, `completed`, `failed`, `cancelled` | `pending` |
| `role_migration_items` | `status` | `pending`, `success`, `failed`, `skipped` | `pending` |
| `seller_carts` | `status` | `em_separacao`, `pronto_orcamento` | `em_separacao` |
| `simulator_wizard_drafts` | `wizard_step` | **livre (sem enum/CHECK)** | `product` |
| `user_onboarding` | `current_step` | **livre (sem enum/CHECK)** | `0` |
| `webhook_delivery_metrics` | `http_status` | **livre (sem enum/CHECK)** |  |
| `webhook_delivery_metrics_y2026m05` | `http_status` | **livre (sem enum/CHECK)** |  |
| `webhook_delivery_metrics_y2026m06` | `http_status` | **livre (sem enum/CHECK)** |  |
| `variant_supplier_sources` | `sync_status` | **livre (sem enum/CHECK)** | `synced` |
| `variant_supplier_sources` | `supplier_availability_status` | **livre (sem enum/CHECK)** |  |
| `cf_recon.action_log` | `old_status` | **livre (sem enum/CHECK)** |  |
| `cf_recon.action_log` | `new_status` | **livre (sem enum/CHECK)** |  |
| `cf_recon.cf_ghost_check_queue` | `status` | `checked_alive`, `checked_dead`, `error`, `false_positive`, `pending` | `pending` |
| `cf_recon.crawl_run` | `status` | `completed`, `failed`, `partial`, `running` | `running` |
| `cf_recon.remediation` | `status` | `done`, `in_progress`, `open`, `wontfix` | `open` |
| `access_blocked_log` | `state` | **livre (sem enum/CHECK)** |  |
| `ai_enrichment_queue` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `asia_image_import_queue` | `status` | `done`, `error`, `pending`, `skipped`, `uploading` | `pending` |
| `asia_upload_mapping` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `city_whitelist` | `state` | **livre (sem enum/CHECK)** |  |
| `content_articles` | `status` | `archived`, `draft`, `published` | `draft` |
| `enriched_contacts` | `enrichment_status` | `complete`, `enriching`, `failed`, `partial`, `pending` | `pending` |
| `image_backfill_queue` | `status` | `done`, `failed`, `pending`, `processing`, `skipped` | `pending` |
| `import_pipeline_steps` | `fase` | **livre (sem enum/CHECK)** |  |
| `import_pipeline_steps` | `etapa` | **livre (sem enum/CHECK)** |  |
| `import_pipeline_steps` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `ingestion_run_log` | `status` | `aborted_rate_limit`, `failed`, `ok`, `ok_com_erros`, `running` | `running` |
| `kit_component_ficha_staging` | `match_status` | `ambiguous`, `no_component`, `pending`, `promoted`, `skipped` | `pending` |
| `kit_component_padronizacao` | `padronizacao_status` | `approved`, `pending`, `promoted`, `rejected` | `pending` |
| `mockup_generation_jobs` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `notifications` | `delivery_status` | **livre (sem enum/CHECK)** |  |
| `password_reset_requests` | `status` | `approved`, `pending`, `rejected` | `pending` |
| `pipeline_known_issues` | `status` | `fixed`, `in_progress`, `open`, `wont_fix` | `open` |
| `pipeline_run_log` | `status` | **livre (sem enum/CHECK)** | `running` |
| `product_deactivation_requests` | `status` | `approved`, `cancelled`, `executed`, `pending`, `rejected` | `pending` |
| `product_fiscal` | `tax_reference_state` | **livre (sem enum/CHECK)** |  |
| `product_supply` | `sync_status` | **livre (sem enum/CHECK)** |  |
| `product_videos` | `cloudflare_status` | **livre (sem enum/CHECK)** | `pending` |
| `produtos_padronizacao` | `status` | `pending`, `standardized`, `rejected`, `promoted` | `pending` |
| `produtos_padronizacao_variantes` | `status` | `pending`, `standardized`, `rejected`, `promoted` | `pending` |
| `produtos_site_padronizacao` | `status` | `pending`, `standardized`, `rejected`, `promoted` | `pending` |
| `sm_category_pages` | `status` | `done`, `failed`, `partial`, `pending`, `processing` | `pending` |
| `sm_site_url_map` | `search_status` | **livre (sem enum/CHECK)** |  |
| `sm_worker_partitions` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `supplier_products_raw` | `status` | `pending`, `processing`, `processed`, `failed`, `skipped`, `quarantined` | `pending` |
| `supplier_products_raw` | `images_status` | `pending`, `processing`, `processed`, `failed`, `skipped`, `quarantined` | `pending` |
| `supplier_products_raw` | `stock_status` | `pending`, `processing`, `processed`, `failed`, `skipped`, `quarantined` | `pending` |
| `supplier_products_raw` | `site_status` | `pending`, `processing`, `processed`, `failed`, `skipped`, `quarantined` | `pending` |
| `video_validation_log` | `validation_status` | **livre (sem enum/CHECK)** |  |
| `webhook_dispatcher_log` | `quote_status` | **livre (sem enum/CHECK)** |  |
| `webhook_dispatcher_log` | `http_status` | **livre (sem enum/CHECK)** |  |
| `webhook_dispatcher_log` | `delivery_status` | `delivered`, `failed`, `pending`, `timeout` | `pending` |
| `video_import_queue` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `video_sim_results` | `queue_status` | **livre (sem enum/CHECK)** |  |
| `webhook_outbox` | `status` | `dead_letter`, `failed`, `pending`, `processing`, `sent` | `pending` |
| `xbz_upload_mapping` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `supplier_stricker.sync_log` | `status` | **livre (sem enum/CHECK)** | `running` |
| `product_images` | `cf_sync_status` | **livre (sem enum/CHECK)** | `pending` |
| `supplier_customization_raw` | `status` | `pending`, `processing`, `processed`, `failed`, `skipped`, `quarantined` | `pending` |
| `reward_redemptions` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `sync_jobs` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `bitrix_deals` | `stage` | **livre (sem enum/CHECK)** |  |
| `bitrix_sync_logs` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `company_addresses` | `estado` | **livre (sem enum/CHECK)** |  |
| `future_stock_entries` | `status` | `cancelled`, `completed`, `confirmed`, `in_transit`, `partial`, `pending` | `pending` |
| `cotacoes` | `status` | `aguardando_coleta`, `atrasado`, `cancelado`, `contratado`, `cotado`, `em_risco`, `em_transito`, `entregue` | `cotado` |
| `simulation_runs` | `status` | **livre (sem enum/CHECK)** | `running` |
| `quote_approval_tokens` | `status` | **livre (sem enum/CHECK)** | `active` |
| `kit_share_tokens` | `status` | **livre (sem enum/CHECK)** | `active` |
| `_deprecated_silver_products_20260606` | `norm_status` | `raw`, `normalizing`, `normalized`, `validated`, `rejected`, `promoted` | `raw` |
| `_deprecated_silver_variants_20260606` | `norm_status` | `raw`, `normalizing`, `normalized`, `validated`, `rejected`, `promoted` | `raw` |
| `_deprecated_silver_print_areas_20260606` | `norm_status` | `raw`, `normalizing`, `normalized`, `validated`, `rejected`, `promoted` | `raw` |
| `_deprecated_silver_images_queue_20260606` | `img_status` | **livre (sem enum/CHECK)** | `pending` |
| `asia_legacy_upload_queue` | `status` | `done`, `error`, `pending`, `skip_404`, `uploading` | `pending` |

### E.2 Mapas de transição declarados no código

- **WORKFLOW_STATUS_CLASSES** (`src/components/workflows/WorkflowCanvas.tsx`):
  ```ts
  draft: 'bg-muted text-muted-foreground', active: 'bg-primary/10 text-primary', paused: 'bg-warning/10 text-warning',
  ```
- **ALLOWED_FILTER_KEYS** (`src/hooks/stock/stockPagination.ts`):
  ```ts
  products: new Set(['active', 'is_active', 'supplier_id', 'category_id', 'brand']), product_variants: new Set(['is_active', 'product_id', 'color_id', 'supplier_id']), variant_supplier_sources: new Set(['is_active', 'variant_id', 'supplier_id']),
  ```
- **DAR_VALID_TRANSITIONS** (`src/lib/discount-approval-status-config.ts`):
  ```ts
  pending: ['approved', 'rejected'], approved: [], rejected: [], expired: [],
  ```
- **MAGAZINE_VALID_TRANSITIONS** (`src/lib/magazine-status-config.ts`):
  ```ts
  draft: ['published', 'archived'], published: ['draft', 'archived'], archived: ['draft'],
  ```
- **PASSWORD_RESET_VALID_TRANSITIONS** (`src/lib/password-reset-status-config.ts`):
  ```ts
  pending: ['approved', 'rejected'], approved: [], rejected: [],
  ```
- **QUOTE_VALID_TRANSITIONS** (`src/lib/quote-status-config.ts`):
  ```ts
  draft: ['pending', 'pending_approval', 'sent', 'cancelled'], pending_approval: ['draft', 'pending', 'cancelled'], pending: ['draft', 'sent', 'expired', 'cancelled'], sent: ['approved', 'rejected', 'viewed', 'pending', 'expired', 'cancelled'], viewed: ['approved', 'rejected', 'pending', 'expired', 'cancelled'], approved: ['converted'], // committed: DB rejects ->sent/->cancelled (see note above) converted: [], rejected: ['draft', 'sent', 'cancelled'], expired: ['draft', 'pending', 'sent', 'cancelled'], cancelled: [],
  ```

### E.3 Valores de status usados no código (escreve / compara / filtra)

| Campo | Valor | Uso | Onde |
|---|---|---|---|
| `type` | `ADD_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `ADD_TOAST` | compara, escreve | `recovery/src-legacy/src/hooks/use-toast.ts` |
| `type` | `CANCEL_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `CLEAR` | compara, escreve | `src/hooks/simulation/usePositionHistory.ts` |
| `type` | `DISMISS_TOAST` | compara, escreve | `recovery/src-legacy/src/hooks/use-toast.ts` |
| `type` | `DUPLICATE_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `EDIT_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `LOAD_DRAFT` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `PUSH` | compara, escreve | `src/hooks/simulation/usePositionHistory.ts` |
| `type` | `RECALC_PERSONALIZATION_PRICING` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `REDO` | compara, escreve | `src/hooks/simulation/usePositionHistory.ts` |
| `type` | `REMOVE_ALL_PERSONALIZATIONS` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `REMOVE_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `REMOVE_TOAST` | compara, escreve | `recovery/src-legacy/src/hooks/use-toast.ts` |
| `type` | `RESET_WIZARD` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SELECT_COMPARISON` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SELECT_LOCATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SELECT_PRODUCT` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_AVAILABLE_LOCATIONS` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_CALCULATING` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_COMPARISON_RESULTS` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_ERROR` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_QUANTITY` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_STEP` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `START_NEW_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SW_STALE_CHUNK` | compara, escreve | `public/sw.js`<br>`src/lib/sw-register.ts` |
| `type` | `UNDO` | compara, escreve | `src/hooks/simulation/usePositionHistory.ts` |
| `type` | `UPDATE_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `UPDATE_SPECS` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `UPDATE_TOAST` | compara, escreve | `recovery/src-legacy/src/hooks/use-toast.ts` |
| `type` | `__REDO__` | compara, escreve | `src/hooks/simulator/useUndoRedo.ts` |
| `type` | `__UNDO__` | compara, escreve | `src/hooks/simulator/useUndoRedo.ts` |
| `type` | `action` | compara, escreve | `recovery/src-legacy/src/hooks/useContextualSuggestions.ts`<br>`src/components/search/GlobalSearchIdleState.tsx`<br>`src/hooks/intelligence/useContextualSuggestions.ts` |
| `type` | `addProduct` | compara, escreve | `test-hooks-safety.mjs` |
| `type` | `add_position` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `added` | compara | `src/lib/query-config.ts` |
| `type` | `agent` | compara, escreve | `src/components/workflows/WorkflowCanvas.tsx`<br>`src/components/workflows/WorkflowEditDialog.tsx` |
| `type` | `apparel` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `array` | escreve | `src/components/admin/products/bulk-import/StepUpload.tsx`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>`supabase/functions/market-intelligence-insights/index.ts`<br>`supabase/functions/semantic-search/index.ts` |
| `type` | `art_file` | escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `auth_error` | escreve | `tests/p0/_mocks.ts` |
| `type` | `bag` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `base64` | escreve | `supabase/functions/_shared/ai-router/anthropic-native.ts` |
| `type` | `basic` | compara | `public/sw.js` |
| `type` | `best-seller` | compara, escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts`<br>`src/components/products/ProductCard.tsx`<br>`src/hooks/products/useProductIntelligenceBadges.ts`<br>`src/pages/products/product-detail/ProductDetailHero.tsx` |
| `type` | `bitmap` | escreve | `src/types/canvas-confetti.d.ts` |
| `type` | `bitrix24` | compara, escreve | `src/components/admin/connections/SecretField.utils.ts`<br>`supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `boolean` | compara, escreve | `src/lib/telemetry/bridgeCallMetrics.ts`<br>`supabase/functions/voice-agent/systemPrompt.ts` |
| `type` | `bottle` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `bulk` | compara, escreve | `src/components/admin/products/image-gallery/ProductImageGallery.tsx`<br>`src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `type` | `cart_template` | escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `category` | compara, escreve | `recovery/src-legacy/src/hooks/useSearch.ts`<br>`src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>`src/components/search/SmartSearchInput.tsx`<br>`src/components/search/useGlobalSearch.ts`<br>… +3 |
| `type` | `change` | compara, escreve | `src/pages/products/seller-carts/cartViewModePrefs.ts`<br>`src/pages/products/seller-carts/cartViewModeTelemetry.ts` |
| `type` | `childList` | compara | `src/hooks/ui/useScrollLockFix.ts` |
| `type` | `cif` | compara | `src/components/pdf/ProposalHtmlTemplate.tsx` |
| `type` | `class-a` | escreve | `src/hooks/products/useProductIntelligenceBadges.ts` |
| `type` | `clear` | escreve | `src/hooks/intelligence/useVoiceCommandHistory.ts` |
| `type` | `client` | compara, escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `collection` | compara, escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `command` | compara, escreve | `src/components/search/GlobalSearchPalette.tsx`<br>`src/components/search/useGlobalSearch.ts` |
| `type` | `company` | escreve | `recovery/src-legacy/src/pages/ClientsPage.tsx`<br>`src/components/bi/ClientSelector.tsx`<br>`src/components/cart/CartCompanyPicker.tsx`<br>`src/components/quotes/company-contact/CompanySearchDropdown.tsx`<br>`src/pages/clients/ClientsPage.tsx` |
| `type` | `complementary` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `component` | escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `conversation` | compara, escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `critical` | compara, escreve | `recovery/src-legacy/src/hooks/usePushNotifications.tsx`<br>`src/components/inventory/StockAlertDialogs.tsx`<br>`src/hooks/stock/stockAlerts.ts`<br>`src/hooks/ui/usePushNotifications.tsx` |
| `type` | `daily_reset` | escreve | `src/pages/products/seller-carts/cartViewModePrefs.ts` |
| `type` | `declining` | escreve | `src/hooks/products/useProductIntelligenceBadges.ts` |
| `type` | `degraded` | compara, escreve | `recovery/src-legacy/src/lib/external-db/cold-start-recorder.ts`<br>`src/hooks/useBridgeStatusBanner.ts`<br>`src/lib/external-db/bridge-status-events.ts`<br>`src/lib/external-db/invoke.ts` |
| `type` | `dragenter` | compara | `src/components/search/VisualSearchButton.tsx` |
| `type` | `dragleave` | compara | `src/components/search/VisualSearchButton.tsx` |
| `type` | `dragover` | compara | `src/components/search/VisualSearchButton.tsx` |
| `type` | `drinkware` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `email` | escreve | `src/services/authService.ts` |
| `type` | `emergente` | escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `emerging` | escreve | `src/hooks/products/useProductIntelligenceBadges.ts` |
| `type` | `ending-soon` | compara | `src/components/products/ProductStatusBadge.tsx` |
| `type` | `error` | compara, escreve | `src/components/a11y/AriaLive.tsx`<br>`src/components/admin/connections/useIncidentTimeline72h.ts`<br>`src/components/admin/connections/useRecentIncidents.ts`<br>`src/hooks/ui/useWorkspaceNotifications.tsx`<br>`supabase/functions/connections-health-check/index.ts` |
| `type` | `event` | escreve | `src/lib/telemetry/navigationMetrics.ts`<br>`src/utils/performance-budget.ts`<br>`supabase/functions/crm-callback-alerts/index.ts` |
| `type` | `featured` | compara, escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts`<br>`src/components/novelties/NoveltyCards.tsx`<br>`src/components/novelties/NoveltyProductGrid.tsx`<br>`src/components/products/ProductCard.tsx`<br>`src/components/products/ProductListItem.tsx`<br>… +2 |
| `type` | `filter` | compara, escreve | `recovery/src-legacy/src/hooks/useContextualSuggestions.ts`<br>`recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts`<br>`src/components/search/GlobalSearchIdleState.tsx`<br>`src/hooks/intelligence/useContextualSuggestions.ts` |
| `type` | `fob` | compara | `src/components/pdf/ProposalHtmlTemplate.tsx` |
| `type` | `fob_pre` | compara | `src/components/pdf/ProposalHtmlTemplate.tsx` |
| `type` | `frequent-restock` | escreve | `src/hooks/products/useProductIntelligenceBadges.ts` |
| `type` | `function` | escreve | `supabase/functions/_shared/ai-router/openai-bridge.ts`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/generate-product-seo/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>`supabase/functions/kit-identity-suggest/index.ts`<br>… +4 |
| `type` | `general` | compara, escreve | `recovery/src-legacy/src/hooks/useSearch.ts`<br>`src/components/intelligence/RankingFilterToolbar.tsx`<br>`src/components/search/EmptySearchState.tsx`<br>`src/components/search/SmartSearchInput.tsx`<br>`src/components/search/useGlobalSearch.ts`<br>… +1 |
| `type` | `headwear` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `history` | compara, escreve | `recovery/src-legacy/src/hooks/useSearch.ts`<br>`src/components/catalog/CatalogHeader.tsx`<br>`src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>`src/components/search/SmartSearchInput.tsx`<br>… +1 |
| `type` | `hot-item` | compara, escreve | `src/components/products/ProductCard.tsx`<br>`src/hooks/products/useProductIntelligenceBadges.ts`<br>`src/pages/products/product-detail/ProductDetailHero.tsx` |
| `type` | `image` | escreve | `supabase/functions/_shared/ai-router/anthropic-native.ts` |
| `type` | `image_url` | compara, escreve | `supabase/functions/_shared/ai-router/anthropic-native.ts`<br>`supabase/functions/_shared/ai-router/google-genai.ts`<br>`supabase/functions/analyze-logo-colors/index.ts`<br>`supabase/functions/generate-ad-image/index.ts`<br>`supabase/functions/magic-up-score/index.ts`<br>… +1 |
| `type` | `in_app_enabled` | escreve | `src/components/notifications/NotificationPreferences.tsx` |
| `type` | `info` | compara, escreve | `recovery/src-legacy/src/hooks/usePushNotifications.tsx`<br>`recovery/src-legacy/src/hooks/useWorkspaceNotifications.tsx`<br>`src/hooks/bi/useSeasonalPeakNotifications.ts`<br>`src/hooks/ui/usePushNotifications.tsx`<br>`src/lib/access/request-dev-access.ts`<br>… +1 |
| `type` | `json` | escreve | `supabase/functions/cors-audit/index.ts` |
| `type` | `json_object` | escreve | `supabase/functions/word-magic/index.ts` |
| `type` | `json_schema` | compara, escreve | `supabase/functions/_shared/ai-router/openai-bridge.ts`<br>`supabase/functions/_shared/ai-router/openai-compatible.ts` |
| `type` | `kit` | compara, escreve | `src/components/novelties/NoveltyProductGrid.tsx`<br>`src/components/products/ProductCard.tsx`<br>`src/components/products/ProductListItem.tsx`<br>`src/components/products/ProductStatusBadge.tsx`<br>`src/components/search/useGlobalSearch.ts`<br>… +1 |
| `type` | `largest-contentful-paint` | escreve | `src/lib/telemetry/navigationMetrics.ts`<br>`src/utils/performance-budget.ts` |
| `type` | `last-units` | escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts`<br>`src/hooks/products/useProductIntelligenceBadges.ts` |
| `type` | `layout-shift` | escreve | `src/lib/telemetry/navigationMetrics.ts`<br>`src/utils/performance-budget.ts` |
| `type` | `limited-stock` | compara | `src/components/products/ProductStatusBadge.tsx` |
| `type` | `longtask` | escreve | `src/lib/telemetry/navigationMetrics.ts` |
| `type` | `low_stock` | compara, escreve | `src/components/inventory/StockAlertDialogs.tsx`<br>`src/hooks/stock/stockAlerts.ts` |
| `type` | `magic_up` | escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `main` | compara | `src/lib/external-db/products.ts` |
| `type` | `matchAll` | escreve | `tests/sw/sw-harness.ts` |
| `type` | `mcp` | compara, escreve | `src/components/admin/connections/SecretField.utils.ts`<br>`supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `media` | escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `mixed` | compara, escreve | `src/components/search/GlobalSearchPalette.tsx`<br>`src/components/search/useGlobalSearch.ts`<br>`supabase/functions/semantic-search/index.ts` |
| `type` | `mockup` | escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `monthly` | compara, escreve | `recovery/src-legacy/src/hooks/useSalesGoals.ts`<br>`src/hooks/intelligence/useSalesGoals.ts` |
| `type` | `n8n` | compara, escreve | `src/components/admin/connections/SecretField.utils.ts`<br>`supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `navigation` | compara, escreve | `recovery/src-legacy/src/hooks/useContextualSuggestions.ts`<br>`src/components/search/GlobalSearchIdleState.tsx` |
| `type` | `new-arrival` | escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts`<br>`src/hooks/products/useProductIntelligenceBadges.ts` |
| `type` | `normal` | escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `notebook` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `novelty` | compara | `src/components/novelties/NoveltyProductGrid.tsx`<br>`src/components/products/ProductCard.tsx`<br>`src/components/products/ProductListItem.tsx`<br>`src/components/products/ProductStatusBadge.tsx`<br>`src/pages/products/FiltersPage.tsx` |
| `type` | `number` | compara, escreve | `src/components/admin/products/ProductFormFullscreen.tsx`<br>`src/components/admin/products/SupplierFiscalInfo.tsx`<br>`src/lib/telemetry/bridgeCallMetrics.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>`supabase/functions/mcp-server/index.ts`<br>… +1 |
| `type` | `object` | compara, escreve | `src/lib/telemetry/bridgeCallMetrics.ts`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/generate-product-seo/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>`supabase/functions/kit-identity-suggest/index.ts`<br>… +5 |
| `type` | `on-sale` | escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `openWindow` | escreve | `tests/sw/sw-harness.ts` |
| `type` | `order` | escreve | `src/hooks/products/useProductInsights.ts` |
| `type` | `out-of-stock` | compara | `src/components/products/ProductStatusBadge.tsx` |
| `type` | `out_of_stock` | compara, escreve | `src/components/inventory/StockAlertDialogs.tsx`<br>`src/hooks/stock/stockAlerts.ts` |
| `type` | `packaging` | compara | `src/components/products/ProductCard.tsx`<br>`src/components/products/ProductStatusBadge.tsx` |
| `type` | `path` | escreve | `src/types/canvas-confetti.d.ts` |
| `type` | `pen` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `popular` | escreve | `recovery/src-legacy/src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `price_drop` | escreve, filtra | `supabase/functions/comparison-price-watcher/index.ts` |
| `type` | `product` | compara, escreve | `recovery/src-legacy/src/components/command/commandActions.tsx`<br>`recovery/src-legacy/src/hooks/useSearch.ts`<br>`recovery/src-legacy/src/pages/FiltersPage.tsx`<br>`src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>… +5 |
| `type` | `promotion` | compara, escreve | `recovery/src-legacy/src/components/search/SmartSuggestions.tsx`<br>`src/components/novelties/NoveltyProductGrid.tsx`<br>`src/components/products/ProductCard.tsx`<br>`src/components/products/ProductListItem.tsx`<br>`src/components/products/ProductStatusBadge.tsx` |
| `type` | `publish` | compara, escreve | `test-hooks-safety.mjs` |
| `type` | `quantity_tier` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `quarterly` | compara | `recovery/src-legacy/src/hooks/useSalesGoals.ts`<br>`src/hooks/intelligence/useSalesGoals.ts` |
| `type` | `quote` | compara, escreve | `recovery/src-legacy/src/hooks/useProductInsights.ts`<br>`src/components/search/useGlobalSearch.ts`<br>`src/hooks/products/useProductInsights.ts` |
| `type` | `quote_comment` | escreve | `recovery/src-legacy/src/hooks/useQuoteComments.ts` |
| `type` | `react_error_boundary` | escreve | `src/components/errors/EnhancedErrorBoundary.tsx` |
| `type` | `recent` | escreve | `recovery/src-legacy/src/components/search/SmartSuggestions.tsx` |
| `type` | `recommended` | escreve | `recovery/src-legacy/src/components/search/SmartSuggestions.tsx` |
| `type` | `recovered` | compara, escreve | `recovery/src-legacy/src/lib/external-db/bridge-telemetry-client.ts`<br>`recovery/src-legacy/src/lib/external-db/cold-start-recorder.ts`<br>`src/hooks/useBridgeStatusBanner.ts`<br>`src/lib/external-db/bridge-status-events.ts`<br>`src/lib/external-db/invoke.ts` |
| `type` | `recovery` | compara | `recovery/src-legacy/src/pages/ResetPassword.tsx`<br>`src/pages/auth/ResetPassword.tsx` |
| `type` | `related` | escreve | `recovery/src-legacy/src/components/search/SmartSuggestions.tsx` |
| `type` | `removeItem` | compara, escreve | `test-hooks-safety.mjs` |
| `type` | `rotate` | compara, escreve | `src/components/admin/connections/RotationHistoryDialog.tsx` |
| `type` | `search` | compara, escreve | `recovery/src-legacy/src/hooks/useContextualSuggestions.ts`<br>`src/components/search/GlobalSearchIdleState.tsx` |
| `type` | `security` | compara, escreve, filtra | `recovery/src-legacy/src/hooks/usePushNotifications.tsx`<br>`src/components/security/useSecurityData.ts`<br>`src/hooks/ui/usePushNotifications.tsx`<br>`supabase/functions/detect-new-device/index.ts` |
| `type` | `setBranding` | compara, escreve | `test-hooks-safety.mjs` |
| `type` | `setTitle` | compara, escreve | `test-hooks-safety.mjs` |
| `type` | `simulator_error_boundary` | escreve | `src/components/simulator/wizard/SimulatorErrorBoundary.tsx` |
| `type` | `single` | compara, escreve | `src/components/admin/products/image-gallery/ProductImageGallery.tsx` |
| `type` | `solid` | escreve | `src/lib/bi/pptxGenerator.ts` |
| `type` | `spring` | escreve | `recovery/src-legacy/src/pages/CollectionsPage.tsx`<br>`recovery/src-legacy/src/pages/FavoritesPage.tsx`<br>`recovery/src-legacy/src/pages/FiltersPage.tsx`<br>`src/components/admin/connections/RotateSecretConfirmDialog.tsx`<br>`src/components/admin/connections/SaveSecretConfirmDialog.tsx`<br>… +24 |
| `type` | `stockout_predicted` | escreve | `src/hooks/stock/stockAlerts.ts` |
| `type` | `string` | compara, escreve | `src/lib/error-reporter.ts`<br>`src/lib/telemetry/bridgeCallMetrics.ts`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/generate-product-seo/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>… +6 |
| `type` | `success` | escreve | `supabase/functions/collections-watcher/index.ts`<br>`supabase/functions/favorites-watcher/index.ts` |
| `type` | `suggestion` | escreve | `eslint.config.js` |
| `type` | `supabase` | compara, escreve | `recovery/src-legacy/src/hooks/useConnectionsOverview.ts`<br>`recovery/src-legacy/src/hooks/useConsecutiveFailures.ts`<br>`src/components/admin/connections/SecretField.utils.ts`<br>`src/hooks/common/useConsecutiveFailures.ts`<br>`src/pages/admin/AdminConexoesStatusPage.tsx`<br>… +1 |
| `type` | `supplier` | compara, escreve | `recovery/src-legacy/src/hooks/useSearch.ts`<br>`src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>`src/components/search/SmartSearchInput.tsx`<br>`src/hooks/common/useSearch.ts`<br>… +2 |
| `type` | `tag` | escreve | `tests/a11y/axe-helper.ts` |
| `type` | `tech` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `technique_upgrade` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `text` | compara, escreve | `supabase/functions/_shared/ai-router/anthropic-native.ts`<br>`supabase/functions/_shared/ai-router/google-genai.ts`<br>`supabase/functions/_shared/ai-router/types.ts`<br>`supabase/functions/analyze-logo-colors/index.ts`<br>`supabase/functions/generate-ad-image/index.ts`<br>… +3 |
| `type` | `textile` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `toggle_active` | compara, escreve | `src/components/admin/products/useProductVariants.ts`<br>`src/components/products/VariantGridMatrix.tsx` |
| `type` | `tool` | compara | `src/components/workflows/WorkflowCanvas.tsx` |
| `type` | `tool_use` | compara | `supabase/functions/_shared/ai-router/anthropic-native.ts` |
| `type` | `transient_edge_runtime` | escreve | `src/lib/error-reporter.ts` |
| `type` | `trending` | compara, escreve | `recovery/src-legacy/src/components/search/SmartSuggestions.tsx`<br>`src/components/products/ProductStatusBadge.tsx` |
| `type` | `umbrella` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `unavailable` | compara, escreve | `recovery/src-legacy/src/lib/external-db/bridge-telemetry-client.ts`<br>`recovery/src-legacy/src/lib/external-db/cold-start-recorder.ts`<br>`src/hooks/useBridgeStatusBanner.ts`<br>`src/lib/external-db/bridge-status-events.ts`<br>`src/lib/external-db/invoke.ts` |
| `type` | `unhandled_error` | escreve | `src/lib/error-reporter.ts` |
| `type` | `unhandled_promise_rejection` | escreve | `src/lib/error-reporter.ts` |
| `type` | `update_stock` | compara, escreve | `src/components/admin/products/useProductVariants.ts`<br>`src/components/products/VariantGridMatrix.tsx` |
| `type` | `updated` | compara | `src/lib/query-config.ts` |
| `type` | `urgency` | compara | `src/components/products/ProductStatusBadge.tsx` |
| `type` | `urgent` | compara | `supabase/functions/send-notification/index.ts` |
| `type` | `url` | escreve | `supabase/functions/_shared/ai-router/anthropic-native.ts` |
| `type` | `view` | escreve | `recovery/src-legacy/src/hooks/useProductInsights.ts`<br>`src/hooks/products/useProductInsights.ts` |
| `type` | `warning` | compara, escreve | `recovery/src-legacy/src/hooks/useDiscountApproval.ts`<br>`src/components/admin/connections/useIncidentTimeline72h.ts`<br>`src/components/admin/connections/useRecentIncidents.ts`<br>`src/lib/access/log-access-denied.ts`<br>`supabase/functions/connections-health-check/index.ts` |
| `type` | `webhook_outbound` | compara | `supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `websearch` | escreve | `src/lib/db/postgrest.ts` |
| `type` | `weekly` | compara | `recovery/src-legacy/src/hooks/useSalesGoals.ts`<br>`src/hooks/intelligence/useSalesGoals.ts` |
| `type` | `window` | escreve | `public/sw.js` |
| `status` | `APPLIED` | escreve | `src/lib/theme-presets-css-vars-patch.ts` |
| `status` | `CHANNEL_ERROR` | compara | `src/components/dashboard/MyDiscountRequestsWidget.tsx`<br>`src/hooks/kit-builder/useCustomKitsRealtime.ts`<br>`src/hooks/kit-builder/useKitCollaboration.ts`<br>`src/hooks/quotes/useQuotes.ts`<br>`src/hooks/ui/usePushNotifications.tsx`<br>… +1 |
| `status` | `CLOSED` | compara | `src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| `status` | `Concluído` | compara | `src/components/kit-builder/PersonalizationConfig.tsx` |
| `status` | `Inválido` | compara | `src/components/kit-builder/PersonalizationConfig.tsx` |
| `status` | `OK` | compara | `src/components/inventory/StockHeroRiskBanner.tsx` |
| `status` | `PASSED` | compara | `src/components/audit/AuditReport.tsx` |
| `status` | `SUBSCRIBED` | compara | `src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| `status` | `Status` | escreve | `src/components/audit/AuditHistory.tsx` |
| `status` | `TIMED_OUT` | compara | `src/components/dashboard/MyDiscountRequestsWidget.tsx`<br>`src/hooks/kit-builder/useCustomKitsRealtime.ts`<br>`src/hooks/kit-builder/useKitCollaboration.ts`<br>`src/hooks/quotes/useQuotes.ts`<br>`src/hooks/ui/usePushNotifications.tsx`<br>… +1 |
| `status` | `UNKNOWN` | compara | `src/hooks/stock/useEmaRiskSummary.ts` |
| `status` | `WARN` | compara | `src/components/inventory/StockHeroRiskBanner.tsx` |
| `status` | `active` | compara, escreve, filtra | `recovery/src-legacy/src/hooks/useNovelties.ts`<br>`src/components/admin/connections/Bitrix24Tab.tsx`<br>`src/components/admin/connections/ConnectionStatusBadge.tsx`<br>`src/components/admin/connections/DataSourceDebugTab.tsx`<br>`src/components/admin/connections/N8nTab.tsx`<br>… +9 |
| `status` | `aging` | compara | `src/components/products/PriceFreshnessBadge.tsx`<br>`src/utils/price-freshness.ts` |
| `status` | `aligned` | escreve | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `all` | compara, escreve | `recovery/src-legacy/src/hooks/useConnectionsOverviewFilters.ts`<br>`recovery/src-legacy/src/hooks/useVariantStock.ts`<br>`src/components/admin/DiscountApprovalFilterBar.tsx`<br>`src/components/admin/connections/ConnectionsOverviewFilters.tsx`<br>`src/components/admin/security/keys/useMcpKeys.ts`<br>… +12 |
| `status` | `already_applied` | escreve | `supabase/functions/crm-callback-reprocess/index.ts` |
| `status` | `approved` | compara, escreve | `recovery/block04_functions.sql`<br>`recovery/full-public-schema.sql`<br>`recovery/patches/D4.2_quote_advanced/functions.sql`<br>`recovery/src-legacy/src/components/quotes/QuoteRowQuickActions.tsx`<br>`recovery/src-legacy/src/hooks/usePasswordResetRequests.ts`<br>… +27 |
| `status` | `archived` | compara, escreve | `src/lib/kit-builder/persistence.ts`<br>`src/pages/kit-builder/KitLibraryPage.tsx`<br>`src/pages/magazine/MagazineEditorPage.tsx`<br>`src/pages/magazine/pg.ts`<br>`src/types/magazine.ts`<br>… +1 |
| `status` | `auth_failed` | escreve | `supabase/functions/e2e-cleanup/handler_characterization_test.ts` |
| `status` | `available` | compara | `src/components/kit-builder/KitSummary.tsx` |
| `status` | `blocked` | compara, escreve | `src/pages/Simulation.tsx`<br>`src/pages/admin/telemetry/useOptimizationQueue.ts`<br>`supabase/functions/simulation-orchestrator/index.ts` |
| `status` | `cancelled` | compara, escreve | `src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>`src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`<br>`src/components/common/StatusTimeline.tsx`<br>`src/components/quotes/QuoteStatusTimeline.tsx`<br>… +8 |
| `status` | `changed` | compara, escreve | `src/hooks/kit-builder/useKitPriceValidation.ts`<br>`src/pages/kit-builder/useKitBuilderQuote.ts` |
| `status` | `client-only` | escreve | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `compatible` | compara | `src/components/kit-builder/BoxComparisonDialog.tsx`<br>`src/components/kit-builder/BoxSelector.tsx`<br>`src/lib/kit-builder/ai-composition.ts` |
| `status` | `completed` | compara | `src/lib/inventory/future-stock-stats.ts` |
| `status` | `confirmed` | compara, escreve | `src/hooks/stock/stockFetcher.ts`<br>`src/lib/inventory/future-stock-stats.ts`<br>`src/pages/auth/SSOCallbackPage.tsx` |
| `status` | `confirming` | compara | `src/pages/auth/SSOCallbackPage.tsx` |
| `status` | `converted` | compara, filtra | `recovery/src-legacy/src/components/quotes/QuoteRowQuickActions.tsx`<br>`recovery/src-legacy/src/hooks/useQuoteFunnel.ts`<br>`src/components/quotes/MarginInsightBadge.tsx`<br>`src/components/quotes/QuotesStatusChips.tsx`<br>`src/hooks/quotes/useQuoteFunnel.ts`<br>… +3 |
| `status` | `crit` | compara | `recovery/src-legacy/src/components/admin/telemetry/PlatformFailureCards.tsx` |
| `status` | `critical` | compara | `recovery/src-legacy/src/hooks/useVariantStock.ts`<br>`src/components/inventory/StockDashboard.tsx`<br>`src/hooks/products/useVariantStock.ts`<br>`src/hooks/stock/stockAlerts.ts`<br>`src/lib/inventory/stock-filter.ts`<br>… +1 |
| `status` | `degraded` | compara, escreve | `api/ready.ts`<br>`src/components/system/CloudStatusBanner.tsx`<br>`src/lib/external-db/invoke.ts` |
| `status` | `delivered` | compara, escreve | `src/components/common/StatusTimeline.tsx`<br>`supabase/functions/semantic-search/index.ts` |
| `status` | `denied` | compara, escreve, filtra | `src/components/admin/security/keys/audit/McpAuditRow.tsx`<br>`src/components/admin/security/keys/audit/useStepUpAttempts.ts`<br>`supabase/functions/connections-hub-audit/index.ts`<br>`supabase/functions/mcp-keys-issue/index.ts`<br>`supabase/functions/mcp-keys-revoke/index.ts`<br>… +4 |
| `status` | `destructive` | compara | `src/components/kit-builder/VolumeIndicator.tsx`<br>`src/pages/admin/AdminClientPerformancePage.tsx` |
| `status` | `dimension` | compara, escreve | `src/components/pricing/calculator/QuantityComparisonTable.tsx` |
| `status` | `done` | compara | `src/pages/admin/telemetry/useOptimizationQueue.ts` |
| `status` | `down` | compara | `recovery/src-legacy/src/hooks/useCloudStatus.ts`<br>`src/components/system/CloudStatusBanner.tsx`<br>`src/hooks/ui/useCloudStatus.ts`<br>`src/lib/external-db/invoke.ts` |
| `status` | `draft` | compara, escreve, filtra | `recovery/src-legacy/src/hooks/useKitAutoSave.ts`<br>`recovery/src-legacy/src/hooks/useKitTemplates.ts`<br>`recovery/src-legacy/src/hooks/useMagicUpGeneration.ts`<br>`recovery/src-legacy/src/hooks/useMagicUpState.ts`<br>`recovery/src-legacy/src/hooks/useQuoteBuilderState.ts`<br>… +40 |
| `status` | `duplicate_ignored` | escreve | `supabase/functions/receive-crm-callback/index.ts` |
| `status` | `em_separacao` | escreve | `src/hooks/products/useSellerCarts.ts` |
| `status` | `empty` | escreve | `src/components/admin/connections/KeysValidationTab.tsx` |
| `status` | `error` | compara, escreve | `api/health.ts`<br>`api/ready.ts`<br>`recovery/src-legacy/src/pages/SystemStatusPage.tsx`<br>`src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>… +23 |
| `status` | `expired` | compara | `src/components/admin/security/keys/McpKeyDetailsDrawer.tsx`<br>`src/components/admin/security/keys/McpKeyRow.tsx`<br>`src/components/admin/security/keys/useMcpKeys.ts`<br>`src/components/quotes/QuoteStatusTimeline.tsx`<br>`src/components/quotes/QuoteValidityBanner.tsx`<br>… +4 |
| `status` | `expiring_soon` | compara | `src/components/novelties/NoveltyCards.tsx` |
| `status` | `fail` | compara, escreve | `recovery/src-legacy/src/hooks/useConnectionsOverviewFilters.ts`<br>`src/components/admin/connections/ConnectionTestHistoryPanel.tsx`<br>`src/hooks/intelligence/useConnectionsOverviewFilters.ts`<br>`supabase/functions/full-op-diagnostics/index.ts` |
| `status` | `failed` | compara, escreve | `recovery/src-legacy/src/components/admin/CatalogQualityDashboard.tsx`<br>`src/components/admin/connections/SmokeTestChecklist.tsx`<br>`src/pages/admin/telemetry/useOptimizationQueue.ts`<br>`src/pages/auth/SSOCallbackPage.tsx`<br>`supabase/functions/crm-callback-reprocess/index.ts`<br>… +1 |
| `status` | `forbidden` | escreve | `supabase/functions/e2e-cleanup/handler_characterization_test.ts`<br>`supabase/functions/e2e-cleanup/index.ts` |
| `status` | `fresh` | compara | `src/components/products/PriceFreshnessBadge.tsx` |
| `status` | `fulfilled` | compara, escreve | `src/components/admin/connections/CredentialsChangedBanner.tsx`<br>`src/components/admin/connections/GlobalRefreshFromDbButton.tsx`<br>`src/hooks/mockup/mockupGenerationService.ts`<br>`src/hooks/mockup/mockupGeneratorModel.ts`<br>`src/hooks/quotes/useQuoteBuilderState.helpers.ts`<br>… +7 |
| `status` | `gap` | compara, escreve | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `healthy` | compara, escreve | `recovery/src-legacy/src/hooks/useCloudStatus.ts`<br>`src/components/system/CloudStatusBanner.tsx`<br>`src/components/system/CloudStatusDot.tsx`<br>`src/contexts/CloudStatusContext.tsx`<br>`src/hooks/ui/useCloudStatus.ts`<br>… +1 |
| `status` | `idle` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx`<br>`src/components/quotes/QuoteAutoSave.tsx`<br>`src/hooks/kit-builder/useKitStockValidation.ts`<br>`src/pages/auth/postLoginGuards.ts` |
| `status` | `in-stock` | compara | `recovery/src-legacy/src/pages/ComparePage.tsx`<br>`recovery/src-legacy/src/pages/product-detail/ProductDetailHero.tsx`<br>`src/components/compare/ComparisonRadarChart.tsx`<br>`src/components/products/ProductListItem.tsx`<br>`src/components/products/ProductQuickView.tsx`<br>… +3 |
| `status` | `in_stock` | compara, escreve | `recovery/src-legacy/src/hooks/useVariantStock.ts`<br>`src/components/inventory/StockDashboard.tsx`<br>`src/components/simulator/StockAlert.tsx`<br>`src/hooks/products/useVariantStock.ts`<br>`src/types/stock.ts` |
| `status` | `in_transit` | compara | `src/lib/inventory/future-stock-stats.ts` |
| `status` | `incoming` | compara | `recovery/src-legacy/src/hooks/useVariantStock.ts`<br>`src/components/inventory/StockDashboard.tsx`<br>`src/hooks/products/useVariantStock.ts`<br>`src/lib/inventory/stock-filter.ts`<br>`src/types/stock.ts` |
| `status` | `incompatible` | compara, escreve | `src/components/kit-builder/BoxComparisonDialog.tsx`<br>`src/components/kit-builder/BoxSelector.tsx`<br>`src/lib/kit-builder/ai-composition.ts`<br>`src/lib/kit-builder/box-recommendations.ts` |
| `status` | `inconclusive` | compara, escreve | `src/components/kit-builder/BoxComparisonDialog.tsx`<br>`src/components/kit-builder/BoxSelector.tsx`<br>`src/lib/kit-builder/box-recommendations.ts` |
| `status` | `insufficient_data` | escreve | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| `status` | `invalid` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `loading` | compara, escreve | `recovery/src-legacy/src/pages/SystemStatusPage.tsx`<br>`src/components/ui/StatusBadge.tsx`<br>`src/pages/system/SystemStatusPage.tsx` |
| `status` | `low-stock` | compara | `recovery/src-legacy/src/pages/ComparePage.tsx`<br>`recovery/src-legacy/src/pages/product-detail/ProductDetailHero.tsx`<br>`src/components/compare/ComparisonRadarChart.tsx`<br>`src/components/compare/StockRiskBadge.tsx`<br>`src/components/inventory/StockBadge.tsx`<br>… +5 |
| `status` | `low_stock` | compara | `recovery/src-legacy/src/hooks/useVariantStock.ts`<br>`src/components/inventory/StockDashboard.tsx`<br>`src/components/simulator/StockAlert.tsx`<br>`src/hooks/products/useVariantStock.ts`<br>`src/hooks/stock/stockAlerts.ts`<br>… +2 |
| `status` | `missing` | compara, escreve | `src/components/admin/connections/MaskedSuffixBadge.tsx`<br>`src/lib/masked-suffix.ts` |
| `status` | `none` | compara | `src/lib/carts/shipping-deadline.ts`<br>`src/pages/products/seller-carts/useSellerCartsPage.ts` |
| `status` | `not_found` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `not_ready` | escreve | `api/ready.ts` |
| `status` | `novo` | escreve | `recovery/src-legacy/src/hooks/useSellerCarts.ts` |
| `status` | `number` | compara | `recovery/src-legacy/src/components/admin/telemetry/BridgeCallDetailDrawer.tsx`<br>`src/components/admin/connections/SecretsManagerHealthPanel.tsx`<br>`src/components/admin/connections/TestAllConnectionsButton.tsx`<br>`src/contexts/SellerCartContext.tsx`<br>`src/lib/crm-db.ts`<br>… +7 |
| `status` | `offline` | compara | `src/components/quotes/QuoteAutoSave.tsx` |
| `status` | `ok` | compara, escreve | `api/health.ts`<br>`api/ready.ts`<br>`recovery/src-legacy/src/components/admin/telemetry/PlatformFailureCards.tsx`<br>`recovery/src-legacy/src/hooks/useConnectionsOverviewFilters.ts`<br>`recovery/src-legacy/src/pages/SystemStatusPage.tsx`<br>… +15 |
| `status` | `order` | compara | `src/components/dashboard/MyClientsWidget.tsx` |
| `status` | `out-of-stock` | compara, escreve | `recovery/src-legacy/src/pages/ComparePage.tsx`<br>`recovery/src-legacy/src/pages/product-detail/ProductDetailHero.tsx`<br>`src/components/compare/ComparisonRadarChart.tsx`<br>`src/components/compare/StockRiskBadge.tsx`<br>`src/components/products/ProductListItem.tsx`<br>… +4 |
| `status` | `out_of_stock` | compara | `recovery/src-legacy/src/hooks/useVariantStock.ts`<br>`src/components/inventory/StockDashboard.tsx`<br>`src/components/inventory/VariantStockTable.tsx`<br>`src/components/simulator/StockAlert.tsx`<br>`src/hooks/products/useVariantStock.ts`<br>… +2 |
| `status` | `overdue` | compara | `src/lib/carts/shipping-deadline.ts`<br>`src/pages/products/CartsListPage.tsx` |
| `status` | `overstocked` | compara | `src/components/inventory/StockDashboard.tsx`<br>`src/hooks/products/useVariantStock.ts`<br>`src/types/stock.ts` |
| `status` | `partial` | compara, escreve | `src/lib/inventory/future-stock-stats.ts`<br>`supabase/functions/anonymize-user/index.ts` |
| `status` | `pass` | compara, escreve | `supabase/functions/full-op-diagnostics/index.ts` |
| `status` | `passed` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx` |
| `status` | `pending` | compara, escreve, filtra | `recovery/src-legacy/src/hooks/useDiscountApproval.ts`<br>`recovery/src-legacy/src/hooks/usePasswordResetRequests.ts`<br>`recovery/src-legacy/src/pages/QuoteViewPage.tsx`<br>`src/components/admin/DiscountApprovalFilterBar.tsx`<br>`src/components/admin/DiscountApprovalHeaderBadge.tsx`<br>… +22 |
| `status` | `pending_approval` | compara, escreve | `recovery/src-legacy/src/hooks/useDiscountApproval.ts`<br>`recovery/src-legacy/src/hooks/useQuoteBuilderState.ts`<br>`recovery/src-legacy/src/pages/QuoteViewPage.tsx`<br>`src/components/quotes/QuoteKanbanBoard.tsx`<br>`src/components/quotes/QuoteStatusTimeline.tsx`<br>… +5 |
| `status` | `processing` | compara, escreve | `src/components/ui/StatusBadge.tsx`<br>`supabase/functions/product-webhook/index.ts`<br>`supabase/functions/word-magic/index.ts`<br>`supabase/migrations/20250103090000_mockup_ai_complete.sql` |
| `status` | `pronto_orcamento` | compara | `recovery/src-legacy/src/components/cart/CartHealthChecklist.tsx` |
| `status` | `published` | compara, escreve, filtra | `src/lib/security/magazine-guard.ts`<br>`src/pages/magazine/MagazineEditorPage.tsx`<br>`src/pages/magazine/MagazineListPage.tsx`<br>`src/pages/magazine/PublicMagazineView.tsx`<br>`src/pages/magazine/hooks/useMagazineGoldImport.ts`<br>… +8 |
| `status` | `quote` | compara | `src/components/dashboard/MyClientsWidget.tsx` |
| `status` | `quote_not_found` | escreve | `supabase/functions/crm-callback-reprocess/index.ts` |
| `status` | `rate_limited` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `ready` | compara, escreve | `api/ready.ts`<br>`src/lib/kit-builder/persistence.ts` |
| `status` | `regression` | compara | `src/components/admin/telemetry/RegressionGuardrailBanner.tsx` |
| `status` | `rejected` | compara, escreve | `recovery/src-legacy/src/components/quotes/QuoteRowQuickActions.tsx`<br>`recovery/src-legacy/src/hooks/usePasswordResetRequests.ts`<br>`recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts`<br>`src/components/admin/DiscountManagementPanel.tsx`<br>`src/components/admin/PasswordResetApproval.tsx`<br>… +14 |
| `status` | `reprocessed` | escreve | `supabase/functions/crm-callback-reprocess/index.ts` |
| `status` | `revoked` | compara | `src/components/admin/security/keys/McpKeyRow.tsx`<br>`src/components/admin/security/keys/useMcpKeys.ts` |
| `status` | `running` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx`<br>`src/components/admin/telemetry/OptimizationQueuePanel.tsx`<br>`tests/p0/_mocks.ts` |
| `status` | `saved` | compara | `src/components/quotes/QuoteAutoSave.tsx` |
| `status` | `saving` | compara | `src/components/quotes/QuoteAutoSave.tsx` |
| `status` | `sent` | compara, escreve, filtra | `recovery/src-legacy/src/hooks/useSalesHistory.ts`<br>`recovery/src-legacy/src/hooks/useSalesHistoryMacro.ts`<br>`recovery/src-legacy/src/pages/QuoteViewPage.tsx`<br>`recovery/src-legacy/src/pages/quote-view/QuoteActionHandlers.ts`<br>`recovery/src-legacy/src/pages/quote-view/QuoteBitrixSync.ts`<br>… +11 |
| `status` | `short` | compara, escreve | `src/components/admin/connections/MaskedSuffixBadge.tsx`<br>`src/lib/masked-suffix.ts` |
| `status` | `skipped` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx`<br>`src/hooks/kit-builder/useKitFitsValidation.ts`<br>`src/pages/admin/telemetry/useOptimizationQueue.ts`<br>`supabase/functions/_shared/ai-router/index.ts`<br>`supabase/functions/full-op-diagnostics/index.ts`<br>… +1 |
| `status` | `skipped_claim_error` | escreve | `supabase/functions/webhook-dispatcher/index.ts` |
| `status` | `skipped_duplicate` | escreve | `supabase/functions/webhook-dispatcher/index.ts` |
| `status` | `slow` | compara | `src/pages/auth/SSOCallbackPage.tsx`<br>`supabase/functions/_shared/external-db-telemetry.ts` |
| `status` | `soon` | compara | `src/lib/carts/shipping-deadline.ts`<br>`src/pages/products/CartsListPage.tsx` |
| `status` | `stale` | compara | `src/components/products/PriceFreshnessBadge.tsx`<br>`src/utils/price-freshness.ts` |
| `status` | `started` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `step_up_error` | compara, escreve | `src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>`src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`<br>`src/lib/auth/invoke-full-scope.ts`<br>`src/pages/admin/DevChallengeExamplesPage.tsx` |
| `status` | `string` | compara | `src/lib/products/stock-status.ts` |
| `status` | `success` | compara, escreve | `recovery/src-legacy/src/hooks/useAiUsage.ts`<br>`src/components/admin/connections/FailedDeliveriesPanel.tsx`<br>`src/components/admin/security/keys/audit/McpAuditRow.tsx`<br>`src/components/kit-builder/VolumeIndicator.tsx`<br>`src/hooks/intelligence/useAiUsage.ts`<br>… +17 |
| `status` | `super` | compara | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `unauthorized` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `unavailable` | compara, escreve | `src/components/kit-builder/KitSummary.tsx`<br>`src/hooks/kit-builder/useKitMinQuantityValidation.ts`<br>`src/hooks/kit-builder/useKitPriceValidation.ts`<br>`src/pages/kit-builder/useKitBuilderQuote.ts` |
| `status` | `unchanged` | escreve | `src/hooks/kit-builder/useKitPriceValidation.ts` |
| `status` | `unconfigured` | compara | `src/components/admin/connections/DataSourceDebugTab.tsx` |
| `status` | `underindex` | compara | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `unhealthy` | compara, escreve | `supabase/functions/health-check/index.ts` |
| `status` | `unknown` | compara, escreve | `src/components/products/PriceFreshnessBadge.tsx`<br>`src/components/simulator/StockAlert.tsx`<br>`src/components/system/CloudStatusDot.tsx`<br>`src/pages/kit-builder/useKitBuilderQuote.ts`<br>`src/utils/price-freshness.ts` |
| `status` | `valid` | compara, escreve | `src/components/admin/connections/MaskedSuffixBadge.tsx`<br>`src/lib/masked-suffix.ts` |
| … +114 linhas — lista completa em `context.json` | | | |

### E.4 Enums e listas de valores

| Nome | Valores | Onde |
|---|---|---|
| aal_level | `aal1`, `aal2`, `aal3` | banco |
| code_challenge_method | `s256`, `plain` | banco |
| factor_status | `unverified`, `verified` | banco |
| factor_type | `totp`, `webauthn`, `phone`, `recovery_code` | banco |
| oauth_authorization_status | `pending`, `approved`, `denied`, `expired` | banco |
| oauth_client_type | `public`, `confidential` | banco |
| oauth_registration_type | `dynamic`, `manual` | banco |
| oauth_response_type | `code` | banco |
| one_time_token_type | `confirmation_token`, `reauthentication_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`, `phone_change_token` | banco |
| app_role | `dev`, `supervisor`, `admin`, `manager`, `agente`, `coordenador`, `vendedor` | banco |
| categoria_cor_enum | `pantone`, `basica`, `institucional`, `especial`, `bordado`, `hot_stamping`, `serigrafia`, `sublimacao` | banco |
| conversation_event_type | `text`, `image`, `audio`, `video`, `file`, `system` | banco |
| familia_cor_enum | `amarelo`, `laranja`, `vermelho`, `coral`, `rosa`, `magenta`, `roxo`, `lilas`, `azul`, `ciano`, `verde`, `marrom`, `bege`, `neutro`, `metalico` | banco |
| magazine_reaction_kind | `like`, `love`, `fire`, `idea` | banco |
| magazine_status | `draft`, `published`, `archived` | banco |
| org_role | `owner`, `admin`, `member` | banco |
| payment_status | `pending`, `authorized`, `captured`, `refunded`, `failed` | banco |
| produtos_padronizacao_status | `pending`, `standardized`, `rejected`, `promoted` | banco |
| role_migration_item_status | `pending`, `success`, `failed`, `skipped` | banco |
| role_migration_status | `pending`, `running`, `completed`, `failed`, `cancelled` | banco |
| silver_norm_status | `raw`, `normalizing`, `normalized`, `validated`, `rejected`, `promoted` | banco |
| step_up_action | `promote_dev`, `demote_dev`, `mcp_full_issue`, `mcp_full_escalate`, `secret_rotation`, `secret_revoke`, `mcp_key_revoke`, `mcp_key_rotate` | banco |
| supplier_raw_status | `pending`, `processing`, `processed`, `failed`, `skipped`, `quarantined` | banco |
| tipo_cor_enum | `solid`, `metalica`, `fluorescente`, `pastel`, `neon`, `especial` | banco |
| action | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ERROR` | banco |
| equality_op | `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in`, `like`, `ilike`, `is`, `match`, `imatch`, `isdistinct` | banco |
| buckettype | `STANDARD`, `ANALYTICS`, `VECTOR` | banco |
| AiApiFormat | openai_compatible \| anthropic_native \| google_native \| custom | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| AuditAction | INSERT \| UPDATE \| DELETE | `recovery/src-legacy/src/hooks/useAuditLog.ts` |
| AuditEntityType | products \| product_variants \| product_images \| product_videos \| quotes \| quote_items \| orders \| order_items \| suppliers \| categories \| material_types \| color_variations \| companies \| company_contacts | `recovery/src-legacy/src/hooks/useAuditLog.ts` |
| ViewMode | grid \| list \| table | `recovery/src-legacy/src/hooks/useCatalogState.ts` |
| SortOption | relevance \| name \| price-asc \| price-desc \| stock \| newest \| color-match \| best-seller-supplier \| best-seller-promo | `recovery/src-legacy/src/hooks/useCatalogState.ts` |
| ConnectionType | supabase \| bitrix24 \| n8n \| mcp \| webhook_outbound | `recovery/src-legacy/src/hooks/useConnectionTester.ts` |
| ErrorKind | timeout \| network \| dns \| http \| auth \| config \| unknown | `recovery/src-legacy/src/hooks/useConnectionTester.ts` |
| OverviewStatusFilter | all \| ok \| fail | `recovery/src-legacy/src/hooks/useConnectionsOverviewFilters.ts` |
| OverviewWindowFilter | any \| 5m \| 1h \| 24h \| 7d \| never | `recovery/src-legacy/src/hooks/useConnectionsOverviewFilters.ts` |
| DEV_EXPECTED_TABLES | "admin_audit_log", "ai_usage_logs", "ai_usage_quotas", "bot_detection_log", "external_connections_sync_log", "integration_credentials", "inbound_webhook_endpoints", "inbound_webhook_events", "ip_access_control", | `recovery/src-legacy/src/hooks/useDevAccessAudit.ts` |
| EXTERNAL_CATEGORIES_QUERY_KEY | 'external-categories' | `recovery/src-legacy/src/hooks/useExternalCategoriesQuery.ts` |
| ALLOWED_FRESHNESS_THRESHOLDS | 30, 60, 90 | `recovery/src-legacy/src/hooks/useProductFreshnessOverride.ts` |
| RoleName | dev \| supervisor \| agente | `recovery/src-legacy/src/hooks/useRBAC.tsx` |
| RETEST_COOLDOWN_PRESETS_MS | 3000, 10_000, 30_000, 60_000 | `recovery/src-legacy/src/hooks/useRetestCooldownSetting.ts` |
| ReportFrequency | daily \| weekly \| monthly | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| ReportType | sales \| quotes \| clients \| products \| orders | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| HistoryType | product \| company \| general | `recovery/src-legacy/src/hooks/useSearchHistory.ts` |
| CartStatus | novo \| em_negociacao \| pronto_orcamento | `recovery/src-legacy/src/hooks/useSellerCarts.ts` |
| StepUpAction | promote_dev \| demote_dev \| mcp_full_issue \| mcp_full_escalate \| mcp_key_revoke \| mcp_key_rotate \| secret_rotation \| secret_revoke | `recovery/src-legacy/src/hooks/useStepUpAuth.ts` |
| IntelligenceFlag | hot-product \| stockout-risk \| stagnant \| negotiation-opportunity \| frequent-restock \| class-a | `recovery/src-legacy/src/hooks/useStockHistory.ts` |
| SortOption | recommended \| price_asc \| price_desc \| time_asc \| time_desc \| popularity | `recovery/src-legacy/src/hooks/useTechniqueRecommendations.ts` |
| EmailEventType | quote_sent \| quote_approved \| quote_rejected \| order_created | `recovery/src-legacy/src/hooks/useTransactionalEmail.ts` |
| DiscountApprovalStatus | all \| approved \| pending \| rejected | `src/components/admin/DiscountApprovalFilterBar.tsx` |
| BADGE_CATEGORIES | 'status_estoque', 'novidade', 'curadoria', 'comercial', 'inteligencia', 'atributo', 'acao', 'sistema', | `src/components/admin/badges-manager/types.ts` |
| SOURCE_KINDS | 'computed', 'manual', 'pipeline', 'intelligence', 'ui_only', 'hybrid', | `src/components/admin/badges-manager/types.ts` |
| PLACEMENTS | 'card_header_left', 'card_header_right', 'card_body', 'card_footer', 'corner_bl', 'corner_br', 'intelligence_panel', 'product_detail', 'catalog', | `src/components/admin/badges-manager/types.ts` |
| SURFACES | 'catalog', 'super_filter', 'product_detail', 'novelties', 'comparison', 'quote_builder', 'inventory', | `src/components/admin/badges-manager/types.ts` |
| COLOR_TOKENS | 'neutral', 'red', 'orange', 'amber', 'yellow', 'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'purple', 'pink', 'stone', 'brand', | `src/components/admin/badges-manager/types.ts` |
| CredentialSource | all \| db \| env \| none | `src/components/admin/connections/CredentialsSourceFilterContext.tsx` |
| FieldSourceKind | ambos (sync trigger) \| external_connections \| integration_credentials | `src/components/admin/connections/FieldSourceDrillDownDialog.tsx` |
| SeverityFilter | all \| P0 \| P1 \| P2 | `src/components/admin/connections/SeverityFilterContext.tsx` |
| TestProgressPhase | completed \| failed \| idle \| running | `src/components/admin/connections/TestProgressIndicator.tsx` |
| ConnectionStatus | active \| error \| unconfigured | `src/components/admin/connections/connectionStatus.ts` |
| TargetZone | health \| operation | `src/components/admin/connections/incidentZoneMapping.ts` |
| SecretErrorCategory | conflict \| network \| permission \| rate_limit \| server \| timeout \| unknown \| validation \| whitelist | `src/components/admin/connections/secretErrors.ts` |
| PulseSeverity | P0 \| P1 \| P2 | `src/components/admin/connections/usePulseBarStatus.ts` |
| IncidentSeverity | P0 \| P1 \| P2 | `src/components/admin/connections/useRecentIncidents.ts` |
| IncidentSource | notification \| test_history | `src/components/admin/connections/useRecentIncidents.ts` |
| ZoneId | ai-router \| connections \| health \| operation | `src/components/admin/connections/useZoneVisibility.ts` |
| StepId | classification \| commercial \| content \| engraving \| essentials \| fiscal \| kits \| media \| packaging | `src/components/admin/products/HorizontalStepper.tsx` |
| SectionId | classification \| commercial \| dimensions \| fiscal \| flags \| info \| marketing \| media \| packaging \| price \| seo | `src/components/admin/products/ProductFormHelpers.tsx` |
| Step | complete \| importing \| mapping \| preview \| upload | `src/components/admin/products/bulk-import/types.ts` |
| CONTACT_ROLES | 'Proprietário', 'Diretor', 'Gerente', 'Vendedor', 'Financeiro', 'Compras', 'Logística', 'Suporte', 'Outro', | `src/components/admin/products/new-supplier/types.ts` |
| WizardStep | component \| details \| list \| location \| technique | `src/components/admin/products/sections/engraving/types.ts` |
| StatusFilter | active \| all \| expired \| revoked | `src/components/admin/security/keys/useMcpKeys.ts` |
| SortKey | created_desc \| expires_asc \| last_used_desc | `src/components/admin/security/keys/useMcpKeys.ts` |
| AuditAction | mcp_key.auto_revoked \| mcp_key.issue_denied \| mcp_key.issue_error \| mcp_key.issued \| mcp_key.revoke_denied \| mcp_key.revoke_error \| mcp_key.revoked \| mcp_key.rotate_denied \| mcp_key.rotate_error \| mcp_key.rotated \| mcp_key.scope_escalated \| mcp_key.update_denied \| mcp_key.update_error \| mcp_key.updated \| mcp_tool.denied \| mcp_tool.error \| mcp_tool.granted | `src/components/admin/security/keys/audit/useMcpAuditFeed.ts` |
| StepUpReason | step_up_invalid \| step_up_required | `src/components/admin/security/keys/audit/useStepUpAttempts.ts` |
| CONTACT_ROLES | 'Proprietário', 'Diretor', 'Gerente', 'Vendedor', 'Financeiro', 'Compras', 'Logística', 'Suporte', 'Outro', | `src/components/admin/suppliers-manager/types.ts` |
| BulkWizardMode | cart \| collection \| compare \| favorite \| pdf \| quote | `src/components/catalog/BulkVariantWizard.tsx` |
| HighlightResult | best \| neutral \| worst | `src/components/compare/ComparisonHighlights.tsx` |
| FavoritesSort | category \| name-asc \| name-desc \| oldest \| price-asc \| price-desc \| recent | `src/components/favorites/FavoritesSortBar.tsx` |
| InsightFocus | auto \| conversion \| rupture \| ticket | `src/components/intelligence/MarketIntelligenceInsightsCard.tsx` |
| StockStatus | in-stock \| incoming \| low-stock \| out-of-stock \| pre-order | `src/components/inventory/StockBadge.tsx` |
| StockKpiFilter | all \| critical \| in_stock \| out_of_stock | `src/components/inventory/stockKpiCards.ts` |
| StockKpiSlug | em-estoque \| risco-de-ruptura \| sem-estoque \| total-de-variacoes | `src/components/inventory/stockKpiCards.ts` |
| RiskSeverity | critical \| ok \| warning | `src/components/inventory/risk/types.ts` |
| Occasion | birthday \| event \| reactivation \| vip \| welcome \| year-end | `src/components/kit-builder/KitOccasionSelector.tsx` |
| SortOption | last-used \| name-asc \| price-desc \| recent \| usage-desc | `src/components/kit-library/KitLibraryFilters.tsx` |
| TechniqueCategory | digital \| laser \| other \| serigrafia | `src/components/mockup/techniqueColorUtils.ts` |
| LaserTone | claro \| escuro | `src/components/mockup/techniqueColorUtils.ts` |
| GeometryState | ilustrativa \| sem_regra \| validada | `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx` |
| UpsellType | add_position \| complementary \| quantity_tier \| technique_upgrade | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| UpsellPriority | high \| low \| medium | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| QUANTITY_TIERS | 50, 100, 250, 500, 1000, 2500 | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| ProductStatusBadgeType | featured \| kit \| novelty \| out-of-stock \| packaging \| promotion \| urgency | `src/components/products/ProductStatusBadge.tsx` |
| UrgencyType | ending-soon \| limited-stock \| trending | `src/components/products/ProductStatusBadge.tsx` |
| VariantActionMode | collection \| compare \| favorite \| quote \| share | `src/components/products/VariantPickerDialog.tsx` |
| SwatchViewMode | grid \| list \| table | `src/components/products/swatchSizing.ts` |
| SwatchSizeToken | lg \| md \| sm \| xs \| xxs | `src/components/products/swatchSizing.ts` |
| PLAYBACK_RATES | 0.5, 0.75, 1, 1.25, 1.5, 2 | `src/components/products/gallery/usePromoFlixPlayer.ts` |
| TemplateKey | formal \| informal \| promotional | `src/components/products/share/MessageTemplates.ts` |
| EngravingBadgeVariant | boxed \| plain | `src/components/quotes/EngravingBadge.tsx` |
| PdfPrintFallbackReason | iframe-exception \| not-ready \| popup-blocked \| print-exception \| safari \| watchdog-timeout | `src/components/quotes/PdfPrintHelpDialog.tsx` |
| QuoteBuilderStep | client \| conditions \| items \| personalization \| review | `src/components/quotes/QuoteBuilderStepper.tsx` |
| SaveStatus | error \| idle \| offline \| saved \| saving | `src/components/quotes/quoteAutoSaveStatus.ts` |
| SearchResultType | art_file \| cart_template \| category \| client \| collection \| command \| component \| conversation \| kit \| magic_up \| media \| mockup \| product \| quote \| reminder | `src/components/search/useGlobalSearch.ts` |
| EdgeFallbackVariant | disconnected \| empty \| error \| loading | `src/components/shared/EdgeFallback.tsx` |
| DatePickerFieldVariant | compact \| input | `src/components/ui/date-picker-field.tsx` |
| StatVariant | danger \| default \| info \| orange \| success \| warning | `src/components/ui/stat-card.tsx` |
| AppRole | admin \| agente \| coordenador \| dev \| manager \| supervisor \| vendedor | `src/contexts/AuthContext.tsx` |
| FUTURE_STOCK_WINDOWS | 7, 15, 30 | `src/hooks/useFutureStockPreference.ts` |
| ReplenishmentStatus | active \| expired \| expiring_soon | `src/hooks/useReplenishments.ts` |
| StockStatus | in-stock \| low-stock \| out-of-stock | `src/hooks/useReplenishments.ts` |
| AuditAction | DELETE \| INSERT \| UPDATE | `src/hooks/admin/useAuditLog.ts` |
| AuditEntityType | categories \| color_variations \| companies \| company_contacts \| material_types \| order_items \| orders \| product_images \| product_variants \| product_videos \| products \| quote_items \| quotes \| suppliers | `src/hooks/admin/useAuditLog.ts` |
| DEV_EXPECTED_TABLES | 'admin_audit_log', 'ai_usage_logs', 'ai_usage_quotas', 'bot_detection_log', 'external_connections_sync_log', 'integration_credentials', 'inbound_webhook_endpoints', 'inbound_webhook_events', 'ip_access_control', | `src/hooks/admin/useDevAccessAudit.ts` |
| RETEST_COOLDOWN_PRESETS_MS | 3000, 10_000, 30_000, 60_000 | `src/hooks/admin/useRetestCooldownSetting.ts` |
| EventType | approved \| expired \| order_created \| rejected \| sent_to_client | `src/hooks/admin/useV4Callbacks.ts` |
| RoleName | agente \| dev \| supervisor | `src/hooks/auth/useRBAC.tsx` |
| StepUpAction | demote_dev \| mcp_full_escalate \| mcp_full_issue \| mcp_key_revoke \| mcp_key_rotate \| promote_dev \| secret_revoke \| secret_rotation | `src/hooks/auth/useStepUpAuth.ts` |
| HealthTier | attention \| healthy \| risk \| unknown | `src/hooks/bi/useClientHealthScore.ts` |
| ComparisonClassification | above \| below \| no_data \| on_par | `src/hooks/bi/useClientVsIndustry.ts` |
| HistoryType | company \| general \| product | `src/hooks/common/useSearchHistory.ts` |
| EmailEventType | order_created \| quote_approved \| quote_rejected \| quote_sent | `src/hooks/common/useTransactionalEmail.ts` |
| AiApiFormat | anthropic_native \| custom \| google_native \| openai_compatible | `src/hooks/intelligence/useAiRouter.ts` |
| ConnectionType | bitrix24 \| mcp \| n8n \| supabase \| webhook_outbound | `src/hooks/intelligence/useConnectionTester.ts` |
| ErrorKind | auth \| config \| dns \| http \| network \| timeout \| unknown | `src/hooks/intelligence/useConnectionTester.ts` |
| OverviewStatusFilter | all \| fail \| ok | `src/hooks/intelligence/useConnectionsOverviewFilters.ts` |
| OverviewWindowFilter | 1h \| 5m \| 7d \| 24h \| any \| never | `src/hooks/intelligence/useConnectionsOverviewFilters.ts` |
| ReportFrequency | daily \| monthly \| weekly | `src/hooks/intelligence/useScheduledReports.ts` |
| ReportType | clients \| orders \| products \| quotes \| sales | `src/hooks/intelligence/useScheduledReports.ts` |
| IntelligenceFlag | class-a \| frequent-restock \| hot-product \| negotiation-opportunity \| stagnant \| stockout-risk | `src/hooks/intelligence/useStockHistory.ts` |
| FilterKey | category \| product \| supplier | `src/hooks/intelligence/useZeroResultDiagnosis.ts` |
| KitStockStatus | available \| checking \| idle \| unavailable \| unknown | `src/hooks/kit-builder/useKitStockValidation.ts` |
| MockupGenerationErrorCode | edge_error \| missing_dimensions | `src/hooks/mockup/mockupGeneratorModel.ts` |
| ViewMode | grid \| list \| table | `src/hooks/products/useCatalogState.helpers.ts` |
| SortOption | best-seller-promo \| best-seller-supplier \| color-match \| name \| newest \| price-asc \| price-desc \| stock | `src/hooks/products/useCatalogState.helpers.ts` |
| EXTERNAL_CATEGORIES_QUERY_KEY | 'external-categories' | `src/hooks/products/useExternalCategoriesQuery.ts` |
| TechniquesErrorKind | empty \| network \| rpc \| unknown | `src/hooks/products/useProductCustomizationOptions.ts` |
| ALLOWED_FRESHNESS_THRESHOLDS | 30, 60, 90 | `src/hooks/products/useProductFreshnessOverride.ts` |
| ReplenishmentStatus | active \| expired \| expiring_soon | `src/hooks/products/useReplenishments.ts` |
| StockStatus | in-stock \| low-stock \| out-of-stock | `src/hooks/products/useReplenishments.ts` |
| CartStatus | em_separacao \| pronto_orcamento | `src/hooks/products/useSellerCarts.helpers.ts` |
| AlertLevel | critical \| low \| out | `src/hooks/products/useStockAlerts.ts` |
| StockNotificationKind | low \| new \| restocked \| stockout | `src/hooks/products/useStockNotifications.ts` |
| SupplierComparisonSort | commonColors \| leadTime \| price \| score \| stock | `src/hooks/products/useSupplierComparison.ts` |
| SortOption | popularity \| price_asc \| price_desc \| recommended \| time_asc \| time_desc | `src/hooks/simulation/useTechniqueRecommendations.ts` |
| EtlStatus | ERROR \| OK \| WARN | `src/hooks/stock/useEmaRiskSummary.ts` |
| RuptureLevel | ALERTA \| ATENÇÃO \| CRÍTICO \| OK \| RUPTURA | `src/hooks/stock/useRuptureAlerts.ts` |
| ConfidenceLevel | ALTA \| BAIXA \| INSUFICIENTE \| MÉDIA | `src/hooks/stock/useRuptureAlerts.ts` |
| VoiceAgentPhase | error \| idle \| listening \| processing \| speaking | `src/hooks/voice/types.ts` |
| GOLD_RELATIONS | 'v_products_public', 'v_suppliers_public', 'v_print_area_techniques_public', 'v_variant_sale_prices_public', 'v_product_images_cdn', 'v_products_min_price', 'product_variants', 'variant_supplier_sources', 'vw_medallion_coverage', 'v_pipeline_progress', | `src/integrations/supabase/gold-relations.ts` |
| CatalogStockStatus | in-stock \| low-stock \| out-of-stock | `src/lib/catalog-stock-status.ts` |
| CloudStatus | degraded \| down \| healthy \| unknown \| warming | `src/lib/cloud-status.ts` |
| ErrorTone | auth \| config \| dns \| http \| network \| timeout \| unknown | `src/lib/connection-error-copy.ts` |
| DiscountApprovalStatus | approved \| expired \| pending \| rejected | `src/lib/discount-approval-status-config.ts` |
| FeatureFlag | advanced_analytics \| ai_recommendations | `src/lib/feature-flags.ts` |
| MaskedSuffixStatus | missing \| short \| valid | `src/lib/masked-suffix.ts` |
| TriggerSource | drawer-open \| focus \| hover | `src/lib/notifications-metrics.ts` |
| FetchSource | filter-change \| initial \| mutation \| polling \| prefetch | `src/lib/notifications-metrics.ts` |
| BadgeRenderSource | cache \| network | `src/lib/notifications-metrics.ts` |
| PasswordResetStatus | approved \| pending \| rejected | `src/lib/password-reset-status-config.ts` |
| AppRole | admin \| agente \| coordenador \| dev \| manager \| supervisor \| vendedor | `src/lib/roles.ts` |
| Role | agente \| desconhecido \| dev \| supervisor | `src/lib/access/access-denied-strings.tsx` |
| DevRouteUxEvent | abandon \| back \| copy_link \| fallback \| mail \| request_access \| retry \| view | `src/lib/access/dev-route-telemetry.ts` |
| CART_SWITCH_SOURCES | 'quick_add_selector', 'seller_carts_page' | `src/lib/analytics/cartAnalytics.ts` |
| CART_CHECKOUT_SOURCES | 'carts_list_page', 'cart_detail_header' | `src/lib/analytics/cartAnalytics.ts` |
| CART_SWITCH_FAILURE_REASONS | 'mutation_failed', 'session_expired', 'rate_limited', | `src/lib/analytics/cartAnalytics.ts` |
| SubstituteAppliedFailureStage | buffer_push \| custom_event \| mirror_invoke \| mirror_response \| unexpected | `src/lib/analytics/intelligenceAnalytics.ts` |
| ZERO_RESULT_ACTIONS | 'clear_filter', 'widen_window', 'apply_substitute', 'undo', | `src/lib/analytics/zeroResultAnalytics.ts` |
| FlowPhase | auth-listener-subscribed \| auth-state-change \| ip-blocked \| mount \| pkce-exchange-failed \| pkce-exchange-ok \| pkce-exchange-start \| provider-error-hash \| provider-error-query \| redirect-home \| redirect-login \| session-check-initial \| session-found-immediately \| timeout-recheck \| unexpected-error \| url-parsed | `src/lib/auth/auth-flow-tracer.ts` |
| FlowOutcome | failure \| pending \| success | `src/lib/auth/auth-flow-tracer.ts` |
| AUTH_BLOCKED_PREFIXES | '/auth', '/login', '/logout', '/signup', '/sign-up', '/register', '/reset-password', '/forgot-password', '/unauthorized', | `src/lib/auth/post-login-redirect.ts` |
| AuthErrorKind | credential \| network \| ratelimit \| server \| timeout \| unknown | `src/lib/auth/safeAuthCall.ts` |
| StepUpErrorKind | dev_role_required \| step_up_invalid \| step_up_required | `src/lib/auth/step-up-error.ts` |
| SalesScope | all \| self \| team | `src/lib/auth/visibility-scope.ts` |
| BICategorySlug | agendas \| blocos \| canetas \| eletronicos \| garrafas \| kits \| mochilas \| necessaires \| outros \| vestuario | `src/lib/bi/categoryResolver.ts` |
| ShippingDeadlineStatus | none \| ok \| overdue \| soon | `src/lib/carts/shipping-deadline.ts` |
| DeadlineFilter | all \| month \| none \| overdue \| soon \| week | `src/lib/carts/shipping-deadline.ts` |
| Operation | batch_insert \| delete \| insert \| select \| update \| upsert | `src/lib/db/postgrest.ts` |
| EndpointCategory | auth \| comparison \| connection \| crm \| dropbox \| magazine \| magic-up \| mcp \| other \| quote \| secrets \| visual-search \| webhook | `src/lib/edge/invokeBottlenecks.ts` |
| InvokeEventKind | breaker_open \| failed \| ok \| start | `src/lib/edge/invokeTelemetrySink.ts` |
| EdgeErrorKind | client \| credential \| network \| ratelimit \| server \| timeout \| unknown | `src/lib/edge/safeInvokeCall.ts` |
| ImportMode | insert \| upsert | `src/lib/external-db/batch-import.ts` |
| BridgeStatusType | degraded \| recovered \| unavailable | `src/lib/external-db/bridge-status-events.ts` |
| Operation | batch_insert \| delete \| insert \| select \| update \| upsert | `src/lib/external-db/bridge.ts` |
| KIT_AUDITED_FIELDS | 'component_name', 'material', 'color', 'height_mm', 'width_mm', 'length_mm', 'diameter_mm', 'circumference_mm', 'weight_g', // 'capacity_ml', // FIX 2026-06-27: coluna não existe em product_kit_components (PostgREST 400/42703) 'component_type_code', 'personalization_notes', | `src/lib/external-db/kit-coverage.ts` |
| BRIDGE_ALIASES | 'tecnica_gravacao', // → tabela_preco_gravacao_oficial 'personalization_techniques', // real table (uuid PK, EN cols) — NOT aliased; see rest-native.ts "BUG A" 'customization_price_tables', // → tabela_preco_fornecedores_gravacao (via bridge alias) 'customization_price_tiers', // → tabela_preco_grav … | `src/lib/external-db/tables.ts` |
| COMPANY_TABLES | 'client_contacts', 'organizations', 'companies' | `src/lib/external-db/tables.ts` |
| DegradationReason | missing_relation \| permission_denied \| quota_exceeded \| schema_mismatch | `src/lib/intelligence/degradation.ts` |
| HealthBand | danger \| good \| warning | `src/lib/inventory/health-score.ts` |
| RUPTURE_HORIZON_OPTIONS | 3, 7, 15, 30 | `src/lib/inventory/rupture-risk.ts` |
| ConfidenceBand | high \| low \| medium \| unknown | `src/lib/inventory/supplier-reliability/types.ts` |
| BoxRecommendationStatus | compatible \| incompatible \| inconclusive | `src/lib/kit-builder/box-recommendations.ts` |
| KitMakerGuideChapterId | ai \| box \| items \| personalization \| summary | `src/lib/kit-builder/guide-content.ts` |
| KitType | montado \| original \| simples | `src/lib/kit-builder/types.ts` |
| KitOrigin | ai \| manual \| template | `src/lib/kit-builder/types.ts` |
| KitBuilderStep | box \| items \| personalization \| summary | `src/lib/kit-builder/types.ts` |
| KitBuilderFlow | box-first \| items-first | `src/lib/kit-builder/types.ts` |
| KNOWN_SCOPES | 'quotes:read', 'orders:read', 'crm:read', 'products:read', 'code:read', 'code:write', '*', | `src/lib/mcp/scopes.ts` |
| DEV_ONLY_ROUTE_PREFIXES | '/simulacao', '/admin/telemetria', '/admin/conexoes', '/admin/seguranca', '/admin/seguranca-acesso', '/admin/workflows', '/admin/prompts-ia', '/admin/validade-precos', '/admin/rate-limit', '/admin/login-attempts', '/admin/sessoes', '/admin/status', '/admin/rbac-rotas', '/admin/qa', '/admin/observabi … | `src/lib/navigation/restricted-routes.ts` |
| ADMIN_ONLY_ROUTE_PREFIXES | '/admin/usuarios', '/admin/cadastros' | `src/lib/navigation/restricted-routes.ts` |
| PaymentGatewayStatus | approved \| pending \| rejected | `src/lib/payments/order-payment-simulator.ts` |
| OrderFinalStatus | cancelled \| confirmed \| pending | `src/lib/payments/order-payment-simulator.ts` |
| TotalsColorScheme | discount-hero \| total-hero | `src/lib/pdf/totalsColorScheme.ts` |
| PriceSchemaVersion | unknown \| v5.9-nested \| v6.x-flat \| v7-new | `src/lib/personalization/adapters/schema-detection.ts` |
| CATALOG_STOCK_STATUSES | 'in-stock', 'low-stock', 'out-of-stock' | `src/lib/products/stock-status.ts` |
| DiscountValidationKind | exceeds_limit \| idle \| invalid_negative \| invalid_over_100 \| markup_hint \| within_limit | `src/lib/quotes/discount-validation-messages.ts` |
| DiscountValidationSeverity | error \| info \| success \| warning | `src/lib/quotes/discount-validation-messages.ts` |
| ExpirationTone | text-amber-400 \| text-amber-500 \| text-destructive \| text-muted-foreground/80 | `src/lib/quotes/expiration.ts` |
| RouteRole | admin \| authenticated \| dev \| public | `src/lib/rbac/route-matrix.ts` |
| RouteGuard | AdminRoute \| DevRoute \| ProtectedRoute \| public | `src/lib/rbac/route-matrix.ts` |
| RlsOperation | DELETE \| INSERT \| SELECT \| UPDATE | `src/lib/security/rls-denial-logger.ts` |
| AlertSeverity | crit \| warn | `src/lib/telemetry/bridgeAlertThresholds.ts` |
| AlertMetric | avgResp \| p95 | `src/lib/telemetry/bridgeAlertThresholds.ts` |
| BridgeName | crm-db-bridge \| external-db-bridge | `src/lib/telemetry/bridgeCallMetrics.ts` |
| BridgeOperation | batch \| delete \| handshake \| health \| insert \| invoke \| rpc \| search \| select \| update \| upsert | `src/lib/telemetry/bridgeCallMetrics.ts` |
| QuoteHandoffSource | fromBiSuggestions \| fromCart \| fromCollection \| fromCompare \| fromSimulator \| fromUrlParams \| fromUrlParamsSingle | `src/lib/telemetry/quoteHandoffTelemetry.ts` |
| InvalidTransitionReason | db_check_violation \| not_allowed_by_config \| out_of_enum | `src/lib/telemetry/quoteStatusTelemetry.ts` |
| InvalidTransitionSource | db \| service \| ui | `src/lib/telemetry/quoteStatusTelemetry.ts` |
| RestoreEventName | restore_failed \| restore_ok \| restore_skipped_empty_snapshot \| restore_start | `src/lib/telemetry/restoreEventSchema.ts` |
| RestoreLogLevel | error \| info \| warn | `src/lib/telemetry/restoreLogger.ts` |
| LogLevel | debug \| error \| info \| warn | `src/lib/telemetry/structuredLogger.ts` |
| RangePreset | 7d \| 24h \| 30d \| custom | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| OperationFilter | all \| delete \| insert \| rpc \| select \| update | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| ErrorKindFilter | all \| auth \| network \| postgrest_error \| rate_limit \| timeout \| unknown \| validation | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| AlertLevel | breach_503 \| breach_both \| breach_cold_start \| ok | `src/pages/admin/telemetry/usePlatformFailureAlert.ts` |
| LatencyAlertSeverity | critical \| ok \| warning | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| GuardrailStatus | error \| insufficient_data \| ok \| regression \| warning | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| ComparisonWindow | 7d \| 24h \| 30d | `src/pages/admin/telemetry/useResolveProductsSelectComparison.ts` |
| SeverityFilter | all \| error \| slow \| very_slow | `src/pages/admin/telemetry/useTelemetryData.ts` |
| TimeFilter | 1h \| 6h \| 7d \| 24h \| custom | `src/pages/admin/telemetry/useTelemetryData.ts` |
| ViewMode | cards \| list \| table | `src/pages/advanced-price-search/types.ts` |
| WcagLevel | AA-large \| AA \| AAA \| fail | `src/pages/magazine/utils/contrast.ts` |
| StepId | content \| design \| identity \| layout \| products | `src/pages/magazine/utils/stepValidation.ts` |
| MagicUpCurationStatus | client-approved \| client-rejected \| draft \| favorite \| good \| internal-approved \| needs-adjustment \| sent-to-client | `src/pages/magic-up/magicUpStrategy.ts` |
| MagicUpCampaignStatus | approved \| draft \| rejected \| review \| sent | `src/pages/magic-up/magicUpStrategy.ts` |
| BulkRestoreTone | error \| success \| warning | `src/pages/products/seller-carts/bulkRestoreSummary.ts` |
| CartViewMode | grid \| list \| table | `src/pages/products/seller-carts/cartViewModePrefs.ts` |
| StorageBackend | localStorage \| memory \| sessionStorage | `src/pages/products/seller-carts/cartViewModePrefs.ts` |
| SortOption | expiring \| highest \| lowest \| newest \| oldest | `src/pages/quotes/useQuotesListPage.ts` |
| DeliveryMode | data \| prazo | `src/pages/quotes/components/DeliveryModeToggle.tsx` |
| TelemetryEventType | api_fail \| error \| performance \| ux_action | `src/services/telemetryService.ts` |
| SocialPlatform | facebook \| instagram \| linkedin \| outro \| telegram \| tiktok \| twitter \| whatsapp \| youtube | `src/types/crm.ts` |
| EmaHealthStatus | ERROR \| OK \| UNKNOWN \| WARN | `src/types/ema-health.ts` |
| AreaShape | circle \| custom \| oval \| rectangle \| triangle | `src/types/gravacao.ts` |
| MagazineTemplateId | catalog-giftset \| catalog-grid-2x3 \| catalog-grid-3x3 \| catalog-list \| corporate-executive \| corporate-hero \| corporate-split \| editorial-hero-grid \| editorial-magazine \| editorial-manifesto \| editorial-mono \| editorial-vogue | `src/types/magazine.ts` |
| MagazineTemplateFamily | catalog \| corporate \| editorial | `src/types/magazine.ts` |
| MagazineStructuredPageKind | back-cover \| contact \| cover \| institutional \| products \| section | `src/types/magazine.ts` |
| MAGAZINE_CATEGORIES | 'awards', 'bags', 'clocks', 'customized', 'drinkwares', 'general', 'giftsets', 'id', 'packaging', 'pins', 'signs', 'stationery', 'technology', 'wearables', | `src/types/magazine.ts` |
| ClientResponse | approved \| changes_requested \| rejected | `src/types/quote.ts` |
| QUOTE_STATUSES | 'approved', 'cancelled', 'converted', 'draft', 'expired', 'pending', 'pending_approval', 'rejected', 'sent', 'viewed', | `src/types/quote.ts` |
| StockAlertType | critical \| incoming_delayed \| low_stock \| out_of_stock \| overstock \| restock_needed \| stockout_predicted | `src/types/stock.ts` |
| StockSortOption | available_stock \| days_remaining \| name \| sku \| stock_quantity | `src/types/stock.ts` |
| StockGroupOption | category \| color_group \| color \| none \| product \| status \| supplier | `src/types/stock.ts` |
| TechniqueCategory | digital \| engraving \| impression \| other \| textile \| transfer | `src/types/domain/personalization.ts` |
| SimulatorStep | product \| results \| techniques | `src/types/domain/simulation.ts` |
| TipoSetup | arte_digital \| cliche \| fotolito \| matriz \| nenhum | `src/types/infrastructure/promobrind.ts` |
| FormatoVariante | cilindrica \| patch \| plana \| textil | `src/types/infrastructure/promobrind.ts` |
| TipoIntegracao | api_rest \| api_spot \| manual | `src/types/infrastructure/promobrind.ts` |
| CnpjErrorCode | cnpj_duplicated \| cnpj_dv_invalid \| cnpj_length_invalid \| cnpj_unknown | `src/utils/cnpj-errors.ts` |
| ImageTypeCode | ambient \| area \| box \| component \| detail \| gallery \| location \| logo \| main \| pouch \| product \| set | `src/utils/image-utils.ts` |
| CdnVariant | card \| large \| medium \| public \| small \| thumbnail | `src/utils/image-utils.ts` |
| ESTADOS_BR | 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO', | `src/utils/masks.ts` |
| PriceFreshnessStatus | aging \| fresh \| stale \| unknown | `src/utils/price-freshness.ts` |
| AppRole | dev \| supervisor \| admin \| agente \| vendedor | `supabase/functions/_shared/authorize.ts` |
| TriggeredBy | manual \| cron \| webhook | `supabase/functions/_shared/connection-test-runner.ts` |
| ErrorKind | timeout \| network \| dns \| http \| auth \| config \| unknown | `supabase/functions/_shared/connection-test-runner.ts` |
| ConnectionType | supabase \| bitrix24 \| n8n \| mcp \| webhook_outbound | `supabase/functions/_shared/connection-timeouts.ts` |
| EdgeRole | vendedor \| agente \| supervisor \| admin \| dev | `supabase/functions/_shared/createEdge.ts` |
| CredentialSource | db \| env \| none | `supabase/functions/_shared/credentials.ts` |
| AppRole | dev \| supervisor \| agente | `supabase/functions/_shared/dispatcher-auth.ts` |
| DispatcherAuthMode | secret \| user_jwt | `supabase/functions/_shared/dispatcher-auth.ts` |
| CronAuthMode | secret \| secret_vault | `supabase/functions/_shared/dispatcher-auth.ts` |
| AuthzCategory | public \| authenticated \| supervisor \| dev \| service \| scoped | `supabase/functions/_shared/edge-authz-manifest.ts` |
| ResourceGroup | products \| companies \| views | `supabase/functions/_shared/external-db-config.ts` |
| Operation | select \| insert \| update \| delete \| rpc \| upsert \| batch_insert | `supabase/functions/_shared/external-db-config.ts` |
| ALLOWED_RPCS | 'fn_get_product_print_areas', 'fn_get_product_print_areas_v2', 'fn_get_product_customization_options', 'fn_link_product_print_areas', 'fn_backfill_product_print_areas', 'fn_get_customization_price', 'fn_get_customization_price_v2', 'fn_find_fornecedor_price_table', 'get_category_descendants', | `supabase/functions/_shared/external-db-config.ts` |
| COMPANY_TABLES | 'bitrix_clients', 'client_contacts', 'client_notes', 'organizations', 'user_organizations', 'business_sectors', | `supabase/functions/_shared/external-db-config.ts` |
| ErrorKind | timeout \| postgrest_error \| validation \| network \| rate_limit \| auth \| unknown | `supabase/functions/_shared/external-db-telemetry.ts` |
| KNOWN_SCOPES | "quotes:read", "orders:read", "crm:read", "products:read", "code:read", "code:write", "*", | `supabase/functions/_shared/mcp-scopes.ts` |
| McpViolationReason | missing_jwt \| invalid_jwt \| not_admin \| stepup_missing \| stepup_invalid \| stepup_consume_failed \| rate_limited \| validation_failed \| unauthorized_direct_write \| other | `supabase/functions/_shared/mcp-violations.ts` |
| LogLevel | debug \| info \| warn \| error | `supabase/functions/_shared/structured-logger.ts` |
| ApiFormat | openai_compatible \| anthropic_native \| google_native \| custom | `supabase/functions/_shared/ai-router/types.ts` |
| ErrorKind | timeout \| network \| auth \| rate_limit \| server \| client \| parse \| missing_credential \| unknown | `supabase/functions/_shared/ai-router/types.ts` |
| ContractErrorCode | missing_body \| invalid_json \| validation_failed \| unsupported_version \| version_negotiation_failed | `supabase/functions/_shared/contracts/errors.ts` |
| InsertResultShape | rows \| empty-array \| null \| generic-string-error \| single-object \| primitive \| unknown | `supabase/functions/crm-db-bridge/index.ts` |
| CRM_BROAD_READ_ROLES | "dev", "admin", "supervisor", "manager", "gerente" | `supabase/functions/crm-db-bridge/ownership.ts` |
| EmaHealthStatus | OK \| WARN \| ERROR \| UNKNOWN | `supabase/functions/ema-pipeline-health/handler.ts` |
| ALLOWED_EVENT_TYPES | "approved", "rejected", "order_created", "sent_to_client", "expired", | `supabase/functions/receive-crm-callback/index.ts` |
| SimulationOutcome | passed \| rejected \| infra_failed \| skipped | `supabase/functions/simulation-orchestrator/outcomes.ts` |
| SimulationExpectation | accept \| reject | `supabase/functions/simulation-orchestrator/outcomes.ts` |
| EdgeRole | anon \| authenticated \| supervisor \| dev | `tests/edge-functions/live/_live-client.ts` |

## F. Validações de entrada

### F.1 Schemas Zod

- **productFormSchema** (`src/components/admin/products/ProductFormSchema.ts`, z.object):
  ```ts
  { // Info básica sku: z.string().trim().min(1, 'SKU é obrigatório').max(50, 'SKU muito longo'), name: z.string().trim().min(1, 'Nome é obrigatório').max(300, 'Nome muito longo'), description: z.string().max(5000, 'Descrição muito longa').optional().default(''), short_description: z.string().max(500, 'Descrição curta muito longa').optional().default(''), brand: z.string().max(100).optional().default(''), // Categoria e fornecedor (IDs reais do BD externo) category_id: z.string().optional().default(''), supplier_id: z.string().min(1, 'Fornecedor é obrigatório'), supplier_reference: z.string().max(100).optional().default(''), supplier_product_url: z.string().max(500).optional().default(''), // Preço e estoque sale_price: z.coerce.number().min(0, 'Preço não pode ser negativo').default(0), cost …
  ```
- **FormSchema** (`src/components/admin/users/PromotionDialog.tsx`, z.object):
  ```ts
  { password: z.string().min(1, 'Informe sua senha'), reason: z .string() .trim() .min(10, 'Justificativa deve ter pelo menos 10 caracteres') .max(500, 'Máximo 500 caracteres'), }
  ```
- **forgotPasswordSchema** (`src/components/auth/ForgotPasswordForm.tsx`, z.object):
  ```ts
  { email: z.string().email('Email inválido'), }
  ```
- **suggestionSchema** (`src/components/kit-builder/KitAIPromptDialog.tsx`, z.object):
  ```ts
  { kit_type: z.enum(['montado', 'original', 'simples']), box_keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(4), item_keywords: z.array(z.string().trim().min(1).max(80)).min(3).max(6), target_price_brl: z.object({ min: z.number().finite().nonnegative(), max: z.number().finite().nonnegative(), }), narrative: z.string().trim().min(1).max(500), title: z.string().trim().min(1).max(80).optional(), description: z.string().trim().min(1).max(160).optional(), style_tag: z.string().trim().min(1).max(40).optional(), }
  ```
- **shippingDeadlineSchema** (`src/lib/carts/shipping-deadline.ts`, z.union, encadeia refine, transform):
  ```ts
  [z.string().trim(), z.null()]
  ```
  - Regras cruzadas (refine): “Data inválida. Use o formato dd/mm/aaaa.” · “Data inválida.” · “A data não pode estar no passado.”
- **safeString** (`src/lib/security/validation.ts`, z.string, encadeia transform):
  ```ts
  
  ```
- **safeHtml** (`src/lib/security/validation.ts`, z.string, encadeia transform):
  ```ts
  
  ```
- **uuidSchema** (`src/lib/security/validation.ts`, z.string):
  ```ts
  
  ```
- **emailSchema** (`src/lib/security/validation.ts`, z.string):
  ```ts
  
  ```
- **userSchema** (`src/lib/security/validation.ts`, z.object):
  ```ts
  { id: uuidSchema, email: emailSchema, full_name: z.string().min(1).max(255).optional(), }
  ```
- **strongPasswordSchema** (`src/lib/validations/authSchema.ts`, z.string):
  ```ts
  
  ```
- **loginSchema** (`src/lib/validations/authSchema.ts`, z.object):
  ```ts
  { email: z .string() .min(1, 'Email é obrigatório') .email('Email inválido') .transform((val) => val.toLowerCase()), password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'), }
  ```
- **signupSchema** (`src/lib/validations/authSchema.ts`, z.object, encadeia refine):
  ```ts
  { fullName: z .string() .min(2, 'Nome deve ter pelo menos 2 caracteres') .max(100, 'Nome deve ter no máximo 100 caracteres'), email: z.string().min(1, 'Email é obrigatório').email('Email inválido'), password: strongPasswordSchema, confirmPassword: z.string(), }
  ```
  - Regras cruzadas (refine): “Senhas não conferem”
- **forgotPasswordSchema** (`src/lib/validations/authSchema.ts`, z.object):
  ```ts
  { email: z.string().min(1, 'Email é obrigatório').email('Email inválido'), }
  ```
- **resetPasswordSchema** (`src/lib/validations/authSchema.ts`, z.object, encadeia refine):
  ```ts
  { password: strongPasswordSchema, confirmPassword: z.string(), }
  ```
  - Regras cruzadas (refine): “Senhas não conferem”
- **salesGoalSchema** (`src/lib/validations/goalSchema.ts`, z.object, encadeia refine):
  ```ts
  { title: z .string() .min(2, 'Título deve ter pelo menos 2 caracteres') .max(100, 'Título deve ter no máximo 100 caracteres'), target_value: z .number() .positive('Meta deve ser um valor positivo') .max(999999999, 'Valor máximo excedido'), goal_type: z.enum(['revenue', 'quotes', 'orders', 'conversion'], { error: 'Tipo de meta é obrigatório', }), period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], { error: 'Período é obrigatório', }), start_date: z .string() .min(1, 'Data de início é obrigatória') .refine(isValidCalendarDate, 'Data de início inválida'), end_date: z .string() .min(1, 'Data de fim é obrigatória') .refine(isValidCalendarDate, 'Data de fim inválida'), notes: z .string() .max(500, 'Notas devem ter no máximo 500 caracteres') .optional() .or(z.literal('')), }
  ```
  - Regras cruzadas (refine): “Data de início inválida” · “Data de fim inválida” · “Data de fim deve ser posterior à data de início”
- **profileSchema** (`src/lib/validations/profileSchema.ts`, z.object):
  ```ts
  { full_name: z .string() .min(2, 'Nome deve ter pelo menos 2 caracteres') .max(100, 'Nome deve ter no máximo 100 caracteres'), phone: z .string() .max(20, 'Telefone deve ter no máximo 20 caracteres') .refine( (val) => !val || phoneRegex.test(val.replace(/\s/g, '')), 'Formato de telefone inválido. Ex: (11) 99999-9999', ) .optional() .or(z.literal('')), }
  ```
  - Regras cruzadas (refine): “Formato de telefone inválido. Ex: (11) 99999-9999”
- **quoteFormSchema** (`src/lib/validations/quoteSchema.ts`, z.object, encadeia refine):
  ```ts
  { clientId: z.string().min(1, 'Empresa é obrigatória'), contactId: z.string().min(1, 'Contato é obrigatório'), paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória'), paymentTerms: z.string().min(1, 'Prazo de pagamento é obrigatório'), deliveryTime: z.string().min(1, 'Prazo de entrega é obrigatório'), shippingType: z.string().min(1, 'Tipo de frete é obrigatório'), shippingCost: z.number().default(0), validUntil: z.string().optional(), discountType: z.enum(['percent', 'amount']).default('percent'), discountValue: z.number().min(0, 'Desconto não pode ser negativo').default(0), notes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').optional(), }
  ```
  - Regras cruzadas (refine): “Valor do frete inconsistente com a modalidade selecionada” · “Desconto percentual não pode exceder 100%”
- **quoteItemSchema** (`src/lib/validations/quoteSchema.ts`, z.object):
  ```ts
  { product_id: z.string().min(1, 'Produto é obrigatório'), product_name: z.string().min(1, 'Nome do produto é obrigatório'), product_sku: z.string().optional(), product_image_url: z.string().optional(), quantity: z.number().int().min(1, 'Quantidade mínima é 1'), unit_price: z.number().min(0, 'Preço não pode ser negativo'), color_name: z.string().optional(), color_hex: z.string().optional(), }
  ```
- **ipSchema** (`src/pages/admin/AdminSegurancaAcessoPage.tsx`, z.object):
  ```ts
  { ip_address: z .string() .trim() .min(3, 'IP inválido') .max(45, 'IP muito longo') .regex(/^[0-9a-fA-F:./]+$/, 'Use apenas IPv4, IPv6 ou CIDR'), list_type: z.enum(['allow', 'block']), reason: z.string().trim().max(500, 'Máx 500 caracteres').optional().or(z.literal('')), expires_at: z.string().optional().or(z.literal('')), }
  ```
- **magazineContentSettingsSchema** (`src/types/magazine.ts`, z.object):
  ```ts
  { showPrice: z.boolean(), showCode: z.boolean(), showPersonalization: z.boolean(), showDescription: z.boolean(), showDimensions: z.boolean(), showMaterials: z.boolean(), showColors: z.boolean(), groupByCategory: z.boolean(), introText: z.string(), closingText: z.string(), }
  ```
- **magazineClientBrandingSchema** (`src/types/magazine.ts`, z.object):
  ```ts
  { clientName: z.string().nullable(), clientLogoUrl: z.string().nullable(), clientCrmId: z.string().nullable(), colors: z.object({ primary: z.string(), secondary: z.string(), text: z.string() }), category: z.enum(MAGAZINE_CATEGORIES).nullable(), }
  ```
- **magazineProductSnapshotSchema** (`src/types/magazine.ts`, z.object):
  ```ts
  { id: z.string(), name: z.string(), sku: z.string(), shortDescription: z.string(), description: z.string().nullable(), price: z.number(), sale_price: z.number(), image_url: z.string(), images: z.array(z.string()), colors: z.array( z.object({ name: z.string(), hex: z.string(), group: z.string() }).passthrough(), ), category_name: z.string().nullable(), category_id: z.string().nullable(), materials: z.array(z.string()), hasPersonalization: z.boolean().nullable(), dimensions: z .object({ height_cm: z.number().nullable(), width_cm: z.number().nullable(), length_cm: z.number().nullable(), diameter_cm: z.number().nullable(), circumference_cm: z.number().nullable(), weight_g: z.number().nullable(), capacity_ml: z.number().nullable(), }) .partial() .passthrough(), }
  ```
- **quoteStatusSchema** (`src/types/quote.ts`, z.enum):
  ```ts
  QUOTE_STATUSES
  ```
- **cpfOptionalSchema** (`src/utils/br-schemas.ts`, z.string, encadeia nullable, optional, refine, transform):
  ```ts
  
  ```
  - Regras cruzadas (refine): “CPF deve conter exatamente 11 dígitos (sem máscara).” · “CPF inválido (dígitos verificadores não conferem).”
- **cepOptionalSchema** (`src/utils/br-schemas.ts`, z.string, encadeia nullable, optional, refine, transform):
  ```ts
  
  ```
  - Regras cruzadas (refine): “CEP deve conter exatamente 8 dígitos (sem máscara).” · “CEP inválido.”
- **phoneBrOptionalSchema** (`src/utils/br-schemas.ts`, z.string, encadeia nullable, optional, refine, transform):
  ```ts
  
  ```
  - Regras cruzadas (refine): “Telefone deve ter 10 ou 11 dígitos com DDD (sem máscara).” · “Telefone inválido (verifique DDD e formato).”
- **cnpjOptionalSchema** (`src/utils/cnpj-schema.ts`, z.string, encadeia nullable, optional, refine, transform):
  ```ts
  
  ```
  - Regras cruzadas (refine): “CNPJ deve conter exatamente 14 dígitos (sem máscara).” · “CNPJ inválido (dígitos verificadores não conferem).”
- **uuidSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **nonEmptyString** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **positiveInt** (`supabase/functions/_shared/zod-validate.ts`, z.number):
  ```ts
  
  ```
- **nonNegativeNumber** (`supabase/functions/_shared/zod-validate.ts`, z.number):
  ```ts
  
  ```
- **emailSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **tokenSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **imageInputSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **paginationSchema** (`supabase/functions/_shared/zod-validate.ts`, z.object):
  ```ts
  { page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(500).default(50), }
  ```
- **ChatMessage** (`supabase/functions/_shared/contracts/schemas/bi-copilot.ts`, z.object):
  ```ts
  { role: z.enum(["user", "assistant"]), content: z.string().max(10000), }
  ```
- **BiCopilotV1** (`supabase/functions/_shared/contracts/schemas/bi-copilot.ts`, z.object):
  ```ts
  { question: z.string().min(1).max(500), context: z.record(z.unknown()).optional(), history: z.array(ChatMessage).max(50).optional(), }
  ```
- **BiCopilotV2** (`supabase/functions/_shared/contracts/schemas/bi-copilot.ts`, z.object):
  ```ts
  { question: z.string().min(3).max(500), context: z.record(z.unknown()), history: z.array(ChatMessage).max(50).optional(), }
  ```
- **BlockIpTemporarilyV1** (`supabase/functions/_shared/contracts/schemas/block-ip-temporarily.ts`, z.object):
  ```ts
  { ip: z.string().min(1).max(45).regex(IP_REGEX_V1, { message: "IP inválido (use IPv4, IPv6 ou CIDR)", }), reason: z.string().max(500).optional(), hours: z.number().int().min(1).max(720).optional(), }
  ```
- **BlockIpTemporarilyV2** (`supabase/functions/_shared/contracts/schemas/block-ip-temporarily.ts`, z.object):
  ```ts
  { ip: z.string().min(1).max(45).regex(IP_REGEX_V2, { message: "IP inválido (use IPv4, IPv6 ou CIDR)", }), reason: z.string().min(1).max(500), hours: z.number().int().min(1).max(720), }
  ```
- **SellerScopeEnum** (`supabase/functions/_shared/contracts/schemas/e2e-cleanup.ts`, z.enum):
  ```ts
  ["self", "explicit"]
  ```
- **E2eCleanupV1** (`supabase/functions/_shared/contracts/schemas/e2e-cleanup.ts`, z.object):
  ```ts
  { email: z.string().email().max(320).optional(), dryRun: z.boolean().optional(), sellerScope: SellerScopeEnum.optional(), sellerId: z.string().max(100).optional(), nameFilterPrefix: z.string().max(100).optional(), }
  ```
- **E2eCleanupV2** (`supabase/functions/_shared/contracts/schemas/e2e-cleanup.ts`, z.object, encadeia refine):
  ```ts
  { email: z.string().email().max(320), dryRun: z.boolean(), sellerScope: SellerScopeEnum.default("self"), sellerId: z.string().uuid().optional(), nameFilterPrefix: z.string().min(1).max(100).optional(), confirm: z.literal(true), idempotency_key: z.string().uuid(), }
  ```
  - Regras cruzadas (refine): “sellerId is required when sellerScope=”
- **ForceGlobalLogoutV1** (`supabase/functions/_shared/contracts/schemas/force-global-logout.ts`, z.object):
  ```ts
  { confirm: z.literal("FORCE_LOGOUT_ALL"), }
  ```
- **ForceGlobalLogoutV2** (`supabase/functions/_shared/contracts/schemas/force-global-logout.ts`, z.object):
  ```ts
  { confirm: z.literal("FORCE_LOGOUT_ALL"), idempotency_key: z.string().uuid(), }
  ```
- **KitAiBuilderV1** (`supabase/functions/_shared/contracts/schemas/kit-ai-builder.ts`, z.object):
  ```ts
  { prompt: z .string() .min(6, { message: "prompt inválido (6–2000 chars)" }) .max(2000, { message: "prompt inválido (6–2000 chars)" }), }
  ```
- **KitAiBuilderV2** (`supabase/functions/_shared/contracts/schemas/kit-ai-builder.ts`, z.object):
  ```ts
  { prompt: z.string().min(6).max(2000), idempotency_key: z.string().uuid(), }
  ```
- **KitAiBuilderSuggestion** (`supabase/functions/_shared/contracts/schemas/kit-ai-builder.ts`, z.object):
  ```ts
  { kit_type: z.enum(["montado", "original", "simples"]), box_keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(4), item_keywords: z.array(z.string().trim().min(1).max(80)).min(3).max(6), target_price_brl: z .object({ min: z.number().finite().nonnegative(), max: z.number().finite().nonnegative() }) .strict() .refine((value) => value.max >= value.min, { message: "target_price_brl.max must be greater than or equal to min", }), narrative: z.string().trim().min(1).max(500), // Opcionais (etapa 17): sem eles, o cliente mantém o fallback atual // ("Kit sugerido N") — nunca quebram um cliente que ainda não os lê. title: z.string().trim().min(1).max(80).optional(), description: z.string().trim().min(1).max(160).optional(), style_tag: z.string().trim().min(1).max(40).optional(), }
  ```
  - Regras cruzadas (refine): “target_price_brl.max must be greater than or equal to min”
- **InsightFocusEnum** (`supabase/functions/_shared/contracts/schemas/market-intelligence-insights.ts`, z.enum):
  ```ts
  ["auto", "conversion", "ticket", "rupture"]
  ```
- **MarketIntelligenceInsightsV1** (`supabase/functions/_shared/contracts/schemas/market-intelligence-insights.ts`, z.object):
  ```ts
  { days: z.number().int().min(1).max(365).optional(), categoryId: z.string().max(100).nullable().optional(), supplierId: z.string().max(100).nullable().optional(), productId: z.string().max(100).nullable().optional(), categoryName: z.string().max(255).nullable().optional(), supplierName: z.string().max(255).nullable().optional(), productName: z.string().max(255).nullable().optional(), forceRefresh: z.boolean().optional(), focus: InsightFocusEnum.optional(), }
  ```
- **MarketIntelligenceInsightsV2** (`supabase/functions/_shared/contracts/schemas/market-intelligence-insights.ts`, z.object):
  ```ts
  { days: z.number().int().min(1).max(365).default(30), categoryId: z.string().uuid().nullable().optional(), supplierId: z.string().uuid().nullable().optional(), productId: z.string().uuid().nullable().optional(), categoryName: z.string().min(1).max(255).nullable().optional(), supplierName: z.string().min(1).max(255).nullable().optional(), productName: z.string().min(1).max(255).nullable().optional(), forceRefresh: z.boolean().default(false), focus: InsightFocusEnum.default("auto"), }
  ```
- **OwnershipAuditV1** (`supabase/functions/_shared/contracts/schemas/ownership-audit.ts`, z.object):
  ```ts
  { triggered_by: z.string().max(64).optional(), }
  ```
- **OwnershipAuditV2** (`supabase/functions/_shared/contracts/schemas/ownership-audit.ts`, z.object):
  ```ts
  { triggered_by: z.string().min(1).max(64), }
  ```
- **OwnershipRepairV1** (`supabase/functions/_shared/contracts/schemas/ownership-repair.ts`, z.object):
  ```ts
  { report_id: z.string().max(100).optional(), dry_run: z.boolean().optional(), triggered_by: z.string().max(64).optional(), }
  ```
- **OwnershipRepairV2** (`supabase/functions/_shared/contracts/schemas/ownership-repair.ts`, z.object):
  ```ts
  { report_id: z.string().uuid().optional(), dry_run: z.boolean(), triggered_by: z.string().min(1).max(64), idempotency_key: z.string().uuid(), }
  ```
- **JsonPrimitive** (`supabase/functions/_shared/contracts/schemas/product-webhook.ts`, z.union):
  ```ts
  [z.string(), z.number(), z.boolean(), z.null()]
  ```
- **ProductV1** (`supabase/functions/_shared/contracts/schemas/product-webhook.ts`, z.object):
  ```ts
  { external_id: z.string().max(255).optional(), sku: z.string().min(1).max(100), name: z.string().min(1).max(500), description: z.string().max(5000).optional(), price: z.number().nonnegative(), min_quantity: z.number().int().positive().optional(), category_id: z.number().int().optional(), category_name: z.string().max(255).optional(), subcategory: z.string().max(255).optional(), supplier_id: z.string().max(255).optional(), supplier_name: z.string().max(255).optional(), stock: z.number().int().nonnegative().optional(), stock_status: z.string().max(50).optional(), is_kit: z.boolean().optional(), is_active: z.boolean().optional(), featured: z.boolean().optional(), new_arrival: z.boolean().optional(), on_sale: z.boolean().optional(), images: z.array(z.string().url().max(2000)).max(50).optional( …
  ```
  - Regras cruzadas (refine): “tags must have at most 100 keys” · “metadata must have at most 100 keys”
- **ProductWebhookV1** (`supabase/functions/_shared/contracts/schemas/product-webhook.ts`, z.object):
  ```ts
  { action: z.enum(["sync", "upsert", "delete", "batch_upsert"]), products: z.array(ProductV1).max(500).optional(), product: ProductV1.optional(), external_ids: z.array(z.string().max(255)).max(500).optional(), }
  ```
- **ProductWebhookV2** (`supabase/functions/_shared/contracts/schemas/product-webhook.ts`, z.object, encadeia superRefine):
  ```ts
  { action: z.enum(["upsert", "delete", "batch_upsert"]), products: z.array(ProductV2).max(500).optional(), product: ProductV2.optional(), external_ids: z.array(z.string().min(1).max(255)).max(500).optional(), /** Idempotency key obrigatória em v2. */ idempotency_key: z.string().uuid(), }
  ```
  - Regras cruzadas (refine): “product and products are mutually exclusive”
- **EmailEvent** (`supabase/functions/_shared/contracts/schemas/send-transactional-email.ts`, z.enum):
  ```ts
  [ "quote_sent", "quote_approved", "quote_rejected", "order_created", ]
  ```
- **SendTransactionalEmailV1** (`supabase/functions/_shared/contracts/schemas/send-transactional-email.ts`, z.object):
  ```ts
  { event_type: EmailEvent, recipient_email: z.string().email().max(320), recipient_name: z.string().max(200).optional(), data: z.record(z.unknown()).default({}), }
  ```
- **SendTransactionalEmailV2** (`supabase/functions/_shared/contracts/schemas/send-transactional-email.ts`, z.object):
  ```ts
  { event_type: EmailEvent, recipient_email: z.string().email().max(320), recipient_name: z.string().min(1).max(200).optional(), data: z.record(z.unknown()), idempotency_key: z.string().uuid(), }
  ```
- **ModeEnum** (`supabase/functions/_shared/contracts/schemas/simulation-orchestrator.ts`, z.enum):
  ```ts
  ["resilience", "load", "fuzzing"]
  ```
- **TargetFnEnum** (`supabase/functions/_shared/contracts/schemas/simulation-orchestrator.ts`, z.enum):
  ```ts
  [ "external-db-bridge", "webhook-inbound", "product-webhook", "webhook-dispatcher", ]
  ```
- **SimulationOrchestratorV1** (`supabase/functions/_shared/contracts/schemas/simulation-orchestrator.ts`, z.object):
  ```ts
  { count: z.number().int().min(1).max(10000).optional(), targetFunctions: z.array(z.string().max(100)).max(20).optional(), mode: ModeEnum.optional(), }
  ```
- **SimulationOrchestratorV2** (`supabase/functions/_shared/contracts/schemas/simulation-orchestrator.ts`, z.object):
  ```ts
  { count: z.number().int().min(1).max(10000).default(100), targetFunctions: z.array(TargetFnEnum).min(1).max(20), mode: ModeEnum, idempotency_key: z.string().uuid(), }
  ```
- **ActionEnum** (`supabase/functions/_shared/contracts/schemas/step-up-verify.ts`, z.enum):
  ```ts
  [ "promote_dev", "demote_dev", "mcp_full_issue", "mcp_full_escalate", "mcp_key_revoke", "mcp_key_rotate", "secret_rotation", "secret_revoke", ]
  ```
- **StepUpVerifyV1** (`supabase/functions/_shared/contracts/schemas/step-up-verify.ts`, z.object):
  ```ts
  { step: z.enum(["request", "verify_password", "verify_otp", "cancel"]), action: ActionEnum.optional(), action_label: z.string().max(200).optional(), target_ref: z.string().max(500).nullable().optional(), challenge_id: z.string().max(100).optional(), password: z.string().max(1000).optional(), otp: z.string().max(20).optional(), cancel_reason: z.string().max(500).optional(), }
  ```
- **RequestStepV2** (`supabase/functions/_shared/contracts/schemas/step-up-verify.ts`, z.object):
  ```ts
  { step: z.literal("request"), action: ActionEnum, action_label: z.string().min(1).max(200).optional(), target_ref: z.string().max(500).nullable().optional(), }
  ```
- **VerifyPasswordStepV2** (`supabase/functions/_shared/contracts/schemas/step-up-verify.ts`, z.object):
  ```ts
  { step: z.literal("verify_password"), challenge_id: z.string().uuid(), password: z.string().min(1).max(1000), }
  ```
- **VerifyOtpStepV2** (`supabase/functions/_shared/contracts/schemas/step-up-verify.ts`, z.object):
  ```ts
  { step: z.literal("verify_otp"), challenge_id: z.string().uuid(), otp: z.string().min(4).max(20), }
  ```
- **CancelStepV2** (`supabase/functions/_shared/contracts/schemas/step-up-verify.ts`, z.object):
  ```ts
  { step: z.literal("cancel"), challenge_id: z.string().uuid(), cancel_reason: z.string().max(500).optional(), }
  ```
- **StepUpVerifyV2** (`supabase/functions/_shared/contracts/schemas/step-up-verify.ts`, z.discriminatedUnion):
  ```ts
  "step", [ RequestStepV2, VerifyPasswordStepV2, VerifyOtpStepV2, CancelStepV2, ]
  ```
- **DirectionEnum** (`supabase/functions/_shared/contracts/schemas/sync-external-db.ts`, z.enum):
  ```ts
  ["to-external", "from-external"]
  ```
- **AllowedTableEnum** (`supabase/functions/_shared/contracts/schemas/sync-external-db.ts`, z.enum):
  ```ts
  SYNC_ALLOWED_TABLES
  ```
- **SyncExternalDbV1** (`supabase/functions/_shared/contracts/schemas/sync-external-db.ts`, z.object):
  ```ts
  { table: AllowedTableEnum, direction: DirectionEnum.optional(), since: z.string().max(50).optional(), }
  ```
- **SyncExternalDbV2** (`supabase/functions/_shared/contracts/schemas/sync-external-db.ts`, z.object):
  ```ts
  { table: AllowedTableEnum, direction: DirectionEnum, since: z.string().datetime({ offset: true }).optional(), idempotency_key: z.string().uuid(), }
  ```
- **TrendsInsightsV1** (`supabase/functions/_shared/contracts/schemas/trends-insights.ts`, z.object):
  ```ts
  { days: z.number().int().min(1).max(365).optional(), }
  ```
- **TrendsInsightsV2** (`supabase/functions/_shared/contracts/schemas/trends-insights.ts`, z.object):
  ```ts
  { days: z.number().int().min(1).max(365), }
  ```
- **WebhookDispatcherV1** (`supabase/functions/_shared/contracts/schemas/webhook-dispatcher.ts`, z.object):
  ```ts
  { event: z.string().min(1), payload: z.unknown().optional(), replay_delivery_id: z.string().uuid().optional(), test_mode: z.boolean().optional(), test_webhook_id: z.string().uuid().optional(), }
  ```
- **Dispatch** (`supabase/functions/_shared/contracts/schemas/webhook-dispatcher.ts`, z.object):
  ```ts
  { mode: z.literal("dispatch"), event: z.string().min(1).max(150), payload: z.record(z.unknown()), }
  ```
- **Replay** (`supabase/functions/_shared/contracts/schemas/webhook-dispatcher.ts`, z.object):
  ```ts
  { mode: z.literal("replay"), replay_delivery_id: z.string().uuid(), }
  ```
- **TestRun** (`supabase/functions/_shared/contracts/schemas/webhook-dispatcher.ts`, z.object):
  ```ts
  { mode: z.literal("test"), event: z.string().min(1).max(150), payload: z.record(z.unknown()), test_webhook_id: z.string().uuid(), }
  ```
- **WebhookDispatcherV2** (`supabase/functions/_shared/contracts/schemas/webhook-dispatcher.ts`, z.discriminatedUnion):
  ```ts
  "mode", [ Dispatch, Replay, TestRun, ]
  ```
- **WebhookInboundV2** (`supabase/functions/_shared/contracts/schemas/webhook-inbound.ts`, z.object):
  ```ts
  { /** Tipo do evento (ex.: "order.created"). */ event: z.string().min(1).max(150).regex( /^[a-z][a-z0-9_.-]*$/i, "event must be slug-like (letters, digits, '.', '_', '-')", ), /** Timestamp ISO em que o evento ocorreu no sistema de origem. */ occurred_at: z.string().datetime(), /** Payload livre do emissor; objeto exigido para evitar bytes soltos. */ data: z.record(z.unknown()), /** Idempotency-key opcional do emissor — quando presente, deve ser UUID. */ idempotency_key: z.string().uuid().optional(), }
  ```
- **RecommendationRequestSchema** (`supabase/functions/ai-recommendations/index.ts`, z.object):
  ```ts
  { client: z.object({ name: z.string(), company: z.string().optional(), industry: z.string().optional(), preferences: z.array(z.string()).optional(), purchaseHistory: z.array(z.string()).optional(), budget: z.string().optional(), }), products: z.array(z.object({ id: z.string(), name: z.string(), category: z.string(), tags: z.array(z.string()).optional(), })), }
  ```
- **LogoSchema** (`supabase/functions/analyze-logo-colors/index.ts`, z.object):
  ```ts
  { imageBase64: z.string().min(10, 'imageBase64 is required').max(10_000_000, 'Image too large'), }
  ```
- **ColorSchema** (`supabase/functions/analyze-logo-colors/index.ts`, z.object):
  ```ts
  { name: z.string().min(1).max(60), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), }
  ```
- **AnonymizeUserSchema** (`supabase/functions/anonymize-user/index.ts`, z.object):
  ```ts
  { confirm_phrase: z.literal("EXCLUIR MINHA CONTA"), }
  ```
- **BitrixSyncSchema** (`supabase/functions/bitrix-sync/index.ts`, z.object):
  ```ts
  { action: z.enum([ 'get_companies', 'get_company', 'search_companies', 'get_deals', 'get_deal_products', 'sync_full', 'get_stored_clients', 'get_stored_deals', 'create_deal', 'update_deal', 'get_sync_logs', ]), data: z.record(z.unknown()).optional(), }
  ```
- **bodySchema** (`supabase/functions/bulk-random-passwords/index.ts`, z.object):
  ```ts
  { mode: z.enum(["dry_run", "apply"]).optional(), // Numéricos sem teto aqui: o handler já faz Math.min/Math.max nos // valores (clamp existente) — capar no schema converteria um pedido // apply em dry_run silencioso via fallback {}. length: z.number().optional(), includeUpper: z.boolean().optional(), includeLower: z.boolean().optional(), includeDigits: z.boolean().optional(), includeSymbols: z.boolean().optional(), excludeEmails: z.array(z.string().max(320)).optional(), onlyEmails: z.array(z.string().max(320)).optional(), maxUsers: z.number().optional(), pageSize: z.number().optional(), }
  ```
- **CategoriesRequestSchema** (`supabase/functions/categories-api/index.ts`, z.object):
  ```ts
  { action: z.enum(['tree', 'all', 'descendants', 'products_by_categories']), categoryIds: z.array(z.string()).max(200).optional(), includeDescendants: z.boolean().optional(), }
  ```
- **bodySchema** (`supabase/functions/check-login/index.ts`, z.object):
  ```ts
  { email: z.string().max(320).optional(), turnstile_token: z.string().max(4096).optional(), }
  ```
- **CnpjBodySchema** (`supabase/functions/cnpj-lookup/index.ts`, z.object):
  ```ts
  { cnpj: z .string() .min(1, 'CNPJ é obrigatório') .transform((v) => v.replace(/\D/g, '')) .refine((v) => v.length === 14, 'CNPJ deve ter 14 dígitos'), }
  ```
  - Regras cruzadas (refine): “CNPJ deve ter 14 dígitos”
- **ActionSchema** (`supabase/functions/commemorative-dates/index.ts`, z.object):
  ```ts
  { action: z.enum(['get_active_dates', 'get_upcoming_dates', 'get_products_by_date', 'get_dates_with_colors']), params: z.object({ days_ahead: z.number().int().min(1).max(365).optional(), slug: z.string().trim().min(1).max(200).optional(), limit: z.number().int().min(1).max(500).optional(), include_all_colors: z.boolean().optional(), }).optional(), }
  ```
- **ProductSchema** (`supabase/functions/comparison-ai-advisor/index.ts`, z.object):
  ```ts
  { id: z.union([z.string(), z.number()]).transform(String), name: z.string().min(1).max(300), price: z.number().nonnegative(), stock: z.number().nonnegative().optional().default(0), minQuantity: z.number().nonnegative().optional().default(1), colorsCount: z.number().nonnegative().optional().default(0), stockStatus: z.string().optional().default('in-stock'), category: z.string().optional().nullable(), supplier: z.string().optional().nullable(), }
  ```
- **BodySchema** (`supabase/functions/comparison-ai-advisor/index.ts`, z.object):
  ```ts
  { products: z.array(ProductSchema).min(2).max(6), }
  ```
- **BodySchema** (`supabase/functions/connection-tester/index.ts`, z.object):
  ```ts
  { action: z.enum(["test", "last_test", "test_history", "last_test_full", "consecutive_failures_overview"]).optional().default("test"), type: z.enum(["supabase", "bitrix24", "n8n", "mcp", "webhook_outbound"]), config: z.record(z.string()).optional(), connection_id: z.string().uuid().optional(), env_key: z.enum(["promobrind", "crm"]).optional(), limit: z.number().int().min(1).max(50).optional(), timeout_ms: z.number().int().min(1000).max(30000).optional(), id: z.string().uuid().optional(), }
  ```
- **BodySchema** (`supabase/functions/crm-callback-reprocess/index.ts`, z.union):
  ```ts
  [ z.object({ event_id: z.string().uuid() }), z.object({ batch: z.literal(true), external_quote_id: z.string().uuid().optional(), since: z.string().datetime({ offset: true }).optional(), limit: z.number().int().min(1).max(500).default(100), }), ]
  ```
- **CrmOrderBySchema** (`supabase/functions/crm-db-bridge/index.ts`, z.union):
  ```ts
  [ z.string().regex(/^[a-z_][a-z0-9_]*(\s+(asc|desc))?$/i), z.object({ column: z.string().regex(COLUMN_RE), ascending: z.boolean().optional() }), ]
  ```
- **CrmRequestSchema** (`supabase/functions/crm-db-bridge/index.ts`, z.object):
  ```ts
  { operation: z.enum(["select", "search", "insert", "update", "delete", "batch"]), table: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i).optional(), id: z.string().uuid().optional(), filters: z.record(z.unknown()).refine( (f) => Object.keys(f).every((k) => COLUMN_RE.test(k) && !/^(or|and|not)$/i.test(k)), { message: "Filter keys must be valid column identifiers" }, ).optional(), select: z.string().max(2000).optional(), orderBy: z.union([CrmOrderBySchema, z.array(CrmOrderBySchema).min(1).max(3)]).optional(), limit: z.number().int().min(1).max(1000).optional(), offset: z.number().int().min(0).optional(), search: z.object({ column: z.string().regex(COLUMN_RE), term: z.string().max(500) }).optional(), relations: z.string().max(2000).optional(), data: z.union([z.record(z.unknown( …
  ```
  - Regras cruzadas (refine): “Filter keys must be valid column identifiers”
- **DeviceInfoSchema** (`supabase/functions/detect-new-device/index.ts`, z.object):
  ```ts
  { fingerprint: z.string().min(1).max(256), userAgent: z.string().max(1024), browserName: z.string().max(100), osName: z.string().max(100), deviceType: z.string().max(50), }
  ```
- **BodySchema** (`supabase/functions/detect-new-device/index.ts`, z.object):
  ```ts
  { userId: z.string().uuid(), userEmail: z.string().email().max(255), deviceInfo: DeviceInfoSchema, }
  ```
- **BodySchema** (`supabase/functions/dropbox-list/index.ts`, z.object):
  ```ts
  { path: z.string().max(1000).default(''), action: z.enum(['list', 'check']).default('list'), // BUG-A19 FIX: aceita cursor para paginação (Dropbox has_more / cursor) cursor: z.string().max(500).optional(), }
  ```
- **TtsRequestSchema** (`supabase/functions/elevenlabs-tts/index.ts`, z.object):
  ```ts
  { text: z.string().min(1, 'text cannot be empty').max(5000, 'text too long (max 5000 chars)'), voiceId: z.string().optional(), }
  ```
- **MessageSchema** (`supabase/functions/expert-chat/index.ts`, z.object):
  ```ts
  { role: z.enum(['user', 'assistant', 'system']), content: z.string().min(1).max(10000), }
  ```
- **TextFilterSchema** (`supabase/functions/expert-chat/index.ts`, z.union, encadeia nullable, optional):
  ```ts
  [z.string().min(1).max(200), z.array(z.string().min(1).max(200)).max(25)]
  ```
- **ExpertChatBodySchema** (`supabase/functions/expert-chat/index.ts`, z.object):
  ```ts
  { messages: z.array(MessageSchema).min(1).max(50), clientId: z.string().uuid().optional().nullable(), categoryFilter: TextFilterSchema, priceMin: z.number().nonnegative().optional().nullable(), priceMax: z.number().nonnegative().optional().nullable(), materialFilter: TextFilterSchema, colorFilter: TextFilterSchema, genderFilter: TextFilterSchema, supplierFilter: TextFilterSchema, techniqueFilter: TextFilterSchema, publicoFilter: TextFilterSchema, dataComemorativaFilter: TextFilterSchema, endomarketingFilter: TextFilterSchema, nichoFilter: TextFilterSchema, tagFilter: TextFilterSchema, onlyInStock: z.boolean().optional().nullable(), onlyNew: z.boolean().optional().nullable(), onlyKit: z.boolean().optional().nullable(), onlyBestseller: z.boolean().optional().nullable(), onlyFeatured: z.boole …
  ```
- **BodySchema** (`supabase/functions/external-db-inspect/index.ts`, z.object):
  ```ts
  { mode: z.enum(['tables', 'columns']).default('tables'), tableName: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i, 'Invalid table name').optional(), }
  ```
- **BodySchema** (`supabase/functions/full-op-diagnostics/index.ts`, z.object):
  ```ts
  { // Dry-run de validate_mcp_key. Quando ausente, esse check é "skipped". mcp_key_plain: z.string().min(8).max(512).optional(), // Dry-run de step-up. Quando ausente, esse check é "skipped". step_up_token: z.string().min(8).max(512).optional(), step_up_action: z.string().min(1).max(64).optional(), step_up_target_ref: z.string().max(255).nullable().optional(), }
  ```
- **BodySchema** (`supabase/functions/generate-ad-image/index.ts`, z.object, encadeia refine):
  ```ts
  { productImageUrl: z.string().url(), logoBase64: z.string().optional(), logoUrl: z.string().url().optional(), productName: z.string().nullable().optional(), productColor: z.string().nullable().optional(), techniqueName: z.string().nullable().optional(), locationName: z.string().nullable().optional(), scenePrompt: z.string().min(1, "Scene prompt is required"), sceneCategory: z.string().nullable().optional(), brandColorHex: z.string().nullable().optional(), brandColorName: z.string().nullable().optional(), campaignBrief: z.record(z.unknown()).nullable().optional(), outputChannel: z.string().nullable().optional(), aspectRatio: z.string().nullable().optional(), qualityMode: z.string().nullable().optional(), compositionMode: z.string().nullable().optional(), creativeMode: z.string().nullable(). …
  ```
  - Regras cruzadas (refine): “Either logoBase64 or logoUrl must be provided”
- **AdPromptSchema** (`supabase/functions/generate-ad-prompt/index.ts`, z.object):
  ```ts
  { productName: z.string().trim().min(1, 'Product name is required').max(255), productColor: z.string().max(100).nullable().optional(), productCategory: z.string().max(100).nullable().optional(), techniqueName: z.string().max(100).nullable().optional(), locationName: z.string().max(100).nullable().optional(), maxWidth: z.union([z.string(), z.number()]).nullable().optional(), maxHeight: z.union([z.string(), z.number()]).nullable().optional(), dimensionUnit: z.string().max(10).nullable().optional(), isCurved: z.boolean().nullable().optional(), clientSegment: z.string().max(200).nullable().optional(), clientName: z.string().max(200).nullable().optional(), brandColorName: z.string().max(100).nullable().optional(), objective: z.string().max(500).nullable().optional(), tone: z.string().max(100).n …
  ```
- **mockupBodySchema** (`supabase/functions/generate-mockup/index.ts`, z.object):
  ```ts
  { productImageUrl: z.string().max(4096).optional(), // Mesmo teto do base64ToBytes (MAX_IMAGE_BYTES=15MiB decodificados): // 15*1024*1024 * 4/3 ≈ 20.971.520 chars + margem p/ prefixo data URL. logoBase64: z.string().max(21_000_000).optional(), logoUrl: z.string().max(4096).optional(), techniqueName: z.string().max(200).optional(), techniquePrompt: z.string().max(8000).optional(), areaName: z.string().max(200).optional(), positionX: z.coerce.number().finite().optional(), positionY: z.coerce.number().finite().optional(), logoWidthCm: z.coerce.number().finite().optional(), logoHeightCm: z.coerce.number().finite().optional(), logoRotation: z.coerce.number().finite().optional(), logoScale: z.coerce.number().finite().optional(), productName: z.string().max(500).optional(), productWidthCm: z.coer …
  ```
- **ProductSeoSchema** (`supabase/functions/generate-product-seo/index.ts`, z.object):
  ```ts
  { product: z.object({ name: z.string().trim().min(1, 'Nome do produto é obrigatório').max(255), sku: z.string().max(100).optional(), description: z.string().max(5000).optional(), short_description: z.string().max(1000).optional(), brand: z.string().max(200).optional(), category_name: z.string().max(200).optional(), country_of_origin: z.string().max(100).optional(), materials: z.string().max(500).optional(), sale_price: z.union([z.string(), z.number()]).optional(), }), }
  ```
- **urlParamSchema** (`supabase/functions/image-proxy/index.ts`, z.string):
  ```ts
  
  ```
- **AxisEnum** (`supabase/functions/intelligence-substitute-applied/index.ts`, z.enum):
  ```ts
  ["categoryId", "supplierId", "productId"]
  ```
- **CulpritEnum** (`supabase/functions/intelligence-substitute-applied/index.ts`, z.enum):
  ```ts
  [ "categoryId", "supplierId", "productId", "window", "intersection", ]
  ```
- **BodySchema** (`supabase/functions/intelligence-substitute-applied/index.ts`, z.object):
  ```ts
  { axis: AxisEnum, substituteId: z.string().min(1).max(128), substituteName: z.string().max(255).nullable().optional(), days: z.number().int().min(1).max(365), culpritBefore: CulpritEnum.nullable().optional(), /** Timestamp emitido pelo cliente — preservado no metadata para conciliação. */ clientTs: z.string().datetime().optional(), }
  ```
- **BodySchema** (`supabase/functions/kit-identity-suggest/index.ts`, z.object):
  ```ts
  { name: z.string().max(200).optional(), description: z.string().max(500).nullable().optional(), items: z .array( z.object({ name: z.string().max(200).optional(), sku: z.string().max(100).optional(), }), ) .max(50) .optional(), }
  ```
- **bodySchema** (`supabase/functions/load-test/index.ts`, z.object):
  ```ts
  { concurrency: z.number().int().min(1).max(10).optional(), totalRequests: z.number().int().min(1).max(100).optional(), targetEndpoint: z.string().max(256).refine( (v) => !v.startsWith("http://") && !v.startsWith("https://"), { message: "targetEndpoint deve ser caminho relativo (sem http/https)" } ).optional(), method: z.string().max(16).optional(), body: z.unknown().optional(), headers: z.record(z.string()).optional(), useIdempotency: z.boolean().optional(), }
  ```
  - Regras cruzadas (refine): “targetEndpoint deve ser caminho relativo (sem http/https)”
- **LoginAttemptSchema** (`supabase/functions/log-login-attempt/index.ts`, z.object):
  ```ts
  { email: z.string().email().max(255).transform((e) => e.trim().toLowerCase()), user_id: z.string().uuid().nullish(), // Aceito por compatibilidade com clientes antigos, mas IGNORADO — // qualquer valor vindo do body é forjável. O IP gravado é o da conexão. ip_address: z.string().max(45).optional(), success: z.boolean(), failure_reason: z.string().max(500).nullish(), user_agent: z.string().max(512).nullish(), }
  ```
- **itemSchema** (`supabase/functions/magazine-import-local/index.ts`, z.object):
  ```ts
  { localItemId: z.string().min(1).max(200), productId: z.string().uuid(), productSnapshot: z.record(z.unknown()), variantColorName: z.string().nullable().optional(), position: z.number().int().min(0).max(1_000_000_000), pageNumber: z.number().int().min(1).max(200).nullable().optional(), overrides: z.record(z.unknown()).optional(), }
  ```
- **magazineSchema** (`supabase/functions/magazine-import-local/index.ts`, z.object, encadeia superRefine):
  ```ts
  { localId: z.string().min(1).max(200), // chave idempotente, escopada por usuário no BD title: z.string().min(1).max(200).default('Nova Revista'), subtitle: z.string().max(300).default(''), templateId: z.string().default('editorial-vogue'), branding: z.record(z.unknown()).optional(), content: z.record(z.unknown()).optional(), pageOrder: z.unknown().nullable().optional(), items: z.array(itemSchema).max(500).default([]), // FIX A12: limite de itens por revista status: z.enum(['draft', 'published', 'archived']).default('draft'), }
  ```
  - Regras cruzadas (refine): “productId”
- **bodySchema** (`supabase/functions/magazine-import-local/index.ts`, z.object):
  ```ts
  { magazines: z.array(magazineSchema).max(200), // FIX A12: limite de revistas por import }
  ```
- **bodySchema** (`supabase/functions/magazine-public-react/index.ts`, z.object):
  ```ts
  { token: z.string().min(24).max(64).regex(/^[a-f0-9]+$/i), fingerprint: z.string().min(8).max(128), kind: z.enum(["like", "love", "fire", "idea"]), pageIndex: z.number().int().min(0).max(9999).nullable().optional(), itemId: z.string().uuid().nullable().optional(), }
  ```
- **bodySchema** (`supabase/functions/magazine-public-view/index.ts`, z.object):
  ```ts
  { token: z.string().min(24).max(64).regex(/^[a-f0-9]+$/i, "token deve ser hexadecimal"), }
  ```
- **bodySchema** (`supabase/functions/magazine-reader-state-read/index.ts`, z.object):
  ```ts
  { token: z.string().min(24).max(64).regex(/^[a-f0-9]+$/i), // E090: fingerprint mín 32 chars — previne brute-force de fingerprints curtos fingerprint: z.string().min(32).max(128), }
  ```
- **bodySchema** (`supabase/functions/magazine-reader-state-write/index.ts`, z.object):
  ```ts
  { token: z.string().min(24).max(64).regex(/^[a-f0-9]+$/i), // E090: fingerprint mín 32 chars — previne brute-force de fingerprints curtos fingerprint: z.string().min(32).max(128), lastPageIndex: z.number().int().min(0).max(9999).optional(), bookmarks: z.array(z.number().int().min(0)).max(500).optional(), sessionId: z.string().max(128).optional(), }
  ```
- **CriterionSchema** (`supabase/functions/magic-up-score/index.ts`, z.object):
  ```ts
  { id: z.string().min(1), label: z.string().min(1), score: z.number().min(0).max(100), passed: z.boolean(), weight: z.number().min(1).max(5), recommendation: z.string().min(1), }
  ```
- **BodySchema** (`supabase/functions/magic-up-score/index.ts`, z.object):
  ```ts
  { imageUrl: z.string().min(10), productName: z.string().optional().nullable(), clientName: z.string().optional().nullable(), campaignBrief: z.record(z.unknown()).optional().nullable(), brandKit: z.record(z.unknown()).optional().nullable(), creativeControls: z.record(z.unknown()).optional().nullable(), promptText: z.string().optional().nullable(), channel: z.string().optional().nullable(), aspectRatio: z.string().optional().nullable(), }
  ```
- **DiagnosisSchema** (`supabase/functions/magic-up-score/index.ts`, z.object):
  ```ts
  { total: z.number().min(0).max(100), label: z.string().min(1), summary: z.string().min(1), criteria: z.array(CriterionSchema).min(4).max(10), strengths: z.array(z.string()).default([]), risks: z.array(z.string()).default([]), recommendations: z.array(z.string()).default([]), }
  ```
- **uuidSchema** (`supabase/functions/manage-users/index.ts`, z.string):
  ```ts
  
  ```
- **emailSchema** (`supabase/functions/manage-users/index.ts`, z.string):
  ```ts
  
  ```
- **roleSchema** (`supabase/functions/manage-users/index.ts`, z.enum):
  ```ts
  ['dev', 'supervisor', 'coordenador', 'agente', 'vendedor', 'admin', 'manager']
  ```
- **promotionRoleSchema** (`supabase/functions/manage-users/index.ts`, z.enum):
  ```ts
  ['supervisor', 'coordenador', 'agente', 'vendedor']
  ```
- **CreateSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('create'), email: emailSchema, password: z.string().min(8).max(128), full_name: z.string().max(200).optional().default(''), role: roleSchema.optional(), }
  ```
- **UpdateEmailSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('update_email'), user_id: uuidSchema, new_email: emailSchema, }
  ```
- **UpdatePasswordSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('update_password'), user_id: uuidSchema, new_password: z.string().min(8).max(128), }
  ```
- **UpdateProfileSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('update_profile'), user_id: uuidSchema, full_name: z.string().trim().max(200).nullable().optional(), email: emailSchema.nullable().optional(), is_active: z.boolean().optional(), avatar_url: z.string().url().max(2048).nullable().optional(), }
  ```
- **DeleteSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('delete'), user_id: uuidSchema, }
  ```
- **RevokeSessionsSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('revoke_sessions'), user_id: uuidSchema, }
  ```
- **PromoteRoleSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('promote_role'), user_id: uuidSchema, new_role: promotionRoleSchema, caller_password: z.string().min(1).max(128), reason: z.string().trim().min(10, 'Justificativa muito curta').max(500), }
  ```
- **PayloadSchema** (`supabase/functions/manage-users/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ CreateSchema, UpdateEmailSchema, UpdatePasswordSchema, UpdateProfileSchema, DeleteSchema, RevokeSessionsSchema, PromoteRoleSchema, ]
  ```
- **MaterialsRequestSchema** (`supabase/functions/materials-api/index.ts`, z.object):
  ```ts
  { action: z.enum(['groups', 'types', 'types_by_group', 'product_materials', 'products_by_materials', 'stats', 'search', 'complete']), groupId: z.string().max(255).optional(), materialId: z.string().uuid().optional(), productId: z.string().uuid().optional(), materialTypeIds: z.array(z.string().uuid()).max(200).optional(), materialTypeSlugs: z.array(z.string().max(100)).max(200).optional(), materialGroupSlugs: z.array(z.string().max(100)).max(50).optional(), limit: z.number().int().min(1).max(500).default(100), search: z.string().max(200).optional(), }
  ```
- **BodySchema** (`supabase/functions/mcp-keys-issue/index.ts`, z.object, encadeia superRefine):
  ```ts
  { name: z.string().trim().min(3).max(100), scopes: z .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]])) .min(1) .max(KNOWN_SCOPES.length), expires_at: z .string() .datetime({ offset: true }) .nullable() .optional(), justification: z.string().trim().max(1000).optional().nullable(), confirmation_phrase: z.string().optional().nullable(), step_up_token: z.string().min(32).max(256).optional().nullable(), target_repo: z.string().trim().max(200).optional().nullable(), target_tool: z.string().trim().max(100).optional().nullable(), }
  ```
  - Regras cruzadas (refine): “Chaves com escopo ”
- **BodySchema** (`supabase/functions/mcp-keys-revoke/index.ts`, z.object):
  ```ts
  { key_id: z.string().uuid(), reason: z.string().trim().max(500).optional().nullable(), /** Token de step-up (senha + OTP) — obrigatório para revogar qualquer chave MCP. */ step_up_token: z.string().min(32).max(256).optional().nullable(), }
  ```
- **BodySchema** (`supabase/functions/mcp-keys-rotate/index.ts`, z.object):
  ```ts
  { source_key_id: z.string().uuid(), justification: z.string().trim().max(1000).optional().nullable(), confirmation_phrase: z.string().optional().nullable(), /** Token de step-up (senha + OTP) — obrigatório ao rotacionar chave FULL. */ step_up_token: z.string().min(32).max(256).optional().nullable(), }
  ```
- **BodySchema** (`supabase/functions/mcp-keys-update/index.ts`, z.object):
  ```ts
  { key_id: z.string().uuid(), name: z.string().trim().min(3).max(100).optional(), description: z.string().trim().max(1000).nullable().optional(), scopes: z .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]])) .min(1) .max(KNOWN_SCOPES.length) .optional(), expires_at: z.string().datetime({ offset: true }).nullable().optional(), justification: z.string().trim().max(1000).optional().nullable(), confirmation_phrase: z.string().optional().nullable(), /** Token de step-up (senha + OTP) — obrigatório para escalar para FULL. */ step_up_token: z.string().min(32).max(256).optional().nullable(), }
  ```
- **InputSchema** (`supabase/functions/product-visual-search/index.ts`, z.object):
  ```ts
  { imageBase64: z.string().min(10, 'Image is required').max(10_000_000, 'Image too large'), searchTerms: z.array(z.string()).optional(), categoryFilter: z.string().optional(), }
  ```
- **SyncQuoteSchema** (`supabase/functions/quote-sync/index.ts`, z.object):
  ```ts
  { action: z.literal('sync_quote'), data: z.object({ quoteId: z.string().uuid('quoteId must be a valid UUID'), }), }
  ```
- **SyncAllPendingSchema** (`supabase/functions/quote-sync/index.ts`, z.object):
  ```ts
  { action: z.literal('sync_all_pending'), data: z.object({}).optional(), }
  ```
- **TestWebhookSchema** (`supabase/functions/quote-sync/index.ts`, z.object):
  ```ts
  { action: z.literal('test_webhook'), data: z.object({}).optional(), }
  ```
- **RequestSchema** (`supabase/functions/quote-sync/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ SyncQuoteSchema, SyncAllPendingSchema, TestWebhookSchema, ]
  ```
- **Body** (`supabase/functions/quote-sync-promo-champions/index.ts`, z.object):
  ```ts
  { quote_id: z.string().uuid(), quote_number: z.string().optional().nullable(), status: z.string().optional().nullable(), client_id: z.string().optional().nullable(), client_name: z.string().optional().nullable(), total: z.number().optional().nullable(), updated_at: z.string().optional().nullable(), seller_email: z.string().optional().nullable(), }
  ```
- **BodySchema** (`supabase/functions/rate-limit-check/index.ts`, z.object):
  ```ts
  { endpoint: z.enum(['login', 'api', 'ai', 'approval']).default('api'), }
  ```
- **EventTypeEnum** (`supabase/functions/receive-crm-callback/index.ts`, z.enum):
  ```ts
  ALLOWED_EVENT_TYPES
  ```
- **CallbackSchema** (`supabase/functions/receive-crm-callback/index.ts`, z.object):
  ```ts
  { external_quote_id: z.string().uuid(), crm_quote_id: z.string().uuid().optional(), event_type: EventTypeEnum, status: z.string().optional(), occurred_at: z.string().datetime({ offset: true }), payload: z .object({ order_id: z.string().uuid().optional(), order_number: z.string().max(64).optional(), rejection_reason: z.string().max(2000).optional(), approved_by: z.string().max(255).optional(), total_value: z.number().finite().optional(), }) .catchall(z.any()) .default({}), }
  ```
- **BodySchema** (`supabase/functions/secrets-manager/index.ts`, z.object):
  ```ts
  { action: z.enum([ "list", "set", "delete", "status", "rotate", "rotation_history", "refresh_cache", "cache_metrics", "reset_cache_metrics", ]), names: z.array(z.string()).optional(), name: z.string().optional(), value: z.string().optional(), notes: z.string().max(500).optional(), }
  ```
- **folderSchema** (`supabase/functions/secure-upload/index.ts`, z.string, encadeia refine):
  ```ts
  
  ```
- **ProductForRankSchema** (`supabase/functions/semantic-search/index.ts`, z.object):
  ```ts
  { id: z.string().min(1), name: z.string().optional().default(''), description: z.string().optional().default(''), tags: z.array(z.string()).optional().default([]), category: z.string().optional().default(''), }
  ```
- **SearchSchema** (`supabase/functions/semantic-search/index.ts`, z.object):
  ```ts
  { query: z.string().trim().min(2, 'Query too short').max(500, 'Query too long'), products: z.array(ProductForRankSchema).max(500).optional(), limit: z.number().int().min(1).max(100).optional().default(20), }
  ```
- **NotificationSchema** (`supabase/functions/send-notification/index.ts`, z.object):
  ```ts
  { user_id: z.string().uuid(), title: z.string().min(1).max(500), message: z.string().min(1).max(5000), type: z.string().max(50).optional().default('info'), category: z.string().max(50).optional().default('system'), action_url: z.string().max(2000).optional().nullable(), metadata: z.record(z.unknown()).optional().nullable(), // P08: chave determinística para deduplicação em retry idempotency_key: z.string().max(128).optional().nullable(), }
  ```
- **SyncQuoteBitrixSchema** (`supabase/functions/sync-quote-bitrix/index.ts`, z.object):
  ```ts
  { quote: z.record(z.any()).optional(), proposalData: z.record(z.any()).optional(), pdfUrl: z.string().url().max(2000).optional(), filename: z.string().max(500).optional(), bitrixCompanyId: z.string().max(50).optional(), shippingType: z.string().max(50).optional(), shippingCost: z.number().nonnegative().optional(), sellerEmail: z.string().email().max(255).optional(), }
  ```
- **AccessBodySchema** (`supabase/functions/validate-access/index.ts`, z.object):
  ```ts
  { ip: z.string().max(45).optional(), userAgent: z.string().max(512).optional(), }
  ```
- **bodySchema** (`supabase/functions/verify-2fa-token/index.ts`, z.object):
  ```ts
  { action: z.enum(['verify', 'disable']).optional(), token: z.string().max(64).nullable().optional(), target_user_id: z.string().uuid().optional(), is_admin_bypass: z.boolean().optional(), }
  ```
- **BodySchema** (`supabase/functions/verify-email/index.ts`, z.object):
  ```ts
  { // token_hash: gerado pelo Supabase no link de verificação de email // type: tipo de verificação ('email' | 'recovery' | 'invite' | 'magiclink') token_hash: z.string().min(1, "token_hash não fornecido"), type: z.enum(['email', 'recovery', 'invite', 'magiclink']).default('email'), }
  ```
- **ImageSchema** (`supabase/functions/visual-search/index.ts`, z.object):
  ```ts
  { imageBase64: z.string().min(10, 'Image is required').max(10_000_000, 'Image too large'), category: z.string().optional(), color: z.string().optional(), manualKeywords: z.string().optional(), }
  ```
- **TranscriptSchema** (`supabase/functions/voice-agent/index.ts`, z.object):
  ```ts
  { transcript: z.string().min(1, 'transcript cannot be empty').max(1000, 'transcript too long'), }
  ```
- **RequestSchema** (`supabase/functions/word-magic/index.ts`, z.object):
  ```ts
  { product_id: z.string().uuid('product_id deve ser um UUID válido'), force_regenerate: z.boolean().optional().default(false), }
  ```
- **uuidSchema** (`tests/contracts/webhook-schemas.ts`, z.string):
  ```ts
  
  ```
- **nonEmptyString** (`tests/contracts/webhook-schemas.ts`, z.string):
  ```ts
  
  ```
- **positiveInt** (`tests/contracts/webhook-schemas.ts`, z.number):
  ```ts
  
  ```
- **nonNegativeNumber** (`tests/contracts/webhook-schemas.ts`, z.number):
  ```ts
  
  ```
- **emailSchema** (`tests/contracts/webhook-schemas.ts`, z.string):
  ```ts
  
  ```
- **ValidationFieldErrorSchema** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { path: z.string().min(1), code: z.string().min(1), message: z.string().min(1), }
  ```
- **ValidationErrorBodySchema** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { code: z.string().min(1), message: z.string().min(1), fields: z.array(ValidationFieldErrorSchema), }
  ```
- **ProductPayloadV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { external_id: z.string().max(255).optional(), sku: z.string().min(1).max(100), name: z.string().min(1).max(500), description: z.string().max(5000).optional(), price: z.number().nonnegative(), min_quantity: z.number().int().positive().optional(), category_id: z.number().int().optional(), category_name: z.string().max(255).optional(), subcategory: z.string().max(255).optional(), supplier_id: z.string().max(255).optional(), supplier_name: z.string().max(255).optional(), stock: z.number().int().nonnegative().optional(), stock_status: z.string().max(50).optional(), is_kit: z.boolean().optional(), is_active: z.boolean().optional(), featured: z.boolean().optional(), new_arrival: z.boolean().optional(), on_sale: z.boolean().optional(), images: z.array(z.string().url().max(2000)).max(50).optional( …
  ```
- **ProductWebhookSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { action: z.enum(["sync", "upsert", "delete", "batch_upsert"]), products: z.array(ProductPayloadV1).max(500).optional(), product: ProductPayloadV1.optional(), external_ids: z.array(z.string().max(255)).max(500).optional(), }
  ```
- **ProductWebhookSchemaV2** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { version: z.literal("v2"), action: z.enum(["sync", "upsert", "delete", "batch_upsert"]), products: z.array(ProductPayloadV2).max(500).optional(), product: ProductPayloadV2.optional(), selectors: z .array( z.object({ type: z.enum(["external_id", "sku"]), value: z.string().min(1).max(255), }) ) .max(500) .optional(), }
  ```
- **WebhookDispatcherSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { event: z.string().min(1), payload: z.unknown().optional(), replay_delivery_id: z.string().uuid().optional(), test_mode: z.boolean().optional(), test_webhook_id: z.string().uuid().optional(), }
  ```
- **WebhookInboundQuerySchema** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { slug: z.string().min(1).max(120), }
  ```
- **CnpjLookupSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { cnpj: z .string() .min(11) .max(20) .regex(/^[\d./-]+$/, "CNPJ must contain only digits and . / -"), }
  ```
- **ExternalDbBridgeSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { operation: z.enum(["select", "insert", "update", "delete", "count", "rpc"]), table: z.string().min(1).max(120).optional(), rpc: z.string().min(1).max(120).optional(), filters: z.record(z.unknown()).optional(), data: z.record(z.unknown()).optional(), limit: z.number().int().min(1).max(1000).optional(), offset: z.number().int().nonnegative().optional(), order_by: z.string().max(120).optional(), ascending: z.boolean().optional(), }
  ```
- **SendNotificationSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { user_id: uuidSchema, title: nonEmptyString.max(200), body: nonEmptyString.max(2000), type: z.enum(["info", "success", "warning", "error", "system"]).optional(), link: z.string().url().max(2000).optional(), metadata: z.record(z.unknown()).optional(), }
  ```
- **SendTransactionalEmailSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object, encadeia refine):
  ```ts
  { to: z.union([emailSchema, z.array(emailSchema).min(1).max(100)]), subject: nonEmptyString.max(255), template: nonEmptyString.max(120).optional(), html: z.string().min(1).max(500_000).optional(), text: z.string().min(1).max(500_000).optional(), variables: z.record(z.unknown()).optional(), }
  ```
  - Regras cruzadas (refine): “One of template, html or text is required”
- **RateLimitCheckSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { key: nonEmptyString.max(200), limit: positiveInt, window_seconds: positiveInt, }
  ```
- **LogLoginAttemptSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { email: emailSchema, success: z.boolean(), ip: z.string().max(64).optional(), user_agent: z.string().max(500).optional(), reason: z.string().max(255).optional(), }
  ```
- **AiRecommendationsSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object, encadeia refine):
  ```ts
  { user_context: z.record(z.unknown()).optional(), query: z.string().trim().min(1).max(500).optional(), limit: z.number().int().min(1).max(50).optional(), }
  ```
  - Regras cruzadas (refine): “Provide query or user_context”
- **AnalyzeLogoColorsSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { imageBase64: z.string().min(10).max(10_000_000), }
  ```
- **BiCopilotSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { question: nonEmptyString.max(500), context: z.record(z.unknown()).optional(), history: z.array(z.object({ role: z.string(), content: z.string() })).max(50).optional(), }
  ```
- **CategoriesApiSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { action: z.enum(["tree", "all", "descendants", "products_by_categories"]), categoryIds: z.array(uuidSchema).max(200).optional(), includeDescendants: z.boolean().optional(), }
  ```
- **CommemorativeDatesSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { action: z.enum(["list", "get", "create", "update", "delete"]).default("list"), id: uuidSchema.optional(), data: z.record(z.unknown()).optional(), }
  ```
- **ComparisonAiAdvisorSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { products: z.array(z.object({ id: z.union([z.string(), z.number()]), name: nonEmptyString.max(300), price: nonNegativeNumber, })).min(2).max(6), }
  ```
- **ElevenLabsTtsSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { text: nonEmptyString.max(5000), voiceId: z.string().optional(), }
  ```
- **ExpertChatSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { message: nonEmptyString.max(4000), conversation_id: uuidSchema.optional(), context: z.record(z.unknown()).optional(), }
  ```
- **GenerateAdImageSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { productImageUrl: z.string().url(), scenePrompt: nonEmptyString, logoBase64: z.string().optional(), logoUrl: z.string().url().optional(), productName: z.string().optional(), aspectRatio: z.string().optional(), }
  ```
- **GenerateAdPromptSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { productName: nonEmptyString.max(255), productColor: z.string().max(100).optional(), productCategory: z.string().max(100).optional(), numberOfPrompts: z.number().int().min(1).max(6).optional(), }
  ```
- **GenerateProductSeoSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object):
  ```ts
  { product: z.object({ name: nonEmptyString.max(255), sku: z.string().max(100).optional(), description: z.string().max(5000).optional(), }), }
  ```
- **GenerateMockupSchemaV1** (`tests/contracts/webhook-schemas.ts`, z.object, encadeia refine):
  ```ts
  { productImageUrl: z.string().url(), logoBase64: z.string().min(10).optional(), logoUrl: z.string().url().optional(), technique: z.string().max(100).optional(), }
  ```
  - Regras cruzadas (refine): “logoBase64 or logoUrl required”
- **fieldIssueSchema** (`tests/edge-functions/live/_schemas.ts`, z.union):
  ```ts
  [ z.string(), z.object({ path: z.string(), message: z.string(), code: z.string().optional() }).passthrough(), ]
  ```
- **errorEnvelopeSchema** (`tests/edge-functions/live/_schemas.ts`, z.object):
  ```ts
  { code: z.string().optional(), error: z.string().optional(), message: z.string().optional(), // Lista canônica OU o formato `zod.flatten().fieldErrors` ({ campo: [mensagens] }), // emitido pelas mcp-keys-* (`{ error: "validation_failed", fields }`). fields: z.union([z.array(fieldIssueSchema), z.record(z.string(), z.array(z.string()))]).optional(), }
  ```
- **healthSchema** (`tests/edge-functions/live/_schemas.ts`, z.object, encadeia refine):
  ```ts
  { status: z.string().optional(), ok: z.boolean().optional(), healthy: z.boolean().optional(), }
  ```
  - Regras cruzadas (refine): “health sem status/ok/healthy”
- **catalogListSchema** (`tests/edge-functions/live/_schemas.ts`, z.union):
  ```ts
  [ z.array(z.unknown()), z.object({ data: z.array(z.unknown()) }).passthrough(), z.object({ items: z.array(z.unknown()) }).passthrough(), z.object({ results: z.array(z.unknown()) }).passthrough(), ]
  ```
- **materialsGroupsSchema** (`tests/edge-functions/live/_schemas.ts`, z.union):
  ```ts
  [ z .object({ data: z.object({ groups: z.array(z.unknown()), count: z.number() }).passthrough(), success: z.literal(true), }) .passthrough(), z.object({ data: z.array(z.unknown()), _unconfigured: z.literal(true) }).passthrough(), ]
  ```
- **auditReportSchema** (`tests/edge-functions/live/_schemas.ts`, z.object):
  ```ts
  {}
  ```

### F.2 react-hook-form (register/rules)

| Campo | Regras | Arquivo |
|---|---|---|
| `sku` | `onChange: () => { if (!skuManuallyEdited) onSkuManualEdit();` | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| `product_type` | `onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { setValue('is_kit', e.target.value === 'kit');` | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `price_freshness_threshold_days` | `valueAsNumber: true` | `src/components/admin/products/sections/ProductPriceSection.tsx` |

### F.3 Restrições em inputs HTML (required/min/max/pattern)

| Campo | Restrições | Arquivo |
|---|---|---|
| `days` | type=number, min=1, max=365 | `recovery/src-legacy/src/components/favorites/ShareListDialog.tsx` |
| `validity` | type=number, min=1, max=365 | `recovery/src-legacy/src/components/quotes/QuoteTemplateForm.tsx` |
| `discount_percent` | type=number, min=0, max=100, step=0.1 | `recovery/src-legacy/src/components/quotes/QuoteTemplateForm.tsx` |
| `discount_amount` | type=number, min=0, step=0.01 | `recovery/src-legacy/src/components/quotes/QuoteTemplateForm.tsx` |
| `login-email` | type=email | `recovery/src-legacy/src/pages/Auth.tsx` |
| `ids.min` | min, type=number, min=0, max=100, step=0.5, min | `src/components/admin/DiscountApprovalFilterBar.tsx` |
| `ids.max` | max, type=number, min=0, max=100, step=0.5, max | `src/components/admin/DiscountApprovalFilterBar.tsx` |
| `bf-key` | disabled=isEdit, min | `src/components/admin/badges-manager/BadgeFormDialog.tsx` |
| `bf-prio` | type=number | `src/components/admin/badges-manager/BadgeFormDialog.tsx` |
| `bf-sort` | type=number | `src/components/admin/badges-manager/BadgeFormDialog.tsx` |
| `mod-ci` | type=number, step=0.01 | `src/components/admin/connections/AiModelsTab.tsx` |
| `mod-co` | type=number, step=0.01 | `src/components/admin/connections/AiModelsTab.tsx` |
| `mod-cimg` | type=number, step=0.001 | `src/components/admin/connections/AiModelsTab.tsx` |
| `mod-mit` | type=number, max | `src/components/admin/connections/AiModelsTab.tsx` |
| `mod-mot` | type=number, max | `src/components/admin/connections/AiModelsTab.tsx` |
| `prov-priority` | type=number | `src/components/admin/connections/AiProvidersTab.tsx` |
| `prov-timeout` | type=number | `src/components/admin/connections/AiProvidersTab.tsx` |
| `prov-retries` | type=number, max | `src/components/admin/connections/AiProvidersTab.tsx` |
| `bridge-products-min-price` | min, type=number, min=0, step=0.01, min | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| `bridge-products-max-price` | max, type=number, min=0, step=0.01, max | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| `bridge-products-min-stock` | min, type=number, min=0, step=1, min | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| `mcp-key-expires` | type=datetime-local | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| `fId` | min=0, step=0.1 | `src/components/admin/products/sections/ProductDimensionsSection.tsx` |
| `fId` | min=0, step=0.1 | `src/components/admin/products/sections/ProductDimensionsSection.tsx` |
| `ipi_rate` | min=0, step=0.01 | `src/components/admin/products/sections/ProductFiscalSection.tsx` |
| `description` | min | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| `lead_time_days` | min=0 | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| `box_height_mm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_width_mm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_length_mm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_internal_height_cm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_internal_width_cm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_internal_length_cm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_weight_kg` | min=0, step=0.01 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_volume_cm3` | min=0 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_quantity` | min=0 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_inner_quantity` | min=0 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `suggested_price` | readOnly | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `stock_quantity` | min=0 | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `min_quantity` | min, min, min=1 | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `min_order_quantity` | min, min, min=0 | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `block-hours` | type=number, min=1, max=720 | `src/components/admin/security/BlockIpButton.tsx` |
| `dev-test-upload` | disabled=isUploading | `src/components/admin/security/SecureUploadManager.tsx` |
| `upd-mcp-expires` | type=datetime-local | `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx` |
| `diag-token` | type=password, step | `src/components/admin/security/keys/diagnostics/FullOpDiagnosticsPanel.tsx` |
| `sup-latitude` | type=number, step=any | `src/components/admin/suppliers-manager/SupplierAddressTab.tsx` |
| `sup-longitude` | type=number, step=any | `src/components/admin/suppliers-manager/SupplierAddressTab.tsx` |
| `sup-markup` | type=number | `src/components/admin/suppliers-manager/SupplierFormDialog.tsx` |
| `sup-min-order` | min, type=number, min | `src/components/admin/suppliers-manager/SupplierFormDialog.tsx` |
| `sup-prazo` | type=number | `src/components/admin/suppliers-manager/SupplierFormDialog.tsx` |
| `sup-priority` | type=number | `src/components/admin/suppliers-manager/SupplierFormDialog.tsx` |
| `create-email` | type=email | `src/components/admin/users/CreateUserDialog.tsx` |
| `avatar-upload` | accept=image/*, disabled=isUploading | `src/components/admin/users/EditUserDialog.tsx` |
| `edit-email` | type=email | `src/components/admin/users/EditUserDialog.tsx` |
| `password` | type=password | `src/components/admin/users/PromotionDialog.tsx` |
| `forgot-email` | type=email | `src/components/auth/ForgotPasswordForm.tsx` |
| `su-pwd` | type=password | `src/components/auth/StepUpAuthDialog.tsx` |
| `su-otp` | pattern=[0-9]{6, max | `src/components/auth/StepUpAuthDialog.tsx` |
| `po-qty` | type=number, min=1 | `src/components/inventory/PurchaseOrderModal.tsx` |
| `markup` | type=number, min=0, max=500, step=5 | `src/components/kit-builder/KitMarginSimulator.tsx` |
| `kit-qty` | type=number, min=1 | `src/components/kit-builder/kit-summary/KitIdentificationCard.tsx` |
| `qtyInputId` | type=number, min=minQuantity | `src/components/products/QuickAddToQuote.tsx` |
| `custom-qty` | type=number, min=minQuantity | `src/components/products/inline-price/QuantityCalculator.tsx` |
| `custom-qty-col` | type=number, min=minQuantity | `src/components/products/inline-price/QuantityCalculator.tsx` |
| `quote-client-email` | type=email | `src/components/quotes/ClientPicker.tsx` |
| `visual-search-input` | accept=image/*, disabled=isLoading | `src/components/search/VisualSearchButton.tsx` |
| `fieldId` | required=required | `src/components/ui/LabeledField.tsx` |
| `fieldId` | required=required | `src/components/ui/LabeledField.tsx` |
| `resolvedId` | disabled, disabled | `src/components/ui/input.tsx` |
| `resolvedId` | min, disabled, disabled | `src/components/ui/textarea.tsx` |
| `exp` | type=datetime-local | `src/pages/admin/AdminSegurancaAcessoPage.tsx` |
| `best-seller-threshold` | type=number, min=1, step=1, disabled=!draft.bestSeller.enabled, min | `src/pages/admin/IntelligenceBadgeSettingsPage.tsx` |
| `tpl-price` | type=number, step=0.01 | `src/pages/admin/KitTemplatesAdminPage.tsx` |
| `test-file` | disabled=uploading | `src/pages/admin/StorageTestPage.tsx` |
| `login-email` | type=email | `src/pages/auth/Auth.tsx` |
| `magazine-intro-text` | max | `src/pages/magazine/components/steps/ContentStep.tsx` |
| `magazine-closing-text` | max | `src/pages/magazine/components/steps/ContentStep.tsx` |
| `magic-logo-upload` | accept=image/*, disabled=m.logoUploading | `src/pages/magic-up/MagicUpConfigPanel.tsx` |
| `visual-search-input` | accept=image/* | `src/pages/tools/VisualSearchPage.tsx` |

## G. Fórmulas e derivações (como valores são calculados)

### G.1 Colunas calculadas no banco

| Tabela | Coluna | Expressão |
|---|---|---|
| `categories` | `active` | `is_active` |
| `webhook_deliveries` | `idempotency_key` | `webhook_id::text \|\| ':' \|\| payload_hash` |
| `markup_configurations` | `priority` | `CASE WHEN ("variant_id" IS NOT NULL) THEN 1 WHEN ("product_id" IS NOT NULL) THEN 2 WHEN ("category_id" IS NOT NULL) THEN 3 WHEN ("supplier_id" IS NOT NULL) THEN 4 WHEN ("organization_id" IS NOT NULL) THEN 5 ELSE 6 END` |
| `supplier_replenishment_events` | `delay_days` | `CASE WHEN actual_date IS NULL THEN NULL ELSE actual_date - promised_date END` |
| `supplier_replenishment_events` | `fulfillment_ratio` | `CASE WHEN actual_quantity IS NULL OR promised_quantity = 0 THEN NULL ELSE LEAST(1.0, actual_quantity::numeric / promised_quantity::numeric) END` |
| `sm_category_pages` | `site_url` | `CASE WHEN category_id IS NOT NULL THEN 'https://www.somarcas.com.br/' \|\| category_id::text \|\| '/categorias/' \|\| slug ELSE NULL END` |
| `supplier_products_raw` | `images_processed` | `images_status = 'processed'::supplier_raw_status` |
| `tabela_preco_gravacao_oficial` | `codigo` | `codigo_tabela` |
| `tabela_preco_gravacao_oficial` | `nome_grupo` | `grupo_tecnica` |

### G.2 Views (consultas derivadas)

| View | SELECT |
|---|---|
| `internal.mv_product_leaf_category` | `SELECT DISTINCT ON ("pca"."product_id") "pca"."product_id", "c"."id" AS "leaf_category_id", "c"."name" AS "leaf_category_name", "c"."level" AS "leaf_category_level", "c"."parent_id" AS "leaf_category_parent_id", "c"."slug" AS "leaf_category_slug", CASE WHEN ("p"."main_category_id" IS NULL) THEN "c". …` |
| `v_products_public` | `SELECT p.id, p.name, p.description, p.sku, p.category_id, p.supplier_id, NULL::numeric AS cost_price, p.sale_price, p.stock_quantity, p.is_active AS active, p.created_at, p.updated_at, NULL::numeric AS suggested_price, CASE WHEN p.length_cm IS NOT NULL OR p.width_cm IS NOT NULL OR p.height_cm IS NOT …` |
| `analytics.categories_tree_visual` | `WITH RECURSIVE "tree" AS ( SELECT "categories"."id", "categories"."bitrix_id", "categories"."name", "categories"."level", "categories"."parent_id", "categories"."name" AS "tree_structure", ARRAY[COALESCE("categories"."display_order", 0)] AS "sort_path" FROM "public"."categories" WHERE ("categories". …` |
| `analytics.mv_material_group_stats` | `SELECT "mg"."id" AS "group_id", "mg"."organization_id", "mg"."name" AS "group_name", "mg"."slug" AS "group_slug", "count"(DISTINCT "mt"."id") AS "total_materials", "count"(DISTINCT CASE WHEN "mt"."is_active" THEN "mt"."id" ELSE NULL::"uuid" END) AS "active_materials", "count"(DISTINCT "pm"."product_ …` |
| `v_full_scope_grants` | `SELECT sual.id AS audit_id, sual.created_at AS granted_at, sual.user_id AS granted_to_user_id, p.full_name AS granted_to_name, u.email AS granted_to_email, sual.action AS step_up_action, (sual.metadata->>'operation') AS operation, (sual.metadata->>'key_id')::uuid AS key_id, (sual.metadata->>'key_pre …` |
| `analytics.mv_media_health` | `SELECT "s"."code" AS "source_supplier", "count"(DISTINCT "p"."id") AS "total_produtos", "count"(DISTINCT CASE WHEN ("pi_main"."id" IS NOT NULL) THEN "p"."id" ELSE NULL::"uuid" END) AS "com_img_principal", "count"(DISTINCT CASE WHEN ("pi_any"."id" IS NOT NULL) THEN "p"."id" ELSE NULL::"uuid" END) AS …` |
| `analytics.mv_product_cards` | `SELECT "p"."id", "p"."name", "p"."slug", "p"."sku", "p"."short_description", "p"."sale_price", "p"."is_active", "p"."is_new", "p"."is_featured", "p"."is_stockout", "p"."category_id", "p"."main_category_id", "p"."colors", "p"."product_type", "p"."supplier_id", "p"."primary_image_url", "pi"."url_cdn" …` |
| `analytics.mv_product_compositions` | `SELECT "p"."id" AS "product_id", "p"."organization_id", "p"."name" AS "product_name", "count"(DISTINCT "pm"."material_id") AS "total_materials", "sum"("pm"."percentage") AS "total_percentage", "array_agg"("json_build_object"('material_id', "mt"."id", 'material_name', "mt"."name", 'group_name', "mg". …` |
| `analytics.mv_stock_velocity` | `WITH latest_per_vss AS ( SELECT DISTINCT ON (sd.variant_supplier_source_id) sd.variant_supplier_source_id, sd.supplier_id, sd.supplier_branch_id, sd.variant_id, sd.product_id, sd.stock_close AS current_stock, sd.cost_price_close AS current_price, sd.summary_date AS last_update_date FROM stock_daily_ …` |
| `analytics.mv_product_intelligence` | `WITH product_metrics AS ( SELECT sv.product_id, SUM(sv.total_depleted_30d) AS total_depleted_30d, SUM(sv.total_depleted_90d) AS total_depleted_90d, SUM(sv.current_stock) AS total_current_stock, AVG(sv.avg_daily_depletion_7d) AS avg_depletion_7d, AVG(sv.avg_daily_depletion_30d) AS avg_depletion_30d, …` |
| `cf_recon.v_cf_orphans` | `SELECT ci.image_id, ci.uploaded_at, ci.filename FROM cf_recon.cf_image ci LEFT JOIN public.product_images pi ON (pi.cloudflare_image_id)::text = ci.image_id WHERE pi.id IS NULL AND ci.crawl_run_id IS NOT NULL` |
| `cf_recon.v_divergence` | `SELECT pi.id AS db_id, pi.cloudflare_image_id, pi.cf_sync_status, pi.cf_id_scheme, pi.source_supplier, pi.is_active, pi.deleted_at IS NOT NULL AS is_deleted, ci.image_id IS NOT NULL AS exists_in_cf, CASE WHEN ci.image_id IS NOT NULL AND ci.crawl_run_id IS NOT NULL AND pi.cf_sync_status = 'verified' …` |
| `cf_recon.v_verification_queue` | `select pi.id, pi.cloudflare_image_id, pi.cf_sync_status, pi.cf_id_scheme, pi.source_supplier, pi.cf_check_attempts, pi.is_active, pi.created_at from public.product_images pi where pi.cf_sync_status <> 'verified' and pi.deleted_at is null and coalesce(pi.cf_id_scheme,'') <> 'hash_legacy'` |
| `cf_recon.v_health_dashboard` | `SELECT (SELECT COUNT(*) FROM public.product_images) AS db_total, (SELECT COUNT(*) FROM public.product_images WHERE is_active) AS db_active, (SELECT COUNT(*) FROM public.product_images WHERE cf_sync_status = 'verified') AS verified, (SELECT COUNT(*) FROM public.product_images WHERE cf_sync_status = ' …` |
| `cf_recon.v_inactive_alive` | `select pi.id, pi.product_id, pi.cloudflare_image_id, pi.cf_sync_status, pi.source_supplier, pi.cf_id_scheme, pi.updated_at from public.product_images pi where pi.is_active is false and pi.deleted_at is null` |
| `cf_recon.v_inactive_alive_cf_cost` | `select ia.id, ia.product_id, ia.cloudflare_image_id, ia.cf_sync_status, ia.source_supplier from cf_recon.v_inactive_alive ia join cf_recon.cf_image ci on ci.image_id = ia.cloudflare_image_id` |
| `cf_recon.v_products_without_active_image` | `select p.id as product_id, p.name, p.is_active as product_active, (select count(*) from public.product_images pi where pi.product_id=p.id) as total_images, (select count(*) from public.product_images pi where pi.product_id=p.id and pi.cf_sync_status='missing') as broken_images from public.products p …` |
| `classification_audit.v_gaps_acionaveis` | `SELECT "s"."product_id", "p"."name" AS "produto", "p"."sku", "s"."category_id", "c"."full_path_readable" AS "categoria_sugerida", "c"."level" AS "nivel", "s"."matches", "s"."tokens_matched", "s"."score", CASE WHEN ("s"."matches" >= 4) THEN '🟢 altissima'::"text" WHEN ("s"."matches" = 3) THEN '🟢 alta' …` |
| `classification_audit.v_kits_para_revisao` | `SELECT "p"."sku", "p"."name" AS "produto", "c"."full_path_readable" AS "categoria_sugerida", "s"."matches", "s"."tokens_matched", "s"."score", ( SELECT "string_agg"("c2"."name", ' · '::"text" ORDER BY "c2"."level") AS "string_agg" FROM ("public"."product_category_assignments" "pca2" JOIN "public"."c …` |
| `prod_audit.v_category_suggestions_review` | `SELECT "id", "rule_name" AS "regra", "confidence" AS "confianca", "product_sku" AS "sku", "product_name" AS "produto", "suggested_category_path" AS "sugestao", "array_to_string"("current_categories", ' ∥ '::"text") AS "categorias_atuais", "reason" AS "motivo", "reviewed" AS "revisado", "accepted" AS …` |
| `ai_insights_cache` | `SELECT id, user_id, function_name, cache_key, payload, model, tokens_input, tokens_output, duration_ms, created_at, expires_at FROM public.dashboard_insights_cache` |
| `bi_quotes_summary` | `SELECT "q"."seller_id", "p"."full_name" AS "seller_name", "q"."organization_id", ("date_trunc"('month'::"text", "q"."created_at"))::"date" AS "month", "q"."status", "count"(*) AS "quote_count", "round"("sum"("q"."total"), 2) AS "total_revenue", "round"("avg"("q"."total"), 2) AS "avg_ticket", "round" …` |
| `categories_tree_visual` | `SELECT "id", "bitrix_id", "name", "level", "parent_id", "tree_structure", "sort_path" FROM "analytics"."categories_tree_visual"` |
| `category_icons` | `SELECT id, name AS category_name, icon, NULL::text AS description, is_active FROM categories c WHERE icon IS NOT NULL` |
| `materials_complete` | `SELECT "mt"."id" AS "material_id", "mt"."organization_id", "mt"."name" AS "material_name", "mt"."slug" AS "material_slug", "mt"."description", "mg"."id" AS "group_id", "mg"."name" AS "group_name", "mg"."slug" AS "group_slug", "mt"."is_active", "count"(DISTINCT "pm"."product_id") AS "products_count", …` |
| `mv_stock_rupture_alert` | `WITH ema_calc AS ( SELECT sv.variant_supplier_source_id AS vss_id, sv.variant_id, sv.supplier_id, sv.current_stock, sv.current_price, sv.velocity_trend, sv.active_days_30d, sv.days_to_stockout, CASE WHEN sv.current_stock <= 10 AND GREATEST( 0.01, CASE WHEN sv.avg_daily_depletion_7d > 0 AND sv.avg_da …` |
| `mv_ema_kpi_by_level` | `SELECT "nivel_alerta", "prioridade", "count"(DISTINCT "variant_id") AS "total_variantes", "count"(*) AS "total_vss", "round"("avg"("cobertura_dias"), 1) AS "avg_cobertura", "round"("min"("cobertura_dias"), 1) AS "min_cobertura", "round"("max"("score_composto"), 2) AS "max_score", "round"("avg"("scor …` |
| `mv_material_group_stats` | `SELECT "group_id", "organization_id", "group_name", "group_slug", "total_materials", "active_materials", "products_using" FROM "analytics"."mv_material_group_stats"` |
| `mv_media_health` | `SELECT "source_supplier", "total_produtos", "com_img_principal", "com_qualquer_img", "pct_cobertura_principal", "pct_cobertura_qualquer", "total_imagens", "imagens_vinculadas", "imagens_com_seo" FROM "analytics"."mv_media_health"` |
| `mv_product_cards` | `SELECT "id", "name", "slug", "sku", "short_description", "sale_price", "is_active", "is_new", "is_featured", "is_stockout", "category_id", "main_category_id", "colors", "product_type", "supplier_id", "primary_image_url", "primary_image_cdn", "variant_count", "total_stock", "earliest_restock_date", " …` |
| `mv_product_compositions` | `SELECT "product_id", "organization_id", "product_name", "total_materials", "total_percentage", "materials_detail" FROM "analytics"."mv_product_compositions"` |
| `mv_product_images_audit` | `SELECT pi.id, pi.product_id, pi.cloudflare_image_id, pi.source_supplier, pi.organization_id, pi.created_at, pi.updated_at, it.code AS image_type_code, it.category AS image_type_category, it.subcategory AS image_type_subcategory, it.is_color_specific, it.show_in_gallery, it.show_in_simulator, it.is_p …` |
| `mv_product_intelligence` | `SELECT product_id, total_depleted_30d, total_depleted_90d, total_current_stock, avg_depletion_7d, avg_depletion_30d, min_days_to_stockout, max_velocity_trend, total_restocked_30d, supplier_count, avg_current_price, abc_classification, turnover_score, is_hot_product, is_stagnant, is_negotiation_oppor …` |
| `mv_stock_velocity` | `SELECT * FROM analytics.mv_stock_velocity` |
| `mv_supplier_reliability` | `WITH events_base AS ( SELECT supplier_id, resolution, promised_date, delay_days, fulfillment_ratio, GREATEST(0::numeric, 1.0 - GREATEST(0::numeric, COALESCE(delay_days,0)::numeric) / 14.0) AS pontuality_score, LEAST(1.0::numeric, COALESCE(fulfillment_ratio, 0)) AS fulfillment_score FROM public.suppl …` |
| `products_with_materials` | `SELECT "p"."id" AS "product_id", "p"."organization_id", "p"."name" AS "product_name", "mt"."id" AS "material_id", "mt"."name" AS "material_name", "mg"."name" AS "material_group", "pm"."part", "pm"."percentage", "pm"."sort_order", "p"."created_at", "pm"."created_at" AS "material_added_at" FROM ((("pu …` |
| `v_catalog_stats` | `SELECT COUNT(pv.id)::bigint AS total_variants, COUNT(DISTINCT p.supplier_id)::bigint AS total_suppliers FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id WHERE (p.is_deleted IS NOT TRUE) AND (p.is_active = TRUE) AND (pv.is_active IS NOT FALSE)` |
| `v_category_keywords` | `WITH "tokens" AS ( SELECT "c"."id" AS "category_id", "c"."full_path_readable", "c"."level", "c"."name" AS "category_name", "unnest"("regexp_split_to_array"("lower"("extensions"."unaccent"("c"."name")), '[\s\\|>/,\.\-]+'::"text")) AS "token" FROM "public"."categories" "c" WHERE "c"."is_active" ) SELEC …` |
| `v_cf_drift_dashboard` | `WITH stats AS ( SELECT (SELECT COUNT(*) FROM cf_recon.cf_image) AS recon_total, (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL) AS pi_active_total, (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND cf_sync_status='verified') AS pi_verified, (SELECT COUNT( …` |
| `v_cf_image_remediation` | `SELECT p.id AS product_id, p.primary_image_url, (SELECT count(*) FROM public.product_images pi WHERE pi.product_id=p.id AND pi.is_active) AS active_imgs, (SELECT count(*) FROM public.product_images pi WHERE pi.product_id=p.id AND pi.is_active AND pi.cf_sync_status='verified') AS verified_active_imgs …` |
| `v_cf_recon_progress` | `SELECT cf_sync_status, count(*) AS n, round(100.0*count(*)/NULLIF(sum(count(*)) OVER (),0),2) AS pct FROM public.product_images GROUP BY cf_sync_status` |
| `v_color_coverage_monitor` | `WITH "imagens" AS ( SELECT "pi"."supplier_code", "pi"."image_type", "count"(*) AS "total", "count"("pi"."color_id") AS "com_color_id" FROM "public"."product_images" "pi" WHERE ("pi"."is_active" = true) GROUP BY "pi"."supplier_code", "pi"."image_type" ), "variantes" AS ( SELECT "pi_sup"."supplier_cod …` |
| `v_color_nuances_public` | `SELECT cn.id, cn.name, cn.slug, cn.description, cn.sort_order FROM public.color_nuances cn WHERE cn.is_active = true` |
| `v_commemorative_dates_calendar` | `SELECT "id", "name", "slug", "date_day", "date_month", "is_fixed_date", "variable_date_rule", "category", "target_audience", "icon_name", "color_hex", "campaign_start_days", "is_featured", CASE WHEN ("is_fixed_date" AND ("date_day" IS NOT NULL)) THEN (("lpad"(("date_day")::"text", 2, '0'::"text") \|\| …` |
| `v_commemorative_dates_with_colors` | `SELECT "id", "name", "slug", "date_day", "date_month", "is_fixed_date", "category", "icon_name", "color_hex" AS "date_color", "campaign_start_days", "is_featured", "is_active", COALESCE(( SELECT "json_agg"("json_build_object"('color_group_id', "cg"."id", 'color_name', "cg"."name", 'color_hex', "cg". …` |
| `v_connection_health` | `SELECT captured_at, total_conns, active_conns, idle_in_tx_conns, max_conns, usage_pct, CASE WHEN usage_pct >= 90 THEN '🔴 CRÍTICO' WHEN usage_pct >= 75 THEN '🟠 ALERTA' WHEN usage_pct >= 50 THEN '🟡 ATENÇÃO' ELSE '🟢 NORMAL' END AS status, top_users FROM public.db_connection_snapshots ORDER BY captured_ …` |
| `v_crm_callback_health` | `SELECT "date_trunc"('hour'::"text", "occurred_at") AS "bucket", "event_type", "result", "count"(*) AS "total", "count"(*) FILTER (WHERE ("error_message" IS NOT NULL)) AS "with_error", "percentile_disc"((0.95)::double precision) WITHIN GROUP (ORDER BY (EXTRACT(epoch FROM ("received_at" - "occurred_at …` |
| `v_db_health_audit` | `SELECT 'B02_quote_markup_nao_persistido'::text AS check_id, count(*) AS total_issues, 'negotiation_markup_percent=0 mas total > subtotal sem frete/imposto/desconto'::text AS descricao, 'HIGH'::text AS severidade FROM quotes WHERE (quotes.negotiation_markup_percent = (0)::numeric) AND (quotes.total > …` |
| `v_db_health_check` | `SELECT "pg_size_pretty"("pg_database_size"("current_database"())) AS "db_size", ( SELECT "count"(*) AS "count" FROM ("pg_stat_user_indexes" "s" JOIN "pg_index" "i" ON (("s"."indexrelid" = "i"."indexrelid"))) WHERE (("s"."schemaname" = 'public'::"name") AND ("s"."idx_scan" = 0) AND (NOT "i"."indispri …` |
| `v_dimensions_source_divergence` | `SELECT p.id, p.sku, p.supplier_id, s.name AS supplier_name, p.dimensions_source, p.length_cm AS scalar_length_cm, p.width_cm AS scalar_width_cm, p.height_cm AS scalar_height_cm, p.weight_g, NULL::numeric AS jsonb_length_cm, NULL::numeric AS jsonb_width_cm, NULL::numeric AS jsonb_height_cm, NULL::num …` |
| `v_enrichment_stats` | `SELECT "count"(*) AS "total_contacts", "count"("work_email") AS "total_emails_found", "count"("phone_mobile") AS "total_phones_found", "count"( CASE WHEN ("enrichment_status" = 'complete'::"text") THEN 1 ELSE NULL::integer END) AS "complete_enrichments", "count"( CASE WHEN ("enrichment_status" = 'pa …` |
| `v_gravacao_cobertura` | `SELECT t.grupo_tecnica, t.codigo_tabela, t.nome AS tecnica_nome, t.ativo AS tecnica_ativa, COUNT(DISTINCT pat.product_id) AS produtos_configurados, COUNT(DISTINCT pat.id) AS total_areas_configuradas, MIN(pat.max_width) AS min_largura_cm, MAX(pat.max_width) AS max_largura_cm, ROUND(AVG(COALESCE(pat.m …` |
| `v_image_quality_stats` | `WITH "stats" AS ( SELECT COALESCE("pi"."supplier_code", 'SEM_FORNECEDOR'::character varying) AS "supplier", "count"(*) AS "total", "count"(*) FILTER (WHERE (("pi"."width_px" >= 1200) AND ("pi"."height_px" >= 1200))) AS "otimas", "count"(*) FILTER (WHERE (("pi"."width_px" >= 800) AND ("pi"."height_px …` |
| `v_kill_switch_hits_summary` | `SELECT switch_name, source, operation, target, count(*) AS hits, count(*) FILTER (WHERE occurred_at > now() - interval '1 hour') AS hits_1h, count(*) FILTER (WHERE occurred_at > now() - interval '24 hours') AS hits_24h, count(*) FILTER (WHERE occurred_at > now() - interval '7 days') AS hits_7d, max( …` |
| `v_kit_component_completeness` | `SELECT s.*, CASE WHEN s.completude_pct = 100 THEN 'complete' WHEN s.completude_pct >= 50 THEN 'partial' ELSE 'minimal' END AS true_status FROM ( SELECT f.component_id, f.kit_product_id, f.component_name, f.component_type_code, f.is_packaging, f.has_type, f.has_weight, f.has_dims, f.has_color, f.has_ …` |
| `v_kit_completeness_by_supplier` | `SELECT sup.name AS supplier_name, sup.code AS supplier_code, count(*) AS total_components, count(*) FILTER (WHERE c.true_status='complete') AS truly_complete, round(100.0*count(*) FILTER (WHERE c.true_status='complete')/count(*),1) AS pct_truly_complete, round(avg(c.completude_pct),1) AS avg_complet …` |
| `v_kit_component_complete` | `SELECT "pkc"."id", "pkc"."kit_product_id", "p"."sku" AS "kit_sku", "p"."name" AS "kit_name", "s"."name" AS "supplier_name", "s"."code" AS "supplier_code", "pkc"."component_name", "pkc"."component_type_code", "pkc"."display_order", "pkc"."quantity", "pkc"."is_optional", "pkc"."is_replaceable", "pkc". …` |
| `v_kit_component_identity_health` | `SELECT s.name AS supplier, count(*) AS variant_component_rows, count(DISTINCT k.kit_product_id) AS kits, count(DISTINCT k.component_id) AS components, count(*) FILTER (WHERE k.component_sku IS NOT NULL) AS with_qualified_code, count(*) FILTER (WHERE k.item_color_id IS NOT NULL) AS with_canonical_col …` |
| `v_kit_component_media_public` | `SELECT pkc.id AS kit_component_id, pkc.kit_product_id, pkc.component_product_id, pkc.component_code, pkc.component_name, pkc.primary_image_url, pkc.images, pkc.display_order FROM public.product_kit_components pkc JOIN public.products p ON p.id = pkc.kit_product_id AND p.is_active = true AND p.is_del …` |
| `v_kit_component_print_areas_public` | `SELECT kpa.id, kpa.kit_component_id, kpa.location_code, kpa.location_name, kpa.location_order, kpa.max_width, kpa.max_height, kpa.shape, kpa.is_curved, kpa.technique_order FROM public.kit_component_print_areas kpa JOIN public.product_kit_components pkc ON pkc.id = kpa.kit_component_id JOIN public.pr …` |
| `v_kit_component_skus` | `SELECT c.id AS component_id, c.kit_product_id, v.id AS variant_id, p.sku AS parent_sku, v.sku AS variant_sku, v.color_code AS variant_color_code, v.color_name AS variant_color_name, c.slot_code, c.component_name, c.component_type_code, c.is_packaging, c.color_id AS item_color_id, c.component_code AS …` |
| `v_kit_enrichment_dashboard` | `SELECT "s"."name" AS "supplier_name", "s"."code" AS "supplier_code", "count"(*) AS "total_components", "count"(*) FILTER (WHERE (("pkc"."enrichment_status")::"text" = 'complete'::"text")) AS "complete", "count"(*) FILTER (WHERE (("pkc"."enrichment_status")::"text" = 'partial'::"text")) AS "partial", …` |
| `v_xbz_ficha_parse_queue` | `WITH ficha AS ( SELECT spr.product_id, max(spr.site_data->>'ficha_tecnica_pdf') AS ficha_pdf_url, max(spr.site_scraped_at) AS last_scraped FROM supplier_products_raw spr WHERE spr.supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND coalesce(spr.site_data->>'ficha_tecnica_pdf','')<>'' GROUP BY spr …` |
| `v_kit_ficha_pipeline_health` | `SELECT (SELECT count(*) FROM kit_component_ficha_staging) AS staging_total, (SELECT count(*) FROM kit_component_ficha_staging WHERE match_status='pending') AS staging_pendentes, (SELECT count(*) FROM kit_component_ficha_staging WHERE match_status='promoted') AS staging_promovidos, (SELECT count(*) F …` |
| `v_kit_max_quantity` | `SELECT "p"."id" AS "kit_id", "p"."name" AS "kit_name", "p"."sku" AS "kit_sku", "min"( CASE WHEN ("pkc"."quantity" > 0) THEN "floor"(((COALESCE("vs"."quantity", 0))::numeric / ("pkc"."quantity")::numeric)) ELSE (0)::numeric END) AS "max_kits_possiveis", "count"("pkc"."id") AS "total_componentes", "co …` |
| `v_kit_pipeline_health` | `WITH "bronze_stats" AS ( SELECT "count"(*) AS "total_bronze", "count"(*) FILTER (WHERE ("kit_component_enrichment_raw"."processed" = true)) AS "bronze_processed", "count"(*) FILTER (WHERE ("kit_component_enrichment_raw"."processed" = false)) AS "bronze_pending", "count"(*) FILTER (WHERE ("kit_compon …` |
| `v_kit_with_components` | `SELECT "p"."id" AS "kit_id", "p"."name" AS "kit_name", "p"."sku" AS "kit_sku", "p"."description" AS "kit_description", "p"."primary_image_url" AS "kit_image", "pkc"."id" AS "component_id", "pkc"."component_code", COALESCE("pkc"."component_name", ("cp"."name")::character varying) AS "component_name", …` |
| `v_media_statistics` | `WITH "image_stats" AS ( SELECT COALESCE("it"."code", "pi"."image_type", 'unknown'::character varying) AS "tipo_code", COALESCE("it"."name", "pi"."image_type", 'Desconhecido'::character varying) AS "tipo_nome", COALESCE("it"."category", 'other'::character varying) AS "categoria", "count"(*) AS "quant …` |
| `v_media_stats` | `SELECT 'images'::"text" AS "media_type", "count"(*) AS "total_count", "count"(DISTINCT "pi"."product_id") AS "products_with_media", "sum"(COALESCE("pi"."file_size_bytes", (0)::bigint)) AS "total_bytes", "pg_size_pretty"(COALESCE("sum"("pi"."file_size_bytes"), (0)::numeric)) AS "total_size_formatted" …` |
| `v_monthly_costs` | `SELECT "provider_name", "to_char"("created_at", 'YYYY-MM'::"text") AS "month", "count"(*) AS "total_calls", "count"( CASE WHEN "success" THEN 1 ELSE NULL::integer END) AS "successful_calls", "sum"("cost_usd") AS "total_cost", "round"("avg"("response_time_ms"), 0) AS "avg_response_ms" FROM "public"." …` |
| `v_my_markup_config` | `SELECT "mc"."id", "mc"."organization_id", "mc"."supplier_id", "mc"."category_id", "mc"."product_id", "mc"."variant_id", "mc"."description", "mc"."is_active", "mc"."priority", "mc"."created_at", "mc"."updated_at" FROM ("public"."markup_configurations" "mc" JOIN "public"."user_organizations" "uo" ON ( …` |
| `v_needs_enrichment` | `SELECT "id", "first_name", "last_name", "current_company", "company_domain", "enrichment_status", "last_enriched_at" FROM "public"."enriched_contacts" WHERE ((("work_email" IS NULL) AND ("phone_mobile" IS NULL)) OR ("enrichment_status" = ANY (ARRAY['pending'::"text", 'failed'::"text"])) OR ("last_en …` |
| `v_performance_dashboard` | `WITH "top_queries" AS ( SELECT "left"("pg_stat_statements"."query", 80) AS "query_snippet", "pg_stat_statements"."calls", "round"(("pg_stat_statements"."mean_exec_time")::numeric, 2) AS "avg_ms", "round"((("pg_stat_statements"."total_exec_time")::numeric / (1000)::numeric), 2) AS "total_seconds", 't …` |
| `v_personalization_techniques_public` | `SELECT pt.id, pt.name, pt.code, pt.description, pt.requires_color_count FROM public.personalization_techniques pt WHERE pt.is_active = true` |
| `v_pipeline_next_step` | `SELECT "id", "fase", "etapa", "titulo", "descricao", "comando_resumo", "dependencia", "status", "resultado", "error_message", "started_at", "completed_at", "created_at", "updated_at" FROM "public"."import_pipeline_steps" WHERE ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'error': …` |
| `v_pipeline_progress` | `SELECT "fase", "count"(*) AS "total_etapas", "count"(*) FILTER (WHERE (("status")::"text" = 'done'::"text")) AS "concluidas", "count"(*) FILTER (WHERE (("status")::"text" = 'running'::"text")) AS "em_andamento", "count"(*) FILTER (WHERE (("status")::"text" = 'error'::"text")) AS "com_erro", "count"( …` |
| `v_price_history_safe` | `SELECT "id", "variant_id", "change_type", "change_reason", "changed_by", "changed_at", "source" FROM "public"."price_history"` |
| `v_print_area_techniques_public` | `SELECT id, product_id, tabela_preco_id, location_code, location_name, location_order, max_width, max_height, is_curved, shape, technique_order, is_active, notes, unit_cost, created_at, updated_at FROM public.print_area_techniques WHERE is_active = true` |
| `v_product_active_badge` | `SELECT p.id AS product_id, p.sku, p.name, p.is_active, p.is_stockout, p.is_new, p.is_bestseller, p.is_featured, false AS is_on_sale, p.has_gift_box, p.has_commercial_packaging, p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold AS is_low_stock, p.is_active AND p.price_last_verified_a …` |
| `v_product_compositions_public` | `SELECT mpc.product_id, mpc.product_name, mpc.total_materials, mpc.total_percentage, mpc.materials_detail FROM analytics.mv_product_compositions mpc JOIN public.products p ON p.id = mpc.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE` |
| `v_product_image_hash_duplicates` | `SELECT content_hash, COUNT(*) AS duplicate_count, array_agg(cloudflare_image_id ORDER BY cloudflare_image_id) AS cf_ids, array_agg(id ORDER BY cloudflare_image_id) AS image_ids, MIN(created_at) AS oldest_upload FROM product_images WHERE content_hash IS NOT NULL AND deleted_at IS NULL GROUP BY conten …` |
| `v_product_images_cdn` | `SELECT "pi"."id", "pi"."product_id", "pi"."variant_id", "pi"."color_id", "pi"."cloudflare_image_id", "pi"."url_cdn", "regexp_replace"("pi"."url_cdn", '/[^/]+$'::"text", ''::"text") AS "url_base", "pi"."url_cdn" AS "url_public", ("regexp_replace"("pi"."url_cdn", '/[^/]+$'::"text", ''::"text") \|\| '/th …` |
| `v_product_images_quality_gap` | `SELECT pi.source_supplier, it.code AS image_type, count(*) AS total, count(*) FILTER (WHERE pi.is_active) AS ativas, count(*) FILTER (WHERE pi.width_px IS NULL OR pi.height_px IS NULL) AS sem_dimensoes, count(*) FILTER (WHERE pi.format IS NULL) AS sem_format, count(*) FILTER (WHERE pi.file_size_byte …` |
| `v_product_properties_public` | `SELECT pp.id, pp.product_id, pp.property_code, pp.property_value, pp.source FROM public.product_properties pp JOIN public.products p ON p.id = pp.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE` |
| `v_product_tags_public` | `SELECT pt.id, pt.product_id, pt.tag_id FROM public.product_tags pt JOIN public.products p ON p.id = pt.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE JOIN public.tags t ON t.id = pt.tag_id AND t.is_active = true` |
| `v_product_tokens` | `WITH "tokens" AS ( SELECT "p"."id" AS "product_id", "p"."name" AS "product_name", "p"."is_active", "unnest"("regexp_split_to_array"("lower"("extensions"."unaccent"((("p"."name" \|\| ' '::"text") \|\| COALESCE("p"."description", ''::"text")))), '[\s\\|>/,\.\-()0-9]+'::"text")) AS "token" FROM "public"."pr …` |
| `v_product_videos_cdn` | `SELECT "pv"."id", "pv"."product_id", "pv"."cloudflare_video_id", "pv"."url_stream", "pv"."url_hls", "pv"."url_dash", "pv"."url_thumbnail", ('https://iframe.cloudflarestream.com/'::"text" \|\| ("pv"."cloudflare_video_id")::"text") AS "url_embed", ('https://watch.cloudflarestream.com/'::"text" \|\| ("pv". …` |
| `v_product_videos_ready` | `SELECT "pv"."id" AS "video_id", "pv"."product_id", "pv"."cloudflare_video_id" AS "cloudflare_uid", "pv"."url_stream" AS "url_embed", "pv"."url_hls", "pv"."url_thumbnail", "public"."get_cloudflare_video_thumbnail"("pv"."cloudflare_video_id", NULL::integer, 320, 180) AS "url_thumbnail_card", "public". …` |
| `v_products_ai_coverage` | `SELECT s.name AS supplier_name, COUNT(p.id) AS total_products, COUNT(p.id) FILTER (WHERE p.ai_description IS NOT NULL AND length(p.ai_description)>20) AS com_ai_desc, ROUND(100.0*COUNT(p.id) FILTER (WHERE p.ai_description IS NOT NULL AND length(p.ai_description)>20)/NULLIF(COUNT(p.id),0),1) AS pct_a …` |
| `v_products_complete` | `SELECT "p"."id" AS "product_id", "p"."name" AS "product_name", "p"."sku", "p"."description", "p"."cost_price", "p"."is_active" AS "product_active", "p"."organization_id", "c"."id" AS "category_id", "c"."name" AS "category_name", "c"."level" AS "category_level", "c"."full_path_readable" AS "category_ …` |
| `v_products_dimensions_audit` | `SELECT p.id AS product_id, p.sku, p.name, s.name AS supplier_name, p.is_active, p.dimensions_source, p.length_cm, p.width_cm, p.height_cm, p.diameter_cm, p.shape_type, p.weight_g, (p.length_cm IS NULL AND p.width_cm IS NULL AND p.height_cm IS NULL) AS sem_dimensoes, (p.length_cm IS NOT NULL AND p.wi …` |
| `v_products_images_summary` | `SELECT "p"."id" AS "product_id", "p"."name" AS "product_name", "count"("pi"."id") AS "total_images", "count"("pi"."id") FILTER (WHERE ("pi"."is_primary" = true)) AS "primary_images", "count"(DISTINCT "pi"."color_id") FILTER (WHERE ("pi"."color_id" IS NOT NULL)) AS "colors_with_images", "string_agg"( …` |
| `v_products_kit_builder` | `SELECT "id", "sku", "name", "description", "product_type", "cost_price", "stock_quantity", "colors", "images", "is_active", "length_cm", "width_cm", "height_cm", "internal_length_cm", "internal_width_cm", "internal_height_cm", CASE WHEN ("product_type" = 'packaging'::"text") THEN "round"((((COALESCE …` |
| `v_products_missing_primary_image` | `SELECT "id" AS "product_id", "name" AS "product_name", "is_active", "created_at", ( SELECT "count"(*) AS "count" FROM "public"."product_images" "pi" WHERE (("pi"."product_id" = "p"."id") AND ("pi"."is_active" = true))) AS "total_images" FROM "public"."products" "p" WHERE (("is_active" = true) AND (N …` |
| `v_products_name_audit` | `WITH quality AS ( SELECT p.id AS product_id, p.sku, p.name, p.supplier_id, s.name AS supplier_name, p.is_active, p.slug, length(p.name) AS name_len, 'name' = ANY(COALESCE(p.locked_fields, '{}')) AS name_is_locked, fn_product_name_quality_score(p.name) AS quality_json FROM products p LEFT JOIN suppli …` |
| `v_products_pending_images` | `SELECT "p"."id", "p"."sku_promo", "p"."name", "p"."supplier_id", "s"."name" AS "supplier_name", "p"."is_active", "p"."created_at", "p"."updated_at", ( SELECT "count"(*) AS "count" FROM "public"."product_variants" "pv" WHERE (("pv"."product_id" = "p"."id") AND ("pv"."is_active" = true))) AS "active_v …` |
| `v_products_public_test` | `SELECT p.id, p.name, p.description, p.sku, p.category_id, p.supplier_id, NULL::numeric AS cost_price, p.sale_price, p.stock_quantity, p.is_active AS active, p.created_at, p.updated_at, NULL::numeric AS suggested_price, CASE WHEN p.length_cm IS NOT NULL OR p.width_cm IS NOT NULL OR p.height_cm IS NOT …` |
| `v_products_with_tags` | `SELECT "p"."id" AS "product_id", "p"."name", "p"."sku", "array_agg"("t"."name" ORDER BY "t"."name") FILTER (WHERE ("t"."name" IS NOT NULL)) AS "tag_names", "array_agg"("t"."slug" ORDER BY "t"."name") FILTER (WHERE ("t"."slug" IS NOT NULL)) AS "tag_slugs" FROM (("public"."products" "p" LEFT JOIN "pub …` |
| `v_products_without_images` | `SELECT "id" AS "product_id", "name" AS "product_name", "is_active", "created_at" FROM "public"."products" "p" WHERE (("is_active" = true) AND (NOT (EXISTS ( SELECT 1 FROM "public"."product_images" "pi" WHERE (("pi"."product_id" = "p"."id") AND ("pi"."is_active" = true)))))) ORDER BY "created_at" DES …` |
| `v_products_without_video` | `SELECT "id" AS "product_id", "name", "sku", "is_active", "created_at" FROM "public"."products" "p" WHERE (("is_active" = true) AND (NOT (EXISTS ( SELECT 1 FROM "public"."product_videos" "pv" WHERE (("pv"."product_id" = "p"."id") AND ("pv"."is_active" = true) AND (("pv"."cloudflare_status")::"text" = …` |
| `v_quote_seller_kpis` | `SELECT "q"."seller_id", "p"."full_name" AS "seller_name", "count"(*) AS "total_quotes", "count"(*) FILTER (WHERE ("q"."status" = 'draft'::"text")) AS "draft_count", "count"(*) FILTER (WHERE ("q"."status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'viewed'::"text"]))) AS "open_count", "count"(*) …` |
| `v_site_products_public` | `select p.id, p.name, p.sku, p.slug, p.primary_image_url, p.primary_image_fallback_url, p.set_image_url, p.og_image_url, p.images, p.category_id, p.main_category_id, p.short_description, p.description, p.ai_title, p.ai_summary, p.ai_description, p.brand, p.min_quantity, p.is_new, p.is_featured, p.is_ …` |
| `v_slow_queries_analysis` | `SELECT "round"(("total_exec_time")::numeric, 0) AS "total_ms_acumulado", "calls", "round"(("mean_exec_time")::numeric, 2) AS "mean_ms", "round"(("stddev_exec_time")::numeric, 2) AS "stddev_ms", "round"(((((100.0)::double precision * "total_exec_time") / NULLIF("sum"("total_exec_time") OVER (), (0):: …` |
| `v_smoke_tests_latest_run` | `SELECT ran_at, test_name, test_category, result, details, duration_ms FROM public.smoke_test_runs WHERE ran_at = (SELECT max(ran_at) FROM public.smoke_test_runs) ORDER BY CASE WHEN result LIKE '%FAIL%' THEN 0 WHEN result LIKE '%WARN%' THEN 1 ELSE 2 END, test_name` |
| `v_smoke_tests_trend` | `SELECT ran_at, count(*)::integer AS total, count(*) FILTER (WHERE result LIKE '%PASS%')::integer AS passed, count(*) FILTER (WHERE result LIKE '%FAIL%')::integer AS failed, count(*) FILTER (WHERE result LIKE '%WARN%')::integer AS warned, avg(duration_ms) AS avg_duration_ms FROM public.smoke_test_run …` |
| `v_stock_velocity_safe` | `WITH p99_caps AS ( SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY avg_daily_depletion_7d) FILTER (WHERE avg_daily_depletion_7d > 0) AS cap_7d, PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY avg_daily_depletion_30d) FILTER (WHERE avg_daily_depletion_30d > 0) AS cap_30d, PERCENTILE_CONT(0.99) WITHI …` |
| `v_super_filtro_options` | `SELECT 'cor'::"text" AS "filtro_tipo", "cg"."name" AS "valor", "cg"."slug" AS "slug_ou_codigo", "cg"."hex_code" AS "hex", ("count"(DISTINCT "pv"."product_id"))::integer AS "total_produtos", "cg"."sort_order" AS "ordem" FROM ((("public"."color_groups" "cg" JOIN "public"."color_variations" "cv" ON ((( …` |
| `v_suppliers_public` | `SELECT id, name, code, trading_name, logo_url, website, active, is_product_supplier, is_engraving_supplier, state_uf, low_stock_threshold FROM suppliers` |
| `v_system_alerts` | `WITH cron_alerts AS ( SELECT 'CRON_FAIL_RECENT'::text AS codigo, 'critical'::text AS severidade, 'Job ' \|\| j.jobid \|\| ' (' \|\| j.jobname \|\| ') com falhas na ultima hora' AS mensagem, COUNT(CASE WHEN d.status='failed' THEN 1 END)::text AS detalhe FROM cron.job_run_details d JOIN cron.job j ON j.jobid …` |
| `v_system_health_dashboard` | `WITH metrics AS ( SELECT 'database'::text AS categoria, 'total_tables_public'::text AS metrica, (( SELECT count(*) AS count FROM (pg_class c JOIN pg_namespace n ON ((n.oid = c.relnamespace))) WHERE ((n.nspname = 'public'::name) AND (c.relkind = 'r'::"char"))))::text AS valor, 'count'::text AS unit U …` |
| `v_tabela_preco_gravacao_oficial_public` | `SELECT id, codigo_tabela, codigo, codigo_curto, nome, nome_grupo, descricao, grupo_tecnica, cobra_por_cor, max_cores, desconto_segunda_cor, desconto_terceira_cor, desconto_quarta_cor_mais, preco_minimo_unitario, preco_maximo_unitario, cobra_por_area, area_maxima_cm2, area_maxima_texto, cobra_por_pon …` |
| `v_tags_public` | `SELECT t.id, t.name, t.slug, t.color_hex, t.description, t.usage_count FROM public.tags t WHERE t.is_active = true` |
| `v_top_patterns` | `SELECT "pattern_format", "count"(*) AS "usage_count", "avg"("pattern_confidence") AS "avg_confidence", "array_agg"(DISTINCT "company_domain" ORDER BY "company_domain") AS "example_domains" FROM "public"."company_email_patterns" GROUP BY "pattern_format" ORDER BY ("count"(*)) DESC` |
| `v_unmapped_images` | `SELECT "image_type" AS "tipo_detectado", "supplier_code", "count"(*) AS "quantidade", "array_agg"(DISTINCT "filename" ORDER BY "filename") FILTER (WHERE ("filename" IS NOT NULL)) AS "exemplos_arquivos" FROM "public"."product_images" "pi" WHERE (("is_active" = true) AND (("image_type_id" IS NULL) OR …` |
| `v_variant_sale_prices_public` | `SELECT pv.id AS variant_id, pv.product_id, pv.sku, pv.color_name, vss.min_qty_1, round(vss.cost_price_1 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_1, vss.min_qty_2, round(vss.cost_p …` |
| `v_variants_with_commemorative_dates` | `SELECT "pv"."id" AS "variant_id", "pv"."name" AS "variant_name", "pv"."sku" AS "variant_sku", "pv"."color_name", "pv"."color_hex", "p"."id" AS "product_id", "p"."name" AS "product_name", "p"."sku" AS "product_sku", "cd"."id" AS "commemorative_date_id", "cd"."name" AS "commemorative_date_name", "cd". …` |
| `v_video_dashboard` | `SELECT COALESCE("video_type", 'sem_tipo'::character varying) AS "tipo", "cloudflare_status" AS "status", "count"(*) AS "quantidade", "count"(DISTINCT "product_id") AS "produtos", "sum"("duration_seconds") AS "duracao_total_seg", "round"("avg"("duration_seconds"), 0) AS "duracao_media_seg", "count"(* …` |
| `v_video_validation_recent` | `SELECT "vvl"."validated_at", "vvl"."action_type", "vvl"."validation_status", "vvl"."cloudflare_video_id", "vvl"."supplier_code", (("vvl"."width_px" \|\| 'x'::"text") \|\| "vvl"."height_px") AS "resolucao", ("vvl"."duration_seconds" \|\| 's'::"text") AS "duracao", "vvl"."issues", "vvl"."recommendations", " …` |
| `v_videos_pending` | `SELECT "pv"."id", "pv"."cloudflare_video_id", "p"."name" AS "product_name", "p"."sku", "pv"."cloudflare_status", "pv"."cloudflare_error", "pv"."created_at" FROM ("public"."product_videos" "pv" LEFT JOIN "public"."products" "p" ON (("pv"."product_id" = "p"."id"))) WHERE (("pv"."is_active" = true) AND …` |
| `v_videos_with_urls` | `SELECT "pv"."id", "pv"."product_id", "p"."name" AS "product_name", "p"."sku", "pv"."cloudflare_video_id", "pv"."video_type", "pv"."title", "pv"."duration_seconds", (("lpad"((("pv"."duration_seconds" / 60))::"text", 2, '0'::"text") \|\| ':'::"text") \|\| "lpad"((("pv"."duration_seconds" % 60))::"text", 2 …` |
| `v_webhook_delivery_stats` | `SELECT "date_trunc"('hour'::"text", "fired_at") AS "hora", "count"(*) AS "total_deliveries", "count"(*) FILTER (WHERE ("delivery_status" = 'delivered'::"text")) AS "delivered", "count"(*) FILTER (WHERE ("delivery_status" = 'failed'::"text")) AS "failed", "count"(*) FILTER (WHERE ("delivery_status" = …` |
| `vw_active_products_missing_gold_images` | `SELECT p.id AS product_id, p.name, p.supplier_id, p.sku, p.supplier_reference, p.primary_image_url, count(r.id) AS bronze_rows, count(*) FILTER (WHERE r.images_status::text = 'pending') AS bronze_imgs_pending, count(*) FILTER (WHERE r.images_processed = true) AS bronze_imgs_processadas, max(r.update …` |
| `vw_ai_enrichment_status` | `WITH queue_stats AS ( SELECT ai_enrichment_queue.enrichment_type, count(*) FILTER (WHERE ai_enrichment_queue.status = 'pending'::text) AS pending, count(*) FILTER (WHERE ai_enrichment_queue.status = 'processing'::text) AS processing, count(*) FILTER (WHERE ai_enrichment_queue.status = 'done'::text) …` |
| `vw_ai_history_stats` | `SELECT model, ai_provider, COUNT(*) AS total_geracoes, COUNT(DISTINCT product_id) AS produtos_unicos, SUM(total_tokens) AS total_tokens, ROUND(AVG(total_tokens), 0) AS media_tokens, SUM(generation_time_ms) AS total_ms, ROUND(AVG(generation_time_ms), 0) AS media_ms, ROUND( SUM(COALESCE(prompt_tokens, …` |
| `vw_asia_products_by_category` | `SELECT cat.value ->> 'id_asia'::text AS id_categoria_asia, cat.value ->> 'nome'::text AS nome_categoria, count(*) AS total_produtos, round(avg(pv.cost_price), 2) AS preco_medio, round(min(pv.cost_price), 2) AS preco_minimo, round(max(pv.cost_price), 2) AS preco_maximo, sum(pv.stock_quantity) AS esto …` |
| `vw_asia_products_by_color` | `SELECT lower(regexp_replace(pv.color_name, '\s+', '-', 'g')) AS slug_cor, pv.color_name AS nome_cor, pv.color_hex AS hex_cor, count(DISTINCT pv.variant_reference) AS total_produtos, round(avg(pv.cost_price), 2) AS preco_medio, sum(pv.stock_quantity) AS estoque_total FROM produtos_padronizacao_varian …` |
| `vw_asia_products_by_tag` | `SELECT tag.value ->> 'id_asia'::text AS id_tag_asia, tag.value ->> 'nome'::text AS nome_tag, count(*) AS total_produtos, round(avg(pv.cost_price), 2) AS preco_medio, sum(pv.stock_quantity) AS estoque_total FROM supplier_products_raw spr LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr …` |
| `vw_asia_products_errors` | `SELECT supplier_reference, raw_data ->> 'nome'::text AS nome_produto, process_errors, (status = 'processed'::supplier_raw_status) AS processed, processed_at, created_at FROM supplier_products_raw spr WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND process_errors IS NOT NULL ORDE …` |
| `vw_asia_products_low_stock` | `SELECT spr.supplier_reference, spr.raw_data ->> 'nome'::text AS nome_produto, pv.cost_price AS preco, pv.stock_quantity AS estoque_atual, parse_asia_categories(spr.raw_data) AS categorias, spr.updated_at FROM supplier_products_raw spr LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.i …` |
| `vw_asia_products_pending` | `SELECT spr.supplier_reference, spr.raw_data ->> 'nome'::text AS nome_produto, pv.cost_price AS preco, pv.stock_quantity AS estoque, parse_asia_categories(spr.raw_data) AS categorias, spr.imported_at, spr.created_at, EXTRACT(epoch FROM now() - spr.imported_at) / 3600::numeric AS horas_desde_import FR …` |
| `vw_asia_products_promo` | `SELECT spr.supplier_reference, spr.raw_data ->> 'nome'::text AS nome_produto, pv.cost_price AS preco, pv.stock_quantity AS estoque, parse_asia_categories(spr.raw_data) AS categorias, spr.updated_at FROM supplier_products_raw spr LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id WHER …` |
| `vw_asia_products_stats` | `SELECT count(*) AS total_produtos, count(CASE WHEN spr.status = 'processed'::supplier_raw_status THEN 1 ELSE NULL::integer END) AS produtos_processados, count(CASE WHEN spr.status <> 'processed'::supplier_raw_status THEN 1 ELSE NULL::integer END) AS produtos_pendentes, round(count(CASE WHEN spr.stat …` |
| `vw_category_accessories` | `SELECT "c_prod"."id" AS "product_category_id", "c_prod"."name" AS "product_category_name", "cac"."relationship_type", "cac"."display_label", "cac"."is_required", "c_acc"."id" AS "accessory_category_id", "c_acc"."name" AS "accessory_category_name", "c_acc"."full_path_readable" AS "accessory_path", "c …` |
| `vw_category_commemorative_dates` | `SELECT "c"."id" AS "category_id", "c"."name" AS "category_name", "cd"."id" AS "date_id", "cd"."name" AS "date_name", "cd"."date_day", "cd"."date_month", "cd"."target_audience", "ccd"."is_primary", "ccd"."relevance_score", "ccd"."custom_message" FROM (("public"."category_commemorative_dates" "ccd" JO …` |
| `vw_category_completeness` | `SELECT c.id, c.name, c.slug, c.level, c.is_active, c.is_visible, c.products_count, COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) AS produtos_ativos_main, COUNT(DISTINCT pca.product_id) AS produtos_via_pca, EXISTS ( SELECT 1 FROM public.category_copywriting_config cfg WHERE cfg.category_id = …` |
| `vw_category_mapping_gaps` | `SELECT "s"."id" AS "supplier_id", "s"."name" AS "supplier_name", "sc"."id" AS "supplier_category_id", "sc"."supplier_code", "sc"."supplier_name" AS "supplier_category_name", "sc"."level" AS "supplier_level", ( SELECT "c"."name" FROM "public"."categories" "c" WHERE ("c"."is_active" = true) ORDER BY ( …` |
| `vw_category_target_audiences` | `SELECT "cta"."id", "cta"."category_id", "c"."name" AS "category_name", "cta"."target_audience_id", "ta"."name" AS "audience_name", "ta"."category" AS "audience_type", "ta"."slug" AS "audience_slug", "cta"."relevance_score", "cta"."is_primary", "cta"."display_order", "cta"."is_active", "cta"."created …` |
| `vw_category_variation_types` | `WITH RECURSIVE "category_tree" AS ( SELECT "c"."id" AS "category_id", "c"."name" AS "category_name", "c"."level" AS "category_level", "c"."parent_id", "cvt"."variation_type_id", "vt"."code" AS "variation_code", "vt"."name" AS "variation_name", "cvt"."is_required", "cvt"."display_order", false AS "is …` |
| `vw_classify_functions_status` | `SELECT "function_name", "is_field", "priority", CASE WHEN "is_active" THEN '✅ Ativa'::"text" ELSE '❌ Inativa'::"text" END AS "status", "description", "updated_at" FROM "public"."classify_functions_registry" ORDER BY "priority"` |
| `vw_color_coverage` | `WITH "variant_stats" AS ( SELECT "s"."id" AS "supplier_id", "s"."name" AS "supplier_name", "s"."code" AS "supplier_code", "count"("pv"."id") AS "total_variants", "count"("pv"."color_id") AS "com_color_id", ("count"(*) - "count"("pv"."color_id")) AS "sem_color_id", "round"(((("count"("pv"."color_id") …` |
| `vw_color_mapping` | `SELECT "ce"."id" AS "equivalence_id", "sc"."supplier_id", "s"."name" AS "supplier_name", "s"."code" AS "supplier_code_name", "sc"."id" AS "supplier_color_id", "sc"."code" AS "supplier_code", "sc"."name" AS "supplier_color_name", "sc"."hex_code" AS "supplier_hex", "cv"."id" AS "color_variation_id", " …` |
| `vw_component_types_usage` | `SELECT "kct"."code", "kct"."name", "kct"."category", "kct"."icon", "mt1"."name" AS "default_material", "mt2"."name" AS "secondary_material", (((("kct"."typical_length_mm" \|\| 'x'::"text") \|\| "kct"."typical_width_mm") \|\| 'x'::"text") \|\| "kct"."typical_height_mm") AS "typical_dimensions", "kct"."typica …` |
| `vw_duplicate_images` | `SELECT "cloudflare_image_id", "count"(*) AS "duplicatas", "array_agg"("id") AS "image_ids", "array_agg"(DISTINCT "product_id") AS "product_ids" FROM "public"."product_images" WHERE (("is_active" = true) AND ("cloudflare_image_id" IS NOT NULL)) GROUP BY "cloudflare_image_id" HAVING ("count"(*) > 1) O …` |
| `vw_image_type_coherence` | `SELECT 'image_type_vs_id'::"text" AS "metrica", "count"(*) FILTER (WHERE (("pi"."image_type")::"text" <> ("it"."code")::"text")) AS "divergentes", "count"(*) FILTER (WHERE ("pi"."image_type_id" IS NULL)) AS "fk_null", "count"(*) FILTER (WHERE ("pi"."image_type" IS NULL)) AS "varchar_null", "count"(* …` |
| `vw_image_type_dropblockers` | `WITH fn_refs AS ( SELECT p.proname AS object_name, 'function' AS object_type, n.nspname AS schema_name, 'Referencia image_type no corpo da função' AS blocker_reason FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosrc ILIKE '%image_type%' ), trg_refs A …` |
| `vw_images_pending_dimensions` | `SELECT "id", "cloudflare_image_id", "url_cdn", "url_original", "source_supplier", "supplier_code", "image_type", "product_id", "created_at" FROM "public"."product_images" "pi" WHERE (("width_px" IS NULL) AND ("is_active" = true) AND ("cloudflare_image_id" IS NOT NULL) AND (("cloudflare_image_id")::" …` |
| `vw_material_health` | `SELECT "s"."name" AS "fornecedor", "count"(DISTINCT "p"."id") AS "produtos_ativos", "count"(DISTINCT "pm"."product_id") AS "com_material_pm", "round"(((100.0 * ("count"(DISTINCT "pm"."product_id"))::numeric) / (NULLIF("count"(DISTINCT "p"."id"), 0))::numeric), 2) AS "cobertura_pm_pct", "count"(DISTI …` |
| `vw_medallion_coverage` | `SELECT s.name AS fornecedor, 'silver'::text AS camada, count(*) AS produtos, round(((100.0 * (sum( CASE WHEN (NULLIF(TRIM(BOTH FROM pp.ncm_code), ''::text) IS NOT NULL) THEN 1 ELSE 0 END))::numeric) / (count(*))::numeric), 1) AS ncm_pct, round(((100.0 * (sum( CASE WHEN (jsonb_array_length(COALESCE(p …` |
| `vw_media_stats_by_type` | `SELECT "it"."code" AS "tipo", "it"."name" AS "tipo_nome", "it"."category" AS "categoria", "count"("pi"."id") AS "total", "count"(DISTINCT "pi"."product_id") AS "produtos_distintos", "count"("pi"."variant_id") AS "com_variant", "count"("pi"."color_id") AS "com_color", "count"( CASE WHEN (("pi"."alt_t …` |
| `vw_product_novelties_active` | `SELECT pn.id AS novelty_id, pn.product_id, pn.supplier_id, pn.supplier_code, pn.supplier_product_code, pn.source, pn.detected_at, pn.expires_at, pn.is_active, pn.is_highlighted, pn.notes, pn.created_at AS novelty_created_at, pn.updated_at AS novelty_updated_at, p.name AS product_name, p.sku AS produ …` |
| `vw_novelties_home_highlights` | `SELECT novelty_id, product_id, product_name, product_sku, supplier_reference, primary_image_url, sale_price, detected_at, expires_at, days_remaining, expiring_soon, supplier_code, source, is_highlighted FROM public.vw_product_novelties_active WHERE is_highlighted = true ORDER BY detected_at DESC LIM …` |
| `vw_novelty_health` | `WITH "window_30d" AS ( SELECT "count"(*) AS "total_raw", "count"(*) FILTER (WHERE (("products"."is_stockout" = false) AND ("products"."sale_price" > (0)::numeric) AND ("products"."primary_image_url" IS NOT NULL))) AS "quality_ok", "count"(*) FILTER (WHERE ("products"."is_stockout" = true)) AS "stock …` |
| `vw_orphan_active_variants` | `select v.id as variant_id, v.sku as variant_sku, v.color_name, v.product_id, p.sku as product_sku, p.name as product_name, p.is_deleted as product_is_deleted, p.is_active as product_is_active, coalesce(v.stock_quantity,0) as variant_stock, case when p.is_deleted is true then 'under_deleted_product' …` |
| `vw_packaging_health` | `WITH stats AS ( SELECT (SELECT COUNT(*) FROM product_included_packagings WHERE active = true) AS pip_total, (SELECT COUNT(*) FROM product_included_packagings WHERE active = true AND material IS NOT NULL) AS pip_com_material, (SELECT COUNT(*) FROM product_included_packagings WHERE active = true AND i …` |
| `vw_packaging_suppliers` | `SELECT "pkg"."id" AS "packaging_id", "pkg"."code" AS "packaging_code", "pkg"."name" AS "packaging_name", "pt"."name" AS "packaging_type", "s"."id" AS "supplier_id", "s"."name" AS "supplier_name", "sp"."supplier_code", "sp"."unit_price", "sp"."currency", "sp"."min_order_quantity", "sp"."lead_time_day …` |
| `vw_packagings_catalog` | `SELECT p.id, p.sku, p.supplier_reference, p.name, p.internal_height_cm, p.internal_width_cm, p.internal_length_cm, p.height_cm AS ext_height, p.width_cm AS ext_width, p.length_cm AS ext_length, p.packaging_material, p.weight_g, p.supplier_id, s.name AS fornecedor, (CASE WHEN auth.role() = ANY (ARRAY …` |
| `vw_product_all_packaging_options` | `SELECT p.id AS product_id, p.sku AS product_sku, p.name AS product_name, 'INCLUSA'::text AS tipo_embalagem, pip.id AS embalagem_id, NULL::character varying(50) AS embalagem_sku, pip.name AS embalagem_nome, pip.material AS embalagem_material, pip.color AS embalagem_cor, pip.has_inner_cradle AS tem_be …` |
| `vw_product_availability` | `SELECT pv.id AS variant_id, pv.product_id, pv.sku, pv.stock_quantity, pv.next_quantity_1, pv.next_date_1, pv.next_quantity_2, pv.next_date_2, pv.next_quantity_3, pv.next_date_3, CASE WHEN pv.stock_quantity > 0 THEN 'in_stock'::text WHEN pv.stock_quantity = 0 AND ( (pv.next_date_1 IS NOT NULL AND pv. …` |
| `vw_product_color_category_links` | `SELECT "p"."id" AS "product_id", "p"."name" AS "product_name", "p"."sku", "pv"."id" AS "variant_id", "pv"."sku" AS "variant_sku", "pv"."color_name", "pv"."color_hex", "cv"."group_id" AS "color_group_id", "cg"."name" AS "color_group_name", "c"."name" AS "linked_category", "c"."slug" AS "category_slug …` |
| `vw_product_commemorative_dates` | `SELECT "p"."id" AS "product_id", "p"."name" AS "product_name", "p"."sku", "cd"."id" AS "date_id", "cd"."name" AS "date_name", "cd"."date_day", "cd"."date_month", "cd"."target_audience", "pcd"."source", "pcd"."is_featured", "pcd"."relevance_score" FROM (("public"."product_commemorative_dates" "pcd" J …` |
| `vw_product_images_health` | `WITH base AS ( SELECT COUNT(*) AS total_images, COUNT(*) FILTER (WHERE is_active = true) AS active_images, COUNT(*) FILTER (WHERE is_active = false) AS inactive_images, COUNT(DISTINCT product_id) AS products_with_images, COUNT(*) FILTER (WHERE is_primary = true AND is_active = true) AS primary_image …` |
| `vw_product_images_variant_gap` | `SELECT "pi"."id" AS "image_id", "pi"."product_id", "p"."supplier_id", "pi"."source_supplier", "pi"."image_type", "pi"."applies_to_color", "pi"."cloudflare_image_id", "pi"."color_id", "cv"."name" AS "color_name", "cv"."hex_code", ( SELECT "count"(*) AS "count" FROM "public"."product_variants" "pv2" W …` |
| `vw_product_notebook_complete` | `SELECT p.id AS product_id, p.name AS product_name, p.sku, (CASE WHEN auth.role() = ANY (ARRAY['authenticated'::text,'service_role'::text]) THEN p.cost_price ELSE NULL::numeric END)::numeric(10,2) AS cost_price, p.is_active, s.name AS supplier_name, pf.code AS format_code, pf.name AS format_name, pf. …` |
| `vw_product_packaging_options` | `SELECT "p"."id" AS "product_id", "p"."supplier_reference" AS "product_ref", "p"."name" AS "product_name", "pkg"."id" AS "packaging_id", "pkg"."name" AS "packaging_name", "pt"."name" AS "packaging_type", "pp"."relationship_type", CASE "pp"."relationship_type" WHEN 'included'::"text" THEN '✅ Inclusa': …` |
| `vw_products_ai_status` | `SELECT "p"."id", "p"."sku", "p"."name", "c"."name" AS "category_name", "p"."ai_version", "p"."ai_generated_at", "p"."ai_model", CASE WHEN ("p"."ai_generated_at" IS NULL) THEN 'PENDENTE'::"text" WHEN ("p"."ai_version" = 1) THEN 'GERADO_V1'::"text" WHEN ("p"."ai_version" > 1) THEN ('ATUALIZADO_V'::"te …` |
| `vw_products_by_date` | `SELECT "cd"."id" AS "date_id", "cd"."name" AS "date_name", "cd"."date_day", "cd"."date_month", "cd"."target_audience", "cd"."campaign_start_days", "cd"."campaign_end_days", "p"."id" AS "product_id", "p"."name" AS "product_name", "p"."sku", "c"."name" AS "category_name", "pcd"."is_featured", "pcd"."r …` |
| `vw_products_by_property_category` | `SELECT "pd"."category", "count"(DISTINCT "pp"."product_id") AS "product_count", "count"("pp"."id") AS "property_count", "array_agg"(DISTINCT "pd"."name_pt" ORDER BY "pd"."name_pt") AS "properties_in_category" FROM ("public"."property_definitions" "pd" JOIN "public"."product_properties" "pp" ON (("pd …` |
| `vw_products_commercial_packing` | `SELECT "p"."id", "p"."sku", "p"."name", "p"."slug", "p"."packing_type", "p"."packing_classification", "p"."has_gift_box", "p"."sale_price", "p"."cost_price", "p"."category_id", "c"."name" AS "category_name", "c"."slug" AS "category_slug", "p"."supplier_id", "s"."name" AS "supplier_name", "p"."primar …` |
| `vw_products_min_quantity` | `SELECT p.id, p.sku, p.name, p.category_id, c.name AS category_name, c.min_order_quantity AS category_min, p.min_order_quantity AS product_override, COALESCE(p.min_order_quantity, c.min_order_quantity, 1) AS effective_min_quantity, CASE WHEN p.min_order_quantity IS NOT NULL THEN 'product_override'::t …` |
| `vw_products_packaging_info` | `SELECT p.id, p.sku, p.supplier_reference, p.name, p.product_type, p.shape_type, p.height_cm, p.width_cm, p.length_cm, p.diameter_cm, p.weight_g, CASE p.shape_type WHEN 'cylindrical'::text THEN ((('ø'::text \|\| COALESCE(p.diameter_cm::text, '?'::text)) \|\| 'x'::text) \|\| COALESCE(p.height_cm::text, '?': …` |
| `vw_products_pending_variants` | `SELECT "s"."name" AS "fornecedor", "s"."code" AS "supplier_code", "p"."id" AS "product_id", "p"."supplier_reference", "p"."name" AS "product_name", "p"."is_active", ("p"."created_at")::"date" AS "criado_em", ("p"."updated_at")::"date" AS "atualizado_em", ( SELECT "spr"."status" FROM "public"."suppli …` |
| `vw_products_seo_status` | `SELECT p.id, p.name, p.sku, p.supplier_reference, p.slug, s.name AS supplier_name, CASE WHEN p.slug IS NOT NULL AND LENGTH(TRIM(p.slug)) > 0 THEN '✅' ELSE '❌' END AS has_slug, CASE WHEN p.meta_title IS NOT NULL AND LENGTH(TRIM(p.meta_title)) > 0 THEN '✅' ELSE '❌' END AS has_meta_title, CASE WHEN p.m …` |
| `vw_products_thermal_status` | `SELECT "id", "sku", "name", "is_thermal" AS "is_thermal_stored", "public"."fn_is_thermal_product"("id") AS "is_thermal_calculated" FROM "public"."products" "p"` |
| `vw_products_with_properties` | `SELECT "p"."id", "p"."sku", "p"."supplier_reference", "p"."name", "p"."is_thermal", "array_agg"(DISTINCT "pd"."name_pt" ORDER BY "pd"."name_pt") FILTER (WHERE ("pd"."name_pt" IS NOT NULL)) AS "properties", "array_agg"(DISTINCT "pd"."code" ORDER BY "pd"."code") FILTER (WHERE ("pd"."code" IS NOT NULL) …` |
| `vw_produtos_sem_ncm` | `WITH "base" AS ( SELECT "p"."id" AS "product_id", "p"."sku", "p"."supplier_reference", "p"."name", "p"."stock_quantity", "p"."is_active", "s"."name" AS "supplier", ( SELECT COALESCE(("spr"."raw_data" ->> 'Ncm'::"text"), ("spr"."raw_data" ->> 'ncm'::"text"), ("spr"."raw_data" ->> 'Taric'::"text"), (" …` |
| `vw_property_statistics` | `SELECT "pd"."code", "pd"."name_pt", "pd"."category", "pd"."is_thermal_indicator", "pd"."icon_code", "count"("pp"."id") AS "product_count", "pd"."display_order" FROM ("public"."property_definitions" "pd" LEFT JOIN "public"."product_properties" "pp" ON (("pd"."code" = "pp"."property_code"))) GROUP BY …` |
| `vw_qa_products_missing_images` | `SELECT "id", COALESCE("sku_promo", ("sku")::character varying) AS "sku", "name", "supplier_id", "created_at", CASE WHEN ((COALESCE("primary_image_url", ''::"text") = ''::"text") AND (NOT (("jsonb_typeof"("images") = 'array'::"text") AND ("jsonb_array_length"("images") > 0)))) THEN 'CRITICO'::"text" …` |
| `vw_rupture_confidence_audit` | `SELECT "supplier_name", "nivel_alerta", "confidence_level", "count"(*) AS "total_vss", "count"(*) FILTER (WHERE ("confidence_level" = 'INSUFICIENTE'::"text")) AS "insuficiente", "count"(*) FILTER (WHERE ("confidence_level" = 'BAIXA'::"text")) AS "baixa", "count"(*) FILTER (WHERE ("confidence_level" …` |
| `vw_rupture_gap_purchase` | `SELECT "m"."supplier_id", "m"."supplier_name", "m"."nivel_alerta", "count"(*) AS "total_skus", "sum"("m"."gap_unidades") AS "total_gap_unidades", "round"("sum"((("m"."gap_unidades")::numeric * COALESCE("vss"."cost_price", (0)::numeric))), 2) AS "valor_compra_estimado_r", "min"("m"."cobertura_dias") …` |
| `vw_rupture_live_divergence` | `WITH "ls" AS ( SELECT "vss"."id" AS "vss_id", (COALESCE("vss"."stock_main_warehouse", 0) + COALESCE("vss"."stock_other_warehouses", 0)) AS "stock_live", "vss"."last_synced_at" FROM "public"."variant_supplier_sources" "vss" WHERE (("vss"."is_active" = true) AND ("vss"."removed_from_api" IS DISTINCT F …` |
| `vw_seo_dashboard` | `WITH product_stats AS ( SELECT COUNT(*) AS total_products, COUNT(*) FILTER (WHERE slug IS NOT NULL AND LENGTH(TRIM(slug)) > 0) AS with_slug, COUNT(*) FILTER (WHERE meta_title IS NOT NULL AND LENGTH(TRIM(meta_title)) > 0) AS with_meta_title, COUNT(*) FILTER (WHERE meta_description IS NOT NULL AND LEN …` |
| `vw_sitemap_categories` | `SELECT 'category'::text AS url_type, '/categoria/' \|\| slug AS url_path, slug AS identifier, name AS title, updated_at AS lastmod, COALESCE(seo_priority, CASE WHEN level = 1 THEN 0.9 WHEN level = 2 THEN 0.8 ELSE 0.7 END ) AS priority, 'weekly'::text AS changefreq, image_url, COALESCE(meta_title, name …` |
| `vw_sitemap_products` | `SELECT 'product'::text AS url_type, '/produto/' \|\| COALESCE(slug, id::text) AS url_path, COALESCE(slug, id::text) AS identifier, name AS title, supplier_reference, updated_at AS lastmod, CASE WHEN is_featured = true THEN 1.0 WHEN is_bestseller = true THEN 0.9 WHEN is_new = true THEN 0.8 ELSE 0.7 END …` |
| `vw_sitemap_all` | `SELECT url_type, url_path, identifier, title, lastmod, priority, changefreq, image_url FROM public.vw_sitemap_products UNION ALL SELECT url_type, url_path, identifier, title, lastmod, priority, changefreq, image_url FROM public.vw_sitemap_categories ORDER BY priority DESC, lastmod DESC` |
| `vw_somarcas_materials` | `SELECT ("mt"."name")::"text" AS "material", "mg"."name" AS "grupo_material", "count"(DISTINCT "p"."id") AS "total_produtos", "sum"( CASE WHEN ("pv"."stock_quantity" > 0) THEN 1 ELSE 0 END) AS "produtos_com_estoque", COALESCE("sum"("pv"."stock_quantity"), (0)::bigint) AS "estoque_total", "round"("avg …` |
| `vw_somarcas_pending` | `SELECT "id", "supplier_reference" AS "sku", ("raw_data" ->> 'titulo'::"text") AS "titulo", (("raw_data" ->> 'estoque'::"text"))::integer AS "estoque", (("raw_data" ->> 'preco_com_gravacao_com_impostos'::"text"))::numeric AS "preco", "imported_at" FROM "public"."supplier_products_raw" WHERE (("suppli …` |
| `vw_somarcas_stats` | `SELECT "count"(*) AS "total_produtos", "count"(*) FILTER (WHERE ((("raw_data" ->> 'estoque'::"text"))::integer > 0)) AS "com_estoque", "count"(*) FILTER (WHERE ((("raw_data" ->> 'estoque'::"text"))::integer = 0)) AS "sem_estoque", "count"(*) FILTER (WHERE (("raw_data" ->> 'produto_ativo'::"text") = …` |
| `vw_somarcas_sync_status` | `SELECT ( SELECT "count"(*) AS "count" FROM "public"."supplier_products_raw" WHERE ("supplier_products_raw"."supplier_id" = '841cd690-210a-422a-908c-7676828db272'::"uuid")) AS "total_raw", ( SELECT "count"(*) AS "count" FROM "public"."supplier_products_raw" WHERE (("supplier_products_raw"."supplier_i …` |
| `vw_source_channel_coverage` | `SELECT "s"."name" AS "fornecedor", "spr"."source_channel", "spr"."source_endpoint", "count"(*) AS "total_linhas", "count"(DISTINCT ("spr"."raw_data" ->> 'CodigoAmigavel'::"text")) FILTER (WHERE ("spr"."supplier_id" = 'd6718a29-e954-4c1b-bd84-03ea24884900'::"uuid")) AS "produtos_unicos_xbz", "sum"( C …` |
| `vw_spot_cf_health` | `WITH "image_stats" AS ( SELECT "count"(*) AS "total_images", "count"( CASE WHEN (("pi"."image_type")::"text" = 'main'::"text") THEN 1 ELSE NULL::integer END) AS "main_images", "count"( CASE WHEN (("pi"."created_at")::"date" = ANY (ARRAY['2026-02-04'::"date", '2026-02-06'::"date"])) THEN 1 ELSE NULL: …` |
| `vw_spot_color_health` | `SELECT "code", "api_color_id", "name", "hex_code", "is_active", "notes", CASE WHEN (("hex_code" IS NULL) OR (("hex_code")::"text" = ''::"text")) THEN '⚠️ SEM HEX'::"text" WHEN (("hex_code")::"text" !~ '^#[0-9A-Fa-f]{6}$'::"text") THEN '⚠️ HEX INVÁLIDO'::"text" ELSE '✅ OK'::"text" END AS "hex_status" …` |
| `vw_spot_color_separator_reference` | `SELECT "sistema", "contexto", "padrao", "exemplo", "separador", "observacao" FROM ( VALUES ('SPOT API SKU'::"text",'Webservice OptionalsComplete'::"text",'{ProdReference}-{ColorCode}'::"text",'11103-103'::"text",'hyphen'::"text",'Chave natural do Bronze'::"text"), ('supplier_sku Silver'::"text",'pro …` |
| `vw_spot_image_coverage` | `SELECT "p"."sku", "p"."name", "count"(DISTINCT "pv"."id") AS "total_variants", "count"(DISTINCT "pv"."color_code") AS "total_colors", "count"(DISTINCT "pi_main"."id") AS "main_images", "count"(DISTINCT CASE WHEN ("pi_any"."color_id" IS NOT NULL) THEN "pi_any"."color_id" ELSE NULL::"uuid" END) AS "co …` |
| `vw_spot_price_alerts` | `SELECT "spr"."supplier_sku", ("spr"."raw_data" ->> 'Name'::"text") AS "name", ("spr"."raw_data" ->> 'Price1'::"text") AS "price1_raw", ("spr"."raw_data" ->> '_price_alert'::"text") AS "price_alert", "p"."cost_price" AS "gold_cost_price", "p"."sale_price" AS "gold_sale_price", "p"."is_active", "spr". …` |
| `vw_stock_quantity_outliers` | `select vss.id as source_id, vss.variant_id, pv.product_id, p.sku as product_sku, p.name as product_name, vss.supplier_id, vsp.name as supplier_name, vss.quantity as current_quantity, greatest(coalesce(vss.next_quantity_1,0), coalesce(vss.next_quantity_2,0), coalesce(vss.next_quantity_3,0), coalesce( …` |
| `vw_super_filtro_health` | `SELECT 'gold_products'::"text" AS "metrica", ("count"(*))::"text" AS "valor", CASE WHEN ("count"(*) >= 7000) THEN '✅'::"text" ELSE '⚠️'::"text" END AS "status" FROM "public"."products" WHERE (("products"."is_active" = true) AND ("products"."is_deleted" = false)) UNION ALL SELECT 'gender_filled'::"te …` |
| `vw_supplier_category_coverage` | `SELECT "s"."id" AS "supplier_id", "s"."name" AS "supplier_name", "count"("sc"."id") AS "total_supplier_cats", "count"("scm"."id") AS "mapped_cats", ("count"("sc"."id") - "count"("scm"."id")) AS "unmapped_cats", "round"(((("count"("scm"."id"))::numeric * 100.0) / (NULLIF("count"("sc"."id"), 0))::nume …` |
| `vw_supplier_color_mappings` | `SELECT "s"."id" AS "supplier_id", "s"."name" AS "supplier_name", "s"."code" AS "supplier_code", "sc"."id" AS "supplier_color_id", "sc"."code" AS "supplier_color_code", "sc"."name" AS "supplier_color_name", "sc"."hex_code" AS "supplier_hex", "cv"."id" AS "promo_variation_id", "cv"."name" AS "promo_na …` |
| `vw_supplier_field_mappings_summary` | `SELECT "s"."code" AS "supplier_code", "s"."name" AS "supplier_name", "m"."target_table", "m"."source_field", "m"."source_path", "m"."target_field", "m"."transform_type", "m"."source_unit", "m"."target_unit", "m"."priority", "m"."is_active" FROM ("public"."supplier_field_mappings" "m" JOIN "public"." …` |
| `vw_supplier_mapping_statistics` | `SELECT "spm"."supplier_code", "count"(*) AS "total_mappings", "count"(DISTINCT "spm"."property_code") AS "unique_properties", "sum"( CASE WHEN "pd"."is_thermal_indicator" THEN 1 ELSE 0 END) AS "thermal_mappings", "array_agg"(DISTINCT "pd"."category" ORDER BY "pd"."category") FILTER (WHERE ("pd"."cat …` |
| `vw_supplier_products_raw_errors` | `SELECT "s"."name" AS "supplier_name", "spr"."supplier_reference", "spr"."process_errors", "spr"."imported_at", "spr"."updated_at" FROM ("public"."supplier_products_raw" "spr" JOIN "public"."suppliers" "s" ON (("s"."id" = "spr"."supplier_id"))) WHERE ("spr"."process_errors" IS NOT NULL) ORDER BY "spr …` |
| `vw_supplier_products_raw_status` | `SELECT s.id AS supplier_id, s.name AS supplier_name, count(*) AS total_produtos, count(*) FILTER (WHERE spr.status = 'processed'::supplier_raw_status) AS processados, count(*) FILTER (WHERE spr.status <> 'processed'::supplier_raw_status) AS pendentes, count(*) FILTER (WHERE spr.process_errors IS NOT …` |
| `vw_system_health_quick` | `SELECT 'generated_columns_product_variants'::text AS check_name, CASE WHEN (( SELECT count(*) AS count FROM information_schema.columns WHERE (((columns.table_schema)::name = 'public'::name) AND ((columns.table_name)::name = 'product_variants'::name) AND ((columns.column_name)::name = ANY (ARRAY['nex …` |
| `vw_thermal_products` | `SELECT "p"."id", "p"."sku", "p"."supplier_reference", "p"."name", "p"."is_thermal", "string_agg"(DISTINCT "pd"."name_pt", ', '::"text" ORDER BY "pd"."name_pt") AS "thermal_properties", "array_agg"(DISTINCT "pd"."code" ORDER BY "pd"."code") AS "thermal_codes" FROM (("public"."products" "p" JOIN "publ …` |
| `vw_variant_sale_prices` | `SELECT "pv"."id" AS "variant_id", "pv"."product_id", "pv"."sku", "pv"."color_name", "vss"."cost_price_1", "vss"."cost_price_2", "vss"."cost_price_3", "vss"."cost_price_4", "vss"."cost_price_5", "vss"."min_qty_1", "vss"."min_qty_2", "vss"."min_qty_3", "vss"."min_qty_4", "vss"."min_qty_5", COALESCE("m …` |
| `vw_xbz_products_by_category` | `SELECT ("raw_data" ->> 'web_tipo'::"text") AS "categoria", ("raw_data" ->> 'web_sub_tipo'::"text") AS "subcategoria", "count"(*) AS "total_produtos", "round"("avg"((("raw_data" ->> 'preco_venda'::"text"))::numeric), 2) AS "preco_medio" FROM "public"."supplier_products_raw" WHERE ("supplier_id" = 'd2 …` |
| `vw_xbz_products_by_color` | `SELECT ("raw_data" ->> 'cor_web_principal'::"text") AS "cor", "count"(*) AS "total_produtos", "round"("avg"((("raw_data" ->> 'preco_venda'::"text"))::numeric), 2) AS "preco_medio" FROM "public"."supplier_products_raw" WHERE (("supplier_id" = 'd2734e23-d633-4819-bb15-e51aa44e2118'::"uuid") AND (("raw …` |
| `vw_xbz_products_stats` | `SELECT "count"(*) AS "total_produtos", "count"( CASE WHEN ("status" = 'processed'::"public"."supplier_raw_status") THEN 1 ELSE NULL::integer END) AS "processados", "count"( CASE WHEN ("status" <> 'processed'::"public"."supplier_raw_status") THEN 1 ELSE NULL::integer END) AS "pendentes", "count"( CAS …` |
| `vw_xbz_produtos_sem_imagem` | `SELECT "p"."id" AS "product_id", "p"."supplier_reference", "p"."sku", "p"."name", "p"."stock_quantity", "p"."cost_price", "p"."sale_price", "p"."is_active", ("p"."created_at")::"date" AS "criado_em", ("p"."updated_at")::"date" AS "atualizado_em", COALESCE(("spr"."raw_data" ->> 'ImageLink'::"text"), …` |
| `vw_xbz_scraping_status` | `WITH "base" AS ( SELECT ("supplier_products_raw"."raw_data" ->> 'CodigoAmigavel'::"text") AS "codigo_pai", "supplier_products_raw"."site_status", "supplier_products_raw"."site_scraped_at", "supplier_products_raw"."site_attempts", "supplier_products_raw"."site_last_error", "supplier_products_raw"."si …` |
| `supplier_stricker.v_customization_by_technique` | `SELECT "technique_code", "technique_name", "count"(DISTINCT "prod_reference") AS "products_count", "count"(*) AS "options_count", "avg"(("area_width_cm" * "area_height_cm")) AS "avg_area_cm2", "min"("price") AS "min_price", "max"("price") AS "max_price" FROM "supplier_stricker"."customization_option …` |
| `supplier_stricker.v_images_by_product` | `SELECT "p"."prod_reference", "p"."name", "p"."main_image", "p"."optional_image_1", "p"."optional_image_2", "o"."sku", "o"."color_name", "o"."image_1", "o"."image_2", "o"."image_3", "o"."image_4", "o"."image_5", "o"."image_6", "o"."image_7" FROM ("supplier_stricker"."products" "p" LEFT JOIN "supplier …` |
| `supplier_stricker.v_products_complete` | `SELECT "p"."id", "p"."prod_reference", "p"."name", "p"."description", "p"."brand", "p"."type_name", "p"."subtype_name", "p"."is_stockout", "p"."main_image", "count"("o"."id") AS "total_variants", "count"(DISTINCT "o"."color_code") AS "total_colors", "min"("o"."price_1") AS "min_price", "max"("o"."pr …` |
| `supplier_stricker.v_stock_by_product` | `SELECT "p"."prod_reference", "p"."name", "count"(DISTINCT "o"."sku") AS "total_skus", "sum"("s"."stock_quantity") AS "total_stock", "min"("s"."stock_quantity") AS "min_stock_sku", "max"("s"."stock_quantity") AS "max_stock_sku", "bool_or"(("s"."stock_quantity" > 0)) AS "has_stock", "min"("s"."next_da …` |
| `v_color_hierarchy` | `SELECT cg.id AS group_id, cg.name AS group_name, cg.slug AS group_slug, cg.hex_code AS group_hex, cg.sort_order AS group_sort, cv.id AS variation_id, cv.name AS variation_name, cv.slug AS variation_slug, cv.hex_code AS variation_hex, cv.sort_order AS variation_sort FROM color_groups cg LEFT JOIN col …` |
| `v_product_novelties` | `SELECT n.id AS novelty_id, n.product_id, p.name AS product_name, p.sku AS product_sku, p.description AS product_description, p.price AS base_price, p.images[1] AS product_image, n.supplier_id, n.supplier_code, n.supplier_product_code, p.supplier_name, p.category_id, p.category_name, n.detected_at, n …` |
| `slow_queries_view` | `SELECT pg_stat_statements.userid::regrole::text AS "user", pg_stat_statements.dbid, pg_stat_statements.queryid, left(pg_stat_statements.query, 200) AS query_snippet, pg_stat_statements.calls, round((pg_stat_statements.total_exec_time / pg_stat_statements.calls)::numeric, 2) AS avg_ms, round(pg_stat_ …` |
| `somarcas_catalogo_publico` | `SELECT id, raw_data ->> 'codigo' AS codigo, raw_data ->> 'titulo' AS titulo, raw_data ->> 'descricao' AS descricao, raw_data ->> 'url_foto' AS url_foto, raw_data -> 'matriz_de_fotos_adicionais' AS fotos_adicionais, raw_data -> 'matriz_de_categorias' AS categorias, raw_data -> 'produtos_similares' AS …` |
| `v_products_min_price` | `SELECT vp.product_id, p.name, p.sku, min(vp.sale_price_1) AS min_price, max(vp.sale_price_1) AS max_price, count(DISTINCT vp.variant_id) AS variants_count FROM public.v_variant_sale_prices_public vp JOIN public.v_products_public p ON p.id = vp.product_id GROUP BY vp.product_id, p.name, p.sku` |
| `color_analysis_staging` | `SELECT * FROM archive.color_analysis_staging` |
| `import_staging_images` | `SELECT * FROM archive.import_staging_images` |
| `scraper_images_staging` | `SELECT * FROM archive.scraper_images_staging` |
| `sm_images_staging` | `SELECT * FROM archive.sm_images_staging` |
| `xbz_gallery_staging` | `SELECT * FROM archive.xbz_gallery_staging` |
| `archive.v_import_staging_by_product` | `SELECT s.parsed_sku, p.name AS product_name, count(*) AS total_images, count(*) FILTER (WHERE s.status::text = 'completed') AS completed, count(*) FILTER (WHERE s.status::text = 'pending') AS pending, count(*) FILTER (WHERE s.status::text = ANY ( ARRAY['upload_error'::varchar,'insert_error'::varchar …` |
| `archive.v_import_staging_progress` | `SELECT status, count(*) AS total, round((count(*)::numeric * 100.0) / sum(count(*)) OVER (), 2) AS percentual FROM archive.import_staging_images GROUP BY status ORDER BY CASE status WHEN 'completed' THEN 1 WHEN 'uploaded' THEN 2 WHEN 'extracted' THEN 3 WHEN 'pending' THEN 4 WHEN 'already_exists'THEN …` |
| `v_n8n_sync_errors` | `SELECT id, sync_type, media_type, product_id, source_url, error_message, retry_count, created_at FROM archive.media_sync_log WHERE ((status)::text = 'error'::text) ORDER BY created_at DESC LIMIT 100` |
| `v_n8n_sync_success_recent` | `SELECT id, sync_type, media_type, product_id, cloudflare_id, destination_url, file_size_bytes, processing_time_ms, created_at FROM archive.media_sync_log WHERE ((status)::text = 'success'::text) ORDER BY created_at DESC LIMIT 100` |
| `v_n8n_sync_summary` | `SELECT 'products_total'::text AS metric, (count(*))::text AS value FROM products WHERE is_active = true UNION ALL SELECT 'products_with_images'::text, (count(DISTINCT product_images.product_id))::text FROM product_images WHERE is_active = true UNION ALL SELECT 'products_without_images'::text, ((SELE …` |
| `mv_product_leaf_category` | `SELECT DISTINCT ON (pca.product_id) pca.product_id, c.id AS leaf_category_id, c.name AS leaf_category_name, c.level AS leaf_category_level, c.parent_id AS leaf_category_parent_id, c.slug AS leaf_category_slug, CASE WHEN p.main_category_id IS NULL THEN c.id WHEN c.id = p.main_category_id THEN c.id WH …` |
| `v_ai_function_routing_effective` | `SELECT r.id AS routing_id, r.function_name, r.is_active, r.required_capabilities, r.request_overrides, r.primary_model_id, pm.model_id AS primary_model, pm.capabilities AS primary_capabilities, pm.provider_id AS primary_provider_id, pp.slug AS primary_provider_slug, pm.is_active AS primary_active, p …` |
| `v_health_gravacao` | `WITH tecnicas AS ( SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ativo) AS ativas, COUNT(*) FILTER (WHERE NOT ativo) AS inativas, COUNT(*) FILTER (WHERE ativo AND NOT EXISTS ( SELECT 1 FROM tabela_preco_gravacao_oficial_faixa f WHERE f.tabela_preco_gravacao_id = t.id )) AS ativas_sem_faixa FROM t …` |
| `v_audit_paradoxos_gravacao` | `WITH p1 AS ( SELECT 'P1'::text AS codigo_paradoxo, 'Técnica ativa sem faixas de preço'::text AS descricao, t.codigo_tabela, t.nome, t.grupo_tecnica, NULL::text AS produto_sku, NULL::text AS location_code, NULL::text AS detalhe, 'ALTO'::text AS severidade FROM tabela_preco_gravacao_oficial t WHERE t. …` |

### G.3 Funções de cálculo/decisão no código

- **validateStep(step, mag)** — `test-magazine-fix.mjs`
  ```
  const blocks = []; if (step === 'products' && mag.items.length === 0) { blocks.push('Adicione ao menos um produto.'); } return { blocks };
  ```
- **shouldSkipCache(request)** — `public/sw.js`
  ```
  const url = new URL(request.url); if (url.hostname.includes('.supabase.co')) return true; if (request.headers.has('Authorization')) return true; if (request.method !== 'GET') return true; return false;
  ```
- **generateToken()** — `recovery/src-legacy/src/components/collections/ShareCollectionDialog.tsx`
  ```
  setBusy(true); try { const expires = new Date(); expires.setDate(expires.getDate() + 30); const { data, error } = await supabase .from("collections") .update({ share_token: crypto.randomUUID(), share_expires_at: expires.toISOString(), is_public: true, }) .eq("id", collectionId) .select("share_token, share_expires_at, is_public") .single(); if (error) throw error; updateCollection(collectionId, { shareToken: data.share_token, shareExpiresAt: data.share_expires_at, isPublic: true, }); const url = …
  ```
- **generateLink()** — `recovery/src-legacy/src/components/compare/ShareComparisonDialog.tsx`
  ```
  setGenerating(true); try { const { data: userData } = await supabase.auth.getUser(); if (!userData.user) { toast.error("Faça login para compartilhar"); return; } const days = parseInt(expiresIn, 10); const expiresAt = new Date(Date.now() + days * 86400000).toISOString(); const { data, error } = await supabase .from("user_comparisons") .insert({ user_id: userData.user.id, client_id: clientId ?? null, client_name: clientName ?? null, items: JSON.parse(JSON.stringify(compareItems)), is_public: true …
  ```
- **GenerateButton({ onClick, isGenerating, disabled = false, hasAllRequirements = true, label = "Gerar Mockup com IA", className, }: Gener)** — `recovery/src-legacy/src/components/mockup/GenerateButton.tsx`
  ```
  const isReady = hasAllRequirements && !disabled && !isGenerating; return ( <motion.div whileHover={isReady ? { scale: 1.02 } : undefined} whileTap={isReady ? { scale: 0.98 } : undefined} className={cn("relative", className)} > {isReady && ( <motion.span aria-hidden className="absolute inset-0 rounded-md bg-primary/40 blur-md" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }} /> )} <Button type="button" size="lg" onClick={onClick} disabled={disabled || isGenera …
  ```
- **PriceResultV51({ productName, productPrice, quantity, priceData, showDetails = true, }: PriceResultV51Props)** — `recovery/src-legacy/src/components/pricing/simulator/PriceResultV51.tsx`
  ```
  const [copied, setCopied] = useState(false); // Cálculos derivados const productTotal = productPrice * quantity; const grandTotal = productTotal + priceData.total_price; const unitTotal = grandTotal / quantity; const handleCopyCode = () => { navigator.clipboard.writeText(priceData.codigo_orcamento); setCopied(true); toast.success('Código copiado!'); setTimeout(() => setCopied(false), 2000); }; return ( <Card className="border-primary/30 bg-primary/5"> <CardHeader className="pb-3"> <div className …
  ```
- **calculate()** — `recovery/src-legacy/src/components/pricing/simulator/QuantityAndResult.tsx`
  ```
  setIsCalculating(true); setError(null); try { // Usar o ID da técnica como ID da área const result = await calculatePrice(technique.id, quantity, colors); if (result?.success) { setPriceData(result); } else { setError('Erro ao calcular preço'); setPriceData(null); } } catch (err) { setError(err instanceof Error ? err.message : 'Erro desconhecido'); setPriceData(null); } finally { setIsCalculating(false); }
  ```
- **formatPrice(price: number)** — `recovery/src-legacy/src/components/products/EnhancedProductCard.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", }).format(price);
  ```
- **formatCurrency(value: number)** — `recovery/src-legacy/src/components/quotes/AdminTemplatesManager.tsx`
  ```
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **calculateTotal(template: QuoteTemplate)** — `recovery/src-legacy/src/components/quotes/AdminTemplatesManager.tsx`
  ```
  const itemsTotal = template.items_data.reduce((sum, item) => { const personalizationCost = item.personalizations?.reduce((pSum, p) => pSum + (p.unitCost || 0) * item.quantity + (p.setupCost || 0), 0) || 0; return sum + item.quantity * item.unitPrice + personalizationCost; }, 0); const discountValue = template.discount_percent > 0 ? itemsTotal * (template.discount_percent / 100) : template.discount_amount; return itemsTotal - discountValue;
  ```
- **formatCurrency(value: number)** — `recovery/src-legacy/src/components/quotes/QuoteTemplateForm.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", }).format(value);
  ```
- **calculateTotal()** — `recovery/src-legacy/src/components/quotes/QuoteTemplateForm.tsx`
  ```
  const itemsTotal = (formData.items_data || []).reduce((sum, item) => { const itemBase = item.quantity * item.unitPrice; const personalizationCost = item.personalizations?.reduce((pSum, p) => { return pSum + (p.unitCost || 0) * item.quantity + (p.setupCost || 0); }, 0) || 0; return sum + itemBase + personalizationCost; }, 0); const discountValue = formData.discount_percent && formData.discount_percent > 0 ? itemsTotal * (formData.discount_percent / 100) : formData.discount_amount || 0; return ite …
  ```
- **formatCurrency(value: number)** — `recovery/src-legacy/src/components/quotes/QuoteTemplatesList.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", }).format(value);
  ```
- **calculateTemplateTotal(template: QuoteTemplate)** — `recovery/src-legacy/src/components/quotes/QuoteTemplatesList.tsx`
  ```
  const itemsTotal = template.items_data.reduce((sum, item) => { const itemBase = item.quantity * item.unitPrice; const personalizationCost = item.personalizations?.reduce((pSum, p) => { return pSum + (p.unitCost || 0) * item.quantity + (p.setupCost || 0); }, 0) || 0; return sum + itemBase + personalizationCost; }, 0); const discountValue = template.discount_percent > 0 ? itemsTotal * (template.discount_percent / 100) : template.discount_amount; return itemsTotal - discountValue;
  ```
- **generateDeviceFingerprint()** — `recovery/src-legacy/src/hooks/useDeviceDetection.ts`
  ```
  const components = [ navigator.userAgent, navigator.language, navigator.platform, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 'unknown', (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown', ]; const fingerprint = components.join('|'); // Simple hash function let hash = 0; for (let i = 0; i < fingerprint.length; i++) { const char = fingerprint.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = h …
  ```
- **mapPriceResponseToFlat(resp: Record<string, unknown>)** — `recovery/src-legacy/src/hooks/useGravacaoPriceV2.ts`
  ```
  return adaptPriceResponse(resp);
  ```
- **calculateCustomizationPrice(params: CalculatePriceParams)** — `recovery/src-legacy/src/hooks/useGravacaoPriceV2.ts`
  ```
  const result = await invokeExternalRpc<CustomizationPriceResponse>( 'fn_get_customization_price', { p_area_id: params.areaId, p_quantidade: params.quantidade, p_num_cores: params.numCores ?? 1, p_largura_cm: params.larguraCm ?? null, p_altura_cm: params.alturaCm ?? null, } ); return adaptPriceResponse(result);
  ```
- **generateMockup()** — `recovery/src-legacy/src/hooks/useMockupGenerator.ts`
  ```
  const areasWithLogos = personalizationAreas.filter((a) => a.logoPreview); if (!selectedClient || !productSelection || !selectedTechnique || areasWithLogos.length === 0) { toast.error('Selecione empresa, produto, técnica e faça upload de pelo menos um logo'); return; } const productImage = getProductImage(); if (!productImage) { toast.error('O produto selecionado não possui imagem'); return; } setIsLoading(true); setGeneratedMockup(null); setGeneratedBatchMockups([]); setGenerationError(null); se …
  ```
- **calcDaysRemaining(createdAt: string)** — `recovery/src-legacy/src/hooks/useNovelties.ts`
  ```
  const created = new Date(createdAt).getTime(); const now = Date.now(); const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24)); return Math.max(0, NOVELTY_WINDOW_DAYS - elapsed);
  ```
- **calculateMatchScore(source: Product, candidate: Product)** — `recovery/src-legacy/src/hooks/useProductMatch.ts`
  ```
  score: number; reasons: string[]
  ```
- **calculateNextRun(frequency: ReportFrequency)** — `recovery/src-legacy/src/hooks/useScheduledReports.ts`
  ```
  const now = new Date(); switch (frequency) { case 'daily': return new Date(now.getTime() + 24 * 60 * 60 * 1000); case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); case 'monthly': { const next = new Date(now); next.setMonth(next.getMonth() + 1); return next; } }
  ```
- **calculateNameSimilarity(name1: string, name2: string)** — `recovery/src-legacy/src/hooks/useSupplierComparison.ts`
  ```
  if (!name1?.trim() || !name2?.trim()) return 0; const words1 = name1.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w)); const words2 = name2.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w)); if (words1.length === 0 || words2.length === 0) return 0; const commonWords = words1.filter((word) => words2.some((w) => w.includes(word) || word.includes(w)) ); return commonWords.length / Math.max(words1.length, words2.length);
  ```
- **fetchPriceOptions()** — `recovery/src-legacy/src/hooks/useTechniquePricing.ts`
  ```
  setIsLoading(true); setError(null); try { // Buscar todas as tabelas que contêm o código da técnica const { data, error: invokeError } = await supabase.functions.invoke('external-db-bridge', { body: { table: 'customization_price_tables', operation: 'select', select: 'id,table_code,table_code_option,table_fullcode,customization_type_name,max_colors,max_area_width_cm,max_area_height_cm,price_by_color,price_by_area,setup_price,handling_price', filters: { is_active: true }, limit: 100, }, }); if (in …
  ```
- **calculateRecommendationScore(technique: Technique, keywords: string[],)** — `recovery/src-legacy/src/hooks/useTechniqueRecommendations.ts`
  ```
  score: number; matchedKeywords: string[]; reason: string
  ```
- **extractPriceTiers(table: CustomizationPriceTable)** — `recovery/src-legacy/src/hooks/useTecnicasUnificadas.ts`
  ```
  const tiers: PriceTier[] = []; for (let i = 1; i <= 15; i++) { const minQty = table[`min_qty_${i}`] as number | undefined; const price = table[`price_${i}`] as number | undefined; const sla = table[`sla_${i}`] as number | undefined; if (minQty !== undefined && minQty !== null && price !== undefined && price !== null) { const nextMinQty = table[`min_qty_${i + 1}`] as number | undefined; const maxQty = nextMinQty ? nextMinQty - 1 : null; tiers.push({ tierIndex: i, minQuantity: minQty, maxQuantity: …
  ```
- **calculatePriceForQuantityLegacy(table: CustomizationPriceTable, quantity: number,)** — `recovery/src-legacy/src/hooks/useTecnicasUnificadas.ts`
  ```
  const tiers = extractPriceTiers(table); if (tiers.length === 0) return null; let selectedTier = tiers[0]; for (const tier of tiers) { if (quantity >= tier.minQuantity) { selectedTier = tier; } } const unitPrice = selectedTier.unitPrice; const totalPrice = unitPrice * quantity; const setupPrice = table.setup_price || 0; const handlingPrice = table.handling_price || 0; const grandTotal = totalPrice + setupPrice + handlingPrice; const minTierPrice = tiers[0].unitPrice; const savingsPerUnit = minTie …
  ```
- **calculateColorSummary(variants: VariantWithStock[], stockEntries: StockEntry[])** — `recovery/src-legacy/src/hooks/useVariantSupplierSources.ts`
  ```
  const colorMap = new Map<string, ColorSummary>(); // Agregar estoque atual por cor for (const v of variants) { const name = v.color_name || 'Sem cor'; const existing = colorMap.get(name); if (existing) { existing.currentStock += v.stock_quantity || 0; } else { colorMap.set(name, { name, hex: v.color_hex, thumbnail: v.selected_thumbnail, currentStock: v.stock_quantity || 0, incomingTotal: 0, incomingCount: 0, }); } } // Agregar previsões de reposição por cor for (const entry of stockEntries) { co …
  ```
- **generateSlug(nome: string)** — `recovery/src-legacy/src/hooks/gravacao/useVariantesGravacao.ts`
  ```
  return nome .toLowerCase() .normalize('NFD') .replace(/[\u0300-\u036f]/g, '') .replace(/[^a-z0-9]+/g, '-') .replace(/(^-|-$)/g, '');
  ```
- **generateKitOgImage(input: KitOgInput)** — `recovery/src-legacy/src/lib/kit-og-image.ts`
  ```
  if (typeof document === "undefined") return null; try { const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 630; const ctx = canvas.getContext("2d"); if (!ctx) return null; const color = input.color && /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : "#3B82F6"; // Background gradient diagonal const grad = ctx.createLinearGradient(0, 0, 1200, 630); grad.addColorStop(0, color); grad.addColorStop(1, shade(color, -30)); ctx.fillStyle = grad; ctx.fillRect(0, 0, 12 …
  ```
- **validateAndRedirect(userId: string, email: string)** — `recovery/src-legacy/src/pages/Auth.tsx`
  ```
  try { const ipValidation = await validateIPForAuthenticatedUser(userId); if (!ipValidation.isAllowed && ipValidation.hasRestrictions) { await signOut(); const reason = ipValidation.reason || 'access_blocked'; await logLoginAttempt(email, userId, false, `${reason}: ${ipValidation.error}`); setIpBlocked(true); setBlockedIP(ipValidation.currentIP); toast({ variant: 'destructive', title: 'Acesso Bloqueado', description: ipValidation.error || `Seu IP (${ipValidation.currentIP}) não está autorizado.`, …
  ```
- **formatCurrency(value: number)** — `recovery/src-legacy/src/pages/ComparePage.tsx`
  ```
  
  ```
- **PriceSimulatorPage()** — `recovery/src-legacy/src/pages/PriceSimulatorPage.tsx`
  ```
  return ( <MainLayout> <PageSEO title="Simulador de Preços" description="Simule preços de brindes com personalização, quantidades e custos." path="/simulador-precos" /> <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8"> {/* Hero Header — #1 */} <div className="flex flex-col gap-1"> <h1 data-testid="page-title-simulador-precos" className="font-display text-2xl font-bold tracking-tight text-foreground sm:tex …
  ```
- **formatCurrency(value: number)** — `recovery/src-legacy/src/pages/QuotesListPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', }).format(value);
  ```
- **formatPrice(price: number)** — `recovery/src-legacy/src/pages/product-detail/ProductDetailHero.tsx`
  ```
  
  ```
- **formatPrice(value: number)** — `recovery/src-legacy/src/pages/product-match/MatchCards.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **formatPrice(value: number)** — `recovery/src-legacy/src/pages/product-match/ProductSearchPanel.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **formatCurrency(value: number)** — `recovery/src-legacy/src/pages/quote-view/QuoteActionHandlers.ts`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **calcPersTotal(totalCost: number, qty: number)** — `recovery/src-legacy/src/pages/quote-view/QuoteActionHandlers.ts`
  ```
  if (qty <= 0) return totalCost; const roundedUnit = Math.round((totalCost / qty) * 100) / 100; return Math.round(roundedUnit * qty * 100) / 100;
  ```
- **formatCurrency(value: number)** — `recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **drawPriceBreakdown(doc: jsPDF, kitState: KitState, kitQuantity: number, y: number,)** — `recovery/src-legacy/src/utils/kitPdfGenerator.ts`
  ```
  const { box, items, personalization } = kitState; const breakdown = generatePriceBreakdown(box, items, personalization, kitQuantity); const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity); y = drawSectionTitle(doc, 'Detalhamento de Preços', y); const rows = breakdown.map((item) => [ item.isPersonalization ? ` ↳ ${item.label}` : item.label, item.quantity ? String(item.quantity) : '-', formatCurrency(item.unitPrice), formatCurrency(item.totalPrice), ]); autoTable(doc, { …
  ```
- **generateKitPDF(options: KitPdfOptions)** — `recovery/src-legacy/src/utils/kitPdfGenerator.ts`
  ```
  const { kitState, kitQuantity, kitName } = options; const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); let y = drawHeader(doc, kitName, 0, options.orgName, options.orgLogoUrl, kitState.identity); // KPI cards y = drawKpiCards(doc, kitState, kitQuantity, y); // Composition section y = drawSectionTitle(doc, 'Composição do Kit', y); y = drawCompositionTable(doc, kitState, y); // Box info line if (kitState.box) { doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc. …
  ```
- **validateImportedTemplates(data: unknown)** — `recovery/src-legacy/src/utils/templateExport.ts`
  ```
  if (!data || typeof data !== 'object') return null; const obj = data as Record<string, unknown>; if (!obj.version || !obj.templates || !Array.isArray(obj.templates)) { return null; } // Validate each template has required fields for (const template of obj.templates) { if (typeof template !== 'object' || !template) return null; const t = template as Record<string, unknown>; if (!t.name || typeof t.name !== 'string') return null; } return data as ExportedTemplate;
  ```
- **DiscountApprovalAuditTrail({ requestId, defaultOpen = false }: Props)** — `src/components/admin/DiscountApprovalAuditTrail.tsx`
  ```
  const [search, setSearch] = useState(''); const { data, isLoading } = useQuery({ queryKey: ['discount-approval-audit', requestId], queryFn: async () => { const { data: rows, error } = await supabase // rls-allow: SELECT permitido a admin/supervisor/seller dono via policy daa_select_scope .from('discount_approval_audit') .select( 'id, event, actor_role, actor_id, requested_discount_percent, max_allowed_percent, real_discount_percent, admin_notes, seller_notes, created_at, actor:actor_id(full_name …
  ```
- **DiscountApprovalFilterBar({ value, onChange, sellers, totalCount, filteredCount, }: Props)** — `src/components/admin/DiscountApprovalFilterBar.tsx`
  ```
  const ids = { search: useId(), seller: useId(), status: useId(), min: useId(), max: useId(), from: useId(), to: useId(), }; const patch = (p: Partial<DiscountApprovalFilters>) => onChange({ ...value, ...p }); const isDirty = value.search !== '' || value.sellerId !== 'all' || value.status !== EMPTY_FILTERS.status || value.minPercent !== null || value.maxPercent !== null || value.dateFrom !== '' || value.dateTo !== ''; return ( <div className="space-y-3 rounded-lg border border-border/40 bg-muted/ …
  ```
- **DiscountApprovalHeaderBadge()** — `src/components/admin/DiscountApprovalHeaderBadge.tsx`
  ```
  // FIX 2026-06-18 (BUG-DAR-401): adicionado rolesLoaded para evitar race condition. // Sem rolesLoaded, isAdmin podia ser true antes do JWT estar anexado ao // supabase-js client, fazendo a query disparar com anon key → HTTP 401. // rolesLoaded=true garante que fetchUserData completou, portanto o JWT já // está no cliente e a request vai como authenticated → HTTP 200 com RLS. const { isAdmin, rolesLoaded } = useAuth(); const navigate = useNavigate(); const { data: count = 0 } = useQuery({ queryK …
  ```
- **DiscountApprovalQueue()** — `src/components/admin/DiscountApprovalQueue.tsx`
  ```
  const { isAdmin, rolesLoaded } = useAuth(); const qc = useQueryClient(); const [notes, setNotes] = useState<Record<string, string>>({}); const [processingId, setProcessingId] = useState<string | null>(null); const [searchParams] = useSearchParams(); const highlightedId = searchParams.get('request'); const highlightedRef = useRef<HTMLDivElement | null>(null); const [filters, setFilters] = useState<DiscountApprovalFilters>(EMPTY_FILTERS); // Paginação cursorada por created_at: cada página traz `PA …
  ```
- **DiscountManagementPanel()** — `src/components/admin/DiscountManagementPanel.tsx`
  ```
  const navigate = useNavigate(); const { limits, isLoading: limitsLoading, fetchAllLimits, setLimit, deleteLimit, } = useSellerDiscountLimits(); const { pendingRequests, isLoading: requestsLoading, fetchPendingRequests, respondToApproval, } = useDiscountApproval(); const [sellers, setSellers] = useState<SellerProfile[]>([]); const [searchTerm, setSearchTerm] = useState(''); const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all'); const [editDialog, setEditDialog] = useState<{ …
  ```
- **formatCurrency(v: number)** — `src/components/admin/DiscountManagementPanel.tsx`
  ```
  
  ```
- **DiscountNotificationFilterPanel()** — `src/components/admin/DiscountNotificationFilterPanel.tsx`
  ```
  const { user, isAdmin, rolesLoaded } = useAuth(); const qc = useQueryClient(); const [sellerId, setSellerId] = useState<string>('all'); const [minPct, setMinPct] = useState<string>(''); const [maxPct, setMaxPct] = useState<string>(''); const [onlyUnread, setOnlyUnread] = useState<boolean>(true); const { data, isLoading } = useQuery({ queryKey: ['discount-notifications', user?.id], queryFn: async () => { if (!user) return [] as DiscountNotification[]; const { data: rows, error } = await supabase …
  ```
- **applyRepair()** — `src/components/admin/OwnershipRepairDialog.tsx`
  ```
  if (!preview) return; setConfirmRepairOpen(true);
  ```
- **invalidate()** — `src/components/admin/badges-manager/useBadgesManager.ts`
  ```
  void qc.invalidateQueries({ queryKey: QK });
  ```
- **validateSecret(name: string, value: string)** — `src/components/admin/connections/secretValidators.ts`
  ```
  const rule = SECRET_VALIDATORS[name] ?? DEFAULT_RULE; if (value.length === 0) { return { ok: false, hint: rule.hint }; } // Guarda inviolável: sufixo mascarado exige exatamente 4 caracteres. // Aplicada antes do validador específico para garantir mensagem clara // mesmo em secrets com regras customizadas (ex: BITRIX24_DOMAIN). if (value.length < MIN_SUFFIX_LENGTH) { return { ok: false, message: `Valor muito curto: ${value.length} ${value.length === 1 ? 'caractere' : 'caracteres'}. O sufixo masca …
  ```
- **validateSecretName(name: string)** — `src/components/admin/connections/secretWhitelist.ts`
  ```
  const trimmed = (name ?? '').trim(); if (!trimmed) { return { ok: false, code: 'empty', message: 'Informe o nome da credencial.', }; } if (ALLOWED_SECRET_NAMES.has(trimmed)) { return { ok: true }; } // Prefix-based names still need a sane shape const matchedPrefix = ALLOWED_SECRET_PREFIXES.find((p) => trimmed.startsWith(p)); if (matchedPrefix) { if (!NAME_SHAPE.test(trimmed)) { return { ok: false, code: 'bad_shape', message: `Nomes com prefixo ${matchedPrefix} devem usar apenas A–Z, 0–9 e _ (3–6 …
  ```
- **formatPrice(price: number)** — `src/components/admin/products/ProductPreviewPanel.tsx`
  ```
  
  ```
- **formatCurrency(v: number | null)** — `src/components/admin/products/sections/ProductSupplierSection.tsx`
  ```
  
  ```
- **invalidate()** — `src/components/admin/products/sections/engraving/useEngravingWizard.ts`
  ```
  
  ```
- **score(r: MergedRow)** — `src/components/bi/ClientCategoryRadar.tsx`
  ```
  
  ```
- **formatCurrency(value: number)** — `src/components/cart/CartUtilComponents.tsx`
  ```
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **PriceLabel({ label, value, testId, className, isPrimary }: PriceLabelProps)** — `src/components/cart/CartUtilComponents.tsx`
  ```
  return ( <div className={cn('flex flex-col space-y-0.5', className)}> <span className={cn( 'font-medium tracking-tight text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100', className?.includes('flex-row') ? 'text-[8px]' : 'text-[10px]', )} > {label} </span> <span data-testid={testId} className={cn( 'font-bold tabular-nums', className?.includes('flex-row') ? 'text-[11px]' : 'text-sm', isPrimary ? 'text-primary' : 'text-foreground', )} > {formatCurrency(value)} </span> </di …
  ```
- **PriceSparkline({ productId, className }: Props)** — `src/components/compare/PriceSparkline.tsx`
  ```
  const [data, setData] = useState<PricePoint[]>([]); const [loading, setLoading] = useState(true); useEffect(() => { let cancelled = false; (async () => { try { const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); const { data: rows } = await supabase .from('price_history') .select('changed_at,new_values') .eq('variant_id', productId) .gte('changed_at', since) .order('changed_at', { ascending: true }) .limit(60); if (cancelled) return; const points = (rows ?? []).map((r) = …
  ```
- **formatCurrency(value: number)** — `src/components/compare/SupplierComparisonModal.tsx`
  ```
  
  ```
- **ScoreBreakdown({ score, breakdown, label, }: { score: number; breakdown: Record<string, number>; label?: string; })** — `src/components/compare/SupplierComparisonModal.tsx`
  ```
  return ( <Popover> <PopoverTrigger asChild> <button type="button" className="group inline-flex items-center gap-1.5"> {label ? ( <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary transition-all hover:bg-primary/20"> <Sparkles className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase tracking-widest">{label}</span> </div> ) : ( <div className="flex flex-col items-center"> <span className="text-sm font-black ta …
  ```
- **formatCurrency(value: number)** — `src/components/dashboard/QuickActionsPanel.tsx`
  ```
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **formatCurrency(value: number)** — `src/components/engraving/PricingPanel.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', }).format(value);
  ```
- **shouldShow(id: string)** — `src/components/expert/FlowFilterPanel.tsx`
  ```
  const q = globalSearch.toLowerCase(); const match = (sId: string, label: string) => !q || label.toLowerCase().includes(q) || sId.includes(q); const optMap: Record<string, string[]> = { cores: options.colors, categorias: options.categories, materiais: options.materials, fornecedores: options.suppliers, tecnicas: options.techniques, publico: options.publicoAlvo, datas: options.datasComemorativas, endomarketing: options.endomarketing, nichos: options.nichos, tags: options.tags, }; if (optMap[id]) r …
  ```
- **PriceDropBadge({ priceDiffPct, priceAtSave, currentPrice, savedAt, threshold = 2, size = 'sm', }: Props)** — `src/components/favorites/PriceDropBadge.tsx`
  ```
  if (priceDiffPct === null || priceAtSave === null) return null; if (Math.abs(priceDiffPct) < threshold) return null; const isDrop = priceDiffPct < 0; const Icon = isDrop ? TrendingDown : TrendingUp; const label = `${isDrop ? '−' : '+'}${Math.abs(priceDiffPct).toFixed(0)}%`; const savedAtLabel = savedAt ? new Date(savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null; return ( <TooltipProvider> <Tooltip> <TooltipTrigger asChild> <div className={cn( 'inline-flex items-c …
  ```
- **formatCurrency(value: number)** — `src/components/goals/SalesGoalsCard.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', }).format(value);
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/CategoryRanking.tsx`
  ```
  
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/IntelligenceKPICards.tsx`
  ```
  
  ```
- **generateMockMarketData(days: number)** — `src/components/intelligence/MarketIntelligenceChart.tsx`
  ```
  const daily: MacroMarketPoint[] = []; const now = new Date(); let stock = 3200 + Math.floor(seededRandom(days) * 800); for (let i = days - 1; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const dateStr = d.toISOString().split('T')[0]; const dayOfWeek = d.getDay(); const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; const baseDepleted = isWeekend ? 15 : 45; const depleted = Math.max(0, Math.round(baseDepleted + (seededRandom(i * 3 + 1) - 0.4) * 30)); const restocked = seed …
  ```
- **formatCurrency(v: number | null | undefined)** — `src/components/intelligence/ProductRankingSearch.tsx`
  ```
  
  ```
- **RankingFilterToolbar({ filters, suppliers, categories, onSearchChange, onDaysChange, onLimitChange, onSupplierChange, onCategoryChange, onCle)** — `src/components/intelligence/RankingFilterToolbar.tsx`
  ```
  const [supOpen, setSupOpen] = useState(false); const [supSearch, setSupSearch] = useState(''); const [catOpen, setCatOpen] = useState(false); const [catSearch, setCatSearch] = useState(''); const [historyOpen, setHistoryOpen] = useState(false); const { history: searchHistory, addToHistory, removeFromHistory, clearHistory, } = useSearchHistory('general'); const filteredSuppliers = useMemo(() => { if (!supSearch.trim()) return suppliers; const q = supSearch.toLowerCase().trim(); return suppliers.f …
  ```
- **RankBadge({ index }: { index: number })** — `src/components/intelligence/RankingResultRow.tsx`
  ```
  if (index === 0) return ( <span className="text-base" title="1º lugar"> 🥇 </span> ); if (index === 1) return ( <span className="text-base" title="2º lugar"> 🥈 </span> ); if (index === 2) return ( <span className="text-base" title="3º lugar"> 🥉 </span> ); return ( <span className={cn( 'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold', 'bg-muted text-muted-foreground', )} > {index + 1} </span> );
  ```
- **RankingResultRow({ product, index, topRevenue, searchQuery, formatCurrency, onClick, }: RankingResultRowProps)** — `src/components/intelligence/RankingResultRow.tsx`
  ```
  // FIX: null-guard — totalQuantity/totalRevenue podem vir null antes de estabilizar const safeQty = product.totalQuantity ?? 0; const safeRev = product.totalRevenue ?? 0; const avgUnit = safeQty > 0 ? safeRev / safeQty : 0; return ( <div className={cn( 'grid cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/20', 'grid-cols-[2rem_2.5rem_1fr_auto] sm:grid-cols-[2rem_2.5rem_1fr_4.5rem_5rem_5rem_4rem]', index < 3 && 'bg-primary/[0.02]', )} onClick={onClick} > {/* Rank */ …
  ```
- **applyView(view: SavedView)** — `src/components/intelligence/SavedViewsManager.tsx`
  ```
  const sp = new URLSearchParams(); Object.entries(view.filters).forEach(([k, v]) => sp.set(k, v)); navigate(`/tendencias?${sp.toString()}`, { replace: true }); toast({ title: 'Visão aplicada', description: view.name });
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/SegmentAnalysis.tsx`
  ```
  
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/SupplierSales.tsx`
  ```
  
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/TopClients.tsx`
  ```
  
  ```
- **formatCurrency(v: number | null | undefined)** — `src/components/intelligence/TrendingProducts.tsx`
  ```
  
  ```
- **applyToCollection(collectionId: string, collectionName: string)** — `src/components/inventory/BulkAddToCollectionModal.tsx`
  ```
  let added = 0; let skipped = 0; try { for (const r of rows) { if (isProductInCollection(r.productId, collectionId)) { skipped++; continue; } addProductToCollection(collectionId, r.productId, r.variant); added++; } toast.success( `${added} ${added === 1 ? 'item adicionado' : 'itens adicionados'} a "${collectionName}"${skipped > 0 ? ` (${skipped} já existia${skipped > 1 ? 'm' : ''})` : ''}`, ); onApplied?.(); onOpenChange(false); } catch { toast.error('Não foi possível adicionar todos os itens. Te …
  ```
- **calcSuggestedQty(row: RuptureAlertRow)** — `src/components/inventory/PurchaseOrderModal.tsx`
  ```
  if (!row.ema_diaria || row.ema_diaria <= 0) return 1; const gap = Math.max(0, 30 - (row.cobertura_dias ?? 0)); return Math.max(1, Math.ceil(gap * row.ema_diaria));
  ```
- **fmtScore(v: number | null)** — `src/components/inventory/supplier-reliability/SupplierDrawer.tsx`
  ```
  return v === null ? '—' : `${v}/100`;
  ```
- **shouldRenderKitStockForecast(status: KitStockStatus)** — `src/components/kit-builder/KitSummary.tsx`
  ```
  return status === 'available' || status === 'unavailable';
  ```
- **shouldVirtualizeKitItems(itemCount: number)** — `src/components/kit-builder/VirtualizedKitItemList.tsx`
  ```
  return itemCount > VIRTUALIZED_KIT_ITEM_THRESHOLD;
  ```
- **apply()** — `src/components/layout/Header.tsx`
  ```
  const sidebarW = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim() || '16rem'; document.documentElement.style.setProperty('--header-left', mq.matches ? sidebarW : '0px');
  ```
- **computeOpenGroups(pathname: string)** — `src/components/layout/SidebarReorganized.tsx`
  ```
  const next: Record<string, boolean> = {}; navGroups.forEach((group) => { const hasActive = group.items.some((item) => isNavItemActive(pathname, item.href, item.exact)); next[group.id] = hasActive || (group.defaultOpen ?? false); }); return next;
  ```
- **resolveScore(variation: VariationItem)** — `src/components/magic-up/MagicUpVariationComparator.tsx`
  ```
  if (typeof variation.qualityDiagnosis?.total === 'number') return variation.qualityDiagnosis.total; if (typeof variation.qualityScore === 'number') return variation.qualityScore; return null;
  ```
- **validateLogoFile(file: File)** — `src/components/mockup/AreaCard.tsx`
  ```
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`; if (!LOGO_ALLOWED_TYPES.includes(file.type) || !LOGO_ALLOWED_EXTENSIONS.includes(ext)) { return LOGO_FORMAT_ERROR; } if (file.size > LOGO_MAX_BYTES) return LOGO_SIZE_ERROR; return null;
  ```
- **validateArtFile(file: File)** — `src/components/mockup/ArtFileUpload.tsx`
  ```
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`; if (!ACCEPTED_EXTENSIONS.includes(ext)) { return `${file.name}: formato não suportado (${ACCEPTED_EXTENSIONS.join(', ')})`; } // Alguns navegadores deixam o tipo vazio para .ai/.cdr; tipo preenchido tem de estar na lista. if (file.type && !ACCEPTED_MIME.includes(file.type)) { return `${file.name}: tipo de arquivo inválido`; } if (file.size > MAX_SIZE_MB * 1024 * 1024) { return `${file.name}: excede ${MAX_SIZE_MB}MB`; } return nul …
  ```
- **hasValidSignature(file: File)** — `src/components/mockup/ArtFileUpload.tsx`
  ```
  if (!file.name.toLowerCase().endsWith('.pdf')) return true; try { const head = new Uint8Array(await file.slice(0, 4).arrayBuffer()); return String.fromCharCode(...head) === '%PDF'; } catch { return true; }
  ```
- **formatCurrency(value: number)** — `src/components/mockup/MockupProductSelector.tsx`
  ```
  
  ```
- **applyLogoToAllAreas()** — `src/components/mockup/MultiAreaManager.tsx`
  ```
  const activeArea = areas.find((a) => a.id === activeAreaId); if (!activeArea?.logoPreview) { toast.error('Selecione uma área com logo primeiro'); return; } onAreasChange( areas.map((a) => ({ ...a, logoPreview: activeArea.logoPreview, logoFile: activeArea.logoFile ?? null, })), ); toast.success(`Logo aplicado em ${areas.length} áreas`);
  ```
- **compute()** — `src/components/mockup/approval/MockupApprovalPreview.tsx`
  ```
  const el = stageRef.current; const available = (el?.clientWidth || window.innerWidth) - STAGE_GUTTER; if (available <= 0) return; setScale(Math.min(1, available / PAGE_WIDTH));
  ```
- **computeLogoBounds(input: LogoBoundsInput)** — `src/components/mockup/logo-editor/useLogoDrag.ts`
  ```
  const { containerWidth, containerHeight, logoWidthPx, logoHeightPx, rotationDeg = 0 } = input; const fallback = { minX: FALLBACK_MIN, maxX: FALLBACK_MAX, minY: FALLBACK_MIN, maxY: FALLBACK_MAX, }; if ( !(containerWidth > 0) || !(containerHeight > 0) || !logoWidthPx || !logoHeightPx || logoWidthPx <= 0 || logoHeightPx <= 0 ) { return fallback; } const rad = (rotationDeg * Math.PI) / 180; const cos = Math.abs(Math.cos(rad)); const sin = Math.abs(Math.sin(rad)); const halfW = ((logoWidthPx * cos + …
  ```
- **round1(v: number)** — `src/components/mockup/logo-editor/useLogoDrag.ts`
  ```
  Math.round(v * 10) / 10;
  ```
- **generateBreadcrumbs(pathname: string, roles: { isDev: boolean; isAdmin: boolean } = { isDev: false, isAdmin: false },)** — `src/components/navigation/Breadcrumbs.tsx`
  ```
  const segments = pathname.split('/').filter(Boolean); if (segments.length === 0) return []; const breadcrumbs: BreadcrumbItem[] = []; let currentPath = ''; for (let i = 0; i < segments.length; i++) { const segment = segments[i]; currentPath += `/${segment}`; // Skip UUIDs or numeric IDs in breadcrumbs display const isId = UUID_OR_SHORT_ID_RE.test(segment) || NUMERIC_ID_RE.test(segment); if (isId) { breadcrumbs.push({ label: `#${segment.slice(0, 8)}...`, href: i < segments.length - 1 ? currentPat …
  ```
- **TotalsSection({ data }: { data: ProposalTemplateData })** — `src/components/pdf/ProposalSections.tsx`
  ```
  const tokens = getTotalsColorTokens(); const shippingLabel = data.shippingType ? formatShipping(data.shippingType, data.shippingCost) : data.shippingCost ? fmt(data.shippingCost) : 'Cortesia'; return ( <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }} data-totals-scheme={tokens.scheme} > <div style={{ width: `${TOTALS_BLOCK_WIDTH_PX}px` }}> <div style={totalsRowStyle}> <span>Subtotal:</span> <span style={{ fontWeight: 500 }}>{fmt(data.subtotal)}</span> </div> {/* Ec …
  ```
- **formatCurrency(value: number | null)** — `src/components/personalization/TechniqueSLACard.tsx`
  ```
  if (!value) return '—'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calculateTotalCost(technique: Technique, quantity: number)** — `src/components/personalization/TechniqueSLACard.tsx`
  ```
  const setup = technique.setup_cost || 0; const unit = technique.unit_cost || 0; return setup + unit * quantity;
  ```
- **formatCurrency(value: number | null)** — `src/components/personalization/TechniqueSelector.tsx`
  ```
  if (!value) return '—'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calculateForConfig(config: SelectedTechniqueConfig, quantity: number)** — `src/components/pricing/calculator/QuantityComparisonTable.tsx`
  ```
  const cell = cells.get(cellKey(config, quantity)); if (cell?.status !== 'ok') return cell ?? null; // Conta do orçamento para esta técnica: quantidade × preço do produto + total_cost (= total_cobrado). const productTotal = product.price * quantity; const grandTotal = productTotal + cell.customizationTotal; return { ...cell, productTotal, grandTotal, unitTotal: grandTotal / quantity };
  ```
- **quoteTotalFor(quantity: number)** — `src/components/pricing/calculator/QuantityComparisonTable.tsx`
  ```
  const results = selectedConfigs.map((config) => calculateForConfig(config, quantity)); if (results.some((r) => r === null)) return null; const failed = results.filter((r) => r?.status === 'error' || r?.status === 'rejected').length; const withoutPrice = results.filter((r) => r?.status === 'dimension').length; const engraving = results.reduce( (sum, r) => sum + (r?.status === 'ok' ? r.customizationTotal : 0), 0, ); const grandTotal = product.price * quantity + engraving; return { failed, withoutP …
  ```
- **formatCurrency(value: number)** — `src/components/pricing/calculator/types.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calculateAll()** — `src/components/pricing/simulator/MultiEngravingResult.tsx`
  ```
  if (engravings.length === 0) { setCalculations([]); return; } setIsCalculating(true); const results = await Promise.all( engravings.map(async (engraving) => { try { // Usar ID da área da técnica selecionada // Assumindo que technique.id é o ID da área de impressão const areaId = engraving.technique.id; const priceData = await calculatePrice(areaId, quantity, engraving.colors || 1); return { engraving, priceData, loading: false, error: priceData?.success === false ? 'Erro no cálculo' : null, }; } …
  ```
- **formatCurrency(value: number)** — `src/components/pricing/simulator/utils.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', }).format(value);
  ```
- **generateSuggestions(currentEngravings: ConfiguredEngraving[], availableTechniques: ProductTechnique[], quantity: number, categoryName?: stri)** — `src/components/pricing/simulator/upsell/upsell-engine.ts`
  ```
  const suggestions: UpsellSuggestion[] = []; const positionSuggestion = suggestAddPosition(currentEngravings, availableTechniques); if (positionSuggestion) suggestions.push(positionSuggestion); suggestions.push(...suggestTechniqueUpgrades(currentEngravings, availableTechniques)); const tierSuggestion = suggestQuantityTier(quantity); if (tierSuggestion) suggestions.push(tierSuggestion); const complementarySuggestion = suggestComplementary(categoryName); if (complementarySuggestion) suggestions.pus …
  ```
- **formatPrice(price: number)** — `src/components/products/BaseProductGridCard.tsx`
  ```
  return baseCardPriceFormatter.format(price);
  ```
- **extractPriceTiersFromSource(source: SupplierSourcePricing, basePrice: number,)** — `src/components/products/InlinePriceCalculator.tsx`
  ```
  const tiers: PriceTableRow[] = []; const baseCost = source.cost_price_1 ?? source.cost_price ?? null; const markupRatio = baseCost && baseCost > 0 ? basePrice / baseCost : 1; for (let i = 1; i <= 5; i++) { const costPrice = source[`cost_price_${i}` as keyof SupplierSourcePricing] as number | null; const qty = source[`min_qty_${i}` as keyof SupplierSourcePricing] as number | null; if (costPrice !== null && costPrice > 0) { const quantity = qty !== null && qty > 0 ? qty : i === 1 ? 1 : i * 50; con …
  ```
- **formatPrice(price: number)** — `src/components/products/InlinePriceCalculator.tsx`
  ```
  inlinePriceFormatter.format(price);
  ```
- **fetchPriceTiers()** — `src/components/products/InlinePriceCalculator.tsx`
  ```
  if (!productId) { setPriceTiers([]); return; } setIsLoading(true); try { const variantFilters: Record<string, unknown> = { product_id: productId, is_active: true }; if (variantId) variantFilters.id = variantId; const variantResponse = await dbInvoke<{ id: string }>({ table: 'product_variants', operation: 'select', select: 'id', filters: variantFilters, }); const variants = variantResponse?.records ?? []; if (variants.length === 0) { setPriceTiers([]); setIsLoading(false); return; } const targetV …
  ```
- **PriceFreshnessThresholdEditor({ productId, currentEffectiveDays }: Props)** — `src/components/products/PriceFreshnessThresholdEditor.tsx`
  ```
  const { isAdmin } = useAuth(); const [open, setOpen] = useState(false); const { data: override, isLoading } = useProductFreshnessOverride(productId); const upsert = useUpsertFreshnessOverride(); const remove = useDeleteFreshnessOverride(); // Estado local controla a seleção dentro do popover. const initial: FreshnessThreshold = (override?.threshold_days as FreshnessThreshold | undefined) ?? (ALLOWED_FRESHNESS_THRESHOLDS.includes(currentEffectiveDays as FreshnessThreshold) ? (currentEffectiveDays …
  ```
- **PriceHistoryChart({ data, title = 'Histórico de Preços' }: PriceHistoryChartProps)** — `src/components/products/PriceHistoryChart.tsx`
  ```
  if (!data?.length) { return ( <Card> <CardHeader> <CardTitle className="flex items-center gap-2 text-base"> <TrendingUp className="h-4 w-4" /> {title} </CardTitle> </CardHeader> <CardContent className="py-8 text-center text-sm text-muted-foreground"> Sem histórico de preços disponível. </CardContent> </Card> ); } return ( <Card> <CardHeader> <CardTitle className="flex items-center gap-2 text-base"> <TrendingUp className="h-4 w-4 text-primary" /> {title} </CardTitle> </CardHeader> <CardContent> < …
  ```
- **formatPrice(price: number)** — `src/components/products/ProductCard.tsx`
  ```
  priceFormatter.format(price);
  ```
- **formatPrice(price: number)** — `src/components/products/ProductHoverPreview.tsx`
  ```
  priceFormatter.format(price);
  ```
- **formatPrice(price: number)** — `src/components/products/ProductListItem.tsx`
  ```
  priceFormatter.format(price);
  ```
- **formatPrice(price: number)** — `src/components/products/ProductQuickView.tsx`
  ```
  quickViewPriceFormatter.format(price);
  ```
- **PriceTiersTable({ tiers, isLoading, compact = false, formatPrice, }: PriceTiersTableProps)** — `src/components/products/inline-price/PriceTiersTable.tsx`
  ```
  if (isLoading) { return ( <div className="flex items-center justify-center py-8"> <Loader2 className={cn('animate-spin text-primary', compact ? 'h-5 w-5' : 'h-6 w-6')} /> <span className="ml-2 text-sm text-muted-foreground">Carregando preços...</span> </div> ); } if (tiers.length === 0) { return ( <div className={cn('text-center text-muted-foreground', compact ? 'py-8 text-sm' : 'py-8')}> Nenhuma tabela de preços disponível </div> ); } return ( <table className="w-full text-sm"> <thead className …
  ```
- **formatPrice(price: number)** — `src/components/products/share/MessageTemplates.ts`
  ```
  
  ```
- **generateColorMessage(product: Product, selectedColors: ProductColor[])** — `src/components/products/share/ShareAllColorsDialog.tsx`
  ```
  const colorList = selectedColors.map((c, i) => `${i + 1}. ${c.name}`).join('\n'); return `🎨 *CATÁLOGO DE CORES* 🎨 *${product.name}* SKU: ${product.sku} ${product.description || ''} 📋 *${selectedColors.length} cores selecionadas:* ${colorList} 💰 A partir de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}/un 📦 Qtd mínima: ${product.minQuantity} un ${product.stockStatus === 'in-stock' ? '✅ Pronta entrega' : '⚠️ Consultar prazo'} 👆 Cada cor acompanha f …
  ```
- **generateKitCompleteMessage(product: Product)** — `src/components/products/share/ShareKitDialog.tsx`
  ```
  const itemsList = product.kitItems ?.map((item, i) => `${i + 1}. ${item.productName} (${item.quantity} un)`) .join('\n'); return `🎁 *COMPOSIÇÃO DO KIT* 🎁 *${product.name}* SKU: ${product.sku} ${product.description || ''} 📋 *Componentes do Kit:* ${itemsList || 'Consultar itens'} 💰 Investimento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}/un 📦 Qtd mínima: ${product.minQuantity} kits ${product.stockStatus === 'in-stock' ? '✅ Pronta entrega' : '⚠️ …
  ```
- **generateItemMessage(product: Product, item: KitComponent)** — `src/components/products/share/ShareKitDialog.tsx`
  ```
  return `📦 *ITEM DO KIT* 📦 *${item.productName}* Parte do Kit: ${product.name} ${item.description || ''} ${item.material ? `🧵 Material: ${item.material}` : ''} ${item.weightG ? `⚖️ Peso: ${item.weightG}g` : ''} 💰 Kit completo a partir de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}/un 📦 Qtd mínima: ${product.minQuantity} kits Promo Brindes - Brindes com Excelência!`;
  ```
- **round2(n: number)** — `src/components/quotes/QuoteItemsTable.tsx`
  ```
  Math.round((n + Number.EPSILON) * 100) / 100;
  ```
- **formatCurrency(value: number)** — `src/components/quotes/QuoteListCellRenderer.tsx`
  ```
  
  ```
- **hasDiscountWorkflow(q: Quote)** — `src/components/quotes/QuotesStatusChips.tsx`
  ```
  
  ```
- **formatPrice(price: number)** — `src/components/replenishments/ReplenishmentCards.tsx`
  ```
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **RankBadge({ index }: { index: number })** — `src/components/search/GlobalSearchHelpers.tsx`
  ```
  if (index === 0) return ( <div className="flex h-10 w-10 shrink-0 animate-[brain-glow_3s_ease-in-out_infinite] items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary via-brand-primary/80 to-brand-primary/60 shadow-md shadow-brand-primary/15 ring-1 ring-brand-primary/10"> <Trophy className="h-4 w-4 text-primary-foreground drop-shadow-sm" /> </div> ); if (index === 1) return ( <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0 …
  ```
- **round2(n: number)** — `src/components/ui/currency-input.tsx`
  ```
  Math.round((n + Number.EPSILON) * 100) / 100;
  ```
- **validateRange(n: number)** — `src/components/ui/currency-input.tsx`
  ```
  if (!allowNegative && n < 0) return 'Valores negativos não são permitidos.'; if (n < min) return `Valor mínimo é ${formatBR(min)}.`; if (typeof max === 'number' && n > max) return `Valor máximo é ${formatBR(max)}.`; return null;
  ```
- **calcDaysSinceReplenishment(updatedAt: string)** — `src/hooks/useReplenishments.ts`
  ```
  const updated = new Date(updatedAt).getTime(); if (Number.isNaN(updated)) return REPLENISHMENT_WINDOW_DAYS; return Math.max(0, Math.floor((Date.now() - updated) / (1000 * 60 * 60 * 24)));
  ```
- **calcDaysRemaining(updatedAt: string)** — `src/hooks/useReplenishments.ts`
  ```
  const elapsed = calcDaysSinceReplenishment(updatedAt); return Math.max(0, REPLENISHMENT_WINDOW_DAYS - elapsed);
  ```
- **generateDeviceFingerprint()** — `src/hooks/admin/useDeviceDetection.ts`
  ```
  const components = [ navigator.userAgent, navigator.language, navigator.platform, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 'unknown', (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown', ]; const fingerprint = components.join('|'); // Simple hash function let hash = 0; for (let i = 0; i < fingerprint.length; i++) { const char = fingerprint.charCodeAt(i); hash = (hash << 5) - hash + char; hash &= ha …
  ```
- **computeSince(sinceParam?: string)** — `src/hooks/admin/useV4Callbacks.ts`
  ```
  if (sinceParam) return sinceParam; return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  ```
- **recencyScore(days: number | null)** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  if (days === null) return 0; if (days <= 30) return 100; if (days <= 60) return 80; if (days <= 90) return 60; if (days <= 180) return 30; return 0;
  ```
- **ratioScore(client: number, industry: number)** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  if (!industry || industry <= 0) return client > 0 ? 60 : 0; const ratio = client / industry; if (ratio >= 1.3) return 100; if (ratio >= 1.1) return 90; if (ratio >= 0.9) return 75; if (ratio >= 0.7) return 55; if (ratio >= 0.5) return 35; return 15;
  ```
- **shouldSkipPrefetch()** — `src/hooks/common/usePrefetchOnHover.ts`
  ```
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true; const conn = (navigator as NavigatorWithConnection).connection; if (!conn) return false; return !!(conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
  ```
- **mapScoreToWeights(s: ComparisonScoreWeights)** — `src/hooks/comparison/useComparisonWeights.ts`
  ```
  return { price: s.price, stock: s.stock, minQty: s.minQuantity, colors: s.colorVariety, verified: s.verifiedSupplier, leadTime: s.leadTime, };
  ```
- **formatPrice(value: number | null | undefined)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  if (value === null || value === undefined) return '-'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calculateTotalWithColorDiscount(basePrice: number, numCores: number, tabela: TabelaPrecoOficial,)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  if (!tabela.cobra_por_cor || numCores <= 1) return basePrice; let discount = 0; if (numCores === 2 && tabela.desconto_segunda_cor) discount = tabela.desconto_segunda_cor; else if (numCores === 3 && tabela.desconto_terceira_cor) discount = tabela.desconto_terceira_cor; else if (numCores >= 4 && tabela.desconto_quarta_cor_mais) discount = tabela.desconto_quarta_cor_mais; return basePrice * (1 - discount) * numCores;
  ```
- **calculateSetupCost(numCores: number, tabela: TabelaPrecoOficial)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  if (!tabela.custo_setup) return 0; return tabela.custo_setup_por_cor ? tabela.custo_setup * numCores : tabela.custo_setup;
  ```
- **findPriceTier(quantidade: number, faixas: FaixaPrecoOficial[],)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  for (const faixa of faixas) { if ( quantidade >= faixa.quantidade_minima && (faixa.quantidade_maxima === null || quantidade <= faixa.quantidade_maxima) ) { return faixa; } } return faixas.length > 0 ? faixas[faixas.length - 1] : null;
  ```
- **calculateCustomizationTotal(quantidade: number, numCores: number, tabela: TabelaPrecoOficial, faixas: FaixaPrecoOficial[], markupPercent = 115,)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  const faixa = findPriceTier(quantidade, faixas); const markupMultiplier = 1 + markupPercent / 100; if (!faixa) { return { faixa: null, custoUnitarioBase: 0, custoUnitarioTotal: 0, custoSetup: 0, custoManuseio: 0, custoTotalPecas: 0, precoUnitario: 0, precoMinimoUnitario: 0, subtotalPecas: 0, faturamentoMinimoGravacao: tabela.faturamento_minimo || 0, minimumApplied: false, total: 0, margemPercent: 0, prazoDias: null as number | null, }; } const custoUnitarioBase = faixa.preco_unitario; const cust …
  ```
- **calculateNextRun(frequency: ReportFrequency)** — `src/hooks/intelligence/useScheduledReports.ts`
  ```
  const now = new Date(); switch (frequency) { case 'daily': return new Date(now.getTime() + 24 * 60 * 60 * 1000); case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); case 'monthly': { const next = new Date(now); next.setMonth(next.getMonth() + 1); return next; } }
  ```
- **toRanked(m: Map<string, { quotes: number; orders: number }>, nameFor: (id: string)** — `src/hooks/intelligence/useZeroResultSubstitutes.ts`
  ```
  string | undefined,
  ```
- **validateKitFitsForQuote(box: KitBox | null, items: KitItem[],)** — `src/hooks/kit-builder/useKitFitsValidation.ts`
  ```
  if (!box) return { status: 'skipped' }; if (items.length === 0) return { status: 'ok' }; let usedLiters = 0; const violations: FitViolation[] = []; for (const item of items) { try { const { data, error } = await supabase.rpc('fn_check_item_fits', { p_packaging_id: box.id, p_product_id: item.id, p_current_used_liters: usedLiters, }); const row = error ? undefined : (data as FitRow[] | null)?.[0]; if (!row) continue; const qty = Math.max(1, item.quantity ?? 1); const lineVolume = (row.product_volu …
  ```
- **validateKitMinQuantityForQuote(items: KitItem[], kitQuantity: number,)** — `src/hooks/kit-builder/useKitMinQuantityValidation.ts`
  ```
  if (items.length === 0) return { status: 'ok' }; const productIds = [...new Set(items.map((item) => item.id))]; let rows: Array<{ id: string; effective_min_quantity: number | null }>; try { const { data, error } = await supabase .from('vw_products_min_quantity') .select('id, effective_min_quantity') .in('id', productIds); if (error || !data) return { status: 'unavailable' }; rows = data.filter((r): r is { id: string; effective_min_quantity: number | null } => r.id !== null); } catch { return { s …
  ```
- **priceInCents(value: number)** — `src/hooks/kit-builder/useKitPriceValidation.ts`
  ```
  if (!Number.isFinite(value) || value < 0) return null; const scaled = value * 100; const rounded = Math.round(scaled); // Accept binary floating-point noise for prices that are actually in cents, // but fail closed on fractional-cent amounts (for example, 1.005). return Number.isSafeInteger(rounded) && Math.abs(scaled - rounded) <= 1e-7 ? rounded : null;
  ```
- **validateKitPricesForQuote(box: KitBox | null, items: KitItem[],)** — `src/hooks/kit-builder/useKitPriceValidation.ts`
  ```
  const lines = [ ...(box ? [{ id: box.id, name: box.name, price: box.price }] : []), ...items.map((item) => ({ id: item.id, name: item.name, price: item.price })), ]; if (lines.length === 0) return { status: 'unavailable' }; const productIds = [...new Set(lines.map((line) => line.id))]; let rows: ProductPriceRow[]; try { const result = await dbInvoke<ProductPriceRow>({ table: 'products', operation: 'select', select: 'id,sale_price,active', filters: { id: productIds }, limit: productIds.length, co …
  ```
- **validateKitStockForQuote(items: KitItem[], box: KitBox | null, kitQuantity: number,)** — `src/hooks/kit-builder/useKitStockValidation.ts`
  ```
  const productIds = [...new Set([...(box ? [box.id] : []), ...items.map((item) => item.id)])]; if (productIds.length === 0) { return { status: 'idle' as const, alerts: [] as StockAlert[] }; } const stockData = await fetchKitStockVariants(productIds); const evaluation = evaluateKitStock(stockData, items, box, kitQuantity); const status = resolveKitStockStatus({ hasItemsToValidate: true, isLoading: false, isError: false, hasData: true, alertsCount: evaluation.alerts.length, hasUnknownStock: evaluat …
  ```
- **generateMockupApi(params: GenerateMockupParams,)** — `src/hooks/mockup/mockupGenerationService.ts`
  ```
  // BUG-400d FIX (2026-06-18): only areas that actually have a logo can be // composited — a logo-less area would be sent with an empty logo and rejected // by the edge function (422/400), surfacing as a spurious "X área(s) não // puderam ser geradas" warning. Callers may pass the full area list, so filter // defensively here (single source of truth for the contract). const areasWithLogos = params.areas.filter((a) => !!a.logoPreview); if (areasWithLogos.length === 0) { throw new Error('Faça uploa …
  ```
- **validateSvgLogo(logoDataUrl: string)** — `src/hooks/mockup/mockupGenerationService.ts`
  ```
  valid: boolean; reason?: string
  ```
- **applyNoveltyQualityFilters(query: NoveltyQuery)** — `src/hooks/products/novelty-core.ts`
  ```
  
  ```
- **applyNoveltyPredicate(query: NoveltyQuery, nowIso: string)** — `src/hooks/products/novelty-core.ts`
  ```
  
  ```
- **calcDaysRemaining(expiresAt: string | null | undefined)** — `src/hooks/products/novelty-core.ts`
  ```
  if (!expiresAt) return 0; const exp = new Date(expiresAt).getTime(); if (Number.isNaN(exp)) return 0; const ms = exp - Date.now(); if (ms <= 0) return 0; return Math.ceil(ms / MS_PER_DAY);
  ```
- **calcDaysAsNovelty(detectedAt: string | null | undefined)** — `src/hooks/products/novelty-core.ts`
  ```
  if (!detectedAt) return 0; const det = new Date(detectedAt).getTime(); if (Number.isNaN(det)) return 0; const elapsed = Math.floor((Date.now() - det) / MS_PER_DAY); return elapsed < 0 ? 0 : elapsed;
  ```
- **validateSortOption(s: string | null | undefined)** — `src/hooks/products/useCatalogState.helpers.ts`
  ```
  if (!s) return 'newest'; // BUG-SORT-09 FIX: normalizar alias → canonical antes de validar no SSOT. // BUG-SORT-12 FIX (prototype pollution): NAO usar o operador `in` aqui — ele // percorre a cadeia de prototipos, entao `?sort=toString`/`?sort=constructor` // resolviam para Object.prototype.toString / Object (uma FUNCAO), que vazava // para o state, URL sync e <Select value>. Object.hasOwn seria ideal mas e // ES2022 e o tsconfig.app usa lib ES2020; hasOwnProperty.call e ES5, sempre // tipado, e …
  ```
- **applyColorEnrichment(rawPaginatedProducts: Product[], catalogColorEnrichmentMap: Map<string, ColorEnrichmentData> | undefined, hasColorFilter)** — `src/hooks/products/useCatalogState.helpers.ts`
  ```
  if (!catalogColorEnrichmentMap || catalogColorEnrichmentMap.size === 0 || !hasColorFilterActive) return rawPaginatedProducts; return rawPaginatedProducts.map((product) => { const enrichment = catalogColorEnrichmentMap.get(product.id); if (!enrichment) return product; return { ...product, ...(enrichment.image ? { og_image_url: enrichment.image, images: [ enrichment.image, ...product.images.filter((img: string) => img !== enrichment.image), ], } : {}), stock: enrichment.stock, stockStatus: enrichm …
  ```
- **applyNoveltyQualityFilters(query: NoveltyQuery)** — `src/hooks/products/useNovelties.helpers.ts`
  ```
  
  ```
- **applyNoveltyPredicate(query: NoveltyQuery, nowIso: string)** — `src/hooks/products/useNovelties.helpers.ts`
  ```
  
  ```
- **calcDaysRemaining(expiresAt: string | null | undefined)** — `src/hooks/products/useNovelties.helpers.ts`
  ```
  if (!expiresAt) return 0; const exp = new Date(expiresAt).getTime(); if (Number.isNaN(exp)) return 0; const ms = exp - Date.now(); if (ms <= 0) return 0; return Math.ceil(ms / MS_PER_DAY);
  ```
- **calcDaysAsNovelty(detectedAt: string | null | undefined)** — `src/hooks/products/useNovelties.helpers.ts`
  ```
  if (!detectedAt) return 0; const det = new Date(detectedAt).getTime(); if (Number.isNaN(det)) return 0; const elapsed = Math.floor((Date.now() - det) / MS_PER_DAY); return elapsed < 0 ? 0 : elapsed;
  ```
- **checkIsProductNovelty(productId: string,)** — `src/hooks/products/useNovelties.helpers.ts`
  ```
  isNovelty: boolean; daysRemaining: number | null
  ```
- **calculateMatchScore(source: Product, candidate: Product, precomputedComplements?: string[],)** — `src/hooks/products/useProductMatch.ts`
  ```
  score: number; reasons: string[]; hasComplementary: boolean
  ```
- **applyCartUpdate(update: SellerCartUpdateBuilder, cartId: string)** — `src/hooks/products/useSellerCarts.ts`
  ```
  const expected = (cartsQuery.data ?? []).find((c) => c.id === cartId)?.version; if (typeof expected !== 'number') { const { error } = await update.eq('id', cartId); if (error) throw error; return; } const { data, error } = await update.eq('id', cartId).eq('version', expected).select('id'); if (error) throw error; if (!data?.length) { await queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] }); throw new CartVersionConflictError(); }
  ```
- **computeScore(input: ScoreInput)** — `src/hooks/products/useSupplierComparison.ts`
  ```
  // Preço: -50% diff = 1.0 ; +50% diff = 0.0 const priceComponent = clamp01(0.5 - input.priceDiffPercent / 100); // Estoque relativo ao maior estoque visto const stockComponent = input.highestStock > 0 ? clamp01(input.stock / input.highestStock) : 0; // Cores em comum normalizadas const colorsComponent = input.maxCommonColors > 0 ? clamp01(input.commonColors / input.maxCommonColors) : 0; // Lead time: 0 dias = 1.0, maior lead = 0.0 const leadComponent = typeof input.leadTimeDays === 'number' && i …
  ```
- **calculateColorSummary(variants: VariantWithStock[], stockEntries: StockEntry[],)** — `src/hooks/products/useVariantSupplierSources.ts`
  ```
  const colorMap = new Map<string, ColorSummary>(); // Agregar estoque atual por cor for (const v of variants) { const name = v.color_name || 'Sem cor'; const existing = colorMap.get(name); if (existing) { existing.currentStock += v.stock_quantity || 0; } else { colorMap.set(name, { name, hex: v.color_hex, thumbnail: v.selected_thumbnail, currentStock: v.stock_quantity || 0, incomingTotal: 0, incomingCount: 0, }); } } // Agregar previsões de reposição por cor for (const entry of stockEntries) { co …
  ```
- **round2(n: number | null | undefined)** — `src/hooks/quotes/quoteHelpers.ts`
  ```
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0; return Math.round((v + Number.EPSILON) * 100) / 100;
  ```
- **validateDiscount(quote: Partial<Quote>, totals: { subtotal: number; discountAmount: number },)** — `src/hooks/quotes/quoteHelpers.ts`
  ```
  if (quote.discount_percent && (quote.discount_percent < 0 || quote.discount_percent > 100)) { throw new Error('Desconto em porcentagem deve estar entre 0% e 100%'); } // BUG-008: NaN comparisons always return false, so a NaN discountAmount would // silently pass the checks below and be persisted as NaN. Guard first. if (!Number.isFinite(totals.discountAmount)) { throw new Error( `Valor de desconto inválido: ${totals.discountAmount}. Recarregue a página e tente novamente.`, ); } if (totals.discou …
  ```
- **calculateQuoteTotals(quote: Partial<Quote>, items: QuoteItem[])** — `src/hooks/quotes/quoteHelpers.ts`
  ```
  const realSubtotal = items.reduce((sum, item) => { const baseTotal = item.quantity * item.unit_price; const persTotal = (item.personalizations || []).reduce( (pSum, p) => pSum + (p.total_cost || 0), 0, ); return sum + baseTotal + persTotal; }, 0); // BUG-NAN-GUARD FIX: NaN item prices (data corruption, API response gap) cause // realSubtotal to be NaN, which then silently propagates through totals → DB. // round2() would return 0 for NaN inputs (hiding the bug), so we throw explicitly // so the …
  ```
- **applyNegotiationMarkup(items: QuoteItem[], markupPercent?: number | null,)** — `src/hooks/quotes/quoteMarkup.ts`
  ```
  const factor = negotiationMarkupFactor(markupPercent); if (factor === 1) return items; return items.map((item) => ({ ...item, unit_price: round2((item.unit_price || 0) * factor), subtotal: typeof item.subtotal === 'number' ? round2(item.subtotal * factor) : item.subtotal, personalizations: item.personalizations?.map((p) => ({ ...p, setup_cost: typeof p.setup_cost === 'number' ? round2(p.setup_cost * factor) : p.setup_cost, unit_cost: typeof p.unit_cost === 'number' ? round2(p.unit_cost * factor) …
  ```
- **syncValidityDaysFromDate(dateStr: string)** — `src/hooks/quotes/useQuoteBuilderState.helpers.ts`
  ```
  try { const daysFromNow = Math.round( (new Date(dateStr).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24), ); return VALIDITY_PRESETS.find((p) => parseInt(p, 10) === daysFromNow) ?? ''; } catch { return ''; }
  ```
- **applyLoadedQuote(quote: Quote, s: LoadedQuoteSetters)** — `src/hooks/quotes/useQuoteBuilderState.helpers.ts`
  ```
  s.setClientId(quote.client_id || ''); s.setContactId(quote.contact_id || ''); s.setValidUntil(quote.valid_until || format(addDays(new Date(), 30), 'yyyy-MM-dd')); // BUG-007 FIX: sync validityDays Select ao carregar quote existente if (quote.valid_until) { s.setValidityDays(syncValidityDaysFromDate(quote.valid_until)); } s.setNotes(quote.notes || ''); s.setQuoteNumber(quote.quote_number || ''); s.setCurrentStatus(quote.status); if (quote.client_name) { s.setContactInfo({ id: '', name: quote.clie …
  ```
- **invalidateAll()** — `src/hooks/quotes/useQuotes.ts`
  ```
  queryClient.invalidateQueries({ queryKey: ['quotes'] });
  ```
- **mapPriceResponseToFlat(resp: Record<string, unknown>)** — `src/hooks/simulation/useGravacaoPriceV2.ts`
  ```
  return adaptPriceResponse(resp);
  ```
- **calculateCustomizationPrice(params: CalculatePriceParams,)** — `src/hooks/simulation/useGravacaoPriceV2.ts`
  ```
  const result = await invokeExternalRpc<CustomizationPriceResponse>('fn_get_customization_price', { p_area_id: params.areaId, p_quantidade: params.quantidade, p_num_cores: params.numCores ?? 1, p_largura_cm: params.larguraCm ?? null, p_altura_cm: params.alturaCm ?? null, }); return adaptPriceResponse(result);
  ```
- **fetchPriceOptions()** — `src/hooks/simulation/useTechniquePricing.ts`
  ```
  setIsLoading(true); setError(null); try { /** * FIX 2026-06-01: 'customization_price_tables' does not exist in Supabase. * It was a virtual alias only valid inside postgrest.ts / rest-native.ts. * Direct supabase.from() calls must use the real table with PT column names. * * Real table: tabela_preco_gravacao_oficial * Column mapping used here: * is_active -> ativo * table_code -> codigo_tabela * table_code_option -> codigo_curto * table_fullcode -> codigo_tabela (no separate fullcode col) * cust …
  ```
- **calculateRecommendationScore(technique: Technique, keywords: string[],)** — `src/hooks/simulation/useTechniqueRecommendations.ts`
  ```
  score: number; matchedKeywords: string[]; reason: string
  ```
- **extractPriceTiers(table: CustomizationPriceTable)** — `src/hooks/simulation/useTecnicasUnificadas.ts`
  ```
  const tiers: PriceTier[] = []; for (let i = 1; i <= 15; i++) { const minQty = table[`min_qty_${i}`] as number | undefined; const price = table[`price_${i}`] as number | undefined; const sla = table[`sla_${i}`] as number | undefined; if (minQty !== undefined && minQty !== null && price !== undefined && price !== null) { const nextMinQty = table[`min_qty_${i + 1}`] as number | undefined; const maxQty = nextMinQty ? nextMinQty - 1 : null; tiers.push({ tierIndex: i, minQuantity: minQty, maxQuantity: …
  ```
- **calculatePriceForQuantityLegacy(table: CustomizationPriceTable, quantity: number,)** — `src/hooks/simulation/useTecnicasUnificadas.ts`
  ```
  const tiers = extractPriceTiers(table); if (tiers.length === 0) return null; let selectedTier = tiers[0]; for (const tier of tiers) { if (quantity >= tier.minQuantity) { selectedTier = tier; } } const unitPrice = selectedTier.unitPrice; const totalPrice = unitPrice * quantity; const setupPrice = table.setup_price || 0; const handlingPrice = table.handling_price || 0; const grandTotal = totalPrice + setupPrice + handlingPrice; const minTierPrice = tiers[0].unitPrice; const savingsPerUnit = minTie …
  ```
- **generateStockAlerts(products: ProductStockSummary[])** — `src/hooks/stock/stockAlerts.ts`
  ```
  const alerts: StockAlert[] = []; products.forEach((product) => { product.variants.forEach((variant) => { const baseAlert = { productId: product.productId, productName: product.productName, productSku: product.productSku, variantId: variant.variantId, colorName: variant.colorName, currentStock: variant.currentStock, threshold: variant.minStock, createdAt: new Date().toISOString(), }; if (variant.status === 'out_of_stock') { alerts.push({ id: `alert-${variant.id}-out`, type: 'out_of_stock', severi …
  ```
- **calcularPreco(tabela: TabelaPrecoTecnica, quantidade: number, numeroCores?: number,)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  const faixas = tabela.faixas; if (!faixas.length) { throw new Error('Tabela de preço sem faixas configuradas'); } // Binary search for faster faixa lookup on large quantity arrays let low = 0; let high = faixas.length - 1; let foundIdx = 0; while (low <= high) { const mid = (low + high) >>> 1; if (quantidade >= faixas[mid].quantidadeMinima) { foundIdx = mid; low = mid + 1; } else { high = mid - 1; } } const faixaUtilizada = faixas[foundIdx]; let precoUnitario = faixaUtilizada.precoUnitario; if ( …
  ```
- **extractPriceTiersFromTabela(tabela: TabelaPrecoTecnica)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  return tabela.faixas.map((f, idx, arr) => ({ tierIndex: f.faixa, minQuantity: f.quantidadeMinima, maxQuantity: arr[idx + 1] ? arr[idx + 1].quantidadeMinima - 1 : null, unitPrice: f.precoUnitario, slaDays: f.slaDias, }));
  ```
- **calculatePriceForQuantity(tabela: TabelaPrecoTecnica, quantity: number,)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  if (tabela.faixas.length === 0) return null; let selectedFaixa = tabela.faixas[0]; for (const faixa of tabela.faixas) { if (quantity >= faixa.quantidadeMinima) { selectedFaixa = faixa; } } const unitPrice = selectedFaixa.precoUnitario; const totalPrice = unitPrice * quantity; const grandTotal = totalPrice + tabela.precoSetup + tabela.precoManuseio; const minPrice = tabela.faixas[0].precoUnitario; const savingsPerUnit = minPrice - unitPrice; const percentageOff = minPrice > 0 ? ((minPrice - unitP …
  ```
- **usePriceSimulator(productBasePrice = 0)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  const { tabelas: _tabelas, isLoading, error, calculateAllPrices } = usePrecoCalculation(); const [quantity, setQuantity] = useState(100); const [selectedTechniqueCode, setSelectedTechniqueCode] = useState<string | null>(null); const calculations = useMemo(() => { return calculateAllPrices(quantity); }, [calculateAllPrices, quantity]); const selectedCalculation = useMemo(() => { if (!selectedTechniqueCode) return calculations[0] || null; return calculations.find((c) => c.techniqueCode === selecte …
  ```
- **validateAction(action: VoiceAgentAction)** — `src/hooks/voice/processTranscript.ts`
  ```
  if (!action?.action || !action?.response) { return { action: 'answer', response: action?.response || 'Desculpe, não entendi. Pode repetir?', data: {}, }; } return action;
  ```
- **invalidateScribeTokenCache()** — `src/hooks/voice/scribeTokenCache.ts`
  ```
  cachedToken = null; cachedAt = 0;
  ```
- **validateEnv()** — `src/integrations/supabase/client.ts`
  ```
  if (!envUrl) { log.warn('missing_env_url', { fallback: CURRENT_PROJECT_ID }); return true; } const isLocal = envUrl.includes('localhost') || envUrl.includes('127.0.0.1'); const isPlaceholder = envUrl.includes('placeholder'); if (!isLocal && !isPlaceholder && !envUrl.includes(CURRENT_PROJECT_ID)) { // Severidade: WARN (não ERROR) — o guard SSOT já neutralizou o impacto aplicando // o fallback canônico. ERROR ficava ruidoso a cada reload sempre que o Lovable // reescrevia o .env, poluindo dashboar …
  ```
- **validateSupabaseConfig()** — `src/integrations/supabase/runtime-validator.ts`
  ```
  const currentUrl = SUPABASE_URL; const isLocal = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1'); const isPlaceholder = currentUrl.includes('placeholder'); if (isLocal || isPlaceholder) return; if (!currentUrl.includes(CANONICAL_PROJECT_ID)) { const errorMsg = `CRITICAL CONFIG ERROR: Supabase URL points to an unauthorized project. Current: ${currentUrl} Expected project: ${CANONICAL_PROJECT_ID}`; console.error(errorMsg); // Em produção, queremos que o app falhe visivelmente …
  ```
- **invalidateCloudStatus()** — `src/lib/cloud-status.ts`
  ```
  cached = null;
  ```
- **shouldSilence(args: unknown[])** — `src/lib/console-filter.ts`
  ```
  try { const first = args[0]; const msg = typeof first === 'string' ? first : JSON.stringify(first); return SILENCED_PATTERNS.some((pattern) => msg?.includes(pattern)); } catch { return false; }
  ```
- **canDegradeCrmRead(operation: CrmQuery['operation'])** — `src/lib/crm-db.ts`
  ```
  return operation === 'select' || operation === 'search';
  ```
- **assertDiscountApprovalTransition(from: DiscountApprovalStatus, to: DiscountApprovalStatus,)** — `src/lib/discount-approval-status-config.ts`
  ```
  if (from !== to && !isValidDiscountApprovalTransition(from, to)) { const fromLabel = STATUS_LABEL[from] ?? from; const toLabel = STATUS_LABEL[to] ?? to; throw new Error(`Transição de status inválida: "${fromLabel}" → "${toLabel}"`); }
  ```
- **formatCurrency(value: number)** — `src/lib/format.ts`
  ```
  return BRL_FORMATTER.format(value);
  ```
- **formatCurrencyCompact(value: number)** — `src/lib/format.ts`
  ```
  return BRL_COMPACT_FORMATTER.format(value);
  ```
- **round2(n: number | null | undefined)** — `src/lib/format.ts`
  ```
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0; return Math.round((v + Number.EPSILON) * 100) / 100;
  ```
- **convertToPng(file: File)** — `src/lib/image-converter.ts`
  ```
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); // Use a reasonable max size to avoid memory issues const maxDim = 2048; let width = img.naturalWidth || img.width; let height = img.naturalHeight || img.height; // For SVGs with no intrinsic size, default to 512 if (width === 0 || height === 0) { width = 512; height = 512; } // Scale down if too large if …
  ```
- **countTotalAreas(groups: GroupedPrintArea[])** — `src/lib/print-area-grouping.ts`
  ```
  let count = 0; for (const g of groups) { for (const loc of g.locations) { count += loc.techniques.length; } } return count;
  ```
- **countTotalLocations(groups: GroupedPrintArea[])** — `src/lib/print-area-grouping.ts`
  ```
  let count = 0; for (const g of groups) { count += g.locations.length; } return count;
  ```
- **countTotalComponents(groups: GroupedPrintArea[])** — `src/lib/print-area-grouping.ts`
  ```
  return groups.length;
  ```
- **shouldLoadSentry()** — `src/lib/sentry.ts`
  ```
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined; if (!dsn) return false; if (!isValidSentryDsn(dsn)) { if (import.meta.env.DEV) { logger.warn( '[sentry] VITE_SENTRY_DSN tem formato inválido — Sentry não será inicializado. ' + 'Formato esperado: https://<public_key>@<host>/<project_id> ' + '(public_key sem hífens — UUIDs do GlitchTip não são compatíveis com SDK Sentry 8.x). ' + 'Regenere a Client Key no GlitchTip para obter uma chave alfanumérica compatível.', ); } return false; …
  ```
- **generateMockStockData(productId: string, days: number)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const data: MockChartPoint[] = []; const now = new Date(); let stock = 850 + Math.floor(seededRandom(baseSeed) * 200); for (let i = days - 1; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const dayIdx = days - 1 - i; const depleted = Math.floor(seededRandom(baseSeed + dayIdx * 3) * 25) + 3; const isRestock = seededRandom(baseSeed + dayIdx * 3 + 1) < 0.08; const restocked = isRestock ? Math.floor(seededRandom(baseSeed + dayIdx * 3 + 2) * …
  ```
- **generateMockVelocity(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  return generateMockVelocities(productId)[0];
  ```
- **generateMockVelocities(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const supplierCount = 2 + Math.floor(seededRandom(baseSeed + 300) * 3); // 2-4 suppliers const velocities: MockVelocityData[] = []; for (let i = 0; i < supplierCount; i++) { const seed = baseSeed + 100 + i * 50; // First supplier has highest velocity, others progressively less const velocityFactor = 1 - i * 0.25; const depletion7d = (8 + seededRandom(seed) * 12) * velocityFactor; const depletion30d = (6 + seededRandom(seed + 1) * 10) * velocityFactor; const …
  ```
- **generateMockSupplierNames(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const count = 2 + Math.floor(seededRandom(baseSeed + 300) * 3); const map = new Map<string, string>(); for (let i = 0; i < count; i++) { const nameIdx = Math.floor(seededRandom(baseSeed + 400 + i) * MOCK_SUPPLIER_NAMES.length) % MOCK_SUPPLIER_NAMES.length; map.set(`mock-supplier-${i}`, MOCK_SUPPLIER_NAMES[nameIdx]); } return map;
  ```
- **generateMockIntelligence(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const vels = generateMockVelocities(productId); const vel = vels[0]; // best velocity const abcRoll = seededRandom(baseSeed + 200); const abc: 'A' | 'B' | 'C' = abcRoll < 0.2 ? 'A' : abcRoll < 0.5 ? 'B' : 'C'; const totalStock = vels.reduce((sum, v) => sum + v.current_stock, 0); return { _isMock: true as const, product_id: productId, supplier_count: vels.length, total_current_stock: totalStock, total_depleted_7d: vels.reduce((sum, v) => sum + v.total_deplete …
  ```
- **safePriceChanges(velocityData: unknown)** — `src/lib/stock-chart-utils.ts`
  ```
  if (velocityData === null || typeof velocityData !== 'object') return 0; const record = velocityData as Record<string, unknown>; const val = record.price_changes_30d; if (typeof val === 'number' && Number.isFinite(val)) return val; return 0;
  ```
- **validateBug04Patch(cssVarsToApply: readonly string[])** — `src/lib/theme-presets-css-vars-patch.ts`
  ```
  return BUG_04_PATCH.tokensToAdd.every((token) => cssVarsToApply.includes(token));
  ```
- **applyGxDarkSurfaces(preset: ThemePreset)** — `src/lib/theme-presets.ts`
  ```
  const d = preset.dark; // Fundo roxo escuro #251F33 (hue 265) - paridade canônica Zapp Web d.background = '265 22% 8%'; d.card = '265 22% 12%'; d['card-elevated'] = '265 18% 17%'; d.popover = '265 22% 14%'; d.muted = '265 18% 17%'; d.input = '265 18% 17%'; d.border = '265 18% 22%'; d.secondary = '265 18% 17%'; d.accent = '265 18% 17%'; // Tokens específicos mantendo a coesão visual e legibilidade d.surface = '265 22% 10%'; d['surface-hover'] = '265 18% 17%'; d.divider = '265 18% 22%'; d['sidebar …
  ```
- **applyGxNeonGlow(preset: ThemePreset)** — `src/lib/theme-presets.ts`
  ```
  const { light, dark } = preset; light['shadow-glow-primary'] = boostGlowAlpha(light['shadow-glow-primary'], 0.45); light['shadow-glow-secondary'] = boostGlowAlpha(light['shadow-glow-secondary'], 0.4); light['shadow-glow'] = boostGlowAlpha(light['shadow-glow'], 0.45); dark['shadow-glow-primary'] = boostGlowAlpha(dark['shadow-glow-primary'], 0.7); dark['shadow-glow-secondary'] = boostGlowAlpha(dark['shadow-glow-secondary'], 0.65); dark['shadow-glow'] = boostGlowAlpha(dark['shadow-glow'], 0.7); ret …
  ```
- **applyGxGlass(preset: ThemePreset, h: number, s: number, l: number)** — `src/lib/theme-presets.ts`
  ```
  preset.light['glass-bg'] = '0 0% 100% / 0.55'; preset.light['glass-bg-strong'] = '0 0% 100% / 0.7'; preset.light['glass-bg-subtle'] = '0 0% 100% / 0.4'; preset.light['glass-border'] = `${h} ${s}% ${l}% / 0.35`; preset.light['glass-border-strong'] = `${h} ${s}% ${l}% / 0.55`; preset.dark['glass-bg'] = '265 22% 12% / 0.55'; preset.dark['glass-bg-strong'] = '265 22% 10% / 0.75'; preset.dark['glass-bg-subtle'] = '265 22% 14% / 0.4'; preset.dark['glass-border'] = `${h} ${Math.min(100, s + 5)}% ${l}% …
  ```
- **applyThemePreset(presetId: string, mode: 'auto' | 'dark' | 'light' = 'auto')** — `src/lib/theme-presets.ts`
  ```
  const actualMode = mode === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : mode; const preset = THEME_PRESETS.find((p) => p.id === presetId); if (!preset) { return; } const root = document.documentElement; // Enable smooth transition for all elements root.classList.add('theme-transitioning'); // Stamp the active preset id so components can react to specific skins // (e.g. AppLogo rainbow gradient for diversity skin). root.dataset.presetId = presetId; cons …
  ```
- **applyRadius(px: number)** — `src/lib/theme-presets.ts`
  ```
  const safe = isFinite(px) ? Math.max(0, Math.min(20, px)) : 14; document.documentElement.style.setProperty('--radius', `${safe / 16}rem`);
  ```
- **calculateTrendingScore({ recentCount, baselineCount, recentDays, baselineDays, totalVolume = 0, }: TrendingScoreInput)** — `src/lib/trending-score.ts`
  ```
  // Taxa diária para normalizar janelas de tamanhos diferentes const recentDaily = recentDays > 0 ? recentCount / recentDays : 0; const baselineDaily = baselineDays > 0 ? baselineCount / baselineDays : 0; // Produto novo: nunca apareceu no baseline if (baselineDaily === 0 && recentDaily > 0) { // Score alto, mas amortecido pelo volume mínimo const volumeWeight = Math.min(totalVolume / 5, 1); // 5+ vendas = peso cheio return { score: 2.0 + volumeWeight, growthPercent: Infinity, classification: 'ne …
  ```
- **calculateDelta(current: number, previous: number,)** — `src/lib/trending-score.ts`
  ```
  delta: number; direction: 'down' | 'neutral' | 'up'; isSignificant: boolean;
  ```
- **shouldDrop(key: string)** — `src/lib/access/dev-route-telemetry.ts`
  ```
  const now = Date.now(); const last = recent.get(key); if (last && now - last < COALESCE_MS) return true; recent.set(key, now); // GC simples if (recent.size > 64) { for (const [k, v] of recent) { if (now - v > COALESCE_MS * 4) recent.delete(k); } } return false;
  ```
- **generateSecurityHash(input: string)** — `src/lib/access/security-utils.ts`
  ```
  let hash = 0; for (let i = 0; i < input.length; i++) { const char = input.charCodeAt(i); hash = (hash << 5) - hash + char; hash &= hash; // Converte para inteiro de 32 bits } // Retorna hash curta em base36 (alfanumérico) e maiúsculas return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
  ```
- **generateSecurityId(prefix: 'AUTH' | 'REQ', path: string)** — `src/lib/access/security-utils.ts`
  ```
  return `${prefix}-${generateSecurityHash(path)}`;
  ```
- **shouldShortCircuitForSelf(scope: SalesScope, userId: string | null | undefined,)** — `src/lib/auth/apply-seller-scope.ts`
  ```
  return scope === 'self' && !userId;
  ```
- **breakerIsOpen(op: string)** — `src/lib/auth/safeAuthCall.ts`
  ```
  const s = getBreaker(op); if (s.openedAt === null) return false; if (Date.now() - s.openedAt > BREAKER_COOLDOWN_MS) { s.failures = 0; s.openedAt = null; return false; } return true;
  ```
- **revalidate(reason: string)** — `src/lib/auth/session-recovery.ts`
  ```
  if (revalidating) return; revalidating = true; try { const { data: sessionData } = await supabase.auth.getSession(); // BUG-FIX: Se detectarmos que não há sessão mas o localStorage tem resquícios, // ou se o token atual falhar na validação getUser(), forçamos recuperação. if (!sessionData?.session) { // Se houver flags de autenticação no cache mas sem sessão real, pode ser um estado zumbi return; } const { error } = await supabase.auth.getUser(); if (isBadJwtError(error)) { await recoverSession( …
  ```
- **generateBIDossierPDF(data: DossierData)** — `src/lib/bi/dossierPdfGenerator.ts`
  ```
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); const W = doc.internal.pageSize.getWidth(); const generatedAt = new Date().toLocaleString('pt-BR'); // ============ CAPA ============ doc.setFillColor(...PRIMARY); doc.rect(0, 0, W, 55, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255); doc.text('PROMO GIFTS', 14, 18); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('Inteligência Comercial · Business Analyti …
  ```
- **generateBIPptx({ clientName, ramoAtividade, health, bi, affinity, trends, seasonality, vs, categorySection, }: Args)** — `src/lib/bi/pptxGenerator.ts`
  ```
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 pptx.title = `Briefing BI — ${clientName}`; pptx.company = 'Promo Gifts'; // ====================== SLIDE 1 — CAPA / HERO ====================== const s1 = pptx.addSlide(); s1.background = { color: C.bg }; // Faixa de cor à esquerda s1.addShape('rect', { x: 0, y: 0, w: 0.5, h: 7.5, fill: { color: C.primary } }); s1.addText('BUSINESS ANALYTIC', { x: 0.8, y: 0.4, w: 8, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: C.acce …
  ```
- **shouldRetry(failureCount: number, error: unknown)** — `src/lib/db/postgrest.ts`
  ```
  if (failureCount >= 2) return false; const status = (error as { status?: number })?.status; if (typeof status === 'number' && status < 500) return false; return true;
  ```
- **applyScope(builder: WriteBuilder)** — `src/lib/db/postgrest.ts`
  ```
  let scoped = builder; if (options.id) scoped = scoped.eq('id', options.id); if (options.filters) { for (const [key, value] of Object.entries(remapFilters(table, options.filters))) { if (Array.isArray(value)) scoped = scoped.in(key, value); else if (value === null) scoped = scoped.is(key, null); else scoped = scoped.eq(key, value); } } return scoped;
  ```
- **computeBottleneckScore(s: InvokeFnSummary)** — `src/lib/edge/invokeBottlenecks.ts`
  ```
  score: number; reason: string
  ```
- **rankBottlenecks(summary: InvokeGlobalSummary, opts: { limit?: number; minTotal?: number } = {},)** — `src/lib/edge/invokeBottlenecks.ts`
  ```
  const limit = opts.limit ?? 10; const minTotal = opts.minTotal ?? 1; const rows: EndpointBottleneck[] = summary.fns .filter((s) => s.total >= minTotal || s.breakerOpen > 0) .map((s) => { const { score, reason } = computeBottleneckScore(s); return { ...s, category: categorizeFn(s.fn), score, reason }; }); rows.sort((a, b) => b.score - a.score || b.failed - a.failed); return rows.slice(0, limit);
  ```
- **generateErrorReportCSV(errors: BatchImportResult['errors'], failedRows?: Array<{ row: number; sku: string; name: string; errors: string[] }>,)** — `src/lib/external-db/batch-import.ts`
  ```
  const BOM = '\uFEFF'; const lines = ['Linha;SKU;Nome;Erro']; if (failedRows?.length) { for (const r of failedRows) { lines.push(`${r.row};${r.sku || ''};${r.name || ''};${r.errors.join(' | ')}`); } } if (errors.length) { for (const e of errors) { lines.push(`${e.startRow}-${e.endRow};;Chunk;${e.message}`); } } return BOM + lines.join('\n');
  ```
- **invalidateBridgeReadyCache()** — `src/lib/external-db/health-check.ts`
  ```
  // no-op: sem estado a limpar após aposentadoria da bridge.
  ```
- **invalidateImmutableCache(entity?: Entity)** — `src/lib/external-db/immutableCache.ts`
  ```
  if (entity) STORE[entity].clear(); else { STORE.categories.clear(); STORE.suppliers.clear(); STORE.material_types.clear(); }
  ```
- **generateUUID()** — `src/lib/external-db/kill-switch-client.ts`
  ```
  if ( typeof crypto !== 'undefined' && typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function' ) { try { return (crypto as { randomUUID: () => string }).randomUUID(); } catch { // Fallback se randomUUID falhar (ex.: contexto não-seguro em HTTP) } } // Fallback: Date.now() + entropia de Math.random() — suficiente para bucket key return ( Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) );
  ```
- **invalidateKillSwitchCache(switchName: string)** — `src/lib/external-db/kill-switch-client.ts`
  ```
  memoryCache.delete(switchName); if (typeof window !== 'undefined' && window.localStorage) { try { window.localStorage.removeItem(STORAGE_KEY_PREFIX + switchName); } catch { // ignore } }
  ```
- **computeKitCoverage(rows: ReadonlyArray<Record<string, unknown>>,)** — `src/lib/external-db/kit-coverage.ts`
  ```
  const coverage = {} as Record<KitAuditedField, FieldCoverage>; const fullyNullFields: KitAuditedField[] = []; if (rows.length === 0) { for (const field of KIT_AUDITED_FIELDS) { coverage[field] = { filled: 0, total: 0, pct: 0 }; } return { rows: 0, coverage, fullyNullFields: [], avgPct: 0 }; } let sumPct = 0; for (const field of KIT_AUDITED_FIELDS) { const filled = rows.filter((r) => isFieldFilled(r[field])).length; const pct = Math.round((filled / rows.length) * 100); coverage[field] = { filled, …
  ```
- **shouldFallbackSelect(err: unknown)** — `src/lib/external-db/product-types.ts`
  ```
  const msg = toErrorMessage(err); return /(sale_price|base_price|image_url|supplier_name|category_name|product_videos|selected_images|gender|price_updated_at|price_freshness_threshold_days|does not exist|não existe|undefined column|column .+ does not exist|could not identify an ordering operator|order by)/i.test( msg, );
  ```
- **fallbackPriceOrder(orderBy: { column: string; ascending?: boolean }, error: unknown,)** — `src/lib/external-db/products.ts`
  ```
  column: string; ascending?: boolean
  ```
- **isRestNativeEligible(options: InvokeOptions)** — `src/lib/external-db/rest-native.ts`
  ```
  if (options.operation !== 'select') return false; const resolvedTable = TABLE_ALIASES[options.table] ?? options.table; return REST_NATIVE_SAFE_TABLES.has(options.table) || REST_NATIVE_SAFE_TABLES.has(resolvedTable);
  ```
- **applyFilters(query: RestQuery, filters?: Record<string, unknown>)** — `src/lib/external-db/rest-native.ts`
  ```
  if (!filters) return query; for (const [col, val] of Object.entries(filters)) { if (val === null) { query = query.is(col, null); continue; } if (Array.isArray(val)) { query = val.length === 0 ? query.in(col, ['__no_match__']) : query.in(col, val); continue; } if (typeof val === 'object' && val !== null) { const op = (val as { op?: string }).op; const opVal = (val as { value?: unknown }).value; if (op === 'gte') query = query.gte(col, opVal); else if (op === 'lte') query = query.lte(col, opVal); …
  ```
- **isRestNativeWriteEligible(options: InvokeOptions)** — `src/lib/external-db/rest-native.ts`
  ```
  return REST_WRITE_OPS.has(options.operation) && REST_NATIVE_WRITE_TABLES.has(options.table);
  ```
- **computeFutureStockStats(entries: FutureStockEntry[])** — `src/lib/inventory/future-stock-stats.ts`
  ```
  const unique = dedupeFutureEntries(entries); let totalUnits = 0; let confirmedUnits = 0; let inTransitUnits = 0; let pendingUnits = 0; let partialUnits = 0; let completedUnits = 0; let cancelledUnits = 0; let overdueCount = 0; let nextDate: string | null = null; const productIds = new Set<string>(); for (const e of unique) { const qty = safeQty(e.expectedQuantity); totalUnits += qty; switch (e.status) { case 'confirmed': confirmedUnits += qty; break; case 'in_transit': inTransitUnits += qty; bre …
  ```
- **calcHealthScore({ productsInStock, totalProducts }: HealthScoreInput)** — `src/lib/inventory/health-score.ts`
  ```
  // Defesa contra NaN/Infinity/negativos vindos de agregações tortas. if (!Number.isFinite(productsInStock) || !Number.isFinite(totalProducts)) return 0; if (totalProducts <= 0) return 100; const safeIn = Math.max(0, productsInStock); const ratio = safeIn / totalProducts; return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  ```
- **computeRuptureRisk({ current, avgDailyDepletion, targetQty, horizonDays, }: RuptureRiskInput)** — `src/lib/inventory/rupture-risk.ts`
  ```
  // Pré-condições básicas: current precisa ser numérico finito ≥ 0. if (!Number.isFinite(current) || current < 0) { return { atRisk: false, projectedStock: null, daysToTarget: null }; } // Fallback crítico: SKU já esgotada (current === 0) é risco máximo // independentemente de média/alvo/horizonte. Sem isso, milhares de // SKUs sem estoque ficavam fora do KPI "Risco de Ruptura". if (current === 0) { return { atRisk: true, projectedStock: 0, daysToTarget: 0 }; } if (!isPositiveFinite(avgDailyDeple …
  ```
- **applyStockFilters(products: ProductStockSummary[], filters: StockFilters, alerts: StockAlert[], indexes?: StockIndexes,)** — `src/lib/inventory/stock-filter.ts`
  ```
  const ctx = buildFilterContext(filters); const idx = indexes ?? buildStockIndexes(products); // Janela do filtro "incoming" — fixa em INCOMING_WINDOW_DAYS para casar com // o card "Estoque Futuro (30d)". Calculada uma única vez por execução. const incomingNowMs = Date.now(); const incomingCutoffMs = incomingNowMs + INCOMING_WINDOW_DAYS * 86_400_000; // Construído de forma lazy — só paga o custo de Map<productId> quando o filtro está ativo. const alertProductIds = filters.showOnlyWithAlerts ? new …
  ```
- **computeWindow(matches: readonly ReplenishmentMatch[], config: Partial<ReliabilityConfig> = {},)** — `src/lib/inventory/supplier-reliability/score.ts`
  ```
  const cfg = { ...DEFAULT_RELIABILITY_CONFIG, ...config }; if (matches.length === 0) { return { score: null, matchedCount: 0, pontualityScore: null, fulfillmentScore: null, avgDelayDays: null, }; } let pSum = 0; let fSum = 0; let delaySum = 0; let delayCount = 0; for (const m of matches) { const delayPositive = Math.max(0, m.delayDays); const pontuality = Math.max(0, 1 - delayPositive / cfg.pontualityZeroAtDays); pSum += pontuality; fSum += Math.max(0, Math.min(1, m.fulfillmentRatio)); if (m.dela …
  ```
- **candidateScore(item: KitItem, keywords: string[])** — `src/lib/kit-builder/ai-composition.ts`
  ```
  const haystack = normalizeSearch( [item.name, item.sku, item.category, item.material].filter(Boolean).join(' '), ); return keywords.reduce((score, keyword) => { const words = normalizeSearch(keyword) .split(/\s+/) .filter((word) => word.length > 2); return score + words.reduce((sum, word) => sum + (haystack.includes(word) ? 3 : 0), 0); }, 0);
  ```
- **boxScore(box: KitBox, keywords: string[])** — `src/lib/kit-builder/ai-composition.ts`
  ```
  const haystack = normalizeSearch( [box.name, box.sku, box.material, box.boxType, box.color].filter(Boolean).join(' '), ); return keywords.reduce( (score, keyword) => score + (haystack.includes(normalizeSearch(keyword)) ? 4 : 0), 0, );
  ```
- **rankBoxesForItems(boxes: KitBox[], items: KitItem[])** — `src/lib/kit-builder/box-recommendations.ts`
  ```
  return boxes .map((box) => evaluateBoxForItems(box, items)) .sort((left, right) => { const statusDifference = STATUS_RANK[left.status] - STATUS_RANK[right.status]; if (statusDifference !== 0) return statusDifference; const occupancyDifference = Math.abs(left.usagePercent - 70) - Math.abs(right.usagePercent - 70); if (occupancyDifference !== 0) return occupancyDifference; return ( left.box.price - right.box.price || left.box.name.localeCompare(right.box.name, 'pt-BR') ); });
  ```
- **personalizationTotal(personalization: KitPersonalization['box'], quantity: number,)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  if (!personalization.enabled || quantity <= 0) return 0; if ( personalization.pricedQuantity === quantity && Number.isFinite(personalization.totalPrice) && (personalization.totalPrice ?? -1) >= 0 ) { return personalization.totalPrice ?? 0; } if ( Number.isFinite(personalization.estimatedPrice) && (personalization.estimatedPrice ?? -1) >= 0 ) { return (personalization.estimatedPrice ?? 0) * quantity; } return 0;
  ```
- **calculateBoxPrice(box: KitBox | null, quantity = 1)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  if (!box) return 0; return box.price * quantity;
  ```
- **calculateItemsPrice(items: KitItem[])** — `src/lib/kit-builder/price-calculator.ts`
  ```
  return items.reduce((total, item) => { return total + item.price * item.quantity; }, 0);
  ```
- **calculatePersonalizationPrice(personalization: KitPersonalization, items: KitItem[], quantity = 1,)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  let total = 0; // Personalização da caixa total += personalizationTotal(personalization.box, quantity); // Personalização dos itens items.forEach((item) => { const itemPersonalization = personalization.items[getKitItemLineId(item)] ?? personalization.items[item.id]; if (itemPersonalization) total += personalizationTotal(itemPersonalization, item.quantity * quantity); }); return total;
  ```
- **calculateTotalKitPrice(box: KitBox | null, items: KitItem[], personalization: KitPersonalization, kitQuantity = 1,)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  boxPrice: number; itemsPrice: number; personalizationPrice: number; subtotal: number; total: number; unitPrice: number;
  ```
- **calculateSavings(kitPrice: number, individualItemsPrice: number,)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  amount: number; percent: number;
  ```
- **generatePriceBreakdown(box: KitBox | null, items: KitItem[], personalization: KitPersonalization, kitQuantity = 1,)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  const breakdown: PriceBreakdownItem[] = []; // Caixa if (box) { breakdown.push({ label: `Caixa: ${box.name}`, quantity: kitQuantity, unitPrice: box.price, totalPrice: box.price * kitQuantity, }); // Personalização da caixa const boxPersonalizationTotal = personalizationTotal(personalization.box, kitQuantity); if (boxPersonalizationTotal > 0) { breakdown.push({ label: `↳ Gravação: ${personalization.box.techniqueName || 'Personalização'}`, quantity: kitQuantity, unitPrice: personalization.box.esti …
  ```
- **canFitInSpace(item: Dimensions, space: Dimensions)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  const itemSides = [item.width, item.height, item.depth].sort((a, b) => a - b); const spaceSides = [space.width, space.height, space.depth].sort((a, b) => a - b); return itemSides.every((side, index) => side <= spaceSides[index]);
  ```
- **canConstructPlacement(items: KitItem[], box: KitBox)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  const units = items .flatMap((item) => Array.from({ length: item.quantity }, () => ({ width: item.width, height: item.height, depth: item.depth, volume: item.volume, })), ) .sort((left, right) => right.volume - left.volume); const spaces: FreeSpace[] = [ { x: 0, y: 0, z: 0, width: box.internalWidth, height: box.internalHeight, depth: box.internalDepth, }, ]; for (const unit of units) { const spaceIndex = spaces.findIndex((space) => canFitInSpace(unit, space)); if (spaceIndex === -1) return false …
  ```
- **calculateVolume(width: number, height: number, depth: number)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  return width * height * depth;
  ```
- **calculateUsableVolume(box: KitBox)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  return box.internalVolume * PACKING_EFFICIENCY;
  ```
- **calculateTotalItemsVolume(items: KitItem[])** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  return items.reduce((total, item) => total + item.volume * item.quantity, 0);
  ```
- **calculateVolumeUsagePercent(itemsVolume: number, boxVolume: number)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  if (boxVolume === 0) return 0; const usableVolume = boxVolume * PACKING_EFFICIENCY; return (itemsVolume / usableVolume) * 100;
  ```
- **convert(value: string)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  const parsed = Number.parseFloat(value.replace(',', '.')); return unit === 'mm' ? parsed / 10 : parsed;
  ```
- **canNavigateTo(pathname: string, opts: { isDev: boolean; isAdmin: boolean },)** — `src/lib/navigation/restricted-routes.ts`
  ```
  if (isDevOnlyPath(pathname)) return opts.isDev; if (isAdminOnlyPath(pathname)) return opts.isAdmin || opts.isDev; return true;
  ```
- **totalsSchemeMarker(scheme: TotalsColorScheme)** — `src/lib/pdf/totalsColorScheme.ts`
  ```
  return { 'data-totals-scheme': scheme };
  ```
- **calculatePrice(table: PriceTableInput, params: PriceCalculationParams,)** — `src/lib/personalization/calculators.ts`
  ```
  const { quantity, colors, widthCm, heightCm } = params; // 1. Encontrar a faixa de preço correta const tier = findPriceTier(table.tiers, quantity); if (!tier) { throw new Error(`Nenhuma faixa de preço encontrada para quantidade ${quantity}`); } // 2. Calcular preço unitário base let unitPrice = tier.unitPrice; // 3. Ajustar por número de cores (se aplicável) if (table.priceByColor && colors && table.maxColors) { unitPrice = adjustPriceByColors(unitPrice, colors, table.maxColors); } // 4. Ajustar …
  ```
- **findPriceTier(tiers: PriceTier[], quantity: number)** — `src/lib/personalization/calculators.ts`
  ```
  if (tiers.length === 0) return null; // Ordenar por quantidade mínima const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity); // Encontrar a maior faixa que a quantidade atinge let selectedTier = sortedTiers[0]; for (const tier of sortedTiers) { if (quantity >= tier.minQuantity) { selectedTier = tier; } else { break; } } return selectedTier;
  ```
- **adjustPriceByColors(basePrice: number, requestedColors: number, tableMaxColors: number,)** — `src/lib/personalization/calculators.ts`
  ```
  if (requestedColors <= tableMaxColors) { return basePrice; } // Preço proporcional para cores extras const colorFactor = requestedColors / tableMaxColors; return basePrice * colorFactor;
  ```
- **adjustPriceByArea(basePrice: number, requestedWidth: number, requestedHeight: number, maxWidth: number | null, maxHeight: number | null,)** — `src/lib/personalization/calculators.ts`
  ```
  if (!maxWidth || !maxHeight) return basePrice; const requestedArea = requestedWidth * requestedHeight; const maxArea = maxWidth * maxHeight; if (requestedArea <= maxArea) { return basePrice; } // Preço proporcional para área extra const areaFactor = requestedArea / maxArea; return basePrice * areaFactor;
  ```
- **calculateTierSavings(tiers: PriceTier[], currentTier: PriceTier, currentUnitPrice: number, quantity: number,)** — `src/lib/personalization/calculators.ts`
  ```
  if (tiers.length === 0) return undefined; const firstTier = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)[0]; const firstTierPrice = firstTier.unitPrice; const savingsPerUnit = firstTierPrice - currentUnitPrice; if (savingsPerUnit <= 0) return undefined; const totalSavings = savingsPerUnit * quantity; const percentOff = (savingsPerUnit / firstTierPrice) * 100; return { perUnit: savingsPerUnit, total: totalSavings, percentOff: Math.round(percentOff), };
  ```
- **calculateSavings(originalUnitPrice: number, discountedUnitPrice: number, quantity: number,)** — `src/lib/personalization/calculators.ts`
  ```
  perUnit: number; total: number; percentOff: number
  ```
- **calculateMultiTechniquePrice(calculations: PriceCalculationResult[])** — `src/lib/personalization/calculators.ts`
  ```
  subtotal: number; totalSetup: number; totalHandling: number; grandTotal: number; totalSavings: number;
  ```
- **validateRpcPayload(contract: RpcContract, payload: unknown)** — `src/lib/personalization/rpc-validator.ts`
  ```
  const missing: string[] = []; const resolvedAliases: Record<string, string> = {}; for (const field of contract.requiredFields) { const found = findFieldName(payload, field, contract.aliasMap); if (!found) { missing.push(field); } else if (found !== field) { resolvedAliases[field] = found; } } // Extras: chaves top-level desconhecidas const known = knownTopLevel(contract); const extras = topLevelKeys(payload).filter((k) => !known.has(k)); const ok = missing.length === 0; // Telemetria if (!ok) { …
  ```
- **calculateTableScore(table: PriceTableInput, criteria: TableSelectionCriteria,)** — `src/lib/personalization/selectors.ts`
  ```
  let score = 0; // Base: tabela ativa if (table.isActive) score += 100; // Match por nome if (criteria.techniqueName) { const nameMatch = table.techniqueName .toLowerCase() .includes(criteria.techniqueName.toLowerCase()); if (nameMatch) score += 50; } // Match por código if (criteria.techniqueCode) { const codeMatch = table.tableCode.toLowerCase().includes(criteria.techniqueCode.toLowerCase()); if (codeMatch) score += 50; } // Match por cores if (criteria.colors && table.maxColors !== null) { if …
  ```
- **rankTablesByCriteria(tables: PriceTableInput[], criteria: TableSelectionCriteria,)** — `src/lib/personalization/selectors.ts`
  ```
  return [...tables].sort((a, b) => { const scoreA = calculateTableScore(a, criteria); const scoreB = calculateTableScore(b, criteria); return scoreB - scoreA; });
  ```
- **formatPrice(value: number, currency = 'BRL')** — `src/lib/personalization/transformers.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, }).format(value);
  ```
- **validateTableForParams(table: PriceTableInput, params: PriceCalculationParams,)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; const { quantity, colors, widthCm, heightCm } = params; // Validar quantidade if (quantity <= 0) { errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Quantidade deve ser maior que zero', }); } // Validar quantidade mínima const minQuantity = table.tiers.length > 0 ? Math.min(...table.tiers.map((t) => t.minQuantity)) : 1; if (quantity < minQuantity) { errors.push({ code: 'BELOW_MIN_QUANTITY', field: …
  ```
- **validateTechniqueForParams(technique: TechniqueInput, params: PriceCalculationParams,)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; const { colors, widthCm, heightCm } = params; // Validar status if (!technique.isActive) { errors.push({ code: 'TECHNIQUE_INACTIVE', field: 'technique', message: 'Técnica não está ativa', }); } // Validar cores if (technique.requiresColors) { if (colors === undefined || colors === null) { errors.push({ code: 'COLORS_REQUIRED', field: 'colors', message: 'Esta técnica requer especificação de cores', }); } else { if (co …
  ```
- **validateQuantityRange(quantity: number, minQuantity: number, maxQuantity?: number | null,)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; if (quantity <= 0) { errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Quantidade deve ser maior que zero', }); } if (quantity < minQuantity) { errors.push({ code: 'BELOW_MIN_QUANTITY', field: 'quantity', message: `Quantidade mínima é ${minQuantity}`, }); } if (maxQuantity && quantity > maxQuantity) { warnings.push({ code: 'EXCEEDS_MAX_QUANTITY', field: 'quantity', message: `Quantidade (${quantity} …
  ```
- **validateQuantity(quantity: number)** — `src/lib/personalization/validators.ts`
  ```
  return validateQuantityRange(quantity, 1);
  ```
- **validateColors(colors: number, maxColors?: number)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; if (colors <= 0) { errors.push({ code: 'INVALID_COLORS', field: 'colors', message: 'Número de cores deve ser maior que zero', }); } if (maxColors && colors > maxColors) { warnings.push({ code: 'EXCEEDS_MAX_COLORS', field: 'colors', message: `Número de cores (${colors}) excede máximo (${maxColors})`, }); } return { isValid: errors.length === 0, errors, warnings, };
  ```
- **validateArea(widthCm: number, heightCm: number, maxWidthCm?: number, maxHeightCm?: number,)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; if (widthCm <= 0) { errors.push({ code: 'INVALID_WIDTH', field: 'widthCm', message: 'Largura deve ser maior que zero', }); } if (heightCm <= 0) { errors.push({ code: 'INVALID_HEIGHT', field: 'heightCm', message: 'Altura deve ser maior que zero', }); } if (maxWidthCm && widthCm > maxWidthCm) { warnings.push({ code: 'EXCEEDS_MAX_WIDTH', field: 'widthCm', message: `Largura (${widthCm}cm) excede máximo (${maxWidthCm}cm)` …
  ```
- **calculateHandlingCost(baseHandling: number, positions: number, isFragile: boolean,)** — `src/lib/personalization/validators.ts`
  ```
  let cost = baseHandling; // Múltiplas posições aumenta manuseio if (positions > 1) { cost *= 1 + (positions - 1) * 0.25; // +25% por posição adicional } // Produtos frágeis dobram manuseio if (isFragile) { cost *= 2; } return Math.round(cost * 100) / 100;
  ```
- **adaptPriceResponseWithMeta(resp: Record<string, unknown> | null | undefined,)** — `src/lib/personalization/adapters/price-response.adapter.ts`
  ```
  if (!resp) { return { flat: parseFlat({}), schemaVersion: 'unknown' }; } // Validação observacional do payload bruto (apenas formatos não-nested) if (!('area' in resp)) { validateRpcPayload(PRICE_CONTRACT, resp); } const version = detectPriceSchema(resp); switch (version) { case 'v5.9-nested': return { flat: parseNested(resp as AnyRec), schemaVersion: version }; case 'v6.x-flat': return { flat: parseFlat(resp as AnyRec), schemaVersion: version }; case 'v7-new': return { flat: parseFlat(normalize …
  ```
- **adaptPriceResponse(resp: unknown)** — `src/lib/personalization/adapters/price-response.adapter.ts`
  ```
  return adaptPriceResponseWithMeta(resp as Record<string, unknown> | null | undefined).flat;
  ```
- **detectPriceSchema(resp: Record<string, unknown> | null | undefined,)** — `src/lib/personalization/adapters/schema-detection.ts`
  ```
  if (!resp || !isObject(resp)) { bumpStat('unknown'); return 'unknown'; } // v5.9-nested: campo `area` é um objeto com `id` if (isObject(resp.area) && 'id' in resp.area) { bumpStat('v5.9-nested'); return 'v5.9-nested'; } // v6.x-flat: campos em PT direto na raiz if ('preco_unitario' in resp || 'valor_gravacao' in resp || 'total_cobrado' in resp) { bumpStat('v6.x-flat'); return 'v6.x-flat'; } // v7-new (hipotético): nomes em inglês na raiz if ('unit_price' in resp && ('subtotal_pieces' in resp || …
  ```
- **calculatePricing(request: PricingRequest)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const { techniqueName, quantity, colors, widthCm, heightCm } = request; // Validações const validation = validateRequest(quantity, colors, widthCm, heightCm); if (!validation.isValid) { return { success: false, validation, error: validation.errors[0]?.message }; } // Buscar tabela adequada const table = await PriceTableRepository.findBestMatch({ techniqueName, colors, widthCm, heightCm, }); if (!table) { return { success: false, validation, error: `Nenhuma tabela encontrada para técnica: ${techn …
  ```
- **calculateBatchPricing(request: BatchPricingRequest,)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const { techniqueName, quantities, colors } = request; const table = await PriceTableRepository.findBestMatch({ techniqueName, colors, }); const calculations = quantities.map((quantity) => { if (!table) { return { quantity, result: null }; } const result = calculatePriceFromTable(table, { quantity, colors }); return { quantity, result }; }); return { techniqueName, table, calculations, };
  ```
- **calculateQuantitySavings(params: { techniqueName: string; currentQuantity: number; targetQuantity: number; colors?: number; })** — `src/lib/personalization/services/pricing.service.ts`
  ```
  currentPrice: PriceCalculationResult; targetPrice: PriceCalculationResult; savings: { perUnit: number; total: number; percentOff: number; };
  ```
- **validateRequest(quantity: number, colors?: number, widthCm?: number, heightCm?: number,)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const errors: ValidationResult['errors'] = []; const warnings: ValidationResult['warnings'] = []; // Validar quantidade const qtyValidation = validateQuantity(quantity); errors.push(...qtyValidation.errors); warnings.push(...qtyValidation.warnings); // Validar cores if (colors !== undefined) { const colorValidation = validateColors(colors); errors.push(...colorValidation.errors); warnings.push(...colorValidation.warnings); } // Validar área if (widthCm !== undefined && heightCm !== undefined) { …
  ```
- **calculatePriceFromTable(table: TabelaPrecoTecnica, params: PriceCalculationParams,)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const { quantity, colors } = params; // Encontrar faixa adequada let tierUsed = table.faixas[0]; for (const faixa of table.faixas) { if (quantity >= faixa.quantidadeMinima) { tierUsed = faixa; } else { break; } } let unitPrice = tierUsed.precoUnitario; // Ajustar por cores se aplicável if (table.precoPorCor && colors && table.maxCores) { if (colors > table.maxCores) { const fatorCor = colors / table.maxCores; unitPrice *= fatorCor; } } const subtotal = unitPrice * quantity; const grandTotal = su …
  ```
- **parseValidUntil(raw: string)** — `src/lib/quotes/expiration.ts`
  ```
  const m = DATE_ONLY_RE.exec(raw.trim()); if (m) { const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]); if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; const dt = new Date(y, mo - 1, d); if ( Number.isNaN(dt.getTime()) || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d ) { return null; } return dt; } const dt = new Date(raw); return Number.isNaN(dt.getTime()) ? null : dt;
  ```
- **buildDiscountAuditPdfPlan(ctx: DiscountAuditPdfContext)** — `src/lib/quotes/exportDiscountAuditPdf.ts`
  ```
  const header: string[] = [`Solicitação: ${ctx.requestId}`]; if (ctx.quoteNumber) header.push(`Orçamento: ${ctx.quoteNumber}`); if (ctx.clientName) header.push(`Cliente: ${ctx.clientName}`); if (ctx.sellerName) header.push(`Vendedor: ${ctx.sellerName}`); header.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`); const events = ctx.rows.map((row, idx) => ({ index: idx + 1, title: EVENT_LABEL[row.event] ?? row.event, timestamp: fmtDate(row.created_at), actor: row.actor_name || row.actor_email …
  ```
- **exportDiscountAuditPdf(ctx: DiscountAuditPdfContext)** — `src/lib/quotes/exportDiscountAuditPdf.ts`
  ```
  const plan = buildDiscountAuditPdfPlan(ctx); const { jsPDF } = await import('jspdf'); const doc = new jsPDF({ unit: 'pt', format: 'a4' }); const pageWidth = doc.internal.pageSize.getWidth(); const marginX = 40; let y = 50; doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(plan.title, marginX, y); y += 22; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90); plan.header.forEach((line) => { doc.text(line, marginX, y); y += 14; }); y += 8; doc.setDrawColor(22 …
  ```
- **validateFile(file: File, options: ValidationOptions = {},)** — `src/lib/security/file-validation.ts`
  ```
  const { maxSizeMb = 5, allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'], allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], } = options; // 1. Validação de Tamanho const maxBytes = maxSizeMb * 1024 * 1024; if (file.size > maxBytes) { return { valid: false, error: `Arquivo excede o limite de ${maxSizeMb}MB.` }; } // 2. Validação de Extensão const extension = `.${file.name.split('.').pop()?.toLowerCase()}`; if (!allowedExtensions.includes(extension)) { r …
  ```
- **validateBranding(branding: Partial<MagazineClientBranding> | null | undefined,)** — `src/lib/security/magazine-guard.ts`
  ```
  if (!branding || typeof branding !== 'object') { return { isValid: false, errors: ['Configuração de branding inválida'], sanitized: {} }; } const errors: string[] = []; const sanitized: Partial<MagazineClientBranding> = {}; // clientLogoUrl: must be https:// URL or null if (branding.clientLogoUrl !== undefined) { const safe = sanitizeUrl(branding.clientLogoUrl, { httpsOnly: true }); if (branding.clientLogoUrl && !safe) { errors.push('URL do logo deve ser https://'); sanitized.clientLogoUrl = nul …
  ```
- **validateTitle(title: string | null | undefined)** — `src/lib/security/magazine-guard.ts`
  ```
  isValid: boolean; sanitized: string; error?: string;
  ```
- **shouldShowRaw()** — `src/lib/security/safeToast.ts`
  ```
  try { return devInfraGate.shouldShow(currentRoles); } catch { return false; // fail-closed: esconde técnico em caso de erro do gate }
  ```
- **validateRLSPolicies()** — `src/lib/supabase/rls-validator.ts`
  ```
  const log = createClientLogger('rls.validator'); const errors: string[] = []; const warnings: string[] = []; const checks: RLSCheck[] = []; let isHealthy = true; try { const session = await supabase.auth.getSession(); if (!session.data.session) { log.debug('rls_check_skipped_no_session'); return { isHealthy: true, // Not authenticated yet; can't check checks: [], warnings: ['RLS validation deferred (not authenticated)'], errors: [], appliedAt: new Date(), }; } // Test each critical table for (co …
  ```
- **canAccessTable(table: string,)** — `src/lib/supabase/rls-validator.ts`
  ```
  canAccess: boolean; reason?: string
  ```
- **shouldShowDevInfraMessages(isDev: boolean)** — `src/lib/system/dev-infra-messages.ts`
  ```
  const roles: AppRole[] = isDev ? ['dev'] : []; return devInfraGate.shouldShow(roles);
  ```
- **shouldShow(userRoles: AppRole[])** — `src/lib/system/dev-gate/DevInfraGate.ts`
  ```
  if (!this.hasAccess(userRoles)) return false; const cacheKey = this.generateCacheKey(userRoles); const cachedResult = this.cache.get(cacheKey); if (cachedResult !== undefined) return cachedResult; const finalResult = this.evaluateProviders(); // Cache limitado para evitar crescimento infinito do Map se roles variarem muito (leak prevention) if (this.cache.size > 100) this.cache.clear(); this.cache.set(cacheKey, finalResult); return finalResult;
  ```
- **generateCacheKey(roles: AppRole[])** — `src/lib/system/dev-gate/DevInfraGate.ts`
  ```
  const len = roles.length; if (len === 0) return ''; if (len === 1) return roles[0]; // Otimização: Evitar sort se o array já estiver ordenado (caso comum em orquestração de roles) // Se precisarmos ordenar, fazemos uma cópia para não mutar o input let isSorted = true; for (let i = 0; i < len - 1; i++) { if (roles[i] > roles[i + 1]) { isSorted = false; break; } } return isSorted ? roles.join(',') : [...roles].sort().join(',');
  ```
- **validateRestoreEvent(event: RestoreEventName, fields: Record<string, unknown>,)** — `src/lib/telemetry/restoreEventSchema.ts`
  ```
  const violations: SchemaViolation[] = []; // 1. correlation_id — obrigatório e string não-vazia em TODOS os eventos. const cid = fields.correlation_id; if (typeof cid !== 'string' || cid.trim().length === 0) { violations.push({ field: 'correlation_id', reason: 'expected non-empty string', got: cid, }); } // 2. duration_ms — obrigatório em ok/failed/skipped; opcional em start. // Quando presente em start, ainda precisa ser válido. const dur = fields.duration_ms; const requiresDuration = event !== …
  ```
- **validateQuoteForm(data: { clientId: string; contactId: string; paymentMethod: string; paymentTerms: string; deliveryTime: string; shipping)** — `src/lib/validations/quoteSchema.ts`
  ```
  const errors: string[] = []; const result = quoteFormSchema.safeParse({ clientId: data.clientId, contactId: data.contactId, paymentMethod: data.paymentMethod, paymentTerms: data.paymentTerms, deliveryTime: data.deliveryTime, shippingType: data.shippingType, shippingCost: data.shippingCost, }); if (!result.success) { for (const issue of result.error.issues) { const field = issue.path[0] as string; const key = QUOTE_FIELD_NAMES[field] || field; if (!errors.includes(key)) errors.push(key); } } if ( …
  ```
- **round2(n: number | null | undefined)** — `src/logic/quotes/calculations.ts`
  ```
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0; return Math.round((v + Number.EPSILON) * 100) / 100;
  ```
- **calculateItemPersonalizationTotal(item: Pick<QuoteItemCalculationParams, 'personalizations'>,)** — `src/logic/quotes/calculations.ts`
  ```
  return (item.personalizations || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
  ```
- **calculateItemTotal(item: QuoteItemCalculationParams)** — `src/logic/quotes/calculations.ts`
  ```
  return round2(item.quantity * item.unitPrice + calculateItemPersonalizationTotal(item));
  ```
- **calculateSubtotal(items: QuoteItemCalculationParams[])** — `src/logic/quotes/calculations.ts`
  ```
  if (!items || !Array.isArray(items)) return 0; return round2(items.reduce((sum, item) => sum + calculateItemTotal(item), 0));
  ```
- **applyMarkup(baseValue: number, markupPercent: number)** — `src/logic/quotes/calculations.ts`
  ```
  const safeMarkup = Math.min(50, Math.max(0, markupPercent || 0)); if (safeMarkup <= 0) return round2(baseValue); return round2(baseValue * (1 + safeMarkup / 100));
  ```
- **calculateDiscountAmount(subtotal: number, discountType: 'amount' | 'percent', discountValue: number,)** — `src/logic/quotes/calculations.ts`
  ```
  const safeValue = Math.max(0, discountValue || 0); const safeSubtotal = Math.max(0, subtotal || 0); if (discountType === 'percent') { return round2(safeSubtotal * (Math.min(100, safeValue) / 100)); } return round2(Math.min(safeSubtotal, safeValue));
  ```
- **calculateRealDiscountPercent(realSubtotal: number, presentedSubtotal: number, discountAmount: number,)** — `src/logic/quotes/calculations.ts`
  ```
  if (realSubtotal <= 0) return 0; const finalBeforeShipping = Math.max(0, presentedSubtotal - discountAmount); // SSOT: Arredondamento para 2 casas decimais no percentual; Math.max(0,...) evita negativo quando markup > desconto return round2(Math.max(0, ((realSubtotal - finalBeforeShipping) / realSubtotal) * 100));
  ```
- **formatCurrency(val: number)** — `src/pages/admin/AdminAiUsagePage.tsx`
  ```
  `$${val.toFixed(4)}`;
  ```
- **computeStats(images: CfImage[])** — `src/pages/admin/AdminCloudflareImagesPage.tsx`
  ```
  const stats: CfStats = { total: images.length, verified: 0, pending: 0, syncing: 0, failed: 0, missing: 0, noStatus: 0, }; for (const img of images) { switch (img.cf_sync_status) { case 'verified': stats.verified++; break; case 'pending': stats.pending++; break; case 'uploading': case 'uploaded': stats.syncing++; break; case 'failed': stats.failed++; break; case 'missing': case 'orphaned': stats.missing++; break; default: stats.noStatus++; } } return stats;
  ```
- **isMissingPriceFreshnessThresholdColumn(error: unknown)** — `src/pages/admin/AdminProductFormPage.tsx`
  ```
  const message = error instanceof Error ? error.message : String(error); return /price_freshness_threshold_days|column products\.price_freshness_threshold_days does not exist/i.test( message, );
  ```
- **withoutPriceFreshnessThreshold(data: Record<string, unknown>)** — `src/pages/admin/AdminProductFormPage.tsx`
  ```
  const fallbackData = { ...data }; delete fallbackData[PRICE_FRESHNESS_THRESHOLD_COLUMN]; return fallbackData;
  ```
- **DiscountRequestDetailPage()** — `src/pages/admin/DiscountRequestDetailPage.tsx`
  ```
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate(); const { isAdmin, rolesLoaded } = useAuth(); const qc = useQueryClient(); const [adminNotes, setAdminNotes] = useState(''); const { data, isLoading } = useQuery({ queryKey: ['discount-approval-detail', id], queryFn: async () => { if (!id) return null; const { data: row, error } = await supabase // rls-allow: admin via has_role; RLS filtra .from('discount_approval_requests') .select( '*, quotes:quote_id(quote_number, clien …
  ```
- **PriceFreshnessSettings()** — `src/pages/admin/PriceFreshnessSettings.tsx`
  ```
  const { data: overrides, isLoading } = useAllFreshnessOverrides(); const remove = useDeleteFreshnessOverride(); const [filter, setFilter] = useState<'30' | '60' | '90' | 'all'>('all'); const { getSetting, updateSetting, isLoading: isSettingsLoading } = useSystemSettings(); const globalDefault = getSetting('default_price_freshness_threshold', '60'); const filtered = useMemo(() => { if (!overrides) return []; if (filter === 'all') return overrides; return overrides.filter((o) => String(o.threshold …
  ```
- **formatCurrency(val: number)** — `src/pages/admin/ai-usage/AiTables.tsx`
  ```
  `$${val.toFixed(4)}`;
  ```
- **formatCurrency(value: number)** — `src/pages/advanced-price-search/types.ts`
  ```
  
  ```
- **validateAndRedirect(userId: string, email: string, ipChecked = false)** — `src/pages/auth/postLoginGuards.ts`
  ```
  try { if (!ipChecked && !(await ensureIPAllowed(userId, email))) return false; // A linha success em login_attempts é escrita pelo caller após o // gate de IP passar (com prova de sessão → verified=true). Escrever // aqui gerava linha duplicada por login. setLoginStatus('success'); toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso', }); // Aguarda o feedback visual de sucesso antes de navegar setTimeout(() => { navigate(resolveRedirectTarget(), { replace: true }); }, 600); r …
  ```
- **applySubstitute(key: FilterKey, value: { id: string; name: string },)** — `src/pages/bi/CommercialIntelligencePage.tsx`
  ```
  captureUndoSnapshot(); beginPendingAction('apply_substitute', key); setFilters((prev) => { if (key === 'category') return { ...prev, categoryId: value.id, categoryName: value.name }; if (key === 'supplier') return { ...prev, supplierId: value.id, supplierName: value.name }; return { ...prev, productId: value.id, productName: value.name }; });
  ```
- **applyProductFilters(realProducts: Product[], filters: FilterState, sortBy: string, ctx: ProductFilterContext,)** — `src/pages/filters/applyProductFilters.ts`
  ```
  const { hasFuzzySearch, fuzzySearchResults, techniquesDataAvailable, hasColorFilter, colorFilteredProductIds, isLoadingColorFilter, colorFilterError, hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter, categoryFilterError, hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, materialFilterError, hasSizeFilter, sizeFilteredProductIds, isLoadingSizeFilter, sizeFilterError, hasMetadataFilter, metadataFilteredProductIds, isLoadingMetadataFilter, metadataFilterE …
  ```
- **cancelTimer()** — `src/pages/magazine/editorPersistence.ts`
  ```
  if (this.timer !== null) clearTimeout(this.timer); this.timer = null;
  ```
- **validPatch(value: unknown)** — `src/pages/magazine/editorRecovery.ts`
  ```
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false; const patch = value as Record<string, unknown>; const allowed = new Set(['branding', 'content', 'pageOrder', 'subtitle', 'templateId', 'title']); if (Object.keys(patch).some((field) => !allowed.has(field))) return false; if ('title' in patch && (typeof patch.title !== 'string' || patch.title.length > 200)) return false; if ('subtitle' in patch && (typeof patch.subtitle !== 'string' || patch.subtitle.length > 300)) ret …
  ```
- **productPrice(p: Product)** — `src/pages/magazine/components/steps/ProductsStep.tsx`
  ```
  return p.sale_price ?? p.price;
  ```
- **validateRegistry()** — `src/pages/magazine/components/templates/TemplateRegistry.ts`
  ```
  for (const [id, entry] of Object.entries(TEMPLATE_REGISTRY)) { if (!Number.isInteger(entry.productsPerPage) || entry.productsPerPage <= 0) { const msg = `[TemplateRegistry] template "${id}" tem productsPerPage inválido ` + `(${entry.productsPerPage}). Deve ser inteiro > 0. Corrija em TEMPLATE_REGISTRY.`; if (import.meta.env?.DEV) throw new Error(msg); // prod: log estruturado, mas não quebra // eslint-disable-next-line no-console -- diagnóstico crítico único console.error(msg); } if (!entry.Comp …
  ```
- **PriceTag({ value, size = 'md', variant = 'flat', }: { value: string; size?: 'lg' | 'md' | 'sm' | 'xl'; variant?: 'chip' | 'flat' )** — `src/pages/magazine/components/templates/chrome.tsx`
  ```
  const [currency, ...rest] = value.split(' '); const amount = rest.join(' ') || value; const sizeMap = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-5xl', xl: 'text-7xl' } as const; if (variant === 'chip') { return ( <span className={`inline-flex items-baseline gap-2 rounded-md px-3 py-1 font-bold text-white ${sizeMap[size]}`} style={{ background: 'var(--mag-secondary)', fontFamily: 'var(--mag-heading)' }} > <span className="text-[0.5em] opacity-80">{currency}</span> {amount} </span> ); } if (varia …
  ```
- **formatPrice(value: number | undefined)** — `src/pages/magazine/components/templates/shared.ts`
  ```
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) { return 'Sob consulta'; } return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2, });
  ```
- **itemPrice(item: MagazineItem)** — `src/pages/magazine/components/templates/shared.ts`
  ```
  return item.productSnapshot.sale_price ?? item.productSnapshot.price;
  ```
- **compute()** — `src/pages/magazine/templates-gallery/TemplatePreviewDialog.tsx`
  ```
  const el = stageRef.current; const w = el?.clientWidth || Math.min(window.innerWidth - 96, 1400); const h = el?.clientHeight || window.innerHeight - 200; const s = Math.min((w - STAGE_PADDING) / PAGE_W, (h - STAGE_PADDING) / PAGE_H); setFit(Math.max(0.1, s));
  ```
- **validateStep(step: StepId, m: Magazine)** — `src/pages/magazine/utils/stepValidation.ts`
  ```
  const blocks: string[] = []; const warnings: string[] = []; if (step === 'identity') { // FIX: null-safe title access — legacy rows may have null title const title = (m.title ?? '').trim(); if (!title) blocks.push('Defina um título para a revista.'); // FIX: optional chaining on branding — schema migration may leave branding null const logoUrl = m.branding?.clientLogoUrl; if (logoUrl && !/^https?:\/\//.test(logoUrl)) { warnings.push('URL do logo do cliente parece inválida.'); } } if (step === 'p …
  ```
- **canPublish(m: Magazine)** — `src/pages/magazine/utils/stepValidation.ts`
  ```
  // FIX: null-safe title + items — prevents crash when magazine is partially hydrated const hasTitle = (m.title ?? '').trim().length > 0; const hasProducts = (m.items ?? []).length > 0; return hasTitle && hasProducts;
  ```
- **GenerateButton({ m }: { m: MagicUpStateReturn })** — `src/pages/magic-up/MagicUpConfigPanel.tsx`
  ```
  return ( <div className="space-y-2"> {/* Toggle Modo Rápido (Nano Banana / Gemini 2.5 Flash Image) Desativado: usa Gemini 3 Pro (qualidade máxima, mais lento e caro). Ativado: usa Gemini 2.5 Flash Image ("nano-banana"), ideal para iterações e refinamentos baratos antes de gerar a versão final. */} <label className={cn( 'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors', m.fastMode ? 'border-warning/60 bg-warning/10' : 'border-border bg-muted/30 …
  ```
- **ShippingDeadlinePicker({ id = 'cart-shipping-deadline', 'data-testid': dataTestId = 'cart-shipping-deadline-input', 'aria-invalid': ariaInvalid)** — `src/pages/products/SellerCartsPage.tsx`
  ```
  const today = React.useMemo(() => startOfDay(new Date()), []); return ( <DatePickerField id={id} data-testid={dataTestId} variant="compact" className={className} aria-label="Prazo para envio" aria-invalid={ariaInvalidProp ?? (hasError || undefined)} aria-describedby={ ariaDescribedbyProp ?? (hasError ? 'cart-shipping-deadline-error' : undefined) } value={value ?? ''} onChange={(next) => onChange(next === '' ? null : next)} minDate={today} placeholder="dd/mm/aaaa" /> );
  ```
- **applyVoiceFilters(prev: FilterState, f: VoiceFilters)** — `src/pages/products/applyVoiceFilters.ts`
  ```
  const next = { ...prev }; if (f.color) next.colors = [...new Set([...prev.colors, f.color])]; if (f.category) next.categories = [...new Set([...prev.categories, f.category])]; if (f.material) next.materiais = [...new Set([...prev.materiais, f.material])]; // BUG-VOZ-PRICE FIX: apply min AND max atomically so both survive in a single command. // FIX-11: clamp to ≥0 — voice agent may produce negative values from misrecognition. // FIX-14: use Number.isFinite() — typeof NaN === 'number' would corru …
  ```
- **formatPrice(value: number)** — `src/pages/products/product-match/MatchCards.tsx`
  ```
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Sob consulta'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **formatPrice(value: number)** — `src/pages/products/product-match/ProductSearchPanel.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **formatCurrency(value: number)** — `src/pages/quotes/quote-view/QuoteActionHandlers.ts`
  ```
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **calcPersTotal(totalCost: number, _qty?: number)** — `src/pages/quotes/quote-view/QuoteActionHandlers.ts`
  ```
  return totalCost;
  ```
- **formatCurrency(value: number)** — `src/pages/quotes/quotes-dashboard/useQuotesDashboard.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **ValidationRow({ test }: { test: TestCase })** — `src/pages/tools/OptimizedImageDemo.tsx`
  ```
  const [detectedRule, setDetectedRule] = useState<string>('detecting...'); return ( <tr className="hover:bg-muted/30" data-testid={`row-${test.expected}`}> <td className="border p-2 font-medium">{test.name}</td> <td className="max-w-[200px] truncate border p-2" title={test.url}> {test.url} </td> <td className="border p-2"> <div className="flex items-center gap-2"> <OptimizedImage src={test.url} alt="test" containerClassName="hidden" onDetection={(rule) => setDetectedRule(rule)} /> <code className …
  ```
- **PriceSimulatorPage()** — `src/pages/tools/PriceSimulatorPage.tsx`
  ```
  return ( <> <PageSEO title="Simulador de Preços" description="Simule preços de brindes com personalização, quantidades e custos." path="/simulador-precos" /> <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8"> {/* Hero Header — #1 */} <div className="flex flex-col gap-1"> <h1 data-testid="page-title-simulador-precos" className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl" > S …
  ```
- **shouldSkipPrefetch()** — `src/routes/RoutePrefetcher.tsx`
  ```
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true; const conn = (navigator as NavigatorWithConnection).connection; if (!conn) return false; return !!(conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
  ```
- **ValidProductIdRoute({ children }: { children: ReactElement })** — `src/routes/guards/ValidProductIdRoute.tsx`
  ```
  const { id } = useParams<{ id: string }>(); const isValid = !!id && id !== 'undefined' && id !== 'null' && UUID_RE.test(id); if (!isValid) return <Navigate to="/produtos" replace />; return children;
  ```
- **ValidQuoteIdRoute({ children }: { children: ReactElement })** — `src/routes/guards/ValidQuoteIdRoute.tsx`
  ```
  const { id } = useParams<{ id: string }>(); const isValid = !!id && id !== 'undefined' && id !== 'null' && UUID_RE.test(id); if (!isValid) return <Navigate to="/orcamentos" replace />; return children;
  ```
- **shouldSample(eventType: TelemetryEventType)** — `src/services/telemetryService.ts`
  ```
  const rate = SAMPLE_RATE[eventType] ?? 1.0; if (rate >= 1) return true; return crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 < rate;
  ```
- **applyState(next: CompareItem[])** — `src/stores/useComparisonStore.ts`
  ```
  return { compareItems: next, compareIds: next.map((i) => i.productId), compareCount: next.length, canAddMore: next.length < MAX_COMPARE_ITEMS, };
  ```
- **calculateStockStatus(current: number, _min: number, max?: number, inTransit?: number,)** — `src/types/stock.ts`
  ```
  // NOTA: a régua histórica baseada em `min` (low_stock/critical) foi // descontinuada na UI por gerar confusão. O parâmetro é mantido por // compatibilidade de contrato. O nível "Risco de Ruptura" agora é // calculado exclusivamente pela camada preditiva (rupture-risk.ts), // que usa média de baixa real × horizonte × alvo do vendedor. if (current <= 0) { if (inTransit && inTransit > 0) return 'incoming'; return 'out_of_stock'; } if (max && current > max * 1.5) return 'overstocked'; return 'in_st …
  ```
- **calculateDaysUntilStockout(currentStock: number, avgDailySales = 2,)** — `src/types/stock.ts`
  ```
  // Guarda defensiva: NaN, Infinity, negativos e zero → indefinido. if (!Number.isFinite(currentStock) || !Number.isFinite(avgDailySales)) return undefined; if (avgDailySales <= 0 || currentStock <= 0) return undefined; return Math.floor(currentStock / avgDailySales);
  ```
- **calculateAvailableStock(currentStock: number, reservedStock = 0)** — `src/types/stock.ts`
  ```
  return Math.max(0, currentStock - reservedStock);
  ```
- **canNavigateToStep(targetStep: WizardStep, state: SimulatorWizardState)** — `src/types/domain/simulator-wizard.ts`
  ```
  const targetIndex = getStepIndex(targetStep); const currentIndex = getStepIndex(state.currentStep); // Sempre pode voltar if (targetIndex <= currentIndex) return true; // Se já tem personalizações, pode ir direto ao comparativo (resumo) if (targetStep === 'comparison' && state.personalizations.length > 0) return true; for (let i = 0; i < targetIndex; i++) { if (!isStepComplete(WIZARD_STEPS[i], state)) { return false; } } return true;
  ```
- **validateCnpj(value: string)** — `src/utils/masks.ts`
  ```
  const digits = value.replace(/\D/g, ''); if (digits.length !== 14) return false; if (/^(\d)\1{13}$/.test(digits)) return false; const calc = (slice: string, weights: number[]) => weights.reduce((sum, w, i) => sum + parseInt(slice[i]) * w, 0); const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let remainder = calc(digits, w1) % 11; const d1 = remainder < 2 ? 0 : 11 - remainder; if (parseInt(digits[12]) !== d1) return false; remainder = calc(digits …
  ```
- **calc(slice: string, weights: number[])** — `src/utils/masks.ts`
  ```
  
  ```
- **validateCpf(value: string)** — `src/utils/masks.ts`
  ```
  const digits = value.replace(/\D/g, ''); if (digits.length !== 11) return false; if (/^(\d)\1{10}$/.test(digits)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i)) * (10 - i); let d = (sum * 10) % 11; if (d === 10) d = 0; if (parseInt(digits.charAt(9)) !== d) return false; sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i)) * (11 - i); d = (sum * 10) % 11; if (d === 10) d = 0; return parseInt(digits.charAt(10)) === d;
  ```
- **validateCep(value: string)** — `src/utils/masks.ts`
  ```
  const digits = value.replace(/\D/g, ''); if (digits.length !== 8) return false; if (/^(\d)\1{7}$/.test(digits)) return false; return true;
  ```
- **validatePhoneBr(value: string)** — `src/utils/masks.ts`
  ```
  const digits = value.replace(/\D/g, ''); if (digits.length !== 10 && digits.length !== 11) return false; const ddd = parseInt(digits.slice(0, 2), 10); if (ddd < 11 || ddd > 99) return false; if (/^(\d)\1{9,10}$/.test(digits)) return false; if (digits.length === 11 && digits[2] !== '9') return false; if (digits.length === 10 && !/^[2-5]/.test(digits.slice(2))) return false; return true;
  ```
- **applyPixMask(value: string, tipo: string)** — `src/utils/pixMask.ts`
  ```
  const digits = value.replace(/\D/g, ''); switch (tipo) { case 'CPF': // 000.000.000-00 return digits .slice(0, 11) .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d{1,2})$/, '$1-$2'); case 'CNPJ': // 00.000.000/0000-00 return digits .slice(0, 14) .replace(/(\d{2})(\d)/, '$1.$2') .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d)/, '$1/$2') .replace(/(\d{4})(\d{1,2})$/, '$1-$2'); case 'Telefone': // (00) 00000-0000 or (00) 0000-0000 if (digits.length <= 10 …
  ```
- **validateCpfDigits(value: string)** — `src/utils/pixMask.ts`
  ```
  const digits = value.replace(/\D/g, ''); if (digits.length !== 11) return false; if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i); let check = 11 - (sum % 11); if (check >= 10) check = 0; if (parseInt(digits[9]) !== check) return false; sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i); check = 11 - (sum % 11); if (check >= 10) check = 0; return parseInt(digits[10]) === check;
  ```
- **validateCnpjDigits(value: string)** — `src/utils/pixMask.ts`
  ```
  const digits = value.replace(/\D/g, ''); if (digits.length !== 14) return false; if (/^(\d)\1{13}$/.test(digits)) return false; const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let sum = 0; for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i]; let check = sum % 11 < 2 ? 0 : 11 - (sum % 11); if (parseInt(digits[12]) !== check) return false; const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; sum = 0; for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i …
  ```
- **validatePixKey(chave: string, tipo: string)** — `src/utils/pixMask.ts`
  ```
  const raw = chave.replace(/\D/g, ''); switch (tipo) { case 'CPF': if (raw.length < 11) return null; // ainda digitando return validateCpfDigits(raw) ? null : 'CPF inválido (dígitos verificadores)'; case 'CNPJ': if (raw.length < 14) return null; return validateCnpjDigits(raw) ? null : 'CNPJ inválido (dígitos verificadores)'; default: return null; }
  ```
- **formatPriceDateShort(date: Date)** — `src/utils/price-freshness.ts`
  ```
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', }).format(date);
  ```
- **formatPriceDateLong(date: Date)** — `src/utils/price-freshness.ts`
  ```
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', }).format(date);
  ```
- **getPriceFreshness(priceUpdatedAt: Date | string | null | undefined, thresholdDays: number | null | undefined,)** — `src/utils/price-freshness.ts`
  ```
  const threshold = typeof thresholdDays === 'number' && thresholdDays > 0 ? Math.floor(thresholdDays) : DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS; if (!priceUpdatedAt) { return { status: 'unknown', daysSinceUpdate: null, thresholdDays: threshold, label: 'Data de atualização não informada', tooltip: 'O fornecedor não informou quando este preço foi atualizado pela última vez. Confirme o valor diretamente com o fornecedor antes de enviar o orçamento ao cliente.', shouldWarn: false, isStale: false, }; } …
  ```
- **formatCurrency(value: number | null | undefined)** — `src/utils/productPdfExport.ts`
  ```
  
  ```
- **generateProposalPDFv2(data: ProposalTemplateData, options?: { isDraft?: boolean },)** — `src/utils/proposalPdfReactGenerator.ts`
  ```
  const [jsPDF, html2canvas] = await Promise.all([getJsPDF(), getHtml2Canvas()]); const container = document.createElement('div'); container.style.position = 'fixed'; container.style.top = '-10000px'; container.style.left = '-10000px'; container.style.zIndex = '-9999'; container.style.pointerEvents = 'none'; document.body.appendChild(container); // FIX #1: declarar root fora do try para garantir unmount no finally externo let root: ReturnType<typeof ReactDOM.createRoot> | null = null; try { root = …
  ```
- **rankOf(r: AppRole | string | null,)** — `supabase/functions/_shared/authorize.ts`
  ```
  (r != null && r in ROLE_RANK ? ROLE_RANK[r as AppRole] : 0);
  ```
- **canRequest()** — `supabase/functions/_shared/circuit-breaker.ts`
  ```
  const now = Date.now(); if (this.state === "OPEN") { if (now - this.openedAt >= this.cfg.openDurationMs) { this.state = "HALF_OPEN"; // fall through to HALF_OPEN gate } else { return false; } } if (this.state === "HALF_OPEN") { if (this.probeInFlight) return false; this.probeInFlight = true; return true; } return true;
  ```
- **validateUrlFormat(url: string, type: ConnectionType)** — `supabase/functions/_shared/connection-test-runner.ts`
  ```
  if (!url || typeof url !== "string") { return "URL_MALFORMED: valor vazio"; } const trimmed = url.trim(); if (trimmed !== url) { return "URL_MALFORMED: whitespace no início/fim"; } if (type === "supabase") { // Anti-padrão #1 do POP: colaram a URL do Dashboard if (/^https:\/\/supabase\.com\/dashboard/i.test(url)) { return `URL_MALFORMED: URL do Dashboard recebida — esperado https://<project_ref>.supabase.co`; } if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/i.test(url)) { return `URL_MALFORMED: es …
  ```
- **invalidateCredentialCache(name?: string)** — `supabase/functions/_shared/credentials.ts`
  ```
  if (name) { CACHE.delete(name); METRICS.invalidations_single += 1; for (const [canonical] of Object.entries(ALIASES)) { if (canonical === name) CACHE.delete(canonical); } } else { CACHE.clear(); METRICS.invalidations_full += 1; }
  ```
- **isCustomizationPriceTablesAlias(table: string)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  return table === 'customization_price_tables' || table === 'customization_price_tiers';
  ```
- **mapPriceTableFiltersToExternal(filters: Record<string, unknown> | undefined)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  if (!filters) return undefined; const out: Record<string, unknown> = { ...filters }; if ('table_code' in out) { out.tecnica_codigo = out.table_code; delete out.table_code; } if ('table_code_option' in out) { out.table_code = out.table_code_option; delete out.table_code_option; } if ('table_fullcode' in out) { out.table_code = out.table_fullcode; delete out.table_fullcode; } if ('technique_id' in out) { delete out.technique_id; } if ('customization_type_name' in out) { out.tecnica_codigo = out.cu …
  ```
- **mapPriceTableOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  if (!orderBy) return { column: 'table_code', ascending: true }; const columnMap: Record<string, string> = { 'table_code': 'table_code', 'table_code_option': 'table_code', 'customization_type_name': 'tecnica_codigo', 'max_colors': 'max_colors', 'display_order': 'table_code', 'is_active': 'is_active', }; return { column: columnMap[orderBy.column] || 'table_code', ascending: orderBy.ascending ?? true };
  ```
- **mapPriceTableRowToLegacyShape(row: Record<string, unknown>)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  return { ...row, id: row.id, table_code: row.table_code, table_code_option: row.table_code, table_fullcode: row.table_code, customization_type_name: row.tecnica_codigo, tecnica_codigo: row.tecnica_codigo, max_colors: row.max_colors, max_area_width_cm: row.max_area_width_cm, max_area_height_cm: row.max_area_height_cm, price_by_color: row.price_by_color ?? false, price_by_area: row.price_by_area ?? false, setup_price: row.setup_price ?? 0, handling_price: 0, is_active: row.is_active ?? true, min_q …
  ```
- **applyRateLimit(req: Request, limiter: RateLimiter, getIdentifier: (req: Request)** — `supabase/functions/_shared/rate-limiter.ts`
  ```
  string = (r) => r.headers.get('x-forwarded-for') || 'anonymous'
  ```
- **validateCsrfToken(req: Request, userId?: string)** — `supabase/functions/_shared/security.ts`
  ```
  const cookies = req.headers.get('Cookie'); if (!cookies || (!cookies.includes('sb-access-token') && !cookies.includes('sb-refresh-token'))) { return; // Not cookie-based — CSRF not required (Bearer header flow) } const csrfToken = req.headers.get('X-CSRF-Token'); if (!csrfToken) { throw { status: 403, message: 'CSRF token ausente em requisição baseada em cookie' }; } const parts = csrfToken.split('.'); if (parts.length !== 2) { throw { status: 403, message: 'CSRF token malformado' }; } const [ts …
  ```
- **generateCsrfToken(userId: string)** — `supabase/functions/_shared/security.ts`
  ```
  const ts = Date.now().toString(); const secret = Deno.env.get('CSRF_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (!secret) { throw new Error('CSRF_SECRET not configured'); } const message = `${userId}:${ts}`; const hmac = await hmacSign(secret, message); return `${ts}.${hmac}`;
  ```
- **validateExternalUrl(rawUrl: string)** — `supabase/functions/_shared/url-allowlist.ts`
  ```
  if (!rawUrl || typeof rawUrl !== 'string') { return { ok: false, reason: 'URL vazia ou inválida' }; } let parsed: URL; try { parsed = new URL(rawUrl); } catch { return { ok: false, reason: 'URL malformada' }; } // Protocolo: apenas https e http if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') { return { ok: false, reason: `Protocolo não permitido: ${parsed.protocol}` }; } const host = parsed.hostname.toLowerCase(); // Bloqueio defensivo: IPs privados/loopback if (isPrivateOrReser …
  ```
- **validateRequired(body: Record<string, unknown> | null, fields: string[])** — `supabase/functions/_shared/validate.ts`
  ```
  if (!body) return 'Request body is required'; const missing = fields.filter(f => { const val = body[f]; return val === undefined || val === null || val === ''; }); if (missing.length > 0) { return `Missing required fields: ${missing.join(', ')}`; } return null;
  ```
- **validationError(message: string, headers: Record<string, string> = {})** — `supabase/functions/_shared/validate.ts`
  ```
  return new Response( JSON.stringify({ error: message }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers }, } );
  ```
- **buildValidationErrorBody(code: ErrorCode, message: string, fields: ValidationFieldError[] = [])** — `supabase/functions/_shared/zod-validate.ts`
  ```
  return { code, message, fields };
  ```
- **validationErrorResponse(body: ValidationErrorBody, corsHeaders: Record<string, string>, status = 422)** — `supabase/functions/_shared/zod-validate.ts`
  ```
  return new Response( JSON.stringify({ ...body, error: body.message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Error-Code": body.code, }, } );
  ```
- **invalidJsonResponse(opts: ResponseOptions = {})** — `supabase/functions/_shared/contracts/errors.ts`
  ```
  return buildResponse(400, { code: "invalid_json", message: "Request body is not valid JSON.", fields: [], version: opts.version, request_id: opts.requestId, }, opts);
  ```
- **validationErrorResponse(fields: FieldIssue[], opts: ResponseOptions = {},)** — `supabase/functions/_shared/contracts/errors.ts`
  ```
  return buildResponse(422, { code: "validation_failed", message: "One or more fields are invalid.", fields, version: opts.version, request_id: opts.requestId, }, opts);
  ```
- **zodValidationErrorResponse(err: z.ZodError, opts: ResponseOptions = {},)** — `supabase/functions/_shared/contracts/errors.ts`
  ```
  return validationErrorResponse(zodErrorToFieldIssues(err), opts);
  ```
- **generatePassword(opts: Required<Pick<BulkRequest, "length" | "includeUpper" | "includeLower" | "includeDigits" | "includeSymbols">>)** — `supabase/functions/bulk-random-passwords/index.ts`
  ```
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; const lower = "abcdefghijkmnopqrstuvwxyz"; const digits = "23456789"; const symbols = "!@#$%^&*-_=+?"; const sets: string[] = []; if (opts.includeUpper) sets.push(upper); if (opts.includeLower) sets.push(lower); if (opts.includeDigits) sets.push(digits); if (opts.includeSymbols) sets.push(symbols); if (sets.length === 0) throw new Error("At least one charset must be enabled"); if (opts.length < sets.length) throw new Error("Password length must be >= num …
  ```
- **countTotalIssues(audit: AuditResult)** — `supabase/functions/cors-audit/index.ts`
  ```
  return Object.values(audit.missing_in_inline).reduce((acc, list) => acc + list.length, 0) + Object.values(audit.extra_in_inline).reduce((acc, list) => acc + list.length, 0);
  ```
- **validateFilters(filters: Record<string, unknown>, table?: string)** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  if (!table) return null; const allowed = FILTERABLE_COLUMNS[table]; if (!allowed) return null; const bad = Object.keys(filters).find((k) => !allowed.has(k)); return bad ? `Coluna '${bad}' não é filtrável em '${table}'` : null;
  ```
- **applyFilters(query: any, filters: Record<string, unknown>, table?: string)** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  for (const [key, value] of Object.entries(filters)) { if (value === null) { query = query.is(key, null); } else if (typeof value === "object" && value !== null) { const f = value as Record<string, unknown>; if ("in" in f) query = query.in(key, f.in as unknown[]); // E084: escapar metacaracteres do ilike if ("ilike" in f) query = query.ilike(key, `%${escapeLikePattern(String(f.ilike))}%`); if ("eq" in f) query = query.eq(key, f.eq); if ("neq" in f) query = query.neq(key, f.neq as string); if ("gt …
  ```
- **applyOrdering(query: any, orderBy: CrmOrderBy | CrmOrderBy[])** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy]; return clauses.reduce((current, clause) => { if (typeof clause === "string") return current.order(clause); return current.order(clause.column, { ascending: clause.ascending ?? true }); }, query);
  ```
- **generateQuoteNumber(crm: SupabaseClient, data: Record<string, unknown> | Record<string, unknown>[])** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  const now = new Date(); const yearShort = String(now.getFullYear()).slice(-2); const { data: lastQuotes } = await crm .from("quotes").select("quote_number") .ilike("quote_number", `%/${yearShort}`) .order("quote_number", { ascending: false }).limit(50); let maxNum = 10000; if (lastQuotes?.length) { for (const row of lastQuotes) { const parsed = parseInt((row.quote_number || "").replace(/\s+/g, "").split("/")[0] || "0", 10); if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed; } } const genera …
  ```
- **applyOwnerScope(crm: SupabaseClient, table: string, select: string, userRole?: string, userId?: string,)** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  kind: "ok"; query: any; stripParent?: string
  ```
- **applyProductFilters(products: any[], filters: { categoryFilters: string[]; materialFilters: string[]; colorFilters: string[]; genderFilters:)** — `supabase/functions/expert-chat/index.ts`
  ```
  return products.filter((product: any) => { if (!matchesListFilter(product.materials, filters.materialFilters)) return false; if (!matchesListFilter(product.colors, filters.colorFilters)) return false; if (!matchesTextFilter(product.gender, filters.genderFilters)) return false; if (!matchesTagFilter(product.tags, ['publicoAlvo', 'publico_alvo'], filters.publicoFilters)) return false; if ( !matchesTagFilter( product.tags, ['datasComemorativas', 'datas_comemorativas'], filters.dataComemorativaFilte …
  ```
- **scoreProductRelevance(product: any, expansion: SemanticExpansion, categoryMap: Record<string, string>,)** — `supabase/functions/expert-chat/index.ts`
  ```
  let score = 0; const name = (product.name || '').toLowerCase(); const description = (product.description || '').toLowerCase(); const catName = (categoryMap[product.category_id] || '').toLowerCase(); const materials = normalizeValueList(product.materials) .map((m) => m.toLowerCase()) .join(' '); const tagsText = JSON.stringify(product.tags || {}).toLowerCase(); const allText = `${name} ${description} ${materials} ${tagsText} ${catName}`; for (const term of expansion.searchTerms) { const t = term. …
  ```
- **computeBlurhash(img: ImgRow)** — `supabase/functions/generate-blurhashes/index.ts`
  ```
  id: string; blurhash: string
  ```
- **validationError(message: string, corsHeaders: Record<string, string>, errorCode?: string,)** — `supabase/functions/generate-mockup/index.ts`
  ```
  return new Response( JSON.stringify({ error: "validation_failed", errorCode, message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }, );
  ```
- **computeLogoPx(containW: number, containH: number, logoWidthCm: unknown, logoHeightCm: unknown, productWidthCm: unknown, productHeightC)** — `supabase/functions/generate-mockup/index.ts`
  ```
  lw: number; lh: number
  ```
- **calcMetrics(quotes: { data: any[] | null }, orders: { data: any[] | null })** — `supabase/functions/market-intelligence-insights/index.ts`
  ```
  const qData = quotes.data ?? []; const oData = orders.data ?? []; const revenue = oData.reduce((s, o) => s + (Number(o.total) || 0), 0); const orderCount = oData.length; const quoteCount = qData.length; const avg_ticket = orderCount > 0 ? revenue / orderCount : 0; const conversion_rate = quoteCount > 0 ? Number(((orderCount / quoteCount) * 100).toFixed(1)) : 0; return { revenue, orders: orderCount, quotes: quoteCount, avg_ticket, conversion_rate };
  ```
- **generateKey()** — `supabase/functions/mcp-keys-issue/index.ts`
  ```
  plain: string; hash: string; prefix: string
  ```
- **generateKey()** — `supabase/functions/mcp-keys-rotate/index.ts`
  ```
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""); const plain = `mcp_${hex}`; const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain)); const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join(""); return { plain, hash, prefix: plain.slice(0, 12) };
  ```
- **calculateNextRun(frequency: string)** — `supabase/functions/process-scheduled-reports/index.ts`
  ```
  const next = new Date(); switch (frequency) { case "daily": next.setDate(next.getDate() + 1); break; case "weekly": next.setDate(next.getDate() + 7); break; case "monthly": next.setMonth(next.getMonth() + 1); break; default: next.setDate(next.getDate() + 7); } next.setHours(8, 0, 0, 0); // Always at 8am return next;
  ```
- **formatCurrency(value: number)** — `supabase/functions/process-scheduled-reports/index.ts`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **generateEmailHtml(reportName: string, data: any)** — `supabase/functions/process-scheduled-reports/index.ts`
  ```
  const summaryRows = Object.entries(data.summary || {}) .map(([key, val]) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${key.replace(/_/g, " ")}</td><td style="padding:8px;border-bottom:1px solid #eee">${val}</td></tr>`) .join(""); return ` <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"> <h2 style="color:#7c3aed">📊 ${reportName}</h2> <p style="color:#666">Período: ${data.period} | Tipo: ${data.type}</p> <table style="width:100% …
  ```
- **computeImageHash(imageBytes: Uint8Array)** — `supabase/functions/product-visual-search/index.ts`
  ```
  // Uint8Array.from creates an ArrayBuffer-backed view accepted by the Web Crypto // BufferSource type in Deno 2, even when the source view is ArrayBufferLike. const digestInput = Uint8Array.from(imageBytes); const hashBuffer = await crypto.subtle.digest('SHA-256', digestInput); return Array.from(new Uint8Array(hashBuffer)) .map(b => b.toString(16).padStart(2, '0')) .join('');
  ```
- **scanMet(a)** — `supabase/functions/secure-upload/index.ts`
  ```
  file_name: string; file_size: number | null; mime_type: string | null
  ```
- **rerankProducts(query: string, products: Array<{ id: string; name?: string; description?: string; tags?: string[]; category?: string }>,)** — `supabase/functions/semantic-search/index.ts`
  ```
  try { const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !serviceKey) return []; const client = createClient(url, serviceKey); const { data, error } = await castRpcResult<{ data: RankResult[] | null; error: { message: string } | null; }>(client.rpc("search_products_semantic", { _query: query, _products: products, _limit: limit, })); if (error) { console.warn("[rerank] RPC error:", error.message); return []; } return data ?? []; } c …
  ```
- **generateKey(query: string)** — `supabase/functions/semantic-search/index.ts`
  ```
  const normalized = query.toLowerCase().trim(); const encoder = new TextEncoder(); const data = encoder.encode(normalized); let hash = 0; for (let i = 0; i < data.length; i++) { const char = data[i]; hash = ((hash << 5) - hash) + char; hash = hash & hash; } return `search:${hash.toString(16)}`;
  ```
- **generateReportData(supabase: any, report: any)** — `supabase/functions/send-scheduled-reports/index.ts`
  ```
  const { report_type, user_id } = report; let html = `<h2>${report.report_name}</h2><p>Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>`; switch (report_type) { case "quotes": { const { data, count } = await supabase .from("quotes") .select("id, quote_number, client_name, status, total, created_at", { count: "exact" }) .eq("seller_id", user_id) .order("created_at", { ascending: false }) .limit(20); html += `<p><strong>Total de orçamentos:</strong> ${count || 0}</p>`; html += "<table border …
  ```
- **calculateNextRun(frequency: string)** — `supabase/functions/send-scheduled-reports/index.ts`
  ```
  const now = new Date(); switch (frequency) { case "daily": return new Date(now.getTime() + 24 * 60 * 60 * 1000); case "weekly": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); case "monthly": { const next = new Date(now); next.setMonth(next.getMonth() + 1); return next; } default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); }
  ```
- **validateResult(result: VoiceCommandResult)** — `supabase/functions/voice-agent/parseAiResponse.ts`
  ```
  if (!result.action || !result.response) { return { action: 'answer', response: result.response || 'Desculpe, ocorreu um erro.', data: result.data || {}, }; } return result;
  ```
- **validLength(value: string)** — `supabase/functions/webhook-inbound/index.ts`
  ```
  
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `* - Amarelo (warning): falhas dentro do esperado (<2% taxa).` | `recovery/src-legacy/src/components/admin/telemetry/PlatformFailureCards.tsx` |
| `* - Vermelho (destructive): pico de falhas (>2% taxa) ou delta crescente.` | `recovery/src-legacy/src/components/admin/telemetry/PlatformFailureCards.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `recovery/src-legacy/src/components/cart/CartHealthChecklist.tsx` |
| `const imgH = cellH * 0.55;` | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| `doc.text(formatCurrency(p.price ?? 0), x + 4, y + cellH * 0.6 + 22);` | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| `doc.text(name, x + 4, y + cellH * 0.6 + 4);` | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| `doc.text(noteLines, x + 4, y + cellH * 0.6 + 33);` | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| `doc.text(p.sku ?? "—", x + 4, y + cellH * 0.6 + 14);` | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| `if (variant) doc.text(`Cor: ${variant}`, x + 4, y + cellH * 0.6 + 28);` | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| `transition={{ delay: index * 0.05 }}` | `recovery/src-legacy/src/components/navigation/DynamicBreadcrumbs.tsx` |
| `transition={{ delay: index * 0.05 }}` | `recovery/src-legacy/src/components/search/SmartSuggestions.tsx` |
| `* useNoveltiesSelectionMode and useReplenishmentsSelectionMode were 95%` | `recovery/src-legacy/src/hooks/useEntitySelectionMode.ts` |
| `/** Margem de negociação interna 0–50%. Default 0 (desligado). */` | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| `score += popularityScore * 0.3; // 30% do peso para popularidade` | `recovery/src-legacy/src/hooks/useTechniqueRecommendations.ts` |
| `const aScore = a.count * 0.7 + aRecency * 10 * 0.3;` | `recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts` |
| `const bScore = b.count * 0.7 + bRecency * 10 * 0.3;` | `recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts` |
| `transition={{ delay: idx * 0.08, type: "spring", stiffness: 400, damping: 25 }}` | `recovery/src-legacy/src/pages/CollectionsPage.tsx` |
| `radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.04), transparent),` | `recovery/src-legacy/src/pages/KitBuilderPage.tsx` |
| `radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.08), transparent),` | `recovery/src-legacy/src/pages/KitBuilderPage.tsx` |
| `<SelectItem value="50_50">50% entrada / 50% após entrega</SelectItem>` | `recovery/src-legacy/src/pages/QuoteBuilderPage.tsx` |
| `<span>0%</span>` | `src/components/admin/DiscountManagementPanel.tsx` |
| `<span>100%</span>` | `src/components/admin/DiscountManagementPanel.tsx` |
| `transition={{ delay: idx * 0.02 }}` | `src/components/admin/DiscountManagementPanel.tsx` |
| `transition={{ delay: idx * 0.03 }}` | `src/components/admin/DiscountManagementPanel.tsx` |
| `transition={{ duration: 0.35, delay: i * 0.08, ease: 'easeOut' }}` | `src/components/admin/ProductsManager.tsx` |
| `// SELECT silently showed all sellers as 5% (the ?? default), hiding actual limits.` | `src/components/admin/SellerDiscountLimitsPanel.tsx` |
| `// P0: conexões em falha + webhooks auto-disabled + 24h <70%` | `src/components/admin/connections/HeaderSeveritySummary.tsx` |
| `A chave será exibida apenas uma vez. Geração e validação ocorrem 100% no` | `src/components/admin/connections/McpTab.tsx` |
| `const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));` | `src/components/admin/connections/useIncidentDetails.ts` |
| `* OU sucesso 24h < 70%.` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `* ou sucesso 24h entre 70% e 95%,` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `A chave será exibida apenas uma vez. Geração 100% server-side com validação de` | `src/components/admin/security/keys/McpKeysList.tsx` |
| `return values[Math.floor(values.length * 0.5)] ?? null;` | `src/components/admin/telemetry/EdgeInvokeLivePanel.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/ai/AIMockupAssistant.tsx` |
| `mas representa &lt;5% das compras do cliente — oportunidade clara.` | `src/components/bi/ClientCategoryRadar.tsx` |
| `priceFrom: Math.round(t.avgPrice * 0.9),` | `src/components/bi/ClientHealthHero.tsx` |
| `* Heurística: empresas do mesmo ramo + (LTV agregado de quotes ±30% do cliente atual)` | `src/components/bi/ClientLookalikes.tsx` |
| `// Heurística: cliente / (cliente + 1.5 × média setor) — capped 5..95%` | `src/components/bi/ClientVsIndustryComparison.tsx` |
| `* Evita a imagem gigante quando a coluna ocupa 100% da largura da página.` | `src/components/cart/SortableCartItem.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/cart/SortableCartItem.tsx` |
| `delay: idx * 0.03,` | `src/components/collections/AddToCollectionModal.tsx` |
| `transition={{ delay: index * 0.035, type: 'spring', stiffness: 380, damping: 28 }}` | `src/components/collections/CollectionGridCard.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/collections/CollectionListItem.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/collections/CollectionTableView.tsx` |
| `const imgH = cellH * 0.55;` | `src/components/collections/ExportCollectionButton.tsx` |
| `doc.text(formatCurrency(p.price ?? 0), x + 4, y + cellH * 0.6 + 22);` | `src/components/collections/ExportCollectionButton.tsx` |
| `doc.text(name, x + 4, y + cellH * 0.6 + 4);` | `src/components/collections/ExportCollectionButton.tsx` |
| `doc.text(noteLines, x + 4, y + cellH * 0.6 + 33);` | `src/components/collections/ExportCollectionButton.tsx` |
| `doc.text(p.sku ?? '—', x + 4, y + cellH * 0.6 + 14);` | `src/components/collections/ExportCollectionButton.tsx` |
| `if (v?.color_name) doc.text(`Cor: ${v.color_name}`, x + 4, y + cellH * 0.6 + 28);` | `src/components/collections/ExportCollectionButton.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/collections/ExternalCollectionCard.tsx` |
| `transition={{ delay: index * 0.05, type: 'spring', stiffness: 400, damping: 25 }}` | `src/components/collections/ExternalCollectionCard.tsx` |
| `transition={{ delay: idx * 0.03 }}` | `src/components/collections/ExternalCollectionTableView.tsx` |
| `* Mesma categoria + faixa de preço ±20% dos produtos já em comparação.` | `src/components/compare/SimilarProductsRail.tsx` |
| `const minP = avgPrice * 0.8;` | `src/components/compare/SimilarProductsRail.tsx` |
| `delay: Math.random() * 0.2,` | `src/components/effects/MiniConfetti.tsx` |
| `delay: 0.5 + i * 0.05,` | `src/components/effects/SuccessCelebration.tsx` |
| `delay: i * 0.3,` | `src/components/effects/SuccessCelebration.tsx` |
| `delay: i * 0.2,` | `src/components/expert/chat/ChatMessageList.tsx` |
| `const getBarOpacity = (i: number) => Math.max(1 - i * 0.06, 0.35);` | `src/components/intelligence/CategoryRanking.tsx` |
| `const getOpacity = (i: number) => Math.max(1 - i * 0.08, 0.4);` | `src/components/intelligence/SegmentAnalysis.tsx` |
| `const getBarOpacity = (i: number) => Math.max(1 - i * 0.07, 0.4);` | `src/components/intelligence/SupplierSales.tsx` |
| `baselineViews: Math.round(c.views * 0.58),` | `src/components/intelligence/TopCategoriesCard.tsx` |
| `recentViews: Math.round(c.views * 0.42),` | `src/components/intelligence/TopCategoriesCard.tsx` |
| `trendingScore: 2 + (MOCK_TOP_CATEGORIES.length - idx) * 0.3,` | `src/components/intelligence/TopCategoriesCard.tsx` |
| `backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,` | `src/components/intelligence/TrendsHeatmap.tsx` |
| `* semelhantes ao kit atual (overlap >=30% por SKU).` | `src/components/kit-builder/SimilarKitsWidget.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/mobile/SmartMobileNav.tsx` |
| `// A divisória fica entre 2% e 98% para o puxador não sair do quadro.` | `src/components/mockup/MockupBeforeAfter.tsx` |
| `* caber, sem nunca ampliar acima de 100%.` | `src/components/mockup/approval/MockupApprovalPreview.tsx` |
| `Resetar 100%` | `src/components/mockup/logo-editor/LogoSizeControls.tsx` |
| `* visual entre as duas variações. Valor atual reflete redução de 20%` | `src/components/pdf/ProposalStyles.ts` |
| `/** Limiar alto: se faltar ≤15%, prioridade alta */` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `/** Limiar: só sugere próxima faixa se faltar ≤30% da quantidade atual */` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `transition: { delay: i * 0.04, type: 'spring', stiffness: 500, damping: 30 },` | `src/components/products/BulkActionBar.tsx` |
| `* o sufixo poluiria a UI de >99% do catálogo que ainda não tem o campo.` | `src/components/products/PriceFreshnessBadge.tsx` |
| `transition={{ delay: idx * 0.03 }}` | `src/components/products/RecentlyViewedBar.tsx` |
| `// ao banco em ~99% e melhora muito a fluidez do scroll.` | `src/components/products/VirtualizedProductGrid.tsx` |
| `// Seção de informações (texto e preços) — paddings compactados (~20% menor)` | `src/components/products/product-card-styles.ts` |
| `{/* max-w-[44.8rem] = 70% de max-w-5xl (64rem) → redução de 30% proporcional AxL */}` | `src/components/products/gallery/GalleryVideoPlayer.tsx` |
| `transition={{ delay: spot.id * 0.2 }}` | `src/components/products/gallery/PromoFlixPlayer.tsx` |
| `* qualquer uso do componente pesado lança erro, mantendo a migração 100%.` | `src/components/providers/MotionProvider.tsx` |
| `* - 0–50% de markup` | `src/components/quotes/NegotiationMarkupCard.tsx` |
| `<span>0%</span>` | `src/components/quotes/NegotiationMarkupCard.tsx` |
| `/* v3 — Minimalista denso: card compacto ~50% menor, anel duplo,` | `src/components/quotes/PdfGenerationDialog.tsx` |
| `0%, 100% { box-shadow: 0 0 0 0 hsl(var(--warning) / 0.0), 0 0 12px 0 hsl(var(--warning) / 0.25); }` | `src/components/quotes/PdfGenerationDialog.tsx` |
| `50% { box-shadow: 0 0 0 3px hsl(var(--warning) / 0.12), 0 0 22px 2px hsl(var(--warning) / 0.45); }` | `src/components/quotes/PdfGenerationDialog.tsx` |
| `Anel estático com Check, barra 100% + 3 tracks todos concluídos,` | `src/components/quotes/PdfGenerationDialog.tsx` |
| `{/* Progress 100% + 3 micro-steps concluídos (espelha o generating) */}` | `src/components/quotes/PdfGenerationDialog.tsx` |
| `* Todos os valores refletem a escala +20% acordada com o PO.` | `src/components/quotes/ProductThumb.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/quotes/QuickQuoteFAB.tsx` |
| `- lg (≥1024px): max-w-[33.6rem] (~537px, exatamente –20% de 42rem)` | `src/components/quotes/QuoteBuilderProductSearch.tsx` |
| `- sm (≥640px): max-w-[28rem] (~448px, –22% vs 36rem original do sm)` | `src/components/quotes/QuoteBuilderProductSearch.tsx` |
| `Larguras responsivas — redução de ~20% vs. o `max-w-2xl` original (42rem).` | `src/components/quotes/QuoteBuilderProductSearch.tsx` |
| `— ex.: 5 = 5%.` | `src/components/quotes/QuoteBuilderSummaryPricing.tsx` |
| `transition={{ duration: 0.15, delay: 0.2 + i * 0.04 }}` | `src/components/search/GlobalSearchIdleState.tsx` |
| `transition={{ duration: 0.15, delay: 0.28 + i * 0.03 }}` | `src/components/search/GlobalSearchIdleState.tsx` |
| `const lineAlpha = (1 - dist / CONNECTION_DIST) * Math.min(alphas[i], alphas[j]) * 0.6;` | `src/components/search/voice/FloatingParticles.tsx` |
| `const speed = (Math.random() * 0.5 + 0.5) * cfg.speed;` | `src/components/search/voice/FloatingParticles.tsx` |
| `ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);` | `src/components/search/voice/FloatingParticles.tsx` |
| `p.vx += (Math.random() - 0.5) * 0.02;` | `src/components/search/voice/FloatingParticles.tsx` |
| `p.vy += (Math.random() - 0.5) * 0.02;` | `src/components/search/voice/FloatingParticles.tsx` |
| `? 0.55 + barOffsets[i] * 0.5 // Speaking: slower, wave-like` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `const waveOffset = Math.sin(angle * (3 + w) + w * 1.5) * amplitude * (1 + w * 0.25);` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `delay: i * 0.12,` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `delay: isSpeaking ? i * 0.08 : i * 0.05, // Speaking: staggered wave effect` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `dist: radius * 0.4 + rand() * radius * 0.65,` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `duration: 1.2 + (i % 4) * 0.3,` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `return Array.from({ length: barCount }).map(() => rand() * 0.25);` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `transition={{ duration: 2.5 + w * 0.6, repeat: Infinity, ease: 'easeInOut' }}` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `transition={{ duration: 0.2, delay: i * 0.03 }}` | `src/components/settings/theme/PresetCard.tsx` |
| `const reserved = Math.floor(baseStock * 0.1);` | `src/components/simulator/StockAlert.tsx` |
| `transition={{ delay: idx * 0.08 }}` | `src/components/simulator/wizard/StepComparison.tsx` |
| `transition={{ delay: idx * 0.04 }}` | `src/components/simulator/wizard/StepLocation.tsx` |
| `* they cover >=90% of the viewport, have a transparent background, and contain` | `src/components/system/RootInteractivityGuard.tsx` |
| `[w * 0.25, h * 0.35],` | `src/components/system/RootInteractivityGuard.tsx` |
| `[w * 0.75, h * 0.65],` | `src/components/system/RootInteractivityGuard.tsx` |
| `const COVERAGE = 0.9; // element must span >=90% of the viewport in both axes` | `src/components/system/RootInteractivityGuard.tsx` |
| `* A match por identidade de objeto (match === t) é O(1) e 100% confiável —` | `src/components/ui/alert-dialog.tsx` |
| `// (match por identidade de objeto, 100% robusto, independe de displayName).` | `src/components/ui/alert-dialog.tsx` |
| `const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);` | `src/hooks/auth/useAuthHydrationMetrics.ts` |
| `priceFrom: Math.round(Number(p.avg_unit_price) * 0.85) \|\| 0,` | `src/hooks/bi/useClientAffinity.ts` |
| `const recentBias = 0.55 + ((i % 3) - 1) * 0.12; // 0.43, 0.55, 0.67` | `src/hooks/bi/useClientCategoryAffinity.ts` |
| `* - Crescimento trim. 15% (compara últimos 3m vs 3m anteriores via sazonalidade)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Frequência 25% (vs média do setor)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Recência 30% (≤30d=100, ≤60d=80, ≤90d=60, ≤180d=30, >180d=0)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Share-of-wallet 10% (estimativa)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Ticket vs setor 20%` | `src/hooks/bi/useClientHealthScore.ts` |
| `const growthScore = Math.max(0, Math.min(100, 50 + growthPct)); // -50%→0, 0%→50, +50%→100` | `src/hooks/bi/useClientHealthScore.ts` |
| `recScore * 0.3 + freqScore * 0.25 + ticketScore * 0.2 + growthScore * 0.15 + shareScore * 0.1,` | `src/hooks/bi/useClientHealthScore.ts` |
| `const THRESHOLD = 15; // ±15% = "na média"` | `src/hooks/bi/useClientVsIndustry.ts` |
| `* useNoveltiesSelectionMode and useReplenishmentsSelectionMode were 95%` | `src/hooks/common/useEntitySelectionMode.ts` |
| `* Com 200+ cards, usar um observer compartilhado reduz overhead em ~60%.` | `src/hooks/common/useIntersectionObserver.ts` |
| `const aScore = a.count * 0.7 + aRecency * 10 * 0.3;` | `src/hooks/intelligence/useVoiceCommandHistory.ts` |
| `const bScore = b.count * 0.7 + bRecency * 10 * 0.3;` | `src/hooks/intelligence/useVoiceCommandHistory.ts` |
| `* templates de kit curados: 0% de cobertura no catálogo ativo (ver` | `src/hooks/kit-builder/useKitBuilderQueries.ts` |
| `// A implementação anterior usava `created_at + 30d`, o que: (1) ocultava ~16%` | `src/hooks/products/novelty-core.ts` |
| `// A implementação anterior usava `created_at + 30d`, o que: (1) ocultava ~16%` | `src/hooks/products/useNovelties.helpers.ts` |
| `// Hierarquia P1→P4, 7.153 produtos, 16.631 swatches, 97,4% CF CDN.` | `src/hooks/products/useProductsLightweight.ts` |
| `// Preço: -50% diff = 1.0 ; +50% diff = 0.0` | `src/hooks/products/useSupplierComparison.ts` |
| `// values above 50% without any feedback to the user. Now throws explicitly` | `src/hooks/quotes/quoteHelpers.ts` |
| `/** Margem de negociação interna 0–50% (default 0). Infla o subtotal apresentado para criar margem psicológica de desconto. NUNCA exposto ao cliente. */` | `src/hooks/quotes/quoteTypes.ts` |
| `score += popularityScore * 0.3; // 30% do peso para popularidade` | `src/hooks/simulation/useTechniqueRecommendations.ts` |
| `* Esta shim preserva 100% da API antiga e redireciona para `sonner.toast`,` | `src/hooks/ui/use-toast.ts` |
| `// Remover validateEnv() ou CURRENT_PROJECT_ID derruba 100% dos builds da main no Vercel.` | `src/integrations/supabase/client.ts` |
| `* - 16.631 swatches, 97,4% com CF CDN (imagedelivery.net)` | `src/lib/feature-flags.ts` |
| `* - 7.153 produtos com color_swatches preenchidos (100% de cobertura)` | `src/lib/feature-flags.ts` |
| `// 7.153 produtos / 16.631 swatches / 97,4% CF CDN / triggers ativos` | `src/lib/feature-flags.ts` |
| `* Projeta `forecastDays` à frente. Usa intervalo de confiança ~95% (1.96 * residualStd).` | `src/lib/forecast.ts` |
| `const physW = prodW \|\| (prodH ? prodH * 0.4 : maxW ? maxW * 2 : 8);` | `src/lib/mockup-geometry.ts` |
| `// Onda 5: aprovado por Joaquim — replay 100% quando dá erro` | `src/lib/sentry.ts` |
| `(200 + seededRandom(seed + 2) * 400) * (1 + seededRandom(seed + 3) * 0.5),` | `src/lib/stock-chart-utils.ts` |
| `avg_daily_depletion_90d: Math.round(depletion30d * 0.9 * 10) / 10,` | `src/lib/stock-chart-utils.ts` |
| `const velocityFactor = 1 - i * 0.25;` | `src/lib/stock-chart-utils.ts` |
| `costPriceClose: 4.5 + seededRandom(baseSeed + dayIdx * 5) * 0.3,` | `src/lib/stock-chart-utils.ts` |
| `total_depleted_90d: Math.round(depletion30d * 90 * 0.9),` | `src/lib/stock-chart-utils.ts` |
| `velocity_trend: 0.7 + seededRandom(seed + 4) * 0.8,` | `src/lib/stock-chart-utils.ts` |
| `* travados no valor padrão (217 91% 60% = azul).` | `src/lib/theme-presets-css-vars-patch.ts` |
| `// ±25% jitter` | `src/lib/auth/safeAuthCall.ts` |
| `return Math.round(base * (0.75 + Math.random() * 0.5));` | `src/lib/auth/safeAuthCall.ts` |
| `y: 2.1 + i * 0.85,` | `src/lib/bi/pptxGenerator.ts` |
| `y: 2.2 + i * 0.85,` | `src/lib/bi/pptxGenerator.ts` |
| `y: 2.25 + i * 0.85,` | `src/lib/bi/pptxGenerator.ts` |
| `y: 2.3 + i * 0.85,` | `src/lib/bi/pptxGenerator.ts` |
| `y: 2.5 + i * 0.85,` | `src/lib/bi/pptxGenerator.ts` |
| `* Puro / síncrono / sem I/O — 100% testável.` | `src/lib/edge/invokeBottlenecks.ts` |
| `* errorPenalty = errorRatio * 100 → 1 ponto por 1% de erro` | `src/lib/edge/invokeBottlenecks.ts` |
| `* Kill-switch: enabled=false, rollout=100 → 100% REST native.` | `src/lib/external-db/bridge.ts` |
| `// Se shouldApply não foi calculado (cache antigo pré-rollout), assume 100% (= aplica)` | `src/lib/external-db/kill-switch-client.ts` |
| `// invisíveis na PDP. Max real observado no catálogo = 100. Margem 20% = 120.` | `src/lib/external-db/products-detail.ts` |
| `// 7.153 produtos / 16.631 swatches / 97,4% CF CDN. Consumido por ColorSwatchPicker.` | `src/lib/external-db/products-lightweight.ts` |
| `* - baixo: min * 0.25 < current ≤ min` | `src/lib/inventory/health-score.ts` |
| `* - crítico: current ≤ min * 0.25` | `src/lib/inventory/health-score.ts` |
| `* o hit ratio é ~100%, eliminando .toLowerCase()+NFD+replace+trim redundantes).` | `src/lib/inventory/stock-filter.ts` |
| `* - fulfillment > 100% → cap em 100% (não premia excesso)` | `src/lib/inventory/supplier-reliability/score.ts` |
| `// Fator de folga para empacotamento (itens não ocupam 100% do volume)` | `src/lib/kit-builder/volume-calculator.ts` |
| `const PACKING_EFFICIENCY = 0.75; // 75% de eficiência` | `src/lib/kit-builder/volume-calculator.ts` |
| `const VOLUME_WARNING_THRESHOLD = 0.85; // 85%` | `src/lib/kit-builder/volume-calculator.ts` |
| `cost *= 1 + (positions - 1) * 0.25; // +25% por posição adicional` | `src/lib/personalization/validators.ts` |
| `realDiscountPercent > maxDiscountPercent * 0.7 &&` | `src/lib/quotes/discount-validation-messages.ts` |
| `* Sample rate: 10% (configurável via VITE_NAV_METRICS_SAMPLE_RATE).` | `src/lib/telemetry/navigationMetrics.ts` |
| `Item <strong>hover</strong>: fundo accent ~70% + texto mais forte (sem brilho).` | `src/pages/SidebarQAPage.tsx` |
| `// Evita PGRST204/23502/23514 que tornavam o formulário 100% inoperante.` | `src/pages/admin/AdminProductFormPage.tsx` |
| `custom={2.5 + i * 0.05}` | `src/pages/admin/AdminTemasPage.tsx` |
| `custom={3 + i * 0.05}` | `src/pages/admin/AdminTemasPage.tsx` |
| `transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },` | `src/pages/admin/AdminTemasPage.tsx` |
| `* - Mínimo de chamadas na janela (`minSamples`) evita disparos com 1/2 = 50%.` | `src/pages/admin/telemetry/usePlatformFailureAlert.ts` |
| `* - Threshold por tipo (default: 5% para 503, 10% para cold-start) configurável` | `src/pages/admin/telemetry/usePlatformFailureAlert.ts` |
| `/** Variação percentual da média atual vs baseline. Ex: 0.32 = +32%. */` | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| `const REGRESSION_RATIO = 1.5; // 50% mais lento que o baseline = regressão` | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| `* - 'regression' → piora crítica (P95 >50%, error +5pp ou very_slow 2x)` | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| `* - 'warning' → piora moderada (P95 >25% ou error +2pp)` | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| `transition={{ delay: index * 0.05 }}` | `src/pages/advanced-price-search/ResultViews.tsx` |
| `(0.12 + a.depth * 0.2) * config.depthProfile * (a.individualOpacity ?? 1.0);` | `src/pages/auth/AuthBranding.tsx` |
| `breathingDelay: (i % 4) * 0.05,` | `src/pages/auth/AuthBranding.tsx` |
| `size: 0.8 + (i % 3) * 0.4,` | `src/pages/auth/AuthBranding.tsx` |
| `depth: 0.1 + Math.random() * 0.9,` | `src/pages/auth/StarfieldCanvas.tsx` |
| `transition={{ delay: idx * 0.08, type: 'spring', stiffness: 400, damping: 25 }}` | `src/pages/collections/CollectionsPage.tsx` |
| `* para manter o snapshot 100% determinístico entre CI e local.` | `src/pages/dev/MagazineRingHarness.tsx` |
| `// filtrada 100% client-side via categoryFilteredProductIds (mesmo padrao de cor/material).` | `src/pages/filters/useFiltersPageState.ts` |
| `// grade zerada (perda 75-100% em 14+ categorias-pai). A categoria passa a ser` | `src/pages/filters/useFiltersPageState.ts` |
| `radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.04), transparent),` | `src/pages/kit-builder/KitBuilderPage.tsx` |
| `radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.08), transparent),` | `src/pages/kit-builder/KitBuilderPage.tsx` |
| `// templateId só conta se a revista já tem título — evita 20% para revista vazia` | `src/pages/magazine/utils/stepValidation.ts` |
| `{/* Cabeçalho — 15% menor que o original */}` | `src/pages/products/NoveltiesPage.tsx` |
| `<SelectItem value="50_50">50/50 \| 50% entrada / 50% após entrega</SelectItem>` | `src/pages/quotes/QuoteBuilderPage.tsx` |
| `Pistas extras aumentam em até 40% a precisão` | `src/pages/tools/VisualSearchPage.tsx` |
| `transition={{ delay: 0.2 + i * 0.05 }}` | `src/pages/tools/VisualSearchPage.tsx` |
| `transition={{ delay: 0.5 + idx * 0.1 }}` | `src/pages/tools/VisualSearchPage.tsx` |
| `transition={{ delay: i * 0.15 }}` | `src/pages/tools/VisualSearchPage.tsx` |
| `transition={{ delay: idx * 0.04, duration: 0.4 }}` | `src/pages/tools/VisualSearchPage.tsx` |
| `transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}` | `src/pages/tools/VisualSearchPage.tsx` |
| `else if (hour >= 14 && hour <= 18) hourWeight = 0.7 + Math.random() * 0.3;` | `src/pages/trends/trends-mock.ts` |
| `if (hour >= 9 && hour <= 12) hourWeight = 0.9 + Math.random() * 0.1;` | `src/pages/trends/trends-mock.ts` |
| `api_fail: 1.0, // 100% — falhas de API são críticas` | `src/services/telemetryService.ts` |
| `error: 1.0, // 100% — todo erro importa` | `src/services/telemetryService.ts` |
| `performance: 0.1, // 10% — performance é estatística` | `src/services/telemetryService.ts` |
| `ux_action: 0.2, // 20% — ações de UX são frequentes mas amostradas` | `src/services/telemetryService.ts` |
| `* 7.153 produtos, 16.631 swatches, 97,4% CF CDN.` | `src/types/product.ts` |
| `\| 'critical' // Crítico (< 25% do mínimo)` | `src/types/stock.ts` |
| `* Cobertura total: 99.98% das imagens com url_original` | `src/utils/imageProxy.ts` |
| `* cdn.xbzbrindes.com.br 67.96% (40.708 imgs) ← XBZ imagem CDN (CORRIGIDO)` | `src/utils/imageProxy.ts` |
| `* cdndeprodutos.azureedge.net 5.38% (3.225 imgs) ← Azure CDN genérico` | `src/utils/imageProxy.ts` |
| `* media.asiaimport.com.br 8.96% (5.370 imgs) ← Asia Import media (CORRIGIDO)` | `src/utils/imageProxy.ts` |
| `* somarcascdn.azureedge.net 2.38% (1.428 imgs) ← Só Marcas Azure CDN (CORRIGIDO)` | `src/utils/imageProxy.ts` |
| `* www.spotgifts.com.br 15.30% (9.167 imgs) ← SPOT` | `src/utils/imageProxy.ts` |
| `// Asia Import — 8.96% — subdomínio media (não apex)` | `src/utils/imageProxy.ts` |
| `// Azure CDN genérico (mixed suppliers) — 5.38%` | `src/utils/imageProxy.ts` |
| `// SPOT (Stricker) — 15.30%` | `src/utils/imageProxy.ts` |
| `// Só Marcas — 2.38% — Azure CDN próprio` | `src/utils/imageProxy.ts` |
| `// XBZ Brindes — 67.96% (maior supplier) — CDN de imagens` | `src/utils/imageProxy.ts` |
| `data[i + 3] = 255; // Solid — 100% monochromatic per color` | `src/utils/laser-logo-processor.ts` |
| `// (~0,08% dos produtos hoje — registros antigos sem trigger disparado).` | `src/utils/product-mapper.ts` |
| `// if the user reached 80% of the limit very fast (e.g. in less than 10% of the window)` | `supabase/functions/_shared/rate-limiter.ts` |
| `* Aceita qualquer Database / SchemaName, com default "public" — cobre 100%` | `supabase/functions/_shared/supabase-client-adapter.ts` |
| `* v1: preserva 100% do schema atual em produção. Aceito por padrão.` | `supabase/functions/_shared/contracts/schemas/product-webhook.ts` |
| `// vazavam nos resultados (696 casos = 2.49% dos assignments).` | `supabase/functions/categories-api/index.ts` |
| `* Cruza user_comparisons ativas com price_history; se houve queda > 5% nos` | `supabase/functions/comparison-price-watcher/index.ts` |
| `* (94% das empresas do CRM não têm dono; só 6 de 77 vendedores têm vínculo por e-mail).` | `supabase/functions/crm-db-bridge/ownership.ts` |
| `// Coverage: JPEG+PNG+WebP+GIF ≈ 99.9% of all verified product images.` | `supabase/functions/generate-blurhashes/index.ts` |
| `'cdn.xbzbrindes.com.br', // XBZ CDN de imagens — 67.96% product_images` | `supabase/functions/image-proxy/index.ts` |
| `'cdndeprodutos.azureedge.net', // XBZ Azure CDN — 4.5% product_images` | `supabase/functions/image-proxy/index.ts` |
| `'media.asiaimport.com.br', // Asia Import CDN — 8.96% product_images` | `supabase/functions/image-proxy/index.ts` |
| `'somarcascdn.azureedge.net', // Só Marcas Azure CDN — 2.38% product_images` | `supabase/functions/image-proxy/index.ts` |
| `const p95Latency = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : 0;` | `supabase/functions/load-test/index.ts` |
| `const p99Latency = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] : 0;` | `supabase/functions/load-test/index.ts` |
| `// Retenção LGPD (~1% das chamadas): apaga tentativas com mais de` | `supabase/functions/log-login-attempt/index.ts` |
| `// default e bloqueava 100% do tráfego anônimo no gateway. Corrigido.` | `supabase/functions/magazine-public-react/index.ts` |
| `// direto — RLS bloqueia anon em 100% das tabelas magazine_*. Esta edge` | `supabase/functions/magazine-public-view/index.ts` |
| `// esta função e caiu no default verify_jwt=true, bloqueando 100% do tráfego` | `supabase/functions/magazine-public-view/index.ts` |
| `// default e bloqueava 100% do tráfego anônimo no gateway. Corrigido.` | `supabase/functions/magazine-reader-state-write/index.ts` |
| `// Add exact hash matches first (100% relevance)` | `supabase/functions/product-visual-search/index.ts` |
| `// callEdge) + 20% de margem — um valor fixo menor que esse budget corta a` | `tests/edge-functions/live/_live-suite.ts` |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `PROBE_TIMEOUT_MS` | `3` | `api/ready.ts` |
| `PAGE_SIZE` | `1000` | `api/sitemap.ts` |
| `CACHE_VERSION` | `'v19'` | `public/sw.js` |
| `IMAGE_CACHE_MAX` | `500` | `public/sw.js` |
| `IMAGE_CACHE_TTL` | `90` | `public/sw.js` |
| `STALE_BUST_WINDOW_MS` | `120000` | `public/sw.js` |
| `RECENT_LIMIT` | `20` | `recovery/src-legacy/src/components/admin/telemetry/BridgesLiveCard.tsx` |
| `MOBILE_BREAKPOINT` | `768` | `recovery/src-legacy/src/hooks/use-mobile.tsx` |
| `TOAST_LIMIT` | `1` | `recovery/src-legacy/src/hooks/use-toast.ts` |
| `TOAST_REMOVE_DELAY` | `1000000` | `recovery/src-legacy/src/hooks/use-toast.ts` |
| `MAX_RETRIES` | `2` | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| `INITIAL_BACKOFF_MS` | `500` | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| `AUTOSAVE_SCHEMA_VERSION` | `2` | `recovery/src-legacy/src/hooks/useAutoSaveQuote.ts` |
| `ITEMS_PER_PAGE` | `36` | `recovery/src-legacy/src/hooks/useCatalogState.ts` |
| `HEALTHY_INTERVAL` | `60` | `recovery/src-legacy/src/hooks/useCloudStatus.ts` |
| `DOWN_AUTO_STOP_MS` | `30` | `recovery/src-legacy/src/hooks/useCloudStatus.ts` |
| `CHUNK` | `80` | `recovery/src-legacy/src/hooks/useColorEnrichment.ts` |
| `MAX_COMPARE_ITEMS` | `4` | `recovery/src-legacy/src/hooks/useComparison.ts` |
| `AUTO_SAVE_DELAY_MS` | `5000` | `recovery/src-legacy/src/hooks/useKitAutoSave.ts` |
| `BUFFER_DAYS` | `3` | `recovery/src-legacy/src/hooks/useKitStockForecast.ts` |
| `MAX_HISTORY` | `30` | `recovery/src-legacy/src/hooks/useKitUndoRedo.ts` |
| `MAX_ATTEMPTS` | `5` | `recovery/src-legacy/src/hooks/useLoginRateLimit.ts` |
| `LOCKOUT_MS` | `5` | `recovery/src-legacy/src/hooks/useLoginRateLimit.ts` |
| `MAX_SIZE` | `200` | `recovery/src-legacy/src/hooks/useLogoColorAnalysis.ts` |
| `AUTO_SAVE_DELAY` | `2000` | `recovery/src-legacy/src/hooks/useMockupDraft.ts` |
| `NOVELTY_WINDOW_DAYS` | `30` | `recovery/src-legacy/src/hooks/useNovelties.ts` |
| `BRIDGE_TABLE` | `'variant_supplier_sources'` | `recovery/src-legacy/src/hooks/useProductSupplierSources.ts` |
| `CHUNK` | `50` | `recovery/src-legacy/src/hooks/useProductsByColor.ts` |
| `CATALOG_PAGE_SIZE` | `500` | `recovery/src-legacy/src/hooks/useProductsLightweight.ts` |
| `CATALOG_BATCH_PAGES` | `4` | `recovery/src-legacy/src/hooks/useProductsLightweight.ts` |
| `MAX_RECENT_PRODUCTS` | `5` | `recovery/src-legacy/src/hooks/useRecentProducts.ts` |
| `MAX_ITEMS` | `10` | `recovery/src-legacy/src/hooks/useRecentlyViewed.ts` |
| `DEFAULT_MS` | `3000` | `recovery/src-legacy/src/hooks/useRetestCooldownSetting.ts` |
| `MAX_HISTORY` | `10` | `recovery/src-legacy/src/hooks/useSearchHistory.ts` |
| `BATCH_SIZE` | `50` | `recovery/src-legacy/src/hooks/useSparklineSales.tsx` |
| `MAX_STACK` | `10` | `recovery/src-legacy/src/hooks/useUndoStack.ts` |
| `TTL_MS` | `30` | `recovery/src-legacy/src/hooks/useUndoStack.ts` |
| `ERROR_RESET_DELAY_MS` | `5000` | `recovery/src-legacy/src/hooks/useVoiceAgent.ts` |
| `PROCESSING_ERROR_RESET_DELAY_MS` | `3000` | `recovery/src-legacy/src/hooks/useVoiceAgent.ts` |
| `SESSION_START_TIMEOUT_MS` | `4000` | `recovery/src-legacy/src/hooks/useVoiceAgent.ts` |
| `MAX_HISTORY` | `100` | `recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts` |
| `RECENT_LIMIT` | `5` | `recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts` |
| `FREQUENT_LIMIT` | `6` | `recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts` |
| `CACHE_TTL_MS` | `60` | `recovery/src-legacy/src/hooks/useWorkspaceNotifications.tsx` |
| `PREFETCH_MIN_INTERVAL_MS` | `5` | `recovery/src-legacy/src/hooks/useWorkspaceNotifications.tsx` |
| `THROTTLE_MS` | `4000` | `recovery/src-legacy/src/lib/external-db/bridge-telemetry-client.ts` |
| `MAX_INCIDENTS` | `25` | `recovery/src-legacy/src/lib/external-db/cold-start-recorder.ts` |
| `MAX_CLIENTS` | `3` | `recovery/src-legacy/src/pages/ClientComparatorPage.tsx` |
| `DEPLOY_VERSION` | `'2026.07.06.1220'` | `src/deploy-version.ts` |
| `PDF_LAYOUT_MILESTONE` | `'pdf-layout-v1-2026-07-06'` | `src/deploy-version.ts` |
| `MESSAGE_ROTATION_MS` | `2500` | `src/components/LoadingScreen.tsx` |
| `PAGE_SIZE` | `50` | `src/components/admin/DiscountApprovalQueue.tsx` |
| `ROOT` | `'__none__'` | `src/components/admin/categories-manager/CategoriesManager.tsx` |
| `PREVIEW_LIMIT` | `8` | `src/components/admin/connections/ConnectionTestDetailsDialog.tsx` |
| `DEFAULT_PREVIEW_SIZE` | `5` | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` |
| `TOOLTIP_LIMIT` | `12` | `src/components/admin/connections/CredentialsSourceIndicator.tsx` |
| `PAGE_SIZE` | `25` | `src/components/admin/connections/FailedDeliveriesPanel.tsx` |
| `MAX_NOTES` | `200` | `src/components/admin/connections/RotateSecretConfirmDialog.tsx` |
| `MAX_RECENT` | `8` | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| `TTL_MS` | `30` | `src/components/admin/connections/useFocusContext.ts` |
| `WINDOW_MS` | `72` | `src/components/admin/connections/useIncidentTimeline72h.ts` |
| `SNOOZE_MS` | `60` | `src/components/admin/connections/useSeverityChangeNotifier.ts` |
| `MAX_ROWS` | `10` | `src/components/admin/products/bulk-import/types.ts` |
| `MAX_FILE_SIZE` | `100` | `src/components/admin/products/video-gallery/types.ts` |
| `ALL_CREATORS` | `'__all__'` | `src/components/admin/security/keys/McpKeysFilters.tsx` |
| `PAGE_SIZE` | `50` | `src/components/admin/security/keys/audit/useMcpAuditFeed.ts` |
| `POLL_MS` | `15` | `src/components/admin/telemetry/BreakerStatusCard.tsx` |
| `POLL_MS` | `30` | `src/components/admin/telemetry/ColdVsWarmCrmCard.tsx` |
| `SLOW_REDIRECT_MS` | `6000` | `src/components/auth/SocialLoginButtons.tsx` |
| `REDIRECT_TIMEOUT_MS` | `15000` | `src/components/auth/SocialLoginButtons.tsx` |
| `MAX_RECENT` | `5` | `src/components/cart/CartCompanyPickerDialog.tsx` |
| `MIN_QTY` | `1` | `src/components/cart/PopoverQtyInput.tsx` |
| `MAX_QTY` | `999` | `src/components/cart/PopoverQtyInput.tsx` |
| `FEEDBACK_TIMEOUT_MS` | `700` | `src/components/cart/PopoverQtyInput.tsx` |
| `BOM` | `'\uFEFF'` | `src/components/cart/cart-utils/CartExport.ts` |
| `CACHE_TTL_MS` | `30` | `src/components/compare/AIComparisonAdvisor.tsx` |
| `PAGE_SIZE` | `100` | `src/components/dashboard/MyClientsWidget.tsx` |
| `PAGE_SIZE` | `20` | `src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| `PAGE_SIZE` | `20` | `src/components/dashboard/MyRecentQuotesWidget.tsx` |
| `MAX_AUTO_RETRIES` | `2` | `src/components/errors/EnhancedErrorBoundary.tsx` |
| `AUTO_RECOVERY_WATCHDOG_MS` | `10` | `src/components/errors/EnhancedErrorBoundary.tsx` |
| `PRICE_PRESETS_COUNT` | `4` | `src/components/expert/FlowFilterPanel.tsx` |
| `TAG_DISPLAY_LIMIT` | `50` | `src/components/filters/filter-panel/sections/SimpleFilters.tsx` |
| `WINDOW_MS` | `5` | `src/components/intelligence/RealtimeBadge.tsx` |
| `FUTURE_STOCK_WINDOW_DAYS` | `30` | `src/components/inventory/StockDashboard.tsx` |
| `ECONOMY_FREIGHT_LIMIT_G` | `5000` | `src/components/kit-builder/KitConflictAlerts.tsx` |
| `NOTES_MAX_LENGTH` | `500` | `src/components/kit-builder/KitSummary.tsx` |
| `VIRTUALIZED_KIT_ITEM_THRESHOLD` | `48` | `src/components/kit-builder/VirtualizedKitItemList.tsx` |
| `WINDOW_MS` | `60` | `src/components/layout/DevRoute.tsx` |
| `LOGO_MAX_BYTES` | `10` | `src/components/mockup/AreaCard.tsx` |
| `LOGO_FORMAT_ERROR` | `'Formato não suportado. Use JPG, PNG ou WebP.'` | `src/components/mockup/AreaCard.tsx` |
| `LOGO_SIZE_ERROR` | `'Arquivo muito grande. Tamanho máximo: 10 MB.'` | `src/components/mockup/AreaCard.tsx` |
| `MAX_SIZE_MB` | `25` | `src/components/mockup/ArtFileUpload.tsx` |
| `MIN_POSITION` | `2` | `src/components/mockup/MockupBeforeAfter.tsx` |
| `MAX_POSITION` | `98` | `src/components/mockup/MockupBeforeAfter.tsx` |
| `SEARCH_MIN_CHARS` | `2` | `src/components/mockup/MockupClientSelector.tsx` |
| `SEARCH_DEBOUNCE_MS` | `300` | `src/components/mockup/MockupClientSelector.tsx` |
| `ITEMS_PER_PAGE` | `12` | `src/components/mockup/MockupHistoryPanel.tsx` |
| `MOCKUP_GRID_BREAKPOINT_SM` | `640` | `src/components/mockup/MockupProductSelector.tsx` |
| `MOCKUP_GRID_BREAKPOINT_LG` | `1024` | `src/components/mockup/MockupProductSelector.tsx` |
| `MAX_SIZE_BYTES` | `10` | `src/components/mockup/MultiAreaManager.tsx` |
| `PAGE_WIDTH` | `794` | `src/components/mockup/approval/MockupApprovalPreview.tsx` |
| `PAGE_HEIGHT` | `1123` | `src/components/mockup/approval/MockupApprovalPreview.tsx` |
| `STAGE_GUTTER` | `32` | `src/components/mockup/approval/MockupApprovalPreview.tsx` |
| `CANVAS_SIZE` | `1024` | `src/components/mockup/approval/MockupLayoutButtons.tsx` |
| `CLIP_TOLERANCE_PX` | `0.5` | `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx` |
| `FALLBACK_MIN` | `5` | `src/components/mockup/logo-editor/useLogoDrag.ts` |
| `FALLBACK_MAX` | `95` | `src/components/mockup/logo-editor/useLogoDrag.ts` |
| `MAX_PROCESSING_DIMENSION` | `2048` | `src/components/mockup/logo-editor/useLogoProcessing.ts` |
| `DEFAULT_PREFETCH_DEBOUNCE_MS` | `200` | `src/components/notifications/NotificationDrawer.tsx` |
| `SPARK_W` | `160` | `src/components/notifications/NotificationsBadgeStatsPanel.tsx` |
| `SPARK_H` | `24` | `src/components/notifications/NotificationsBadgeStatsPanel.tsx` |
| `SPARK_WINDOW_SECONDS` | `60` | `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts` |
| `SUSPICIOUS_RATIO_THRESHOLD` | `0.7` | `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts` |
| `SUSPICIOUS_STREAK_SECONDS` | `10` | `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts` |
| `CARD_MIN_HEIGHT_PX` | `420` | `src/components/novelties/NoveltyProductGrid.tsx` |
| `SKELETON_GRID_ROWS` | `3` | `src/components/novelties/NoveltyProductGrid.tsx` |
| `SKELETON_LIST_MIN_H` | `600` | `src/components/novelties/NoveltyProductGrid.tsx` |
| `GREEN` | `'#00c853'` | `src/components/pdf/ProposalStyles.ts` |
| `GREEN_DARK` | `'#009e41'` | `src/components/pdf/ProposalStyles.ts` |
| `DARK` | `'#333333'` | `src/components/pdf/ProposalStyles.ts` |
| `BLUE` | `'#0085ca'` | `src/components/pdf/ProposalStyles.ts` |
| `TOTALS_BLOCK_WIDTH_PX` | `276` | `src/components/pdf/ProposalStyles.ts` |
| `PAGE_W` | `794` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `PAGE_H` | `1123` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `FIRST_HEADER_H` | `128` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CONT_HEADER_H` | `60` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CLIENT_BAR_H` | `90` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CONT_CLIENT_H` | `60` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `TABLE_HEADER_H` | `38` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `SIMPLE_FOOTER_H` | `30` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CONTENT_PAD` | `36` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `ROW_H` | `100` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `NOTES_H` | `300` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `HINT_H` | `28` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `TOTALS_H` | `180` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `SIGNATURE_H` | `120` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `SAFETY` | `24` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `IMG` | `92` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `BREATH` | `4` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `DESC_LH` | `15.4` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `DESC_MB` | `4` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `GRAV_H` | `25` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `DESC_CPL` | `58` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `WATERMARK_TEXT` | `'RASCUNHO'` | `src/components/pdf/watermarkTokens.ts` |
| `WATERMARK_ALPHA` | `0.0805` | `src/components/pdf/watermarkTokens.ts` |
| `MAX_ENGRAVINGS` | `5` | `src/components/pricing/ProductPriceSimulator.tsx` |
| `TIER_PROXIMITY_THRESHOLD` | `0.3` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `TIER_HIGH_PRIORITY_THRESHOLD` | `0.15` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `CONFIRM_PHRASE` | `'EXCLUIR MINHA CONTA'` | `src/components/privacy/AnonymizeAccountDialog.tsx` |
| `SWATCH_SIZE_VAR` | `'--swatch-size'` | `src/components/products/swatchSizing.ts` |
| `DRAFT_TTL_MS` | `1000` | `src/components/products/customization/LocationPanel.tsx` |
| `MANUAL_PHONE_PLACEHOLDER` | `'(11) 91234-5678'` | `src/components/products/gallery/VideoShareWhatsAppDialog.tsx` |
| `BRAZIL_COUNTRY_CODE` | `'55'` | `src/components/products/share/whatsapp.ts` |
| `MAX_MARKUP` | `50` | `src/components/quotes/NegotiationMarkupCard.tsx` |
| `MAX_VERSIONS` | `5` | `src/components/quotes/QuoteAutoSave.tsx` |
| `PAGE_SIZE` | `25` | `src/components/quotes/QuotesConfigurableList.tsx` |
| `FORBIDDEN_AUTOSAVE_TEXT` | `'Salvo automaticamente'` | `src/components/quotes/quoteAutoSaveStatus.ts` |
| `QUOTE_AUTOSAVE_ARIA_LABEL` | `'Status de salvamento do orçamento'` | `src/components/quotes/quoteAutoSaveStatus.ts` |
| `BUCKET_UNCAT` | `'__uncategorized__'` | `src/components/quotes/useQuoteSummaryState.ts` |
| `MAX_ENTRIES` | `50` | `src/components/search/searchCache.ts` |
| `TTL_MS` | `60` | `src/components/search/searchCache.ts` |
| `MAX_QUICK_SUGGESTIONS` | `6` | `src/components/search/useQuickSuggestions.ts` |
| `CONNECTION_DIST` | `120` | `src/components/search/voice/FloatingParticles.tsx` |
| `SIZE` | `220` | `src/components/search/voice/VoiceOrb.tsx` |
| `ITEM_HEIGHT` | `100` | `src/components/simulator/wizard/StepProduct.tsx` |
| `ROW_GAP` | `12` | `src/components/simulator/wizard/StepProduct.tsx` |
| `COLUMNS` | `3` | `src/components/simulator/wizard/StepProduct.tsx` |
| `COVERAGE` | `0.9` | `src/components/system/RootInteractivityGuard.tsx` |
| `GHOST_MARK` | `'data-interactivity-ghost'` | `src/components/system/RootInteractivityGuard.tsx` |
| `SIDEBAR_COOKIE_MAX_AGE` | `60` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH` | `'16rem'` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH_MOBILE` | `'18rem'` | `src/components/ui/sidebar.tsx` |
| `TOAST_ID_DEGRADED` | `'bridge-degraded'` | `src/hooks/useBridgeStatusBanner.ts` |
| `TOAST_ID_UNAVAILABLE` | `'bridge-unavailable'` | `src/hooks/useBridgeStatusBanner.ts` |
| `LINE_HEIGHT` | `16` | `src/hooks/useHorizontalScroll.ts` |
| `REPLENISHMENT_WINDOW_DAYS` | `30` | `src/hooks/useReplenishments.ts` |
| `MIN_REPLENISHMENT_DELTA_MS` | `86` | `src/hooks/useReplenishments.ts` |
| `REFRESH_INTERVAL_MS` | `30` | `src/hooks/admin/useKillSwitchObservability.ts` |
| `DEFAULT_MS` | `3000` | `src/hooks/admin/useRetestCooldownSetting.ts` |
| `DEFAULT_LIMIT` | `1000` | `src/hooks/admin/useV4Callbacks.ts` |
| `SLOW_HYDRATION_THRESHOLD_MS` | `2` | `src/hooks/auth/useAuthHydrationMetrics.ts` |
| `MAX_SAMPLES` | `20` | `src/hooks/auth/useAuthHydrationMetrics.ts` |
| `HYDRATION_TIMEOUT_MS` | `7` | `src/hooks/auth/useProfileRoles.ts` |
| `HYDRATION_MAX_RETRIES` | `2` | `src/hooks/auth/useProfileRoles.ts` |
| `HYDRATION_RETRY_DELAY_MS` | `500` | `src/hooks/auth/useProfileRoles.ts` |
| `DAY_MS` | `86400000` | `src/hooks/bi/useClientBI.ts` |
| `NINETY_DAYS` | `90` | `src/hooks/bi/useClientCategoryAffinity.ts` |
| `WINDOW_MONTHS` | `24` | `src/hooks/bi/useClientSeasonality.ts` |
| `THRESHOLD` | `15` | `src/hooks/bi/useClientVsIndustry.ts` |
| `MIN_SAMPLE` | `3` | `src/hooks/bi/useClientVsIndustry.ts` |
| `DAYS_WINDOW` | `180` | `src/hooks/bi/useClientVsIndustry.ts` |
| `MAX_HISTORY` | `10` | `src/hooks/common/useSearchHistory.ts` |
| `MAX_STACK` | `10` | `src/hooks/common/useUndoStack.ts` |
| `TTL_MS` | `30` | `src/hooks/common/useUndoStack.ts` |
| `MAX_COMPARE_ITEMS` | `4` | `src/hooks/comparison/useComparison.ts` |
| `REMOTE_DEBOUNCE_MS` | `800` | `src/hooks/customization/useCustomizationCollapsePrefs.ts` |
| `MAGIC_UP_SHARE_NO_IMAGE_REASON` | `'Gere uma imagem antes de compartilhar no WhatsApp'` | `src/hooks/intelligence/magicUpShare.ts` |
| `MAX_RETRIES` | `2` | `src/hooks/intelligence/useAIRecommendations.ts` |
| `INITIAL_BACKOFF_MS` | `500` | `src/hooks/intelligence/useAIRecommendations.ts` |
| `ID_CHUNK_SIZE` | `150` | `src/hooks/intelligence/useCommercialIntelligence.helpers.ts` |
| `SPARKLINE_WINDOW_DAYS` | `90` | `src/hooks/intelligence/useSparklineSales.tsx` |
| `PAGE_SIZE` | `1000` | `src/hooks/intelligence/useSparklineSales.tsx` |
| `BATCH_SIZE` | `50` | `src/hooks/intelligence/useSparklineSales.tsx` |
| `PAGE_SIZE` | `1000` | `src/hooks/intelligence/useStockHistory.ts` |
| `CHUNK_SIZE` | `100` | `src/hooks/intelligence/useStockVelocityPrefetch.ts` |
| `ERROR_RESET_DELAY_MS` | `5000` | `src/hooks/intelligence/useVoiceAgent.ts` |
| `PROCESSING_ERROR_RESET_DELAY_MS` | `3000` | `src/hooks/intelligence/useVoiceAgent.ts` |
| `SESSION_START_TIMEOUT_MS` | `4000` | `src/hooks/intelligence/useVoiceAgent.ts` |
| `MAX_HISTORY` | `100` | `src/hooks/intelligence/useVoiceCommandHistory.ts` |
| `RECENT_LIMIT` | `5` | `src/hooks/intelligence/useVoiceCommandHistory.ts` |
| `FREQUENT_LIMIT` | `6` | `src/hooks/intelligence/useVoiceCommandHistory.ts` |
| `ID_CHUNK_SIZE` | `150` | `src/hooks/intelligence/useZeroResultDiagnosis.ts` |
| `SAMPLE_SIZE` | `800` | `src/hooks/intelligence/useZeroResultSubstitutes.ts` |
| `ENRICH_LIMIT` | `250` | `src/hooks/intelligence/useZeroResultSubstitutes.ts` |
| `SOURCE_COLS` | `'id,variant_id,supplier_id,updated_at,'` | `src/hooks/inventory/useSupplierReliability.ts` |
| `SNAPSHOT_COLS` | `'id,variant_supplier_source_id,supplier_id,variant_id,'` | `src/hooks/inventory/useSupplierReliability.ts` |
| `SUPPLIER_COLS` | `'id,name'` | `src/hooks/inventory/useSupplierReliability.ts` |
| `SNAPSHOT_WINDOW_DAYS` | `180` | `src/hooks/inventory/useSupplierReliability.ts` |
| `AUTO_SAVE_DELAY_MS` | `5000` | `src/hooks/kit-builder/useKitAutoSave.ts` |
| `PRODUCT_PAGE_SIZE` | `200` | `src/hooks/kit-builder/useKitBuilderQueries.ts` |
| `BUFFER_DAYS` | `3` | `src/hooks/kit-builder/useKitStockForecast.ts` |
| `STOCK_PAGE_SIZE` | `500` | `src/hooks/kit-builder/useKitStockValidation.ts` |
| `STOCK_PRODUCT_BATCH_SIZE` | `100` | `src/hooks/kit-builder/useKitStockValidation.ts` |
| `STOCK_BATCH_CONCURRENCY` | `4` | `src/hooks/kit-builder/useKitStockValidation.ts` |
| `MAX_HISTORY` | `30` | `src/hooks/kit-builder/useKitUndoRedo.ts` |
| `GENERATE_TIMEOUT_MS` | `30000` | `src/hooks/mockup/mockupGenerationService.ts` |
| `MAX_BATCH_AREAS` | `6` | `src/hooks/mockup/mockupGeneratorModel.ts` |
| `MISSING_DIMENSIONS_ERROR_CODE` | `'missing_dimensions'` | `src/hooks/mockup/mockupGeneratorModel.ts` |
| `MISSING_DIMENSIONS_STATUS` | `422` | `src/hooks/mockup/mockupGeneratorModel.ts` |
| `AUTO_SAVE_DELAY` | `2000` | `src/hooks/mockup/useMockupDraft.ts` |
| `LOGO_UPLOAD_ERROR` | `'Não foi possível salvar a logo no rascunho'` | `src/hooks/mockup/useMockupDraft.ts` |
| `MS_PER_DAY` | `1000` | `src/hooks/products/novelty-core.ts` |
| `NOVELTY_DISPLAY_WINDOW_DAYS` | `30` | `src/hooks/products/novelty-core.ts` |
| `NOVELTY_FRESH_DAYS` | `5` | `src/hooks/products/novelty-core.ts` |
| `NOVELTY_EXPIRING_SOON_DAYS` | `7` | `src/hooks/products/novelty-core.ts` |
| `ITEMS_PER_PAGE` | `500` | `src/hooks/products/useCatalogState.helpers.ts` |
| `CHUNK` | `80` | `src/hooks/products/useColorEnrichment.ts` |
| `CHUNK` | `80` | `src/hooks/products/useColorFanout.ts` |
| `CART_ITEM_DEBOUNCE_MS` | `300` | `src/hooks/products/useDebouncedCartItemActions.ts` |
| `CART_ITEM_DEBOUNCE_MS_MIN` | `0` | `src/hooks/products/useDebouncedCartItemActions.ts` |
| `CART_ITEM_DEBOUNCE_MS_MAX` | `2000` | `src/hooks/products/useDebouncedCartItemActions.ts` |
| `MS_PER_DAY` | `1000` | `src/hooks/products/useNovelties.helpers.ts` |
| `NOVELTY_DISPLAY_WINDOW_DAYS` | `30` | `src/hooks/products/useNovelties.helpers.ts` |
| `NOVELTY_FRESH_DAYS` | `5` | `src/hooks/products/useNovelties.helpers.ts` |
| `NOVELTY_EXPIRING_SOON_DAYS` | `7` | `src/hooks/products/useNovelties.helpers.ts` |
| `PAGE` | `1000` | `src/hooks/products/useNovelties.helpers.ts` |
| `MAX_PAGES` | `25` | `src/hooks/products/useNovelties.helpers.ts` |
| `PAGE_SIZE` | `500` | `src/hooks/products/useNovelties.helpers.ts` |
| `MAX_PAGES` | `100` | `src/hooks/products/useNovelties.helpers.ts` |
| `PAGE` | `1000` | `src/hooks/products/useNovelties.helpers.ts` |
| `MAX_PAGES` | `50` | `src/hooks/products/useNovelties.helpers.ts` |
| `CF_BASE` | `'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw'` | `src/hooks/products/useProductImages.ts` |
| `IMAGE_BATCH_CHUNK_SIZE` | `80` | `src/hooks/products/useProductImages.ts` |
| `CATEGORY_POINTS` | `30` | `src/hooks/products/useProductMatch.ts` |
| `TAG_POINTS` | `10` | `src/hooks/products/useProductMatch.ts` |
| `NICHE_POINTS` | `15` | `src/hooks/products/useProductMatch.ts` |
| `SUPPLIER_POINTS` | `5` | `src/hooks/products/useProductMatch.ts` |
| `DESCRIPTIVE_TAG_POINTS` | `8` | `src/hooks/products/useProductMatch.ts` |
| `DESCRIPTIVE_TAG_CAP` | `24` | `src/hooks/products/useProductMatch.ts` |
| `MATERIAL_POINTS` | `6` | `src/hooks/products/useProductMatch.ts` |
| `COMPLEMENTARY_POINTS` | `20` | `src/hooks/products/useProductMatch.ts` |
| `CHUNK` | `50` | `src/hooks/products/useProductsByColor.ts` |
| `PAGE` | `1000` | `src/hooks/products/useProductsByColor.ts` |
| `MAX_PAGES` | `50` | `src/hooks/products/useProductsByColor.ts` |
| `CHUNK` | `100` | `src/hooks/products/useProductsColorsBatch.ts` |
| `PAGE` | `1000` | `src/hooks/products/useProductsColorsBatch.ts` |
| `MAX_PAGES` | `50` | `src/hooks/products/useProductsColorsBatch.ts` |
| `NOVELTY_WINDOW_DAYS` | `30` | `src/hooks/products/useProductsLightweight.ts` |
| `CATALOG_PAGE_SIZE` | `500` | `src/hooks/products/useProductsLightweight.ts` |
| `CATALOG_BATCH_PAGES` | `4` | `src/hooks/products/useProductsLightweight.ts` |
| `PRODUCT_SELECT_LIGHTWEIGHT` | `'id, name, sku, supplier_reference, short_description, '` | `src/hooks/products/useProductsLightweight.ts` |
| `MAX_RECENT_PRODUCTS` | `5` | `src/hooks/products/useRecentProducts.ts` |
| `MAX_ITEMS` | `10` | `src/hooks/products/useRecentlyViewed.ts` |
| `REPLENISHMENT_WINDOW_DAYS` | `30` | `src/hooks/products/useReplenishments.ts` |
| `FETCH_ALL_LIMIT` | `2000` | `src/hooks/products/useReplenishments.ts` |
| `MAX_SELLER_CARTS` | `50` | `src/hooks/products/useSellerCarts.helpers.ts` |
| `MIN_ITEM_QUANTITY` | `1` | `src/hooks/products/useSellerCarts.helpers.ts` |
| `MAX_ITEM_QUANTITY` | `999999` | `src/hooks/products/useSellerCarts.helpers.ts` |
| `STALE` | `2` | `src/hooks/products/useStockNotifications.ts` |
| `MARKUP_MAX_PERCENT` | `50` | `src/hooks/quotes/quoteHelpers.ts` |
| `MARKUP_MAX_PERCENT` | `50` | `src/hooks/quotes/quoteMarkup.ts` |
| `AUTOSAVE_SCHEMA_VERSION` | `2` | `src/hooks/quotes/useAutoSaveQuote.ts` |
| `STALE_DRAFT_DAYS` | `7` | `src/hooks/quotes/useAutoSaveQuote.ts` |
| `CHUNK` | `50` | `src/hooks/quotes/useQuoteClientLogos.ts` |
| `MAX_SIZE` | `200` | `src/hooks/simulation/useLogoColorAnalysis.ts` |
| `MAX_HISTORY` | `30` | `src/hooks/simulator/useUndoRedo.ts` |
| `SESSION_TTL` | `2` | `src/hooks/simulator/useWizardPersistence.ts` |
| `MAX_ROWS` | `5000` | `src/hooks/stock/useRuptureAlerts.ts` |
| `TABLE` | `'saved_stock_views'` | `src/hooks/stock/useSavedStockViews.ts` |
| `MOBILE_BREAKPOINT` | `768` | `src/hooks/ui/use-mobile.tsx` |
| `HEALTHY_INTERVAL` | `60` | `src/hooks/ui/useCloudStatus.ts` |
| `DOWN_AUTO_STOP_MS` | `30` | `src/hooks/ui/useCloudStatus.ts` |
| `CHUNK_RELOAD_MAX` | `1` | `src/hooks/ui/useErrorHandler.ts` |
| `CHUNK_RELOAD_DELAY_MS` | `1500` | `src/hooks/ui/useErrorHandler.ts` |
| `CHUNK_RELOAD_CLEAR_MS` | `5000` | `src/hooks/ui/useErrorHandler.ts` |
| `CACHE_TTL_MS` | `60` | `src/hooks/ui/useWorkspaceNotifications.tsx` |
| `PREFETCH_MIN_INTERVAL_MS` | `5` | `src/hooks/ui/useWorkspaceNotifications.tsx` |
| `CACHE_TTL_MS` | `12` | `src/hooks/voice/scribeTokenCache.ts` |
| `MAX_ENTRIES` | `5` | `src/hooks/voice/useVoiceHistory.ts` |
| … +338 linhas — lista completa em `context.json` | | |

### H.2 Prazos, expirações e janelas de tempo

| Trecho | Arquivo |
|---|---|
| `timeout: 120 * 1000,` | `playwright.config.ts` |
| `timeout: 15 * 1000,` | `playwright.config.ts` |
| `-- WHERE created > now() - interval '7 days';` | `auditoria-supabase/propostas/P16_net001_pg_net_failure_monitoring.sql` |
| `WHERE created > now() - interval '7 days'` | `auditoria-supabase/propostas/P16_net001_pg_net_failure_monitoring.sql` |
| `await new Promise((r) => setTimeout(r, 1000));` | `public/sw.js` |
| `const IMAGE_CACHE_TTL = 90 * 24 * 60 * 60 * 1000;` | `public/sw.js` |
| `AND created_at > now() - interval '1 hour'` | `recovery/block04_functions.sql` |
| `AND created_at > now() - interval '1 hour';` | `recovery/block04_functions.sql` |
| `AND created_at > now() - interval '1 minute';` | `recovery/block04_functions.sql` |
| `AND created_at > now() - interval '20 hours'` | `recovery/block04_functions.sql` |
| `AND cth.tested_at > now() - interval '7 days'` | `recovery/block04_functions.sql` |
| `DELETE FROM public.step_up_challenges WHERE expires_at < (now() - interval '1 day');` | `recovery/block04_functions.sql` |
| `DELETE FROM public.step_up_tokens WHERE expires_at < (now() - interval '1 day');` | `recovery/block04_functions.sql` |
| `WHERE blocked = true AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL` | `recovery/block04_functions.sql` |
| `WHERE created_at > now() - interval '1 hour' AND ip_address IS NOT NULL` | `recovery/block04_functions.sql` |
| `WHERE d.delivered_at > now() - interval '1 hour'` | `recovery/block04_functions.sql` |
| `WHERE delivered_at < now() - interval '90 days'` | `recovery/block04_functions.sql` |
| `WHERE occurred_at < now() - interval '90 days'` | `recovery/block04_functions.sql` |
| `WHERE received_at < now() - interval '90 days'` | `recovery/block04_functions.sql` |
| `WHERE success = false AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL AND ip_address <> 'unknown'` | `recovery/block04_functions.sql` |
| `WHERE updated_at > now() - interval '30 days'` | `recovery/block04_functions.sql` |
| `WHERE user_id = _uid AND created_at > (now() - interval '1 hour');` | `recovery/block04_functions.sql` |
| `_exp := now() + interval '5 minutes';` | `recovery/block04_functions.sql` |
| `_expires timestamptz := now() + interval '6 hours';` | `recovery/block04_functions.sql` |
| `baseline_window_end timestamptz := now() - interval '24 hours';` | `recovery/block04_functions.sql` |
| `baseline_window_start timestamptz := now() - interval '26 hours';` | `recovery/block04_functions.sql` |
| `AND d.start_time > now() - interval '24 hours'` | `recovery/block11_cron_status_report.sql` |
| `AND created_at > now() - interval '1 hour'` | `recovery/full-public-schema.sql` |
| `AND created_at > now() - interval '1 hour';` | `recovery/full-public-schema.sql` |
| `AND created_at > now() - interval '1 minute';` | `recovery/full-public-schema.sql` |
| `AND created_at > now() - interval '20 hours'` | `recovery/full-public-schema.sql` |
| `AND cth.tested_at > now() - interval '7 days'` | `recovery/full-public-schema.sql` |
| `DELETE FROM public.step_up_challenges WHERE expires_at < (now() - interval '1 day');` | `recovery/full-public-schema.sql` |
| `DELETE FROM public.step_up_tokens WHERE expires_at < (now() - interval '1 day');` | `recovery/full-public-schema.sql` |
| `SET idle_in_transaction_session_timeout = 0;` | `recovery/full-public-schema.sql` |
| `SET lock_timeout = 0;` | `recovery/full-public-schema.sql` |
| `SET statement_timeout = 0;` | `recovery/full-public-schema.sql` |
| `SET transaction_timeout = 0;` | `recovery/full-public-schema.sql` |
| `WHERE blocked = true AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL` | `recovery/full-public-schema.sql` |
| `WHERE created_at > now() - interval '1 hour' AND ip_address IS NOT NULL` | `recovery/full-public-schema.sql` |
| `WHERE d.delivered_at > now() - interval '1 hour'` | `recovery/full-public-schema.sql` |
| `WHERE delivered_at < now() - interval '90 days'` | `recovery/full-public-schema.sql` |
| `WHERE occurred_at < now() - interval '90 days'` | `recovery/full-public-schema.sql` |
| `WHERE received_at < now() - interval '90 days'` | `recovery/full-public-schema.sql` |
| `WHERE success = false AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL AND ip_address <> 'unknown'` | `recovery/full-public-schema.sql` |
| `WHERE updated_at > now() - interval '30 days'` | `recovery/full-public-schema.sql` |
| `WHERE user_id = _uid AND created_at > (now() - interval '1 hour');` | `recovery/full-public-schema.sql` |
| `AND cth.tested_at > now() - interval '7 days'` | `recovery/patches/D1.2_optimization_queue/patch.sql` |
| `WHERE updated_at > now() - interval '30 days'` | `recovery/patches/D1.5_dashboard_widgets/patch.sql` |
| `WHERE d.delivered_at > now() - interval '1 hour'` | `recovery/patches/D2.2_webhooks_extra/functions.sql` |
| `WHERE delivered_at < now() - interval '90 days'` | `recovery/patches/D2.2_webhooks_extra/functions.sql` |
| `WHERE occurred_at < now() - interval '90 days'` | `recovery/patches/D2.2_webhooks_extra/functions.sql` |
| `WHERE received_at < now() - interval '90 days'` | `recovery/patches/D2.2_webhooks_extra/functions.sql` |
| `next_month DATE := date_trunc('month', now() + interval '1 month');` | `recovery/patches/D2.2_webhooks_extra/functions.sql` |
| `next_month_end DATE := date_trunc('month', now() + interval '2 month');` | `recovery/patches/D2.2_webhooks_extra/functions.sql` |
| `AND created_at > now() - interval '1 minute';` | `recovery/patches/D2.5_telemetry/patch.sql` |
| `baseline_window_end timestamptz := now() - interval '24 hours';` | `recovery/patches/D2.5_telemetry/patch.sql` |
| `baseline_window_start timestamptz := now() - interval '26 hours';` | `recovery/patches/D2.5_telemetry/patch.sql` |
| `current_window_start timestamptz := now() - interval '2 hours';` | `recovery/patches/D2.5_telemetry/patch.sql` |
| `AND created_at > now() - interval '1 hour';` | `recovery/patches/D4.1_step_up_mfa/functions.sql` |
| `DELETE FROM public.step_up_challenges WHERE expires_at < (now() - interval '1 day');` | `recovery/patches/D4.1_step_up_mfa/functions.sql` |
| `DELETE FROM public.step_up_tokens WHERE expires_at < (now() - interval '1 day');` | `recovery/patches/D4.1_step_up_mfa/functions.sql` |
| `WHERE user_id = _uid AND created_at > (now() - interval '1 hour');` | `recovery/patches/D4.1_step_up_mfa/functions.sql` |
| `_exp := now() + interval '5 minutes';` | `recovery/patches/D4.1_step_up_mfa/functions.sql` |
| `AND created_at > now() - interval '1 hour'` | `recovery/patches/D4.6_security_auth/functions.sql` |
| `AND created_at > now() - interval '20 hours'` | `recovery/patches/D4.6_security_auth/functions.sql` |
| `WHERE blocked = true AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL` | `recovery/patches/D4.6_security_auth/functions.sql` |
| `WHERE created_at > now() - interval '1 hour' AND ip_address IS NOT NULL` | `recovery/patches/D4.6_security_auth/functions.sql` |
| `WHERE success = false AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL AND ip_address <> 'unknown'` | `recovery/patches/D4.6_security_auth/functions.sql` |
| `_expires timestamptz := now() + interval '6 hours';` | `recovery/patches/D4.6_security_auth/functions.sql` |
| `WHERE delivered_at < now() - interval '90 days'` | `recovery/patches/D6_advisor_fixes/patch.sql` |
| `WHERE occurred_at < now() - interval '90 days'` | `recovery/patches/D6_advisor_fixes/patch.sql` |
| `WHERE received_at < now() - interval '90 days'` | `recovery/patches/D6_advisor_fixes/patch.sql` |
| `setTimeout(() => setCopied(null), 1500);` | `recovery/src-legacy/src/components/admin/telemetry/BridgeCallDetailDrawer.tsx` |
| `setTimeout(() => setCopied(false), 2500);` | `recovery/src-legacy/src/components/compare/ShareComparisonDialog.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `recovery/src-legacy/src/components/favorites/ShareListDialog.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `recovery/src-legacy/src/components/pricing/simulator/PriceResultV51.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `recovery/src-legacy/src/components/pricing/simulator/QuantityAndResult.tsx` |
| `staleTime: 30 * 60 * 1000, // Matching useProductsCatalog staleTime` | `recovery/src-legacy/src/hooks/useCatalogPrefetch.ts` |
| `gcTime: 60 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useCatalogRealStats.ts` |
| `staleTime: 30 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useCatalogRealStats.ts` |
| `setTimeout(() => fetchNextPage(), 1000);` | `recovery/src-legacy/src/hooks/useCatalogState.ts` |
| `staleTime: 30 * 60 * 1000, // 30 min (dados estáveis)` | `recovery/src-legacy/src/hooks/useCategories.ts` |
| `staleTime: 30 * 60 * 1000, // 30 min (dados estáveis)` | `recovery/src-legacy/src/hooks/useCategoryIcons.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useClientTopProducts.ts` |
| `gcTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useColorEnrichment.ts` |
| `gcTime: 24 * 60 * 60 * 1000, // 24 horas` | `recovery/src-legacy/src/hooks/useColorSystem.ts` |
| `staleTime: 60 * 60 * 1000, // 1 hora` | `recovery/src-legacy/src/hooks/useColorSystem.ts` |
| `gcTime: 1000 * 60 * 60, // 1 hora` | `recovery/src-legacy/src/hooks/useCommemorativeDates.ts` |
| `"24h": 24 * 60 * 60_000,` | `recovery/src-legacy/src/hooks/useConnectionsOverviewFilters.ts` |
| `"7d": 7 * 24 * 60 * 60_000,` | `recovery/src-legacy/src/hooks/useConnectionsOverviewFilters.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useCrmCompanies.ts` |
| `staleTime: 15 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useCrmCompanies.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useCrmCompanies.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useExternalCollections.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutos` | `recovery/src-legacy/src/hooks/useExternalCollections.ts` |
| `gcTime: 60 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useExternalVariantStock.ts` |
| `staleTime: 15 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useExternalVariantStock.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useGravacaoPriceV2.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useGravacaoV2.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useKitBuilderQueries.ts` |
| `staleTime: 2 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useKitStockForecast.ts` |
| `const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();` | `recovery/src-legacy/src/hooks/useLoginAttempts.ts` |
| `const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `recovery/src-legacy/src/hooks/useLoginAttempts.ts` |
| `const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes` | `recovery/src-legacy/src/hooks/useLoginRateLimit.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useMarketIntelligenceMacro.ts` |
| `gcTime: 30 * 60 * 1000, // 30 minutos` | `recovery/src-legacy/src/hooks/useMaterialGroups.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutos` | `recovery/src-legacy/src/hooks/useMaterialGroups.ts` |
| `gcTime: 30 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useMaterialTypes.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useMaterialTypes.ts` |
| `setTimeout(() => setShowDraftRestoredNotice(false), 5000);` | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useMockupTechniques.ts` |
| `const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));` | `recovery/src-legacy/src/hooks/useNovelties.ts` |
| `staleTime: 2 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useNovelties.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useNovelties.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/usePrintAreas.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/usePrintAreas.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductCustomizationOptions.ts` |
| `staleTime: 15 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductImages.ts` |
| `staleTime: 15 * 60 * 1000, // Aumentado para 15 min (dados estáveis)` | `recovery/src-legacy/src/hooks/useProductImages.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductInsights.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductRecommendations.ts` |
| `staleTime: 15 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductRecommendations.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductRecommendations.ts` |
| `gcTime: 30 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProducts.ts` |
| `gcTime: 60 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProducts.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProducts.ts` |
| `staleTime: 15 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProducts.ts` |
| `gcTime: 10 * 60 * 1000, // 10 minutos` | `recovery/src-legacy/src/hooks/useProductsByMaterial.ts` |
| `staleTime: 2 * 60 * 1000, // 2 minutos` | `recovery/src-legacy/src/hooks/useProductsByMaterial.ts` |
| `gcTime: 120 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductsLightweight.ts` |
| `staleTime: 30 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProductsLightweight.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useProdutoRamoAtividade.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/usePromoSalesRanking.ts` |
| `const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));` | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| `setValidUntil(quote.valid_until \|\| format(addDays(new Date(), 30), 'yyyy-MM-dd'));` | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| `return sum + (end - start) / (1000 * 60 * 60 * 24);` | `recovery/src-legacy/src/hooks/useQuoteFunnel.ts` |
| `gcTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useRBAC.tsx` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useRBAC.tsx` |
| `setTimeout(() => { if (lastAddedRef.current === productId) { lastAddedRef.current = null; } }, 1000);` | `recovery/src-legacy/src/hooks/useRecentlyViewed.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSalesHistory.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSalesHistoryMacro.ts` |
| `return new Date(now.getTime() + 24 * 60 * 60 * 1000);` | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| `return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);` | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| `gcTime: 30 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSimilarProducts.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSimilarProducts.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| `setTimeout(() => { saveToCloudMutation.mutate(updated); }, 2000);` | `recovery/src-legacy/src/hooks/useSimulatorPreferences.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutes` | `recovery/src-legacy/src/hooks/useSimulatorPreferences.ts` |
| `gcTime: 120 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSparklineSales.tsx` |
| `staleTime: 60 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSparklineSales.tsx` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useStockHistory.ts` |
| `staleTime: 30 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useStockHistory.ts` |
| `{ enabled: !!product && !!categoryName, staleTime: 10 * 60 * 1000 }` | `recovery/src-legacy/src/hooks/useSupplierComparison.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useSupplierFiscalData.ts` |
| `staleTime: 60 * 60 * 1000, // 1h cache — supplier names rarely change` | `recovery/src-legacy/src/hooks/useSupplierNames.ts` |
| `staleTime: 10 * 60 * 1000, // 10 min cache` | `recovery/src-legacy/src/hooks/useSupplierSalesRanking.ts` |
| `staleTime: 10 * 60 * 1000, // 10 min cache` | `recovery/src-legacy/src/hooks/useSupplierTrust.ts` |
| `gcTime: 30 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useVariantStock.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useVariantStock.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/useVariantSupplierSources.ts` |
| `const aRecency = 1 / (1 + (now - a.lastUsed.getTime()) / (1000 * 60 * 60 * 24));` | `recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts` |
| `const bRecency = 1 / (1 + (now - b.lastUsed.getTime()) / (1000 * 60 * 60 * 24));` | `recovery/src-legacy/src/hooks/useVoiceCommandHistory.ts` |
| `staleTime: 10 * 60 * 1000,` | `recovery/src-legacy/src/hooks/gravacao/useFornecedoresGravacao.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/hooks/gravacao/useVariantesGravacao.ts` |
| `staleTime: 5 * 60 * 1000,` | `recovery/src-legacy/src/pages/ProductDetail.tsx` |
| `s.setValidUntil(data.validUntil \|\| format(addDays(new Date(), 30), 'yyyy-MM-dd'));` | `recovery/src-legacy/src/pages/QuoteBuilderPage.tsx` |
| `setTimeout(() => { navigate('/'); }, 3000);` | `recovery/src-legacy/src/pages/ResetPassword.tsx` |
| `startDate = subMonths(startOfMonth(now), 11);` | `recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| `startDate = subMonths(startOfMonth(now), 2);` | `recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| `const timer = setTimeout(() => setAnnouncement(null), 1000);` | `src/components/a11y/AccessibilityProvider.tsx` |
| `const timer = setTimeout(() => setAssertiveMessage(''), 1000);` | `src/components/a11y/AriaLive.tsx` |
| `const timer = setTimeout(() => setPoliteMessage(''), 1000);` | `src/components/a11y/AriaLive.tsx` |
| `const timer = setTimeout(() => setProgressMessage(''), 1500);` | `src/components/a11y/AriaLive.tsx` |
| `const timer = setTimeout(() => setStatusMessage(''), 1000);` | `src/components/a11y/AriaLive.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/access/DevAccessDeniedPage.tsx` |
| `const t = setTimeout(() => setHighlightId(null), 2500);` | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` |
| `const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;` | `src/components/admin/connections/ConnectionTimelineDrawer.tsx` |
| `setTimeout(() => setCopied(false), 1500);` | `src/components/admin/connections/FieldSourceDrillDownDialog.tsx` |
| `const dayMs = 24 * 60 * 60 * 1000;` | `src/components/admin/connections/InboundEventsPanel.tsx` |
| `const since = new Date(Date.now() - PERIOD_HOURS[period] * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/InboundEventsPanel.tsx` |
| `const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `const sinceLastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `const maxMs = FULL_SCOPE_MAX_TTL_DAYS * 24 * 60 * 60 * 1000;` | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| `const days = Math.floor(ms / (24 * 60 * 60 * 1000));` | `src/components/admin/connections/McpTab.tsx` |
| `const t = window.setTimeout(() => { ping(); }, 1200);` | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| `const TTL_MS = 30 * 60 * 1000; // 30 minutos` | `src/components/admin/connections/useFocusContext.ts` |
| `const WINDOW_MS = 72 * 60 * 60 * 1000;` | `src/components/admin/connections/useIncidentTimeline72h.ts` |
| `const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/useRecentIncidents.ts` |
| `normTimerRef.current = setTimeout(() => setLastNormalization(null), 4000);` | `src/components/admin/connections/useSecretField.ts` |
| `const SNOOZE_MS = 60 * 60 * 1000; // 1h` | `src/components/admin/connections/useSeverityChangeNotifier.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/components/admin/personalization/usePersonalizationData.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/components/admin/personalization-manager/usePersonalizationManager.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/components/admin/product-groups/useProductGroups.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/ProductMaterialsSection.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/ProductRamosSection.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/ProductTagsSection.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/ProductVariationAxesConfig.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/useProductVariants.ts` |
| `Date.now() - draft.savedAt > 24 * 60 * 60 * 1000 \|\|` | `src/components/admin/products/hooks/useProductFormDraft.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/kit-components/ComponentMediaManager.tsx` |
| `gcTime: 15 * 60 * 1000,` | `src/components/admin/products/kit-components/PrintAreasManager.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/kit-components/PrintAreasManager.tsx` |
| `gcTime: 15 * 60 * 1000,` | `src/components/admin/products/kit-components/ProductKitComponentsSection.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/kit-components/ProductKitComponentsSection.tsx` |
| `const diff = Math.round((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));` | `src/components/admin/products/sections/ProductFlagsSection.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/admin/products/sections/engraving/useEngravingWizard.ts` |
| `setTimeout(() => { cleanup(); resolve(null); }, 10000);` | `src/components/admin/products/video-gallery/types.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/video-gallery/useProductVideoGallery.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/video-gallery/useProductVideoGallery.ts` |
| `const next = new Date(base.getTime() + 24 * 60 * 60 * 1000);` | `src/components/admin/security/ActiveIpsList.tsx` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/AnomalyCards.tsx` |
| `const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/AutoDefenseTab.tsx` |
| `const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/HardeningTrendChart.tsx` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/TopOffenderIpsCard.tsx` |
| `const days = Math.floor(ms / (24 * 60 * 60 * 1000));` | `src/components/admin/security/keys/McpKeyRow.tsx` |
| `const maxMs = FULL_SCOPE_MAX_TTL_DAYS * 24 * 60 * 60 * 1000;` | `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx` |
| `c1h: countInWindow(rows, source, 60 * 60 * 1000),` | `src/components/admin/telemetry/QuoteBuilderHandoffCard.tsx` |
| `c24h: countInWindow(rows, source, 24 * 60 * 60 * 1000),` | `src/components/admin/telemetry/QuoteBuilderHandoffCard.tsx` |
| `c7d: countInWindow(rows, source, 7 * 24 * 60 * 60 * 1000),` | `src/components/admin/telemetry/QuoteBuilderHandoffCard.tsx` |
| `const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/telemetry/QuoteBuilderHandoffCard.tsx` |
| `'1h': 5 * 60 * 1000,` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `'24h': 60 * 60 * 1000,` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `'6h': 30 * 60 * 1000,` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `'7d': 6 * 60 * 60 * 1000,` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/bi/BundleSuggestions.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/bi/ClientLookalikes.tsx` |
| `staleTime: 15 * 60 * 1000,` | `src/components/cart/CartCompanyPicker.tsx` |
| `staleTime: 15 * 60 * 1000,` | `src/components/cart/CartCompanyPickerDialog.tsx` |
| `closeTimerRef.current = setTimeout(() => { if (mountedRef.current) { onOpenChange(false); onDone?.(); } }, 1000);` | `src/components/catalog/BulkAddToCartModal.tsx` |
| `staleTime: 30 * 60 * 1000,` | `src/components/collections/CollectionsEmptyStateSmart.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/collections/CollectionsHeatmap.tsx` |
| `const CACHE_TTL_MS = 30 * 60 * 1000;` | `src/components/compare/AIComparisonAdvisor.tsx` |
| `const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/compare/PriceSparkline.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/compare/SimilarProductsRail.tsx` |
| `this.copyTimer = setTimeout(() => { this.copyTimer = null; this.setState({ copied: false }); }, 2000);` | `src/components/errors/EnhancedErrorBoundary.tsx` |
| `setTimeout(() => setCopiedId(null), 2000);` | `src/components/expert/chat/useExpertChat.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/favorites/FavoritesClientPicker.tsx` |
| `staleTime: 30 * 60 * 1000,` | `src/components/favorites/FavoritesEmptyStateSmart.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/favorites/FavoritesHeatmap.tsx` |
| `const WINDOW_MS = 5 * 60 * 1000;` | `src/components/intelligence/RealtimeBadge.tsx` |
| `const horizon = now + FUTURE_STOCK_WINDOW_DAYS * 24 * 60 * 60 * 1000;` | `src/components/inventory/StockDashboard.tsx` |
| `setTimeout(() => setLastError(null), 3000);` | `src/components/kit-builder/ItemSelector.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/kit-builder/KitMakerLanding.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/kit-builder/VariantSelector.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/mockup/MockupClientSelector.tsx` |
| `(Date.now() - new Date(mockup.created_at).getTime()) / (1000 * 60 * 60 * 24);` | `src/components/mockup/MockupHistoryPanel.tsx` |
| `const timer = setTimeout(() => setShowSuccess(false), 2400);` | `src/components/mockup/MockupResultCard.tsx` |
| `setTimeout(resolve, 8000);` | `src/components/mockup/approval/OffscreenLayoutCapture.tsx` |
| `const timer = setTimeout(() => setShouldShake(false), 1000);` | `src/components/notifications/NotificationDrawer.tsx` |
| `window.setTimeout(() => el.removeAttribute('data-jump-flash'), 1500);` | `src/components/notifications/NotificationsBadgeStatsPanel.tsx` |
| `setTimeout(() => URL.revokeObjectURL(url), 1000);` | `src/components/notifications/badge-stats/utils.ts` |
| `staleTime: 10 * 60 * 1000, // 10 minutos` | `src/components/personalization/TechniqueSelector.tsx` |
| `cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);` | `src/components/presentation/PresentationMode.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/pricing/ProductPriceSimulator.tsx` |
| `setTimeout(() => setCopied(null), 2000);` | `src/components/pricing/simulator/MultiEngravingResult.tsx` |
| `(1000 * 60 * 60 * 24),` | `src/components/products/FutureStockModal.tsx` |
| `return !isBefore(entryDate, todayStart) && isBefore(entryDate, addDays(todayStart, 31));` | `src/components/products/FutureStockModal.tsx` |
| `return !isBefore(entryDate, todayStart) && isBefore(entryDate, addDays(todayStart, 8));` | `src/components/products/FutureStockModal.tsx` |
| `return !isBefore(entryDate, todayStart) && isBefore(entryDate, addDays(todayStart, 91));` | `src/components/products/FutureStockModal.tsx` |
| `setTimeout(() => { setIsAdded(false); setIsOpen(false); setQuantity(minQuantity); setSelectedVariant(undefined); setCreatingNewCart(false); }, 1200);` | `src/components/products/QuickAddToQuote.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/products/RelatedProducts.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/products/ShareActions.tsx` |
| `const DRAFT_TTL_MS = 1000 * 60 * 60 * 24; // 24h` | `src/components/products/customization/LocationPanel.tsx` |
| `controlsTimeoutRef.current = window.setTimeout(() => { if (isPlaying) setShowControls(false); }, 2800);` | `src/components/products/gallery/usePromoFlixPlayer.ts` |
| `setTimeout(() => setCopied(false), 1500);` | `src/components/products/kit-composition/KitComponentCard.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/quotes/CompanyContactSelector.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/quotes/CompanyContactSelector.tsx` |
| `setTimeout(() => triggerPrint('watchdog'), 3000);` | `src/components/quotes/PdfGenerationDialog.tsx` |
| `idleTimerRef.current = setTimeout(() => { if (mountedRef.current) setStatus('idle'); }, 2000);` | `src/components/quotes/QuoteAutoSave.tsx` |
| `staleTime: 15 * 60 * 1000,` | `src/components/quotes/company-contact/CompanySearchDropdown.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/quotes/company-contact/CompanySearchDropdown.tsx` |
| `const timer = setTimeout(() => setBootingTimedOut(true), 10000);` | `src/components/search/VoiceSearchOverlay.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/security/TwoFactorSetup.tsx` |
| `const buffer = 5 * 60 * 1000;` | `src/contexts/AuthContext.tsx` |
| `const warningTime = timeToExpiry - 2 * 60 * 1000;` | `src/contexts/AuthContext.tsx` |
| `return Math.max(0, Math.floor((Date.now() - updated) / (1000 * 60 * 60 * 24)));` | `src/hooks/useReplenishments.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/hooks/useReplenishments.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useReplenishments.ts` |
| `const ipTimeout = setTimeout(() => ipCtrl.abort(), 5000);` | `src/hooks/admin/useIPValidation.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/admin/useSystemSettings.ts` |
| `const bucketMs = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;` | `src/hooks/admin/useV4Callbacks.ts` |
| `return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/admin/useV4Callbacks.ts` |
| `const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/auth/useLoginAttempts.ts` |
| `const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/auth/useLoginAttempts.ts` |
| `const timeout = setTimeout(() => controller.abort(), 8000);` | `src/hooks/auth/usePasswordBreachCheck.tsx` |
| `gcTime: 10 * 60 * 1000,` | `src/hooks/auth/useRBAC.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/auth/useRBAC.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/bi/useClientAffinity.ts` |
| `const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;` | `src/hooks/bi/useClientCategoryAffinity.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/bi/useClientCategoryAffinity.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/bi/useClientOrdersHistory.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/bi/useClientSeasonality.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/bi/useClientVsIndustry.ts` |
| … +381 linhas — lista completa em `context.json` | |

### H.3 Limites de paginação

| Limite | Arquivo |
|---|---|
| 50 | `recovery/RealtimeMessagesExample.tsx` |
| 50 | `recovery/src-legacy/src/components/admin/CatalogQualityDashboard.tsx` |
| 1 | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| 50 | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| 1 | `recovery/src-legacy/src/hooks/useCollections.ts` |
| 1 | `recovery/src-legacy/src/hooks/useComparisonSync.ts` |
| 1 | `recovery/src-legacy/src/hooks/useDevAccessAudit.ts` |
| 1 | `recovery/src-legacy/src/hooks/useDiscountApproval.ts` |
| 50 | `recovery/src-legacy/src/hooks/useDuplicateKitDetector.ts` |
| 1 | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| 30 | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| 50 | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| 3 | `recovery/src-legacy/src/hooks/useProductInsights.ts` |
| 20 | `recovery/src-legacy/src/hooks/useProductRecommendations.ts` |
| 200 | `recovery/src-legacy/src/hooks/useQuoteHistory.ts` |
| 200 | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| 500 | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| 1 | `recovery/src-legacy/src/hooks/useQuoteVersions.ts` |
| 500 | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| 50 | `recovery/src-legacy/src/hooks/useRoleMigration.ts` |
| 5000 | `recovery/src-legacy/src/hooks/useSalesHistory.ts` |
| 2000 | `recovery/src-legacy/src/hooks/useSalesHistoryMacro.ts` |
| 5000 | `recovery/src-legacy/src/hooks/useSalesHistoryMacro.ts` |
| 50 | `recovery/src-legacy/src/hooks/useSimilarKits.ts` |
| 50 | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| 50 | `recovery/src-legacy/src/hooks/useWorkspaceNotifications.tsx` |
| 100 | `recovery/src-legacy/src/pages/RateLimitDashboardPage.tsx` |
| 1 | `recovery/src-legacy/src/pages/SystemStatusPage.tsx` |
| 1 | `src/components/admin/DiscountApprovalHeaderBadge.tsx` |
| 100 | `src/components/admin/DiscountNotificationFilterPanel.tsx` |
| 100 | `src/components/admin/MockupPromptManager.tsx` |
| 1 | `src/components/admin/connections/ConnectionErrorDetailsDialog.tsx` |
| 50 | `src/components/admin/connections/ConnectionTimelineDrawer.tsx` |
| 20 | `src/components/admin/connections/ExternalConnectionsSyncLogPanel.tsx` |
| 500 | `src/components/admin/connections/InboundEventsPanel.tsx` |
| 1 | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| 1 | `src/components/admin/connections/LastSyncRunPanel.tsx` |
| 200 | `src/components/admin/connections/useIncidentDetails.ts` |
| 80 | `src/components/admin/connections/useIncidentTimeline72h.ts` |
| 1 | `src/components/admin/connections/usePulseBarStatus.ts` |
| 15 | `src/components/admin/connections/useRecentIncidents.ts` |
| 20 | `src/components/admin/connections/useRecentIncidents.ts` |
| 1 | `src/components/admin/products/new-supplier/useNewSupplierForm.ts` |
| 500 | `src/components/admin/security/ActiveIpsList.tsx` |
| 1000 | `src/components/admin/security/AnomalyCards.tsx` |
| 20 | `src/components/admin/security/AutoDefenseTab.tsx` |
| 50 | `src/components/admin/security/RecentAuditTable.tsx` |
| 20 | `src/components/admin/security/SecureUploadManager.tsx` |
| 2000 | `src/components/admin/security/TopOffenderIpsCard.tsx` |
| 50 | `src/components/admin/security/keys/McpKeyDetailsDrawer.tsx` |
| 200 | `src/components/admin/security/keys/audit/useAutoRevocations.ts` |
| 200 | `src/components/admin/security/keys/audit/useStepUpAttempts.ts` |
| 5 | `src/components/admin/suppliers-manager/useSuppliersManager.ts` |
| 500 | `src/components/admin/telemetry/QuoteBuilderHandoffCard.tsx` |
| 200 | `src/components/admin/users/RoleAuditLogPanel.tsx` |
| 500 | `src/components/collections/CollectionsTrashView.tsx` |
| 1 | `src/components/compare/HistoricalPriceOverlay.tsx` |
| 60 | `src/components/compare/PriceSparkline.tsx` |
| 5 | `src/components/dashboard/RecentKitsWidget.tsx` |
| 2000 | `src/components/intelligence/HotSearchesCard.tsx` |
| 500 | `src/components/intelligence/UnmetDemandCard.tsx` |
| 50 | `src/components/kit-builder/DiscontinuedItemsAlert.tsx` |
| 100 | `src/components/kit-builder/KitSmartSuggestions.tsx` |
| 1 | `src/components/layout/SidebarReorganized.tsx` |
| 1 | `src/components/products/ProductPersonalizationRules.tsx` |
| 50 | `src/components/quotes/MarginInsightBadge.tsx` |
| 5 | `src/components/search/useGlobalSearch.ts` |
| 10 | `src/components/security/useSecurityData.ts` |
| 20 | `src/components/security/useSecurityData.ts` |
| 1 | `src/hooks/admin/useDevAccessAudit.ts` |
| 200 | `src/hooks/admin/useDeviceDetection.ts` |
| 100 | `src/hooks/admin/useKillSwitchObservability.ts` |
| 50 | `src/hooks/admin/useRoleMigration.ts` |
| 1 | `src/hooks/auth/useAccessSecurity.ts` |
| 50 | `src/hooks/auth/useAccessSecurity.ts` |
| 1 | `src/hooks/collections/useCollections.ts` |
| 100 | `src/hooks/collections/useExternalCollections.ts` |
| 500 | `src/hooks/collections/useExternalCollections.ts` |
| 5000 | `src/hooks/collections/useExternalCollections.ts` |
| 1 | `src/hooks/comparison/useComparisonSync.ts` |
| 1 | `src/hooks/intelligence/useGoldSyncStatus.ts` |
| 30 | `src/hooks/intelligence/useMagicUpState.helpers.ts` |
| 50 | `src/hooks/intelligence/useMagicUpState.helpers.ts` |
| 5000 | `src/hooks/intelligence/useSalesHistory.ts` |
| 2000 | `src/hooks/intelligence/useSalesHistoryMacro.ts` |
| 5000 | `src/hooks/intelligence/useSalesHistoryMacro.ts` |
| 50 | `src/hooks/kit-builder/useDuplicateKitDetector.ts` |
| 50 | `src/hooks/kit-builder/useSimilarKits.ts` |
| 1 | `src/hooks/mockup/mockupGenerationService.ts` |
| 200 | `src/hooks/mockup/mockupGenerationService.ts` |
| 0 | `src/hooks/products/useNovelties.helpers.ts` |
| 3 | `src/hooks/products/useProductInsights.ts` |
| 20 | `src/hooks/products/useProductRecommendations.ts` |
| 0 | `src/hooks/products/useProductsColorsBatch.ts` |
| 1 | `src/hooks/products/useSupplierFiscalData.ts` |
| 200 | `src/hooks/products/useSupplierFiscalData.ts` |
| 5 | `src/hooks/products/useSupplierFiscalData.ts` |
| 200 | `src/hooks/products/useVariantSupplierSources.ts` |
| 1 | `src/hooks/quotes/useDiscountApproval.ts` |
| 50 | `src/hooks/quotes/useNextQuoteNumberPreview.ts` |
| 200 | `src/hooks/quotes/useQuoteHistory.ts` |
| 200 | `src/hooks/quotes/useQuoteTemplates.ts` |
| 500 | `src/hooks/quotes/useQuoteTemplates.ts` |
| 1 | `src/hooks/quotes/useQuoteVersions.ts` |
| 1 | `src/hooks/simulation/useGravacaoV2.ts` |
| 100 | `src/hooks/simulation/useGravacaoV2.ts` |
| 1 | `src/hooks/simulation/usePrintAreas.ts` |
| 100 | `src/hooks/simulation/usePrintAreas.ts` |
| 50 | `src/hooks/simulation/usePrintAreas.ts` |
| 50 | `src/hooks/simulation/useSimulation.ts` |
| 100 | `src/hooks/simulation/useTechniquePricing.ts` |
| 20 | `src/hooks/simulator/useWizardDrafts.ts` |
| 0 | `src/hooks/ui/useWorkspaceNotifications.tsx` |
| 1 | `src/lib/cloud-status.ts` |
| 1 | `src/lib/crm-db.ts` |
| 1 | `src/lib/external-db-prewarm.ts` |
| 1 | `src/lib/external-db/rpc-native.ts` |
| 0 | `src/lib/supabase/rls-validator.ts` |
| 1 | `src/lib/supabase/rls-validator.ts` |
| 2000 | `src/pages/admin/AdminCloudflareImagesPage.tsx` |
| 100 | `src/pages/admin/AdminSegurancaAcessoPage.tsx` |
| 200 | `src/pages/admin/AdminSegurancaAcessoPage.tsx` |
| 1000 | `src/pages/admin/KitTemplatesMetricsPage.tsx` |
| 50 | `src/pages/admin/OwnershipAuditAdminPage.tsx` |
| 500 | `src/pages/admin/RlsDenialsAdminPage.tsx` |
| 1 | `src/pages/admin/RolePermissionsPage.tsx` |
| 20 | `src/pages/admin/SellerDiscountLimitsAdminPage.tsx` |
| 2000 | `src/pages/admin/ai-usage/MarketIntelInsightsUsagePanel.tsx` |
| 10 | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| 1000 | `src/pages/admin/telemetry/useOptimizationMetrics.ts` |
| 2000 | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| 5000 | `src/pages/admin/telemetry/useResolveProductsSelectComparison.ts` |
| 500 | `src/pages/admin/telemetry/useTelemetryData.ts` |
| 100 | `src/pages/system/RateLimitDashboardPage.tsx` |
| 1 | `src/pages/system/SystemStatusPage.tsx` |
| 20 | `src/pages/system/SystemStatusPage.tsx` |
| 500 | `src/services/quoteService.ts` |
| 1000 | `supabase/functions/anonymize-user/index.ts` |
| 1 | `supabase/functions/audit-suite/index.ts` |
| 100 | `supabase/functions/bitrix-sync/index.ts` |
| 50 | `supabase/functions/bitrix-sync/index.ts` |
| 1 | `supabase/functions/collections-watcher/index.ts` |
| 500 | `supabase/functions/comparison-price-watcher/index.ts` |
| 1 | `supabase/functions/connection-tester/index.ts` |
| 50 | `supabase/functions/connection-tester/index.ts` |
| 1 | `supabase/functions/connections-health-check/index.ts` |
| 1 | `supabase/functions/connections-hub-audit/index.ts` |
| 1 | `supabase/functions/crm-db-bridge/index.ts` |
| 2 | `supabase/functions/crm-db-bridge/index.ts` |
| 50 | `supabase/functions/crm-db-bridge/index.ts` |
| 1 | `supabase/functions/detect-new-device/index.ts` |
| 1000 | `supabase/functions/e2e-cleanup/index.ts` |
| 10 | `supabase/functions/expert-chat/index.ts` |
| 1000 | `supabase/functions/expert-chat/index.ts` |
| 120 | `supabase/functions/expert-chat/index.ts` |
| 15 | `supabase/functions/expert-chat/index.ts` |
| 200 | `supabase/functions/expert-chat/index.ts` |
| 1 | `supabase/functions/external-db-inspect/index.ts` |
| 1 | `supabase/functions/favorites-watcher/index.ts` |
| 1 | `supabase/functions/health-check/index.ts` |
| 2000 | `supabase/functions/market-intelligence-insights/index.ts` |
| 100 | `supabase/functions/process-scheduled-reports/index.ts` |
| 500 | `supabase/functions/quote-followup-reminders/index.ts` |
| 1 | `supabase/functions/rls-integration-tests/index.ts` |
| 100 | `supabase/functions/secrets-manager/index.ts` |
| 500 | `supabase/functions/send-digest/index.ts` |
| 20 | `supabase/functions/send-scheduled-reports/index.ts` |
| 1000 | `supabase/functions/sync-external-db/index.ts` |
| 1 | `supabase/functions/validate-access/index.ts` |
| 50 | `supabase/functions/visual-search/index.ts` |
| 20 | `supabase/functions/xbz-image-uploader/index.ts` |
| 0 | `supabase/migrations/20260618154428_fix_a_fn_get_product_intelligence_all.sql` |

## I. Regras implícitas em mensagens de erro/validação

| Mensagem | Arquivo |
|---|---|
| Assertion failed: ${message} | `test-hooks-safety.mjs` |
| Assertion failed: ${message} | `test-magazine-fix.mjs` |
| [auth.setup] E21 — login falhou em CI: ${reason} | `e2e/fixtures/auth.setup.ts` |
| [auth.setup] E21 — modo estrito: E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes em CI.\n | `e2e/fixtures/auth.setup.ts` |
| Test failed due to console errors:\n${allErrors.join( | `e2e/fixtures/test-base.ts` |
| Test failed due to critical console warnings:\n${criticalWarnings.join( | `e2e/fixtures/test-base.ts` |
| [requireAuth] E21 — modo estrito: ${reason} em CI. | `e2e/fixtures/test-base.ts` |
| [requireAuth] sessão canônica ausente, inválida ou expirada após auth.setup em CI. | `e2e/fixtures/test-base.ts` |
| [requireLiveDatabaseAuth] ${reason}:  | `e2e/fixtures/test-base.ts` |
| E2E_TEST_PREFIX não permite escopo canônico: ${JSON.stringify(scoped)} | `e2e/fixtures/test-user.ts` |
| E2E_USER_EMAIL não definido — defina nas envs antes de rodar specs autenticados. | `e2e/fixtures/test-user.ts` |
| E2E_USER_PASSWORD não definido. | `e2e/fixtures/test-user.ts` |
| Não foi possível resolver o user_id do usuário de teste — confirme que o storageState autenticado foi carregado e que a página está na origin do app. | `e2e/fixtures/test-user.ts` |
| [loginAs] E21 — modo estrito: E2E_${role.toUpperCase()}_EMAIL/PASSWORD ausentes em CI. | `e2e/helpers/auth.ts` |
| [loginViaUI] Timeout aguardando redirect pós-login.\n | `e2e/helpers/auth.ts` |
| setupAuthedWithCarts:  | `e2e/helpers/cart-setup.ts` |
| Duplicate request detected for ${url} within ${window}ms | `e2e/helpers/consistency.ts` |
| [e2e-resources] ${context} name= | `e2e/helpers/e2e-resources.ts` |
| Nenhum dos seletores visível: ${selectors.join( | `e2e/helpers/forms.ts` |
| Console errors detected:\n${errors.map((e) => e.text).join( | `e2e/helpers/nav.ts` |
| [quotes-layout mirror] divergente do SSOT em  | `e2e/helpers/quotes-layout.ts` |
| JWT expirado | `e2e/helpers/quotes-status-seed.ts` |
| JWT issuer inválido: esperado ${expectedIssuer} | `e2e/helpers/quotes-status-seed.ts` |
| JWT malformado | `e2e/helpers/quotes-status-seed.ts` |
| JWT sem audience authenticated | `e2e/helpers/quotes-status-seed.ts` |
| JWT sem issuer | `e2e/helpers/quotes-status-seed.ts` |
| JWT sub diverge do usuário da sessão | `e2e/helpers/quotes-status-seed.ts` |
| formato desconhecido | `e2e/helpers/quotes-status-seed.ts` |
| role=${payload.role ??  | `e2e/helpers/quotes-status-seed.ts` |
| seed auth falhou: ${detail} | `e2e/helpers/quotes-status-seed.ts` |
| seed auth falhou: anon key ausente | `e2e/helpers/quotes-status-seed.ts` |
| seed auth falhou: organização do usuário não encontrada | `e2e/helpers/quotes-status-seed.ts` |
| seed auth falhou: publishable/anon key inválida (${detail}) | `e2e/helpers/quotes-status-seed.ts` |
| seed auth falhou: sb_secret não pode ser usada no browser | `e2e/helpers/quotes-status-seed.ts` |
| seed auth falhou: sessão canônica ausente em ${storageKey} | `e2e/helpers/quotes-status-seed.ts` |
| seed insert em lote falhou (${insertResp.status}): ${errBody.slice(0, 160)} | `e2e/helpers/quotes-status-seed.ts` |
| seed lookup atingiu o limite de ${maxRows} quotes E2E; execute o cleanup antes de continuar | `e2e/helpers/quotes-status-seed.ts` |
| seed lookup falhou (${response.status}): ${detail.slice(0, 160)} | `e2e/helpers/quotes-status-seed.ts` |
| seed recusou E2E_TEST_PREFIX inseguro: ${JSON.stringify(testPrefix)} | `e2e/helpers/quotes-status-seed.ts` |
| sessão mock não pode acessar o PostgREST real | `e2e/helpers/quotes-status-seed.ts` |
| [e2e] ${envVar} não definida. Este spec fala direto com o banco e NUNCA deve  | `e2e/helpers/require-env-base-url.ts` |
| [e2e] VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY não definida.  | `e2e/helpers/require-env-base-url.ts` |
| [gotoWithRetry] falhou ao navegar para  | `e2e/helpers/waits.ts` |
| [pollUntil] condição não satisfeita em ${timeout}ms | `e2e/helpers/waits.ts` |
| [retry] falhou após ${attempts} tentativas | `e2e/helpers/waits.ts` |
| [waitForTestIdHidden] testid= | `e2e/helpers/waits.ts` |
| [waitForTestIdVisible] testid= | `e2e/helpers/waits.ts` |
| ).or(page.getByText(/erro\|indispon\|tente novamente/i)).first()).toBeVisible({           timeout: 10_000,         });       }     });      test(label( | `e2e/routes/_factories.ts` |
| ).or(page.getByText(/inválid\|erro\|falhou/i)).first().isVisible({ timeout: 8000 }).catch(() => false);       expect(ok).toBe(true);     });      test(label( | `e2e/routes/_factories.ts` |
| ❌ Erro crítico: Rotas não resolvidas detectadas para o papel [${role}]: ${unresolved.join( | `e2e/scripts/generate-fixtures.ts` |
| Não foi possível copiar | `recovery/src-legacy/src/components/admin/telemetry/BridgeCallDetailDrawer.tsx` |
| Falha ao copiar | `recovery/src-legacy/src/components/admin/telemetry/EdgeFunctionLogsPanel.tsx` |
| ; import { Badge } from  | `recovery/src-legacy/src/components/admin/telemetry/PlatformFailureAlertBanner.tsx` |
| Erro ao gerar link: ${(e as Error).message} | `recovery/src-legacy/src/components/collections/ShareCollectionDialog.tsx` |
| Erro ao revogar: ${(e as Error).message} | `recovery/src-legacy/src/components/collections/ShareCollectionDialog.tsx` |
| Erro ao gerar link | `recovery/src-legacy/src/components/compare/ShareComparisonDialog.tsx` |
| Falha ao gerar link público | `recovery/src-legacy/src/components/compare/ShareComparisonDialog.tsx` |
| Faça login para compartilhar | `recovery/src-legacy/src/components/compare/ShareComparisonDialog.tsx` |
| Erro ao exportar CSV: ${(e as Error).message} | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| Erro ao exportar JSON: ${(e as Error).message} | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| Erro ao exportar PDF: ${(e as Error).message} | `recovery/src-legacy/src/components/favorites/ExportFavoritesButton.tsx` |
| Falha ao copiar link | `recovery/src-legacy/src/components/quotes/QuoteRowQuickActions.tsx` |
| Créditos de IA esgotados. Contate o administrador. | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| Erro ao gerar recomendações: ${response.status} ${errText} | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| Limite de requisições excedido. Tente novamente em alguns minutos. | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| Nome do cliente é obrigatório | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| Usuário não autenticado | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| É necessário fornecer pelo menos um produto | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| Cidade já cadastrada | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao adicionar IP | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao adicionar cidade | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao atualizar IP | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao atualizar cidade | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao atualizar configurações | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao remover IP | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao remover cidade | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| IP já cadastrado | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| Erro ao remover | `recovery/src-legacy/src/hooks/useAdminKitTemplates.ts` |
| Erro: ${err.message} | `recovery/src-legacy/src/hooks/useAdminKitTemplates.ts` |
| Erro ao atualizar modelo | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao atualizar provider | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao atualizar roteamento | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao criar modelo | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao criar provider | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao criar roteamento | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao remover modelo | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao remover provider | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Erro ao remover roteamento | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| Not authenticated | `recovery/src-legacy/src/hooks/useAiUsage.ts` |
| Não autenticado | `recovery/src-legacy/src/hooks/useCartTemplates.ts` |
| Failed to fetch category icons: ${error.message} | `recovery/src-legacy/src/hooks/useCategoryIcons.ts` |
| Erro ao buscar grupos de cores: ${groupsResponse.error.message} | `recovery/src-legacy/src/hooks/useColorSystem.ts` |
| Erro ao buscar variações de cores: ${variationsResponse.error.message} | `recovery/src-legacy/src/hooks/useColorSystem.ts` |
| Usuário não autenticado | `recovery/src-legacy/src/hooks/useCommemorativeDates.ts` |
| Erro ao testar conexão | `recovery/src-legacy/src/hooks/useConnectionTester.ts` |
| Não foi possível carregar a lista de empresas. | `recovery/src-legacy/src/hooks/useCrmCompanies.ts` |
| Erro ao alterar destaque | `recovery/src-legacy/src/hooks/useCustomKitPersistence.ts` |
| Erro ao remover: ${err.message} | `recovery/src-legacy/src/hooks/useCustomKitPersistence.ts` |
| Erro ao salvar kit: ${err.message} | `recovery/src-legacy/src/hooks/useCustomKitPersistence.ts` |
| Usuário não autenticado | `recovery/src-legacy/src/hooks/useCustomKitPersistence.ts` |
| Erro ao responder solicitação | `recovery/src-legacy/src/hooks/useDiscountApproval.ts` |
| Erro ao solicitar aprovação | `recovery/src-legacy/src/hooks/useDiscountApproval.ts` |
| Erro Dropbox | `recovery/src-legacy/src/hooks/useDropboxFiles.ts` |
| Erro inesperado. Tente recarregar a página. | `recovery/src-legacy/src/hooks/useErrorHandler.ts` |
| Erro ao criar conversa | `recovery/src-legacy/src/hooks/useExpertConversations.tsx` |
| Erro ao excluir conversa | `recovery/src-legacy/src/hooks/useExpertConversations.tsx` |
| Erro ao atualizar: ${error.message} | `recovery/src-legacy/src/hooks/useExternalCollections.ts` |
| Erro ao criar coleção: ${error.message} | `recovery/src-legacy/src/hooks/useExternalCollections.ts` |
| Erro ao excluir: ${error.message} | `recovery/src-legacy/src/hooks/useExternalCollections.ts` |
| Erro: ${error.message} | `recovery/src-legacy/src/hooks/useExternalCollections.ts` |
| Erro ao inspecionar banco externo | `recovery/src-legacy/src/hooks/useExternalDbInspect.ts` |
| Erro ao atualizar lista: ${e.message} | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| Erro ao criar lista: ${e.message} | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| Erro ao mover: ${e.message} | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| Erro ao salvar: ${e.message} | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| Item não encontrado na lixeira | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| Nada para desfazer | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| Não é possível excluir a lista padrão | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| not-authenticated | `recovery/src-legacy/src/hooks/useFavoriteLists.ts` |
| Volume excedido | `recovery/src-legacy/src/hooks/useKitBuilder.ts` |
| Kit não definido | `recovery/src-legacy/src/hooks/useKitCollaboration.ts` |
| Kit ou usuário inválido | `recovery/src-legacy/src/hooks/useKitCollaboration.ts` |
| Usuário não encontrado para esse email | `recovery/src-legacy/src/hooks/useKitCollaboration.ts` |
| Sugestão incompleta | `recovery/src-legacy/src/hooks/useKitIdentitySuggestion.ts` |
| Erro ao clonar: ${err.message} | `recovery/src-legacy/src/hooks/useKitTemplates.ts` |
| Usuário não autenticado | `recovery/src-legacy/src/hooks/useKitTemplates.ts` |
| Erro: ${e.message} | `recovery/src-legacy/src/hooks/useKitVariants.ts` |
| Kit master não definido | `recovery/src-legacy/src/hooks/useKitVariants.ts` |
| Erro ao baixar imagem | `recovery/src-legacy/src/hooks/useMagicUpGeneration.ts` |
| Imagem gerada, mas não foi salva no histórico. | `recovery/src-legacy/src/hooks/useMagicUpGeneration.ts` |
| Erro ao carregar logo | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Erro ao carregar produtos | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Erro ao salvar Brand Kit | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Erro ao salvar campanha | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Faça login para salvar Brand Kit | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Faça login para salvar campanhas | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Imagem muito grande (máx. 10MB) | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Selecione uma empresa para salvar o Brand Kit | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| Selecione uma imagem válida | `recovery/src-legacy/src/hooks/useMagicUpState.ts` |
| A imagem deve ter no máximo 5MB | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Erro ao carregar dados. Tente novamente. | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Erro ao carregar técnicas. Tente recarregar a página. | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Erro ao converter imagem. Tente usar PNG ou JPG. | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Erro ao excluir mockup | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| O produto selecionado não possui imagem | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Por favor, selecione uma imagem válida | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Selecione empresa, produto, técnica e faça upload de pelo menos um logo | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Erro ao verificar senha | `recovery/src-legacy/src/hooks/usePasswordBreachCheck.tsx` |
| Solicitação não encontrada | `recovery/src-legacy/src/hooks/usePasswordResetRequests.ts` |
| Validade inválida — use 30, 60 ou 90 dias. | `recovery/src-legacy/src/hooks/useProductFreshnessOverride.ts` |
| Preencha o nome do produto antes de gerar. | `recovery/src-legacy/src/hooks/useProductSeoAI.ts` |
| Erro ao adicionar fonte | `recovery/src-legacy/src/hooks/useProductSupplierSources.ts` |
| Erro ao atualizar fonte | `recovery/src-legacy/src/hooks/useProductSupplierSources.ts` |
| Erro ao definir preferencial | `recovery/src-legacy/src/hooks/useProductSupplierSources.ts` |
| Erro ao remover fonte | `recovery/src-legacy/src/hooks/useProductSupplierSources.ts` |
| ,         requireInteraction: type ===  | `recovery/src-legacy/src/hooks/usePushNotifications.tsx` |
| Confirme os preços defasados antes de fechar o orçamento | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| Preencha os campos obrigatórios: ${missing} | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| Selecione uma empresa para salvar o rascunho. | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| Erro ao adicionar comentário | `recovery/src-legacy/src/hooks/useQuoteComments.ts` |
| Erro ao atualizar comentário | `recovery/src-legacy/src/hooks/useQuoteComments.ts` |
| Erro ao remover comentário | `recovery/src-legacy/src/hooks/useQuoteComments.ts` |
| Apenas administradores podem clonar templates entre vendedores | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| Não foi possível atualizar o template | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| Não foi possível clonar o template | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| Não foi possível criar o template | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| Não foi possível excluir o template | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| Template não encontrado | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| Você precisa estar logado para criar templates | `recovery/src-legacy/src/hooks/useQuoteTemplates.ts` |
| Erro ao criar nova versão | `recovery/src-legacy/src/hooks/useQuoteVersions.ts` |
| Orçamento não encontrado | `recovery/src-legacy/src/hooks/useQuoteVersions.ts` |
| Usuário não autenticado | `recovery/src-legacy/src/hooks/useQuoteVersions.ts` |
| Erro ao atualizar orçamento | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao atualizar status | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao carregar orçamento | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao carregar orçamentos | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao criar orçamento | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao duplicar | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao excluir orçamento | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao sincronizar | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao testar webhook | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Falha ao inserir orçamento | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Falha na conexão com N8N | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Orçamento não encontrado | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Usuário não autenticado | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| Erro ao atualizar: ${error.message} | `recovery/src-legacy/src/hooks/useRamoAtividade.ts` |
| Erro ao criar: ${error.message} | `recovery/src-legacy/src/hooks/useRamoAtividade.ts` |
| Erro ao remover: ${error.message} | `recovery/src-legacy/src/hooks/useRamoAtividade.ts` |
| Erro ao atualizar: ${error.message} | `recovery/src-legacy/src/hooks/useRamoAtividadeFilho.ts` |
| Erro ao criar: ${error.message} | `recovery/src-legacy/src/hooks/useRamoAtividadeFilho.ts` |
| Erro ao remover: ${error.message} | `recovery/src-legacy/src/hooks/useRamoAtividadeFilho.ts` |
| Não foi possível salvar o cooldown | `recovery/src-legacy/src/hooks/useRetestCooldownSetting.ts` |
| Erro ao atualizar progresso | `recovery/src-legacy/src/hooks/useSalesGoals.ts` |
| Erro ao criar meta | `recovery/src-legacy/src/hooks/useSalesGoals.ts` |
| Not authenticated | `recovery/src-legacy/src/hooks/useSalesGoals.ts` |
| Erro ao agendar relatório | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| Erro ao atualizar relatório | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| Erro ao excluir relatório | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| Usuário não autenticado | `recovery/src-legacy/src/hooks/useScheduledReports.ts` |
| Erro ao listar credenciais | `recovery/src-legacy/src/hooks/useSecretsManager.ts` |
| Falha ao carregar histórico | `recovery/src-legacy/src/hooks/useSecretsManager.ts` |
| Carrinho não encontrado | `recovery/src-legacy/src/hooks/useSellerCarts.ts` |
| Item não encontrado | `recovery/src-legacy/src/hooks/useSellerCarts.ts` |
| Não autenticado | `recovery/src-legacy/src/hooks/useSellerCarts.ts` |
| Você já tem 3 carrinhos ativos. Finalize ou exclua um antes de criar outro. | `recovery/src-legacy/src/hooks/useSellerCarts.ts` |
| Erro ao definir limite de desconto | `recovery/src-legacy/src/hooks/useSellerDiscountLimits.ts` |
| Erro ao remover limite | `recovery/src-legacy/src/hooks/useSellerDiscountLimits.ts` |
| No valid group IDs | `recovery/src-legacy/src/hooks/useSimilarProducts.ts` |
| Cálculo oficial indisponível para ${fallback} técnica(s). Os valores marcados são estimativas — revise antes de fechar. | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| Dados incompletos | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| Erro ao calcular simulação | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| Erro ao excluir simulação | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| Erro ao salvar simulação | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| Nenhuma simulação para salvar | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| Selecione um produto e pelo menos uma técnica | `recovery/src-legacy/src/hooks/useSimulation.ts` |
| Erro ao salvar template: ${err.message} | `recovery/src-legacy/src/hooks/useTemplateSnapshot.ts` |
| Erro ao remover vínculo | `recovery/src-legacy/src/hooks/useVideoVariantLinks.ts` |
| Erro ao vincular vídeo | `recovery/src-legacy/src/hooks/useVideoVariantLinks.ts` |
|                        data-testid= | `recovery/src-legacy/src/pages/Auth.tsx` |
| Não foi possível restaurar | `recovery/src-legacy/src/pages/CollectionDetailPage.tsx` |
| Erro ao duplicar | `recovery/src-legacy/src/pages/KitLibraryPage.tsx` |
| Erro ao excluir | `recovery/src-legacy/src/pages/KitLibraryPage.tsx` |
| Não autenticado | `recovery/src-legacy/src/pages/KitLibraryPage.tsx` |
| ; import { Badge } from  | `recovery/src-legacy/src/pages/MockupGenerator.tsx` |
| Não foi possível excluir o mockup. Tente novamente. | `recovery/src-legacy/src/pages/MockupGenerator.tsx` |
| Erro ao remover mockup | `recovery/src-legacy/src/pages/MockupHistoryPage.tsx` |
| Erro ao cancelar | `recovery/src-legacy/src/pages/QuoteViewPage.tsx` |
| Erro ao carregar dados | `recovery/src-legacy/src/pages/RolePermissionsPage.tsx` |
| Erro ao salvar | `recovery/src-legacy/src/pages/RolePermissionsPage.tsx` |
| Limite de 3 carrinhos atingido | `recovery/src-legacy/src/pages/SellerCartsPage.tsx` |
| Sem dados | `recovery/src-legacy/src/pages/TrendsPage.tsx` |
| ${itemsSemBitrixId.length} produto(s) excluído(s) da sincronização | `recovery/src-legacy/src/pages/quote-view/QuoteActionHandlers.ts` |
| Empresa sem ID Bitrix24 | `recovery/src-legacy/src/pages/quote-view/QuoteActionHandlers.ts` |
| Nenhum produto com ID Bitrix24 | `recovery/src-legacy/src/pages/quote-view/QuoteActionHandlers.ts` |
| ${itemsSemBitrixId.length} produto(s) excluído(s) da sincronização | `recovery/src-legacy/src/pages/quote-view/QuoteBitrixSync.ts` |
| Empresa sem ID Bitrix24 | `recovery/src-legacy/src/pages/quote-view/QuoteBitrixSync.ts` |
| Nenhum produto com ID Bitrix24 | `recovery/src-legacy/src/pages/quote-view/QuoteBitrixSync.ts` |
| Erro ao gerar PDF | `recovery/src-legacy/src/pages/quote-view/useQuoteViewData.ts` |
| Erro ao sincronizar | `recovery/src-legacy/src/pages/quote-view/useQuoteViewData.ts` |
| --slug=<slug> é obrigatório. | `scripts/append-edge-deploy-receipt.mjs` |
| Opção desconhecida: ${arg}. | `scripts/append-edge-deploy-receipt.mjs` |
| nenhuma tabela Markdown encontrada na seção  | `scripts/append-edge-deploy-receipt.mjs` |
| seção  | `scripts/append-edge-deploy-receipt.mjs` |
| --version=<version> é obrigatório. | `scripts/append-migration-receipt.mjs` |
| Opção desconhecida: ${arg}. | `scripts/append-migration-receipt.mjs` |
| nenhuma tabela Markdown encontrada na seção  | `scripts/append-migration-receipt.mjs` |
| seção  | `scripts/append-migration-receipt.mjs` |
| falha fixture | `scripts/automation.unit.mjs` |
| Manifestos de entrada não possuem o formato esperado | `scripts/build-migration-ledger-manifest.mjs` |
| functions não é array | `scripts/check-edge-zod-ratchet.mjs` |
| public/_headers: linha Content-Security-Policy não encontrada | `scripts/check-headers-mirror.mjs` |
| vercel.json: bloco Content-Security-Policy sem  | `scripts/check-headers-mirror.mjs` |
| vercel.json: nenhum bloco com Content-Security-Policy | `scripts/check-headers-mirror.mjs` |
| [ledger-statements] cutoffVersion inválido em ${path}:  | `scripts/check-ledger-statements-gate.mjs` |
| ${argument} exige um caminho. | `scripts/check-migration-filename-contract.mjs` |
| Baseline de migrations inválida: entries não contém migrations. | `scripts/check-migration-filename-contract.mjs` |
| Baseline de migrations inválida: file_count=${document.file_count} difere de entries=${document.entries.length}. | `scripts/check-migration-filename-contract.mjs` |
| Baseline de migrations inválida: path duplicado: ${path}. | `scripts/check-migration-filename-contract.mjs` |
| Baseline de migrations inválida: path inseguro ou fora do diretório: ${String(path)}. | `scripts/check-migration-filename-contract.mjs` |
| Baseline de migrations inválida: schema_version 2 é obrigatório. | `scripts/check-migration-filename-contract.mjs` |
| Baseline reconciliada inválida: path duplicado: ${path}. | `scripts/check-migration-filename-contract.mjs` |
| Baseline reconciliada inválida: path inseguro ou fora do diretório: ${String(path)}. | `scripts/check-migration-filename-contract.mjs` |
| Baseline reconciliada inválida: schema_version 1 e entries são obrigatórios. | `scripts/check-migration-filename-contract.mjs` |
| Baseline reconciliada inválida: sha256 ausente ou inválido para ${path}. | `scripts/check-migration-filename-contract.mjs` |
| Diretório de migrations não encontrado: ${normalizedPath(migrationsDir)}. | `scripts/check-migration-filename-contract.mjs` |
| Não foi possível ler a baseline de migrations em ${normalizedPath(baselinePath)}: ${error.message} | `scripts/check-migration-filename-contract.mjs` |
| Não foi possível ler a baseline reconciliada em ${normalizedPath(reconciledBaselinePath)}: ${error.message} | `scripts/check-migration-filename-contract.mjs` |
| Opção desconhecida: ${argument}. | `scripts/check-migration-filename-contract.mjs` |
| --base exige um valor. | `scripts/check-migrations-sync-log-gate.mjs` |
| Opção desconhecida: ${argument}. | `scripts/check-migrations-sync-log-gate.mjs` |
| String não terminada | `scripts/check-package-duplicate-scripts.mjs` |
| fixture precisa conter um array rows | `scripts/check-quote-rpc-canonical-readiness.mjs` |
| Não consegui extrair ${label} | `scripts/check-schema-reference-drift.mjs` |
| --summary exige um caminho de saída. | `scripts/check-supabase-migration-ledger.mjs` |
| Argumento inválido: ${arg} | `scripts/check-supabase-migration-ledger.mjs` |
| Uso: node scripts/check-supabase-migration-ledger.mjs <ledger.json> [--summary <saida.json>] | `scripts/check-supabase-migration-ledger.mjs` |
| saída não é JSON nem tabela reconhecida de migration list | `scripts/check-supabase-migration-ledger.mjs` |
| saída vazia do supabase migration list | `scripts/check-supabase-migration-ledger.mjs` |
| --catalog exige um caminho. | `scripts/check-supabase-reference-catalog.mjs` |
| Catálogo Supabase ausente: ${catalogPath} | `scripts/check-supabase-reference-catalog.mjs` |
| ...${err.message}... | `scripts/check-toast-leaks.mjs` |
| ${path} deve ser um array ou um objeto com a chave  | `scripts/check-types-inventory-drift.mjs` |
| --base exige um ref git. | `scripts/check-types-inventory-drift.mjs` |
| --generated exige um arquivo TypeScript. | `scripts/check-types-inventory-drift.mjs` |
| Argumento desconhecido: ${arg} | `scripts/check-types-inventory-drift.mjs` |
| Entrada #${index} da allowlist está incompleta (faltam: ${missing.join( | `scripts/check-types-inventory-drift.mjs` |
| Entrada #${index} da allowlist tem category  | `scripts/check-types-inventory-drift.mjs` |
| Entrada #${index}: member deve ser um array de nomes de propriedades. | `scripts/check-types-inventory-drift.mjs` |
| check-workflow-contracts: falha ao ler ${f}: ${error.message} | `scripts/check-workflow-contracts.mjs` |
| GET ${url} → ${r.status} ${r.statusText} | `scripts/ci-metrics.mjs` |
| ${path}: esperado um array de resultados | `scripts/ci-performance-gate.ts` |
| ACTION_ID_REJECTED | `scripts/diagnose-personalization-artifact.py` |
| ARCHIVE_FORMAT_OR_CRC_ERROR | `scripts/diagnose-personalization-artifact.py` |
| ARCHIVE_IDENTITY_MISMATCH | `scripts/diagnose-personalization-artifact.py` |
| ASSET_DESTINATION_REJECTED | `scripts/diagnose-personalization-artifact.py` |
| AUTHORIZATION_DESTINATION_REJECTED | `scripts/diagnose-personalization-artifact.py` |
| DEADLINE_EXCEEDED | `scripts/diagnose-personalization-artifact.py` |
| DOWNLOAD_SIZE_LIMIT | `scripts/diagnose-personalization-artifact.py` |
| DUPLICATE_ACTION_AFTER | `scripts/diagnose-personalization-artifact.py` |
| DUPLICATE_JSON_KEY | `scripts/diagnose-personalization-artifact.py` |
| … +1248 linhas — lista completa em `context.json` | |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `admin` | `recovery/block04_functions.sql` |
| `dev` | `recovery/block04_functions.sql` |
| `manager` | `recovery/block04_functions.sql` |
| `vendedor` | `recovery/block04_functions.sql` |
| `admin` | `recovery/block16_auth_hooks_validation.sql` |
| `admin` | `recovery/full-public-schema.sql` |
| `dev` | `recovery/full-public-schema.sql` |
| `manager` | `recovery/full-public-schema.sql` |
| `vendedor` | `recovery/full-public-schema.sql` |
| `admin` | `recovery/patches/D4.3_ownership_audit/functions.sql` |
| `dev` | `recovery/patches/D4.3_ownership_audit/functions.sql` |
| `vendedor` | `recovery/patches/D5_misc_cross_cutting/functions.sql` |
| `granted` | `recovery/src-legacy/src/hooks/usePushNotifications.tsx` |
| `dev` | `recovery/src-legacy/src/hooks/useRBAC.tsx` |
| `roleName` | `recovery/src-legacy/src/hooks/useRBAC.tsx` |
| `supervisor` | `recovery/src-legacy/src/hooks/useRBAC.tsx` |
| `perm` | `recovery/src-legacy/src/pages/RolePermissionsPage.tsx` |
| `permissionId` | `recovery/src-legacy/src/pages/RolePermissionsPage.tsx` |
| `role` | `recovery/src-legacy/src/pages/RolePermissionsPage.tsx` |
| `agent` | `src/components/access/DevAccessDeniedPage.tsx` |
| `agente` | `src/components/access/DevAccessDeniedPage.tsx` |
| `string` | `src/components/access/DevAccessDeniedPage.tsx` |
| `supervisor` | `src/components/access/DevAccessDeniedPage.tsx` |
| `vendedor` | `src/components/access/DevAccessDeniedPage.tsx` |
| `vendedor` | `src/components/admin/users/PromotionDialog.tsx` |
| `vendedor` | `src/components/admin/users/UserTable.tsx` |
| `user` | `src/components/ai/AIChat.tsx` |
| `user` | `src/components/ai/AIMockupAssistant.tsx` |
| `assistant` | `src/components/bi/BIAiCopilot.tsx` |
| `user` | `src/components/bi/BIAiCopilot.tsx` |
| `assistant` | `src/components/expert/chat/ChatMessageList.tsx` |
| `user` | `src/components/expert/chat/ChatMessageList.tsx` |
| `assistant` | `src/components/expert/chat/useExpertChat.ts` |
| `user` | `src/components/expert/chat/useExpertChat.ts` |
| `denied` | `src/components/security/PushNotificationSettings.tsx` |
| `admin` | `src/components/security/SecurityDashboard.tsx` |
| `dev` | `src/components/security/SecurityDashboard.tsx` |
| `dev` | `src/hooks/auth/useRBAC.tsx` |
| `roleName` | `src/hooks/auth/useRBAC.tsx` |
| `supervisor` | `src/hooks/auth/useRBAC.tsx` |
| `granted` | `src/hooks/ui/usePushNotifications.tsx` |
| `denied` | `src/lib/sw-register.ts` |
| `granted` | `src/lib/sw-register.ts` |
| `admin` | `src/lib/auth/visibility-scope.ts` |
| `manager` | `src/lib/auth/visibility-scope.ts` |
| `supervisor` | `src/lib/auth/visibility-scope.ts` |
| `admin` | `src/lib/rbac/route-matrix.ts` |
| `dev` | `src/lib/rbac/route-matrix.ts` |
| `vendedor` | `src/pages/admin/AdminPromoverUsuarioPage.tsx` |
| `dev` | `src/pages/admin/AdminRbacRoutesPage.tsx` |
| `public` | `src/pages/admin/AdminRbacRoutesPage.tsx` |
| `roleFilter` | `src/pages/admin/AdminRbacRoutesPage.tsx` |
| `admin` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `dev` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `manager` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `supervisor` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `vendedor` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `perm` | `src/pages/admin/RolePermissionsPage.tsx` |
| `permissionId` | `src/pages/admin/RolePermissionsPage.tsx` |
| `role` | `src/pages/admin/RolePermissionsPage.tsx` |
| `system` | `supabase/functions/_shared/ai-router/anthropic-native.ts` |
| `assistant` | `supabase/functions/_shared/ai-router/google-genai.ts` |
| `system` | `supabase/functions/_shared/ai-router/google-genai.ts` |
| `agente` | `supabase/functions/bi-copilot/index.ts` |
| `agente` | `supabase/functions/categories-api/index.ts` |
| `agente` | `supabase/functions/comparison-ai-advisor/index.ts` |
| `admin` | `supabase/functions/connection-tester/index.ts` |
| `dev` | `supabase/functions/connection-tester/index.ts` |
| `vendedor` | `supabase/functions/crm-db-bridge/index.ts` |
| `r` | `supabase/functions/crm-db-bridge/ownership.ts` |
| `vendedor` | `supabase/functions/crm-db-bridge/ownership.ts` |
| `agente` | `supabase/functions/dropbox-list/index.ts` |
| `user` | `supabase/functions/expert-chat/index.ts` |
| `dev` | `supabase/functions/force-global-logout/index.ts` |
| `dev` | `supabase/functions/github-credentials-test/index.ts` |
| `agente` | `supabase/functions/kit-ai-builder/index.ts` |
| `dev` | `supabase/functions/manage-users/index.ts` |
| `supervisor` | `supabase/functions/manage-users/index.ts` |
| `vendedor` | `supabase/functions/manage-users/index.ts` |
| `supervisor` | `supabase/functions/ownership-audit/index.ts` |
| `agente` | `supabase/functions/quote-sync/index.ts` |
| `admin` | `supabase/functions/rls-integration-tests/index.ts` |
| `dev` | `supabase/functions/rls-integration-tests/index.ts` |
| `dev` | `supabase/functions/secrets-manager/index.ts` |
| `admin` | `supabase/functions/verify-2fa-token/index.ts` |
| `dev` | `supabase/functions/verify-2fa-token/index.ts` |
| `supervisor` | `supabase/functions/verify-2fa-token/index.ts` |
| `admin` | `supabase/migrations/20260425201131_83f9ad4a-ea3e-4bed-ac5e-5bdbd1af3316.sql` |
| `admin` | `supabase/migrations/20260425205426_5eacced4-9096-4fa6-9962-5408341f9d11.sql` |
| `admin` | `supabase/migrations/20260425210505_1fc8fe0f-79ba-412d-81c3-cb95f3cec231.sql` |
| `admin` | `supabase/migrations/20260426013235_0fedab5d-eff1-4186-87e1-9899049fcc1a.sql` |
| `admin` | `supabase/migrations/20260426103109_16f8c3dc-186f-4ba9-ae10-6c73dfc69ee9.sql` |
| `dev` | `supabase/migrations/20260426125603_b96b3daf-08f4-4edd-bf2f-835a6c673dbf.sql` |
| `manager` | `supabase/migrations/20260426125603_b96b3daf-08f4-4edd-bf2f-835a6c673dbf.sql` |
| `vendedor` | `supabase/migrations/20260426125603_b96b3daf-08f4-4edd-bf2f-835a6c673dbf.sql` |
| `admin` | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `dev` | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `supervisor` | `supabase/migrations/20260625161934_78cd08b4-433e-4c14-901f-4c7376321b1c.sql` |
| `supervisor` | `supabase/migrations/20260625195535_reconcile_discount_approval_audit_idempotency_realtime.sql` |
| `supervisor` | `supabase/migrations/20260625221320_prune_dar_audit_dead_code.sql` |
| `admin` | `supabase/migrations/20260629142224_7e644177-527b-4b92-93a3-79ffee40ca4a.sql` |
| `supervisor` | `supabase/migrations/20260629142224_7e644177-527b-4b92-93a3-79ffee40ca4a.sql` |
| `admin` | `supabase/migrations/20260909181000_magazine_add_items_atomic.sql` |
| `admin` | `supabase/migrations/20260909181100_magazine_remove_items_atomic.sql` |
| `admin` | `supabase/migrations/20260909181200_magazine_reorder_items_atomic.sql` |
| `admin` | `supabase/migrations/20260909181300_magazine_duplicate_atomic.sql` |
| `admin` | `supabase/migrations/20260909181400_magazine_update_metadata_atomic.sql` |
| `admin` | `supabase/migrations/20260909190000_magazine_duplicate_remap_page_order.sql` |
| `admin` | `supabase/migrations/20260909190100_magazine_page_order_validation_null_safe.sql` |
| `admin` | `supabase/migrations/20260909190200_magazine_add_items_null_safe.sql` |
| `admin` | `supabase/migrations/20260909190300_magazine_publish_atomic.sql` |
| `admin` | `supabase/migrations/20260909190400_magazine_page_order_numeric_version.sql` |
| `admin` | `supabase/migrations/20260909200000_magazine_hardening_v2.sql` |
| `admin` | `supabase/migrations/20261112120400_fn_insights_cache_count.sql` |
| `admin` | `supabase/migrations/20261112120500_fix_optimization_queue_rpcs_dev_access.sql` |
| `anon` | `tests/edge-functions/live/_live-client.ts` |

## K. Testes como especificação (21084 testes em 2129 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `src/components/products/__tests__/ColorSwatchInlineSelect.exhaustive.test.tsx` | 80 | Suite 1 — ProductColorSwatches engine · S1-01: renderiza todas as cores · S1-02: sem seleção → aria-checked=false em todos · S1-03: sem seleção → sem botão Todos … |
| `src/hooks/mockup/__tests__/mockup-audit.test.ts` | 80 | Analise estatica — useMockupGenerator.ts · T3 — Memory leaks: cleanup de timeouts · historyPushTimeout limpo em cleanup · draftNoticeTimeoutRef criada como useRef … |
| `src/hooks/products/__tests__/useCatalogFiltering.test.ts` | 80 | useCatalogFiltering · should filter by hasCommercialPackaging when filter is active · should return all products when hasCommercialPackaging filter is inactive · should filter kits using category fallback when isKit flag is missing … |
| `src/logic/quotes/__tests__/calculations-clamp.test.ts` | 80 | round2 helper · rounds to 2 decimal places (half-up) · handles zero · handles integers … |
| `src/pages/filters/__tests__/applyProductFilters.simulation.test.ts` | 80 | SIM — invariantes globais sobre combinações · todo resultado é subconjunto do catálogo e sem duplicatas (todas as combinações de 2) · combinar dois filtros nunca aumenta a contagem vs. cada um isolado (AND) · idempotência: aplicar 2x produz o mesmo conjunto … |
| `src/tests/PR1318.exhaustive.test.ts` | 80 | A1 — stockStatus canonicos (hifem) · in-stock → true · low-stock → true · out-of-stock → false … |
| `tests/product-form-improvements.test.ts` | 80 | Schema Structure — Field Existence · has info field: %s · has price/stock field: %s · has physical dimension: %s … |
| `tests/stock-module.test.tsx` | 80 | calculateStockStatus · returns out_of_stock when current is 0 and no transit · returns out_of_stock when current is negative · returns incoming when current is 0 but inTransit > 0 … |
| `tests/stock-performance.test.ts` | 80 | calculateStockStatus · returns out_of_stock when current=0 · returns incoming when current=0 but inTransit>0 · does NOT return critical or low_stock from min (deprecated) … |
| `tests/__deprecated__/bridge/external-db-bridge-telemetry.test.ts` | 80 | external-db-bridge — getResourceGroup · classifies product tables correctly · classifies views correctly · classifies company tables correctly … |
| `tests/components/magic-up-onda5.test.tsx` | 80 | Magic Up Onda 5 components · renderiza Magic Score excelente, origem IA e formato · renderiza Magic Score heurístico crítico sem quebrar recomendações vazias · renderiza checklist com critérios aprovados, reprovados, scores e recomendações … |
| `tests/components/magic-up-result-panel-keyboard.test.tsx` | 80 | MagicUpResultPanel — navegação por teclado (WCAG 2.1.1) · Tab atinge prev → dots → next na ordem do DOM · Enter no dot ativa setActiveVariation com índice correto · Space no dot ativa setActiveVariation com índice correto … |
| `tests/components/intelligence/commercial-intelligence.test.ts` | 80 | getSinceDate logic · should return ISO string for 30 days ago · should handle 0 days (today) · should handle 360 days (1 year) … |
| `tests/components/products/StatsPopover.test.tsx` | 80 | statBadges — Basic scenarios · returns correct structure with 5 stat items · returns all zeros for empty product list · counts a single product correctly … |
| `tests/contracts/migrated-endpoints.contract.test.ts` | 80 | contract: kit-ai-builder · v1 aceita prompt 6-2000 chars · v1 rejeita prompt < 6 → 422 · v2 exige idempotency_key … |
| `tests/lib/external-db-bridge-telemetry.test.ts` | 80 | external-db-bridge — getResourceGroup · classifies product tables correctly · classifies views correctly · classifies company tables correctly … |
| `tests/lib/telemetry-logic.test.ts` | 80 | formatDuration · formats 0ms · formats 1ms · formats 999ms … |
| `tests/lib/theme-presets.test.ts` | 80 | §1 Catálogo THEME_PRESETS · expõe exatamente 19 skins (10 clássicas + 9 GX) · IDs são únicos · todos os presets têm name, description, emoji, swatches[4], light, dark … |
| `tests/scripts/drift-baseline.test.mjs` | 80 | selectReplayMigrations · replaya só o que foi aplicado depois do dump, inclusive versão menor que B · replayFileName · renumera para depois do baseline mantendo o nome original … |
| `src/tests/AUDIT.exhaustive.test.ts` | 76 | FRENTE-1: divergência entre getCatalogStockStatus e getVariationStockStatus · 1000 pares (stock × minQty): zero divergências · valores extremos: Infinity, NaN, -Infinity, null → ambos out-of-stock · getVariationStockStatus: 5000 cenarios aleatorios deterministicos — consistencia com getCatalogStockStatus … |
| `tests/unit/date-utils.test.ts` | 75 | formatDate · formats Date object with default pattern dd/MM/yyyy · formats ISO string with default pattern · formats numeric timestamp with default pattern … |
| `tests/contracts/webhook-contracts.test.ts` | 73 | contract registry · every contract has at least one version · every contract has an endpoint and description · unified validation error envelope (422) … |
| `src/lib/security/__tests__/magazine-guard.test.ts` | 71 | validateBranding — clientLogoUrl · aceita https:// válida · aceita https:// com path e query · rejeita http:// (requer https) … |
| `src/components/pdf/__tests__/PdfGenerationModule.test.ts` | 68 | formatPaymentMethod · mapeia boleto corretamente · mapeia pix_transferencia corretamente · retorna o valor raw se não reconhecido … |
| `tests/hooks/useDiscountApproval.test.ts` | 67 | DiscountApprovalRequest interface · defines all required fields · supports all three statuses · Seller Discount Limit logic … |
| `src/components/shared/__tests__/Clickable.test.tsx` | 66 | Clickable — comportamento core · renderiza como div com role=button e tabIndex=0 por padrão · click de mouse dispara onClick uma vez · Enter dispara onClick + preventDefault … |
| `src/lib/products/__tests__/stock-status.test.ts` | 66 | isProductInStock · sem variações — stockStatus canônico (catálogo, hífen) · in-stock → true (even if stock=0) · low-stock → true … |
| `tests/hooks/quotes/quoteHelpers.freight.test.ts` | 66 | round2 — arredondamento monetário · 1.005 → 1.01 (half-up) · 1.004 → 1.00 (trunca) · 0 → 0 … |
| `tests/hooks/useProductMatch.test.ts` | 65 | normalizeText · lowercases text · removes accents · handles empty string … |
| `tests/scripts/preflight-migration-apply.test.mjs` | 63 | findMigrationFiles · devolve [] quando nenhum arquivo bate com o prefixo · encontra exatamente um arquivo quando o prefixo é único · encontra múltiplos arquivos em colisão de prefixo (caso E10) … |
| `src/contexts/__tests__/SellerCartContext.restoreTelemetry.test.tsx` | 62 | SellerCartContext — telemetria do restoreCart (Undo) · restore_ok — desfechos success \| partial \| deduped · classifica  · classifica  … |
| `tests/e2e/quotes-flow.test.ts` | 60 | E2E Quotes — Status Machine · has 6 statuses · draft → sent is valid · draft → pending is valid … |
| `tests/unit/print-area-grouping.test.ts` | 58 | groupPrintAreasByComponent · returns empty array for empty input · groups area without component_name under  · uses location_name when provided … |
| `tests/e2e/products-catalog.test.ts` | 56 | E2E Catalog — Product Filtering · active only by default · includes inactive when specified · search by name … |
| `tests/pages/AdminTelemetriaPage.test.tsx` | 56 | AdminTelemetriaPage - Rendering · renders page title and description · renders the page shell · renders all 4 stat cards … |
| `tests/e2e/cross-cutting-regression.test.ts` | 55 | Cross-Cutting — Currency Formatting · formats BRL correctly · formats zero · formats large number … |
| `src/hooks/stock/__tests__/stockFetcher.test.ts` | 54 | toNumber · returns numbers as-is · coerces numeric strings · returns the fallback for non-finite / non-numeric values … |
| `tests/utils/product-sorting.test.ts` | 54 | sortProducts · name sort · sorts alphabetically A-Z · handles accented characters correctly … |
| `src/components/inventory/__tests__/stock-pure-components.test.tsx` | 53 | StockBadge · renders %s status label · shows formatted quantity when showQuantity=true · formats large quantity with k suffix … |
| `tests/edge-functions/integration/receive-crm-callback.fuzz.test.ts` | 53 | SOURCE PARITY — código de produção contém as funções esperadas · timingSafeEqual continua constant-time (XOR loop, sem early-return) · verify_jwt=false via config.toml (auth é 100% inline) · usa service_role — nunca ANON — para writes … |
| `tests/regression/freight-quest-regression-suite.test.ts` | 53 | REG-CALC: regressões de cálculo de frete · REG-CALC-01: exatamente 1kg não ultrapassa faixa SEDEX (≤ inclui limite) · REG-CALC-02: 1001g (1.001kg) entra na próxima faixa SEDEX (R$35) · REG-CALC-03: cálculo para 100 kits de 300g = 30kg total → faixa ≤30kg … |
| `tests/rls/critical-tables-rls.test.ts` | 53 | RLS: quotes · has RLS enabled (policies exist) · only allows authenticated users · sellers can only manage their own quotes … |
| `src/components/search/__tests__/VoiceSearchOverlay.test.tsx` | 52 | VoiceSearchOverlay · Rendering · renders when open · does not render when closed … |
| `src/hooks/mockup/__tests__/mockupGenerationService.test.ts` | 52 | getTechniquePrompt · maps known technique codes to their prompts · maps the remaining known codes (uv, sublimacao) · falls back to default for unknown techniques … |
| `tests/components/search/VoiceSearchOverlay.test.tsx` | 52 | VoiceSearchOverlay · Rendering · renders when open · does not render when closed … |
| `tests/e2e/tools-simulator.test.ts` | 51 | E2E Tools — Simulator Wizard · has 4 steps · starts at product · ends at summary … |
| `tests/e2e/kit-builder-flow.test.ts` | 50 | Kit Builder E2E Flow - Box Selection · validates box selection is required before adding items · allows item addition after box selection · prevents proceeding to items step without box … |
| `tests/components/TelemetryCharts.test.tsx` | 46 | TelemetryCharts - Rendering · returns null when no rows · renders chart titles when rows exist · renders bar chart for table distribution … |
| `tests/unit/stock-chart-utils.test.ts` | 46 | seededRandom · returns a value in [0, 1) · is deterministic: same seed produces same result · different seeds produce different results (most of the time) … |
| `tests/edge-functions/integration/freight-quest-webhook-simulation.test.ts` | 45 | webhook-inbound — happy path (v2 envelope) · aceita evento  · webhook-inbound — múltiplas fontes · aceita source= … |
| `e2e/products-module.spec.ts` | 44 | Products Module - Public Access (No Auth) · should redirect to auth when accessing ${route.path} unauthenticated · should display auth page for all product routes · should not expose product catalog data to unauthenticated users … |
| `tests/e2e/admin-module.test.ts` | 44 | E2E Admin — User Management · lists all users · filters active users · filters inactive users … |
| `tests/scripts/check-ledger-statements-gate.test.mjs` | 44 | isCanonicalVersion · aceita exatamente 14 dígitos · rejeita versões não-canônicas (curtas, com sufixo, ou não numéricas) · asStatementsArray … |
| `tests/sw/sw.test.ts` | 44 | sw.js — install/activate · precacheia os critical assets e ativa skipWaiting sem lançar mesmo se um optional falhar · activate remove caches de versões antigas e preserva os atuais · sw.js — predicados de roteamento (extensão base64url, BUG-SW-9) … |
| `tests/utils/color-variant-carousel.test.ts` | 44 | resolveAllMatchingColors — cenários sem match · retorna [] quando activeColorFilter é null · retorna [] quando activeColorFilter é undefined · retorna [] quando groups e variations estão vazios … |
| `tests/utils/image-utils.test.ts` | 44 | image-utils · getCdnUrl · retorna placeholder para URL vazia · troca variante em URLs do Cloudflare … |
| `tests/color-navigation.test.ts` | 43 | buildColorNavParams · builds params with name only · builds params with all fields · skips null/undefined fields … |
| `tests/utils/tailwindRings.interaction.test.tsx` | 43 | hoverRingsOf / ringsByVariant — interação · (I1) hoverRingsOf é estável antes/durante/depois de pointerenter+leave · (I2) focusRingsOf é estável sob Tab e blur programático · (I3) hover e focus-visible NÃO se contaminam no elemento  … |
| `src/components/inventory/__tests__/useStockSelection.test.ts` | 42 | rowKey · gera chave  · chaves diferentes para IDs diferentes · é determinístico … |
| `src/components/cart/__tests__/PopoverQtyInput.test.tsx` | 40 | normalizeQty (regra pura) · aceita inteiros dentro do intervalo · faz clamp acima do máximo · rejeita valores abaixo do mínimo … |
| `src/lib/carts/__tests__/shipping-deadline.test.ts` | 39 | shipping-deadline · daysUntilDeadline · retorna 0 para hoje · retorna 3 para +3 dias … |
| `src/pages/magazine/__tests__/pagination.test.ts` | 39 | paginateMagazine — null/undefined safety · handles null magazine → returns [cover, back-cover] · handles undefined magazine → returns [cover, back-cover] · handles magazine.content = undefined → no crash, no grouping … |
| `tests/e2e/auth-flow.test.tsx` | 39 | E2E Auth — Login Validation · rejects empty email · rejects invalid email format · rejects email without domain … |
| `tests/e2e/phase3-detail-experience.test.ts` | 39 | Phase 3.1 — ProductSizeSelector · builds size options from variations · aggregates stock across same size_code · excludes null/undefined size_codes … |
| `tests/unit/freight-quest/freight-calculations.test.ts` | 39 | FreightEstimator — SEDEX · 0g → R$ 22,50 (faixa ≤ 1kg) · 500g, 1 kit → R$ 22,50 (≤ 1kg) · 1000g, 1 kit → R$ 22,50 (exatamente 1kg, faixa ≤ 1kg) … |
| `e2e/tools-module.spec.ts` | 38 | Tools Module - Public Access (No Auth) · should redirect to auth when accessing ${route.path} unauthenticated · should display auth page for all tool routes · should not expose tool data to unauthenticated users … |
| `src/pages/products/__tests__/applyVoiceFilters.test.ts` | 38 | applyVoiceFilters — mapeamento de filtros de voz · payload vazio não altera o estado · color acumula sem duplicar · category acumula sem duplicar … |
| `tests/e2e/phase2-filters-catalog.test.ts` | 38 | Phase 2.1 — Gender Filter Integration · no filter returns all products · filter masculino · filter feminino … |
| `tests/edge-functions/integration/auth-security.test.ts` | 38 | validate-access · usuário com permissão → 200 + allowed=true · usuário sem permissão → 200 + allowed=false · sem Authorization → 401 … |
| `src/pages/products/seller-carts/__tests__/CartHeader.invariants.fuzz.test.ts` | 37 | Header meta — pluralização e formatação (100+ cenários) · carrinho vazio → 0 SKUs · 0 unidades (sem moeda) · 1 SKU · 1 unidade → singular em ambos · 1 SKU · N>1 unidades → SKU singular, unidades plural … |
| `src/utils/__tests__/br-schemas.test.ts` | 37 | validateCpf (masks) · aceita CPF válido %s · rejeita CPF inválido %s · rejeita todos os dígitos repetidos … |
| `tests/contracts/webhook-scenario-matrix.test.ts` | 37 | WebhookInbound — v1 passthrough · aceita ${label} · body vazio → 400 missing_body · JSON inválido → 400 invalid_json … |
| `tests/e2e/navigation-layout.test.tsx` | 37 | E2E Navigation — Route Registry · has public routes · has protected routes · has admin routes … |
| `tests/e2e/phase1-foundation-types.test.ts` | 37 | Phase 1.1 — ProductColor Type Contract · accepts valid color with all fields · accepts color without optional fields · handles zero stock … |
| `tests/hooks/super-filtro-bugfix-15-22.test.ts` | 37 | BUG-15a — filtro featured · deve incluir apenas produtos com featured=true quando filtro ativo · não deve filtrar quando featured=false no filtro · BUG-15b — filtro isNew via newArrival … |
| `tests/security/security-headers.test.ts` | 37 | Security Headers: HSTS · Strict-Transport-Security is configured · HSTS max-age is at least 1 year (31536000) · HSTS includes includeSubDomains … |
| `tests/unit/masked-suffix.test.ts` | 37 | normalizeMaskedSuffix · returns ???? for null · returns ???? for undefined · returns ???? for empty string … |
| `src/hooks/__tests__/hooks-audit-regression.unit.test.ts` | 36 | STOCK-01 — toNumber utility (base para buildFutureEntries) · converte number para number sem alteracao · converte string numerica corretamente · retorna fallback para NaN e valores invalidos … |
| `tests/e2e/phase4-admin-grid.test.ts` | 36 | Phase 4.1 — Variation Axes Config · detects color-only axes · detects color + size axes · detects all three axes … |
| `tests/lib/kit-builder-volume.test.ts` | 36 | kit-builder volume-calculator · calculateVolume · returns w*h*d · calculateUsableVolume … |
| `tests/e2e/phase5-propagation.test.ts` | 35 | Phase 5.1 — Quote Items with size_code · quote item with color and size · quote item without size (non-apparel) · quote item subtotal calculation … |
| `tests/lib/date-utils.test.ts` | 35 | date-utils · formatDate · formats ISO string with default pattern · formats Date object … |
| `tests/scripts/check-types-inventory-drift.test.mjs` | 35 | extractTypesInventory (TypeScript Compiler API) · rejeita entrada vazia, truncada ou desconhecida: %s · extrai Tables/Views/Functions/Enums por schema e ignora __InternalSupabase · countsOf reduz o inventário a contagens por schema/categoria … |
| `e2e/admin-conexoes-module.spec.ts` | 34 | Admin / Conexões Module - Public Access (No Auth) · should redirect to auth when accessing ${route.path} unauthenticated · should display auth page for all admin routes · should not expose admin/conexoes data to unauthenticated users … |
| `src/components/search/__tests__/searchStates.test.ts` | 34 | GlobalSearchPalette search-state conditions (BUG-GS-02 regression) · empty query (length 0) · shows idle state · does NOT show short-query hint … |
| `src/pages/magazine/__tests__/stepValidation.test.ts` | 34 | validateStep identity · bloqueia se título vazio · bloqueia se título apenas espaços · NÃO bloqueia se título preenchido … |
| `tests/components/kit-builder/FreightEstimator.test.tsx` | 33 | FreightEstimator — tabela transportadora (default) · peso zero → alerta de peso não informado visível · 0g → exibe peso 0.0kg · 1000g (1kg) → faixa ≤5kg = R$ 18,00 … |
| `tests/edge-functions/integration/data-ops.test.ts` | 33 | external-db-bridge · SELECT com tabela válida → 200 + rows · SELECT com filtro WHERE → 200 · INSERT → 200 + inserted_id … |
| `tests/scripts/check-workflow-contracts.test.mjs` | 33 | C1 — permissions · flags workflow without top-level permissions · accepts workflow with top-level permissions · C2 — concurrency … |
| `src/hooks/mockup/__tests__/useMockupDraft.test.ts` | 32 | estado inicial · retorna isSaving=false, isLoading=true, lastSaved=null, error=null · expõe saveDraft, loadDraft, clearDraft como funções · saveDraft — localStorage … |
| `src/hooks/products/__tests__/futureStock.battery.test.ts` | 32 | Estoque Futuro · processStockEntries · gera entradas para todas as variantes do fixture realista · preserva entryIndex (1, 2, 3) mesmo quando entradas anteriores são puladas · ignora quantidades negativas, zero, NaN e datas vazias … |
| `src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts` | 32 | useMagazineReaderState — hidratação inicial · estado zerado quando localStorage vazio · lê bookmarks + lastPage válidos do localStorage · sobrevive a JSON corrompido em bookmarks … |
| `tests/edge-functions/integration/connections.test.ts` | 32 | connections-hub-audit · payload válido · GET sem body → 200 + lista de conexões · POST com connection_id → 200 + audit entries … |
| `tests/integration/freight-quest/webhook-matrix-1000.test.ts` | 32 | matriz 1: todos eventos × todas fontes (v2 envelope) · event=$event source=$source → 200 · matriz 2: todos eventos com envelope v1 · evento  … |
| `tests/unit/freight-quest/quote-shipping-validation.test.ts` | 32 | quoteFormSchema — valid cases · CIF com shippingCost=0 → válido · FOB com shippingCost=0 → válido · FOB_PRE com shippingCost=50 → válido … |
| `tests/ai-usage.test.ts` | 31 | AI Usage - Cost Estimation · calculates Gemini 2.5 Flash cost correctly · calculates Gemini 3 Flash Preview cost correctly · calculates GPT-5 cost correctly … |
| `tests/e2e/performance.test.ts` | 31 | E2E Performance — Lazy Loading · MainLayout lazy loads 12+ components · E2E Performance — Query Limits · app page size < supabase limit … |
| `tests/edge-functions/integration/ai-features.test.ts` | 31 | ai-recommendations · product_id válido → 200 + recomendações · contexto de orçamento → 200 + recomendações contextuais · produto inexistente → 404 … |
| `tests/edge-functions/integration/notifications.test.ts` | 31 | send-notification · notificação válida → 200 + notification_id · notificação broadcast para múltiplos usuários → 200 + count · user_id inexistente → 404 … |
| `tests/lib/date-utils-extended.test.ts` | 31 | formatDate — extended · formats Date object dd/MM/yyyy · formats ISO string · formats timestamp … |
| `tests/unit/quote-status-config.test.ts` | 31 | QUOTE_STATUS_CONFIG shape · defines all 10 expected statuses · every entry has a non-empty label · every entry has a color string … |
| `src/pages/products/seller-carts/__tests__/cartViewModePrefs.test.ts` | 30 | getLocalDateStamp — timezone local · usa componentes de data LOCAL (não UTC) · formata com padding de mês/dia · não depende de toISOString (UTC) … |
| `src/utils/masks.test.ts` | 30 | Utility Masks & Validation · CNPJ Masking & Validation · masks a raw 14-digit string to CNPJ format · masks the reference format 02.931.668/0001-88 … |
| `tests/lib/print-area-grouping.test.ts` | 30 | groupPrintAreasByComponent · groups areas by component and location · puts null component under  · sorts primary areas first within locations … |
| `tests/unit/format-utils.test.ts` | 30 | formatTooltipNumber · returns  · returns  · returns  … |
| `tests/unit/freight-quest/freight-property-based.test.ts` | 30 | property: preço nunca zero ou negativo · método %s: preço > 0 para todo peso e quantidade · property: peso total determinístico · w=%i g × q=%i → totalWeightKg correto … |
| `e2e/reports-bi-module.spec.ts` | 29 | Reports / BI Module - Public Access (No Auth) · should redirect to auth when accessing ${route.path} unauthenticated · should display auth page for all report routes · should not expose BI/report data to unauthenticated users … |
| `e2e/catalog/catalog-search-audit.spec.ts` | 29 | Catálogo · Busca · termos comuns (grade não-vazia + relevância) · busca comum retorna resultados relevantes:  · Catálogo · Busca · SKU exato (bug #1) · busca por SKU encontra o produto:  … |
| `src/components/inventory/__tests__/ri[REDACTED].test.tsx` | 29 | RiskKpi · renders label, value and sub · renders with alert style when alert=true · renders with warning style when warning=true … |
| `src/components/products/__tests__/ColorSwatchTwoLineOverflow.test.tsx` | 29 | V1 ProductColorSwatches (wrap, max=14) · 7 cores → exibe TODAS, sem chip  · 14 cores → exibe TODAS, sem chip  · 20 cores → 13 bolinhas + chip  … |
| `tests/e2e/analytics-bi.test.ts` | 29 | E2E Analytics — BI Metrics · total = approved + rejected + pending · conversion rate is correct · avg ticket = revenue / approved … |
| `tests/lib/kit-builder-price.test.ts` | 29 | kit-builder price-calculator · calculateBoxPrice · returns 0 for null box · multiplies box price by quantity … |
| `tests/lib/masked-suffix.test.ts` | 29 | normalizeMaskedSuffix — paridade de comprimento · 0 chars (null) →  · 1 char  · 2 chars  … |
| `tests/pages/ProductDetail.test.ts` | 29 | mapPromobrindToProduct — full integration · maps basic fields correctly · maps colors with hex, code, images · maps materials from comma-separated string … |
| `tests/scripts/check-migrations-sync-log-gate.test.mjs` | 29 | extractMigrationVersion · extrai o prefixo canônico de 14 dígitos · extrai um prefixo malformado de 19 dígitos (achado real da E09) · devolve null quando o nome não começa com dígitos seguidos de  … |
| `tests/unit/sensitive-masking.test.ts` | 29 | maskSecretValue · masks null with ???? placeholder · masks undefined · masks empty string … |
| `src/components/common/__tests__/IntelligenceBadges.adversarial.test.tsx` | 28 | [A] Toggle OFF — TODOS os 9 tipos desaparecem (data-testid) · OCULTA type= · [B] Toggle ON — TODOS os 9 tipos visíveis (data-testid) · EXIBE type= … |
| `src/components/mockup/__tests__/techniqueColorUtils.test.ts` | 28 | classifyTechnique · detecta  · detecta  · detecta  … |
| `src/components/ui/__tests__/currency-input.test.ts` | 28 | CurrencyInput · round2 · round2(%s) === %s · CurrencyInput · formatBR (pt-BR, 2 casas) · formata com vírgula decimal e ponto de milhar … |
| `src/hooks/__tests__/bug-g7-regression.unit.test.ts` | 28 | BUG-G7 — TooltipTrigger asChild nao envolve Radix composto · nenhum bloco TooltipTrigger asChild contem <Select> · ordem correta dentro do Select: Tooltip -> span wrapper -> SelectTrigger; SelectContent fora do Tooltip · DEFAULT_SORT_VALUE deriva do SSOT (SORT_OPTIONS[0]) … |
| `tests/components/KitComposition.test.tsx` | 28 | KitComposition · renders trigger card with component count · abre o diálogo pelo teclado (%s) · renders header with correct component and piece counts in dialog … |
| `tests/hooks/hooks-audit-bugfix-08-14.test.ts` | 28 | BUG-08 -- polling nao recriado apos fetch · setInterval de 60s criado UMA vez por montagem · polling dispara fetch apos 60s (timer nao resetado) · notificationsLengthRef como dep estavel (sem notifications.length no codigo) … |
| `tests/lib/crm-db-fixed.test.ts` | 28 | invokeCrmDb · bloqueia a ponte antes do invoke quando não há sessão autenticada · returns data on success · throws on edge function error (non-retryable) … |
| `tests/scripts/check-security-definer-audit.test.mjs` | 28 | computeViolations · não sinaliza nada quando rows está vazio · sinaliza proconfig null (sem search_path) · não sinaliza quando o array proconfig contém search_path= … |
| `tests/unit/error-kind-inference.test.ts` | 28 | inferErrorKind · returns null when success=true (regardless of other fields) · returns existing errorKind as-is when already set · returns  … |
| `e2e/catalog/product-sorting.spec.ts` | 27 | Catálogo • Ordenação — Contrato visual e SSOT (G1, G5) · G1 • trigger possui data-testid estável · G1 • dropdown expõe os 9 items com data-testid por value · G5 • trigger desktop tem largura ampliada (sm:w-52) … |
| `e2e/flows/36-freight-dashboard-stress.spec.ts` | 27 | dashboard: carregamento de rotas críticas @smoke · rota  · wizard orçamento: validação de cada botão e transição @freight · botão Próximo desabilitado quando campos obrigatórios ausentes … |
| `src/components/quotes/__tests__/QuoteBuilderSummaryColumn.collapsedHeader.test.ts` | 27 | QuoteBuilderSummaryColumn — header do item (visual/estrutural) · nome do produto força quebra em até 2 linhas (webkit-box + WebkitLineClamp) e não usa truncate · SKU e cor ficam na mesma linha (flex-wrap items-center), cor logo após o código · bloco recolhido exibe Qtd / Vl Unitário / Subtotal empilhados com rótulos uppercase … |
| `src/hooks/common/__tests__/useEntitySelectionMode.test.ts` | 27 | estado inicial · selectedCount=0, sem IDs · modais fechados · selectedProducts vazio … |
| `src/hooks/products/__tests__/useAdvancedFilters.test.ts` | 27 | useAdvancedFilters · estado inicial · BUG-LOADING-01: isLoading inicia false (sem flash de skeleton) · filters iniciam como defaultAdvancedFilters … |
| `src/lib/edge/__tests__/safeInvokeCall.test.ts` | 27 | safeInvokeCall — Onda 17 · ok → kind=ok, data propagada · data=null (204) → ok/null · status=%i → err/%s … |
| `src/lib/quotes/__tests__/collapsedItemsStorage.test.ts` | 27 | normalizeQuoteId · mapeia null/undefined/ · preserva ids reais (e faz trim) · collapsedItemsStorageKey … |
| `src/lib/quotes/__tests__/personalizationSummary.test.ts` | 27 | normalizeColorsCount · normaliza %p → %p · formatColors · singular vs plural … |
| `src/pages/magazine/__tests__/useMagazineEditor.staleRef.test.ts` | 27 | useMagazineEditor — stale ref race condition · restaura rascunho local quando a versão-base ainda coincide · permite reaplicar conscientemente recovery conflitante sobre a versão atual · não restaura sobre versão remota mais nova e permite descartar … |
| `tests/stock-types.test.ts` | 27 | calculateStockStatus · returns out_of_stock when current is 0 · returns incoming when current is 0 but in transit > 0 · does NOT derive critical from min (deprecated) … |
| `tests/e2e/catalog-price-freshness-badge.test.tsx` | 27 | E2E Catálogo — visibilidade do PriceFreshnessBadge por host · Produto FRESH (5d, threshold 60d) — preço dentro do prazo · Card (icon-only) NÃO renderiza badge · EnhancedCard (icon-only) NÃO renderiza badge … |
| `tests/edge-functions/integration/quote-flow.test.ts` | 27 | quote-sync · payload válido · recalculate → 200 + synced=true · action=recalculate com itens → 200 + totals calculados … |
| `tests/unit/trending-score.test.ts` | 27 | calculateTrendingScore · classification boundaries · returns  · returns  … |
| `tests/unit/variant-matching.test.ts` | 27 | normalizeColorName · returns empty string for null · returns empty string for undefined · returns empty string for empty string … |
| `src/components/products/gallery/PromoFlixPlayer.test.tsx` | 26 | PromoFlixPlayer Automated Tests · should initialize volume from localStorage · should initialize playing state from localStorage · should show manual load button after 10s timeout if video is stuck … |
| `src/hooks/quotes/__tests__/useQuoteItems.test.ts` | 26 | estado inicial · items, activeItemIndex e expandedItems iniciam vazios · aceita initialItems como seed · addProductWithColor … |
| `src/lib/quotes/__tests__/expiration.test.ts` | 26 | computeExpiration — casos canônicos · valid_until=%s → diff=%i label=%s tone=%s · computeExpiration — fuso negativo NÃO causa off-by-one (regressão) · +1d em ISO date-only resolve para 1 dia, não 0 … |
| `src/pages/products/__tests__/CartHeaderEdgeCases.test.ts` | 26 | shippingDeadlineSchema — inputs extremos · aceita null (limpar prazo) · trata string vazia como null · rejeita formato inválido (dd/mm/aaaa) … |
| `src/pages/products/seller-carts/__tests__/undoCopy.test.ts` | 26 | undoCopy — SSOT: duração + singular/plural · duração de 8 segundos · UNDO_DURATION_MS é 8000ms (contrato do fluxo Desfazer) · UNDO_DURATION_LABEL é  … |
| `src/utils/__tests__/image-utils.fuzz.test.ts` | 26 | getCdnUrl — fuzz (variantes × formas de URL) · aplica a variante pedida a qualquer URL CDN, com ou sem sufixo prévio (168 casos) · é idempotente: reaplicar variantes nunca acumula sufixos (144 combinações) · não altera URLs fora do CDN (30 casos) … |
| `tests/e2e/profile-user.test.ts` | 26 | E2E Profile — Form Validation · accepts valid profile · rejects empty name · rejects short name … |
| `tests/hooks/useReplenishments.test.ts` | 26 | Replenishment utility functions · isReplenishment · returns true when updated_at is 1+ day after created_at · returns false when updated_at equals created_at (new product) … |
| `tests/lib/external-db-invoke.test.ts` | 26 | extractFunctionErrorMessage · returns message from Error instance · returns generic message for non-Error · aceita envelope compatível de invokeEdge sem exigir instanceof Error … |
| `tests/unit/connection-error-copy.test.ts` | 26 | getErrorCopy · returns timeout copy for kind= · includes timeoutMs in hint when provided · returns network copy for kind= … |
| `src/components/cart/__tests__/cartCompanyCnpj.test.ts` | 25 | resolveCartCompanyCnpj · caminho 1 — CRM entrega CNPJ (fonte preferida) · CNPJ cru (14 dígitos) é mascarado para exibição · CNPJ já mascarado é re-normalizado e mascarado consistentemente … |
| `src/components/inventory/__tests__/product-risk-detail.test.tsx` | 25 | ProductRiskDetail — loading state · renders loading spinner when isLoading=true · ProductRiskDetail — error state · renders error message when summary has error and no data … |
| `src/components/search/__tests__/useGlobalSearch.test.ts` | 25 | useGlobalSearch · expõe estado inicial e sugestões rápidas · limpa resultados para consultas com menos de 3 caracteres sem chamar a IA · busca mista monta resultados de produtos, clientes, orçamentos e tabelas auxiliares … |
| `src/lib/auth/__tests__/post-login-redirect.test.ts` | 25 | clearPostLoginRedirect · remove a chave do sessionStorage quando ela existe · nao lanca erro quando sessionStorage esta vazio · nao lanca erro quando sessionStorage.removeItem lanca excecao … |
| `src/utils/__tests__/cnpj-gap-hunt.test.ts` | 25 | G1 — maskCnpj com input já mascarado não duplica separadores · idempotência: mask(mask(x)) === mask(x) · input parcial mascarado não gera pontuação órfã · G2 — normalizeCnpj com surrogate pairs / emoji / unicode invisível … |
| `tests/components/pages/KitBuilderPage.test.tsx` | 25 | KitBuilderPage · renderiza o passo box (padrão) · renderiza o passo items · renderiza o passo personalization … |
| `tests/contracts/webhooks.contract.test.ts` | 25 | contract: webhook-inbound v1 (passthrough) · aceita qualquer objeto (compat com produção) · aceita array (compat — v1 é any) · body vazio → 400 missing_body … |
| `tests/hooks/voice/retry.test.ts` | 25 | withRetry · returns result on first success · retries on retryable error and succeeds · does not retry on non-retryable error … |
| `tests/integration/magazine-service-fuzz.test.ts` | 25 | magazineService — lifecycle happy path · snapshot legado ao editar título não apaga itens quando INSERT está indisponível · snapshot legado de metadados preserva IDs e ordem dos itens · falha de inclusão rejeita, nunca confirma o snapshot antigo como sucesso … |
| `scripts/__tests__/promote-draft-migration.test.ts` | 24 | parseHandleList · retorna [] para vazio/undefined/null · aceita separador vírgula · aceita separador espaço … |
| `src/hooks/quotes/__tests__/useAutoSaveQuote.test.ts` | 24 | migratePayload · migra payload v1 (sem campo version) para v2 · retorna payload v2 sem modificação (passthrough) · retorna null para versão futura (previne corrupção) … |
| `src/lib/auth/__tests__/resolve-redirect-target.test.ts` | 24 | resolveRedirectTarget — precedência pós-login · 1️⃣ location.state.from vence todas as outras fontes · Google: state.from sobrescreve ?redirect e sessionStorage · E-mail/senha: state.from idem … |
| `src/lib/customization/__tests__/format-engraving-title.test.ts` | 24 | formatEngravingTitle · prioriza nome_tabela quando disponível · usa techniqueName como fallback quando nome_tabela vazio · usa groupName como último fallback antes do default … |
| `src/lib/edge/__tests__/invokeEdge-contracts.integration.test.ts` | 24 | invokeEdge contract — secrets-manager · cache_metrics: sucesso devolve envelope { ok, metrics } · reset_cache_metrics: 403 → error credential, data=null · erro embutido em envelope (200) é preservado para o caller … |
| `tests/fuzz/freight-quest-fuzzer.test.ts` | 24 | fuzz: injeções no campo event · SQL injection em event= · XSS em event= · fuzz: path traversal em campos de texto … |
| `tests/hooks/useSupplierComparison.test.ts` | 24 | useSupplierComparison · should return null when no product is provided · should query by category name when the product has no category id · should pass undefined filters when the product has no category at all … |
| `tests/lib/query-config-extended.test.ts` | 24 | CACHE_TIMES constants · VERY_STABLE is 24 hours · STABLE is 1 hour · TECNICAS is 30 min … |
| `tests/magazine/helpers.test.ts` | 24 | helpers/ringsOf — detecção de rings base · detecta ring-primary e ring-amber-500 na forma canônica · detecta família amber em qualquer shade (400, 500, 600, 700) · detecta ring-primary com opacity (ring-primary/50, ring-primary/70) … |
| `tests/scripts/check-no-db-push.test.mjs` | 24 | ALLOWLIST – new entry from PR · contains the new audit file entry · isAllowed() returns true for the new audit file (exact match) · isAllowed() rejects a path that is a prefix of the new entry … |
| `tests/utils/price-calculator.test.ts` | 24 | calculateBoxPrice · returns 0 for null box · multiplies box price by quantity · defaults quantity to 1 … |
| `src/lib/inventory/__tests__/rupture-risk.test.ts` | 23 | rupture-risk constants · exposes the canonical horizon options · defaults the horizon to 3 days · computeRuptureRisk — precondition guards on current … |
| `src/lib/navigation/__tests__/active-match.test.ts` | 23 | isNavItemActive · highlights on the exact /carrinhos route · highlights on child routes /carrinhos/:id · highlights on deep child routes /carrinhos/:id/editar … |
| `src/lib/security/__tests__/lastInternalRoute.deeplink.test.ts` | 23 | isSafeReturnPath · rejeita rota gated/auth: %s · aceita rota interna segura: %s · rejeita valores não-path (absoluto externo, vazio, null) … |
| `supabase/functions/external-db-bridge/callerSelectIsHeavy.test.ts` | 23 | extractBaseColumn: nome simples · extractBaseColumn: alias PostgREST  · extractBaseColumn: operadores JSON  · extractBaseColumn: alias + JSON op combinados … |
| `tests/components/PriceFreshnessBadge.catalog-visibility.test.tsx` | 23 | PriceFreshnessBadge — visibilidade nos componentes do catálogo · ProductCard / EnhancedProductCard / ProductTableView (variant= · NÃO renderiza quando fresh (preço atualizado dentro de 50% do threshold) · NÃO renderiza quando o status é unknown (data ausente) … |
| `tests/edge-functions/integration/generate-mockup.test.ts` | 23 | generate-mockup · happy path · returns 200 with mockupUrl/mockup_url and a mockup_id · mockupUrl points to a safe https CDN (no javascript:/data:) … |
| `tests/edge-functions/integration/manage-users.test.ts` | 23 | manage-users · listar usuários (GET) · admin recebe 200 com array de usuários · lista não expõe password_hash ou tokens … |
| `tests/edge-functions/integration/webhooks.test.ts` | 23 | webhook-inbound · payload válido · POST com envelope v2 → 200 · idempotência: segundo request com mesma idempotency_key → 200 sem duplicar … |
| `tests/lib/catalog-stock-status.test.ts` | 23 | getCatalogStockStatus — fronteiras do limiar padrão (10) · stock=%s => %s · getCatalogStockStatus — entradas anômalas normalizam para out-of-stock · %s => out-of-stock … |
| `tests/scripts/check-conflict-ledger.test.mjs` | 23 | check-conflict-ledger: comportamento básico (sem bug) · sem GITHUB_BASE_REF/GITHUB_HEAD_REF, pula a verificação com exit 0 · sem commits de merge semântico, passa com exit 0 · commit merge(pr-N): sem atualizar o ledger + --gate => exit 1 … |
| `tests/scripts/check-workflow-contracts-parser.test.mjs` | 23 | hasPullRequestTrigger · %j → %s · C2/C12/C22 agora valem para pull_request_target (gatilho mais perigoso) · comentários não aplicam restrições de PR a um workflow apenas push … |
| `tests/unit/db-retry.test.ts` | 23 | A: erro exato do incidente 403 · B: status no texto (coderabbit Major) · C: UUID contendo dígitos de status · 4403 dentro de UUID não vira permanente … |
| `tests/unit/forecast.test.ts` | 23 | linearRegression · returns zero slope/intercept/std for empty array · returns zero slope for single element (uses element as intercept) · computes slope=0 for a flat series … |
| `tests/utils/masks-extended.test.ts` | 23 | maskCnpj · should format full CNPJ · should handle partial input · should strip non-digits … |
| `src/components/cart/__tests__/SortableCartItemExcellence.test.tsx` | 22 | SortableCartItem Excellence UI · renders product name correctly · renders SKU with correct formatting · renders unit price correctly using PriceLabel … |
| `src/components/inventory/__tests__/stock-category-tree-select.test.tsx` | 22 | StockCategoryTreeSelect — loading state · renders skeleton when isLoading=true · StockCategoryTreeSelect — basic render · renders  … |
| `src/hooks/quotes/__tests__/quoteHelpers.validation.test.ts` | 22 | quoteHelpers validation logic · throws error when percent is > 100 · throws error when amount is > subtotal · throws error when discount is negative … |
| `src/lib/edge/__tests__/invokeExport.test.ts` | 22 | invokeEventsToCSV · gera header + linhas com ISO · escapa vírgula, aspas e quebra de linha · lida com campos ausentes (latencyMs/errorKind/attempts) … |
| `tests/components/PriceFreshnessBadge.colorMatrix.test.tsx` | 22 | PriceFreshnessBadge — matriz cromática + conteúdo pt-BR (status × variant) · variant=inline (PDP / Quick View) · fresh: emerald-700 +  · aging: amber-700 + ainda usa label  … |
| `tests/components/PriceFreshnessBadge.copyAssertions.test.tsx` | 22 | PriceFreshnessBadge — cópia pt-BR exata por variant · variant=inline (PDP / Quick View) · fresh:  · aging:  … |
| `tests/components/kit-builder/KitBuilderComponents.test.tsx` | 22 | KitVisualPreview · renders null when no box · renders box preview with items · shows correct fill color for normal usage … |
| `tests/contracts/product-webhook.contract.test.ts` | 22 | contract: product-webhook v1 (compat com produção) · aceita payload válido (upsert, default v1) · aceita produto com campos opcionais ricos · payload sem body → 400 missing_body … |
| `tests/e2e/favorites-module.test.ts` | 22 | E2E Favoritos — Gestão de Listas · identifica a lista padrão corretamente · valida token de compartilhamento ativo · calcula total de itens entre todas as listas … |
| `tests/e2e/ui-components.test.tsx` | 22 | E2E UI — Button Variants · renders  · default variant renders · E2E UI — Button Sizes … |
| `tests/edge-functions/integration/ai-content-materials-ops.test.ts` | 22 | analyze-logo-colors · returns 200 with a colors array on success · rejects SVG logos with 400 · returns 401 without a token … |
| `tests/edge-functions/integration/ai-recommendations.test.ts` | 22 | ai-recommendations · happy path · retorna 200 com array de recomendações · cada recomendação tem product_id e score numérico … |
| `tests/edge-functions/integration/image-proxy.test.ts` | 22 | image-proxy · proxy de imagem válida · retorna 200 com Content-Type image/* para URL válida · inclui Cache-Control com max-age para imagens … |
| `tests/edge-functions/integration/semantic-search.test.ts` | 22 | semantic-search · busca semântica — happy path · retorna 200 com results array e scores · cada resultado tem product_id e score entre 0 e 1 … |
| `tests/edge-functions/integration/trends-insights.test.ts` | 22 | trends-insights · happy path · retorna 200 com array de trends e metadata · cada trend tem category, growth_pct e rank … |
| `tests/hooks/useSimulatorWizard.test.ts` | 22 | WIZARD_STEPS · has exactly 4 steps in correct order · getStepIndex · returns correct indices … |
| `tests/lib/postgrest-migration.test.ts` | 22 | postgrest helper — table aliases · resolves products → v_products_public · resolves suppliers → v_suppliers_public · postgrest helper — PT↔EN column remap … |
| `tests/lib/rest-native-fallback.test.ts` | 22 | rest-native-fallback: supabase-direct module · resolveTable - alias resolution · resolves products → v_products_public · resolves suppliers → v_suppliers_public … |
| `tests/rls/telemetry-logs-connections-access.test.ts` | 22 | Helpers semânticos — alinhamento com gates primitivos · can_view_audit_logs(${r}) === is_dev(${r}) · can_view_telemetry(${r}) === is_supervisor_or_above(${r}) · can_view_connections(${r}) === is_supervisor_or_above(${r}) … |
| `tests/scripts/check-allowlist-memory-crosscheck.test.mjs` | 22 | .security/ ausente (bug real corrigido) · sai com exit 2 e mensagem ❌ limpa, sem stack trace bruto do Node · exit 2 (erro operacional) é distinto de exit 1 (achado real de cross-check) · .security/ existente e vazio … |
| `tests/unit/catalog-stock-status.test.ts` | 22 | getCatalogStockStatus · exports CATALOG_LOW_STOCK_THRESHOLD = 10 · returns out-of-stock for null · returns out-of-stock for undefined … |
| `tests/unit/novelty-dates.test.ts` | 22 | formatDaysAgoFromTs · returns  · returns  · returns  … |
| `tests/unit/roles.test.ts` | 22 | getRoleLabel · returns  · returns  · returns  … |
| `tests/utils/price-freshness.extreme-thresholds.test.ts` | 22 | getPriceFreshness — thresholds inválidos voltam ao default 60d · threshold $label → default 60d e classifica corretamente · getPriceFreshness — threshold = 1 dia (cotação volátil) · hoje (0d) ainda é fresh — vendedor não é alarmado no mesmo dia … |
| `src/components/inventory/__tests__/StockDashboard.test.tsx` | 21 | StockDashboard — render states · mostra o estado de carregamento (skeletons + progresso) · mostra estado de erro com botão  · renderiza cartões de KPI e tabela quando carregado … |
| `src/components/mockup/__tests__/a11y.mockup.test.tsx` | 21 | ProductSearchCombobox — a11y · não tem violações axe no estado fechado · não tem violações axe no estado aberto (lista exposta) · não tem violações axe com um produto já selecionado … |
| `src/hooks/common/__tests__/useDebounce.test.ts` | 21 | useDebounce · retorna valor inicial imediatamente · nao atualiza antes do delay · atualiza após o delay completo … |
| `src/hooks/common/__tests__/useUnsavedChangesGuard.test.ts` | 21 | estado inicial · showDialog=false, nenhuma ação pendente · message padrão em PT-BR · message customizada respeitada … |
| `src/hooks/quotes/__tests__/useQuoteConcurrencyGuard.test.ts` | 21 | estado inicial · baseline é null quando quote=null · retorna funções estáveis (useCallback) · checkForConflict — sem consulta ao DB … |
| `src/lib/auth/auth-utils.test.ts` | 21 | auth-utils · getGreeting · returns  · returns  … |
| `src/utils/cnpj-schema.test.ts` | 21 | cnpjOptionalSchema · normalizes masked CNPJ to 14-digit string on parse · accepts already-normalized 14-digit input · coerces empty / null / undefined to null … |
| `tests/components/PriceFreshnessBadge.a11y.test.tsx` | 21 | PriceFreshnessBadge — acessibilidade · aria-label rico por status · fresh: menciona  · aging: menciona  … |
| `tests/edge-functions/integration/categories-api.test.ts` | 21 | categories-api · GET /categories-api — happy path · retorna 200 com array de categorias · cada categoria tem id, name e slug definidos … |
| `tests/edge-functions/integration/rate-limit-check.test.ts` | 21 | rate-limit-check · within limit · retorna 200 com allowed=true quando dentro do limite · remaining decresce a cada chamada … |
| `tests/edge-functions/integration/send-transactional-email.test.ts` | 21 | send-transactional-email · happy path — email enviado · retorna 200 com message_id para template válido · inclui X-Request-Id no header de resposta … |
| `tests/edge-functions/integration/webhook-inbound.test.ts` | 21 | webhook-inbound · v2 — envelope strict · aceita payload v2 válido com idempotency_key e retorna 200 · aceita payload v2 sem idempotency_key (campo opcional) … |
| `tests/hooks/useProducts.test.ts` | 21 | findKnownHex · finds exact match · is case insensitive · handles accents (NFD normalization) … |
| `tests/hooks/useTechniquePricing.test.ts` | 21 | filterMatchingTables · filters by table_code match · filters by fullcode match · filters case-insensitively … |
| `tests/pages/kit-builder/useKitBuilderQuote.test.ts` | 21 | useKitBuilderQuote — payloads · inclui seller_id e chave de idempotência na RPC transacional · anexa a observação do kit ao final das notas do orçamento · não anexa observação quando o kit não tem notas … |
| `tests/scripts/check-dependency-audit.test.mjs` | 21 | dependency audit policy · accepts only the reviewed image-size propagation before its deadline · fails closed for any new vulnerable package or advisory · requires the complete reviewed advisory set … |
| `tests/scripts/gates-hardening-regressions.test.mjs` | 21 | check-generated-files-protected · redução real ≥20% num arquivo gerado reprova (100 → 50 linhas) · redução pequena (<20%) passa · GITHUB_BASE_SHA com opção do git ( … |
| `tests/unit/format.test.ts` | 21 | formatCurrency · formats zero with two decimal places · formats a positive integer · formats decimal values with exactly 2 fractional digits … |
| `tests/unit/quote-calculations.test.ts` | 21 | Quote Calculations — Edge Cases · Desconto · desconto 0% não altera o preço · desconto 100% resulta em total zero … |
| `tests/utils/imageProxy.test.ts` | 21 | imageProxy · getProxiedImageUrl · retorna null para url null · retorna null para url undefined … |
| `e2e/collections-module.spec.ts` | 20 | Collections Module - Public Access (No Auth) · should redirect to auth when accessing /colecoes unauthenticated · should redirect to auth when accessing /colecoes/:id unauthenticated · should display auth page when accessing /colecoes … |
| `e2e/compare-module.spec.ts` | 20 | Compare Module - Public Access (No Auth) · should redirect to auth when accessing /comparar unauthenticated · should display auth page when accessing /comparar · should not expose comparison data to unauthenticated users … |
| `e2e/favorites-module.spec.ts` | 20 | Favorites Module - Public Access (No Auth) · should redirect to auth when accessing /favoritos unauthenticated · should display auth page when accessing /favoritos · should not expose favorites data to unauthenticated users … |
| `e2e/visual-search-module.spec.ts` | 20 | Visual Search Module - Public Access (No Auth) · should redirect to auth when accessing /raio-x unauthenticated · should display auth page when accessing /raio-x · should not expose visual search data to unauthenticated users … |
| `e2e/ui/cart-delete-header-popover-exhaustive.spec.ts` | 20 | CartHeaderButton — exaustivo (delete via popover) · happy path — clique → dialog → confirmar → 1 DELETE → cartão some @smoke · carrinho expandido com itens — lixeira abre dialog mesmo após fechamento do popover · DELETE 200 com 0 linhas removidas — trata como erro e mantém o carrinho … |
| `recovery/src-legacy/src/utils/price-freshness.test.ts` | 20 | Price Freshness Utility · formatPriceDateShort · formats date in pt-BR short format · formatPriceDateLong … |
| `src/components/cart/__tests__/PopoverQtyInput.exhaustive.test.tsx` | 20 | normalizeQty — property-based (1000 amostras) · resultado sempre em [MIN_QTY, MAX_QTY] ou null · idempotência: normalize(String(normalize(x))) === normalize(x) · respeita a extração de dígitos por regex /[^0-9]/g … |
| `src/components/inventory/__tests__/FutureStockDialog.test.tsx` | 20 | FutureStockDialog — render states · não renderiza conteúdo quando open=false · mostra estado vazio quando não há entradas · renderiza título, badge de contagem e KPIs com dados … |
| `src/components/inventory/__tests__/VariantStockRowActions.test.tsx` | 20 | VariantStockRowActions · Copiar SKU · copia o SKU da variação no clipboard e emite toast de sucesso · mostra erro profissional se clipboard falhar (sem fallback disponível) · VariantStockRowActions · Carrinho … |
| `src/components/products/__tests__/ProductColorSwatches.test.tsx` | 20 | ProductColorSwatches · should render color $name · should highlight the selected color · should call onSelect when a color is clicked … |
| `src/components/quotes/__tests__/getQuoteRowBadge.test.ts` | 20 | getQuoteRowBadge · draft → Rascunho roxo tracejado · pending + !synced + sem DAR → Criado (Não Sincronizado) amarelo · pending + null synced → trata como não sincronizado … |
| `src/lib/analytics/__tests__/mfaNavigationAnalytics.test.ts` | 20 | inferGoBackOrigin · idx > 0 → internal · rota lembrada presente → internal mesmo com idx 0 · referrer da mesma origem → internal … |
| `src/lib/inventory/__tests__/stock-filter.edge-cases.test.ts` | 20 | normalize — função base · normalize(%j) === %j · regressão — categoria · categoryId=%j → %j … |
| `src/lib/security/__tests__/sanitize-message.test.ts` | 20 | sanitize-message (SSOT) · looksTechnical · detects %s as technical · does not flag %s … |
| `src/lib/telemetry/__tests__/restoreEventSchema.test.ts` | 20 | restoreEventSchema — payloads válidos · restore_start válido · restore_ok válido (success) · restore_ok aceita restore_result=%s … |
| `src/pages/quotes/__tests__/useQuotesListPage.expiring.test.ts` | 20 | useQuotesListPage — filtro  · I1: exclui quotes com status=expired mesmo com valid_until futuro · I2: exclui valid_until no passado (mesmo status=pending) · I3: exclui quotes sem valid_until … |
| `src/pages/quotes/__tests__/useQuotesListPage.test.ts` | 20 | useQuotesListPage — onlyPendingStatuses · false quando lista está vazia · true quando todos os quotes são pending · false quando há mix de status … |
| `src/tests/ProductSortingRelevance.test.ts` | 20 | SORT_OPTIONS — contrato do seletor · expõe exatamente as 7 opções esperadas, na ordem da UI · todas as opções têm label não vazia · sortProducts — Nome (A-Z) … |
| `src/utils/__tests__/quote-number.exhaustive.test.ts` | 20 | quote-number · normalização e validação exaustivas · idempotência · normalizar(%s) é idempotente · saneamento de espaços … |
| `supabase/functions/external-db-bridge/applyFiltersAndSwap.integration.test.ts` | 20 | applyFilters: nunca chama .select() (filtro vazio) · applyFilters: nunca chama .select() (filtros simples eq) · applyFilters: nunca chama .select() (operadores PostgREST string) · applyFilters: nunca chama .select() (sufixos _gte/_lte/_isnull/_notnull) … |
| `tests/components/products/ProductCard.test.tsx` | 20 | ProductCard · renders product name and price · renders with favorite state · calls onClick when clicked … |
| `tests/edge-functions/integration/cnpj-lookup.test.ts` | 20 | cnpj-lookup · happy path · retorna 200 com dados da empresa para CNPJ válido formatado · aceita CNPJ sem formatação (somente dígitos) … |
| `tests/edge-functions/integration/step-up-verify.test.ts` | 20 | step-up-verify · verificação bem-sucedida · retorna 200 com step_up_token quando OTP correto · step_up_token expira em tempo razoável (15min) … |
| `tests/hooks/useSearch.test.ts` | 20 | useSearch · Histórico · adiciona termo ao histórico · remove duplicatas do histórico (case-insensitive) … |
| `tests/integration/freight-quest/quote-freight-integration.test.ts` | 20 | quote-sync — integração com frete · sync_quote com shipping_type=fob_pre → total inclui frete · sync_quote com shipping_type=cif → total NÃO inclui frete · quoteId inválido (não-UUID) → 400 validation error … |
| `tests/lib/rbac-permissions.test.ts` | 20 | RBAC Permission Matrix · admin · has access to everything · manager … |
| `tests/pages/QuoteBuilder.test.ts` | 20 | QuoteBuilder — Item Calculations · calculates single item total · calculates quote subtotal · handles empty items list … |
| `tests/scripts/check-no-inline-cors.test.mjs` | 20 | check-no-inline-cors — repositório real · passa (exit 0) contra supabase/functions/ real do repo · check-no-inline-cors — cenários básicos · passa quando supabase/functions/ está vazio … |
| `tests/scripts/inventario-banco.test.mjs` | 20 | extrairInventario · aceita a resposta da Management API, do MCP (texto embrulhado), a linha do psql e o objeto direto · recusa entrada incompleta, vazia ou de outra versao · montarInventario … |
| `tests/types/quote-types.test.ts` | 20 | QuoteHistoryEntry shape · has all required fields · allows nullable fields · metadata defaults to empty object … |
| `e2e/flows/03b-product-thumb-quickview.spec.ts` | 19 | QuickView na foto — paridade entre módulos · ${mod.label}: clique na foto abre QuickView sem navegar · ${mod.label}: a11y — thumb é ativável via teclado (Enter) · Estoque • QuickView — estados de borda … |
| `e2e/flows/freight-quest-complete-flow.spec.ts` | 19 | FreightEstimator — Kit Builder @freight · navega para Kit Builder e verifica FreightEstimator visível · seleciona método de frete SEDEX e exibe preço correto · troca entre PAC e SEDEX atualiza preço exibido … |
| `src/components/inventory/__tests__/stock-alert-dialogs.test.tsx` | 19 | OutOfStockDialog · renders title  · renders empty state when alerts=[] · renders alert count badge … |
| `src/hooks/quotes/__tests__/useDiscountApproval.test.ts` | 19 | requestApproval · retorna false imediatamente quando user = null (sem DB call) · insere em discount_approval_requests com campos corretos · retorna true quando inserção bem-sucedida … |
| `src/lib/auth/__tests__/checkLoginGate.test.ts` | 19 | isOperationalGateBlock · allowed=false + reason operacional %s → true · %o → false · gateBlockMessage … |
| `src/lib/auth/__tests__/oauth-error-explainer.test.ts` | 19 | explainOAuthError · config errors (admin needs to act) · mapeia redirect_uri_mismatch com hint sobre console do provedor · detecta redirect uri mismatch pela descrição quando code é genérico … |
| `src/lib/external-db/rest-native.test.ts` | 19 | isRestNativeEligible · whitelisted COM coluna de busca → elegível mesmo com _search · A1: whitelisted SEM coluna de busca → continua elegível com _search · não-whitelisted → inelegível … |
| `src/lib/inventory/__tests__/stock-filter.test.ts` | 19 | stock-filter — pipeline de seleção/agregação/montagem · normalize remove acentos e diferencia caixa · selectMatchingVariants retorna todas as variações quando não há filtro de cor · cor  … |
| `src/lib/telemetry/__tests__/restoreTelemetry.fuzz.test.ts` | 19 | fuzz — normalizeCorrelationId · para QUALQUER entrada inválida, retorno é UUID v4 canônico · para QUALQUER string não-vazia após trim, retorno === entrada (verbatim) · output SEMPRE passa em isValidCorrelationId … |
| `src/pages/products/seller-carts/__tests__/mapRestoreCartError.test.ts` | 19 | mapRestoreCartError · RLS (SQLSTATE 42501) →  · RLS por status 403 →  · unique_cart_item_variant (23505) → mensagem específica de item duplicado … |
| `supabase/functions/magic-up-score/index.limits.test.ts` | 19 | F-07 — corpo acima do teto é recusado com 413 antes do download completo · content-length acima do teto → 413 sem abrir o corpo · sem content-length, a leitura para ao passar do teto (não baixa tudo) · F-07 — imagem acima do limite é recusada com 413 antes do provedor … |
| `tests/admin/route-guards-ref-warning.test.tsx` | 19 | Route guards — React ref warning guard · AdminRoute (loading) — sem warning de ref · AdminRoute (sem user → Navigate /login) — sem warning de ref · AdminRoute (admin com MFA OK → Outlet) — sem warning de ref … |
| `tests/components/ReplenishmentToolbar.test.tsx` | 19 | ReplenishmentToolbar · renders title and count badge · shows loading state when isLoading with zero total · shows filtered/total when hasActiveFilters … |
| `tests/edge-functions/voice-agent.test.ts` | 19 | Voice Agent Response Contract · action types · should have valid action enum values · response structure … |
| `tests/edge-functions/integration/secure-upload.test.ts` | 19 | secure-upload · happy path — upload válido · retorna 200 com path, bucket e hash · hash retornado é string hexadecimal de 64 chars (SHA-256) … |
| `tests/lib/query-config.test.ts` | 19 | CACHE_TIMES · should have increasing cache durations · getStaleTimeForKey · should return TECNICAS time for tecnicas keys … |
| `tests/lib/personalization/adapters/raw-row.adapter.test.ts` | 19 | adaptTecnicaRow · espelha PT → EN quando só PT está presente · espelha EN → PT quando só EN está presente · preserva ambos quando payload é híbrido … |
| `tests/magazine/MagazineStatsCards.test.tsx` | 19 | MagazineStatsCards — skeleton · exibe 5 skeletons quando isLoading=true · não exibe nenhum label real quando isLoading=true · MagazineStatsCards — empty state … |
| `tests/scripts/check-ledger-manifest-drift.test.mjs` | 19 | declaredVersionOf · extrai o prefixo numérico de um nome de arquivo canônico · extrai também prefixos não-canônicos (menos de 14 dígitos) · devolve null quando o arquivo não começa com dígitos … |
| `tests/scripts/validate-migration-target.test.mjs` | 19 | controlled migration target · accepts canonical direct and shared pooler targets · rejects invalid or incomplete target %j · preflight needs only version and canonical project, not database credentials … |
| `tests/utils/product-colors.test.ts` | 19 | product-colors · findKnownHex · returns exact match hex · is case-insensitive … |
| `tests/utils/product-mapper.test.ts` | 19 | product-mapper · mapPromobrindToProduct · maps basic fields · maps category … |
| `e2e/dashboard-modules.spec.ts` | 18 | Dashboard Modules - Public Access (No Auth) · should redirect to auth when accessing ${route.path} unauthenticated · should display auth page for all dashboard routes · should not expose observability/metrics data to unauthenticated users … |
| `e2e/stock-module.spec.ts` | 18 | Stock Module - Public Access (No Auth) · should redirect to auth when accessing /estoque unauthenticated · should display auth page when accessing /estoque · should not expose stock data to unauthenticated users … |
| `e2e/magazine/magazine-viewer.spec.ts` | 18 | Magazine viewer — atalhos de teclado · → avança página, ← volta, Home/End extremos · T abre sumário, ? abre ajuda, B marca página · Space em botão focado NÃO avança página (C2) … |
| `e2e/quotes/quote-item-editor-sheet-header.spec.ts` | 18 | QuoteItemEditorSheet @ ${vp.name}px · DOM: botão Salvar presente e texto  · layout:  · a11y: foco entra no dialog e  … |
| `src/components/inventory/__tests__/StockAlertsIndicator.test.tsx` | 18 | StockAlertsIndicator — trigger · mostra o sino com aria-label dedicado (distinto do sino de workspace) · exibe o total exato vindo dos contadores server-side · cap visual 99+ quando total > 99 … |
| `src/components/layout/sidebar/__tests__/SidebarNavGroup.history.test.tsx` | 18 | SidebarNavGroup — back/forward (histórico real) preservam paridade entre os 3 itens · back: /carrinhos -> /orcamentos/novo, voltar reativa Carrinhos e desativa Novo Orçamento · forward: depois de voltar, avançar restaura o destaque de Novo Orçamento · back/forward atravessando os 3 itens mantém destaque correto a cada salto … |
| `src/components/products/customization/__tests__/ConfigurationPanelV6.collapse.test.tsx` | 18 | ConfigurationPanelV6 — contrato de colapso · Grupo A — wrapper externo (contrato visual) · expandido: contém flex/flex-col/gap-4/p-4/transition-[gap]/motion-reduce · colapsado: contém gap-0 e NÃO contém gap-4 nem space-y-4 … |
| `src/components/search/__tests__/searchCache.test.ts` | 18 | searchCache.set / searchCache.get · returns null for an unknown key · returns results immediately after set · is case-insensitive (normalized key) … |
| `src/hooks/auth/__tests__/login-flow.test.ts` | 18 | Login Flow & Role Loading — RPC get_profile_and_roles · 1. deve carregar perfil e roles com sucesso via RPC · 2. deve tratar erro RLS 42501 sem lançar exceção · 3. deve tratar erros genéricos de rede sem crash … |
| `src/hooks/products/__tests__/useProductsByColor.test.ts` | 18 | hasFilter OR entre 4 grupos · false quando todos arrays vazios · true quando qualquer grupo nao-vazio · sem filtro ativo … |
| `src/hooks/products/__tests__/useProductsLightweight.test.ts` | 18 | mapLightweightToProduct · retorna id como string mesmo quando input é number · FIX BUG-D: prefere leaf_category_id sobre category_id sobre main_category_id · FIX BUG-D: usa category_id quando leaf_category_id nulo … |
| `src/lib/carts/__tests__/shipping-deadline.edge.test.ts` | 18 | shipping-deadline · edge cases · borda +3 / +4 dias (soon vs ok) · +3 dias exatamente → soon com rótulo  · +4 dias exatamente → ok com rótulo  … |
| `src/lib/inventory/__tests__/health-score.test.ts` | 18 | calcHealthScore · retorna 100 quando não há produtos · retorna 100 quando todos estão adequados · retorna 0 quando nenhum está adequado … |
| `src/pages/magazine/templates-gallery/__tests__/gallery.test.tsx` | 18 | MagazineTemplatesGalleryPage · renderiza os 12 cards de template · filtro  · filtro  … |
| `src/pages/quotes/__tests__/quote-builder-freight-block.rtl.test.tsx` | 18 | Bloco Frete — hierarquia + data-testid do grid · shippingType= · shippingType= · shippingType= … |
| `src/utils/__tests__/cnpj-exhaustive.test.ts` | 18 | CNPJ — B1 idempotência massiva (1.000 casos) · normalize(normalize(x)) === normalize(x) · CNPJ — B2 roundtrip (1.000 casos) · normalize(mask(normalize(v))) === normalize(v) … |
| `supabase/functions/_shared/credentials.test.ts` | 18 | resolveCredential: integration_credentials preenchida → has_value=true, source= · resolveCredential: linha ausente + env canônica presente → source= · resolveCredential: alias legado (EXTERNAL_SUPABASE_URL) → resolve com source= · resolveCredential: nada configurado → source= … |
| `tests/components/kit-builder/KitAIPromptDialog.test.tsx` | 18 | KitAIPromptDialog · collects an explicit briefing and applies only the returned filters after confirmation · etapa 17: usa título, descrição e estilo devolvidos pela IA em vez do fallback derivado do briefing · etapa 17: mantém o fallback derivado do briefing quando a IA não devolve título/descrição/estilo … |
| `tests/edge-functions/integration/product-webhook.test.ts` | 18 | product-webhook · evento product.created · retorna 200 para evento product.created válido · evento product.updated … |
| `tests/hooks/useGlobalSearch-voice.test.ts` | 18 | Voice Action Handler Logic · navigate action · should extract route from navigate action · should handle navigate without route gracefully … |
| `tests/lib/product-types.test.ts` | 18 | getProductImageUrl · should prefer primary_image_url · should fallback to image_url · should fallback to first image in images array … |
| … +1829 linhas — lista completa em `context.json` | | |

## L. Eventos de webhook tratados (contratos com sistemas externos)

| Evento | Arquivo |
|---|---|
| `recovered` | `recovery/src-legacy/src/lib/external-db/bridge-telemetry-client.ts` |
| `unavailable` | `recovery/src-legacy/src/lib/external-db/bridge-telemetry-client.ts` |
| `added` | `src/lib/query-config.ts` |
| `updated` | `src/lib/query-config.ts` |
| `change` | `src/pages/products/seller-carts/cartViewModeTelemetry.ts` |
| `create` | `supabase/functions/manage-users/index.ts` |
| `delete` | `supabase/functions/manage-users/index.ts` |
| `promote_role` | `supabase/functions/manage-users/index.ts` |
| `revoke_sessions` | `supabase/functions/manage-users/index.ts` |
| `update_email` | `supabase/functions/manage-users/index.ts` |
| `update_password` | `supabase/functions/manage-users/index.ts` |
| `update_profile` | `supabase/functions/manage-users/index.ts` |
| `string` | `supabase/functions/webhook-inbound/index.ts` |

## M. Efeitos colaterais (e-mail, SMS, cobrança, fila — não são idempotentes por padrão)

| Chamada | Arquivo |
|---|---|
| `notify_discount_approval_request` | `recovery/block04_functions.sql` |
| `notify_hardening_regression` | `recovery/block04_functions.sql` |
| `notify_new_order` | `recovery/block04_functions.sql` |
| `notify_quote_client_response` | `recovery/block04_functions.sql` |
| `notify_quote_status_change` | `recovery/block04_functions.sql` |
| `notify_discount_approval_request` | `recovery/block05_triggers.sql` |
| `notify_discount_approval_trigger` | `recovery/block05_triggers.sql` |
| `notify_new_order` | `recovery/block05_triggers.sql` |
| `notify_quote_client_response` | `recovery/block05_triggers.sql` |
| `notify_quote_status_change` | `recovery/block05_triggers.sql` |
| `notify_discount_approval_request` | `recovery/full-public-schema.sql` |
| `notify_discount_approval_trigger` | `recovery/full-public-schema.sql` |
| `notify_hardening_regression` | `recovery/full-public-schema.sql` |
| `notify_new_order` | `recovery/full-public-schema.sql` |
| `notify_quote_client_response` | `recovery/full-public-schema.sql` |
| `notify_quote_status_change` | `recovery/full-public-schema.sql` |
| `notify_discount_approval_request` | `recovery/patches/D4.2_quote_advanced/functions.sql` |
| `notify_quote_client_response` | `recovery/patches/D4.2_quote_advanced/functions.sql` |
| `notify_quote_status_change` | `recovery/patches/D4.2_quote_advanced/functions.sql` |
| `notify_hardening_regression` | `recovery/patches/D4.6_security_auth/functions.sql` |
| `notify_new_order` | `recovery/patches/D5_misc_cross_cutting/functions.sql` |
| `notify_quote_client_response` | `recovery/sql/01_missing_functions.sql` |
| `invoke(` | `recovery/src-legacy/src/hooks/useCategoriesTree.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useColorSystem.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useCommemorativeDates.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useConnectionTestDetails.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useConnectionTestHistory.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useConnectionTester.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useConsecutiveFailures.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useDeviceDetection.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useDropboxFiles.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useExternalCategoriesQuery.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useExternalDatabase.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useExternalDbInspect.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useExternalSimulator.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useIPValidation.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useKitIdentitySuggestion.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useLogoColorAnalysis.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useMagicUpGeneration.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/usePrintAreas.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useProductSeoAI.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useProductSupplierSources.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useProductsByCategory.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useProdutoRamoAtividade.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useQuotes.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useSecretsManager.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useStepUpAuth.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useTechniquePricing.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useTechniquePricingOptions.ts` |
| `invoke(` | `recovery/src-legacy/src/hooks/useTransactionalEmail.ts` |
| `notify` | `recovery/src-legacy/src/lib/external-db/cold-start-recorder.ts` |
| `invoke(` | `recovery/src-legacy/src/pages/Auth.tsx` |
| `.add('ring-2'` | `recovery/src-legacy/src/pages/MockupGenerator.tsx` |
| `invoke(` | `recovery/src-legacy/src/pages/quote-view/QuoteActionHandlers.ts` |
| `invoke(` | `recovery/src-legacy/src/pages/quote-view/QuoteBitrixSync.ts` |
| `.add('high-contrast'` | `src/components/a11y/AccessibilityProvider.tsx` |
| `.add('keyboard-mode'` | `src/components/a11y/AccessibilityProvider.tsx` |
| `invoke(` | `src/components/admin/OwnershipRepairDialog.tsx` |
| `invoke(` | `src/components/admin/connections/DataSourceDebugTab.tsx` |
| `invoke(` | `src/components/admin/products/kit-components/api.ts` |
| `enqueue(` | `src/components/admin/telemetry/OptimizationQueuePanel.tsx` |
| `invoke(` | `src/components/admin/users/useUserManagement.ts` |
| `notifyRouteChange` | `src/components/common/RouteScrollReset.tsx` |
| `.add('compare-focus-mode'` | `src/components/compare/FocusModeToggle.tsx` |
| `.add('opacity-100'` | `src/components/quotes/QuoteBuilderProductSearch.tsx` |
| `notify` | `src/components/quotes/QuoteProductColorSelector.tsx` |
| `invoke(` | `src/contexts/DevChallengeContext.tsx` |
| `.add('dark'` | `src/contexts/ThemeContext.tsx` |
| `invoke(` | `src/hooks/admin/useV4Callbacks.ts` |
| `invoke(` | `src/hooks/intelligence/useExternalDatabase.ts` |
| `invoke(` | `src/hooks/products/useCategoriesTree.ts` |
| `invoke(` | `src/hooks/products/useColorSystem.ts` |
| `invoke(` | `src/hooks/products/useExternalCategoriesQuery.ts` |
| `notify` | `src/hooks/quotes/useAutoSaveQuote.ts` |
| `notify_discount_approval_request` | `src/hooks/quotes/useDiscountApproval.ts` |
| `notify` | `src/hooks/quotes/useQuoteBuilderState.ts` |
| `invoke(` | `src/lib/external-rpc.ts` |
| `.add('theme-transitioning'` | `src/lib/theme-presets.ts` |
| `notify` | `src/lib/access/log-access-denied.ts` |
| `notify` | `src/lib/edge/invokeTelemetrySink.ts` |
| `invoke(` | `src/lib/security/sanitize-error.ts` |
| `notify` | `src/lib/telemetry/instrumentationControl.ts` |
| `notifyRouteChange` | `src/lib/telemetry/navigationMetrics.ts` |
| `invoke(` | `src/lib/telemetry/requestId.ts` |
| `.add('dark'` | `src/pages/__visual/CalendarHarness.tsx` |
| `.add('dark'` | `src/pages/__visual/DatePickerFieldHarness.tsx` |
| `.add("dark"` | `src/pages/__visual/PreviewButtonHarness.tsx` |
| `.add('dark'` | `src/pages/__visual/QuoteViewOrderHarness.tsx` |
| `invoke(` | `src/pages/admin/DevChallengeExamplesPage.tsx` |
| `enqueue(` | `src/pages/admin/telemetry/useOptimizationQueue.ts` |
| `enqueue(` | `src/pages/magazine/editorPersistence.ts` |
| `publish(` | `src/pages/magazine/useMagazineEditor.ts` |
| `publish(` | `src/pages/magazine/useMagazinePublish.ts` |
| `notifyRemoteDisabled` | `src/pages/magazine/hooks/useMagazineReaderState.ts` |
| `.add('ring-2'` | `src/pages/mockups/MockupGenerator.tsx` |
| `publish(` | `src/services/magazineService.ts` |
| `invoke(` | `supabase/functions/bitrix-sync/handler_characterization_test.ts` |
| `notifyAdmins` | `supabase/functions/connections-health-check/index.ts` |
| `sendEmail` | `supabase/functions/send-scheduled-reports/index.ts` |
| `invoke(` | `supabase/functions/step-up-verify/index.ts` |
| `invoke(` | `supabase/functions/webhook-inbound/handler_characterization_test.ts` |
| `mercadopago` | `supabase/migrations/20250103030000_seed_final.sql` |
| `mercadopago` | `supabase/migrations/20250103150000_seed_updated.sql` |
| `notify` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_new_order` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_quote_client_response` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260414193435_871210cd-f0d8-40ee-ae9f-401b4887727f.sql` |
| `notify_discount_approval_trigger` | `supabase/migrations/20260414193435_871210cd-f0d8-40ee-ae9f-401b4887727f.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260414232135_91832f4f-3bda-41e0-8707-cac75a069d44.sql` |
| `notify_hardening_regression` | `supabase/migrations/20260419121414_3259f186-81ef-478e-80da-0d5950fc86fe.sql` |
| `notifying` | `supabase/migrations/20260423185624_0cc97b9f-b1ba-469a-914d-6ac6422b584d.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260513000002_t37c_revoke_authenticated_trigger_vault.sql` |
| `notify_new_order` | `supabase/migrations/20260513000002_t37c_revoke_authenticated_trigger_vault.sql` |
| `notify_quote_client_response` | `supabase/migrations/20260513000002_t37c_revoke_authenticated_trigger_vault.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260513000002_t37c_revoke_authenticated_trigger_vault.sql` |
| `notify_hardening_regression` | `supabase/migrations/20260513000005_t37d_revoke_authenticated_cron_backend.sql` |
| `notify_hardening_regression` | `supabase/migrations/20260515150000_onda20_fix_t38_regression_and_bilateral_gate.sql` |
| `notify_quote_client_response` | `supabase/migrations/20260522113314_lote_a_04_quote_approval_tokens.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260531211352_a218fee1-6260-4c3a-863b-02df1f09838c.sql` |
| `notify_new_order` | `supabase/migrations/20260531211352_a218fee1-6260-4c3a-863b-02df1f09838c.sql` |
| `notify_quote_client_response` | `supabase/migrations/20260531211352_a218fee1-6260-4c3a-863b-02df1f09838c.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260531211352_a218fee1-6260-4c3a-863b-02df1f09838c.sql` |
| `notify_hardening_regression` | `supabase/migrations/20260619153921_3591de22-526b-46a1-a00f-fd7dc920dfa3.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260620190500_faxina_tier3b_archive_dead_functions_bulk.sql` |
| `notify_hardening_regression` | `supabase/migrations/20260620190500_faxina_tier3b_archive_dead_functions_bulk.sql` |
| `notify_new_order` | `supabase/migrations/20260620190500_faxina_tier3b_archive_dead_functions_bulk.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260620190500_faxina_tier3b_archive_dead_functions_bulk.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260622220000_fix_qbp_audit_novo_orcamento.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260623115007_fix_security_definer_missing_search_path_20260623.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260623120006_fix_restore_trigger_notify_quote_status_change_20260623.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260623122000_fix_security_definer_missing_search_path.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260623130001_fix_restore_trigger_notify_discount_approval.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260625195535_reconcile_discount_approval_audit_idempotency_realtime.sql` |
| `notify` | `supabase/migrations/20260626152810_harden_discount_approval_requests_grants.sql` |
| `notify` | `supabase/migrations/20260627130450_reconcile_unarchive_7_live_tables_faxina20260620.sql` |
| `notify` | `supabase/migrations/20260710113150_fn_notify_champions_on_quote_status.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20261114170845_fix_workspace_notifications_insert_policy_reapply.sql` |
| `invoke(` | `tests/hooks/_helpers/mock-supabase-builder.ts` |

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| * commitlint — enforcement local de Conventional Commits (REGRA #6). | `commitlint.config.js` |
| "Definition for rule not found" e estoura o baseline (0→1), quebrando produção. | `eslint.config.js` |
| // Solução: registrar @next/next como plugin com a regra como no-op e desabilitada. | `eslint.config.js` |
| O disable comment passa a ser um "suppress de regra conhecida mas off" — silencioso. | `eslint.config.js` |
| ── Stub @next/next ── evita "Definition for rule not found" em disable comments do Lovable | `eslint.config.js` |
| making these two rules contradictory. Prefer the explicit style enforced by that rule. | `eslint.config.js` |
| Batch 66: 1 rule — no-multi-assign (1 code fix in theme-presets.test.ts) | `eslint.config.js` |
| Batch 67: 1 rule — no-script-url (4 code fixes: 1 prod + 3 test eslint-disable) | `eslint.config.js` |
| Batch 70: 1 rule — prefer-template (19 fixes in 15 files) | `eslint.config.js` |
| Batch 71: 1 rule — prefer-arrow-callback (59 fixes, auto-fixed) | `eslint.config.js` |
| Batch 72: 1 rule — no-void allowAsStatement (24 fixes in 17 files) | `eslint.config.js` |
| Batch 74: 1 rule — prefer-exponentiation-operator (20 fixes, auto-fixed in 17 files) | `eslint.config.js` |
| Batch 75: 1 rule — dot-notation (24 fixes, auto-fixed in 7 files) | `eslint.config.js` |
| Batch 76: 1 rule — operator-assignment (7 fixes in 7 files, mixed auto/manual) | `eslint.config.js` |
| Batch 78: 1 rule with violations + 12 zero-violation safety rules | `eslint.config.js` |
| Batch 238: 1 zero-violation rule (@typescript-eslint — 238A-G probed all 134 @typescript-eslint rules) | `eslint.config.js` |
| Apenas specs Playwright. Sem isto, o testMatch padrão também casa arquivos | `playwright.config.ts` |
| 5. Smoke — serial, no retries, @smoke tag required. | `playwright.config.ts` |
| Validação exaustiva de regras de hooks React | `test-hooks-safety.mjs` |
| TESTE 1: Regra #1 dos Hooks — Ordem de chamadas | `test-hooks-safety.mjs` |
| TESTE 2: Regra #2 — Não pode haver hooks condicionais | `test-hooks-safety.mjs` |
| 3: useEffect([magazine]) deve atualizar ref', () => { | `test-hooks-safety.mjs` |
| Segunda chamada — deve ver o novo magazine | `test-hooks-safety.mjs` |
| 100 renders onde apenas alguns campos mudam | `test-hooks-safety.mjs` |
| example.com/logo.png', 'Branding deve estar atualizado'); | `test-hooks-safety.mjs` |
| Simulação: se magazine muda, magazineRef.current deve acompanhar | `test-magazine-fix.mjs` |
| Renderização 1: mesmos valores → não deve recalcular | `test-magazine-fix.mjs` |
| Renderização 2: title muda → deve recalcular | `test-magazine-fix.mjs` |
| Ref ainda deve funcionar | `test-magazine-fix.mjs` |
| toolchain, então SENTRY_AUTH_TOKEN sozinho apenas colocava os .map no | `vite.config.ts` |
| Ao restaurar um uploader, ele deve apagar os mapas após o envio antes | `vite.config.ts` |
| Equivalente semântico do antigo `esbuild.pure`: remove somente as | `vite.config.ts` |
| Somente os ícones usados pelo shell/login. Agrupá-los evita | `vite.config.ts` |
| de filtros para não ultrapassar o limite de 1011 KB por chunk (E146 v2). | `vite.config.ts` |
| Juntos reduzem de 856 KB para dois chunks abaixo do limite (E146 v2). | `vite.config.ts` |
| called here". Rodam apenas via Playwright. Mantemos os specs Vitest legítimos | `vitest.config.ts` |
| Deve rodar apenas em ambientes com VITE_SUPABASE_URL/KEY reais configurados. | `vitest.config.ts` |
| Roda apenas via `node tests/scripts/check-file-size-baseline.test.mjs`. | `vitest.config.ts` |
| * Pré-requisito: vercel.json deve mapear /sitemap.xml → /api/sitemap e não | `api/sitemap.ts` |
| -- Usar cron.alter_job (não execute_sql direto — REGRA #8 corolário E056) | `auditoria-supabase/propostas/P12_cron_new_001_run_script_auth.sql` |
| Apenas tipos que o browser carrega como módulo/stylesheet — usados na | `public/sw.js` |
| * Retorna true se o pathname é uma rota SPA que deve ser servida | `public/sw.js` |
| (prefetch, manifest/PWA shortcuts validation) retornam 404 do Vercel | `public/sw.js` |
| FROM public.quote_approval_tokens WHERE token = _token LIMIT 1; | `recovery/block04_functions.sql` |
| FROM cron.job_run_details ORDER BY start_time DESC LIMIT 50; | `recovery/block11_cron_jobs.sql` |
| FROM public.quote_approval_tokens WHERE token = _token LIMIT 1; | `recovery/full-public-schema.sql` |
| FROM public.quote_approval_tokens WHERE token = _token LIMIT 1; | `recovery/patches/D4.2_quote_advanced/functions.sql` |
| * Sem persistência (memória apenas). Atualiza em tempo real via subscribe. | `recovery/src-legacy/src/components/admin/telemetry/BridgesLiveCard.tsx` |
| ultrapassa o limite configurado, mostra um alerta destacado com | `recovery/src-legacy/src/components/admin/telemetry/PlatformFailureAlertBanner.tsx` |
| Improved variant detection: if SKU is composite (contains '-'), it MUST have color_name or notes | `recovery/src-legacy/src/components/cart/CartHealthChecklist.tsx` |
| usado em contextos onde o componente atua como navegador de seleção (não apenas exibição). | `recovery/src-legacy/src/components/categories/CategoryTreeNavigator.tsx` |
| Recents — também filtrados por permissão (recente pode ter sido | `recovery/src-legacy/src/components/command/GlobalCommandBar.tsx` |
| - Setup = PISO MÍNIMO (não é somado!) | `recovery/src-legacy/src/components/pricing/simulator/PriceResultV51.tsx` |
| Faturamento mínimo (se aplicado) */} | `recovery/src-legacy/src/components/pricing/simulator/PriceResultV51.tsx` |
| Markup info (apenas em modo detalhes) */} | `recovery/src-legacy/src/components/pricing/simulator/PriceResultV51.tsx` |
| - Faturamento mínimo (setup como piso, não soma!) | `recovery/src-legacy/src/components/pricing/simulator/QuantityAndResult.tsx` |
| Faturamento mínimo aplicado */} | `recovery/src-legacy/src/components/pricing/simulator/QuantityAndResult.tsx` |
| - Tratamento específico para 429 (rate limit) e 402 (créditos) | `recovery/src-legacy/src/hooks/useAIRecommendations.ts` |
| ").limit(1).single(), | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| ").order("created_at", { ascending: false }).limit(50), | `recovery/src-legacy/src/hooks/useAccessSecurity.ts` |
| já está conforme o schema, deve "just work". | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| * Capabilities REQUIRED como objeto (não array!). | `recovery/src-legacy/src/hooks/useAiRouter.ts` |
| * Helper para calcular apenas os campos alterados em um UPDATE | `recovery/src-legacy/src/hooks/useAuditLog.ts` |
| Business Logic - Do not change sorting behavior | `recovery/src-legacy/src/hooks/useCatalogFiltering.ts` |
| * Prefetch do catálogo SOMENTE após autenticação (#6). | `recovery/src-legacy/src/hooks/useCatalogPrefetch.ts` |
| Priority 3: selected_thumbnail (only if not the main product image) | `recovery/src-legacy/src/hooks/useColorEnrichment.ts` |
| @param limit - Limite de resultados (padrão: 100) | `recovery/src-legacy/src/hooks/useCommemorativeDates.ts` |
| Armazena apenas IDs no localStorage; resolução para objetos Product é | `recovery/src-legacy/src/hooks/useComparison.ts` |
| Analytics (sem lookup – apenas ID) | `recovery/src-legacy/src/hooks/useComparison.ts` |
| Deve ser chamado pelo contexto/provider que tem acesso a `getProductsByIds`. | `recovery/src-legacy/src/hooks/useComparison.ts` |
| Retry automático com backoff apenas para erros que parecem temporários | `recovery/src-legacy/src/hooks/useCrmCompanies.ts` |
| * Fixa/desfixa kit em destaque (apenas 1 por usuário). */ | `recovery/src-legacy/src/hooks/useCustomKitPersistence.ts` |
| If dimensions are required but not provided, don't calculate | `recovery/src-legacy/src/hooks/useCustomizationPrice.ts` |
| * Para usuários com role `dev`, executa um SELECT mínimo (id LIMIT 1) em cada | `recovery/src-legacy/src/hooks/useDevAccessAudit.ts` |
| RLS / "permission denied" é classificado como bloqueio inesperado. | `recovery/src-legacy/src/hooks/useDevAccessAudit.ts` |
| * Não consome dados reais; apenas dispara o gate de RLS. Roda uma vez ao | `recovery/src-legacy/src/hooks/useDevAccessAudit.ts` |
| * Tabelas sensíveis que um dev DEVE conseguir ler. */ | `recovery/src-legacy/src/hooks/useDevAccessAudit.ts` |
| Códigos típicos de RLS / permissão | `recovery/src-legacy/src/hooks/useDevAccessAudit.ts` |
| * useDiscountApproval — Gerencia solicitações de aprovação de desconto | `recovery/src-legacy/src/hooks/useDiscountApproval.ts` |
| Múltiplas listas e sem shift → o caller deve mostrar picker | `recovery/src-legacy/src/hooks/useFavoriteQuickAdd.ts` |
| Mínimo de caracteres para buscar (default: 2) | `recovery/src-legacy/src/hooks/useGenericFuzzySearch.ts` |
| Máximo de resultados (default: todos) | `recovery/src-legacy/src/hooks/useGenericFuzzySearch.ts` |
| Aplicar limite se especificado | `recovery/src-legacy/src/hooks/useGenericFuzzySearch.ts` |
| Este arquivo mantém apenas os hooks React. | `recovery/src-legacy/src/hooks/useGravacaoV2.ts` |
| Validação completa acontece após login via edge function | `recovery/src-legacy/src/hooks/useIPValidation.ts` |
| Em caso de erro na validação, permitir acesso (fail-open) | `recovery/src-legacy/src/hooks/useIPValidation.ts` |
| Weight validation | `recovery/src-legacy/src/hooks/useKitBuilder.ts` |
| * Hook para validação de estoque dos itens do Kit Builder | `recovery/src-legacy/src/hooks/useKitStockValidation.ts` |
| Allow only if completed or current | `recovery/src-legacy/src/hooks/useKitWizardShortcuts.ts` |
| * useMockupGenerator — Core business logic hook for MockupGenerator page | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| Limite efetivo = menor entre técnica e área (se ambos definidos) | `recovery/src-legacy/src/hooks/useMockupGenerator.ts` |
| * Converts NoveltyWithDetails to Product (minimum fields required by BulkVariantWizard). | `recovery/src-legacy/src/hooks/useNoveltiesSelectionMode.ts` |
| Keep within max limit | `recovery/src-legacy/src/hooks/usePositionHistory.ts` |
| - Escrita: somente admin (RLS). | `recovery/src-legacy/src/hooks/useProductFreshnessOverride.ts` |
| - Fuse index é recriado apenas quando os produtos mudam (referência estável) | `recovery/src-legacy/src/hooks/useProductFuzzySearch.ts` |
| - Busca com debounce deve ser feita pelo consumidor (ex: useDebounce) | `recovery/src-legacy/src/hooks/useProductFuzzySearch.ts` |
| Recriar Fuse index apenas quando a lista de produtos realmente muda | `recovery/src-legacy/src/hooks/useProductFuzzySearch.ts` |
| * Busca apenas a imagem principal de um produto | `recovery/src-legacy/src/hooks/useProductImages.ts` |
| * Hook para buscar apenas a imagem principal | `recovery/src-legacy/src/hooks/useProductImages.ts` |
| ── Desconto REAL (sobre subtotal real) — usado para alçada ── | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| ── Validation ── | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| ── Discount limit check ── | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| If pending_approval, create approval request usando desconto REAL (não aparente) | `recovery/src-legacy/src/hooks/useQuoteBuilderState.ts` |
| - 'dev' → apenas dev | `recovery/src-legacy/src/hooks/useRBAC.tsx` |
| * Converts ReplenishmentWithDetails to Product (minimum fields required by BulkVariantWizard). | `recovery/src-legacy/src/hooks/useReplenishmentsSelectionMode.ts` |
| Fetch quote items for this product (handle 1000-row limit) | `recovery/src-legacy/src/hooks/useSalesHistory.ts` |
| Fetch order items for this product (handle 1000-row limit) | `recovery/src-legacy/src/hooks/useSalesHistory.ts` |
| * useScrollDirection - Hook simplificado apenas para direção | `recovery/src-legacy/src/hooks/useScroll.ts` |
| Apenas erros de auth/permissão limpam (estado real desconhecido). | `recovery/src-legacy/src/hooks/useSecretsManager.ts` |
| * useSellerDiscountLimits — Gerencia limites de desconto por vendedor | `recovery/src-legacy/src/hooks/useSellerDiscountLimits.ts` |
| Fetch own limit (for sellers) | `recovery/src-legacy/src/hooks/useSellerDiscountLimits.ts` |
| Set/update limit for a seller | `recovery/src-legacy/src/hooks/useSellerDiscountLimits.ts` |
| Delete limit | `recovery/src-legacy/src/hooks/useSellerDiscountLimits.ts` |
| Se não há variação, criar opções de 1 até o máximo | `recovery/src-legacy/src/hooks/useTechniquePricing.ts` |
| Substitui useState quando o estado deve persistir no histórico/URL. | `recovery/src-legacy/src/hooks/useUrlState.ts` |
| === useScribe MUST be called unconditionally === | `recovery/src-legacy/src/hooks/useVoiceAgent.ts` |
| === Request microphone permission explicitly === | `recovery/src-legacy/src/hooks/useVoiceAgent.ts` |
| Stop all tracks immediately — we just needed permission | `recovery/src-legacy/src/hooks/useVoiceAgent.ts` |
| 1. Request microphone permission first | `recovery/src-legacy/src/hooks/useVoiceAgent.ts` |
| Sem dependências externas; apenas Canvas API. | `recovery/src-legacy/src/lib/kit-og-image.ts` |
| Fire-and-forget — falha de telemetria não pode quebrar o app. | `recovery/src-legacy/src/lib/external-db/bridge-telemetry-client.ts` |
| * Business Intelligence — Central de inteligência comercial 360° por cliente. | `recovery/src-legacy/src/pages/BusinessIntelligencePage.tsx` |
| * Business logic in useMockupGenerator hook. | `recovery/src-legacy/src/pages/MockupGenerator.tsx` |
| Atalho para Business Analytics do cliente — substitui o antigo painel de Recomendações IA, | `recovery/src-legacy/src/pages/QuoteBuilderPage.tsx` |
| $%^&*(),.?":{}\|<>]/, 'Senha deve conter caractere especial'), | `recovery/src-legacy/src/pages/ResetPassword.tsx` |
| * useQuotesDashboard — Business logic hook for QuotesDashboardPage. | `recovery/src-legacy/src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| * useSellerCartsPage — Business logic hook for SellerCartsPage | `recovery/src-legacy/src/pages/seller-carts/useSellerCartsPage.ts` |
| Validate each template has required fields | `recovery/src-legacy/src/utils/templateExport.ts` |
| * Mostra apenas o ícone (modo compacto, ex.: sidebar colapsada). */ | `src/components/RoleBadge.tsx` |
| * Caminho bloqueado (apenas pathname, ex: "/admin/telemetria"). */ | `src/components/access/DevAccessDeniedPage.tsx` |
| Se não houver, preservamos o próprio /unauthorized apenas como referência — | `src/components/access/UnauthorizedPage.tsx` |
| * Visível apenas para devs. Em ambiente saudável, renderiza um banner | `src/components/admin/DevAccessAuditAlert.tsx` |
| aprovação de desconto. Lê `discount_approval_audit` (gerada por trigger | `src/components/admin/DiscountApprovalAuditTrail.tsx` |
| * DiscountApprovalQueue — fila administrativa de solicitações de desconto pendentes. | `src/components/admin/DiscountApprovalQueue.tsx` |
| 0 órfãos). Reaproveitamos a Row canônica e apenas anotamos os dois embeds. | `src/components/admin/DiscountApprovalQueue.tsx` |
| (evita o hard limit anterior de 200 e mantém performance conforme o volume cresce). | `src/components/admin/DiscountApprovalQueue.tsx` |
| pending -> approved/rejected; uma linha já decidida não pode ser | `src/components/admin/DiscountApprovalQueue.tsx` |
| re-decidida (espelha a validação da RPC respond_discount_approval_transactional). | `src/components/admin/DiscountApprovalQueue.tsx` |
| Edit Limit Dialog */} | `src/components/admin/DiscountManagementPanel.tsx` |
| * Delete the backing storage object. Shared/reused artwork must only detach. */ | `src/components/admin/ImageUploadButton.tsx` |
| 🛡️ Camada de Segurança V2.0: Validação de integridade e tipo real | `src/components/admin/ImageUploadButton.tsx` |
| artwork can be referenced by multiple kit targets and must be detached | `src/components/admin/ImageUploadButton.tsx` |
| * SellerDiscountLimitsPanel — gestão administrativa do limite máximo de desconto por vendedor. | `src/components/admin/SellerDiscountLimitsPanel.tsx` |
| - Edição: badge_key é imutável (somente leitura); is_system é protegido. | `src/components/admin/badges-manager/BadgeFormDialog.tsx` |
| Badges de sistema (is_system) não podem ser excluídas — apenas desabilitadas. | `src/components/admin/badges-manager/BadgeTable.tsx` |
| onde/como são usadas, regra de negócio, prioridade e configuração. | `src/components/admin/badges-manager/BadgesManager.tsx` |
| ativos/inativos, faixa de preço e estoque mínimo, com paginação server-side | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| (limit/offset) e contagem exata para revisar o catálogo externo sem precisar | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| * Erro do hook ao listar segredos (sem permissão / sessão expirada / rede). */ | `src/components/admin/connections/CardSourceDiagnostic.tsx` |
| * Mostra **apenas** dados não-sensíveis: | `src/components/admin/connections/ConnectionDetailsDialog.tsx` |
| * Inline alert shown above "Testar conexão" when one or more required | `src/components/admin/connections/ConnectionPreflightAlert.tsx` |
| Reconstrói apenas headers seguros (servidor já mascarou os sensíveis) | `src/components/admin/connections/ConnectionTestDetailsDialog.tsx` |
| Limit fetched rows to cover the largest preview size + headroom for filtering | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` |
| * Callback quando o estado aberto muda (apenas em modo controlado). */ | `src/components/admin/connections/ConnectionTimelineDrawer.tsx` |
| * Importante: é apenas leitura, não dispara invocações novas — recebe os | `src/components/admin/connections/CredentialsSourceIndicator.tsx` |
| * Handler de refresh manual: deve invalidar o cache no servidor | `src/components/admin/connections/CredentialsSourceIndicator.tsx` |
| Pega o secret mais recentemente atualizado (apenas os com updated_at) | `src/components/admin/connections/CredentialsSourceIndicator.tsx` |
| via edge function `mcp-keys-issue` — este componente apenas coleta | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| * Timeout efetivo aplicado (apenas em falhas por timeout). */ | `src/components/admin/connections/LastTestLine.tsx` |
| - Não inicia carga de secrets sozinho — apenas reage ao hook compartilhado. | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| - ConnectionsIncidentStrip mostra apenas incidentes com severidade ≥ filtro | `src/components/admin/connections/SeverityFilterContext.tsx` |
| * SmokeTestChecklist — validação manual da pipeline de credenciais. | `src/components/admin/connections/SmokeTestChecklist.tsx` |
| * Não expõe nenhum valor de segredo — apenas máscaras e metadados. | `src/components/admin/connections/TestAllConnectionsButton.tsx` |
| * True se URL + Service estão presentes (mínimo para testar). */ | `src/components/admin/connections/TestAllConnectionsButton.tsx` |
| Invalida apenas as queryKeys relevantes da zona via React Query e | `src/components/admin/connections/ZoneRefreshButton.tsx` |
| * Tom semântico do header — afeta apenas o ícone + barra lateral */ | `src/components/admin/connections/ZoneSection.tsx` |
| All Connections components must use these helpers so the user | `src/components/admin/connections/secretErrors.ts` |
| * Short tag rendered as a chip ("Permissão", "Validação", ...). */ | `src/components/admin/connections/secretErrors.ts` |
| * Stable code so callers can branch (e.g., disable retry on permission). */ | `src/components/admin/connections/secretErrors.ts` |
| deve ter (ou herdar via fallback) uma entrada aqui. | `src/components/admin/connections/secretImpactMap.ts` |
| * Fluxos de negócio afetados (verbos de ação). */ | `src/components/admin/connections/secretImpactMap.ts` |
| * Resolve o impacto para um nome de secret. Retorna `null` apenas se a | `src/components/admin/connections/secretImpactMap.ts` |
| * Pure normalizers applied BEFORE validation to fix common copy/paste mistakes. | `src/components/admin/connections/secretNormalizers.ts` |
| Auth/validation errors are NOT retried (fail fast). | `src/components/admin/connections/secretRetry.ts` |
| Never retry: client/auth/validation | `src/components/admin/connections/secretRetry.ts` |
| * Comprimento mínimo absoluto para qualquer secret. O sufixo mascarado | `src/components/admin/connections/secretValidators.ts` |
| flagged when it is required but absent, or when its stored length is below | `src/components/admin/connections/secretValidators.ts` |
| `secrets-manager` edge function. MUST stay in sync with | `src/components/admin/connections/secretWhitelist.ts` |
| Expira contexto antigo | `src/components/admin/connections/useFocusContext.ts` |
| * Apenas leitura inicial (sem reagir). Útil para restauração one-shot no mount. */ | `src/components/admin/connections/useFocusContext.ts` |
| garante JWT pronto + permissão admin | `src/components/admin/connections/useIncidentTimeline72h.ts` |
| garante JWT pronto + permissão admin | `src/components/admin/connections/useRecentIncidents.ts` |
| - Mudança de P0→P1 (downgrade) — apenas escalations geram toast | `src/components/admin/connections/useSeverityChangeNotifier.ts` |
| Must throw on failure — proceeding would create duplicate components. | `src/components/admin/personalization/GroupInheritance.tsx` |
| Required by the categories RLS INSERT policy is_org_owner_or_admin(organization_id). | `src/components/admin/products/NewCategoryDialog.tsx` |
| Validade do preço (dias). Após esse prazo o sistema avisa o vendedor | `src/components/admin/products/ProductFormSchema.ts` |
| Expirações dos flags (null = sem limite) | `src/components/admin/products/ProductFormSchema.ts` |
| * useProductsManager — Business logic hook for ProductsManager. | `src/components/admin/products/useProductsManager.ts` |
| BUG-08: galeria completa preservada; imageUrl apenas como fallback | `src/components/admin/products/useProductsManager.ts` |
| Edição desfeita: o rascunho gravado nesta sessão não pode reviver o valor desfeito. | `src/components/admin/products/hooks/useProductFormDraft.ts` |
| Marca + País + Prazo + Modo */} | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| * useEngravingWizard — Business logic for the engraving wizard | `src/components/admin/products/sections/engraving/useEngravingWizard.ts` |
| - Somente FULL (chaves com escopo *) | `src/components/admin/security/keys/McpKeysFilters.tsx` |
| gateamos por `useUserRole` para evitar mostrar a UI a quem não pode usar. | `src/components/admin/security/role-migration/RoleMigrationPanel.tsx` |
| apenas colunas reais e não os retorna. | `src/components/admin/suppliers-manager/types.ts` |
| * Não depende da RPC `get_edge_invoke_summary` (draft, REGRA #1). Assim | `src/components/admin/telemetry/EdgeInvokeLivePanel.tsx` |
| - obriga justificativa (mínimo 10 caracteres) | `src/components/admin/users/PromotionDialog.tsx` |
| R4: exibida apenas quando o usuário digita texto livre (não é uma ação rápida conhecida) | `src/components/ai/AIMockupAssistant.tsx` |
| que o pai deve automaticamente focar o formulário de e-mail (sem exigir clique). | `src/components/auth/SocialLoginButtons.tsx` |
| * Botões de login social. Atualmente: somente Google via Supabase Auth nativo. | `src/components/auth/SocialLoginButtons.tsx` |
| Sucesso: o navegador deve redirecionar. Timers serão limpos pelo unmount/visibilitychange. | `src/components/auth/SocialLoginButtons.tsx` |
| Falha transitória de rede não pode condenar o widget para sempre: | `src/components/auth/TurnstileWidget.tsx` |
| 50, 0); // estimativa volume mínimo | `src/components/bi/ConfirmQuoteSuggestionsModal.tsx` |
| INSERTs e cria dois carrinhos, queimando o limite de 3. | `src/components/cart/CartCompanyPicker.tsx` |
| Roda ANTES do guard de limite: abrir o existente deve funcionar mesmo com 3. | `src/components/cart/CartCompanyPicker.tsx` |
| de limite: abrir o existente deve funcionar mesmo no limite máximo de carrinhos. | `src/components/cart/CartCompanyPickerDialog.tsx` |
| usuário possa apenas apertar Enter para tentar de novo (a11y). | `src/components/cart/CartItemErrorAlert.tsx` |
| - Sanitiza a entrada: aceita apenas dígitos (vírgula, ponto, espaço, letras | `src/components/cart/PopoverQtyInput.tsx` |
| - Valores vazios / inválidos / abaixo do mínimo revertem ao valor externo | `src/components/cart/PopoverQtyInput.tsx` |
| 4. Se nada disponível, retorna `null` — o consumidor deve suprimir o texto. | `src/components/cart/cartCompanyCnpj.ts` |
| Com o limite de 50 carrinhos, exibir todos quebrava o layout horizontal. | `src/components/cart/cart-utils/CartDialogs.tsx` |
| Em contexto inseguro (HTTP) ou sem permissão, a Clipboard API pode estar | `src/components/cart/cart-utils/CartExport.ts` |
| Estoque mínimo */} | `src/components/catalog/CatalogActiveFilters.tsx` |
| BUG-CS-12: Stale ID removal must not drop products that were already loaded | `src/components/catalog/useCatalogSelection.ts` |
| Indicador de expansão integrado (seta) - apenas para itens com filhos */} | `src/components/categories/CategorySidebarPanel.tsx` |
| Emoji da categoria (apenas para raiz com emoji) */} | `src/components/categories/CategorySidebarPanel.tsx` |
| Auto-expandir apenas os PAIS (não o nó selecionado) | `src/components/categories/CategorySidebarPanel.tsx` |
| * DEPRECATED — mantido apenas para retrocompatibilidade da API antiga | `src/components/common/ConfirmDialog.tsx` |
| permissão. Ações puramente locais (toggle de tema, abrir help) podem | `src/components/common/spotlight/SpotlightItems.ts` |
| Admin (visível apenas a admin/dev — filtrado em runtime) | `src/components/common/spotlight/SpotlightItems.ts` |
| Dev / Técnico (visível apenas a dev — filtrado em runtime) | `src/components/common/spotlight/SpotlightItems.ts` |
| * MyDiscountRequestsWidget — solicitações de desconto do usuário com busca, | `src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| (Minhas Propostas, Meus Pedidos, Solicitações de Desconto). | `src/components/dashboard/widget-filters/WidgetFiltersBar.tsx` |
| * Retorna um ref que deve ser anexado ao elemento sentinela no final da lista. | `src/components/dashboard/widget-filters/useInfiniteScroll.ts` |
| * Renderiza `children` apenas quando o usuário passa pelo `useDevGate` | `src/components/dev/DevOnly.tsx` |
| * Modo estrito (apenas `isDev`, ignora overrides de env/localStorage): | `src/components/dev/DevOnly.tsx` |
| apenas em navegacoes SPA subsequentes. | `src/components/effects/PageTransition.tsx` |
| cache bust, retry counter) **continua** funcionando — apenas a tela | `src/components/errors/EnhancedErrorBoundary.tsx` |
| * Tempo máximo em estado "Recuperando automaticamente…". Se o reload | `src/components/errors/EnhancedErrorBoundary.tsx` |
| `isAutoRecovering: false` é intencional: um NOVO erro deve sempre | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Navegação para trás/frente após o erro deve devolver uma UI viva, | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Se o recovery atingir o limite de reloads na janela de 30s, ele | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Falha no próprio pipeline de recovery não deve mascarar o erro. | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Ignora o limite de reloads aqui pois é uma ação manual do usuário. | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Preserva tokens auth do supabase para não deslogar; remove apenas chaves de cache de app | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Error message — restrito a usuários `dev` (gate de infra). Não-dev veem apenas a copy amigável acima. */} | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Retry sem reload (apenas erros de render) */} | `src/components/errors/EnhancedErrorBoundary.tsx` |
| timeout, formatação de nulo), apenas esse card vira um estado degradado | `src/components/errors/SectionErrorBoundary.tsx` |
| * O retry incrementa uma `key`, o que força a remontagem **somente** da | `src/components/errors/SectionErrorBoundary.tsx` |
| CALLBACKS THAT ARE REFERENCED BY useEffect hooks MUST BE DECLARED FIRST | `src/components/expert/chat/useExpertChat.ts` |
| MUST be declared before all useEffect hooks that reference it. | `src/components/expert/chat/useExpertChat.ts` |
| Server-side search apenas (preload de 100 empresas estourava statement_timeout no CRM). | `src/components/favorites/FavoritesClientPicker.tsx` |
| * Filtro: mostrar apenas items com queda de preço */ | `src/components/favorites/FavoritesSortBar.tsx` |
| VERSÃO COMPACTA (apenas swatches inline) | `src/components/filters/ColorGroupFilter.tsx` |
| Auto-swap: se novo mínimo supera máximo real (< sentinela 9999), inverte | `src/components/filters/FilterPanel.tsx` |
| Auto-swap: se novo máximo real é menor que mínimo, inverte | `src/components/filters/FilterPanel.tsx` |
| // Ao clicar numa cor já selecionada → remove apenas ela (mantém as demais). | `src/components/filters/InlineColorGroupFilter.tsx` |
| * BUG-SF-04 FIX: era priceRange < 500 — correto é < 9999 (valor sentinela de "sem limite"). | `src/components/filters/preset-utils.ts` |
| BUG-SF-04 FIX: threshold era 500, correto é 9999 (sentinela de "sem limite superior") | `src/components/filters/preset-utils.ts` |
| COMERCIAL — Filtros por vendas (somente Super Filtro) — janela padronizada 90d | `src/components/filters/filter-panel/types.ts` |
| BUG-SF-12 FIX: limite era 30 sem indicador — aumentado para 50 e adicionado | `src/components/filters/filter-panel/sections/SimpleFilters.tsx` |
| aviso "+X mais" quando o total filtrado excede o limite. | `src/components/filters/filter-panel/sections/SimpleFilters.tsx` |
| FIX 2026-08-15: Badge (renderiza <div>) não pode ficar dentro de | `src/components/intelligence/MarketIntelligenceChart.tsx` |
| Limit selector */} | `src/components/intelligence/RankingFilterToolbar.tsx` |
| * Callout inteligente exibido apenas quando o painel retorna zero E há filtros | `src/components/intelligence/ZeroResultDiagnosisCallout.tsx` |
| Não há filtros ativos e o resultado é zero — pai deve tratar, mas por segurança: | `src/components/intelligence/ZeroResultDiagnosisCallout.tsx` |
| `since` é recalculado apenas quando `period` muda | `src/components/inventory/StockAlertsIndicator.tsx` |
| Estoque futuro — janela de 30 dias (regra de negócio). | `src/components/inventory/StockDashboard.tsx` |
| * Modo de negócio: SEMPRE variação-first (1 linha = 1 SKU). | `src/components/inventory/VariantStockTable.tsx` |
| estado obsoleto após a mudança de modelo de negócio (variação-first + scroll virtual). | `src/components/inventory/VariantStockTable.tsx` |
| ao comportamento estático (≤ mínimo do produto). | `src/components/inventory/VariantStockTable.tsx` |
| ativo. Usado APENAS para customizar o texto do estado vazio — a filtragem | `src/components/inventory/VariantStockTable.tsx` |
| QueryClientProvider) somente quando a flag `useEmaRupture` está ativa. | `src/components/inventory/VariantStockTable.tsx` |
| (override apenas quando o status base era `in_stock` e a projeção indica | `src/components/inventory/VariantStockTable.tsx` |
| Aplica fórmula preditiva apenas quando o status base é "saudável". | `src/components/inventory/VariantStockTable.tsx` |
| Virtual scroll: renderiza apenas a janela visível — suporta 5k+ SKUs sem degradação. | `src/components/inventory/VariantStockTable.tsx` |
| * Dados da projeção preditiva (apenas quando status foi reavaliado por Risco de Ruptura). */ | `src/components/inventory/VariantStockVisuals.tsx` |
| deve passar por aqui para não dar drift entre bulk e single-row. | `src/components/inventory/useStockSelection.ts` |
| Peso desconhecido nunca deve ser lido como zero: um kit com 1 item sem | `src/components/kit-builder/FreightEstimator.tsx` |
| * Etapa 18: 3 erros de negócio distintos em vez do genérico "Erro ao gerar | `src/components/kit-builder/KitAIPromptDialog.tsx` |
| O servidor já devolve mensagens de negócio (sem chave/quota/timeout); | `src/components/kit-builder/KitAIPromptDialog.tsx` |
| Reabrir o guia num passo diferente deve pular direto para o capítulo | `src/components/kit-builder/KitMakerGuideDialog.tsx` |
| O componente apenas dispara o callback; a página decide se aplica filtros | `src/components/kit-builder/KitOccasionSelector.tsx` |
| ou apenas armazena para sugestões contextuais. | `src/components/kit-builder/KitOccasionSelector.tsx` |
| `totalWeight` soma apenas os pesos conhecidos (nunca assume 0 para um | `src/components/kit-builder/KitSummary.tsx` |
| `<aside>` acima é ocultado inteiro pela regra genérica de impressão | `src/components/kit-builder/KitSummary.tsx` |
| match the currently selected technique's area, the stale technique/price must | `src/components/kit-builder/PersonalizationConfig.tsx` |
| Dimensões — somente se técnica usa dimensão */} | `src/components/kit-builder/PersonalizationConfig.tsx` |
| * Below this limit the regular DOM is faster, simpler and keeps all results | `src/components/kit-builder/VirtualizedKitItemList.tsx` |
| de AAL hidrata; tratar apenas `aal1` liberava painel admin por uma janela | `src/components/layout/AdminRoute.tsx` |
| tardia de AAL, etc.) NÃO deve reabrir o challenge — redireciona para | `src/components/layout/AdminRoute.tsx` |
| apenas se o usuário chegar em AAL2). | `src/components/layout/AdminRoute.tsx` |
| rate-limit, login-attempts, external-db, status do sistema. | `src/components/layout/DevRoute.tsx` |
| * Hierarquia: dev > supervisor > agente. Apenas `dev` passa. | `src/components/layout/DevRoute.tsx` |
| Mostra toast imediato de processamento se desejar, ou apenas aguarda | `src/components/layout/Header.tsx` |
| Context providers must be imported synchronously (consumers render inside them) | `src/components/layout/MainLayout.tsx` |
| para a qual não tem permissão. | `src/components/layout/sidebar/RestrictedRouteNotice.tsx` |
| E-24: mesma regra dos dots/thumbnails do MagicUpResultPanel — modo NÃO-WRAP. | `src/components/magic-up/MagicUpVariationComparator.tsx` |
| ArrowRight/Down no último e ArrowLeft/Up no primeiro param no limite (não ciclam); | `src/components/magic-up/MagicUpVariationComparator.tsx` |
| Regra única do logo do mockup (SVG fora: a edge generate-mockup rejeita SVG). | `src/components/mockup/AreaCard.tsx` |
| * Validação sem rede: extensão, tipo informado pelo navegador e tamanho. Retorna a mensagem de erro ou null. */ | `src/components/mockup/ArtFileUpload.tsx` |
| * Máximo de cores suportadas na área */ | `src/components/mockup/MultiAreaManager.tsx` |
| ANTI-REGRESSÃO: primary_image_url deve vir ANTES de og_image_url. | `src/components/mockup/ProductSearchCombobox.tsx` |
| NÃO contém limites numéricos: qualquer número de limite (cores, dimensões, | `src/components/mockup/TechniqueTooltip.tsx` |
| qualitativos abaixo são apenas estimativas e aparecem rotulados como tal. | `src/components/mockup/TechniqueTooltip.tsx` |
| limite quando o cadastro realmente o traz — nada de valor fixo no código. | `src/components/mockup/TechniqueTooltip.tsx` |
| Cores — limite do cadastro quando existir; senão, estimativa rotulada */} | `src/components/mockup/TechniqueTooltip.tsx` |
| Laser detection — must come before UV check since "Laser UV" exists | `src/components/mockup/techniqueColorUtils.ts` |
| a caixa cheia é um limite superior: a bbox nunca subestima a marca girada e um | `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx` |
| * Filtro de técnica EFETIVO — o mesmo que a prévia aplica. Decide se há regra. */ | `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx` |
| … +1254 linhas — lista completa em `context.json` | |
