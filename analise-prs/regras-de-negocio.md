# Regras de Negócio — Decisão de Merge de PRs

> Gerado em: 2026-10-30 | Sessão: session_01RfQzo8Ean3zudG2sEN79b6

## Bloqueios Automáticos (DECISAO_HUMANA obrigatória)

### REGRA #8 — Arquivos protegidos
PRs que tocam qualquer dos seguintes caminhos requerem aprovação explícita do PO:
- `.github/workflows/` — qualquer workflow CI/CD
- `supabase/migrations/` — qualquer migration de banco
- Secrets/variáveis de ambiente de produção
- DDL via `execute_sql` (proibido completamente via E056)
- Deploy de edge function via MCP (proibido — apenas via workflow_dispatch)

### REGRA #10 — Cross-agent merge
PRs em branches `codex/*`, `devin/*`, ou de qualquer outro agente diferente do agente atual só podem ser mescladas com aprovação do PO. Evidência: CLAUDE.md §REGRA #10 (E189).

### DRAFT explícito
PRs em estado Draft não são elegíveis para merge automático, independentemente do Gate Final.

### Body com instrução de não mesclar
Se o body da PR contiver frases como:
- "NÃO MESCLAR"
- "Não mesclar"
- "sem merge automático"
- "aguardando aprovação"
- "não deve ser mesclado"

A PR vai para DECISAO_HUMANA independente do resultado do Gate Final.

## Critérios de CI

### CI_FALHOU
PR com Gate Final `conclusion: "failure"` em qualquer run. A PR permanece bloqueada até que o CI seja corrigido na branch.

### AGUARDANDO
PR com Gate Final verde mas branch desatualizada em relação a main (`mergeable_state: "behind"`) ou Gate ainda em execução. Pode ser resolvido com `update_pr_branch` + novo Gate Final verde.

## Critérios de Negócio para Merge Automático

Para ser elegível para merge automático, uma PR deve satisfazer **todas** as condições:

1. Gate Final `conclusion: "success"` no último run
2. Branch `claude/*` criada por agente autorizado desta sessão
3. Sem arquivos protegidos (REGRA #8)
4. Body não contém instrução de não mesclar
5. Estado `open` (não `draft`)
6. Branch não está em conflito (`mergeable_state != "dirty"`)
7. As 4 perguntas obrigatórias devem ser respondidas afirmativamente:
   - A PR ainda é válida? (não duplicada, não obsoleta)
   - Não introduz regressão? (Gate verde + revisão do diff)
   - Não está já em main? (confirmado via `merge_commit_sha` ou `list_commits`)
   - A regra de negócio está correta? (título/body coerentes com o diff)

## Hierarquia de Veredictos

```
DECISAO_HUMANA > CI_FALHOU > AGUARDANDO > DRAFT > JÁ_MESCLADA > SESSION_DELIVERY > ELEGÍVEL
```

Uma PR classificada em categoria superior nunca avança para inferior mesmo que satisfaça os critérios inferiores.

## Método de Merge

Squash-merge via `mcp__GITHUB_-_MCP_-_FOREVER__github_merge_pull_request` com `merge_method: "squash"`. Nunca merge commit, nunca rebase. Nunca via CLI local ou `git push` direto.

## PRs da Sessão 2026-10-30 — Diagnóstico por Veredicto

| Veredicto | PRs | Motivo principal |
|---|---|---|
| JÁ_MESCLADA | #2813, #2840 | Mescladas por outras sessões durante a análise |
| CI_FALHOU | #2739, #2810, #2822, #2825 | Gate Final failure |
| DECISAO_HUMANA | #2701, #2731, #2744, #2758, #2821, #2823, #2827, #2836, #2839 | REGRA #8 ou #10 ou body bloqueante |
| AGUARDANDO | #2824 | Branch behind main |
| DRAFT | #2834 | Estado Draft |
| SESSION_DELIVERY | #2831 | Branch desta sessão de análise |
