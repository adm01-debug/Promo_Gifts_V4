# Veredito — grupo00 (13 branches apagadas, auditoria byte x byte)

Repo: /home/user/Promo_Gifts_V4 · referência: `origin/main` · somente leitura, nenhuma escrita no GitHub.
Regra aplicada: só é INCORPORADA com citação `arquivo:linha` da main (implementação equivalente com outro
nome conta). Ruído declarado como ruído: lockfile, baseline gerado, `graphify-out/`, dossiê markdown,
snapshot de schema, `qa/reports/`.

## Resumo

| Branch | SHA | Veredito |
|---|---|---|
| importado/vps-fabrica/v2/mockup-assistant-edge-int | 9c99fc5d43 | **APROVEITAR** |
| codex/fix-supabase-ledger-071126-1342 | adde7ae712 | **DECISAO_HUMANA** |
| importado/backup-20261028/codex/stabilization-100 | b9dbeeabd2 | **DESCARTAR** (ancestral exato de next-100) |
| importado/backup-20261028/codex/stabilization-next-100 | 7b38096c93 | INCORPORADA |
| importado/backup-20261028/rescue/local-main-20260909-1145 | 00c1d122af | INCORPORADA |
| fix/e2e-vite-port-isolation | 48926a9da6 | INCORPORADA |
| claude/chore-workflows-snapshot-261108-2230 | 03c177378c | INCORPORADA |
| claude/fix-p09-ledger-sem-ausentes-261112-0120 | d146df99d7 | INCORPORADA |
| claude/fix-gate-e40-allowlist-261101-2310 | 704d978c62 | INCORPORADA |
| chore/graphify-sql-map-20261029 | 94159f01e0 | INCORPORADA |
| chore/graphify-audit-improvements-20261029 | fcc306cc80 | INCORPORADA |
| chore/graphify-audit-pr-update-20261029 | 63d3bd1d77 | INCORPORADA |
| chore/graphify-audit-fixes-20261029 | f2057b47e7 | INCORPORADA |

---

## 1. APROVEITAR — importado/vps-fabrica/v2/mockup-assistant-edge-int (9c99fc5d43)

**O que é, em linguagem de negócio:** o cérebro do assistente "Matheus" da tela de mockup — o chat que
orienta o vendedor sobre posicionamento, tamanho de logo e limite da técnica. Hoje, em produção, esse chat
existe na tela mas **responde que está em desenvolvimento**: `src/components/ai/AIMockupAssistant.tsx:68`
na main define `ASSISTANT_UNAVAILABLE_MSG = 'O assistente de IA para mockup está em desenvolvimento...'`
e `:120` devolve exatamente esse texto em toda pergunta. A tela está em uso
(`src/pages/mockups/MockupGenerator.tsx` importa o componente). Esta branch traz o backend que falta.

**Arquivos (todos ausentes da main — `git ls-tree -r origin/main | grep mockup-assist` = vazio):**
- `supabase/functions/mockup-assistant/index.ts` (171 linhas novas): JWT obrigatório, validação Zod
  (mensagem ≤2000, histórico ≤20), limite de 20 mensagens/min por usuário, modelo resolvido pelo roteador
  com rota Flash obrigatória (`isFlashModel` recusa resposta de outro modelo com 502), cota mensal de IA
  esgotada → 429, texto do cliente nunca vai ao log.
- `supabase/functions/mockup-assistant/index.test.ts` (297 linhas) — teste unitário do contrato.
- `tests/edge-functions/mockup-assistant.test.ts` e `tests/edge-functions/live/mockup-assistant.test.ts` —
  entradas do runner Vitest e do gate `check:edge-live-coverage`.
- `supabase/functions/_shared/edge-authz-manifest.ts` (+4): registra a função como `authenticated`. Na main
  o manifesto tem `generate-mockup` (`:109`) mas **não** `mockup-assistant`.

**Está completo ou pela metade — pela metade, no lado de integração:** o backend está completo e testado;
falta (a) ligar a UI — a branch não toca `src/`, então `AIMockupAssistant.tsx` continuaria respondendo o
texto de "em desenvolvimento"; (b) `[functions.mockup-assistant] verify_jwt = true` em
`supabase/config.toml` (a própria função documenta isso como ação externa); (c) o shim LIVE importa
`descriptorFor("mockup-assistant")` e a main **não** tem esse descritor em
`tests/edge-functions/live/descriptors.ts` — sem acrescentá-lo o teste quebra; (d) o deploy, que só pode
sair por `deploy-edge-functions.yml`.

---

## 2. DECISAO_HUMANA — codex/fix-supabase-ledger-071126-1342 (adde7ae712)

Mexe nos três itens que o Git 7 reserva ao dono: **migration de produção, workflow novo e reconciliação do
histórico remoto de migrations**. Nada disso está na main.

- a migration `20260511235959_bootstrap_public_dependencies_for_application_schemas.sql` (da branch, nao da arvore) (309
  linhas, AUSENTE da main): recria em `public` as tabelas e colunas que nasceram fora de migration
  (`categories` com 29 colunas `ADD COLUMN IF NOT EXISTS`, `material_groups`, `material_types`,
  `product_materials`, `product_category_assignments`, `product_images`, `supplier_branches`,
  `variant_supplier_sources`, `stock_daily_summary`). **Conflito de versão:** a main já usa o número
  `20260511235959` para outra migration — `supabase/migrations/20260511235959_add_categories_full_path_readable_drift.sql`.
  O rollback `supabase/rollbacks/20260511235959_rollback.sql` existe na main, mas pertence a essa outra
  migration (seu texto diz "a coluna já existia em produção... repair-only").
- `.github/workflows/db-reconcile-migration-history.yml` (189 linhas, AUSENTE): apaga entradas obsoletas de
  `supabase_migrations.schema_migrations` em produção, uma versão por vez, com revisor do environment
  `production`.
- `scripts/preflight-migration-history-revert.mjs` (180) + `scripts/migration-history-revert-manifest.json`
  (135) + 3 testes — todos AUSENTES da main.
- `scripts/migration-ledger-remote-only-allowlist.json` (+19) e `supabase/MIGRATIONS_SYNC_LOG.md` (+5).

Não dá para aprovar sozinho: é DDL em produção mais um workflow que escreve no ledger oficial.

---

## 3. DESCARTAR — importado/backup-20261028/codex/stabilization-100 (b9dbeeabd2)

`git merge-base --is-ancestor b9dbeeabd2 7b38096c93` → verdadeiro, e
`git log --oneline 7b38096c93..b9dbeeabd2` → **0 commits**. É um ancestral exato de
`stabilization-next-100`; não tem um único commit próprio. Duplicata.

---

## 4. INCORPORADA — importado/backup-20261028/codex/stabilization-next-100 (7b38096c93)

49 commits, 232 arquivos, base `e42fc237ea` (ago/2026). Varri arquivo por arquivo comparando as linhas
adicionadas com a versão da main. Os 185 arquivos de produção/teste tocados estão na main em versão igual
ou mais evoluída. Provas dos blocos com maior divergência:

- **Decisão de desconto sem falso sucesso** (`src/hooks/quotes/useDiscountApproval.ts`): a main extraiu o
  fluxo para `src/hooks/quotes/discountApprovalResponder.ts:120-161`, com o mesmo `throw
  quoteUpdateResult.error` (`:137`) e o comentário idêntico "O histórico só é registrado depois que o
  estado do orçamento foi confirmado..." (`:141-143`).
- **simulation-orchestrator** (`supabase/functions/simulation-orchestrator/index.ts`): a main tem
  `TARGET_GATES` (`:23`), `targetGate` (`:63-64`), `summarizeSimulationOutcomes` (`:73`), `status:
  "blocked"` (`:76`), `skippedScenario` (`:141`) e o módulo `supabase/functions/simulation-orchestrator/outcomes.ts`;
  além disso exige `authorize(req, { requireRole: "dev", requireAal2: true })` e removeu a persistência em
  `simulation_runs` que a branch testava. Main é superconjunto.
- **Checks inconclusivos sem segredo**: `scripts/check-result-contract.mjs:12-14` na main expõe
  `shouldRequireLive`; `.github/workflows/ci-security-drift.yml:84,92,100` roda `check:lint-0029`,
  `check:lint-0011` e `check:secdef-anon` com `--require-live`;
  `.github/workflows/supabase-security-gate.yml:108,118` roda `check-rpc-get-profile-and-roles.mjs` e
  `check-rpc-permissions.mjs` com `--require-live`. `scripts/check-rpc-permissions.mjs` na main é ainda mais
  forte: prova pelo comportamento real (espera 42501 do PostgREST) e diz no cabeçalho que "auditoria de
  catálogo não deve depender de expor information_schema" — refuta a abordagem da branch.
- **Gates 2.4.1/2.4.2 do `quality-gate.yml`** (arquivo que a main apagou): rodam em
  `.github/workflows/deploy-gates.yml:258-259` (`check-supabase-reference-catalog.mjs`,
  `check-migration-filename-contract.mjs`).
- **Erro textual da edge preservado** (`src/lib/edge/safeInvokeCall.ts`): a main faz o mesmo com
  `extractBodyMessage` e `extractContextBody` (`:78-125`) e `NormalizedError.body` (`:64-69`).
- **vite.config.ts** (migração esbuild→Rolldown/Oxc): main `vite.config.ts:58-62` já tem
  `treeshake.manualPureFunctions`.
- **bitrix-sync**: a branch congelava o falso verde do `sync_full`; a main foi além e o proíbe —
  `supabase/functions/bitrix-sync/handler_characterization_test.ts:9` ("`sync_full` nunca reporte sucesso
  quando o upsert local falhar").
- **webhook-inbound / KitBuilderPage / ema-pipeline-health / rpc-live-evidence**: versões da main são
  maiores (531 vs 239, 464 vs 109, 147 vs 120, 218 vs 173 linhas).
- **7 ADRs + 22 documentos de ago/2026**: todos na main sob `docs/arquivo/2026-08/` (33 arquivos);
  `comm -23` dos basenames do diff contra os da main = vazio.
- Ruído: `package-lock.json`, `.eslint-baseline.json`, `bundle-size-baseline.json`,
  `audit/supabase-reference-catalog.temporary.json`, `qa/reports/*`, `public/schemas/*`.
- Puro reformat: `src/contexts/CollectionsContext.tsx` (quebra de import, dois comentários),
  `src/services/magazineService.ts` (quebra de cadeia), `src/App.tsx` (um comentário).

**Resíduo único, só de teste (não é código de produção):** o bloco estático
`'valida SVG antes do caminho que invoca a edge function'` que a branch acrescentou a
`src/hooks/mockup/__tests__/mockup-audit.test.ts` não existe na main. O **comportamento** que ele guarda
está na main: `src/hooks/mockup/mockupGenerationService.ts:419` chama `assertNotSvg(areasWithLogos)` com o
comentário "BUG-E: pre-validate BEFORE the (expensive) edge invocation", antes do `invokeMockupForArea`
(`:422`). Perda de rede de proteção, não de função.

---

## 5. INCORPORADA — importado/backup-20261028/rescue/local-main-20260909-1145 (00c1d122af)

- **Watchers não contam sucesso quando a notificação falha**: idêntico na main —
  `supabase/functions/collections-watcher/index.ts:116,131-133` e
  `supabase/functions/favorites-watcher/index.ts:108,123-125`. Os dois
  `notification-insert.contract_test.ts` também estão na main.
- **invokeEdge → invokeEdgeSafe** (`src/hooks/mockup/mockupGenerationService.ts`, `src/lib/crm-db.ts`,
  `src/lib/external-db/invoke.ts`): a main resolveu de forma equivalente e mais limpa — `invokeEdge` é um
  adaptador fino sobre `invokeEdgeSafe` (`src/lib/edge/safeInvokeCall.ts:302-325`), então todos esses
  chamadores já passam pelos breakers, retries e normalização. A refatoração da branch é redundante.
- **Mensagem de erro da edge a partir de objeto**: `src/lib/external-db/invoke.ts:139-152` na main.
- **date-picker-field**: main é mais evoluída — `src/components/ui/date-picker-field.tsx:65,144,154`
  converte `aria-invalid` em `data-invalid` (a branch só repassava `aria-invalid`).
- **check-package-duplicate-scripts**: a main corrige o mesmo bug de cursor por outro caminho —
  `scripts/check-package-duplicate-scripts.mjs:44-79` conta profundidade e usa `i = prop.next` com
  comentário explicando por que não se deve rebobinar.
- **check-eslint-baseline / minimatch**: main usa `createRequire` — `scripts/check-eslint-baseline.mjs:29`.
- Ruído: 2 dossiês markdown de 455 e 164 linhas, `qa/reports/*`, `public/schemas/*` (+1 linha cada),
  remoção de `supabase/.temp/cli-latest`.

## 6. INCORPORADA — fix/e2e-vite-port-isolation (48926a9da6)

Tudo na main, em versão igual ou maior:
`playwright.config.ts:7,12-17,176-178` (`E2E_FORCE_START_SERVER`, `--strictPort`; a main ainda acrescentou
o caminho `build && preview`); `.github/workflows/replenishment-quality.yml:47-48`
(`E2E_BASE_URL`/`E2E_FORCE_START_SERVER`); `src/pages/dev/UndoToastHarness.tsx:37,46,48` (modo
`interactive`); `e2e/flows/26-catalog-to-kit-flow.spec.ts:13` (`SERVER_ERROR_MESSAGE`);
`e2e/flows/magazine-header-align.spec.ts:49` e `magazine-header-responsive.spec.ts:47` ("Abrir revista");
`e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:75-76` (harness `/__test/undo-toast?interactive=1`);
`e2e/catalog/novidades-reposicao-card-parity.spec.ts:427-437` (`rowSpreads`);
`e2e/flows/04p-quotes-expiration-column.spec.ts:139-234,431` (interceptação REST bem mais completa que a da
branch). Ruído: `graphify-out/*`, `PENDENCIAS.md`, `RELATORIO_CI.md`.

## 7. INCORPORADA — claude/chore-workflows-snapshot-261108-2230 (03c177378c)

Os 14 workflows foram deliberadamente fundidos ou apagados na main, e isso está escrito:
`.github/workflows/update-snapshots.yml:4-32` lista pelo nome os 11 updaters de snapshot que ele substitui
(alert-dialog, calendar, confirm-dialog, dialog, editor-sheet, magazine-ring, quote-conditions,
quote-freight, quote-missing-fields, quote-no-pres, update-quote-reset) e explica que as variações viraram
inputs `spec/project/safe_mode/mode/dev_server`.
`docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:43-49` registra a Fase 1 ("apagados `python-package-conda.yml`,
`_template.yml`, `magazine-typed-queries.yml`"), `:64` justifica DELETAR o `_template.yml`, `:178` o
`python-package-conda.yml` (no-op) e `:180` o `magazine-typed-queries.yml` ("dry-run de uma migração já
concluída... `types.ts` já tem `magazines:`" — confirmado: a main tem `magazine_items` em
`src/integrations/supabase/types.ts`). Nada a resgatar.

## 8. INCORPORADA — claude/fix-p09-ledger-sem-ausentes-261112-0120 (d146df99d7)

A migration da branch (a migration `20261112013000_p09_reconcile_ledger_schema_migrations.sql` (da branch, nao da arvore), 410
linhas) foi **substituída por uma versão mais rigorosa já na main**:
`supabase/migrations/20261114014500_p09_reconcile_ledger_schema_migrations.sql:25-34` diz textualmente
"REVISÃO 2026-11-14 (versão 20261114014500, supersede #3411; **20261112013000 nunca foi aplicada**)" e
remove outras 23 versões + `20261101210000` do registro, fechando em 360 versões. O rollback correspondente
está em `supabase/rollbacks/20261114014500_rollback.sql`.

## 9. INCORPORADA — claude/fix-gate-e40-allowlist-261101-2310 (704d978c62)

As 657 versões da allowlist da branch estão **todas** na main:
`comm -23` das versões de `scripts/migration-ledger-remote-only-allowlist.json` (branch) contra a da main
(`:1`, JSON em linha única, 672 versões) = vazio. Resto é ruído: `PENDENCIAS.md` (+24) e um dossiê em
`analise-branches/dossies/` (+1).

## 10. INCORPORADA — chore/graphify-sql-map-20261029 (94159f01e0)

Mesmas três ferramentas, renomeadas de snake_case para kebab-case na main:
`scripts/graphify/build_sql_map.py` → `scripts/graphify/build-sql-graph.py:1-35` (mesmo propósito: copia só
os `*.sql` versionados para um corpus temporário e gera grafo isolado);
`enrich_typescript_references.mjs` → `scripts/graphify/enrich-typescript-references.mjs:33,61-75,112-177`;
`postprocess_report.mjs` → `scripts/graphify/postprocess-report.mjs` + `scripts/graphify/graph-metrics.mjs:13,36-38,50-54,91,108-109`
(a lógica de exclusão de lockfile/config/dependência que a branch tinha inline).
Os dois testes estão em `tests/scripts/graphify-typescript-references.test.mjs` e
`tests/scripts/graphify-metrics.test.mjs`. O bloco `*.sql` da branch está em `.graphifyignore` da main
(seção "SQL EM MAPA SEPARADO"). O `docs/graphify/README.md` (49 linhas) não existe com esse nome, mas seu
conteúdo — regeneração, versão homologada, benchmark 0.9.68 vs 0.9.97 e a métrica de conectividade — está
em `docs/graphify/AUDITORIA_MAPAS_E_BENCHMARK_2026-10-29.md`.

## 11–13. INCORPORADA — as três branches chore/graphify-audit-* (fcc306cc80, 63d3bd1d77, f2057b47e7)

Comparação byte a byte contra a main:
- `63d3bd1d77` e `f2057b47e7`: `build-sql-graph.py`, `enrich-typescript-references.mjs`,
  `graph-metrics.mjs`, `graphify-metrics.test.mjs`, `graphify-typescript-references.test.mjs` e
  `.graphifyignore` são **idênticos** aos da main, e o bloco `graphify:*` do `package.json` também
  (`package.json:66-69`). Só `scripts/graphify/postprocess-report.mjs` difere, e a main é superconjunto:
  acrescentou a guarda `existsSync` com mensagem clara em vez de stack trace de ENOENT (`:2,7-13`).
- `fcc306cc80` é a versão anterior das mesmas mudanças (83/208/146/80/71 linhas contra 101/197/170/100/96 na
  main). A única coisa que a main não levou é a função `fileNode` do enriquecedor, e isso foi decisão de
  projeto: a main deixou de criar nós sintéticos e passou a contar os casos
  (`scripts/graphify/enrich-typescript-references.mjs:112-114,125-127,194-196`, `skippedUnmappedSources`).
- Resto é ruído puro: `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` (dezenas de milhares de
  linhas de arquivo gerado), `PENDENCIAS.md`, `RELATORIO_CI.md` e a auditoria markdown.
