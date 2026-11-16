# origin/importado/vps-fabrica/v2/s41-2610081949

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** cria o assistente "Matheus", um chat que orienta o vendedor sobre como aplicar a logo no brinde (posicao, tamanho, limite da tecnica) — e esse assistente ja esta na main, com protecoes a mais do que a branch tinha.
- **Tip / merge-base / main:** tip `af32f959fa87e307a78169058997026ebc070d1d` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico, `af32f959fa` — "feat(mockup-assistant): edge de orientacao do Matheus com rota Flash e limite de 20/min".

A branch tocou 4 arquivos (`git diff --name-status c194982c5f af32f959fa`):

1. **`supabase/functions/mockup-assistant/index.ts`** (novo) — a edge function do assistente: exige login (JWT), valida o pedido com Zod, limita a 20 mensagens por minuto por usuario, monta o prompt do "Matheus" com o contexto da tela (produto, tecnica, dimensoes, se tem logo), chama o roteador de IA **sem fixar modelo** (a rota decide: DeepSeek Flash, nunca Pro), responde so texto (nunca imagem), devolve mensagem genericas quando o provedor falha e **nunca grava o texto do cliente no log**.
2. **`supabase/functions/mockup-assistant/index.test.ts`** (novo) — teste de contrato co-localizado: 401 sem JWT, 422 com corpo invalido, 429 na 21a mensagem, roteador sem override de modelo, erro do provedor com mensagem genericas, log sem o texto do usuario, e a conferencia de que a edge esta declarada no manifest de autorizacao.
3. **`tests/edge-functions/mockup-assistant.test.ts`** (novo) — bateria adicional de testes da edge.
4. **`supabase/functions/_shared/edge-authz-manifest.ts`** (alterado) — registra `mockup-assistant` no manifest SSOT de autorizacao como edge `authenticated`.

A propria mensagem do codigo diz que deploy e o pin de `verify_jwt` ficariam fora do PR (`index.ts:10-11`).

## Item por item: esta na main?

| Item | Onde esta na main (ou NAO ESTA) | Evidencia |
|---|---|---|
| A edge `mockup-assistant` existe | `supabase/functions/mockup-assistant/index.ts` | `git ls-tree -r --name-only origin/main \| grep mockup-assistant` lista o arquivo |
| Nome da funcao no roteador (`AI_FUNCTION_NAME = 'mockup-assistant'`) | idem, linha 25 | `git show origin/main:supabase/functions/mockup-assistant/index.ts` → `25:export const AI_FUNCTION_NAME = 'mockup-assistant';` |
| Prompt do Matheus (`buildSystemPrompt`) | idem, linhas 77-80 | `78:export function buildSystemPrompt(context?: MockupContext)` e `80:'Você é o Matheus, especialista em aplicação de brindes personalizados.'` |
| Validacao Zod do pedido (`MockupAssistantRequestSchema`) | idem, linha 67, usada na 123 | `67:export const MockupAssistantRequestSchema = z.object({` · `123: const parsed = await parseBodyWithSchema(req, MockupAssistantRequestSchema, corsHeaders);` |
| Limite de 20 mensagens/minuto por usuario, via limiter SSOT de IA | idem, linhas 115-116 | `116: const rateLimited = await applyRateLimit(req, rateLimiters.ai, () => userId);` |
| Somente texto, nunca imagem (`modalities: ['text']`) | idem, linha 140 | `140: modalities: ['text'],` |
| Nenhum modelo fixado no codigo (a rota escolhe o Flash) | idem — e a main **reforcou**: agora recusa com 502 resposta que nao venha do DeepSeek Flash | diff branch→main adiciona `DEEPSEEK_FLASH_RE` e `isFlashModel()`, e o bloco `if (!isFlashModel(result.used_model_name)) { ... throw { status: 502 ... } }` |
| Mensagem genericas em falha do provedor (`PROVIDER_ERROR_MESSAGE`) | idem, linha 28 (usada em 161, 168, 178) | `28:export const PROVIDER_ERROR_MESSAGE =` |
| Log sem o texto do cliente | idem, bloco `ai_ok` e `provider_error` preservados | diff branch→main nao remove nenhum dos dois logs; so acrescenta `quota_exceeded`, `model_not_allowed` e `empty_answer` |
| Handler registrado (`Deno.serve`) | idem, linha 215 | `215:Deno.serve(serveMockupAssistant);` |
| Registro no manifest SSOT de authz como `authenticated` | `supabase/functions/_shared/edge-authz-manifest.ts:111-113` (a main so **mudou a entrada de lugar** dentro do mesmo arquivo) | `113: "mockup-assistant": { category: "authenticated", rationale: "Assistente Matheus — JWT user, IA Flash sem geração de imagem", enforcedBy: "custom" },` — rationale e categoria identicos aos da branch |
| Teste de contrato co-localizado | `supabase/functions/mockup-assistant/index.test.ts` — a main tem **todos** os 7 casos da branch mais 6 novos (cota mensal, resposta vazia, modelo fora do Flash, token revogado, capability da migration, request-id correlacionavel) | diff branch→main no arquivo e aditivo; nenhum `it(...)` da branch foi apagado |
| `expect(rateLimiters.ai.maxRequests).toBe(20)` (unica assercao que saiu do arquivo da branch) | **nao perdida**: foi movida para `tests/edge-functions/integration/mockup-assistant.test.ts:166-169`, onde le o fonte real do SSOT | `166: it("o limiter SSOT de IA que a edge usa fixa 20 mensagens por minuto, por chave 'ai'"` · `169: expect(aiLimiter).toMatch(/maxRequests:\s*20\b/);` |
| `tests/edge-functions/mockup-assistant.test.ts` | identico, byte a byte, ao da branch | `git diff --stat af32f959fa origin/main -- tests/edge-functions/mockup-assistant.test.ts` → saida vazia |

Confirmacao direta de que isso foi um resgate deliberado, nao coincidencia: o **proprio commit de HEAD da main** e a PR do resgate — `e4ab7f85d9 feat(mockup-assistant): resgata a edge do assistente Matheus com rota de IA, testes e registro de authz (#3666)` (`git log --oneline -1 origin/main`). A main ainda foi alem da branch e versionou a rota de IA no banco: `supabase/migrations/20261115230000_ai_function_routing_mockup_assistant.sql`, que a branch nao tinha.

## A resgatar

Nada. Os 4 arquivos da branch estao na main: 1 identico e 3 como versao ampliada, sem nenhuma linha de comportamento da branch descartada.

## Risco de fechar esta branch

Nenhum risco pratico. Fechar esta branch nao tira nada do ar: o assistente Matheus continua no repositorio da main com protecoes **a mais** do que esta branch tinha (recusa resposta de modelo caro/errado, trata cota mensal de IA esgotada com mensagem clara em vez de "indisponivel", nao devolve resposta vazia como se fosse sucesso, e o codigo de atendimento que o cliente recebe no erro agora corresponde ao do log). O unico efeito e deixar de ter uma copia antiga e mais fragil do mesmo arquivo.

Ressalva que **nao** e desta branch e continua valendo para o negocio: a propria branch registrou que ligar o `verify_jwt` em `supabase/config.toml` e o deploy da edge ficariam fora do PR (`index.ts:10-11`). Nao verifiquei se a edge esta publicada em producao — isso e independente do destino desta branch.

## Nao verificado

- Se a edge `mockup-assistant` esta efetivamente **publicada** em producao e se `verify_jwt` esta ligado em `supabase/config.toml`. Fora do escopo desta analise (que compara branch vs main) e exigiria inspecionar o ambiente de producao.
- Se a migration `20261115230000_ai_function_routing_mockup_assistant.sql` ja foi aplicada no banco de producao. Ela nao pertence a esta branch (entrou pela main), entao nao afeta o veredito.
- Nao executei lint, typecheck nem a suite de testes; a conclusao vem da comparacao de conteudo entre a branch e `origin/main` com comandos somente de leitura.
