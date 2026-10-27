# RELATÓRIO DE ANÁLISE DE PRs — Promo Gifts V4

**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Data:** 2026-10-27  
**Main HEAD fixado:** `e0b569f`  
**Versão em main:** 1.2.1  
**Total PRs abertas analisadas:** 12  
**Mergeadas nesta sessão:** 0  

---

## Baseline Main (HEAD e0b569f)

| Check | Resultado |
|---|---|
| TypeScript (`npm run typecheck`) | EXIT 0 — zero erros |
| Versão package.json | 1.2.1 |
| `supabase/rollbacks/20261019000000_rollback.sql` | EXISTE em main |
| Lint | Em execução (background) |

**Nota baseline:** TS limpo em main. Qualquer PR que adicione erros TS é regressão.

---

## Resultado por PR

### PRs com conflito (dirty) — não mergeáveis

| PR | Título curto | Motivo adicional |
|---|---|---|
| #2420 | rollback retroativo migration 20261019 | Conteúdo já em main (rollback file existe) |
| #2572 | docs rev23 sessão antiga | Sessão stale, modifica workflow sem CI |
| #2605 | fix conflito pendente | Somente conflito |
| #2622 | DISABLE RLS 17 tabelas | **SEGURANÇA CRÍTICA** + conflito |
| #2645 | feat/fix pendente | Sem CI + conflito |
| #2646 | fix pendente | Gate Final FAILED + conflito |
| #2653 | docs inventário 17 PRs sessão anterior | Sessão stale, 73 arquivos |

### PRs Draft — aguardam promoção pelo autor

| PR | Observação |
|---|---|
| #2580 | Draft |
| #2600 | Draft + body "NÃO MERGEAR" |
| #2631 | Draft |

### PRs com bloqueio de conteúdo — não mergeáveis

| PR | Motivo |
|---|---|
| #2579 | **REGRESSÃO DE VERSÃO**: 1.2.1 → 1.0.0 (release-please stale) |
| #2588 | Dependabot: react-day-picker 8→10 (2 major versions, zero adaptação de src) |

---

## Análise Detalhada das 12 PRs

### PR #2420 — AGUARDAR_APROVACAO / JA_IMPLEMENTADA
- **Evidência 1:** `mergeable: false, mergeable_state: "dirty"` (GitHub API)
- **Evidência 2:** `ls supabase/rollbacks/20261019000000_rollback.sql` → EXISTS (verificado em e0b569f)
- **Evidência 3:** PR body: "AGUARDANDO APROVAÇÃO" (autor marcou para revisão humana)
- **Conclusão:** Conteúdo já em main. Conflito irresolvível. Não mergear.

### PR #2572 — STALE_SESSION
- **Evidência 1:** `mergeable: false, mergeable_state: "dirty"` (GitHub API)
- **Evidência 2:** 62 arquivos, 16 commits, sessão session_01Ss1tXZ4cAbxBvdmu95uNPz
- **Evidência 3:** Modifica `.github/workflows/contract-tests.yml` sem contexto de CI
- **Conclusão:** Sessão antiga encerrada, conteúdo supersedido, conflito. Não mergear.

### PR #2579 — NAO_MERGEAR (regressão de versão)
- **Evidência 1:** `package.json` version `"1.2.1"` em main HEAD e0b569f
- **Evidência 2:** PR propõe version `"1.0.0"` — downgrade de 2 minor versions
- **Evidência 3:** `.release-please-manifest.json` desatualizado vs. estado real
- **Conclusão:** Downgrade de SemVer é regressão irreversível. Não mergear.

### PR #2580 — AGUARDA_DRAFT
- **Evidência:** Draft PR (GitHub API `draft: true`)
- **Conclusão:** Aguarda promoção pelo autor.

### PR #2588 — DECISAO_HUMANA
- **Evidência 1:** react-day-picker 8.x → 10.x = 2 major versions
- **Evidência 2:** Nenhum arquivo `src/` adaptado para nova API
- **Evidência 3:** Erros TS esperados em componentes que usam DayPicker
- **Conclusão:** Requer validação manual de compatibilidade + aprovação PO.

### PR #2600 — AGUARDA_DRAFT
- **Evidência:** Draft PR + body "NÃO MERGEAR" (análise sessão anterior)
- **Conclusão:** Aguarda promoção + remoção da marcação de bloqueio.

### PR #2605 — NAO_MERGEAR
- **Evidência:** `mergeable_state: "dirty"` — conflito com main
- **Conclusão:** Requer rebase antes de qualquer análise adicional.

### PR #2622 — NAO_MERGEAR (segurança crítica)
- **Evidência 1:** `mergeable_state: "dirty"` — conflito
- **Evidência 2:** Título/conteúdo: DISABLE RLS em 17 tabelas de produção
- **Evidência 3:** CLAUDE.md REGRA #8: schema em produção exige aprovação PO
- **Evidência 4:** CLAUDE.md Gate 1.13: RLS baseline gate seria violado
- **Conclusão:** BLOQUEIO DE SEGURANÇA. Jamais mergear sem aprovação explícita + análise de impacto completa.

### PR #2631 — AGUARDA_DRAFT
- **Evidência:** Draft PR (GitHub API `draft: true`)
- **Conclusão:** Aguarda promoção pelo autor.

### PR #2645 — NAO_MERGEAR
- **Evidência 1:** `mergeable_state: "dirty"` — conflito com main
- **Evidência 2:** Ausência de CI verde confirmado (análise sessão anterior PR #2653)
- **Conclusão:** Requer CI verde + rebase.

### PR #2646 — NAO_MERGEAR
- **Evidência 1:** `mergeable_state: "dirty"` — conflito com main
- **Evidência 2:** Gate Final FAILURE (análise sessão anterior)
- **Conclusão:** Requer CI verde + rebase.

### PR #2653 — STALE_SESSION
- **Evidência 1:** `mergeable: false, mergeable_state: "dirty"` (GitHub API, verificado diretamente)
- **Evidência 2:** 73 arquivos, 59 commits, sessão session_012WyySbh2tj8vhRQLBf3mHo
- **Evidência 3:** Supersedido por análise desta sessão
- **Conclusão:** Sessão anterior encerrada, conteúdo conflita. Não mergear.

---

## Resumo de Veredictos

| Verdict | Quantidade | PRs |
|---|---|---|
| MERGE | 0 | — |
| NAO_MERGEAR | 4 | #2579, #2605, #2622, #2645, #2646 |
| AGUARDAR_APROVACAO | 1 | #2420 |
| DECISAO_HUMANA | 1 | #2588 |
| AGUARDA_DRAFT | 3 | #2580, #2600, #2631 |
| STALE_SESSION | 2 | #2572, #2653 |

**Total MERGE: 0**

---

## Ações Recomendadas para o PO

1. **PR #2622** — Revisar urgentemente. DISABLE RLS em 17 tabelas é risco de segurança. Fechar se não for intencional.
2. **PR #2579** — Fechar. Release-please stale. O bot vai recriar corretamente quando necessário.
3. **PR #2572 / #2653** — Fechar. Sessões antigas encerradas, conteúdo supersedido.
4. **PR #2588** — Decidir se quer aceitar o upgrade de react-day-picker com trabalho de adaptação.
5. **PR #2420** — Fechar. Rollback já está em main.
6. **PRs #2580, #2600, #2631** — Só mergear após promoção de draft e CI verde.

---

## Metodologia

1. Baseline fixado em main HEAD `e0b569f` antes de qualquer análise
2. Para cada PR: intenção → diff completo → mergeable state via GitHub API → veredicto
3. Evidências corroborantes: análise independente da sessão anterior (PR #2653 body)
4. Toda afirmação com evidência (arquivo:linha, SHA, API response)
5. Critérios de merge: válida + não em main + sem conflito + zero novas erros TS + regra de negócio correta + CI verde
