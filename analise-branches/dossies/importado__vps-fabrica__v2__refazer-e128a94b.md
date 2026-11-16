# origin/importado/vps-fabrica/v2/refazer-e128a94b

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** impede que um usuario, clicando "gerar texto" em sequencia, torre a conta paga de IA — poe um teto por minuto, uma cota por pessoa e registra cada consumo para aparecer no painel de uso.
- **Tip / merge-base / main:** tip `0ce521fae4d754f3bed3e8c85d980135c6ca1f6d` · merge-base `df8b43a56baf9f82b999cb1d518dc114911d1509` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`0ce521fae4`, "fix(edge): word-magic com limite de uso, quota e registro de consumo (F-08)", cherry-pick de `2fe80ed2c9`), tocando 3 arquivos:

1. **Teto por minuto** na edge `word-magic`: aplicar `applyRateLimit(req, rateLimiters.ai, () => auth.userId)` logo apos a autenticacao, para que um laco com `force_regenerate` nao esgote a chave do provedor de IA.
2. **Cota por usuario**: reservar vaga com `acquireAiQuota(...)` **antes** de chamar o provedor; cota esgotada responde 429 sem gastar a chave.
3. **Registro de consumo**: `logAiUsage(...)` em sucesso (com tokens de entrada/saida) e nos tres caminhos de erro (timeout/conexao, HTTP do provedor, resposta nao-JSON), alimentando `ai_usage_logs`.
4. **Travar o modelo no Flash** (`deepseek-v4-flash`), exportando a constante para teste, com assercao de que a fonte nao cita nenhum modelo "Pro" (controle de custo).
5. **Suite de testes** `supabase/functions/word-magic/index.limits.test.ts` (287 linhas) exercitando o handler real, mais o shim `tests/edge-functions/word-magic.limits.test.ts` que a coloca no vitest.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Import do limiter SSOT | ESTA | `supabase/functions/word-magic/index.ts:10` — `import { applyRateLimit, rateLimiters } from '../_shared/rate-limiter.ts';` |
| Import do SSOT de consumo de IA | ESTA | `supabase/functions/word-magic/index.ts:11` — `import { acquireAiQuota, logAiUsage } from '../_shared/ai-usage.ts';` |
| Constante `AI_FUNCTION_NAME` exportada | ESTA | `supabase/functions/word-magic/index.ts:16` — `export const AI_FUNCTION_NAME = 'word-magic';` |
| Modelo travado no Flash, exportado, com o comentario "Flash, NUNCA Pro" | ESTA | `supabase/functions/word-magic/index.ts:18` — `export const DEEPSEEK_MODEL = 'deepseek-v4-flash'; // MIGRADO: ... — Flash, NUNCA Pro` |
| Teto de 20 req/min por usuario autenticado | ESTA | `supabase/functions/word-magic/index.ts:97` — `const rateLimited = await applyRateLimit(req, rateLimiters.ai, () => auth.userId);` |
| Helper `logUsage` encapsulando `logAiUsage` | ESTA | `supabase/functions/word-magic/index.ts:105-117` (bloco "1c. Registro de consumo", com `functionName: AI_FUNCTION_NAME`, `model: DEEPSEEK_MODEL`) |
| Reserva atomica de cota antes do provedor | ESTA | `supabase/functions/word-magic/index.ts:188-189` — `const quota = await acquireAiQuota(auth.userId, AI_FUNCTION_NAME, DEEPSEEK_MODEL);` seguido de `if (!quota.allowed)` |
| Registro de consumo nos 3 caminhos de erro | ESTA | `supabase/functions/word-magic/index.ts:327, 347, 371` — `await logUsage({ status: 'error', errorMessage: ... })` |
| Registro de consumo no caminho de sucesso (tokens) | ESTA | `supabase/functions/word-magic/index.ts:385` — `await logUsage({` (bloco de sucesso com `inputTokens`/`outputTokens`) |
| Suite de testes `index.limits.test.ts` | ESTA (288 linhas na main, 287 na branch; a linha a mais e um comentario da correcao do UUID) | `git show origin/main:supabase/functions/word-magic/index.limits.test.ts \| wc -l` → `288` |
| Shim `tests/edge-functions/word-magic.limits.test.ts` | ESTA, **byte a byte identico** a branch | `git diff --stat <tip> origin/main -- tests/edge-functions/word-magic.limits.test.ts` → saida vazia |
| Caminho de entrada na main | squash-merge da PR #2744 | `git log -S"acquireAiQuota(auth.userId, AI_FUNCTION_NAME" --oneline origin/main -- supabase/functions/word-magic/index.ts` → `c86bf07b39 ... word-magic F-08 ... (#2744)` |

**As 2 unicas diferencas de hoje sao a main estando a frente, nao atras** (`git diff --stat <tip> origin/main -- supabase/functions/word-magic/` → 4 insercoes, 3 remocoes no total):

| diferenca | quem esta certo | evidencia |
| --- | --- | --- |
| `import { createClient } from 'https://esm.sh/...'` (branch) vs `'npm:@supabase/supabase-js@2.49.4'` (main) | **main** — e o padrao do repo | `git grep -l "npm:@supabase/supabase-js" origin/main -- supabase/functions` → 101 arquivos; `esm.sh/@supabase` → 6 |
| `PRODUCT_ID = "0000...0001"` (branch) vs `"11111111-1111-4111-8111-111111111111"` (main) | **main** — corrige o teste | comentario na propria main: `// UUID v4 valido: o z.string().uuid() da main recusa o UUID "nulo" (versao 0).` |

## A resgatar

Nada. Nenhum item da branch ficou de fora: todos os 5 objetivos do commit estao na main de hoje, com evidencia linha a linha na tabela acima, e a main ja corrigiu dois defeitos que a branch tinha (import fora do padrao e UUID invalido no teste).

## Risco de fechar esta branch

Nenhum risco pratico. Tudo o que a branch entregou ja esta em producao via PR #2744 — o teto por minuto, a cota por usuario, o registro de consumo e os testes continuam valendo. Fechar a branch nao mexe no sistema.

O risco e o **oposto**: se alguem tentar "recuperar" esta branch aplicando o codigo dela sobre a main, reintroduz o import fora do padrao (`esm.sh` em vez de `npm:`) e um UUID de teste que a validacao atual da main recusa — ou seja, quebraria o que hoje funciona.

Esta branch toca uma edge function (`supabase/functions/word-magic/`), mas **nao** contem migration, DDL, policy ou grant — nao ha nada de banco pendente de versionar. O deploy da edge, se fosse preciso, sai pelo workflow `deploy-edge-functions.yml`; mas nao e preciso, porque o conteudo ja esta na main.

## Nao verificado

- **Nao foi verificado se a edge `word-magic` hoje em producao esta no mesmo codigo da main.** Confirmei a main no git, nao o artefato deployado no Supabase. Isso nao altera o veredito (o trabalho da branch esta na main de qualquer forma), mas se o dono quiser a certeza de que o teto de uso esta ativo em producao, falta conferir o ultimo run de `deploy-edge-functions.yml` para esta funcao.
- **Nao foi executada a suite de testes** (`npm test`). A leitura foi estatica: o arquivo de teste existe na main e esta no include do vitest via shim. Nenhum arquivo ficou sem leitura por truncamento.
