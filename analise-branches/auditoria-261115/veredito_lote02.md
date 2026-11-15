# Veredito — Lote 02 (21 branches)

Método: diff de cada branch contra o PRÓPRIO merge-base, leitura dos arquivos de código
apontados no campo `detalhe`, e busca do equivalente em `origin/main` (`git show origin/main:<arq>`,
`git grep ... origin/main`). Ruído declarado quando aparece.

---

## 1. `fix/e2e-url-state-defaults-20261030`
**Veredito: INCORPORADA**
Resumo: a correção de URL compartilhável da aba de estoque e o endurecimento do gate de
dependências já estão na main (em forma refatorada). Sobra só 1 arquivo de rollback de 5 linhas.

Provas (equivalente na main):
- `StockDashboard` — branch cria `stockTabDefault` inline; main tem o mesmo comportamento extraído:
  `origin/main:src/components/inventory/StockDashboard.tsx:134` (`const [stockTabDefault] = useState(() => initialStockTab(reliabilityFlag, readActiveTabPref))`)
  e o módulo `origin/main:src/components/inventory/stockTabDefault.ts:11` (`export function initialStockTab`).
- `scripts/check-dependency-audit.mjs` — guarda de `fixAvailable` (eslint-plugin-unused-imports 1.1.3,
  `isSemVerMajor: true`) presente em `origin/main:scripts/check-dependency-audit.mjs:244,260-262`;
  guarda irmã de pptxgenjs em `:406-415`.
- Allowlist `perf002_drop_unused_snapshot_indexes()` presente em
  `origin/main:.security/lint-0029-allowlist.json:411`.

Resíduo (único item ausente da main): `supabase/rollbacks/20261101140001_rollback.sql` (5 linhas,
rollback de `20261101140001_sb0001_remove_auth_users_realtime.sql`, que ESTÁ na main —
`origin/main:supabase/migrations/20261101140001_sb0001_remove_auth_users_realtime.sql`).

Ruído: `PENDENCIAS.md` (+144), `RELATORIO_CI.md` (+666), `analise-branches/dossies/...`,
`docs/security/ALLOWLISTS_MEMORY.md` (entrada duplicada de `cleanup_expired_auth_sessions`),
`supabase/MIGRATIONS_SYNC_LOG.md` — relatórios de sessão de outro agente.

Ressalva **NÃO VERIFICADO**: na branch a checagem de `fixAvailable` é uma guarda genérica no topo de
`isAllowedMinimatchChainPackage` (vale para toda a cadeia); na main a asserção vive dentro do ramo
`packageName === 'minimatch'`. Não verifiquei se os pacotes transitivos da cadeia perdem a checagem na main.

---

## 2. `claude/fix-sync-e2e-vite-port-isolation-261030-1430`
**Veredito: INCORPORADA**
Resumo: o isolamento de porta do servidor Vite no CI e o harness de "desfazer" já estão na main —
a main inclusive evoluiu (usa `build && preview` em vez de `dev`).

Provas:
- `origin/main:playwright.config.ts:7` `const forceStartServer = process.env.E2E_FORCE_START_SERVER === '1';`
  `:10` `reuseExistingServer`, `:12-17` `localServerPort`/`localServerCommand` (com `--strictPort`), `:176` `command: localServerCommand`.
- `origin/main:.github/workflows/replenishment-quality.yml:47-48` `E2E_BASE_URL: http://127.0.0.1:8081` + `E2E_FORCE_START_SERVER: '1'`.
- `origin/main:src/pages/dev/UndoToastHarness.tsx:37,46,48` — `interactive`, `data-harness-mode`, bloco condicional.
- `origin/main:e2e/catalog/novidades-reposicao-card-parity.spec.ts:420-437` — `heightsByRow`/`rowSpreads` idênticos.
- `origin/main:e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:75-78` — `/__test/undo-toast?interactive=1` + asserção de `data-harness-mode`.
- `e2e/flows/26-catalog-to-kit-flow.spec.ts` — blob idêntico ao da main.

Resíduo deliberadamente não resgatável: em `e2e/flows/04p-quotes-expiration-column.spec.ts` a branch
mockava o REST do Supabase (`QUOTES_REST`, `installMockAuth`); a main escolheu o desenho OPOSTO e mais
amplo — seed ao vivo em 3 fusos (`origin/main:e2e/flows/04p-quotes-expiration-column.spec.ts:16-26`,
`requireLiveDatabaseAuth`, `TIMEZONES = ['America/Sao_Paulo','UTC','Europe/Lisbon']`). Nada de valor se perde.

Ruído: `PENDENCIAS.md` (+461), `RELATORIO_CI.md` (+183).

---

## 3. `codex/e23-required-secrets-20261030`
**Veredito: DECISAO_HUMANA**
Resumo: o miolo (sentinela de proteção de branch e gate de secrets obrigatório) já está na main;
sobra um endurecimento de CI que exclui o Dependabot dos gates que leem o banco ao vivo — decisão de
workflow, que por regra do repo não entra sem o dono.

Já na main (INCORPORADO):
- `origin/main:.github/workflows/branch-protection-sentinel.yml:13-15` (changelog v2.1.3) e `:123-124`
  (`COMMITS=$(bash scripts/sentinel-push-range.sh ...)`, modo `push first-parent`).
- `scripts/sentinel-push-range.sh`, `tests/scripts/sentinel-push-range.test.mjs`,
  `.github/workflows/sentinel-self-test.yml`, `.github/SENTINEL_CHANGELOG.md` — todos presentes na main (`git ls-tree origin/main`).
- Gate 1.13 com `--require-live` + degradação estática em fork: `origin/main:.github/workflows/deploy-gates.yml:353-365`.
- `fail_if_missing: true` no Gate E23: `origin/main:.github/workflows/deploy-gates.yml:563`.

Ausente da main (o que o dono precisa decidir):
- Exclusão de `github.actor != 'dependabot[bot]'` nos passos que exigem `SUPABASE_ACCESS_TOKEN`:
  `origin/main:.github/workflows/supabase-security-gate.yml:97,107,117,130` só excluem fork, não Dependabot;
  o mesmo em deploy-gates Gate 1.13 (`:354`) e no `fail_if_missing` (hoje `true` fixo).
  Efeito prático: PR do Dependabot não recebe Actions secrets → esses gates reprovam.
- 3 arquivos de teste de contrato ausentes: `tests/scripts/p200-e007-dependabot-secrets.test.mjs` (+29),
  `tests/scripts/p200-e008-live-rls-gates.test.mjs` (+59), `tests/scripts/p200-e009-governance-pr-rule.test.mjs` (+44).

O que decidir em 1 linha: PR do Dependabot deve PULAR os gates que leem o banco ao vivo (proposta da branch)
ou continuar reprovando como hoje?

Ruído: `PENDENCIAS.md` (+224), `RELATORIO_CI.md` (+161), `AGENTS.md`/`CLAUDE.md` (+43 cada, versão antiga),
plano de 200 etapas, snapshot PNG de e2e.

---

## 4. `importado/vps-fabrica/v2/s41-2610081949`
**Veredito: APROVEITAR**
Resumo: edge function nova — assistente "Matheus" que ORIENTA o vendedor sobre posição/tamanho de logo
e limites da técnica (não gera imagem, não guarda o texto do cliente).

Arquivos / tamanho (~399 linhas):
- `supabase/functions/mockup-assistant/index.ts` (+159) — JWT obrigatório (401), Zod (422),
  20 msg/min por usuário no limiter SSOT (429), modelo pelo `_shared/ai-router` (rota Flash), erro
  genérico do provedor, prompt do usuário nunca vai ao log.
- `supabase/functions/mockup-assistant/index.test.ts` (+226) e `tests/edge-functions/mockup-assistant.test.ts` (+10, entrada vitest).
- `supabase/functions/_shared/edge-authz-manifest.ts` (+4) — registra a função como `authenticated`.

Prova de ausência na main: `git ls-tree -r --name-only origin/main | grep -i mockup-assistant` → **zero arquivos**;
`git grep -ln mockup-assistant origin/main` só acha menções em `docs/**` (plano/ADR) e comentários de outras edges.
Também não há UI chamando: `origin/main:src/components/ai/AIMockupAssistant.tsx` não tem nenhum `invoke`.

Estado: backend **completo** (handler + testes + manifest), **pela metade ponta a ponta** — nenhuma tela
chama a função, e o `verify_jwt` em `supabase/config.toml` e o deploy via `deploy-edge-functions.yml`
ainda não foram feitos (a própria branch declara isso no cabeçalho).

---

## 5. `importado/vps-fabrica/v2/n64-2610082251`
**Veredito: APROVEITAR**
Resumo: serviço que lista os mockups já salvos de um cliente, para o módulo de orçamentos poder anexá-los.

Arquivos / tamanho (~398 linhas):
- `src/hooks/mockup/useClientMockups.ts` (+138) — consulta `generated_mockups` por `client_id`, ignora
  lixeira (`deleted_at`), ordena por data desc, devolve o caminho no bucket `mockup-assets` (para
  `quote_items.mockup_urls`) e miniatura assinada com TTL de 1h; sem `client_id` devolve `[]` sem bater no banco.
- `tests/hooks/useClientMockups.edge.test.ts` (+260) — casos de borda: cliente vazio, lixeira total,
  500 mockups (paginação, não varredura), erro do banco não virar lista vazia.

Prova de ausência na main: `git grep -n -E "useClientMockups|fetchClientMockups|extractMockupStoragePath|client-mockups" origin/main -- src tests` → **vazio**.
O que a main tem com nome parecido é outra coisa: `origin/main:src/hooks/mockup/mockupHistoryClients.ts:5`
(`buildHistoryClients` — só agrupa clientes de um histórico já carregado em memória, não consulta o banco).

Estado: **pela metade** — hook pronto e testado, mas nenhum componente de orçamento o consome
(a branch não toca em `src/components/quotes/**`). Depende também da coluna `deleted_at` em
`generated_mockups`, que o próprio cabeçalho declara ainda não aplicada no schema.

---

## 6. `importado/vps-fabrica/v2/refazer-f753ee81`
**Veredito: DESCARTAR**
Resumo: duplicata exata da branch 5 (`n64-2610082251`) — nada exclusivo.
Prova: mesmo merge-base (`4cf61adaee`), mesma mensagem de commit, e os 2 arquivos têm o MESMO blob:
`src/hooks/mockup/useClientMockups.ts` = `310757686bf20f0f4fef1aa677c7eb53565c2488` e
`tests/hooks/useClientMockups.edge.test.ts` = `e9521f31704d40ad1256ce1d5c39ad7095e64277` nas duas branches.

---

## 7. `codex/fix-e2e-relevance-261107-1148`
**Veredito: DECISAO_HUMANA**
Resumo: amplia o filtro que decide quando o E2E precisa rodar — hoje uma mudança em workflow, action
compartilhada, migration/edge do Supabase ou config de Tailwind/tsconfig NÃO aciona o E2E, e isso deixa
passar regressão. Mexe em 8 workflows, por isso precisa do dono.

Trabalho ausente da main:
- `.github/scripts/e2e-relevance.mjs` (+46): acrescenta ao filtro os workflows de E2E, `_secrets-check.yml`,
  as actions `e2e-setup`/`check-min-tests`/`setup-node-ci`, `supabase/functions|migrations|tests/**`,
  `index.html`, `vercel.json`, `supabase/config.toml`, `supabase/seed.sql`, `tsconfig*.json`,
  `tailwind.config.*`, `postcss.config.*`, e os scripts `check-playwright-min-executed`,
  `run-smoke-filtered`, `check-smoke-tags`, `e2e-smoke-coverage-doc`, `e2e-mock-auth-setup`;
  e isola a execução sob `import.meta.url === pathToFileURL(process.argv[1]).href` para o módulo virar testável.
  Prova: `origin/main:.github/scripts/e2e-relevance.mjs` tem 27 linhas e **nenhuma** dessas entradas
  (só `src/`, `e2e/`, `tests/`, `public/`, `.github/actions/e2e-setup/`, `package*.json`, `.nvmrc`, `playwright|vite.config`).
- `tests/scripts/e2e-relevance.test.mjs` (+109) — ausente da main (`git ls-tree origin/main` não lista).
- Mesmos caminhos adicionados aos `paths:` de 8 workflows (`e2e.yml`, `e2e-flows.yml`, `e2e-focused.yml`,
  `e2e-personalization.yml`, `e2e-swatch-quickview.yml`, `delivery-quality.yml`, `replenishment-quality.yml`,
  `visual-tests.yml`). Prova de ausência: `origin/main:.github/workflows/e2e.yml` não contém
  `tailwind.config`, `check-min-tests` nem `run-smoke-filtered` na lista de `paths`.
- `package.json` (+1) — script de teste do novo módulo.

O que decidir em 1 linha: aceitar que o E2E passe a rodar também quando mudam workflows, actions,
migrations/edges e configs de build (mais cobertura, mais minutos de CI)?

---

## 8. `claude/fix-mockup-geometria-wysiwyg-261115-0045`
**Veredito: APROVEITAR**
Resumo: faz o mockup entregue sair com a logo no tamanho REAL que o vendedor posicionou na tela
(WYSIWYG) e recusar o pedido quando o produto não tem medidas cadastradas, em vez de inventar um produto de 20 cm.

Arquivos / tamanho (~347 linhas):
- `supabase/functions/generate-mockup/geometry.ts` (+159, novo) — replica a fórmula cm→px do editor
  (`src/lib/mockup-geometry.ts`), mínimo de 40 px, fração default do produto 0,85,
  portão `missing_dimensions` (422) e teto de absurdo `MAX_LOGO_PX = 8 * 1024`.
- `supabase/functions/generate-mockup/index.ts` (+39/−~55) — remove `computeLogoPx`,
  `FALLBACK_PRODUCT_REFERENCE_CM = 20` e `MAX_LOGO_CANVAS_FRACTION = 0.98` (o teto que ENCOLHIA a logo
  grande e quebrava o WYSIWYG); passa a usar `logoSizePx`/`checkProductDimensions`; `validationError`
  ganha `status` para devolver 422.
- `supabase/functions/generate-mockup/index.geometry.test.ts` (+142, novo) e `vitest.config.ts` (+3,
  inclui o teste no coletor — sem isso o arquivo não é coletado).

Prova de ausência na main: `origin/main:supabase/functions/generate-mockup/index.ts:199`
(`const MAX_LOGO_CANVAS_FRACTION = 0.98`), `:221` (`function computeLogoPx(`), `:245`, `:323`, `:329`, `:409`
— a main AINDA tem a implementação antiga inline; não existe `geometry.ts` nessa pasta
(`git ls-tree -r origin/main | grep generate-mockup` → só `fetch-guard.ts`, `index.test.ts`, `index.ts`)
e `origin/main:vitest.config.ts` não tem nenhuma linha com `geometry`.

Estado: **completo** no servidor (fórmula + teste + coletor). Mudança de contrato: passa a devolver
422 `missing_dimensions` para payload sem dimensão real — a branch afirma que o cliente já aplica o mesmo
portão — **confirmado**: `origin/main:src/hooks/mockup/mockupGeneratorModel.ts:23`
(`MISSING_DIMENSIONS_ERROR_CODE = 'missing_dimensions'`), `:44` (`MISSING_DIMENSIONS_REFUSAL`) e
`origin/main:src/hooks/mockup/useMockupGenerator.ts:549` (`return { ok: false, error: MISSING_DIMENSIONS_REFUSAL }`),
com teste em `origin/main:src/hooks/mockup/__tests__/mockupDimensions.guard.test.ts:4`. O cliente já recusa
antes de chamar a edge, logo o 422 novo não quebra a UI atual.

---

## 9. `claude/fix-mockup-logo-tamanho-real-261114-2200`
**Veredito: DESCARTAR**
Resumo: duplicata exata da branch 8 — mesmo conteúdo, só um merge-base mais antigo.
Prova: os 4 arquivos têm blobs IDÊNTICOS nas duas branches —
`geometry.ts` = `35951d576ab94e34b8085582bbe9992ab3a3633d`,
`index.geometry.test.ts` = `a19e91c753241784624c14878be5a3cc2b2fdb0e`,
`index.ts` = `b34b5d55f886bb985c8b55a1dfb335835cb4159f`,
`vitest.config.ts` = `f149c2a932fa1efe09ce470819ddd8f725562ea9`.
Mesma mensagem de commit ("fix(mockup): logo no tamanho real na imagem gerada"). Use a branch 8.

---

## 10. `dependabot/npm_and_yarn/development-all-bec0ad7abb`
**Veredito: DESCARTAR**
Resumo: bump automático de 10 dependências de desenvolvimento, sem uma linha de código escrita à mão —
o Dependabot recria a branch quando quiser, nada se perde ao apagar.
Prova: 1 commit (`a8966d1f6 chore(deps)(deps-dev): Bump the development-all group...`), diff = `package.json` (+10/−10)
e `package-lock.json` (+332) — ruído gerado (lockfile).
Atenção, porém: contém **majors que quebram** — `tailwindcss ^3.4.17 → ^4.3.5`, `eslint ^9.17.0 → ^10.14.0`,
`@eslint/js ^9.39.5 → ^10.0.1`, `eslint-plugin-react-hooks ^5.1.0 → ^7.1.1`,
`@testing-library/jest-dom ^6.9.1 → ^7.0.1`, `jsdom ^30.1.3 → ^31.0.0`
(main em `origin/main:package.json:421,429,435`). A migração Tailwind v3→v4 / ESLint 9→10 é decisão
separada do dono, não um resgate de branch.

---

## 11. `importado/vps-fabrica/v2/refazer-f5f7f446`
**Veredito: DESCARTAR**
Resumo: duplicata exata da branch 12 (`s37-2610081949`).
Prova: mesmo merge-base (`4cf61adaee`), e os 2 arquivos com o MESMO blob —
`src/hooks/mockup/__tests__/useClientMockups.test.ts` = `abbd53716aeafa4283f6b58a5b483c1bc9af235d`,
`src/hooks/mockup/useClientMockups.ts` = `310757686bf20f0f4fef1aa677c7eb53565c2488`.

---

## 12. `importado/vps-fabrica/v2/s37-2610081949`
**Veredito: APROVEITAR**
Resumo: mesmo serviço de listar mockups do cliente da branch 5, com uma bateria de testes DIFERENTE e
complementar — vale resgatar o teste junto com o hook.

Arquivos / tamanho (~342 linhas):
- `src/hooks/mockup/useClientMockups.ts` (+124) — blob `310757686...`, **idêntico** ao da branch 5 (não conta duas vezes).
- `src/hooks/mockup/__tests__/useClientMockups.test.ts` (+218) — **exclusivo desta branch**: cobre os
  helpers puros (`extractMockupStoragePath` em URL pública/assinada/externa, `isMockupTrashed`,
  `sortMockupsByCreatedAtDesc` sem mutar entrada), o fallback quando a assinatura da miniatura falha,
  URL externa com `path: null` sem chamar `createSignedUrl`, e o hook em si.
  A suíte da branch 5 (`tests/hooks/useClientMockups.edge.test.ts`) cobre OUTROS casos (500 mockups,
  lixeira total, erro propagado) — confirmei por comparação dos `describe/it` das duas.

Prova de ausência na main: a mesma da branch 5 (`git grep useClientMockups origin/main` → vazio).
Estado: **pela metade** pelo mesmo motivo da branch 5 (nenhum consumidor nos orçamentos).

---

## 13. `importado/vps-fabrica/v2/n68-2610082251`
**Veredito: APROVEITAR** — ressalva: é **só teste automatizado**, nenhum código de produção.
Resumo: varredura de acessibilidade (axe-core / WCAG 2.1 AA) da página INTEIRA do Magic Up nos três
estados de uso (vazio, configurando, resultado), travando também a semântica de radiogroup da curadoria
e de lista do comparador de variações.
Arquivo: `tests/pages/MagicUp.a11y.test.tsx` (+330, novo).
Prova de ausência na main: `git ls-tree origin/main tests/pages/MagicUp.a11y.test.tsx` → não existe;
o teste de página que a main tem (`origin/main:tests/components/pages/MagicUp.test.tsx`) **não** usa axe
(`grep -n "axe" → nenhum resultado`; só importa `AriaLiveProvider` na linha 39).
Estado: completo como arquivo isolado. **NÃO VERIFICADO**: não executei o teste (trabalho somente de leitura),
então não sei se ele passa contra a main atual — a página evoluiu desde 2026-10-08.

---

## 14. `importado/vps-fabrica/v2/n67-2610082251`
**Veredito: APROVEITAR** — ressalva: é **só teste automatizado**, nenhum código de produção.
Resumo: varredura de acessibilidade da página do gerador de mockups nos três estados × 2 larguras
(375 px e 1280 px), com o axe rodando sobre a composição inteira, inclusive diálogos em portal.
Arquivo: `tests/pages/MockupGenerator.a11y.test.tsx` (+323, novo).
Prova de ausência na main: `git ls-tree origin/main tests/pages/MockupGenerator.a11y.test.tsx` → não existe.
A main cobre a11y de mockup só por COMPONENTE (`origin/main:src/components/mockup/__tests__/a11y.mockup.test.tsx:4`
importa `tests/a11y/axe-helper`, mas não monta a página), nunca a página montada.
**NÃO VERIFICADO**: não executei o teste.

---

## 15. `claude/fix-sec001-revoke-anon-trigger-funcs-261101-2230`
**Veredito: DECISAO_HUMANA**
Resumo: revoga a permissão de execução pública em 106 funções internas do banco (handlers de trigger e
rotinas de sincronização) — DDL em produção, com conflito de numeração de migration.

Conteúdo (~322 linhas):
- `supabase/migrations/20261101210000_sec001_revoke_anon_execute_trigger_functions.sql` (+115) —
  `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` em 106 funções (`fn_audit_role_changes`,
  `fn_log_login_attempt`, `fn_log_price_change`, `fn_force_user_logout`, …).
- `supabase/rollbacks/20261101210000_rollback.sql` (+109) — rollback da acima.
- `supabase/rollbacks/20260917070000_rollback.sql` (+18), `20260917090000_rollback.sql` (+16),
  `20260917100000_rollback.sql` (+64) — rollbacks que FALTAM para 3 migrations **já aplicadas na main**
  (`origin/main:supabase/migrations/20260917070000_e38_unschedule_dead_cron_jobs.sql`,
  `20260917090000_e47_fix_schema_drift_cron_split.sql`,
  `20260917100000_e37_split_genuine_multistatement_cron.sql`). Esses 3 são resgate de baixo risco
  (arquivo de rollback não executa nada por si).

Prova de ausência na main: nenhum dos 4 arquivos de rollback existe (`git ls-tree origin/main supabase/rollbacks/...`);
nenhuma migration da main faz esses REVOKEs (`git grep "fn_audit_role_changes() FROM PUBLIC" origin/main -- supabase/migrations` → vazio).

**Bloqueio concreto que exige o dono**: a versão `20261101210000` JÁ ESTÁ OCUPADA na main por
`origin/main:supabase/migrations/20261101210000_sb0007_drop_noop_restrictive_policies.sql` — a migration
precisa ser renumerada antes de qualquer PR. E, por AGENTS.md, DDL em produção vai só pelo workflow
`db-apply-migration.yml`, com aprovação.

O que decidir em 1 linha: aprovar o REVOKE de EXECUTE público nas 106 funções internas (e renumerar a migration)?

---

## 16. `codex/fix-e2e-ci-pressure-261107-0238`
**Veredito: DECISAO_HUMANA**
Resumo: reduz a pressão do E2E sobre o Supabase particionando as suítes (o workflow geral passa a rodar
só um núcleo transversal; estoque/visual/domínio ficam nos workflows próprios) — muda o que o CI cobre,
e um dos arquivos conflita com uma decisão explícita da main.

Trabalho ausente da main:
- `playwright.config.ts` (+52) — flag `E2E_GENERAL_REGRESSION`, listas `authenticatedOnlySpecs`,
  `generalRegressionDedicatedSpecs`, `publicOnlySpecs`, `generalPublicSpecs`, `generalAuthedSpecs`;
  `testMatch`/`testIgnore` por projeto; na regressão geral desliga `trace`/`screenshot`/`video` e zera `retries`.
  Prova de ausência: `git show origin/main:playwright.config.ts | grep E2E_GENERAL_REGRESSION` → **vazio**.
- `.github/workflows/e2e.yml` (+23) — `E2E_GENERAL_REGRESSION: '1'` nos shards, reporter `blob,json,line`,
  artefato reduzido a `test-results/**/error-context.md`.
- 11 arquivos de e2e ajustados (`e2e/actions-order.spec.ts` +68, `e2e/routes/public/reset-password.spec.ts` +49,
  `e2e/flows/sidebar-tooltips.spec.ts` +32, `e2e/spa-rewrite.spec.ts` +28, `e2e/helpers/swatch-catalog-mocks.ts` +21, …).

Já na main (INCORPORADO): credenciais de admin na matriz de estoque —
`origin/main:.github/workflows/e2e-stock.yml:113` (`E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}`).

**Conflito com regra/decisão da main**: `src/components/products/list-item/ListItemActions.tsx` (+5) envolve
`QuickAddToQuote` num `<Tooltip>`, mas a main diz o contrário de propósito —
`origin/main:src/components/products/list-item/ListItemActions.tsx:41`:
`{/* 1 - Carrinho (QuickAddToQuote já tem Tooltip + Popover próprios) */}`. Aplicar a branch duplicaria o tooltip.

O que decidir em 1 linha: aceitar que o workflow geral de E2E deixe de rodar as suítes de estoque/visual
(ficam só nos workflows dedicados) e perca trace/vídeo nessa perna?

---

## 17. `importado/vps-fabrica/v2/s71-2610081948`
**Veredito: APROVEITAR**
Resumo: separa os três estados de conclusão do mockup — imagem gerada, projeto salvo e ficha disponível —
cada um com seu próprio erro e seu próprio "tentar de novo"; e uma nova tentativa que falha não apaga mais
da tela o mockup que o vendedor já tinha.

Arquivos / tamanho (~305 linhas):
- `src/components/mockup/MockupCompletionStates.tsx` (+170, novo) — 4 status (`idle`/`running`/`done`/`error`)
  por condição, com rótulos próprios e botão de repetir isolado; "Salvo" só com gravação CONFIRMADA.
- `src/components/mockup/MockupResultCard.tsx` (+52) — props novas opcionais (`generationError`,
  `onRetryGenerate`, `projectSave`, `onRetrySave`, `sheet`, `onRetrySheet`) e `lastGeneratedMockup`
  para conservar o resultado anterior quando a nova geração falha.
- `src/components/mockup/__tests__/MockupResultCard.states.test.tsx` (+83, novo).

Prova de ausência na main: `git grep -ln "MockupCompletionStates|projectSave|onRetrySheet|onRetrySave" origin/main -- src tests` → **vazio**;
`git show origin/main:src/components/mockup/MockupResultCard.tsx | grep "generationError|lastGeneratedMockup|projectSave"` → **vazio**.

Estado: **pela metade** — componente e props prontos e testados, mas as props são opcionais e nenhum
chamador as preenche (a branch não toca na página do gerador), então na prática a tela continua
com o comportamento antigo até alguém ligar os fios.

---

## 18. `importado/vps-fabrica/v2/s36-2610081947`
**Veredito: APROVEITAR (parcial)**
Resumo: põe no servidor os tetos de entrada do gerador de mockup — recusa corpo gigante com 413 antes de
processar e recusa lote com mais de 6 áreas. O teto de IMAGEM já foi resolvido na main de outra forma.

Arquivos / tamanho (~294 linhas):
- `supabase/functions/generate-mockup/limits.ts` (+112, novo) — `MAX_BODY_BYTES = 15 MB`,
  `MAX_IMAGE_BYTES = 10 MB`, `MAX_BATCH_AREAS = 6`, `PayloadTooLargeError`, `declaredExceedsLimit`,
  `readBodyTextCapped`, `readImageResponseCapped`, `batchExceedsLimit`.
- `supabase/functions/generate-mockup/index.size.test.ts` (+136, novo).
- `supabase/functions/generate-mockup/index.ts` (+46) — campo `areas?`, resposta
  `413 payload_too_large / BODY_TOO_LARGE` com `limit_bytes`, recusa do lote antes de qualquer fetch.

O que JÁ ESTÁ na main (não resgatar): o teto de imagem e o endurecimento de SSRF foram feitos em outro
módulo — `origin/main:supabase/functions/generate-mockup/fetch-guard.ts:18`
(`export const MAX_IMAGE_BYTES = 15 * 1024 * 1024`), `:15` (`MAX_REDIRECTS`), `:38` (`isAllowedFetchHost`),
`:83,85` (recusa por `content-length` e por bytes). Atenção: a main usa **15 MB**, a branch propõe **10 MB**
alinhado ao limite do bucket — mudança de número, não de código.
O teto de 6 áreas existe na main só no CLIENTE: `origin/main:src/hooks/mockup/mockupGeneratorModel.ts:13`
(`export const MAX_BATCH_AREAS = 6`) usado em `origin/main:src/hooks/mockup/useMockupGenerator.ts:538-540`.

Ausente da main (o resgate real): teto de CORPO com 413 e a recusa do lote NO SERVIDOR —
`git show origin/main:supabase/functions/generate-mockup/index.ts | grep "MAX_BODY_BYTES|BODY_TOO_LARGE|413|MAX_BATCH_AREAS"` → **vazio**;
`git grep -ln "BODY_TOO_LARGE" origin/main` só acha código de cliente e `graphify-out/GRAPH_REPORT.md`.

Estado: **pela metade por conflito** — `limits.ts` precisa ser reconciliado com o `fetch-guard.ts` que a main
já tem (ambos definem `MAX_IMAGE_BYTES`, com valores diferentes); o aproveitável limpo é o teto de corpo (413)
e a recusa de lote > 6 áreas no servidor.

---

## 19. `importado/vps-fabrica/v2/s44-2610081949`
**Veredito: APROVEITAR** — ressalva: é **só teste**, e só vale junto com a branch 4 (`s41`).
Resumo: teste de contrato HTTP do assistente "Matheus" — prova 401 sem login, 422 com corpo inválido,
429 na 21ª mensagem do minuto e 502 do provedor com mensagem genérica sem vazar o prompt do cliente.
Arquivo: `tests/edge-functions/integration/mockup-assistant.test.ts` (+288, novo).
Prova de ausência na main: não existe pasta `mockup-assistant` em `origin/main`
(`git ls-tree -r --name-only origin/main | grep -i mockup-assistant` → vazio), logo nem o teste nem o alvo dele.
Dependência: sem a branch 4 este arquivo não tem o que testar (reusa `supabase/functions/_shared/*`
e a suíte Deno co-localizada da edge). **NÃO VERIFICADO**: não executei o teste.

---

## 20. `importado/vps-fabrica/v2/s51-2610081948`
**Veredito: DESCARTAR**
Resumo: versão ANTERIOR e menos completa do mesmo trabalho de geometria da branch 8 — nada se perde.
Prova (comparação linha a linha dos dois `geometry.ts`):
- a branch 8 tem tudo o que a s51 tem, MAIS: o teto de absurdo `MAX_LOGO_PX = 8 * 1024` (a s51 não tem
  teto nenhum — um `productWidthCm` de 0,001 cm geraria `drawImage` com destino de milhões de px),
  MAIS a sanitização `positiveOr` de `logoWidthCm`/`logoHeightCm` ≤ 0 para os defaults 5×3 cm
  (a edge é pública; na s51 um cm negativo viraria caixa negativa no canvas).
- a s51 **não** altera `vitest.config.ts`, então seu próprio `index.geometry.test.ts` (+101) nunca seria
  coletado pelo runner — a branch 8 adiciona a entrada.
Caminho: resgatar pela branch 8 (`claude/fix-mockup-geometria-wysiwyg-261115-0045`).

---

## 21. `importado/vps-fabrica/v2/refazer-1da3ac33`
**Veredito: APROVEITAR**
Resumo: cabeçalho de trabalho do gerador de mockups — mostra o cliente e o projeto, permite "Trocar cliente"
perguntando antes o que fazer com a marca já aplicada (nunca troca em silêncio), dá acesso a "Meus mockups",
e põe um "Voltar" no passo a passo que volta de etapa sem apagar as escolhas já feitas.

Arquivos / tamanho (~252 linhas):
- `src/pages/mockups/mockup-generator/MockupToolbar.tsx` (+81) — tipo `ClientBrandDisposition`
  (`'limpar-marca' | 'manter-marca'`), props `client`, `projectName`, `hasAppliedBrand`, `onChangeClient`,
  `historyHref` (default `/mockups/historico`), `ConfirmDialog` de reconciliação da marca.
- `src/components/mockup/MockupWizard.tsx` (+25) — botão "Voltar" (`aria-label`, desabilitado na etapa 1)
  que chama `onStepClick(currentStep - 1)` sem resetar estado.
- `src/pages/mockups/mockup-generator/__tests__/MockupToolbar.header.test.tsx` (+142, novo) e
  `MockupToolbar.test.tsx` (+4).

Prova de ausência na main:
`git show origin/main:src/pages/mockups/mockup-generator/MockupToolbar.tsx | grep "ClientBrandDisposition|onChangeClient|historyHref|Trocar cliente|Meus mockups|hasAppliedBrand"` → **vazio**
(a main ainda descreve o arquivo como "Extracted undo/redo/save status bar from MockupGenerator");
`git show origin/main:src/components/mockup/MockupWizard.tsx | grep "Voltar|ChevronLeft"` → **vazio**;
`git grep -ln "ClientBrandDisposition|Meus mockups" origin/main -- src tests` → **vazio**.

Estado: **pela metade** — props novas são todas opcionais e a página do gerador não as passa
(a branch não toca em `src/pages/mockups/MockupGenerator*`), então o cabeçalho aparece com "Sem cliente"
e sem ações até alguém ligar os fios.

---

# Tabela final

| branch | veredito | o que resgatar |
|---|---|---|
| `fix/e2e-url-state-defaults-20261030` | INCORPORADA | Nada de substância. Resíduo: `supabase/rollbacks/20261101140001_rollback.sql` (5 linhas) |
| `claude/fix-sync-e2e-vite-port-isolation-261030-1430` | INCORPORADA | Nada — playwright.config, workflow e harness já na main (main inclusive evoluiu) |
| `codex/e23-required-secrets-20261030` | DECISAO_HUMANA | Excluir Dependabot dos gates que leem o banco ao vivo (3 workflows) + 3 testes `p200-e007/008/009` (~132 linhas) |
| `importado/vps-fabrica/v2/s41-2610081949` | APROVEITAR | Edge function nova "assistente Matheus" (orientação de aplicação de logo): `supabase/functions/mockup-assistant/*` + manifest, ~399 linhas; backend completo, sem UI e sem deploy |
| `importado/vps-fabrica/v2/n64-2610082251` | APROVEITAR | Listagem dos mockups salvos de um cliente p/ anexar em orçamento: `src/hooks/mockup/useClientMockups.ts` + teste de borda, ~398 linhas; sem consumidor (metade) |
| `importado/vps-fabrica/v2/refazer-f753ee81` | DESCARTAR | Nada — duplicata exata de `n64-2610082251` (mesmos blobs) |
| `codex/fix-e2e-relevance-261107-1148` | DECISAO_HUMANA | Filtro de relevância do E2E ampliado (`.github/scripts/e2e-relevance.mjs` +46, teste +109, `paths:` de 8 workflows) — hoje mudança em workflow/migration/edge/config não aciona E2E |
| `claude/fix-mockup-geometria-wysiwyg-261115-0045` | APROVEITAR | Logo no tamanho real no mockup gerado (WYSIWYG) + recusa 422 sem medidas: `generate-mockup/geometry.ts` + `index.ts` + teste + `vitest.config.ts`, ~347 linhas; servidor completo |
| `claude/fix-mockup-logo-tamanho-real-261114-2200` | DESCARTAR | Nada — duplicata exata da anterior (4 blobs idênticos) |
| `dependabot/npm_and_yarn/development-all-bec0ad7abb` | DESCARTAR | Nada (lockfile gerado). Decisão separada: migrar Tailwind v3→v4 e ESLint 9→10 |
| `importado/vps-fabrica/v2/refazer-f5f7f446` | DESCARTAR | Nada — duplicata exata de `s37-2610081949` |
| `importado/vps-fabrica/v2/s37-2610081949` | APROVEITAR | Só o teste complementar `src/hooks/mockup/__tests__/useClientMockups.test.ts` (+218) — o hook é o mesmo blob de `n64` |
| `importado/vps-fabrica/v2/n68-2610082251` | APROVEITAR | Teste a11y (axe/WCAG AA) da página inteira do Magic Up em 3 estados: `tests/pages/MagicUp.a11y.test.tsx` (+330). Só teste |
| `importado/vps-fabrica/v2/n67-2610082251` | APROVEITAR | Teste a11y da página do gerador de mockups, 3 estados × 375/1280px: `tests/pages/MockupGenerator.a11y.test.tsx` (+323). Só teste |
| `claude/fix-sec001-revoke-anon-trigger-funcs-261101-2230` | DECISAO_HUMANA | REVOKE EXECUTE público em 106 funções internas (+115) — versão `20261101210000` já ocupada na main, precisa renumerar. Baixo risco à parte: 3 rollbacks faltantes de e38/e47/e37 (+98) |
| `codex/fix-e2e-ci-pressure-261107-0238` | DECISAO_HUMANA | Particionar suítes E2E p/ aliviar o Supabase: `playwright.config.ts` (+52) + `e2e.yml` + 11 specs. CONFLITO: tooltip em `ListItemActions.tsx` contraria comentário explícito da main |
| `importado/vps-fabrica/v2/s71-2610081948` | APROVEITAR | Três estados de conclusão separados (imagem / projeto salvo / ficha) e resultado anterior preservado em falha: `MockupCompletionStates.tsx` + `MockupResultCard.tsx` + teste, ~305 linhas; props sem chamador (metade) |
| `importado/vps-fabrica/v2/s36-2610081947` | APROVEITAR (parcial) | Tetos de entrada no servidor: corpo gigante → 413 e lote > 6 áreas recusado antes de processar (`limits.ts` + `index.ts` + teste, ~294 linhas). Teto de imagem já resolvido na main por `fetch-guard.ts` — reconciliar |
| `importado/vps-fabrica/v2/s44-2610081949` | APROVEITAR | Teste de contrato HTTP (401/422/429/502) do assistente Matheus: `tests/edge-functions/integration/mockup-assistant.test.ts` (+288). Só vale junto com `s41` |
| `importado/vps-fabrica/v2/s51-2610081948` | DESCARTAR | Nada — versão anterior e mais fraca da geometria; superada por `claude/fix-mockup-geometria-wysiwyg-261115-0045` (que tem `MAX_LOGO_PX`, sanitização de cm e a entrada no `vitest.config.ts`) |
| `importado/vps-fabrica/v2/refazer-1da3ac33` | APROVEITAR | Cabeçalho de trabalho do gerador (cliente, "Trocar cliente" com reconciliação da marca, "Meus mockups") + "Voltar" no passo a passo: `MockupToolbar.tsx` + `MockupWizard.tsx` + testes, ~252 linhas; props sem chamador (metade) |

**Resumo**: 10 APROVEITAR (1 parcial) · 2 INCORPORADA · 5 DESCARTAR (4 duplicatas exatas/superadas + 1 Dependabot) · 4 DECISAO_HUMANA.
