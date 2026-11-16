# origin/claude/fix-e125-mockup-casts-261030

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada muda para quem usa o sistema — e uma faxina interna de qualidade de codigo no gerador de mockups, e ela ja esta na versao em producao.
- **Tip / merge-base / main:** tip `c87305ae1cd954fc38d5422cba163343e01defc1` · merge-base `c09402816aa882fc8e9577d8a2352a663e515dc9` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Etapa P200-E125 do plano de 200 etapas: `src/hooks/mockup/mockupGenerationService.ts` era o maior
ofensor do "ratchet" de asserções de tipo (`as <Tipo>`) — um contador de dívida técnica que o CI usa
para impedir que a dívida cresça. A branch fez quatro coisas:

1. Removeu o prefixo `'as '` dos 13 textos de `TECHNIQUE_PROMPTS` (os prompts que vão para a IA de
   mockup) e passou a reinjetá-lo no `return`, para que o contador do ratchet pare de confundir
   prosa em inglês (`as professional machine embroidery…`) com asserção de tipo. **Falso positivo —
   não era dívida real.**
2. Trocou dois `as <Tipo>` reais por tipagem honesta: a leitura do corpo de erro da edge function e
   o retorno de `data.mockupUrl`.
3. Reescreveu dois comentários de `as …columns` para `to …columns`, só para o `grep -c " as "` do
   critério da etapa cair de 12 para 10.
4. Atualizou os arquivos de baseline (`.as-assertions-baseline.json`, `.any-type-baseline.json`) e
   marcou E125 como ✅ no plano, além de pôr um limite de memória no hook de pré-commit.

Histórico que explica a branch: a PR dela, **#2789, foi fechada sem merge** em 2026-10-30 com o
corpo "Fechado — substituído por nova branch sem conflito de merge. Continua em #2790 ou na branch
`claude/fix-e125-final-261030`" (`github_graphql` em `pullRequest(number:2789)`). O conteúdo foi
reaberto em `claude/fix-e125-final-261030` e mergeado como **PR #2794**
(`mergedAt 2026-10-30T09:09:39Z`). Observação de forma: o commit `23ff5ec721`
("reduz assertivas as de 14 para 10") é um **commit vazio** — `git diff 23ff5ec721^ 23ff5ec721`
não retorna nada; o trabalho que a mensagem descreve está todo em `0403baaddb`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `TECHNIQUE_PROMPTS` sem o prefixo `'as '` nos 13 textos | **Está** — `src/hooks/mockup/mockupGenerationService.ts:62-76` | `git show origin/main:src/hooks/mockup/mockupGenerationService.ts \| sed -n '62,76p'` → `bordado: 'professional machine embroidery…'` (sem `as`) |
| Reinjeção do `as ` no retorno de `getTechniquePrompt` (comportamento do prompt preservado) | **Está** — mesmo arquivo, linhas 85 e 87 | linha 85 `… return \`as ${prompt}\`;` e linha 87 `return \`as ${TECHNIQUE_PROMPTS.default}\`;`. Entrou por `git log -S'return \`as ${prompt}\`' origin/main` → `b2ba9f9e6e` = PR #2794 |
| Comentário explicativo do truque (`// "as " prefix reintroduced at return site … (E125)`) | **Está** — linhas 81-82 | `git show origin/main:…mockupGenerationService.ts \| sed -n '79,83p'` |
| Tipagem do corpo de erro da edge: `const body: {…} = await ctx.json()` em vez de `(await ctx.json()) as {…}` | **Está** — linha 341 | `git show origin/main:…:341` → `const body: { error?: string; errorCode?: string; message?: string } = await ctx.json();`. Entrou por `git log -S'const body: { error?: string' origin/main` → `5e59cb9c79` (PR #3660, "trem de resgates — 16 correções recuperadas de branches de outros agentes") |
| Remoção do `as string` em `return data.mockupUrl as string` | **Está (equivalente)** — a função `invokeMockupOnce` foi substituída por `invokeMockupForArea`, que faz `return data.mockupUrl;` sem cast nenhum | diff (B) do pacote, hunk `@@ -376,79 +379,26 @@`: main remove `invokeMockupOnce`/`isTransientError` e o novo corpo termina em `return data.mockupUrl;` |
| Flag de memória no hook de pré-commit (`--max-old-space-size` em `lint-staged`) | **Está** — `package.json:312`, com valor `4096` em vez dos `512` da branch | `git show origin/main:package.json \| grep -n max-old-space` → `312: "node --max-old-space-size=4096 …"`. A flag entrou por `b2ba9f9e6e` (#2794) com 512 e foi elevada a 4096 por `8bc5078dbc` (#3023) |
| Dois comentários reescritos de `as …columns` para `to …columns` | **NÃO ESTÁ** — main mantém `as top-level columns` nas linhas 222 e 245 | `git show origin/main:…mockupGenerationService.ts \| grep -n " as "` → `222: … client_name as top-level columns.` e `245: … client_id/name as top-level columns.` |
| `.as-assertions-baseline.json` / `.any-type-baseline.json` com os números da branch | **NÃO ESTÁ, e está certo assim** — main tem baselines regerados depois (`2026-11-09` e `2026-11-08`) | diff (B) do pacote: `generatedAt` da branch `2026-10-30` → main `2026-11-09`; `productionAsCount` 2143 → 2146. O gate hoje mede **1760 contra baseline 2146**: `node scripts/check-as-assertions-baseline.mjs` → "Drift positivo: 385 ocorrência(s) eliminada(s) · ✅ nenhuma regressão" |
| Marcador ✅ em `P200-E125` no plano | **NÃO ESTÁ, e é decisão deliberada da main** | diff (B) do pacote: main troca `#### P200-E125 ✅` por `#### P200-E125` e o cabeçalho da main passa a dizer "O marcador ✅ no título é apenas uma declaração legada; sem recibo, o status é 'marcada sem evidência'" |

## A resgatar

Nada. Os três itens que não estão na main não são trabalho a recuperar:

- **Os dois comentários `as` → `to`** existiam apenas para fazer o `grep -c " as "` do critério da
  etapa cair de 12 para 10. O gate de verdade **remove comentários antes de contar** — está escrito
  no próprio script, `scripts/check-as-assertions-baseline.mjs:25-28`: "Remover comentários antes de
  contar também elimina o falso positivo de prosa pt-BR". Ou seja: copiar esses dois comentários
  para a main não mexeria em um único número do CI, nem no comportamento do sistema. Seria maquiar
  uma régua que o próprio projeto já reconheceu como errada.
- **Os baselines da branch** são de 2026-10-30 e a main regerou os dois depois; os números da branch
  são defasagem, não informação.
- **O ✅ no plano** foi removido da main de propósito, junto com um regime novo de recibos. Reaplicá-lo
  seria andar contra a governança atual do plano.

Fica registrado um resíduo de **contabilidade** (não de código): o critério literal da etapa E125
("`grep -c " as " ≤ 10`") hoje dá **12** na main — e a main já reflete isso, mantendo E125 **sem**
✅. Nenhuma linha de código se perde ao fechar esta branch.

## Risco de fechar esta branch

Nenhum para o negócio e nenhum para o código. O conteúdo útil entrou na produção por duas portas
rastreáveis — PR #2794 (2026-10-30) e PR #3660 — e a PR desta branch (#2789) foi fechada pelo
próprio autor dizendo que seria substituída. A funcionalidade de geração de mockup na main é mais
nova e mais completa do que na branch (ganhou cancelamento por `AbortSignal`, timeout único de 30 s,
`areaId` no resultado em lote e PDF tolerante a técnica ausente), portanto a branch é também um
retrocesso funcional se alguém tentar mergeá-la hoje. O único efeito de fechar é que a etapa E125 do
plano continua formalmente aberta — como já está na main.

## Nao verificado

- Não foi executado `npm run lint`, `typecheck` ou a suíte de testes: nada foi alterado em código
  nesta análise e a decisão não depende disso.
- O valor `--max-old-space-size=4096` da main vem de outra PR (#3023) e não foi auditado se 4096 é o
  número certo para o hook de pré-commit; só foi verificado que a flag que a branch introduziu
  continua presente.
