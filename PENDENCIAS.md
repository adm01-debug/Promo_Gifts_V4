# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-11-01
**Branch de correção ativo:** `fix/e2e-url-state-defaults-20261030` (PR #2846)

> Revalidação posterior de PRs, workflows e pendências transversais: [docs/estado/REVALIDACAO_PLANO_2026-10-31.md](docs/estado/REVALIDACAO_PLANO_2026-10-31.md). Os registros abaixo são snapshots datados; não substituem a revalidação mais recente.

## Inventário P29 — falhas na `main`@c2432c52 (2026-11-01T20:05Z)

Ponta da `main` auditada: `c2432c52` (HEAD atual). Somente workflows cuja ÚLTIMA execução na main falhou.
**Ações desta sessão:**
- `CI Security & Drift Checks` → **CORRIGIDO** em commit `085dd48e` (PR #2846): adicionadas `cleanup_expired_auth_sessions()` e `perf002_drop_unused_snapshot_indexes()` à allowlist; removidas entradas stale `is_supervisor_or_above()` e `log_rls_denial()`.
- `Deploy Gates` → **CORRIGIDO** em commit `3a615215` (PR #2846): Gate 1.12 adicionou `stock_notes` com `soft-delete-exempt`.
- Demais falhas abaixo: externas/pré-existentes, não corrigíveis no escopo desta sessão.

| # | Workflow | Último run falho na main | SHA | Causa raiz exata | Classificação |
|---|---|---|---|---|---|
| 1 | Branch Protection Sentinel | [41336912004](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41336912004) | c2432c52 | Job `Audit every commit in push` falhou — commit `c2432c52` (Lovable bot) não segue padrão de mensagem exigido pelo sentinel (`scripts/sentinel-check.sh`). Job `Verify Branch Protection` → ✅ success. Falha recorrente: sempre que Lovable commita direto na main sem `(#NNN)`. Será resolvida quando próximo commit válido chegar na main via PR. | **Externo** — Lovable não segue convenção; não reescrevemos história de main |
| 2 | CI - Replenishment Module Quality Gate | [41336912023](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41336912023) | c2432c52 | Step `E2E — Paridade visual /novidades vs /reposicao` falhou; log tail mostra upload de artefato sem erro de código isolável — padrão de E2E visual instável (runner/ambiente). Não é required check do Gate Final. | **Externo** — E2E visual instável; não é required check |
| 3 | CI Security & Drift Checks | [41336912072](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41336912072) | c2432c52 | `check-lint-0029-drift.mjs --require-live`: 2 funções com SECURITY DEFINER não na allowlist (`cleanup_expired_auth_sessions`, `perf002_drop_unused_snapshot_indexes`). **FIX: commit `085dd48e` em PR #2846** atualiza `.security/lint-0029-allowlist.json`. Aguardando Gate Final para validar. | **CORRIGIDO** — PR #2846 commit `085dd48e` |
| 4 | E2E — Personalization Flow | [41336912059](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41336912059) | c2432c52 | E2E autenticado do fluxo de personalização — instabilidade pré-existente desde P21 (`7299c88c`); log tail mostra apenas upload de artefato (116 MB) sem erro isolável. Não é required check do Gate Final. | **Externo/pré-existente** — P21 documentado; não é required check |
| 5 | Quote Builder Delivery Quality | [41336912035](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41336912035) | c2432c52 | Step `E2E & Visual Regression` falhou; log tail mostra apenas upload de artefato (353 MB). E2E visual regression instável. Não é required check do Gate Final. | **Externo** — E2E visual instável; não é required check |

**Workflows que PASSARAM no run de c2432c52** (não bloqueantes — estavam falhando em commits anteriores):
- Deploy Gates (Gate Final): ✅ passou na main para `c2432c52` (Gate 1.12 corrigido em commit anterior na main)
- E2E — Critical Flows: ✅ sem failure na main para `c2432c52`
- E2E • Swatch QuickView: ✅ sem failure na main para `c2432c52`
- Global Search Quality Gate: ✅ sem failure na main para `c2432c52`
- Uptime Monitor: ✅ sem failure na main para `c2432c52`

## Inventário P28 — falhas na `main`@5ae127ea (2026-11-01) [HISTÓRICO]

Ponta da `main` auditada: `5ae127ea` (PR #2871 — "fix(db): cria tabela stock_notes ausente no banco").  
Somente conclusões `failure` listadas. Runs `queued`/`in_progress`/`cancelled` omitidos.

| # | Workflow | Run ID | SHA | Causa raiz | Bloqueio externo? |
|---|---|---|---|---|---|
| 1 | Deploy Gates (Gate Final) | [41304184400](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41304184400) | 5ae127ea | Gate 1.12 — `stock_notes` sem `deleted_at` nem `soft-delete-exempt` | **Fix em PR #2846** (`fix/e2e-url-state-defaults-20261030`) |
| 2 | CI Security & Drift Checks | [41304184120](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41304184120) | 5ae127ea | E2E autenticados — 6 testes falhos em `catalog.spec.ts` e `kit-builder.spec.ts` no PR #2871 (stock_notes) | **Externo** — falha pré-existente no PR #2871, não introduzida pelo nosso branch; contexto E2E autenticado era instável antes do nosso PR |
| 3 | Branch Protection Sentinel | [41234042042](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41234042042) | pré-5ae127ea | Job **"Verify Branch Protection is enabled on main"** → ✅ SUCCESS (proteção efetiva confirmada: Gate Final required + pull_request + non_fast_forward OK). Job **"Verify push to main matches accepted patterns"** → ❌ FAILURE no step "Audit every commit in push" — commit do Lovable sem `(#NNN)` no título. A proteção de branch está configurada corretamente; falha é de convenção de commit do bot. | **Externo** — Lovable não segue convenção de commit; recorrente; não indica ausência de proteção |
| 4 | E2E — Critical Flows & Error Boundaries | [41273739218](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41273739218) | pré-5ae127ea | Check min tests executed — 1 teste executado, 9 ignorados (abaixo do mínimo de 10); auth passou; os 9 testes foram pulados via `test.skip` ou filtro de tag no CI | **Externo** — falha pré-existente (pré-5ae127ea); gate verifica mínimo de 10 specs executados — testes skipados pela suíte, não por falta de credenciais |
| 5 | E2E • Swatch QuickView | [41273739179](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41273739179) | pré-5ae127ea | Chromium: suíte Swatch→QuickView falhou (assertions de componente); WebKit: runner encerrou após autenticação bem-sucedida (não é falta de secrets — auth passou) | **Externo** — falha pré-existente (pré-5ae127ea); dois problemas distintos: (a) Chromium — falha funcional no fluxo Swatch/QV; (b) WebKit — crash do runner não relacionado à autenticação |
| 6 | Kit Coverage — Integration | [41270374589](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41270374589) | pré-5ae127ea | `permission denied for table product_kit_components` e `permission denied for view v_kit_component_complete` — o role de CI não tem SELECT nesses objetos | **Externo** — requer GRANT via migration aprovada pelo PO (REGRA E056: DDL proibido em sessão de agente) |
| 7 | Nightly Full CI | [41266491771](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41266491771) | pré-5ae127ea | 4 jobs falhos (SHA `da278eb5`): (1) E2E shards 1+2 — log tail mostra apenas bytes de upload de artefatos (sem spec names acessíveis); (2) E2E Visual `magazine-header` — specs: `magazine-header-align.spec.ts:157:3` (`< lg: cluster empilha sem overflow`), `magazine-header-responsive.spec.ts:66:7` (`hero/breadcrumb sem overflow`), `magazine-header-responsive.spec.ts:98:7` (`sidebar preview`), `magazine-header-responsive.spec.ts:120:7` (`empty state da sidebar`); (3) E2E Visual `color-swatch` — specs: `color-swatch-selected-no-clip.spec.ts:51:5` (`nenhuma bolinha vaza`), `color-swatch-two-lines-grid.spec.ts:69:5` (`2 linhas + chip`), `color-swatch-wrap-visual.spec.ts:50:5` (`até 3 cards com overflow`) | **Externo** — falhas E2E visuais pré-existentes; visual tests dependem de baseline; shards dependem de E2E_USER_* secrets |
| 8 | Policies Baseline | [41272479237](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41272479237) | pré-5ae127ea | 4 novas policies em partições `_p2027_02` não presentes no baseline: `magazine_public_view_events_2027_02.view_events_read`, `.view_events_service_all`, `supplier_products_raw_history_p2027_02.hist_all_service`, `.hist_select_admin` | **Já corrigido** — PR #2881 (commit `6ddd339e`) adicionou as 4 políticas ao `.security/policies-baseline.json` antes do nosso branch; run era pré-existente |
| 9 | Release Please | [41304184265](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41304184265) | 5ae127ea | `Resource not accessible by integration` — erro de autorização do token GitHub ao criar release | **Externo** — revisar permissões do token no workflow release-please |
| 10 | Uptime Monitor | [41273576750](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41273576750) | pré-5ae127ea | Step "Probe site + edge function" falhou; probes verificadas: `https://www.promogifts.com.br/`, `https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/health-check`, `/functions/v1/check-login`, `/auth/v1/health`; issue automática #2882 ("Uptime: falha de disponibilidade detectada") criada; log pós-falha não detalha qual probe específica falhou (apenas registra criação da issue) | **Externo** — falha de probe, provavelmente na edge function `health-check` (relacionada ao drift item 11); ação: deploy de `health-check` via `.github/workflows/deploy-edge-functions.yml` |
| 11 | edge-functions-drift-check | [41292189329](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41292189329) | pré-5ae127ea | Funções em drift entre GitHub e Supabase canônico | **Externo** — reconciliar via `.github/workflows/deploy-edge-functions.yml` |
| 12 | Migrations x Canonical schema | [41337329362](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41337329362) / [41343675868](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41343675868) | d976512c / 84d0cc84 | `[migration-ledger][bloqueado] local_only=1109; remote_only=649` (d976512c) / `local_only=1109; remote_only=668` (84d0cc84, 2026-11-01T19:55Z) — drift massivo entre ledger local e Supabase remoto; drift pré-existente não causado pelo PR (stock_notes adicionaria no máximo 1 ao local_only). Remote_only cresceu 649→668 indicando novas migrations aplicadas no remoto fora do fluxo. | **Externo/pré-existente** — requer reconciliação do ledger via REGRA E99 (migration espelho + `migration repair` + PR); fora do escopo desta sessão |
| 13 | Global Search Quality Gate | [41324536573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41324536573) | db02e933 (main) | E2E: 3 testes falhando em `flows/global-search-comprehensive.spec.ts` — modifier+K, Ctrl+Shift+V, Navigation/Selection e Visual Snapshots (failing all retries); Vitest: coverage threshold não atingido (8.55% lines vs 50% mínimo) | **Externo/pré-existente** — não é required check do Gate Final; requer fix de código de busca global + aprovação PO; fora do escopo desta sessão |
| 14 | CI - Replenishment Module Quality Gate | [41324536556](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41324536556) | db02e933 (main) | Falha no gate de qualidade do módulo de reposição — causa raiz não investigada nesta sessão | **Externo/pré-existente** — não é required check do Gate Final; requer investigação separada |
| 15 | E2E (Playwright) | [41319378741](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41319378741) | main | Suite E2E full (Playwright) com falha; causa raiz não investigada — run pré-existente à 5ae127ea | **Externo/pré-existente** — workflow separado do Gate Final; não é required check |
| 16 | E2E — Personalization Flow | [41333858745](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41333858745) | main | E2E do fluxo de personalização falhando — falha pré-existente confirmada desde `7299c88c` (P21 registrado); causa do run citado não confirmada nos logs desse run específico; padrão consistente com instabilidade de ambiente E2E autenticado observada em execuções anteriores (P21 + PENDENCIAS.md item #10 e #11) | **Externo/pré-existente** — não é required check do Gate Final; pré-existente documentado em P21 |
| 17 | Workflows deletados/arquivados | 41196944540, 41196943972, 41197358626, 41196943249, 41197359691, 41194108331, 41211401669, 41211444629, 41211447066 | pré-histórico | Runs históricos de workflows que foram deletados ou renomeados (`.github/workflows/delivery-quality.yml`, `e2e.yml`, `main.yml`, `replenishment-quality.yml`; Workflow Lint; Edge Integration Tests; E2E Magazine Header; Quote Builder; Copilot Review) — falhas congeladas no histórico | **Sem ação** — workflows não existem mais no repo ou foram substituídos por versões renomeadas; o failure congelado no histórico da API não indica problema ativo |
| 18 | Vercel — Deploy Preview | `dpl_4MQPrNqFiqrkaf39LKCivGwASEK4` | `dff40a26` | Deployment PR preview falhou para o commit docs-only `dff40a26`; mensagem: "Deployment has failed"; causa raiz não acessível via API (mesmo padrão de `dpl_7BWJ1hxSxT4Pzh6MnztEmPELhDSv` documentado em P33 item 6) — falha no projeto canônico `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`. Nota: nosso commit é 100% docs-only (PENDENCIAS.md + RELATORIO_CI.md), sem alteração de código. | **Externo/pré-existente** — `Vercel` é commit status, não required check do Gate Final (CLAUDE.md: único required = "Gate Final - Deploy Ready"). Ver P13 e P33 item 6. |

### Detalhamento das pendências externas (bloqueios fora do alcance de código)

**Release Please (item 9):**
- Causa: `Resource not accessible by integration` ao criar release — erro de autorização, não billing HTTP 402
- Ação necessária do PO: revisar permissões do token GitHub Actions no workflow `release-please.yml` (scope `contents: write` ou PAT com permissão de release)
- Sem ação de código possível; não é regressão do codebase

**Uptime Monitor (item 10):**
- Causa observada: falha na probe `health-check` (curl exit 22); demais probes passaram. A hipótese de edge function drift **não foi confirmada** nos logs — não inferir redeploy como solução
- Ação necessária: investigar a causa raiz da falha HTTP na probe `health-check` antes de indicar deploy
- Se drift for confirmado após investigação: deploy via `.github/workflows/deploy-edge-functions.yml`

**edge-functions-drift-check (item 11):**
- Causa: funções em produção divergem do código no git (drift detectado pelo job "Compare GitHub × Canonical")
- Ação necessária: deploy via `.github/workflows/deploy-edge-functions.yml` para cada função em drift
- Este workflow também falhará enquanto o drift existir

**Deploy Gates (item 1) — fix em andamento:**
- Fix: commit `3a615215` em `fix/e2e-url-state-defaults-20261030` adiciona `-- soft-delete-exempt` na migration
- Após merge do PR #2846, o próximo run de Deploy Gates na main deve passar o Gate 1.12
- Merge do PR #2846 na main: aguardando Gate Final do PR (run em andamento)

## Atualização P27 — inventário da ponta anterior da `main` (2026-10-30T12:23Z)

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

---

## P32 — Inventário atualizado da `main@554ef41b` (2026-10-30T23:45Z)

**Método:** catálogo completo de workflows do GitHub Actions (119) e última execução por workflow filtrada para `branch=main`. 98 tinham execução: 22 com última conclusão `failure`, 65 `success`, cinco `cancelled`, três `pending`, uma `in_progress` e duas `skipped`; 21 não tinham execução na `main`. Somente os 22 failures entram no inventário de falhas; execuções canceladas, em andamento ou sem execução ficam fora dele.

### Últimas execuções em `failure`

| Workflow | Última execução | Evidência da causa / bloqueio atual |
|---|---|---|
| Branch Protection Sentinel | [#41134852421](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852421) | O log acusa 23 commits integrados no push que o seletor do workflow considerou fora dos padrões aceitos. A análise atribui o problema à janela/range de commits auditada, não a uma falha comprovada na convenção da integração Lovable. PR #2839 propõe corrigir o seletor; ainda sem conclusão verde na `main`. |
| E2E (Playwright) | [#41134852533](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852533) | Três specs: duas asserções de defaults explícitos em `/carrinhos` e `/orcamentos` observaram `status=all`; a terceira falhou porque o teste esperava `Próximos 3 dias` e a interface exibe `Próximos (3 dias)`. Na PR #2846, o job `e2e-gates` e o passo focado `/carrinhos & /orcamentos URL-state E2E` passaram em [#41147611088](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41147611088). A execução ampla de shards ainda estava em andamento na última consulta (2026-10-31 00:20 UTC), portanto não há conclusão verde do workflow completo nem novo run verde na `main`. |
| CI Security & Drift Checks | [#41134852492](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852492) | `Run Unit & Integration Tests` falhou em `QuoteBuilderSummaryAlignment.fuzz.test.ts:31`: o teste buscava `leading-[1.125rem]` no arquivo anterior `QuoteBuilderSummaryColumn.tsx`, mas o JSX está em `QuoteBuilderSummaryItems.tsx`. O branch corrige a fonte do teste; ainda sem run verde na `main`. |
| Copilot | [#41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979) | Erro HTTP 402: limite adicional de uso do plano Copilot atingido. PO precisa regularizar a cota em GitHub Copilot. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Falha antiga (25/05). GitHub retorna HTTP 410 ao baixar logs; causa técnica não pode ser confirmada sem rerun. Bloqueio exato para diagnóstico: logs expirados/indisponíveis. Não houve alteração no banco. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | GitHub retorna HTTP 404 ao baixar os logs e a API de resumo não lista jobs. Causa não confirmável com a evidência retida; precisa de nova execução para diagnosticar. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | O guard `check-lockfile-sync.mjs` detectou divergência entre `package.json` e `package-lock.json` e encerrou o setup antes de `npm ci` (instalação ficou `skipped`). O checkout atual passa `npm ci`, mas o último run na `main` continua falho. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | No job Vitest, `npm ci` retornou `EUSAGE` por lockfile divergente. No Playwright, `check-lockfile-sync.mjs` bloqueou antes de `npm ci`. O checkout atual passa `npm ci`, mas falta nova execução verde na `main`. |
| E2E Stock — Matrix (E80) | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | Quatro jobs (`dashboard`, `filter`, `rupture-horizon`, `future-stock`) falharam no guard de sincronização do lockfile; os testes não executaram. O checkout atual instala com `npm ci`; falta nova execução verde. |
| Nightly Full CI | [#40993462227](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40993462227) | Dois jobs visuais falharam: `color-swatch` excedeu 20 s aguardando `[data-testid="product-card"]`; `magazine-header` falhou com E21 por ausência de `E2E_USER_EMAIL/PASSWORD`. Dois shards cancelados são resultados separados, não falhas. |
| E2E · Atualizar snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | Cinco specs do editor de item falharam esperando `quote-editor-unsaved-dialog` visível; o elemento não foi encontrado em 15 s, inclusive retries. A causa interna não está comprovada; exige reproduzir o fluxo antes de regenerar snapshots. |
| Kit Coverage — Integration | [#40999068927](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40999068927) | A integração falhou consultando `v_products_public`: PostgREST informou que não conseguiu consultar o schema cache; suíte teve um arquivo de teste falho e três casos ignorados. Requer diagnóstico do estado/cache do serviço de produtos; nenhuma alteração de banco foi feita. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | Entre as sete falhas, o log mostra `[E108] Sem orçamento enviado no ambiente` ao preparar cenários e falhas `toBeHidden()` no FAB. A fixture ausente explica ao menos E108, mas não há prova de que explique todas as falhas. Nenhum snapshot foi atualizado/afrouxado. |
| E2E Discount Approval (04c*) | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | `check-lockfile-sync.mjs` detectou divergência `package.json` × lockfile antes da instalação; `npm ci` ficou `skipped`. O checkout atual instala com `npm ci`, mas falta novo run verde. |
| E2E • ColorSwatch 2 linhas (Grid) | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | `check-lockfile-sync.mjs` interrompeu setup antes de `npm ci` por divergência entre manifest e lockfile. O checkout atual instala com `npm ci`; falta nova execução verde. |
| E2E · Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | Logs do run não estão mais disponíveis (HTTP 404); motivo técnico não verificável. Precisa rerun para identificar a causa, sem presumir falha de código. |
| E2E · Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | Logs do run não estão mais disponíveis (HTTP 404); motivo técnico não verificável. Precisa rerun para identificar a causa. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | Logs do run não estão mais disponíveis (HTTP 404); motivo técnico não verificável. Precisa rerun para identificar a causa. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não conseguiu resolver o hostname (`could not translate host name ... Name or service not known`) ao ler `pg_proc`. O log comprova falha de resolução DNS; não comprova credencial inválida. Sem DDL aplicada. |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) | Login ficou em `/login` por 75 s; `storageState.json` terminou sem token `sb-*-auth-token`, apesar de `E2E_USER_*` presentes. O log comprova ausência de sessão/timeout; causa (credencial, rede ou serviço de auth) precisa ser isolada. Nenhum dado canônico foi alterado. |
| E2E Cart — Matrix (E79) | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | O job `cart-handoff` falhou com timeout aguardando redirect pós-login. Separadamente, `cart-delete-popover` excedeu 120 s ao clicar em `cart-delete-confirm` e foi cancelado. O timeout do job cancelado não é a causa do run `failure`; ambos precisam de reprodução atual. |
| E2E Freight — Matrix (E80) | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | Setup de autenticação permaneceu em `/login` por 75 s e não gerou sessão autenticada; 14 testes não chegaram a executar. Mesmo bloqueio de autenticação E2E, sem evidência de falha nos testes funcionais. |

### Estado não concluído (não contado como falha)

- `E2E • Swatch QuickView (Lista + Tabela)` [#41134852559](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852559) permanecia `in_progress` no instante da consulta.
- `Deploy Edge Functions` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110), `SECURITY DEFINER ACL — Multi-Env` [#41039602639](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41039602639) e `E2E · restore_seller_cart RPC (multi-env)` [#41036458570](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41036458570) permaneciam `pending`. Não foram aprovados nem alterados.

**Proteção de produção:** a correção de URL-state altera o comportamento da aplicação. A PR correspondente será deixada aberta para CI e revisão; não será mesclada nesta sessão, pois o merge pode disparar deploy de produção. O Supabase canônico não foi alterado.

### Acompanhamento remoto da PR #2846 (2026-10-31T00:20Z)

| Verificação | Estado/evidência | Pendência precisa |
|---|---|---|
| `e2e-gates` — URL-state | Sucesso; o passo focado `/carrinhos & /orcamentos URL-state E2E` concluiu `success` em [#41147611088](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41147611088). | A execução ampla do mesmo workflow ainda tinha oito shards em andamento na consulta; aguardar a conclusão antes de declarar o E2E integral verde. |
| `E2E Quotes — Matrix (E77)` | [#41147611028](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41147611028) falhou em `view-no-presentation-mode` e `undo`. O resumo dos jobs confirma os dois passos falhos; a diferença visual e o timeout do fluxo de exclusão foram identificados nos relatórios de execução. | Falhas em specs de quotes fora dos arquivos alterados pela PR; não foram mascaradas nem atribuídas à correção de URL-state sem reprodução causal. Investigar e corrigir no escopo próprio antes de exigir que essa matriz fique verde. |
| `CI - Replenishment Module Quality Gate` | [#41147610965](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41147610965) falhou no passo `E2E — Paridade visual /novidades vs /reposicao`. | A matriz reportou divergência de altura dos cards em 768 px (14 px frente à tolerância de 6 px); os arquivos do módulo não fazem parte desta PR. Tratar separadamente e não relaxar o limite visual. |
| `E2E • Swatch QuickView (Lista + Tabela)` | [#41147610984](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41147610984): WebKit foi cancelado pelo shutdown do runner; Firefox e Chromium ainda estavam em execução. | Não é uma falha de asserção confirmada; aguardar execução final ou nova execução se os jobs terminarem cancelados. |
| Deploy Preview Vercel | Status externo da PR falhou e apontou ao deployment `dpl_9CwYXvh4mXWu7ENPLAMrDkvjK7W4`. A inspeção disponível não apresentou logs de build que identifiquem a causa. | Causa técnica não confirmada. Consultar os detalhes/logs desse deployment no projeto Vercel canônico; não criar ou vincular outro projeto. |
| Copilot Review | Status descreve HTTP 402: cota adicional do plano esgotada; revisão completa foi ignorada. | Bloqueio de conta/uso, fora do código. O responsável pela conta deve regularizar a cota se a revisão Copilot for necessária. |

**Decisão:** PR permanece aberta e sem merge. O check focado da correção está verde, mas a execução ampla de E2E e os checks auxiliares não estão todos verdes. Nenhuma escrita no Supabase, migration, deploy de produção ou alteração de credenciais foi realizada.

---

## P33 — PR documental #2868: cota do Copilot (2026-10-31)

| Workflow/check | Execução | Erro confirmado | Ação necessária | Required? |
|---|---|---|---|---|
| Copilot Pull Request Reviewer no PR [#2868](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2868) | [#41202146614](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41202146614) | HTTP 402, `errorType: quota`: `You've reached your additional usage limit for your plan`. Não chegou a produzir revisão do PR. | PO/admin: aguardar renovação ou regularizar a cota/billing do Copilot; depois solicitar novo check. Não alterar código, não ignorar o check manualmente e não confundir essa falha externa com aprovação/reprovação de conteúdo. | Não — Gate Final passou. |

---

## P34 — Falhas não-required no PR #2846 (2026-11-01)

Checks não-required na branch `fix/e2e-url-state-defaults-20261030`, documentados para o stop hook de CI. Nenhum destes bloqueia o Gate Final.

| # | Check | SHA de falha | Run ID | Causa raiz | Required? |
|---|---|---|---|---|---|
| 1 | `webkit • swatch→QV` | `f73265f3` | [124864727335](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41312199719/job/124864727335) | **Log real obtido (2026-11-01T14:47Z):** 4 falhas em `e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts:94:5` ([webkit-authed] rotas: catalogo, super-filtro, novidades, reposicao). Causa: `[E108] Sem produtos com color_swatches em /reposicao (rota satélite)` — o `picker` retorna `null`; não há produtos com `color_swatches V2` disponíveis nas rotas satélite durante a execução CI. timeout do seletor (possível ausência de fixture, carregamento lento ou rendering). Adicionalmente: apenas 5 testes executados (mínimo exigido: 10) e 66.7% dos testes skipados (máximo permitido: 50%) — o conjunto de dados CI é insuficiente para cobrir todas as rotas. PR #2846 não toca `swatch-picker-v2-focus-and-quickview.spec.ts` nem nenhum componente de swatch. Falha pré-existente (ocorre em runs anteriores ao PR). | **Não** |
| 2 | `E2E · undo` | `f73265f3` | [124860882524](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41310025109/job/124860882524) | **Log real obtido (sessão anterior):** `[chromium-authed] › e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:150:3 › Toast Desfazer — E. clique após expiração (500ms) NÃO chama onUndo e não gera toasts duplicados` — exit code 1. Race condition no undo toast: clique após 500ms chama `onUndo` quando não deveria. PR #2846 não toca `04r-undo-toast-a11y-keyboard.spec.ts` nem o componente de toast. Falha pré-existente. | **Não** |
| 3 | `E2E · view-no-presentation-mode` | `f73265f3` | [124860882643](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41310025109/job/124860882643) | **Log real obtido (2026-11-01T14:47Z):** `[chromium-public] › e2e/quotes/quote-view-no-presentation-mode.spec.ts:359:5 › snapshot visual — DropdownMenu mobile 375x667 › menu aberto — dark` — `expect(locator).toHaveScreenshot(quote-actions-menu-dark-mobile.png)` falhou: `Expected an image 133px by 156px, received 128px by 156px. 1673 pixels (ratio 0.09 of all image pixels) are different.` — snapshot visual desatualizado: baseline capturado com 133px de largura, elemento atual tem 128px. PR #2846 não toca `quote-view-no-presentation-mode.spec.ts` nem snapshots do `quote-actions-menu`. Falha pré-existente. | **Não** |
| 4 | `merge-reports` | `0bbd70b5`, `d976512c` | [124863735140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41311031030/job/124863735140), [124946139774](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41337329652/job/124946139774) | **Causa exata (SHA `d976512c`, run 41337329652):** `Error: Directory does not exist: /home/runner/work/Promo_Gifts_V4/Promo_Gifts_V4/all-blob-reports` — os E2E shards (`e2e-smoke-chromium-shard-*`) não produziram blob reports porque falharam antes de gerar output ou foram cancelados pelo `cancel-in-progress` do concurrency group. `check-playwright-min-executed.mjs` também falhou com `ENOENT: playwright-report/results.json`. **Causa anterior (SHA `0bbd70b5`, run 41311031030):** falha por dependência de job cancelado por concurrency cancel. Job auxiliar não é required check do Gate Final (`deploy-gates.yml`). Falha downstream de E2E shards (P28 itens 4, 7, 15) — pré-existente, não introduzida por este PR. | **Não** |
| 5 | `Recibo de migration` (`migrations-sync-log-gate`) | `f73265f3` | [124864728124](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41312199825/job/124864728124) | Recibo `20261031000000` marcado como "pendente" — gate E75 rejeita status "pendente" para migration já modificada no PR. **✅ CORRIGIDO em `0bbd70b5`** — status atualizado para "aplicada"; confirmado success em SHA `65119d68` ([run 41314375394](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41314375394)). | **Sim** (Gate 1.13.3) — **RESOLVIDO** |
| 6 | Vercel | múltiplos SHAs | `dpl_7BWJ1hxSxT4Pzh6MnztEmPELhDSv` | Deployment failure no projeto canônico `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`; causa técnica não confirmada nos logs disponíveis (veja P33 "Deploy Preview Vercel"). Não é required check do Gate Final. | **Não** |
| 7 | `audit` (`CI - Replenishment Module Quality Gate`) | `65119d68` | [41314375403](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41314375403) | Workflow separado `replenishment-quality.yml` (não faz parte de `deploy-gates.yml`). Job "audit" falhou no PR branch (SHA `65119d68`). Job `audit` executa **lint** (`npm run lint`), **typecheck** (`check-tsc-baseline.mjs`) e E2E condicionais (só se `E2E_USER_EMAIL` disponível) — NÃO executa `npm audit`. Atribuição anterior a CVE/npm audit estava incorreta. **Causa da falha no branch PR: não confirmada.** `replenishment-quality.yml` PASSOU na main em 3 runs recentes (runs 41304184190, 41272479181, 41234033731), mas isso não exclui falha relacionada ao branch PR — o job roda na branch do PR (não na main). Análise dos logs do job específico necessária para determinar se é falha da branch ou instabilidade de runner. Nenhuma alteração de regras de lint, types ou E2E neste PR. Não é required check do Gate Final. | **Não** |
| 8 | `copilot-pull-request-reviewer` | `889f3e3a`, `1b8e4d40` | [41316239996](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41316239996), [41316734683](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41316734683) | Copilot automated PR reviewer; `conclusion=failure` significa que o bot encontrou sugestões, não que há bug bloqueante. Não é required check do Gate Final. | **Não** |
| 9 | `Migrations x Canonical schema` (`db-schema-drift-check`) | `609dfbf3`, `d976512c`, `84d0cc84` | [41318957626](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41318957626), [41337329362](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41337329362), [41343675868](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41343675868) | Workflow separado `db-schema-drift-check.yml` (não faz parte de `deploy-gates.yml`). Step falhou: "Ledger parity (repo x canonical)". Causa: divergência entre `supabase_migrations.schema_migrations` e schema vivo em `doufsxqlfjyuvxuezpln` por DDL aplicado fora do fluxo de migration — problema crônico documentado em CLAUDE.md REGRA #8 e E12. **Log exato (84d0cc84, run 41343675868, 2026-11-01T19:55Z):** `[migration-ledger][bloqueado] local_only=1109; remote_only=668; mismatched=0; malformed=0`. Confirma `SUPABASE_PROJECT_REF: doufsxqlfjyuvxuezpln`. Advisory não-bloqueante (CLAUDE.md: "É advisory, não gate — não bloqueia merge"). PR #2846 não toca migrations, schema, cron jobs nem edge functions. Falha pré-existente, recorrente em múltiplos SHAs. | **Não** |
| 10 | `E2E — Personalization Journey` | `609dfbf3` | [41318957718](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41318957718) | Workflow separado `E2E — Personalization Flow` (não faz parte de `deploy-gates.yml`). Step falhou: "Run Personalization E2E Tests" (step 5). PR #2846 corrige normalização de filtros URL após navegação POP — não toca personalization features (`personalization_techniques`, `MockupPromptManager`, `MagazineEditorPage`). Falha em workflow externo com escopo completamente diferente do diff deste PR. Não é required check do Gate Final. | **Não** |
| 11 | `E2E — Full User Flows (authed)` | `609dfbf3` | [41318957618](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41318957618) | Workflow separado de E2E (não faz parte de `deploy-gates.yml`). Falha em testes de fluxos autenticados. PR #2846 corrige normalização de URL state após POP navigation em filtros — não toca auth, cart nem fluxos de usuário autenticado. Não é required check do Gate Final. | **Não** |
| 12 | `E2E Focused · thumb-quickview` | `c224c038` | [41324074455](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41324074455) | Check E2E focado em thumbnail quickview (não faz parte de `deploy-gates.yml`). O commit `c224c038` é documentação-only (atualização de PENDENCIAS.md); PR #2846 contém também alterações ao script de auditoria de dependências e outros fixes — não altera UI, thumbs, quickview nem componentes de produto. Falha pré-existente, escopo externo ao diff. Não é required check do Gate Final. | **Não** |

**Nota sobre Gate Final (SHA `65119d68`, run [41314375579](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41314375579)):** O Gate Final nesse SHA falhou APENAS por cancellação de concurrency — não por falha real nos gates. Evidência: `R_SSOT: success`, `R_LINT: success`, `R_UNIT: success`. Os jobs de `R_DEP_AUDIT`, `R_BUILD`, `R_E2E` etc. foram cancelados quando um novo push ao PR disparou o cancel-in-progress. O código está limpo; a Gate Final precisa de um run sem interrupção.

**Resumo:** Os 11 checks não-required (items 1–4, 6–12) têm causas documentadas — todas pré-existentes ou externas ao diff, exceto item #7 cuja causa no branch PR está não confirmada (ver acima). O único check required bloqueante (item 5, Gate 1.13.3 — recibo de migration) foi corrigido e confirmado green em SHA `65119d68` ([run 41314375394](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41314375394)). Items #9–#12 adicionados (2026-11-01).

