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

## Snapshot 14:07Z — inventário da `main` após PR #2800

**HEAD verificado:** `cba9944d12a61699a3ca855388e5842c5d6948b3` (merge do PR #2800). Inventário obtido pelo MCP GitHub, filtrado para `branch=main` e excluídos PRs. Conforme a regra do projeto, execuções pendentes não são classificadas como falha.

### Última falha concluída e execução substituta

| Workflow | Execução concluída | Evidência | Execução mais recente na ponta atual |
|---|---|---|---|
| Uptime Monitor | [#41064302786](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41064302786), `failure`, SHA `a7c02ac1` | Step `Probe site + edge function`: `site=0`, `health-check=22`, `check-login (OPTIONS)=0`, `auth-health=0`. Verificação independente posterior: site e `/auth/v1/health` responderam HTTP 200; `health-check?fresh=1` respondeu HTTP 503 após 1,912 s, com `database timeout after 1500ms`; `external_db` permaneceu saudável. Isso evidencia timeout na consulta ao banco durante a janela, mas não identifica causa operacional mais profunda. | [#41069035787](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41069035787), `queued`, SHA `cba9944d`; aguardando execução/conclusão. **Não é falha concluída.** |

**Ação pendente se o novo run falhar pelo mesmo motivo:** o responsável administrativo do projeto deve investigar métricas, locks e plano/RLS da leitura de `profiles` na janela do timeout. Não alterar consulta, timeout, schema ou Edge Function sem diagnóstico causal. Nenhuma escrita, migration ou implantação no Supabase foi feita nesta auditoria.

### Falhas anteriores agora substituídas por execuções na ponta atual

Os failures abaixo eram da ponta `a7c02ac1`. Suas execuções mais recentes foram criadas para `cba9944d` e ainda não tinham conclusão neste snapshot; portanto não entram como falhas atuais:

| Workflow | Última falha anterior | Execução mais recente em `cba9944d` | Estado observado |
|---|---|---|---|
| Branch Protection Sentinel | [#41061596613](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596613) | [#41067472290](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472290) | `queued` |
| Quote Builder Delivery Quality | [#41061596692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596692) | [#41067473669](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473669) | `queued` |
| E2E — Personalization Flow | [#41061596766](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596766) | [#41067472705](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472705) | `queued` |
| E2E — Critical Flows & Error Boundaries | [#41061596576](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596576) | [#41067472836](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472836) | `queued` |

### Verdes e outros estados observados

No SHA atual, estavam `success`: CodeQL [#41067472531](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472531), Gitleaks [#41067472331](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472331), Lovable Autoheal [#41067472322](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472322), No Prod Leak [#41067473724](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473724), Security Scan [#41067472550](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472550), Select Columns vs Types [#41067472392](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472392), Static Health Checks [#41067472691](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472691) e UI Visual & A11y [#41067472498](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472498). Os demais workflows de push relevantes listados abaixo estavam `queued`/`pending`; `skipped` e `cancelled` não foram chamados de falha sem evidência adicional.

---

## Correção local — tour de kits e validação (PR #2827)

Dois commits locais nesta branch corrigem findings reproduzidos na auditoria:

- `52f1aecbb fix(ci): protege acessos a amostras administrativas` — resolve cinco erros de acesso indexado TypeScript nos painéis de conexões administrativas; a contagem de erros cai de 872 para 867, sem aumento do baseline.
- `2f914e1af fix(e2e): persiste encerramento do tour controlado` — persiste o encerramento do tour mesmo quando controlado pelo componente pai, fecha o tour se estiver visível antes da ação do teste E2E e adiciona teste unitário de regressão.

Validação após ambos os commits e novamente após rebase em `cba9944d`: `npm run build:verify` passou; suíte completa passou com **1.251 arquivos e 25.901 testes aprovados**, 130 arquivos/1.135 testes ignorados e 24 TODO. Teste unitário focado passou (1/1). Os testes não foram enfraquecidos. A reprodução Playwright autenticada local permanece indisponível porque `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` não estão configurados no ambiente local; os secrets não foram solicitados nem expostos. O PR [#2827](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2827) foi aberto; seus checks remotos estão pendentes.

## Atualização P30 — retries e falhas atuais da `main` (2026-10-30T14:28Z)

**HEAD auditado:** `cba9944d12a61699a3ca855388e5842c5d6948b3`. Últimos runs conferidos no MCP GitHub para `main`, excluindo PRs.

### Falhas concluídas e tentativas de validação

| Workflow | Falha no SHA atual | Trecho/evidência | Reexecução |
|---|---|---|---|
| Uptime Monitor | [#41069035787](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41069035787), tentativa 1, `failure`: `site=0`, `health-check=22`, OPTIONS e Auth health `0` | A issue automática [#2820](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2820) confirma que apenas a probe `health-check` falhou. Teste autenticado independente durante a auditoria oscilou entre HTTP 503 e HTTP 200 saudável; no retorno saudável, banco principal 862 ms e external DB 2.661 ms. | Tentativa 2 do mesmo run está `queued`; sem conclusão ainda. |
| CI - Replenishment Module Quality Gate | [#41067472887](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472887), tentativa 1, `failure` no step `Run E2E Tests (Smoke)` | Lint, typecheck e unit/integration passaram. O helper `loginViaUI` não saiu da tela de login. O log registra `auth/v1/token` com HTTP 504 (39–55 s) e uma chamada pendente por 75 s; `system_settings` teve respostas 503 e chamadas lentas/pendentes; `get-visitor-info` teve 403 e chamadas lentas/pendentes. | Tentativa 2 está `queued`; sem conclusão ainda. |
| E2E — Personalization Flow | [#41067472705](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472705), tentativa 1, `failure` no step `Run Personalization E2E Tests` | O login não completou e os cenários não alcançaram as asserções funcionais: token Auth HTTP 200 em 10,4 s, `system_settings` em 13,9–19,3 s, `profiles` em 5,4 s e `get-visitor-info` em 10,9–28,5 s, com outra chamada pendente. | Tentativa 2 está `queued`; sem conclusão ainda. |

**Diagnóstico operacional read-only:** no intervalo 14:00–14:30Z, a consulta agregada de logs PostgreSQL contou 311 eventos, 60 menções a timeout/cancelamento e zero menções a `profiles`. Isso confirma degradação/timeouts no banco durante a janela, mas não localiza causa em tabela, lock, plano ou policy. A resposta HTTP 503 intermitente da função de health-check e as chamadas Auth/PostgREST/Edge demoradas corroboram falha externa transitória; não justificam alterar código de produto, limites de timeout, políticas ou schema sem evidência causal. A chamada autenticada posterior `health-check?fresh=1` voltou HTTP 200 `healthy`; não prova que o serviço permaneceu estável.

### Outros workflows que voltaram a verde no SHA atual

- Branch Protection Sentinel [#41067472290](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472290) — `success`.
- Quote Builder Delivery Quality [#41067473669](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473669) — `success`.
- E2E — Critical Flows & Error Boundaries [#41067472836](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472836) — `success`.
- Também `success` na ponta atual: CodeQL, Gitleaks, Lovable Autoheal, No Prod Leak, Policies Baseline, Security Scan, Select Columns vs Types, SSOT Supabase Guard, Static Health Checks, Supabase Linter Gate, UI Visual & A11y, Lovable Edit Tracker e Release Please (links no snapshot P28 acima).

### PR das correções locais

PR [#2827](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2827) aberto, sem merge. Os checks do PR estão `queued` neste snapshot. A mudança do tour altera comportamento de aplicação; conforme o protocolo, não mesclar enquanto os checks e a revisão não concluírem, pois o merge pode publicar em produção. Nenhuma alteração no Supabase foi feita; as consultas foram agregadas e somente leitura.

## Atualização P31 — estado dos PRs abertos relacionados à auditoria (2026-10-30T14:40Z)

Consulta pelo GitHub MCP; estados abaixo são um snapshot e precisam ser reconsultados antes de qualquer merge.

| PR | Estado no snapshot | Falha/bloqueio confirmado | Próxima ação segura |
|---|---|---|---|
| [#2821 — status HTTP no Uptime](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2821) | 16 checks `success`, 12 `queued`; Copilot Review `failure` | HTTP 402 por limite de uso adicional do Copilot e bloqueio de rede para `api.github.com` (run [#41070185113](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41070185113)). | PO/admin: regularizar quota/configuração de firewall do reviewer; repetir checks após ajuste. |
| [#2822 — idempotency_key nos tipos](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2822) | 23 `success`, 13 `queued`, 3 `in_progress`; 2 checks `failure` | Copilot Review: mesmo erro HTTP 402/quota. WebKit foi interrompido por shutdown do runner depois do setup autenticado passar; nenhuma assertion falha foi registrada (run [#41070173002](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41070173002)). | Resolver quota; reexecutar o job WebKit interrompido e aguardar checks pendentes. |
| [#2823 — reconciliação de migrations](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2823) | 19 `success`, 12 `queued`, 2 `in_progress`; 3 checks `failure` | Gate de recibos [#41070523643](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41070523643): duas migrations alteradas sem recibo (`20261027233000`, `20261027234500`) e oito versões duplicadas no log (`20261027120000`, `...140000`, `...160000`, `...180000`, `...220000`, `...230000`, `...233000`, `...234500`). Preview Supabase [check](https://github.com/adm01-debug/Promo_Gifts_V4/runs/124115591040) falhou pois `analytics.categories_tree_visual` referencia `categories.level`, ausente no banco efêmero. Copilot Review também falhou por HTTP 402/quota. | Corrigir recibos/duplicidades no PR e investigar a migration/ordem que produz o preview incompatível. Sem aplicar DDL ou `migration repair` no canônico; repetir o preview isolado após a correção. |
| [#2824 — isolamento do servidor Vite](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2824) | 24 `success`, 31 `queued`, 9 `in_progress`; Copilot Review `failure` | Reviewer HTTP 402/quota e firewall para `api.github.com` (run [#41070819991](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41070819991)); nenhum outro check concluído em falha no snapshot. | Resolver quota; aguardar checks em andamento/fila. |
| [#2825 — Graphify e estado CI](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2825) | 9 `success`, 33 `queued`, 4 `in_progress`; Copilot Review `failure` | Reviewer HTTP 402/quota e firewall (run [#41070833637](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41070833637)). | Resolver quota; validar os demais checks antes de integrar. |
| [#2826 — Sentinel e E2E PDF](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2826) | 3 `success`, 37 `queued`, 4 `in_progress`; nenhuma falha concluída observada. | Execuções remotas ainda não terminaram. | Aguardar e reconsultar; `queued`/`in_progress` não são sucesso nem falha. |
| [#2827 — TypeScript e tour de kits](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2827) | 1 `success`, 26 `queued`; nenhuma falha concluída observada. | Checks remotos ainda não terminaram; o PR inclui mudança de comportamento da aplicação. | Aguardar checks e revisão; sem merge enquanto não houver confirmação verde e revisão, pois pode disparar deploy de produção. |

**Conclusão deste snapshot:** nenhum dos sete PRs está comprovadamente pronto para merge. As falhas do Copilot são bloqueios externos de quota/rede; os bloqueios de migration no #2823 são técnicos e reproduzíveis. Os três retries da `main` continuam sem nova conclusão; ver P30. A auditoria ampla dos planos do projeto permanece aberta. Nenhuma escrita no Supabase canônico foi realizada.

## Atualização P32 — falhas concluídas na `main` e nova fila do PR #2827 (2026-10-30T14:58Z)

Nova consulta ao GitHub MCP após a atualização do PR #2827. A `main` continua em `cba9944d12a61699a3ca855388e5842c5d6948b3`; o novo commit `68384e0424447c8ab96a1ea4f0b5b4023927e26d` foi enviado à branch do PR, sem merge.

### Workflows com falha na execução mais recente da `main`

| Workflow | Último run concluído | Causa demonstrada | Bloqueio/ação |
|---|---|---|---|
| Uptime Monitor | [#41069035787](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41069035787), tentativa 2, `failure` | A probe `health-check` não ficou saudável na janela; diagnóstico read-only independente observou timeout de banco de 1.500 ms e `external_db` saudável. A causa operacional abaixo da consulta ainda não foi identificada. | Pendente para administrador do projeto: correlacionar métricas/locks e plano da leitura de `profiles` no horário do run. Sem alteração de query, timeout, schema, edge function ou banco nesta sessão. |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825), `failure` | O setup autenticado não gerou `storageState` com token. `auth/v1/token` respondeu HTTP 200 após 23,860 s, mas `get-visitor-info`, `auth/v1/user`, `get_profile_and_roles` e várias leituras REST ficaram pendentes por 43–79 s; login permaneceu em `/login` por 75 s. Nenhuma assertion de layout foi executada. | Bloqueio de disponibilidade/latência dos serviços Supabase durante o E2E; correlação administrativa necessária. Não tratar o PR #2800 como validado por este run e não enfraquecer/pular specs autenticados. |

### Outras execuções da ponta atual

- `CI - Replenishment Module Quality Gate` [#41067472887](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472887) e `E2E — Personalization Flow` [#41067472705](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472705) estavam `in_progress` na consulta de 14:58Z; não classificadas como falha nem sucesso até conclusão.
- `Deploy Gates` [#41067473692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473692) e Uptime agendado [#41072678043](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41072678043) ainda estavam `queued`/`pending`; sem conclusão.
- `success` continuavam CodeQL [#41067472531](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472531), Gitleaks [#41067472331](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472331), Lovable Autoheal [#41067472322](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472322), No Prod Leak [#41067473724](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473724), Security Scan [#41067472550](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472550), Select Columns vs Types [#41067472392](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472392), Static Health Checks [#41067472691](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472691) e UI Visual & A11y [#41067472498](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472498).
- PR [#2827](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2827), atualizado com `68384e042`, tinha 1 check `success`, 26 `queued` e nenhum `failure` concluído na consulta de 14:58Z. Não mesclar: inclui mudanças da aplicação e pode disparar deploy; aguardar checks/revisão.

**Próxima etapa:** aguardar os runs `in_progress`/`queued` e reconsultar. Os bloqueios de Uptime e E2E autenticado requerem evidência operacional do Supabase; não há correção de código segura comprovada neste ponto. Nenhuma migration, escrita ou alteração no Supabase canônico foi realizada.

## Atualização P33 — CI Security & Drift falhou no E2E autenticado (2026-10-30T15:12Z)

Consulta atual: `main` ainda aponta para `cba9944d12a61699a3ca855388e5842c5d6948b3`; a branch do PR #2827 aponta para `d96f33023`. O run de Uptime mais recente [#41077645794](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41077645794) estava `pending`, portanto não classificado como falha concluída.

### Falha nova concluída na ponta `main`

| Workflow | Run | Causa observada | Próxima ação segura |
|---|---|---|---|
| CI Security & Drift Checks | [#41067472831](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472831), step 27 `Run E2E Critical Tests — specs autenticados`, `failure` | 8 specs falharam, 2 ficaram flaky e 2 passaram. `auth.setup` terminou em 48,6 s, mas o console registrou `TypeError: Failed to fetch` em `v_products_public` e no bootstrap de `system_settings`; os testes de catálogo não encontraram a grade. No Kit Builder, o overlay `KitOnboardingTour` interceptou os cliques e impediu a entrada no construtor. O job levou 19,6 min. Não é uma falha isolada de assertion: há indisponibilidade de chamadas Supabase e uma interação de tour no teste. | O PR [#2827](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2827) inclui ajuste E2E para fechar o tour se visível; isso ainda precisa passar no check remoto. Para `Failed to fetch`, correlacionar status/latência do Supabase no horário do run. Não aumentar timeout, não pular specs e não alterar banco sem causa comprovada. |

Na consulta de 15:12Z, o restante dos workflows verdes em `cba9944d` continuava concluído com `success`, incluindo Deploy Gates [#41067473692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473692), CodeQL [#41067472531](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472531), Gitleaks [#41067472331](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472331), Security Scan [#41067472550](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472550), Select Columns vs Types [#41067472392](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472392), Static Health Checks [#41067472691](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472691), Quote Builder [#41067473669](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473669), Personalization Flow [#41067472705](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472705), Replenishment [#41067472887](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472887) e Critical Flows [#41067472836](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472836). O Uptime agendado e o E2E Swatch permaneciam sem conclusão.

O PR #2827 recebeu `d96f33023`; na consulta, seus novos checks ainda estavam majoritariamente `queued`/`pending`, sem failure concluído. Não mesclar enquanto os checks e a revisão não terminarem: o PR inclui mudança da aplicação e pode disparar deploy. Nenhuma ação de escrita ou migration foi feita no Supabase canônico.

## Atualização P34 — bloqueio do reviewer no PR #2827 (2026-10-30T15:23Z)

O check `copilot-pull-request-reviewer` do head `2bb2edc599d99ef5d2ee1733809c6719d8188b34` falhou no run [#41080015183](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41080015183), job [#124146314682](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41080015183/job/124146314682). O step `Processing Request (Linux)` identifica `SessionModelError`, `errorType: quota`, HTTP 402 e limite de uso adicional do Copilot excedido (Request ID `781B:28D0B4:8798DE:8FEC9F:6AE4B64D`). O job também reportou bloqueio de firewall para `api.github.com`, mas a falha fatal explícita foi a resposta de quota 402; não há evidência de defeito de aplicação. **Ação do PO/admin:** regularizar a cota Copilot e reexecutar o reviewer; se voltar a falhar após isso, investigar a allowlist do runner.

Na reconsulta do head, havia 48 check runs: 8 `success`, 3 `skipped`, 1 `neutral`, 1 `failure` (este reviewer) e 35 `queued`/`in_progress`. O PR permanece aberto e sem merge; os checks obrigatórios e de regressão ainda precisam concluir. Não alterar/desabilitar o reviewer, não contornar a checagem e não mesclar enquanto persistirem falhas ou checks pendentes. Nenhuma escrita no Supabase canônico foi feita.

## Atualização P35 — novas falhas concluídas na execução mais recente da `main` (2026-10-30T15:26Z)

HEAD permanece `cba9944d12a61699a3ca855388e5842c5d6948b3`; runs conferidos por workflow no GitHub MCP. Além de E2E — Magazine Header [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) e CI Security & Drift [#41067472831](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472831), já detalhados em P32/P33, foram concluídas estas falhas:

| Workflow | Run | Evidência do erro | Causa provável e próximo passo |
|---|---|---|---|
| Uptime Monitor | [#41077645794](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41077645794) | Issue automática [#2829](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2829): `site=0`, `health-check=22`, `check-login (OPTIONS)=0`, `auth-health=0`. Curl 22 indica resposta HTTP considerada erro pela probe; o workflow não capturou o status HTTP exato da função. | Falha isolada da `health-check`; como Auth, site e preflight responderam, correlacionar logs/métricas da função e capturar status HTTP na investigação. Não editar função, timeout ou banco sem evidência causal. |
| E2E • Swatch QuickView (Lista + Tabela) | [#41067472586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472586) | Chromium, Firefox e WebKit falharam. As anotações dos jobs registram erro E108: ausência de produtos com `color_swatches` em rotas como `/novidades` e `/reposicao`, ausência de picker V2 em `/filtros` e timeout de locator de 240 s; resumo: Chromium/Firefox 14 falhas cada, WebKit 4. | Indício de dependência de dados de catálogo mutáveis/indisponíveis e locators sem fallback determinístico; ainda não prova se é falta de dados, latência do Supabase ou regressão do seletor. Reproduzir sem afrouxar assertions e tornar os dados do teste determinísticos; nenhum produto foi alterado no banco. |

Os demais workflows no mesmo HEAD incluem Deploy Gates e checks de segurança/qualidade já concluídos com `success` no snapshot anterior P33; conferir a execução mais recente por workflow antes de concluir a auditoria, pois o código de `main` não avançou desde `cba9944d` (depois foi adicionado apenas um relatório documental em `52570b337`). O snapshot inicial do PR em `9cd3e741d` tinha 1 check `success`, 1 `neutral`, 2 `skipped` e 17 `queued`, sem novo failure concluído.

Após o commit documental `bd9bb727c` enviado ao PR, o reviewer falhou novamente no run [#41083270510](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41083270510), HTTP 402 (`errorType: quota`, limite adicional do Copilot excedido; Request ID `A003:1069BA:DEDFD4:E9419E:6AE4BB3C`). O log também reporta bloqueio de firewall para `api.github.com`; a falha fatal explícita permanece a resposta de quota. Nesse head, havia 5 checks observados: 1 `success`, 1 `neutral`, 2 `skipped` e 1 `failure` (Copilot reviewer). **Ação administrativa:** regularizar a cota Copilot e repetir o check. O PR ficou em conflito porque `main` recebeu somente documentação (`52570b337`); conflito documental está sendo reconciliado neste branch. PR aberto, sem merge e sem alteração do Supabase canônico.

## P36 — inventário atual da `main` e causas verificadas (2026-10-30T16:12Z)

**HEAD:** `52570b33767d3fdbf740cb78206ac7dbada4bbd1`. Consulta ao GitHub MCP filtrada por `branch=main`; considera-se somente o último run de cada workflow. Runs `in_progress`/`queued` não são chamados de falha.

### Falhas concluídas atuais

| Workflow | Última execução | Evidência e classificação | Ação segura / bloqueio |
|---|---|---|---|
| Branch Protection Sentinel | [#41081845698](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845698) — `failure`, SHA `52570b33` | Rejeitou o commit `52570b3` (`docs(ci): RELATORIO_CI.md P28 — Gate Final ✅ success cba9944d (run 41067473692)`) com `sem-padrao-aceito`. A allowlist estrita não inclui `docs(ci):`; o commit documental entrou diretamente na `main`, fora de PR. | Não ampliar a allowlist nem reescrever histórico para mascarar a violação. Preservar o Sentinel e encaminhar futuras alterações por PR. O failure histórico permanece registrado; um próximo push aprovado deve confirmar o caminho correto. |
| E2E — Critical Flows & Error Boundaries | [#41081845232](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845232) — `failure`, SHA `52570b33` | Login E2E expirou após 75 s; a tela mostrou “Sistema em Manutenção” e `POST functions/v1/log-login-attempt` ficou pendente. As duas specs de tooltips não saíram de `/login`; não chegaram a validar o comportamento dos tooltips. | Bloqueio de dependência Supabase no ambiente E2E. Reexecutar após recuperação e confirmar as assertions; não aumentar timeout nem pular specs. |
| E2E — Personalization Flow | [#41081845950](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845950) — `failure`, SHA `52570b33` | Login expirou após 75 s; `get_profile_and_roles` e `system_settings` ficaram pendentes por 59 s e 35 s. Os três cenários não alcançaram as assertions do fluxo. | Mesmo bloqueio Supabase. Reexecutar após recuperação, mantendo a suíte intacta. |
| Uptime Monitor | [#41086920368](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41086920368) — `failure`, SHA `52570b33`; issue automática [#2829](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2829) | Nova probe falhou com `health-check=22` (`curl -f`, HTTP não-2xx); site, preflight `check-login` e Auth Health passaram. Sonda read-only autenticada às 16:12Z retornou HTTP 503, `database=unhealthy`, `database timeout after 1500ms`; `/auth/v1/health` retornou HTTP 200. | **Administrador do Supabase canônico:** investigar métricas, saturação, locks e logs no horário. Não alterei banco, Edge Function, schema ou timeout. Após estabilizar, repetir probe e E2Es. |
| CI Security & Drift Checks | [#41081845238](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845238) — `failure`, SHA `52570b33` | Security audit `success`; job E2E concluiu com 7 falhas e 5 passagens. As falhas incluem catálogo/filtros e clique do Kit Builder que excedeu 120 s; no trace do clique, o botão foi localizado mas permaneceu instável. A probe de banco simultânea estava em HTTP 503, porém isso não prova que causou todas as falhas. | Causa funcional ainda não isolada. Preservar assertions e analisar traces/resultados individuais após backend saudável; não corrigir locator nem atribuir o conjunto à infraestrutura sem reprodução. |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) — última execução disponível, `failure`, SHA `cba9944d` | O setup autenticado não concluiu: chamadas Auth/PostgREST ficaram pendentes e o login expirou em `/login`; nenhuma assertion de layout foi alcançada. | Reexecutar após recuperação do backend antes de considerar o layout validado. Sem alterar specs ou secrets. |

### Runs pendentes, verdes e PR

- `E2E • Swatch QuickView (Lista + Tabela)` [#41081845599](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845599) permanecia `in_progress`: job WebKit falhou e Chromium/Firefox continuavam em execução. Não classificar o workflow como falha antes da conclusão; obter e registrar o resumo final.
- `Deploy Gates` [#41081845653](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845653) concluiu `success`, incluindo Gate Final.
- Também concluíram `success` em `52570b33`: CodeQL, Gitleaks, Lovable Autoheal, Lovable Edit Tracker, No Prod Leak, Policies Baseline, Quote Builder Delivery Quality, Release Please, Required Checks Guard, Security Scan, Select Columns vs Types, SSOT Supabase Guard, Static Health Checks, Supabase Linter Gate e UI · Visual & A11y. `CI - Replenishment Module Quality Gate` tem última execução disponível `success` em `cba9944d` ([#41067472887](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472887)). `cancelled`/`skipped` não foram tratados como falha.
- PR [#2827](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2827), head `3ed514737`: 27 checks; 2 `success`, 2 `skipped`, 1 `neutral`, 22 `queued`/`in_progress`, nenhum failure concluído no snapshot. PR aberto, sem merge; os checks restantes ainda não terminaram.

**Ações pendentes:** administrador investiga o timeout do banco; equipe evita pushes diretos na `main`; após a recuperação, repetir E2Es que não alcançaram assertions. Acompanhar Swatch e CI Security & Drift até conclusão. Nenhuma alteração no Supabase canônico; nenhuma assertion ou gate foi enfraquecido.

## P37 — inventário exaustivo de execuções mais recentes da `main` (2026-10-30T16:35Z)

**HEAD consultado:** `b92bcf876ef2fe28999d28778efaa9fa30e4064c`. Foram enumerados os 119 workflows ativos em duas páginas do GitHub MCP e consultada a última execução de cada um com `branch=main`, excluindo execuções de PR. Na fotografia das 16:35Z: 22 últimas execuções `failure`, 9 sem conclusão, 59 `success`, 8 `skipped`/`cancelled` e 21 sem execução na `main`. Só `conclusion=failure` entra como falha; estados `queued`, `pending` e `in_progress` permanecem pendentes.

### Workflows cuja última execução na `main` falhou

| Workflow | Última execução | Causa comprovada / bloqueio exato | Próximo passo seguro |
|---|---|---|---|
| Branch Protection Sentinel | [#41088401698](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41088401698), SHA `b92bcf8` | O push direto `chore(analise-prs): deliverables sessão 2026-10-30 — prs.csv + dossies` foi rejeitado: `1 commit(s) em push para main sem padrão aceito`. A allowlist aceita `docs(redeploy):`, `chore(workflows):` e `chore(docs):`, não `chore(analise-prs):`. | A falha já está no histórico de `main`; não reescrever nem reverter o inventário sem decisão do PO e não alargar a allowlist. Novas alterações devem entrar por PR e mensagem aceita. |
| Copilot | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | `Processing Request (Linux)` terminou com HTTP 402, `errorCode: quota`: limite de uso adicional do Copilot atingido. | PO/admin: regularizar billing/limite do Copilot e então reexecutar. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Falha no step `Commit, push, and open PR`; o run de 2026-05-25 não expõe jobs nem logs pelo GitHub MCP ou `gh run view`. A causa posterior ao step não pode ser determinada pela evidência disponível. | Pendente: administrador consultar os logs da execução no GitHub. Não regenerar tipos nem criar PR às cegas. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | Conclusão `failure`, mas a API retorna zero jobs e zero arquivos de log; causa técnica não foi exposta. | Pendente: inspecionar o run no GitHub Actions ou abrir nova execução segura na ponta atual. Sem hipótese de correção sem log. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | `Check lockfile sync` encontrou `package.json` e `package-lock.json` divergentes; o script informa que `npm ci` recusaria a instalação. | A checagem local atual `node scripts/check-lockfile-sync.mjs` passou (120 dependências), mas o último run remoto continua sendo o antigo. Reexecutar por fluxo aprovado para confirmar sucesso no SHA atual. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `npm ci` abortou com `EUSAGE`: lockfile em desacordo. Exemplos: Supabase JS `2.117.3` vs `2.118.0`, `jspdf-autotable` `5.0.8` vs `5.0.9`, `lucide-react` `1.54.0` vs `1.58.0`, React/React DOM `19.3.0` vs `19.3.1` e pacotes Supabase relacionados. Os testes não iniciaram. | A checagem local atual do lockfile passou (120 dependências); falta execução remota atual para fechar o item. Não usar `--legacy-peer-deps` nem reduzir gates. |
| Kit Coverage — Integration | [#40999068927](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40999068927) | A integração falhou ao consultar o cache de schema PostgREST da view `v_products_public`: `Could not query the database for the schema cache. Retrying.` | Pendente operacional: repetir quando o banco responder e correlacionar disponibilidade/cache PostgREST. Não aplicar DDL nem alterar schema canônico. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | O modo de atualização de snapshots teve 7 testes falhos; o log registra `[E108] Sem orçamento enviado no ambiente` e `Received: false`. | Provisionar fixture de orçamento no ambiente de teste e executar novamente. Não atualizar snapshots para mascarar falhas funcionais. |
| E2E Discount Approval (04c*) | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | Falhou no preflight `Check lockfile sync`, no mesmo SHA `50f513e` em que Global Search registrou incompatibilidade `package.json`/lockfile. | Incluído no grupo de lockfile; checagem local atual passou, mas requer nova execução remota na ponta atual. |
| E2E • ColorSwatch 2 linhas (Grid) | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | Falhou em `Check lockfile sync`; o step aponta `package.json` e lockfile divergentes e recomenda atualização do lockfile junto com o manifesto. | Incluído no grupo de lockfile; checagem local atual passou, mas requer nova execução remota na ponta atual. |
| E2E · Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | Run terminou `failure`; GitHub MCP e `gh` retornaram zero jobs e nenhum log. | Pendente de diagnóstico no GitHub Actions; não alterar snapshots/assertions sem evidência. |
| E2E · Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | Run terminou `failure`; GitHub MCP e `gh` retornaram zero jobs e nenhum log. | Pendente de diagnóstico no GitHub Actions; não atualizar snapshots às cegas. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | Run terminou `failure`; GitHub MCP e `gh` retornaram zero jobs e nenhum log. | Pendente de diagnóstico no GitHub Actions; não alterar snapshots sem evidência. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolveu o host mascarado da conexão: `could not translate host name "***" to address: Name or service not known`. | PO/admin: validar o secret/hostname DNS da conexão de dry-run. Nenhuma migration foi aplicada. |
| Uptime Monitor | [#41095690515](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41095690515) | Step `Probe site + edge function` falhou (curl exit code 22). O monitor deduplicou a ocorrência contra a issue #2829 com corpo idêntico ao anterior, cujo detalhe é `health-check=22`; site, `check-login` e Auth Health retornaram 0. | Administrador do Supabase canônico: investigar a Edge Function `health-check` e o banco/latência. A conclusão sobre `health-check=22` vem do hash idêntico confirmado pelo dedupe; não houve escrita, DDL ou deploy. |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) | Setup autenticado falhou antes dos testes: `GET auth/v1/user` ficou pendente por 51.134 ms; `storageState.json` não tinha token Supabase. | Reexecutar quando Auth/PostgREST estiverem estáveis; assertions de layout não foram validadas. |
| E2E Cart — Matrix (E79) | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Job `cart-handoff` falhou. O log também registra timeout de 120 s em `locator.click` no teste `cart-delete-popover`, mas esse job foi cancelado; os logs disponíveis não associam o timeout ao job que concluiu em falha. | Inspecionar artifact/trace de `cart-handoff` para identificar a causa. Não atribuir o failure ao teste cancelado nem mudar locators por suposição. |
| E2E Freight — Matrix (E80) | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | `auth.setup` falhou: `[loginViaUI] Timeout aguardando redirect pós-login`; sessão permaneceu na tela de login antes da assertion do fluxo. | Reexecutar após estabilidade de Auth/Supabase e confirmar o fluxo sem enfraquecer o teste. |
| E2E — Critical Flows & Error Boundaries | [#41088401625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41088401625) | No job autenticado, 2 testes de tooltips falharam e 1 passou. `loginViaUI` expirou em 75 s e permaneceu em `/login`; `system_settings` e `get-visitor-info` ficaram pendentes por ~80 s, `v_products_public` por ~61 s e `user_roles` por ~9 s. As assertions de tooltip não foram alcançadas. | Indício operacional de lentidão/indisponibilidade Auth/PostgREST, não falha de assertion do tooltip. Reexecutar após recuperação e examinar traces; não afrouxar os testes. |
| Quote Builder Delivery Quality | [#41088401687](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41088401687), SHA `b92bcf8` | Job `quality-gate`, step E2E: 4 falhas e 1 aprovação. Login permaneceu em `/login` por 75 s; Auth teve HTTP 504 e várias leituras/RPCs Supabase retornaram 503 ou ficaram pendentes por dezenas de segundos. | Repetir após recuperação de Auth/PostgREST; nenhum dos quatro testes de tooltip/layout alcançou validação funcional. |
| E2E Stock — Matrix (E80) | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | Os quatro jobs de teste falharam no `npm ci`; mesma família de divergência de lockfile registrada em #39263929104 no SHA `50f513e`. | A checagem local atual passou; falta rerun remoto na ponta atual. |
| Nightly Full CI | [#40993462227](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40993462227) | `magazine-header` teve 14 E2Es falhos porque `E2E_USER_EMAIL/PASSWORD` não estavam configurados; `color-swatch` teve 8 falhas esperando `[data-testid="product-card"]` por 20 s, sem cards carregados. Dois shards gerais foram cancelados. | PO/admin: provisionar/revisar secrets E2E; investigar disponibilidade dos dados do catálogo para a suíte de swatches. Rerun depois, sem desativar testes. |
| E2E · Atualizar snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | Cinco testes falharam no snapshot de item editor; `getByTestId('quote-editor-unsaved-dialog')` não apareceu dentro de 15 s após a ação. | Reproduzir o fluxo do diálogo e validar a causa da ausência antes de atualizar snapshot ou alterar assertion. |

### Execuções pendentes e workflows verdes

Na enumeração completa final, às 17:11Z, os 119 workflows ficaram assim: 23 últimas execuções `failure`, 5 sem conclusão, 61 `success`, 2 `skipped`, 7 `cancelled` e 21 sem execução na `main`. Desde a fotografia das 16:35Z, Deploy Gates e E2E Personalization concluíram `success`; E2E Critical concluiu `failure` e está na tabela acima; E2E Playwright foi cancelado; CI Security & Drift e Swatch seguem em execução, e os dispatches Deploy Edge Functions, SECURITY DEFINER ACL e `restore_seller_cart` seguem pendentes. A reenumeração conferiu a última execução de cada workflow, e o Uptime Monitor foi atualizado para #41095690515. Se algum dos cinco inconclusivos mudar, revalidar a lista.

Continuam verdes no inventário: Cross-reference PR ↔ Issue, Deploy to Vercel (Manual Fallback), Security Scan, Dependabot Updates, Sync labels, Contract Tests, Gitleaks, Lint untypedFrom, CI Replenishment, Static Health Checks, Lovable Edit Tracker/Autoheal, db-schema-drift-check, Supabase Linter Gate, stock-rupture-fuzz, Quote Number Hardening, E2E Visual Regression (Preview button), schema-snapshot-export, drafts-index-check, UI Visual & A11y, snapshots de confirmação/alerta/dialogs/freight/calendário, E2E Customization Collapse, PDF Quality Gate, PDF Dialog, CRM Callback, URL State, Magazine typed queries, Gate 5 Security Audit, Magazine Ring snapshots/Flakiness/Mutation, SSOT Guard, fuzzers de login/auth, Daily flows, TS Unused Locals Ratchet, capacity-growth-report, DDL detector, PGSS SLO, wraparound-monitor-report, Workflow Lint, Ratchet Weekly, CI Metrics, Policies Baseline, Release Please, No Prod Leak, Select Columns vs Types, E2E Focused UI, Cache Prune, DR Drill Reminder, Python Package using Conda e Mark stale issues/pull requests.

Também concluíram `success` na reconsulta: Deploy Gates [#41088401807](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41088401807) e E2E Personalization [#41088401700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41088401700).

**PR #2827:** a base avançou para `b92bcf8`; houve conflito documental nos relatórios e ele foi reconciliado preservando a sequência mais recente P30–P36 deste PR, seguida deste inventário. A atualização do PR ainda exige concluir os checks do head após o merge da base. Não mesclar enquanto gates e revisão estiverem pendentes, pois o PR altera comportamento da aplicação. Nenhuma alteração em Supabase, secrets, workflows ou assertions foi feita.
