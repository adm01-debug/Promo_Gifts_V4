# origin/codex/fix-e2e-ci-pressure-261107-0238

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz os testes automaticos de tela pararem de acusar erro onde nao tem erro (e de passar onde tem), para que o aviso de "quebrou" volte a significar que quebrou de verdade.
- **Tip / merge-base / main:** tip `6746bd9cca3322e87aaa0e195f4dc386337d5a91` · merge-base `6065eb7adcef03f1c52f5b1738aef7dc8bd976e3` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelos 16 commits (07/11), o agente atacou dois problemas ao mesmo tempo:

1. **Tirar o peso do E2E de cima do banco de producao.** Os commits de Joaquim Ataides
   (`8311688325 fix(ci): reduzir pressão dos E2E no Supabase`, `0fe667022a fix(ci): filtrar E2E também em
   pushes`) e depois `9bba6371c4 fix(ci): isolar gates dedicados e reduzir shards E2E` /
   `1013b59a14 fix(e2e): dividir regressão e isolar suítes autenticadas` criaram uma particao: uma flag
   `E2E_GENERAL_REGRESSION` no `playwright.config.ts` faz o workflow geral rodar **somente um nucleo
   transversal** de specs (login, rotas publicas, SPA, ordem de acoes), empurrando estoque/visual/dominio
   para os workflows dedicados, desligando `trace`/`screenshot`/`video` e zerando `retries` nessa perna.
2. **Consertar specs que estavam acusando falha (ou passando a falso) por estarem desatualizados em
   relacao ao app.** Os commits `647584f72a tornar auditoria de ações determinística`,
   `a65db72484 estabiliza tooltips sem reduzir cobertura`, `aa883f056e make general E2E regression
   deterministic`, `1973bfd1e5 align general E2E specs with auth context`, `0f9f62446d align sidebar and
   helper contracts`, `94c7789c91 provide admin auth to stock matrix`, `58de703a78 grant relevance gate PR
   read permission`, `afabba8a0a restore reconciled Playwright manifest` e
   `20393d662e restore reconciled E2E coverage` mexem em 11 arquivos de `e2e/` + 1 de `src/`.

A main resolveu o **problema 1 por outro caminho**: em 14/11 tirou o E2E dos PRs por completo
(`origin/main:.github/workflows/e2e.yml:9` — comentario "E2E fora dos PRs (14/11): os PRs apontavam o E2E
para o Supabase de produção e sobrecarregavam o banco") e em 13/11 passou o `e2e-stock.yml` para
`schedule: '27 4 * * *'` + dispatch. Ou seja: a motivacao da branch foi atendida, mas o **problema 2 nao
foi** — e parte dele continua vivo na main hoje.

Nenhum dos 15 arquivos da branch chegou a main com o conteudo da branch
(`git rev-parse main:<arquivo>` nunca bate com `tip:<arquivo>`); 9 deles a main deixou **identicos ao
merge-base**, isto é, o trabalho da branch ficou de fora sem substituto.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Permissao `pull-requests: read` para o gate de relevancia | **ESTA** | `origin/main:.github/workflows/e2e.yml:27-29` e `.github/workflows/e2e-flows.yml:36-38` trazem `permissions: contents: read / pull-requests: read` |
| Credencial de admin na matriz de estoque (`E2E_ADMIN_EMAIL/PASSWORD`) | **ESTA** | `origin/main:.github/workflows/e2e-stock.yml:113-114` |
| Minimo de 9 testes no gate de quote-flow (`min: '9'`) | **ESTA** (com comentario explicativo a mais) | `origin/main:.github/workflows/e2e-flows.yml:200` |
| Problema da pressao do E2E no banco de producao | **RESOLVIDO DE OUTRA FORMA** (nao pela particao da branch) | `origin/main:.github/workflows/e2e.yml:9` (tira E2E dos PRs, 14/11); `.github/workflows/e2e-stock.yml:8-9` (`schedule: '27 4 * * *'`, 13/11) |
| Fallback do seletor de visao do catalogo quando a toolbar sai da area visivel | **ESTA, com tecnica melhor que a da branch** — nao resgatar | main faz `trigger.scrollIntoViewIfNeeded() + focus() + keyboard Enter` em `e2e/catalog/helpers/swatch-view.ts`; a branch usava `element.click()` via `evaluate` (atalho que nao exercita o contrato a11y) |
| `requireAuth()` no spec de tooltips da sidebar | **ESTA** (a main adicionou por conta propria) | diff branch→main mostra `+ import { test, expect, requireAuth }` e `+ requireAuth();` em `e2e/flows/sidebar-tooltips.spec.ts` |
| Particao do E2E geral: flag `E2E_GENERAL_REGRESSION`, listas `authenticatedOnlySpecs`, `generalPublicSpecs`, `generalAuthedSpecs`, `publicOnlySpecs`, `generalRegressionDedicatedSpecs`; `trace/screenshot/video` off; `retries: 0` | **NAO ESTA** | `git grep E2E_GENERAL_REGRESSION main -- playwright.config.ts .github` → nenhuma ocorrencia em codigo (so em dossie `.md`). A main seguiu outro rumo no mesmo arquivo: `E2E_SERVER_MODE === 'preview'` |
| `E2E_GENERAL_REGRESSION: '1'` nos shards + reporter `blob,json,line` + artefato enxuto (`test-results/**/error-context.md`) | **NAO ESTA** | diff branch→main em `.github/workflows/e2e.yml` remove as 3 coisas e volta a `reporter=blob,json` e `test-results/` inteiro |
| Remocao do `if: github.event_name == 'push' \|\| 'pull_request'` no job de quote-flow | **NAO ESTA — e virou defeito vivo** | `origin/main:.github/workflows/e2e-flows.yml:97` ainda tem o `if:`, mas os gatilhos do arquivo hoje sao so `push: branches:[main]` e `workflow_dispatch` (`:7-24`). Em execucao manual, `github.event_name == 'workflow_dispatch'` → o job de quote-flow **e pulado em silencio** |
| `e2e/sidebar-logo.spec.ts`: glifo do logo tem exatamente 24px | **NAO ESTA — e a main se contradiz** | main afirma `expect(iconBox?.width).toBeLessThan(20)`, mas `origin/main:src/components/layout/AppLogo.tsx:106` renderiza `<Gift className="h-6 w-6" ...>` = 24px (comentario na linha 105: "V3 exact: h-6 w-6"). 24 nao e menor que 20 |
| `e2e/protected-routes.spec.ts`: lista de rotas publicas real + `/auth` como canonica + checagem de `app-not-found` | **NAO ESTA — e a main testa rotas inexistentes** | main lista `/proposta/test-token`, `/approve/test-token`, `/kit/test-token` como publicas; nenhuma existe no roteador (`git grep '/proposta\|/approve\|path="/kit' main -- src/routes` → so `/kit-builder`). Idem `/pedidos` em protegidas (`git grep pedidos main -- src/routes` → vazio). A branch usa as rotas que existem de fato: `origin/main:src/routes/public-routes.tsx:47-56` (`/auth`, `/login`, `/forgot-password-confirmation`, `/unauthorized`, `/termos`, `/privacidade`, `/revista-publica/:token`) |
| `e2e/spa-rewrite.spec.ts`: deixa de falhar sozinho quando nao ha `/assets/*` (servidor de desenvolvimento) | **NAO ESTA** | main mantem `expect(false, "[E108] Sem /assets/* — dev server inline (esperado em vite dev).").toBeTruthy()`, ou seja, falha de proposito no modo em que o CI roda por padrao |
| `e2e/auth-debug-removal.spec.ts`: troca 2 comparacoes de imagem por asseracoes de comportamento + corrige seletor CSS invalido | **NAO ESTA** | main mantem `toHaveScreenshot('login-default.png')` / `('login-error-state.png')` com `updateSnapshots: 'none'` no CI (`playwright.config.ts`), e mantem o seletor `'.mt-8.border-white/5.bg-black/40.p-4'` — a barra `/` nao escapada e invalida em seletor de classe CSS |
| `e2e/actions-order.spec.ts` reescrito (so projeto autenticado, mocks, lista de modulos real, acoes de mobile) | **NAO ESTA** | main == merge-base; main ainda audita `/estoque` e exige 7 botoes visiveis em todos os modulos e tambem no mobile |
| `force` em `installSwatchCatalogMocks` (dependencia do item acima) | **NAO ESTA** | `git grep -F "options.force" main -- e2e` → vazio; main tem `installSwatchCatalogMocks(page: Page)` sem opcoes |
| `requireAuth()` + skip fora do projeto autenticado em `e2e/admin/stock-dashboard-empty.spec.ts` | **NAO ESTA** | main == merge-base (`test.beforeEach(async ({ page }) => {` sem `requireAuth`) |
| `e2e/routes/public/reset-password.spec.ts`: asseracao deterministica do titulo "link invalido ou expirado" | **NAO ESTA** | main mantem `expect(ok \|\| redirected).toBeTruthy()`, que passa mesmo sem a tela correta |
| Helper `expectTooltipOnHover` (reentra no alvo por causa do atraso de abertura do Radix) em `e2e/flows/sidebar-tooltips.spec.ts` | **NAO ESTA** | `git grep -F expectTooltipOnHover main -- e2e` → vazio |
| `src/components/products/list-item/ListItemActions.tsx`: tooltip no botao de carrinho | **NAO ESTA — e contraria um comentario da main (que esta impreciso)** | `origin/main:src/components/products/list-item/ListItemActions.tsx:41` diz "QuickAddToQuote já tem Tooltip + Popover próprios"; mas `origin/main:src/components/products/QuickAddToQuote.tsx` **nao importa Tooltip** (so `Popover`, linha 7) e usa `title="Adicionar ao Carrinho"` nativo (`:205`). Decisao de UI, nao de teste |
| Formatacao (prettier: aspas simples, quebras de linha) em ~8 arquivos | **NAO ESTA — nao resgatar** | diff branch→main e so o inverso da formatacao; e ruido que conflitaria com outros agentes |

## A resgatar

Em ordem de impacto. Os quatro primeiros sao defeitos **vivos na main hoje**, provados acima.

1. **`.github/workflows/e2e-flows.yml`** — apagar o `if: github.event_name == 'push' || github.event_name == 'pull_request'` da linha 97. Hoje, quem dispara o teste de fluxo de orcamento na mao nao roda o fluxo de orcamento: o job e pulado sem avisar. Como os PRs nao acionam mais esse workflow, o disparo manual e a unica porta.
2. **`e2e/sidebar-logo.spec.ts`** — trocar `toBeLessThan(20)` por `toBe(24)`. O teste exige um logo menor do que o logo que a propria main desenha; ele acusa falha num app correto.
3. **`e2e/protected-routes.spec.ts`** — usar a lista de rotas que existe (`/auth`, `/login`, `/reset-password`, `/forgot-password-confirmation`, `/unauthorized`, `/termos`, `/privacidade`, `/revista-publica/:token`), tirar `/pedidos` das protegidas e checar que a pagina nao e "nao encontrado". Hoje tres rotas inexistentes passam o teste porque uma pagina de erro tambem "nao redireciona para /login" — e isso esconde a quebra de qualquer link publico que um dia pare de existir.
4. **`e2e/spa-rewrite.spec.ts`** — tirar o `expect(false, ...)` e checar `/src/main.tsx` quando nao houver `/assets/*`. Hoje esse teste falha de proposito no modo em que o CI sobe o site.
5. **`e2e/auth-debug-removal.spec.ts`** — substituir as duas comparacoes de imagem por asseracoes de conteudo (o que o teste quer provar e que dados internos de conexao nao aparecem na tela de login, nao que a tela esteja pixel a pixel igual) e corrigir o seletor CSS invalido `.border-white/5` → `[class~="border-white/5"]`.
6. **`e2e/actions-order.spec.ts`** (+ dependencia obrigatoria: a opcao `force` em **`e2e/helpers/swatch-catalog-mocks.ts`**) — a auditoria da barra de acoes do produto so faz sentido logada, com dados fixos, nos modulos que realmente tem aquela barra, e no mobile so com as acoes que o mobile mostra. E o item mais volumoso (+68 linhas) e o que mais reduz alarme falso na regressao geral.
7. **`e2e/flows/sidebar-tooltips.spec.ts`** — trazer so o helper `expectTooltipOnHover` (manter o `requireAuth()` que a main ja tem). Resolve o falso vermelho de tooltip que nao abre no primeiro passar do mouse.
8. **`e2e/routes/public/reset-password.spec.ts`** — asseracao deterministica do titulo "link invalido ou expirado" no lugar do `ok || redirected`, que passa mesmo se a tela estiver errada.
9. **`e2e/admin/stock-dashboard-empty.spec.ts`** — `requireAuth()` + pular fora do projeto autenticado. Pequeno, evita rodar um teste de tela protegida sem sessao.

**Nao resgatar:** a particao `E2E_GENERAL_REGRESSION` (`playwright.config.ts` + `e2e.yml`), o fallback de
`swatch-view.ts` (a main tem versao melhor), a formatacao prettier, e — sem decisao do dono — o tooltip do
botao de carrinho.

## Risco de fechar esta branch

Se a branch for fechada sem resgate, **a main continua com cinco testes de tela que mentem**: tres acusam
erro onde o sistema esta certo (logo da sidebar, `/assets/*` no servidor de desenvolvimento, e as duas
comparacoes de imagem da tela de login sem foto de referencia) e dois passam onde o sistema poderia estar
errado (rotas publicas inexistentes dadas como funcionando; tela de "link expirado" nao verificada). Em
pratica: o dono paga execucao de CI e recebe um sinal que nao da para acreditar — vermelho que se aprende
a ignorar, verde que nao garante nada. Alem disso, o teste do fluxo de orcamento (o caminho de dinheiro:
montar e enviar um orcamento) **nao roda quando alguem dispara o workflow na mao**, que hoje e a unica
forma de rodar sob demanda; ninguem percebe porque o job aparece como "pulado", nao como "falhou".

O que **nao** se perde: a motivacao original (E2E sobrecarregando o banco de producao) ja foi resolvida pela
main de outro jeito, e tres pedacos da branch (permissao do gate, credencial de admin no estoque, minimo de
9 testes) ja estao lá. Fechar a branch nao reabre o problema do banco.

Risco oposto (aplicar tudo as cegas): a particao `E2E_GENERAL_REGRESSION` **reduz o que o CI cobre** e
desliga video/trace numa perna inteira — hoje redundante com a decisao de 14/11 e, se aplicada junto,
esconderia evidencia de falha. E o tooltip no botao de carrinho, aplicado como esta, deixa **dois** avisos
sobre o mesmo botao (o `title` nativo da linha 205 do `QuickAddToQuote` mais o novo tooltip): se for
adotado, o `title=` tem que sair no mesmo diff.

## Nao verificado

- **Nao executei nenhum teste.** Todas as afirmacoes acima sao leitura de codigo-fonte da main e de diff;
  "o teste falha" e deducao a partir da asercao versus o codigo que a main renderiza (ex.: 24px vs `<20`),
  nao saida de `npx playwright test`. Quem aplicar o resgate deve rodar os specs tocados.
- **Nao verifiquei se existe PR aberta para esta branch** nem o historico de execucoes dos workflows
  (nao chamei a API do GitHub nesta tarefa). Se houver PR aberta mexendo nesses mesmos arquivos de `e2e/`,
  o resgate tem de esperar por ela (Git 2 do AGENTS.md).
- **Nao decidi** se o botao de carrinho deve ganhar tooltip proprio (`ListItemActions.tsx`) nem se vale
  adotar a particao do E2E geral: a primeira e escolha de interface, a segunda muda o que o CI cobre.
  Ambas sao do dono.
- **Nao investiguei** se o comentario impreciso em `origin/main:src/components/products/list-item/ListItemActions.tsx:41`
  ("já tem Tooltip próprio") veio de um refactor que removeu o Tooltip do `QuickAddToQuote` e esqueceu o
  comentario. Vale um olhar separado; nao e desta branch.
- Arquivos sem leitura por truncamento do pacote: **0** (os 15 arquivos vieram com os dois diffs completos).
