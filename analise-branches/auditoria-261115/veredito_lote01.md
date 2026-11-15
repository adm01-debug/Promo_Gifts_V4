# Veredito — lote 01 (11 branches)

Base de comparação: `origin/main` (2251 commits). Tudo verificado por leitura de diff + busca do
equivalente na main (arquivo:linha) + 3 consultas read-only ao banco canônico `doufsxqlfjyuvxuezpln`.
Nenhuma escrita, nenhum push, nenhuma branch tocada.

---

## 1. `claude_pink/sleepy-cannon-h000nc`
**Veredito: DESCARTAR**

Resumo: só relatório de análise de PRs feito por outro agente, mais uma mudança que **afrouxa** uma
trava de qualidade. Nada a resgatar.

Provas:
- 132 arquivos no diff; **131 estão em `analise-prs/`** (dossiês `PR-33xx.md`, `prs.json`, `progresso.json`,
  `baseline/*`) — ruído de relatório por definição do método.
  Contagem: `git diff --name-only <mb> origin/claude_pink/sleepy-cannon-h000nc | grep -vc '^analise-prs/'` → 1.
- O único arquivo fora de `analise-prs/` é `.eslint-baseline-scope.json`, e a mudança é
  `"mode": "full"` → `"mode": "incremental"`. A main está em `full` (mais rigoroso):
  `origin/main:.eslint-baseline-scope.json:3`. Trazer isso seria regressão, não resgate.

## 2. `claude/wip-assistente-encaixe-cliente-261115-0400`
**Veredito: APROVEITAR**

Resumo: o card "Encaixe do Cliente" na ficha do cliente — recomenda brindes por ramo de atividade,
cor da marca, giro, novidade, gravação, preço e estoque, com o motivo escrito para o vendedor.
Trabalho **completo ponta a ponta** e 100% ausente da main.

Tamanho: 19 arquivos, **+3.634 linhas** (1 commit, `00b1f75d3`).

O que é:
- Função de banco que escolhe e pontua os candidatos: `supabase/migrations/20261115034500_rpc_sales_assistant_candidates.sql` (+203) e `supabase/rollbacks/20261115034500_rollback.sql` (+15).
- Hooks: `src/hooks/assistant/useSalesAssistantCandidates.ts` (+293), `useClientBrandSignals.ts` (+301).
- Regras de negócio: `src/lib/assistant/buildReason.ts` (+309), `logoColorToGroups.ts` (+224), `ramoAliases.ts` (+345).
- UI: `src/components/assistant/SalesAssistantCard.tsx` (+164), `SalesAssistantProductRow.tsx` (+169), `SalesAssistantStates.tsx` (+152), `index.ts`.
- Testes: 5 arquivos, **+1.430 linhas** de teste.
- Integração real na rota: `src/pages/clients/ClientDetailPage.tsx` monta `<SalesAssistantCard clientId={id} />`.
- Tipos: `src/types/crm.ts` (+7, `brand_colors`/`cores_marca`); `src/utils/color-matching.ts` exporta `rgbToLab`/`hexToRgb`/`deltaE` (3 linhas).

Provas de ausência na main:
- `git grep -l -E 'SalesAssistant|useSalesAssistantCandidates|useClientBrandSignals|logoColorToGroups|ramoAliases|sales_assistant_candidates' origin/main -- src supabase scripts` → **vazio**.
- Diretórios `src/components/assistant`, `src/hooks/assistant`, `src/lib/assistant` **não existem** na main.
- A função nem existe em produção: `select proname from pg_proc where proname ilike '%sales_assistant%'` no
  canônico `doufsxqlfjyuvxuezpln` → **0 linhas**. Ou seja, a entrega nunca foi aplicada por outro caminho.

Completo ou pela metade: **completo** para a fase 1 declarada. Sem mock, sem hardcode, sem TODO
(varredura: os únicos "todo" são a palavra portuguesa "todo/todos" em comentários e testes).
Ressalva de merge: a PR nasce com migration nova — vai a produção só pelo workflow `db-apply-migration.yml`,
como manda o AGENTS.md. A RPC é aditiva (`CREATE FUNCTION`), não mexe em dado existente.

## 3. `recuperado/chore-workflows-snapshot-261108-2230`
**Veredito: INCORPORADA**

Resumo: são 14 workflows de CI que a main **apagou de propósito** ao consolidá-los em um só.
Trazer de volta desfaria essa limpeza.

Provas:
- `origin/main:.github/workflows/update-snapshots.yml:3-27` é o workflow único de regeneração de snapshots
  e **lista nome por nome** os 12 updaters que substituiu — exatamente os 12 desta branch
  (`e2e-update-alert-dialog-snapshots.yml`, `…-calendar-…`, `…-confirm-dialog-…`, `…-dialog-…`,
  `…-editor-sheet-…`, `…-magazine-ring-…`, `…-quote-conditions-…`, `…-quote-freight-…`,
  `…-quote-missing-fields-…`, `…-quote-no-pres-…`, `update-quote-reset-snapshots.yml`).
  Cada variação virou input (`spec`, `project`, `safe_mode`, `mode`, `dev_server`) — 455 linhas na main.
- Os 14 arquivos saíram da main no mesmo commit: `b80917f60` — *"chore(ci): gestão de workflows fase 1 —
  106 → 92 (12 updaters em 1, 3 obsoletos, 3 duplicados ajustados) (#3055)"*, de **2026-11-03**.
- A branch saiu da main em **2026-11-08 17:34** (merge-base `ed0733f91c`), ou seja **5 dias depois** da
  consolidação, e re-adicionou os arquivos já removidos. É restauração de estado antigo, não trabalho novo.
- `python-package-conda.yml` é o template padrão do GitHub já convertido em no-op e removido pelo #3055 —
  o próprio arquivo diz "Remoção definitiva via PR separado". Ruído.
- `magazine-typed-queries.yml` e `_template.yml` também foram removidos pelo #3055; a main documenta a
  decisão em `origin/main:docs/auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md:200`
  ("Remover ou reescrever junto com MR-003 — verificação de CI que pode gastar tempo/alarmar sem servir a nada").

## 4. `claude/chore-analise-prs-261030-1600`
**Veredito: DESCARTAR**

Resumo: relatório de análise de PRs da sessão 2026-10-30. Zero arquivos de código.

Provas: 24 arquivos no diff, **todos** sob `analise-prs/` (`RELATORIO_PRS.md`, 17 dossiês `PR-28xx.md`,
`prs.json`, `prs.csv`, `progresso.json`, `baseline/*`).
`git diff --name-only <mb> origin/claude/chore-analise-prs-261030-1600 | grep -vc '^analise-prs/'` → **0**.

## 5. `claude_05/serene-clarke-1o02ey`
**Veredito: DESCARTAR**

Resumo: mesmo gênero — relatório de análise de 45 PRs. Zero código.

Provas: 15 arquivos, **todos** em `analise-prs/` (`grep -vc '^analise-prs/'` → **0**): `RELATORIO_PRS.md`,
10 dossiês `PR-29xx.md`, `prs.csv`, `prs.json`, `progresso.json`, `baseline/README.md`.

## 6. `claude/laughing-cori-o9w35e`
**Veredito: INCORPORADA**

Resumo: era uma sessão de conserto de CI; cada conserto que valia já está na main, em versão igual ou
melhor. O que sobrou é relatório, baseline gerado e um remendo que hoje seria regressão.

Provas, item por item:
- `src/hooks/common/useListUrlState.ts` (+27, bloco "Sync-on-mount" que limpa params default da URL):
  **idêntico na main**, `origin/main:src/hooks/common/useListUrlState.ts:139-157`.
- `package.json` (`--max-old-space-size=512` → `4096` no lint-staged): já na main, `origin/main:package.json:312`.
- `scripts/check-eslint-baseline.mjs` (`NODE_OPTIONS: '--max-old-space-size=4096'`): já na main, linha **86**.
- `src/lib/kit-builder/types.ts` (`KitOrigin` reordenado): já na main, linha **178**.
- `src/components/kit-builder/KitMakerLanding.tsx` / `useKitBuilderPageState.ts` (import inline → `import type`):
  já na main, `KitMakerLanding.tsx:30` e `:34`.
- `src/hooks/stock/useRuptureAlerts.ts` (+8): única diferença viva — a main ainda usa
  `(supabase as any).rpc(...)` com `eslint-disable` (`origin/main:src/hooks/stock/useRuptureAlerts.ts:73-74`),
  a branch troca por `untypedRpc` (que **existe** na main: `origin/main:src/lib/supabase-untyped.ts:63`).
  É cosmética de lint, 8 linhas, sem efeito de comportamento.
- `supabase/migrations/20261102063000_repair_kill_switch_hits_anon_rate_guard.sql` (+9, ausente da main):
  **obsoleta**. Consultei o canônico `doufsxqlfjyuvxuezpln`: o trigger que ela recria já está lá e ativo —
  `pg_trigger` → `trg_anon_rate_guard` em `kill_switch_hits`, `tgenabled='O'`. O defeito que ela consertava
  não existe mais.
- 6 workflows (`contract-tests`, `db-apply-migration`, `db-schema-drift-check`, `deploy-gates`,
  `edge-functions-drift-check`, `schema-snapshot-export`): a branch substitui `supabase/setup-cli@v2` por
  `wget` manual e **remove** SBOM + attestation de proveniência, por causa de um bloqueio de política de
  Actions (P46). A main seguiu o caminho oposto e continua com as actions, em pin mais novo:
  `origin/main:.github/workflows/contract-tests.yml:83` (`setup-cli@689adcfb…`),
  `deploy-gates.yml:86` (`dorny/paths-filter`), `:784` (`anchore/sbom-action`), `:791`
  (`actions/attest-build-provenance`). Aplicar a branch hoje **removeria** SBOM e proveniência do build.
- Ruído declarado: `PENDENCIAS.md` (+762) e `RELATORIO_CI.md` são relatório/histórico;
  `.as-assertions-baseline.json`, `.file-size-baseline.json`, `.migration-refs-baseline.json` e
  `audit/supabase-reference-catalog.temporary.json` são baseline gerado.

## 7. `importado/vps-fabrica/v2/mockup-assistant-tests-int`
**Veredito: APROVEITAR**

Resumo: o assistente "Matheus" — um chat que orienta o cliente sobre como a arte fica no brinde
(técnica, dimensões, logo), sem gerar imagem. A edge function e os testes existem e a main **não tem nada
equivalente**; pior, a main já cita essa função como se ela existisse.

Tamanho: 6 arquivos, **+617 linhas** (5 commits, de `af32f959f` a `453670f91`).

O que é:
- `supabase/functions/mockup-assistant/index.ts` (+171) — JWT obrigatório (401), validação Zod (422),
  20 mensagens/min por usuário (429), modelo preso à rota Flash (resposta de outro modelo → 502),
  cota mensal esgotada → 429, texto do cliente nunca vai ao log.
- `supabase/functions/mockup-assistant/index.test.ts` (+266) e 3 arquivos em `tests/edge-functions/`
  (integração +159, shim live +8, contrato +9).
- `supabase/functions/_shared/edge-authz-manifest.ts` (+4) — registra a função como `authenticated`.

Provas de ausência na main:
- `git ls-tree origin/main supabase/functions/` → existe `generate-mockup` (compositor de canvas, coisa
  diferente), **não** existe `mockup-assistant`.
- Única entrada de mockup no manifesto da main: `origin/main:supabase/functions/_shared/edge-authz-manifest.ts:109`
  = `generate-mockup`.
- **Indício de que isto é trabalho perdido, não descartado:** a main referencia a função como padrão
  existente — `origin/main:supabase/functions/word-magic/index.ts:96` ("Mesmo padrão da edge mockup-assistant:
  401 → 429 → 4xx do corpo") e `origin/main:tests/edge-functions/generate-ad-prompt.timeout.test.ts:4`
  aponta para `tests/edge-functions/mockup-assistant.test.ts`, arquivo que **não existe** na main.

Completo ou pela metade: **pela metade.** O backend está inteiro e testado, mas falta (a) o pin
`verify_jwt` em `supabase/config.toml` — a main só tem `[functions.generate-mockup]` na linha 116 — e
(b) qualquer tela que chame a função: `git grep 'mockup-assistant' origin/main -- src` → vazio. Os próprios
comentários do código dizem que o deploy e o `config.toml` eram "ação do Joaquim, fora deste PR".

## 8. `claude_04/optimistic-lovelace-n960f7`
**Veredito: DESCARTAR**

Resumo: relatório de análise de PRs, 3 arquivos, zero código.

Provas: `analise-prs/RELATORIO_PRS.md` (+419), `analise-prs/progresso.json`, `analise-prs/prs.json`.
`grep -vc '^analise-prs/'` → **0**. Mesmo gênero das branches 1, 4 e 5 (sessões diferentes, não duplicata exata).

## 9. `recuperado/chore/graphify-sql-map-20261029`
**Veredito: INCORPORADA**

Resumo: separar o mapa SQL do mapa de código no grafo — a main já faz isso, com scripts renomeados e
mais completos.

Provas (branch → equivalente na main):
- `.graphifyignore` `*.sql`: já na main, `origin/main:.graphifyignore:55`.
- `scripts/graphify/build_sql_map.py` (76 l.) → `origin/main:scripts/graphify/build-sql-graph.py` (**101 l.**,
  com `argparse` e hashing; mesmo docstring de propósito: "Build a Graphify map from repository SQL files
  in an isolated output directory").
- `scripts/graphify/enrich_typescript_references.mjs` (222 l.) → `origin/main:scripts/graphify/enrich-typescript-references.mjs`
  (197 l.; mesma função-chave `typeSymbolAt`, mesmo papel de extrair arestas de referência de tipo).
- `scripts/graphify/postprocess_report.mjs` (105 l.) → main refatorou em dois: `postprocess-report.mjs`
  (20 l., orquestrador) + `origin/main:scripts/graphify/graph-metrics.mjs:96` (`replaceKnowledgeGapMetrics`,
  `calculateLowConnectivity`, `synchronizeSummaryCounts`) — superconjunto do `lowConnectivityNodes`/
  `replaceKnowledgeGapMetric` da branch.
- Testes: `tests/scripts/enrich-typescript-references.test.mjs` e `postprocess-graphify-report.test.mjs` →
  `origin/main:tests/scripts/graphify-typescript-references.test.mjs` e `graphify-metrics.test.mjs`
  (este último exercita as 3 funções, inclusive `exclusionReason`).
- Só `docs/graphify/README.md` (+33) não tem equivalente direto; a main tem
  `docs/graphify/AUDITORIA_MAPAS_E_BENCHMARK_2026-10-29.md`. É documentação, não código.

## 10. `claude/chore-e2e-modules-matrix-261102-2115`
**Veredito: DECISAO_HUMANA**

O que precisa ser decidido: é a **Fase 2** da consolidação de CI — uma matriz única que substitui 16
workflows de E2E, mas a branch só **adiciona** o arquivo novo e **não apaga** os 16 antigos, que seguem na
main. Mergear como está dobraria o tempo e o custo de E2E em toda PR; e apagar os 16 mexe nos checks
obrigatórios (`.github/required-checks.json`), o que o Git 7 do AGENTS.md reserva ao dono.

É trabalho de verdade, ausente da main: 1 arquivo, **+489 linhas**, 6 commits — sendo 5 deles correções de
achados de revisão (Codex P1×3/P2, Qodo Medium, colisão de nome de job com `e2e-quotes.yml`).

Provas:
- `.github/workflows/e2e-modules.yml` **não existe** na main (`git ls-tree origin/main .github/workflows/ | grep modules` → vazio).
- O cabeçalho do arquivo (linhas 3-17) lista os 16 que ele substitui; verifiquei um por um: **todos os 16
  continuam na main** (`e2e-cart.yml`, `e2e-check-calendar-snapshots.yml`, `e2e-color-swatch-grid.yml`,
  `e2e-dialogs-pr-check.yml`, `e2e-discount-approval.yml`, `e2e-flows.yml`, `e2e-focused.yml`,
  `e2e-freight.yml`, `e2e-magazine-header.yml`, `e2e-pdf-dialog.yml`, `e2e-personalization.yml`,
  `e2e-quotes.yml`, `e2e-stock.yml`, `e2e-swatch-quickview.yml`, `e2e-visual-preview-button.yml`,
  `optimized-image-e2e.yml`).
- `git diff --name-status <mb> origin/claude/chore-e2e-modules-matrix-261102-2115` → uma única linha:
  `A .github/workflows/e2e-modules.yml`. Nenhuma remoção. Logo, **pela metade**.

## 11. `codex/fix-db-migration-preflight-261107`
**Veredito: APROVEITAR**

Resumo: tem uma correção de segurança pequena e real que a main não tem — hoje, o script de reversão
daquela migration **reabriria** uma função de limpeza de sessões de autenticação para usuário anônimo.
O resto da branch (99%) a main já resolveu de outra forma e **não** deve ser trazido.

O que resgatar (≈40 linhas, 3 arquivos):
- `supabase/rollbacks/20261101202000_rollback.sql` — torna a reversão *fail-closed*: troca os 3
  `GRANT EXECUTE … TO PUBLIC/anon/authenticated` por um `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated`,
  idempotente.
- `tests/security/security-definer-acl-gate.test.ts` (+15) — dois testes que travam isso: o rollback não
  pode casar `GRANT EXECUTE … PUBLIC|anon|authenticated` e tem de conter o `REVOKE` canônico.
- `supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql` (+4/-2) — só o comentário
  de rollback, para não mentir sobre o que o script faz.

Provas:
- O arquivo da main hoje: `origin/main:supabase/rollbacks/20261101202000_rollback.sql` contém literalmente
  `GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO PUBLIC;` + `TO anon;` + `TO authenticated;`.
- `git show origin/main:tests/security/security-definer-acl-gate.test.ts | grep 'rollback\|cleanup_expired_auth_sessions'`
  → **vazio**: não existe guarda na main.
- Estado real em produção (canônico `doufsxqlfjyuvxuezpln`):
  `has_function_privilege('authenticated','public.cleanup_expired_auth_sessions()','EXECUTE')` = **false**,
  idem `anon` = **false**. Ou seja, o banco está fechado e o rollback da main, se rodado, abriria.

O que **não** trazer (já incorporado de outra forma na main, verificado):
- Reconciliação do ledger por conjuntos (`versionsDigest`, `validateRemoteOnlyAllowlist`, +193 em
  `scripts/check-supabase-migration-ledger.mjs`): a main resolveu o mesmo defeito do pareamento sequencial
  da CLI por subtração de contagem, em **2026-11-12** (depois desta branch) —
  `origin/main:scripts/check-supabase-migration-ledger.mjs:68-88` (`pairedLate`, `countOf`) e
  `:89-90` (`allowlistedRemoteOnly`/`blockingRemoteOnly`).
- `scripts/drift-baseline.mjs` (+79): os três consertos da branch estão na main, em versão mais estrita —
  normalização de `CREATE INDEX CONCURRENTLY` no replay: `origin/main:scripts/drift-baseline.mjs:356`
  (`sanitizeReplayMigration`, com allowlist por arquivo e contagem esperada); semente do job de cron
  `generate-blurhashes`: `:128-130`; `ALTER PUBLICATION supabase_realtime ADD TABLE auth.users`: `:178-186`.
  A main tem 1.254 linhas contra 1.210 da branch — a main está à frente.
- Renomes `20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` → `…143505_…_hardened.sql` e
  `20261101190101_fn_global_search_clamp_limit.sql` → `…143509_…_hardened.sql`: a main seguiu outro caminho —
  tem `supabase/migrations/20261112011000_fix_sb0003_fn_get_rupture_alerts.sql` (versão posterior) e mantém
  `20261101190101_fn_global_search_clamp_limit.sql` com o nome original. Trazer os renomes brigaria com o ledger.
- `PENDENCIAS.md`, `supabase/MIGRATIONS_SYNC_LOG.md`, `audit/supabase-reference-catalog.temporary.json` e
  `scripts/migration-ledger-remote-only-allowlist.json`: histórico/baseline gerado = ruído.
- Opcional, baixo valor: `+4` paths em `db-schema-drift-check.yml` e o padrão de `grep` em
  `deploy-gates.yml:786` fazem o drift-check disparar quando o script do ledger muda. A main não tem
  (`git show origin/main:.github/workflows/deploy-gates.yml | grep check-supabase-migration-ledger` → vazio).
  É mudança de workflow → se for levada, vai separada e com o dono ciente.

---

## Tabela final

| branch | veredito | o que resgatar |
|---|---|---|
| `claude/wip-assistente-encaixe-cliente-261115-0400` | **APROVEITAR** | Card "Encaixe do Cliente" completo: RPC + rollback, 2 hooks, 3 libs de regra, 3 componentes, 5 suítes de teste, já ligado em `ClientDetailPage.tsx`. 19 arquivos, +3.634 linhas. Merge pelo `db-apply-migration.yml` (migration nova, aditiva). |
| `importado/vps-fabrica/v2/mockup-assistant-tests-int` | **APROVEITAR** | Edge `mockup-assistant` (assistente "Matheus") + 4 arquivos de teste + registro no manifesto de authz. 6 arquivos, +617 linhas. **Pela metade**: falta `verify_jwt` no `config.toml` e a tela que a chama. |
| `codex/fix-db-migration-preflight-261107` | **APROVEITAR** | Só 3 arquivos (~40 linhas): rollback `20261101202000` *fail-closed* (a main reabriria EXECUTE para `anon`) + 2 testes de guarda + comentário. **O resto da branch não deve ser trazido.** |
| `claude/chore-e2e-modules-matrix-261102-2115` | **DECISAO_HUMANA** | Matriz `e2e-modules.yml` (+489 linhas) que substituiria 16 workflows de E2E, mas não apaga nenhum deles. Mergear dobra o custo de CI; apagar os 16 mexe nos checks obrigatórios. Dono decide. |
| `recuperado/chore-workflows-snapshot-261108-2230` | **INCORPORADA** | Nada. Os 14 workflows foram consolidados em `update-snapshots.yml` (main:3-27) e removidos pelo #3055 (`b80917f60`); a branch os re-adiciona 5 dias depois. |
| `claude/laughing-cori-o9w35e` | **INCORPORADA** | Nada. Hook, lint-staged, memória do eslint e tipos já na main; migration de reparo obsoleta (trigger já ativo em produção); remendo de workflow removeria SBOM/proveniência. |
| `recuperado/chore/graphify-sql-map-20261029` | **INCORPORADA** | Nada de código. Os 3 scripts e os 2 testes existem na main renomeados e mais completos; `*.sql` já no `.graphifyignore:55`. Sobra só um `README.md` de 33 linhas. |
| `claude_pink/sleepy-cannon-h000nc` | **DESCARTAR** | Nada. 131 de 132 arquivos são dossiê de PR; o 132º afrouxa o gate do eslint (`full` → `incremental`), o oposto da main. |
| `claude/chore-analise-prs-261030-1600` | **DESCARTAR** | Nada. 24 arquivos, todos em `analise-prs/`. |
| `claude_05/serene-clarke-1o02ey` | **DESCARTAR** | Nada. 15 arquivos, todos em `analise-prs/`. |
| `claude_04/optimistic-lovelace-n960f7` | **DESCARTAR** | Nada. 3 arquivos, todos em `analise-prs/`. |
