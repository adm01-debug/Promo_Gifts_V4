# Regras de Negocio — Criterios de Merge

**Repo:** adm01-debug/Promo_Gifts_V4
**Sessao:** session_01VXkRxWq5ZUCmvuNx5e2TGX
**Data:** 2026-11-09
**Main SHA base:** b4c1167c7ce91e664d23fddc43570d0a61efd048

---

## REGRAS DE MERGE (mandato nao-negociavel)

### 1. Criterio gate: Gate Final - Deploy Ready
- Unico check required em main (`.github/workflows/deploy-gates.yml`)
- Merge so autorizado com Gate Final = SUCCESS
- Gate Final so dispara em pull_request, nao em push para main

### 2. PROIBIDO (mandato absoluto)
- Push direto em main, force-push
- Fechar/editar/comentar PR, labels, deletar branch
- Mudar configuracoes ou burlar branch protection
- Tocar `.github/workflows/` (qualquer PR = AGUARDA_PO)

### 3. AGUARDA_PO — DDL/Migrations (REGRA E056)
Qualquer PR com DDL exige aprovacao explicita do PO

### 4. AGUARDA_PO — Major version bumps
date-fns 3->4, framer-motion 11->14, Sentry 8->11 — exigem analise de breaking changes

### 5. NAO_MERGEAR — Branches de outros agentes (REGRA #10)
codex/*, dependabot/* com Gate Final falho — NAO_MERGEAR

### 6. SSOT Supabase (REGRA #1)
Projeto canonico: doufsxqlfjyuvxuezpln — execute_sql READ only (REGRA E056)

### 7. Docs-only PRs (excecao E14)
PRs apenas docs/** elegíveis sem Gate Final

### 8. Verificacao pos-merge
Apos merge: SELECT count(*) FROM products em doufsxqlfjyuvxuezpln

---

## RESULTADO DESTA SESSAO

| Veredito | Count | PRs |
|---|---|---|
| MERGEADA_AGENTE | 3 | #3337, #3340, #3343 |
| MERGEADA_EXTERNA | 5 | #3341, #3342, #3344, #3346, #3348 |
| NAO_MERGEAR | 5 | #3203, #3277, #3332, #3339, #3347 |
| AGUARDA_CI | 3 | #3210, #3278, #3345 |
| AGUARDA_PO | 29 | ver RELATORIO_PRS.md |
| **TOTAL OPEN** | **37** | - |

_Escrito em sessao session_01VXkRxWq5ZUCmvuNx5e2TGX (2026-11-09)_
