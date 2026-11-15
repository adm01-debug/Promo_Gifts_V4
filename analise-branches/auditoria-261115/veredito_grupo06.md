# Veredito — grupo06 (13 branches apagadas do GitHub, commits ainda no clone local)

Repo: /home/user/Promo_Gifts_V4 (adm01-debug/Promo_Gifts_V4). Somente leitura — nenhuma escrita,
push, PR, merge, restauração ou `git checkout` foi feita. Todos os 13 SHAs existem no clone
(`git cat-file -e` OK), portanto qualquer uma pode ser restaurada com um push se o dono quiser.

Método em cada branch: `git diff <merge_base> <sha>` para ler o trabalho real, depois comparação
do blob (`git rev-parse <ref>:<arquivo>`) e busca do símbolo em `origin/main`. Onde a main tem a
mesma coisa com outro nome, o arquivo:linha da main está citado.

## Resumo

| # | Branch | Veredito |
|---|---|---|
| 1 | importado/vps-fabrica/v2/m17-2610082248 | INCORPORADA |
| 2 | claude/fix-price-rounding-mockup-261108-2305 | INCORPORADA |
| 3 | importado/backup-20261028/codex/quote-rpc-proposals-20260922 | INCORPORADA |
| 4 | claude/fix-aba-marketing-261113 | INCORPORADA |
| 5 | **claude/fix-auth-setup-e21-261106-0150** | **APROVEITAR (parcial — 1 arquivo)** |
| 6 | claude/feat-ft129-swap-item-personalization-261115-0112 | INCORPORADA |
| 7 | claude/fix-health-check-timeout-261106-0150 | INCORPORADA |
| 8 | fix/p200-e049-rate-guard | INCORPORADA |
| 9 | fix/uptime-http-status-20261030 | INCORPORADA |
| 10 | claude/feat-ft119-beforeunload-restore-261108-0100 | INCORPORADA |
| 11 | claude/fix-rollback-202000-261101-2150 | INCORPORADA |
| 12 | fix/p200-eslint-dev-dependencies-20261031 | INCORPORADA |
| 13 | importado/vps-fabrica/v2/fix-exclusao-segura-na-pagina-de-histori-2610081909 | INCORPORADA |

**Só a branch 5 tem trabalho de produção ausente da main.** As outras 12 podem ser apagadas em
definitivo sem perda.

---

## 1. importado/vps-fabrica/v2/m17-2610082248 (ecf10b1b16) — INCORPORADA

Trabalho: tempo limite de 60 s na edge `generate-ad-prompt` (geração de prompts do Magic Up), para
prompts longos não serem cortados antes da resposta do provedor, devolvendo 504 + `code: "timeout"`.

Está tudo na main, em versão mais refinada:
- `supabase/functions/generate-ad-prompt/timeout.ts:16` `AI_PROVIDER_TIMEOUT_MS = 60_000`;
  `:21` `TIMEOUT_ERROR_CODE = "timeout"`; `:28` `isProviderTimeoutError`
- `supabase/functions/generate-ad-prompt/index.ts:166` `legacyTimeoutMs: AI_PROVIDER_TIMEOUT_MS`;
  `:229` guarda `if (isProviderTimeoutError(error))`; `:236` resposta 504
- `tests/edge-functions/generate-ad-prompt.timeout.test.ts` idêntico (mesmo blob)

Diferença restante contra a main: só texto de comentário (a main documenta também o caminho do
roteador e importa `handleCorsPreflightIfNeeded`). Nenhuma linha de lógica da branch falta.

## 2. claude/fix-price-rounding-mockup-261108-2305 (2eecbd1cbf) — INCORPORADA

Trabalho: arredondar o preço do kit em 2 casas, corrigir a remoção de logo por área no gerador de
mockup, e ligar as validações de quantidade mínima / "cabe na caixa" na criação do orçamento.

Na main:
- `src/lib/kit-builder/price-calculator.ts:95-97` — os três `Math.round(... * 100) / 100`
- `src/pages/mockups/MockupGenerator.tsx:353-361` — `onLogoRemove={(areaId) => ...}` removendo a
  logo da área certa (a main vai além: `clearForArea(areaId)` em vez de limpar a análise toda)
- `src/pages/kit-builder/useKitBuilderQuote.ts:22-23, 382, 409` — `validateKitMinQuantityForQuote`
  e `validateKitFitsForQuote`
- `src/hooks/kit-builder/useKitFitsValidation.ts` e `useKitMinQuantityValidation.ts` existem na main

Diferença restante: formatação de tipo e um BOM no topo do price-calculator da branch. Ruído.

## 3. importado/backup-20261028/codex/quote-rpc-proposals-20260922 (92e660adcb) — INCORPORADA

Trabalho (3 commits, 26 arquivos): contrato transacional do orçamento — campos novos no item
(descrição, personalização, mockups, artes, descontos, embalagem selecionada), versão obrigatória
no save (CAS) para dois usuários não sobrescreverem um ao outro, exclusão de itens removidos pela
RPC, reidratação dos IDs dos itens após salvar, e fim do UPDATE granular de ordem que concorria
com a RPC. Mais simulação em Postgres isolado das 3 RPCs propostas.

Byte a byte idênticos à main (mesmo blob): `docs/db/proposals/20260922210000_create_quote_lineage.sql`,
`...210500_increment_quote_version_explicit_bump.sql`, `...211000_update_quote_lineage_lock.sql`,
`tests/fixtures/quote-rpc-catalog-20260922.json`, `tests/fixtures/quote-rpc-live-20260922.json`,
`tests/sql/quote-rpc-fixture.sql`. (Os 3 SQL são propostas em `docs/`, não migrations aplicáveis.)

Código de produção, todo na main:
- `src/services/quoteService.ts:84` select com `product_description,…,selected_packaging_unit_cost`;
  `:297` erro "Versão do orçamento ausente ou inválida"; `:314` `_removed_item_ids`;
  `:317` `includeIdentity: true`; `:362-376` reidratação de identidades
- `src/hooks/quotes/quoteTypes.ts:33,37,40,43,66` — os campos novos do item
- `src/hooks/quotes/quoteHelpers.ts:203,220,235,239,259-262` — `includeIdentity` e o payload novo
- `src/services/quoteItemsReorder.ts:4` `@deprecated`; `:44` `.select('id')`; `:55` confirmação
- `src/hooks/quotes/useQuoteBuilderState.ts:1051-1076` — sobrescrita explícita adotando o snapshot
  remoto e revertendo versão no erro
- `src/components/quotes/useQuoteSummaryState.ts:100,120,142,179` — `stageOrderForTransactionalSave`
  (a main extraiu o mesmo código do `QuoteBuilderSummaryColumn.tsx` para este hook)
- `package.json:95` `test:quote-rpc:postgres`; `.github/workflows/deploy-gates.yml:547` o gate

Onde os arquivos diferem (`scripts/simulate-quote-rpc-proposals.mjs`, o manifest e o teste do
script), a main é superconjunto: só 1 linha reformatada da branch não aparece lá.

## 4. claude/fix-aba-marketing-261113 (057defca4d) — INCORPORADA

Trabalho: a aba Marketing do produto passa a gravar nos vínculos reais (datas comemorativas /
público-alvo) com RLS, e endomarketing ganha tabela mestre + vínculo separado.

Mergeado na main pelo commit `e5afe8245` (PR #3647, "trem das 5 correções"). Byte a byte idênticos
(mesmo blob) na main: `src/components/admin/products/productMarketingData.ts`,
`ProductMarketingSection.tsx`, os dois testes em `src/components/admin/products/__tests__/`,
`src/data/mockData.ts`, `recovery/src-legacy/.../ProductMarketingSection.tags-legacy.ts`.

Migration na main: `supabase/migrations/20261113140000_marketing_tab_links_rls_and_endomarketing.sql`
(a da main é a mesma mais 2 comentários-guarda `soft-delete-exempt`), registrada em
`supabase/MIGRATIONS_SYNC_LOG.md:1573` como pendente de aplicação via `db-apply-migration.yml`.

Divergência que registro por ser destrutiva, mas que **não é perda**: o rollback da branch
(`supabase/rollbacks/20261113140000_rollback.sql`) apagava com DELETE as opções semeadas; a main
substituiu isso por cópia das tabelas para `_backup_<tabela>_<data>` antes do DROP. A versão da
main é a mais segura e é a que está valendo. Nada a resgatar.
`audit/supabase-reference-catalog.temporary.json` é snapshot gerado (ruído).

## 5. claude/fix-auth-setup-e21-261106-0150 (4bc7633ca1) — APROVEITAR (parcial)

**É a única branch do grupo com código ausente da main.**

O que aproveitar — 1 arquivo, 4 linhas: **`playwright.config.ts`, elevar o tempo limite global dos
testes de ponta a ponta de 120 s para 200 s.** Em linguagem de negócio: hoje, quando o CI roda os
testes automatizados, o próprio Playwright mata o teste antes de o login terminar, e a falha sai
como "estourou o tempo" em vez de dizer o problema real — some cobertura de teste sem ninguém
perceber a causa. A premissa continua verdadeira na main de hoje:
- `playwright.config.ts:37` — `timeout: 120 * 1000` (global; não há override por projeto:
  linha 179 é o tempo de subida do servidor web, não do teste)
- `e2e/helpers/auth.ts:64` — `const timeout = creds.timeoutMs ?? (process.env.CI ? 150_000 : 20_000)`
- `e2e/helpers/auth.ts:225` `loginAs` → `:270` chama `loginViaUI`, e dezenas de specs chamam
  `loginAs` no `beforeEach` (`git grep -c loginAs origin/main -- e2e/` lista 2 a 4 ocorrências em
  dezenas de arquivos)

Ou seja: o ajudante de login reserva 150 s em CI, mas o teto do teste é 120 s. Está completo — é
uma mudança de uma constante, sem dependências.

O que **NÃO** aproveitar (conflito deliberado de regra, a main decidiu o contrário):
- `e2e/fixtures/auth.setup.ts` — a branch afrouxava a guarda E21 para aceitar qualquer "Timeout
  aguardando redirect" e seguir em frente. A main foi para o lado oposto, de propósito e com
  justificativa escrita em `e2e/fixtures/auth.setup.ts:76-80`: "Converter timeout em storage vazio
  permitia que specs com requireAuth fossem pulados e o workflow aparentasse sucesso sem cobertura
  autenticada" — em CI, qualquer falha de login agora é erro.
- o `setup.setTimeout(200_000)` da branch já existe na main como
  `e2e/fixtures/auth.setup.ts:22` `setup.setTimeout(process.env.CI ? 180_000 : 30_000)`.
- `.github/.keep-runner-3` — arquivo vazio para destravar runner de CI. Ruído.

## 6. claude/feat-ft129-swap-item-personalization-261115-0112 (6597b49dba) — INCORPORADA

Trabalho: no Kit Maker, trocar um item específico direto do passo de personalização (FT-129).

Na main:
- `src/components/kit-builder/ItemSelector.types.ts:35-37` — `replaceTarget` e `onReplaceItem`
- `src/components/kit-builder/ItemSelector.tsx:79-80, 111-112, 210-214` — modo substituição e a
  faixa "Substituindo: …"
- `src/components/kit-builder/PersonalizationConfig.tsx:71, 1175, 1367, 1370` — botão "Trocar item"
  chamando `onReplaceItem`
- `src/pages/kit-builder/KitBuilderPage.tsx:49, 383-384, 403` — a main extraiu o estado para o hook
  `useKitItemReplaceTarget` (mesma função, outro nome)

## 7. claude/fix-health-check-timeout-261106-0150 (38fb645f6f) — INCORPORADA

Três itens, todos resolvidos na main em versão igual ou melhor:
- tempo da sonda de saúde: a branch punha 4000 ms; a main tem
  `supabase/functions/health-check/index.ts:23` `PROBE_TIMEOUT_MS = 5000` e `:194`
  `"X-Health-Version": "1.3.2"` (mesmo bump de versão). Valor da main é mais folgado.
- tempo do setup de login: `e2e/fixtures/auth.setup.ts:22` na main (180 s em CI).
- `e2e/flows/magazine-publish-smoke.spec.ts`: a branch desligava o teste inteiro com
  `test.skip(true, …)` por causa de um bug do app. A main não desligou — reescreveu o teste de
  verdade (`openMagazineWhenBackendReady`, espera da resposta de `/rest/v1/rpc/magazine_create_v2`,
  helpers de retry em `e2e/helpers/http-status.ts`). O atalho da branch foi superado pela correção.

## 8. fix/p200-e049-rate-guard (6db2040f4e) — INCORPORADA

Trabalho: proteger `kill_switch_hits` contra INSERT anônimo sem limite (E049) e tornar o gate de CI
dessa proteção obrigatoriamente verificado contra o banco real.

Byte a byte idênticos à main (mesmo blob):
`supabase/migrations/20261029160339_add_kill_switch_hits_anon_rate_guard.sql`,
`.security/anon-insert-rate-guard-manifest.json`, `scripts/check-anon-insert-rate-guard.mjs`,
`tests/scripts/check-anon-insert-rate-guard.test.mjs`.

Workflow na main: `.github/workflows/deploy-gates.yml:371-376` — mesmo passo com `--require-live` e
o mesmo `env` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF: doufsxqlfjyuvxuezpln`).
A migration já consta como **aplicada em produção**: `supabase/MIGRATIONS_SYNC_LOG.md:1285`.
`PENDENCIAS.md` é histórico (ruído).

## 9. fix/uptime-http-status-20261030 (6e6f57eae1) — INCORPORADA

Trabalho: o monitor de disponibilidade passa a registrar o status HTTP e descartar o corpo da
resposta nas sondas.

Byte a byte idênticos à main: `.github/workflows/uptime-monitor.yml` e
`tests/scripts/uptime-probe.test.ts`. `scripts/uptime-probe.sh` difere só porque a main evoluiu
para o ajudante comum `lib/missing-prerequisite.sh` no lugar do `echo ::error` da branch — a main é
a versão posterior. `PENDENCIAS.md` é histórico (ruído).

## 10. claude/feat-ft119-beforeunload-restore-261108-0100 (0c7e1dab99) — INCORPORADA

Trabalho: ao fechar a aba com edições não salvas no Kit Maker, guardar o kit completo e oferecer a
recuperação quando o usuário voltar (FT-119).

Na main, com acréscimos:
- `src/hooks/kit-builder/useKitAutoSave.ts:31` `export interface BackupFullState`; `:354` e `:371`
  gravação do `fullState`; `:407` e `:419` leitura. A main ainda tem o re-persist do backup (`:64`).
- `src/hooks/kit-builder/useKitBuilderPageState.ts:18, 132, 448-451, 531, 533` —
  `consumeUnloadBackup` e `restoreFromBackup` (a main acrescentou o parâmetro `flowOverride`)
- `src/pages/kit-builder/KitBuilderPage.tsx:61-67, 95, 110-114` — mesmo `checkedBackupRef`, mesmo
  aviso "Alterações restauradas"

## 11. claude/fix-rollback-202000-261101-2150 (ea7701ca05) — INCORPORADA

Trabalho: criar os dois arquivos de rollback que o preflight E58 exigia.

- `supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql` — **byte a byte
  idêntico** à main (mesmo blob), inclusive a troca do cabeçalho apontando para o arquivo de rollback.
- `supabase/rollbacks/20261101201000_rollback.sql` existe na main e é **mais completo**: traz o
  `CREATE OR REPLACE VIEW public.vw_system_health_quick` inteiro (reversão automática de verdade),
  enquanto a da branch era só um aviso "sem reversão automática".
- `supabase/rollbacks/20261101202000_rollback.sql` existe na main e devolve o EXECUTE a PUBLIC,
  anon e authenticated (restauração fiel do estado anterior); a da branch só devolvia a
  authenticated. A main é a mais completa.

O objetivo da branch (os arquivos existirem para o preflight) está cumprido na main.

## 12. fix/p200-eslint-dev-dependencies-20261031 (2ee4e3a3cc) — INCORPORADA

Trabalho: mover 8 pacotes de lint de dependência de produção para desenvolvimento (tira eles do
pacote que vai ao ar) e abrir uma exceção auditada para o aviso de segurança do `minimatch`.

Na main, `package.json` tem os 8 em `devDependencies` (conferido por leitura do JSON):
`@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`,
`eslint-plugin-jsx-a11y`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals`.

A exceção do minimatch está na main em `scripts/check-dependency-audit.mjs:131-132` (o advisory
GHSA-g3hv-75wg-m249), `:140-155` `REVIEWED_MINIMATCH_VIA`, `:162-177` `REVIEWED_MINIMATCH_EFFECTS`,
`:181-196` `REVIEWED_MINIMATCH_RANGES`, `:215` `REVIEWED_MINIMATCH_DIRECT_PACKAGES`, `:223` a URL,
`:225` `isAllowedMinimatchChainPackage`, `:517` o uso. A main é superconjunto: acrescentou
`REVIEWED_MINIMATCH_RANGES_ALLOWED` (`:203`) e `REVIEWED_MINIMATCH_EFFECTS_ALLOWED` (`:208`) e as
8 linhas que só existem na branch são a forma antiga das mesmas checagens, substituída.
`package-lock.json` é lockfile (ruído).

## 13. importado/vps-fabrica/v2/fix-exclusao-segura-na-pagina-de-histori-2610081909 (2690a23207) — INCORPORADA

Trabalho: no histórico de mockups, pedir confirmação antes de excluir (e apagar também as imagens)
e limpar os caracteres da busca que quebravam a consulta.

Na main:
- `src/pages/mockups/MockupHistoryPage.tsx:39` `sanitizeSearchTerm` com a mesma expressão;
  `:75` uso no filtro; `:25` `deleteMockupFromDb`; `:112` `pendingDeleteId`; `:125` a exclusão;
  `:334-360` o diálogo "Excluir mockup?" com Cancelar/Excluir
- `src/pages/mockups/__tests__/MockupHistoryPage.test.tsx` — a main é superconjunto (83 linhas a
  mais); o que só existe na branch é a forma anterior dos mesmos mocks.

---

## Encaminhamento

- **Apagar em definitivo:** branches 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13 — todas com prova de
  blob idêntico ou de arquivo:linha equivalente na main.
- **Resgatar antes de apagar:** branch 5, só o `playwright.config.ts` (120 s → 200 s). Não levar as
  mudanças dela em `e2e/fixtures/auth.setup.ts`: a main decidiu o contrário de propósito.
