# Reconciliação de Auditorias Anteriores — Promo Gifts V4

**Gerado em:** 2026-10-31  
**Sessão:** PROMO GIFTS V4 (bed6ac4e-1cfe-4adc-9a44-2d0604e1e401)  
**SHA main referência:** `7f1d3d23b89a755903f8ac6f208de47852674ba4`  
**Última revisão:** 2026-10-31 — corrigidos achados L e O após verificação cruzada com sessão paralela 92fcfee1  
**Metodologia:** Leitura direta dos documentos históricos + verificação cruzada com código atual e banco

---

## 1. DOCUMENTOS EXAMINADOS

| Arquivo | Data | Agente/Sessão | SHA referência |
|---|---|---|---|
| `analise-prs/RELATORIO_VALIDACAO_EXAUSTIVA.md` | 2026-10-22 | session_01RfQzo8Ean3zudG2sEN79b6 (5 agentes paralelos) | `8e8053b9` → `3e006427` |
| `analise-prs/RELATORIO_FINAL_META.md` | 2026-10-27 | session_01VXkRxWq5ZUCmvuNx5e2TGX (claude_pink) | `e0b569f1` → `4c5fdd72` |
| `analise-prs/RELATORIO_PRS.md` | 2026-10-29/30 | session_01RfQzo8Ean3zudG2sEN79b6 | `8bc08b12` → `66d032af` / `52570b33` |
| `analise-prs/dossies/` (200+ dossiês) | 2026-10-29/30 | mesma sessão acima | inline |
| `analise-prs/progresso.json` | 2026-10-30 | mesma sessão acima | `52570b33` |
| `analise-prs/regras-de-negocio.md` | 2026-10-29 | mesma sessão acima | — |

**Fontes inacessíveis:** Nenhuma — todos os documentos listados foram lidos integralmente.

---

## 2. ACHADOS POR AUDITORIA — ORIGEM E RECONCILIAÇÃO

### 2.1 RELATORIO_VALIDACAO_EXAUSTIVA.md (2026-10-22)

**Escopo:** 28 PRs abertas; 3 mergeadas; 1 gap de segurança crítico descoberto.

#### Achado A — 5 callers de `fn_get_product_customization_options` sem guarda de sessão

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_VALIDACAO_EXAUSTIVA.md § PR #2351 |
| **Descrito como** | PR #2351 corrigiu `ProductPersonalizationRules.tsx` mas deixou 5 hooks sem `getSession()` guard |
| **Arquivos citados** | `useProductCustomizationOptions.ts:113`, `useProductEngravingOptions.ts:34`, `useMockupTechniques.ts:88`, `TechniqueMultiSelector.tsx:65`, `useSimulatorWizard.ts:60` |
| **PR de correção** | #2351 (merge SHA `3e06378a5e`) |
| **Verificação 2026-10-31** | Grep direto em `main@7f1d3d23` — todos os 5 arquivos têm `getSession()` guard antes da chamada RPC |
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** |

#### Achado B — `fn_cron_guard` com vetor de SQL injection (sem auth)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_VALIDACAO_EXAUSTIVA.md § PR #2352 |
| **Descrito como** | `fn_cron_guard(bigint, text)` executa `EXECUTE p_sql`; anon pode chamar via anon key |
| **Migration de correção** | `20261022100001` — REVOKE EXECUTE em `fn_cron_guard` |
| **Verificação 2026-10-31** | Migration `20261022100001` aparece na lista de migrations aplicadas do banco `doufsxqlfjyuvxuezpln` |
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** |

#### Achado C — 13 DROP INDEX pendentes (`stock_snapshots`, 779 MB)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_VALIDACAO_EXAUSTIVA.md § PR #2352 |
| **Descrito como** | Migration `20261022100011` remove 13 índices; 7 são unique constraints/GIN — exigem aprovação PO |
| **Situação** | ⚪ **NÃO VERIFICADO** — decisão PO pendente; sem evidência de aplicação ou rejeição |

#### Achado D — 15 PRs de template incorreto (#2322–#2337)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_VALIDACAO_EXAUSTIVA.md |
| **Situação** | ⚪ **NÃO VERIFICADO** — presumivelmente fechadas pelo PO |

---

### 2.2 RELATORIO_FINAL_META.md (2026-10-27)

**Escopo:** 13 PRs; 1 mergeada; 7 fechadas pelo PO; 4 bloqueadas (draft); 1 não mergeada.

#### Achado E — `react-day-picker` v8→v10 (PR #2588)

| Campo | Detalhe |
|---|---|
| **Verificação 2026-10-31** | SHA `4c5fdd72` é ancestral de `7f1d3d23` — confirmado via git history |
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** — em produção desde 27/10 |

#### Achado F — Gate Final não triggerou em `4c5fdd72`

| Campo | Detalhe |
|---|---|
| **Situação** | ⚪ **SUPERADO** — `deploy-gates.yml` tem filtro de path; comportamento correto por design |

#### Achado G — PRs de rollbacks/migrations bloqueadas em draft (#2580, #2600, #2631)

| Campo | Detalhe |
|---|---|
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** — fechadas pelo PO; sem impacto residual |

---

### 2.3 RELATORIO_PRS.md (2026-10-29/30)

**Escopo:** 23/24 PRs (2 sessões); 9 mergeadas; 6 DECISAO_HUMANA; 4 conflito/fechadas.

#### Achado H — PRs DECISAO_HUMANA (sessão de 29/10)

| PR | Título | Estado 2026-10-31 | Situação |
|---|---|---|---|
| [#2731](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2731) | fix(db): protege kill_switch_hits contra INSERT anônimo | **ABERTA** — DDL + workflow | ⏳ **CONFIRMADO E PENDENTE** |
| [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | fix(ci): protege contrato repair-only E15 | Mergeada 29/10 | ✅ **CORRIGIDO E VERIFICADO** |
| [#2720](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2720) | ci(e2e): não ocultar falha na geração de fixtures | Mergeada 29/10 | ✅ **CORRIGIDO E VERIFICADO** |
| [#2734](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2734) | fix(ci): mirror Docker Hub após limite GHCR | Mergeada 30/10 | ✅ **CORRIGIDO E VERIFICADO** |
| [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717) | fix(e2e): isola servidor Vite no CI de paridade | Fechada s/merge 30/10 (CI + conflito) | ❌ **CONFIRMADO E PENDENTE** — fix válido, fechado por conflito |
| [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714) | fix(db): reconciliar migrations pendentes | Fechada s/merge 30/10 | ❌ **CONFIRMADO E PENDENTE** — 4 migrations DDL ainda não aplicadas |

#### Achado I — PRs DECISAO_HUMANA (sessão de 30/10)

| PR | Situação |
|---|---|
| [#2821](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2821) | ⚪ **NÃO VERIFICADO** |
| [#2823](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2823) | ⚪ **NÃO VERIFICADO** |
| [#2824](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2824) | ⚪ **NÃO VERIFICADO** |
| [#2826](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2826) | ⚪ **NÃO VERIFICADO** |

#### Achado J — E2E falhas pré-existentes `catalog.spec.ts` / `kit-builder.spec.ts`

| Campo | Detalhe |
|---|---|
| **Situação** | ⚪ **NÃO VERIFICADO** no código atual — presumivelmente ainda pré-existente |

#### Achado K — 4 PRs CI_FALHOU (Gate 1 / Gate 1.3)

| PR | Falha | Situação |
|---|---|---|
| #2810 | `usePromoFlixPlayer.ts` 624 > 500 linhas | ⚪ **NÃO VERIFICADO** |
| #2813 | `no-useless-escape` linha 45 | ⚪ **NÃO VERIFICADO** |
| #2822 | migration baseline desatualizado | ⚪ **NÃO VERIFICADO** |
| #2825 | migration baseline desatualizado | ⚪ **NÃO VERIFICADO** |

---

### 2.4 Auditorias de 2026-10-31 (esta sessão)

#### Achado L — `stock_notes` ausente no banco *(corrigido em revisão)*

| Campo | Detalhe |
|---|---|
| **Origem** | Sessão bed6ac4e, 31/10 — cruzamento banco vs código |
| **Localização** | `src/hooks/stock/useStockNotes.ts:52,67,85` (SELECT + INSERT + DELETE) |
| **Impacto real** | **0 callers em `src/`** — hook existe mas não é importado por nenhum componente ou página. Verificado via `search_code` em `main@7f1d3d23`: todas as 17 ocorrências são em `docs/`, `.as-*-baseline.json` e `audit/`, nunca em `src/`. Não causa erro em produção agora. |
| **Ação** | PR [#2871](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2871) aberta com migration `20261031000000_create_stock_notes.sql`. Deve ser mergeada **antes** de qualquer PR que importe `useStockNotes`. |
| **Situação** | ⚪ **CONFIRMADO E PENDENTE (baixa urgência)** — código dormido; tabela precisa existir antes de integrar o hook |

#### Achado M — 6 migrations pendentes (última aplicada `20261027160000`)

| Migration | Conteúdo | Urgência | Situação |
|---|---|---|---|
| `20261027180000` | Reativa cron blurhash `*/10` | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027200000` | RLS deny-all `supplier_stricker` (17 tabelas) | **ALTA** | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027220000` | Desativa cron `xbz-image-uploader` (edge inexistente) | Média | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027230000` | Remove 3 entradas stale do allowlist | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027233000` | Adiciona `XBZ_IMAGE_UPLOADER_CRON_SECRET` | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027234500` | Reativa cron `xbz-image-uploader` | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261031000000` | Cria `stock_notes` (PR #2871) | Baixa (hook dormido) | ⏳ aguarda merge antes de integrar hook |

#### Achado N — 17 tabelas `supplier_stricker` sem RLS

| Campo | Detalhe |
|---|---|
| **Risco atual** | Baixo — schema sem `GRANT USAGE` para anon/authenticated |
| **Risco futuro** | Alto se qualquer integração for grantada antes da RLS |
| **Ação** | Aplicar migration `20261027200000` via `db-apply-migration.yml` |
| **Situação** | ⏳ **CONFIRMADO E PENDENTE** |

#### Achado O — Serviços em `src/services/` *(corrigido em revisão)*

| Arquivo | Verificação 2026-10-31 | Situação |
|---|---|---|
| `src/services/mockupService.ts` | `search_code` retorna 0 hits — arquivo removido ou nunca referenciado | ⚪ **SUPERADO ou REMOVIDO** |
| `src/services/productAnalyticsService.ts` | Não verificado individualmente | ⚪ **NÃO VERIFICADO** |
| `src/services/aiRecommendationsService.ts` | Não verificado individualmente | ⚪ **NÃO VERIFICADO** |
| `src/services/quotePricingService.ts` | Não verificado individualmente | ⚪ **NÃO VERIFICADO** |

**Nota:** Sessão paralela 92fcfee1 afirma que todos os 4 foram removidos. `mockupService` confirmado ausente. Os outros 3 precisam de verificação direta do tree.

#### Achado P — 5 edge functions potencialmente órfãs

| Função | Situação |
|---|---|
| `xbz-image-uploader` | ⚪ **CONFIRMADO E PENDENTE** |
| `send-notification` | ⚪ **CONFIRMADO E PENDENTE** |
| `magazine-public-react` | ⚪ **CONFIRMADO E PENDENTE** |
| `intelligence-substitute-applied` | ⚪ **CONFIRMADO E PENDENTE** |
| `mcp-keys-issue/update/rotate` | ⚪ **CONFIRMADO E PENDENTE** — ciclo MCP incompleto |

#### Achado Q — Branches não mergeados (274 analisados)

| Classificação | Quantidade |
|---|---|
| COMPLETO | 53 |
| PARCIAL | 121 |
| ABANDONADO | 100 |

**Situação:** ⚪ **CONFIRMADO E PENDENTE** — plano de 99 etapas disponível em session-state.

---

## 3. RECOMENDAÇÕES REPETIDAS ENTRE AUDITORIAS

| Recomendação | Auditorias | Status consolidado |
|---|---|---|
| Aplicar migrations pendentes via `db-apply-migration.yml` | 22/10, 27/10, 29/10, 31/10 | ⏳ **CONFIRMADO E PENDENTE** — 7 migrations |
| Não mergear DDL sem aprovação PO | Todas | ✅ Respeitado em todas as sessões |
| E2E pré-existentes não são regressão | 29/10, 31/10 | ✅ Confirmado |
| Fechar PRs de template incorreto | 22/10 | ⚪ Não verificado |
| Auth guard em callers de RPCs | 22/10 | ✅ CORRIGIDO E VERIFICADO |

---

## 4. CONTRADIÇÕES E DECISÕES PENDENTES

| Contradição | Documentos | Resolução |
|---|---|---|
| PR #2714 continha 4 migrations DDL (DECISAO_HUMANA); foi fechada sem merge em 30/10; migrations NÃO estão no banco | RELATORIO_PRS.md vs estado do banco 31/10 | Migrations de #2714 são subconjunto das 6 pendentes — aplicar via workflow |
| PR #2717 (fix Vite CI) fechada sem merge por conflito; fix é válido | RELATORIO_PRS.md | Criar nova PR rebased em main |
| `fn_cron_guard` reportado como SQL injection em 22/10; migration aplicada; RELATORIO_PRS.md de 29/10 não menciona | RELATORIO_VALIDACAO_EXAUSTIVA vs RELATORIO_PRS | CORRIGIDO — migration confirmada aplicada |
| **Achado L:** sessão bed6ac4e descreveu `stock_notes` como "erro em produção"; sessão 92fcfee1 identificou 0 callers | bed6ac4e vs 92fcfee1 | **Sessão 92fcfee1 está correta.** Confirmado via `search_code`: 0 callers em `src/`. Hook dormido. |
| **Achado O:** sessão bed6ac4e listou 4 serviços como PENDENTE; sessão 92fcfee1 diz foram removidos | bed6ac4e vs 92fcfee1 | `mockupService` confirmado ausente. Os outros 3 dependem de verificação do tree. |

---

## 5. TRABALHO ANTERIOR RECUPERADO

| Item | Origem | Estado |
|---|---|---|
| Auth guard em 5 callers de `fn_get_product_customization_options` | PR #2351 (22/10) | ✅ Em produção |
| Migration `fn_cron_guard` REVOKE EXECUTE | 22/10, migration `20261022100001` | ✅ Aplicada |
| Bump `react-day-picker` v8→v10 | PR #2588 (27/10) | ✅ Em produção |
| 8 merges de PRs de docs/ci | Sessão 29/10 | ✅ Em produção |
| Identificação de `stock_notes` ausente | 31/10 → PR #2871 | ⚪ Urgência baixa — hook dormido |

---

## 6. RECOMENDAÇÕES FORA DO ESCOPO (backlog)

1. Recriar PR para fix de CI Vite (`#2717` fechada por conflito) — rebase em main
2. Verificar e fechar PRs de template incorreto (#2322–#2337)
3. Verificar estado de PRs da sessão de 30/10 (#2821, #2823, #2824, #2826)
4. Verificar se `productAnalyticsService.ts`, `aiRecommendationsService.ts`, `quotePricingService.ts` foram removidos (como `mockupService`)
5. Completar ciclo de vida das chaves MCP (issue/update/rotate)
6. Decidir sobre 53 branches COMPLETO não mergeados — plano de 99 etapas disponível
7. Drops de índices pendentes da migration `20261022100011` — aguarda análise PO

---

## 7. SUMÁRIO DE SITUAÇÕES

| Situação | Achados |
|---|---|
| ✅ CORRIGIDO E VERIFICADO | A, B, E, G, PR #2730, PR #2720, PR #2734 |
| ⏳ CONFIRMADO E PENDENTE (urgente) | H(#2731), M(`20261027200000`), N(supplier_stricker RLS) |
| ⚪ CONFIRMADO E PENDENTE (baixa urgência) | L(stock_notes hook dormido), P(5 edges), Q(branches), PR #2871 |
| ⚪ NÃO VERIFICADO | C, D, J, K(4 PRs), I(4 PRs sessão 30/10), O(3 dos 4 serviços) |
| ⚪ SUPERADO | F(Gate Final paths-ignore), O(mockupService removido) |

---

*Documentos originais preservados em `analise-prs/`. Reconciliação registrada neste arquivo sem modificar as fontes.*
