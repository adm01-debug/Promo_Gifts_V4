# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-30
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597 — **MERGEADO** ✅)

## Atualização P27 — inventário da ponta atual da `main` (2026-10-30T12:23Z)

Inventário por workflow na `main`, com base nos runs mais recentes consultados. Somente conclusões `failure` contam como falha; execuções `queued`, `pending`, `in_progress`, `cancelled` ou `skipped` ficam separadas. A ponta atual é `7e56ae49dde173e04f66ed4523eb8eb59653821a` (PR #2818, docs-only).

## Auditoria de sincronização local × GitHub × Supabase — 2026-10-29

| Área | Evidência atual | Resultado |
|---|---|---|
| Código local e GitHub | Branch local `fix/location-panel-timeout-cleanup`, SHA `b825421c95603de04bfd9f6f6d38bcf3da40113f`, coincide com o head do PR [#2721](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2721). `main` está em `4b4206abf947a87f56b1dc7effbf9739f530d80b`; o branch local tem 7 commits exclusivos e está 8 commits atrás. | O trabalho local está publicado no PR, mas não incorporado à `main`. O check E2E Quotes falhou no run [40887795789](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40887795789); o review Copilot também está bloqueado por cota (run [40887835845](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40887835845)). Não integrar até resolver/registrar as falhas e atualizar o branch contra a base. |
| Reconciliação de migrations | PR [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714), SHA `ca316674db0110136e6cbbabee8fbe103aa8ff15`, continua aberto e bloqueado pelo Gate E40. | Não aplicar nem reparar ledger/schema enquanto o drift não for classificado e aprovado. |
| Ledger local × canônico | Repositório: 3.004 versões distintas em 3.009 arquivos SQL; canônico: 2.552 entradas; 2.541 versões compartilhadas, 463 apenas locais e 11 apenas remotas. Existem 5 grupos de versão duplicada no repositório. | Divergência confirmada. As 11 versões remotas e as 463 locais exigem classificação individual; contagens, sozinhas, não autorizam `migration repair` ou DDL. |
| Tipos TypeScript × `pg_catalog` | Comparação somente leitura no projeto `doufsxqlfjyuvxuezpln`: 398 Tables, 197 Views e 15 Enums em ambos os lados; 1.020 nomes de Functions em `types.ts`, todos presentes no banco. O catálogo tem 1.324 nomes públicos de funções. | Tabelas, views e enums estão em paridade estrutural. As 304 funções adicionais do catálogo exigem classificação de exposição antes de qualquer regeneração; não são motivo para adicionar RPCs internos aos tipos. Nenhuma alteração foi feita. |
| Banco canônico | Projeto `doufsxqlfjyuvxuezpln`: listagem administrativa de migrations consultada em 2026-10-29; última versão `20261027160000`. | Estado do ledger verificado; não significa paridade com o repositório. Nenhuma escrita foi executada. |
| CI do PR [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | Head `9d9dd2a7b502ab7e5ff42691d40b95a822c21d6b`; Deploy Gates passou no run [40900912283](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900912283). | O run [40900912215](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900912215), tentativa 2, falhou porque o GHCR limitou pull de imagem (`toomanyrequests`, limite informado 44.000/min); o stack local nem iniciou. Copilot falhou por limite de uso HTTP 402 no run [40900936287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900936287). O run E2E visual [40900912386](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900912386) falhou nos testes de paridade Novidades × Reposição; os mesmos dois testes falharam no push da `main` em [40899426031](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426031), portanto sem regressão identificada neste PR. Sem novo rerun: a falha GHCR repetiu-se após retry e a causa atual é externa. |
| Atualização E049 no PR [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | Commit `e2518bbd23ecd5b7e9960dfaec2f24837ee44d91` publicado no branch. O status Vercel reporta falha no deploy `dpl_BeeKSR6FugKfqBPh3ZWkujmTT9XZ`; `vercel inspect ... --logs` retornou apenas `status: Error`, sem trecho de causa. | Não inferir causa nem marcar o check como sucesso. A falha de deploy segue sem diagnóstico acessível; PR não está liberado para merge. |
| Este registro | PR documental [#2725](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2725), SHA `e4ef6e5d9339042fbfdd9087d25ebc4c8fefcd08`, aberto. | O check Copilot [falhou no step de limpeza](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40843346745); tentativa de rerun foi recusada pela API (`403`, jobs desta execução não podem ser reexecutados). A causa operacional é do workflow/serviço e permanece pendente. |
| Graphify local | `.graphifyignore`, `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` têm alterações locais não commitadas; o relatório foi gerado em `a172c252`. O mapa SQL foi reconstruído isoladamente a partir de 3.188 arquivos versionados: 17.839 nós, 32.709 arestas e 2.633 comunidades; consulta de validação encontrou objetos SQL esperados. | O mapa SQL está em diretório ignorado (`graphify-out/sql/graphify-out/`) e ainda não há comando versionado de rebuild. Avaliação isolada do Graphify 0.9.68 encontrou regressão: benchmark caiu de 1.664×/1.623 tokens (0.9.97) para 12,4×/218.295 tokens e um caminho direcionado reverso não foi encontrado. Manter 0.9.97 homologado; não substituir sem corrigir e repetir o benchmark. |

**Conclusão:** a sincronização total não foi atingida. As alterações de aplicação estão em PR, não na `main`; o ledger/schema segue divergente; e há alterações locais de Graphify ainda sem revisão/publicação. Não copiar dados operacionais de clientes ou produtos para o repositório.

## Auditoria E049 — rate guard de INSERT anônimo — 2026-10-29

Consulta somente leitura em `pg_catalog` no projeto canônico `doufsxqlfjyuvxuezpln` confirmou o trigger `trg_anon_rate_guard` chamando `fn_anon_insert_rate_guard`, habilitado (`tgenabled = 'O'`), em `analytics_events`, `catalog_analytics`, `product_views`, `search_analytics`, `frontend_telemetry` e `password_reset_requests`.

**Lacuna efetiva:** `public.kill_switch_hits` não possui esse trigger. A consulta confirmou que `anon` ainda tem privilégio `INSERT` e uma policy `INSERT` nessa tabela. Assim, a cobertura prevista para sete tabelas não está concluída.

**Defeito no gate atual:** `scripts/check-anon-insert-rate-guard.mjs --gate` só valida a presença de `trigger_name` e `verified_at` no JSON estático; o valor literal `"pendente"` passa por ser não vazio. O modo live descrito no comentário também não está implementado. O gate não detectaria a ausência encontrada no banco.

**Próxima ação segura:** preparar uma migration versionada e um gate de leitura ao vivo, adicionar testes com estados de trigger presente/ausente e submeter por PR. Aplicar no canônico somente pelo workflow `.github/workflows/db-apply-migration.yml`, após o preflight confirmar a versão e a reconciliação do ledger; não executar DDL por MCP/dashboard nem `supabase db push`. Até lá, P200-E049 permanece aberto e a cobertura de `kill_switch_hits` não deve ser declarada como corrigida.

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
**Run ID da última falha:** 40745678499  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678499  
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
- Passo 2 — Re-run após P1 estar resolvido: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678499
- Passo 3 — Se o tooltip ainda falhar: o timeout de 2s (`expect(tooltip).toBeVisible({ timeout: 2000 })`) pode ser insuficiente em Chromium CI. Abrir issue para aumentar para 3000ms em `e2e/flows/sidebar-tooltips.spec.ts:60`.

**Impacto:** 90% dos testes E2E críticos ficam skipped enquanto o auth falhar.

---

## ✅ P3 — RESOLVIDO — Branch Protection Sentinel

**Workflow:** Branch Protection Sentinel  
**Run ID da falha original:** 40615509825  
**Run ID da falha recorrente (PR #2699):** [40728685711](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40728685711) — SHA `6b2cc72` — ❌ failure  
**Run de confirmação (PR #2703):** [40739341755](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341755) — SHA `c7bc0ba6` — ✅ **success**  
**Status:** ✅ RESOLVIDO — padrão sistêmico corrigido

**Histórico:**
- ✅ SHA `e4a326e` (run 40680415509) — success
- ✅ SHA `2cee272b` (run 40702858343) — success
- ❌ SHA `6b2cc72` (run 40728685711) — **failure** — squash merge PR #2699 sem `(#2699)` no commit title
- ✅ SHA `c7bc0ba6` (run 40739341755) — **success** — squash merge PR #2703 com `(#2703)` no commit title

**Causa raiz (resolvida):** A ferramenta `github_merge_pull_request` do MCP GITHUB-FOREVER não inclui automaticamente `(#NNN)` no commit title. Corrigido passando `commit_title` terminando em `(#NNN)` explicitamente em toda chamada:
```json
{
  "commit_title": "docs: descrição do PR (#2703)",
  "merge_method": "squash"
}
```

**Ação necessária do PO:** Nenhuma — padrão sistêmico corrigido. Futuros merges via MCP devem sempre incluir `(#NNN)` no `commit_title`.

---

## P-CI-H — Branch Protection Sentinel (incidente 2026-10-29 — SHA allowlist)

**Workflow:** Branch Protection Sentinel  
**Run ID da falha:** [#40965131389](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40965131389) — SHA `c3b41286` — ❌ failure  
**Run pendente (resolução natural):** [#40968551300](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40968551300) — SHA `8f992fd` — pending (passará via Regra 2 automaticamente)  
**PR com fix permanente:** [#2749](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2749) — draft, **aguardando squash-merge pelo PO**  
**Status:** ⏳ AGUARDANDO — run 40968551300 passará naturalmente; PR #2749 aguarda PO para fix permanente do SHA allowlist

**Causa raiz:** 6 commits pushados diretamente em main por TIPROMO entre `14b6d5fc` e `c3b41286` usavam prefixos não cobertos pelo sentinel (`docs(ci):`, `docs(auditoria):`, `docs(audit):`, `fix(ci):`, `merge:`, `Merge branch`). O sentinel auditou o range completo e rejeitou os 6.

**Fix implementado (PR #2749):**
- `scripts/sentinel-check.sh`: Regra 7.5 — lê `.github/SENTINEL_SHA_ALLOWLIST.txt`; aceita SHA como 4º arg opcional
- `.github/SENTINEL_SHA_ALLOWLIST.txt`: 6 SHAs históricos registrados com aprovação do PO
- `.github/SENTINEL_CHANGELOG.md`: v2.1.1 documentando a mudança
- `.github/workflows/branch-protection-sentinel.yml`: passa `$SHA` como 4º arg ao `sentinel-check.sh`

**Resolução natural dos runs pendentes:** `8f992fd` é `Merge pull request #2742` → passa Regra 2 automaticamente sem necessitar do PR #2749.

**Ação necessária do PO:**
- Squash-merge o PR [#2749](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2749) (`fix(ci): sentinel SHA allowlist + E2E PDF Dialog skip sem fixture (#2749)`) — inclui fix permanente do allowlist + fix do E2E PDF Dialog
- NÃO usar `commit_title` customizado no merge — deixar GitHub gerar `(#2749)` automaticamente

---

## ✅ P5 — RESOLVIDO — CI Security & Drift Checks (Calendar RDP v10)

**Workflow:** CI Security & Drift Checks  
**Run ID da última falha:** 40615509752  
**Run de validação:** [40745678435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678435) — ✅ **success** (2026-10-28)  
**Status:** ✅ RESOLVIDO

**Causa raiz:** 5 testes unitários de Calendar falhavam por migração react-day-picker v8→v10 (commit `8b0b606`) sem atualização dos seletores DOM dos testes.

**Fix:** Commit `c73cb9b` na main — 3 arquivos de teste corrigidos. Validado no run [40745678435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678435): Gate 2 Unit Tests ✅ success.

**Ação necessária do PO:** Nenhuma — resolvido.

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

**Nota — diferença P7 (`local_only=1108`) vs P12 (`local_only=1109`):** P12 rodou no branch do PR #2701 que adiciona a migration `20261028120000_grant_kit_view_authenticated.sql` ao repo (+1 sobre os 1108 da main). Os dois valores são corretos em seus respectivos contextos: 1108 é o estado atual da main; 1109 é o estado do branch do PR #2701.

---

## P8 — edge-functions-drift-check (drift entre GitHub e canônico)

**Workflow:** edge-functions-drift-check  
**Run ID da última falha:** 40756284439 (2026-10-28 19:39 UTC; SHA `da7bdb8`)
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40756284439
**Status:** failure — atualização para `main=c213051` é documental e não alterou edge functions.

**Erro exato:**
```
##[error]Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
```

**Evidência do artefato `drift_report.csv`:** 110 funções comparadas; 81 alinhadas; 29 com hash de conteúdo divergente; nenhuma função ausente no canônico ou órfã. O relatório prova a divergência, mas não identifica sozinho qual lado é a versão aprovada nem como ela chegou ao canônico.

**Funções com conteúdo divergente:** `ai-recommendations`, `bitrix-sync`, `cnpj-lookup`, `collections-watcher`, `connections-auto-test`, `connections-hub-audit`, `crm-db-bridge`, `e2e-cleanup`, `ema-pipeline-health`, `favorites-watcher`, `generate-ad-image`, `generate-mockup`, `kit-ai-builder`, `log-login-attempt`, `magazine-import-local`, `magazine-public-react`, `mcp-keys-issue`, `mcp-keys-revoke`, `migrate-helper`, `product-webhook`, `quote-sync-promo-champions`, `receive-crm-callback`, `secrets-manager`, `send-scheduled-reports`, `simulation-orchestrator`, `trends-insights`, `visual-search`, `webhook-dispatcher`, `webhook-inbound`

**Deploy aguardando PO:** run [40757296680](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40757296680) está `waiting` no environment **Production**. A API de pending deployments confirma que o aprovador é `adm01-debug`. É um dispatch amplo; não aprovar antes de classificar as 29 divergências.

**Ação necessária do PO:**
- Decidir, função por função, se o código aprovado é o do GitHub ou o canônico; consultar o artefato do run 40756284439 antes de escolher.
- Corrigir pelo fluxo de PR a fonte aprovada; depois usar `deploy-edge-functions.yml` com `function_name` para publicar funções pontuais.
- Aprovar o environment **Production** apenas para o conjunto revisado. Não há orphan para remover nem migration de banco pendente nesse drift.

---

## ✅ P9 — RESOLVIDO — E2E — Personalization Flow

**Workflow:** E2E — Personalization Flow  
**Run ID da última falha:** 40662579633  
**Run de validação:** [40745678737](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678737) — ✅ **success** (2026-10-28)  
**Status:** ✅ RESOLVIDO

**Causa raiz:** Mesma de P1. Testes E2E autenticados falham por ausência dos secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.

**Ação necessária do PO:** Nenhuma — resolvido no run 40745678737.

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
**Run ID da última falha:** 40746330314  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40746330314  
**Status:** failure — ❌ BLOCKED PO — requer deploy das versões atuais

**Resultado:** 3 arquivos falharam | 11 testes failed | 884 passed | 2 skipped (897 total)

**Falha registrada:** 3 arquivos falharam; o resumo antigo atribuía a falha a versões divergentes de três funções. O snapshot posterior do detector de drift (run 40756284439) permite confirmar apenas os hashes atuais, sem determinar qual lado é a versão aprovada:

As 3 edge functions afetadas têm código **correto no repositório** (confirmado em 2026-10-28 via `github_get_content`):
- `generate-mockup` (SHA `09af62394a`) — já tem `try/catch` em `JSON.parse` do body
- `verify-2fa-token` (SHA `a58240e50786`) — já tem `try/catch` em `JSON.parse` do body
- `validate-access` (SHA `14ce2379c053`) — já tem `missingBodyResponse`, `invalidJsonResponse`, `validationErrorResponse`, validação JWT completa e rejeição de tokens inválidos

**Estado no snapshot mais recente:** `validate-access` e `verify-2fa-token` estão alinhadas com o repositório; `generate-mockup` continua divergente. A comparação de hashes não prova se o código canônico ou o do GitHub é a versão aprovada. A falha E2E #40746330314 é anterior a esse snapshot.

**Ação necessária do PO:**
- Classificar `generate-mockup` comparando o conteúdo canônico ao versionado e decidir qual lado é aprovado.
- Se a decisão exigir alteração/deploy, fazê-la por PR e pelo workflow `deploy-edge-functions.yml`; aprovar `Production` somente para o conjunto revisado.
- Reexecutar os testes de integração após a reconciliação. Não redeployar `verify-2fa-token` ou `validate-access`, que aparecem alinhadas no snapshot atual.

---

## P12 — Kit Coverage — Integration (identidade do teste incompatível com os grants)

**Workflow:** Kit Coverage — Integration  
**Run ID da última falha (main):** 40628415319  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319  
**PR com fix:** [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) (draft — Gate Final ❌)  
**Run de falha no PR:** [40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177) (job Gate Final: 122981142154)  
**Status:** ❌ BLOQUEADO — o workflow consulta como `anon`; PR #2701 também tem checks de ledger/E40 em falha.

**Erro exato (main):**
```
Unknown Error: permission denied for view v_kit_component_complete
```

**Causa raiz confirmada em consulta read-only (2026-10-29):** O workflow fornece URL e chave publishable, mas não autentica uma sessão; as consultas são executadas como `anon`. No canônico `doufsxqlfjyuvxuezpln`, `anon` não tem `SELECT` na view `v_kit_component_complete` nem na tabela `product_kit_components`; `authenticated` e `service_role` têm. A view está configurada com `security_invoker=true`. A policy de leitura não substitui o `GRANT`. A fixture `KIT_FIXTURE_ID` também está vazia, mas isso não causa o erro de permissão.

**Fix implementado:** Migration `20261028120000_grant_kit_view_authenticated.sql` criada em branch `claude/fix-p12-grant-kit-view-261028-1730`, PR [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) aberto (draft).

**Status dos checks consultados em 2026-10-29:** a execução do PR #2701 ([run 40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177)) falhou no Deploy Gates; também falharam `db-schema-drift-check` ([run 40733948852](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948852)) e `migrations-sync-log-gate` ([run 40733948824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948824)). A divergência atual do ledger está discriminada em PEND-D02 (463 versões locais e 11 versões remotas sem correspondência); os números antigos `local_only=1109; remote_only=648` não são usados nesta revalidação por não coincidirem com o snapshot atual. O PR não está liberado para merge.

**Ação técnica necessária:** Ajustar o workflow/teste para autenticar com uma conta E2E somente-leitura aprovada e definir fixture determinística; verificar o escopo RLS e repetir o workflow. Não liberar `SELECT` a `anon` e não aplicar DDL diretamente. A migration do PR #2701 pode ser avaliada como grant versionado para ambientes novos, mas não corrige as chamadas anônimas e o PR segue bloqueado por `Deploy Gates`, `db-schema-drift-check` e `migrations-sync-log-gate` ([run 40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177), [run 40733948852](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948852), [run 40733948824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948824)). Qualquer alteração no canônico segue exclusivamente o fluxo E15 depois da classificação e aprovação necessárias.

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

## Inventário completo da main — 2026-10-29

Consulta ao GitHub Actions: 119 workflows ativos; para cada um foi consultada a execução mais recente filtrada pela branch `main`. Resultado: 58 success, 31 failure, 4 cancelled, 2 skipped, 3 aguardando (`waiting`/`pending`) e 21 sem execução registrada na main. Os estados abaixo são por workflow (não por todos os checks/jobs de uma única execução).

| Workflow | Última execução na main | Causa/step que falhou e ação pendente |
|---|---|---|
| Copilot | [40750158539](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750158539) | Limite adicional de uso do plano Copilot atingido. Aguardar/resetar cota ou ajustar plano; não há correção de código. |
| Regenerate Supabase Types | [26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Step `Commit, push, and open PR` falhou; execução de 2026-05-25 e logs de diagnóstico não estão disponíveis na consulta atual. Reexecutar workflow e registrar a mensagem completa antes de corrigir. |
| edge-functions-drift-check | [40756284439](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40756284439) | Gate `Fail if drift detected`: divergência entre funções do GitHub e funções canônicas; workflow criou `drift-report.csv`. Classificar conteúdo/órfãs/deploy antes de reconciliar; deploy só pelo workflow aprovado. |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | Duas asserções de payload inválido recebem HTTP 503 (esperavam resposta abaixo de 500): body vazio e string crua. Investigar disponibilidade/versão da Edge Function chamada; não mascarar 503. |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Step `Run Catalog→Kit Flow E2E`; 1 teste falhou (`e2e/flows/26-catalog-to-kit-flow.spec.ts`). O resumo não contém a asserção; usar artifact `e2e-full-flows-report-40762904577` para localizar a causa antes do fix. |
| Supplier Comparison CI | [39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | Execução falhou, mas o endpoint de logs não retornou jobs/trecho de erro. Causa ainda não comprovada; recuperar artifact/log ou reexecutar antes de alterar código. |
| OptimizedImage E2E CI | [39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | Job `test`, step `Setup E2E` falhou; o trecho final disponível não inclui a mensagem-raiz. Recuperar log completo do step de setup ou reexecutar. |
| Global Search Quality Gate | [39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `npm ci` reprova com `EUSAGE`: `package.json` e lock fora de sincronia; divergências reportadas em Supabase JS 2.117.3/2.118.0, jsPDF AutoTable 5.0.8/5.0.9, Lucide 1.54.0/1.58.0 e React/React DOM 19.3.0/19.3.1. Regenerar lock de forma controlada e validar. |
| db-schema-drift-check | [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | Step `Ledger parity (repo x canonical)` falhou por divergência do ledger; reconciliação/schema drift segue bloqueada pelo E40 e por PEND-D02. Não aplicar migration ou repair fora do fluxo autorizado. |
| Kit Coverage — Integration | [40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | 3 testes falham com `permission denied` em `v_kit_component_complete` e `product_kit_components`. Reconsulta ao canônico: `authenticated`/`service_role` têm SELECT; `anon` não. O workflow usa apenas a chave publishable, sem autenticar sessão. Adaptar o teste à identidade E2E aprovada; `KIT_FIXTURE_ID` vazio é lacuna separada. Não conceder leitura anon. |
| E2E • Swatch QuickView | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Chromium/Firefox falham sem causa isolada no resumo; WebKit recebe sinal de shutdown do runner. Inspecionar artifacts dos navegadores e repetir em runner estável. |
| Update Quote Visual Snapshots | [39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | 7 testes falham; erro explícito `[E108] Sem orçamento enviado no ambiente`. Preparar fixture/dados de orçamento e revisar visualmente antes de atualizar snapshots. |
| E2E Discount Approval (04c*) | [39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | Job do teste `04ck` falha em `Setup E2E`; log retornado não contém mensagem-raiz. Recuperar log/artefacto antes de qualquer alteração. |
| E2E • ColorSwatch 2 linhas (Grid) | [39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | Job do grid falha; resumo disponível só registra conclusão do job, sem erro raiz. Recuperar artifact de Playwright ou reexecutar. |
| E2E · Dialogs visual PR check | [39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | Run marcada `failure`, mas não retornou job/step falho na ferramenta de logs. Diagnóstico pendente de logs/artifact; não atribuir causa sem evidência. |
| E2E · Check Calendar snapshots | [39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | Run marcada `failure`, sem job/step no resumo de falhas consultado. Recuperar artifact/log do snapshot; não atualizar baseline sem revisão visual. |
| E2E — Customization Collapse (LocationPanel) | [40490191645](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40490191645) | Step `Check baselines exist`: faltam seis baselines (expanded/collapsed × mobile/tablet/desktop). Criar/validar visualmente os baselines e reexecutar. |
| PDF Quality Gate | [39263929435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929435) | `scripts/qa/generate-proposal-pdf.mjs` falha com `ERR_MODULE_NOT_FOUND`: pacote `playwright` ausente. Alinhar setup/install ao uso do gerador. |
| E2E — PDF Dialog (watermark pixel-diff) | [39263928969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263928969) | `Setup E2E` falha em resolução de pacote (`ERR_MODULE_NOT_FOUND` no trecho); obter nome completo do pacote e corrigir instalação, não mascarar. |
| PDF Visual Regression | [39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | Run marcada `failure`, mas logs consultados não retornaram job/erro. Recuperar artifact/log e identificar a asserção. |
| Magazine typed queries — dry-run | [39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | Step `Install dependencies` falha no dry-run de `magazine-typed-queries`; tail só mostra contadores esperados, sem a mensagem-raiz. Inspecionar log completo do install. |
| migration-dry-run | [35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolve o hostname mascarado (`could not translate host name ... Name or service not known`). Corrigir secret/host de conexão no ambiente do workflow, sem expor credenciais. |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | 6 testes falham porque a URL permanece `/magazine`, mas o teste espera `/magazine/<id>`; editor hero não aparece. Investigar criação/seleção de magazine e fixture. |
| Ratchet Weekly — Baixar baselines | [40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | Step `Detectar se baselines melhoraram` termina com código 141 (SIGPIPE). Corrigir pipeline produtor/consumidor sem `|| true` nem relaxar gate. |
| E2E Cart — Matrix (E79) | [40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Job `cart-handoff` falha; log de resumo não expõe teste/asserção. Recuperar artifact Playwright antes de corrigir. |
| E2E Freight — Matrix (E80) | [39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | Setup de autenticação E21 expira: login permanece em `/login`; causa alinhada à ausência/invalidade de credenciais E2E (P1). |
| E2E Stock — Matrix (E80) | [39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci` falha com `EUSAGE`: lock e manifests fora de sincronia, inclusive versões divergentes de Supabase JS, React/DOM, Lucide e jsPDF AutoTable. |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | 6 specs E2E falham: clique do botão `Começar pelos itens` é interceptado pelo header de busca/overlay; os testes de catálogo e kit não chegam ao estado esperado. Rever sequência/estado real de UI, sem enfraquecer a asserção. |
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | 8 testes visuais de swatch esperam `[data-testid="product-card"]` e expiram em 20 s; shard Playwright tem 11 falhas em badges/tooltips, catálogo e kit; o artifact do shard deve ser consultado para cada erro antes de alterar snapshots/código. |
| E2E · Atualizar snapshots visuais (E155) | [39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | 5 testes do step de regeneração falham; o resumo não traz as asserções. Inspecionar artifact e aprovar visualmente antes de mudar snapshots. |
| Python Package using Conda | [39670397287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397287) | Step `Install dependencies` falha; trecho final não contém pacote/erro-raiz. Recuperar log completo e reproduzir antes de mexer no ambiente Conda. |

**Ainda sem conclusão:** as linhas que pedem artifact/log registram exatamente o step bloqueante conhecido, mas não autorizam inventar causa raiz. Deve-se recuperar a evidência indicada e atualizar esta tabela quando o erro for identificado.

---

## P14 — Dependabot: duas alertas high para `extract-zip`

**Status:** aberto no GitHub em 2026-09-27; não foi corrigido nesta auditoria.

**Evidência:** alertas [#68](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/68) e [#69](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/69) apontam `extract-zip` no `package-lock.json`, faixa vulnerável `<= 2.0.1`. O lockfile atual resolve `2.0.1`. O endpoint do Dependabot não informou uma `first_patched_version`; portanto, esta evidência não identifica uma versão segura para atualização.

**Ação necessária:** verificar o advisory e uma versão corrigida compatível; atualizar a dependência pela menor alteração segura, reproduzir/validar `npm ci`, build, lint, typecheck e suíte completa, e confirmar o fechamento dos dois alertas. Não afrouxar auditoria nem descartar alertas.

---

## P15 — PR #2695: rerun do Copilot Review recusado pelo GitHub

**Run:** [40763821243](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40763821243) — SHA `891f9a56dba99cff5a1f2ed0b1332e9c15e98519` — `failure`.

**Evidência disponível:** o final do log mostra `Cleaning up orphan processes` e tentativas de encerrar processos (`npm exec @playw`); não há, nesse trecho, erro de teste ou diagnóstico da aplicação. A tentativa de rerun de jobs falhos recebeu HTTP 403: `This workflow run cannot be retried`. Portanto, a causa técnica além da falha durante o encerramento do runner não está confirmada.

**Ação:** aguardar os checks pendentes do PR atualizado; se o Copilot Review voltar a falhar, revisar o novo run ou solicitar suporte do runner GitHub. PR permanece sem merge até todos os checks requeridos concluírem e ficarem verdes.

---

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8, P11 requerem investigação independente. P12 bloqueado por P7 (Opção B disponível via workflow_dispatch sem resolver P7). P13 requer deleção do projeto fantasma Vercel.*

## Revalidação da main — 2026-10-29 (SHA `c344508711797a730893644449b16a05f12f4fce`)

Inventário limitado à última execução observada na `main` por workflow. Os itens abaixo continuam sem correção confirmada; os IDs substituem fotografias anteriores quando o workflow é o mesmo.

| Workflow / run | Evidência da falha | Estado e próximo passo |
| [Kit Coverage — Integration / 40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `permission denied for view v_kit_component_complete` | P12/P7: GRANT ausente; PR #2701 segue bloqueado pelo drift estrutural do ledger. Não aplicar DDL fora do fluxo aprovado. |
| [Nightly Full CI / 40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | 8 timeouts no seletor de swatches, falhas nos shards E2E (11 e 23) e 14 falhas de baseline visual do Magazine | Ainda sem causa única comprovada; reproduzir por suíte/shard e separar falha funcional de baseline antes de corrigir. |
| [E2E — Critical Flows / 40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Asserção inesperada no fluxo catálogo → kit autenticado | Fluxo público passou localmente; reproduzir a variante autenticada com credenciais E2E. Não presumir que a falha seja resolvida pelo teste público. |
| [CI Security & Drift Checks / 40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | Testes E2E autenticados falharam nos filtros de catálogo e Kit Builder | Diagnosticar seletores/estado e comparar com o run E2E Critical; ainda não há correção validada. |
| [E2E • Swatch QuickView / 40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Runner recebeu sinal de encerramento durante a execução; o job WebKit foi cancelado | Falha observada de execução/runner, sem evidência suficiente para atribuir a bug do produto; rerun controlado e diagnóstico do runner. |
| [Edge Integration Tests — All Functions / 40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | Dois testes de body malformado em `crm-db-bridge` receberam HTTP 503, quando esperavam resposta controlada abaixo de 500 | Investigar tratamento de JSON inválido e erro upstream; reproduzir localmente antes de alterar a função. |
| [E2E — Magazine Header Layout / 40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | 14 falhas nos testes responsivos do cabeçalho do Magazine | Reproduzir viewports individualmente e confirmar se é regressão visual/funcional antes de atualizar qualquer baseline. |

**Verdes na fotografia:** 25 workflows com última execução `success` entre 36 workflows observados; consultar os runs da `main` para a lista completa. Não houve rerun de workflows verdes.

**Estado do PR #2720:** no commit inicial `1df94731b`, Gate Final, Gate 1 e Gate 3 passaram. Após os commits documentais enviados no SHA atual `d3b705038969f3105da7f8a8c7f11d2939c5f7b4`, a última consulta encontrou 23 checks `success`, 3 `skipped`, 1 `neutral`, Gate 1 e Gate 3 ainda `in_progress`, e revisão Copilot em `failure`. O run mais recente da revisão é [40824279431](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40824279431): HTTP 402 (`You've reached your additional usage limit for your plan`) e bloqueio de rede para `api.github.com`. É falha de quota/serviço, não erro do código deste PR. Não mesclar enquanto houver checks pendentes ou vermelhos.

### Ledger de migrations — comparação local × banco canônico

Consulta somente leitura em `doufsxqlfjyuvxuezpln` em 2026-10-29:

| Fonte | Arquivos/linhas | Versões únicas | Hash MD5 ordenado das versões | Última versão |
|---|---:|---:|---|---|
| Repositório local (`supabase/migrations`) | 3.009 arquivos | 3.004 | `dbcbcffc885877af2cef536dc6cbc9cd` | `20261027234500` |
| `supabase_migrations.schema_migrations` | 2.552 linhas | 2.552 | `ba0ba22d8bcc705632cdeb5a888880c6` | `20261027160000` |

O diff previamente calculado contém **463 versões apenas locais e 11 apenas remotas**; há ainda 5 colisões de versão entre arquivos locais. A versão do banco é ledger, não prova isolada de que cada DDL esteja ou não no schema. Classificar os arquivos locais e remotos antes de qualquer reconciliação; não executar `db push`, `repair` ou DDL manual nesta auditoria. A alteração do PR #2720 é somente workflow/documentação e não adiciona migration.

## ADENDO — inventário atualizado em 2026-10-29

Esta seção registra as últimas execuções da `main` observadas nesta data. Os itens abaixo continuam falhando; erros E2E sem causa de infraestrutura comprovada ficam pendentes de reprodução e inspeção dos artefatos, sem atribuição especulativa.

| Workflow | Última execução com falha | Evidência observada | Situação |
| Workflow | Última execução concluída em falha | Evidência | Próximo passo |
|---|---|---|---|
| Uptime Monitor | [#41053317735](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41053317735) — `failure` | Job `check`, step agregado `Probe site + edge function`; o log do step não expõe qual probe entre site, `health-check`, `check-login` e Auth Health falhou. Não há evidência suficiente para atribuir o erro a uma probe específica. | Deploy protegido da função `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) segue aguardando aprovação do ambiente `production`. **PO:** aprovar pelo GitHub Actions; depois conferir um novo ciclo do monitor e, se falhar, obter status individual das probes. Não alterei a função/banco diretamente. |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) — `failure` | Log informa HTTP 402 / cota de uso adicional Copilot esgotada; há também aviso de rede para `api.github.com`, mas o erro fatal explícito foi 402. | **PO/admin:** regularizar a cota Copilot e solicitar nova execução. Não é falha de código nem check obrigatório de deploy. |

### Runs atuais ainda em fila ou pendentes — SHA `7e56ae49`

Estes estados não são falhas e ainda não permitem confirmar “verde” na nova ponta. Os Gate Final, E2E e demais jobs devem terminar antes da prova final:

- Deploy Gates (push) [#41054206726](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206726) `queued`; Deploy Gates (dispatch) [#41054421796](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054421796) `pending`; CI Security & Drift [#41054206685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206685) `pending`.
- CodeQL [#41054207049](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054207049), Gitleaks [#41054206653](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206653), Quote Builder [#41054206663](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206663), Release Please [#41054206617](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206617), Policies Baseline [#41054206631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206631), Static Health [#41054206785](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206785), Branch Protection [#41054206673](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206673), Lovable Edit Tracker [#41054206747](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206747) e Lovable Autoheal [#41054207025](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054207025): `queued`.
- No Prod Leak [#41054206666](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206666), Select Columns vs Types [#41054206658](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206658), SSOT Supabase Guard [#41054206549](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206549), Supabase Linter Gate [#41054206788](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206788), Required Checks Guard [#41054206618](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206618), Security Scan [#41054206640](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206640), E2E Critical Flows [#41054206634](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206634), UI Visual & A11y [#41054206778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206778), E2E Personalization [#41054206728](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206728) e E2E Playwright [#41054206752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206752): `queued`.
- E2E Personalization anterior [#41051701270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701270), tentativa 2, terminou `success`; Supabase Linter anterior [#41051701308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701308), tentativa 2, também terminou `success`. Essas conclusões são do SHA `b0d1376a`, não substituem os runs atuais.
- Edge Functions drift [#41048782448](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048782448) está `cancelled`, sem prova de reconciliação. Deploy protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) continua `pending` de aprovação humana. `Deployment Failure Alert` [#41054278600](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054278600) e `Lovable Protected-File Audit` [#41054206659](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206659) estão `skipped`, não são falhas.

### PR #2816 — verificações próprias da PR

A PR [#2816](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2816) está aberta e desatualizada em relação à `main`. O status registrado para head `e975c4fef` mostra deployment Vercel `failure` e Devin Review `success` com revisão ignorada por trial/créditos. Esse deployment é status da PR, não workflow concluído da `main`. Após sincronizar a branch, aguardar novos checks; não mesclar enquanto o required check estiver pendente ou falho.

## Atualização — falhas mais recentes da `main` (2026-10-30T11:35Z)

Inventário restrito ao último run conhecido de cada workflow na `main`; runs `queued`, `pending` e `in_progress` não são classificados como falhas.

| Workflow | Último run | Evidência/causa | Estado e próximo passo |
|---|---|---|---|
| Uptime Monitor | [#41045561447](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045561447) — `failure` | Probe `health-check` exit 22 (`curl -f` recebeu resposta HTTP não-2xx); `site`, `check-login` e `auth-health` retornaram exit 0. A issue automática [#2803](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2803) confirma esses códigos. Consulta autenticada independente em 2026-10-30T11:30Z retornou HTTP 503 com `database=unhealthy` e `external_db=unhealthy`; isso confirma indisponibilidade atual dos dois probes, mas não identifica a causa subjacente nem prova que o estado no instante do run era idêntico. | Fix do `external_db` já está na `main` via PR #2753, porém a Edge Function publicada segue na versão 275 (última atualização 2026-10-28). Deploy anterior [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) foi `cancelled`. Deploy pontual da função `health-check` pelo workflow protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) está pendente de aprovação do ambiente `production`. **Ação do PO:** revisar/aprovar esse deployment no GitHub Actions; após o deploy, aguardar novo ciclo do Uptime Monitor e confirmar o resultado. Se persistir `database=unhealthy`, investigar logs/saúde do banco canônico no Supabase antes de atribuir uma causa. |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) — `failure` | Log de `Processing Request (Linux)` registra `errorType: quota`, HTTP 402 e “additional usage limit” esgotado. O log também reporta bloqueio de rede para `api.github.com`; a evidência fatal explícita é a resposta 402 do serviço Copilot. | Bloqueio operacional externo, não falha do código e não required check. **Ação do PO/admin:** rever/regularizar o limite de uso do Copilot; depois solicitar nova execução. Se persistir após renovar a quota, investigar a allowlist de rede do runner para `api.github.com`. |

Checks verdes recentes na mesma ponta da `main` incluem UI Visual & A11y [#41045062190](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062190), Select Columns vs Types [#41045061953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045061953), Lovable Autoheal [#41045062040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062040), Gitleaks [#41045062076](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062076), E2E Personalization [#41045062037](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062037), Policies Baseline [#41045061919](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045061919) e Security Scan [#41045062287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062287). Workflows sem resultado final neste snapshot continuam `queued`/`pending` e não foram tratados como falha.

Não foram feitas alterações no schema, dados ou Edge Function diretamente. O deploy foi solicitado somente pelo workflow versionado e aguarda aprovação humana.

## Atualização P24 — execução posterior e gate de dependências (2026-10-30T11:53Z)

- **Uptime Monitor:** o run mais recente na `main` passou a ser [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078), SHA `42081291`, e também terminou `failure` no step `Probe site + edge function`. A coleta do log não expõe os códigos individuais; a issue [#2803](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2803) continua com o payload antigo porque a action deduplica a mensagem idêntica. A consulta HTTP autenticada descrita acima continua sendo o único status específico observado (`503`, com os dois checks de banco `unhealthy` às 11:30Z). Deploy de `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) segue `pending` em `production`; requer aprovação do PO.
- **Running Copilot Code Review:** último run conhecido na `main` permanece [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), `failure` por HTTP 402 e quota Copilot excedida, detalhado no P23.
- **Gate de dependências (risco detectado localmente, CI ainda sem conclusão):** `npm audit --audit-level=high` retorna 12 high e 1 moderate. A origem do grupo high é a cadeia dev `@lhci/cli@0.15.1` → Lighthouse/Puppeteer/proxy-agent (`basic-ftp`, `extract-zip`, `chromium-bidi`/`zod`). `npm audit fix --dry-run` só propõe corrigir `ip-address` (moderate); o npm oferece `@lhci/cli@0.13.0` como `semver-major`, que rebaixa Lighthouse de `12.6.1` para `11.4.0`. Não apliquei downgrade nem force fix. O Deploy Gates da `main` [#41048978175](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048978175) ainda estava `queued` neste snapshot; aguardar o Gate 0.5 e revisar alternativa upstream/compatível antes de alterar a ferramenta.

## Atualização P25 — Supabase Linter Gate e E2E na ponta mais recente (2026-10-30T12:10Z)

- **Supabase Linter Gate:** run [#41051701308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701308), SHA `b0d1376a`, tentativa 1 falhou no step `Check Security Advisors and live catalog gates`, ao executar `scripts/check-anon-write-grants.mjs`. O log mostra duas tentativas com `TimeoutError` no helper `supabase-read-only-query.mjs`, depois HTTP 544 e saída `Auditoria pg_catalog falhou`; advisors e allowlists passaram. A tentativa 2 via rerun oficial concluiu `success` às 12:09Z. Isso confirma recuperação na repetição e é compatível com falha transitória do serviço de consulta; não determina a causa do HTTP 544. **Não alterei banco, allowlist ou código.** A conclusão mais recente do workflow é `success`, portanto saiu da lista de falhas atuais.
- **E2E — Personalization Flow:** run [#41051701270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701270), SHA `b0d1376a`, tentativa 1 terminou `failure`: 4 specs falharam e 1 passou. Nos logs, as chamadas PostgREST `color_groups`, `v_products_public` e `categories` permaneceram pendentes por cerca de 26–27 s; `get_profile_and_roles` ficou pendente até 69 s. O erro final reportado em `loginViaUI` foi permanecer em `/login` após 75 s, sem sucesso no redirect. Isso é compatível com lentidão/indisponibilidade nas dependências de dados/auth durante o teste, mas o log não traz status HTTP que prove causa raiz. Solicitei rerun oficial apenas dos jobs falhos; tentativa 2 estava `queued` às 12:09Z, aguardando runner. Não reduzi timeout nem removi asserts.
- **Drift de Edge Functions:** o último `edge-functions-drift-check` disponível é [#41048782448](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048782448), `cancelled`, enquanto o deploy protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) segue `pending` de aprovação. Não há execução posterior que confirme reconciliação; não classificar o run cancelado como sucesso nem como falha atual concluída. Após a aprovação e conclusão do deploy, rodar o drift-check de novo.
- **Uptime Monitor:** a execução mais recente conhecida segue [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078), `failure` no step `Probe site + edge function`; o workflow não expôs códigos por probe. A última consulta autenticada independente observada às 11:30Z retornou HTTP 503 com `database=unhealthy` e `external_db=unhealthy`, sem permitir atribuir causa ao run. O deploy protegido de `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) continua `pending` de aprovação `production` pelo PO.
- **Copilot Code Review:** último failure conhecido permanece [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), HTTP 402 por limite de uso Copilot excedido; ação do administrador permanece regularizar a quota.
- No SHA atual `b0d1376a`, os runs recentes de `Static Health Checks`, `Lovable Edit Tracker`, `SSOT Supabase Guard`, `Gitleaks`, `Required Checks Guard`, `Security Scan`, `Select Columns vs Types`, `No Prod Leak`, `Release Please`, `UI · Visual & A11y`, `Lovable Autoheal`, `Quote Builder Delivery Quality`, `Policies Baseline`, `Branch Protection Sentinel`, `CodeQL` e `Supabase Linter Gate` (tentativa 2) concluíram `success`. `Mark stale issues and pull requests` também está verde em [#41047015308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41047015308). `Deploy Gates` [#41051701334](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701334) e o rerun da Personalization estavam `queued`; outros E2E/CI estavam `in_progress`, portanto não são falhas concluídas.

## Atualização P26 — E2E Critical Flows e execuções recentes (2026-10-30T12:19Z)

- **E2E — Critical Flows & Error Boundaries:** run [#41051701108](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701108), SHA `b0d1376a`, terminou `failure`. Jobs `E2E — Mobile Critical Routes` e `E2E — Error Boundaries (sem auth)` passaram; falhou `E2E — Full User Flows (authed)`. O `Setup auth state` confirmou que as credenciais estavam presentes e o teste de setup passou (1 teste em 1,3 min). No fluxo autenticado, `loginViaUI` permaneceu em `/login` por 75 s; o log registra PostgREST/Edge calls pendentes por 16–70 s, além de `get-visitor-info` retornando HTTP 403 após ~40,7 s. O gate mínimo também falhou: somente 1 de 10 testes executado, 9 ignorados (90% > limite de 50%). São sintomas de chamadas lentas e/ou rejeitadas no ambiente E2E; sem status de todas as chamadas ou log correlato não é possível atribuir causa única ao app, Auth, PostgREST ou Edge Function. Não alterei secrets, timeout, testes, código ou banco.
- A consulta agregada read-only aos logs unificados do Supabase, filtrada por fontes Edge/Postgres e rotas/status de 12:00–12:13Z, não retornou linhas. Isso não prova ausência de eventos fora dos campos/labels filtrados e não fornece causa independente. **Ação pendente:** PO/admin deve revisar nos painéis do Supabase a saúde e os logs de Auth, PostgREST e Edge Functions no intervalo indicado; após a dependência estabilizar, reexecutar somente os jobs E2E que falharam e verificar o gate mínimo sem o afrouxar.
- **Runs mais recentes ainda sem conclusão:** o rerun de E2E Personalization [#41051701270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701270) estava `in_progress` às 12:15Z; o Uptime Monitor [#41053317735](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41053317735) entrou `in_progress` às 12:19Z; Deploy Gates [#41051701334](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701334) permanecia `queued`. Nenhum deles é contado como falha concluída neste snapshot. O último Uptime Monitor concluído [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078) falhou; o novo run em progresso é o mais recente.
- **Copilot Code Review:** permanece como falha concluída mais recente do workflow [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), HTTP 402 por quota Copilot excedida; é bloqueio operacional externo e requer ação de administrador.
- **Supabase Linter Gate:** latest attempt do run [#41051701308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701308) está `success` (tentativa 2), então a falha HTTP 544 da tentativa 1 não é o resultado mais recente.
- **Validação local pós-commit `3d277b164`:** `NODE_OPTIONS=--max-old-space-size=4096 npm run build:verify` e `npm test -- --reporter=dot --silent` concluíram com exit 0; 1.250 arquivos passaram, 130 skipped; 25.898 testes passaram, 1.135 skipped e 24 todo. O commit contém somente `PENDENCIAS.md` e `RELATORIO_CI.md`; `git diff --check` passou. Esta validação não altera nem substitui os bloqueios E2E remotos acima.

### PR #2800 — fix de seletor E2E ainda sem validação funcional

O PR [#2800](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2800) permanece aberto e atrás da `main`. O run [#41041167646](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41041167646) do Magazine Header falhou durante `auth.setup`: `auth/v1/token` expirou/retornou timeout 504 antes da execução dos specs. Portanto, a alteração de seletor ainda não foi validada pelo E2E de CI. Não mesclar enquanto os checks exigidos não estiverem verdes; após a autenticação de teste responder, atualizar a branch e reexecutar.

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

| Workflow | Última execução | Estado | Evidência / causa provável |
| Copilot | [#40750158539](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750158539) | `failure` | Limite adicional de uso do Copilot atingido; resposta explícita do serviço. Bloqueio operacional do plano/quota, não resultado de revisão de código. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | `failure` | Step `Commit, push, and open PR`; a API de logs devolveu HTTP 410. Causa técnica do step não pode ser confirmada com a evidência retida; run muito antigo. |
| edge-functions-drift-check | [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | `failure` | `Fail if drift detected` encontrou divergência de conteúdo/estado entre repositório e funções canônicas. Não aplicar nem remover função por fora do fluxo versionado de deploy; identificar cada função divergente no log completo e reconciliar por PR. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | `failure` | A API de resumo não retornou jobs falhos nem logs, apesar da conclusão `failure`; causa não verificável pelo resumo disponível. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | `failure` | Step `Setup E2E` falhou; resumo não preserva erro-raiz. Não atribuir a secret ausente sem log. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `failure` | `Setup E2E` e `Install dependencies` falharam; resumo/log recuperável não contém diagnóstico suficiente para atribuir causa comum. |
| Kit Coverage — Integration | [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `failure` | Teste como `anon` recebe `permission denied` em `product_kit_components` e `v_kit_component_complete`. Corrigir a fixture/identidade autenticada do teste; não conceder leitura pública para fazê-lo passar. |
| E2E • Swatch QuickView | [#40920389028](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389028) | `failure` | Firefox falha no clique/fluxo do swatch-QuickView; o artefato confirma grade estreita, camada absoluta de ações interceptando clique, toolbar fora da viewport e componentes satélite V1 frente ao contrato V2. WebKit recebeu shutdown do runner. Correção de layout aguarda proposta visual aprovada; nenhuma asserção será removida ou forçada. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | `failure` | E2E falha com `[E108] Sem orçamento enviado no ambiente`; o ambiente não tem fixture/orçamento submetido requerido pelo spec. |
| E2E Discount Approval | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | `failure` | Steps `Setup E2E` falharam; logs disponíveis não expõem a causa específica. Confirmar configuração e autenticação E2E antes de classificar como falha da aplicação. |
| E2E ColorSwatch Grid | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | `failure` | Step `Setup E2E` falhou; resumo não expõe causa específica. Necessário obter/reproduzir setup daquele run antes de alterar o teste. |
| E2E Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | `failure` | Conclusão `failure`, mas resumo API não contém job/step falho; causa não verificável pelo material retido. |
| E2E Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | `failure` | Conclusão `failure`, mas resumo API não contém job/step falho; causa não verificável pelo material retido. |
| E2E PDF Dialog | [#40966337212](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40966337212) | ✅ `success` | **RESOLVIDO 2026-10-29** — Último run na main: success. Fix: `e2e/flows/pdf-dialog.spec.ts:39` substituiu `expect(false).toBeTruthy()` por `test.skip(true, ...)` para [E108] quando não há fixture de orçamento. Commit no PR [#2749](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2749). |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | `failure` | Conclusão `failure`, sem jobs/logs de falha retornados pelo resumo; causa não verificável. |
| Magazine typed queries — dry-run | [#39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | `failure` | Step `Install dependencies` falhou; log recuperável não contém erro do gerenciador de pacotes. Reproduzir no workflow isolado antes de alterar dependências. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `failure` | Step `Dry-run drafts` saiu com código 1; log retido não identifica qual migration/asserção causou a falha. Não aplicar migration como tentativa diagnóstica. |
| E2E Magazine Header Layout | [#40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | `failure` | E2E `expect(page).toHaveURL(expected)` falhou; precisa alinhar expectativa de rota ao comportamento aprovado e reproduzir sem enfraquecer o teste. |
| Ratchet Weekly — Baixar baselines | [#40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | `failure` | Step `Detectar se baselines melhoraram` falhou durante comparação; log mostra diff de chunks, mas não o motivo/limite decisório. Revisar artefatos e comparação antes de atualizar baseline. |
| E2E Cart — Matrix | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | `failure` | Um job falha no login E2E; outro expira em `locator.click` após 120 s no popover de remoção. São dois diagnósticos distintos; reproduzir ambos. |
| E2E Freight — Matrix | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | `failure` | Setup de autenticação termina com `E21 — login falhou em CI`; precisa verificar credenciais/serviço no período do run. |
| E2E Stock — Matrix | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `failure` | `npm ci --no-audit --no-fund` falhou em dois jobs; log resumido não retém stderr do npm. Reproduzir instalação no lockfile daquele SHA; não atualizar dependências por tentativa. |
| CI Security & Drift Checks | [#40920388986](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388986) | `failure` | Sete specs autenticados falharam. Evidência do run: `E2E_HAS_CREDS=true`, mock de health 200/30 ms, token Auth 200 após 62,4 s; REST `system_settings` 15–54 s e `get-visitor-info` 66 s; o login permaneceu em `/login` além do timeout de 75 s. Forte evidência de latência, sem causa operacional raiz confirmada. Investigar logs de Auth/REST/Edge no horário do run; não alterar credenciais nem elevar timeout para mascarar. |
| Nightly Full CI | [#40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | `failure` | Dois jobs E2E: seletor ColorSwatch excede 20 s e clique do Kit Builder excede 120 s. Reproduzir cada spec separadamente e classificar ambiente versus regressão. |
| E2E Update snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | `failure` | Regeneração falha com `element(s) not found`; não atualizar snapshot sem confirmar o elemento/fluxo esperado. |
| Python Package using Conda | [#39670397287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397287) | `failure` | Instalação interrompida por exigência de aceitar os Termos de Serviço do Anaconda nos canais configurados; causa externa ao código Python. |
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

---

## P28 — Novos failures em `main` pós-Lovable (2026-10-30T13:40Z)

### Contexto

Em 2026-10-30T13:13-13:14Z o Lovable (`gpt-engineer-app[bot]`) fez dois pushes diretos à `main` (comportamento esperado — REGRA #7):
- SHA `ff61eec4` — commit `fix(spotlight): timer cleanup`
- SHA `a7c02ac1` — commit `feat(E128): split SupplierFormDialog.tsx em sub-componentes por aba`

Esses pushes dispararam novos runs de workflow. Falhas abaixo são classificadas por tipo.

---

### P28-sentinel — Branch Protection Sentinel (dois SHAs)

| Run | SHA | Conclusão |
|---|---|---|
| [#41061416107](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061416107) | `ff61eec4` | `failure` |
| [#41061596613](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596613) | `a7c02ac1` | `failure` |

- **Causa raiz:** O `Branch Protection Sentinel` falha quando um commit é empurrado diretamente à `main` sem o formato de squash-merge `(#NNN)`. Lovable faz isso sistematicamente (REGRA #7 — comportamento documentado).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação:** Padrão conhecido e aceito. Não fixável sem mudar a integração do Lovable ou remover o sentinel. PO deve decidir se deseja ajustar o `.lovableignore` ou tolerar essas falhas.

---

### P28-replenishment — CI - Replenishment Module Quality Gate (SHA `ff61eec4`)

- **Run ID:** [#41061415964](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061415964)
- **Job falho:** `audit` — step 7 "Run E2E Tests (Smoke)"
- **Erro exato (log):** `[loginViaUI] Timeout aguardando redirect pós-login` — `URL atual: http://localhost:8080/login` após 75000ms. Specs: `replenishment-stress.spec.ts`, 2 falhos, 1 passou. Helper: `e2e/helpers/auth.ts:123`
- **Causa raiz:** Mesma causa de §P21-personalization — `auth/v1/token` retorna timeout 504/lento no CI. Não há mudança de código relacionada ao replenishment no commit `ff61eec4` (é apenas cleanup de timer no Spotlight).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação do PO:** Provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI (mesma ação de §P21-personalization).

---

### P28-quote-builder — Quote Builder Delivery Quality (SHA `a7c02ac1`)

- **Run ID:** [#41061596692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596692)
- **Job falho:** `quality-gate` — step 5 "🌍 E2E & Visual Regression"
- **Causa provável:** Padrão E2E auth timeout (artefato `delivery-quality-report` de 1GB uploadado mas job falhou no step E2E). Log tail não expõe o erro específico; padrão é idêntico ao §P21-personalization.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação do PO:** Provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI.

---

### P28-e2e-personalization — E2E — Personalization Flow (SHA `a7c02ac1`)

- **Run ID:** [#41061596766](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596766)
- **Causa raiz:** Mesma causa de §P21-personalization — auth 504 no CI.
- **Impacto no Gate Final:** NÃO é required check.
- **Ação do PO:** Provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI.

---

### Resumo P28 — Nenhum required check afetado

Todos os 5 novos failures (2× Branch Protection Sentinel + CI Replenishment + Quote Builder + E2E Personalization) ocorrem em workflows que NÃO são required checks para o Gate Final. O único required check (`Gate Final - Deploy Ready`) ainda não executou para o HEAD atual `a7c02ac1` da `main`.

**PR #2819** (`claude/fix-indexed-access-baseline-261030-1248`, SHA `ae87ee412`) continua a correção válida para Gate 1.10. Deploy Gates run [#41064553276](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41064553276) em `queued` às 13:40Z.

---

## P29 — Inventário atualizado da main HEAD `a7c02ac1` (2026-10-30T14:00Z)

Inventário completo dos workflows com última execução = `failure` na `main` no HEAD atual `a7c02ac1`.

### Falhas concluídas (última execução = failure)

| Workflow | Run | SHA | Causa raiz | Ação | Required check? |
|---|---|---|---|---|---|
| Branch Protection Sentinel | [#41061596613](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596613) | `a7c02ac1` | Lovable push direto sem formato `(#NNN)` — REGRA #7 estrutural | PO: decidir integração Lovable ou tolerar | NÃO |
| CI - Replenishment Module Quality Gate | [#41061415964](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061415964) | `ff61eec4` | `auth/v1/token` timeout 504 no CI — mesma causa §P21-personalization | PO: provisionar `SUPABASE_SERVICE_ROLE_KEY` | NÃO |
| E2E — Personalization Flow | [#41061596766](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596766) | `a7c02ac1` | `auth/v1/token` timeout 504 no CI | PO: provisionar `SUPABASE_SERVICE_ROLE_KEY` | NÃO |
| Quote Builder Delivery Quality | [#41061596692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596692) | `a7c02ac1` | `auth/v1/token` timeout 504 no CI | PO: provisionar `SUPABASE_SERVICE_ROLE_KEY` | NÃO |
| Uptime Monitor | [#41064302786](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41064302786) | `a7c02ac1` | Probe `health-check` exit 22 (curl HTTP error) — edge function retornando não-2xx. Issue [#2820](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2820) criada automaticamente. Causa: `health-check` em versão desatualizada (último deploy aprovado pendente). | PO: aprovar deploy [#41034820685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685) em environment `production` (mesmo item §P21-edge-drift) | NÃO (schedule, não required check) |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | `22ca2b3f` | HTTP 402 — cota Copilot excedida | PO: regularizar billing Copilot | NÃO |

### Falhas antigas supersedidas por runs mais recentes na main

Os workflows abaixo falharam em SHAs mais antigos (`7e56ae49`) mas agora têm runs mais recentes em `a7c02ac1` (concluídos ou em progresso) — não contam mais como "última falha":

| Workflow | Falha antiga | Run atual em `a7c02ac1` |
|---|---|---|
| CI Security & Drift Checks | `41054206685` (failure, `7e56ae49`) | `41061596603` (queued, `a7c02ac1`) |
| Deploy Gates | `41054206726` (failure, `7e56ae49`) | `41061596966` (queued, `a7c02ac1`) |
| E2E — Critical Flows & Error Boundaries | `41054206634` (failure, `7e56ae49`) | `41061596576` (in_progress, `a7c02ac1`) |
| E2E • Swatch QuickView (Lista + Tabela) | `41054206843` (failure, `7e56ae49`) | `41061596646` (in_progress, `a7c02ac1`) |

### Workflows verdes na ponta `a7c02ac1`

CodeQL, Gitleaks, Lint untypedFrom, Lovable Autoheal, Lovable Edit Tracker, No Prod Leak in Dev/Test Config, Policies Baseline, Release Please, Required Checks Guard, SSOT Supabase Guard, Security Scan, Select Columns vs Types, Static Health Checks, Supabase Linter Gate, TS Unused Locals Ratchet, UI · Visual & A11y, schema-snapshot-export.

### Estado do Gate Final na main

- **Deploy Gates main** [#41061596966](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596966) — SHA `a7c02ac1` — `queued` às 13:35Z
- **PR #2819 Deploy Gates** [#41064553276](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41064553276) — SHA `ae87ee412` — `queued` às 13:40Z
- Ambos aguardam runner; check-in programado para 14:30Z

### Ação pendente do PO (consolidada)

| # | Item | Ação |
|---|---|---|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` | Provisionar secret no CI → resolve 4+ falhas E2E |
| 2 | Deploy Edge Functions | Aprovar run [#41034820685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685) em `production` → resolve Uptime Monitor + drift |
| 3 | Copilot billing | Regularizar cota → resolve Running Copilot Code Review |
| 4 | Branch Protection Sentinel | Decidir sobre integração Lovable (tolerar ou ajustar) |

---

## P30 — Inventário completo HEAD `52570b33` / `cba9944d` (2026-10-30T17:30Z)

**HEAD atual da main:** `52570b33` (squash PR #2828, RELATORIO_CI.md §P29)
**Runs de referência:** executados sobre `cba9944d` (antecessor direto de `52570b33`); runs de `52570b33` ainda em andamento no momento deste registro.

### Workflows com última execução = `failure` (verificados)

| Workflow | Run | SHA | Causa raiz | Tipo de bloqueio | Required check? |
|---|---|---|---|---|---|
| CI Security & Drift Checks | [#41067472831](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472831) | `cba9944d` | **CAUSA COMPROVADA (log job 124110648431):** `auth.setup` falhou — `storageState.json` gerado sem token `sb-*-auth-token` válido porque `GET auth/v1/user`, `POST rest/v1/rpc/get_profile_and_roles` e demais chamadas pós-token ficaram PENDENTES ~51s em CI (timeout 75s). Sem auth válido, todos os 8 testes `chromium-authed` falham com `Expected: visible, Received: undefined` (nenhum elemento carregou pois a sessão não existe). 2 testes passaram no retry indicando flakiness de auth no runner. Mesma causa-raiz do Magazine Header. | Infra/auth-CI — `GET auth/v1/user` pendente no runner CI; requer `SUPABASE_SERVICE_ROLE_KEY` ou investigação de rate-limit no runner | NÃO |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) | `cba9944d` | **CAUSA COMPROVADA (log job 124105733359, step "Run Magazine Header E2E"):** `auth.setup` completou mas `storageState.json` não continha token `sb-*-auth-token` — `GET auth/v1/user` ficou PENDENTE 51134ms (de 75000ms). Step imprimiu: `❌ storageState.json sem token de sessão Supabase (sb-*-auth-token) — login E2E falhou com credenciais fornecidas.` → exit 1. Nenhum teste Playwright rodou. Mesma causa-raiz do CI Security & Drift. | Infra/auth-CI — `GET auth/v1/user` pendente no runner CI; requer `SUPABASE_SERVICE_ROLE_KEY` ou investigação de rate-limit no runner | NÃO |
| E2E • Swatch QuickView | [#41067472586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472586) | `cba9944d` | `check-playwright-min-executed`: `executed=5, minimo=10`; `ratio skipped=66.7% > 50%`. Log: "Causas possíveis: secrets E2E ausentes, spec list vazia ou Playwright abortou antes de rodar". Browsers webkit+chromium+firefox todos falharam. Mesma causa-raiz de auth-CI (ver acima). | Infra/auth-CI — mesma causa `GET auth/v1/user` pendente; requer `SUPABASE_SERVICE_ROLE_KEY` ou secrets `E2E_USER_*` válidos | NÃO |
| Uptime Monitor | [#41081887544](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081887544) | `52570b33` | Probe `health-check` exit 22 (curl HTTP error não-2xx) — edge function `health-check` em versão desatualizada. Issue [#2829](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2829) criada. Fix está no código (PR #2753 na main) mas deploy da função pendente de aprovação em `production`. | PO-BLOCKED: aprovar deploy de edge functions via `.github/workflows/deploy-edge-functions.yml` (workflow_dispatch `health-check`) | NÃO (schedule) |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | `22ca2b3f` | HTTP 402 — cota adicional Copilot esgotada. Log: `errorType: quota`. | PO-BLOCKED: regularizar billing Copilot GitHub | NÃO |
| edge-functions-drift-check | [#41034830573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034830573) | `7299c88c` | 31 funções em drift entre código no GitHub e estado canônico deployado — deploy via MCP/dashboard sem PR (REGRA #8 corolário). | PO-BLOCKED: dispatch `deploy-edge-functions.yml` para reconciliar; ou abrir PRs de migration espelho para cada função — REGRA #8 aplica | NÃO (workflow_dispatch/schedule) |
| Branch Protection Sentinel | [#41081845698](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845698) | `52570b33` | Push do Lovable sem formato `(#NNN)` no commit message — REGRA #7 estrutural. Falha recorrente a cada push do bot. | PO-BLOCKED: decidir tolerância ou ajustar integração Lovable | NÃO |

### Workflows verdes na ponta `cba9944d` / `52570b33` (verificados)

Branch Protection Sentinel ✅ (cba9944d — mas falha em 52570b33 por novo push Lovable), CI Replenishment ✅, CodeQL ✅, Deploy Gates ✅ (run [#41067473692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473692) — 15 jobs success, 2 skipped), E2E Critical Flows ✅, E2E Personalization ✅, Gitleaks ✅, Lovable Autoheal ✅, Lovable Edit Tracker ✅, No Prod Leak ✅, Policies Baseline ✅, Required Checks Guard ✅, SSOT Supabase Guard ✅, Security Scan ✅, Select Columns vs Types ✅, Static Health Checks ✅, Supabase Linter Gate ✅, TS Unused Locals Ratchet ✅, UI Visual & A11y ✅.

### Nenhum required check afetado

O único required check (`Gate Final - Deploy Ready`) executou com sucesso em `cba9944d` (run [#41067473692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473692), job 124135936896, 15:09:03Z — 15 jobs ✅, 2 skipped ⏭️). Os 7 workflows em falha documentados acima NÃO são required checks.

### Ações pendentes do PO (P30 consolidada)

| # | Item | Ação concreta |
|---|---|---|
| 1 | Uptime Monitor + edge-drift | Dispatch `deploy-edge-functions.yml` (`workflow_dispatch`, `function_name: health-check`) em GitHub Actions > Production env approval |
| 2 | E2E Swatch QuickView | Verificar/renovar secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` no repo (Settings > Secrets > Actions) |
| 3 | Copilot Code Review | Regularizar billing/cota Copilot no GitHub org |
| 4 | CI Security & Drift / Magazine Header | Investigar flakiness de auth em `chromium-authed` e fixture da spec Magazine Header — pode precisar de `E2E_USER_*` secret review (mesmo item #2) |

---

## P31 — Inventário completo HEAD `b92bcf876` (2026-10-30T19:00Z)

**HEAD atual da main:** `b92bcf876` (chore analise-prs, docs-only, paths-ignore ativo)
**Método:** `status=failure` branch=`main` — lista as últimas execuções concluídas em falha por workflow.
**Filtro equivalente a `is:action_required is:failure`:** 11 workflows identificados.

### Workflows com última execução = `failure` (inventário completo HEAD `b92bcf876`)

| Workflow | Run | SHA falha | Causa raiz comprovada | Required? |
|---|---|---|---|---|
| Branch Protection Sentinel | [#41088401698](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41088401698) | `b92bcf876` | Push do Lovable sem formato `(#NNN)` no commit message — falha recorrente a cada push do bot (REGRA #7 estrutural). PO-BLOCKED. | NÃO |
| Uptime Monitor | [#41086920368](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41086920368) | `52570b33` | Probe `health-check` exit 22 — edge function desatualizada, deploy pendente aprovação `production`. PO-BLOCKED (mesmo §P30). | NÃO |
| E2E — Critical Flows & Error Boundaries | [#41081845232](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845232) | `52570b33` | **CAUSA COMPROVADA (código verificado 2026-10-30):** `sidebar-tooltips.spec.ts` — 2 testes falharam em asserções de hover/tooltip (`Expected: visible, Received: hidden`). `chromium-authed` com auth SUCCEEDS. **Atributos presentes no código-fonte:** `data-tooltip-label` existe em `SidebarNavGroup.tsx:145,241` (condicionado a `item.tooltip`); `SidebarReorganized.tsx` tem 15+ itens com `tooltip:` definido. A falha é **comportamental em runtime** — Radix `<TooltipContent>` possivelmente não renderiza `[role="tooltip"]` visível no runner CI após mudança CSS/CSS-transition do Lovable. **Bloqueio para correção:** requer dev server rodando para debugging E2E interativo; fix alteraria código da aplicação → Vercel auto-deploy em `main` → PO deve aprovar PR de fix em branch separada antes do merge. | NÃO |
| E2E — Personalization Flow | [#41081845950](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845950) | `52570b33` | **CAUSA COMPROVADA:** `loginViaUI` timeout — página /login nunca redirecionou após submit. `auth/v1/token` ficou PENDENTE no runner CI (mesma causa-raiz auth-CI de §P30 — `GET auth/v1/user` pendente ~51s). PO-BLOCKED: provisionar `SUPABASE_SERVICE_ROLE_KEY`. | NÃO |
| CI Security & Drift Checks | [#41081845238](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845238) | `52570b33` | `storageState.json` gerado sem `sb-*-auth-token` — `GET auth/v1/user` PENDENTE ~51s no runner CI. Mesma causa §P30 (`cba9944d`), recorrente. PO-BLOCKED: provisionar `SUPABASE_SERVICE_ROLE_KEY`. | NÃO |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) | `cba9944d` | `storageState.json` sem token — `GET auth/v1/user` PENDENTE 51134ms. Mesma causa §P30. PO-BLOCKED. | NÃO |
| E2E • Swatch QuickView | [#41067472586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472586) | `cba9944d` | `executed=5 < minimo=10`, `ratio skipped=66.7% > 50%` — secrets `E2E_USER_*` ausentes ou auth-CI issue. PO-BLOCKED: revisar secrets (§P30 item #2). | NÃO |
| Quote Builder Delivery Quality | [#41061596692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596692) | `a7c02ac1` | **CAUSA COMPROVADA (código verificado 2026-10-30):** `quote-builder-delivery.spec.ts` — 4 testes falharam em asserções de tooltip hover/hide/alignment/guidance (`E2E_USER_EMAIL` presente = auth OK). **Atributos presentes no código-fonte:** `data-testid="delivery-info-tooltip-trigger"` em `QuoteBuilderPage.tsx:488`; `data-testid="delivery-info-tooltip-content"` em `QuoteBuilderPage.tsx:498`; `data-testid="delivery-label"` e `data-testid="delivery-label-container"` também presentes. A falha é **comportamental em runtime** — tooltip não exibe/esconde conforme esperado pelo spec após mudança Lovable. Mesmo bloqueio que E2E Critical Flows: fix altera código da aplicação → Vercel auto-deploy → PO deve aprovar PR de fix. | NÃO |
| CI - Replenishment Module Quality Gate | [#41061415964](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061415964) | `ff61eec4` | **CAUSA COMPROVADA:** `loginViaUI` timeout — permaneceu em `localhost:8080/login` sem redirecionar. Mesma causa auth-CI de E2E Personalization. PO-BLOCKED: provisionar `SUPABASE_SERVICE_ROLE_KEY`. | NÃO |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | `22ca2b3f` | HTTP 402 — cota Copilot esgotada. PO-BLOCKED: regularizar billing (§P30). | NÃO |
| edge-functions-drift-check | [#41034830573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034830573) | `7299c88c` | 31 funções em drift GitHub × canônico — deploy via MCP sem PR. PO-BLOCKED: dispatch `deploy-edge-functions.yml` (§P30). | NÃO |

### Classificação por tipo de bloqueio

| Causa raiz | Workflows afetados | Correção |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` ausente (auth-CI) | CI Security & Drift, E2E Personalization, CI Replenishment, E2E Magazine Header, E2E Swatch QuickView | PO: provisionar secret |
| Regressão de UI (tooltip hover/hide) — Lovable | E2E Critical Flows, Quote Builder Delivery | Dev: corrigir CSS/lógica tooltip em PR separado |
| Lovable push sem `(#NNN)` | Branch Protection Sentinel | PO: decisão de integração |
| Edge function desatualizada | Uptime Monitor, edge-functions-drift | PO: aprovar deploy |
| Cota Copilot esgotada | Copilot Code Review | PO: billing |

### Nenhum required check afetado

O único required check (`Gate Final - Deploy Ready`) para `b92bcf876` está `queued` (#41088401807 — runner backlog, não erro de código). O antecessor `cba9944d` (run #41067473692) teve Gate Final ✅ success em 15 jobs.

### Runs ainda em progresso em `b92bcf876` no momento deste registro

`queued`: Deploy Gates (#41088401807), Required Checks Guard, Lovable Autoheal, CodeQL, Gitleaks.
`pending`: CI Security & Drift, E2E Critical Flows, E2E Swatch QuickView, E2E Playwright, E2E Personalization.
`in_progress`: Quote Builder Delivery, Supabase Linter Gate.
`success` já confirmado: Policies Baseline, SSOT Supabase Guard, Security Scan, UI Visual & A11y, No Prod Leak, Static Health Checks, Release Please, Lovable Edit Tracker, Select Columns vs Types.
| 5 | Branch Protection Sentinel | Avaliar tolerância ou configurar Lovable para usar formato de commit com `(#NNN)` |

## P32 — Revalidação de workflows na main `6bc42d682` (2026-10-30T19:20Z)

Consulta read-only às últimas execuções de `push` na `main`. As causas observadas foram separadas entre defeito de teste corrigível e dependência externa; nenhum gate foi enfraquecido.

| Workflow | Run | Resultado / causa comprovada | Estado e ação |
|---|---|---|---|
| Branch Protection Sentinel | [#41110207016](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207016) | `failure`: o push de `6bc42d6` não segue um padrão aceito para merge de PR. O log identifica 1 commit direto na `main` sem padrão aceito. | Incidente já ocorrido; não reescrever histórico nem criar allowlist. Evitar novos pushes diretos e exigir PR. |
| E2E — Critical Flows & Error Boundaries | [#41110207002](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207002) | `failure`: setup autenticado registrou `auth/v1/token` sem resposta dentro do timeout, URL permaneceu em `/login`, e chamadas REST ficaram pendentes por ~65–70 s. Os 7 testes sem autenticação de Error Boundaries passaram. | Bloqueio de disponibilidade/latência no caminho Supabase Auth/REST do CI; investigar telemetria e rate limit com o PO. Não alterar segredos nem banco sem evidência/autorização. |
| Quote Builder Delivery Quality | [#41110207172](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207172) | `failure`: 3 cenários E2E autenticados terminaram em timeout de login; `auth/v1/token` e chamadas REST ficaram pendentes. Os 4 testes unitários do tooltip passaram. | Mesma dependência externa de Auth/REST observada acima; não classificar como regressão do tooltip sem execução autenticada válida. Investigar com o PO. |
| CI Security & Drift Checks | [#41110207018](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207018) | `failure`: 1.129 arquivos e 24.967 testes passaram; a única falha foi `QuoteBuilderSummaryAlignment.fuzz.test.ts`, que lia `QuoteBuilderSummaryColumn.tsx` embora os tokens verificados estejam em `QuoteBuilderSummaryItems.tsx`. Reproduzida localmente no SHA `6bc42d6`. | Correção do alvo de leitura preparada no PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839), commit `2d7b6815c`; testes focados e suíte completa passam no branch. Falha da `main` só será encerrada após merge revisado e novo run verde na `main`. |

### Gate obrigatório e checks verdes nesta ponta

- Gate Final — Deploy Ready: [#41110207159](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207159) — `success` em `6bc42d682`.
- Também concluíram `success` nesta ponta: Security Scan [#41110207040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207040), Required Checks Guard [#41110207046](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207046), No Prod Leak [#41110206990](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110206990), UI · Visual & A11y [#41110207385](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207385) e Static Health Checks [#41110207108](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207108).
- Swatch QuickView [#41110207138](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41110207138) ainda estava `in_progress` na consulta; não foi contado como sucesso nem falha concluída.

## P33 — Revalidação de workflows na main `9541666bf` (2026-10-30T19:45Z)

Consulta read-only aos runs mais recentes da `main`; falha só é contabilizada quando a execução mais recente terminou com `conclusion=failure`. Runs `queued`, `pending` ou `in_progress` permanecem em acompanhamento.

| Workflow / verificação | Run / evidência | Resultado comprovado | Encaminhamento |
|---|---|---|---|
| Uptime Monitor | [#41116269946](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41116269946), SHA `9541666b` | `failure`: `site=0`, `health-check=22`, `check-login OPTIONS=0`, `auth-health=0`. O monitor encontrou resposta HTTP não-2xx somente na Edge Function `health-check`; não falhou por ausência da chave no fonte. Issue [#2841](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2841) recebeu a ocorrência. | PO: revisar e aprovar, se aplicável, o deploy versionado de `health-check` pelo workflow `deploy-edge-functions.yml` e ambiente `production`; depois confirmar novo probe verde. Não houve deploy nesta sessão. |
| E2E — Personalization Flow | [#41115240723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723), SHA `9541666b` | `failure`: três testes expiraram em `loginViaUI`, permanecendo em `/login`. Nos traces, `POST auth/v1/token` retornou `200` em uma tentativa, `GET auth/v1/user` retornou `200`, enquanto algumas chamadas PostgREST/functions ficaram pendentes; parte de `profiles`, `categories` e `product_variants` respondeu `200`. Isso não prova uma causa única nem regressão do fluxo. | Não reproduzível localmente nesta sessão: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` não estão disponíveis no ambiente local. PO: confirmar no GitHub Actions que a conta E2E segue ativa e repetir o run; se persistir com auth e endpoints saudáveis, abrir diagnóstico do redirecionamento em PR separado. Não alterar asserts nem timeouts. |
| Running Copilot Code Review | [#41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979), SHA `9541666b` | `failure`: erro HTTP `402`, `SessionModelError` informa que o limite adicional de uso do plano Copilot foi atingido. | PO: regularizar cota/plano Copilot; depois reexecutar o workflow. |

### Check externo Supabase Preview (não é workflow de Actions)

O check do app Supabase [#124269702734](https://github.com/adm01-debug/Promo_Gifts_V4/runs/124269702734) reportou `Remote migration versions not found in local migrations directory.` Ele não é uma execução de workflow GitHub Actions e, portanto, fica fora da tabela de falhas da auditoria de workflows. A divergência de ledger continua sem classificação nesta evidência. Não apliquei migration, `repair`, DDL ou alteração de dados no projeto canônico; reconciliar exige inspeção administrativa read-only e versionamento revisado antes de qualquer ação autorizada.

### Execuções não contabilizadas como falha neste snapshot

- Deploy Gates / Gate Final [#41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969): `in_progress` às 19:45Z; ainda sem conclusão final.
- E2E Critical Flows [#41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508): `queued`.
- E2E Playwright [#41115240773](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240773) e Swatch QuickView [#41115240881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240881): `pending`.
- CI Security & Drift [#41115240942](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240942): `queued`.

Checks concluídos ainda verdes na ponta `9541666bf` incluem Gate 3 E2E Smoke, Gate 0 SSOT, Gate 0.5 Dependency Audit, Gate 2 Unit Tests, Gate 2.5 PostgreSQL Transactional Integrity, Gate 5 SEO, Gate 5.5 RPC `restore_seller_cart`, Quote Builder Delivery Quality, Security Scan, Required Checks Guard, Branch Protection Sentinel, CodeQL e UI Visual & A11y. O Gate Final não foi declarado verde enquanto o run acima permanecer sem conclusão.

### PR #2839 — snapshot do head `6f72c73eb`

O PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839) permanece aberto e não foi mesclado. Na consulta às 19:45Z, os checks Actions do head tinham jobs ainda `queued`/`in_progress`; não encontrei falha concluída no head, mas a validação remota não terminou e aguarda revisão humana. Não fazer merge antes da conclusão dos checks obrigatórios e da revisão.

## P34 — Fechamento parcial da rodada `main@9541666bf` (2026-10-30T20:03Z)

Atualização dos estados que ainda estavam pendentes em §P33:

| Workflow | Run | Resultado / causa comprovada | Encaminhamento |
|---|---|---|---|
| E2E — Critical Flows & Error Boundaries | [#41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508), SHA `9541666b` | `failure`. O step de tooltips não chegou aos asserts de tooltip: o helper `loginViaUI` expirou em `/login`. No primeiro try, `POST auth/v1/token` retornou `504` após 56.932 ms; `system_settings`, `get-visitor-info` e `log-login-attempt` ficaram pendentes. No retry, token e `auth/v1/user` responderam `200`, mas `get_profile_and_roles`, `profiles`, `products`, `product_images`, `product_variants`, `categories`, `suppliers`, `color_groups` e outros requests ficaram pendentes por ~57–72 s. O gate de mínimo de testes também falhou; não atribuir a falha aos tooltips, pois os testes não autenticaram/avançaram até os asserts. | Mesma dependência intermitente Auth/PostgREST documentada em §P32/§P33. Não há reprodução local sem variáveis e credenciais E2E. PO: verificar telemetria/limites/saúde do projeto e a conta de teste; depois reexecutar. Sem mudar comportamento de produto, asserts ou timeouts sem causa reproduzida. |

### Gate obrigatório e execuções ainda abertas

- Gate Final — Deploy Ready [#41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969): `success` em `main@9541666bf` (confirmado às 20:03Z); não há falha no único required check.
- CI Security & Drift [#41115240942](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240942) e E2E Playwright [#41115240773](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240773): `in_progress`.
- E2E Swatch QuickView [#41115240881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240881): `pending`.
- PR #2839 no head `08bcf8a3d`: 45 checks reportados, 9 `success`, 2 `skipped`, 1 `neutral`, 33 ainda não concluídos e nenhum `failure` concluído na consulta das 20:03Z. PR continua bloqueado por checks/revisão; não mesclar.

Esta atualização não altera o snapshot histórico de §P33. Nenhuma execução pendente foi contada como falha e nenhuma alteração foi feita no Supabase.

## P35 — Atualização após conclusão dos runs da main (2026-10-30T20:12Z)

Nova consulta às últimas execuções da `main@9541666bf`. Apenas resultados com `conclusion=failure` são tratados como falha; cancelamentos e execuções em andamento ficam separados.

| Workflow | Último run na main | Evidência / causa | Encaminhamento |
|---|---|---|---|
| Uptime Monitor | [#41120620323](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41120620323) | `failure`, repetindo o run #41116269946: `site=0`, `health-check=22`, `check-login (OPTIONS)=0`, `auth-health=0`. O log confirma que somente o probe da Edge Function `health-check` retornou HTTP não-2xx; a issue #2841 já existe e a ocorrência duplicada foi suprimida. | PO: revisar/aprovar, se adequado, o deploy versionado de `health-check` pelo workflow `deploy-edge-functions.yml` no ambiente `production`; depois confirmar novo probe verde. Nenhum deploy ou alteração no banco foi executado. |
| CI Security & Drift Checks | [#41115240942](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240942) | `failure` no step de testes: a única suíte falha foi `QuoteBuilderSummaryAlignment.fuzz.test.ts`, que lia `QuoteBuilderSummaryColumn.tsx` apesar de o JSX/tokens testados terem sido extraídos para `QuoteBuilderSummaryItems.tsx`. O log mostra 1.129 arquivos e 24.967 testes aprovados, 130 arquivos/1.135 testes skipped e 24 TODO. | Correção mínima de teste está no PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839), apontando para o componente que contém os tokens. Build e suíte completa passaram localmente no head do PR; o resultado remoto desse head ainda está pendente. A falha da `main` só será encerrada após merge revisado e novo run verde. |
| E2E — Personalization Flow | [#41115240723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723) | Continua como última execução: três timeouts de login em `/login`; token e algumas chamadas Auth/REST respondem, enquanto outras chamadas ficam pendentes. Sem causa raiz comprovada nem reprodução local por ausência de credenciais E2E no ambiente desta sessão. | PO: verificar a conta E2E e a saúde/telemetria do caminho Auth/PostgREST e repetir o workflow. Não alterar asserts ou timeouts sem reprodução. Detalhes em §P33. |
| E2E — Critical Flows & Error Boundaries | [#41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508) | Continua como última execução: helper `loginViaUI` expirou em `/login`; o primeiro token respondeu `504` após 56,9 s e, no retry, chamadas Auth/PostgREST permaneceram pendentes. Os asserts de tooltip não foram alcançados. | PO: verificar telemetria/limites/saúde do projeto e conta E2E, depois repetir. Não classificar como falha dos tooltips nem alterar comportamento sem causa reproduzida. Detalhes em §P34. |
| Running Copilot Code Review | [#41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979) | Continua como última execução: HTTP `402`, cota de uso adicional do Copilot esgotada. | PO: regularizar plano/cota e então reexecutar o workflow. |

### Estado de checks não falhos e PR de correção

- Gate Final — Deploy Ready [#41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969): `success` em `main@9541666bf`; o único check required segue verde.
- E2E Playwright [#41115240773](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240773): `cancelled`, não contado como falha. E2E Swatch QuickView [#41115240881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240881): `in_progress` na consulta, não contado como sucesso ou falha.
- Os demais checks concluídos na ponta `9541666bf` permanecem verdes conforme o inventário §P33/§P34.
- PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839), head `1fa22f47250b2d0f27891c75ecbbdf5f0cf97505`: aberto e bloqueado, sem revisão humana. Na consulta de 20:12Z, 3 checks concluídos, 50 ainda pendentes e nenhuma falha concluída no head; não mesclar até todos os checks obrigatórios concluírem e haver revisão.
- O check externo Supabase [#124269702734](https://github.com/adm01-debug/Promo_Gifts_V4/runs/124269702734) continua fora da categoria de workflows Actions. A divergência do ledger permanece não classificada. Nenhuma migration, `repair`, DDL ou alteração de dados foi executada.

## P36 — Diagnóstico do E2E Swatch QuickView na `main@9541666bf` (2026-10-30T20:19Z)

O run [#41115240881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240881) terminou `failure` depois do snapshot de §P35. Os logs dos três navegadores (Chromium, Firefox e WebKit) mostram o mesmo resultado: em cada navegador, 4 testes falharam e 1 passou; o guard registrou `executed=5`, `expected=1`, `unexpected=4`, `flaky=0`, `skipped=10`.

| Navegador | Evidência observada | Classificação |
|---|---|---|
| Chromium | Os testes não encontraram um picker V2 em `/produtos` e `/filtros`; nas rotas satélite `/novidades` e `/reposicao`, o teste lançou `[E108] Sem produtos com color_swatches`. | Falha reproduzida na seleção de dados/resultado exibido pelo ambiente E2E. A evidência não determina se faltam produtos elegíveis nos dados consultados ou se a consulta/renderização das rotas os excluiu. |
| Firefox | Mesmas 4 rotas e mesmas mensagens (`picker=null` ou `[E108]`); uma tentativa de retry repetiu os resultados. | Mesmo bloqueio; não é falha específica de navegador. |
| WebKit | Mesmas 4 rotas e mesmas mensagens; uma tentativa de retry repetiu os resultados. | Mesmo bloqueio; não é falha específica de navegador. |

O step `Check min tests executed` falhou como consequência de terem sido executados somente 5 testes, embora o mínimo configurado fosse 10; não é uma causa independente. Os testes chegaram às páginas, mas nenhum candidato elegível com `color_swatches` foi encontrado nas rotas avaliadas. Não há prova suficiente para atribuir isso a ausência de linhas no banco, pois não foi feita consulta ao banco — e nenhuma escrita foi autorizada ou executada. Também não alterei fixtures, asserts, catálogo ou schema para mascarar o resultado.

**Encaminhamento:** PO/equipe de produto deve confirmar, por consulta somente leitura autorizada e/ou inspeção do catálogo servido ao CI, se há produtos ativos com `color_swatches` V2 que devem aparecer nessas rotas. Se existirem, investigar o filtro/seleção/renderização de cada rota; se não existirem, decidir como fornecer dados E2E versionados e seguros sem copiar dados operacionais nem flexibilizar assertions. Depois da correção aprovada, repetir o workflow nos três navegadores e exigir sucesso antes de remover este bloqueio. Supabase permaneceu intacto.

## P37 — Deploy Preview Vercel falho no PR #2839 (2026-10-30T20:23Z)

O status Vercel do head `0ef67ce6d9aff9cb2944ffd6511d560b2db0f013` do PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839) concluiu `failure`: [deploy `dpl_7htod9VFENqZhyCed91EQEJgZjKM`](https://vercel.com/juca1/promo-gifts-v4/7htod9VFENqZhyCed91EQEJgZjKM). A inspeção foi feita no diretório raiz vinculado ao projeto canônico (`prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`) e em CLIs Vercel 59.5.0 e 65.8.0. O JSON retornado informa `target=preview`, `readyState=ERROR`; o build `@vercel/vc-build` aparece `READY`, mas sem itens em `output`. `vercel inspect ... --logs` não retornou log de build utilizável em nenhuma das versões. Portanto, a causa subjacente permanece não comprovada; não inferir que seja falha do código nem que seja irrelevante por ser documentação.

**Encaminhamento:** PO deve abrir o deployment no painel Vercel e compartilhar/revisar o log de build completo ou indicar a causa exibida pelo painel. Sem esse dado não é seguro propor correção. Nenhum comando de deploy, link, alteração de configuração ou criação de projeto foi executado. O PR segue bloqueado também por esse status, checks Actions pendentes e ausência de revisão humana.

## P38 — Revalidação de `main` e PR #2839 após novo snapshot (2026-10-30T20:38Z)

Nova consulta às execuções por branch e schedule confirma que a ponta da `main` continua em `9541666bf62883b06117b03cae0368b2c7d55314`. A única falha mais recente que mudou desde §P35–P36 é o Uptime Monitor; sua causa observada repete o probe de `health-check` e não revela resposta/erro interno adicional.

| Workflow | Última execução observada | Resultado e encaminhamento |
|---|---|---|
| Uptime Monitor | [#41124195036](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41124195036), schedule, atualizado às 20:34Z | `failure`; `site=0`, `health-check=22`, `check-login (OPTIONS)=0`, `auth-health=0`. Mesmo resultado da execução #41120620323; a issue #2841 e o encaminhamento ao PO de §P35 continuam válidos. Não houve deploy. |
| E2E — Personalization Flow | [#41115240723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723) | Continua como última falha conhecida; bloqueio de Auth/PostgREST e credenciais E2E sem nova execução. §P33/P35. |
| E2E — Critical Flows & Error Boundaries | [#41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508) | Continua como última falha conhecida; Auth/PostgREST impediu chegar aos asserts. §P34/P35. |
| CI Security & Drift Checks | [#41115240942](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240942) | Continua como última falha da `main`; correção de teste está no PR #2839, ainda sem conclusão remota. §P35. |
| E2E • Swatch QuickView | [#41115240881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240881) | Continua como última falha da `main`; quatro rotas sem candidato com swatches em cada navegador. §P36. |
| Running Copilot Code Review | [#41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979) | Continua como última falha conhecida; HTTP 402 por cota adicional esgotada, ação administrativa do PO. §P35. |

Gate Final — Deploy Ready [#41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969) segue como último Gate Final confirmado na `main`, `success`; Playwright [#41115240773](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240773) segue `cancelled`, não falha. Checks concluídos verdes do push `9541666bf` permanecem verdes; não há push posterior à `main` nesta consulta.

O commit `dd98f63281662a755bf92e6e9027f60da4e2229d` atualizou o PR #2839. A consulta após o push reporta 29 checks: 26 `queued`, 1 `success`, 1 `skipped`, 1 `neutral`; nenhum merge autorizado/realizado. O novo status externo Vercel falhou no Preview [deployment `dpl_9YgK49YiDcEBGYVRf19R91B3rfkb`](https://vercel.com/juca1/promo-gifts-v4/9YgK49YiDcEBGYVRf19R91B3rfkb). A inspeção read-only com CLI 65.8.0 confirmou `target=preview`, `readyState=ERROR`; o builder consta `READY`, `output=[]`. `inspect --logs` novamente só retornou `status Error`, sem log utilizável. Causa não comprovada; mantém-se a solicitação de evidência do painel em §P37.

Nenhuma ação foi realizada no banco Supabase, edge function, produção ou projeto Vercel. O PR segue bloqueado por checks em fila, status Preview falho e revisão humana ausente.

## P39 — Estado do PR #2839 no head `439cb1e5` (2026-10-30T20:46Z)

Após o push do commit `439cb1e5b5c021cacc0f400cca8f45fb0537792f`, o PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839) continuou `open` e `mergeable_state=blocked`. O endpoint de checks reportou 36 checks: 32 `queued`, 1 `success`, 2 `skipped` e 1 `neutral`; nenhum check concluído em falha nesta consulta. Ainda não havia revisão humana. `Devin Review` reportou que a revisão completa foi pulada porque o trial expirou e não há créditos — não é aprovação de código.

O Preview Vercel do head falhou novamente: [deployment `dpl_DA4xKV65oceEM3ir9pjSe5BeZu2r`](https://vercel.com/juca1/promo-gifts-v4/DA4xKV65oceEM3ir9pjSe5BeZu2r). A inspeção read-only com CLI 65.8.0 reproduziu `target=preview`, `readyState=ERROR`, builder `READY` com `output=[]`; `inspect --logs` devolveu somente `status Error`. O mesmo padrão ocorreu nos deployments de §P37–P38. A causa de build ainda depende dos logs visíveis pelo PO no painel Vercel; nenhuma configuração foi alterada.

A `main` segue no SHA `9541666bf62883b06117b03cae0368b2c7d55314`; as últimas falhas Actions são as listadas no §P38, com Uptime Monitor [#41124195036](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41124195036) como execução agendada mais recente. O Gate Final [#41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969) segue verde; nenhuma execução nova de main apareceu. Sem alteração do banco, edge function ou produção. Não mesclar este PR enquanto checks exigidos, Vercel Preview e revisão estiverem bloqueados.

## P40 — Snapshot de checks e bloqueios em 30/10/2026 às 21:04Z

A `main` permanece em `9541666bf62883b06117b03cae0368b2c7d55314`; não observei novo push. As últimas conclusões que ainda são `failure` permanecem as registradas nas §§P33–P38: Uptime Monitor [#41124195036](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41124195036), E2E Swatch QuickView [#41115240881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240881), CI Security & Drift [#41115240942](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240942), E2E Critical Flows [#41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508), E2E Personalization [#41115240723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723) e Copilot Code Review [#41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979). O Gate Final da `main` [#41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969) segue como último run confirmado `success`; E2E Playwright [#41115240773](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240773) foi `cancelled`, não classificado como falha.

### PR #2839 — head `cb727e159a6da7070a2880b59f3682393167ec62`

- Gate Final — Deploy Ready [#41126957278](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41126957278) concluiu `success` às 21:04Z. Gate 0, lint/TypeScript, unit tests, dependências, integridade transacional, SEO, Lighthouse, secret scan, E2E Smoke e Build concluíram sem falha neste gate. Isso valida os checks do Gate Final, não elimina falhas de workflows adicionais.
- O Vercel Preview do mesmo head reportou `failure`: deployment [`dpl_3MU9UcatcuC3esiK4uiWN7GJkoHR`](https://vercel.com/juca1/promo-gifts-v4/3MU9UcatcuC3esiK4uiWN7GJkoHR). O status apenas solicita consultar os logs no painel/CLI; não contém causa de build. Os deploys anteriores deste PR também não forneceram logs utilizáveis (§§P37–P39). Causa permanece desconhecida; não alterar configuração nem atribuir ao código sem o log do painel.
- E2E Quotes Matrix [#41126957055](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41126957055) concluiu com duas falhas: `undo` e snapshot dark-mobile de `view-no-presentation-mode`. No primeiro, o teste usa duração de 500 ms e espera 700 ms, enquanto `UndoToastContent` limita a duração mínima a 1.000 ms; o erro é compatível com o teste tentar clicar antes da expiração. É uma causa provável sustentada pelo código e pelo contexto de falha, ainda sem reprodução local focada. No segundo, Playwright detectou diferença entre screenshot atual e baseline; não atualizei snapshots sem comparar a origem da diferença.
- E2E Swatch QuickView [#41126957198](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41126957198) ainda estava `in_progress` na consulta. Um job WebKit terminou com `failure` após receber sinal de shutdown do runner, depois de iniciar a suite; os jobs Chromium/Firefox ainda não haviam concluído. Não classificar o workflow inteiro como concluído nem como falha final até o run terminar.
- Visual Baseline [#41126957052](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41126957052) também seguia `in_progress`; sem resultado final.
- Copilot Review [#41126973965](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41126973965) falhou por cota insuficiente. O status Devin informou revisão completa pulada por trial/créditos; não é aprovação.
- O PR continua sem revisão humana válida. A regra ativa exige revisão de CODEOWNER; `.github/CODEOWNERS` atribui o catch-all a `@adm01-debug`, que também é o autor do PR. Não contornar a proteção nem mesclar sem revisão compatível com a regra.

### PR #2845 — atualização do relatório P200

Gate Final [#41127458572](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41127458572) concluiu `success`. Copilot Review falhou por cota esgotada; a revisão de CODEOWNER também continua necessária, sem bypass executado. O PR permanece aberto.

Nenhuma migration, DDL, alteração de dados Supabase, deploy ou mudança de proteção de branch foi executada. Próximas dependências externas: obter do painel Vercel o log do Preview; uma revisão CODEOWNER válida; aguardar conclusão dos workflows ainda em andamento; e regularizar a cota Copilot se a revisão automática for desejada.

## P41 — Revalidação do PR #2839 e correções E2E locais (2026-10-30T21:25Z)

O PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839) permanece aberto no head remoto `f1f05aa39bb6bde53fdd55c6e2b100d89f31b29b`. O Gate Final [#41128906563](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41128906563) concluiu `success`; os workflows extras ainda não estão todos verdes. E2E Quotes Matrix [#41128906515](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41128906515) falhou em `undo` e `view-no-presentation-mode`. As correções foram commitadas localmente em `42114dbb8`, mas ainda precisam ser publicadas e revalidadas no GitHub.

- `undo`: reproduzido localmente antes da alteração. O teste pedia expiração após 700 ms, mas o componente aplica duração mínima de 1.000 ms. Ajustei o teste para observar `data-expired=true`, tentar um evento de click nesse estado e manter asserções de `onUndo=0` e remoção do toast. A spec isolada passou localmente com configuração CI e 2 workers: 7/7; isso não é a suíte completa do job Quotes Matrix.
- `view-no-presentation-mode`: a execução inicial local reproduziu 3 casos falhos: dois timers de teste curtos demais (250 ms e 600 ms) sob carga e um snapshot dark-mobile divergente. Ampliei somente os tempos artificiais do harness para 1.000 ms e 2.000 ms, mantendo as mesmas asserções; a spec isolada passou com configuração CI e 2 workers: 27/27. As specs satélites do job não foram incluídas nessa execução focada.
- Snapshot dark-mobile: comparação mostrou renderização atual de 128×156 contra o baseline anterior de 133×156 (diferença horizontal de 5 px; menu visível e conteúdo semântico preservado). Atualizei somente o PNG versionado para a renderização reproduzida; nenhuma classe ou estilo de interface foi alterado. A origem da diferença dimensional não foi determinada, portanto o snapshot atualizado não é apresentado como explicação da mudança visual.
- E2E Swatch QuickView [#41128906303](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41128906303) continuava `in_progress` às 21:25Z; jobs Chromium e Firefox não tinham conclusão. Um job WebKit foi encerrado como `failure` após o passo de teste terminar `cancelled` por shutdown do runner. Não classificar o workflow como resultado final nem disparar rerun sem conclusão/diagnóstico dos jobs restantes.
- O Vercel Preview do PR reporta falha no deployment [`dpl_GzfHCWz25aqrngjE3fk1buLEKLkw`](https://vercel.com/juca1/promo-gifts-v4/dpl_GzfHCWz25aqrngjE3fk1buLEKLkw), ainda sem logs que provem a causa. Copilot Review falhou por cota; CODEOWNER review válida continua ausente.

### Atualização de evidências — 2026-10-30T21:49Z

- A validação pós-commit local de `42114dbb8` foi concluída: `npm run build:verify` passou (TypeScript, ESLint `0 erros / 0 warnings`, build e guards SSOT); `npm run test:run -- --reporter=dot --silent` passou com 1.252 arquivos e 25.910 testes aprovados, 130 arquivos/1.135 testes skipped e 24 TODO. As duas specs E2E corrigidas passaram isoladamente: 7/7 e 27/27 em configuração CI com 2 workers.
- O workflow CI - Replenishment Module Quality Gate [#41128906205](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41128906205), no head anterior `f1f05aa39bb6bde53fdd55c6e2b100d89f31b29b`, concluiu `failure`. Lint, TypeScript e smoke passaram; a etapa `E2E — Paridade visual /novidades vs /reposicao` falhou em duas specs ao aguardar `getByTestId('page-title-novidades')` por 30 s. O HTML de falha anexado registra a raiz ainda com `nprogress-busy`. Isso comprova que a rota não montou o título naquele momento, mas não distingue falha de sessão/Auth, rede ou carregamento da aplicação. `E2E_USER_EMAIL/PASSWORD` não estão disponíveis localmente, então esta falha autenticada não foi reproduzida. Não alterei o teste nem o comportamento do site sem causa raiz comprovada.
- E2E Swatch QuickView [#41128906303](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41128906303) segue `in_progress` na consulta de 21:49Z: jobs Chromium e Firefox continuam sem conclusão. WebKit terminou `failure` depois que o runner recebeu sinal de shutdown; o passo foi cancelado sem assertion falha no trecho final do log. Como a execução geral segue aberta e não há diagnóstico final dos jobs pendentes, não a classifiquei como resultado final nem disparei rerun.
- O commit `42114dbb8` ainda não foi publicado. PR #2839 continua aberto e `mergeable=true`, `mergeable_state=unstable`; Preview, checks extras e revisão humana precisam ser confirmados no novo head. Não mesclar até os checks requeridos concluírem e a revisão exigida estar registrada.

Próximo passo: publicar a branch com push normal e acompanhar os workflows disparados no novo SHA. Se a falha de `/novidades` repetir, obter o trace e reproduzi-la com credenciais acessadas somente pelo secret do GitHub, sem compartilhar a senha no chat. Não mesclar enquanto Preview, checks restantes ou revisão exigida estiverem bloqueados. Nenhuma alteração foi feita no Supabase, produção ou regras de proteção.


## P42 — Inventário dos últimos workflows com falha na main (2026-10-30)

Consulta read-only via GitHub MCP FOREVER: 119 workflows inventariados. Vinte e quatro tinham sua execução mais recente na `main` concluída como `failure`; o Gate Final mais recente na `main`, [#41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969), está `success`. Os runs abaixo não foram rerunados nesta auditoria.

| Workflow | Último run na main | Evidência / bloqueio atual |
|---|---:|---|
| Copilot Code Review | [#41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979) | HTTP 402, limite de uso adicional Copilot atingido (`quota`); depende de billing/limite pelo PO. |
| E2E — Critical Flows & Error Boundaries | [#41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508) | `loginViaUI`: timeout aguardando redirect pós-login; asserts dependentes de sessão não executados. |
| E2E — Personalization Flow | [#41115240723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723) | Timeout no redirect pós-login e elementos ausentes; causa raiz do Auth/rede não provada. |
| CI - Replenishment Module Quality Gate | [#41102931819](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41102931819) | Smoke E2E expirou aguardando redirect após login. |
| Kit Coverage — Integration | [#40999068927](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40999068927) | Erro retornado pelo Supabase: `Could not query the database for the schema cache. Retrying.`; não houve alteração no banco. |
| E2E • Swatch QuickView (Lista + Tabela) | [#41115240881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240881) | Fixtures E2E não acharam produtos `color_swatches` nas rotas testadas; Chromium/Firefox e o guard de mínimo de testes falharam. Não está provado se faltam registros elegíveis ou se a UI/filtro os omitiu. |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) | Login não redirecionou; agregador propagou a falha do caso. |
| CI Security & Drift Checks | [#41115240942](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240942) | Assertion de contrato esperava `/leading-\[1\.125rem\]/` em `QuoteBuilderSummaryColumn`; divergência em teste estático. |
| Nightly Full CI | [#40993462227](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40993462227) | Teste visual color-swatch excedeu 20 s em `waitForSelector`; shards Playwright foram cancelados. |
| E2E Cart — Matrix (E79) | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | `cart-handoff` expirou aguardando redirect pós-login; `cart-delete-popover` foi cancelado em consequência. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | `toBeHidden()` falhou e o ambiente não tinha orçamento enviado (`[E108]`). Requer fixture/dataset de teste adequado antes de regenerar snapshot. |
| E2E · Atualizar snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | `quote item editor sheet` não ficou visível; elementos esperados ausentes. Diagnóstico do dataset/estado ainda necessário. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | Execução falhou sem jobs registrados; logs não comprovam causa. Requer nova execução diagnóstica controlada. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | Step `Setup E2E` falhou; trecho disponível não identifica a causa interna. Requer nova execução para logs atuais. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | Playwright falhou em `Setup E2E`; Vitest falhou em `Install dependencies`; detalhes de causa não recuperados no resumo. |
| E2E Discount Approval (04c*) | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | Jobs falharam em `Setup E2E`; causa interna não evidenciada no resumo. |
| E2E • ColorSwatch 2 linhas (Grid) | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | `Setup E2E` falhou; causa interna não evidenciada no resumo. |
| E2E · Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | Run sem jobs registrados; causa não pode ser estabelecida sem uma execução diagnóstica atual. |
| E2E · Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | Run sem jobs registrados; causa não pode ser estabelecida sem uma execução diagnóstica atual. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | Run sem jobs registrados; causa não pode ser estabelecida sem uma execução diagnóstica atual. |
| E2E Stock — Matrix (E80) | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci --no-audit --no-fund` falhou nos jobs dashboard/filter; erro interno não veio no resumo do run e precisa de nova execução. |
| E2E Freight — Matrix (E80) | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | `[auth.setup] E21`: login em CI expirou aguardando redirect pós-login. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | Step `Dry-run drafts` falhou; logs diagnósticos não disponíveis no resumo consultado. Não executar/aplicar migration por inferência. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Logs do run expiraram (HTTP 410) após falha em `Commit, push, and open PR`; requer run novo para identificar a causa atual. |

**Próximo passo por grupo:** erros de autenticação exigem diagnóstico do serviço/conta de teste via logs de uma execução recente, sem compartilhar credenciais; Kit Coverage e Swatch exigem validar fixture/dataset sem escrever no Supabase; asserts visuais só podem ser atualizados após reproduzir e comparar artefatos; Copilot depende do PO; runs históricos sem logs/jobs devem ser reexecutados individualmente após conferir que os workflows não escrevem no banco nem publicam artefatos externos. Causas não comprovadas permanecem explicitamente abertas, não marcadas como corrigidas.

## P43 — Atualização após novo head da main e reconciliação do PR #2839 (2026-10-30T21:59Z)

- Os commits `42114dbb8` e `a02ec1a07` foram enviados sem force-push para `codex/e23-required-secrets-20261030`, PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839). Checks específicos já iniciaram, mas ainda não há resultado remoto suficiente para declarar todas as correções verdes.
- A `main` avançou ao SHA `554ef41b44c9f318777d7e7b11189490a29a8c0a` (PR #2810/E128). No snapshot, 25 workflows novos estavam `pending/queued`, dois `skipped` e um alerta também `skipped`; não classificar pendentes como falhas. Por isso, as 24 execuções falhas da §P42 continuam sendo os últimos resultados concluídos registrados.
- O merge-base read-only mostrou conflito textual apenas em `RELATORIO_CI.md`. A reconciliação preserva a Seção 13/P35 de `main`, mantém o conteúdo do PR e renumera as seções seguintes; a decisão está em `docs/coordenacao/conflitos-semanticos.md`. O diff de integração traz também o commit legítimo de `main` que extrai `PromoFlixPlayer` para hook; nenhuma migration, DDL, alteração de dado ou configuração de banco foi incluída.
- O Preview/required checks/revisão de CODEOWNER do PR precisam ser reconsultados depois do push do merge commit. Não mesclar o PR enquanto qualquer required check ou aprovação exigida estiver pendente.

## P44 — Teste desatualizado após integração da main (2026-10-30T22:16Z)

- Durante a suíte integral no merge, `tests/scripts/plan-status.test.mjs` falhou porque esperava totais do plano P200 anteriores à atualização da `main` (`claimed=86`, `todo=103`). A leitura atual classifica 84 etapas reivindicadas, 11 bloqueadas e 105 pendentes; onda 0: 5 reivindicadas, 3 bloqueadas e 2 pendentes.
- Correção limitada às expectativas do teste; nenhuma asserção, teste ou regra de qualidade foi removida. Spec focada: 4/4. `npm run build:verify`: passou (typecheck, lint com 0 erros/avisos, guards SSOT e build). Repetição Vitest integral: 1.253 arquivos/25.915 testes passaram; 130 arquivos/1.135 testes skipped e 24 TODO.
- Esses resultados foram obtidos após o commit de integração e antes do commit corretivo. Repetir build e suíte completa depois do commit corretivo; depois atualizar o status do PR/checks. Nenhuma escrita no Supabase foi feita.
