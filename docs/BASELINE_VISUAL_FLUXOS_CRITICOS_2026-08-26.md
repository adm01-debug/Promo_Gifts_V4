# Baseline visual dos fluxos críticos — inventário read-only

Data da auditoria: 2026-08-26
Worktree auditada: `/tmp/promo-gifts-codex-stabilization-20260826`

## Escopo

Esta etapa cobre apenas a parte não mutante do item 004 do plano: inventariar o que já existe de baseline visual para os 9 fluxos críticos definidos no checklist do projeto — catálogo, busca, orçamento, carrinho, estoque, mockup, magazine, kit e CRM — sem atualizar snapshots, sem regravar imagens e sem alterar config, CSS ou componentes.

## Procedimento executado

Foram executadas apenas leituras e validações sem escrita:

- inspeção de `playwright.config.ts`
- varredura de specs Playwright e diretórios `*.spec.ts-snapshots`
- inventário de PNGs versionados ligados a baseline/snapshot/export
- `sha256sum` dos PNGs existentes
- `npx playwright test --list ...` para validar coleta e vínculo spec→casos, sem gerar imagens

## Contexto da matriz

O plano do projeto define os 9 fluxos críticos em aberto no item 002 e exige baseline visual no item 004:

- catálogo
- busca
- orçamento
- carrinho
- estoque
- mockup
- magazine
- kit
- CRM

Referência de plano: `docs/PLANO_MELHORIAS_CORRECOES_100_ETAPAS_CHECKLIST_2026-08-26.md`, itens 002 e 004.

## Configuração Playwright observada

Em `playwright.config.ts`:

- `testDir: ./e2e`
- `testMatch: **/*.spec.ts`
- projetos ativos:
  - `chromium-public`
  - `firefox-public`
  - `webkit-public`
  - `chromium-authed`
  - `firefox-authed`
  - `webkit-authed`
  - `mobile-chrome`
  - `mobile-safari`
  - `chromium-smoke`

Implicação: uma única spec visual pode expandir fortemente a matriz de captura se não limitar projeto/viewport explicitamente.

## Resultado executivo

Hoje existe baseline visual versionada útil apenas de forma parcial, concentrada em:

- orçamento
  - `e2e/quotes/quote-item-editor-sheet-header.spec.ts-snapshots/`
  - `qa/exports/baseline/*.png` para propostas/PDF
- baselines auxiliares não pertencentes diretamente aos 9 fluxos críticos
  - `e2e/visual/preview-button.spec.ts-snapshots/`
  - `e2e/optimized-image-visual.spec.ts-snapshots/`

Para os demais fluxos críticos, o padrão atual é:

- há spec visual candidata, mas sem baseline versionada
- ou há spec funcional/mobile apenas
- ou a coleta read-only já falha antes mesmo da atualização de baseline

## Matriz dos 9 fluxos críticos

| Fluxo | Specs/rotas candidatas encontradas | Baseline desktop existente | Baseline mobile existente | Estado atual | Lacuna principal |
|---|---|---:|---:|---|---|
| Catálogo | `e2e/routes/app/produtos.spec.ts`, `e2e/catalog-scroll.spec.ts`, `e2e/catalog/*.spec.ts`, `e2e/routes/app/novelty-grid-visual.spec.ts` | Parcial e indireta | Parcial e indireta | Existem specs com `toHaveScreenshot`, mas o diretório `e2e/routes/app/novelty-grid-visual.spec.ts-snapshots` não existe | falta baseline commitada do fluxo canônico `/produtos` |
| Busca | `e2e/routes/app/produtos.spec.ts`, `e2e/flows/global-search-comprehensive.spec.ts`, `e2e/catalog/catalog-search-audit.spec.ts` | Não | Não | cobertura funcional existe, baseline visual não foi encontrada | falta definir estado visual canônico da busca |
| Orçamento | `e2e/quotes/quote-item-editor-sheet-header.spec.ts`, `e2e/quotes/customization-size-line-visual.spec.ts`, `e2e/quote-builder-layout.spec.ts`, `qa/exports/baseline/*.png` | Sim, parcial | Sim, parcial | único fluxo com baseline versionada clara | cobertura ainda fragmentada; várias specs têm `.gitkeep` mas não têm PNG |
| Carrinho | `e2e/visual/cart-header-actions.spec.ts`, `e2e/carrinhos/*.spec.ts` | Não | Não | há spec visual candidata, sem diretório de snapshots | falta baseline commitada do header/ações e do popover |
| Estoque | `e2e/admin/stock-dashboard-visual.spec.ts`, `e2e/admin/stock-future-stock-visual.spec.ts`, `e2e/visual/stock-alerts-panel.spec.ts` | Não | Não | specs visuais extensas existem e coletam em `--list`, mas não há snapshots versionadas | falta primeira captura aprovada |
| Mockup | `e2e/routes/app/mockup-generator.spec.ts`, `e2e/flows/mockup-*.spec.ts` | Não | Não | cobertura funcional/mobile existe; baseline visual não foi encontrada | falta spec baseline dedicada ou snapshots versionadas |
| Magazine | `e2e/magazine/magazine-templates-gallery-visual.spec.ts`, `e2e/ui/magazine-ring-visual.spec.ts`, `e2e/flows/magazine-*.spec.ts` | Não | Não | a coleta `--list` da galeria falha por import quebrado | baseline bloqueada por problema estrutural da spec |
| Kit | `e2e/routes/app/kit-builder.spec.ts`, `e2e/kit-builder.spec.ts` | Não | Não | há checagens funcionais e mobile, sem baseline visual versionada | falta baseline desktop/mobile do fluxo principal de montagem |
| CRM | `e2e/flows/supplier-comparison-visual.spec.ts`, `e2e/routes/app/cliente-comparator.spec.ts` | Não | Não | existe spec visual do modal, sem diretório de snapshots | falta primeira baseline commitada |

## Inventário detalhado por fluxo

### 1) Catálogo

Evidências encontradas:

- `e2e/routes/app/produtos.spec.ts` cobre render, busca e mobile
- `e2e/catalog-scroll.spec.ts` contém `toHaveScreenshot('catalog-full-*.png')` e `catalog-skeleton-*.png`
- `e2e/routes/app/novelty-grid-visual.spec.ts` cobre header, grid, scroll, foco, skeleton e paginação em:
  - `mobile-360`
  - `tablet-768`
  - `tablet-1024`
  - `desktop-1440`

Estado:

- a spec visual de novidades existe e é forte, mas o diretório `e2e/routes/app/novelty-grid-visual.spec.ts-snapshots` está ausente
- não foi encontrada baseline versionada do fluxo principal `/produtos`

Conclusão:

- catálogo ainda não tem baseline auditável consolidada; há intenção de cobertura, mas não há artefato versionado suficiente

### 2) Busca

Evidências encontradas:

- `e2e/routes/app/produtos.spec.ts` verifica redução da lista via texto
- `e2e/flows/global-search-comprehensive.spec.ts` existe
- `e2e/catalog/catalog-search-audit.spec.ts` existe

Estado:

- nenhuma baseline visual versionada encontrada para busca global ou busca dentro de catálogo

Conclusão:

- a parte visual do fluxo de busca está sem baseline commitada

### 3) Orçamento

Evidências encontradas:

- diretório existente:
  - `e2e/quotes/quote-item-editor-sheet-header.spec.ts-snapshots/`
- diretórios existentes mas vazios:
  - `e2e/quotes/quote-number-subtitle.spec.ts-snapshots/.gitkeep`
  - `e2e/quotes/quote-reset-stepper-layout.spec.ts-snapshots/.gitkeep`
- exports baseline:
  - `qa/exports/baseline/proposal-10015-26-1.png`
  - `qa/exports/baseline/proposal-10015-26-2.png`
  - `qa/exports/baseline/proposal-complex-99999-26-1.png`
  - `qa/exports/baseline/proposal-complex-99999-26-2.png`
  - `qa/exports/baseline/proposal-minimal-00001-26-1.png`

Specs ligadas:

- `e2e/quotes/quote-item-editor-sheet-header.spec.ts`
  - viewports declaradas: `320`, `375`, `768`, `1024`, `1440`
  - snapshots do header e do body
- `e2e/quotes/customization-size-line-visual.spec.ts`
  - viewports declaradas: `mobile-360`, `tablet-768`
  - diretório de snapshots ainda ausente

PNG versionados e hashes atuais:

- `quote-item-editor-sheet-header-320-chromium-public-linux.png` — `d0ee2b0c4f5ca34ef4baf6dafb49cc93eb20405b3b1e678004f40a4739dfcbe3`
- `quote-item-editor-sheet-header-375-chromium-public-linux.png` — `5219dd2ded29c04a9aca3d723a4287009534414efbf642a8299032fa54b67d8a`
- `quote-item-editor-sheet-header-768-chromium-public-linux.png` — `c4f8708f41e9edddb6bcf2f2f83574fab268cfe770ab1070acba9f2d41004eec`
- `quote-item-editor-sheet-body-320-chromium-public-linux.png` — `e541e159353f6c161ce53d53bc840a3d2ec4f33decb2a583cb26e45cac35a5e0`
- `quote-item-editor-sheet-body-375-chromium-public-linux.png` — `e99f4d3554de94e75ce38da8ae426e95cab06656f26e93b85bcbbbf5483491ac`
- `quote-item-editor-sheet-body-768-chromium-public-linux.png` — `281f04ede323c183d5e4f1d82e7d846f5439ba87dd50a42d4737d5b045d59f6e`

PNG exportados para proposta e hashes atuais:

- `proposal-10015-26-1.png` — `a4b3f3789876219283b400b590ebe2ef91008973c1419ec9b3bdcf5121ee48d3`
- `proposal-10015-26-2.png` — `1a69e7eb5b2230ffd1ab5285b5a2a89d342fa219b4fa2adc6f216b1fc77953c2`
- `proposal-complex-99999-26-1.png` — `eb3d7996cfaf2ca859011c0f818ccd352590eb5a054262deb52a1c007f7fcd78`
- `proposal-complex-99999-26-2.png` — `281b4628192af0218e3956441e574110779af260fea8bccd1f590da1a7dd548c`
- `proposal-minimal-00001-26-1.png` — `1c67c518ff77bd238e8e23ad87331469145be08f8124574699f0bd2597623ca8`

Conclusão:

- orçamento é o fluxo mais avançado em baseline, mas ainda parcial
- as capturas existentes não cobrem toda a matriz desktop/mobile declarada nas specs

### 4) Carrinho

Evidências encontradas:

- spec visual dedicada: `e2e/visual/cart-header-actions.spec.ts`
  - viewports declaradas: `mobile`, `tablet`, `desktop`
- múltiplas specs funcionais em `e2e/carrinhos/*.spec.ts`

Estado:

- não foi encontrado diretório `e2e/visual/cart-header-actions.spec.ts-snapshots`
- não há PNG versionado do fluxo crítico de carrinho

Conclusão:

- o fluxo de carrinho ainda está sem baseline visual commitada

### 5) Estoque

Evidências encontradas:

- `e2e/admin/stock-dashboard-visual.spec.ts`
  - viewports: `desktop`, `tablet`, `mobile`
  - capturas de badge, legenda, drawer e dialog
- `e2e/admin/stock-future-stock-visual.spec.ts`
  - viewports: `xs-320`, `mobile-375`, `mobile-390`, `mobile-414`, `tablet-768`, `tablet-820`, `desktop-1280`, `desktop-1536`
  - DPR: `1x`, `2x`
  - estados OFF e ON para `7d`, `15d`, `30d`
- `e2e/visual/stock-alerts-panel.spec.ts`
  - viewports: desktop/mobile

Validação read-only:

- `npx playwright test --list ...` coletou os casos dessas specs normalmente

Estado:

- não existe:
  - `e2e/admin/stock-dashboard-visual.spec.ts-snapshots`
  - `e2e/admin/stock-future-stock-visual.spec.ts-snapshots`
- portanto há cobertura declarada, mas sem baseline versionada

Conclusão:

- estoque tem a melhor estrutura pronta para captura futura, porém ainda sem artefato commitado

### 6) Mockup

Evidências encontradas:

- `e2e/routes/app/mockup-generator.spec.ts`
- `e2e/flows/mockup-comprehensive.spec.ts`
- `e2e/flows/mockup-generation-ia.spec.ts`
- `e2e/flows/mockup-history-flow.spec.ts`

Estado:

- não foi encontrada baseline visual versionada específica
- também não foi encontrado diretório `*.spec.ts-snapshots` associado ao fluxo principal de mockup

Conclusão:

- há cobertura funcional, mas não baseline visual auditável

### 7) Magazine

Evidências encontradas:

- `e2e/magazine/magazine-templates-gallery-visual.spec.ts`
- `e2e/ui/magazine-ring-visual.spec.ts`
- `e2e/flows/magazine-*.spec.ts`

Validação read-only:

- `npx playwright test --list e2e/magazine/magazine-templates-gallery-visual.spec.ts`
  falhou com:

`Cannot find module '/tmp/promo-gifts-codex-stabilization-20260826/e2e/magazine/fixtures/test-base'`

Estado:

- o diretório `e2e/magazine/magazine-templates-gallery-visual.spec.ts-snapshots` não existe
- a própria coleta da spec da galeria está quebrada por import relativo inválido

Conclusão:

- magazine está bloqueado antes da captura de baseline

### 8) Kit

Evidências encontradas:

- `e2e/routes/app/kit-builder.spec.ts`
- `e2e/kit-builder.spec.ts`
- há checagens mobile e funcionais do fluxo de montagem

Estado:

- não foi encontrada baseline visual versionada específica
- não foi encontrado diretório de snapshots do fluxo crítico de kit

Conclusão:

- o fluxo de kit ainda não tem baseline visual commitada

### 9) CRM

Evidências encontradas:

- `e2e/flows/supplier-comparison-visual.spec.ts`
  - estados declarados:
    - lista
    - empty
    - loading
    - error
- `e2e/routes/app/cliente-comparator.spec.ts`

Validação read-only:

- a spec de supplier comparison foi coletada normalmente no `--list`

Estado:

- `e2e/flows/supplier-comparison-visual.spec.ts-snapshots` não existe

Conclusão:

- CRM possui spec visual candidata boa, mas ainda sem baseline versionada

## Baselines auxiliares existentes fora dos 9 fluxos

Esses artefatos existem no repositório, mas não substituem baseline dos 9 fluxos críticos:

### `e2e/visual/preview-button.spec.ts-snapshots`

PNG e hashes:

- `preview-default-light-chromium-public-linux.png` — `0fbb108e3a8b1a829c971ac17980f89d29a271a72cc52274cc7230070e9eeb10`
- `preview-hover-light-chromium-public-linux.png` — `b1240e249d1450aa7a6ce11fc3362e89e77d5db9c0f48b130067f8711a13bb34`
- `preview-focus-light-chromium-public-linux.png` — `517f88e7ae1cfd25df5aec6c6b764874f4b737934928a850e885e13da02e6450`
- `preview-default-dark-chromium-public-linux.png` — `e8adfa8f7c6571e075fd8dad330ef7d08c9147060913f2c242746166d89db9dd`
- `preview-hover-dark-chromium-public-linux.png` — `cefa93827a0e3217e0fb1b2d301b0202a83144bc5fbce54dbaa21ebb1a552d0e`

### `e2e/optimized-image-visual.spec.ts-snapshots`

Estado:

- há baseline cross-browser e mobile para blur/loading/responsive image
- serve como precedente técnico de baseline multi-projeto, não como cobertura dos fluxos críticos

Hashes atuais:

- `image-loading-blur-chromium-authed-linux.png` — `42218af2417f069c185d26bf9e9c03316b7cb2848875096778f0956bd57f1da0`
- `image-loading-blur-chromium-public-linux.png` — `c54ca8931969395907a56012e8ea71c4246be650e8e1e28edb066e390db982da`
- `image-loading-blur-firefox-authed-linux.png` — `940ae5dc262e054dd244e6bc397dc7951c4f0573e6b391a570d1f30aef2b5f94`
- `image-loading-blur-firefox-public-linux.png` — `940ae5dc262e054dd244e6bc397dc7951c4f0573e6b391a570d1f30aef2b5f94`
- `image-loading-blur-mobile-chrome-linux.png` — `8023e35990e871538a210c7d6ee756700728c22f017864107b916c9c70b176a8`
- `image-loading-blur-mobile-safari-linux.png` — `bccc1e9ecdee0830b0b4772598460b111f7c3965fc3c66b7f37610fc0616d445`
- `image-loading-blur-webkit-authed-linux.png` — `23e75ac04bb4a85f33ca1278f21d8291ec0ff716ddab6b6508ae42b6cb058903`
- `image-loading-blur-webkit-public-linux.png` — `b8b1c3d3115bdb38cc45edbb03f8553148a3f1b49e239c6bb00073bef6851c30`
- `image-responsive-mobile-chromium-authed-linux.png` — `7b9e6b07c73d2170685db6d6b8cfde59162e6ade778e3105be4d5f25c8573eab`
- `image-responsive-mobile-chromium-public-linux.png` — `7b9e6b07c73d2170685db6d6b8cfde59162e6ade778e3105be4d5f25c8573eab`
- `image-responsive-mobile-firefox-authed-linux.png` — `feeb995d3c45795df3b878013d5bcec08ff02cab59c8c1b20d6e8cdc23b6fabc`
- `image-responsive-mobile-firefox-public-linux.png` — `feeb995d3c45795df3b878013d5bcec08ff02cab59c8c1b20d6e8cdc23b6fabc`
- `image-responsive-mobile-mobile-chrome-linux.png` — `7b9e6b07c73d2170685db6d6b8cfde59162e6ade778e3105be4d5f25c8573eab`
- `image-responsive-mobile-mobile-safari-linux.png` — `d8a5216c67eb7ed943982919ac0ee22e8cfe7c50f7d26e6a07653d31aa479310`
- `image-responsive-mobile-webkit-authed-linux.png` — `470ba67d6f5d42ee2e14481d5671c98a06b973de77dcd5ebd0c0625f99bae5b7`
- `image-responsive-mobile-webkit-public-linux.png` — `932a3339c5fda6794233adb3142a67bf9c66599b8afdfe981eb719e476df60e7`

## Validação read-only executada

### 1) Coleta Playwright

Comando executado:

`npx playwright test --list ...`

Resultado:

- os conjuntos de estoque, novidades, reposição, orçamento e CRM foram coletados
- a listagem expandiu para múltiplos projetos do `playwright.config.ts`
- total observado nessa amostra: `1545 tests in 8 files`

Leitura operacional:

- a coleta funciona para a maior parte das specs visuais candidatas
- o repositório já está pronto para inventário, mas não para afirmar baseline versionada dos 9 fluxos

### 2) Falha estrutural encontrada

Na spec de magazine:

- `e2e/magazine/magazine-templates-gallery-visual.spec.ts`

Erro:

- import inválido para `e2e/magazine/fixtures/test-base`

Efeito:

- a própria listagem da spec falha antes de qualquer captura

### 3) Estado do worktree no momento da auditoria

O `git status --short` mostrou worktree já suja por outras frentes. Isso importa porque uma futura captura de baseline sem freeze pode “abençoar” pixels de mudanças concorrentes.

## Lacunas reais

1. Apenas orçamento possui baseline visual versionada claramente utilizável.
2. Catálogo, carrinho, estoque, mockup, magazine, kit e CRM não têm baseline commitada do fluxo crítico principal.
3. Busca não tem baseline visual canônica identificada.
4. Há specs visuais prontas mas sem diretórios/snapshots commitados.
5. Há diretórios de snapshot apenas com `.gitkeep`, sinalizando intenção sem baseline efetiva.
6. Magazine tem bloqueio estrutural de import antes da captura.
7. O worktree atual não está congelado, então qualquer captura agora seria arriscada.

## Procedimento seguro futuro para captura em fixtures/staging

### Pré-condições

1. congelar SHA do branch de captura
2. congelar worktree e pausar merges concorrentes
3. usar base única de dados estáveis
4. decidir explicitamente quais fluxos usam:
   - `public`
   - `authed`
   - `mobile`
5. garantir `E2E_USER_*` apenas em staging/fixture controlado, nunca usando estado volátil de produção

### Ambiente recomendado

- staging dedicado ou ambiente fixtureado
- service workers limpos
- feature flags fixadas por `addInitScript`
- dados anonimizados e reprodutíveis
- storage state gerado no mesmo ambiente

### Ordem segura de captura

1. rodar primeiro `npx playwright test --list <specs>`
   Confirma coleta sem escrever nada.

2. rodar smoke visual de cada fluxo em um projeto único e determinístico
   Recomendação inicial:
   - desktop: `chromium-public`
   - mobile: `mobile-chrome`

3. só depois capturar baseline com `--update-snapshots`
   sempre em lote pequeno por fluxo, nunca tudo de uma vez

4. gerar inventário pós-captura:
   - arquivos criados
   - hashes
   - viewports
   - projeto Playwright
   - dependência de auth

5. revisão humana lado a lado antes de aceitar o diff

### Estratégia por fluxo

- catálogo: capturar `/produtos` desktop + mobile antes de variações de novidades/reposição
- busca: capturar estado vazio, digitando, resultado e zero-result
- orçamento: expandir a baseline atual para builder principal e não só sheet/PDF
- carrinho: header + popover + empty state + selection mode
- estoque: aceitar primeiro dashboard e future-stock button; expandir depois
- mockup: empty, loading, erro, sucesso mínimo
- magazine: corrigir primeiro a coleta da spec
- kit: empty, item adicionado, resumo
- CRM: modal comparison em list/empty/loading/error

## Pontos que exigem `[AUTORIZAÇÃO DESIGN]`

Os itens abaixo não são para executar agora; são pontos de aprovação futura antes de versionar baseline nova ou substituir baseline existente:

- aceitar como “estado canônico” qualquer visual novo de catálogo, busca, carrinho, estoque, mockup, magazine, kit ou CRM
- substituir os PNGs já existentes de orçamento
- expandir baseline de orçamento para novas superfícies que hoje não têm snapshot
- capturar magazine depois de corrigida a spec, porque isso inaugura baseline nova do fluxo
- capturar estados com preferências de acessibilidade, skeletons ou loading como baseline oficial do produto
- aceitar baseline gerada em rota autenticada dependente de fixture/staging em vez de ambiente público

## Recomendação de próxima ação

Antes de qualquer captura visual:

1. fechar o item 002 com a matriz final `fluxo × owner × criticidade × sucesso`
2. congelar o SHA/base de captura
3. corrigir a coleta quebrada de magazine
4. escolher um lote pequeno inaugural:
   - estoque
   - orçamento
   - CRM

Esses três têm melhor custo/benefício porque já possuem specs visuais candidatas maduras.
