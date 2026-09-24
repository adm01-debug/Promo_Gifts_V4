# Kit Maker + Revista + Governança — Plano de consolidação em 100 etapas

Data: 24/09/2026. Base: `main` @ `e48e6603` (PR #1899 mergeada; PR #1898 mergeada). Projeto canônico: `doufsxqlfjyuvxuezpln`.

Origem: três auditorias de 5 agentes cada, rodadas em 24/09 sobre o código real de `main`:
1. **Auditoria do plano `KIT_MAKER_PLANO_FINALIZACAO_20_ETAPAS_2026-09-23.md`** — placar real: 4 etapas completas (13, 14, 15, 16), 7 parciais (02, 09, 11, 12, 17, 18, 20), 7 não implementadas (03, 04, 05, 06, 07, 08, 10), 2 bloqueadas por decisão do PO (01/B1, 19/B2). Duas etapas estavam registradas como "concluídas" na lista de tarefas sem cumprir o Aceite (12 e 17).
2. **Auditoria do módulo Revista** (2 rodadas, PR #1899) — crashes de template, fail-open em edge pública, teste E2E órfão, tipo `page_order`, observabilidade zod; sobraram gaps de teste e de calibração.
3. **Auditoria de governança de deploy** — 2 casos reais de edge function deployada fora do fluxo git (`kit-ai-builder` 23/09, `magazine-reader-state-read` 24/09), só descobertos pelo drift check; telemetria de IA nunca exercitada em produção (`ai_usage_logs` com 0 linhas de `kit-ai-builder`).

Este plano **substitui** o de 20 etapas como fonte de verdade do que falta. Cada etapa daqui nasce de um achado com arquivo:linha ou dado vivo — nada é genérico.

## 0. Como ler e executar

Cada etapa traz: **Objetivo · Onde · Como · Aceite · Prova · Depende de · Esforço**. Esforço: `P` até ~100 linhas / 1 sessão; `M` 1–2 sessões; `G` mais de 2 sessões ou toca serviço externo. `[PO]` = exige decisão de negócio; `[$]` = consome crédito de IA ou serviço pago — pedir `APROVADO` antes.

### Invariantes (herdados do plano de 20, com o que a auditoria mostrou que precisa ser reforçado)

1. **Uma etapa por PR.** PR #1891 fechou ≥3 frentes e o título superdeclarou etapas (13/14/16/20) que foram fechadas em PRs próprias. Título do PR = `feat|fix|test|docs(kit-maker|magazine|ci): E<NN> — <título da etapa>`.
2. Diff mínimo. A reformatação de aspas em `FreightEstimator.test.tsx` (#1891, 60 linhas sem mudança de comportamento) é o exemplo do que não fazer.
3. Nada de dado inventado (selo, contador, atributo) sem regra de dado — respeitado até aqui; manter.
4. Sem DDL nem alteração de dado em produção sem `APROVADO`. **Estende-se a deploy de edge function** (REGRA #8, corolário de 24/09): só via `.github/workflows/deploy-edge-functions.yml` (`workflow_dispatch` + `function_name`).
5. **Prova ≠ nome de arquivo.** PRs #1886, #1889 e #1894 citaram o arquivo de teste mas não o comando rodado; #1891, #1892 e #1893 não citaram nada. Corpo do PR deve trazer o comando exato + resultado (`N passed`), e "Aceite" verificado item a item.
6. **"Concluída" só com Aceite cumprido, não com PR mergeada.** Etapas 12 e 17 foram marcadas como concluídas com o Aceite pela metade.

### Bloqueios na entrada

| ID | Bloqueio | Estado em 24/09 | Destrava |
| --- | --- | --- | --- |
| B1 | Usuário de teste com JWT dedicado ao Kit Maker | **aberto** — `kitmaker.e2e` só existe em planos; infra genérica `E2E_USER_EMAIL/PASSWORD` existe e está ligada em 10 workflows | E15, E16 |
| B2 | Critério dos selos comerciais `[PO]` | **aberto** — nenhum registro de decisão em `docs/` | E40 |
| B3 | Produtos sem peso | **destravado** como regra (#1887); dado real: 657 nulos, 0 com peso 0 (plano dizia 637) | E43, E45 |
| B4 | Cobertura de áreas de gravação | **destravado** (46,7 %, `print_area_techniques`); `v_kit_component_print_areas` cobre 0 ativos | E11 |
| B5 | Vercel preview `promo-gifts-v4` falha com `Resource provisioning failed` em ~2 s, em todo push (projeto irmão builda ok no mesmo commit) | **aberto** — infra, não código | E76 |

---

## Bloco A — Kit Maker: fechar o que ficou pela metade (E01–E14)

### E01 — Diálogo da IA consome o que a IA devolve
- Objetivo: cumprir o objetivo real da etapa 17 do plano anterior — hoje `title`/`description`/`style_tag` chegam da edge e são descartados.
- Onde: `src/components/kit-builder/KitAIPromptDialog.tsx:425–436` (`buildAlternativeTitle`, `buildBriefDescription`); `src/lib/kit-builder/ai-composition.ts:150–153`.
- Como: quando `composition.name`/`description`/`styleTag` existirem, renderizar esses; só cair em `buildAlternativeTitle`/`buildBriefDescription` na ausência. Manter `setKitName(composition.name)` em `useKitBuilder.ts:618`.
- Aceite: sugestão com `title` da IA mostra esse título no card e na descrição; sem os campos, comportamento idêntico ao atual.
- Prova: 2 casos novos em `tests/components/kit-builder/KitAIPromptDialog.test.tsx` (com e sem campos) + comando e contagem no PR.
- Depende de: —. Esforço: P.

### E02 — `description` > 160 chars não pode derrubar a sugestão inteira
- Objetivo: hoje o tool schema não limita tamanho e o contrato zod rejeita >160 → toda a resposta vira 502 "Resposta da IA não pôde ser validada".
- Onde: `supabase/functions/kit-ai-builder/index.ts:134–139` (tool schema), `:205–215` (502); `supabase/functions/_shared/contracts/schemas/kit-ai-builder.ts:38–40`.
- Como: truncar `description` a 160 e `title` a 80 antes do `safeParse` (nunca rejeitar por tamanho de campo opcional); adicionar `maxLength` no tool schema.
- Aceite: resposta com `description` de 300 chars retorna 200 com o texto truncado.
- Prova: caso novo em `tests/contracts/migrated-endpoints.contract.test.ts` + deploy via `deploy-edge-functions.yml` (`function_name=kit-ai-builder`) com run citado.
- Depende de: —. Esforço: P.

### E03 — Descriptor live dedicado para `kit-ai-builder`
- Objetivo: o teste live hoje cai no `DEFAULT` (`tests/edge-functions/live/descriptors.ts:207–210`) — cobre só CORS/auth/input inválido, nunca o happy path.
- Onde: `tests/edge-functions/live/descriptors.ts`.
- Como: entrada com briefing mínimo válido; assert de `suggestions[0].title`/`description` presentes e ≤ limites.
- Aceite: teste live passa com credencial; `skip` explícito sem credencial.
- Prova: run do job `Edge Function Integration Tests` citado no PR. `[$]` 1 chamada de IA por run.
- Depende de: E02. Esforço: P.

### E04 — Telemetria de IA provada em produção
- Objetivo: `SELECT count(*) FROM ai_usage_logs WHERE function_name='kit-ai-builder'` → **0** hoje. A Prova "10 chamadas no painel" da etapa 18 nunca existiu.
- Onde: `supabase/functions/_shared/ai-usage.ts:134–169`; `ai_usage_logs`.
- Como: `[$]` 10 chamadas autenticadas via `supabase_functions_invoke`; conferir 10 linhas com `input_tokens`, `output_tokens`, `duration_ms`, `status`; se 0 linhas, investigar GRANT/RLS do service client na tabela.
- Aceite: 10 linhas em `ai_usage_logs`, anexadas ao PR como consulta.
- Prova: SQL + resultado em `docs/audits/KIT_AI_TELEMETRIA_2026-09.md`.
- Depende de: —. Esforço: P.

### E05 — `duration_ms` mede só o gateway de IA
- Objetivo: `startMs` é capturado antes de `parseContract`/`requireAiApiKey` (`index.ts:44`) — a "latência da IA" inclui auth e credencial.
- Onde: `supabase/functions/kit-ai-builder/index.ts:44`, `:51–63`.
- Como: mover `startMs` para imediatamente antes do `fetch` ao provedor; manter um `total_ms` separado se útil.
- Aceite: log com `duration_ms` < `total_ms` em chamada real.
- Prova: 1 linha de `ai_usage_logs` após deploy.
- Depende de: E04. Esforço: P.

### E06 — Mensagem do circuit breaker não culpa o usuário
- Objetivo: 503 sem código (breaker aberto, `external-fetch.ts:77–93`) mostra "Muitas tentativas em pouco tempo" — a causa é o provedor, não o vendedor.
- Onde: `src/components/kit-builder/KitAIPromptDialog.tsx:112–114`.
- Como: distinguir `503 + error='ai_not_configured'` (já ok), `429/504/timeout` ("tente novamente em 1 minuto") e `503 sem código` ("IA temporariamente indisponível, tente em alguns minutos").
- Aceite: 3 mensagens distintas com teste.
- Prova: `KitAIPromptDialog.test.tsx` (hoje 12 casos) + 1.
- Depende de: —. Esforço: P.

### E07 — `positionX/Y` vêm da área escolhida
- Objetivo: etapa 12 do plano anterior pedia isso explicitamente; continua `50/50` hardcoded.
- Onde: `src/components/kit-builder/PersonalizationConfig.tsx:191–192`; `src/hooks/kit-builder/useKitBuilderQueries.ts:163–199` (`useKitComponentPrintAreas`).
- Como: se `print_area_techniques` não tiver coordenadas (confirmar via `pg_catalog`, não PostgREST), manter 50/50 **documentado como default da área**, e expor `positionX/Y` no tipo de área para quando a RPC `fn_get_product_customization_options` devolver; nunca hardcode silencioso.
- Aceite: área com coordenadas → payload do mockup usa as dela; sem coordenadas → 50/50 com comentário de origem.
- Prova: teste de hook com os 2 cenários.
- Depende de: —. Esforço: M.

### E08 — Limite de dimensão da arte vem da área, não só da técnica
- Objetivo: hoje o clamp usa `currentTech.efetiva_largura_max/altura_max` (`PersonalizationConfig.tsx:646–691`, `:112–117`); o fallback não seleciona `max_width`/`max_height` embora as colunas existam (`types.ts:16933–16934`).
- Onde: `useKitBuilderQueries.ts:172` (select do fallback); `PersonalizationConfig.tsx:112–117`.
- Como: selecionar `max_width, max_height`; clamp = mínimo entre limite da técnica e da área quando ambos existirem.
- Aceite: área com `max_width=50` e técnica com 80 → arte limitada a 50.
- Prova: teste de hook + teste de comportamento.
- Depende de: —. Esforço: P.

### E09 — Teste de UI "2 áreas → 2 opções" e "sem área → select ausente"
- Objetivo: `PersonalizationConfig.behavior.test.tsx:294–299` só assere que o 1º combobox contém "Frente".
- Onde: `tests/components/kit-builder/PersonalizationConfig.behavior.test.tsx`.
- Como: 2 casos com `options.locations` mockado (2 itens / vazio + fallback vazio).
- Aceite: ambos verdes; o 2º garante que `<Select>` não renderiza (`PersonalizationConfig.tsx:517`).
- Prova: comando + contagem no PR.
- Depende de: —. Esforço: P.

### E10 — Nome do hook/queryKey reflete a fonte real
- Objetivo: `useKitComponentPrintAreas` / queryKey `kit-component-print-areas` lêem `print_area_techniques` desde #1891 — nome mente.
- Onde: `src/hooks/kit-builder/useKitBuilderQueries.ts:163`.
- Como: renomear para `usePrintAreaTechniques`/`print-area-techniques`; atualizar 3 call sites e o teste.
- Aceite: `grep kit-component-print-areas src/ tests/` → 0.
- Prova: tsc + testes do hook.
- Depende de: E07, E08 (mesma área de código). Esforço: P.

### E11 — Top-50 sem área enumerado de verdade
- Objetivo: `docs/audits/KIT_MAKER_PRINT_AREAS_2026-09.md:70–80` nomeia 8 produtos e colapsa 42 em uma linha; e a nota `:6–9` diz que "12,4 %" foi mergeado em `main` — `git log -S"12,4"` mostra que só existiu em `origin/claude/feat-kit-maker-bloco-b`.
- Onde: o documento acima.
- Como: rodar a SQL já anexada (`:84–106`) via `pg_catalog`/SELECT read-only, listar os 50; corrigir a nota histórica.
- Aceite: 50 linhas nomeadas; nota corrigida.
- Prova: diff do doc.
- Depende de: —. Esforço: P.

### E12 — Teste do caminho de impressão
- Objetivo: PR #1890 não tocou `tests/`; o único teste de `KitPresentablePreview` (`tests/components/kit-builder/KitPresentablePreview.test.tsx:36`) é de 10/09.
- Onde: novo `tests/components/kit-builder/KitPresentablePreview.print.test.tsx`.
- Como: render com `quoteClient`, kit com 3 itens; asserts em `perKitPrice` (`grandTotal / kitQuantity`, `:55`), presença de `print:hidden` nos wrappers (`KitSummary.tsx:99,293`, `KitBuilderPage.tsx:156`), aviso print-only (`KitSummary.tsx:252–291`), `eagerImages` (`:21–26`).
- Aceite: ≥ 5 casos verdes.
- Prova: comando + contagem.
- Depende de: —. Esforço: P.

### E13 — Prova visual do print preview
- Objetivo: o commit `f21dceb53` admite "não consegui capturar o print preview"; a Prova da etapa 20 nunca foi entregue.
- Onde: `e2e/visual/kit-maker-print.spec.ts` (novo); `docs/audits/KIT_MAKER_PRINT_2026-09/`.
- Como: Playwright `page.emulateMedia({ media: 'print' })` + `page.pdf({ format: 'A4' })` na Revisão com catálogo mockado (mesmo padrão de `e2e/routes/app/kit-builder.spec.ts:62–74`); contar páginas do PDF.
- Aceite: PDF com ≤ 2 páginas para kit de 6 itens; sem `header/nav/aside` renderizados.
- Prova: PDF anexado no repo (docs/audits) + spec verde.
- Depende de: E12. Esforço: M.

### E14 — Decisão registrada: `break-inside-avoid` × "1–2 páginas"
- Objetivo: o 2º commit da #1890 trocou `print:break-after-page` por `break-inside-avoid` (`KitPresentablePreview.tsx:184–188`) e o código admite que 1–2 páginas "não é garantia matemática" (`:98–101`); o corpo do PR ainda diz `break-after-page`.
- Onde: `docs/plans/KIT_MAKER_PLANO_FINALIZACAO_20_ETAPAS_2026-09-23.md` (etapa 20) + comentário no PR #1890.
- Como: registrar o trade-off; se E13 mostrar > 2 páginas em kit real, abrir etapa de paginação.
- Aceite: decisão escrita; PR #1890 comentado.
- Prova: diff do doc + comentário.
- Depende de: E13. Esforço: P.

---

## Bloco B — Kit Maker: validação real com sessão autenticada (E15–E30)

### E15 — `[PO]` Usuário dedicado `kitmaker.e2e` e cliente descartável
- Objetivo: bloqueio B1; sem ele, tudo abaixo roda com o usuário E2E genérico e polui relatórios comerciais.
- Onde: Supabase Auth do canônico; `docs/references/kit-maker/E2E_CREDENCIAIS.md` (novo, sem senha).
- Como: PO/TI cria o usuário e o cliente "E2E — não faturar"; secrets `E2E_KITMAKER_EMAIL`/`E2E_KITMAKER_PASSWORD` no repo.
- Aceite: `SELECT` do perfil/papel anexado; usuário ausente dos relatórios comerciais.
- Prova: doc + SQL.
- Depende de: PO. Esforço: P.

### E16 — Fixture de auth do Kit Maker reaproveitando `auth.setup.ts`
- Objetivo: não duplicar o mecanismo — `e2e/fixtures/auth.setup.ts:18–65` + `requireAuth()` (`test-base.ts:171–191`) já resolvem `storageState` e `skip` explícito.
- Onde: `e2e/fixtures/kit-maker-auth.ts` (novo) lendo `E2E_KITMAKER_*` com fallback para `E2E_USER_*`.
- Como: `requireKitMakerAuth()` = `requireAuth()` com prioridade ao usuário dedicado.
- Aceite: sem secret → `skipped` com motivo; com secret → logado.
- Prova: run do workflow (E21).
- Depende de: E15 (fallback funciona sem ele). Esforço: P.

### E17 — Aposentar `e2e/kit-builder.spec.ts` obsoleto
- Objetivo: roda em `full-ci.yml:128` (`chromium-authed`), usa a rota legada `/kit-builder` (hoje `Navigate` para `/montar-kit`, `src/routes/tools-routes.tsx:45`) e 13 `data-testid` inexistentes em `src/` — é verde só porque é pulado sem credencial.
- Onde: `e2e/kit-builder.spec.ts`; `.github/workflows/full-ci.yml:128`.
- Como: remover o spec; apontar o workflow para E18.
- Aceite: `grep -rn "wizard-step-box\|kit-summary-total" e2e/` → 0.
- Prova: run verde do `full-ci.yml`.
- Depende de: E18. Esforço: P.

### E18 — Spec real do Fluxo 1 (itens → caixas → personalização → revisão)
- Objetivo: nenhum E2E passa da landing; o CTA "Ver caixas compatíveis" (`ItemSelector.tsx:512–513`) nunca foi asserido.
- Onde: `e2e/flows/06-kit-builder-fluxo1.spec.ts` (novo).
- Como: 3 itens reais; assert do CTA desabilitado com 0 e habilitado com ≥ 1; caixa recomendada; 1 personalização; Revisão com asserts numéricos (subtotal, ocupação) — não só texto.
- Aceite: spec verde com credencial; `skipped` sem.
- Prova: run do CI.
- Depende de: E16. Esforço: M.

### E19 — Selo "Fluxo 2" visível nos 4 passos
- Objetivo: o Aceite da etapa 04 exige o selo nos 4 passos; hoje só existe no passo Itens (`ItemSelector.tsx:167–172`).
- Onde: `BoxSelector.tsx`, `PersonalizationConfig.tsx`, `KitSummary.tsx`.
- Como: elevar o Badge para o wrapper do wizard (`KitBuilderPage.tsx`) condicionado a `flow === 'box-first'`.
- Aceite: 4 passos com o selo; Fluxo 1 sem.
- Prova: teste de página + E20.
- Depende de: —. Esforço: P.

### E20 — Spec real do Fluxo 2 (caixa → itens compatíveis → revisão)
- Objetivo: só existe assert de visibilidade do botão "começar pela caixa" (`e2e/routes/app/kit-builder.spec.ts:83`).
- Onde: `e2e/flows/06-kit-builder-fluxo2.spec.ts` (novo).
- Como: filtro dimensional mín/máx; escolher caixa; confirmar que "apenas itens que cabem" reduz o catálogo; selo nos 4 passos; concluir.
- Aceite: spec verde.
- Prova: run do CI.
- Depende de: E16, E19. Esforço: M.

### E21 — Workflow `kit-maker-e2e.yml` com `skipped` documentado
- Objetivo: nenhum workflow roda a suíte do Kit Maker de forma nomeada; os specs só entram na regressão genérica quando há credencial.
- Onde: `.github/workflows/kit-maker-e2e.yml` (novo).
- Como: mesmo gate de `e2e-flows.yml:92` (`vars.E2E_USER_EMAIL`); job com step "Setup auth state"; summary listando specs `skipped` e motivo.
- Aceite: run verde com secret; run verde com `skipped` explícito sem secret.
- Prova: 2 runs citados.
- Depende de: E18, E20. Esforço: P.

### E22 — Orçamento real ponta a ponta inspecionado no banco
- Objetivo: nunca se inspecionou um orçamento criado pelo Kit Maker; `kit_quote_requests` foi **excluída do gate** (#1860, "exceção source-scoped") em vez de verificada.
- Onde: `tests/edge-functions/live/kit-quote.test.ts` (novo) chamando a RPC `create_kit_quote_transactional`.
- Como: criar com o usuário E15; `SELECT` em `quotes`, `quote_items`, `kit_quote_requests`: cliente, variante, personalizações válidas, `notes` com etiqueta + observações, kit de origem.
- Aceite: todo dado da Revisão está no registro.
- Prova: SQL anexada em `docs/audits/KIT_MAKER_ORCAMENTO_REAL_2026-09.md`.
- Depende de: E15, E18. Esforço: M.

### E23 — Idempotência real no banco
- Objetivo: só existe unit test mockado (`tests/pages/kit-builder/useKitBuilderQuote.test.ts:349–384`) e string-match da migration (`tests/contracts/kit-maker-quote-idempotency-migration.test.ts:14`).
- Onde: mesmo teste de E22.
- Como: 2ª chamada com o mesmo `_request_id`; assert de mesmo recibo e `count(*)` inalterado.
- Aceite: 0 duplicatas.
- Prova: SQL antes/depois.
- Depende de: E22. Esforço: P.

### E24 — Remover a exceção source-scoped de `kit_quote_requests`
- Objetivo: depois de E22/E23 a tabela deixa de precisar de exceção no gate de catálogo.
- Onde: `audit/supabase-reference-catalog.temporary.json` e o gate que a lê (ver corpo do commit `847db8457`).
- Como: remover a entrada; recapturar via `pg_catalog`.
- Aceite: gate verde sem exceção.
- Prova: run do gate.
- Depende de: E22. Esforço: P.

### E25 — RLS: usuário B não abre kit de A por id direto
- Objetivo: padrão já existe para orçamentos (`e2e/flows/04ci-discount-approval-rls-cross-quote.spec.ts:36–80`), nunca aplicado a `custom_kits`.
- Onde: `e2e/flows/06-kit-builder-rls.spec.ts` (novo).
- Como: PATCH/GET REST com JWT do usuário B contra `custom_kits.id` de A → 0 linhas ou 401/403.
- Aceite: 2 cenários verdes (leitura e escrita).
- Prova: run do CI.
- Depende de: E27. Esforço: P.

### E26 — Duas abas + autosave sem perder a edição mais recente (R01/R33)
- Objetivo: padrão em `04cf-discount-approval-multi-tab.spec.ts:1–60`; `tests/lib/kit-builder-atomic-persistence.test.ts:41–86` só testa com mock.
- Onde: `e2e/flows/06-kit-builder-multitab.spec.ts` (novo).
- Como: `context.newPage()` ×2, editar o mesmo kit, salvar em ordem invertida; assert de `revision` e conteúdo final.
- Aceite: edição mais recente vence; nenhuma perda silenciosa.
- Prova: run do CI.
- Depende de: E16. Esforço: M.

### E27 — Segundo `storageState` no Playwright
- Objetivo: `playwright.config.ts:81–122` referencia um único `e2e/.auth/storageState.json`; não há `E2E_USER_B`.
- Onde: `playwright.config.ts`, `e2e/fixtures/auth.setup.ts`.
- Como: setup B opcional gravando `storageState-b.json`; skip explícito sem `E2E_USER_B_EMAIL`.
- Aceite: projeto `chromium-authed-b` disponível.
- Prova: `npx playwright test --list-projects`.
- Depende de: E15 (2º usuário) — pode usar o genérico como A e o dedicado como B. Esforço: P.

### E28 — Viewports 1440 e 1024 no Playwright
- Objetivo: nenhum projeto usa 1440 ou 1024 (`playwright.config.ts:42–136`: só 1280×720, Pixel 5, iPhone 12).
- Onde: `playwright.config.ts`.
- Como: projeto `visual-desktop-1440`, `visual-tablet-1024`, reutilizar `mobile-safari` (390).
- Aceite: 3 projetos listados.
- Prova: `--list-projects`.
- Depende de: —. Esforço: P.

### E29 — 24 baselines visuais do Kit Maker
- Objetivo: 0 `toHaveScreenshot` com kit em `e2e/`; `visual-tests.yml:54` lista 20 specs, nenhum do módulo.
- Onde: `e2e/visual/kit-maker.spec.ts` (novo) + snapshots.
- Como: 8 superfícies (Landing, Itens, Caixas compatíveis, Escolha da caixa, Personalização, Revisão, Biblioteca, IA) × 3 viewports; máscara em preço/data; `maxDiffPixelRatio: 0.002`.
- Aceite: 1º run gera; 2º run verde.
- Prova: artefatos do job.
- Depende de: E16, E28. Esforço: M.

### E30 — Registrar os specs de kit no gate visual
- Objetivo: `.github/workflows/visual-tests.yml:54` e `scripts/check-visual-tests-specs.mjs` não conhecem o Kit Maker.
- Onde: os dois arquivos.
- Como: adicionar `e2e/visual/kit-maker.spec.ts` e `kit-maker-print.spec.ts`.
- Aceite: `check-visual-tests-specs.mjs` verde.
- Prova: run.
- Depende de: E29, E13. Esforço: P.

---

## Bloco C — Kit Maker: mobile, acessibilidade e aceite (E31–E40)

### E31 — Chips de filtro viram scroll horizontal em 390 px
- Objetivo: `ItemSelector.tsx:247` e `BoxSelector.tsx:414` usam `flex flex-wrap gap-2 overflow-x-auto` — com `flex-wrap`, o `overflow-x-auto` é inócuo e os chips quebram em linhas (o oposto do pedido).
- Onde: os dois arquivos.
- Como: `flex-nowrap overflow-x-auto` abaixo de `md`, `flex-wrap` acima; padrão já usado em `PersonalizationConfig.tsx:1020`.
- Aceite: em 390 px, chips em 1 linha rolável.
- Prova: baseline 390 (E29) + teste de classe.
- Depende de: —. Esforço: P.

### E32 — Tabela da Revisão com `overflow-x-auto`
- Objetivo: `kit-summary/KitCompositionCard.tsx:102` é `<table class="w-full">` com 4 colunas sem wrapper — candidata a scroll horizontal da página em 390 px.
- Onde: o arquivo.
- Como: wrapper `div.overflow-x-auto`; `<caption>` (ver E35).
- Aceite: sem scroll horizontal da página em 390.
- Prova: baseline 390 + `e2e/routes/app/kit-builder.spec.ts:134–141` estendido para a Revisão.
- Depende de: —. Esforço: P.

### E33 — Alvo de toque ≥ 44 px nos steppers
- Objetivo: `SelectedItemsBadges.tsx:127–155` usa `h-5 w-5` (20 px) nos botões de quantidade.
- Onde: o arquivo.
- Como: `h-9 w-9` em mobile, `h-7` em desktop; manter `aria-label`.
- Aceite: axe sem `target-size` serious.
- Prova: E36.
- Depende de: —. Esforço: P.

### E34 — Chips navegáveis por teclado
- Objetivo: chips são `<Badge onClick>` (div) sem `role="button"`, `tabIndex`, `onKeyDown` ou `aria-pressed` (`ItemSelector.tsx:247–249`, `BoxSelector.tsx:414–417`).
- Onde: os dois arquivos.
- Como: trocar por `<button type="button" aria-pressed>` estilizado como Badge (padrão já usado nos cards de técnica, `PersonalizationConfig.tsx:550–565`).
- Aceite: Tab alcança cada chip; Enter/Espaço alterna.
- Prova: E36 + E37.
- Depende de: —. Esforço: P.

### E35 — Tabela da Revisão com `caption`/`aria-label`
- Objetivo: `KitCompositionCard.tsx:102–110` tem `<thead>/<th>` mas sem nome acessível.
- Onde: o arquivo.
- Como: `<caption class="sr-only">Composição do kit</caption>`.
- Aceite: axe sem `table-fake-caption`/`empty-table-header`.
- Prova: E36.
- Depende de: —. Esforço: P.

### E36 — Teste axe nas 4 telas do builder
- Objetivo: `tests/components/kit-builder/a11y.test.tsx` não existe; o helper `tests/a11y/axe-helper.ts` (jest-axe, WCAG 2.1 AA) nunca foi usado no Kit Maker.
- Onde: `tests/components/kit-builder/a11y.test.tsx` (novo).
- Como: render de Itens, Caixas, Personalização e Revisão com mocks; `expect(await axe(container)).toHaveNoViolations()` filtrando `serious`/`critical`.
- Aceite: 0 violações serious/critical.
- Prova: saída do axe no PR.
- Depende de: E33, E34, E35. Esforço: M.

### E37 — E2E de navegação por Tab
- Objetivo: só existe `basicA11yChecks` heurístico na Landing (`e2e/routes/_shared.ts:99–135`).
- Onde: `e2e/flows/06-kit-builder-a11y.spec.ts` (novo).
- Como: percorrer com `Tab` os controles do passo Itens e da Revisão; assert de foco visível e ordem.
- Aceite: spec verde.
- Prova: run.
- Depende de: E34. Esforço: P.

### E38 — Baselines 390 aprovadas nas 8 telas
- Objetivo: fechar a etapa 09 do plano anterior de verdade.
- Onde: snapshots de E29.
- Como: corrigir o que as baselines acusarem (E31, E32, E33 já cobrem o conhecido).
- Aceite: job visual verde em 390 para as 8 telas.
- Prova: run.
- Depende de: E29, E31, E32. Esforço: M.

### E39 — `[PO]` Aceite visual mockup × produção
- Objetivo: `docs/audits/KIT_MAKER_ACEITE_VISUAL_2026-09.md` não existe; o único doc marca o aceite como "pertence ao PO" (`KIT_MAKER_REVISAO_100_ETAPAS_2026-09-12.md:133`).
- Onde: o documento (novo).
- Como: tabela tela × viewport com captura do mockup ao lado da produção; Aceita/Ajustar.
- Aceite: 8 telas revisadas pelo PO.
- Prova: documento preenchido.
- Depende de: E29, PO. Esforço: P.

### E40 — `[PO]` Selos comerciais por regra de dado (B2)
- Objetivo: `commercial-badges.ts` e `tests/lib/kit-commercial-badges.test.ts` não existem; invariante 3 respeitado até aqui (0 selos inventados em `BoxSelector.tsx`).
- Onde: `src/lib/kit-builder/commercial-badges.ts` (novo) + uso em `BoxSelector.tsx`.
- Como: após decisão do PO, `deriveCommercialBadges(caixa, contexto)` pura; regras propostas no plano anterior (≥ N kits em 90 dias → Mais usada; menor preço → Econômica; material reciclado → Sustentável; ≥ P75 → Premium); máximo 1 selo comercial + 1 de compatibilidade.
- Aceite: testes de tabela por regra + caso sem dado → `[]`.
- Prova: `tests/lib/kit-commercial-badges.test.ts`.
- Depende de: PO. Esforço: M.

---

## Bloco D — Kit Maker: robustez e escala (E41–E50)

### E41 — Chunking do `IN` na projeção de estoque
- Objetivo: `fetchKitStockVariants(itemProductIds)` (`useKitBuilderQueries.ts:300–307`) vira `query.in(...)` GET sem chunking (`src/lib/db/postgrest.ts:516`, 0 hits para `chunk|MAX_IN|414`); com ~6,7 k produtos ativos ≈ 240 KB de query-string. Se o gateway devolver 414/400, `itemStockErrored=true` e **todo** card mostra "Estoque desconhecido".
- Onde: `useKitStockValidation.ts:35–61`, `postgrest.ts:516`.
- Como: chunks de 200 ids (limite seguro de URL) em `Promise.all`; agregação preservada.
- Aceite: catálogo inteiro sem 414; N requisições = ceil(ids/200), ainda "por catálogo", não por card.
- Prova: teste com 2.000 ids mockados contando chamadas (hoje o teste usa 3).
- Depende de: —. Esforço: M.

### E42 — Teste de escala do estoque
- Objetivo: `tests/hooks/useKitBuilderQueries.test.ts:151–210` cobre 3 produtos.
- Onde: o mesmo arquivo.
- Como: caso com 2.000 ids; assert de chunking e de `STOCK_PAGE_SIZE=500` paginando.
- Aceite: verde; contagem de chamadas explícita.
- Prova: comando + contagem.
- Depende de: E41. Esforço: P.

### E43 — `weight_g = 0` tratado como desconhecido, não como zero conhecido
- Objetivo: `useKitBuilderTransformers.ts:102,141` faz `weight_g ?? undefined`; um `0` real contaria como "peso conhecido = 0". Hoje 0 linhas com peso 0, mas é uma regra frágil.
- Onde: o transformer.
- Como: `weight_g > 0 ? weight_g : undefined` com comentário de origem (dado de fornecedor não usa 0 como valor válido).
- Aceite: item com `weight_g=0` entra em `itemsWithUnknownWeight`.
- Prova: caso novo em `useKitBuilderTransformers.test.ts` (hoje 3 testes, nenhum de estoque/peso).
- Depende de: —. Esforço: P.

### E44 — Teste de integração `KitSummary → FreightEstimator`
- Objetivo: a contagem `itemsWithUnknownWeight` (`KitSummary.tsx:81–85` → `:243`) não tem teste no nível do container; só prop-level no `FreightEstimator`.
- Onde: `tests/components/kit-builder/KitSummary.test.tsx`.
- Como: kit com 2 itens sem peso e caixa sem peso → aviso "3 itens sem peso cadastrado".
- Aceite: verde.
- Prova: comando.
- Depende de: —. Esforço: P.

### E45 — Contagem de produtos sem peso atualizada (637 → 657)
- Objetivo: dado real de 24/09: `weight_g IS NULL` = 657 ativos, `= 0` → 0.
- Onde: `docs/plans/KIT_MAKER_PLANO_FINALIZACAO_20_ETAPAS_2026-09-23.md:25,151`.
- Como: corrigir com a data da medição e a SQL.
- Aceite: doc atualizado.
- Prova: diff.
- Depende de: —. Esforço: P.

### E46 — Vocabulário de estoque unificado entre card e Revisão
- Objetivo: erro de rede aparece como "Estoque desconhecido" no card (`ItemCard.tsx:48–75`) e como "Não foi possível validar o estoque" na Revisão (`KitSummary.tsx:155`).
- Onde: os dois + `SelectedItemsBadges.tsx:63` ("Indisponível").
- Como: constante `STOCK_LABELS` em `src/lib/kit-builder/types.ts`; 4 estados + erro com o mesmo texto nas 3 superfícies.
- Aceite: grep mostra 1 fonte.
- Prova: testes existentes + snapshot de texto.
- Depende de: —. Esforço: P.

### E47 — Teste do `BoxSelector` digitando no input de busca
- Objetivo: cobertura da busca por SKU/material está só no hook (`useKitBuilderQueries.test.ts:241–326`); nenhum teste digita no input.
- Onde: `tests/components/kit-builder/BoxSelector.search.test.tsx` (novo).
- Como: `userEvent.type` com SKU; assert de `onFiltersChange` (`BoxSelector.tsx:114–117`).
- Aceite: verde.
- Prova: comando.
- Depende de: —. Esforço: P.

### E48 — Remover resíduos de `v_kit_component_print_areas`
- Objetivo: `src/lib/external-db/tables.ts:126` ainda lista a view e `types.ts:47655` tipa `v_kit_component_print_areas_public`, ambas sem uso de runtime (0 ativos cobertos).
- Onde: os dois arquivos.
- Como: remover de `tables.ts`; no `types.ts` só via regeneração com `check:types-inventory-drift` + allowlist (REGRA #4) — **não editar à mão**.
- Aceite: `grep v_kit_component_print_areas src/` → só `types.ts` até a próxima regeneração legítima.
- Prova: gate de inventário verde.
- Depende de: —. Esforço: P.

### E49 — Precedente de leitura direta de `print_area_techniques` documentado
- Objetivo: o fallback lê a tabela direto via PostgREST como `authenticated`; só encontrei `GRANT SELECT … TO anon` (`20260717143414`). Precedente em `src/hooks/simulation/usePrintAreas.ts:34`.
- Onde: `docs/SCHEMA_REFERENCE.md` §8 (query canônica) + comentário no hook.
- Como: confirmar GRANT/RLS via `pg_catalog` (nunca PostgREST); registrar.
- Aceite: consulta anexada; se faltar GRANT, abrir migration via `db-apply-migration.yml` com `APROVADO`.
- Prova: SQL.
- Depende de: —. Esforço: P.

### E50 — `[PO]` Curadoria dos templates de kit
- Objetivo: `KitTemplates.tsx` tem 4 templates hardcoded; o plano anterior listava 6 como fora de escopo. Decidir se entra.
- Onde: `src/components/kit-builder/KitTemplates.tsx`.
- Como: PO define os 6; migrar para dado (tabela ou JSON versionado) com regra.
- Aceite: decisão registrada.
- Prova: doc.
- Depende de: PO. Esforço: M.

---

## Bloco E — Revista: gaps das duas auditorias (E51–E62)

### E51 — Teste "token de revista despublicada → 401" nas 4 edges públicas
- Objetivo: nenhuma das 4 (`magazine-public-view`, `-public-react`, `-reader-state-read`, `-reader-state-write`) tem teste automatizado desse cenário; um refactor futuro pode reintroduzir o fail-open fechado em #1899 sem sinal.
- Onde: `tests/edge-functions/live/descriptors.ts` (0 matches para "magazine" hoje).
- Como: descriptor por edge com fixture de revista `draft` + token → assert 401 `invalid_or_expired`.
- Aceite: 4 testes verdes com credencial; `skip` sem.
- Prova: run do `Edge Function Integration Tests`.
- Depende de: E52. Esforço: M.

### E52 — Descriptors dedicados para as 4 edges de revista
- Objetivo: as 4 caem no `DEFAULT` do runner (`_live-suite.ts`), cobrindo só CORS/auth/inputs malformados.
- Onde: `descriptors.ts`.
- Como: happy path mínimo por edge (revista `published` de fixture).
- Aceite: 4 entradas.
- Prova: run.
- Depende de: —. Esforço: P.

### E53 — Teste dedicado de `page_order === null`
- Objetivo: nenhum teste assere `magazine.pageOrder === null` após ler `page_order: null`; uma regressão no `if (value === null) return true` (`src/types/magazine.ts:241`) passaria.
- Onde: `src/services/__tests__/magazineService.pageOrder.test.ts` (novo).
- Como: leitura com `null` → `pageOrder === null`; `update({ pageOrder: null })` chega à RPC como `null`.
- Aceite: 2 casos verdes.
- Prova: comando.
- Depende de: —. Esforço: P.

### E54 — `magazine-schema.ts`: `subtitle`/`status`/`view_count` alinhados ao banco
- Objetivo: confirmado ao vivo que as 3 colunas são `NOT NULL`; o tipo local diz nullable (direção "segura", deixada de fora por decisão de escopo em #1899).
- Onde: `src/integrations/supabase/magazine-schema.ts:45,46,50`.
- Como: `subtitle: string`, `status: string`, `view_count: number`; rodar tsc — qualquer erro revela consumidor que tratava null indevidamente.
- Aceite: tsc limpo; `information_schema.columns` anexado.
- Prova: SQL + tsc.
- Depende de: —. Esforço: P.

### E55 — Decidir a remoção de `magazine-schema.ts`
- Objetivo: o próprio arquivo diz "se/quando o `types.ts` voltar a conter as tabelas, este módulo pode ser removido" — o gate `magazine-typed-queries` confirma `magazines: {` e `magazine_items: {` em `types.ts` há vários runs.
- Onde: `magazine-schema.ts`, `magazineService.ts` (2 usos de `magazineDb`).
- Como: PR de remoção com `magazineDb` → `supabase`; manter o gate como sentinela contra nova perda das tabelas (REGRA #4).
- Aceite: tsc limpo; gate verde; 831/831.
- Prova: comando + contagem.
- Depende de: E54. Esforço: M.

### E56 — Renomear `magazine-guard.ts` → `magazine-input-validation.ts`
- Objetivo: nome sugere guarda de publicação; é validação de input de edição (comentário já esclarece desde #1899).
- Onde: `src/lib/security/magazine-guard.ts` + 3 imports + teste (79 casos).
- Como: `git mv` + ajuste de imports; manter export names.
- Aceite: tsc + 79/79.
- Prova: comando.
- Depende de: —. Esforço: P.

### E57 — Anotação `z.ZodType<Partial<T>>` nos 2 schemas sem ela
- Objetivo: `magazineClientBrandingSchema` e `magazineProductSnapshotSchema` não têm a anotação que `magazineContentSettingsSchema` tem (`magazine.ts:94`) — foi assim que `category: z.string()` passou despercebido até a 2ª auditoria.
- Onde: `src/types/magazine.ts:123–132, 181–210`.
- Como: anotar; onde a inferência divergir (ex.: `dimensions`), ajustar o schema, não remover a anotação.
- Aceite: tsc limpo com as 3 anotações.
- Prova: comando.
- Depende de: —. Esforço: P.

### E58 — Custo do `safeParse` em `magazineService.list()`
- Objetivo: `list()` (`magazineService.ts:371–394`) roda até 2 `safeParse` por item de **todas** as revistas do usuário (até 500 itens/revista); trabalho novo desde #1899, nunca medido.
- Onde: `magazineService.ts` `rowToItem`.
- Como: benchmark com 50 revistas × 100 itens; se > 50 ms, validar só em `get()` ou amostrar.
- Aceite: número medido no PR.
- Prova: script de benchmark anexado.
- Depende de: —. Esforço: P.

### E59 — Escopo do script `test:magazine` inclui os testes que o PR toca
- Objetivo: `npm run test:magazine` (790) não cobre `src/lib/security/__tests__/magazine-guard.test.ts` (79) — o commit `35c263917` alegou 831 rodando um glob manual mais amplo.
- Onde: `package.json:75`.
- Como: adicionar o caminho ao script.
- Aceite: `test:magazine` → 869.
- Prova: comando + contagem.
- Depende de: —. Esforço: P.

### E60 — Rate limiter das edges públicas de revista: fail-open avaliado
- Objetivo: `readLimiter` em `magazine-reader-state-read/index.ts:28` não passa `failClosed` → erro de DB no rate limiter libera a requisição (`_shared/rate-limiter.ts:41–46`). Aceitável para leitura de bookmarks; decidir para `-write` e `-react`.
- Onde: os 4 `index.ts`.
- Como: `failClosed: true` em `-write`/`-react` (escrita pública); manter fail-open em leitura; documentar.
- Aceite: decisão + deploy via workflow.
- Prova: `get_edge_function` × git idêntico; drift check verde.
- Depende de: —. Esforço: P.

### E61 — Alerta de shape drift da revista
- Objetivo: o `logger.warn('[magazineService] shape drift …')` só existe se alguém olhar o console.
- Onde: N8N + Logflare (pipeline já usado por `structured-logger.ts`).
- Como: query salva por `message ILIKE '%shape drift%'`; alerta diário se > 10.
- Aceite: alerta disparado em teste com dado legado.
- Prova: execução do workflow N8N.
- Depende de: —. Esforço: P.

### E62 — TOCTOU das 4 edges registrado como aceito
- Objetivo: check-then-serve (published em T1, despublicada em T2, leitura em T3) existe nas 4; é o padrão do módulo, não regressão. Precisa estar escrito.
- Onde: `docs/SCHEMA_REFERENCE.md` ou `docs/audits/MAGAZINE_AUDITORIA_2026-09-24.md` (E96).
- Como: parágrafo com a janela e o motivo de aceitar (milissegundos; dado não sensível).
- Aceite: texto no doc.
- Prova: diff.
- Depende de: E96. Esforço: P.

---

## Bloco F — Edge functions: deploy, drift e ledger (E63–E74)

### E63 — Deploy no push para `main` só das funções alteradas
- Objetivo: `deploy-edge-functions.yml` sem `function_name` redeploya as 108 funções a cada merge que toque `supabase/functions/**` — `max-parallel: 4`, sem retry, e destrói o sinal "atualizada há X" que expôs o caso `kit-ai-builder`.
- Onde: `.github/workflows/deploy-edge-functions.yml:22–28, 48–76`.
- Como: no evento `push`, calcular a matriz via `git diff --name-only ${{ github.event.before }} ${{ github.sha }} -- supabase/functions/` → slugs; mudança em `_shared/` → todas (com aviso no summary).
- Aceite: merge tocando 1 função → 1 job de deploy.
- Prova: run após merge deste PR.
- Depende de: —. Esforço: M.

### E64 — Retry com backoff no deploy
- Objetivo: 108 chamadas à Management API sem retry; sem evidência de rate-limit, mas sem proteção.
- Onde: o mesmo workflow, step `Deploy`.
- Como: 3 tentativas com 5/15/45 s em `supabase functions deploy`.
- Aceite: falha transitória simulada → sucesso na 2ª.
- Prova: run.
- Depende de: E63. Esforço: P.

### E65 — Drift check também no push para `main`
- Objetivo: hoje só em PR que toca `supabase/functions/**` e no cron diário — drift silencioso entre execuções é lacuna real.
- Onde: `.github/workflows/edge-functions-drift-check.yml`.
- Como: trigger `push: branches: [main]` após o deploy (via `workflow_run`).
- Aceite: run automático pós-merge.
- Prova: run.
- Depende de: E63. Esforço: P.

### E66 — `supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md` (recibo de deploy)
- Objetivo: migrations têm `MIGRATIONS_SYNC_LOG.md`; edge functions não têm ledger — foi isso que permitiu `kit-ai-builder` v285 e `magazine-reader-state-read` v39 fora do git.
- Onde: arquivo novo + step no workflow que abre PR com a linha (mesmo padrão do E15 do plano DBA).
- Como: linha por deploy: data, slug, versão (`get_edge_function.version`), SHA do git, run id, quem.
- Aceite: 1 linha por deploy futuro.
- Prova: PR automático.
- Depende de: E63. Esforço: M.

### E67 — Retro-registrar os 2 casos de deploy fora do fluxo
- Objetivo: histórico do ledger começa com o que já se sabe.
- Onde: `EDGE_FUNCTIONS_DEPLOY_LOG.md`.
- Como: entradas para `kit-ai-builder` (v285, timeout 20 s, reconciliado em `7899b0254`) e `magazine-reader-state-read` (v39–v42, reconciliado em `558b30daf` + run 36015927545).
- Aceite: 2 linhas.
- Prova: diff.
- Depende de: E66. Esforço: P.

### E68 — Drift check manual das 108 funções, anexado
- Objetivo: a auditoria só conseguiu evidência negativa por grep de commits; nunca se comparou hash das 108 de uma vez fora do CI.
- Onde: `edge-functions-drift-check.yml` (`workflow_dispatch`).
- Como: rodar; anexar `drift-report.csv` em `docs/audits/EDGE_DRIFT_2026-09.md`.
- Aceite: 0 DRIFT ou lista com plano por slug.
- Prova: artefato.
- Depende de: —. Esforço: P.

### E69 — Lint contra trailing whitespace em `supabase/functions/`
- Objetivo: o drift byte-a-byte de 24/09 foi trailing whitespace em `_shared/cors.ts:110,139,174,215,233,239` e `_shared/rate-limiter.ts:24,53` — qualquer ferramenta que normalize espaço (a MCP normalizou) diverge do git.
- Onde: `.editorconfig`, `eslint.config.js` (bloco deno) ou `scripts/check-trailing-ws.mjs` + pre-commit.
- Como: `trim_trailing_whitespace = true` + gate; limpar os 8 pontos num commit só de whitespace **e** redeployar via workflow as funções afetadas (102 importam `cors.ts`).
- Aceite: gate verde; drift check verde após redeploy.
- Prova: 2 runs.
- Depende de: E63 (deploy só dos alterados — aqui `_shared/` = todas, então aguardar E63/E64). Esforço: M.

### E70 — Teste da allowlist de `verify_jwt=false`
- Objetivo: `check-edge-verify-jwt-allowlist.mjs` passa (36 funções); não há teste que falhe se `magazine-reader-state-read` sair da allowlist ou `config.toml`.
- Onde: `tests/scripts/check-edge-verify-jwt-allowlist.test.mjs` (novo, mutation-tested como o de inventário).
- Como: simular remoção de uma entrada → gate falha.
- Aceite: teste verde.
- Prova: comando.
- Depende de: —. Esforço: P.

### E71 — `check:edge-source-hash` local antes do push
- Objetivo: detectar drift antes do CI, sem esperar o job de 3 min.
- Onde: `scripts/check-edge-source-hash.mjs` + `npm run check:edge-source-hash -- <slug>`.
- Como: `supabase functions download --use-api` para tmp + `sha256sum` manifest como o workflow (`edge-functions-drift-check.yml`).
- Aceite: mesma saída do CI localmente.
- Prova: execução contra `magazine-reader-state-read` (aligned).
- Depende de: —. Esforço: P.

### E72 — Comentários históricos de incidente removidos do source deployado
- Objetivo: o bloco "FIX 2026-07-12 … retry_marker=2" só existia para forçar um deploy; conteúdo assim vira ruído e fonte de drift.
- Onde: `grep -rn "retry_marker\|FIX 2026-0" supabase/functions/`.
- Como: mover para `docs/audits/` ou para o ledger (E66); remover do source; redeploy via workflow.
- Aceite: 0 hits.
- Prova: grep + drift check.
- Depende de: E63. Esforço: P.

### E73 — `docs/db/POLITICA_EDGE_DEPLOY.md`
- Objetivo: análogo de `POLITICA_DDL.md` para funções; o corolário no CLAUDE.md é a regra, falta o procedimento.
- Onde: doc novo.
- Como: 3 condições para deploy de emergência via MCP/dashboard: (a) ticket, (b) commit de reconciliação no mesmo dia, (c) rerun do drift check; fluxo normal = `workflow_dispatch`.
- Aceite: doc referenciado no CLAUDE.md.
- Prova: diff.
- Depende de: —. Esforço: P.

### E74 — CODEOWNERS para `supabase/functions/_shared/`
- Objetivo: 5 arquivos compartilhados por 102 funções; mudança ali redeploya tudo.
- Onde: `.github/CODEOWNERS` (arquivo protegido — alteração com razão explícita).
- Como: entrada `supabase/functions/_shared/* @adm01-debug`.
- Aceite: PR tocando `_shared/` exige revisão.
- Prova: PR de teste.
- Depende de: —. Esforço: P.

---

## Bloco G — CI: gates e higiene (E75–E86)

### E75 — `e2e-cnpj.yml` instala os browsers que a matriz usa
- Objetivo: `.github/workflows/e2e-cnpj.yml:43` roda `playwright install --with-deps chromium`, mas a matriz usa `firefox-public` e `mobile-safari` — o job falha em `main` desde 28/08 (documentado no PR #1898).
- Onde: o workflow.
- Como: `playwright install --with-deps chromium firefox webkit` ou restringir a matriz.
- Aceite: job verde em `main`.
- Prova: run.
- Depende de: —. Esforço: P.

### E76 — Vercel preview `promo-gifts-v4`: causa raiz ou status não bloqueante
- Objetivo: B5 — `BUILD_FAILED / Resource provisioning failed` em ~2 s em todo push dos PRs #1898/#1899 enquanto o projeto irmão builda o mesmo commit.
- Onde: projeto Vercel `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`.
- Como: inspecionar via MCP Vercel (`get_deployment`, build logs); se for cota/plano, registrar e marcar o status como não obrigatório na branch protection; se for config, corrigir.
- Aceite: preview verde ou status explicitamente informativo.
- Prova: deployment id + decisão.
- Depende de: —. Esforço: M.

### E77 — Gate de bundle calibrado por chunk
- Objetivo: relatório mostra `icons-vendor −100 %`, `KitBuilderPage +199 %`, `crm +13319 %` com total −2 % — reorganização de chunks, mas `check-bundle-size.mjs` diz "mesmo gate bloqueante" por chunk (> 15 % 🔴) e não bloqueou.
- Onde: `scripts/check-bundle-size.mjs`.
- Como: decidir se o gate é por total ou por chunk crítico; alinhar o texto do relatório à regra real.
- Aceite: regra e relatório coerentes.
- Prova: run.
- Depende de: —. Esforço: P.

### E78 — Detector de spec E2E órfão
- Objetivo: `magazine-preview-sticky.spec.ts` ficou meses sem rodar (nome fora de `testMatch: [/smoke\.spec\.ts/]` **e** tag `@smoke` excluída por `--grep-invert`). Achado pontual; não há detector.
- Onde: `scripts/check-e2e-orphans.mjs` + workflow.
- Como: listar specs via `playwright test --list` por projeto/workflow e cruzar com `e2e/**/*.spec.ts`; falhar se algum spec não pertence a nenhum job.
- Aceite: 0 órfãos.
- Prova: run.
- Depende de: —. Esforço: M.

### E79 — Invariante 5 automatizado: corpo do PR cita comando
- Objetivo: 3 PRs sem prova, 3 só com nome de arquivo.
- Onde: `.github/workflows/pr-body-check.yml` (novo) ou `commitlint`.
- Como: regex por `npx vitest run|npm run test|tsc --noEmit` + `\d+ passed` no corpo; falha com mensagem explicando.
- Aceite: PR sem prova falha o check.
- Prova: PR de teste.
- Depende de: —. Esforço: P.

### E80 — Template de PR com "Etapa fechada" e "Aceite verificado"
- Objetivo: invariante 1 e 6.
- Onde: `.github/pull_request_template.md`.
- Como: campos `Etapa: E<NN>`, `Aceite: [ ] item a item`, `Prova: comando + resultado`.
- Aceite: template ativo.
- Prova: PR seguinte usa.
- Depende de: —. Esforço: P.

### E81 — Corrigir retroativamente o corpo do PR #1891
- Objetivo: título/corpo alegam etapas 13/14/16/20 que foram fechadas em #1889/#1892/#1886/#1890.
- Onde: PR #1891 (edição de body) + nota no plano de 20.
- Como: reescrever "fecha etapas 11 (correção do doc), 12 e reconciliação de 17/18".
- Aceite: corpo fiel ao diff.
- Prova: link.
- Depende de: —. Esforço: P.

### E82 — Job `quality-gate` de 19 min
- Objetivo: run `36022953873` levou 15:50 → 16:09 (19 min) — o mais longo do matrix; PR #1898 já documentou timeout de 75 min como risco.
- Onde: `.github/workflows/quality-gate.yml` (arquivo protegido — alteração com razão explícita).
- Como: medir por step; separar o que é lento em job paralelo ou cache.
- Aceite: < 10 min.
- Prova: 3 runs.
- Depende de: —. Esforço: M.

### E83 — `check:tz-prefix` para `vitest run` sem `TZ=`
- Objetivo: #1898 corrigiu 5 scripts e 21 invocações em 19 workflows à mão; nada impede regressão (`pool: 'threads'` ignora `env.TZ`).
- Onde: `scripts/check-tz-prefix.mjs` + workflow.
- Como: grep de `vitest run` em `package.json` e `.github/workflows/*.yml` sem `TZ=America/Sao_Paulo` na mesma linha.
- Aceite: 0 ocorrências; gate verde.
- Prova: run.
- Depende de: —. Esforço: P.

### E84 — Cobertura de `continue-on-error` auditada (REGRA #5)
- Objetivo: gates 0–6 nunca podem ser `continue-on-error: true`; nunca se listou onde a flag está.
- Onde: `.github/workflows/*.yml`.
- Como: `grep -rn "continue-on-error: true"` → tabela com justificativa por ocorrência; remover das que são gate.
- Aceite: tabela em `docs/audits/CI_CONTINUE_ON_ERROR_2026-09.md`.
- Prova: diff.
- Depende de: —. Esforço: P.

### E85 — `ecc-tools`: habilitar Checks ou silenciar
- Objetivo: 5 comentários por push com "Check publication was denied… An app owner must enable Checks: read and write" — ruído que esconde comentário útil.
- Onde: instalação do app no repo.
- Como: conceder a permissão (viram check runs) ou desinstalar.
- Aceite: 0 comentários "denied".
- Prova: próximo PR.
- Depende de: PO (permissão de app). Esforço: P.

### E86 — Bots de review com trial expirado
- Objetivo: `greptile-apps[bot]` posta "Your trial has ended" em toda PR; `coderabbitai` avisa "billing warning… service interruption".
- Onde: apps instalados.
- Como: `[PO]` decidir pagar ou remover; remover o que não será pago.
- Aceite: 0 reviews vazios.
- Prova: próximo PR.
- Depende de: PO. Esforço: P.

---

## Bloco H — Observabilidade e alertas (E87–E92)

### E87 — Painel de custo de IA por função
- Objetivo: `ai_usage_logs` tem 44 linhas de `trends-insights` e 0 de `kit-ai-builder`; ninguém consolida tokens/custo.
- Onde: N8N (workflow diário) → Bitrix/planilha.
- Como: `SELECT function_name, sum(total_tokens), count(*) … WHERE created_at > now() - interval '1 day'`.
- Aceite: 1 mensagem diária.
- Prova: execução N8N.
- Depende de: E04. Esforço: P.

### E88 — Alerta de 502 "Resposta da IA não pôde ser validada"
- Objetivo: é o sintoma do E02 e de qualquer mudança de comportamento do provedor.
- Onde: Logflare + N8N.
- Como: contagem por hora do `event` correspondente em `kit-ai-builder`; alerta se > 5.
- Aceite: alerta testado.
- Prova: execução.
- Depende de: E02. Esforço: P.

### E89 — Alerta quando o drift check do cron falha
- Objetivo: o cron diário só é visto se alguém abrir o Actions.
- Onde: `edge-functions-drift-check.yml` + N8N (webhook) ou `deployment-failure-alert.yml` estendido.
- Como: `if: failure()` → POST no webhook.
- Aceite: alerta em falha simulada.
- Prova: run.
- Depende de: E65. Esforço: P.

### E90 — Métrica de "Estoque desconhecido" em massa
- Objetivo: se o `IN` estourar (E41), todo card vira "desconhecido" silenciosamente.
- Onde: `useKitBuilderQueries.ts:316–318` (erro→null) + `logger.warn` com `product_count`.
- Como: log estruturado no erro; alerta se `itemStockErrored` > N/dia.
- Aceite: linha de log em erro simulado.
- Prova: teste + Logflare.
- Depende de: E41. Esforço: P.

### E91 — Uptime monitor cobre `/montar-kit` e a revista pública
- Objetivo: `uptime-monitor.yml` roda a cada hora; confirmar se as rotas do Kit Maker e `/revista/<token>` estão na lista.
- Onde: o workflow.
- Como: adicionar as 2 rotas se ausentes.
- Aceite: 2 rotas monitoradas.
- Prova: run.
- Depende de: —. Esforço: P.

### E92 — Saúde do `check_edge_rate_limit`
- Objetivo: todas as edges públicas dependem da RPC; se ela falhar, metade fica fail-open, metade fail-closed (E60).
- Onde: N8N + `pg_stat_user_functions`.
- Como: alerta se erros da RPC > 0 em 1 h.
- Aceite: alerta testado.
- Prova: execução.
- Depende de: E60. Esforço: P.

---

## Bloco I — Governança e fechamento (E93–E100)

### E93 — Atualizar o plano de 20 com o estado real
- Objetivo: o documento não reflete o placar (4/7/7/2).
- Onde: `docs/plans/KIT_MAKER_PLANO_FINALIZACAO_20_ETAPAS_2026-09-23.md`.
- Como: tabela de estado no topo apontando para as etapas deste plano que fecham cada uma.
- Aceite: 20 linhas com estado e referência.
- Prova: diff.
- Depende de: —. Esforço: P.

### E94 — Registrar os planos do Kit Maker e este na `MATRIZ_PLANOS`
- Objetivo: a matriz cobre só [13], [15], [16].
- Onde: `docs/plans/MATRIZ_PLANOS_2026-09.md`.
- Como: seções para [22] (100 etapas kit), [23] (20 etapas kit) e [24] (este), com estado medido.
- Aceite: matriz com 6 planos.
- Prova: diff.
- Depende de: E93. Esforço: P.

### E95 — `docs/audits/KIT_MAKER_AUDITORIA_PLANO_20_2026-09-24.md`
- Objetivo: os 5 relatórios de agente (etapas 01–20, invariantes, bloqueios) existem só no chat.
- Onde: doc novo.
- Como: consolidar com arquivo:linha e comandos rodados.
- Aceite: doc versionado.
- Prova: diff.
- Depende de: —. Esforço: P.

### E96 — `docs/audits/MAGAZINE_AUDITORIA_2026-09-24.md`
- Objetivo: idem para as 2 rodadas da revista (crashes, fail-open, teste órfão, page_order, zod, deploy).
- Onde: doc novo.
- Como: consolidar.
- Aceite: doc versionado.
- Prova: diff.
- Depende de: —. Esforço: P.

### E97 — Critério "concluída" na lista de tarefas = Aceite verificado
- Objetivo: etapas 12 e 17 constavam como concluídas com Aceite pela metade.
- Onde: seção "0. Como ler" deste plano (invariante 6) + template de PR (E80).
- Como: PR só marca a etapa como concluída citando cada item do Aceite com evidência.
- Aceite: invariante publicado.
- Prova: este documento.
- Depende de: E80. Esforço: P.

### E98 — REGRA #10 no CLAUDE.md: "PR que fecha etapa cita o Aceite"
- Objetivo: tornar o invariante 5/6 regra de sessão, não só de plano.
- Onde: `CLAUDE.md`.
- Como: regra curta com o exemplo real (#1891/#1892/#1893) e o formato exigido.
- Aceite: regra publicada.
- Prova: diff.
- Depende de: —. Esforço: P.

### E99 — `graphify update` após o Bloco A
- Objetivo: `GRAPH_REPORT.md` já estava defasado na matriz (E05 do plano [13]); as mudanças deste plano o defasam mais.
- Onde: `graphify-out/`.
- Como: `graphify update . --force` no container `claude-code` da VPS após E01–E14.
- Aceite: `Built from commit` = HEAD.
- Prova: grep.
- Depende de: E14. Esforço: P.

### E100 — `[PO]` Sessão de aceite das etapas de decisão
- Objetivo: fechar B1, B2 e as 5 etapas `[PO]` (E15, E39, E40, E50, E86) numa decisão só.
- Onde: reunião + `docs/audits/DECISOES_PO_2026-09.md`.
- Como: tabela decisão/prazo/dono.
- Aceite: 5 decisões registradas.
- Prova: doc.
- Depende de: PO. Esforço: P.

---

## Sequência recomendada

| Lote | Etapas | Por quê primeiro | Merge |
| --- | --- | --- | --- |
| 1 | E01, E02, E06, E07, E08, E09, E10 | fecham 12 e 17 de verdade — features "entregues" que não funcionam por inteiro | autônomo |
| 2 | E63, E64, E65, E66, E67, E73 | governança de deploy: evita repetir os 2 incidentes | autônomo |
| 3 | E41, E42, E43, E44, E46, E47 | robustez do estoque/peso antes de mais usuários | autônomo |
| 4 | E51, E52, E53, E54, E57, E59 | revista: gaps de teste baratos | autônomo |
| 5 | E75, E77, E78, E79, E80, E83, E84 | CI: gates que faltam | autônomo |
| 6 | E15, E16, E17, E18, E19, E20, E21 | validação real do Kit Maker | E15 pelo PO |
| 7 | E22, E23, E24, E25, E26, E27 | orçamento e RLS reais | autônomo após lote 6 |
| 8 | E28, E29, E30, E31, E32, E38 | visual + mobile | autônomo |
| 9 | E33–E37 | acessibilidade | autônomo |
| 10 | E04, E05, E87–E92 | observabilidade | E04 `[$]` |
| 11 | E11–E14, E45, E48, E49, E55, E56, E58, E60–E62, E68–E72, E74, E76, E81, E82, E85 | acabamentos e docs | autônomo |
| 12 | E39, E40, E50, E86, E93–E100 | decisões do PO e fechamento | PO |

## Anexo — o que continua fora deste plano

Catálogo próprio de caixas de kit, frete real por CEP (Frenet/Melhor Envio — 0 ocorrências em `src/components/kit-builder`), correção do campo de material das 14 embalagens de fornecedor, e a curadoria dos templates só se E50 decidir pela entrada. Nada disso foi tocado desde 23/09.
