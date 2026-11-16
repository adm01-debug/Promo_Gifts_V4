# origin/claude/fix-ft004-ft033-pptx-mock-labels-261101-2212

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** avisa o vendedor, no PowerPoint do cliente, quais numeros sao simulados em vez de reais — e isso ja esta funcionando no sistema de hoje.
- **Tip / merge-base / main:** tip `918066593153cc8246326eb3d019478d892aa6d1` · merge-base `d2033d9237fa72971ff9c92ca47442f7437463ff` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, tres intencoes (pelas mensagens em `=== COMMITS ===` do pacote):

1. **FT-004 — selo "Dados simulados" nos slides 3 e 4 do PPTX.** Os slides de AFINIDADE/TENDENCIAS e
   SAZONALIDADE nao avisavam quando os numeros eram simulados; o slide 6 ja avisava. A branch copiou o
   padrao do slide 6 para os slides 3 e 4 (`src/lib/bi/pptxGenerator.ts`).
2. **FT-033 — deixar o grafico de mercado estavel entre telas.** `generateMockMarketData` usava
   `Math.random()`, entao o grafico de demonstracao mudava de forma a cada render. A branch trocou por
   `seededRandom()` (`src/components/intelligence/MarketIntelligenceChart.tsx`).
3. **FT-002 — apagar `getMockSupplierTrust`,** funcao de dados falsos de fornecedor que ninguem mais
   chamava (`src/components/common/SocialProof.tsx`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| FT-004: selo de dados simulados no slide 3 (AFINIDADE/TENDENCIAS) | ESTA, com a mesma condicao, via funcao compartilhada | `origin/main:src/lib/bi/pptxGenerator.ts:343` → `if (affinity?.isMock \|\| trends?.isMock) addMockBadge(s3);` |
| FT-004: selo de dados simulados no slide 4 (SAZONALIDADE) | ESTA, com a mesma condicao | `origin/main:src/lib/bi/pptxGenerator.ts:500` → `if (seasonality.isMock) addMockBadge(s4);` |
| FT-004: o selo em si (texto, posicao, cor, italico) | ESTA, extraido para helper reutilizavel que cita a propria FT | `origin/main:src/lib/bi/pptxTheme.ts` → `/** FT-004: marca o slide quando a secao veio de dados simulados (isMock). */ export function addMockBadge(slide)`, com os mesmos `x:10.5 y:0.7 fontSize:9 color:C.warn italic align:'right'` |
| FT-004: cobertura dos demais slides | main e SUPERSET da branch: cobre tambem os slides 2 e 5 | `origin/main:src/lib/bi/pptxGenerator.ts:181` (`bi.isMock \|\| vs.isMock → s2`) e `:660` (`... → s5`) |
| quando o FT-004 entrou na main | entrou por um resgate declarado de branches de outros agentes, em 15/11 | `git log -S"addMockBadge" --oneline origin/main -- src/lib/bi/pptxGenerator.ts src/lib/bi/pptxTheme.ts` → `5e59cb9c79 fix: trem de resgates — 16 correcoes recuperadas de branches de outros agentes (#3660)` |
| FT-033: `seededRandom` no grafico de mercado | O PROBLEMA NAO EXISTE MAIS: a main apagou o gerador de dados falsos inteiro e passou a mostrar estado vazio | `git grep -c "generateMockMarketData" origin/main -- src` → zero ocorrencias; `origin/main:src/components/intelligence/MarketIntelligenceChart.tsx:43,112,357` usa `EmptyState` e nao tem nenhum `Math.random` (grep por `Math.random` no arquivo da main: vazio) |
| FT-002: remocao de `getMockSupplierTrust` | ESTA: a funcao nao existe mais em `src/` na main | `git grep -n "getMockSupplierTrust" origin/main -- src` → zero ocorrencias (sobra so em `CHANGELOG.md`, em `docs/` historico e em `recovery/src-legacy/`, que e arquivo morto) |
| FT-002: a PR correspondente | mergeada | `origin/main:CHANGELOG.md:240` → `**selos:** remove getMockSupplierTrust dead code (FT-002) (#2963) (20b6646)` — mesmo assunto do commit `3033d17d29` da branch |

Observacao de redacao (residuo conhecido, **nao e trabalho perdido**): no slide 3 a branch escrevia
"Dados parcialmente simulados" e a main, por usar o helper unico, escreve "Dados simulados"
(`pptxTheme.ts`). O slide 6 da main preservou o texto mais preciso
(`origin/main:src/lib/bi/pptxGenerator.ts:773`). Efeito pratico: num slide 3 em que so uma das duas
secoes seja simulada, o selo e mais severo do que a realidade — avisa demais, nunca de menos. Nao ha
risco de o cliente receber numero inventado sem aviso, que era o ponto da FT-004.

## A resgatar

Nada. Os tres objetivos da branch estao no sistema de hoje, com evidencia por item na tabela acima, e em
dois deles a main esta mais completa que a branch (selo em 4 slides em vez de 2; dados falsos do grafico
removidos em vez de apenas estabilizados).

## Risco de fechar esta branch

Nenhum risco para o negocio. Nao mexe em banco de dados, nem em funcao de servidor, nem em configuracao
de publicacao — sao tres arquivos de tela/relatorio (`SocialProof.tsx`,
`MarketIntelligenceChart.tsx`, `pptxGenerator.ts`). O aviso de "dados simulados" no PowerPoint continua
aparecendo sem esta branch, e em mais slides. Reaplicar a branch como esta seria pior: ela traria de
volta o gerador de numeros falsos do grafico de mercado que a main removeu de proposito.

## Nao verificado

- Nao foi verificado em producao (navegador/arquivo .pptx gerado) que o selo aparece visualmente; a
  verificacao foi feita no codigo da `origin/main` (arquivo:linha citados acima), nao em execucao.
- Nao foi verificada a existencia de uma PR aberta especifica para o commit `9180665931` (FT-004/FT-033);
  o que esta comprovado e que o conteudo dele chegou a main pelo commit de resgate `5e59cb9c79` (#3660).
