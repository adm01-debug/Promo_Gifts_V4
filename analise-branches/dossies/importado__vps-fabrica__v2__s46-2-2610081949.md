# origin/importado/vps-fabrica/v2/s46-2-2610081949

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada muda para quem usa o sistema — e so arrumacao dos testes automaticos do gerador de mockup: o teste novo que vale ja esta na producao; o que sobrou e faxina de testes repetidos.
- **Tip / merge-base / main:** tip `1403ab65410b425d4b05751adc3f96e1f17f2281` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico, `1403ab6541` — "test(mockup): aposenta blocos grep/copia-local da fatia 2 do mockup-audit".

A branch mexeu em exatamente 2 arquivos, os dois de teste (`git diff --stat c194982c 1403ab6541`):
nenhum arquivo de produto, de banco ou de edge function.

A intencao tem duas metades:

1. **Trocar teste frageis por teste de comportamento.** Criou
   `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx` (34 linhas, 3 asseracoes) que
   renderiza os componentes de verdade e checa comportamento: a label do dialogo "Salvar Template"
   ligada ao campo, o botao "Remover anotação" realmente removendo a anotacao, e o seletor de cor
   Pantone abrindo/fechando com `aria-expanded`.
2. **Apagar 12 blocos de "analise estatica"** de `src/hooks/mockup/__tests__/mockup-audit.test.ts`
   (-355 linhas). Esses blocos nao executam nada: leem o codigo-fonte como texto e procuram
   trechos (`expect(src).toContain(...)`), o que quebra a cada renomeacao. Os blocos apagados eram
   os de `useMockupDraft`, `useMockupTechniques`, `useLogoProcessing`, `ArtFileUpload`, `ShareMenu`,
   `AreaCard`, `useMockupGenerator` (reader.onerror), `MockupHistoryPanel`, `MockupResultCard`,
   `SaveTemplateDialog`, `MockupAnnotations` e `LogoColorAnalyzer`.

Contexto que fecha a leitura: existe uma irma desta branch, o commit `a151aa42cb` de 2026-10-13,
"test(mockup): aposenta 12 blocos estaticos da fatia 2 do mockup-audit". O
`mockup-audit.test.ts` dos dois e **byte a byte identico**
(`git diff 1403ab6541:src/hooks/mockup/__tests__/mockup-audit.test.ts a151aa42cb:<idem>` nao
imprime nada), e o arquivo de teste novo da irma e o mesmo mais uma asseracao. Ou seja: a irma e
esta mesma tarefa uma revisao adiante, e foi a irma que a main leu.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Arquivo de teste de comportamento da fatia 2 | **ESTA**, em versao mais rica | `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx` existe na main; `git log origin/main -- <arquivo>` → `54826844aa 2026-11-15 fix(mockup): resgata teste de a11y da fatia 2... (#3676)` |
| Asseracao: botao "Remover anotação" remove e avisa o pai | **ESTA**, texto igual | main, mesmo arquivo: `fireEvent.click(screen.getByRole('button', { name: 'Remover anotação' }))` + `expect(onChange).toHaveBeenCalledWith([])` |
| Asseracao: dropdown Pantone reflete aberto/fechado em `aria-expanded` | **ESTA**, texto igual | main, mesmo arquivo: `expect(trigger).toHaveAttribute('aria-expanded', 'false')` → clique → `'true'` |
| Asseracao: label do `SaveTemplateDialog` ligada ao input | **NAO ESTA — e nao deve estar** | o componente foi aposentado de `src/`: `git cat-file -e origin/main:src/components/mockup/SaveTemplateDialog.tsx` falha. O commit `54826844aa` registra a razao: "O bloco do SaveTemplateDialog saiu: o componente foi aposentado de `src/` e hoje só existe em `recovery/src-legacy/`" |
| Bonus que a main ganhou (veio da irma, nao desta branch) | `AreaCard.displayName`/`MockupResultCard.displayName` checados por comportamento | main, mesmo arquivo: `expect(AreaCard.displayName).toBe('AreaCard')` |
| O teste novo roda no CI | **ESTA** | `git show origin/main:package.json` linha 98, script `test:ci-core`, contem `mockupA11y.slice2.test.tsx` |
| Remocao dos 12 blocos de analise estatica | **NAO ESTA** — 11 dos 12 continuam na main | `git show origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts` ainda tem `describe('Analise estatica — useMockupDraft.ts'` (linha 140), `useMockupTechniques.ts` (194), `useLogoProcessing.ts` (230), `ArtFileUpload.tsx` (258), `ShareMenu.tsx` (283), `AreaCard.tsx` (330), `useMockupGenerator.ts` reader.onerror (350), `MockupHistoryPanel.tsx` (375), `MockupResultCard.tsx` (401), `MockupAnnotations.tsx` (421), `LogoColorAnalyzer.tsx` (442) |
| Remocao do bloco estatico do `SaveTemplateDialog` | **ESTA**, por outro motivo | o bloco nao aparece na lista de `describe` da main; saiu junto com o componente, nao por causa desta branch |
| A main foi mais longe em outra fatia (fatia 1) | sim | a main apagou os blocos `T7 — getTechniquePrompt` e `Analise estatica — mockupGenerationService.ts`, que a branch ainda tinha, e repontou T5 para `mockupGeneratorModel.ts` e T9 para `useMockupEntryParams.ts` |

**Por que a remocao nao foi levada junto, e por que isso foi acerto.** A main deixou escrito o
proprio critério no cabecalho do arquivo (`mockup-audit.test.ts`, linhas 18-19): *"guardas de
runtime mantidas: ainda sem teste de comportamento equivalente do hook na main"*. Isto e: o bloco
estatico so sai quando existir teste de comportamento que cubra a mesma coisa. Dos 12 blocos que a
branch apagou, apenas 4 ganharam substituto de comportamento. Os outros 7 guardam correcoes de
producao sem nenhum substituto — por exemplo, no `useMockupDraft`, que o rascunho do mockup nao
engula erro ao limpar (`if (deleteError) throw deleteError`), e no `useMockupTechniques`, que a
lista de tecnicas nao apareca vazia enquanto carrega (`BUG-B`). Aplicar esta branch como esta
derrubaria essas guardas de uma vez. Logo: o que ficou de fora e so a parte da faxina que hoje e
seguro fazer.

## A resgatar

Faxina pequena, sem risco, 100% em arquivo de teste — nao muda nada do que o usuario ve.
Na main, 4 blocos de analise estatica hoje checam por texto exatamente o que o teste de
comportamento resgatado (`mockupA11y.slice2.test.tsx`) ja prova de verdade. Pelo critério que a
propria main declara, esses 4 podem sair:

1. `src/hooks/mockup/__tests__/mockup-audit.test.ts:330` — `describe('Analise estatica — AreaCard.tsx')`
   (so checa `AreaCard.displayName = 'AreaCard'` no texto; o teste de comportamento ja afirma
   `expect(AreaCard.displayName).toBe('AreaCard')`).
2. `src/hooks/mockup/__tests__/mockup-audit.test.ts:401` — `describe('Analise estatica — MockupResultCard.tsx')`
   (idem, para `MockupResultCard.displayName`).
3. `src/hooks/mockup/__tests__/mockup-audit.test.ts:421` — `describe('Analise estatica — MockupAnnotations.tsx')`
   (procura o texto `aria-label="Remover anotação"`; o teste de comportamento clica no botao por
   esse nome e confere que a anotacao foi removida).
4. `src/hooks/mockup/__tests__/mockup-audit.test.ts:442` — **apenas** o sub-bloco
   `describe('a11y — aria-label semantico e aria-expanded no PantoneDropdown')`. O sub-bloco
   seguinte do mesmo arquivo, `describe('React keys — ColorRow usa hex como key (nao index)')`,
   **deve ficar**: nao tem equivalente de comportamento.

Nao resgatar: a remocao dos blocos de `useMockupDraft`, `useMockupTechniques`, `useLogoProcessing`,
`ArtFileUpload`, `ShareMenu`, `useMockupGenerator` (reader.onerror) e `MockupHistoryPanel`. Sem
teste de comportamento equivalente na main, apagar esses 7 perde guarda de correcao de producao.

## Risco de fechar esta branch

Praticamente nulo para o negocio. O unico conteudo que agregava comportamento — o teste de
acessibilidade da fatia 2 — ja foi resgatado para a producao na PR #3676 (commit `54826844aa`,
2026-11-15), em versao melhor que a desta branch, e esta registrado no CI (`test:ci-core`). Fechar
a branch nao apaga nenhum teste nem nenhuma correcao da main.

O que se perde ao fechar e so a anotacao de que 4 blocos de teste repetidos continuam na main. Isso
custa manutencao, nao comportamento: sao testes que leem o codigo como texto e quebram em qualquer
renomeacao de componente, dando trabalho de CI sem pegar defeito real. Por isso os 4 itens acima
ficam registrados neste dossie — a branch pode ser fechada e a faxina feita direto na main, sem
depender dela.

Atencao a uma armadilha: a branch **nao** pode ser aplicada/mergeada como esta. Alem de derrubar as
7 guardas sem substituto, a asseracao do `SaveTemplateDialog` falharia, porque o componente nao
existe mais em `src/` (`git cat-file -e origin/main:src/components/mockup/SaveTemplateDialog.tsx`
falha).

## Nao verificado

- Nao executei os testes (`npm test` / `npm run test:ci-core`): a analise e estatica, por leitura de
  `git show`/`git diff`. A afirmacao de que o teste resgatado passa contra a main de hoje vem do
  corpo do commit `54826844aa` ("todas verdes contra a main atual"), nao de execucao minha.
- `src/hooks/mockup/__tests__/mockup-audit.test.ts` **nao** aparece no `test:ci-core`
  (`git show origin/main:package.json`, linha 98). Entao os blocos estaticos que sobraram
  provavelmente nao rodam no Gate 2, so na suite completa. Nao verifiquei em qual job da CI a suite
  completa roda — nao muda nenhum item acima, mas reduz a urgencia da faxina.
- Arquivos sem leitura por truncamento: 0. A branch tocou 2 arquivos
  (`git diff --stat c194982c 1403ab6541`), os dois lidos integralmente, com os diffs (A) e (B)
  conferidos direto no git.
