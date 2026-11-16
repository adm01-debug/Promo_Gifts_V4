# origin/importado/vps-fabrica/v2/s14-2610081946

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz a geracao de mockup desistir em 30 segundos em vez de deixar o vendedor esperando ate um minuto, e cancela de verdade a imagem antiga quando ele limpa o formulario ou troca de produto (antes podia chegar um mockup atrasado e entrar no historico como se fosse o novo).
- **Tip / merge-base / main:** tip `d62f5544eb5dc04406d458e61e6051a2abf778cf` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`d62f5544eb`, "Fabrica Hermes 2026-10-08"), assunto
`fix(mockup): timeout unico de 30 s e geracao cancelavel via AbortSignal (Q16)`.

Pela mensagem do commit e pelo diff, a intencao era:

1. **Tirar os tres "orcamentos de tempo" empilhados** na chamada da edge `generate-mockup`:
   um `Promise.race` de 60 s que nao cancelava nada, um retry local de 2 s
   (`isTransientError` + `invokeMockupOnce`) e os defaults do wrapper. No lugar, **uma**
   chamada com `timeoutMs = 30000`, `maxRetries: 1` e `signal` repassado.
2. **Tornar a geracao cancelavel**: um `AbortController` por geracao no hook
   `useMockupGenerator`; limpar o formulario, trocar de produto ou sair da tela aborta a
   geracao em voo, e o resultado que chega depois e **descartado** (sem toast, sem gravar
   no historico).
3. **Extrair `buildHistoryClients`** para um arquivo proprio (`mockupHistoryClients.ts`),
   so para o hook caber no limite de tamanho do gate 2.3.3.
4. **Provar com teste**: novo `mockupGeneration.abort.test.ts` (4 casos, roda o service real
   com a edge mockada) e trocar o bloco estatico `BUG-C` por um bloco `Q16` em
   `mockup-audit.test.ts`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Timeout unico de 30 s (era 60 s) | `src/hooks/mockup/mockupGenerationService.ts:316` | `const GENERATE_TIMEOUT_MS = 30000;` |
| Campo `signal?: AbortSignal` em `GenerateMockupParams` | `src/hooks/mockup/mockupGenerationService.ts:303-304` | comentario `/** Cancelamento (reset do formulario, troca de produto ou saida): vai como 'signal' a edge. */` + `signal?: AbortSignal;` — texto identico ao da branch |
| Chamada unica da edge com `timeoutMs`/`maxRetries: 1`/`signal` | `src/hooks/mockup/mockupGenerationService.ts:387-397` | `timeoutMs: GENERATE_TIMEOUT_MS` (394), `maxRetries: 1` (396), `signal: params.signal` (397) |
| Fim do `Promise.race`, do `invokeMockupOnce` e do retry `isTransientError` | `src/hooks/mockup/mockupGenerationService.ts` | `git show origin/main:src/hooks/mockup/mockupGenerationService.ts \| grep -n "Promise.race\|invokeMockupOnce\|isTransientError"` → nenhuma ocorrencia |
| `AbortController` por geracao no hook | `src/hooks/mockup/useMockupGenerator.ts:100` | `const generationAbortRef = useRef<AbortController \| null>(null); // Q16: geracao cancelavel` |
| Abortar na troca de produto / saida da tela | `src/hooks/mockup/useMockupGenerator.ts:167` | `useEffect(() => () => generationAbortRef.current?.abort(), [productSelection]);` |
| Abortar ao limpar o formulario (`resetForm`) | `src/hooks/mockup/useMockupGenerator.ts:652` (via `setProductSelection(null)` → cleanup do efeito da linha 167) | `resetForm` comeca com `setProductSelection(null);` (653); o caso (2) do teste de comportamento na main afirma `expect(signal?.aborted).toBe(true)` depois de `resetForm()` |
| `signal` passado a `generateMockupApi` e resultado tardio descartado | `src/hooks/mockup/useMockupGenerator.ts:554, 562, 568, 609` | `const controller = new AbortController();` (554), `signal: controller.signal` (562), `if (controller.signal.aborted) return;` (568 no sucesso e 609 no catch) |
| Helper `buildHistoryClients` extraido | `src/hooks/mockup/mockupHistoryClients.ts` (arquivo existe na main) | corpo identico ao da branch, com o comentario `vive fora do hook para manter 'useMockupGenerator' dentro do ratchet de tamanho (Gate 2.3.3)`; consumido em `useMockupGenerator.ts:43` e `:169` |
| Teste de comportamento `mockupGeneration.abort.test.ts` (4 casos) | `src/hooks/mockup/__tests__/mockupGeneration.abort.test.ts` na main, com os **mesmos 4 casos** e ainda mais robusto | `grep -n "it("` na versao da main → linhas 191, 216, 244, 266, com os titulos `(1) passa signal a edge e limita a chamada a 30 s em uma unica tentativa`, `(2) resetForm durante a geracao aborta a chamada e nada e inserido`, `(3) erro de rede tenta uma unica vez...`, `(4) trocar de produto cancela a geracao anterior...` |
| Bloco estatico `Q16` em `mockup-audit.test.ts` | **NAO ESTA** — foi deliberadamente substituido pelo teste de comportamento no mesmo merge | `git show origin/main:.../mockup-audit.test.ts \| grep -n "Q16\|GENERATE_TIMEOUT_MS\|Promise.race"` → vazio. O commit `294cee8389` removeu 380 linhas desse arquivo e adicionou 246 de `mockupGeneration.abort.test.ts` |

**Como esse trabalho entrou na main:** squash-merge da PR **#2739**, commit
`294cee8389 fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo (entregas VPS)`.
Os tres rastreadores apontam para o mesmo commit:

- `git log -S"signal: params.signal" --oneline origin/main -- src/hooks/mockup/mockupGenerationService.ts` → `294cee8389`
- `git log --diff-filter=A --oneline origin/main -- src/hooks/mockup/__tests__/mockupGeneration.abort.test.ts` → `294cee8389`
- `git log --diff-filter=A --oneline origin/main -- src/hooks/mockup/mockupHistoryClients.ts` → `294cee8389`

A PR #2739 foi uma entrega agregada ("entregas VPS") que levou esta branch junto com outras
do mesmo lote. Os 4 arquivos continuam "diferentes da main" apenas porque a main seguiu
andando em cima deles depois: a main **endureceu** o teste de abort (adiciona `MemoryRouter`,
mocks de `sonner.custom/dismiss`, `mockup-storage`, dimensoes fisicas nos produtos-fixture) e
**limpou** as asserts estaticas de `mockup-audit.test.ts`, trocando-as por testes de
comportamento reais. Nenhuma dessas mudancas desfaz a intencao da branch.

## A resgatar

Nada. Todos os quatro objetivos do commit (timeout unico de 30 s, cancelamento por
`AbortSignal`, helper extraido, teste provando o cancelamento) estao na main de hoje com
evidencia linha a linha na tabela acima.

Observacao sem acao: o bloco de *analise estatica* `Q16` que a branch escreveu em
`mockup-audit.test.ts` nao existe na main. Nao e trabalho perdido — ele apenas conferia por
regex o que o teste de comportamento `mockupGeneration.abort.test.ts` (presente na main)
confere executando o codigo: o caso (1) afirma `opts.timeoutMs === 30000` e
`opts.maxRetries === 1`. A protecao e a mesma, em forma mais forte.

## Risco de fechar esta branch

Nenhum risco pratico. O comportamento que ela entrega — desistir em 30 segundos e cancelar
de verdade a geracao antiga — ja esta em producao na main, com teste automatico que quebra
se alguem desfizer. Fechar a branch nao muda nada para o vendedor nem para o cliente.

O unico efeito de apagar a branch e perder o historico original do commit
`d62f5544eb`; o conteudo em si sobrevive na main dentro do commit `294cee8389` (PR #2739).

Nao toca banco, nao toca migration, nao toca policy e nao altera nenhuma edge function: so
muda como o front **chama** a edge `generate-mockup` (os 4 arquivos vivem todos em
`src/hooks/mockup/`). Logo, nao exige nada do workflow de migration nem de deploy de edge.

## Nao verificado

- Nao rodei a suite de testes (`npm test`) nesta sessao — a tarefa permite somente leitura.
  A afirmacao "o teste existe e cobre os 4 casos" vem da leitura do arquivo na main
  (`src/hooks/mockup/__tests__/mockupGeneration.abort.test.ts`, titulos nas linhas 191, 216,
  244 e 266), nao de uma execucao verde observada aqui.
- O pacote de evidencia nao veio truncado: os 4 arquivos tinham os dois diffs (A e B)
  completos. Nenhum arquivo ficou sem leitura.
