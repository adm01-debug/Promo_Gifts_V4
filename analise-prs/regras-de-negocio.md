# Regras de Negocio — Classificacao de PRs

**Sessao:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Data:** 2026-11-09  
**Main SHA:** 0818809dae41c295b046dc52f85078e4f06b3df4

---

## Criterios de Veredito

### MERGEADA_AGENTE
PR mergeada por este agente nesta sessao. Criterios para merge:
1. Gate Final = SUCCESS no head SHA (via github_list_check_runs)
2. Sem conflito com main (mergeable: true, mergeable_state != conflicting)
3. Sem DDL/migrations (REGRA E056 proibe execute_sql DDL em sessao de agente)
4. Sem .github/workflows/ (mandato proibe tocar workflows)
5. Sem DRAFT
6. Nao e branch de outro agente (REGRA #10: codex/*, dependabot/*, cline/*, devin/*)
7. Nao e PR #2674 (branch de entrega desta sessao — NUNCA MERGEAR)

### MERGEADA_EXTERNA
PR ja mergeada por outro agente/pessoa antes ou durante esta analise.

### FECHADA_EXTERNA
PR fechada (sem merge) por outro agente/pessoa.

### NAO_MERGEAR
PR com impedimento tecnico insuperavel:
- Gate Final = FAILURE no head SHA (confirmado via github_list_check_runs)
- Branch de outro agente com Gate Final=FAILURE (REGRA #10 proibe push para consertar)

### AGUARDA_CI
PR tecnicamente em avaliacao:
- Gate Final ainda rodando ou nao iniciado
- action_required (Supabase Preview approval pendente)

### AGUARDA_PO
PR que exige decisao humana antes do merge:
- Contem .github/workflows/ (mandato: 'Nao tocar .github/workflows')
- Contem supabase/migrations/ com DDL (REGRA E056 + mandato: exige teste em Postgres temporario)
- Major version bumps com E2E=FAILURE (AGUARDA avaliacao de breaking changes pelo PO)
- DRAFT

---

## Regras Especificas

### REGRA E056 (IMUTAVEL)
execute_sql com DDL (CREATE, ALTER, DROP, GRANT, REVOKE, CREATE POLICY, etc.) e
proibido em sessao de agente Claude. PRs com migrations DDL so podem ser mergeadas
apos aprovacao do PO e teste em Postgres temporario.

### REGRA #1 (IMUTAVEL)
Projeto canonico de producao = doufsxqlfjyuvxuezpln.
Nunca alterar SSOT. Verificado via execute_sql READ-ONLY.

### REGRA #10
Nao commitar/pushar em branches criadas por outras sessoes de agente.
Branches de outros agentes (codex/*, dependabot/*, cline/*, devin/*) sao somente leitura.

### E14 (docs-only exception)
PRs que tocam apenas docs/** sao ignoradas pelo Gate Final (paths-ignore: docs/**).
Merge elegivel se docs-only e sem conflito.

---

## Classificacao dos 35 PRs Abertas (2026-11-09)

| Categoria | Count | PRs |
|---|---|---|
| NAO_MERGEAR | 5 | #3203, #3329, #3330, #3332, #3339 |
| AGUARDA_CI | 2 | #3210, #3350 |
| AGUARDA_PO — workflows | 10 | #3127, #3129, #3137, #3179, #3228, #3247, #3274, #3290, #3327, #3328 |
| AGUARDA_PO — DDL/migrations | 14 | #3214, #3243, #3250, #3251, #3255, #3256, #3257, #3261, #3263, #3264, #3265, #3273, #3279, #3284 |
| AGUARDA_PO — major bumps | 3 | #3331, #3333, #3334 |
| TOTAL OPEN | 34* | |

*#3350 foi reclassificado de DRAFT para AGUARDA_CI apos inspecao.

---

## Supabase Producao — Verificacao

- Projeto: doufsxqlfjyuvxuezpln (REGRA #1 — SSOT)
- Verificado via execute_sql (READ): SELECT COUNT(*) FROM products = 8321
- Verificado em: 2026-11-09T23:00:00Z
- Status: HEALTHY
- Verificado via list_migrations: pendente (ver progresso.json)
