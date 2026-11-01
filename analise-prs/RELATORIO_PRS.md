# Relatório de Análise de PRs — 2026-11-01
**Sessão:** `01Ss1tXZ4cAbxBvdmu95uNPz`
**main SHA fixado:** `a25070630788f77b297431665878319ad74bb587`
**Total PRs analisadas:** 27 / 27 (100%)

---

## ⚠️ RISCOS E DECISÕES HUMANAS (leia primeiro)

### 🔴 Alto risco — revisão imediata necessária

**PR #2969 — 106 REVOKE EXECUTE em funções de produção (SEC-001)**
- Migration com 106 `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` em `doufsxqlfjyuvxuezpln`
- Verificação de zero-refs foi por grep no TS, não via `pg_catalog` ao vivo — não cobre pg_cron, service_role ou PL/pgSQL
- Aplicação obrigatória via `db-apply-migration.yml` `workflow_dispatch` (REGRA#8/E056)

**PR #2973 — Senha mínima 6→8 chars (FT-306)**
- Fix eleva senha mínima de login de 6 para 8 caracteres
- Usuários existentes com senha de 6-7 chars não conseguirão logar pelo formulário após merge
- Exige comunicação prévia ou migração de senhas

### 🟡 Médio risco — revisão antes de mergear

**PR #2958 — Decisão PO D7: publicado = status shared**
- Mudança de regra de negócio no Kit Maker: `status='shared'` substitui `status='published'`
- O banco nunca persiste `'published'`, mas a mudança altera comportamento visível ao usuário
- Requer confirmação explícita de que "Decisão PO D7" foi tomada por humano, não pelo Lovable (REGRA#8)

**PR #2941 — Conflito real + rollback SQL**
- `mergeable_state=dirty`: 5 arquivos com conflitos confirmados em test merge local
- Toca `supabase/rollbacks/20261101140001_rollback.sql` → REGRA#8
- Precisa resolução de conflitos antes de qualquer merge

**PR #2951 e #2948 — Rollbacks em banco de produção**
- #2951: rollback com `DROP TABLE/TRIGGER` para migration `20261031000000`
- #2948: 3 rollbacks com `cron.alter_job` e `cron.schedule` — um arquivo de rollback documentado como não-funcional (`fn_pipeline_classify_pending_products` não existe mais)
- Ambos requerem revisão técnica do conteúdo antes do merge (REGRA#8)

**PR #2967 — CI workflow (gate E42)**
- Toca `.github/workflows/e2e-personalization.yml` → REGRA#9, requer PR e revisão
- Fix técnico correto (adiciona `id: auth-setup`, muda condição de `always()` para `always() && steps.auth-setup.outcome == 'success'`)

**PR #2966 — 10 novas entradas no allowlist gitleaks**
- `eyJzdWIiOiIxMjM0NTY3ODkw` é prefixo JWT genericamente reconhecido
- PO deve confirmar que nenhuma entrada silencia JWT real no codebase

### ⚪ PRs sobrepostas — escolher uma e fechar as demais

**FT-139 (prefers-reduced-motion confete):** PRs #2978, #2976, #2970 — mesma correção, mesmo arquivo
**FT-136 (erro 503/504 vs 429):** #2979, #2976, #2971 — divergência de implementação (agrupamentos diferentes)
**FT-134 (confirmação IA):** #2971, #2976 — mesmo fix, mensagens de prop diferentes

### ⚪ PRs behind main — rebase necessário antes do merge

PRs #2979, #2981 têm `draft=false` mas estão `behind main`. CI não rodou na versão rebased. Precisam de rebase + CI verde antes de qualquer merge.

---

## RESULTADO POR PR

| PR | Título | Draft | Veredicto | Nota |
|---|---|---|---|---|
| #2940 | feat(nav): Audit Suite na sidebar admin | não | **JA_EM_MAIN** | Mergeada 23:08:34 por adm01-debug |
| #2941 | fix(security): atualiza allowlist lint-0029 | não | **DECISAO_HUMANA** | dirty + supabase/rollbacks/ |
| #2944 | chore(main): release 1.6.1 | não | **JA_EM_MAIN** | Mergeada 23:08:57 por adm01-debug (release-please) |
| #2948 | chore(rollbacks): e38/e47/e37 | sim | **DECISAO_HUMANA** | REGRA#8 + DDL cron sensível |
| #2950 | fix(routes): rotas públicas mortas | sim | **DECISAO_HUMANA** | Draft |
| #2951 | chore(rollbacks): 20261031000000 | sim | **DECISAO_HUMANA** | REGRA#8 (migrations + rollbacks) |
| #2952 | fix(ci): Gate 1.13 partições | não | **JA_EM_MAIN** | Mergeada 23:08:45 por adm01-debug |
| #2958 | fix(kit-builder): publicados = shared | sim | **DECISAO_HUMANA** | Regra de negócio + confirmação PO D7 |
| #2961 | fix(pptx): badge dados simulados | sim | **DECISAO_HUMANA** | Draft |
| #2965 | fix(ux): FT-040/083/093 | sim | **DECISAO_HUMANA** | Draft + conflito parcial (PR #2960 removeu loadingProgress) |
| #2966 | fix: gitleaks allowlist +10 | não | **DECISAO_HUMANA** | .gitleaks.toml |
| #2967 | fix: gate E42 sem credenciais | não | **DECISAO_HUMANA** | .github/workflows/ |
| #2969 | fix(security): 106 REVOKE EXECUTE | não | **DECISAO_HUMANA** | DDL de segurança em produção — alto risco |
| #2970 | fix(ux): confete + AlertDialog | sim | **DECISAO_HUMANA** | Draft + sobreposição FT-139 |
| #2971 | fix(ux): FT-134/136/173 | não | **DECISAO_HUMANA** | behind + sobreposição #2976 |
| #2973 | fix(ux): FT-167/306/309 | não | **DECISAO_HUMANA** | senha min 6→8 chars (impacto usuários) |
| #2976 | fix(ux): UX batch6 | não | **DECISAO_HUMANA** | behind + sobreposição múltipla |
| #2978 | fix(kit-builder): FT-139 reduced-motion | não | **DECISAO_HUMANA** | behind + sobreposição FT-139 |
| #2979 | fix(kit-builder): FT-136 erros 503/504 | não | **DECISAO_HUMANA** | behind, CI não rodou rebased |
| #2980 | fix(mockup): onLogoRemove areaId FT-167 | sim | **DECISAO_HUMANA** | Draft, behind |
| #2981 | fix(ux): UX batch7 | não | **DECISAO_HUMANA** | behind, CI não rodou rebased |
| #2982 | fix(kit-builder): FT-174 aviso | sim | **DECISAO_HUMANA** | Draft, behind |
| #2988 | fix(ts): TS2339 useRuptureAlerts | não | **JA_EM_MAIN** | Mergeada 23:09:30 |
| #2990 | feat(catalog): FavoriteToggleButton FT-115 | não | **JA_EM_MAIN** | Mergeada 23:09:07 |
| #2991 | fix(husky): heap 2048→4096 MB | não | **JA_EM_MAIN** | Mergeada 23:12:47 por adm01-debug |
| #2992 | fix(kit-builder): conflito 40001 FT-118 | não | **JA_EM_MAIN** | Mergeada 23:09:19 |
| #2993 | fix(kit-builder): backup beforeunload FT-119 | não | **JA_EM_MAIN** | Mergeada 23:09:32 |

---

## MERGES EXECUTADOS PELO AGENTE

**Nenhum.** Todas as PRs elegíveis já haviam sido mergeadas pelo owner (`adm01-debug`) antes desta análise:

| PR | Merge commit | Hora |
|---|---|---|
| #2940 | `686be704a4f7b1c5e2cbedcf581bd075e9898d16` | 23:08:34 |
| #2944 | `03fc479aaf682f7e2f3958ad481c9c28c211d582` | 23:08:57 |
| #2952 | `eeca843a31112a65dcc66aebd2d94ae23cd129ea` | 23:08:45 |
| #2988 | `68d809ccb9...` | 23:09:30 |
| #2990 | `e56f2ca74a...` | 23:09:07 |
| #2991 | `331d50f8937e2572993e851866237b236d419410` | 23:12:47 |
| #2992 | `cbacfaaa63...` | 23:09:19 |
| #2993 | `78b32ddd52...` | 23:09:32 |

---

## DOSSIERS

Todos os 27 dossiers individuais em `analise-prs/dossies/PR-<n>.md`.

---

## META CUMPRIDA

- **Total PRs abertas quando análise iniciou:** 27
- **Total PRs analisadas:** 27 (100%)
- **JA_EM_MAIN:** 8
- **DECISAO_HUMANA:** 19
- **MERGEAR pelo agente:** 0
- **Merges executados:** 0 (todas as elegíveis já mergeadas pelo owner)
- **Outros writes no GitHub:** nenhum (sem comentários, labels, closes, edits)
- **Worktrees:** os agentes usaram worktrees locais; nenhum arquivo de worktree commitado
- **Arquivos de entrega:**
  - `analise-prs/baseline/BASELINE-session-01Ss1tXZ4cAbxBvdmu95uNPz.md`
  - `analise-prs/prs.json` (27 entradas)
  - `analise-prs/prs.csv` (28 linhas)
  - `analise-prs/progresso.json`
  - `analise-prs/dossies/PR-29{40,41,44,48,50,51,52,58,61,65,66,67,69,70,71,73,76,78,79,80,81,82,88,90,91,92,93}.md`
