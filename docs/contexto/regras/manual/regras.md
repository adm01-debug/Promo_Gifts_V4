# Regras de negócio — Promo Brindes (Promo Gifts V4)

> **Fonte de verdade manual.** Regras que o código não torna óbvias ou que não aparecem
> automaticamente no snapshot do banco. Atualizar neste arquivo quando uma decisão de
> negócio mudar. Versionado em `main`; entra em `07-REGRAS-DE-NEGOCIO.md` via contexto.yml.
>
> Atualizado em: 2026-11-04 (E071/E131 — criação inicial baseada em SCHEMA_REFERENCE,
> REGRA #2, análise de 500 commits e agents de auditoria)

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
