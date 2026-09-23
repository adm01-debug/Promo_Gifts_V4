# Kit Maker — Plano de finalização em 20 etapas

Data: 23/09/2026. Base: `main` @ `c6a7d2d` (PRs #1882 e #1884 mergeadas e publicadas em `/montar-kit`). Projeto canônico: `doufsxqlfjyuvxuezpln`.

Origem: auditoria de 23/09 do que restou após as duas rodadas de paridade visual. Cobre exatamente os itens ainda abertos: validação real do módulo (nunca feita com sessão autenticada), funcionalidades incompletas (estoque no card, área de aplicação, busca por SKU, IA), selos comerciais e layout de impressão.

## 0. Como ler

Cada etapa traz: **Objetivo · Onde · Como · Aceite · Prova · Depende de · Esforço**. Esforço: `P` até ~100 linhas / 1 sessão; `M` 1–2 sessões; `G` mais de 2 sessões ou toca serviço externo. `[PO]` = exige decisão de negócio antes de codificar.

### Invariantes

1. Uma frente por PR; branch `claude/<tipo>-<slug>-<AAMMDD-HHMM>` a partir de `main` atualizado; squash-merge só com CI verde.
2. Diff mínimo: estender o que existe, não reescrever. Preservar R01–R38 e o entregue em #1882/#1884.
3. Nada de dado inventado: selo, contador ou atributo só existe com regra de dado por trás.
4. Sem DDL nem alteração de dado em produção sem `APROVADO` explícito.
5. Nada de "sucesso" sem prova: cada PR cita o comando/teste rodado e o deploy conferido.

### Bloqueios conhecidos na entrada

| ID | Bloqueio | Destrava |
| --- | --- | --- |
| B1 | Não existe usuário de teste com JWT | etapas 01–10 |
| B2 | Critério dos selos comerciais não definido `[PO]` | etapa 19 |
| B3 | 637 produtos sem peso | etapa 15 (regra, não correção do dado) |
| B4 | Cobertura de áreas de gravação desconhecida | etapa 12 (medida na 11) |

---

## Bloco A — Destravar a validação real (etapas 01–10)

Sem este bloco, toda entrega do módulo continua sendo "passou nos testes automáticos", nunca "funciona para o cliente". É a maior lacuna aberta hoje.

### 01 — Usuário de teste e dados descartáveis
- Objetivo: conta dedicada para E2E autenticado, sem tocar em dado real de cliente.
- Onde: Supabase Auth do projeto canônico; `docs/references/kit-maker/E2E_CREDENCIAIS.md` (sem senha no repo).
- Como: usuário `kitmaker.e2e@promobrindes.com.br` com perfil supervisor; cliente descartável "E2E — não faturar"; senha em secret do CI (`E2E_USER`, `E2E_PASS`), nunca no código.
- Aceite: login manual funciona; usuário não aparece em relatórios comerciais.
- Prova: print do login + `select` do perfil/papel.
- Depende de: criação pelo PO/TI. Esforço: P.

### 02 — Setup de autenticação no Playwright
- Objetivo: specs rodam já logadas, sem repetir login em cada teste.
- Onde: `e2e/auth/global-setup.ts`, `playwright.config.ts`, workflow de CI.
- Como: `storageState` salvo uma vez no setup; sem credencial, specs autenticadas viram `skip` com motivo explícito (nunca falha silenciosa nem verde falso).
- Aceite: job verde com secret; job verde com `skipped` documentado sem secret.
- Prova: run do workflow.
- Depende de: 01. Esforço: M.

### 03 — E2E do Fluxo 1 (começar pelos itens)
- Objetivo: percurso real itens → caixas compatíveis → personalização → revisão.
- Onde: `e2e/flows/06-kit-builder-fluxo1.spec.ts`.
- Como: selecionar 3 itens reais, avançar, escolher a caixa recomendada, configurar 1 personalização, chegar na Revisão; asserts nos números (subtotal, ocupação) e não só em texto.
- Aceite: spec verde; falha se o CTA "Ver caixas compatíveis" não habilitar com ≥ 1 item.
- Prova: run do CI.
- Depende de: 02. Esforço: M.

### 04 — E2E do Fluxo 2 (começar pela caixa)
- Objetivo: percurso caixa → itens compatíveis → personalização → revisão.
- Onde: `e2e/flows/06-kit-builder-fluxo2.spec.ts`.
- Como: aplicar filtro dimensional mín/máx, escolher caixa, confirmar que o filtro "apenas itens que cabem" reduz o catálogo, concluir.
- Aceite: spec verde; selo "Fluxo 2" visível nos 4 passos.
- Prova: run do CI.
- Depende de: 02. Esforço: M.

### 05 — Orçamento real ponta a ponta
- Objetivo: fechar a pendência mais antiga do módulo — nunca se inspecionou um orçamento criado pelo Kit Maker.
- Onde: `kit_quote_requests`, `quotes`, `quote_items`; `tests/edge-functions/live/`.
- Como: criar orçamento com o usuário 01; conferir no banco: cliente correto, itens com variante certa, personalizações associadas aos itens válidos (R da PR #1878), campo `notes` contendo a etiqueta do kit e as Observações digitadas, kit de origem vinculado; repetir a chamada e confirmar idempotência (não duplica).
- Aceite: todo dado que a Revisão mostrou está no registro; segunda chamada devolve o mesmo recibo.
- Prova: consultas SQL anexadas à PR.
- Depende de: 01, 03. Esforço: M.

### 06 — RLS e concorrência com dois usuários
- Objetivo: garantir que rascunho de um cliente não vaza para outro e que duas abas não se sobrescrevem.
- Onde: `e2e/` com dois `storageState`; `tests/contracts/`.
- Como: usuário B tenta abrir kit de A por id direto (deve negar); duas abas do mesmo usuário editam o mesmo kit e o autosave não perde a edição mais recente (R01/R33).
- Aceite: 3 cenários verdes.
- Prova: run do CI.
- Depende de: 01, 02. Esforço: M.

### 07 — Baselines visuais das 8 superfícies
- Objetivo: cada PR futura compara antes/depois automaticamente.
- Onde: `e2e/visual/kit-maker.spec.ts` + `__screenshots__/`.
- Como: `toHaveScreenshot` em 1440, 1024 e 390 para Landing, Itens, Caixas compatíveis, Escolha da caixa, Personalização, Revisão, Biblioteca, IA (24 baselines); máscara em preços e datas para não gerar diff falso.
- Aceite: primeiro run gera; segundo run verde sem mudanças; diff > 0,2 % reprova.
- Prova: artefatos do job.
- Depende de: 02. Esforço: M.

### 08 — Aceite visual mockup × produção
- Objetivo: confirmação humana de que a tela bate com o aprovado — a única prova que os testes não dão.
- Onde: `docs/audits/KIT_MAKER_ACEITE_VISUAL_2026-09.md`.
- Como: tabela por tela e viewport com captura do mockup ao lado da captura de produção; cada linha marcada Aceita / Ajustar + observação.
- Aceite: 8 telas revisadas pelo PO.
- Prova: documento preenchido.
- Depende de: 07. Esforço: P.

### 09 — Responsividade 390 px
- Objetivo: módulo usável no celular, onde hoje nada foi verificado.
- Onde: componentes das fases de Itens, Caixas, Personalização e Revisão.
- Como: corrigir o que as baselines 390 acusarem; sem scroll horizontal; barra de resumo fixa no mobile; chips viram scroll horizontal em vez de quebrar em 4 linhas.
- Aceite: baselines 390 aprovadas nas 8 telas.
- Prova: job visual verde.
- Depende de: 07. Esforço: M.

### 10 — Acessibilidade dos componentes novos
- Objetivo: chips, cards de técnica, steppers, diálogo do guia e tabela da Revisão navegáveis por teclado e leitor de tela.
- Onde: `tests/components/kit-builder/a11y.test.tsx` (axe) + E2E de navegação por Tab.
- Como: rodar axe nas 4 telas do builder; corrigir `role`, `aria-label`, foco visível e ordem de tabulação.
- Aceite: 0 violações `serious` e `critical`.
- Prova: saída do axe na PR.
- Depende de: fases anteriores. Esforço: M.

---

## Bloco B — Completar o que ficou pela metade (etapas 11–20)

### 11 — Medir cobertura de áreas de gravação
- Objetivo: saber para quantos produtos a "Área de aplicação" terá opção real antes de construir o seletor.
- Onde: `v_kit_component_print_areas`; relatório em `docs/audits/KIT_MAKER_PRINT_AREAS_2026-09.md`.
- Como: contar produtos ativos com ≥ 1 área cadastrada sobre o total; listar os 50 mais usados sem área para curadoria futura.
- Aceite: número consolidado no documento.
- Prova: consulta anexada.
- Depende de: —. Esforço: P.

### 12 — Área de aplicação real na personalização
- Objetivo: substituir o "Frente" fixo (hoje hardcoded 50/50) pelas áreas cadastradas do produto.
- Onde: `useKitBuilderQueries.ts` (query por produto), `PersonalizationConfig.tsx`, payload do `generate-mockup`.
- Como: select com as áreas reais; sem área cadastrada, mantém "Frente" e não mostra select vazio; `positionX/Y` e limite de dimensão da arte passam a vir da área escolhida; trocar a área invalida prévia e preço (mesma regra já existente).
- Aceite: produto com 2 áreas mostra as 2; produto sem área não regride.
- Prova: teste de hook nos dois cenários + geração real de mockup autenticado.
- Depende de: 11, 01. Esforço: M.

### 13 — Estoque agregado na projeção do catálogo
- Objetivo: trazer estoque junto com o produto, sem uma chamada por card (N+1).
- Onde: `useKitBuilderQueries.ts`, `useKitBuilderTransformers.ts`, `KitItem.stock`.
- Como: reaproveitar a fonte já usada por `useKitStockValidation`; distinguir `null` (desconhecido) de `0` (sem estoque) — são coisas diferentes para o vendedor.
- Aceite: `KitItem.stock` presente na projeção; nenhuma requisição extra por card.
- Prova: teste de transformer (nulo ≠ zero) + contagem de requisições.
- Depende de: —. Esforço: M.

### 14 — Estoque visível no card do item
- Objetivo: o vendedor vê "Em estoque (542)" antes de escolher, não depois.
- Onde: `ItemCard.tsx` e grade do `ItemSelector.tsx`.
- Como: 4 estados — carregando, "Estoque desconhecido", "Sem estoque", "Em estoque (N)"; mesmo vocabulário já usado na Revisão.
- Aceite: nunca mostra "0" quando o dado é nulo.
- Prova: teste com os 4 estados.
- Depende de: 13. Esforço: P.

### 15 — Regra de peso desconhecido no frete
- Objetivo: 637 produtos sem peso não podem inflar nem zerar a estimativa em silêncio.
- Onde: `FreightEstimator.tsx` e util de peso.
- Como: somar só o peso conhecido e rotular "estimativa parcial — N itens sem peso cadastrado"; nunca assumir zero.
- Aceite: kit com item sem peso exibe o aviso.
- Prova: novo caso em `FreightEstimator.test.tsx`.
- Depende de: —. Esforço: P.

### 16 — Busca por código e material na tela de caixas
- Objetivo: achar a caixa pelo SKU, como o time comercial já faz no catálogo.
- Onde: `BoxSelector.tsx` (a busca hoje cobre só o nome).
- Como: incluir `sku` e `material` no predicado de busca.
- Aceite: buscar o código da caixa encontra a caixa.
- Prova: teste de busca.
- Depende de: —. Esforço: P.

### 17 — IA devolve título, descrição e estilo de verdade
- Objetivo: hoje o nome e a descrição da sugestão são montados no site a partir do briefing; passam a vir do provedor.
- Onde: `supabase/functions/kit-ai-builder/index.ts` (schema do tool-calling) + contrato em `_shared/contracts/schemas/`; `ai-composition.ts`.
- Como: campos `title`, `description` (≤ 160 chars) e `style_tag` opcionais no contrato, para não quebrar cliente antigo; sem os campos, mantém o fallback atual.
- Aceite: resposta válida com e sem os campos novos; deploy da função conferido.
- Prova: teste de contrato + teste live.
- Depende de: —. Esforço: M.

### 18 — Erros da IA em linguagem de negócio e telemetria
- Objetivo: "sem créditos", "tente novamente em 1 minuto", "fale com o TI" em vez de erro técnico genérico; e saber quanto a IA custa.
- Onde: `KitAIPromptDialog.tsx` (mapa de erros), `kit-ai-builder/index.ts` (códigos + log estruturado).
- Como: 3 erros mapeados (sem chave, quota, timeout); log com tokens, latência e sucesso por chamada.
- Aceite: 3 erros com teste; 10 chamadas de teste aparecem no painel de logs com os campos.
- Prova: teste + print do log.
- Depende de: 17. Esforço: P.

### 19 — Selos comerciais por regra de dado `[PO B2]`
- Objetivo: "Mais usada", "Econômica", "Sustentável", "Premium" só aparecem com critério verificável — hoje não existem porque não há regra.
- Onde: `src/lib/kit-builder/commercial-badges.ts` (novo) + uso em `BoxSelector.tsx`.
- Como: função pura `deriveCommercialBadges(caixa, contexto)`; regras propostas: usada em ≥ N kits nos últimos 90 dias → Mais usada; menor preço entre as compatíveis → Econômica; material/tag reciclado → Sustentável; preço ≥ P75 do conjunto → Premium; sem contexto, devolve lista vazia. Máximo 1 selo comercial + 1 de compatibilidade por card.
- Aceite: testes de tabela por regra e para o caso "sem dado".
- Prova: `tests/lib/kit-commercial-badges.test.ts`.
- Depende de: definição do critério pelo PO. Esforço: M.

### 20 — Layout de impressão do orçamento
- Objetivo: manter a impressão do navegador (custo zero) mas gerar um PDF apresentável.
- Onde: bloco `@media print` do módulo + `KitPresentablePreview.tsx`.
- Como: ocultar menu, sidebar e botões; imprimir capa com identificação do kit, tabela de composição e quadro de preços; quebra de página entre composição e preços.
- Aceite: PDF de 1–2 páginas em A4, sem elemento de navegação.
- Prova: captura do print preview na PR.
- Depende de: —. Esforço: P.

---

## Sequência recomendada

| Lote | Etapas | Por quê primeiro | Merge |
| --- | --- | --- | --- |
| 1 | 01, 02 | destrava 8 etapas de uma vez | PO cria a credencial |
| 2 | 11, 13, 15, 16, 20 | independentes, sem bloqueio | autônomo |
| 3 | 03, 04, 05, 06 | prova que o fluxo funciona de verdade | autônomo |
| 4 | 12, 14, 17, 18 | dependem de 11/13/contrato | autônomo |
| 5 | 07, 08, 09, 10 | fecham o aceite visual e mobile | 08 exige aceite do PO |
| 6 | 19 | depende do critério comercial | PO define |

## Anexo — o que este plano NÃO cobre

Itens que dependem de decisão ou dado externo e seguem registrados fora deste escopo: cadastro do catálogo próprio de caixas de kit (material, cor, fechamento, medidas e preço), curadoria dos 6 templates de kit, frete real por CEP via Frenet ou Melhor Envio, e correção do campo de material das 14 embalagens de fornecedor (hoje guarda o tipo de polybag).
