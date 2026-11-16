# origin/importado/vps-fabrica/v2/s30-2610081946

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz o gerador de mockup já abrir com o produto certo escolhido, não importa por qual botão ou link o vendedor chegou lá — e isso já está funcionando em produção.
- **Tip / merge-base / main:** tip `a8b6a993124e62dd4dd94dd255e50ac44b4fb0cd` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um único commit (`a8b6a99312`, Fabrica Hermes, 2026-10-09):
`fix(mockup): gerador aceita product_id, productId e state do router para pre-selecionar o produto`.

O gerador de mockup é aberto por três caminhos e cada um entregava o produto de um jeito
diferente, mas o código só lia **um** deles (`?product_id=`). Nos outros dois o cliente abria o
gerador e o produto vinha em branco, obrigando a escolher de novo na mão. A branch fez duas
coisas:

1. **Comportamento** (`src/hooks/mockup/useMockupGenerator.ts`): criou o resolvedor puro
   `resolveEntryProductId({ search, routerState })`, que aceita, nesta ordem, `?product_id=`
   (deep link legado) → `?productId=` (botão flutuante QuickQuoteFAB) →
   `state.preSelectedProduct.id` (badge "Visualizar com Logo"). Ignora valor vazio ou de tipo
   errado sem estourar erro, faz `trim`, e ao limpar a URL apaga só as chaves que consumiu
   (`product_id`, `productId`, `technique`), preservando os demais parâmetros.
2. **Prova** (`src/hooks/mockup/__tests__/mockupEntry.params.test.ts`, arquivo novo, 205 linhas):
   11 testes cobrindo os três formatos, entrada inválida, limpeza seletiva da URL e a prioridade
   da query string sobre o state do router.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Resolvedor `resolveEntryProductId` com os 3 formatos, trim e tolerância a tipo errado | **ESTÁ** — movido de `useMockupGenerator.ts` para `src/hooks/mockup/mockupGeneratorModel.ts`, corpo idêntico linha a linha (mesmo laço `for (const key of ['product_id','productId'])`, mesmo guard `typeof id === 'string' && id.trim()`) | `src/hooks/mockup/mockupGeneratorModel.ts:107` (`export function resolveEntryProductId`), tipo `MockupEntryRefs` em `:93` com o mesmo comentário "A-7" |
| Efeito que aplica a pré-seleção e lê `location.state` do router | **ESTÁ** — extraído para o hook próprio `useMockupEntryParams`, que chama `resolveEntryProductId({ search: window.location.search, routerState: location.state })` | `src/hooks/mockup/useMockupEntryParams.ts:38-41`; consumido em `src/hooks/mockup/useMockupGenerator.ts:314-321` (`useMockupEntryParams({ isLoadingData, hasDraftRestored, techniques, getProductById, setProductSelection, setSelectedTechnique })`) |
| Aceitar `?productId=` na limpeza da URL (`newParams.delete('productId')`) e o guard `hasEntryParams` | **ESTÁ** — idêntico | `src/hooks/mockup/useMockupEntryParams.ts:58-65` (`const hasEntryParams = params.has('product_id') \|\| params.has('productId') \|\| params.has('technique')` e os três `delete`) |
| Arquivo de teste `mockupEntry.params.test.ts` com os 11 testes | **ESTÁ** — mesmo caminho, mesmos 3 `describe` e as mesmas 11 descrições de `it`, inclusive "param vazio cai para o próximo formato disponível" e "prioriza a query string sobre o state do router" | `git show origin/main:src/hooks/mockup/__tests__/mockupEntry.params.test.ts` linhas 141-213 — lista de `it`/`describe` idêntica à da branch (linhas 129-201) |
| Quando entrou | PR **#2739** `fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo (entregas VPS)` trouxe o arquivo de teste e o símbolo | `git log --diff-filter=A origin/main -- src/hooks/mockup/__tests__/mockupEntry.params.test.ts` → `294cee8389`; `git log -S"resolveEntryProductId" --oneline origin/main` → mais antigo é `294cee8389` |

As duas únicas diferenças que a main tem hoje nesses arquivos são refatoração posterior, não
perda de conteúdo: (a) o símbolo mudou de módulo e o teste passou a importá-lo de
`../mockupGeneratorModel` (diff B, linha do `import`); (b) os mocks do teste foram refinados
(`importOriginal` para `resolveTechnique`, mock por área de `useLogoColorAnalysis`) e o flag
`future: { v7_startTransition... }` do `MemoryRouter` foi removido. Nenhuma asserção foi
removida.

## A resgatar

Nada. Os dois arquivos da branch foram lidos por inteiro (diff A e diff B) e cada item tem
par verificado na main.

## Risco de fechar esta branch

Nenhum risco prático. O comportamento que a branch entrega (abrir o gerador já com o produto
pré-selecionado pelos três caminhos) está em produção na main, protegido pelos mesmos 11 testes.
Fechar a branch não muda nada para quem usa o sistema. O único custo é histórico: perde-se a
mensagem de commit original de 2026-10-09, que já está refletida nos comentários "A-7" do código
da main.

## Nao verificado

- Não foi executada a suíte (`npm test`) nesta análise — a tarefa é somente leitura; a
  equivalência foi provada por comparação de código e de nomes de teste, não por execução.
- A branch não toca `supabase/migrations`, policy, grant, função do banco nem
  `supabase/functions` (o commit altera exatamente 2 arquivos, ambos em `src/hooks/mockup/`),
  portanto não há nada de banco ou edge a verificar.
