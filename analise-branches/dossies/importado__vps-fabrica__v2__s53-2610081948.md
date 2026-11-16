# origin/importado/vps-fabrica/v2/s53-2610081948

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** o mockup enviado ao cliente passa a usar a foto grande do produto que o vendedor escolheu, em vez de uma miniatura borrada.
- **Tip / merge-base / main:** tip `48bdbd981ca27ac8c70ad313735258df499dacd2` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico: `48bdbd981c` — "fix(mockup): geração usa a foto original escolhida, nunca a miniatura".

Antes, ao escolher a cor do produto o sistema decidia sozinho qual foto mandar para a
geracao do mockup e convertia a URL para o tamanho `thumbnail` do CDN. Resultado: o mockup
era gerado a partir de uma imagem pequena, e o vendedor nao podia escolher entre as varias
fotos da mesma cor.

A branch fez tres coisas:
1. Criou `getMockupVariantPhotos(variant, product)`: lista apenas as fotos reais daquela
   cor, sempre resolvidas para o original (`/public`), sem placeholder e sem repetir a mesma
   foto em tamanhos diferentes.
2. Inseriu um passo novo no fluxo (estado `pendingVariant` + `confirmPhoto`): depois da cor,
   o vendedor escolhe a foto, via componente `MockupPhotoPicker`; sem foto utilizavel nao
   avanca.
3. A miniatura passou a ser usada so na previa pequena da tela
   (`getCdnUrl(selection.imageUrl, 'thumbnail')`), enquanto a selecao guarda o original.
   Cobertura em `tests/components/mockup/MockupProductSelector.photo.test.tsx` (216 linhas,
   arquivo novo).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Commit da branch | ESTA, entrou por squash em 2026-10-29 | `git log -S"getMockupVariantPhotos" --oneline origin/main` → `ed4529c511 fix(mockup): geração usa a foto original escolhida, nunca a miniatura` (mesmo assunto do commit da branch); `git show -s --date=short ed4529c511` → `2026-10-29` |
| `getMockupVariantPhotos` (fotos reais, original, dedupe, sem placeholder) | ESTA, movida para modulo proprio `src/components/mockup/mockupVariantPhotos.ts` e re-exportada pelo seletor | `git show origin/main:src/components/mockup/mockupVariantPhotos.ts` linhas 5-43: `CDN_SIZE_SUFFIX`, `isRealPhoto`, dedupe por `base`, `getCdnUrl(url, 'public')` — mesmo corpo da branch; `MockupProductSelector.tsx:28,30` `import { getMockupVariantPhotos } from './mockupVariantPhotos'` / `export { getMockupVariantPhotos }` |
| Passo novo "escolher a foto" (`pendingVariant`) | ESTA | `MockupProductSelector.tsx:93` `const [pendingVariant, setPendingVariant] = useState<...>`; `:165-168` `handleColorSelect` apenas faz `setPendingVariant({ variant, product })` |
| `confirmPhoto` manda o original para a geracao | ESTA | `MockupProductSelector.tsx:172-182` — `imageUrl: photo` |
| Tela de escolha da foto (`MockupPhotoPicker`) | ESTA, arquivo proprio na main | `git ls-tree origin/main src/components/mockup/` → `MockupPhotoPicker.tsx`; `MockupProductSelector.tsx:256-261` renderiza o picker com `photos={getMockupVariantPhotos(...)}` |
| Produto sem foto utilizavel nao avanca | ESTA | `MockupPhotoPicker.tsx:35-36` `<p role="alert" ...>Este produto não tem foto utilizável para gerar o mockup.` |
| Previa pequena usa miniatura, selecao guarda o original | ESTA | `MockupProductSelector.tsx:199` `src={getCdnUrl(selection.imageUrl, 'thumbnail')}` |
| Teste `MockupProductSelector.photo.test.tsx` | ESTA | `git ls-tree origin/main tests/components/mockup/` → `cad35e5ea9 ... MockupProductSelector.photo.test.tsx`; diff (B) do pacote mostra que a main so adicionou `measure: () => undefined` ao mock do virtualizador e trocou `null` por `[]`/`undefined` em dois fixtures (ajuste de tipo). Todos os casos (`devolve o original e não repete...`, `a foto enviada à geração é a ORIGINAL escolhida`, `permite escolher entre as fotos da MESMA variante`, `produto sem foto utilizável não deixa avançar`, `a prévia pequena usa a miniatura...`) continuam no arquivo da main |

Por que os 2 arquivos ainda "diferem da main": a main andou em cima deste mesmo arquivo
depois do merge, por outros motivos — a funcao saiu para `mockupVariantPhotos.ts`, entraram
grade responsiva do catalogo (`getMockupGridColumnCount`, `MOCKUP_GRID_BREAKPOINT_*`),
estados de erro/vazio (`MockupCatalogStates`) e o botao "Trocar variante". Nada disso remove
o que a branch fez; o diff e evolucao posterior, nao perda.

## A resgatar

Nada. Todos os itens da branch estao na main, com evidencia item por item acima.

## Risco de fechar esta branch

Nenhum risco identificado. O comportamento que a branch entregou (vendedor escolhe a foto;
mockup gerado com a foto grande; produto sem foto nao avanca) esta em producao na main, com
o teste automatizado que a branch escreveu tambem na main. Fechar a branch nao muda nada do
que o cliente ve.

## Nao verificado

- Nao executei `npm test` nem build para conferir que o teste passa hoje na main (a tarefa e
  somente leitura); a conferencia foi por codigo e historico.
- Nao conferi o comportamento no ambiente de producao pelo navegador.
