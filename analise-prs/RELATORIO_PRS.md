# Relatório de Análise de PRs — Sessão 4 (2026-11-08)

**Main SHA base:** `1d3dafae93722b7e19f426bcf63701a80ab4b148`  
**Typecheck baseline:** EXIT:0 (0 erros TypeScript)  
**Lint baseline:** OOM/timeout — pré-existente desde sessão 1 (ESLint Gate 1 OOM)  
**Total PRs analisadas:** 57 (2940–3216)  
**Sessões:** 01Ss1tXZ4cAbxBvdmu95uNPz (atual) + anteriores

---

## Resumo dos Vereditos

| Veredito | Qtd | PRs |
|---|---|---|
| JA_EM_MAIN | 11 | 2940, 2944, 2952, 2979, 2981, 2988, 2990, 2991, 2992, 2993, 2996 |
| NAO_MERGEAVEL | 5 | 2950, 2965, 2970, 2971, 3203 |
| DECISAO_HUMANA | 38 | 2941, 2948, 2951, 2958, 2961, 2966, 2967, 2969, 2973, 2976, 2978, 2980, 2982, 2998, 3001, 3003, 3004, 3006, 3012, 3014, 3015, 3016, 3127, 3129, 3137, 3144, 3148, 3150, 3160, 3179, 3202, 3205, 3210, 3212, 3214, 3215, 3216 |
| MERGEADA_PO | 1 | 3018 |
| MERGEADA_AGENTE | 3 | 3017, 3020, 3201 |

---

## PRs Mergeadas pelo Agente

### PR#3017 — chore(security): atualiza timestamp baseline de politicas 2026-11-01
- Squash-merged → `5a35a743aef90f60303c16173f05cedb373e4670`
- Gate Final: FAILURE (OOM ESLint — **pré-existente**, Δbaseline=0)
- Regressão: **não** (evidência: job 125043861225; falha idêntica existia antes do merge)

### PR#3020 — chore(main): release 1.7.0
- Squash-merged → `0a8a17f92212e3375529bcbc901981829b432d72`
- Gate Final: não disparado neste SHA; coberto pelo Gate Final SUCCESS em `1d3dafae`
- Regressão: **não**

### PR#3201 — fix(scripts): corrige scripts, edge functions e baselines
- Squash-merged → `1d3dafae93722b7e19f426bcf63701a80ab4b148`
- Gate Final: **SUCCESS** (run 42494087701, job 128774330099, 2026-11-08T15:24:56Z)
- Regressão: **não**

---

## PRs DECISAO_HUMANA — Resumo de Bloqueios

| PR | Título | Bloqueio principal |
|---|---|---|
| 2941 | fix(security): atualiza allowlist lint-0029 | Conflito (dirty) + supabase/rollbacks/ |
| 2948 | chore(rollbacks): rollbacks e38/e47/e37 | DRAFT + cron.alter_job REGRA#8 |
| 2951 | chore(rollbacks): rollback 20261031000000 | DRAFT + supabase/migrations/ REGRA#8 |
| 2958 | fix(kit-builder): publicados = status shared | DRAFT + mudança regra de negócio |
| 2961 | fix(pptx): badge Dados simulados | DRAFT |
| 2966 | fix: allowlist gitleaks | .gitleaks.toml — requer humano |
| 2967 | fix: gate E42 | .github/workflows/ REGRA#8 |
| 2969 | fix(security): REVOKE EXECUTE 106 funções | 106 REVOKE DDL — REGRA#8/E056 |
| 2973 | fix(ux): senha min 8 | FT-306 impacto usuários existentes |
| 2976 | fix(ux): UX batch6 | Behind main + sobreposição |
| 2978 | fix(kit-builder): reduced-motion | Behind main + sobreposição |
| 2980 | fix(mockup): onLogoRemove | DRAFT + behind main |
| 2982 | fix(kit-builder): aviso prévia | DRAFT + behind main |
| 2998 | fix (não identificado) | DRAFT |
| 3001 | CI gate data file | Dados de gate CI — risco falso negativo |
| 3003 | migrations SQL produção | supabase/migrations/ REGRA#8/E056 |
| 3004 | analise-prs rev88 (claude_04) | DRAFT + 139 arquivos |
| 3006 | docs(pendencias): P35 | DRAFT |
| 3012 | docs(ci): RELATORIO_CI | DRAFT |
| 3014 | docs(analise-prs): v5 | DRAFT |
| 3015 | migrations + analise-branches | supabase/migrations/ REGRA#8 |
| 3016 | .github/workflows updates | .github/workflows/ REGRA#8 |
| 3127 | fix(ci): estabiliza nucleo E2E | CONFLICT + .github/workflows/ + "não mesclar" |
| 3129 | ci(e2e): reduzir pressao runners | CONFLICT + .github/workflows/ REGRA#8 |
| 3137 | fix(ci): falso negativo E2E | CONFLICT + .github/workflows/ + "não mesclar" |
| 3144 | fix(db): reconciliar ledger | CONFLICT + supabase/migrations/ REGRA#8 |
| 3148 | fix(edge-fn): CRM bridge | DRAFT + CONFLICT + migration + edge fn REGRA#8 |
| 3150 | fix(db): liberar migrations | CONFLICT + 3 novas migrations REGRA#8 |
| 3160 | fix: DB E15 | DRAFT + CONFLICT + migration SQL REGRA#8 |
| 3179 | fix: preflight db-apply | DRAFT + migration SQL REGRA#8 |
| 3202 | docs(ci): RELATORIO §33 | DRAFT |
| 3205 | fix(db): reversionar e2e_cleanup | migration + aprovação explícita PO REGRA#8 |
| 3210 | release 1.8.2 | Bot + blocked + revisor:adm01-debug |
| 3212 | recibo deploy edge fn | Bot + revisor:adm01-debug |
| 3214 | fix(cron): CRON-001 | DRAFT + cron.alter_job REGRA#8/E056 |
| 3215 | fix(migration): rollback header | DRAFT + migration + CI FAILURE |
| 3216 | docs(analise): nov-2026 | DRAFT + migration REGRA#8/E056 |

---

## PRs NAO_MERGEAVEL — Resumo

| PR | Título | Razão |
|---|---|---|
| 2950 | fix(routes): remove rotas mortas | DRAFT + conflito confirmado em e2e/_catalog.ts |
| 2965 | fix(ux): FT-040/083/093 | DRAFT + conflito (loadingProgress removido em main) |
| 2970 | fix(ux): confetti/AlertDialog | DRAFT + conflito em MockupConfigPanel.tsx |
| 2971 | fix(ux): FT-134/136/173 | Conflito confirmado + sobreposição FT-134/136 |
| 3203 | fix: scripts static-pass | Gate Final CI FAILURE + CONFLICT baseline JSON |

---

## Metodologia desta Sessão (PRs 3127–3216)

### Typecheck
```
npm run qa:typecheck em main 1d3dafae
EXIT: 0 — 0 erros TypeScript
```

### Lint
```
npm run lint
EXIT: 143 (SIGTERM — OOM/timeout)
Comportamento pré-existente desde sessão 1.
```

### Test-merges
Todos os 16 PRs das sessões 3-4 foram submetidos a `git merge --no-commit --no-ff` contra main `1d3dafae`:

| PR | Resultado |
|---|---|
| 3127 | CONFLICT (.github/workflows/) |
| 3129 | CONFLICT (.github/workflows/) |
| 3137 | CONFLICT (.github/workflows/) |
| 3144 | CONFLICT (supabase/migrations/) |
| 3148 | CONFLICT (supabase/migrations/ + edge fn) |
| 3150 | CONFLICT (supabase/migrations/) |
| 3160 | CONFLICT (PENDENCIAS.md, RELATORIO_CI.md) |
| 3179 | OK |
| 3202 | OK |
| 3203 | CONFLICT (baseline JSON files) |
| 3205 | OK |
| 3210 | OK |
| 3212 | OK |
| 3214 | CONFLICT (.github/workflows/) |
| 3215 | OK |
| 3216 | OK |

### Diffs lidos 100%
- **PR3179:** +6/-1 linhas — search_path fix + rollback SQL
- **PR3205:** +3/-0 linhas — BOM strip + migration rename + sync log
- **PR3215:** +3/-0 linhas — rollback header comentário em migration

### CI verificado
- **PR3203 HEAD:** Gate Final FAILURE
- **PR3215 HEAD:** Gate Final FAILURE (run 42494915166, job 128776733083)
- **PR3201 (mergeada):** Gate Final SUCCESS (run 42494087701, job 128774330099)

---

## META Checklist

- [x] Typecheck em main: `npm run qa:typecheck` → EXIT:0
- [x] Lint baseline: OOM/timeout pré-existente documentado em `analise-prs/baseline/BASELINE-1d3dafae.md`
- [x] `analise-prs/baseline/BASELINE-1d3dafae.md` gerado
- [x] `analise-prs/regras-de-negocio.md` presente (sessões anteriores)
- [x] `analise-prs/prs.json` atualizado (57 entradas, incluindo PR3216)
- [x] `analise-prs/prs.csv` atualizado (57 linhas + header)
- [x] Dossiers para todas as 57 PRs (2940–3216)
- [x] Test-merges realizados para 16 PRs novas (3127–3216)
- [x] Diffs 100% lidos: PR3179, PR3205, PR3215
- [x] CI verificado: PR3203 (FAILURE), PR3215 (FAILURE), PR3201 (SUCCESS)
- [x] 3 merges pelo agente: PR3017, PR3020, PR3201 — evidência de CI documentada
- [x] 0 merges indevidos — todas as PRs restantes em DECISAO_HUMANA ou NAO_MERGEAVEL
- [x] Escrita no GitHub: apenas merges das PRs aprovadas (sessões anteriores)
