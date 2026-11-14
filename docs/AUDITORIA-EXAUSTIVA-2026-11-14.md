# Auditoria exaustiva — 2026-11-14

Workflow `qa-exaustiva-sistema`: 13 domínios, 1 agente de simulação + verificação dupla (2 verificadores independentes) por achado. 91 agentes, 1446 tool calls, ~15M tokens de subagentes.

**Resultado:** 34 achados confirmados (sobrevivem à dupla verificação), 2 disputados (1 verificador confirma, outro não), 3 refutados (falsos positivos, descartados).

Esta auditoria evita repetir achados já documentados em `docs/prod-readiness.md` (mantido por outra sessão) ou já cobertos por PR aberta nesta sessão (vaul CSP #3607, aba Marketing #3580, ledger de migrations #3581, revoke schemas #3544, catálogo perf #3551, comparador e2e #3588).

## P0 — crítico, ação imediata

### 1. RLS de `orders`/`order_items` sem escopo de vendedor — vazamento de dados comerciais entre vendedores
Confirmado de forma independente por **3 agentes diferentes** (domínios Clientes/CRM, BI/Trends, Banco/RLS), todos batendo na mesma causa raiz.

- **Policies vivas** (`orders_select`, `orders_insert`, `orders_update`, `order_items_select`, `order_items_update`) checam só `user_is_org_member(organization_id)` — **sem** referência a `seller_id`. Confirmado ao vivo via `pg_policies` no projeto canônico `doufsxqlfjyuvxuezpln` e no baseline (`supabase/baseline/20261015140000_baseline_schema.sql:106384-106403`).
- Isso contradiz a spec do próprio time (`docs/security/RLS_MATRIX.md:88-120`: "SELECT/INSERT/UPDATE vendedor terceiro/alheio → DENY") e uma migration antiga que implementou corretamente o escopo (`20260426125603_...sql:124-168`, policies `orders_select_scope`/`orders_update_scope` com `seller_id = auth.uid() OR can_view_all_sales() OR supervisor`). **Não há nenhuma migration no repo que explique a troca** para as policies sem escopo atuais — regressão sem rastro.
- **Efeito real, verificado no código consumidor:** qualquer vendedor autenticado vê faturamento, LTV, ticket médio, health score e sazonalidade de clientes de **outros** vendedores da mesma organização:
  - `src/hooks/bi/useClientsComparison.ts:38-44`, `useClientOrdersHistory.ts:48-58`, `ClientComparator.tsx:46` — comparador de clientes renderiza dados de cliente alheio sem gate.
  - `src/pages/clients/ClientDetailPage.tsx:12-34` + `useClientTopProducts.ts:14-30` — a tela mostra "Cliente não encontrado", mas a query de pedidos reais do cliente alheio já disparou e o payload chega ao browser (visível em devtools/Network).
  - `src/components/intelligence/ConversionFunnel.tsx:78-86` (rota `/tendencias`), `useCommercialIntelligence.helpers.ts:383-574` (rota `/inteligencia-comercial`) — mesmos dados sem filtro de vendedor nos painéis de BI.
  - Dois comentários no código (`useClientOrdersHistory.ts:48`, `useClientTopProducts.ts:23`) afirmam **incorretamente** "RLS aplica seller scope".
- **Ação:** migration restaurando o escopo por `seller_id` (reaplicar o padrão de `20260426125603`), nas 5 policies. **Fica como PR aberta para o dono aprovar** (DDL em produção, regra do AGENTS.md) — não mergeio sozinho.

### 2. "Esqueci minha senha" quebrado para todo usuário anônimo (GRANT ausente)
- `anon` não tem `SELECT` em `password_reset_requests` (confirmado no comentário da migration `20260524210001_harden_anon_grants_and_password_reset_rate_limit.sql`). É o único caminho de auto-atendimento (`src/hooks/auth/usePasswordResetRequests.ts:161-167`) — **100% inoperante** para quem não está logado.
- **Ação:** migration com `GRANT SELECT` mínimo necessário. PR aberta para o dono (DDL em produção).

### 3. Botão "Rodar auditoria" do Connections Hub dispara reenvio real de webhooks + DELETE de logs, disfarçado de health-check
- `src/components/admin/connections/IntegrationsHealthCard.tsx:264-279` → `connections-hub-audit` → `rpc('retry_failed_webhook_deliveries')` (reenvia de verdade todo webhook falhado na última 1h) e `rpc('cleanup_webhook_logs')` (DELETE real em `webhook_deliveries`/`inbound_webhook_events` >90 dias). Nenhuma confirmação, nenhum dry-run — ao contrário de todas as outras checagens da mesma função, que só fazem `SELECT count`.
- **Ação:** código de app (edge function + frontend), sem DDL — **posso corrigir e mergear** (tornar dry-run por padrão, ou exigir confirmação explícita antes de disparar as duas RPCs).

### 4. RLS de INSERT em `workspace_notifications` permite qualquer usuário autenticado notificar qualquer outro (spam/phishing cross-tenant)
- Histórico de duas tentativas de correção no mesmo dia (2026-06-22) que se desfizeram uma à outra — a policy viva hoje voltou ao check fraco. Confirmado via `pg_policies` em produção.
- **Ação:** migration reforçando o `WITH CHECK` (via `fn_notify_user` SECURITY DEFINER, como já planejado em 2026-06-22). PR aberta para o dono (DDL em produção).

## P1 — alto, não é segurança mas afeta usuário real

| Domínio | Achado | Arquivo:linha |
|---|---|---|
| Catálogo | `categories-api` zera grade silenciosamente em categoria-pai com +700 descendentes (URL length do PostgREST sem batching) | `supabase/functions/categories-api/index.ts:199,225` |
| Catálogo | Busca Avançada de Preço corta catálogo em 3.000 itens (ordenação alfabética), ~60% invisível, sem aviso | `src/pages/advanced-price-search/useAdvancedPriceSearch.ts:33-36` |
| Carrinho | Orçamento pela lista de carrinhos não valida produto descontinuado (mesma ação na tela de detalhe valida) | `src/pages/products/CartsListPage.tsx:144-187` |
| Kit Builder | Colaboração em kit 100% inacessível (não importada em nenhuma tela) + RLS que a inviabilizaria mesmo conectada | `src/components/kit-builder/KitCollaborationPanel.tsx:25` |
| Kit Builder | Variantes de kit (P/M/G): feature completa, nunca renderizada | `src/components/kit-builder/KitVariantsManager.tsx:1` |
| Orçamentos | `crm-callback-reprocess` usa lógica de negócio duplicada e mais antiga que o handler principal (`@deprecated` mas ainda ativo) | `supabase/functions/crm-callback-reprocess/index.ts:40-69` |
| Admin produtos | Edição de produto é full-overwrite sem checagem de concorrência — 2º admin apaga mudança do 1º silenciosamente | `src/pages/admin/AdminProductFormPage.tsx:425-445` |
| Admin produtos | Filtro de preço/kit aplicado só na página carregada; paginação mostra total sem esse filtro | `src/components/admin/products/useProductsManager.ts:344-353` |
| Admin geral | Dashboard "Rate Limiting" lê `login_attempts` disfarçado — não reflete rate limit real | `src/pages/system/RateLimitDashboardPage.tsx:38-53` |
| Admin geral | Promoção de papel com auditoria é contornável por botão "Alterar Role" na mesma tela (sem trigger de auditoria em `user_roles`) | `src/components/admin/users/useUserManagement.ts:80-103` |
| Clientes/CRM | `ClientDetailPage` dispara query de pedidos de cliente não-autorizado mesmo mostrando "não encontrado" (mesmo gap do P0 #1) | `src/pages/clients/ClientDetailPage.tsx:12-34` |
| Magazine/Magic Up | Fila de geração em lote sempre reporta sucesso mesmo com 0 variantes geradas | `src/hooks/intelligence/useMagicUpState.ts:686-701` |
| Magazine/Magic Up | Botão "WhatsApp" do Magic Up nunca envia a imagem gerada, só texto | `src/hooks/intelligence/magicUpShare.ts:46-53` |
| Fornecedores | Navegador Dropbox: edge suporta paginação, UI nunca pede próxima página (pastas grandes truncadas sem aviso) | `src/hooks/intelligence/useDropboxFiles.ts:42-65` |
| Fornecedores | Ingestão Ásia: guarda de SKU ausente no branch de variações permite colisão silenciosa de produtos | `supabase/functions/asia-ingestion/index.ts:44-57` |
| Notificações | `collections-watcher` reenvia a mesma notificação de queda de preço todos os dias (dedupe por data, não por evento) | `supabase/functions/collections-watcher/index.ts:19-30` |
| Banco/RLS | Mesma regressão do P0 #1, achada de forma independente no domínio banco | — |

## P2 — médio, UX/cosmético/risco latente

- Cron de queda de preço em favoritos ignora produtos sem desconto, ao contrário do badge da UI (`supabase/functions/favorites-watcher/index.ts:66-74`).
- Comparador de kits e Widget de kits similares: componentes prontos, nunca abertos por nenhuma tela (`KitComparisonDialog.tsx`, `SimilarKitsWidget.tsx`).
- `quote_approval_tokens`: tabela/triggers de assinatura de orçamento completos no banco, zero código de aplicação.
- Rascunho de "novo orçamento" usa mesma chave de `localStorage` em qualquer aba, sobrescrevendo silenciosamente.
- Busca/filtros/página/seleção da lista de produtos (admin) não sobrevivem a F5.
- Filtro "Tabela" em `/admin/rls-denials` se autodestrói ao ser usado.
- Painéis de incidente (`v4-callbacks`, `rls-denials`) truncam em 500/1000 linhas sem indicar truncamento.
- Write path do `crm-db-bridge` sem owner scope por linha (risco latente, hoje sem caller).
- Busca Avançada de Preço perde filtros/resultados ao atualizar a página.
- Dashboard de Cobertura mostra dados fictícios fixos por padrão (sem fonte real).
- `cleanup-novelties`: guarda anti-loop só loga, sem alertar sobre UPDATE falhando persistentemente.

## Disputados (1 verificador confirma, outro refuta — não entram no backlog sem revisão manual)

- `useKitVariants.createVariant`: possível race de `sort_order` a partir de array desatualizado.
- `mockup_approval_links`: schema/RLS completos, sem código de frontend (pode ser outra feature "pela metade" real, mas não confirmado 2/2).

## Refutados (falsos positivos, descartados)

- Importação em massa com `organization_id` fixo — não é bug (confirmado: todos os produtos pertencem à mesma organização).
- Painéis de segurança "zero incidentes" para admin não-dev — comportamento esperado do gate de UI.
- `cleanup-notifications` limpa tabela morta — achado real mas já reclassificado: a ausência de retenção em `workspace_notifications` é consequência do P0 #4, não um bug novo separado.
