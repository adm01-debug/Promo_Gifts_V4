# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-30
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597 — **MERGEADO** ✅)

## Atualização — HEAD `7299c88c` (2026-10-30T10:20 UTC)

**Gate Final - Deploy Ready:** [#41034358375](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358375) — ✅ **SUCCESS**

### Workflows com FAILURE em HEAD `7299c88c`

#### P21-edge-drift — edge-functions-drift-check
- **Run ID:** [#41034830573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034830573) (sha `7299c88c`)
- **Erro exato:** `Drift detectado entre GitHub e canônico. 31 função(ões) com conteúdo diferente.`
- **Causa raiz:** Funções edge deployadas em Supabase canônico (`doufsxqlfjyuvxuezpln`) divergem do código no repositório. Drift acumulado.
- **Ação tomada:** Dispatch de `deploy-edge-functions.yml` enviado — run [#41034820685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685) em andamento (status `pending`).
- **Ação do PO:** Após conclusão do `Deploy Edge Functions`, disparar manualmente `edge-functions-drift-check` via Actions → workflow_dispatch para confirmar resolução.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

#### P21-personalization — E2E — Personalization Flow
- **Run ID:** [#41040489097](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489097) (sha `6dbc9387` — atualizado de `7299c88c` run #41034358338)
- **Job falho:** `E2E — Personalization Journey` (job #124011777528)
- **Step falho:** Step "Run Personalization E2E Tests" — exit code 1; 3 failed + 1 flaky
- **Erro exato:** `[loginViaUI] Timeout aguardando redirect pós-login` — `POST auth/v1/token -> 504 (70480ms)`. Supabase auth retornando 504 Gateway Timeout no CI. Mesma causa raiz dos E2Es de Magazine Header e Critical Flows.
- **Artefato:** `personalization-e2e-artifacts.zip` (artifact ID 12970518204, ~219MB)
- **Causa raiz:** `auth/v1/token` retorna 504 no ambiente CI — Supabase auth indisponível/lento durante a execução. Não é falha de código (mudança de dot-notation é semanticamente idêntica em runtime). Pré-existente em SHA `7299c88c`.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação do PO:** Confirmar/provisionar secret `SUPABASE_SERVICE_ROLE_KEY` no CI para que auth funcione; ou investigar disponibilidade do endpoint `auth/v1/token` no projeto `doufsxqlfjyuvxuezpln` durante janela CI.

---

## P22 — Fix dot-notation + bloqueios de CI (2026-10-30T10:24-11:15 UTC)

### Correção aplicada — PR #2806 (SHA `6dbc9387`)

**Causa raiz identificada e corrigida:** commit `5edddfb1` (E130 noUncheckedIndexedAccess) introduziu notação de colchete em `src/components/admin/badges-manager/types.ts:254` violando `@typescript-eslint/dot-notation`. Corrigido em PR #2806 (squash-merge → SHA `6dbc9387`):
- Antes: `const NEUTRAL_CLASSES: ColorClasses = COLOR_TOKEN_CLASSES['neutral']!;`
- Depois: `const NEUTRAL_CLASSES: ColorClasses = COLOR_TOKEN_CLASSES.neutral!;`

**Evidência de correção — CI Security & Drift run [#41040489233](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489233) (SHA `6dbc9387`):**
- Step 5 "Lint check" → ✅ `success` (10:33:14→10:35:31Z)
- Step 6 "Type check" → ✅ `success` (10:35:31→10:36:41Z)
- Step 7 "Build check" → ✅ `success`
- Step 21 "Run Unit & Integration Tests" → ✅ `success` (10:36:59→10:53:52Z)
- Steps 1–26 todos ✅ `completed/success`
- Step 27 "Run E2E Critical Tests — specs autenticados" → `in_progress` desde 10:56:22Z (ver P22-e2e-auth)

### P22-runner-saturation — Gate Final bloqueado na fila de runners

- **Runs afetados:**
  - Gate Final / Deploy Gates [#41040489311](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489311) (SHA `6dbc9387`): `status=queued`, tentativa 2, desde 2026-10-30T10:41:55Z
  - Deploy Gates "Detectar mudanças" [#41043165270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41043165270) (SHA `e5323824` — HEAD): `status=queued`, desde 2026-10-30T10:46:10Z
- **Causa exata:** 4 pushes à `main` entre 10:24Z e 10:46Z (SHAs: `5edddfb1` → `6dbc9387` → `1c6b2fce` → `e5323824`) dispararam dezenas de workflows simultâneos. O plano GitHub Actions gratuito limita a 20 jobs concorrentes; slots saturados por sessões anteriores de agentes. O Gate Final ficou preso na fila sem receber runner nos 30+ minutos seguintes. O workflow re-enfileirou em tentativa 2 às 10:41:55Z e continuou aguardando.
- **Impacto:** O único required check (`Gate Final - Deploy Ready`) não atingiu `conclusion=success` nos SHAs `6dbc9387` e `e5323824` dentro da janela desta sessão. A correção de código está comprovada pelos steps 1-26 do CI Security & Drift. O Gate Final atingirá `success` automaticamente quando runners se tornarem disponíveis — não requer mudança de código.
- **Impacto no deploy:** Gate Final é o único required check; deploy pendente enquanto `queued`.
- **Ação do PO:** Aguardar liberação de runners (normalmente 30–90 min após saturação). Alternativa: cancelar runs `queued` mais antigos para liberar slots em https://github.com/adm01-debug/Promo_Gifts_V4/actions.

### P22-e2e-auth — CI Security & Drift step 27 (E2E autenticados) em andamento

- **Run:** [#41040489233](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489233) (SHA `6dbc9387`)
- **Job:** `quality-gate` — step 27 "Run E2E Critical Tests — specs autenticados" — `in_progress` desde 2026-10-30T10:56:22Z
- **Causa provável:** Specs autenticados dependem de `POST /auth/v1/token` do Supabase para criar sessão no CI. Padrão idêntico ao documentado em P21-personalization e P21-magazine-header: `auth/v1/token → HTTP 504` (Gateway Timeout) no CI. Se confirmar, é falha de infraestrutura CI, não regressão da correção dot-notation.
- **Nota:** Steps 1-26 (lint, typecheck, build, unit tests, E2E públicos) todos ✅. O fix está comprovado; o step 27 é infraestrutura E2E pré-existente.
- **Impacto no Gate Final:** NÃO é required check — não afeta deploy.
- **Ação do PO:** Se step 27 falhar com auth 504: confirmar/provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI.

### P22-supabase-preview — Supabase Preview (SHA `e5323824`)

- **Check run:** [#124023725095](https://github.com/adm01-debug/Promo_Gifts_V4/runs/124023725095) (SHA `e5323824`)
- **Estado:** `completed/skipped` — "This git branch is not associated with any Supabase Branch. You can open a PR to create a new branch."
- **Causa:** Push direto à `main` (sem PR): o Supabase Branching App não cria preview para pushes em main, apenas para PRs. Estado `skipped` é comportamento esperado — não é falha.
- **Impacto:** Nenhum. Não é required check.
