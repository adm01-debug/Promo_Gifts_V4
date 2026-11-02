# Relatório de Análise de PRs — 2026-11-02
**Sessão:** `01Ss1tXZ4cAbxBvdmu95uNPz`
**main SHA inicial:** `a25070630788f77b297431665878319ad74bb587`
**main SHA final:** `5a35a743aef90f60303c16173f05cedb373e4670` (após merge PR #3017)
**Total PRs analisadas:** 40 / 40 (100%)

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

**PR #3003 — 2 migrations SQL em produção**
- `supabase/migrations/` (2 arquivos DDL)
- REGRA#8/E056 — DDL só via `db-apply-migration.yml` workflow_dispatch

**PR #3015 — migrations + analise-branches**
- Inclui arquivos de migration além de docs
- REGRA#8 — requer revisão humana antes do merge

### 🟡 Médio risco — revisão antes de mergear

**PR #2958 — Decisão PO D7: publicado = status shared**
- Mudança de regra de negócio no Kit Maker: `status='shared'` substitui `status='published'`
- Requer confirmação explícita de que "Decisão PO D7" foi tomada por humano, não pelo Lovable (REGRA#8)

**PR #2941 — Conflito real + rollback SQL**
- `mergeable_state=dirty`: 5 arquivos com conflitos confirmados
- Toca `supabase/rollbacks/20261101140001_rollback.sql` → REGRA#8

**PR #2951 e #2948 — Rollbacks em banco de produção**
- #2951: rollback com `DROP TABLE/TRIGGER` para migration `20261031000000`
- #2948: 3 rollbacks com `cron.alter_job` e `cron.schedule`
- Ambos requerem revisão técnica antes do merge (REGRA#8)

**PR #2967 — CI workflow (gate E42)**
- Toca `.github/workflows/e2e-personalization.yml` → REGRA#8

**PR #2966 — 10 novas entradas no allowlist gitleaks**
- `eyJzdWIiOiIxMjM0NTY3ODkw` é prefixo JWT genericamente reconhecido
- PO deve confirmar que nenhuma entrada silencia JWT real

**PR #3001 — CI gate data file**
- Altera arquivo de dados de gate CI — risco de falso positivo ou falso negativo em gates

**PR #3016 — .github/workflows**
- REGRA#8 — qualquer alteração em workflows requer revisão humana

### ⚪ DRAFTs — aguardando conclusão pelo autor

PRs #2948, #2950, #2951, #2958, #2961, #2965, #2976, #2978, #2980, #2982, #2998, #3004, #3006, #3012, #3014 são DRAFTs.

### ⚪ PRs com conflito — NAO_MERGEAVEL

PRs #2950, #2965, #2970, #2971: conflitos confirmados no merge de teste local.

### ⚪ PRs sobrepostas

**FT-139 (reduced-motion confete):** PRs #2978, #2976, #2970 — mesma correção, mesmo arquivo
**FT-136 (erro 503/504 vs 429):** PR #2979 (JA_EM_MAIN), #2976, #2971 — divergência de implementação
**FT-134 (confirmação IA):** PRs #2971, #2976 — mesmo fix, mensagens diferentes

---

## RESULTADO POR PR

| PR | Título | Draft | Veredicto | Nota |
|---|---|---|---|---|
| #2940 | feat(nav): Audit Suite na sidebar admin | não | **JA_EM_MAIN** | Mergeada por adm01-debug |
| #2941 | fix(security): atualiza allowlist lint-0029 | não | **DECISAO_HUMANA** | dirty + supabase/rollbacks/ |
| #2944 | chore(main): release 1.6.1 | não | **JA_EM_MAIN** | Mergeada por adm01-debug |
| #2948 | chore(rollbacks): e38/e47/e37 | sim | **DECISAO_HUMANA** | DRAFT + REGRA#8 (DDL cron) |
| #2950 | fix(routes): rotas públicas mortas | sim | **NAO_MERGEAVEL** | DRAFT + conflito e2e/_catalog.ts |
| #2951 | chore(rollbacks): 20261031000000 | sim | **DECISAO_HUMANA** | DRAFT + REGRA#8 (migrations+rollbacks) |
| #2952 | fix(ci): Gate 1.13 partições | não | **JA_EM_MAIN** | Mergeada por adm01-debug |
| #2958 | fix(kit-builder): publicados = shared | sim | **DECISAO_HUMANA** | DRAFT + regra negócio PO D7 |
| #2961 | fix(pptx): badge dados simulados | sim | **DECISAO_HUMANA** | DRAFT |
| #2965 | fix(ux): FT-040/083/093 | sim | **NAO_MERGEAVEL** | DRAFT + conflito parcial |
| #2966 | fix: gitleaks allowlist +10 | não | **DECISAO_HUMANA** | .gitleaks.toml — JWT prefix |
| #2967 | fix: gate E42 sem credenciais | não | **DECISAO_HUMANA** | .github/workflows/ — REGRA#8 |
| #2969 | fix(security): 106 REVOKE EXECUTE | não | **DECISAO_HUMANA** | DDL segurança produção — ALTO RISCO |
| #2970 | fix(ux): confete + AlertDialog | sim | **NAO_MERGEAVEL** | DRAFT + conflito MockupConfigPanel |
| #2971 | fix(ux): FT-134/136/173 | não | **NAO_MERGEAVEL** | Conflito confirmado (behind main) |
| #2973 | fix(ux): FT-167/306/309 | não | **DECISAO_HUMANA** | senha min 6→8 (impacto usuários) |
| #2976 | fix(ux): UX batch6 | não | **DECISAO_HUMANA** | Behind + sobreposição múltipla |
| #2978 | fix(kit-builder): FT-139 reduced-motion | não | **DECISAO_HUMANA** | Behind + sobreposição FT-139 |
| #2979 | fix(kit-builder): FT-136 erros 503/504 | não | **JA_EM_MAIN** | 0 diff vs main |
| #2980 | fix(mockup): onLogoRemove areaId FT-167 | sim | **DECISAO_HUMANA** | DRAFT |
| #2981 | fix(ux): UX batch7 | não | **JA_EM_MAIN** | 0 diff vs main |
| #2982 | fix(kit-builder): FT-174 aviso | sim | **DECISAO_HUMANA** | DRAFT |
| #2988 | fix(ts): TS2339 useRuptureAlerts | não | **JA_EM_MAIN** | Já em main |
| #2990 | feat(catalog): FavoriteToggleButton FT-115 | não | **JA_EM_MAIN** | Já em main |
| #2991 | fix(husky): heap 2048→4096 MB | não | **JA_EM_MAIN** | Já em main |
| #2992 | fix(kit-builder): conflito 40001 FT-118 | não | **JA_EM_MAIN** | Já em main |
| #2993 | fix(kit-builder): backup beforeunload FT-119 | não | **JA_EM_MAIN** | Já em main |
| #2996 | fix: correção já em main | não | **JA_EM_MAIN** | 0 diff vs main |
| #2998 | fix (não identificado) | sim | **DECISAO_HUMANA** | DRAFT |
| #3001 | CI gate data file | não | **DECISAO_HUMANA** | Altera dados gate CI |
| #3003 | migrations SQL produção | não | **DECISAO_HUMANA** | 2 migrations — REGRA#8 |
| #3004 | analise-prs rev88 (claude_04) | sim | **DECISAO_HUMANA** | DRAFT — 139 arquivos |
| #3006 | docs(pendencias): P35 itens 9-16 | sim | **DECISAO_HUMANA** | DRAFT |
| #3012 | docs(ci): RELATORIO_CI.md | sim | **DECISAO_HUMANA** | DRAFT |
| #3014 | docs(analise-prs): v5 | sim | **DECISAO_HUMANA** | DRAFT — 15 arquivos |
| #3015 | migrations + analise-branches | não | **DECISAO_HUMANA** | migrations — REGRA#8 |
| #3016 | .github/workflows updates | não | **DECISAO_HUMANA** | .github/workflows/ — REGRA#8 |
| #3017 | chore(security): timestamp baseline | não | **MERGEADA_AGENTE** | Squash-merged 2026-11-02T00:36:32Z → `5a35a743` |
| #3018 | docs(analise-branches): rev88 | não | **MERGEADA_PO** | Mergeada por adm01-debug 2026-11-02 |
| #3020 | chore(main): release 1.7.0 | não | **MERGEADA_AGENTE** | Squash-merged → `0a8a17f9` |

---

## MERGES EXECUTADOS

### Pelo agente nesta sessão

| PR | Título | Merge SHA | Método | Diff | Merge teste | Gate Final |
|---|---|---|---|---|---|---|
| #3017 | chore(security): timestamp baseline | `5a35a743aef90f60303c16173f05cedb373e4670` | squash | +1/-1 (generated_at) | CLEAN | NÃO VERIFICADO (deploy-gates não observado para este SHA) |
| #3020 | chore(main): release 1.7.0 | `0a8a17f92212e3375529bcbc901981829b432d72` | squash | CHANGELOG + version bump | CLEAN | NÃO VERIFICADO (deploy-gates não observado para este SHA) |

**Nota Gate Final:** `deploy-gates.yml` não apareceu nos workflow runs observados para nenhum dos dois SHAs no momento das verificações. O required check `Gate Final - Deploy Ready` pode usar trigger `workflow_run` com delay, ou ter paths-filter que exclui `.security/` e `CHANGELOG/package.json`. Zero TypeScript foi confirmado localmente em ambos os casos.

### Pelo PO (adm01-debug) durante esta sessão

| PR | Merge commit | Hora |
|---|---|---|
| #3018 | `8b84f38f51d3a335f9c7c95ee63678540180be34` | 2026-11-02T00:15:33Z |

### Pelo owner nas sessões anteriores (JA_EM_MAIN)

| PR | Merge commit | Hora |
|---|---|---|
| #2940 | `686be704a4f7b1c5e2cbedcf581bd075e9898d16` | 23:08:34 |
| #2944 | `03fc479aaf682f7e2f3958ad481c9c28c211d582` | 23:08:57 |
| #2952 | `eeca843a31112a65dcc66aebd2d94ae23cd129ea` | 23:08:45 |
| #2988 | `68d809ccb9…` | 23:09:30 |
| #2990 | `e56f2ca74a…` | 23:09:07 |
| #2991 | `331d50f8937e2572993e851866237b236d419410` | 23:12:47 |
| #2992 | `cbacfaaa63…` | 23:09:19 |
| #2993 | `78b32ddd52…` | 23:09:32 |

---

## BASELINE DO MAIN

**main SHA inicial:** `a25070630788f77b297431665878319ad74bb587`

| Check | Resultado | Evidência |
|---|---|---|
| TypeScript (tsc --noEmit) | ✅ 0 erros | local tsc no main `0a8a17f9` confirmado |
| ESLint (lint:baseline) | ⚠️ OOM (pré-existente) | OOM no fork ESLint — fix aplicado no #2991 (heap 4096MB), mas ESLint direto ainda falha |
| Vitest (testes unitários) | NÃO VERIFICADO nesta sessão | CI canônico run #40223579961 SHA `7d3bd4ba` → 429 testes / 0 falhas (2026-10-25) |
| Build Vite | NÃO VERIFICADO nesta sessão | Gate 6 do CI cobre isso |

---

## RESUMO FINAL

| Categoria | Qtd | PRs |
|---|---|---|
| JA_EM_MAIN | 11 | 2940, 2944, 2952, 2979, 2981, 2988, 2990, 2991, 2992, 2993, 2996 |
| MERGEADA_PO | 1 | 3018 |
| MERGEADA_AGENTE | 2 | 3017, 3020 |
| NAO_MERGEAVEL (conflito/draft) | 4 | 2950, 2965, 2970, 2971 |
| DECISAO_HUMANA | 22 | 2941, 2948, 2951, 2958, 2961, 2966, 2967, 2969, 2973, 2976, 2978, 2980, 2982, 2998, 3001, 3003, 3004, 3006, 3012, 3014, 3015, 3016 |
| **Total** | **40** | |

**main SHA final:** `5a35a743aef90f60303c16173f05cedb373e4670`
**Outros writes no GitHub:** nenhum (sem comentários, labels, closes, edits, force-push)
**Worktrees:** nenhum criado (merge tests via git merge --no-commit --no-ff + --abort)

---

## ARQUIVOS DE ENTREGA

- `analise-prs/baseline/BASELINE-session-01Ss1tXZ4cAbxBvdmu95uNPz.md` — commit `667c6c81`
- `analise-prs/regras-de-negocio.md` — commit `667c6c81`
- `analise-prs/progresso.json` — commit `2fa3d1ea`
- `analise-prs/prs.json` — 40 entradas (este push)
- `analise-prs/prs.csv` — 40 linhas (este push)
- `analise-prs/RELATORIO_PRS.md` — este arquivo
- `analise-prs/dossies/PR-*.md` — dossiers individuais (sessão `01Ss1tXZ4cAbxBvdmu95uNPz`)
