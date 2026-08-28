# Fixtures críticas anonimizadas — inventário seguro

Data: 2026-08-26

Escopo desta etapa: inventariar os dados de teste dos 9 fluxos críticos definidos na etapa 2 do plano — catálogo, busca, orçamento, carrinho, estoque, mockup, magazine, kit e CRM — sem alterar fixtures existentes, sem chamar provedores externos e sem copiar dados reais.

## Resumo executivo

- [x] Há um núcleo já reaproveitável de fixtures sintéticas para catálogo, carrinho, estoque, mockup e partes de kit.
- [x] Orçamentos já têm sementes idempotentes, mas ainda dependem de login real, JWT real e escrita em Supabase.
- [x] Magazine e busca ainda não têm um conjunto canônico próprio; hoje dependem de registry/localStorage ou de mocks genéricos por rota.
- [x] CRM ainda está coberto majoritariamente por mocks HTTP e por suítes LIVE opcionais; não existe fixture canônica local para payloads de Bitrix/CRM.
- [x] Há pontos não determinísticos em helpers centrais (`Date.now()`, `Math.random()`, `new Date().toISOString()`), o que impede replay byte-a-byte em parte dos cenários.
- [x] Há risco de acoplamento a ambiente real em seeds E2E e em testes de integração que fixam hosts Supabase fora do projeto canônico.

## Critérios usados

Classificação por ativo:

- Determinístico: mesma entrada gera o mesmo payload/estado observável sem depender do relógio nem de aleatoriedade.
- Anonimizado: nomes, IDs, emails, CNPJs, mídias e textos são evidentemente sintéticos ou neutros.
- Volátil: depende de data/hora atual, `Math.random`, login real, JWT real, dados existentes no banco, localStorage prévio, ou host remoto.
- Seguro para suíte crítica: pode ser usado em regressão sem tocar produção nem depender de dados mutáveis.

## Evidências-base comuns

- A fixture base E2E exige login real para specs autenticados e pode chamar cleanup remoto se as envs existirem: `e2e/fixtures/test-base.ts:64`, `e2e/fixtures/test-base.ts:100`, `e2e/fixtures/test-base.ts:171`.
- O setup de auth grava `storageState` a partir de credenciais reais ou pula a suíte: `e2e/fixtures/auth.setup.ts:17`.
- A política de cleanup remoto usa `E2E_CLEANUP_TOKEN`, `VITE_SUPABASE_URL|SUPABASE_URL` e filtro por prefixo de nome: `e2e/helpers/cleanup-client.ts:31`, `e2e/helpers/cleanup-client.ts:55`, `e2e/helpers/cleanup-client.ts:145`.
- A nomenclatura E2E central ainda é não determinística por timestamp e random: `e2e/fixtures/test-user.ts:76`.
- A fábrica genérica de rotas autenticadas/publicas mocka backend por `page.route`, o que é bom para isolamento, mas não substitui fixtures de domínio: `e2e/routes/_factories.ts:168`.

## Inventário por fluxo

### 1) Catálogo

Ativos encontrados:

- `e2e/routes/app/produtos.spec.ts:11` usa `buildAuthedRouteSuite(...)` com `external-db-bridge`.
- `e2e/routes/app/produtos.spec.ts:21` define `PRODUCT_LIST` sintética inline.
- `e2e/fixtures/quickview-dataset.ts:10` define `FIXTURE_PRODUCT`.
- `e2e/fixtures/quickview-dataset.ts:22` intercepta `external-db-bridge` e devolve sempre o mesmo produto.

Diagnóstico:

- `PRODUCT_LIST` e `FIXTURE_PRODUCT` são anonimizados e semanticamente estáveis.
- `installQuickViewDataset()` é determinística e idempotente no nível de rede.
- O catálogo ainda não tem dataset canônico único: há pelo menos duas fontes sintéticas separadas (`PRODUCT_LIST` e `FIXTURE_PRODUCT`) com formatos diferentes (`data` vs `rows`).
- Parte dos specs de catálogo fora desses arquivos ainda opera sobre ambiente real ou só faz smoke de DOM.

Status:

- Determinístico: parcial
- Anonimizado: sim
- Seguro para suíte crítica: parcial

### 2) Busca

Ativos encontrados:

- `e2e/routes/app/produtos.spec.ts:39` exercita busca sobre `PRODUCT_LIST`.
- `e2e/routes/app/advanced-price-search.spec.ts:1` usa apenas a factory genérica da rota.
- Não foi localizado um fixture file canônico específico para busca textual, facets, paginação e zero-result.

Diagnóstico:

- O fluxo de busca hoje reutiliza mocks de catálogo e asserts superficiais.
- Falta um dataset canônico que cubra:
  - termos colidentes,
  - busca por SKU/nome/categoria,
  - paginação previsível,
  - empty state,
  - ordenação e persistência de filtros.
- O comportamento atual é testável, mas não está consolidado em um ativo reutilizável.

Status:

- Determinístico: parcial
- Anonimizado: sim, onde há mock
- Seguro para suíte crítica: não, ainda incompleto

### 3) Orçamento

Ativos encontrados:

- `e2e/helpers/quotes-status-seed.ts:1` semeia 14 estados canônicos de orçamento.
- `e2e/helpers/discount-approval-seed.ts:1` cria `discount_approval_requests` pendentes de forma idempotente.
- `e2e/helpers/discount-notification-seed.ts:1` reaproveita o seed de aprovação para deep-link.
- `e2e/helpers/e2e-resources.ts:88` cria nomes E2E para quote/collection/favorite/cart-template/custom-kit.
- `e2e/flows/04m-quotes-status-tooltips.spec.ts:33` usa o seed real antes da navegação.

Diagnóstico:

- Os seeds são bem pensados para idempotência lógica:
  - reaproveitam linhas existentes,
  - usam prefixos E2E,
  - tentam limitar cleanup ao próprio escopo.
- Porém ainda dependem de:
  - JWT real no `localStorage`,
  - organização real resolvida por `user_organizations` / `profiles`,
  - escrita real em `quotes` e `discount_approval_requests`,
  - hora corrente e nomes não determinísticos via `e2eName()`.
- Logo, são anonimizados mas não determinísticos nem totalmente seguros para regressão isolada.

Status:

- Determinístico: não
- Anonimizado: sim
- Seguro para suíte crítica: parcial, apenas em staging/ambiente descartável com cleanup garantido

### 4) Carrinho

Ativos encontrados:

- `e2e/helpers/cart-fixture.ts:31` semeia um carrinho autenticado via interceptação de `seller_carts`.
- `e2e/helpers/cart-mock.ts:45` define `makeMockCart()` e itens sintéticos.
- `e2e/helpers/cart-mock.ts:78` intercepta `GET /rest/v1/seller_carts`.
- Vários specs reutilizam `mockSellerCartsAPI` e `makeMockCart`, por exemplo `e2e/ui/cart-delete-confirm.spec.ts:13`.

Diagnóstico:

- O payload é sintético e anonimizado.
- A estratégia de mock de rede evita escrita real no banco.
- Há não determinismo em timestamps gerados por `Date.now()` dentro de `ts()` e `makeMockCart()`.
- Mesmo com esse ruído temporal, o conjunto é o mais próximo de um fixture canônico de domínio já pronto.

Status:

- Determinístico: parcial
- Anonimizado: sim
- Seguro para suíte crítica: sim, com ajuste futuro de relógio fixo

### 5) Estoque

Ativos encontrados:

- `e2e/fixtures/stock-rupture-fixture.ts:56` define `FX_PRODUCTS`, `FX_VARIANTS` e `FX_SUPPLIER_SOURCES`.
- `e2e/fixtures/stock-rupture-fixture.ts:96` intercepta os endpoints reais consumidos por `stockFetcher.ts`.
- `e2e/routes/app/stock-rupture-horizon-missing-fields.spec.ts:21` instala a fixture antes do login/navegação.

Diagnóstico:

- É o fixture mais robusto do lote:
  - dados sintéticos,
  - datas fixas (`NOW = '2026-06-17T00:00:00Z'`),
  - cenários explícitos healthy / at-risk / missing-fields,
  - interceptação de todos os endpoints de leitura necessários.
- A fixture é determinística, anonimizada e idempotente na camada HTTP.
- O gap está na cobertura: nem todos os specs de `/estoque` usam esse conjunto; parte ainda depende do ambiente real.

Status:

- Determinístico: sim
- Anonimizado: sim
- Seguro para suíte crítica: sim

### 6) Mockup

Ativos encontrados:

- `e2e/routes/app/mockup-generator.spec.ts:10` usa a factory genérica com `external-db-bridge`.
- `e2e/routes/app/mockup-generator.spec.ts:20` mocka `external-db-bridge`.
- `e2e/routes/app/mockup-generator.spec.ts:34` mocka `generate-mockup` com 500.
- `e2e/routes/app/mockup-generator.spec.ts:43` mocka `generate-mockup` com 504.
- `tests/p0/_mocks.ts:68` fornece `mockEdgeFunctionFetch(...)` e stubs de integrações externas.

Diagnóstico:

- Há boa cobertura de resiliência da edge/mutação, mas não há um fixture canônico para:
  - imagem-base,
  - logo do cliente,
  - sessão de mockup histórica,
  - resposta feliz padronizada da IA.
- O fluxo atual é fortemente orientado a “não crasha” e estados vazios.
- O histórico de mockup usa intercept manual de `/rest/v1/mockup_sessions`, ainda sem fábrica compartilhada.

Status:

- Determinístico: parcial
- Anonimizado: sim
- Seguro para suíte crítica: parcial

### 7) Magazine

Ativos encontrados:

- `e2e/magazine/magazine-templates-gallery.spec.ts:24` usa `GALLERY_PATH = '/magazine/templates'`.
- `e2e/magazine/magazine-templates-gallery.spec.ts:27` fixa `KNOWN_TEMPLATE_ID = 'editorial-vogue'`.
- O fluxo usa login real e persiste favorito em `localStorage`, limpando manualmente no fim do teste.

Diagnóstico:

- O fluxo de templates depende principalmente de registry de frontend e estado local, não de fixture de dados de backend.
- `KNOWN_TEMPLATE_ID` e `SAMPLE_MAG_ID` são sintéticos e estáveis.
- Ainda falta fixture canônica para:
  - lista de magazines,
  - editor com magazine existente,
  - publicação pública,
  - templates aplicados com conteúdo sintético previsível.
- O cleanup de `localStorage` existe, mas é ad hoc por spec.

Status:

- Determinístico: parcial
- Anonimizado: sim
- Seguro para suíte crítica: parcial

### 8) Kit

Ativos encontrados:

- `e2e/routes/app/kit-builder.spec.ts:10` usa a factory genérica da rota.
- `e2e/routes/app/kit-builder.spec.ts:20` define `SAMPLE_PRODUCTS` inline.
- O fluxo usa mocks de `external-db-bridge` e de `kit-ai-builder`.
- `tests/fixtures/personalization-payloads.ts:1` já traz payloads sintéticos úteis para personalização/preço.

Diagnóstico:

- O kit já tem matéria-prima boa:
  - produtos sintéticos,
  - payloads de personalização PT/EN/híbridos,
  - mocks de falha da IA.
- Mas falta consolidar tudo em um kit fixture único que represente:
  - box,
  - itens,
  - personalizações,
  - cálculo esperado,
  - persistência/autosave.
- Hoje o fluxo fica espalhado entre rota E2E, testes unitários e fixtures de personalização.

Status:

- Determinístico: parcial
- Anonimizado: sim
- Seguro para suíte crítica: parcial

### 9) CRM

Ativos encontrados:

- `tests/p0/_mocks.ts:101` e `:108` definem `crmDbBridgeOffline` e `crmDbBridgeStale`.
- `[LEGACY_INFORMATIVO] tests/edge-functions/integration/data-ops.test.ts:8` fixa `BASE = "https://nmojwpihnslkssljowjh.supabase.co/functions/v1"`.
- `[LEGACY_INFORMATIVO] tests/edge-functions/integration/webhooks.test.ts:8` fixa o mesmo host remoto e exercita `webhook-inbound`/`webhook-dispatcher`.
- `tests/edge-functions/live/descriptors.ts:63` cobre `receive-crm-callback`, `webhook-inbound`, `simulation-orchestrator`, `visual-search` etc. em modo LIVE opcional.

Diagnóstico:

- O domínio CRM está coberto mais por stubs HTTP e contratos de borda do que por fixtures de negócio.
- Há problema estrutural: várias suítes de integração usam um host Supabase fixo fora do projeto canônico do repo.
- Os payloads são sintéticos e geralmente anonimizados, mas:
  - usam `new Date().toISOString()` em envelopes,
  - não estão centralizados,
  - não têm reset/cleanup porque não persistem estado local,
  - podem induzir falsa sensação de integração real, já que o `fetch` é todo mockado.

Status:

- Determinístico: parcial
- Anonimizado: sim
- Seguro para suíte crítica: parcial, mas com dívida de SSOT/host

## Achados transversais

### A. Já está bem encaminhado

- [x] Estoque: fixture de ruptura é praticamente canônica.
- [x] Carrinho: mock de `seller_carts` é reutilizável e isolado do banco.
- [x] Orçamento: seeds reais já foram desenhados com preocupação de idempotência.
- [x] Personalização/kit: payloads sintéticos compartilhados já existem.
- [x] Cleanup remoto já tenta filtrar por prefixo de nome, reduzindo blast radius.

### B. Gaps reais

- [ ] Falta um catálogo canônico compartilhado entre catálogo, busca, quickview e kit.
- [ ] Falta uma convenção única de tempo fixo; muitos ativos usam `Date.now()` ou `new Date()`.
- [ ] Falta uma convenção única de IDs sintéticos e nomes determinísticos.
- [ ] Falta uma biblioteca canônica de envelopes para CRM/Bitrix/webhooks/simulation-orchestrator.
- [ ] Falta separar claramente:
  - fixtures puramente locais,
  - seeds que escrevem em staging,
  - suítes LIVE opcionais.
- [ ] Magazine ainda não tem fixture de domínio além do registry/localStorage.
- [ ] Busca ainda depende de mocks inline e não de dataset semântico curado.

### C. Chamadas a produção ou dados voláteis

Risco alto:

- `e2e/helpers/quotes-status-seed.ts:18` usa `https://doufsxqlfjyuvxuezpln.supabase.co` por default e escreve em `quotes` se JWT/anon key existirem.
- `e2e/helpers/discount-approval-seed.ts:28` escreve em `discount_approval_requests`.
- `e2e/helpers/cleanup-client.ts:96` chama a edge `e2e-cleanup` com token real quando configurada.

Risco médio:

- `e2e/fixtures/auth.setup.ts:17` depende de login real para toda a suíte autenticada.
- `e2e/fixtures/test-user.ts:76` gera nomes com timestamp + random, dificultando replay.
- `e2e/helpers/cart-mock.ts:40` e correlatos carimbam timestamps com a hora atual.

Risco de drift de ambiente/SSOT:

- `tests/edge-functions/integration/data-ops.test.ts:8`
- `tests/edge-functions/integration/webhooks.test.ts:8`
- `tests/regression/freight-quest-regression-suite.test.ts:24`

Esses testes usam `[LEGACY_INFORMATIVO] https://nmojwpihnslkssljowjh.supabase.co/functions/v1` como BASE, divergente do SSOT do projeto.

## Conjunto canônico proposto

Objetivo: um pacote de fixtures sintéticas, reaproveitáveis e legíveis, sem dados reais e com duas camadas bem separadas.

### Camada 1 — fixtures puramente locais, obrigatórias para regressão

- [ ] `catalog.fixture`
  - 12 produtos sintéticos
  - 3 categorias
  - termos de busca colidentes
  - 2 produtos sem estoque
  - 2 produtos com preço promocional
  - formato compatível com catálogo, quickview e kit

- [ ] `search.fixture`
  - subconjuntos esperados por termo/SKU/categoria
  - paginação previsível
  - zero-result

- [ ] `cart.fixture`
  - evoluir o atual `cart-mock` para relógio fixo
  - 3 carrinhos base: vazio, 3 itens, 10 itens
  - mutações PATCH/DELETE/duplicate simuladas

- [ ] `stock.fixture`
  - promover a atual `stock-rupture-fixture` a fonte única
  - incluir cenários healthy / risk / missing / zero-stock

- [ ] `mockup.fixture`
  - histórico vazio
  - histórico com 2 sessões
  - resposta feliz da IA
  - erro 500 / timeout 504
  - mídia sintética inline ou URL neutra estável

- [ ] `magazine.fixture`
  - registry snapshot local
  - magazine draft sintética
  - template aplicado com conteúdo previsível
  - favoritos via helper padronizado de storage

- [ ] `kit.fixture`
  - catálogo de itens compatível com `catalog.fixture`
  - box + 3 combinações de kit
  - payloads de personalização reutilizando `tests/fixtures/personalization-payloads.ts`
  - totais esperados

- [ ] `crm-webhook.fixture`
  - envelopes sintéticos para CRM, Bitrix, webhook inbound, dispatcher e simulation-orchestrator
  - happy path, auth fail, schema fail, idempotent replay

### Camada 2 — seeds controladas de staging, opcionais

Só para cenários que realmente exigem banco:

- [ ] `quote.seed`
  - usar IDs/nomes determinísticos quando possível
  - manter prefixo `[E2E:<spec>]`
  - exigir cleanup escopado obrigatório

- [ ] `discount-approval.seed`
  - manter idempotência atual
  - mover relógio/nome para strategy determinística quando o teste não depender de “recentes”

- [ ] `auth-session.seed`
  - storageState mockado por padrão
  - login real reservado a smoke/LIVE

## Política proposta de reset, cleanup e idempotência

### Reset local

- [ ] limpar `localStorage` e `sessionStorage` por helper compartilhado, não inline por spec
- [ ] limpar intercepts `page.route`/`page.unroute` por fixture única
- [ ] congelar relógio nos fixtures que validam timestamps

### Cleanup remoto

- [ ] manter filtro por prefixo E2E como obrigatório
- [ ] nunca permitir purge sem `nameFilterPrefix` em suíte crítica
- [ ] separar token/base URL de cleanup de qualquer ambiente de produção
- [ ] falha de cleanup deve degradar a suíte com diagnóstico, não apagar escopo mais amplo

### Idempotência

- [ ] preferir chaves naturais sintéticas estáveis (`fx-*`, `std-*`, `e2e-*`)
- [ ] quando precisar de nome humano, derivar de contador/slug fixo em vez de `Date.now()+Math.random()`
- [ ] para seeds em banco, checar existência por tuple funcional antes de inserir

## Ordem recomendada de consolidação

1. Promover `stock-rupture-fixture` a fixture canônica de estoque.
2. Congelar tempo em `cart-mock` e `test-user`.
3. Unificar `PRODUCT_LIST`, `FIXTURE_PRODUCT` e `SAMPLE_PRODUCTS` em um catálogo sintético único.
4. Extrair uma fixture canônica de busca em cima desse catálogo.
5. Criar envelopes sintéticos canônicos para CRM/Bitrix/webhooks.
6. Separar explicitamente `tests/edge-functions/integration` de `tests/edge-functions/live`.
7. Remover dependência padrão de login real nos specs críticos que podem rodar 100% mockados.
8. Padronizar helper de storage/reset para magazine, favoritos, quotes drafts e flags.
9. Só depois consolidar seeds de orçamento e aprovação para um modo staging-controlado.

## Parecer final

Hoje o repositório já tem material suficiente para montar um conjunto canônico de fixtures críticas anonimizadas sem reinventar tudo. O melhor ponto de partida é reaproveitar o que já está bom:

- estoque como referência de fixture determinística,
- carrinho como referência de isolamento HTTP,
- orçamento como referência de idempotência funcional,
- personalização como referência de payload sintético compartilhado.

O principal problema restante não é falta total de fixtures; é falta de consolidação e de fronteira clara entre:

- mock local determinístico,
- seed em staging,
- teste LIVE com host/credencial real.

Sem essa separação, os fluxos críticos continuam sujeitos a flake, drift de ambiente e escrita desnecessária em banco.
