# origin/importado/vps-fabrica/v2/s18a-2610081946

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** impede que o sistema gere mockup de um produto sem medidas cadastradas (antes ele chutava 8x20 cm em silencio e o cliente recebia arte no tamanho errado) — isso ja esta valendo em producao.
- **Tip / merge-base / main:** tip `1a24c0cdcb69cdac24f3074e3a44bd72e8d6dfa8` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico (`1a24c0cdcb`, "fix(mockup): produto sem dimensoes fisicas nao gera mockup (trava no hook)", Q13/Q24 etapa 18). Quatro intencoes declaradas na mensagem:

1. Derivar as medidas reais do produto numa unica regra de precedencia (`dimensions.width_cm` -> `dimensions.diameter_cm` -> `metadata.width_mm`/10; altura: `dimensions.height_cm` -> `metadata.height_mm`/10), descartando zero/negativo/nao-numero.
2. Expor `missingDimensions` no hook do gerador e **recusar a geracao antes de chamar a edge**, com erro tipado `{ code: 'missing_dimensions', status: 422 }` + `generationError` + toast.
3. Usar esse mesmo resolvedor no envio para a geracao (fonte unica, WYSIWYG) em vez da derivacao duplicada inline.
4. Alargar a prop `onGenerateMockup` de `Promise<void>` para `Promise<unknown>`, para o botao aceitar o novo retorno tipado; e deixar um teste que falha sem o guard.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Constantes da recusa (`missing_dimensions`, status 422, mensagem ao usuario) | `src/hooks/mockup/mockupGeneratorModel.ts` (arquivo novo da main; o codigo saiu do hook para ca) | `mockupGeneratorModel.ts:23` `MISSING_DIMENSIONS_ERROR_CODE = 'missing_dimensions'`; `:25` `MISSING_DIMENSIONS_STATUS = 422`; `:26` `MISSING_DIMENSIONS_MESSAGE`; `:44-47` `MISSING_DIMENSIONS_REFUSAL` |
| `resolveProductDimensions` com a precedencia cm -> diameter -> mm | `src/hooks/mockup/mockupGeneratorModel.ts:72-80` | `:78` `widthCm: positiveCm(dims?.width_cm) ?? positiveCm(dims?.diameter_cm) ?? mmToCm(meta?.width_mm)`; `:79` `heightCm: positiveCm(dims?.height_cm) ?? mmToCm(meta?.height_mm)` — identico a versao da branch |
| Descarte de zero/negativo/nao-numero e conversao mm->cm | `mockupGeneratorModel.ts:56` (`positiveCm`) e `:61-62` (`mmToCm`) | mesmas funcoes, mesmo criterio (`> 0` e finito) |
| `hasRealProductDimensions` (ao menos uma medida) | `mockupGeneratorModel.ts:88` | `export function hasRealProductDimensions(...)` |
| `missingDimensions` calculado no hook | `src/hooks/mockup/useMockupGenerator.ts:157-161` | `:161` `const missingDimensions = !!selectedProduct && !hasRealProductDimensions(productDimensions);` |
| Recusa ANTES da edge, com erro tipado + toast + `generationError` | `src/hooks/mockup/useMockupGenerator.ts:529-535` | `:531` `if (missingDimensions) {` … `setGenerationError(MISSING_DIMENSIONS_MESSAGE); toast.error(...)`; `:534` `return { ok: false, error: MISSING_DIMENSIONS_REFUSAL };` — e esta acima da chamada `generateMockupApi` em `:557` |
| Fonte unica das medidas no envio para a geracao (WYSIWYG) | `src/hooks/mockup/useMockupGenerator.ts:565-566` | `productWidthCm: productDimensions.widthCm` / `productHeightCm: productDimensions.heightCm` (a derivacao inline duplicada foi removida) |
| Retorno tipado `MockupGenerationOutcome` (`ok: true` / `ok: false`) | `src/hooks/mockup/useMockupGenerator.ts:514`, `:607`, `:614` | `:514` assinatura `Promise<MockupGenerationOutcome \| undefined>`; `:607` `return { ok: true }`; `:614` `return { ok: false, error: { code: 'edge_error', message: errorMessage } }` |
| `missingDimensions` exposto no retorno do hook | `src/hooks/mockup/useMockupGenerator.ts:817` e `:874` | aparece no objeto de retorno e na lista de dependencias do memo |
| Prop `onGenerateMockup` alargada para `Promise<unknown>` | `src/components/mockup/approval/MockupLayoutButtons.tsx:80` | `onGenerateMockup?: () => Promise<unknown>;` |
| Teste que prova o guard | `src/hooks/mockup/__tests__/mockupDimensions.guard.test.ts` existe na main (`git cat-file -e` OK) | `:199` `it('missingDimensions=true e generate() recusa tipado SEM chamar a edge')`; `:203`/`:231`/`:253` asserts de `missingDimensions`; os casos puros (cm, mm, diameter, zeros/negativos) seguem no arquivo |
| Quando entrou | PR #2739 (squash) | `git log -S"hasRealProductDimensions" --oneline origin/main` -> `294cee8389 fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo (entregas VPS) (#2739)` |

Por que os 3 arquivos ainda "diferem" da main (defasagem, nao perda):
- `useMockupGenerator.ts` — a main quebrou o hook em modulos (`mockupGeneratorModel.ts`, `useMockupTechniquesLoad`, `useSavedMockupProject`, `mockupHistoryAdapter`…) e acrescentou coisas que a branch nao tinha (cancelamento `AbortController`, limite `MAX_BATCH_AREAS`, analise de cor por area, correcao B F-02). O codigo da branch foi movido, nao apagado.
- `mockupDimensions.guard.test.ts` — a main manteve o teste e so ajustou os imports para o novo modulo (`from '../mockupGeneratorModel'`), o wrapper `MemoryRouter` e mocks parciais. As asserveracoes do guard continuam la.
- `MockupLayoutButtons.tsx` — a main reorganizou os botoes ("Gerar Mockup" / "Gerar documento" / "Gerar Layout") e manteve a assinatura `Promise<unknown>` que a branch pediu.

## A resgatar

Nada. Todos os itens do commit foram localizados na main com evidencia (tabela acima).

## Risco de fechar esta branch

Nenhum risco pratico. A protecao que ela criou — nao gerar mockup de produto sem medida, avisando o vendedor para pedir o cadastro ao catalogo — esta ativa na main e coberta por teste automatizado. Fechar a branch nao remove nada do sistema.

Observacao (nao e trabalho perdido desta branch, e um limite que ela tambem tinha): nenhuma tela consome `missingDimensions` para avisar antes do clique — o vendedor so descobre ao apertar "Gerar Mockup" e receber a mensagem de erro. A branch nao resolvia isso; e melhoria de UI a decidir em separado.

## Nao verificado

- Nao executei a suite de testes: o diretorio de trabalho esta em outra branch (`claude/feat-resgate-mockup-assistant-261115-1420`, HEAD `347e67a4ed`), e trocar de checkout e proibido nesta tarefa. A existencia e o conteudo do teste na main foram verificados por leitura (`git show origin/main:...`), nao por execucao.
- Nao verifiquei se a edge `generate-mockup` devolve mesmo 422 `missing_dimensions` em producao; a branch so espelha esse contrato no cliente e nao toca a edge.
