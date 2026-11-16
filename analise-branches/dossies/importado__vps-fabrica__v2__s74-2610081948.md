# origin/importado/vps-fabrica/v2/s74-2610081948

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** na tela de pre-visualizacao da logo no produto, o sistema passa a dizer claramente se a simulacao e confiavel (mostra as medidas em cm) ou se e apenas ilustrativa (nao mostra medida nenhuma), evitando que o cliente aprove um mockup achando que as medidas estao garantidas.
- **Tip / merge-base / main:** tip `62e9bd2d457297c2f7a11890e57afb45ffc37227` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`62e9bd2d45`, "feat(mockup): geometria da previa rotulada em tres estados, cm so quando validada"). A intencao, pela mensagem do commit e pelo codigo:

1. Criar uma funcao pura e exportada `describeGeometry` que classifica a previa do mockup em tres estados, a partir de fatos reais (nao de chute):
   - `sem_regra` — a tecnica de gravacao nao tem regra de simulacao conhecida: nunca exibe selo de compatibilidade nem medida;
   - `validada` — tecnica com regra + dimensoes reais do produto + limites oficiais da area de gravacao: **unico** estado que mostra medidas em cm;
   - `ilustrativa` — dimensoes conhecidas mas sem area oficial, ou dimensoes ausentes: posicionamento ilustrativo, sem cm.
2. Desenhar esse rotulo na previa (`data-testid="logo-geometry-state"`), com icone por estado (regua / info / alerta).
3. Fazer o `LogoPositionEditor` repassar ao canvas os fatos que ja tinha em escopo (dimensoes do produto, limites da area, tamanho da logo em cm). Nenhum hook alterado.

Sao somente 2 arquivos e 114 linhas adicionadas (nenhuma migration, nenhuma edge function, nenhuma policy).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Tipo `GeometryState` com os tres rotulos `'ilustrativa' \| 'sem_regra' \| 'validada'` | `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx:106` | `git show origin/main:src/components/mockup/logo-editor/LogoPreviewCanvas.tsx` → linha 106 identica |
| Interfaces `GeometryFacts` / `GeometryDescriptor` (com `measuresCm` anulavel) | mesmo arquivo, linhas 113 e 124-129 | idem |
| `describeGeometry` (funcao pura exportada) com a ordem de decisao sem_regra → validada → ilustrativa | mesmo arquivo, linhas 159-200 | `diff` do bloco "Estado de geometria do preview" .. `const GEOMETRY_ICONS` entre branch e main: **identico, zero linhas de diferenca** |
| `techniqueHasRule` (tecnica fora de `TECHNIQUE_FILTERS.default`) | mesmo arquivo, linha 144 | idem |
| `formatCm` (cm com 1 casa em padrao pt-BR, sem ICU) | mesmo arquivo, linha 141 | idem |
| Regra "medidas em cm SO no estado validada" (`measuresCm: null` nos outros) | mesmo arquivo, linhas 164, 187, 199 | idem |
| Mapa de icones `GEOMETRY_ICONS` (Ruler / Info / AlertTriangle) | mesmo arquivo, linhas 203-206 | idem |
| Props de geometria no canvas (`productWidthCm`, `productHeightCm`, `maxWidthCm`, `maxHeightCm`, `logoWidthCm`, `logoHeightCm`) | mesmo arquivo, bloco de props a partir da linha ~225 | comentario "limites oficiais da area e tamanho real da logo. Ausentes ⇒ previa ilustrativa" presente na linha 225 |
| Chamada `describeGeometry({...})` dentro do componente + `GeometryIcon` | mesmo arquivo, linhas 277 e 286 | idem |
| Rotulo renderizado com `data-testid="logo-geometry-state"` e `data-state={geometry.state}` | mesmo arquivo, linhas 413-429 | `sed -n '410,432p'` na versao da main mostra o bloco inteiro, inclusive o comentario "(Codex p.11): medidas em cm so quando validada" |
| `LogoPositionEditor` repassando os 6 fatos ao canvas | `src/components/mockup/LogoPositionEditor.tsx:183-188` | `git show origin/main:src/components/mockup/LogoPositionEditor.tsx` → as 6 linhas `productWidthCm={productWidthCm}` ... `logoHeightCm={logoHeight}` |
| **Verificacao exaustiva (todas as linhas)** | 114 de 114 linhas adicionadas pela branch existem na main | comparacao linha a linha das adicoes de `git diff c194982c 62e9bd2d -- <os 2 arquivos>` contra o conteudo dos dois arquivos na main: `TOTAL linhas unicas adicionadas pela branch: 114 | ausentes na main: 0` |
| Quando entrou | PR #2739, commit de squash `294cee8389` em 2026-11-01, "fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo (entregas VPS)" | `git log -S"describeGeometry" --oneline origin/main -- src/components/mockup/logo-editor/LogoPreviewCanvas.tsx` e `git log -S"logo-geometry-state" origin/main` retornam **so** esse commit |
| Protecao por teste na main (a branch nao trouxe testes) | `src/components/mockup/__tests__/GeometryStates.test.tsx` (importa `describeGeometry`, linha 20; "describeGeometry — so o estado validado carrega medidas", linha 110) e `tests/components/mockup/acceptance/grupo3.acceptance.test.tsx:171,181` (A07/A08 assertam o contrato do rotulo) | `git grep -n "describeGeometry\|logo-geometry-state" origin/main -- tests src` |

Por que os 2 arquivos ainda **diferem** da main: a main andou **para frente** por cima deste mesmo trabalho. O diff (B) do pacote (branch → main) e composto so de **acrescimos** posteriores, nenhuma remocao do que a branch fez:

- `LogoPreviewCanvas.tsx`: ganhou `getMarkFootprint` / `isMarkClipped` / `useAreaSize`, o aviso "Marca cortada pela area de aplicacao" e navegacao por teclado (`onKeyDown`, `role="group"`, `aria-describedby`);
- `LogoPositionEditor.tsx`: o calculo cm→px foi extraido para `cmParaPx` em `src/lib/mockup-geometry` e o drag ganhou suporte a teclado.

Nos dois casos as linhas da branch continuam la, inteiras.

## A resgatar

Nada. Nenhum item ficou de fora.

## Risco de fechar esta branch

Praticamente nulo. Todo o conteudo proprio da branch (as 114 linhas, nos 2 unicos arquivos que ela tocou) ja esta em producao desde 01/11/2026 pela PR #2739, com testes automatizados na main protegendo o comportamento. Fechar a branch nao remove nada do sistema e nao muda nada para o usuario final. O unico efeito e o repositorio ficar com uma branch antiga a menos.

Observacao para quem decide: manter a branch aberta tem custo oposto e maior — ela mostra uma versao **mais velha** da mesma tela (sem o aviso de marca cortada e sem navegacao por teclado), e um agente que a reaplicasse por engano desfaria melhorias que ja estao no ar.

## Nao verificado

- Nao foi executado nenhum teste, lint ou build nesta analise (a tarefa e somente leitura); a existencia dos testes de geometria na main foi verificada por leitura do codigo, nao por execucao.
- Nao foi verificado o comportamento visual em producao (navegador); a conclusao e por equivalencia de codigo linha a linha, que neste caso e exata (0 linhas ausentes).
