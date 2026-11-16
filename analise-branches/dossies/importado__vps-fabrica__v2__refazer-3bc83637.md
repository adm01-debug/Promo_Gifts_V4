# origin/importado/vps-fabrica/v2/refazer-3bc83637

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada muda para quem usa o sistema — e so limpeza na bateria de testes automaticos do modulo de mockup (a simulacao da arte/gravacao no produto); metade dessa limpeza entrou na main e a outra metade ficou de fora.
- **Tip / merge-base / main:** tip `98ed3e546ccae4815fcab375a6a7a60420d83b4e` · merge-base `a9c8bd9c4e3f2fa5a4a52fb663ea5d3b44c7e982` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit: `test(mockup): aposenta 12 blocos estaticos da fatia 2 do mockup-audit`.

A branch faz uma troca de dois lados no arquivo gigante de testes do mockup
(`src/hooks/mockup/__tests__/mockup-audit.test.ts`, 2297 linhas no merge-base):

1. **Tira 12 blocos de "analise estatica"** — testes que nao executam o sistema, apenas leem o
   codigo-fonte como texto e procuram trechos literais (ex.: `expect(src).toContain("AreaCard.displayName = 'AreaCard'")`).
   Esse tipo de teste quebra a cada refatoracao sem que nada tenha parado de funcionar.
   Blocos removidos (evidencia: `git diff a9c8bd9c4e 98ed3e546c -- src/hooks/mockup/__tests__/mockup-audit.test.ts | grep "^-describe("`):
   useMockupDraft, useMockupTechniques, useLogoProcessing, ArtFileUpload, ShareMenu, AreaCard,
   useMockupGenerator, MockupHistoryPanel, MockupResultCard, SaveTemplateDialog, MockupAnnotations,
   LogoColorAnalyzer.
2. **Põe no lugar 4 testes de comportamento de verdade**, em arquivo novo
   `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx` (41 linhas) — renderizam o componente,
   clicam no botao e conferem o resultado.

Intencao, em uma frase: trocar teste que le texto do codigo por teste que exercita o comportamento.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Arquivo novo `mockupA11y.slice2.test.tsx` (lado 2 da troca) | **ESTA**, com evolucao propria (prettier + 1 teste a menos) | `git show origin/main:src/components/mockup/__tests__/mockupA11y.slice2.test.tsx` existe, blob `b0a6a84f3e`; `describe('mockup — fatia 2 do mockup-audit (comportamento)')` na linha 19 |
| Teste de comportamento: MockupAnnotations remove a anotacao pelo botao rotulado | **ESTA** | `mockupA11y.slice2.test.tsx:20` e `:29` (`getByRole('button', { name: 'Remover anotação' })`) |
| Teste de comportamento: dropdown Pantone reflete aberto/fechado | **ESTA** | `mockupA11y.slice2.test.tsx:33`, `:43`, `:46` (`aria-expanded`) |
| Teste de comportamento: AreaCard / MockupResultCard identificaveis no DevTools | **ESTA** | `mockupA11y.slice2.test.tsx:51-53` |
| Teste de comportamento: label do SaveTemplateDialog | **NAO ESTA — e nao deve estar.** A main aposentou o componente de `src/`; so sobrou copia em `recovery/` | `git ls-tree -r origin/main \| grep SaveTemplateDialog` -> somente `recovery/src-legacy/src/components/mockup/SaveTemplateDialog.tsx`; o comentario nas linhas 2-3 do arquivo na main explica a remocao |
| **Remocao dos 12 blocos estaticos (lado 1 da troca)** | **NAO ESTA: 11 dos 12 blocos continuam na main** | `git show origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts` ainda tem `describe('Analise estatica — useMockupDraft.ts')` na linha 140, `useMockupTechniques.ts` na 194, `useLogoProcessing.ts` na 230, `ArtFileUpload.tsx` na 258, `ShareMenu.tsx` na 283, `AreaCard.tsx` na 330, `useMockupGenerator.ts` na 350, `MockupHistoryPanel.tsx` na 375, `MockupResultCard.tsx` na 401, `MockupAnnotations.tsx` na 421, `LogoColorAnalyzer.tsx` na 442 |
| Bloco estatico do SaveTemplateDialog (1 dos 12) | **ESTA FORA da main** — saiu por outro motivo (componente aposentado), nao pela branch | `grep -c "describe('Analise estatica — SaveTemplateDialog.tsx'"` na main = 0 |
| A main fez a propria faxina, em outra fatia | sim — tirou blocos que a branch **manteve**: `T7 — getTechniquePrompt`, `mockupGenerationService.ts`, `T1/T2 — 7 handlers em useCallback` | diff (B) do pacote mostra essas remocoes como exclusivas da main; main tem 1949 linhas, branch 1942, merge-base 2297 |

Resumo da verificacao: a main **ficou com os dois lados ao mesmo tempo** — tem os testes de
comportamento novos *e* continua com os 11 blocos estaticos que eles vieram substituir. A duplicacao e
demonstravel: a main checa `aria-label="Remover anotação"` como texto no fonte
(`mockup-audit.test.ts:429`) e tambem clica nesse botao de verdade (`mockupA11y.slice2.test.tsx:29`).

## A resgatar

1. **A remocao dos blocos estaticos ja cobertos por comportamento** — `src/hooks/mockup/__tests__/mockup-audit.test.ts`.
   Hoje comprovadamente duplicados pelo arquivo que **ja esta na main**:
   - `describe('Analise estatica — MockupAnnotations.tsx')` (main, linha 421) vs `mockupA11y.slice2.test.tsx:20`;
   - a parte de a11y de `describe('Analise estatica — LogoColorAnalyzer.tsx')` (main, linha 442) vs `mockupA11y.slice2.test.tsx:33`;
   - `describe('Analise estatica — AreaCard.tsx')` (main, 330) e `MockupResultCard.tsx` (main, 401) vs `mockupA11y.slice2.test.tsx:51-53`.
   Por que importa: um arquivo de teste de 1949 linhas que confere codigo como texto e a principal fonte
   de CI vermelha falsa neste repo — quebra em refatoracao sem nada ter parado de funcionar.
2. **A remocao dos blocos de `useMockupDraft`** (main, linhas 140-189) — ja cobertos por teste de
   comportamento de verdade: o fallback de chave estrangeira em `src/hooks/mockup/__tests__/useMockupDraft.test.ts:231`
   e o erro ao limpar o rascunho em `:420`. Por que importa: mesmo motivo do item 1, e aqui a cobertura
   real existe e esta verificada.
3. **NAO resgatar em bloco: 2 remocoes da branch tiram guarda que a main nao tem substituta.**
   Isto e um achado, nao um item de faxina:
   - `describe('Analise estatica — useMockupTechniques.ts')` (main, 194-225) guarda que a lista de
     tecnicas de gravacao **nao volte vazia enquanto carrega** (`expect(loadingBlock).not.toContain('return [];')`,
     main `mockup-audit.test.ts:208-211`) e o guard de codigo nulo (`:214`). O fonte da main confirma o
     comportamento guardado: `src/hooks/mockup/useMockupTechniques.ts:276-277` retorna `techniques.map(toUnlimited)`
     no carregamento, e `:160` tem o `if (!tech.code) continue;`. Nenhum teste de comportamento da main cobre
     isso — pior: `tests/hooks/useMockupTechniques.test.ts:24` afirma o **contrario** ("deve retornar lista
     vazia enquanto customizationData é undefined"), sobre `useFilteredTechniques`. Por que importa para o
     negocio: e a guarda de que o vendedor nao veja "nenhuma tecnica de gravacao disponivel" por um instante
     ao trocar de produto. **Precisa de decisao tecnica antes de apagar, e a contradicao entre os dois testes
     precisa ser resolvida.**
   - A parte `React keys — ColorRow usa hex como key` do bloco LogoColorAnalyzer (main, 465-470) nao tem
     equivalente de comportamento; apagar o bloco inteiro perde essa guarda.

## Risco de fechar esta branch

Para o negocio: **nenhum**. A branch nao toca tela, rota, preco, permissao, banco nem edge function —
somente dois arquivos de teste. Nada que o cliente ou o vendedor veja depende dela, e o lado que de fato
adiciona cobertura (os testes de comportamento) **ja esta na main**.

O que se perde ao fechar sem resgatar:

1. O trabalho de mapeamento: a branch e o unico lugar onde esta escrito **quais** 12 blocos estaticos
   deveriam sair. Sem ela, alguem refaz essa leitura de 2297 linhas do zero.
2. A faxina nao acontece e o `mockup-audit.test.ts` segue com 1949 linhas e guardas duplicadas — o que
   mantem o custo de CI vermelha falsa a cada refatoracao do modulo de mockup.
3. Fica sem registro a contradicao achada aqui: dois testes vivos na main dizem coisas opostas sobre a
   lista de tecnicas durante o carregamento (item 3 de "A resgatar"). Essa e a unica parte com efeito
   possivel no dia a dia do vendedor.

Risco de resgatar errado (apagar os 12 em bloco, como a branch fez): perde-se a guarda da lista de
tecnicas e a das chaves de cor. O resgate correto e seletivo — os itens 1 e 2 sim, o 3 nao.

## Nao verificado

- Se os blocos estaticos de `useLogoProcessing`, `ArtFileUpload` (erro de storage no remover),
  `ShareMenu` (erros de copiar link / baixar PNG / baixar PDF), `useMockupGenerator` (`reader.onerror`) e
  `MockupHistoryPanel` (displayName) tem equivalente de comportamento em algum outro teste da main.
  Pelos **nomes** dos testes nao tem (`src/components/mockup/__tests__/ArtFileUpload.test.tsx` cobre envio
  e validacao de tamanho, nao o erro ao remover; a main nao tem nenhum arquivo de teste de `ShareMenu`),
  mas nao li o corpo desses arquivos — portanto nao afirmo. Antes de apagar esses 5 blocos, conferir um a um.
- Se a bateria de testes passa com a remocao aplicada: nao executei `npm test` (a tarefa e somente leitura).
- Por que a branch removeu 12 blocos adicionando apenas 4 testes de comportamento: a mensagem do commit
  nao justifica, e nao ha corpo de commit nem PR associada no pacote de evidencia.
