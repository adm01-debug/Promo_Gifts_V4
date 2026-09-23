# Kit Maker — Plano de melhorias em 100 etapas

Data: 22/09/2026. Base: `main` @ `4469f27` (PR #1860 mergeado e publicado em `/montar-kit`). Projeto canônico: `doufsxqlfjyuvxuezpln`.

Origem: auditoria de gaps desta data comparando as 8 referências visuais (R1–R8) e a produção com o código de `src/components/kit-builder`, `src/components/kit-library`, `src/pages/kit-builder`, `src/hooks/kit-builder`, `src/lib/kit-builder` e `supabase/functions/kit-ai-builder`.

## 0. Como ler e executar

Cada etapa traz: **Objetivo · Onde · Como · Aceite · Prova · Depende de · Esforço**. Esforço: `P` = até ~100 linhas / 1 sessão de agente; `M` = 1–2 sessões; `G` = mais de 2 sessões ou toca banco/serviço externo. Etapas marcadas `[PO]` exigem decisão de negócio antes de codificar (ver tabela de decisões).

### Invariantes (não negociáveis)

1. Uma tela por PR; branch `claude/<tipo>-<slug>` a partir de `main` atualizado; commit em PT-BR com prefixo; squash-merge só com CI verde e sem conflito.
2. Diff mínimo: componentes existentes são estendidos, não reescritos. Nada de renomear arquivo ou mover pasta.
3. Tema atual preservado: tokens/cores/variants do projeto; nenhuma cor copiada dos mockups.
4. Sem DDL nem alteração de dado em produção sem `APROVADO` explícito. DDL entra como migration forward-only e a PR fica aberta.
5. Dado ilustrativo dos mockups nunca vira seed. Badge, contador ou selo só existe se tem regra de dado por trás.
6. Nada de "sucesso" sem prova: cada PR cita o comando/teste rodado; deploy conferido em `/montar-kit` após o merge.
7. Sub-etapa que descobre outro bug: registra em "Próximos passos", não conserta na mesma PR.

### Estado dos dados hoje (consultado em 22/09)

| Dado | Valor | Impacto |
| --- | --- | --- |
| Embalagens ativas (`product_type='packaging'`) | 14 | catálogo de caixas pequeno; filtros precisam de contagem |
| Embalagens com medidas internas completas | 13 de 14 | 1 caixa nunca é "compatível por dados" |
| Embalagens com `packaging_finish` | 0 de 14 | filtro Acabamento vazio |
| Coluna de fechamento | não existe | filtro/prévia de Fechamento impossível sem DDL |
| Produtos ativos | 7.651 | grade precisa de virtualização |
| Produtos com peso | 7.014 (637 sem) | frete "peso desconhecido" precisa de regra |
| `kit_templates` ativos | 0 | destaques e "Sugeridos" no fallback |
| `custom_kits` | 3 | biblioteca sem volume real para validar |

### Decisões do PO (bloqueiam as etapas marcadas)

| ID | Decisão | Recomendação do tech lead | Etapas |
| --- | --- | --- | --- |
| D1 | Fechamento da embalagem: nova coluna `packaging_closure` (DDL) ou derivar de nome/tag | DDL forward-only `text` + backfill das 14 caixas; custo zero, risco baixo | 010, 043, 046 |
| D2 | Valores de acabamento para as 14 embalagens | PO/comercial preenche via admin; sem valor, o filtro fica oculto | 009, 043 |
| D3 | Curadoria de 6 templates de kit (nome, itens, caixa, etiqueta) | PO define; cadastro via `/admin/kit-templates` | 012, 074, 035 |
| D4 | Frete real (Frenet ou Melhor Envio via edge function, custo por cotação) ou manter estimativa | Melhor Envio via edge function com cache 24 h por CEP+peso; estimativa fica como fallback | 067 |
| D5 | PDF server-side (custo) ou manter impressão do navegador | Manter `window.print()` com folha de estilo dedicada | 069 |
| D6 | Fonte dos badges comerciais (Mais usada, Econômica, Sustentável, Premium) | Regra por dado: uso em `custom_kits`/orçamentos 90 dias, preço relativo, material/tag; sem dado, sem badge | 004, 033 |

### Lotes de PR sugeridos

| Lote | Fases | PRs | Merge |
| --- | --- | --- | --- |
| A | 1 Fundamentos | 3 | autônomo (front/testes) |
| B | 2 Dados e catálogo | 2–3 | **PO** (DDL/dado) |
| C | 3 Itens | 3 | autônomo |
| D | 4 Caixas compatíveis + 5 Escolha da caixa | 3 | autônomo |
| E | 6 Personalização | 2 | autônomo (edge function `generate-mockup` só recebe payload já suportado) |
| F | 7 Revisão | 3 | autônomo, exceto 067 (frete) |
| G | 8 Biblioteca + 9 IA | 3 | autônomo; 079 (edge function) deploy conferido |
| H | 10 QA e release | 2 | autônomo |

---

## Fase 1 — Fundamentos (KM3-001 a 008)

### KM3-001 — Congelar as referências no repositório
- Objetivo: cada tela alvo rastreável por arquivo, não por memória de chat.
- Onde: `docs/references/kit-maker/R1-landing.png` … `R8-ia.png` + `docs/references/kit-maker/README.md`.
- Como: salvar os 8 mockups com o nome da tela; README com tabela ref → tela → componentes atuais → etapas deste plano.
- Aceite: 8 arquivos + README; nenhuma referência a "imagem 3".
- Prova: `ls docs/references/kit-maker` na PR.
- Depende de: —. Esforço: P.

### KM3-002 — Mapa componente → tela e decisão de reuso
- Objetivo: evitar componente novo onde um existente serve.
- Onde: `docs/references/kit-maker/COMPONENT_MAP.md`.
- Como: tabela por tela listando componente atual, gap, ação (`estender` | `novo` | `manter`). Regra: `novo` só quando o layout muda de eixo (card horizontal → vertical, select → chips).
- Aceite: todas as 8 telas mapeadas; cada `novo` justificado em uma linha.
- Prova: revisão do arquivo na PR.
- Depende de: 001. Esforço: P.

### KM3-003 — Primitivas compartilhadas do módulo
- Objetivo: chips, badge de duas famílias, barra de ocupação e stat card usados igual em todas as telas.
- Onde: `src/components/kit-builder/primitives/` (`KitChips.tsx`, `KitBadge.tsx`, `OccupancyBar.tsx`, `KitStatCard.tsx`) + `index.ts`.
- Como: composição sobre `ui/badge`, `ui/toggle-group`, `ui/progress`; `KitBadge` com `kind: 'compatibility' | 'commercial'`; `OccupancyBar` recebe `percent` e `status` (`ok`/`warn`/`over`) e reaproveita o cálculo de `KitVisualPreview.tsx:25-27`.
- Aceite: nenhuma cor hardcoded; props tipadas; Storybook não existe, então cada primitiva tem teste de render em `tests/components/kit-builder/primitives.test.tsx`.
- Prova: `npx vitest run tests/components/kit-builder/primitives.test.tsx`.
- Depende de: 002. Esforço: M.

### KM3-004 — Contrato de badges comerciais por dado `[PO D6]`
- Objetivo: "Mais usada", "Econômica", "Sustentável", "Premium" só aparecem com regra verificável.
- Onde: `src/lib/kit-builder/commercial-badges.ts` + tipos em `src/lib/kit-builder/types.ts`.
- Como: função pura `deriveCommercialBadges(box | item, context)` com regras: uso ≥ N nos últimos 90 dias (`custom_kits.snapshot`/orçamentos) → Mais usada; menor preço do conjunto compatível → Econômica; material/tag reciclado → Sustentável; ≥ P75 de preço → Premium. Sem contexto → `[]`.
- Aceite: testes de tabela cobrindo cada regra e o caso "sem dado".
- Prova: `tests/lib/kit-commercial-badges.test.ts`.
- Depende de: D6. Esforço: M.

### KM3-005 — Selo de fluxo persistido
- Objetivo: usuário sempre sabe se está em "Fluxo 1 · Começar pelos itens" ou "Fluxo 2 · Começar pela caixa".
- Onde: `KitBuilderHeader.tsx`, `WizardSteps.tsx`, `src/lib/kit-builder/persistence.ts`.
- Como: `flow` já existe em `KitBuilderState` (`types.ts:214-220`); garantir que entra no snapshot (versão 1 → adicionar campo opcional sem bump) e renderizar `KitBadge` no header.
- Aceite: recarregar um rascunho restaura o mesmo fluxo; selo visível nos 4 passos.
- Prova: teste em `tests/lib/kit-builder-persistence.test.ts` (round-trip do `flow`).
- Depende de: 003. Esforço: P.

### KM3-006 — Fixtures determinísticas alinhadas ao catálogo real
- Objetivo: testes de UI reproduzem 14 caixas (13 com medidas), produtos com/sem peso, estoque zero/nulo/positivo.
- Onde: `tests/fixtures/kit-maker/` (`boxes.ts`, `items.ts`, `stock.ts`, `templates.ts`).
- Como: fixtures tipadas a partir de `KitBox`/`KitItem`; `mock-data.ts` passa a importar daqui (sem mudar comportamento de produção).
- Aceite: todos os testes do módulo continuam verdes usando as fixtures.
- Prova: `npx vitest run tests/components/kit-builder tests/lib/kit tests/hooks/useKit`.
- Depende de: —. Esforço: M.

### KM3-007 — Usuário de teste e E2E autenticado base
- Objetivo: destravar a pendência 1/3/4 do relatório de 12/09 (fluxos com JWT real).
- Onde: `e2e/auth/`, `e2e/routes/app/kit-builder.spec.ts`, secrets do CI.
- Como: usuário `kitmaker.e2e@…` com papel supervisor, dados descartáveis; `storageState` salvo no setup; spec mínimo abre `/montar-kit` autenticado.
- Aceite: spec passa no CI com o secret; sem credencial, spec é `skip` com motivo.
- Prova: run do workflow com o job verde.
- Depende de: credencial criada pelo PO/TI. Esforço: M.

### KM3-008 — Baselines visuais das 8 superfícies
- Objetivo: cada PR de tela compara antes/depois em 1440, 1024 e 390.
- Onde: `e2e/visual/kit-maker.spec.ts` + `e2e/visual/__screenshots__/`.
- Como: Playwright `toHaveScreenshot` com máscara em preços/datas; 8 superfícies × 3 viewports = 24 baselines geradas a partir de `main`.
- Aceite: job visual roda em PR e falha com diff > 0,2 %.
- Prova: primeiro run gera baselines; segundo run verde sem mudanças.
- Depende de: 007. Esforço: M.

## Fase 2 — Dados e catálogo (KM3-009 a 016)

### KM3-009 — Preencher acabamento das 14 embalagens `[PO D2]`
- Objetivo: filtro Acabamento deixa de estar vazio.
- Onde: `products.packaging_finish` (dado), tela admin de produto.
- Como: PO entrega tabela SKU → acabamento; aplicação via `UPDATE` único em transação, com `SELECT` de conferência antes/depois anexado à PR.
- Aceite: 14/14 com valor; valores num conjunto fechado (`fosco`, `brilho`, `texturizado`, `personalizavel`).
- Prova: `select packaging_finish, count(*) from products where product_type='packaging' group by 1`.
- Depende de: D2. Esforço: P (dado).

### KM3-010 — Fechamento da embalagem `[PO D1]`
- Objetivo: prévia e filtro de Fechamento com dado canônico.
- Onde: `supabase/migrations/<ts>_packaging_closure_forward_only.sql`, `src/integrations/supabase/types.ts`, `useKitBuilderTransformers.ts`.
- Como: coluna `packaging_closure text null` + check em conjunto fechado (`ima`, `encaixe`, `fita`, `magnetico`); backfill das 14; transformer mapeia para `KitBox.closure`.
- Aceite: migration aplicada apenas após `APROVADO`; tipo regenerado; filtro oculto enquanto todos forem nulos.
- Prova: teste de contrato em `tests/contracts/`; `select packaging_closure, count(*) …`.
- Depende de: D1. Esforço: M.

### KM3-011 — Corrigir a embalagem sem medida interna
- Objetivo: 14/14 caixas elegíveis para "compatível por dados".
- Onde: dado da caixa faltante (identificar por `select id, sku from products where product_type='packaging' and is_active and (internal_width_cm is null or …)`).
- Como: PO informa medida; `UPDATE` único.
- Aceite: consulta de completude retorna 14.
- Prova: mesma consulta.
- Depende de: dado do PO. Esforço: P.

### KM3-012 — Curadoria e cadastro de templates `[PO D3]`
- Objetivo: "Kits em destaque" e "Sugeridos" saem do fallback.
- Onde: `/admin/kit-templates` (`KitTemplatesAdminPage.tsx`), tabela `kit_templates`.
- Como: PO entrega 6 kits (nome, itens+qtd, caixa, etiqueta, capa); cadastro pela UI admin; `is_active=true`.
- Aceite: landing mostra templates reais; aba Sugeridos populada.
- Prova: `select count(*) from kit_templates where is_active` = 6; screenshot da landing.
- Depende de: D3. Esforço: P (dado).

### KM3-013 — Cobertura de áreas de impressão
- Objetivo: saber para quais produtos a "Área de aplicação" (etapa 050) terá opções reais.
- Onde: `v_kit_component_print_areas` (leitura via `src/lib/external-db/rest-native.ts`).
- Como: relatório SQL: produtos ativos com ≥ 1 área × total; top 50 mais usados sem área listados para o PO.
- Aceite: número em `docs/audits/KIT_MAKER_PRINT_AREAS_2026-09.md`.
- Prova: consulta anexada.
- Depende de: —. Esforço: P.

### KM3-014 — Estoque agregado na projeção do catálogo de itens
- Objetivo: card do item mostra estoque sem chamada extra por card.
- Onde: `useKitBuilderQueries.ts`, `useKitBuilderTransformers.ts`, `types.ts` (`KitItem.stock?: number | null`).
- Como: reaproveitar a fonte usada por `useKitStockValidation`/`evaluateKitStock`; distinguir `null` (desconhecido) de `0`.
- Aceite: `KitItem.stock` presente na projeção; nenhum N+1.
- Prova: teste em `tests/hooks/useKitBuilderTransformers.test.ts` (nulo ≠ zero).
- Depende de: —. Esforço: M.

### KM3-015 — Regra de peso desconhecido
- Objetivo: 637 produtos sem peso não quebram nem inflam a estimativa.
- Onde: `FreightEstimator.tsx`, `src/lib/kit-builder/price-calculator.ts` (ou util de peso).
- Como: peso desconhecido → estimativa rotulada "peso parcial (N itens sem peso)"; nunca assume zero.
- Aceite: kit com item sem peso exibe o aviso e o total só dos itens conhecidos.
- Prova: `tests/components/kit-builder/FreightEstimator.test.tsx` novo caso.
- Depende de: —. Esforço: P.

### KM3-016 — Regenerar `types.ts` com acesso administrativo
- Objetivo: fechar a pendência 5 do relatório de 12/09 antes de tocar em DDL.
- Onde: `src/integrations/supabase/types.ts`, salvaguarda de exports já existente (PR #1876).
- Como: `supabase gen types` com token do projeto canônico; diff revisado; CI de perda de coluna deve passar.
- Aceite: zero perda de coluna detectada; `tsc` verde.
- Prova: workflow verde + `npx tsc --noEmit`.
- Depende de: token admin. Esforço: P.

## Fase 3 — Passo Itens (KM3-017 a 030)

### KM3-017 — Novo card vertical de produto
- Objetivo: card com foto grande, badge, favorito, atributos, estoque, preço e "Adicionar" (R5).
- Onde: `src/components/kit-builder/KitProductCard.tsx` (novo, decisão de 002); `ItemSelector.tsx` passa a usá-lo na grade; `ItemCard.tsx` continua para a lista compacta (modo Lista).
- Como: `aspect-[4/3]` para a foto com fallback `Package`; slots para badge (003), favorito (020), specs (018), estoque (019).
- Aceite: 3 colunas em 1440, 2 em 1024, 1 em 390; foco visível por teclado.
- Prova: `tests/components/kit-builder/KitProductCard.test.tsx` + baseline 008.
- Depende de: 003, 006. Esforço: M.

### KM3-018 — Três atributos por produto
- Objetivo: linha "500 ml · Aço inox · Isolamento térmico".
- Onde: `useKitBuilderTransformers.ts` (`KitItem.specs: string[]`).
- Como: derivar de capacidade/material/feature já presentes na projeção (`material`, dimensões, atributos); máximo 3, sem repetir o nome.
- Aceite: produto sem atributos não mostra linha vazia.
- Prova: teste de transformer com 3 cenários.
- Depende de: 017. Esforço: P.

### KM3-019 — Estoque no card
- Objetivo: "Em estoque (542)" / "Estoque desconhecido" / "Sem estoque" no card.
- Onde: `KitProductCard.tsx`, `ItemCard.tsx`.
- Como: usa `KitItem.stock` (014); estados carregando/desconhecido/zero/positivo com o mesmo vocabulário de `KitCompositionCard.tsx:127`.
- Aceite: nunca mostra "0" quando o dado é nulo.
- Prova: teste com os 4 estados.
- Depende de: 014, 017. Esforço: P.

### KM3-020 — Favoritar produto no builder
- Objetivo: coração no card reaproveita favoritos do catálogo.
- Onde: `src/hooks/favorites/` (existente), `KitProductCard.tsx`.
- Como: mesmo hook do catálogo; otimista com rollback em erro; sem tabela nova.
- Aceite: favoritar no builder reflete em `/favoritos` e vice-versa.
- Prova: teste de hook + E2E curto (007).
- Depende de: 017. Esforço: P.

### KM3-021 — Chips de categoria com contagem
- Objetivo: "Todos · Drinkwares (58) · Escritório (120) …" substituem o select.
- Onde: `ItemSelector.tsx`, primitiva `KitChips` (003).
- Como: categorias derivadas do catálogo completo (cache-base de R15), contagem do total não filtrado; em `< 768 px` mantém o select.
- Aceite: chip ativo = filtro aplicado; contagem não muda ao filtrar por preço.
- Prova: `tests/components/kit-builder/ItemSelector.filters.test.tsx` estendido.
- Depende de: 003. Esforço: P.

### KM3-022 — Contador e grade em altura plena com virtualização
- Objetivo: "8 de 342 produtos"; grade ocupa a área útil; 7.651 produtos sem travar.
- Onde: `ItemSelector.tsx`.
- Como: remover `ScrollArea h-[50vh]`; `@tanstack/react-virtual` (já instalado) sobre a grade; contador = visíveis/total após filtros.
- Aceite: scroll fluido com o catálogo inteiro (`npm run build` + teste manual autenticado); contador correto com busca.
- Prova: teste de contador; baseline 1440.
- Depende de: 017. Esforço: M.

### KM3-023 — Alternância Grid / Lista
- Objetivo: mesma alternância da Biblioteca no passo Itens.
- Onde: `ItemSelector.tsx`; preferência em `localStorage` (`kit-maker:items-view`).
- Como: Grid usa `KitProductCard`, Lista usa `ItemCard`.
- Aceite: preferência persiste entre sessões.
- Prova: teste de alternância.
- Depende de: 017, 022. Esforço: P.

### KM3-024 — Ordenação "Mais relevantes"
- Objetivo: opção padrão que prioriza compatível > sugerido > mais vendido > nome.
- Onde: `useKitBuilderPageState.ts` (filtros), `ItemSelector.tsx`.
- Como: comparador puro em `src/lib/kit-builder/item-sort.ts`; "sugerido" vem de `KitSmartSuggestions`.
- Aceite: com caixa selecionada, itens que cabem vêm primeiro.
- Prova: `tests/lib/kit-item-sort.test.ts`.
- Depende de: —. Esforço: P.

### KM3-025 — Botão "Filtros" em painel lateral
- Objetivo: material, preço, personalização e medidas fora da barra principal.
- Onde: `ItemSelector.tsx` + `ui/sheet`.
- Como: mover selects de material/preço para o sheet; contador de filtros ativos no botão; "Limpar filtros".
- Aceite: R10 preservado (controles não somem com uma categoria).
- Prova: teste de acessibilidade existente + novo caso.
- Depende de: 021. Esforço: P.

### KM3-026 — Cabeçalho do painel "Seu kit"
- Objetivo: colagem de até 3 imagens + "N itens selecionados".
- Onde: `ItemSelector.tsx` (sidebar), novo `KitCollage.tsx` reutilizável pela IA (081).
- Como: grid 2×2 com as primeiras imagens; fallback ícone.
- Aceite: atualiza ao adicionar/remover.
- Prova: teste de render com 0, 1 e 4 itens.
- Depende de: 003. Esforço: P.

### KM3-027 — Quantidade por kit e subtotal no painel
- Objetivo: stepper global "Quantidade por kit" e subtotal coerente com a composição efetiva (não com o mockup).
- Onde: `ItemSelector.tsx`, `SelectedItemsBadges.tsx`, `price-calculator.ts`.
- Como: stepper aplica em todas as linhas; linhas mantêm ajuste individual; subtotal = Σ qtd × preço.
- Aceite: subtotal bate com `calculateTotalKitPrice` sem caixa/personalização.
- Prova: `tests/lib/kit-builder-price.test.ts` caso novo.
- Depende de: —. Esforço: P.

### KM3-028 — Próximo passo e ocupação no painel
- Objetivo: aviso "A caixa ideal será recomendada após a composição", card "Próximo passo → Ver caixas compatíveis", "Estimativa de ocupação: calculada após a escolha da caixa".
- Onde: `ItemSelector.tsx`, `KitBuilderPage.tsx` (`actions.nextStep`).
- Como: CTA chama `nextStep` respeitando `canProceed`; ocupação mostra `OccupancyBar` quando há caixa, texto neutro quando não há.
- Aceite: CTA desabilitado com 0 itens; habilitado com ≥ 1.
- Prova: `tests/hooks/useKitBuilder-flow.test.tsx` caso novo.
- Depende de: 003. Esforço: P.

### KM3-029 — "Limpar tudo" e dica de autosave
- Objetivo: limpar composição com confirmação; rodapé "Você pode salvar sua composição a qualquer momento".
- Onde: `ItemSelector.tsx`, `useKitBuilder.ts` (`clearItems`), `ui/alert-dialog`.
- Como: ação passa pelo undo/redo (`useKitUndoRedo`) para ser reversível.
- Aceite: Ctrl+Z desfaz o "limpar tudo".
- Prova: teste de hook.
- Depende de: —. Esforço: P.

### KM3-030 — Fechamento do passo Itens
- Objetivo: regressão + baseline + revisão de acessibilidade do passo.
- Onde: `tests/components/kit-builder/*`, `e2e/visual`.
- Como: rodar suíte do módulo, `tsc`, lint incremental, build, bundle; atualizar baselines 008; navegação por teclado nos chips/cards.
- Aceite: tudo verde; PR com capturas 1440/1024/390.
- Prova: comandos citados na PR.
- Depende de: 017–029. Esforço: P.

## Fase 4 — Caixas compatíveis, Fluxo 1 (KM3-031 a 040)

### KM3-031 — Chips de tipo de embalagem
- Objetivo: "Todas · Kraft · Rígidas · Ecológicas · Com tampa · Magnéticas" derivados de `boxType`.
- Onde: `BoxSelector.tsx` (substitui o select "Tipo de embalagem").
- Como: `KitChips` com contagem; tipos vêm de `boxes.map(b => b.boxType)` (já calculado na linha ~100).
- Aceite: chip sem caixa correspondente não aparece.
- Prova: `tests/components/kit-builder/BoxSelector.test.tsx`.
- Depende de: 003. Esforço: P.

### KM3-032 — Grid / Lista e ordenação de caixas
- Objetivo: alternância e "Mais relevantes · Menor preço · Maior ocupação · Nome".
- Onde: `BoxSelector.tsx`, `box-recommendations.ts` (ranking já existe).
- Como: relevância = ranking atual; lista compacta reaproveita a linha do `BoxComparisonDialog`.
- Aceite: ordem padrão idêntica à recomendação atual (sem regressão).
- Prova: `tests/lib/kit-box-recommendations.test.ts`.
- Depende de: 003. Esforço: P.

### KM3-033 — Badges comerciais nas caixas `[PO D6]`
- Objetivo: "Econômica", "Sustentável", "Premium" ao lado de "Melhor ajuste".
- Onde: `BoxSelector.tsx`, `commercial-badges.ts` (004).
- Como: máximo 1 badge comercial + 1 de compatibilidade por card.
- Aceite: sem dado → só badge de compatibilidade.
- Prova: teste com contexto vazio e populado.
- Depende de: 004. Esforço: P.

### KM3-034 — Checklist de três linhas por card
- Objetivo: "Compatível com todos os itens · Espaço livre de 22 % · Abertura superior/Fechamento magnético".
- Onde: `BoxSelector.tsx`, `volume-calculator.ts` (espaço livre já é `100 - usagePercent`).
- Como: terceira linha vem de `closure`/`boxType` (010); sem dado, omite a linha, não inventa.
- Aceite: caixa incompatível mostra o motivo na primeira linha.
- Prova: teste de render com 3 cenários.
- Depende de: 010 (opcional para a 3ª linha). Esforço: P.

### KM3-035 — Painel "Composição atual"
- Objetivo: thumbs dos itens, "Editar itens", "Quantidade por kit", "Volume estimado (itens)".
- Onde: `BoxSelector.tsx` (coluna direita, acima da prévia), `KitCollage.tsx` (026).
- Como: "Editar itens" volta ao passo Itens mantendo a seleção (`actions.goToStep('items')`); volume via `volume-calculator`.
- Aceite: volume igual ao usado no cálculo de ocupação.
- Prova: teste comparando os dois valores.
- Depende de: 026. Esforço: M.

### KM3-036 — Bloco "Nossa recomendação"
- Objetivo: nome da caixa + 3 razões geradas por regra.
- Onde: `box-recommendations.ts` (`explainRecommendation(rec): string[]`), `BoxSelector.tsx`.
- Como: razões possíveis: "Comporta todos os itens com folga (X %)", "Menor preço entre as compatíveis", "Fechamento magnético/rígida" (se dado); nunca texto genérico.
- Aceite: 0 caixas compatíveis → bloco some e o rodapé 037 aparece.
- Prova: `tests/lib/kit-box-recommendations.test.ts`.
- Depende de: 010 (opcional). Esforço: P.

### KM3-037 — Rodapé "Nenhuma caixa atende?"
- Objetivo: saída comercial quando nada cabe.
- Onde: `BoxSelector.tsx`; reaproveita o link WhatsApp de `KitActionsBar.tsx:66`.
- Como: barra fixa no rodapé do passo com texto e botão "Falar com o comercial" (abre `wa.me` com resumo do kit); sempre visível, não só no vazio.
- Aceite: mensagem contém itens, quantidades e volume.
- Prova: teste de montagem da mensagem.
- Depende de: —. Esforço: P.

### KM3-038 — Favoritar caixa
- Objetivo: coração no card de caixa.
- Onde: `BoxSelector.tsx`, hook de favoritos (020).
- Como: mesmo hook; caixa é `product`, então zero tabela nova.
- Aceite: reflete em `/favoritos`.
- Prova: teste de hook.
- Depende de: 020. Esforço: P.

### KM3-039 — Comparação com vencedora explicada
- Objetivo: `BoxComparisonDialog` destaca a melhor coluna e diz por quê.
- Onde: `BoxComparisonDialog.tsx`, `explainRecommendation` (036).
- Como: coluna vencedora com borda de destaque e as razões abaixo.
- Aceite: R17 preservado (IDs removidos do resultado saem da comparação).
- Prova: teste existente + caso novo.
- Depende de: 036. Esforço: P.

### KM3-040 — Fechamento do passo Caixas compatíveis
- Objetivo: regressão + baseline.
- Como: igual à 030.
- Depende de: 031–039. Esforço: P.

## Fase 5 — Escolha da caixa, Fluxo 2 (KM3-041 a 048)

### KM3-041 — Filtros dimensionais mínimo e máximo
- Objetivo: Largura/Altura/Profundidade com mín e máx.
- Onde: `BoxSelector.tsx`, `BoxFilters` em `types.ts`.
- Como: adicionar `minWidth/minHeight/minDepth`; filtro inclusivo; inputs com `inputMode="decimal"`.
- Aceite: mín > máx mostra aviso e não filtra.
- Prova: teste de filtro.
- Depende de: —. Esforço: P.

### KM3-042 — Material como checkboxes com contagem
- Objetivo: "Papel cartão (12) · Papel kraft (8) …", multi-seleção.
- Onde: `BoxSelector.tsx`; `BoxFilters.material: string[]`.
- Como: contagem do conjunto não filtrado; ordem por contagem desc.
- Aceite: materiais com 0 caixas aparecem desabilitados.
- Prova: teste.
- Depende de: —. Esforço: P.

### KM3-043 — Acabamento e Fechamento com contagem `[PO D1, D2]`
- Objetivo: os dois grupos do mockup, só quando há dado.
- Onde: `BoxSelector.tsx`.
- Como: grupo oculto se todos os valores forem nulos; multi-seleção.
- Aceite: com 009 e 010 aplicados, grupos aparecem; antes, não.
- Prova: teste com fixture nula e populada.
- Depende de: 009, 010. Esforço: P.

### KM3-044 — Faixa de preço com slider
- Objetivo: slider + inputs sincronizados.
- Onde: `BoxSelector.tsx`, `ui/slider`.
- Como: limites vindos do catálogo; debounce 200 ms.
- Aceite: digitar no input move o slider e vice-versa.
- Prova: teste.
- Depende de: —. Esforço: P.

### KM3-045 — Ordenação e busca por código
- Objetivo: "Mais relevantes / Menor preço / Maior caixa / Nome" e busca por SKU.
- Onde: `BoxSelector.tsx` (a busca já cobre nome; incluir `sku` e `material`).
- Aceite: buscar "CX-001" encontra a caixa.
- Prova: teste.
- Depende de: 032. Esforço: P.

### KM3-046 — Prévia lateral completa
- Objetivo: Código, Dimensões (C×L×A), Material, Acabamento, Fechamento, Preço unitário + nota "Validação inteligente: ao selecionar, mostraremos apenas itens compatíveis".
- Onde: `BoxSelector.tsx:222-262`.
- Como: linhas com rótulo/valor; linha omitida quando o dado é nulo.
- Aceite: nunca mostra "—" para acabamento/fechamento; omite.
- Prova: baseline + teste.
- Depende de: 010 (opcional). Esforço: P.

### KM3-047 — Selo "Fluxo 2" e botão "Guia do Kit Maker"
- Objetivo: cabeçalho do passo igual ao mockup.
- Onde: `KitBuilderHeader.tsx` (005), link para o guia (087).
- Aceite: botão abre o guia no capítulo "Escolher a caixa".
- Depende de: 005, 087. Esforço: P.

### KM3-048 — Fechamento do passo Escolha da caixa
- Como: igual à 030. Depende de: 041–047. Esforço: P.

## Fase 6 — Personalização (KM3-049 a 058)

### KM3-049 — Técnica como cards
- Objetivo: cards com ícone e subtítulo ("Laser · Gravação a laser") alimentados pelo banco.
- Onde: `PersonalizationConfig.tsx:451-470` (select atual vira fallback para `< 768 px` ou > 6 técnicas).
- Como: `RadioGroup` visual; ícone por `code` da técnica (mapa em `kit-template-icons.ts` ou novo `technique-icons.ts`); subtítulo = descrição curta da técnica.
- Aceite: técnica sem ícone usa ícone genérico; seleção por teclado.
- Prova: `tests/components/kit-builder/PersonalizationConfig.behavior.test.tsx`.
- Depende de: 003. Esforço: M.

### KM3-050 — Área de aplicação real
- Objetivo: select "Área de aplicação" com as áreas do produto.
- Onde: `useKitBuilderQueries.ts` (nova query em `v_kit_component_print_areas` por produto), `PersonalizationConfig.tsx`, `useKitBuilder.ts` (`personalization.position`).
- Como: opções = áreas cadastradas; sem área → única opção "Frente" (comportamento atual); dimensão máxima da arte passa a respeitar a área quando existir.
- Aceite: trocar a área invalida prévia/preço (mesma regra de R8/R37).
- Prova: teste de hook com produto com 2 áreas e com 0.
- Depende de: 013. Esforço: M.

### KM3-051 — Área escolhida no `generate-mockup`
- Objetivo: prévia usa a posição/dimensão da área, não 50/50 fixo.
- Onde: `PersonalizationConfig.tsx:142-147` (payload `areas`).
- Como: `positionX/Y` e limites vindos da área selecionada; fallback mantém 50/50.
- Aceite: payload de produção testado com área real.
- Prova: teste do payload (mesmo padrão de R9).
- Depende de: 050. Esforço: P.

### KM3-052 — "Trocar item"
- Objetivo: link no card de configuração troca o item sem perder a configuração dos demais.
- Onde: `PersonalizationConfig.tsx` (lista esquerda já seleciona); adicionar ação inline.
- Aceite: foco vai para a lista; item atual mantém status.
- Prova: teste.
- Depende de: —. Esforço: P.

### KM3-053 — Painel "Resumo da personalização"
- Objetivo: coluna direita lista todos os itens com técnica, dimensão e status (Em edição / Pendente / Concluído).
- Onde: `PersonalizationConfig.tsx` (abaixo da prévia).
- Como: deriva do estado; clique leva ao item.
- Aceite: status idêntico ao da lista esquerda (fonte única).
- Prova: teste.
- Depende de: —. Esforço: P.

### KM3-054 — Rótulo "Custo adicional por unidade"
- Objetivo: leitura simples do custo, mantendo o breakdown setup/mínimo (R23/R36).
- Onde: `PersonalizationConfig.tsx` (bloco de preço).
- Como: linha principal "Custo adicional por unidade: R$ X" + nota "pode variar com quantidade e complexidade"; breakdown em `Collapsible`.
- Aceite: nenhum valor deixa de ser exibido; só muda a hierarquia.
- Prova: `PersonalizationConfig.test.ts`.
- Depende de: —. Esforço: P.

### KM3-055 — Status semânticos dos itens
- Objetivo: "Personalizando / Pendente / Personalizado / Sem personalização" com cores semânticas do tema.
- Onde: `PersonalizationConfig.tsx`, `KitBadge` (003).
- Aceite: mesmo vocabulário no resumo (053) e na Revisão.
- Depende de: 003. Esforço: P.

### KM3-056 — Botão "Guia de Personalização"
- Onde: cabeçalho do passo; abre o guia (087) no capítulo "Personalizar".
- Depende de: 087. Esforço: P.

### KM3-057 — Item sem técnica disponível
- Objetivo: mensagem clara e opção "Sem personalização" quando o produto não tem técnica.
- Onde: `PersonalizationConfig.tsx` (`techniques.length === 0`).
- Como: estado explícito com CTA "Continuar sem personalizar este item".
- Aceite: não bloqueia o avanço; Revisão mostra "Sem personalização".
- Prova: teste.
- Depende de: —. Esforço: P.

### KM3-058 — Fechamento do passo Personalização
- Como: igual à 030 + geração real de mockup com JWT (007). Depende de: 049–057. Esforço: P.

## Fase 7 — Revisão (KM3-059 a 070)

### KM3-059 — Objetivo/Etiqueta na Identificação
- Objetivo: card Identificação com Nome, Cliente, Objetivo/Etiqueta (mockup R7).
- Onde: `kit-summary/KitIdentificationCard.tsx`, `KitIdentityPicker.tsx` (mover/reutilizar), `persistence.ts` (campo `identity`/`tag` no snapshot).
- Como: picker existente renderizado no card; valor salvo no snapshot e enviado em `notes` do orçamento (`useKitBuilderQuote.ts:213`).
- Aceite: reabrir rascunho restaura a etiqueta.
- Prova: teste de persistência + payload.
- Depende de: —. Esforço: P.

### KM3-060 — Composição como tabela
- Objetivo: colunas Produto · Qtd/kit · Preço unit. · Total, com linhas de Personalização e Caixa e menu por linha.
- Onde: `kit-summary/KitCompositionCard.tsx`, `price-calculator.ts` (`generatePriceBreakdown` já tem as linhas).
- Como: `ui/table`; menu (`⋮`) com "Editar" (vai ao passo) e "Remover"; total da tabela = subtotal do `KitPricingCard` (fonte única).
- Aceite: soma das linhas = `pricing.subtotal`, testado.
- Prova: teste de igualdade.
- Depende de: —. Esforço: M.

### KM3-061 — Card "Caixa selecionada" com ocupação e "Alterar caixa"
- Objetivo: imagem, código, dimensões, barra de ocupação, espaço ocupado/livre, volume total; botão "Alterar caixa".
- Onde: novo `kit-summary/KitSelectedBoxCard.tsx`; `KitSummary.tsx`; `KitBuilderPage.tsx` (`goToStep('box')` mantendo itens).
- Como: valores de `volume-calculator`; rótulos "internas" para não repetir a inconsistência do mockup (5.600 vs 3.300 cm³).
- Aceite: ocupado + livre = volume interno.
- Prova: teste.
- Depende de: 003. Esforço: M.

### KM3-062 — Checklist de validação
- Objetivo: 4 linhas verdes/vermelhas: compatibilidade, dimensões/peso, estoque, "pronto para orçamento".
- Onde: novo `kit-summary/KitValidationChecklist.tsx`; alimenta-se de `KitConflictAlerts`/`useKitStockValidation`.
- Como: cada linha tem estado `ok | warn | blocked | unknown`; "pronto" só quando nenhuma está `blocked`.
- Aceite: `KitActionsBar` desabilita "Criar Orçamento" pela mesma fonte.
- Prova: teste com estoque desconhecido → linha `unknown`, botão desabilitado.
- Depende de: —. Esforço: M.

### KM3-063 — Observações
- Objetivo: textarea 0/500 salva no rascunho e vai para o orçamento.
- Onde: `KitSummary.tsx`, `persistence.ts` (`notes`), `useKitBuilderQuote.ts:213` (concatenar em `notes`).
- Como: autosave já cobre; limite 500; sanitizar quebras.
- Aceite: texto aparece no registro criado (inspeção do orçamento real, 094).
- Prova: teste de payload + round-trip do snapshot.
- Depende de: —. Esforço: P.

### KM3-064 — Resumo de preços com "Por kit / Total do lote"
- Objetivo: toggle que alterna a leitura sem recalcular nada.
- Onde: `kit-summary/KitPricingCard.tsx`.
- Como: `ToggleGroup`; linhas Subtotal produtos, Caixa, Personalização, Preço por kit; em "Total do lote" multiplica por `kitQuantity`; setup/mínimo continuam discriminados (R36).
- Aceite: total do lote = `calculateTotalKitPrice(..., kitQuantity).total`.
- Prova: `tests/lib/kit-builder-price.test.ts`.
- Depende de: —. Esforço: P.

### KM3-065 — Quantidade de kits no resumo
- Objetivo: input no card de preços sincronizado com a Identificação.
- Onde: `KitPricingCard.tsx`, `useKitBuilder.ts` (`setKitQuantity` já existe).
- Aceite: mudar em um lugar reflete no outro e reprecifica personalização (R7).
- Prova: teste existente de R7 + caso.
- Depende de: 064. Esforço: P.

### KM3-066 — Card Estoque no padrão
- Objetivo: `KitStockForecastCard` com título "Estoque", linha "Estoque suficiente para N kits" e link para detalhes.
- Onde: `KitStockForecastCard.tsx`.
- Aceite: R18 preservado (só após status conclusivo).
- Depende de: —. Esforço: P.

### KM3-067 — Frete real por CEP `[PO D4]`
- Objetivo: card "Frete estimado" com CEP de destino e cotação real.
- Onde: nova edge function `supabase/functions/freight-quote/index.ts` (contrato em `_shared/contracts/schemas/`), `FreightEstimator.tsx`.
- Como: provedor escolhido em D4; cache 24 h por (CEP, peso, dimensões da caixa); fallback para a tabela atual com rótulo "estimativa".
- Aceite: sem CEP → estimativa; com CEP → valor e prazo do provedor; erro do provedor → fallback rotulado.
- Prova: teste live em `tests/edge-functions/live/freight-quote.test.ts` + teste de componente.
- Depende de: D4, 015. Esforço: G.

### KM3-068 — Ações da Revisão
- Objetivo: "Salvar rascunho" explícito, "Criar orçamento" e "Voltar para o Kit Maker".
- Onde: `kit-summary/KitActionsBar.tsx`, `KitBuilderPage.tsx:235`.
- Como: "Salvar rascunho" chama o save manual (R33 garante que supera o autosave pendente); "Voltar" com rótulo completo.
- Aceite: salvar mostra estado "Salvo há Xs".
- Prova: `KitActionsBar.test.tsx`.
- Depende de: —. Esforço: P.

### KM3-069 — Exportar PDF com folha de impressão `[PO D5]`
- Objetivo: `window.print()` gera um PDF apresentável (sem sidebar/header).
- Onde: `src/styles/print-kit.css` (ou bloco `@media print` no módulo), `KitPresentablePreview.tsx`.
- Como: ocultar shell, mostrar prévia apresentável + tabela + preços; quebra de página entre composição e preços.
- Aceite: PDF de 1–2 páginas em A4.
- Prova: captura do print preview na PR.
- Depende de: D5. Esforço: P.

### KM3-070 — Fechamento da Revisão
- Como: igual à 030 + criação de orçamento real com dados descartáveis (094). Depende de: 059–069. Esforço: P.

## Fase 8 — Biblioteca (KM3-071 a 078)

### KM3-071 — Cliente, "Editado há", origem no card
- Objetivo: "Cliente: Tech Solutions", "Editado há 2 horas", "Fluxo Livre | Template".
- Onde: `kit-library/KitCard.tsx` (`KitCardData` ganha `clientName`, `updatedAt`, `origin`), `KitLibraryPage.tsx` (mapeamento do snapshot).
- Como: `date-fns/formatDistanceToNow` com locale `ptBR`; cliente vem do snapshot (R20 garante vínculo correto).
- Aceite: kit sem cliente omite a linha.
- Prova: `tests/components/kit-library/KitCard.test.tsx`.
- Depende de: —. Esforço: P.

### KM3-072 — CTA principal por status
- Objetivo: "Continuar edição →" para rascunho, "Abrir kit →" para publicado/arquivado; ícones secundários mantidos.
- Onde: `KitCard.tsx`.
- Aceite: um único botão primário por card.
- Depende de: —. Esforço: P.

### KM3-073 — Valor estimado e contagem de itens
- Objetivo: rótulo "Valor estimado" e "N itens" alinhados à direita como no mockup.
- Onde: `KitCard.tsx`.
- Aceite: baseline.
- Depende de: —. Esforço: P.

### KM3-074 — Aba "Sugeridos" com templates curados `[PO D3]`
- Objetivo: templates reais com preview; estado vazio orienta a curadoria (link para admin quando o usuário é admin).
- Onde: `KitLibraryPage.tsx`, `KitTemplatePreviewDialog.tsx`.
- Aceite: com 012 aplicado, 6 cards; sem, estado vazio com orientação.
- Depende de: 012. Esforço: P.

### KM3-075 — Semântica de "Publicado"
- Objetivo: definir e documentar: publicado = kit com orçamento criado ou compartilhado (`kit_share_tokens`).
- Onde: `KitLibraryPage.tsx` (filtro), `docs/references/kit-maker/README.md`.
- Como: regra única usada pelo badge e pelo filtro (R38 já separou arquivado).
- Aceite: teste de classificação para 4 estados.
- Prova: `tests/components/kit-builder/DashboardAndManagement.test.tsx`.
- Depende de: —. Esforço: P.

### KM3-076 — Densidade do modo Lista
- Objetivo: lista com uma linha por kit (nome, cliente, itens, valor, status, ações).
- Onde: `KitLibraryPage.tsx`.
- Aceite: 20 kits cabem em 1440 sem scroll interno.
- Depende de: 071. Esforço: P.

### KM3-077 — Preview do template com composição
- Objetivo: diálogo mostra itens, caixa e preço antes de "Usar".
- Onde: `KitTemplatePreviewDialog.tsx`, `useTemplateSnapshot.ts`.
- Aceite: R13 preservado (sem dados privados no template).
- Depende de: 074. Esforço: P.

### KM3-078 — Fechamento da Biblioteca
- Como: igual à 030. Depende de: 071–077. Esforço: P.

## Fase 9 — Montar com IA (KM3-079 a 086)

### KM3-079 — Edge function devolve título, descrição e estilo
- Objetivo: `kit-ai-builder` retorna `title`, `description` (≤ 160 chars) e `style_tag` além das palavras-chave.
- Onde: `supabase/functions/kit-ai-builder/index.ts` (schema do tool-calling, linhas ~83-90), `_shared/contracts/schemas/kit-ai-builder.ts`.
- Como: campos opcionais no contrato (compatível com cliente antigo); validação com o mesmo parser; deploy da função conferido.
- Aceite: resposta válida com e sem os campos novos.
- Prova: `tests/edge-functions/live/kit-ai-builder.test.ts` + teste de contrato.
- Depende de: —. Esforço: M.

### KM3-080 — Cliente exibe título, descrição e badge
- Objetivo: "Kit Onboarding Bem-Estar" + descrição + badge de estilo por sugestão.
- Onde: `KitAIPromptDialog.tsx`, `ai-composition.ts:150` (nome deixa de ser "Kit sugerido N" quando há título).
- Aceite: sem título do provedor, mantém o fallback atual.
- Prova: `tests/lib/kit-ai-composition.test.ts`.
- Depende de: 079. Esforço: P.

### KM3-081 — Colagem dos produtos sugeridos
- Objetivo: imagem da sugestão = colagem dos itens (não só a caixa).
- Onde: `KitAIPromptDialog.tsx:353`, `KitCollage.tsx` (026).
- Aceite: 4 itens → colagem 2×2; caixa como fundo quando existir.
- Depende de: 026. Esforço: P.

### KM3-082 — Briefing persistido no snapshot
- Objetivo: reabrir um kit criado pela IA mostra o briefing usado.
- Onde: `persistence.ts` (`aiBriefing` opcional), `useKitBuilder.ts`.
- Aceite: R13 preservado (briefing não vai para template compartilhado).
- Prova: teste de serialização.
- Depende de: —. Esforço: P.

### KM3-083 — Telemetria de custo e latência da IA
- Objetivo: fechar pendência 078 do relatório: log estruturado por chamada (tokens, ms, sucesso).
- Onde: `kit-ai-builder/index.ts` (`console.info` estruturado), painel de logs Supabase.
- Aceite: 10 chamadas de teste aparecem com os campos.
- Depende de: 079. Esforço: P.

### KM3-084 — Erros do provedor em linguagem de negócio
- Objetivo: sem chave/quota/timeout → mensagem acionável ("Tente novamente em 1 min" / "Fale com o TI").
- Onde: `KitAIPromptDialog.tsx` (mapa de erros), edge function (códigos).
- Aceite: 3 erros mapeados com teste.
- Depende de: 079. Esforço: P.

### KM3-085 — Happy path com JWT real
- Objetivo: fechar G01/077/080 do relatório.
- Onde: `tests/edge-functions/live/`, E2E 007.
- Aceite: briefing → 3 sugestões → aplicar → Revisão, autenticado.
- Depende de: 007, 079. Esforço: P.

### KM3-086 — Fechamento da IA
- Como: igual à 030. Depende de: 079–085. Esforço: P.

## Fase 10 — Transversal, QA e release (KM3-087 a 100)

### KM3-087 — Guia do Kit Maker
- Objetivo: "Ver tutoriais", "Como funciona?", "Guia do Kit Maker" e "Guia de Personalização" abrem conteúdo real, não a âncora `#como-funciona`.
- Onde: novo `src/components/kit-builder/KitMakerGuideDialog.tsx` com capítulos (Itens, Caixa, Personalização, Revisão, IA); `KitMakerLanding.tsx:244-250`; `KitOnboardingTour.tsx` reaproveitado para o passo a passo.
- Como: conteúdo em `src/lib/kit-builder/guide-content.ts` (texto, sem markdown externo); deep link `?guia=caixa`.
- Aceite: os 4 botões abrem o capítulo certo.
- Prova: teste de roteamento do diálogo.
- Depende de: —. Esforço: M.

### KM3-088 — Selo de fluxo e breadcrumb em todos os passos
- Objetivo: cabeçalho com "Kit Maker · <Passo>" + selo (005) + breadcrumb "Início > Kit Maker > <Passo>".
- Onde: `KitBuilderHeader.tsx`, `WizardSteps.tsx` (rótulos "Concluído / Atual").
- Aceite: baseline das 4 telas.
- Depende de: 005. Esforço: P.

### KM3-089 — Matriz de acessibilidade
- Objetivo: chips, cards, steppers e diálogos novos navegáveis por teclado e leitor de tela.
- Onde: `tests/components/kit-builder/a11y.test.tsx` (axe), E2E de teclado.
- Aceite: 0 violações `serious/critical`.
- Depende de: fases 3–9. Esforço: M.

### KM3-090 — Responsividade 390 px
- Objetivo: cada passo usável no celular com `KitMobileSummaryBar`.
- Onde: componentes das fases 3–7.
- Aceite: baselines 390 aprovadas; nenhum scroll horizontal.
- Depende de: 008. Esforço: M.

### KM3-091 — Performance e bundle
- Objetivo: grade de 7.651 produtos a 60 fps; bundle do módulo dentro do orçamento.
- Onde: `ItemSelector.tsx` (022), `npm run check:bundle-size`.
- Aceite: `check:bundle-size` verde; Lighthouse de `/montar-kit` ≥ 90 em performance no desktop.
- Depende de: 022. Esforço: P.

### KM3-092 — E2E autenticado dos dois percursos
- Objetivo: Fluxo 1 e Fluxo 2 de ponta a ponta até "Criar orçamento" (sem criar, no CI).
- Onde: `e2e/flows/06-kit-builder.spec.ts`, `e2e/routes/app/kit-builder.spec.ts`.
- Aceite: 2 specs verdes no CI com o usuário 007.
- Depende de: 007, fases 3–7. Esforço: M.

### KM3-093 — RLS e concorrência com dois usuários
- Objetivo: fechar pendência 4 do relatório.
- Onde: `e2e/` com dois `storageState`; `tests/contracts/`.
- Como: usuário B não vê rascunho de A; duas abas do mesmo usuário não sobrescrevem (R01/R33).
- Aceite: 3 cenários verdes.
- Depende de: 007. Esforço: M.

### KM3-094 — Orçamento real ponta a ponta
- Objetivo: fechar pendência 3/090: criar orçamento com dados descartáveis e inspecionar o registro (cliente, notes, arte/mockup, kit de origem).
- Onde: projeto canônico, `kit_quote_requests`, `quotes`.
- Aceite: registro contém tudo que a Revisão mostrou; recibo idempotente ao repetir.
- Prova: consultas anexadas à PR.
- Depende de: 007, 063. Esforço: P.

### KM3-095 — Regressão completa
- Objetivo: suíte do módulo + `tsc` + lint incremental + build + bundle antes de cada merge de lote.
- Como: comandos da seção 9 do relatório de 12/09.
- Aceite: tudo verde; falha bloqueia o lote.
- Depende de: cada lote. Esforço: P.

### KM3-096 — Aceite visual do PO
- Objetivo: fechar pendência 2/092: capturas lado a lado (mockup × produção) por tela e viewport.
- Onde: `docs/audits/KIT_MAKER_ACEITE_VISUAL_<data>.md`.
- Aceite: PO marca cada tela como aceita ou devolve com observação.
- Depende de: 008, fases 3–9. Esforço: P.

### KM3-097 — Relatório da rodada
- Objetivo: `docs/audits/KIT_MAKER_REVISAO_MELHORIAS_<data>.md` no mesmo formato do relatório de 12/09 (falhas, matriz, validações, pendências).
- Aceite: cada etapa com estado `I / P / V` e prova.
- Depende de: 095. Esforço: P.

### KM3-098 — Deploy e verificação em produção
- Objetivo: cada lote mergeado conferido em `/montar-kit` (Vercel) com run do workflow e teste manual do passo alterado.
- Aceite: link do deploy + captura no comentário da PR.
- Depende de: cada lote. Esforço: P.

### KM3-099 — Monitoramento pós-deploy
- Objetivo: 7 dias sem erro novo em Sentry (`@sentry/react` já instalado) nas rotas do módulo; logs das edge functions `kit-ai-builder`, `generate-mockup`, `freight-quote` sem 5xx.
- Aceite: relatório curto em 097.
- Depende de: 098. Esforço: P.

### KM3-100 — Encerramento
- Objetivo: matriz final das 100 etapas, decisões do PO registradas, pendências residuais explícitas, `Próximos passos` do módulo.
- Onde: 097 + este arquivo (checkboxes marcados).
- Aceite: nenhuma etapa marcada como concluída sem prova citada.
- Depende de: tudo. Esforço: P.

---

## Anexo A — Rastreabilidade mockup → etapas

| Ref. | Tela | Etapas |
| --- | --- | --- |
| R1 | Landing (produção já fiel) | 012, 087, 088 |
| R2 | Caixas compatíveis (Fluxo 1) | 031–040 |
| R3 | Escolha da caixa (Fluxo 2) | 041–048 |
| R4 | Personalização | 049–058 |
| R5 | Itens | 017–030 |
| R6 | Montar com IA | 079–086 |
| R7 | Revisão | 059–070 |
| R8 | Biblioteca | 071–078 |
| Todas | Fundamentos, dados, QA | 001–016, 089–100 |

## Anexo B — Matriz de estado (preencher a cada lote)

Legenda: `I` implementada e validada localmente · `P` implementada, depende de dado/serviço/aceite externo · `V` validação externa ou humana pendente · `—` não iniciada.

| Etapa | Estado | PR | Prova |
| ---: | :---: | --- | --- |
| 001–100 | — | | |
