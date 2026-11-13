# Drift edge functions — repo (origin/main 835fee0c) × canônico doufsxqlfjyuvxuezpln

Gerado 2026-11-13 ~23:40Z. Método reproduzido localmente (sem artefato do CI): `GET /v1/projects/<ref>/functions/<slug>/body`
devolve ESZIP 2.3 (`application/octet-stream`, magic `ESZIP2.3`); fonte TS original extraída do `sourcesContent` do source map
(mesmo que `supabase functions download --use-api`), normalizada como no workflow (cp1252→UTF-8, CRLF→LF) e comparada
byte a byte com `git show origin/main:supabase/<path>` para **todos os 110 slugs**. Ferramentas:
`scratchpad/drift/tools/eszip_extract.py`, `compare.sh`, `full_repro.sh`; saída bruta `scratchpad/drift/full-repro.txt`.
Validação do método: `health-check` (aligned no CI) → 5/5 arquivos iguais; `crm-db-bridge` (redeployado 21:44Z) → todos iguais.

## Falha do run 43507656857 (job "Compare GitHub × Canonical", step 17 "Fail if drift detected", exit 1)
- Evento `workflow_run` (pós "Deploy Edge Functions" 43487464383), head fe64be35. 110 slugs no repo = 110 no canônico
  (log 132169402370 l.450/464) → sem órfã, sem função faltando; o step 8 não gerou has_missing/has_orphans.
- O que falhou foi o hash (step 9). Slugs gravados pelo próprio run no comentário de 21:30:55Z da issue #1895
  (https://github.com/adm01-debug/Promo_Gifts_V4/issues/1895): `asia-ingestion`, `audit-suite`, `bi-copilot`,
  `crm-db-bridge`, `process-scheduled-reports` (5).
- Runs seguintes (mesma issue): 43517092224 22:28Z → 4 (crm-db-bridge saiu após deploy 21:44Z);
  43517798984 22:48Z → 6 (+ `send-scheduled-reports`, `send-transactional-email`, trazidos pelo merge #3521 = 835fee0c, 22:02Z).
- Gate verify_jwt (step 12) passou; canonical-only allowlist (`mcp-query`) não gera falha, mas está obsoleta: `mcp-query`
  existe no repo desde 6ba67b49 (2026-11-09) e no canônico — entrada "canonical-only" não descreve mais a realidade.

## Estado AGORA (reprodução local, 110/110 comparados, 105 aligned)
| slug | classe | evidência | ação mínima |
|---|---|---|---|
| `asia-ingestion` | **sem_deploy** + **conteudo (permanente, BOM/CRLF no repo)** | canônico v135 updated_at 2026-11-09T17:33Z; último commit na pasta f2408197d (#3407, 2026-11-12T04:24Z). Diff canônico×main: `supabase-js@2.119.0`→`@2.49.4` e `resolveCredential('ASIA_SUPPLIER_ID', supabase)`→`resolveCredential('ASIA_SUPPLIER_ID')` (index.ts l.1 e l.103). Além disso o arquivo do repo começa com BOM `EF BB BF` e termina em `\r\n\r\n` (main e c1d47d13), o canônico não — por isso a função apareceu sozinha no drift em 2026-11-09 18:05Z, 11-10 e 11-11 **mesmo após o deploy v132 de 11-09 18:02Z** (issue #1895). | 1) PR `fix(edge)`: remover BOM e CRLF finais de `supabase/functions/asia-ingestion/index.ts` (sem mudar lógica); 2) deploy via `deploy-edge-functions.yml` com `function_name=asia-ingestion`. Só deploy NÃO resolve. |
| `audit-suite` | **sem_deploy** | canônico v143 updated_at 2026-11-09T17:35Z == repo@c1d47d13 (SHA deployado, recibo 2026-11-09T18:02Z); main (f2408197d, #3407) adicionou tratamento de erro em `s2Cart`/`cart` (index.ts l.97-98, l.118-121). Sem deploy desde então (nenhum run com esse slug; detect do workflow só deploya a função pedida em `function_name`). | `deploy-edge-functions.yml` → `function_name=audit-suite` (ou `functions_json` com os 4 abaixo). |
| `bi-copilot` | **sem_deploy** | canônico v269 updated_at 2026-11-09T17:35Z == repo@c1d47d13; main 640d96ef (#3401, 2026-11-13T07:23Z) trocou fetch direto Lovable por `callAiWithTracking` (`_shared/ai-usage.ts`). | deploy `function_name=bi-copilot`. |
| `process-scheduled-reports` | **sem_deploy** | canônico v312 updated_at 2026-11-09T17:51Z == repo@c1d47d13; main 835fee0c (#3521) corrige `const { value: resendKey } = await resolveCredential(...)` (l.95) e domínio `promobrindes.com.br` (l.108). Bug em produção até deployar ("Bearer [object Object]"). | deploy `function_name=process-scheduled-reports` — prioridade (bug ativo). |
| `send-scheduled-reports` | **sem_deploy** | canônico v307 updated_at 2026-11-09T17:56Z == repo@c1d47d13 == repo@fe64be35; main 835fee0c muda só `from:` → `noreply@promobrindes.com.br` (l.175). | deploy `function_name=send-scheduled-reports`. |
| `send-transactional-email` | **resolvido 23:34Z** | deploy run 43515934319 (v283, recibo PR #3545); re-download pós-deploy: 13/13 arquivos iguais a main. | nada. |
| `crm-db-bridge` | **resolvido 21:44Z** | run 43494646104 (v311, recibo PR #3542); extração == main. | nada. |
| `mcp-server`, `product-visual-search`, `quote-sync` | aligned (falso positivo da minha ferramenta) | `static:functions/<slug>/deno.json` do eszip == `deno.json` do repo; CI nunca os listou. | nada. |
| orfa_canonico | nenhuma | 110 slugs canônico ⊆ 110 do repo (repro + log l.450/464). | — |
| sem_funcao_publicada | nenhuma | idem. | — |

Heurística (b) `updated_at` × `git log -1 -- supabase/functions/<slug>` em origin/main (`scratchpad/drift/heuristica-updated_at.txt`):
flagra exatamente os mesmos 6 slugs (`PASTA_MUDOU_APOS_DEPLOY`) e nada mais → consistente com o hash.

## Por que o drift persiste
`deploy-edge-functions.yml` só roda por `workflow_dispatch`/`workflow_call` (push removido, E34); em `workflow_dispatch` com
`function_name` deploya **uma** função. Os merges #3407, #3401 e #3521 tocaram essas funções, mas ninguém disparou o deploy
delas (hoje só crm-db-bridge e send-transactional-email foram disparadas). `asia-ingestion` tem ainda a causa permanente BOM/CRLF.

## Run 43494646104 "Deploy Edge Functions" (estava `queued`)
- Já terminou com sucesso: job "Deploy crm-db-bridge" queued 21:29:35Z → iniciado 21:44:29Z → ok 21:44:53Z; recibo PR #3542.
- O job declara `environment: production` (workflow l.192). O environment **Production** exige aprovação de reviewer
  `adm01-debug` (`pending_deployments` do run 43515934319: reviewers=[adm01-debug], wait_timer=0, current_user_can_approve=true).
  Logo "queued" = esperando aprovação manual do dono (os ~15 min entre queued e start são o tempo até alguém aprovar).
- Implicação: todo deploy de edge function para em "Waiting" até o dono aprovar no GitHub (Actions → run → Review deployments).
  Enquanto não aprova, o drift-check (que roda pós-deploy e no cron 09:06Z) continua vermelho e a issue #1895 recebe comentários.
- Fila atual: 43515934319 (send-transactional-email) aprovado e concluído 23:34Z; 43517789501 (835fee0c, 22:15Z) segue
  `pending` na concurrency `deploy-edge-functions-v2-refs/heads/main` (cancel-in-progress=false) — qual função ele deploya:
  **NÃO VERIFICADO** (inputs de workflow_dispatch não aparecem na API). Três dispatches 22:14-22:15Z foram cancelados pela
  própria concurrency (só 1 pending por grupo).

## NÃO VERIFICADO
- Se o CLI (`supabase functions download --use-api` 2.101.0) preserva o BOM — na minha extração via source map o BOM some; o CRLF
  final some pela normalização do workflow só no lado canônico. Qualquer das duas já basta para o hash divergir; a correção
  (normalizar o arquivo no repo) é a mesma.
- Conteúdo do artefato `drift-report` do run 43507656857 (inacessível daqui); a lista de slugs vem do comentário que o
  próprio run gravou na issue #1895.
