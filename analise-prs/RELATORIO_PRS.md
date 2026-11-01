# Relatório de Análise de PRs

**Gerado em:** 2026-11-01 (v2 — atualizado com verificações de banco, worktree e CI)
**SHA main fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`
**SHA main atual:** `4c6541b6f5fab4205600472bc086c2f603a69312` (force-updated durante análise)
**Total PRs abertas:** 4 | **Total analisadas:** 4

---

## ⏳ AGUARDANDO CI

### PR #2941 — fix(security): atualiza allowlist lint-0029 ⭐ PREFERIDA

**Branch:** `fix/e2e-url-state-defaults-20261030` | **HEAD:** `80ffa42`

**Status:** Merge limpo, banco OK, sem bloqueadores — CI foi CANCELADO e não completou Gate Final.

**Evidências:**
- Worktree merge test vs main `4c6541b6f`: ✅ limpo, 13 arquivos, sem conflito
- Banco `doufsxqlfjyuvxuezpln`: `is_supervisor_or_above` e `log_rls_denial` retornam 0 linhas como SECURITY DEFINER — remoção da allowlist correta
- Diff vs main atual: sem `.github/workflows/` e sem `supabase/migrations/` (main absorveu via force-update)
- CI (SHA `80ffa42`): `Vercel Preview` success; `Supabase Preview` failure (erro pré-existente `column categories.level does not exist`); Gate Final: CANCELADO (não rodou)

**O que ainda falta:** Gate Final verde. CI foi cancelado nesta branch — não validou qualidade gates.

**Ação quando CI verde:** Mergear esta (squash, apagar branch). #2927 fica stale.

---

### PR #2927 — fix(listas): normaliza filtros padrão após navegação POP

**Branch:** `claude/fix-e2e-url-state-261101-2045` | **HEAD:** `f23ee40`

**Status:** Merge limpo, banco OK, sem bloqueadores — CI ainda in_progress.

**Evidências:**
- Worktree merge test vs main `4c6541b6f`: ✅ limpo, 11 arquivos, sem conflito
- Banco: mesmo resultado de #2941 — funções não existem como SECURITY DEFINER
- Diff vs main atual: sem workflows, sem migrations (idem #2941)
- CI (SHA `f23ee40`): 41 checks `in_progress`, 1 `failure` (Supabase Preview pré-existente), Gate Final in_progress

**O que ainda falta:** Gate Final completar e ficar verde.

**Ação:** Se #2941 mergear primeiro → esta fica stale. Se #2941 não mergear → merge esta quando CI verde.

---

## 🚫 NÃO MERGEADAS (DRAFT)

### PR #2940 — feat(nav): adiciona entrada Audit Suite na sidebar admin

- **Motivo:** Marcada como DRAFT pelo autor.
- **Problemas adicionais:** Typo introduzido ("Se ogropo" → "Se o grupo"), classe CSS com `!` inesperado (`transition-all duration-500!`).
- **Quando mergear:** Após o autor marcar como ready e corrigir typo + classe CSS.

---

### PR #2942 — docs(ci): RELATORIO_CI.md v4

- **Motivo:** Marcada como DRAFT pelo autor.
- **Problemas adicionais:** Baseline documentado está desatualizado (2026-10-28 vs main atual 2026-11-01). §8 intitulado "Todos os Workflows" mas cobre apenas 12 de 119 workflows.
- **Quando mergear:** Após atualizar o baseline para o SHA do main atual.

---

## 📊 Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| AGUARDANDO CI | 2 | #2927, #2941 |
| NÃO MERGEAR (DRAFT) | 2 | #2940, #2942 |
| MERGEADAS | 0 | — |
| DECISÃO HUMANA | 0 | — |
| **TOTAL** | **4** | **4** |

---

## 📁 Clusters

### Cluster A — URL State Normalization (sobreposição)
- PR #2927 e PR #2941 contêm a mesma feature base (useListUrlState POP fix).
- **PR#2941 é preferível** (inclui remoção de `mcp_kv_get` + rollback SQL).
- Merge de uma torna a outra stale — não mergear as duas.

### Cluster B — Documentação isolada
- PR #2942 (docs only, draft). Sem impacto no código.

### Cluster C — Nav admin isolada
- PR #2940 (1 arquivo, draft). Sem conflito com outros clusters.

---

## 🔍 Baseline main

**SHA fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`
**SHA atual:** `4c6541b6f5fab4205600472bc086c2f603a69312` (main foi force-updated durante análise)

| Check | Resultado | Evidência |
|---|---|---|
| `tsc --noEmit` | ✅ exit 0 | sem output de erros |
| `npm install` | ✅ | concluído |
| `npm run build` | ✅ `built in 16.22s` | sem erros de build |
| `vitest run` | ⚠️ 3 arquivos falhando | 5 testes falhos; 26042 passaram — **pré-existentes** |
| ESLint | ⚠️ crash OOM | SIGABRT no container; `npx eslint` abortou |

---

## Verificações de banco

**Projeto:** `doufsxqlfjyuvxuezpln` (SUPABASE - GESTÃO DE PRODUTOS)

```sql
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('is_supervisor_or_above', 'log_rls_denial') AND prosecdef = true;
-- Resultado: [] (0 linhas)
```

`is_supervisor_or_above` e `log_rls_denial` **não existem** como SECURITY DEFINER no banco de produção. Remoção das duas entradas da allowlist em #2941/#2927 é **correta**.

---

## Verificações de merge (worktree)

| PR | Branch HEAD | Conflito | Arquivos tocados |
|---|---|---|---|
| #2927 | `f23ee40` | ✅ Nenhum | 11 (sem workflows/migrations) |
| #2941 | `80ffa42` | ✅ Nenhum | 13 (sem workflows/migrations) |

---

## Bloqueadores originais — status final

| Bloqueador | PR | Status original | Status atual |
|---|---|---|---|
| B1: 8 workflows no diff | #2927 | DECISÃO HUMANA | ✅ RESOLVIDO (main absorveu) |
| B2: 30 migrations no diff | #2927 | DECISÃO HUMANA | ✅ RESOLVIDO (main absorveu) |
| B1: 4 workflows no diff | #2941 | DECISÃO HUMANA | ✅ RESOLVIDO |
| B2: 28 migrations no diff | #2941 | DECISÃO HUMANA | ✅ RESOLVIDO |
| B4: is_supervisor_or_above no banco | #2941 | PENDENTE | ✅ RESOLVIDO (não existe como SECDEF) |
| CI Gate Final | #2927 | — | ⏳ in_progress |
| CI Gate Final | #2941 | — | ⏳ CANCELADO (precisa rodar) |

---

## 📁 Arquivos entregues

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/prs.json` | Inventário JSON de todas as PRs |
| `analise-prs/prs.csv` | Inventário CSV |
| `analise-prs/RELATORIO_PRS.md` | Este relatório |
| `analise-prs/regras-de-negocio.md` | Regras de negócio extraídas |
| `analise-prs/progresso.json` | Estado da análise |
| `analise-prs/baseline/README.md` | Baseline do main |
| `analise-prs/dossies/PR-2927.md` | Dossie detalhado |
| `analise-prs/dossies/PR-2940.md` | Dossie detalhado |
| `analise-prs/dossies/PR-2941.md` | Dossie detalhado |
| `analise-prs/dossies/PR-2942.md` | Dossie detalhado |
