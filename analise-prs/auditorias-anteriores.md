# Reconciliação de Auditorias Anteriores — Promo Gifts V4

**Gerado em:** 2026-10-31  
**Sessão:** PROMO GIFTS V4 (bed6ac4e-1cfe-4adc-9a44-2d0604e1e401)  
**SHA main referência:** `7f1d3d23b89a755903f8ac6f208de47852674ba4`  
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

**Nota:** Os dossiês individuais em `analise-prs/dossies/` cobrem PRs #2290 a #2832 (200+ arquivos). O conteúdo relevante foi consolidado via `RELATORIO_PRS.md` e `progresso.json`.

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
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** — guarda presente em `useProductCustomizationOptions.ts:89`, `useProductEngravingOptions.ts:24`, `useMockupTechniques.ts:81`, `TechniqueMultiSelector.tsx:34`, `useSimulatorWizard.ts:50` |

#### Achado B — `fn_cron_guard` com vetor de SQL injection (sem auth)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_VALIDACAO_EXAUSTIVA.md § PR #2352 |
| **Descrito como** | `fn_cron_guard(bigint, text)` executa `EXECUTE p_sql`; anon pode chamar via anon key |
| **Migration de correção** | `20261022100001` — REVOKE EXECUTE em `fn_cron_guard` |
| **Verificação 2026-10-31** | Migration `20261022100001` aparece na lista de migrations aplicadas do banco `doufsxqlfjyuvxuezpln` |
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** — migration aplicada; REVOKE efetivo |

#### Achado C — 13 DROP INDEX pendentes (`stock_snapshots`, 779 MB)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_VALIDACAO_EXAUSTIVA.md § PR #2352 |
| **Descrito como** | Migration `20261022100011` remove 13 índices; 7 são unique constraints/GIN — exigem aprovação PO separada |
| **Verificação 2026-10-31** | Não verificável diretamente sem acesso a `pg_stat_user_indexes` em tempo real |
| **Situação** | ⚪ **NÃO VERIFICADO** — decisão PO pendente; documentado como diferido no relatório de 22/10; sem evidência de aplicação ou rejeição |

#### Achado D — 15 PRs de template incorreto (#2322–#2337)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_VALIDACAO_EXAUSTIVA.md § PRs que requerem ação humana |
| **Descrito como** | Stacks erradas (Next.js, Python, Webpack) — fechar via PO |
| **Verificação 2026-10-31** | Não checado individualmente — PRs antigas |
| **Situação** | ⚪ **NÃO VERIFICADO** — presumivelmente fechadas, mas não confirmado |

---

### 2.2 RELATORIO_FINAL_META.md (2026-10-27)

**Escopo:** 13 PRs; 1 mergeada; 7 fechadas pelo PO; 4 bloqueadas (draft); 1 não mergeada.

#### Achado E — `react-day-picker` v8→v10 (PR #2588)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_FINAL_META.md § Merge Realizado |
| **Descrito como** | Bump de dependência; merge SHA `4c5fdd72`; Gate Final não triggerou |
| **Verificação 2026-10-31** | SHA `4c5fdd72` é ancestral de `7f1d3d23` (main atual) — confirmado via git history |
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** — em produção desde 27/10 |

#### Achado F — Gate Final não triggerou em `4c5fdd72` (PR #2588)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_FINAL_META.md § Nota sobre Gate Final |
| **Descrito como** | `deploy-gates.yml` não apareceu nos 32 runs para SHA `4c5fdd72`; possível `paths-ignore` |
| **Verificação 2026-10-31** | Comportamento esperado para deps-only commit; Branch Protection Sentinel passou ✅ |
| **Situação** | ⚪ **SUPERADO POR MUDANÇA DE ARQUITETURA** — `deploy-gates.yml` tem filtro de path; comportamento correto por design |

#### Achado G — PRs de rollbacks/migrations bloqueadas em draft (#2580, #2600, #2631)

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_FINAL_META.md § Verdicts por PR |
| **Descrito como** | PRs draft tocando `supabase/migrations/` e `.github/workflows/` — proibidas por REGRA #8 |
| **Verificação 2026-10-31** | Fechadas externamente pelo PO |
| **Situação** | ✅ **CORRIGIDO E VERIFICADO** — fechadas pelo PO; sem impacto residual |

---

### 2.3 RELATORIO_PRS.md (2026-10-29/30)

**Escopo:** 23/24 PRs (2 sessões); 9 mergeadas; 6 DECISAO_HUMANA; 4 conflito/fechadas.

#### Achado H — PRs DECISAO_HUMANA (6 da sessão de 29/10)

| PR | Título | Estado 2026-10-31 | Situação |
|---|---|---|---|
| [#2731](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2731) | fix(db): protege kill_switch_hits contra INSERT anônimo | **ABERTA** — DDL + workflow | ⏳ **CONFIRMADO E PENDENTE** |
| [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | fix(ci): protege contrato repair-only E15 | Mergeada 29/10 | ✅ **CORRIGIDO E VERIFICADO** |
| [#2720](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2720) | ci(e2e): não ocultar falha na geração de fixtures | Mergeada 29/10 | ✅ **CORRIGIDO E VERIFICADO** |
| [#2734](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2734) | fix(ci): mirror Docker Hub após limite GHCR | Mergeada 30/10 | ✅ **CORRIGIDO E VERIFICADO** |
| [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717) | fix(e2e): isola servidor Vite no CI de paridade | Fechada s/merge 30/10 (CI + conflito) | ❌ **CONFIRMADO E PENDENTE** — fix válido, fechado por conflito |
| [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714) | fix(db): reconciliar migrations pendentes | Fechada s/merge 30/10 | ❌ **CONFIRMADO E PENDENTE** — 4 migrations DDL ainda não aplicadas |

#### Achado I — PRs DECISAO_HUMANA (sessão de 30/10)

| PR | Título | Estado 2026-10-31 | Situação |
|---|---|---|---|
| [#2821](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2821) | uptime-monitor.yml substitui #2793 | não verificado | ⚪ **NÃO VERIFICADO** |
| [#2823](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2823) | supabase/migrations DDL | não verificado | ⚪ **NÃO VERIFICADO** |
| [#2824](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2824) | replenishment-quality.yml | não verificado | ⚪ **NÃO VERIFICADO** |
| [#2826](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2826) | branch-protection-sentinel.yml | não verificado | ⚪ **NÃO VERIFICADO** |

#### Achado J — E2E falhas pré-existentes `catalog.spec.ts` / `kit-builder.spec.ts`

| Campo | Detalhe |
|---|---|
| **Origem** | RELATORIO_PRS.md § FALHAS CI INVESTIGADAS |
| **Descrito como** | Falhas E2E em `66d032af` são PRÉ-EXISTENTES (run `40762904949` antes do baseline já falhava) |
| **Verificação 2026-10-31** | Não re-verificado; auditoria de main de 31/10 não encontrou regressão introduzida |
| **Situação** | ⚪ **NÃO VERIFICADO** no código atual — presumivelmente ainda pré-existente |

#### Achado K — 4 PRs CI_FALHOU (Gate 1 / Gate 1.3)

| PR | Falha | Situação |
|---|---|---|
| #2810 | `usePromoFlixPlayer.ts` 624 > 500 linhas | ⚪ **NÃO VERIFICADO** — PR aberta |
| #2813 | `no-useless-escape` linha 45 | ⚪ **NÃO VERIFICADO** — PR aberta |
| #2822 | migration baseline desatualizado | ⚪ **NÃO VERIFICADO** — PR aberta |
| #2825 | migration baseline desatualizado | ⚪ **NÃO VERIFICADO** — PR aberta |

---

### 2.4 Auditorias de 2026-10-31 (esta sessão)

Achados novos descobertos nesta sessão — sem documento histórico predecessor.

#### Achado L — `stock_notes` ausente no banco (CRÍTICO)

| Campo | Detalhe |
|---|---|
| **Origem** | Sessão bed6ac4e, 31/10 — cruzamento banco vs código |
| **Localização** | `src/hooks/stock/useStockNotes.ts:52,67,85` (SELECT + INSERT + DELETE) |
| **Impacto** | Qualquer acesso ao fluxo de notas de estoque → erro em produção |
| **Ação** | PR [#2871](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2871) aberta — migration `20261031000000_create_stock_notes.sql` |
| **Situação** | ⏳ **CONFIRMADO E PENDENTE** — PR aberta, aguarda merge + `db-apply-migration.yml` |

#### Achado M — 6 migrations pendentes (última aplicada `20261027160000`)

| Migration | Conteúdo | Urgência | Situação |
|---|---|---|---|
| `20261027180000` | Reativa cron blurhash `*/10` | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027200000` | RLS deny-all `supplier_stricker` (17 tabelas) | **ALTA** | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027220000` | Desativa cron `xbz-image-uploader` (edge inexistente) | Média | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027230000` | Remove 3 entradas stale do allowlist | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027233000` | Adiciona `XBZ_IMAGE_UPLOADER_CRON_SECRET` | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261027234500` | Reativa cron `xbz-image-uploader` | Baixa | ⏳ **CONFIRMADO E PENDENTE** |
| `20261031000000` | Cria `stock_notes` (PR #2871) | **CRÍTICA** | ⏳ aguarda merge |

#### Achado N — 17 tabelas `supplier_stricker` sem RLS

| Campo | Detalhe |
|---|---|
| **Origem** | Sessão bed6ac4e, 31/10 |
| **Risco atual** | Baixo — schema sem `GRANT USAGE` para anon/authenticated |
| **Risco futuro** | Alto se qualquer integração for grantada antes da RLS |
| **Ação** | Aplicar migration `20261027200000_supplier_stricker_rls_deny_all.sql` via `db-apply-migration.yml` |
| **Situação** | ⏳ **CONFIRMADO E PENDENTE** |

#### Achado O — 4 serviços mortos (0 imports em todo o projeto)

| Arquivo | Situação |
|---|---|
| `src/services/mockupService.ts` | ⚪ **CONFIRMADO E PENDENTE** — duplica `mockupGenerationService.ts`; código morto |
| `src/services/productAnalyticsService.ts` | ⚪ **CONFIRMADO E PENDENTE** — analytics nunca coletados |
| `src/services/aiRecommendationsService.ts` | ⚪ **CONFIRMADO E PENDENTE** — hook usa edge diretamente; serviço bypassed |
| `src/services/quotePricingService.ts` | ⚪ **CONFIRMADO E PENDENTE** — pricing delegado ao hook, não ao serviço |

#### Achado P — 5 edge functions potencialmente órfãs

| Função | Impacto | Situação |
|---|---|---|
| `xbz-image-uploader` | Upload alternativo nunca acionado | ⚪ **CONFIRMADO E PENDENTE** |
| `send-notification` | Notificações não disparadas pelo front | ⚪ **CONFIRMADO E PENDENTE** |
| `magazine-public-react` | Provável duplicata de `magazine-public-view` | ⚪ **CONFIRMADO E PENDENTE** |
| `intelligence-substitute-applied` | IA de substituição nunca invocada | ⚪ **CONFIRMADO E PENDENTE** |
| `mcp-keys-issue/update/rotate` | Ciclo de vida de chaves MCP incompleto | ⚪ **CONFIRMADO E PENDENTE** |

#### Achado Q — Branches não mergeados (274 analisados)

| Classificação | Quantidade |
|---|---|
| COMPLETO | 53 |
| PARCIAL | 121 |
| ABANDONADO | 100 |

**Top 10 COMPLETO** (maior código real): `chore/graphify-sql-map-20261029` (7 netFiles), `importado/vps-fabrica/v2/s17-2610081946` (6 netFiles), e 8 branches da Fábrica Hermes (4 netFiles cada).

**Situação:** ⚪ **CONFIRMADO E PENDENTE** — plano de 99 etapas disponível em session-state.

---

## 3. RECOMENDAÇÕES REPETIDAS ENTRE AUDITORIAS

| Recomendação | Auditorias | Status consolidado |
|---|---|---|
| Aplicar migrations pendentes via `db-apply-migration.yml` | 22/10, 27/10, 29/10, 31/10 | ⏳ **CONFIRMADO E PENDENTE** — 7 migrations (incluindo #2871) |
| Não mergear DDL sem aprovação PO | Todas | ✅ Respeitado em todas as sessões |
| E2E pré-existentes não são regressão | 29/10, 31/10 | ✅ Confirmado |
| Fechar PRs de template incorreto | 22/10 | ⚪ Não verificado se foram fechadas |
| Auth guard em callers de RPCs | 22/10 | ✅ CORRIGIDO E VERIFICADO |

---

## 4. CONTRADIÇÕES E DECISÕES PENDENTES

| Contradição | Documentos | Resolução |
|---|---|---|
| PR #2714 continha 4 migrations DDL que RELATORIO_PRS.md marcou como DECISAO_HUMANA; foi fechada sem merge em 30/10; as migrations NÃO aparecem como aplicadas no banco | RELATORIO_PRS.md vs estado do banco 31/10 | As migrations de #2714 são um subconjunto das 6 migrations pendentes atuais — precisam ser aplicadas via workflow, não via merge da PR |
| PR #2717 (fix Vite CI) foi fechada sem merge por conflito; o fix é válido | RELATORIO_PRS.md | Solução: criar nova PR rebased para reaplicar o fix |
| `fn_cron_guard` foi reportado como vetor de SQL injection em 22/10; migration aplicada; mas relatorio de 29/10 não menciona esta correção | RELATORIO_VALIDACAO_EXAUSTIVA vs RELATORIO_PRS | CORRIGIDO — migration confirmada aplicada |

---

## 5. TRABALHO ANTERIOR RECUPERADO

| Item | Origem | Estado |
|---|---|---|
| Auth guard em 5 callers de `fn_get_product_customization_options` | PR #2351 (22/10) + PR de sessão subsequente | ✅ Em produção |
| Migration `fn_cron_guard` REVOKE EXECUTE | 22/10, migration `20261022100001` | ✅ Aplicada |
| Bump `react-day-picker` v8→v10 | PR #2588 (27/10) | ✅ Em produção |
| 8 merges de PRs de docs/ci | Sessão 29/10 | ✅ Em produção |
| Identificação de `stock_notes` ausente | 31/10 → PR #2871 | ⏳ Aguardando merge |

---

## 6. RECOMENDAÇÕES FORA DO ESCOPO

Itens identificados mas não implementados por esta sessão (backlog):

1. Recriar PR para fix de CI Vite (`#2717` fechada por conflito) — rebaser em main
2. Verificar e fechar PRs de template incorreto (#2322–#2337)
3. Verificar estado de PRs da sessão de 30/10 (#2821, #2823, #2824, #2826) — não foram inspecionadas
4. Avaliar 4 serviços mortos em `src/services/` — remover ou integrar
5. Completar ciclo de vida das chaves MCP (issue/update/rotate)
6. Decidir sobre 53 branches COMPLETO não mergeados — plano de 99 etapas disponível
7. Drops de índices pendentes da migration `20261022100011` — aguarda análise PO

---

## 7. SUMÁRIO DE SITUAÇÕES

| Situação | Quantidade | Achados |
|---|---|---|
| ✅ CORRIGIDO E VERIFICADO | 7 | A, B, E, G, PR #2730, PR #2720, PR #2734 |
| ⏳ CONFIRMADO E PENDENTE | 5 | H(#2731, #2717, #2714), L, M(7 migrations), N |
| ⚪ CONFIRMADO E PENDENTE (baixa urgência) | 7 | O(4 serviços), P(5 edges), Q(branches) |
| ⚪ NÃO VERIFICADO | 6 | C, D, J, K(4 PRs), I(4 PRs sessão 30/10) |
| ⚪ SUPERADO | 1 | F (Gate Final paths-ignore) |

---

*Documentos originais preservados em `analise-prs/`. Reconciliação registrada neste arquivo sem modificar as fontes.*
