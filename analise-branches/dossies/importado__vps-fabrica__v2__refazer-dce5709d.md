# origin/importado/vps-fabrica/v2/refazer-dce5709d

- **Veredito:** INCORPORADA_TOTAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** impede que o gerador de textos de produto por IA seja usado sem limite e estoure a conta do fornecedor de IA, e passa a registrar cada uso para aparecer no painel de consumo.
- **Tip / merge-base / main:** tip `80fb9d6753673777be26d6c4ee41b9c7779a6bc5` · merge-base `0a64ef316e4fed7a44c0b8791b8058fae2bb43bd` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit único (`80fb9d6753`, "Fabrica Hermes 2026-10-09"), mensagem:
`fix(edge): word-magic com limite de uso, quota e registro de consumo (F-08)` — duplo
`cherry picked from` (`2fe80ed2c9`, `437fd317aa`), isto é, já era uma cópia de trabalho feito antes.

A branch tocou 3 arquivos (`git diff --name-status 0a64ef31 80fb9d67`):

- `A supabase/functions/word-magic/index.limits.test.ts`
- `M supabase/functions/word-magic/index.ts`
- `A tests/edge-functions/word-magic.limits.test.ts`

A intenção, item por item:

1. **Teto de 20 chamadas por minuto por usuário** na edge `word-magic`, usando o limitador
   comum do projeto (`rateLimiters.ai`), porque um laço com `force_regenerate` esgotava a
   chave do DeepSeek.
2. **Reserva de quota antes de chamar a IA** (`acquireAiQuota` / RPC `acquire_ai_quota`):
   quota esgotada responde 429 sem gastar a chave.
3. **Registro de consumo** (`logAiUsage` → tabela `ai_usage_logs`), tanto no sucesso (com
   tokens de entrada/saída) quanto nos erros do provedor.
4. **Travar o modelo no Flash, nunca no Pro** (`DEEPSEEK_MODEL = 'deepseek-v4-flash'`,
   exportado para poder ser testado).
5. **Suíte de testes** que prova os 4 itens acima, plus um shim em `tests/edge-functions/`
   para que o vitest enxergue o teste (o include não cobre `supabase/functions/**`).

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| Teto de 20 req/min por usuário com o limitador SSOT da IA | está, em `supabase/functions/word-magic/index.ts` | linha 10 `import { applyRateLimit, rateLimiters } from '../_shared/rate-limiter.ts'`; linha 97 `const rateLimited = await applyRateLimit(req, rateLimiters.ai, () => auth.userId);` (`git show origin/main:supabase/functions/word-magic/index.ts`) |
| Reserva de quota antes de tocar o provedor | está, mesmo arquivo | linha 11 `import { acquireAiQuota, logAiUsage } ...`; linha 185 comentário "5b. Quota atômica"; linha 188 `const quota = await acquireAiQuota(auth.userId, AI_FUNCTION_NAME, DEEPSEEK_MODEL);`; linha 189 `if (!quota.allowed)` |
| Registro de consumo em `ai_usage_logs` (sucesso e erro) | está, mesmo arquivo | linha 108 `const logUsage = (params: {`; linha 114 `logAiUsage({`; chamadas nas linhas 327, 347, 371 (`status: 'error'`) e 385 (sucesso) |
| Nome da função para quota/log (`AI_FUNCTION_NAME`) | está | linha 16 `export const AI_FUNCTION_NAME = 'word-magic';` |
| Modelo travado no Flash e exportado | está | linha 18 `export const DEEPSEEK_MODEL = 'deepseek-v4-flash'; // ... Flash, NUNCA Pro` |
| Suíte de testes `index.limits.test.ts` (287 linhas, 9 casos) | está | `git ls-tree origin/main supabase/functions/word-magic/` → blob `53233d49c4` para `index.limits.test.ts`; o diff branch→main do pacote mostra só 2 linhas de diferença (abaixo) |
| Shim que coloca o teste na suíte do vitest | está, **idêntico** ao da branch | `git diff 80fb9d6753 origin/main -- tests/edge-functions/word-magic.limits.test.ts` → saída vazia |
| Quando entrou na main | PR #2744, 01/11/2026 | `git log -S"applyRateLimit(req, rateLimiters.ai, () => auth.userId)" origin/main -- supabase/functions/word-magic/index.ts` → `c86bf07b39 2026-11-01 [NÃO MESCLAR sem OK do dono] fix(edge): limites e tempo do Magic Up, word-magic F-08, e2e-cleanup (entregas VPS) (#2744)` |

### As 2 diferenças que restam são a main indo PARA FRENTE, não trabalho perdido

O pacote de evidência lista 2 arquivos que "diferem da main". Os dois diffs branch→main são
minúsculos e em ambos quem está mais novo é a **main**:

1. `index.ts`: a branch importa `https://esm.sh/@supabase/supabase-js@2.49.4`, a main importa
   `npm:@supabase/supabase-js@2.49.4`. Isso é uma migração posterior feita no repo todo:
   `git log -S"npm:@supabase/supabase-js@2.49.4" origin/main -- supabase/functions/word-magic/index.ts`
   → `217869d1f7 2026-11-07 infra: migra imports esm.sh → npm: pinados nas edge functions (#3157)`,
   isto é, 6 dias **depois** de o trabalho da branch entrar. Nenhuma outra linha difere.
2. `index.limits.test.ts`: a main acompanha a mesma troca `esm.sh` → `npm:` no `vi.mock`, e troca
   o `PRODUCT_ID` de `00000000-0000-0000-0000-000000000001` para `11111111-1111-4111-8111-111111111111`
   com o comentário "UUID v4 válido: o `z.string().uuid()` da main recusa o UUID nulo". Essa correção
   entrou no **mesmo** commit de incorporação: `git log -S'11111111-1111-4111-8111-111111111111' origin/main -- supabase/functions/word-magic/index.limits.test.ts`
   → `c86bf07b39 ... (#2744)`. A validação que a motiva está em `supabase/functions/word-magic/index.ts:27`
   (`product_id: z.string().uuid('product_id deve ser um UUID válido')`). Ou seja: o teste da branch,
   do jeito que estava, falharia na main — a main corrigiu ao absorver.

Não sobrou nenhuma linha da branch fora da main.

## A resgatar

Nada. Todos os itens acima estão na main com evidência citada, e as únicas diferenças são
melhorias posteriores da própria main (migração de import `#3157` e UUID válido no teste `#2744`).

## Risco de fechar esta branch

Praticamente nulo. O limite de uso, a quota e o registro de consumo da ferramenta de geração de
textos por IA já estão valendo em produção (entraram pela PR #2744, 01/11/2026) e os testes que
provam isso já rodam na suíte. Fechar a branch não desliga nada e não desprotege a conta de IA.
O único efeito de **não** fechar é ruído: a branch reaparece em qualquer varredura futura e alguém
pode reaplicar o import antigo `esm.sh`, desfazendo a migração `#3157` — isso sim seria um retrocesso.

## Não verificado

- Não executei a suíte de testes (`npm test`) nesta sessão; a presença e o conteúdo do teste na main
  foram verificados por `git ls-tree`/`git show`, não por execução. Comportamento em produção
  (429 real sob carga) também não foi exercitado — a tarefa é somente leitura do git.
- Não conferi se a PR #2744 chegou a produção pelo deploy da edge (`deploy-edge-functions.yml`);
  o título dela traz "[NÃO MESCLAR sem OK do dono]", mas o commit está em `origin/main`
  (`c86bf07b39`), o que indica que foi mesclado.
