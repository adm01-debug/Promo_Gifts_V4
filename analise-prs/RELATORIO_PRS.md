# RELATÓRIO DE PRs ABERTAS — Promo Gifts V4
**Sessão:** session_014nTibSuSPcPvDsPZWiwQbH  
**Data:** 2026-10-30  
**SHA main início:** `9541666bf62883b06117b03cae0368b2c7d55314`  
**SHA main fim:** `554ef41b44c9f318777d7e7b11189490a29a8c0a`  
**Total PRs abertas analisadas:** 19 / 19

---

## RISCOS E DECISÕES HUMANAS (LEIA PRIMEIRO)

### PR #2839 — DECISÃO HUMANA OBRIGATÓRIA
**Título:** `fix(ci): endurece gates Supabase e governança`  
**Branch:** `codex/e23-required-secrets-20261030`  
**HEAD SHA:** `3fc3806e10598c26154bb832a1c954942f8123dc`  
**Autor:** Codex (cross-agent)  
**Mergeable state:** unstable (+858/-114, 21 arquivos)

**Por que exige decisão humana:**
1. **REGRA #8** — modifica `.github/workflows/deploy-gates.yml` (arquivo protegido: "NUNCA tocar .github/workflows" sem aprovação explícita do PO)
2. **REGRA #10** — branch `codex/*` → merge em `main` exige PR revisada por humano (cross-agent)
3. `mergeable_state: unstable` — conflito ou check pendente

**Ação requerida:** revisar o diff pessoalmente e fazer merge via GitHub UI (não por automação).  
**Dossier completo:** `analise-prs/dossies/PR-2839.md`

---

### PRs com CI falhando (não mergeadas — aguardam correção)

| PR | Título | Motivo |
|---|---|---|
| #2822 | (CI_FALHOU) | Gate Final vermelho no SHA da branch |
| #2739 | (CI_FALHOU) | Gate Final vermelho no SHA da branch |

Essas PRs precisam que o autor corrija os erros de CI antes de serem mergeadas.

---

## PRs MERGEADAS NESTA SESSÃO

| PR | Título | SHA merge | Gate Final | Concluído |
|---|---|---|---|---|
| #2844 | fix(hooks): correção useProductSearch | `a24ee07b` | ✅ job 124350219814 | 2026-10-30T22:50:04Z |
| #2845 | fix(catalog): ajuste filtros | `637fe57e` | ✅ job 124354220749 | 2026-10-30T22:53:23Z |
| #2836 | fix(cart): correção estado | `6bd5ce61` | ✅ job 124354384615 | 2026-10-30T22:53:26Z |
| #2810 | feat: PromoFlixPlayer refactor | `554ef41b` | ✅ job 124355046790 | 2026-10-30T22:53:31Z |

**Baseline pré-merge** (SHA `9541666b`): Gate Final = success  
**Pós-merge** (SHA `554ef41b`): Gate Final = success  
**Conclusão:** Zero regressão de CI em todos os merges.

### Confirmação de produção pós-merge

Executado via `mcp__SUPABASE_-_GEST_O_DE_PRODUTOS_-_PROMO_GIFTS_V4__execute_sql`
(projeto canônico `doufsxqlfjyuvxuezpln` — SSOT conforme REGRA #1):

```sql
SELECT
  (SELECT COUNT(*) FROM supabase_migrations.schema_migrations
   WHERE version > '20261027000000') AS migrations_after_20261027,
  (SELECT MAX(version) FROM supabase_migrations.schema_migrations) AS latest_migration,
  (SELECT COUNT(*) FROM cron.job WHERE active = true) AS active_cron_jobs
```

Resultado: `migrations_after_20261027=3, latest_migration=20261027160000, active_cron_jobs=134`

Edge functions: todas ACTIVE (via `list_edge_functions`).  
Nenhuma das 4 PRs mergeadas modificou migrations ou edge functions (confirmado por `git diff` nos diffs de cada PR).

---

## PRONTAS MAS NÃO MERGEADAS — e por quê

| PR | Veredito | Razão |
|---|---|---|
| #2758 | JÁ_IMPLEMENTADA | Conteúdo já presente em main (cherry-pick/equivalente confirmado) |

---

## FECHAR — PRs que não devem ser mergeadas

> Comentários sugeridos estão listados mas **não foram postados** (proibido por escopo da tarefa).

| PR | Razão | Comentário sugerido (não postado) |
|---|---|---|
| #2831 | DRAFT — autor não sinalizou pronto | "PR ainda em draft. Reabrir quando estiver pronta para revisão." |
| #2827 | Body diz "não mesclar nesta etapa" | "Mantida aberta conforme instrução no body. Fechar se não for mais necessária." |
| #2826 | REGRA #8 — modifica `.github/workflows/branch-protection-sentinel.yml` | "PR modifica workflow protegido (REGRA #8). Requer aprovação explícita do PO antes de merge." |
| #2825 | CI falhou em Gate 1.3 (migration baseline) | "Gate 1.3 falhou: migration baseline inválido. Corrigir antes de novo review." |
| #2824 | REGRA #8 — modifica `.github/workflows/replenishment-quality.yml` | "PR modifica workflow protegido (REGRA #8). Requer aprovação explícita do PO." |
| #2823 | REGRA #8 — modifica `supabase/migrations/` com DDL | "PR contém DDL em supabase/migrations/ — segue o fluxo de migration? Requer aprovação explícita do PO." |
| #2821 | REGRA #8 — modifica `.github/workflows/uptime-monitor.yml` | "PR modifica workflow protegido (REGRA #8). Requer aprovação explícita do PO." |
| #2799 | Bot PR em estado WAITING_CI | "Check de CI pendente há mais de 48h. Fechar e reabrir se ainda relevante." |
| #2744 | DRAFT | "PR ainda em draft. Reabrir quando pronta." |
| #2731 | REGRA #8 duplo + histórico desconectado do main | "Branch desconectada do main (rebase necessário) e toca workflows protegidos (REGRA #8)." |
| #2701 | REGRA #8 + histórico desconectado + DRAFT | "PR em draft, branch desconectada e toca workflows protegidos (REGRA #8)." |

---

## CLUSTERS DE PRs

### Cluster 1 — Workflows e governança de CI (REGRA #8)
PRs que tocam `.github/workflows/` ou `scripts/` de governança:
- **#2839** (Codex — DECISAO_HUMANA): `deploy-gates.yml`, `CLAUDE.md`, `AGENTS.md`
- **#2826** (NAO_MERGEAR): `branch-protection-sentinel.yml`
- **#2824** (NAO_MERGEAR): `replenishment-quality.yml`
- **#2823** (NAO_MERGEAR): `supabase/migrations/` DDL
- **#2821** (NAO_MERGEAR): `uptime-monitor.yml`
- **#2731** (NAO_MERGEAR): múltiplos workflows

Nenhuma dessas PRs pode ser mergeada automaticamente. Requerem revisão humana.

### Cluster 2 — Drafts
- **#2831**, **#2744**, **#2701** — não prontas para merge

### Cluster 3 — PRs de bot aguardando CI
- **#2799** — estado WAITING_CI há mais de 48h

### Cluster 4 — PRs mergeadas (entregas desta sessão)
- **#2844**, **#2845**, **#2836**, **#2810** — todas mergeadas com Gate Final ✅

---

## RESUMO POR VEREDITO

| Veredito | Qtde | PRs |
|---|---|---|
| MERGEADA | 4 | #2844, #2845, #2836, #2810 |
| NAO_MERGEAR | 11 | #2826, #2825, #2824, #2823, #2821, #2827, #2831, #2799, #2744, #2731, #2701 |
| DECISAO_HUMANA | 1 | #2839 |
| CI_FALHOU | 2 | #2822, #2739 |
| JA_IMPLEMENTADA | 1 | #2758 |
| **TOTAL** | **19** | |

---

## NÃO VERIFICADO

Os itens abaixo não puderam ser verificados completamente nesta sessão, com justificativa:

| Item | Razão | Impacto |
|---|---|---|
| **tests/components — suite completa** | 137 arquivos excedem memória do container (exit OOM). Executados em 3 batches; resultados em gate2-vitest-build-output.md | Baixo — batches 1-3 cobriram 264 arquivos de outros diretórios sem regressão nova; 4 PRs mergeadas não tocaram components |
| **Per-PR test merge local documentado** | Merges de #2844/#2845 ocorreram em sessão anterior compactada. Evidência substituta: Gate Final success em cada SHA pós-merge | Baixo — CI do GitHub Actions executa suite completa incluindo components |
| **PR-2839 diff completo lido linha a linha** | 21 arquivos +858/-114 linhas; leitura via API GitHub confirmou arquivos protegidos (deploy-gates.yml, CLAUDE.md, AGENTS.md) | Não se aplica — DECISAO_HUMANA por REGRA #8 independe de leitura completa do diff |
| **PR-2822 e #2739 — causa raiz de CI** | Gate Final vermelho; logs não recuperados completamente | Moderado — não mergeadas, aguardam correção pelo autor |
| **Postgres temporário para chain de migrations** | Container não tem PostgreSQL standalone disponível | Não se aplica — nenhuma das 4 PRs mergeadas tocou migrations |

---

## ARQUIVOS DESTA ANÁLISE

| Arquivo | Descrição |
|---|---|
| `analise-prs/progresso.json` | SSOT de estado — 19 PRs, 5 vereditos |
| `analise-prs/prs.json` | 42 entradas com campos completos |
| `analise-prs/prs.csv` | 55 linhas — exportação tabular |
| `analise-prs/regras-de-negocio.md` | 11 seções extraídas de fontes reais |
| `analise-prs/RELATORIO_PRS.md` | Este arquivo |
| `analise-prs/dossies/PR-*.md` | Dossiê individual por PR (180+ arquivos) |
| `analise-prs/baseline/gate2-vitest-build-output.md` | Comparação Gate 2 baseline × pós-merge |
| `analise-prs/baseline/failing-tests-by-name.md` | 21 falhas do baseline (ambientais/timezone) |
