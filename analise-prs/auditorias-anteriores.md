# Auditorias Anteriores — Reconciliação

**Última atualização:** 2026-10-31  
**SHA de referência:** `7f1d3d23b` (commit: `docs(auditoria): revalida planos e pendências em 31/10 (#2868)`)  
**Documentos examinados:** 7 documentos principais + 130+ dossiês individuais em `analise-prs/dossies/`  
**Fontes inacessíveis:** branches `origin/claude/analise-prs-20261027-2340`, `origin/claude/chore-analise-prs-261030-1600`, `origin/claude/docs-relatorio-final-261030-0015`, `origin/claude/feat-analise-prs-v4-20261029-2310` — conteúdo já consolidado nos relatórios lidos

---

## Documentos Examinados

### Sessão 1 — 2026-10-22

| Campo | Valor |
|---|---|
| **Documento** | `analise-prs/RELATORIO_VALIDACAO_EXAUSTIVA.md` |
| **SHA início/fim** | `8e8053b9` → `3e006427` |
| **Agente** | Claude (sessão de auditoria exaustiva) |
| **Escopo** | 28 PRs analisadas, incluindo PRs #2330–#2370 |
| **Merges realizados** | #2338, #2351, #2354 (3 merges) |
| **Achado crítico** | PR #2351 corrigiu auth guard em `ProductPersonalizationRules.tsx` mas deixou 5 callers de `fn_get_product_customization_options` sem proteção |
| **Pendências registradas** | Guard ausente em useProductCustomizationOptions.ts:113, useProductEngravingOptions.ts:34, useMockupTechniques.ts:88, TechniqueMultiSelector.tsx:65, useSimulatorWizard.ts:60 |

### Sessão 2 — 2026-10-27

| Campo | Valor |
|---|---|
| **Documento** | `analise-prs/RELATORIO_FINAL_META.md` |
| **SHA início/fim** | Não registrado (branch `claude_pink/sleepy-cannon-h000nc`) |
| **Agente** | claude_pink |
| **Escopo** | 13 PRs analisadas (#2560–#2593) |
| **Merges realizados** | #2588 (react-day-picker v8→v10, 1 merge) |
| **PRs fechadas pelo PO** | 7 PRs |
| **Achados relevantes** | Auditoria de schema `supplier_stricker`: 17 tabelas sem RLS, migration proposta para deny-all |

### Sessão 3 — 2026-10-29 a 2026-10-30

| Campo | Valor |
|---|---|
| **Documento** | `analise-prs/RELATORIO_PRS.md` |
| **SHA início/fim** | `8bc08b12` → `66d032af` |
| **Agente** | Claude (sessão principal de análise) |
| **Escopo** | 24 PRs (29/10) + 18 PRs (30/10) = 42 PRs no total |
| **Merges realizados** | 8 merges + merges adicionais na extensão 30/10 |
| **PRs DECISAO_HUMANA** | #2731, #2730, #2720, #2717, #2714, #2734 (sessão 29/10); #2739, #2744, #2823 (sessão 30/10) |
| **Achados relevantes** | stock_notes hook sem tabela no banco; 4 serviços mortos (0 imports); supplier_stricker migration pendente |

### Sessão 4 (atual) — 2026-10-31

| Campo | Valor |
|---|---|
| **Documento** | Este arquivo (reconciliação) |
| **SHA referência** | `7f1d3d23b` |
| **Agente** | Claude (sessão de reconciliação) |
| **Escopo** | Verificação de todos os achados anteriores no código atual + status de PRs |

### Outros documentos lidos

- `analise-prs/MISSAO.md` — missão original salva em 2026-10-23
- `analise-prs/dossies/PR-2731.md` — dossiê com análise de 4 perguntas, veredito DECISAO_HUMANA
- `analise-prs/dossies/PR-2714.md` — dossiê, veredito DECISAO_HUMANA (migrations e RLS)
- `analise-prs/dossies/PR-2717.md` — dossiê, veredito DECISAO_HUMANA (CI/workflows)
- `analise-prs/dossies/PR-2734.md` — dossiê, veredito DECISAO_HUMANA (CI Docker Hub)
- 130+ dossiês adicionais em `analise-prs/dossies/` (lidos via listagem de diretório)

---

## Achados Reconciliados

| # | Achado | Fonte | Sessão | Situação Atual | Evidência |
|---|---|---|---|---|---|
| 1 | **Auth guard ausente em 5 callers de `fn_get_product_customization_options`** | RELATORIO_VALIDACAO_EXAUSTIVA.md | 2026-10-22 | ✅ CORRIGIDO E VERIFICADO | Verificado em `7f1d3d23b`: guard `getSession()` presente em todos os 5 arquivos (detalhado abaixo) |
| 2 | **Tabela `stock_notes` não existe no banco** | Contexto sessão 4 | 2026-10-31 | ⚠️ CONFIRMADO E PENDENTE — IMPACTO ATENUADO | Hook `src/hooks/stock/useStockNotes.ts` existe, 3 operações (linhas 52, 67, 85), mas **0 callers** encontrados — não causa erro em produção agora. Nenhuma migration criando a tabela existe em `supabase/migrations/`. |
| 3 | **4 serviços mortos** (`mockupService.ts`, `productAnalyticsService.ts`, `aiRecommendationsService.ts`, `quotePricingService.ts`) | Contexto sessão 4 | 2026-10-31 | ✅ SUPERADO | Arquivos não existem em `src/services/` no SHA `7f1d3d23b` — foram removidos |
| 4 | **17 tabelas `supplier_stricker` sem RLS** | RELATORIO_FINAL_META.md | 2026-10-27 | ✅ CORRIGIDO (migration em repo) — aplicação em prod NÃO VERIFICADA | Migration `supabase/migrations/20261027200000_supplier_stricker_rls_deny_all.sql` existe em main. PR #2714 foi fechada SEM merge — a migration chegou ao repo por outro caminho. Status de aplicação no banco de produção: não verificado. |
| 5 | **Migrations de segurança 2026-10-22** (fn_cron_guard, auth.uid wrapper, perf indexes) | Sessão 2026-10-22 | 2026-10-22 | ✅ CORRIGIDO E VERIFICADO | Todas em main: `20261022100001_security_fn_cron_guard_revoke_anon.sql`, `20261022100010_perf_rls_auth_uid_wrapper.sql`, `20261022100020/21/22*.sql` |
| 6 | **PR #2351 corrigiu apenas 1 de 6 callers** (achado específico 2026-10-22) | RELATORIO_VALIDACAO_EXAUSTIVA.md | 2026-10-22 | ✅ CORRIGIDO E VERIFICADO | Ver item #1 acima — todos os 5 callers restantes agora têm guard |
| 7 | **react-day-picker v8→v10** (#2588) | RELATORIO_FINAL_META.md | 2026-10-27 | ✅ SUPERADO | PR #2588 mergeada em sessão 2026-10-27 |
| 8 | **PR #2717 dirty** (CI E2E isolation) | RELATORIO_PRS.md | 2026-10-29 | ⚠️ CONFIRMADO E PENDENTE | PR #2717 fechada SEM merge (dirty). A funcionalidade de isolamento de Vite no CI não foi mergeada. |

### Detalhe do Achado #1 — Auth guards (5 callers)

Situação em 2026-10-22: os 5 callers abaixo NÃO tinham `getSession()` guard.  
Situação em 2026-10-31 (SHA `7f1d3d23b`): **todos corrigidos**.

| Arquivo | Linha com guard (atual) | Status |
|---|---|---|
| `src/hooks/products/useProductCustomizationOptions.ts` | linha 89 | ✅ CORRIGIDO |
| `src/hooks/products/useProductEngravingOptions.ts` | linha 24 | ✅ CORRIGIDO |
| `src/hooks/mockup/useMockupTechniques.ts` | linha 81 | ✅ CORRIGIDO |
| `src/components/pricing/calculator/TechniqueMultiSelector.tsx` | linha 34 | ✅ CORRIGIDO |
| `src/hooks/simulator/useSimulatorWizard.ts` | linha 50 | ✅ CORRIGIDO |

Evidência: `if (!(await supabase.auth.getSession()).data.session) return null/[];` como primeira instrução em cada função.

---

## PRs DECISAO_HUMANA — Status em 2026-10-31

PRs marcadas DECISAO_HUMANA nas sessões anteriores, verificadas via API do GitHub:

| PR | Título | Status Atual | Detalhe |
|---|---|---|---|
| [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714) | fix(db): reconciliar migrations pendentes com o canônico | 🔴 FECHADA SEM MERGE | closed_at: 2026-10-30, merged=false. Conteúdo da migration chegou ao main por outro caminho. |
| [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717) | fix(e2e): isola servidor Vite no CI de paridade | 🔴 FECHADA SEM MERGE | closed_at: 2026-10-30, merged=false. mergeable_state: dirty. Funcionalidade não entrou no main. |
| [#2720](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2720) | ci(e2e): não ocultar falha na geração de fixtures | ✅ MERGEADA | merged_at: 2026-10-29T22:20:19Z |
| [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | fix(ci): protege contrato de repair-only em E15 | ✅ MERGEADA | merged_at: 2026-10-29T22:20:35Z |
| [#2731](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2731) | fix(db): protege kill_switch_hits | 🟡 ABERTA | Aguarda aplicação da migration no banco antes do merge (DECISAO_HUMANA ativa) |
| [#2734](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2734) | fix(ci): usa mirror Docker Hub após limite do GHCR | ✅ MERGEADA | merged_at: 2026-10-30T07:07:41Z. CI Gates confirmados verdes. |
| [#2739](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2739) | fix(mockup): gerador | 🟡 ABERTA | DECISAO_HUMANA ativa |
| [#2744](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2744) | [NÃO MESCLAR sem OK do dono] | 🟡 ABERTA | Marcação explícita de não mesclar |
| [#2823](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2823) | fix(db): reconciliar migrations | 🟡 ABERTA | DECISAO_HUMANA ativa — reconciliação de ledger vs banco |

**Resumo:** 4 PRs abertas aguardando decisão humana · 3 mergeadas · 2 fechadas sem merge.

---

## Contradições Entre Sessões

| # | Tópico | Sessão A | Sessão B | Resolução |
|---|---|---|---|---|
| 1 | **stock_notes: impacto em produção** | Sessão 4 (afirmação inicial do coordinator): "erro em produção agora" | Sessão 4 (verificação de código): hook existe mas 0 callers — sem erro real hoje | RESOLVIDO: impacto exagerado na afirmação inicial. O hook é código morto no SHA `7f1d3d23b`. Continuará inativo até ser importado por algum componente. |
| 2 | **PR #2717** | RELATORIO_PRS.md (sessão 2026-10-29): DECISAO_HUMANA pendente, aguardando isolamento de Vite | Dossiê PR-2717: PR estava `dirty` | CONSISTENTE: ambas identificam problema. A PR foi fechada sem merge em 2026-10-30. O problema original (CI E2E flaky) pode ainda existir. |
| 3 | **supplier_stricker migration** | Sessão 2026-10-27: proposta como futura PR | Sessão 2026-10-31: migration `20261027200000` já existe em main, mas PR #2714 foi fechada sem merge | INVESTIGAR: migration chegou ao main fora do fluxo de PR — verificar se está registrada no ledger e se foi aplicada em produção. Candidata a DDL out-of-band (REGRA #8). |

---

## Backlog Histórico (fora do escopo desta tarefa)

Recomendações de sessões anteriores ainda não implementadas, por prioridade:

| Prioridade | Recomendação | Sessão de Origem | Arquivos/Camada |
|---|---|---|---|
| 🔴 Alta | **Auditar migration `20261027200000_supplier_stricker_rls_deny_all.sql`** — chegou ao main fora do fluxo normal de PR (PR #2714 foi fechada sem merge). Verificar se està no ledger e se foi aplicada em prod. Candidata a DDL out-of-band nos termos da REGRA #8. | Sessões 2026-10-27 e 2026-10-31 | `supabase/MIGRATIONS_SYNC_LOG.md`, `supabase/migrations/20261027200000*`, ledger |
| 🔴 Alta | **Mergear #2731** (protege kill_switch_hits) — PR aberta aguardando aplicação prévia da migration em produção. Sequência correta: aplicar migration → confirmar no ledger → mergear. | Sessão 2026-10-29 | `supabase/migrations/`, Gate 1.13.2 |
| 🔴 Alta | **Criar migration para tabela `stock_notes`** ou remover o hook — `useStockNotes.ts` referencia tabela inexistente. Quando a feature for ativada (importada por algum componente), causará erros imediatos em produção. | Sessão 4 (2026-10-31) | `supabase/migrations/`, `src/hooks/stock/useStockNotes.ts` |
| 🟡 Média | **Reabrir ou substituir PR #2717** (isolamento Vite no CI E2E) — Fechada sem merge, funcionalidade pendente. Pode ser causa de E2E flaky intermitente no CI. | Sessão 2026-10-29 | `.github/workflows/`, CI E2E |
| 🟡 Média | **Resolver PR #2823** (reconciliar migrations) — PR aberta para reconciliar ledger vs banco. | Sessão 2026-10-30 | `supabase/migrations/`, ledger |
| 🟡 Média | **Decidir PR #2739** (fix mockup gerador) — PR aberta aguardando decisão. | Sessão 2026-10-30 | `src/` (mockup) |
| 🟡 Média | **Decidir PR #2744** (marcada NÃO MESCLAR) — PR aberta com marcação explícita do dono. | Sessão 2026-10-30 | A definir pelo dono |

---

## Fontes de Dados Desta Reconciliação

```
Documentos lidos:
  analise-prs/RELATORIO_VALIDACAO_EXAUSTIVA.md  (sessão 2026-10-22)
  analise-prs/RELATORIO_FINAL_META.md           (sessão 2026-10-27)
  analise-prs/RELATORIO_PRS.md                  (sessões 2026-10-29 e 2026-10-30)
  analise-prs/MISSAO.md                         (2026-10-23)
  analise-prs/dossies/PR-2731.md
  analise-prs/dossies/PR-2714.md
  analise-prs/dossies/PR-2717.md
  analise-prs/dossies/PR-2734.md
  (listagem de 130+ dossiês verificada)

Verificações de código em SHA 7f1d3d23b:
  src/hooks/products/useProductCustomizationOptions.ts:89
  src/hooks/products/useProductEngravingOptions.ts:24
  src/hooks/mockup/useMockupTechniques.ts:81
  src/components/pricing/calculator/TechniqueMultiSelector.tsx:34
  src/hooks/simulator/useSimulatorWizard.ts:50
  src/hooks/stock/useStockNotes.ts (linhas 52, 67, 85 — 0 callers)
  supabase/migrations/20261027200000_supplier_stricker_rls_deny_all.sql
  supabase/migrations/20261022100001_security_fn_cron_guard_revoke_anon.sql
  supabase/migrations/20261022100010_perf_rls_auth_uid_wrapper.sql
  src/services/ (mockupService.ts, productAnalyticsService.ts — não existem)

PRs verificadas via API do GitHub (31/10/2026):
  #2714 — FECHADA SEM MERGE
  #2717 — FECHADA SEM MERGE
  #2720 — MERGEADA
  #2730 — MERGEADA
  #2731 — ABERTA
  #2734 — MERGEADA
  #2739 — ABERTA
  #2744 — ABERTA
  #2823 — ABERTA
```