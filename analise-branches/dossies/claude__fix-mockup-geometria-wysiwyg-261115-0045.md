# origin/claude/fix-mockup-geometria-wysiwyg-261115-0045

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz a logo sair na imagem do mockup no mesmo tamanho que o vendedor posicionou na tela — isso ja esta em producao; o que sobrou da branch e uma pergunta de negocio: se o sistema deve RECUSAR gerar mockup de produto sem medidas cadastradas, ou gerar com uma estimativa.
- **Tip / merge-base / main:** tip `738445d926953d20c32bf5ade7ea5f6f1a7fd78a` · merge-base `865c86ef8ffe5650416a5ace436acbbf61d9d080` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`738445d926`, "fix(mockup): logo no tamanho real na imagem gerada"). A edge
`generate-mockup` desenhava a logo com uma conta propria: supunha um produto-referencia de 20 cm
(`FALLBACK_PRODUCT_REFERENCE_CM`) sempre que o payload nao trazia as duas medidas, usava minimo de
8 px e encolhia a logo num teto de 98% do quadro. Resultado: a imagem entregue ao cliente saia com
a logo em tamanho diferente do que o vendedor viu na tela.

A branch fez quatro coisas:

1. criou `supabase/functions/generate-mockup/geometry.ts` replicando a formula do editor
   (`cmParaPx` de `src/lib/mockup-geometry.ts`): minimo de 40 px, inferencia de uma dimensao a
   partir da outra, `DEFAULT_PRODUCT_FRACTION = 0.85`, sanitizacao de cm <= 0 e troca do teto de
   98% por um teto de absurdo proporcional `MAX_LOGO_PX = 8 * 1024`;
2. ligou `index.ts` nessa formula (`logoSizePx()` no lugar de `computeLogoPx()`), apagando o
   produto-referencia de 20 cm, o minimo de 8 px e o teto de 98%;
3. criou a prova `index.geometry.test.ts` e registrou o arquivo em `vitest.config.ts` (sem a
   entrada de `include` o teste nao e coletado);
4. **alem disso**, acrescentou um portao de servidor: sem nenhuma medida real do produto a edge
   recusava com `422 missing_dimensions` (`checkProductDimensions`, `hasProductDimensions`,
   `MISSING_DIMENSIONS_ERROR_CODE/STATUS`, e um parametro `status` novo em `validationError`).

Os itens 1 a 3 sao o conserto do tamanho da logo. O item 4 e uma regra de negocio diferente,
colada no mesmo commit.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| modulo `geometry.ts` da edge (formula do editor) | ESTA | `origin/main:supabase/functions/generate-mockup/geometry.ts` existe (`git cat-file -e` OK); entrou no squash `b89a44e100` (PR #3665) — `git log --oneline origin/main -- supabase/functions/generate-mockup/geometry.ts` |
| minimo de 40 px no lugar de 8 px | ESTA | `origin/main:supabase/functions/generate-mockup/geometry.ts:29` `export const MIN_LOGO_PX = 40;` |
| fracao default 0.85 no lugar de 1 | ESTA | `origin/main:supabase/functions/generate-mockup/geometry.ts:47` `export const DEFAULT_PRODUCT_FRACTION = 0.85;` |
| `cmParaPx`/`logoSizePx` (inferencia de uma dimensao, ordem boost -> escala) | ESTA, identico | `origin/main:...geometry.ts:126` `export function logoSizePx(`; o diff (B) do pacote so mexe em comentario dentro de `cmParaPx` |
| teto de absurdo proporcional `MAX_LOGO_PX = 8*1024` no lugar do teto de 98% | ESTA | diff (B) do pacote nao toca `MAX_LOGO_PX`; e `git show origin/main:...index.ts \| grep -c "MAX_LOGO_CANVAS_FRACTION"` = 0 |
| `index.ts` usando a geometria compartilhada | ESTA | `origin/main:supabase/functions/generate-mockup/index.ts:9` `import { logoSizePx } from "./geometry.ts";` e `:308` `const { lw, lh } = logoSizePx({` |
| remocao de `computeLogoPx` / produto-referencia de 20 cm / minimo de 8 px | ESTA (removidos) | `git show origin/main:supabase/functions/generate-mockup/index.ts \| grep -c "computeLogoPx\|FALLBACK_PRODUCT_REFERENCE_CM\|MAX_LOGO_CANVAS_FRACTION"` = 0 |
| teste `index.geometry.test.ts` | ESTA (adaptado ao item de baixo) | `origin/main:supabase/functions/generate-mockup/index.geometry.test.ts` existe; os 7 casos numericos (`CASOS`) e os testes de minimo/fracao/teto continuam iguais |
| entrada do teste em `vitest.config.ts` | ESTA | `origin/main:vitest.config.ts:71` `'supabase/functions/generate-mockup/index.geometry.test.ts'` |
| **portao `422 missing_dimensions` na edge** | **NAO ESTA — excluido de proposito** | `git grep "checkProductDimensions" origin/main -- supabase src` nao retorna nada em codigo; a decisao esta escrita em `origin/main:docs/coordenacao/conflitos-semanticos.md:47` e no cabecalho de `origin/main:supabase/functions/generate-mockup/geometry.ts:13-17` ("A branch de origem recusava com 422 missing_dimensions; essa parte nao foi aplicada por mudar regra de negocio para o usuario final") |
| `status` configuravel em `validationError` | NAO ESTA (so existia para servir o 422) | diff (B): `validationError` na main volta a `{ status: 400, ... }` fixo |

Nota: a diferenca restante em `vitest.config.ts` nao e perda da branch — e uma linha **a mais** na
main (`origin/main:vitest.config.ts:74`, `index.size.test.ts`, dos tetos de entrada em
`limits.ts`, que tambem ja estao na main).

## A resgatar

Nada de codigo a resgatar por engano. Ha **uma decisao de negocio pendente**, e so o dono decide:

- **Produto sem medidas cadastradas (cm): o sistema recusa gerar o mockup, ou gera com uma
  estimativa?**
  - Hoje na main: **gera**, usando a estimativa de 8x20 cm — a mesma que o editor desenha na tela
    (`origin/main:supabase/functions/generate-mockup/geometry.ts:94-95`).
  - O que a branch queria: **recusar** no servidor (422), igual a recusa que a tela de mockup do
    produto ja faz hoje (`origin/main:src/hooks/mockup/useMockupGenerator.ts:531-534`,
    `return { ok: false, error: MISSING_DIMENSIONS_REFUSAL }`).
  - Por que nao foi aplicado: a previa do montador de kits nao manda medida nenhuma
    (`origin/main:src/components/kit-builder/PersonalizationConfig.tsx:167-200` —
    `buildKitMockupRequest` monta o payload sem `productWidthCm`/`productHeightCm`), entao o 422
    passaria a recusar **toda** previa de kit.
  - Efeito pratico de cada escolha: recusar = nunca sai mockup com medida inventada, mas a previa
    de kit para de funcionar enquanto os produtos nao tiverem medida cadastrada. Estimar = a previa
    continua funcionando, mas um produto sem medida pode gerar um mockup com a logo em proporcao
    errada.

## Risco de fechar esta branch

Baixo para o codigo: o conserto do tamanho da logo esta inteiro na main desde o squash
`b89a44e100` (PR #3665), com os mesmos numeros e os mesmos testes. Fechar a branch nao desfaz
nada e nao perde linha de codigo.

O risco e de memoria: o unico item que a branch tem e a main nao e a pergunta de negocio acima.
Se a branch for fechada sem levar essa pergunta ao dono, ela desaparece do radar e o sistema
segue, por omissao, gerando mockup com medida estimada para produto sem cadastro de dimensoes.
A pergunta ja esta registrada em `docs/coordenacao/conflitos-semanticos.md:47` e na tarefa "levar
ao dono os itens DECISAO_HUMANA", entao o risco e controlado — mas e real se esse registro for
perdido.

## Nao verificado

- Nao foi executado nada: nenhum teste, lint, typecheck ou chamada a edge nesta analise (a tarefa
  e somente leitura do git). Os "453 testes" citados na mensagem do commit da branch nao foram
  reconferidos aqui.
- Nao foi verificado se a versao da edge `generate-mockup` **publicada em producao** corresponde ao
  `index.ts` da main (ha pendencia conhecida de 19 edge functions divergentes do repositorio). Logo,
  "a main tem o conserto" e afirmacao sobre o codigo da main, nao sobre o que roda em producao.
- Nao foi medido o impacto visual: nao foi gerado mockup antes/depois para comparar imagem.
