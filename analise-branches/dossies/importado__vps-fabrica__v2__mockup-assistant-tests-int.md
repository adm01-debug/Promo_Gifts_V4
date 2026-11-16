# origin/importado/vps-fabrica/v2/mockup-assistant-tests-int

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** cria o assistente "Matheus", que orienta o vendedor por texto sobre onde e de que tamanho colocar a logo no brinde — e isso ja esta no sistema em producao hoje, com protecao de login, limite de uso e sem guardar o texto do cliente.
- **Tip / merge-base / main:** tip `453670f918876bdf022d980ae57513c9de272648` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelos 5 commits (do mais antigo ao mais novo):

1. `af32f959fa feat(mockup-assistant): edge de orientacao do Matheus com rota Flash e limite de 20/min` — criar a funcao de servidor `mockup-assistant`: chat de orientacao (nao gera imagem), exige login (JWT), valida o corpo do pedido, 20 mensagens por minuto por usuario, modelo de IA escolhido pela rota do banco (DeepSeek Flash, nunca o Pro, que custa mais).
2. `7dd04c68bd fix(mockup-assistant): resposta vazia, modelo fora do Flash e cota esgotada viram erro claro` — nao entregar resposta vazia como se fosse sucesso; recusar resposta vinda de modelo que nao e o Flash; quando a cota mensal de IA acaba, dizer isso em vez de "indisponivel".
3. `9c99fc5d43 test(edge): shim LIVE da mockup-assistant exigido pelo gate check:edge-live-coverage` — criar o arquivo que o portao de CI de cobertura de edges exige.
4. `0eb2232b34 test(edge): contrato HTTP do assistente mockup-assistant (401/422/429/502)` — testes do contrato HTTP.
5. `453670f918 test(mockup-assistant): integracao roda o handler real e deixa de testar o proprio mock` — fazer o teste de integracao exercitar o handler de verdade.

Alem do codigo da funcao e dos testes, a branch declarou a funcao no manifesto SSOT de autorizacao (`supabase/functions/_shared/edge-authz-manifest.ts`) como edge "authenticated".

## Item por item: esta na main?

Lista completa dos 6 arquivos que a branch mexeu (`git diff --name-status c194982c 453670f918`). Tres deles sao **byte a byte identicos** na main (mesmo SHA de blob), e os outros tres existem na main em versao que **contem** o da branch mais melhorias feitas depois.

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Funcao de servidor `mockup-assistant` (handler, login obrigatorio, Zod, limite 20/min, rota Flash, 502 generico, 429 de cota, log sem texto do cliente) | `supabase/functions/mockup-assistant/index.ts` — presente, 9798 bytes | `git cat-file -s origin/main:supabase/functions/mockup-assistant/index.ts` → `9798`. O diff branch→main tem apenas 2 trechos, ambos ADICAO da main; nada da branch foi removido |
| Regra "so DeepSeek Flash" (`isFlashModel`) | Presente e **mais rigorosa** na main: o `/flash/i` da branch aceitaria por engano 6 modelos Gemini com "flash" no nome; a main troca por `DEEPSEEK_FLASH_RE` | `origin/main:supabase/functions/mockup-assistant/index.ts:51` `const DEEPSEEK_FLASH_RE = /^deepseek-(?:[a-z0-9.-]*-)?flash$/;` e `:53` `export function isFlashModel` |
| Id de requisicao devolvido ao cliente | Presente e **corrigido** na main: a branch chamava `getOrCreateRequestId(req)` duas vezes (gerava dois ids, e o cliente recebia um id que nao acha log nenhum); a main gera uma vez | `origin/main:supabase/functions/mockup-assistant/index.ts:198` `const requestId = getOrCreateRequestId(req);` dentro de `serveMockupAssistant` (`:192`) |
| Teste co-localizado do contrato da edge (12 casos: 401, token invalido/revogado/sem papel, 422, 429 na 21a mensagem, uso do roteador sem fixar modelo, erro do provedor sem vazar prompt, cota 429, resposta vazia → 502, modelo nao-Flash → 502, log sem texto do usuario, codigo nao fixa modelo Pro, declarado no manifesto) | `supabase/functions/mockup-assistant/index.test.ts` — **todos os 12 casos da branch estao na main, com o mesmo nome**, mais 2 novos (capability da migration; id de requisicao igual ao do log) | `git show origin/main:...index.test.ts \| grep "^  it("` → 14 casos, linhas 128,147,173,186,204,228,251,268,289,327,362,390,407,414; na branch → os mesmos 12, linhas 128..294 |
| Teste de integracao (`tests/edge-functions/integration/mockup-assistant.test.ts`) | Presente, **identico** | blob `5acf4916b0c6c8d98507b94fe7a17f5187b528ea` na branch e na main |
| Shim LIVE exigido pelo portao `check:edge-live-coverage` (`tests/edge-functions/live/mockup-assistant.test.ts`) | Presente, **identico** | blob `d74975ee724887f7aa2f05fe42d0c8cdcb25fab2` na branch e na main |
| Teste de contrato HTTP (`tests/edge-functions/mockup-assistant.test.ts`) | Presente, **identico** | blob `9eabffcc72c5eab1055103b5df5231cffde5eb1d` na branch e na main |
| Declaracao no manifesto SSOT de autorizacao | Presente na main (apenas em outra posicao do arquivo, com comentario reescrito); mesma categoria, mesmo rationale, mesmo `enforcedBy` | `origin/main:supabase/functions/_shared/edge-authz-manifest.ts:113` `"mockup-assistant": { category: "authenticated", rationale: "Assistente Matheus — JWT user, IA Flash sem geração de imagem", enforcedBy: "custom" }` |
| Pendencia que a branch deixou em aberto (comentario "verify_jwt=true (config.toml) e acao do Joaquim, fora deste PR") | **Resolvida na main** | `origin/main:supabase/config.toml:122-123` `[functions.mockup-assistant]` / `verify_jwt = true` |
| Rota de IA no banco para esta funcao (nao foi feita pela branch) | Existe na main como migration versionada | `origin/main:supabase/migrations/20261115230000_ai_function_routing_mockup_assistant.sql` |

Observacao sobre o resto do diff do manifesto: as outras linhas que aparecem em "branch → main" (`roleCheckInRpc`, `enforcedBy: "jwt"`, mudancas em `ownership-repair`, `bulk-random-passwords`, `rls-audit`, `audit-suite`, `test-cart-*`, `xbz-image-uploader`) **nao sao trabalho desta branch** — a branch so adicionou a linha do `mockup-assistant` (diff A, uma unica insercao de 4 linhas). Sao evolucoes da main em outras frentes.

## A resgatar

Nada. Os 6 arquivos da branch estao na main: 3 identicos (mesmo SHA de blob) e 3 em versao superconjunto. Nao ha nenhum comportamento, simbolo, teste ou texto da branch ausente da main.

## Risco de fechar esta branch

Nenhum risco pratico. Tudo o que esta branch construiu ja esta no sistema em producao e com protecoes **melhores** do que as da branch: a regra "so o modelo barato (Flash)" na main barra 6 modelos que a versao da branch deixaria passar, e o numero de protocolo que o cliente recebe quando da erro agora e o mesmo que aparece no registro interno (na versao da branch era outro, e o suporte nao conseguia localizar o caso).

Risco de **reabrir/aplicar** esta branch, ao contrario, e real: retomar o codigo dela regrediria essas duas correcoes.

Uma pendencia de negocio permanece, mas e da main e nao desta branch: nao encontrei nenhuma tela que chame o assistente `mockup-assistant` (nenhum `functions.invoke('mockup-assistant')` em `src/`; as referencias na main sao config, migration e testes). Ou seja, o assistente existe e esta protegido no servidor, mas pode ainda nao estar oferecido ao vendedor na tela. Isso e item de acompanhamento da main, nao motivo para manter esta branch aberta.

## Nao verificado

- **Se o assistente aparece hoje na tela do vendedor.** `git grep -ln "mockup-assistant" origin/main -- src` nao retornou nada; nao segui adiante para descobrir se alguma tela chama a funcao por outro caminho (nome montado em variavel, wrapper genérico). Isso nao altera o veredito desta branch, cujo escopo era servidor + testes.
- **Comportamento em producao.** Nao invoquei a funcao em producao nem li logs; a verificacao feita foi de conteudo de codigo (arquivo:linha e SHA de blob), como manda o escopo desta tarefa (somente leitura do git).
- Nenhum arquivo ficou sem leitura: o pacote nao estava truncado (3 arquivos divergentes, os dois diffs presentes) e os outros 3 arquivos da branch foram conferidos por SHA de blob.
