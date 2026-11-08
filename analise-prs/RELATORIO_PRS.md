# Relatório de Análise de PRs — Sessão Consolidada
**Sessão:** `01Ss1tXZ4cAbxBvdmu95uNPz` (3 contextos)
**main SHA inicial:** `a25070630788f77b297431665878319ad74bb587`
**main SHA final:** `1d3dafae93722b7e19f426bcf63701a80ab4b148` (após merge PR #3201)
**Total PRs analisadas:** 56 / 56 (100%)

---

# ⚠️ RISCOS E DECISÕES HUMANAS (leia primeiro)

### 🚨 Alto risco — revisão imediata necessária

**PR #2969 — 106 REVOKE EXECUTE em funções de produção (SEC-001)**
- Migration com 106 `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` em `doufsxqlfjyuvxuezpln`
- Aplicação obrigatória via `db-apply-migration.yml` `workflow_dispatch` (REGRA#8/E056)

**PR #2973 — Senha mínima 6→8 chars (FT-306)**
- Usuários existentes com senha de 6-7 chars não conseguirão logar após merge
- Exige comunicação prévia ou migração de senhas

**PR #3003 — 2 migrations SQL em produção**
- `supabase/migrations/` (2 arquivos DDL) — REGRA#8/E056

**PR #3214 — CRON-001: 4 cron jobs com job startup timeout**
- 10 jobs falhando em produção; fix via `cron.alter_job` precisa aprovação PO
- Aplicar via `db-apply-migration.yml` com version `20261101220000`

### ⚡ Médio risco

**PR #2941** — dirty merge + supabase/rollbacks/
**PR #2948, #2951** — rollbacks DDL em produção (cron.alter_job, DROP TABLE/TRIGGER)
**PR #2958** — Decisão PO D7: publicado = status shared (Kit Maker)
**PR #2966** — 10 novas entradas gitleaks (JWT prefix)
**PR #2967, #3016, #3127, #3129, #3137** — .github/workflows/ — REGRA#8
**PR #3144, #3150, #3205** — migrations/ledger — REGRA#8/E056
**PR #3203** — Gate Final FAILURE (CI vermelho)
**PR #3215** — DRAFT + migration `20261108001500` (adiciona `-- Rollback:` ao preflight) — REGRA#8/E056

### ⬛ DRAFTs pendentes

#2948, #2950, #2951, #2958, #2961, #2965, #2970, #2976, #2978, #2980, #2982, #2998, #3004, #3006, #3012, #3014, #3148, #3160, #3179, #3202, #3214, #3215

### ⬛ PRs bloqueadas (conflito/CI falha)

#2950, #2965, #2970, #2971 — conflito confirmado no merge de teste  
#3203 — Gate Final FAILURE

---

## RESULTADO COMPLETO — 56 PRs

| PR | Título (resumido) | Draft | Veredito |
|---|---|---|---|
| #2940 | feat(nav): Audit Suite na sidebar | não | **JA_EM_MAIN** |
| #2941 | fix(security): allowlist lint-0029 | não | **DECISAO_HUMANA** |
| #2944 | chore(main): release 1.6.1 | não | **JA_EM_MAIN** |
| #2948 | chore(rollbacks): e38/e47/e37 | sim | **DECISAO_HUMANA** |
| #2950 | fix(routes): rotas públicas mortas | sim | **NAO_MERGEAVEL** |
| #2951 | chore(rollbacks): 20261031000000 | sim | **DECISAO_HUMANA** |
| #2952 | fix(ci): Gate 1.13 partições | não | **JA_EM_MAIN** |
| #2958 | fix(kit-builder): publicados=shared | sim | **DECISAO_HUMANA** |
| #2961 | fix(pptx): badge dados simulados | sim | **DECISAO_HUMANA** |
| #2965 | fix(ux): FT-040/083/093 | sim | **NAO_MERGEAVEL** |
| #2966 | fix: gitleaks allowlist +10 | não | **DECISAO_HUMANA** |
| #2967 | fix: gate E42 sem credenciais | não | **DECISAO_HUMANA** |
| #2969 | fix(security): 106 REVOKE EXECUTE 🚨 | não | **DECISAO_HUMANA** |
| #2970 | fix(ux): confete + AlertDialog | sim | **NAO_MERGEAVEL** |
| #2971 | fix(ux): FT-134/136/173 | não | **NAO_MERGEAVEL** |
| #2973 | fix(ux): FT-167/306/309 ⚡ | não | **DECISAO_HUMANA** |
| #2976 | fix(ux): UX batch6 | não | **DECISAO_HUMANA** |
| #2978 | fix(kit-builder): FT-139 | não | **DECISAO_HUMANA** |
| #2979 | fix(kit-builder): FT-136 | não | **JA_EM_MAIN** |
| #2980 | fix(mockup): onLogoRemove FT-167 | sim | **DECISAO_HUMANA** |
| #2981 | fix(ux): UX batch7 | não | **JA_EM_MAIN** |
| #2982 | fix(kit-builder): FT-174 | sim | **DECISAO_HUMANA** |
| #2988 | fix(ts): TS2339 useRuptureAlerts | não | **JA_EM_MAIN** |
| #2990 | feat(catalog): FavoriteToggle FT-115 | não | **JA_EM_MAIN** |
| #2991 | fix(husky): heap 4096 MB | não | **JA_EM_MAIN** |
| #2992 | fix(kit-builder): conflito 40001 | não | **JA_EM_MAIN** |
| #2993 | fix(kit-builder): backup beforeunload | não | **JA_EM_MAIN** |
| #2996 | fix: já em main | não | **JA_EM_MAIN** |
| #2998 | fix (não identificado) | sim | **DECISAO_HUMANA** |
| #3001 | CI gate data file | não | **DECISAO_HUMANA** |
| #3003 | migrations SQL produção | não | **DECISAO_HUMANA** |
| #3004 | analise-prs rev88 claude_04 | sim | **DECISAO_HUMANA** |
| #3006 | docs(pendencias): P35 | sim | **DECISAO_HUMANA** |
| #3012 | docs(ci): RELATORIO_CI | sim | **DECISAO_HUMANA** |
| #3014 | docs(analise-prs): v5 | sim | **DECISAO_HUMANA** |
| #3015 | migrations + analise-branches | não | **DECISAO_HUMANA** |
| #3016 | .github/workflows updates | não | **DECISAO_HUMANA** |
| #3017 | chore(security): timestamp baseline | não | **MERGEADA_AGENTE** ✅ |
| #3018 | docs(analise-branches): rev88 | não | **MERGEADA_PO** ✅ |
| #3020 | chore(main): release 1.7.0 | não | **MERGEADA_AGENTE** ✅ |
| #3127 | fix(ci): estabiliza núcleo E2E | não | **DECISAO_HUMANA** |
| #3129 | ci(e2e): reduzir pressão runners | não | **DECISAO_HUMANA** |
| #3137 | fix(ci): falso negativo detector E2E | não | **DECISAO_HUMANA** |
| #3144 | fix(db): reconciliar ledger | não | **DECISAO_HUMANA** |
| #3148 | fix(edge-fn): CRM bridge | sim | **DECISAO_HUMANA** |
| #3150 | fix(db): liberar migrations | não | **DECISAO_HUMANA** |
| #3160 | fix: DB E15 pg_temp+rollback | sim | **DECISAO_HUMANA** |
| #3179 | fix: preflight db-apply-migration | sim | **DECISAO_HUMANA** |
| #3201 | fix(scripts): scripts+edge+baselines | não | **MERGEADA_AGENTE** ✅ |
| #3202 | docs(ci): RELATORIO §33 | sim | **DECISAO_HUMANA** |
| #3203 | fix: static-pass+exit codes ❌CI | não | **DECISAO_HUMANA** |
| #3205 | fix(db): reversionar migration | não | **DECISAO_HUMANA** |
| #3210 | chore(main): release 1.8.2 | não | **DECISAO_HUMANA** |
| #3212 | docs: recibo deploy edge function | não | **DECISAO_HUMANA** |
| #3214 | fix(cron): CRON-001 🚨 | sim | **DECISAO_HUMANA** |
| #3215 | fix(migration): rollback header 20261108001500 | sim | **DECISAO_HUMANA** |

---

## MERGES EXECUTADOS PELO AGENTE

| PR | Título | Merge SHA | Gate Final (pré-merge) |
|---|---|---|---|
| #3017 | chore(security): timestamp baseline | `5a35a743` | ⚠️ FAILURE pré-existente — Gate 1 Lint OOM (Δbaseline=0); job `125043861225`; diff tocou apenas `docs/security/*.json`, sem impacto em lint; falha idêntica existia antes do merge |
| #3020 | chore(main): release 1.7.0 | `0a8a17f9` | ⚠️ Gate Final não disparado no SHA (release-please path bypass); Gate Final subsequente `1d3dafae` → ✅ SUCCESS job `128774330099` |
| #3201 | fix(scripts): scripts+edge+baselines | `1d3dafae` | ✅ SUCCESS run `42494087701` job `128774330099` |

**Gate Final pós-merge #3201 no main:** ✅ SUCCESS (run `42494087701`, job `128774330099`, completed `2026-11-08T15:24:56Z`)

---

## RESUMO FINAL

| Categoria | Qtd | PRs |
|---|---|---|
| JA_EM_MAIN | 11 | 2940,2944,2952,2979,2981,2988,2990,2991,2992,2993,2996 |
| MERGEADA_PO | 1 | 3018 |
| MERGEADA_AGENTE | 3 | 3017,3020,3201 |
| NAO_MERGEAVEL | 4 | 2950,2965,2970,2971 |
| DECISAO_HUMANA | 37 | 2941,2948,2951,2958,2961,2966,2967,2969,2973,2976,2978,2980,2982,2998,3001,3003,3004,3006,3012,3014,3015,3016,3127,3129,3137,3144,3148,3150,3160,3179,3202,3203,3205,3210,3212,3214,3215 |
| **Total** | **56** | |

**main SHA final:** `1d3dafae93722b7e19f426bcf63701a80ab4b148`  
**Outros writes no GitHub:** nenhum (sem comentários, labels, closes, edits, force-push)

---

## ARQUIVOS DE ENTREGA

- `analise-prs/prs.json` — 56 entradas
- `analise-prs/prs.csv` — 56 linhas de dados (+ 1 header)
- `analise-prs/progresso.json` — estado consolidado
- `analise-prs/RELATORIO_PRS.md` — este arquivo
- `analise-prs/baseline/BASELINE-session-01Ss1tXZ4cAbxBvdmu95uNPz.md`
- `analise-prs/regras-de-negocio.md`
- `analise-prs/dossies/PR-*.md` — 56 dossiês (40 sessão 1 + 15 sessão 2 + 1 sessão 3)
