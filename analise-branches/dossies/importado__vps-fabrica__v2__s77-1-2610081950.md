# origin/importado/vps-fabrica/v2/s77-1-2610081950

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada a mais hoje — ela trouxe dois testes automaticos que vigiam se o mockup, ao ser reaberto, volta com a marca do cliente, o cliente, o produto e a tecnica certos; esses dois testes ja estao na main e passando.
- **Tip / merge-base / main:** tip `aec711af622fea6b32d366bb763150e401381896` / merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico: `aec711af62 test(mockup): matriz de aceite do grupo 1 (A01-A02, marca e upload/PNG)`.

A branch nao mexe em codigo de produto. Ela **cria dois arquivos novos de teste** (nenhum outro arquivo
e tocado) para firmar o "grupo 1" da matriz de aceite do Mockup:

- **A01** — reabrir um rascunho salvo tem de devolver a marca (logo) do cliente ja aplicada, mais o
  cliente, o produto e a tecnica, **sem o usuario subir a imagem de novo** (exercita `restoreDraft` de
  `useMockupGenerator`).
- **A02** — recarregar do historico um mockup salvo em PNG tem de devolver a logo, o cliente, o produto
  e a tecnica, limpar o rascunho antigo e avisar o usuario ("Configuracoes carregadas!") (exercita
  `loadFromHistory`).

Os dados usados sao ficticios e fixos (`FIXTURE-*`, `https://fixture.invalid/...`), sem cliente ou marca
real e sem rede — declarado no cabecalho de `grupo1.fixtures.ts:1-5`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Arquivo de teste `grupo1.acceptance.test.tsx` | Existe na main, no mesmo caminho | `git ls-tree -r --name-only origin/main -- tests/components/mockup/acceptance/` lista `tests/components/mockup/acceptance/grupo1.acceptance.test.tsx` |
| Arquivo de fixtures `grupo1.fixtures.ts` | Existe na main, no mesmo caminho | mesma saida de `git ls-tree` lista `tests/components/mockup/acceptance/grupo1.fixtures.ts` |
| Como entrou (squash) | PR #2736 (lote A da fabrica VPS), depois reforcado pela PR #3672 | `git log --oneline origin/main -- tests/.../grupo1.acceptance.test.tsx` → `31ebc2d35c test+docs(mockup/magic-up): entregas de teste e doc da fabrica VPS (lote A) (#2736)` e `dbe11812e9 test(mockup): resgata 39 testes do gerador de mockup que estavam desligados por mock incompleto (#3672)` |
| Cenario A01 (describe + teste) | Na main | `grupo1.acceptance.test.tsx:173-174` na main: `describe('A01 — marca do cliente aplicada e reaberta sem upload manual'` + `it('rascunho reaberto restaura a marca (logo ja hospedada), o cliente, o produto e a tecnica, sem novo upload'` |
| Cenario A02 (describe + teste) | Na main | `grupo1.acceptance.test.tsx:200-201` na main: `describe('A02 — PNG valido salvo e recarregado restaura logo, cliente e produto'` + `it('recarregar o mockup salvo do historico restaura a logo (PNG), o cliente, o produto, a tecnica e a geometria'` |
| Todas as asseres de A01 da branch (1 area, `logoPreview = MARCA_CLIENTE_URL`, `logoWidth`, `positionX`, nome do cliente, id do produto, id da tecnica, `showDraftRestoredNotice`) | Todas na main, nenhuma removida | `grupo1.acceptance.test.tsx:182-196` na main (8 asseres, incluindo `expect(result.current.showDraftRestoredNotice).toBe(true)` na L196) |
| Todas as asseres de A02 da branch (1 area, `logoPreview = LOGO_PNG_URL`, cliente id/nome, produto id, nome da tecnica, `mockClearDraft` 1x, toast "Configuracoes carregadas!") | Todas na main, nenhuma removida | `grupo1.acceptance.test.tsx:212-230` na main, incluindo `expect(mockClearDraft).toHaveBeenCalledTimes(1)` (L227) e `.toHaveBeenCalledWith('Configuracoes carregadas!')` (L230) |
| Os 8 dados ficticios exportados (`CLIENTE_FIXTURE`, `PRODUTO_FIXTURE`, `TECNICA_FIXTURE`, `MARCA_CLIENTE_URL`, `MOCKUP_PNG_URL`, `LOGO_PNG_URL`, `RASCUNHO_MARCA_CLIENTE`, `MOCKUP_SALVO_PNG`) | Todos os 8 na main | `git show origin/main:tests/.../grupo1.fixtures.ts \| grep "^export const"` → 8 exports, nos mesmos nomes (L10, L18, L26, L33, L36, L37, L43, L70) |
| Os dois testes funcionam hoje | Passam na main | `npx vitest run tests/components/mockup/acceptance/grupo1.acceptance.test.tsx` → `Test Files 1 passed (1)` / `Tests 2 passed (2)` |

### Por que os 2 arquivos "diferem da main" sem nada ter ficado de fora

A main nao perdeu nada: ela **reforcou** o que a branch escreveu. As unicas diferencas (diff B do pacote):

1. **Mock parcial em vez de mock total** (`useMockupTechniques` e `@/hooks/simulation` passaram a usar
   `importOriginal`/`await import(...)`): a main deixou de desligar o modulo inteiro, entao o teste passou
   a exercitar mais codigo de verdade. E exatamente a correcao descrita na PR #3672 ("testes desligados
   por mock incompleto"). Ganho, nao perda.
2. **Asseres novas**: `activeArea.id` em A01 e, em A02, a geometria gravada (`location_name`,
   `position_x`, `position_y`, `logo_width_cm`, `logo_height_cm`) voltando para a area.
3. **Dois numeros de fixture mudados** — `RASCUNHO_MARCA_CLIENTE.personalizationAreas[0].positionX`
   `50 → 35` e `MOCKUP_SALVO_PNG.position_x` `50 → 38`. Isso **conserta um furo da branch**: o valor 50 e
   identico ao padrao de area nova (`src/hooks/mockup/mockupGenerationService.ts:30`, `positionX: 50` em
   `createDefaultArea()`), logo a assercao da branch passaria mesmo se a restauracao nao tivesse
   acontecido. Com 35 e 38 o teste so passa se a posicao salva realmente voltar.
4. **Cabecalho documentado**: a main acrescentou um bloco "PENDENTE" dizendo o que esses dois testes
   **nao** cobrem (ver "Nao verificado" abaixo).

Nenhuma linha de conteudo da branch foi apagada na main — toda assercao e toda fixture da branch estao la,
com os mesmos nomes.

## A resgatar

Nada. Os dois arquivos da branch estao na main, com todo o conteudo preservado e reforcado, e os dois
testes passam.

## Risco de fechar esta branch

Praticamente nulo. A branch nao tem codigo de produto, nao mexe em banco, politica de acesso, edge
function, workflow nem configuracao — so dois arquivos de teste, e ambos ja vivem na main em versao
melhor. Fechar nao apaga nenhuma protecao: os dois testes continuam rodando na main (verificado:
2 de 2 passando). O unico "risco" seria se a main tivesse descartado uma assercao; conferi uma por uma
e nenhuma foi descartada.

## Nao verificado

- **Nao e defeito desta branch, e um alerta de negocio que a propria main registra**: no cabecalho de
  `tests/components/mockup/acceptance/grupo1.acceptance.test.tsx` (bloco "PENDENTE", versao da main) esta
  escrito que o item A01 "marca do cliente **aplicada**" ainda **nao existe no sistema** — o logo que o CRM
  devolve hoje so aparece como avatar e cabecalho da ficha do cliente, nunca como logo do mockup; a acao
  "Usar logo do cliente" estaria na branch `v2/s54-2610081948`, ainda nao integrada. Os dois testes provam
  apenas a parte "reaberta sem novo upload". **Nao verifiquei** se essa acao entrou na main depois — esta
  fora do escopo desta branch e merece checagem propria (dossie da `v2/s54-2610081948`).
- Nao executei a suite completa de testes nem lint/typecheck do repo; rodei apenas o arquivo de aceite do
  grupo 1 (o escopo desta branch).
- Nenhum arquivo ficou sem leitura: a branch mexeu em 2 arquivos que diferem da main e o pacote traz os
  dois diffs completos, sem truncamento.
