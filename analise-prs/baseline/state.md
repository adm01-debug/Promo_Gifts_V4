# Baseline — Sessão session_01VXkRxWq5ZUCmvuNx5e2TGX (continuação desta sessão)
**Atualizado em:** 2026-11-09T12:30:00Z
**main HEAD:** `5a3f679e7b32c652696d955a7c90f867db79abe7` (PR #3340 mergeada — docs catálogo Supabase)
**Commit anterior (pré-sessão):** `c113300c034fb39126274fba9aa10ef05762ab13`

## Gate Final — estado atual
- **Run #42609551247** — SHA `5a3f679e7` — conclusion=**FAILURE** ❌ (2026-11-09T11:34:38Z)
- **Job falhando:** "Gate 1 - Lint + TypeScript" (job #129134477785)
- **Step falhando:** "Gate 1.9 — Dívida técnica (ratchets TODO / as / file-size / eslint-disable)" (step 14)
- **Todos os outros gates:** SUCCESS (Gate 0, 0.5, 2, 2.5, 3, 5, 5.5, E23, E40)
- **Gate 6 (Build):** SKIPPED (docs-only E14 — não há mudança de código-fonte)

## Diagnóstico
**Gate 1.9 é bloqueio PRÉ-EXISTENTE em main** — ratchets de dívida técnica (TODO/FIXME/`as any`/file-size/eslint-disable) excedidos no código-fonte existente, não relacionado aos nossos merges docs-only (#3337, #3340). Documentado em `progresso.json.bloqueio_geral`.

Evidência de não-causalidade: PRs #3337 e #3340 eram docs-only (mudaram apenas `analise-prs/` e `docs/supabase/catalog/`) — não podem ter aumentado contagens de ratchet em código-fonte TypeScript.

**Implicação:** Merges de PRs docs-only com bypass E14 continuam seguros (Gate 1 é skipped nesses casos). Merges de PRs com código continuam bloqueados pelo Gate 1.9 até que o código-fonte seja corrigido.

## Histórico de merges desta sessão
| PR | SHA de merge | Tipo | Gate Final na PR | Supabase |
|---|---|---|---|---|
| #3337 | `6933eb6122d2ccf333d533d4441891b8d918479b` | docs-only E14 | SUCCESS ✅ | ZERO impacto |
| #3340 | `5a3f679e7b32c652696d955a7c90f867db79abe7` | docs-only E14 | SUCCESS ✅ | ZERO impacto |

## Worktrees
Nenhum worktree de teste criado nesta sessão. Operações somente-leitura via GitHub MCP.
