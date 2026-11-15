# Baseline — Sessão 012WyySbh2tj8vhRQLBf3mHo

**Data:** 2026-10-28
**Branch de entrega:** `claude/quirky-keller-owezvt`

## SHA do main

| Marco | SHA |
|---|---|
| Entrada na sessão | `df18546dfd76d1bea7ea5873257b668d128d8df3` |
| Pós-merge #2662 | `efacff0bef81c7d175aef629ab338634b6c4ffb2` |
| Pós-merge #2664 | `bd783873aa273a6da6f3351e8d1f670baaf950d2` |
| Pós-merge #2665 | `04239fdd42eef05589fb41b3f0e58a664621fbf7` |
| Pós-merge #2673 (owner) | `62af07988ee7a33ab680e2cbf87c70617eb0a6fb` |
| Main HEAD no fim da sessão | `62af07988ee7a33ab680e2cbf87c70617eb0a6fb` |

## Gate Final — CI

| Run | SHA | Resultado |
|---|---|---|
| 40615509956 | `04239fdd` | ✅ success (main pós-merge #2665) |

## Vitest — Falhas Pré-existentes

Total: **17 falhas em 4 arquivos de teste** — TODAS pré-existentes ao início desta sessão, não introduzidas por nenhum merge.

| Arquivo | Falhas | Teste(s) que falham |
|---|---|---|
| `PopoverQtyInput.test.tsx` | 1 | "permite digitar 80 e faz commit no Enter — Total pode recalcular" |
| `MockupProductSelector.test.tsx` | 1 | "em viewport estreito fatia as linhas em 2 colunas (sem sub-linha sobreposta)" |
| `CartStatusSelect.emptyCart.test.tsx` | 1 | "bypass do disabled (keyboard nav / Radix interno): guard interno dispara toast SSOT e não chama onChange" |
| `CloudStatusBanner.test.tsx` | 6 | "EXIBE 'down'", "EXIBE 'degraded'", "EXIBE tudo para usuários dev", "respeita o gate de infra", "abre painel de debug", "abre timeline histórica" |

> **Nota:** Adicionalmente existem ~9 falhas de timeout/OOM em arquivos de testes pesados que não rodam localmente. As 17 acima são as falhas de assertion confirmadas. Gate 2 (`npm run test:deploy-gate`, 334 testes) passa sem falhas.

## Produção Supabase

- Projeto: `doufsxqlfjyuvxuezpln`
- Erros postgres em 24h: **0** (verificado em 2026-10-28T01:37:00Z)
- SSOT confirmado: `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` em `src/integrations/supabase/client.ts`

## PRs Analisadas — 22 total

| PR | Veredito |
|---|---|
| #2580 | DECISAO_HUMANA |
| #2600 | DRAFT_NOMERGE |
| #2631 | DECISAO_HUMANA |
| #2646 | DECISAO_HUMANA |
| #2662 | MERGEADO_AUTONOMO (SHA `efacff0b`) |
| #2663 | DECISAO_HUMANA |
| #2664 | MERGEADO_AUTONOMO (SHA `bd783873`) |
| #2665 | MERGEADO_AUTONOMO (SHA `04239fdd`) |
| #2666 | FECHAR |
| #2667 | CI_FALHOU |
| #2668 | DRAFT_NOMERGE |
| #2670 | FECHADO_OWNER |
| #2671 | FECHADO_OWNER |
| #2672 | FECHADO_OWNER |
| #2673 | MERGEADO_OWNER (SHA `62af0798`) |
| #2674 | DRAFT_NOMERGE |
| #2675 | ENTREGA_SESSAO |
| #2676 | DRAFT_NOMERGE |
| #2677 | FECHADO_OWNER |
| #2678 | FECHADO_OWNER |
| #2679 | DRAFT_NOMERGE |
| #2680 | DRAFT_NOMERGE |
