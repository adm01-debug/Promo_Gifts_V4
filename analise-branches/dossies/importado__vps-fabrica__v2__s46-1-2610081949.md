# origin/importado/vps-fabrica/v2/s46-1-2610081949

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada muda para quem usa o sistema — e uma faxina na bateria de testes automaticos do Gerador de Mockups, trocando conferencias fracas (que so liam o texto do codigo) por conferencias de verdade (que executam o codigo); essa faxina ja esta na producao.
- **Tip / merge-base / main:** tip `34ece6214eb3c278ce277b6e7ebc932edf10c010` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico: `34ece6214e` — "test(mockup): aposentar blocos grep/copia-local da fatia 1 do mockup-audit".
A branch mexeu em **2 arquivos, somente de teste** (`git diff --stat c194982c5f 34ece6214e`: 11 insercoes, 344 remocoes). Nenhum arquivo de produto, banco ou edge function.

A intencao tem tres partes:

1. **Apagar a copia local da funcao `getTechniquePrompt`** dentro de `mockup-audit.test.ts` — o teste reimplementava a tabela `TECHNIQUE_PROMPTS` e duas versoes da funcao (`getTechniquePromptFixed` / `getTechniquePromptBUGGY`) e testava a copia, nao o codigo real. Teste que nao toca o codigo de producao nao protege nada.
2. **Apagar o bloco de "analise estatica" de `mockupGenerationService.ts`** — ~110 linhas de assercoes tipo `expect(src).toContain('logo_url: logoUrl')`, isto e, grep no texto-fonte (itens T4, T6, T7, T8, T10, BUG-C, BUG-E, BUG-I). Quebram em qualquer renomeacao e passam mesmo com o comportamento errado.
3. **Levar a cobertura perdida para o teste de comportamento** `mockupGenerationService.test.ts`: as tecnicas `uv` e `sublimacao`, e as colunas `position_y`, `logo_width_cm`, `logo_height_cm` no INSERT do mockup.

A branch tambem apagou o bloco de analise estatica de `useMockupGenerator.ts` — essa parte a main decidiu **nao** aceitar (ver tabela).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Teste de comportamento para as tecnicas `uv` e `sublimacao` | ESTA — `src/hooks/mockup/__tests__/mockupGenerationService.test.ts:134-140`, inclusive com o comentario escrito por esta branch | `git show origin/main:...mockupGenerationService.test.ts \| grep -n` → `134: it('maps the remaining known codes (uv, sublimacao)'` / `135: // Carried over from the retired mockup-audit.test.ts T7 local copy.` |
| Assercoes de `position_y`, `logo_width_cm`, `logo_height_cm` no INSERT | ESTA, e **reforcada**: a main usa X=30 e Y=70 (valores distintos), de modo que trocar as duas colunas quebra o teste — a branch usava 50/50, que nao pegaria a troca | mesmo arquivo, `:174-178` → `// X e Y distintos: trocar position_x por position_y no INSERT quebra o teste.` / `expect(row.position_y).toBe(70);` / `logo_width_cm` / `logo_height_cm` |
| Aposentadoria da copia local de `getTechniquePrompt` (`TECHNIQUE_PROMPTS`, `getTechniquePromptFixed`, `getTechniquePromptBUGGY`) | ESTA (o bloco foi removido tambem na main) | `git show origin/main:...mockup-audit.test.ts \| grep -c "getTechniquePromptBUGGY\|TECHNIQUE_PROMPTS"` → `0`. No merge-base existia: `git show c194982c5f:...` → linhas 21, 39, 48, 56 |
| Aposentadoria do bloco grep `Analise estatica — mockupGenerationService.ts` (T4/T6/T7/T8/T10/BUG-C/BUG-E/BUG-I) | ESTA (removido na main) | ausente na main (grep acima = 0); presente no merge-base em `...mockup-audit.test.ts:105`. `git log -S"Analise estatica — mockupGenerationService.ts" origin/main` → removido em `294cee8389 2026-11-01 fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo (entregas VPS) (#2739)` |
| Cobertura equivalente, de comportamento, para os itens que o bloco grep vigiava | ESTA em `mockupGenerationService.test.ts` na main: T6 (`:279 applies an owner-scoped filter ... (T6)`), T8 (`:259 limit' && c.args[0] === 200`), T10 (`:158 thumbnail_url = mockupUrl (G5/T10)`), T7 (`:148 does not let "default" win by substring (T7 regression)`), SVG (`:388 translates the SVG_NOT_SUPPORTED`), medidas (`:341 maps geometry to logoWidthCm/logoHeightCm`), lote parcial (`:417 batch: keeps successful areas`) | `git show origin/main:...mockupGenerationService.test.ts \| grep -n "^  it("` |
| Aposentadoria do bloco grep `Analise estatica — useMockupGenerator.ts` | **NAO ESTA** — e foi recusa deliberada, no mesmo commit que absorveu a branch: a main manteve o bloco e escreveu o porque | `git show origin/main:...mockup-audit.test.ts:18-21` → `// STATIC ANALYSIS — useMockupGenerator.ts (guardas de runtime mantidas: ainda sem teste de comportamento equivalente do hook na main)`; bloco em `:22-139`. `git log -S"guardas de runtime mantidas" origin/main` → `294cee8389` (o mesmo squash). A main ainda adaptou as assercoes aos arquivos novos (`mockupGeneratorModel.ts`, `useMockupEntryParams.ts`) e acrescentou guardas que a branch nao tinha (re-entrancia `isGeneratingRef`, `reader.onerror`, `isDraftLoading`) |

**Como a branch entrou:** o repo usa squash-merge, entao a branch nunca sera ancestral da main. O portador e `294cee8389` ("entregas VPS", PR #2739, 2026-11-01) — o mesmo commit que (a) removeu os dois blocos que a branch removeu, (b) adicionou o teste `uv/sublimacao` com o comentario **literal** escrito nesta branch, e (c) registrou por escrito a decisao de preservar as guardas de `useMockupGenerator.ts`. O nome da branch (`importado/vps-fabrica`) casa com o titulo do PR ("entregas VPS").

## A resgatar

Nada. Os 2 arquivos que a branch tocou estao integralmente resolvidos na main, e a unica parte nao aplicada (apagar as guardas de `useMockupGenerator.ts`) foi uma decisao consciente e documentada no proprio merge — reaplica-la hoje **removeria** protecao que a main declara ainda nao ter substituto.

## Risco de fechar esta branch

Praticamente zero. A branch nao altera nenhuma tela, regra de negocio, preco, permissao, banco de dados nem funcao de servidor — so arquivos de teste. Todo o ganho dela (testes que exercitam o codigo de verdade, no lugar de leituras de texto) ja esta em producao desde 2026-11-01, e em versao melhor: a main detecta a troca entre as coordenadas X e Y do logo, coisa que a versao da branch nao detectava. Fechar a branch nao apaga nada do que ela produziu.

## Nao verificado

- **Nao executei a bateria de testes** (`npm test`) em nenhum dos lados. A conferencia foi de conteudo dos arquivos (`git show`/`git diff`/`git log -S`), nao de execucao verde.
- O bloco grep aposentado tinha duas assercoes sobre **timeout** (`GENERATE_TIMEOUT_MS >= 30000` e a mensagem "Tempo esgotado ao gerar mockup") para as quais **nao encontrei teste de comportamento equivalente** na main (`grep "Tempo esgotado\|GENERATE_TIMEOUT"` em `origin/main:src/hooks/mockup/__tests__/mockupGenerationService.test.ts` → sem resultado). Isso e uma lacuna da main, nao item a resgatar desta branch (a branch apagou a guarda; a main aceitou a remocao, e o commit `294cee8389` declara ter entregue o "timeout 30 s" no produto). Nao verifiquei se existe esse teste em outro arquivo da suite.
- As assercoes T1/T2 (os 7 handlers em `useCallback`) do merge-base nao existem mais em lado nenhum. Nao investiguei se ha equivalente, porque sao assercoes que a branch apagou e a main nao restaurou — nao e trabalho da branch a resgatar.
- O pacote de evidencia entregue estava **truncado** no meio do diff (B) de `mockup-audit.test.ts`. Supri lendo a main direto com `git show origin/main:...` e `git log -S`, entao nenhum arquivo ficou sem leitura.
