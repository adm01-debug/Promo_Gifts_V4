# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-28  
**Branch:** `fix/ci-workflows` (esta sessão)

---

## ✅ P0 — RESOLVIDO — Deploy Gates na main (Gate Final)

**Resolução:** Dois runs consecutivos com `conclusion: success` na main:
- Run [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) — SHA `8c81483` — **success** (fix Gate E40 + replay-safe migrations)
- Run [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) — SHA `c73cb9b` — **success** (fix Calendar RDP v10)

**Causa original:** Gate E40 (`local_only=1108; remote_only=647`) era BLOQUEANTE.  
**Fix:** Commit `8c81483` — migrations `20261027120000` e `20261027140000` tornadas replay-safe com guard `IF to_regclass('cron.job') IS NULL OR NOT EXISTS (...) THEN RAISE NOTICE + RETURN`.

---

## ✅ P4 — RESOLVIDO — Gate E40 Schema Drift (ledger dessincronizado)

**Workflow:** Deploy Gates (Gate Final)  
**Run com falha:** [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161)  
**Fix:** Commit `8c81483` na main — migrations corrigidas tornaram o Gate E40 verde.  
**Runs de validação:** `40667156516` e `40662579684` ambos com `conclusion: success`.

---

## P1 — CI - Replenishment Module Quality Gate (E2E autenticado)

**Workflow:** CI que inclui testes E2E autenticados do módulo de reposição  
**Run ID da última falha:** 40612760478  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478  
**Status:** failure

**Erro exato (dos logs do CI):**
```
e2e/helpers/auth.ts — Timeout 75000ms exceeded.
Error: Timed out 75s waiting for expect(locator).not.toHaveURL()
Expected pattern: not matching /login/
Received string: "http://localhost:8080/login"
```

**Causa raiz:** Helper de autenticação E2E aguarda redirect pós-login por 75s, mas a URL permanece em `/login`. O app não consegue autenticar porque os secrets de credenciais de teste não estão configurados no GitHub Actions.

**Secrets ausentes identificados nos logs:**
- `E2E_USER_EMAIL` — email de um usuário de teste válido no Supabase `doufsxqlfjyuvxuezpln`
- `E2E_USER_PASSWORD` — senha desse usuário
- `VITE_SUPABASE_URL` — URL do projeto Supabase (se não estiver como variable)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do Supabase (se não estiver como variable)

**Ação necessária do PO:**

Passo 1 — Abra a página de secrets:
```
https://github.com/adm01-debug/Promo_Gifts_V4/settings/secrets/actions
```

Passo 2 — Crie cada secret clicando em "New repository secret":

| Secret | Valor |
|---|---|
| `E2E_USER_EMAIL` | email de um usuário de teste ativo no projeto Supabase `doufsxqlfjyuvxuezpln` |
| `E2E_USER_PASSWORD` | senha desse usuário (deve conseguir fazer login em produção) |
| `VITE_SUPABASE_URL` | `https://doufsxqlfjyuvxuezpln.supabase.co` (se não existir como Actions Variable) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key do projeto `doufsxqlfjyuvxuezpln` |

Passo 3 — Verifique se o usuário de teste existe:
No Supabase Dashboard → Authentication → Users → filtre por email do usuário de teste. Se não existir, crie um usuário com email+senha.

Passo 4 — Re-run do workflow:
```
https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478
```
Clique em "Re-run all jobs".

**Impacto:** Testes E2E do módulo de reposição ficam 100% skipped (false-green) enquanto o auth falhar.

---

## P2 — E2E — Critical Flows & Error Boundaries (E2E autenticado + tooltip timing)

**Workflow:** E2E — Critical Flows & Error Boundaries  
**Run ID da última falha:** 40615510053  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615510053  
**Status:** failure

**Erros exatos (dos logs do CI):**
```
1. check-playwright-min-executed.mjs: apenas 1/10 testes executados; 90% skipped por requireAuth
2. e2e/flows/sidebar-tooltips.spec.ts:60:
   expect(tooltip).toBeVisible({ timeout: 2000 })
   → tooltip não aparece em 2s após hover
```

**Causa principal:** Mesma do P1. O `beforeEach` dos testes autenticados chama `loginAs(page, "user")` que falha por ausência dos secrets E2E, causando skip em cascata.

**Ação necessária do PO:**
- Passo 1: Resolver P1 primeiro (configurar os 4 secrets acima).
- Passo 2 — Re-run após P1 estar resolvido: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615510053
- Passo 3 — Se o tooltip ainda falhar: o timeout de 2s (`expect(tooltip).toBeVisible({ timeout: 2000 })`) pode ser insuficiente em Chromium CI. Abrir issue para aumentar para 3000ms em `e2e/flows/sidebar-tooltips.spec.ts:60`.

**Impacto:** 90% dos testes E2E críticos ficam skipped enquanto o auth falhar.

---

## ⚠️ P3 — PENDÊNCIA ATIVA RECORRENTE — Branch Protection Sentinel

**Workflow:** Branch Protection Sentinel  
**Run ID da falha original:** 40615509825  
**Run ID da falha recorrente:** [40728685711](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40728685711) — SHA `6b2cc72` (merge PR #2699)  
**Status:** ❌ RECORRENTE — falhou novamente em 2026-10-28

**Histórico:**
- ✅ SHA `e4a326e` (run 40680415509) — success
- ✅ SHA `2cee272b` (run 40702858343) — success (pós-merge PR com commit title correto)
- ❌ SHA `6b2cc72` (run 40728685711) — **failure** — squash merge PR #2699 sem `(#2699)` no commit title

**Causa raiz:** A ferramenta `github_merge_pull_request` do MCP GITHUB-FOREVER faz squash merge sem incluir automaticamente `(#NNN)` no commit title. O commit title resultante foi `docs: P11 com causa raiz exata + PENDENCIAS.md e RELATORIO_CI.md atualizados` — não termina em `(#2699)`, não corresponde a nenhum padrão aceito pelo sentinel.

**Erro exato do sentinel:**
```
1 commit(s) em push para main sem padrão aceito: 6b2cc72
Subject: "docs: P11 com causa raiz exata + PENDENCIAS.md e RELATORIO_CI.md atualizados"
Não termina em (#NNN), não é merge commit, não é bot oficial, não está na allowlist
```

**Correção sistêmica (para PR desta sessão e todos os futuros):** Sempre passar `commit_title` terminando em `(#NNN)` ao chamar `github_merge_pull_request`:
```json
{
  "commit_title": "docs: atualiza P3 recorrente e runs pós-merge (#XXXX)",
  "merge_method": "squash"
}
```

**Ação necessária do PO (opcional):** Considerar adicionar ao workflow do sentinel a verificação de `merge_commit_sha` no payload do push event para aceitar squash merges que vieram de PRs válidos, independente do formato do título. Ou configurar proteção de branch para exigir PRs com squash merge que use o título padrão do GitHub (`PR title (#NNN)`).

---

## P5 — CI Security & Drift Checks (fix aplicado e validado na main)

**Workflow:** CI Security & Drift Checks  
**Run ID da última falha:** 40615509752  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509752  
**Status:** fix aplicado e validado

**Causa raiz:** 5 testes unitários de Calendar falhavam por migração react-day-picker v8→v10 (commit `8b0b606`) sem atualização dos seletores DOM dos testes.

**Fix:** Commit `c73cb9b` na main — 3 arquivos de teste corrigidos. Validado no run [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684): Gate 2 Unit Tests ✅ success.

**Ação necessária do PO:** Verificar se o workflow passou no run `40662579684` ou nos próximos runs da main.

---

## P6 — E2E · undo (falhas pré-existentes no main)

**Workflow:** E2E · undo  
**Run ID da última falha:** 40667936090  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667936090  
**Status:** failure — pré-existente (3+ runs consecutivos falhando na main antes desta sessão)

**Erros exatos:**
```
1. [chromium-authed] › e2e/flows/04p-quotes-expiration-column.spec.ts:149
   Error: status presente em primeiro acesso
   expect(iStatus).toBeGreaterThanOrEqual(0) → recebeu -1
   (coluna "status" não encontrada na lista de IDs de colunas)

2. [chromium-authed] › e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:150
   Error: expect(count).toBe(0) → recebeu 1
   (click após 500ms ainda aciona onUndo — timing flake/regressão)
```

**Ação necessária do PO:**
- Investigar `04p-quotes-expiration-column.spec.ts`: verificar se coluna "status" foi removida ou reordenada na UI de orçamentos
- Investigar `04r-undo-toast-a11y-keyboard.spec.ts:150`: aumentar timeout do timer ou corrigir race condition no undo toast

---

## P7 — db-schema-drift-check (ledger divergente — requer reconciliação pelo PO)

**Workflow:** db-schema-drift-check  
**Run ID da última falha:** [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880)  
**SHA:** `2cee272b` (main HEAD em 2026-10-28 14:41)  
**Status:** ❌ failure — bloqueado por ledger divergente

**Erro exato (step "Ledger parity (repo x canonical)"):**
```
[migration-ledger][bloqueado] local_only=1108; remote_only=648; mismatched=0; malformed=0
```

**Causa raiz:** O ledger de migrations está massivamente dessincronizado entre o repositório e o banco de produção `doufsxqlfjyuvxuezpln`:
- **1108 migrations** existem no repo (`supabase/migrations/`) mas **não constam** no banco remoto (`supabase_migrations.schema_migrations`)
- **648 migrations** constam no banco remoto mas **não existem** no repo

Esta divergência é independente do fix de P4 (guard pg_cron nas migrations `20261027120000`/`20261027140000`). O fix de P4 corrigiu o replay do Gate E40 dentro do `deploy-gates.yml`, mas o `db-schema-drift-check` compara o ledger em si — e o ledger está dessincronizado por DDL fora do fluxo de migration (REGRA #8 corolário).

**Ação necessária do PO:**
1. Investigar a extensão da divergência: baixar artefato `schema-reconciliation-evidence` do run [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880/artifacts/12824214915) (arquivos `/tmp/migration-ledger.json` e `/tmp/migration-ledger-summary.json`)
2. Decidir estratégia de reconciliação: criar migrations espelho para o `remote_only=648` ou limpar o `local_only=1108` do ledger
3. Após reconciliação: disparar `schema-snapshot-export.yml` com `force_rotate: true` para girar o baseline
4. Reconfirmar com `workflow_dispatch` em `db-schema-drift-check`

**Nota:** Per REGRA #8 corolário e E056, Claude **não pode** executar DDL ou `migration repair` em sessão de agente para reconciliar o ledger. Requer ação do PO.

---

## P8 — edge-functions-drift-check (drift entre GitHub e canônico)

**Workflow:** edge-functions-drift-check  
**Run ID da última falha:** 40663094555  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40663094555  
**Status:** failure

**Erro exato:**
```
##[error]Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
```

**Causa raiz:** Uma ou mais edge functions no Supabase `doufsxqlfjyuvxuezpln` divergem do código em `supabase/functions/` no GitHub (deploy direto fora do workflow, conforme REGRA #8 corolário).

**Ação necessária do PO:**
- Verificar artefato `drift-report.csv` no run 40663094555 para identificar quais funções divergem
- Para drift de conteúdo: `supabase functions download <slug>` + commit + PR
- Para orphan no canônico: deletar via dashboard + registrar no repo
- Após reconciliar: disparar `deploy-edge-functions.yml` via `workflow_dispatch`

---

## P9 — E2E — Personalization Flow (secrets E2E ausentes)

**Workflow:** E2E — Personalization Flow  
**Run ID da última falha:** 40662579633  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579633  
**Status:** failure

**Causa raiz:** Mesma de P1. Testes E2E autenticados falham por ausência dos secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.

**Ação necessária:** Resolver P1 (configurar secrets E2E) → este workflow passará.

---

## P10 — E2E • Swatch QuickView (secrets E2E + dados de produto ausentes)

**Workflow:** E2E • Swatch QuickView (Lista + Tabela)  
**Run ID da última falha:** 40662579393  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579393  
**Status:** failure

**Erros exatos:**
```
firefox: check-playwright-min-executed → min. de testes não atingido (auth falhou)
webkit: expect(picker).not.toBeNull()
        "nenhum produto com color_swatches V2 em ${route.path}"
        at e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts:103
```

**Causa raiz (dois problemas):**
1. Firefox/chromium: autenticação E2E falhou — mesma causa P1 (secrets ausentes)
2. Webkit: picker V2 retorna null — produtos com `color_swatches V2` podem não existir em produção ou seletor mudou

**Ação necessária do PO:**
- Resolver P1 primeiro (secrets E2E)
- Investigar webkit: verificar se existem produtos com `color_swatches` V2 em produção e se o seletor está correto

---

## P11 — Edge Integration Tests — All Functions (11 testes falhando)

**Workflow:** Edge Integration Tests — All Functions  
**Run ID da última falha:** 40638774637  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40638774637  
**Status:** failure

**Resultado:** 3 arquivos falharam | 11 testes failed | 884 passed | 2 skipped (897 total)

**Causa raiz (determinada — 3 edge functions com bugs de código):**

1. **`generate-mockup`** — hang em input inválido por falta de try/catch no `JSON.parse` do body. Quando body não é JSON válido, a exception não é capturada e o worker trava até o timeout de 30s do runner Deno.

2. **`verify-2fa-token`** — mesma causa: `JSON.parse(await req.text())` sem try/catch. Token inválido ou body malformado → hang → timeout 30s.

3. **`validate-access`** — retorna HTTP 200 para qualquer input, incluindo token inválido/expirado/ausente. Deveria retornar 401/403 para input inválido, mas a validação do token não está implementada corretamente — todo request cai no bloco `return new Response(JSON.stringify({ valid: true }), ...)` sem validar o token.

**Fixável por código — não depende de PO.** Requer nova branch + PR com:
- Try/catch em `generate-mockup` e `verify-2fa-token` retornando HTTP 400 em JSON inválido
- Fix de validação em `validate-access` retornando 401/403 para tokens inválidos
- Deploy via `deploy-edge-functions.yml` (workflow_dispatch)

**Ação necessária do PO:** Aprovar o PR quando aberto.

---

## P12 — Kit Coverage — Integration (cobertura insuficiente na view)

**Workflow:** Kit Coverage — Integration  
**Run ID da última falha:** 40868366077 (SHA `353d99d318ec304a85d7eecd55e63b62debfb95b`)
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40868366077
**Status:** failure — autenticação e consultas passaram; a cobertura dos dados reais continua abaixo do mínimo.

**Resultado observado:** autenticação e as duas consultas ao Supabase passaram. A terceira asserção falhou com `Cobertura 56% < threshold 70%` para o kit descoberto dinamicamente.

**Causa confirmada para a permissão:** nenhuma migration de GRANT faltava. Consulta somente leitura a `pg_catalog`/`has_table_privilege` confirmou SELECT para `authenticated` e `service_role`, e ausência para `anon`, tanto em `public.v_kit_component_complete` quanto em `public.product_kit_components`. O teste usava o cliente sem sessão autenticada. A correção de código autentica o usuário E2E e não abre acesso anônimo.

**Gate C25:** corrigido no commit `353d99d31`; a exceção vale somente para o workflow, job autenticado e comando de integração específicos. Os 23 testes do contrato passaram localmente. O run [Deploy Gates #40868363085](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40868363085) terminou com `conclusion: success`, incluindo lint/typecheck, testes unitários, E2E Smoke e build.

**Gap restante — contrato/qualidade da view e fixture:**
- A definição canônica consultada em `pg_get_viewdef` não projeta `component_description`, `primary_image_url`, `images` e `supplier_component_code`, campos que o teste inclui na métrica. A entrada `v_kit_component_complete` em `src/integrations/supabase/types.ts` também omite esses quatro campos, portanto os tipos locais refletem a view remota; o gap está entre o contrato do teste (view como superset da tabela base) e a projeção real.
- Recontagem somente leitura no Supabase canônico, usando a mesma lista de 15 campos e o mesmo arredondamento do teste: 5 de 978 kits ativos com componentes atingem 70% na tabela base; a média por kit é 52,7%. A seleção dinâmica sem ordenação escolhe um kit qualquer, por isso a falha não é reprodutível. A consulta do run reportou 56% para o kit selecionado.
- A definição de `v_kit_component_complete` não foi encontrada nas migrations versionadas fora de arquivos de backup/ledger; sua origem e o contrato pretendido ainda precisam ser reconciliados antes de propor DDL. Não alterar a view nem mascarar a divergência ajustando o threshold.
- O teste não deve reduzir o threshold nem conceder SELECT a `anon` para mascarar o problema.

**Estado do PR #2701:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701 — draft e não mergeável; branch divergente/conflitante com `main`. Commit `353d99d318ec304a85d7eecd55e63b62debfb95b` está no branch remoto. O dispatch mais recente de integração falhou somente na cobertura de dados descrita acima.

**Próximo passo:** revisar e aprovar o contrato esperado da view e definir fixture estável que atenda à métrica. Se for aprovada uma mudança de schema, versionar uma migration não destrutiva, validar pelo fluxo obrigatório E15 e atualizar os tipos; não aplicar DDL diretamente via MCP/dashboard. Nenhum GRANT a `anon`, DDL, migration ou dado operacional foi alterado nesta correção.

---

## P13 — Vercel deployment failure (projeto fantasma)

**Status:** failure em commits desta branch

**Erro:**
```
Vercel: Deployment has failed
description: "Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_B5Yf4S5kEH9wNh4aASkq6M56psbW --logs"
```

**Causa raiz provável:** Projeto fantasma `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) criado em 2026-09-15 — incidente documentado na REGRA #11 do CLAUDE.md.

**Ação necessária do PO:**
- Verificar se o projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` ainda existe em https://vercel.com/juca1 e deletá-lo
- Confirmar que `.vercel/project.json` contém `"projectId": "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"` (projeto canônico)

---

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8, P11 requerem investigação independente. P12 requer migration autorizada. P13 requer deleção do projeto fantasma Vercel.*
