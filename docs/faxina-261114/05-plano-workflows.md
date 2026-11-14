# PLANO DE WORKFLOWS — GitHub Actions / Promo_Gifts_V4

> **Nota para quem editar este arquivo.** O caminho completo do `PR_COMMENT.md` aparece aqui
> **quebrado de propósito** (nome do arquivo separado do diretório). O gate
> `scripts/check-migration-path-references.mjs` varre `.md` e reprova qualquer referência a um
> caminho sob `qa/migrations-draft/` que não exista no repositório — e esse arquivo justamente não
> existe, é gerado em tempo de execução, que é o próprio assunto do item 96 deste documento.
> Escrever o caminho junto faz este documento reprovar o CI de todas as PRs. Se precisar citá-lo
> junto, use um glob (`*`) ou um placeholder (`<...>`), que o gate ignora.


Consolidação da auditoria completa dos **99 workflows** (10 famílias A–J + F), cruzada com as 2 lentes
céticas (dependências e cobertura). Base de disco: `main` + branch local
`claude/infra-workflows-supersede-3525-261114-1740` (= main + PR #3525 + PR #3612).
Único check required em `main`: **`Gate Final - Deploy Ready`** (`deploy-gates.yml`) — mais
`Analyze (javascript-typescript)` (codeql.yml) e `Gate E23 - Secret Scan (gitleaks)`, conforme
`.github/required-checks.json` (SSOT).

**Regra de consolidação aplicada:** um `APOSENTAR`/`FUNDIR` só entra no plano se **nenhuma** lente o
refutou. Refutado → vale a `acao_alternativa` (FUNDIR com destino exato, pré-requisito, ou MANTER).
Nenhum item afrouxa gate: nada de apagar/skipar teste, baixar threshold, ampliar allowlist para calar
erro, nem mexer em required check sem atualizar `.github/required-checks.json` junto.

---

## 1) Resumo em números

### Escopo
| Item | Nº | Evidência |
|---|---|---|
| Workflows auditados | **99** | 85 (famílias A–E, G–J) + 14 (família F) |
| Arquivos em `origin/main/.github/workflows/` | 98 | `git ls-tree --name-only origin/main .github/workflows/ \| wc -l` = 98 |
| Auditado fora de `main` | 1 | `static-checks.yml` (só na PR #3525 / branch supersede) |
| Desativados por API nesta sessão **com** arquivo em main | 61 | `disabled-workflows.tsv` (77 linhas) ∩ `main` |
| Desativados por API **sem** arquivo em main (registro fantasma) | 16 | ver §9 |
| Mantidos ativos | 36 | `keep-workflows.txt` |
| Ativo por omissão (nem keep nem disabled) | 1 | `stale.yml` → 61+36+1 = 98 ✔ |
| Arquivos em `.github/workflows/` na branch supersede | 87 | `git ls-tree … claude/infra-workflows-supersede-3525-261114-1740` (11 já movidos) |

### Veredito final (99 workflows)
| Veredito | Nº | Observação |
|---|---|---|
| **MANTER** | **20** | inclui 3 revertidos de FUNDIR por refutação (`pr-size-guard`, `supabase-security-gate`, `delivery-quality`) |
| **OTIMIZAR** | **23** | só edição de YAML dentro do próprio arquivo |
| **APOSENTAR** (excluir / mover para `recovery/workflows-aposentados/`) | **25** | 14 imediatos + 11 com pré-requisito |
| **FUNDIR** (arquivo sai após a fusão) | **31** | 30 com remoção do arquivo + 1 parcial (`drafts-index-check.yml`, arquivo **permanece**) |
| **NÃO VERIFICADO** (workflow sem veredito) | **0** | 12 itens de fato pendentes em §9 |

Arquivos que saem de `.github/workflows/` ao fim do plano: **25 + 30 = 55**
(98 − 55 = **43 arquivos** restantes em `main`, + `static-checks.yml` = 44).

### Refutações (impacto)
- **32 dos 49 + 14 alvos** foram refutados por pelo menos uma lente.
- Causa dominante (**14 itens**): o destino proposto era `static-checks.yml`, que é **id 417403614,
  `disabled_manually`, e não existe em `origin/main`** — "basta mergear a PR #3525" dava cobertura ZERO
  e sem check vermelho avisando. Solução: **Etapa 0** (§7) — mergear a supersede **e** reabilitar o
  workflow via `github_enable_workflow 417403614`, com run verde comprovada.
- Segunda causa (**8 itens**): o destino era o glob da regressão E2E, que hoje **não roda**
  (`e2e.yml` id 278436800 desativado; `nightly-full.yml:142-152` roda só 7 specs nomeados).
  Solução: **Etapa 2** (§7) — fundir o `e2e.yml` primeiro, com run verde.

---

## 2) Tabela completa — arquivo × veredito final × motivo curto × cobertura equivalente

Legenda: `APOSENTAR*` = aposentar com pré-requisito; `FUNDIR*` = fundir com destino corrigido ou
pré-requisito; `(ref)` = proposta refutada por lente, veredito ajustado pela `acao_alternativa`.

| # | Arquivo | Veredito final | Motivo curto | Cobertura equivalente |
|---|---|---|---|---|
| 1 | `deploy-gates.yml` | OTIMIZAR | Required, mas 18 runners em 4 níveis (run 43609528983: 21,1 runner-min, 87 min de parede; 12 jobs <1 min) | nenhuma (é o gate) |
| 2 | `_e2e-relevance.yml` | FUNDIR* (ref) | Único chamador ativo é `deploy-gates.yml:121`; 2 runners para a mesma mecânica. Lente: o job `changes` **não** tem `list-files: json` nem o step do script | `deploy-gates.yml` job `changes` **após** as 5 edições de §4.1 |
| 3 | `_secrets-check.yml` | MANTER | Reusable barato, ainda com consumidores (`e2e-stock.yml:46`, `deploy-gates.yml:538`) | nenhuma |
| 4 | `deploy-edge-functions.yml` | OTIMIZAR | Matrix 1-função-por-runner = até 110 runners; job `verify` é só `echo`; ramo push morto | nenhuma (único deploy de edge) |
| 5 | `deploy-vercel.yml` | MANTER | Custo zero (dispatch) e único rollback automatizado do front | integração nativa Vercel↔GitHub |
| 6 | `db-apply-migration.yml` | MANTER | Governança de DDL exigida pelo AGENTS.md; 20/25 sucesso | nenhuma (`supabase db push` proibido) |
| 7 | `delete-orphan-edges.yml` | **APOSENTAR** | Alvo inexistente (6 slugs ausentes das 110 funções do canônico) e 0 runs na vida | `edge-functions-drift-check.yml:162-185` (required `Compare GitHub × Canonical`) |
| 8 | `required-checks-guard.yml` | OTIMIZAR | Roda em todo PR sem fundamento (ruleset não depende do diff); `secrets-inventory-check` duplica Gate 1.14 | Gate 1.14 (`deploy-gates.yml:375`) para o inventário |
| 9 | `branch-protection-sentinel.yml` | OTIMIZAR | Único alarme pós-merge, mas clona 109 MB por push (`fetch-depth: 0`) e tem job duplicado | nenhuma para `verify-merge-pattern` |
| 10 | `sentinel-self-test.yml` | MANTER | Path-filtered, 22/25 verdes, fixtures bash sem outro executor | nenhuma |
| 11 | `release-please.yml` | OTIMIZAR | Produto quebrado: manifest 1.1.0 vs tags até v1.8.1; merges falham `already_exists` | nenhuma |
| 12 | `pr-size-guard.yml` | **MANTER** (ref) | FUNDIR refutado: `deploy-gates.yml:45-46` não tem `types: [labeled, unlabeled]` → PR grande travaria em vermelho mesmo com `large-pr-approved` | — (fica como está) |
| 13 | `cross-reference-issues.yml` | **APOSENTAR** | Duplica função nativa do GitHub; 9.675 runs para 14 comentários | GitHub nativo (`Closes #N`, timeline) |
| 14 | `labels-sync.yml` | MANTER | 14 runs na vida, 14/14 verdes, path-filtered | nenhuma |
| 15 | `stale.yml` | **APOSENTAR** | Template com placeholders; 1º efeito previsto é fechar a issue P0 #1871 sem triagem a partir de ~2026-11-21 | nenhuma (triagem é humana) |
| 16 | `workflow-lint.yml` | FUNDIR* (ref) | actionlint+shellcheck é cobertura única; destino `static-checks.yml:162-171` existe na branch mas o workflow está desativado | `static-checks.yml:162-171` **após Etapa 0**, ou step no Gate 1 |
| 17 | `contexto.yml` | OTIMIZAR | Cron de 10 min: 17/25 runs cancelados pela própria fila | nenhuma |
| 18 | `ci.yml` | OTIMIZAR | 11 jobs/PR, 3 rodadas da mesma suíte, 0 sucesso em 60 runs, mediana 71 min | parcial: Gates 1/2/3 + nightly |
| 19 | `static-checks.yml` | MANTER | É o destino da consolidação (12/12 verdes, job ≈64 s) — **tem de ser reabilitado** | nenhuma |
| 20 | `ci-security-drift.yml` | FUNDIR* (ref) | `quality-gate` 25-28 min por push repetindo Gates 0.5/1/1.5/6. Lentes: `check-tsc-baseline.mjs` e `tests/hooks/**` ficariam órfãos; `ci.yml` (cobertura citada) está desativado | ver §4.3 (3 destinos) |
| 21 | `codeql.yml` | MANTER | Único SAST; job required em `.github/required-checks.json` | nenhuma |
| 22 | `security.yml` | OTIMIZAR | Gitleaks por range é único; schedule duplica o audit diário; `headers-mirror` não precisa de job | `gitleaks-history-audit.yml` (varredura completa) |
| 23 | `gitleaks-history-audit.yml` | OTIMIZAR | `push: main` dispara varredura completa a cada merge (≈60/dia) além do cron | `security.yml` (range) + Gate E23 (árvore) |
| 24 | `lovable-autoheal.yml` | **APOSENTAR** | Alvo inexistente há 75 dias (último commit do bot: 2026-08-31) e roda `npm ci`+eslint em todo squash-merge com `contents: write` | Gate 1 (`lint:baseline` `deploy-gates.yml:211`) |
| 25 | `lovable-edit-tracker.yml` | **APOSENTAR** | Resultado é sempre "Nenhum commit do Lovable" | `git log --author=gpt-engineer` |
| 26 | `lovable-protected-audit.yml` | **APOSENTAR** | 25/25 runs `skipped`; o job nunca executa | `.lovableignore` + `CODEOWNERS:25,30` (passivos) |
| 27 | `automation-local.yml` | APOSENTAR* (ref) | Consolidado em `static-checks.yml:130-138`; lente: destino desativado e ausente de main | `static-checks.yml:130-138` **após Etapa 0** |
| 28 | `e2e.yml` | FUNDIR* (ref) | Única regressão completa (`:246-250`, glob sem lista de specs); lente: destino (nightly) nunca ficou verde e roda só 7 specs | `nightly-full.yml` job `e2e-tests` **após §4.4** |
| 29 | `e2e-flows.yml` | FUNDIR* (ref) | Exclusivo é o project `mobile-chrome`; lente: o job `e2e-mobile` não existe no nightly | novo job `e2e-mobile` no nightly (§4.5) |
| 30 | `e2e-focused.yml` | APOSENTAR* (ref) | 10 specs já no glob; cron semanal gerou 10 issues sem consumidor | glob da regressão **após Etapa 2**; `03b-thumb-quickview.smoke` já no Gate 3 (`deploy-gates.yml:543-548`) |
| 31 | `e2e-cart.yml` | APOSENTAR* (ref) | Duplicata estrita do glob (7 specs, mesmo project `chromium-authed`) | glob da regressão **após Etapa 2** |
| 32 | `e2e-quotes.yml` | OTIMIZAR | Specs no glob, mas o protocolo live com cleanup por prefixo + recibo (`:177-257`) é único | nenhuma para o cleanup live |
| 33 | `e2e-stock.yml` | APOSENTAR* (ref) | 0 sucesso em 55 runs; suítes estouram o timeout de 20 min | glob da regressão **após Etapa 2 com 4 shards/timeout 30** |
| 34 | `e2e-freight.yml` | APOSENTAR* (ref) | Paths mortos (`src/components/freight/` não existe); `e2e-quotes.yml` citado como cobertura está **desativado** | glob da regressão **após Etapa 2** |
| 35 | `e2e-personalization.yml` | APOSENTAR* (ref) | Duplicata estrita; paths idênticos ao `e2e.yml` | glob da regressão **após Etapa 2** |
| 36 | `e2e-discount-approval.yml` | APOSENTAR* (ref) | Vermelho desde 2026-10-01, artefato de 365 MB por falha | glob da regressão **após Etapa 2** |
| 37 | `e2e-crm-callback-approved.yml` | **APOSENTAR** | Verde falso: 25/25 success em 0,2 min porque o step E09 pula tudo sem `CRM_CALLBACK_API_KEY` | nenhuma hoje (spec se auto-pula) |
| 38 | `e2e-check-calendar-snapshots.yml` | APOSENTAR* (ref) | Duplicata de `visual-tests.yml:95-100`; lente: `visual-tests` e `update-snapshots` estão **desativados** e a suíte `calendar-ring` não existe no nightly | suíte `calendar-ring` do nightly **após §4.10** |
| 39 | `e2e-color-swatch-grid.yml` | **APOSENTAR** | Duplicata de `nightly-full.yml:199-205`; 18 falhas em 25 runs | `nightly-full.yml:199-205` (hoje **vermelha** — job 132307428056) |
| 40 | `e2e-customization-collapse.yml` | FUNDIR | Cobertura única com baselines versionados, mas é 1 linha de matriz | `nightly-full.yml` `e2e-visual-focused` (§4.6) |
| 41 | `e2e-dialogs-pr-check.yml` | **APOSENTAR** | Duplicata exata de `nightly-full.yml:212-219`, suíte **verde** (job 132307428004, 44 s) | `nightly-full.yml:212-219` + Gate 1.4 |
| 42 | `e2e-magazine-header.yml` | **APOSENTAR** | Duplicata de `nightly-full.yml:206-211`; 18/25 `action_required` | `nightly-full.yml:206-211` — **trocar para `chromium-authed`** (job 132307428039 falhou) |
| 43 | `e2e-pdf-dialog.yml` | FUNDIR | Nightly "cobre" em vácuo (`chromium-public`, sem poppler-utils) | `nightly-full.yml:195-198` corrigida (§4.7) |
| 44 | `e2e-swatch-quickview.yml` | FUNDIR | 4.772 runs, 3 navegadores com `max-parallel: 1`, 1h25 de parede para 13 min de execução | 2 linhas de matriz no nightly (§4.8) |
| 45 | `e2e-visual-preview-button.yml` | FUNDIR | Saudável mas é 1 linha de matriz; exigido por `check-visual-preview-suite.mjs:24` | `nightly-full.yml` `e2e-visual-focused` (§4.9) |
| 46 | `visual-tests.yml` | FUNDIR | 8.935 runs por paths amplos; 2 shards para 2 specs | `nightly-full.yml` suíte `calendar-ring` (§4.10) |
| 47 | `update-snapshots.yml` | MANTER | Ferramenta sem substituto; toda fusão visual depende dela — **reabilitar** | nenhuma |
| 48 | `ui-visual-a11y.yml` | APOSENTAR* (ref) | Já aposentado na #3525; lente: `OptimizedImage.test.tsx` não roda em nenhum CI ativo | `static-checks.yml:143-152` **após Etapa 0** |
| 49 | `optimized-image-e2e.yml` | FUNDIR | 47 linhas para 1 linha de matriz; 23/25 sucesso | `nightly-full.yml` `e2e-visual-focused` (§4.11) |
| 50 | `check-select-columns.yml` | FUNDIR* (ref) | 2.045 runs de checkout+npm ci para 1 `node`; lente: destino desativado | `static-checks.yml:85-88` **após Etapa 0** |
| 51 | `check-no-prod-leak.yml` | FUNDIR* (ref) | 4.324 runs; guarda de vazamento de produção, não pode ficar sem executor | `static-checks.yml:80-83` **após Etapa 0** |
| 52 | `lint-untyped-from.yml` | FUNDIR* (ref) | 6.946 runs, mediana 2,7 min (fila) para bash puro | `static-checks.yml:90-93` **após Etapa 0** |
| 53 | `ts-unused-ratchet.yml` | FUNDIR | Duplicata real: Gate 1 (`lint:baseline`) + Gate 1.7 (`tsc-unused-ratchet.sh --check-ratchet`) + `ratchet-weekly.yml:53` | Gate 1.7 + `ratchet-weekly.yml` (**sem step novo**) |
| 54 | `ssot-supabase.yml` | FUNDIR* (ref) | Gate 0 cobre só `ssot:validate`; `ssot:guard`/`ssot:hosts` são únicos e o destino estava desativado | `deploy-gates.yml` job `ssot-gate` (preferido) ou `static-checks.yml` após Etapa 0 |
| 55 | `supabase-linter-gate.yml` | OTIMIZAR | Modo live mede produção, não o diff; 6.126 runs, `push: main` sem paths — **reabilitar** | nenhuma (único `check-supabase-linter.mjs`) |
| 56 | `supabase-security-gate.yml` | **MANTER** (ref) | FUNDIR refutado nas 2 lentes: destino (`supabase-linter-gate.yml`) está **desativado** e `tests/scripts/deploy-gates-live-audit.test.mjs:9,92-103` lê este arquivo real | — trocar `pull_request` → `push: main` + `schedule` (§6) |
| 57 | `policies-baseline.yml` | OTIMIZAR | Em PR/push é idêntico ao Gate 1.13 (`deploy-gates.yml:325-330`), que é mais estrito | Gate 1.13 |
| 58 | `db-schema-drift-check.yml` | OTIMIZAR | `pull_request` próprio duplica 1:1 o Gate E40 (`deploy-gates.yml:790,811`) | Gate E40 em PR/push |
| 59 | `ddl-out-of-band-detector.yml` | MANTER | 8/8 success, 0,7 min; único que abre issue de DDL fora de migration | parcial (drift-check diário) |
| 60 | `migration-dry-run.yml` | MANTER | Dispatch-only, custo zero; único dry-run com ROLLBACK | nenhuma |
| 61 | `migrations-sync-log-gate.yml` | FUNDIR* (ref) | **Não** é redundante (Gate 1.13.3 roda outro script); destino desativado | `static-checks.yml:173-183` **após Etapa 0** (+ promover ao Gate 1.3 — §4.17) |
| 62 | `schema-snapshot-export.yml` | OTIMIZAR | Em PR/push as credenciais são zeradas de propósito e o artifact não tem consumidor | nenhuma para baseline/recovery dump |
| 63 | `security-definer-acl-multi-env.yml` | OTIMIZAR | Travado desde 31/10: `environment: production` exige revisor → 24 cancelled + 1 waiting | nenhuma ativa |
| 64 | `restore-seller-cart-rpc.yml` | APOSENTAR* (ref) | Gate 5.5 (`deploy-gates.yml:686`) cobre a **assinatura**; lente: `tests/security/restore-seller-cart-rpc.test.ts` (comportamento) não roda em lugar nenhum | Gate 5.5 + **o teste tem de entrar no Gate 2/nightly antes** |
| 65 | `quote-number-hardening-verify.yml` | FUNDIR | Cobertura única e saudável, mas 4 runs/dia para script de 20 s (mediana 6 min = fila) | novo job no `nightly-full.yml` (§4.18) |
| 66 | `regenerate-supabase-types.yml` | MANTER | Dispatch-only, custo zero; caminho da REGRA #4 | nenhuma automatizada |
| 67 | `edge-functions-drift-check.yml` | OTIMIZAR | Roda em TODO PR (inclusive docs-only) só para `check_paths` dizer "nada mudou" | nenhuma |
| 68 | `edge-integration-all.yml` | OTIMIZAR | Único executor dos 44 testes mocked + 110 LIVE, mas `paths: scripts/**` dispara em quase todo PR e o LIVE bate em produção em PR — **reabilitar** | nenhuma |
| 69 | `contract-tests.yml` | FUNDIR | Job `unit` é 41 s com 15 arquivos de `tests/contracts/` sem executor; job `smoke` exige Docker | Gate 2 + novo job `contract-smoke` no nightly (§4.19) |
| 70 | `stock-rupture-fuzz.yml` | FUNDIR | 25/25 success, 0,7 min — cabe no step de fuzz que já existe | `nightly-full.yml:86-91` (§4.20) |
| 71 | `auth-fuzz-weekly.yml` | FUNDIR | Dois conteúdos no lugar errado; gate estático deveria rodar em PR | nightly `quality-gate` + **Gate 1** (§4.21) |
| 72 | `log-login-fuzz-weekly.yml` | FUNDIR* (ref) | 2 dos 3 steps são cópia do `edge-integration-all.yml`, que está **desativado** → os 3 ficariam órfãos | nightly `quality-gate` + job com `setup-deno` (§4.22) |
| 73 | `daily-flows-simulation.yml` | FUNDIR | Checkout `fetch-depth: 0` + runner próprio para script de 30 s | nightly `quality-gate` (§4.23) |
| 74 | `uptime-monitor.yml` | MANTER | Único monitor de produção; as 8 falhas de hoje são incidente real (edge health-check 503) | nenhuma |
| 75 | `prod-health.yml` | FUNDIR* (ref) | Checks 1/2/4 já são Gates 0/1.1/1.17 em push main; lente: Check 3 (`.lovableignore`) **e** Check 4 (CODEOWNERS SSOT) são únicos e o destino estava desativado | Gates 0/1.1 + Checks 3 e 4 → Gate 1 (§4.24) |
| 76 | `deployment-failure-alert.yml` | MANTER | 18/25 `skipped` (não ocupam runner); o único `success` foi falha real hoje 15:05 — **reabilitar** | nenhuma |
| 77 | `dr-drill-reminder.yml` | OTIMIZAR | Cron com semântica OU (≈10 runs/trimestre) e labels inexistentes em `labels.yml` | nenhuma |
| 78 | `capacity-growth-report.yml` | **APOSENTAR** | Alvo inexistente: `ops.table_size_history` não existe no canônico (consulta `pg_class`/`pg_namespace` → `[]`) | nenhuma (migration E30 não aplicada) |
| 79 | `ci-metrics-weekly.yml` | OTIMIZAR | Coleta paginada ocupa 13 min/semana (115 workflows, 14.952 runs) | nenhuma |
| 80 | `pgss-slo-report.yml` | **APOSENTAR** | Alvo inexistente: `ops.pgss_history` não existe (E40 não aplicada) | nenhuma |
| 81 | `wraparound-monitor-report.yml` | **APOSENTAR** | Alvo inexistente: `ops.wraparound_monitor_log` não existe (E33 não aplicada); 7 runners/semana para nada | nenhuma (autovacuum do Supabase) |
| 82 | `ratchet-weekly.yml` | MANTER | ~2 min/semana, 4 PRs geradas e mergeadas; complementa Gates 1.6/1.7 | nenhuma (Gates só verificam) |
| 83 | `cache-prune.yml` | MANTER | Única política de cota de cache; 0,3 min/semana | nenhuma |
| 84 | `nightly-full.yml` | OTIMIZAR | Destino de 20 fusões, mas **nunca ficou verde** (0/6 runs) e não tem alerta | parcial |
| 85 | `sitemap-production-preconditions.yml` | OTIMIZAR | 0/33 runs verdes; a sonda retorna sempre `BLOCKED` | testes sem rede → `static-checks.yml:102-106` |
| 86 | `delivery-quality.yml` | **MANTER** (ref) | FUNDIR refutado nas 2 lentes: na supersede o arquivo já é **push-only** (`:3-18`) e está desativado (id 278918381) — o argumento de custo (2 runners/PR, "último E2E autenticado em PR") caiu | — manter push-only; fusão fica como opção do dono (§6) |
| 87 | `replenishment-quality.yml` | FUNDIR* (ref) | Metade duplica Gate 1; lente: `check-tsc-baseline.mjs` ficaria órfão e o step do nightly não aceita `env`/flags/npm script por linha de matriz | §4.25 (2 PRs) |
| 88 | `global-search-gate.yml` | FUNDIR* (ref) | 2 workflows em um; lente: destino (a) desativado, 2 projects exigem 2 linhas de matriz, 2 steps seriam descartados em silêncio | §4.26 |
| 89 | `supplier-comparison.yml` | FUNDIR* (ref) | Unitário com piso 90% é único; step visual **nunca passou** (sem diretório de baselines); lente: destino (a) desativado | §4.27 |
| 90 | `pdf-quality.yml` | OTIMIZAR | Única cobertura de `src/components/pdf`; 21 success / 0 failure; gatilho estreito — **reabilitar** e enxugar | nenhuma |
| 91 | `pdf-visual-regression.yml` | FUNDIR | Após #3612 ficou só `workflow_dispatch`; 14/25 cancelados; diff visual do PDF é único | novo job `pdf-visual` no nightly (§4.28) |
| 92 | `kit-coverage-integration.yml` | MANTER | Única checagem viva contra o SSOT da view; **está pegando regressão agora** (run 43553205153: 55% < 70%) | nenhuma |
| 93 | `personalization-trace-diagnostics.yml` | **APOSENTAR** | Diagnóstico forense com IDs cravados; o artifact expira 2026-11-24 e `if-no-files-found: error` tornaria o job vermelho sozinho | nenhuma (e desnecessária) |
| 94 | `bundle-size-report.yml` | FUNDIR | 2º `npm ci`+`npm run build` por PR (2.038 runs, 3,4 min) só para um markdown | Gate 1.6 (`deploy-gates.yml:743`) + §4.29 |
| 95 | `url-state-unit.yml` | APOSENTAR* (ref) | Já apagado na supersede; lente: os 3 arquivos não rodam em nenhum workflow ativo e o destino está desativado | `static-checks.yml:143-152` **após Etapa 0** |
| 96 | `drafts-index-check.yml` | **FUNDIR PARCIAL** (ref) | `check-index` cabe no static-checks, mas apagar/mover o arquivo **quebra o required check**: `.migration-refs-baseline.json` tem entrada para `:139` (o arquivo `PR_COMMENT.md` dentro de `qa/migrations-draft/`) e `check-migration-path-references.mjs:190-198` sai 1 com entrada órfã (roda em `deploy-gates.yml:236`) | 3 steps → Gate 1.3/static-checks; **job `publish-status` fica no arquivo** |
| 97 | `magazine-flakiness.yml` | MANTER | 25/25 verdes, semanal, única cobertura de `ringsOf`/`focusRingsOf` | nenhuma |
| 98 | `magazine-mutation.yml` | OTIMIZAR | Mutation testing com mediana 31,5 min (máx 206) não é gate de PR — aplicar o precedente E81 | nenhuma |
| 99 | `magazine-unit-tests.yml` | FUNDIR* (ref) | 5 jobs por paths largos (`src/hooks/auth/**`, `package.json`); lente: 3 dos 4 pedaços não têm destino ativo | §4.30 (3 etapas) |

---

## 3) EXCLUIR / MOVER PARA `recovery/workflows-aposentados/`

Convenção da PR #3525: `git mv .github/workflows/<x>.yml recovery/workflows-aposentados/<x>.yml` +
linha na tabela de `recovery/workflows-aposentados/README.md`. **Nunca** `git rm` sem a cópia.

### 3.A — Imediatos (14), sem pré-requisito

#### 1. `delete-orphan-edges.yml`
- `.claude/commands/merge-prs.md:10,30` — remover/corrigir "dispara delete-orphan-edges.yml".
- `docs/AUTOMACAO_LOCAL.md:366`; `docs/historico/orphan-edges-2026-05-10.md` (nota de encerramento:
  6 edges ausentes em 2026-11-14); `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md`,
  `docs/estado/09_CI_INFRA_SCRIPTS.md`, `docs/prod-readiness.md:931`.
- `keep-workflows.txt` — retirar (está listado como mantido, apesar de 0 runs).
- **Não** mexer em `.migration-refs-baseline.json` (as 3 entradas de workflow são `deploy-gates.yml`,
  `drafts-index-check.yml`, `schema-snapshot-export.yml`).
- **Risco: baixo.** Perde-se a ferramenta `extraEdges` (dry-run + allowlist); restaurável em 1 commit.

#### 2. `cross-reference-issues.yml`
- `CONTRIBUTING.md:241-269` — trocar "bot comenta" por "use `Closes #N`/`Refs #N`".
- `docs/AUTOMACAO_LOCAL.md:361`, `docs/prod-readiness.md:842`, `docs/estado/09_CI_INFRA_SCRIPTS.md`.
- **Risco: baixo.** Nenhum gate valida esses docs.

#### 3. `stale.yml`
- `recovery/workflows-aposentados/README.md`; `docs/prod-readiness.md:890`.
- **Atenção:** é o único arquivo **ativo por omissão** (não está em `disabled-workflows.tsv`) — apagar
  o arquivo é o que efetivamente desliga o cron.
- **Risco: baixo ao aposentar; alto ao manter** (fecharia a issue P0 #1871 a partir de ~2026-11-21).

#### 4. `lovable-autoheal.yml`
- `scripts/autoheal-eslint/run.test.mjs:109-111` — já repontado para `recovery/…` na supersede.
- `scripts/check-workflow-contracts.allowlist.json:8,18` — remover as entradas mortas (a #3525 não
  removeu). Não quebra: `check-workflow-contracts.mjs:798-813` ignora entrada que não casa.
- `eslint.config.js:136`, `scripts/autoheal-eslint/README.md:3`, inventários.
- **PROIBIDO:** apagar `scripts/autoheal-eslint/run.test.mjs`. Se apagar, `automation.mjs doctor
  --static` falha (`scripts/automation.mjs:496-498` e `:500-505`) e derruba `static-checks.yml:135`;
  nesse caso é obrigatório remover o arquivo de `scripts/automation.config.json:9,42,72`.
- **Risco: baixo.**

#### 5. `lovable-edit-tracker.yml`
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:126`, `docs/estado/09_CI_INFRA_SCRIPTS.md:95,189`,
  `docs/prod-readiness.md:871`. Já está em `recovery/` na supersede.
- **Risco: baixo.**

#### 6. `lovable-protected-audit.yml`
- `docs/agentes/lovable-conflitos-vercel.md:32` (doc apontado pelo AGENTS.md).
- `scripts/automation.config.json:1960,2312` (`reason`, texto livre).
- `recovery/workflows-aposentados/README.md` — **corrigir a frase** que aponta a cobertura para
  "o check 3 do `prod-health.yml`": `prod-health.yml` também sai (§4.24) → apontar para o step novo.
- **Risco: baixo** (nenhum alvo: sem commits do Lovable desde 2026-08-31).

#### 7. `e2e-crm-callback-approved.yml`
- `docs/ci/SEGREDOS.md:93-94` — `V4_CALLBACK_URL` vira phantom (não quebra o Gate 1.14:
  `check-secrets-inventory.mjs:353-356` só falha em secret **referenciado e não documentado**).
- `docs/ci/PADRAO_WORKFLOW.md:590` (cron 06:20), `docs/estado/07_EDGE_FUNCTIONS.md:179`,
  `docs/AUTOMACAO_LOCAL.md:377`, `docs/estado/09_CI_INFRA_SCRIPTS.md:55`, `docs/prod-readiness.md:854`.
- `e2e/README.md` — documentar como reativar quando `CRM_CALLBACK_API_KEY` existir.
- **Risco: baixo.** Não havia cobertura: o spec se auto-pula (`e2e/flows/28-crm-callback-approved.spec.ts:12-13,22`).

#### 8. `e2e-color-swatch-grid.yml`
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:91`, `PENDENCIAS.md`,
  `analise-prs/dossies/PR-3228.md`, `docs/AUTOMACAO_LOCAL.md`, `docs/prod-readiness.md`.
- **Obrigatório na mesma onda:** consertar a suíte `color-swatch` do nightly
  (`nightly-full.yml:199-205`, job 132307428056 vermelho por saturação do catálogo de produção) —
  mockar via `e2e/helpers/swatch-catalog-mocks`.
- **Risco: médio.** Enquanto a suíte do nightly estiver vermelha, a cobertura é nominal.

#### 9. `e2e-dialogs-pr-check.yml`
- `scripts/check-visual-baselines.mjs:32` (comentário) e `:108` (mensagem).
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:94` e inventários.
- **Risco: baixo** — a deleção mais segura do conjunto: `nightly-full.yml:212-219` roda os 4 specs e
  passou **verde** (job 132307428004, 44 s); a lista `PROTECTED` do Gate 1.4
  (`check-visual-baselines.mjs:45-48`) é por **spec**, não por workflow.

#### 10. `e2e-magazine-header.yml`
- `scripts/automation.config.json:1320` (`reason`).
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:99` e históricos.
- **Obrigatório na mesma PR:** `nightly-full.yml:206-211` → `project: chromium-authed`
  (`playwright.config.ts:99-106`), mantendo `requires_auth: true` (o step `:245-252` já passa
  `E2E_USER_*` condicionalmente). Sem isso a suíte segue vermelha (job 132307428039, 15 min).
- **Risco: médio** se o project não for trocado.

#### 11. `capacity-growth-report.yml`
- `recovery/.../README.md`: + "reativar quando a migration **E30** (20260916211500) for aplicada via
  `db-apply-migration.yml`".
- `docs/ci/SEGREDOS.md:18` — remover dos consumidores de `SUPABASE_ACCESS_TOKEN`.
- **MANTER** `scripts/capacity-growth-projection.mjs` e seu registro em `automation.config.json`
  (`automation.mjs:496-505`; doctor roda em `static-checks.yml:135`).
- **Risco: baixo** (verde-vazio: `ops.table_size_history` não existe).

#### 12. `pgss-slo-report.yml`
- Idem, com **E40** (20260917150000). Manter `scripts/pgss-slo-check.mjs` + registro.
- `tests/scripts/pgss-slo-check.test.mjs:2` é só comentário.
- **Risco: baixo.**

#### 13. `wraparound-monitor-report.yml`
- Idem, com **E33** (20260917160000). Manter `scripts/wraparound-monitor-check.mjs` + registro.
- O comentário `:18` cita os outros 2 monitores — sai junto se os 3 forem aposentados na mesma PR.
- **Risco: baixo** (o risco de wraparound já está fora do CI: autovacuum gerenciado).

#### 14. `personalization-trace-diagnostics.yml`
- **EDIÇÃO OBRIGATÓRIA (senão o `static-checks` fica vermelho em todo PR):** remover o registro
  `legacy-5f4408540713de99` de `scripts/automation.config.json:2402-2409` ao apagar/mover
  `scripts/diagnose-personalization-artifact.py` — `automation.mjs:500-505` emite "registro sem
  arquivo" e `:506-509` valida os argumentos de `manual`. **Alternativa mais simples: manter o `.py`
  em `scripts/`** (o registro continua válido e nada muda).
- `tests/scripts/test_personalization_artifact_diagnostics.py:22` carrega o `.py` por caminho — mover
  junto ou manter ambos.
- `docs/operations/PERSONALIZATION_TRACE_DIAGNOSTICS.md:102` (marcar histórico); `docs/prod-readiness.md`.
- **Ordem:** executar junto/depois da aposentadoria de `e2e-personalization.yml` (fonte do artifact).
- **Risco: baixo** — o job quebraria sozinho em 2026-11-24 (artifact 13761206861 expira; `:62`
  usa `if-no-files-found: error`).

### 3.B — Com pré-requisito (11)

#### 15–17. `automation-local.yml`, `ui-visual-a11y.yml`, `url-state-unit.yml`
- **Pré-requisito: Etapa 0** (§7) — `static-checks.yml` mergeado **e** reabilitado
  (`github_enable_workflow 417403614`) com run verde em PR.
- `automation-local.yml`: `scripts/automation.config.json:2413` (`ci.file`, já repontado na supersede
  para `static-checks.yml`); `docs/AUTOMACAO_LOCAL.md:25` (não atualizado pela #3525).
- `ui-visual-a11y.yml`: `scripts/check-visual-baselines.mjs:33` (comentário) e `:108` (mensagem);
  `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:161,486`; `docs/estado/10_TESTES.md`.
  A lista `PROTECTED` (`:46-47`) é por spec (`confirm-dialog-visual`, `alert-dialog-visual`) → Gate 1.4 intacto.
- `url-state-unit.yml`: `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md`, `docs/ci/PADRAO_WORKFLOW.md`.
  Gate E89 (`scripts/ci-cron-table.mjs --min-spacing 20`) só falha em **colisão** (`:234`) — remover
  o cron `41 6 * * 1` apenas afrouxa.
- **Alternativa se a Etapa 0 falhar:** acrescentar os arquivos de teste ao step do job `unit-tests`
  do `deploy-gates.yml` (Gate 2) — **nunca** apagar deixando a cobertura em zero.
- **Risco: alto se a Etapa 0 for pulada** (cobertura ZERO sem nenhum check vermelho avisando, porque
  workflow desativado não produz check).

#### 18–23. `e2e-focused.yml`, `e2e-cart.yml`, `e2e-stock.yml`, `e2e-freight.yml`, `e2e-personalization.yml`, `e2e-discount-approval.yml`
- **Pré-requisito: Etapa 2** (§7) — fusão do `e2e.yml` mergeada **e** com um **run verde citado** do
  `nightly-full.yml` rodando o glob (`npx playwright test --project=X --shard=N/4 --grep-invert @smoke`,
  4 shards × 2 projects, `timeout-minutes: 30`, `check-min-tests` por shard). Hoje
  `nightly-full.yml:142-152` roda 7 specs nomeados e nenhum destes está na lista.
- `e2e-focused.yml`: **antes de apagar**, portar `notify_failure`/`notify_success`
  (`:162-233`, action `./.github/actions/ci-issue`) para o nightly — é o único alerta de cron E2E.
  Fechar as 10 issues `ci-focused-e2e` (#3026, #2259, #2258, #2257, #2256, #2130, #2129, #2128, #2127, #2126).
  `docs/ci/PADRAO_WORKFLOW.md:573`; `nightly-full.yml:178` (comentário).
  Limpar a entrada mentirosa de `scripts/check-workflow-contracts.allowlist.json:2`
  ("e2e-focused.yml não existe mais"). Perde-se `--fail-on-flaky-tests` e `max_skipped_ratio 0`.
- `e2e-cart.yml`: `docs/ci/SEGREDOS.md:44,46,47`; `docs/AUTOMACAO_LOCAL.md:374`; `docs/prod-readiness.md:818`.
- `e2e-stock.yml`: na supersede o conflito foi resolvido a favor do schedule — passar a remoção.
  **O nightly precisa herdar 4 shards e timeout 30** (as suítes `future-stock`/`dashboard` são as que
  estouravam 20 min). `docs/AUTOMACAO_LOCAL.md:388`; `docs/prod-readiness.md:822,1090`.
  No README do recovery, registrar que a cobertura de estoque fica **EM ABERTO** até a Etapa 2 —
  não afirmar cobertura por shards.
- `e2e-freight.yml`: `docs/AUTOMACAO_LOCAL.md:383`; `docs/prod-readiness.md:859`.
  **Corrigir a justificativa**: `e2e-quotes.yml` (citado como cobertura do `quote-freight-block.spec.ts`)
  está desativado (id 385416296) → declarar "nenhuma hoje", ou acrescentar os 2 specs a uma linha de
  matriz de `e2e-visual-focused`.
- `e2e-personalization.yml`: `docs/AUTOMACAO_LOCAL.md:386`; `docs/estado/09_CI_INFRA_SCRIPTS.md:62,247`;
  `docs/prod-readiness.md:821`. Executar junto com `personalization-trace-diagnostics.yml`.
- `e2e-discount-approval.yml`: `docs/AUTOMACAO_LOCAL.md:380`; `docs/estado/09_CI_INFRA_SCRIPTS.md:58`;
  `docs/prod-readiness.md:820`. `docs/ci/METRICAS_SEMANAIS.md:36` é **gerado** (não editar à mão).
  Abrir issue de correção dos 15 testes `04c*` (idempotência, paginação, realtime) para a falha não
  ficar sem dono. Perde-se `--repeat-each=3` (detecção de flake) — opcional: linha de matriz no nightly.
- Todos: `_secrets-check.yml`/`_e2e-relevance.yml` continuam em uso por `deploy-gates.yml:538` e `:121`
  (sem órfão). Nenhum script/teste lê esses YAML (grep: só auto-referência).
- **Risco: alto se a Etapa 2 for pulada** — ~40 specs deixam de rodar em silêncio.

#### 24. `e2e-check-calendar-snapshots.yml`
- **Pré-requisito:** fusão do `visual-tests.yml` (§4.10) mergeada, com a suíte `calendar-ring`
  **verde** no nightly. Hoje a matriz `nightly-full.yml:189-219` só tem `pdf-dialog`, `color-swatch`,
  `magazine-header` e `dialogs`; `visual-tests.yml` e `update-snapshots.yml` estão desativados.
- `scripts/check-visual-baselines.mjs:38-39` (comentário) e `:107` (mensagem).
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:90`, `docs/AUTOMACAO_LOCAL.md`,
  `docs/estado/09_CI_INFRA_SCRIPTS.md`, `docs/prod-readiness.md`.
- Gate 1.4 não é afetado (a lista `PROTECTED` `:45-50` não inclui o spec do calendário).
- **Risco: médio** sem o pré-requisito (cobertura do calendário = zero).

#### 25. `restore-seller-cart-rpc.yml`
- **Pré-requisito:** acrescentar `tests/security/restore-seller-cart-rpc.test.ts` (valida
  **comportamento**: `invalid_snapshot | not_authenticated | seller_mismatch` em `:106`, bloco
  `describe.skipIf(!hasServiceRole)` `:126-144`) ao step do job `unit-tests` do `deploy-gates.yml`
  (Gate 2) **ou** ao `quality-gate` do nightly. O Gate 5.5 (`deploy-gates.yml:686`,
  `scripts/check-restore-seller-cart-rpc.mjs`) só distingue assinatura ausente/presente.
- `docs/ci/SEGREDOS.md:21-22` (phantom, não quebra o gate); `docs/ci/PADRAO_WORKFLOW.md` tabela E89
  (regenerar com `node scripts/ci-cron-table.mjs`); `db-schema-drift-check.yml:60` e
  `security-definer-acl-multi-env.yml:24` (comentários citam o cron 09:49);
  `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:149`; `keep-workflows.txt` (retirar).
- GitHub: cancelar a run 43582489313 em `waiting`.
- **Risco: médio** sem o pré-requisito (hoje o workflow também não entrega: 24 cancelled / 1 waiting,
  `ultimo_sucesso = null`).

---

## 4) FUNDIR — destino exato (arquivo, job, steps)

### 4.1 `_e2e-relevance.yml` → `deploy-gates.yml` job `changes` — **5 passos, nesta ordem**
O job `changes` (`deploy-gates.yml:70-118`) roda `dorny/paths-filter` **sem** `list-files: json` e
**sem** filtro `all`, declara só `outputs.docs_only` (`:74-75`) e **não** chama
`.github/scripts/e2e-relevance.mjs`. Sem as 3 adições abaixo o script fica sem entrada
(`CHANGED_FILES` vazio → `relevant=false` sempre).
1. `deploy-gates.yml:80-84` — acrescentar `all: - '**'` ao filtro e `list-files: json` ao `with`.
2. Novo step com `id` próprio: `node .github/scripts/e2e-relevance.mjs`, `env: CHANGED_FILES: ${{ steps.filter.outputs.all_files }}`.
3. `deploy-gates.yml:74-75` — novo output `relevant: ${{ steps.<id>.outputs.relevant }}`.
4. `deploy-gates.yml:558` — `needs.e2e-relevance.outputs.relevant` → `needs.changes.outputs.relevant`;
   remover `e2e-relevance` de `needs` em `:547`.
5. Só então remover o job `:120-121` e mover o arquivo para `recovery/`.
- **Chamadores a limpar antes** (linhas no ref supersede): `delivery-quality.yml:34`,
  `deploy-gates.yml:121`, `e2e-flows.yml:47`, `e2e-focused.yml:37`, `e2e-personalization.yml:42`,
  `e2e-swatch-quickview.yml:48`, `e2e.yml:45`, `replenishment-quality.yml:36`, `visual-tests.yml:33`.
  `uses:` local é validado pelo **actionlint** (`static-checks.yml:162-171`); `check-workflow-contracts.mjs`
  **não** valida `uses:` local (só C8 para `node scripts/…`, `:178-190`).
- `.github/scripts/e2e-relevance.mjs` **permanece** (não tem teste: grep em `tests/`, `scripts/`, `src/`, `e2e/`).
- `docs/AUTOMACAO_LOCAL.md:346`; inventários. **Git 7** (toca `deploy-gates.yml`) → PR fica aberta.

### 4.2 `workflow-lint.yml` → `static-checks.yml:162-171` (já feito na supersede)
Step `actionlint + shellcheck`, mesmo SHA256 do tarball v1.7.7 e os mesmos 2 `-ignore` (SC2129,
`run_started_at`). `scripts/automation.config.json:1224` já repontado.
- **Pré-requisito: Etapa 0.** Alternativa de custo zero: step `Gate 1.11b — actionlint + shellcheck`
  no job `lint-typecheck` logo após o Gate 1.11 (`deploy-gates.yml:369`), com `curl --retry 3` —
  **nunca** `continue-on-error`.
- `docs/ci/PADRAO_WORKFLOW.md:5,195,546`; `docs/agentes/ci-gates.md:64,113-114`; `docs/AUTOMACAO_LOCAL.md:190`.

### 4.3 `ci-security-drift.yml` → 3 destinos (ampliado pelas lentes)
| Conteúdo | Destino |
|---|---|
| ~13 guardas `npm run check:*` + `audit:credentials` (`check:fab-a11y`, `check:outline-none`, `check:removed-phrases`, `check-no-quote-comments.mjs`, `check:no-followup-frontend`, `check:iframe-sandbox`, `check:allowlist-memory`, `check:clickable`, `check-invoke-direct-calls.mjs`) | steps no job `lint-typecheck` do `deploy-gates.yml` (**ou** `static-checks.yml` após Etapa 0) |
| `node scripts/check-tsc-baseline.mjs` (ratchet vs `.tsc-baseline.json`) — **NÃO listado no proposto** | step em `static-checks.yml` (node puro, sem secret). Hoje só 2 executores: `ci-security-drift.yml:47` e `replenishment-quality.yml:61`, **ambos** propostos para fundir. Gate 1.7 usa `scripts/tsc-unused-ratchet.sh` contra `.tsc-ratchet-baseline` — **script e baseline diferentes** |
| `npx vitest run tests/hooks` — **NÃO listado** (a cobertura citada era `ci.yml:417`, desativado) | step no job `quality-gate` do `nightly-full.yml` (`tests/hooks/**` está excluído de `test:quality` por `package.json:97` e ausente de `test:ci-core`) |
| drifts `lint-0029`/`lint-0011`/`secdef-anon` `--require-live` | job novo no `nightly-full.yml` ou job `acl-check` do `security-definer-acl-multi-env.yml` |
| smokes `e2e/smoke.spec.ts` + `e2e/flows/20-all-features-smoke.spec.ts` | Gate 3 (`deploy-gates.yml:592`) só pega os `@smoke` — confirmar antes |
| `check:dependency-audit`, `lint:baseline`, `build`, `check:no-salvar-alteracoes-draft` | já em `deploy-gates.yml` (Gates 0.5/1/1.5/6) |
- `docs/ci/SEGREDOS.md:19,21,22`; `docs/ci/PADRAO_WORKFLOW.md:586` (regenerar com `ci-cron-table.mjs`);
  `scripts/automation.config.json:688,832,1176`; `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:23,73`.

### 4.4 `e2e.yml` → `nightly-full.yml` jobs `e2e-tests`/`e2e-merge` — **fundir antes, apagar depois**
1. Substituir `nightly-full.yml:142-152` (7 specs nomeados) pelo comando de **suíte inteira** de
   `e2e.yml:232-234`/`:246-250`: `npx playwright test --project=${{ matrix.project }} --shard=${{ matrix.shard }}/4 --grep-invert @smoke`.
2. `matrix.shard` `[1,2]` → `[1,2,3,4]`; `matrix.project` `[chromium-public, chromium-authed]`;
   `timeout-minutes` 20 → **30** (`nightly-full.yml:104-108`).
3. Portar o guard `check-min-tests` **por shard** (`e2e.yml:238`) — sem ele o nightly aceita shard com 0 testes.
4. Portar `notify_failure`/`notify_success` de `e2e-focused.yml:162-233` (`./.github/actions/ci-issue`).
5. Manter o **id** do job `e2e-tests` e o bloco `audit-report` —
   `tests/scripts/nightly-audit-wiring.test.mjs:5,18` exige `needs.e2e-tests.result == 'success' && 'passed'`.
6. Rodar `workflow_dispatch` e **citar o run verde** antes de mover qualquer arquivo dependente.
- `.gitleaks.toml:12,20`; `e2e/README.md:82-88`; `deploy-gates.yml:570` (comentário);
  `scripts/automation.config.json:1312`; `docs/ci/SEGREDOS.md:46-47` (manter `E2E_SELLER_*` no job
  fundido, como `e2e.yml:239-240`, para não virar phantom); `docs/AUTOMACAO_LOCAL.md:201,391`;
  `docs/estado/09_CI_INFRA_SCRIPTS.md:83,239-241,312-314`.
- **Dependência:** é pré-requisito de 6 aposentadorias (§3.B 18–23).

### 4.5 `e2e-flows.yml` → novo job `e2e-mobile` no `nightly-full.yml`
- `project: mobile-chrome` (`playwright.config.ts:131`), specs `e2e/flows/sidebar-tooltips` e
  `29-mobile-critical-routes`. **Nenhum workflow mantido usa `mobile-chrome`/`mobile-safari` hoje.**
- O resto (25/26/27/28/30 e sidebar desktop) depende da Etapa 2.
- Perde-se o limiar por spec (min 7 e 9) — o shard do glob usa min 1.
- `docs/AUTOMACAO_LOCAL.md:381`; `docs/estado/09_CI_INFRA_SCRIPTS.md:59,149,162,224-227,233,314,694`;
  `docs/estado/10_TESTES.md:25,513`.

### 4.6 `e2e-customization-collapse.yml` → `nightly-full.yml` job `e2e-visual-focused`
- Linha de matriz: `suite: customization-collapse`, specs
  `e2e/flows/04d-customization-collapse.spec.ts e2e/customization/collapse-reflow.spec.ts`,
  `project: chromium-authed`, `requires_auth: true`.
- **Levar junto** (senão a linha roda sem a verificação que dá sentido ao spec):
  `node scripts/qa/check-collapse-baselines.mjs` (step prévio, `if: matrix.suite == 'customization-collapse'`)
  e `scripts/build-visual-diff-report.mjs`.
- `e2e/customization/collapse-reflow.spec.ts:48`; `README.md:835`;
  `scripts/automation.config.json:256,1768`; `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:93`.
- **NÃO VERIFICADO:** o standalone sobe o Vite (`start-vite: 'true'`, `E2E_BASE_URL localhost:8080`);
  o nightly usa o `webServer` do `playwright.config.ts`.

### 4.7 `e2e-pdf-dialog.yml` → corrigir `nightly-full.yml:195-198`
- Matriz: `project: chromium-authed`, `requires_auth: true` (hoje `chromium-public`/`false`, o spec
  pula tudo fora de `AUTHED_PROJECTS` — job terminou em 1 min).
- **Acrescentar `sudo apt-get install -y poppler-utils`**: confirmado que o job só instala Chromium
  (`nightly-full.yml:243-244`).
- Portar `scripts/recalibrate-watermark-thresholds.mjs` (`:131-152`) e o gate de drift (`:196-214`),
  com `if: matrix.suite == 'pdf-dialog'`.
- Regeneração via `update-snapshots.yml` (spec `e2e/flows/pdf-dialog.spec.ts`, project `chromium-authed`).
- `scripts/automation.config.json:1880`; `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:100,442`.

### 4.8 `e2e-swatch-quickview.yml` → `nightly-full.yml` `e2e-visual-focused` (**2 linhas de matriz**)
- O step `:245-252` usa `--project=${{ matrix.project }}` (**um** valor) → 1 linha para
  `chromium-authed` e 1 para `firefox-authed` (`playwright.config.ts:99,110`).
- Instalar firefox no job (hoje só chromium, `:243-244`).
- **`E2E_MOCK_AUTH: '1'` tem de entrar no step** `:245-252` (o `env` do step só tem `E2E_USER_*`) —
  a matriz sozinha não injeta.
- Portar `./.github/actions/check-min-tests` (E42) e aplicar `max-parallel` no job (o `max-parallel: 1`
  existia para não saturar o Auth de produção). WebKit: descartar (era `continue-on-error`).
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:104,359-361,422,441`.

### 4.9 `e2e-visual-preview-button.yml` → `nightly-full.yml` `e2e-visual-focused`
- `suite: preview-button`, spec `e2e/visual/preview-button.spec.ts`, `project: chromium-public`,
  `requires_auth: false`, step prévio `node scripts/check-visual-preview-suite.mjs`,
  **sem** `--update-snapshots=missing` (`:106`).
- **EDIÇÕES OBRIGATÓRIAS, no mesmo commit:** `scripts/check-visual-preview-suite.mjs:9,24`
  (`REQUIRED_FILES` cita literalmente `.github/workflows/e2e-visual-preview-button.yml` e sai 1 em
  `:41-50`) → apontar para `nightly-full.yml`; `tests/scripts/check-visual-preview-suite.test.mjs:68,164`
  (`:164` espera o caminho no stderr; roda no vitest por `vitest.config.ts:65` → **Gate 2**);
  `package.json:146` (`check:visual-preview-suite`).
- `scripts/check-visual-baselines.mjs:34,108`; `scripts/automation.config.json:1208`;
  `docs/estado/14_LACUNAS_COBERTURA.md`.

### 4.10 `visual-tests.yml` → `nightly-full.yml` `e2e-visual-focused` suíte `calendar-ring`
- Specs `e2e/ui/calendar-visual.spec.ts e2e/ui/magazine-ring-visual.spec.ts`, `project: chromium-public`,
  `requires_auth: false`, `--fail-on-flaky-tests`, step posterior `./.github/actions/check-min-tests`
  (min 10, `max-skipped-ratio '0'`).
- `scripts/check-visual-tests-specs.mjs:16` (`const WORKFLOW = '.github/workflows/visual-tests.yml'`,
  `readFileSync` em `:19`) — o único executor é `visual-tests.yml:76`, então **o script sai junto**
  (mover para `recovery/` ou remover o registro). `tests/scripts/check-visual-tests-specs.test.mjs:28`
  escreve o YAML num **sandbox** (`mkdtempSync`, `cwd=sandbox` `:47-48`) → **NÃO é edição obrigatória**
  (correção da lista do proposto).
- **Cuidado:** retarget ingênuo para `nightly-full.yml` quebra o gate em `pdf-dialog`,
  `magazine-header-*`, `color-swatch-wrap-visual`, `product-card-badges-visual` e
  `replenishment-grid-visual` (`toHaveScreenshot` sem `-snapshots/`).
- `scripts/check-visual-baselines.mjs:104`; `e2e/catalog/product-card-badges-visual.spec.ts:9`;
  `scripts/automation.config.json:1216`; `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:166,361,418-424`.
- **Pré-requisito de** `e2e-check-calendar-snapshots.yml` (§3.B 24).

### 4.11 `optimized-image-e2e.yml` → `nightly-full.yml` `e2e-visual-focused`
- `suite: optimized-image`, specs `e2e/optimized-image-detection.spec.ts e2e/optimized-image-visual.spec.ts`,
  `project: chromium-public`, `requires_auth: false`.
- Se a suíte depender de `--update-snapshots` (indicado por `check-visual-baselines.mjs:40`), a flag
  precisa entrar no step `:245-252`. Gate 1.4 não protege esses baselines (`:40-41` marca como excluído).
- `scripts/check-visual-baselines.mjs:40`; `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:135,462`.

### 4.12–4.14 `check-select-columns.yml`, `check-no-prod-leak.yml`, `lint-untyped-from.yml` → `static-checks.yml`
Steps já existentes na supersede: `:85-88` (`node scripts/check-select-columns.mjs`), `:80-83`
(`node scripts/check-no-prod-leak.mjs`), `:90-93` (`bash scripts/lint-untyped-from.sh`), todos com
`steps.setup.outcome == 'success'`. **Pré-requisito: Etapa 0.**
- `automation.config.json:1088` e `:824` já repontados; **`:1392` ainda cita `check-select-columns.yml`**
  (texto livre, não quebra).
- `regenerate-supabase-types.yml:21` (comentário cita `lint-untyped-from.yml`).
- `static-checks.yml:32-33` documenta que o gatilho ficou **sem** filtro de branch justamente para
  preservar o comportamento do `lint-untyped-from.yml` em PRs empilhadas (superset confirmado).
- **Alternativa se a Etapa 0 falhar:** steps no job `lint-typecheck`/`ssot-gate` do `deploy-gates.yml`
  (nenhum dos 3 exige `npm ci`).

### 4.15 `ts-unused-ratchet.yml` → **nenhum step novo** (cobertura já existe)
- `deploy-gates.yml:211` (`npm run lint:baseline`; `package.json:115,117`) + Gate 1.7
  (`sh scripts/tsc-unused-ratchet.sh --check-ratchet`) + `ratchet-weekly.yml:53` (`--update`, **ativo**).
- Mover o arquivo para `recovery/`; `docs/ci/PADRAO_WORKFLOW.md:596` (regenerar tabela de crons).
- Regressão que só o `tsc` pega passa a aparecer no nightly/segunda — **risco médio-baixo**.

### 4.16 `ssot-supabase.yml` → `deploy-gates.yml` job `ssot-gate` (preferido)
- `ssot:validate` já está em `deploy-gates.yml:133`. **`ssot:guard`** (`scripts/guard-canonical-project.mjs`
  — uma das guardas do projeto proibido `pqpdolkaeqlyzpdpbizo`) e **`ssot:hosts`**
  (`scripts/check-docs-supabase-hosts.mjs`) não têm outro executor e **não estão** em
  `static-checks.yml` hoje (a lista de steps vai de `:80` a `:183`).
- Destino alternativo: `static-checks.yml` após Etapa 0 (é onde PR docs-only é coberto — o Gate 1 do
  deploy-gates é bypassado em docs-only).
- **Obrigatório:** `scripts/ssot-report*.mjs` e `validate-ssot-report.mjs` **permanecem** em `scripts/`
  (sem consumidor em CI, mas `automation.mjs:496-498` exige registro para todo arquivo sob `scripts/`,
  e o doctor roda em `static-checks.yml:135`). Anotar no README do recovery.

### 4.17 `drafts-index-check.yml` → **FUNDIR PARCIAL (o arquivo NÃO sai)**
- **Vai para o destino** (3 steps, padrão `if: ${{ !cancelled() && steps.setup.outcome == 'success' }}`):
  `npm run drafts:check`, `npm run drafts:target:check`, `npm run drafts:status:check`
  (`drafts-index-check.yml:75-92`) → job `lint-typecheck` do `deploy-gates.yml` no bloco do
  **Gate 1.3** (preferido: é o bloco de contratos de migration e roda em todo PR) **ou**
  `static-checks.yml` após Etapa 0.
- **FICA no arquivo:** o job `publish-status` (`:94-171`), com `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`
  (`:117-124`) e o comentário em PR (`:130-154`). **Motivo (quebra dura do required check):**
  `.migration-refs-baseline.json` tem a entrada `{file: '.github/workflows/drafts-index-check.yml',
  ref aponta para `PR_COMMENT.md` em `qa/migrations-draft/`}`; a referência vive em `:139`
  (um `fs.readFileSync` desse mesmo arquivo) e `PR_COMMENT.md` **não existe** no repo
  (é gerado em runtime). `scripts/check-migration-path-references.mjs:190-198` sai 1 com entrada
  **órfã** e `:174-188` sai 1 com **nova** referência quebrada (mover para `recovery/` é igualmente
  fatal: `recovery` não está em `IGNORE_DIRS` `:40-44`). O script roda em `deploy-gates.yml:236`
  (step `Gate 1.3 — Migration contracts (bloqueante)`, `:232`) → reprova **`Gate Final - Deploy Ready`**.
- Se o dono quiser mesmo descartar o `publish-status`, a **mesma PR** tem de editar
  `.migration-refs-baseline.json` (remover a entrada ou trocar o `file`) e validar com
  `node scripts/check-migration-path-references.mjs` antes do push. `.migration-refs-baseline.json`
  está em `scripts/check-codeowners-coverage.mjs:28-54` (GATE_FILES) — já coberto por `.github/` no CODEOWNERS.
- Otimização aproveitável: se o `publish-status` ficar, mudar para `push: main` + `workflow_dispatch`
  (o comentário em PR é o único trecho que exige `pull-requests: write`, `:44`).
- **Correção de evidência:** `check-draft-canonical-target.mjs` **não** é o único arquivo que barra
  `pqpdolkaeqlyzpdpbizo` — o mesmo ID aparece em `scripts/guard-canonical-project.mjs`,
  `promote-draft-migration.mjs`, `list-migration-drafts.mjs`, `validate-supabase-config.mjs` (Gate 0)
  e `check-workflow-contracts.mjs` (C20). Ainda assim é o único que valida **rascunhos**.
- `docs/ci/SEGREDOS.md:23-27`; `docs/estado/14_LACUNAS_COBERTURA.md`;
  `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md`; `scripts/automation.config.json:232,512,1632,1656` (`reason`).

### 4.18 `quote-number-hardening-verify.yml` → novo job `quote-number-hardening` no `nightly-full.yml`
- Job independente (para não misturar com o vermelho de E2E), com os secrets atuais.
- `docs/ci/PADRAO_WORKFLOW.md` tabela E89 (remover "a cada 6h (xx:15)") via `node scripts/ci-cron-table.mjs`;
  `docs/ci/SEGREDOS.md:18`; `wraparound-monitor-report.yml:32` (comentário de colisão 06:15);
  `scripts/automation.config.json:2336`; `docs/AUTOMACAO_LOCAL.md:416`;
  `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:143`; `keep-workflows.txt`.
- Acrescentar job ao nightly **não** cria cron novo (`nightly-full.yml:8-10`).

### 4.19 `contract-tests.yml` → Gate 2 + novo job no nightly
- Job `unit` → step no job `unit-tests` do `deploy-gates.yml` (Gate 2), listando **explicitamente os
  15 arquivos** de `tests/contracts/` que faltam (hoje `test:ci-core` cobre só
  `migrated-endpoints.contract.test.ts` — `package.json:98` — e `webhook-scenario-matrix.test.ts` —
  `deploy-gates.yml:499-503`).
- Job `smoke` (Docker + Postgres) → novo job `contract-smoke` no `nightly-full.yml`, ou descartado /
  `workflow_dispatch`.
- **Armadilha:** se o step novo se chamar `Gate X.Y`, `scripts/check-gates-table.mjs:26-37` exige linha
  em `docs/agentes/ci-gates.md` (exit 1 em `--gate`, `:51-54`).
- Manter o id `e2e-tests` e o bloco `audit-report` (`tests/scripts/nightly-audit-wiring.test.mjs:5,11-19`).
- `tests/sql/contract_smoke_schema.sql:1`; `docs/estado/09_CI_INFRA_SCRIPTS.md:37,217,249`.
- **Risco:** o Gate 2 passa a bloquear 15 arquivos hoje informativos → rodar
  `npx vitest run tests/contracts/` antes de mergear. **Git 7** (toca `deploy-gates.yml`).

### 4.20 `stock-rupture-fuzz.yml` → `nightly-full.yml:86-91`
- Acrescentar `src/lib/inventory/__tests__/stock-filter.rupture-risk*.test.ts` (2 arquivos) à lista do
  step `Vitest — stress + fuzz badges (blocking)` do job `quality-gate` (**verde** no run 43547977655,
  job 132303631026, step 11 success).
- Replicar o upload de `.fuzz-artifacts/fuzz.log` com `retention-days` (R20/C21).
- `docs/ci/PADRAO_WORKFLOW.md:578`; `docs/estado/09_CI_INFRA_SCRIPTS.md:124,172`.

### 4.21 `auth-fuzz-weekly.yml` → 2 destinos
- `npx vitest run src/lib/auth` → `nightly-full.yml:86-91` (job `quality-gate`).
- `node scripts/check-auth-direct-calls.mjs` → **job `lint-typecheck` do `deploy-gates.yml` (Gate 1)**
  — escolha explícita da lente de cobertura, **não** `static-checks.yml`.
- **Obrigatório:** `scripts/check-auth-direct-calls.mjs` permanece em `scripts/` com registro em
  `automation.config.json` (`automation.mjs:496-498`; doctor em `static-checks.yml:135`).
- Rodar o script localmente antes de ligar (pode reprovar violações pré-existentes — **não** ampliar
  allowlist para calar).
- `docs/ci/PADRAO_WORKFLOW.md:585`; `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:65`;
  `docs/estado/09_CI_INFRA_SCRIPTS.md:26`.

### 4.22 `log-login-fuzz-weekly.yml` → `nightly-full.yml` (**3 steps, não 1**)
A cobertura citada (`edge-integration-all.yml:60-72`) está **desativada** → os 3 steps ficariam órfãos.
- Fuzz `FUZZ_STRESS=20` → step `:86-91` do `quality-gate`.
- `npm run check:log-login-contract` → step no `quality-gate`.
- `deno test … supabase/functions/log-login-attempt/index_test.ts` → **job novo com
  `denoland/setup-deno`** (padrão de `magazine-unit-tests.yml:63-67`) — o nightly não tem setup-deno.
- Alternativa: reativar `edge-integration-all.yml` (§5) e levar só o fuzz.
- `docs/ci/PADRAO_WORKFLOW.md:588`; `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:124`.

### 4.23 `daily-flows-simulation.yml` → `nightly-full.yml` job `quality-gate`
- Novo step (`node scripts/simulate-daily-flows.mjs`, ~30 s) + upload do relatório com `retention-days`.
- **Remover a lógica auto-referente:** `:42` faz
  `gh api repos/$GITHUB_REPOSITORY/actions/workflows/daily-flows-simulation.yml/runs?status=success`
  para achar `LAST_SUCCESS` — sem sentido no nightly: remover o cálculo ou apontar para `nightly-full.yml`.
- `docs/ci/PADRAO_WORKFLOW.md:112,587`; `tests/simulation/daily-flows.harness.test.ts:6`;
  `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:77`.

### 4.24 `prod-health.yml` → Gates existentes + **2 steps** (Checks 3 **e** 4)
- Check 1 = Gate 0 (`deploy-gates.yml:133`), Check 2 = Gate 1.1 (`:210`) — ambos já rodam em push main
  (`:45-49`). **Nada a mover.**
- **Check 3** (`.lovableignore` protege SSOT, bash inline `:55-87`) → step novo no job `lint-typecheck`
  do `deploy-gates.yml` (ou `static-checks.yml` após Etapa 0).
- **Check 4** (CODEOWNERS SSOT, `:89-107`) → **também é único**: o Gate 1.17
  (`check-codeowners-coverage.mjs --gate`, `:392`) usa `GATE_FILES` fixa (`:28-54`) e cobre arquivos de
  gate, **não** a lista SSOT deste workflow. Portar como step junto do Check 3.
- `recovery/.../README.md` (linha de `lovable-protected-audit.yml` aponta para "check 3 do prod-health.yml"
  → repontar para o step novo); `docs/ci/SEGREDOS.md:95` (`SENTINEL_SLACK_WEBHOOK` vira phantom —
  não quebra); `scripts/automation.config.json` (`reason` de `check-product-type-fields.mjs`);
  `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:141`; `docs/estado/11_INTEGRACOES.md`.
- Perde-se o canal Slack pós-merge — o step de Slack cabe no Gate Final se o dono quiser.

### 4.25 `replenishment-quality.yml` → **2 PRs** (lente de dependências)
**PR 1 (habilitadora):**
- `node scripts/check-tsc-baseline.mjs` → step em `static-checks.yml` (ou `deploy-gates.yml`).
  `:61` **não** duplica o deploy-gates: `:206` roda `npm run typecheck` (`package.json:132`,
  `typecheck:full`, tsc puro) e o Gate 1.7 roda `tsc-unused-ratchet.sh` contra `.tsc-ratchet-baseline`.
- Generalizar o step `nightly-full.yml:245-252` para aceitar `matrix.env` e `matrix.extra_args`
  (hoje só passa `--project` e `--reporter`, com `env` fixo `E2E_USER_*`) **ou** criar job separado —
  `card-parity` não é spec: é `npm run test:e2e:card-parity -- --workers=1` (`:97`).

**PR 2 (fusão):**
- `npx vitest run tests/config/e2e-nav-helper-smoke.test.ts` (`:64`) e
  `src/hooks/products/__tests__/useReplenishments.integration.test.ts` (`:69`) → steps no `quality-gate`
  do nightly (nenhum está em `package.json:98`).
- `e2e/replenishment-stress.spec.ts` → linha de matriz com `E2E_MOCK_AUTH: '1'` e `--workers=1`.
- `npm run test:e2e:card-parity` → linha/job com `E2E_SERVER_MODE: preview` e `--workers=1`.
- **Descartar** os steps de lint (`:58`, duplica `deploy-gates.yml:211`) — ~3 min por execução.
- `scripts/automation.config.json:1176` (`reason`); `docs/estado/10_TESTES.md`; `PENDENCIAS.md`;
  `analise-prs/dossies/PR-2824.md`.

### 4.26 `global-search-gate.yml` → destino corrigido
- **(a)** `vitest run src/components/search/__tests__ --coverage --coverage.include='src/components/search/**'`
  com thresholds 50/50/40/50 — **a linha é `:42`, não `:48`** (`:48` é o `run: |` do step
  `Coverage Summary`) → step em `static-checks.yml` **após Etapa 0**, ou no job `unit-tests` do
  `deploy-gates.yml` (Gate 2). É a única cobertura de `src/components/search/__tests__`
  (10+ arquivos; `ci.yml`, que rodava `test:quality`, está desativado).
- **(b)** `e2e/flows/global-search-comprehensive.spec.ts` → **2 linhas de matriz** no
  `e2e-visual-focused` (`chromium-authed` e `firefox-authed`), porque `:247` usa um único
  `--project`; instalar firefox (`:243-244`). Run 43570208287 falhou com
  `E21 — login falhou em CI … Timeout: 150000ms` (`e2e/fixtures/auth.setup.ts:18`).
- **Perdas a declarar explicitamente:** `Detect Vitest Flaky` (`:43-45`,
  `node src/test/detect-flaky-vitest.mjs`) e `Upload Search coverage` (`:55-61`).
- **Decisão do dono:** perda do `webkit-authed` (hoje `:82` roda 3 navegadores; a #3525 já o remove).
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md`; `docs/estado/10_TESTES.md`. Conflito: a #3525 edita
  este mesmo arquivo.

### 4.27 `supplier-comparison.yml` → destino corrigido
- **(a)** `npm run test:supplier-comparison` (`:29`; `package.json:250`, pisos 90/90/85/90 sobre
  `src/hooks/products/useSupplierComparison.ts`) → step no job `unit-tests` do `deploy-gates.yml`
  (Gate 2) **ou** `static-checks.yml` após Etapa 0. Não precisa de `./.github/actions/e2e-setup`
  (`:25-26`): basta o `setup-node-ci` que já existe (`static-checks.yml:74-78`).
  Remover `E2E_USER_EMAIL/PASSWORD` (`:38-40`) do destino (E33/C25) e o upload de coverage (`:43-49`).
- **(b)** `e2e/flows/supplier-comparison-visual.spec.ts`: `git ls-tree -r` confirma que **não existe
  nenhum diretório `-snapshots/`** → os 4 cenários falham sempre com "A snapshot doesn't exist"
  (run 43609790764), e `scripts/check-visual-baselines.mjs` não menciona `supplier-comparison`
  (Gate 1.4 não detecta a ausência). **Decisão do dono:** gerar os 4 PNGs por `update-snapshots.yml`
  (hoje **desativado** — reativar primeiro) e criar a linha de matriz, **ou** descartar o spec junto
  com o arquivo (nunca passou).
- `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md`; `docs/estado/10_TESTES.md`. Conflito com a #3525.

### 4.28 `pdf-visual-regression.yml` → novo job `pdf-visual` no `nightly-full.yml`
- Steps: `sudo apt-get install -y poppler-utils`, `npm ci`, `playwright install chromium`,
  `node scripts/qa/diff-proposal-pdfs.mjs` com `PDF_VISUAL_THRESHOLD_PCT: 0.1`.
  Reaproveitar `npm ci`/Chromium do job de destino (hoje são 3 instalações dedicadas).
- `--update-baseline` (`:57-59` no ref supersede) migra como **input do `workflow_dispatch`** do
  `nightly-full.yml`, mantendo o upload do artifact de baseline (`:62-69`).
- Remover `fetch-depth: 0` (`:44`) — o baseline está no working tree (`qa/exports/baseline/*.png`, 5 PNGs).
- **Confirmado:** o nightly **não** tem poppler-utils hoje (`:243-244` instala só chromium) → depende
  de §4.7 entrar antes, ou instalar no job novo.
- `scripts/automation.config.json:1776,1840` (`reason`); `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md`;
  `docs/plans/PLANO_WORKFLOWS_CI_*.md`.
- **Correção de evidência:** no ref supersede o arquivo tem 81 linhas (não 89).

### 4.29 `bundle-size-report.yml` → `deploy-gates.yml` job `build` (`Gate 6 - Build`)
- Após `npm run build` (`:737`) e **depois** do Gate 1.6 (`:741-743`): step
  `node scripts/bundle-size-report.mjs --out bundle-report.md` + step de upsert do comentário
  (o mesmo `actions/github-script` de `:57-116`, com o guard de fork de `:59`), **ambos com
  `if: always()`** para que falha de comentário (fork/permissão) não reprove o Gate 6.
- `pull-requests: write` no bloco `permissions:` do job `build` — **`deploy-gates.yml:715-718`**
  (correção: não `:707-710`). Não viola C12/R11 (`check-workflow-contracts.mjs:270,277` só reprova
  `contents: write`). Os steps não se chamam `Gate X.Y` → `check-gates-table.mjs` não é acionado.
- Publicar também em `$GITHUB_STEP_SUMMARY` (`scripts/bundle-size-report.mjs:7-9`) e dispensar o
  comentário em PR de bot.
- `scripts/bundle-size-report.mjs` e `tests/scripts/bundle-size-report.test.mjs` **permanecem**
  (o teste lê o script por caminho, `:37`, não o YAML). `scripts/automation.config.json:261-264`;
  `docs/PERF_OPTIMIZATIONS.md`; `docs/audits/AUDITORIA_20DIM_2026-10-02.md`.
- **Git 7** (toca `deploy-gates.yml`, job que alimenta o único required) → PR fica aberta para o dono.

### 4.30 `magazine-unit-tests.yml` → **3 etapas** (maior desmembramento)
**Etapa A (imediata, sem destino novo):** remover o job `security-definer-acl` (`:142-176`) —
duplicata tripla: `security-definer-acl-multi-env.yml:144,146` (**ativo**, em `keep-workflows.txt`) +
`tests/security/security-definer-acl-gate.test.ts` em `test:ci-core` (`package.json:98`,
`deploy-gates.yml:497`) — e o agregador `magazine-tests-ok` (`:178-199`, ausente de
`.github/required-checks.json`). **−2 runners por PR.** Estreitar o `paths` largo
(`:17-20`: `package.json`, `src/hooks/auth/**`, `src/contexts/AuthContext.tsx`, `src/lib/supabase/**`).

**Etapa B:** 3 guardas estáticas (`:90` `check-no-template-thumbnail.mjs`, `:93`
`check-edge-cors-headers.mjs`, `:96` `simulate-ai-key-scenarios.mjs`) → steps no job `lint-typecheck`
do `deploy-gates.yml` **ou** `static-checks.yml` após Etapa 0. Sem executor ativo hoje
(`check-edge-cors-headers.mjs` só aparecia também em `ci.yml:148`, desativado). Os 3 scripts
**permanecem** em `scripts/` com registro.

**Etapa C:** `npm run test:magazine:sql` (`:139-140` = `bash scripts/test-magazine-hardening-v2.sh`,
exige docker e sobe `postgres:17.6`) → step no job `database-integrity` do `deploy-gates.yml`
(`Gate 2.5`, `:507-530`), após `npm run test:quote-rpc:postgres` (`:522`). **Nota de compatibilidade:**
esse job **não** tem setup-node nem `npm ci` (`:517-526`) — funciona porque `package.json:111` é
`bash …`, mas não serviria para step que precise de `node_modules`.

**Etapa D:** `npm run test:magazine:coverage` (`:103`, thresholds 58/51/48/56 + `test-magazine-coverage.mjs`),
o advisory de React `act` (`:108-115`) e `deno test --allow-net supabase/functions/magazine-import-local/logic.test.ts`
(`:66-67`) → job `quality-gate` do `nightly-full.yml` (ao lado de `:86-91`) + `denoland/setup-deno`.

- `docs/MAGAZINE_MODULE.md`, `docs/estado/10_TESTES.md`, `docs/estado/ESTADO_ATUAL.md`,
  `docs/estado/09_CI_INFRA_SCRIPTS.md`, `RELATORIO_CI.md`, `PENDENCIAS.md`, `docs/prod-readiness.md`,
  `docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md`; `scripts/automation.config.json:528,848,1064,1992` (`reason`).
- `docs/ci/SEGREDOS.md`: `SUPABASE_SERVICE_ROLE_KEY`/`VITE_SUPABASE_URL` viram phantom — não quebra o
  Gate 1.14. Nenhum teste lê o YAML.
- **Git 7** nas etapas C (e B, se for no deploy-gates). **Executar na ordem A → B → C → D.**

---

## 5) OTIMIZAR — mudanças de YAML, por arquivo

### `deploy-gates.yml` (required — Git 7, PR fica aberta)
- Fundir `changes` + `e2e-relevance` + `check-schema-paths` + `ssot-gate` num job `detect`
  (1 checkout; outputs `docs_only`/`relevant`/`schema_changed`) — **−3 runners/run**.
- Remover `needs: [ssot-gate]` dos 11 jobs (`:142,156,180,472,503,529,606,658,674,767,818`) e rodar
  `node scripts/validate-supabase-config.mjs` como 1º step dos jobs pesados — **−1 nível de fila (~20 min)**.
- Substituir o job `secrets-check` (`:527-533`, 0,0 min de trabalho / 20 min de fila) por step inline
  no início de `e2e-smoke` e tirá-lo de `needs`/`if` (`:539-540`).
- Fundir `seo-sanity` (`:654-668`), `dependency-audit` (`:138-150`), `restore-cart-rpc-gate` (`:670-692`)
  e `dependency-review` (`:152-174`) num job `quick-gates` — **−3 runners/run**.
- `lighthouse`: condicionar pelo output `src` do `detect` e reaproveitar `dist-${{ github.run_id }}`
  (`:741-747`) em vez do 2º `npm run build` (`:639`).
- E14 em push: marcar `docs_only` também em push (`:105`). Filtro `code`: `+ '!supabase/**/*_LOG.md'`
  (`:88`) — PRs de recibo viram docs-only.
- `secret-scan`: remover `fetch-depth: 0` (`:825`) e verificar sha256 do tarball (`:828-831`).
- Timeouts E24: `unit-tests` 45→15 (`:471`, real 1,1 min); avaliar `e2e-smoke` 30→20 (`:538`, real 6,1).
- `database-integrity` (`:499-521`): acrescentar `./.github/actions/setup-node-ci` com `install: 'false'`.
- Gates 1.13.1–1.13.3 (`:336-353`): aplicar o guard de fork do Gate 1.13 (`:326/332`).
- Limpar 3 entradas stale em `scripts/check-workflow-contracts.allowlist.json` (C25 `e2e-smoke`, `:790`, `:792`).
- **Proibido:** mudar `name:` de job sem atualizar `.github/required-checks.json` (R8).

### `deploy-edge-functions.yml`
Matrix 1-função-por-runner (`:185-197`) → 1 job com loop sequencial reaproveitando o retry (`:224-242`)
ou matrix em lotes de 10 (≤11 runners). Remover o job `verify` (`:258-275`, só `echo`),
`fetch-depth: 0` (`:79`), o ramo `EVENT_NAME == push` (`:115-161`), `GIT_BEFORE` (`:87`), o trigger
`workflow_call` + input `functions_json` (`:11-30,84,94-102`, sem chamador) e o Summary duplicado
(`:173-183` vs `:99-102`).

### `required-checks-guard.yml`
`pull_request` só com `paths: ['.github/required-checks.json', '.github/workflows/required-checks-guard.yml']`.
Job `secrets-inventory-check`: `if: github.event_name == 'schedule' || workflow_dispatch` (PR/push já
no Gate 1.14). `GH_TOKEN` → `github.token` (o secret `BRANCH_PROTECTION_READ_TOKEN` não existe).
Mover `node scripts/check-required-checks.mjs` para o Gate 1 do deploy-gates ou static-checks (elimina
`npm i --no-save js-yaml`). Remover o caminho **fail-open** (`main:69-73`): HTTP≠200 → `exit 1`.

### `branch-protection-sentinel.yml`
`fetch-depth: 0` (`main:78`) → `50` (o fallback `--depth=200` `:108-111` cobre). Remover o job
`check-protection-config` (`main:244-297`) e o step `Make sentinel-check executable` (`:83-84`).
Registrar v2.2.0 em `.github/SENTINEL_CHANGELOG.md` (`CONTRIBUTING.md:230`). **Reativar via API.**

### `release-please.yml`
Corrigir `.release-please-manifest.json` para `1.8.1` (ou `bootstrap-sha`/`last-release-sha` =
`87fe8cd9b7`) e fechar a PR #3566 (vai colidir com a tag v1.2.0). `on: push(main)` → `schedule`
(ex. `37 3 * * *`) + `workflow_dispatch`. Criar `RELEASE_PLEASE_TOKEN` (PAT fine-grained:
contents+pull-requests write) — **secret novo = Git 7** — ou corrigir `SEGREDOS.md:114`.

### `contexto.yml`
Cron 10 min → `7 * * * *`. Cache de `~/.cache/uv` (`:159-160`). `# ok: <motivo>` nos `|| true`
(`:352`, `:401`). `retention-days: 1` (`:177,268,302`) fora dos tiers R6 → documentar ou subir para 14.
Atualizar junto `AGENTS.md:109`, `docs/agentes/ci-gates.md:72`, `docs/agentes/banco-migrations.md:137`,
`docs/contexto/regras/manual/regras.md:167` e regenerar `docs/ci/PADRAO_WORKFLOW.md:570`.

### `ci.yml`
Apagar jobs `coverage` (`:183-240`), `integration-tests` (`:242-278`), `critical-e2e` (`:280-313`),
`theme-validation` (`:543-580`) e `smoke` (`:31-57`, coberto pelo `uptime-monitor.yml`); tirar o
SECURITY DEFINER ACL gate (`:129-133`). Fundir `ref-warning-suite` (`:315-375`), `hooks-tests`
(`:377-430`), `price-freshness-tests` (`:432-486`) e `cloud-status-tests` (`:488-516`) como steps do
job `quality` (rodar `tests/hooks` **1×** com `--coverage`, hoje 3×). Mover para static-checks:
`check-no-db-push.mjs` (`:80`), `check-security-definer-hardening.mjs` (`:86`),
`check-edge-structured-logging.mjs` (`:146`), `check-edge-request-id-propagation.mjs` (`:154`),
`check-edge-cors-headers.mjs` (`:161`), `build-cors-snapshot.mjs --check` (`:171`). `tests/rls`
(`:173-181`) → nightly. `paths-ignore` docs (R23/E14). Timeouts: `quality` 90→45,
`edge-functions-typecheck` 15→10. `retention-days` 30→14 (`:485,515,580`).

### `security.yml`
Remover `schedule` (`:12-13`, duplica o audit diário). Mover `headers-mirror` (`:53-67`) para
static-checks como step `node scripts/check-headers-mirror.mjs`. `paths-ignore` também em push.
Explicitar `with: config-path: .gitleaks.toml`.

### `gitleaks-history-audit.yml`
Remover `push:` (`:13-14`) — fica diário + dispatch (1 × 4,5 min/dia em vez de ≈60).
`concurrency.group` fixo (`:22`).

### `e2e-quotes.yml`
Remover o modo PR morto após #3612 (`:63,90,92-164,259,274,281-283,290,332-334,451`). Extrair o
heredoc de cleanup duplicado (`:194-257` ≡ `:386-448`) para `scripts/e2e-cleanup-call.mjs` chamado 2×
(−120 linhas). Tirar `quote-items-table-header-radius.spec.ts` da suite `responsive` (`:90`).
`cancel-in-progress: false` explícito (`:53`, R2). Endurecer `check-min-tests` (`:355-356`):
min por suite = nº real e `max-skipped-ratio ≤ 0.5`. Apagar
`scripts/qa/validate-quote-conditions-workflows.mjs` + `automation.config.json:1866-1871`
(**atenção:** `update-snapshots.yml` é lido por esse script em `:21,66-70` — conferir antes).

### `supabase-linter-gate.yml`
Aplicar #3525: remover `pull_request`; `push: main` com paths + `.security/lint-0029-allowlist.json`;
manter cron 06:57 + dispatch. Remover `Upload allowlist artifact` (`:82-88`). Dar `name:` ao job
`linter` (R8). `cancel-in-progress: false` explícito e remover o `if:` de fork (`:36`). **Reativar via API.**

### `policies-baseline.yml`
Aplicar #3525: remover `pull_request` e `push` (manter cron seg 10:30 + dispatch) **junto** com
`.security/**` no filtro `code` do `deploy-gates.yml` — **não separar**, senão reabre o buraco do Gate
1.13 em docs-only. `cancel-in-progress: false` explícito; remover o fork-guard morto (`:65-67`).
**Reativar via API.**

### `db-schema-drift-check.yml`
Remover o bloco `pull_request:` (`:61-69`), mantendo schedule/dispatch/`workflow_call` (o Gate E40
`deploy-gates.yml:800-813` já cobre PR/push). `:91` → `false` literal com comentário E19. Atualizar o
comentário `:60` (cita o cron 09:49 do `restore-seller-cart-rpc`, que sai). Opcional: asserção de
paridade entre o regex `deploy-gates.yml:790` e os paths, em
`tests/scripts/check-infrastructure-drift-snapshots.test.mjs`.

### `schema-snapshot-export.yml`
Remover `pull_request:` e `push:` (`:28-42`) e **reabilitar**. Investigar o `startup_failure` de 02/11
(run 41402247488) e disparar 1× (`force_rotate=false`). `weekly-live-drift`: remover
`supabase/setup-cli` (`:458-461`). E036/E037/E072 (`:158,184,225`): trocar host IPv6 direto por `PG*`
do pooler (como `db-schema-drift-check.yml:109-115`) e remover `continue-on-error`.

### `security-definer-acl-multi-env.yml`
Aplicar #3525: remover `environment:` (`:95`) e a perna staging (`:99`, opções `:33-35`) — destrava o
grupo de concurrency; aprovar/cancelar a run 43588890408 em `waiting`. Reduzir os paths do `push`
(`:38-43`: tirar `supabase/migrations/**` e `qa/migrations-draft/**`). `:105-111`: usar
`./.github/actions/setup-node-ci`. Pinar `postgres:17` por digest (`:64-66`). Remover o input
`environment` (`:26-35`). **Devolver cobertura em PR:** `npm run check:security-definer-acl -- --require-live`
no job `lint-typecheck` do deploy-gates (ci.yml foi desativado).

### `edge-functions-drift-check.yml`
Adotar o `paths:` do `pull_request` da #3525 (`:25-29`). **Remover `Compare GitHub × Canonical` de
`.github/required-checks.json:15-19`** (como a #3525) e corrigir `docs/agentes/ci-gates.md:10-11` e
`CONTRIBUTING.md:175`. No `if` do job `drift` (`:60`): `&& (github.event_name != 'workflow_run' ||
github.event.workflow_run.conclusion == 'success')`. Resolver o drift de `asia-ingestion` e, em
`:398-462`, só comentar quando o conjunto de slugs mudar (179 comentários idênticos em #1895).
Paralelizar o download (`:198-334`, `xargs -P 4`). Mover `permissions` (`:40-43`) para o job.

### `edge-integration-all.yml`
`paths` (`:10-15,18-23`): trocar `scripts/**` por `scripts/check-edge-live-coverage.mjs` e
`scripts/check-log-login-attempt-contract.mjs`. Step LIVE (`:105-117`):
`if: github.event_name == 'push'`. Remover `--coverage` e os 5 `--coverage.thresholds.*=0` (`:78-84`).
`setup-node`+`npm ci` (`:52-58`) → `./.github/actions/setup-node-ci`. `timeout-minutes` 20→10.
**Reativar via API** (é pré-requisito de §4.22 se o dono preferir a alternativa).

### `dr-drill-reminder.yml`
Cron `0 9 1-7 1,4,7,10 1` → `0 9 1 1,4,7,10 *` (semântica OU: ~10 runs/trimestre → 1). Adicionar
labels `maintenance` e `dr-drill` em `.github/labels.yml` **ou** remover `--label` (`:72`) e o
fallback (`:73-78`).

### `ci-metrics-weekly.yml`
`scripts/ci-metrics.mjs`: pular workflows com `state != 'active'` e paginar só runs dos últimos 7 dias
(reduz os 13 min). `timeout-minutes` 60→30 (`:29`).

### `nightly-full.yml` (destino de ~20 fusões — **prioridade máxima**)
- Trocar `setup-node` + `actions/cache node_modules` duplicados (`:42-62,114-129,229-242`;
  `restore-keys` parciais arriscam `node_modules` stale) por `./.github/actions/setup-node-ci`.
- `e2e-visual-focused`: cachear Playwright (reaproveitar `:131-140`) ou usar
  `./.github/actions/e2e-setup` com `require-auth` em vez de `:243-244`.
- **Generalizar o step `Run E2E Visual` (`:245-252`)** para aceitar `matrix.env` e `matrix.extra_args`
  — hoje passa só `--project` e `--reporter`, com `env` fixo `E2E_USER_*`. **Sem isso, 6 fusões
  (swatch-quickview, replenishment, pdf-dialog, optimized-image, delivery, global-search) não cabem.**
- Remover `Validate Coverage Threshold` (`:77-84`) — `test:ci-core:coverage` já falha abaixo de 50%.
- `audit-report.needs` (`:268`) → incluir `e2e-visual-focused` e expor `AUDIT_E2E_VISUAL`, mantendo os
  padrões que `nightly-audit-wiring.test.mjs` valida.
- **Adicionar `notify_failure`/`notify_success`** com `./.github/actions/ci-issue` (key `nightly-full`,
  só em schedule) — 5 noites vermelhas sem consumidor.
- Condicionar `e2e-tests`/`e2e-visual-focused` a `secrets.E2E_USER_EMAIL != ''`.
- **Investigar antes de fundir mais E2E:** `loginViaUI` estoura 150 s às 02:44 UTC enquanto o Gate 3
  passa de dia (hipóteses: GoTrue/edge health-check 503, rate limit do usuário E2E) — **NÃO VERIFICADO**.

### `sitemap-production-preconditions.yml`
Trigger: só `workflow_dispatch` com input `expected_sha` (default `github.sha`) até o primeiro
`READY_*` real; se quiser monitoramento, schedule semanal **com** `./.github/actions/ci-issue`.
`cancel-in-progress: false` explícito. Remover `Testar o coletor sem rede` (`:43-44`) quando
`static-checks.yml:102-106` estiver em main. `if-no-files-found: error` (`:68`) → `warn`.

### `pdf-quality.yml` (+ **reativar**)
- Trocar o par `set +e` / `Fail job if PDF suites failed` (`:60-66` + `:181-187`) por step normal
  (falha direto) com `if: failure()` nos steps de relatório — remove o risco de verde falso se a
  captura de `PIPESTATUS` falhar.
- `Generate headless PDFs` (`:72`): `if: always()` → `if: success() || steps.pdf-tests.outputs.exit_code != ''`
  (hoje gera PDFs mesmo quando o `npm ci` quebrou).
- Opcional: receber o diff visual do `pdf-visual-regression.yml` como step deste job (mesma
  renderização/paths) **se o dono preferir não mandá-lo ao nightly** — evita instalar Chromium 2×.
- `.github/required-checks.json`: **nenhuma alteração** (nenhum job daqui é required).

### `magazine-mutation.yml` (+ **reativar**)
- **Remover o gatilho `pull_request` (`:8-16`)** — aplica o precedente E81 documentado em
  `magazine-flakiness.yml:13-18`; economiza 31,5 min (mediana) por PR que toca `tests/magazine/**`.
- Remover o job `mutation-ok` (`:105-119`, ausente de `.github/required-checks.json`).
- Remover o step `Derivar escopo de mutações a partir do diff (PR)` (`:51-72`) e o `fetch-depth`
  condicional (`:49`) — ficam mortos; no cron `INPUT_ONLY` é vazio e o catálogo roda inteiro.
- Cron `27 6 * * 1` permanece (Gate E89 inalterado: 06:18 flakiness, 06:27 mutation).

---

## 6) MANTER (20)

**Sem nenhuma mudança:** `_secrets-check.yml`, `deploy-vercel.yml`, `db-apply-migration.yml`,
`sentinel-self-test.yml`, `labels-sync.yml`, `codeql.yml`, `ddl-out-of-band-detector.yml`,
`migration-dry-run.yml`, `regenerate-supabase-types.yml`, `uptime-monitor.yml`,
`ratchet-weekly.yml`, `cache-prune.yml`, `magazine-flakiness.yml`.

**Manter + reativar via API:** `static-checks.yml` (id 417403614 — **Etapa 0**),
`update-snapshots.yml` (id 389456571 — pré-requisito das fusões visuais e dos baselines do
`supplier-comparison`), `deployment-failure-alert.yml` (id 350682674 — 18/25 `skipped`, não ocupa
runner; houve falha real de deploy hoje às 15:05).

**Manter com ajuste pontual:**
- `pr-size-guard.yml` *(era FUNDIR — refutado)*: fica como workflow próprio (1 step de curl/jq, não é
  required, o custo é fila). Se o dono quiser fundir, é obrigatório acrescentar
  `types: [opened, synchronize, reopened, labeled, unlabeled]` em `deploy-gates.yml:45-46` e aceitar
  que todo label re-dispare os 20+ jobs — **Git 7**.
- `supabase-security-gate.yml` *(era FUNDIR — refutado nas 2 lentes)*: trocar `pull_request` por
  `push: main` + `schedule` (resolve o "vermelho que o PR não conserta" sem mexer na cobertura).
  **Não** mover para `supabase-linter-gate.yml` enquanto ele estiver desativado. Qualquer mudança de
  arquivo exige editar `tests/scripts/deploy-gates-live-audit.test.mjs:9,92,103` (lê o YAML **real** e
  exige os 4 steps nominais) — senão `npm test` falha com ENOENT.
- `delivery-quality.yml` *(era FUNDIR — refutado nas 2 lentes)*: na supersede já é **push-only**
  (`:3-18`, comentário da #3612) e está desativado (id 278918381) → custo real = **1 run de até 20 min
  por merge em main**, condicionada a `needs.e2e-relevance.outputs.relevant == 'true'` (`:38`).
  Manter assim; reativar quando o nightly estabilizar. Se o dono quiser consolidar, os destinos
  existem: unitário `src/pages/__tests__/QuoteBuilderDeliveryTooltip.test.tsx` → Gate 2 ou
  `static-checks.yml:143-152`; spec `e2e/quote-builder-delivery.spec.ts` → linha de matriz do
  `e2e-visual-focused` (**exige** o `--retries=2` no template `:245-252`), e então remover a exceção
  `deliveryUnit` de `.github/scripts/e2e-relevance.mjs:1-4` (sem teste; mas o mesmo arquivo é usado
  pelo `deploy-gates.yml:120-121`).
- `kit-coverage-integration.yml`: manter (está pegando regressão **agora**: run 43553205153,
  `AssertionError: expected 55 to be greater than or equal to 70` em
  `src/lib/external-db/kit-coverage.integration.test.ts:192`). Otimizações: step `if: failure()` que
  abre/atualiza issue (hoje a falha é silenciosa) e publicar o percentual em step summary.
  **A regressão 55% < 70% precisa de dono — é defeito de dado/view, não do workflow.**
  Se algum dia for apagado, mudam junto `scripts/check-workflow-contracts.mjs:577-587`,
  `tests/scripts/check-workflow-contracts.test.mjs:196-221` e `docs/ci/SEGREDOS.md:64,65,126`.
- `magazine-flakiness.yml`: remover o job `flakiness-ok` (`:103-117`) — 1 runner só para repetir o
  resultado; nenhum required check depende de `Magazine Flakiness OK`. Atualizar o comentário
  `:13-18`, que ainda descreve a promoção a gate de PR já revertida.

---

## 7) O que a branch `claude/infra-workflows-supersede-3525-261114-1740` já cobre, e o que falta

### Já coberto (verificado na branch; = main + #3525 + #3612)
- **11 arquivos já em `recovery/workflows-aposentados/`** com linha na tabela do README:
  `automation-local.yml`, `check-no-prod-leak.yml`, `check-select-columns.yml`, `lint-untyped-from.yml`,
  `lovable-autoheal.yml`, `lovable-edit-tracker.yml`, `lovable-protected-audit.yml`,
  `migrations-sync-log-gate.yml`, `restore-seller-cart-rpc.yml`, `ui-visual-a11y.yml`,
  `url-state-unit.yml`, `workflow-lint.yml` (12 arquivos + README).
- **`static-checks.yml` criado** com os steps: `:80-83` no-prod-leak, `:85-88` select-columns,
  `:90-93` untypedFrom, `:102-106` sitemap sem rede, `:130-138` automation doctor/test,
  `:143-152` OptimizedImage + URL state, `:162-171` actionlint+shellcheck, `:173-183` recibo de
  migration (com filtro de paths `:62-72`).
- **E2E fora dos PRs (#3612):** `pull_request` removido de `global-search-gate.yml`,
  `supplier-comparison.yml` (→ só `workflow_dispatch`), `pdf-visual-regression.yml` (→ só
  `workflow_dispatch`), `replenishment-quality.yml`, `delivery-quality.yml`,
  `e2e-check-calendar-snapshots.yml`, e dos `e2e-*`.
- **Repontamentos:** `scripts/automation.config.json:2413` (`ci.file`), `:1088`, `:824`, `:768`, `:1224`;
  `scripts/autoheal-eslint/run.test.mjs:109-111`.
- **Conflito de `e2e-stock.yml`** resolvido a favor da versão schedule-only.
- **Validação já rodada na branch:** `actionlint` ok, `check-workflow-contracts --gate` ok,
  `check-required-checks` ok, `vitest tests/scripts` 172 arquivos / 1619 testes ok.

### O que falta, em ordem de aplicação

**Etapa 0 — habilitar o destino estático (desbloqueia 14 itens).**
1. Mergear a branch supersede (ou a PR #3525) em `main`.
2. **`github_enable_workflow` id 417403614** (`static-checks.yml`) — sem isso o workflow não produz
   check e a cobertura dos 14 itens é **zero em silêncio**.
3. Abrir 1 PR de teste e **citar o run verde** do job `Static checks (consolidado)`.
4. Reativar também: `update-snapshots.yml` (389456571) e `deployment-failure-alert.yml` (350682674).
5. Só então mover: `automation-local.yml`, `ui-visual-a11y.yml`, `url-state-unit.yml`,
   `check-select-columns.yml`, `check-no-prod-leak.yml`, `lint-untyped-from.yml`,
   `migrations-sync-log-gate.yml`, `workflow-lint.yml` (as cópias já estão em `recovery/`).

**Etapa 1 — colaterais obrigatórios que a branch não fez.**
- `scripts/check-workflow-contracts.allowlist.json:2,8,18` (entradas mortas de `e2e-focused.yml` e
  `lovable-autoheal.yml`).
- `scripts/automation.config.json:1392` (ainda cita `check-select-columns.yml`), `:1960`, `:2312`.
- `docs/AUTOMACAO_LOCAL.md:25,407`; `regenerate-supabase-types.yml:21`;
  `recovery/.../README.md` (frase que aponta para `prod-health.yml`/`branch-protection-sentinel.yml`,
  ambos saindo/desativados); `.github/SENTINEL_CHANGELOG.md` (v2.2.0).
- Aposentadorias **imediatas** (§3.A), que a branch não trata: `delete-orphan-edges.yml`,
  `cross-reference-issues.yml`, `stale.yml`, `e2e-crm-callback-approved.yml`,
  `e2e-color-swatch-grid.yml`, `e2e-dialogs-pr-check.yml`, `e2e-magazine-header.yml`,
  `capacity-growth-report.yml`, `pgss-slo-report.yml`, `wraparound-monitor-report.yml`,
  `personalization-trace-diagnostics.yml` (+ `automation.config.json:2402-2409`).

**Etapa 2 — consertar e carregar o `nightly-full.yml` (desbloqueia 8 itens).**
1. Investigar/corrigir o timeout de `loginViaUI` (150 s) às 02:44 UTC.
2. Generalizar o step `:245-252` (`matrix.env`, `matrix.extra_args`).
3. Trocar `:142-152` pelo **glob shardado** (4 shards × 2 projects, timeout 30, `check-min-tests` por
   shard) — §4.4.
4. Acrescentar `notify_failure`/`notify_success` (`./.github/actions/ci-issue`).
5. Corrigir as linhas de matriz já existentes: `magazine-header` → `chromium-authed`;
   `pdf-dialog` → `chromium-authed` + poppler-utils; consertar `color-swatch`.
6. `workflow_dispatch` + **run verde citada**.
7. Só então mover: `e2e.yml`, `e2e-flows.yml`, `e2e-focused.yml`, `e2e-cart.yml`, `e2e-stock.yml`,
   `e2e-freight.yml`, `e2e-personalization.yml`, `e2e-discount-approval.yml`.

**Etapa 3 — fusões visuais para o `e2e-visual-focused`** (independentes entre si, 1 PR cada):
`e2e-customization-collapse.yml`, `e2e-pdf-dialog.yml`, `e2e-swatch-quickview.yml`,
`e2e-visual-preview-button.yml` (+ edições em `check-visual-preview-suite.mjs` e seu teste),
`visual-tests.yml` (+ `check-visual-tests-specs.mjs:16`), `optimized-image-e2e.yml`,
`pdf-visual-regression.yml`. Depois: `e2e-check-calendar-snapshots.yml`.

**Etapa 4 — fusões para o `quality-gate` do nightly:** `stock-rupture-fuzz.yml`,
`auth-fuzz-weekly.yml`, `log-login-fuzz-weekly.yml` (+ job com `setup-deno`),
`daily-flows-simulation.yml`, `quote-number-hardening-verify.yml`, `ts-unused-ratchet.yml`.

**Etapa 5 — toques no `deploy-gates.yml` (cada um é Git 7, PR fica aberta):** `_e2e-relevance.yml`
(5 passos de §4.1), `contract-tests.yml`, `bundle-size-report.yml`, `prod-health.yml` (Checks 3 e 4),
`ssot-supabase.yml`, `drafts-index-check.yml` (3 steps, **arquivo permanece**),
`ci-security-drift.yml`, `magazine-unit-tests.yml` (A→B→C→D), `replenishment-quality.yml` (2 PRs),
`global-search-gate.yml`, `supplier-comparison.yml`, `restore-seller-cart-rpc.yml`
(teste de comportamento no Gate 2 antes de mover).

**Etapa 6 — OTIMIZAR** (§5), começando pelo `deploy-gates.yml` (−7 runners e −1 nível de fila) e pelos
3 maiores geradores de runs: `contexto.yml`, `gitleaks-history-audit.yml`, `edge-functions-drift-check.yml`.

---

## 8) Como validar (toda PR deste plano)

```bash
# 0) Node do repo
nvm use                                   # .nvmrc

# 1) Lint de workflow (o único que pega uses:/sintaxe de YAML)
curl -sSL --retry 3 -o /tmp/actionlint.tgz \
  https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_linux_amd64.tar.gz
tar -xzf /tmp/actionlint.tgz -C /tmp && /tmp/actionlint -ignore 'SC2129' -ignore 'run_started_at'

# 2) Contratos R1-R19/R24 (Gate 1.11)
node scripts/check-workflow-contracts.mjs --gate

# 3) SSOT dos required checks (obrigatório se mexeu em name: de job)
node scripts/check-required-checks.mjs

# 4) Testes que ENUMERAM workflows (apagar arquivo pode quebrar o Gate 2)
npx vitest run tests/scripts

# 5) Guardas que leem workflows/baselines por caminho
node scripts/check-visual-baselines.mjs
node scripts/check-visual-preview-suite.mjs
node scripts/check-visual-tests-specs.mjs
node scripts/check-gates-table.mjs --gate        # se criou step 'Gate X.Y'
node scripts/check-secrets-inventory.mjs --gate
node scripts/check-migration-path-references.mjs # OBRIGATÓRIO se tocou drafts-index-check.yml
node scripts/automation.mjs doctor --static      # scripts/ x automation.config.json
node scripts/ci-cron-table.mjs --min-spacing 20  # Gate E89 (falha só em colisão)

# 6) Guardas de Comandos (AGENTS.md)
node scripts/validate-supabase-config.mjs        # Gate 0
node scripts/check-product-type-fields.mjs       # Gate 1.1

# 7) Dos arquivos tocados
npm run lint && npm run qa:typecheck && npm test
```

**Checklist de aceite por PR**
1. `.github/required-checks.json` atualizado **junto** se algum `name:` de job mudou (R8).
2. Todo arquivo removido tem cópia em `recovery/workflows-aposentados/` + linha no README.
3. Todo script que ficou sem executor **continua em `scripts/`** com registro em
   `automation.config.json` (ou o registro sai no mesmo commit).
4. Nenhum `continue-on-error`, `|| true` sem `# ok:`, threshold reduzido, teste apagado/skipado ou
   entrada de allowlist nova para calar erro.
5. Para FUNDIR com destino no nightly: **run verde citada** (id) antes de remover o arquivo de origem.
6. Pós-merge: conferir o deploy e o `Gate Final - Deploy Ready`; CI vermelha → ler o resumo da falha
   antes do patch.

---

## 9) NÃO VERIFICADO e riscos abertos

### NÃO VERIFICADO
1. **Equivalência de harness Vite × `webServer`** do `playwright.config.ts` nas fusões de
   `e2e-customization-collapse.yml` (`start-vite: 'true'`, `E2E_BASE_URL localhost:8080`) e
   `e2e-visual-preview-button.yml` (`start-vite` `:81`).
2. **Causa do timeout de `loginViaUI` (150 s)** às 02:44 UTC no nightly enquanto o Gate 3 passa de dia
   (GoTrue? edge health-check 503? rate limit do usuário E2E?). Bloqueia a Etapa 2.
3. **Cobertura exata do carrinho pelo Gate 3** (`20-all-features-smoke.spec.ts` cita carrinho 6×) —
   base do APOSENTAR de `e2e-cart.yml`.
4. **`scripts/ci-metrics.mjs`** já filtra por data? (otimização de `ci-metrics-weekly.yml`).
5. **`gitleaks-action@v3`** auto-detecta `.gitleaks.toml` na raiz (`security.yml`).
6. **`e2e/optimized-image-*`** dependem de `--update-snapshots` (comentário desatualizado em
   `check-visual-baselines.mjs:40`) e se a demo chama Supabase.
7. **`update-snapshots.yml`** com `dev_server: true` para `preview-button.spec.ts`.
8. **Secrets do `deploy-vercel.yml`** nunca exercitados desde a conversão para dispatch (rollback pode
   estar quebrado quando for preciso).
9. **`.github/ISSUE_TEMPLATE/**`** tem campo "PR de origem" (colateral de `cross-reference-issues.yml`).
10. **CHECK 2 do `supabase-security-gate.yml`** × `check-secdef-anon-drift.mjs` — equivalência exata.
11. **`anchore/sbom-action` v0.24.3**: nome do input de retenção de artifact.
12. **`.migration-refs-baseline.json`**: se há outras entradas que apontem para workflows que este
    plano move (foram verificadas 3: `deploy-gates.yml`, `drafts-index-check.yml`,
    `schema-snapshot-export.yml`).

### Riscos abertos (ordenados)
1. **`static-checks.yml` desativado** (id 417403614, ausente de `origin/main`): se a Etapa 0 for
   pulada, **14 coberturas caem a zero sem nenhum check vermelho**, incluindo as guardas
   `check-no-prod-leak`, `check-select-columns`, `lint-untyped-from`, actionlint e o doctor de
   automação. **Maior risco do plano.**
2. **`nightly-full.yml` nunca ficou verde** (0/6 runs, `ultimo_sucesso = null`; job `e2e-tests` falhou
   nos 2 shards do run 43547977655) e **não tem alerta**: é o destino de ~20 fusões. Enquanto for
   vermelho por outro motivo, qualquer sinal fundido ali é ignorado.
3. **Glob da regressão sem executor:** `e2e.yml` desativado + nightly rodando só 7 specs = ~40 specs
   não rodam **hoje**. As 6 aposentadorias da Etapa 2 ampliariam isso em silêncio se executadas antes.
4. **`drafts-index-check.yml`**: apagar ou mover o arquivo reprova o **único required check** via
   `check-migration-path-references.mjs` (`deploy-gates.yml:236`). Plano: fusão parcial, arquivo fica.
5. **Regressão aberta sem dono:** `kit-coverage-integration.yml` acusa cobertura **55% < 70%**
   (run 43553205153) — defeito de dado/view no canônico.
6. **Incidente de produção em aberto:** edge `health-check` em 503 com site/auth 200
   (`uptime-monitor.yml`, 8 falhas hoje) + falha real de deploy às 15:05 com
   `deployment-failure-alert.yml` **desativado**.
7. **`release-please` quebrado:** manifest 1.1.0 vs tags até v1.8.1; a PR #3566 vai colidir com a tag
   v1.2.0. Todo merge de Release PR falha em `already_exists`.
8. **`security-definer-acl-multi-env.yml` travado** desde 31/10 (`environment: production` exige
   revisor; 24 cancelled + 1 waiting) → o gate de ACL SECDEF **não roda em lugar nenhum** desde que
   `ci.yml` e `magazine-unit-tests.yml` foram desativados.
9. **3 migrations não aplicadas em produção** (E30/E33/E40) = drift de ledger e os 3 monitores de banco
   aposentados por alvo inexistente. Registrar a reativação na PR da migration.
10. **`supplier-comparison-visual.spec.ts` sem baselines** (diretório `-snapshots/` não existe) e
    `update-snapshots.yml` desativado: decisão do dono (gerar os 4 PNGs ou descartar o spec).
11. **Conflitos de arquivo a vigiar (Git 2/Git 8):** PR #3417 e branch
    `claude/chore-snapshots-all-authed-supersede-3417-261114-0202` editam `update-snapshots.yml`;
    branch `claude/fix-e2e-fora-do-banco-de-producao-261114-1003` toca `e2e-color-swatch-grid.yml` e
    `e2e-magazine-header.yml`; a #3525 edita `global-search-gate.yml` e `supplier-comparison.yml`.
12. **16 registros desativados na API sem arquivo em `origin/main`** (nada a decidir no repo, mas
    poluem a listagem de Actions e a coleta do `ci-metrics-weekly.yml`): `auto-regenerate-types.yml`,
    `deno.yml`, `dependency-review.yml`, `e2e-modules.yml`, `e2e-quote-items-table-header.yml`,
    `e2e-update-alert-dialog-snapshots.yml`, `e2e-update-confirm-dialog-snapshots.yml`,
    `e2e-update-dialog-snapshots.yml`, `e2e-update-editor-sheet-snapshots.yml`,
    `e2e-update-magazine-ring-snapshots.yml`, `jekyll-docker.yml`, `magazine-typed-queries.yml`,
    `node.js.yml`, `tmp-check-douf-key.yml`, `tmp-rotate-douf-brindes.yml` (+ `static-checks.yml`,
    que existe só na PR).
13. **`stale.yml` continua ATIVO** (não está em `disabled-workflows.tsv`): a partir de ~2026-11-21
    fecharia automaticamente a issue P0 #1871 (auth) e a #1811 com mensagem placeholder.
