# Inventário read-only de Edge Functions — etapa 88

> Corte técnico: **2026-08-26**, baseline Git no commit `0660b3ef9ee324cbcd59b327ea8d599a55d2e22c`. Projeto canônico declarado: `doufsxqlfjyuvxuezpln`. Alterações concorrentes ainda não commitadas foram excluídas da classificação de versão.
> Escopo executado sem invocar Edge Function, sem ler valor de credencial, sem deploy, sem alteração de função/configuração/package/schema e sem escrita externa.

## 1. Resultado executivo

| Indicador | Resultado comprovado |
|---|---:|
| Diretórios locais com `index.ts` deployável | **105** |
| Funções locais cobertas pelo manifesto | **95/105** |
| Entradas no manifesto | **96**, sendo `tests` uma entrada não deployável |
| Categorias locais | 42 authenticated; 21 dev; 18 public; 5 supervisor; 5 service; 4 scoped; **10 ausentes** |
| Gateway JWT | 36 `false` explícitos; 3 `true` explícitos; 66 no default `true` |
| Testes LIVE por slug | **104/105**; falta `intelligence-substitute-applied` |
| Dono direto em `CODEOWNERS` | **7/105**; 98 desconhecidos |
| Uso runtime individual observável | 15 funções com evidência de `pg_cron`; 90 desconhecidas |
| Telemetria central consultável | tabela `edge_function_invocations` existe, mas estava vazia |
| Observabilidade estática do entrypoint | 27 `SL+RID`; 10 somente `RID`; 1 somente `SL`; 48 somente `console.*`; 19 sem sinal simples detectado |
| Fonte local sem alinhamento remoto comprovado | **42 bundles**: 41 mudaram após `019d0924` e `market-intelligence-insights` divergiu após seu último deploy bem-sucedido |
| Versão numérica remota | **desconhecida para 105/105** |
| Presença real de segredos | **desconhecida para 105/105** |

Conclusão: há um catálogo local completo, mas **não existe evidência suficiente para declarar que o código local atual está integralmente implantado ou em uso**. As referências estáticas, o status do scheduler e um job de deploy bem-sucedido têm significados diferentes; este documento não os mistura.

## 2. Método, fontes e limites

A auditoria usou, em ordem de força:

1. árvore local `supabase/functions/<slug>/index.ts`, [config.toml](../supabase/config.toml), [manifesto de autorização](../supabase/functions/_shared/edge-authz-manifest.ts), [CODEOWNERS](../.github/CODEOWNERS), callers estáticos, scripts e testes;
2. histórico Git e metadados/logs read-only do GitHub Actions;
3. consulta read-only e agregada a catálogos do banco para `cron.job`, última execução em `cron.job_run_details` e existência/conteúdo agregado de `edge_function_invocations`.

Não foram lidos comandos do cron, payloads, usuários, IPs, tokens nem valores de segredo. Não foi feita chamada HTTP às funções. O conector de listagem remota informou que a Management API exige token de conta; portanto versões numéricas, hashes remotos atuais e lista remota atual ficaram deliberadamente como desconhecidos.

A coluna de referências `F/E/D/T` conta **arquivos que contêm o slug exato**, não chamadas confirmadas:

- `F`: `src/`;
- `E`: outras Edge Functions, excluindo o próprio diretório;
- `D`: migrations;
- `T`: testes, scripts e workflows.

Zero referência não prova código morto; caller pode ser cron, webhook, cliente externo, RPC dinâmica ou string construída. Da mesma forma, a coluna “Config/segredo direto” lista apenas identificadores encontrados em `Deno.env.get`, `process.env` ou argumentos literais de `getCredential`/`resolveCredential` no `index.ts`. `—` não prova ausência de dependência, pois helpers compartilhados, nomes dinâmicos e vault podem resolvê-la indiretamente.

## 3. Ambiente, deploy e versão

O [workflow de deploy](../.github/workflows/deploy-edge-functions.yml) usa por default o projeto Gold `doufsxqlfjyuvxuezpln`, permite override por variável do repositório e, em deploy total, seleciona todo diretório com `index.ts` exceto `_shared` e `tests`. Ele **não exclui** slugs `test-*`, `load-test`, `audit-suite` ou outros utilitários. Também não declara `environment:` com aprovação manual. Por isso “Gold*” no inventário significa “elegível ao pipeline cujo default é Gold”, e não prova deploy atual.

Evidências de execução do pipeline:

| Código | Execução | SHA | Resultado útil |
|---|---|---|---|
| S451 | [run 30215094097](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/30215094097) | `451cc7ace541…` | 104 jobs de deploy concluídos com sucesso em 2026-07-26 |
| S019 | [run 30215334637](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/30215334637) | `019d0924e580…` | 103/104 deploys com sucesso; somente `market-intelligence-insights` falhou |
| — | [run 32474593240](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/32474593240) | `e42fc237eabe…` | execução de 2026-08-21 bloqueada antes dos steps; nenhum deploy ocorreu |

O job chamado “Verify deployment” apenas publica resumo e link do dashboard; ele não consulta versão, hash ou saúde remota. Seu sucesso na run S019 não reverte a falha de `market-intelligence-insights`.

Entre S019 e o código local, o commit `8bd948eb3` alterou entrypoints e módulos compartilhados. A análise da clausura estática de imports marcou **41 bundles com `Δ`**. Separadamente, `market-intelligence-insights` mudou entre S451 e S019, mas seu job S019 falhou; portanto também recebe `S451+Δ`. Resultado: **42/105 fontes locais atuais sem alinhamento remoto comprovado**. `product-visual-search` foi criada depois de S019 e não possui job de deploy bem-sucedido encontrado.

“Versão” neste documento é a proveniência Git/job acima. O número de versão atribuído pelo Supabase permanece desconhecido.

### 3.1 Drift check com falso verde

A [run 32236519281](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/32236519281), em 2026-08-19, ficou verde e provou paridade de **104 slugs locais/104 canônicos** naquele SHA. Porém os logs registraram falha de download para cada um dos 104 slugs. O [workflow de drift](../.github/workflows/edge-functions-drift-check.yml) acumula `missing_in_dl`, mas o passo final falha apenas por `drift_count`, órfãos ou slugs ausentes. Assim, aquela run **não comparou conteúdo** e não pode sustentar alinhamento de hashes.

## 4. Autorização, JWT e configuração

As três camadas precisam ser avaliadas separadamente:

- `config.toml` controla o gateway JWT;
- o manifesto declara a intenção de autorização;
- o handler precisa aplicar a checagem inline/compartilhada quando o gateway não basta.

O [gate estático](../scripts/check-edge-authorization.mjs) falhou com dez funções locais ausentes do manifesto:

1. `crm-callback-alerts`
2. `crm-callback-reprocess`
3. `intelligence-substitute-applied`
4. `magazine-import-local`
5. `magazine-public-react`
6. `magazine-public-view`
7. `magazine-reader-state-read`
8. `magazine-reader-state-write`
9. `product-visual-search`
10. `quote-sync-promo-champions`

O manifesto contém 96 entradas porque inclui `tests`, pasta de testes que não é Edge deployável. Portanto a cobertura real é 95/105.

O conjunto `VERIFY_JWT_FALSE` do [harness LIVE](../tests/edge-functions/live/_authz.ts) diverge do `config.toml`:

- faltam no harness: `check-login`, `crm-callback-alerts`, `crm-callback-reprocess`, `log-login-attempt`, `magazine-import-local`, `magazine-public-react`, `magazine-public-view`, `magazine-reader-state-read` e `magazine-reader-state-write`;
- sobra no harness: `external-db-bridge`, cujo gateway usa o default `true`.

Treze das 18 funções declaradas “public” usam o default JWT `true`. Isso pode ser intencional, mas demonstra que “public” no manifesto não equivale automaticamente a acesso anônimo no gateway.

Há ainda um limite estrutural no gate: entradas `enforcedBy: "custom"` são aceitas sem provar semanticamente o mecanismo. Nos utilitários analisados, algumas rationales afirmam HMAC/dev-only, enquanto o handler não valida HMAC nem role de entrada.

## 5. Foco: `test-*`, simulação e utilitários

A tabela abaixo descreve somente comportamento estático; nenhuma função foi executada.

| Função | Gateway / intenção | Efeito potencial | Evidência e gap |
|---|---|---|---|
| [test-cart-concurrency](../supabase/functions/test-cart-concurrency/index.ts) | default JWT `true`; manifest `dev/custom`; sem checagem de role no handler | cria usuário, carrinho e 10 inserts com service role; cleanup em `finally` | qualquer JWT válido alcança o teste; LIVE classifica como destrutivo e não cobre happy path |
| [test-cart-limit](../supabase/functions/test-cart-limit/index.ts) | default JWT `true`; manifest `dev/custom`; sem checagem de role | cria usuário e tenta 51 carrinhos; cleanup em `finally` | o próprio comentário informa que o trigger backend foi removido e o limite 50 é client-side; resposta HTTP pode ser 200 com `limit_enforced=false`; comentário interno ainda diz “11/10” |
| [test-cart-rls](../supabase/functions/test-cart-rls/index.ts) | default JWT `true`; manifest `dev/custom`; sem checagem de role | cria dois usuários/carrinho; cleanup em `finally` | cenário A usa client admin/service role e não prova leitura própria sob RLS; B/C usam JWT do segundo usuário corretamente |
| [test-contract-orchestrator](../supabase/functions/test-contract-orchestrator/index.ts) | default JWT `true`; rationale diz “dev/CI, HMAC inline”; não há autenticação/HMAC de entrada | usa service role, chama duas edges e faz upsert persistente de `inbound_webhook_endpoints/test-automated` | HMAC existente assina chamada de saída; não protege o invocador; não há cleanup do upsert |
| [test-inventory-orchestrator](../supabase/functions/test-inventory-orchestrator/index.ts) | default JWT `true`; manifest `dev/custom`; sem checagem de role | usa service role e resolver de credenciais; retornaria apenas presença/origem, nunca valores | lista fixa de 12 está desatualizada: inclui `auth-email-hook` e `process-email-queue` inexistentes e omite a maioria das 105 funções |
| [load-test](../supabase/functions/load-test/index.ts) | default JWT `true`; manifest `dev/custom`; sem checagem de role | gera carga concorrente; aceita URL absoluta | **gap crítico:** envia `Authorization: Bearer <service-role>` até para `targetEndpoint` externo arbitrário; `concurrency` e `totalRequests` não têm limites de schema |
| [audit-suite](../supabase/functions/audit-suite/index.ts) | default JWT `true`; manifest `dev/custom`; sem checagem de role | usa service role, cria usuários e escreve em carrinhos | UI autenticada comum em `/simulacao` pode invocá-la; cleanup não está em `finally`; teste espera limite de 3 carrinhos, divergente do valor 50/client-side; UPDATE RLS espera erro onde PostgREST pode retornar zero linhas sem erro |
| [simulation-orchestrator](../supabase/functions/simulation-orchestrator/index.ts) | default JWT `true`; manifest `scoped/custom` diz HMAC; não valida HMAC de entrada | usa service role, escreve `simulation_runs/logs` e chama outras edges | UI autenticada comum pode invocá-la; usa fallback hardcoded quando a credencial está ausente; script de fuzz a classifica `authRequired:false`, divergindo do gateway |
| [rls-integration-tests](../supabase/functions/rls-integration-tests/index.ts) | default JWT `true` e checagem inline dev/admin efetiva | cria dois usuários e linhas temporárias | remove linhas e encerra sessões, mas não chama `deleteUser`; cada execução pode deixar usuários temporários |
| [cors-audit](../supabase/functions/cors-audit/index.ts) | default JWT `true`; `authorize(requireRole: dev)` compartilhado | leitura do snapshot local | postura coerente; [snapshot CORS](../supabase/functions/_shared/cors-snapshot.json) é de 2026-07-24, contém 104 slugs e não inclui `product-visual-search` |
| [e2e-cleanup](../supabase/functions/e2e-cleanup/index.ts) | JWT de gateway `false`, mas token/allowlist/rate limit custom | cleanup de dados E2E | há defesa inline; não foi encontrada chamada de frontend e não foi executada |
| `connection-tester`, `github-credentials-test`, `full-op-diagnostics` | default JWT `true` e checagens inline admin/dev | diagnóstico/teste | controle de role foi encontrado estaticamente; uso runtime permanece desconhecido |

A página [Simulation.tsx](../src/pages/Simulation.tsx) chama `audit-suite` e `simulation-orchestrator`. A rota `/simulacao` está em [tools-routes.tsx](../src/routes/tools-routes.tsx), conjunto montado sob `ProtectedRoute`, não sob `DevRoute`.

## 6. Testes e documentação associados

- `node scripts/check-edge-authorization.mjs`: **falhou**, com os dez slugs ausentes acima; o script conta 106 diretórios porque inclui `tests`.
- `node scripts/check-edge-live-coverage.mjs`: **falhou**, faltando apenas `tests/edge-functions/live/intelligence-substitute-applied.test.ts`, arquivo que ainda não existe.
- Os três `test-cart-*` estão no conjunto `DESTRUCTIVE` do harness LIVE e seus descriptors não têm inputs inválidos; os arquivos LIVE existentes testam a fronteira negativa, não o contrato funcional positivo.
- [README das Edge Functions](../supabase/functions/README.md) declara 78 funções e ainda menciona `generate-mockup-nanobanana`, slug ausente da árvore atual; não é catálogo confiável para o corte.
- O snapshot CORS declara 104 funções: 100 `shared`, 0 `inline` e 4 `none`. O inventário atual tem 105.

## 7. Evidência de scheduler, não de resposta HTTP

Consulta read-only em `cron.job` e na última linha de `cron.job_run_details` encontrou as funções locais abaixo. “succeeded” prova que o comando do scheduler terminou; **não prova que uma requisição HTTP da Edge retornou sucesso**. O texto do comando cron foi deliberadamente omitido.

| Função | Agenda ativa | Última execução do scheduler (UTC) | Status |
|---|---|---|---|
| `backfill-image-dimensions` | `2,7,12,17,22,27,32,37,42,47,52,57 * * * *` | 2026-08-26 19:22 | succeeded |
| `cleanup-notifications` | `10 3 * * *` | 2026-08-26 03:10 | succeeded |
| `cleanup-novelties` | `5 4 * * *` | 2026-08-26 04:05 | succeeded |
| `collections-watcher` | `23 6 * * *` | 2026-08-26 06:23 | succeeded |
| `comparison-price-watcher` | `40 6 * * *` | 2026-08-26 06:40 | succeeded |
| `connections-auto-test` | `9,24,39,54 * * * *` | 2026-08-26 19:24 | succeeded |
| `connections-health-check` | `3,18,33,48 * * * *` | 2026-08-26 19:18 | succeeded |
| `favorites-watcher` | `20 6 * * *` | 2026-08-26 06:20 | succeeded |
| `generate-blurhashes` | `1,3,5,…,59 * * * *` | 2026-08-26 19:25 | succeeded |
| `hash-product-images` | `*/2 * * * *` | 2026-08-26 19:26 | succeeded |
| `process-queue` | `4,14,24,34,44,54 * * * *` | 2026-08-26 19:24 | succeeded |
| `process-scheduled-reports` | `5 * * * *` | 2026-08-26 19:05 | succeeded |
| `quote-followup-reminders` | `17 9 * * *` | 2026-08-26 09:17 | succeeded |
| `send-digest` | `0 8 * * 1` | 2026-08-24 08:00 | succeeded |
| `send-scheduled-reports` | `10 * * * *` | 2026-08-26 19:10 | succeeded |

A consulta também encontrou jobs com nomes `run-script` e `xbz-image-uploader`, slugs ausentes localmente. Como host, alvo e comando não foram lidos, eles **não foram classificados como Edge órfã**.

## 8. Inventário mestre das 105 funções

Legenda:

- JWT: `T` = default verdadeiro; `T!`/`F!` = valor explícito no `config.toml`.
- Amb. `Gold*` = elegível ao workflow cujo default é o projeto canônico; não é prova de deploy.
- Obs.: `SL` = chamada a logger estruturado; `RID` = request ID; `console` = somente console detectado; `—` = nenhum desses sinais simples no entrypoint.
- Deploy-fonte: `S019`/`S451` = último job de deploy bem-sucedido encontrado; `Δ` = fonte/bundle local atual diferente daquela evidência; “sem job” = nenhuma prova de deploy encontrada.
- Owner `?` e uso `—` significam **desconhecido**, não ausência.
- Nomes de ambiente/segredo são identificadores estáticos; nenhum valor foi consultado ou registrado.

| Função | Cat. | JWT | Amb. | Refs F/E/D/T | Config/segredo direto no entrypoint | Obs. | Deploy-fonte | Owner | Última evidência de uso |
|---|---:|:---:|:---:|:---:|---|:---:|---|---|---|
| `ai-recommendations` | authenticated | F! | Gold* | 1/5/3/10 | `LOVABLE_API_KEY` | console | S019+Δ | ? | — |
| `analyze-logo-colors` | authenticated | T! | Gold* | 1/4/0/7 | — | console | S019+Δ | @adm01-debug | — |
| `asia-ingestion` | service | F! | Gold* | 0/2/3/5 | `ASIA_BASE_URL`, `ASIA_SUPPLIER_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019+Δ | ? | — |
| `audit-suite` | dev | T | Gold* | 2/2/0/2 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `backfill-image-dimensions` | service | F! | Gold* | 0/2/3/5 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | cron OK 2026-08-26 19:22Z |
| `bi-copilot` | authenticated | T | Gold* | 1/5/3/8 | `LOVABLE_API_KEY` | SL+RID | S019+Δ | ? | — |
| `bitrix-sync` | supervisor | T | Gold* | 1/5/0/7 | `BITRIX24_WEBHOOK_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | — |
| `block-ip-temporarily` | supervisor | T | Gold* | 1/4/0/9 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `bulk-random-passwords` | supervisor | T | Gold* | 0/2/0/3 | `ADMIN_BATCH_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `categories-api` | public | T | Gold* | 5/4/0/7 | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL` | console | S019+Δ | ? | — |
| `check-login` | public | F! | Gold* | 0/2/0/4 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `cleanup-notifications` | authenticated | F! | Gold* | 0/3/0/7 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | cron OK 2026-08-26 03:10Z |
| `cleanup-novelties` | authenticated | F! | Gold* | 2/3/0/6 | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | cron OK 2026-08-26 04:05Z |
| `cnpj-lookup` | public | T | Gold* | 3/7/0/10 | `CNPJA_API_KEY`, `ENVIRONMENT`, `SIMULATION_BYPASS_KEY`, `SUPABASE_DB_URL` | console | S019+Δ | ? | — |
| `collections-watcher` | authenticated | F! | Gold* | 0/3/0/6 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | cron OK 2026-08-26 06:23Z |
| `commemorative-dates` | public | T | Gold* | 2/3/0/6 | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `EXTERNAL_SUPABASE_SERVICE_KEY`, `EXTERNAL_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | — |
| `comparison-ai-advisor` | authenticated | T | Gold* | 2/4/1/6 | — | console | S019 | ? | — |
| `comparison-price-watcher` | authenticated | F! | Gold* | 0/3/0/7 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | cron OK 2026-08-26 06:40Z |
| `connection-tester` | dev | T | Gold* | 8/6/0/6 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `connections-auto-test` | authenticated | F! | Gold* | 1/8/11/11 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | cron OK 2026-08-26 19:24Z |
| `connections-health-check` | authenticated | F! | Gold* | 1/3/0/9 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | cron OK 2026-08-26 19:18Z |
| `connections-hub-audit` | authenticated | T | Gold* | 1/4/0/7 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019 | ? | — |
| `cors-audit` | dev | T | Gold* | 0/3/0/5 | — | SL+RID | S019 | ? | — |
| `crm-callback-alerts` | AUSENTE | F! | Gold* | 1/1/0/2 | `SENTRY_DSN_SERVER`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `crm-callback-reprocess` | AUSENTE | F! | Gold* | 2/1/0/2 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `crm-db-bridge` | scoped | F! | Gold* | 15/8/2/9 | `LOG_CRM_BRIDGE_VERBOSE`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019+Δ | ? | — |
| `detect-new-device` | public | T | Gold* | 1/3/1/6 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `dropbox-list` | public | T | Gold* | 4/4/0/6 | `DROPBOX_ACCESS_TOKEN` | console | S019+Δ | @adm01-debug | — |
| `e2e-cleanup` | dev | F! | Gold* | 0/4/1/9 | `E2E_CLEANUP_ALLOWED_EMAILS`, `E2E_CLEANUP_RATE_LIMIT_MAX`, `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS`, `E2E_CLEANUP_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `elevenlabs-scribe-token` | public | T | Gold* | 1/3/0/4 | `ELEVENLABS_API_KEY` | console | S019+Δ | ? | — |
| `elevenlabs-tts` | public | T | Gold* | 1/4/0/6 | `ELEVENLABS_API_KEY` | console | S019+Δ | @adm01-debug | — |
| `expert-chat` | authenticated | T | Gold* | 5/7/3/7 | `EXTERNAL_CRM_ANON_KEY`, `EXTERNAL_CRM_SERVICE_ROLE_KEY`, `EXTERNAL_CRM_URL`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL` | console | S019+Δ | ? | — |
| `external-db-bridge` | authenticated | T | Gold* | 39/11/12/20 | — | SL+RID | S019 | ? | — |
| `external-db-inspect` | dev | F! | Gold* | 3/3/0/4 | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | — |
| `favorites-watcher` | authenticated | F! | Gold* | 0/3/0/5 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | cron OK 2026-08-26 06:20Z |
| `force-global-logout` | authenticated | T | Gold* | 1/5/0/10 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `full-op-diagnostics` | dev | T | Gold* | 1/3/0/6 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `generate-ad-image` | authenticated | T | Gold* | 1/3/0/5 | — | console | S019+Δ | ? | — |
| `generate-ad-prompt` | authenticated | T | Gold* | 1/3/1/4 | — | console | S019+Δ | ? | — |
| `generate-blurhashes` | service | T | Gold* | 0/2/3/4 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | cron OK 2026-08-26 19:25Z |
| `generate-mockup` | authenticated | T! | Gold* | 4/4/1/11 | `MOCKUP_FETCH_ALLOWED_HOSTS`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | @adm01-debug | — |
| `generate-product-seo` | authenticated | T | Gold* | 1/3/1/5 | — | console | S019+Δ | ? | — |
| `get-visitor-info` | public | F! | Gold* | 3/3/0/8 | — | — | S019 | ? | — |
| `github-credentials-test` | dev | T | Gold* | 1/3/0/5 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `hash-product-images` | service | T | Gold* | 0/2/4/5 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | cron OK 2026-08-26 19:26Z |
| `health-check` | public | T | Gold* | 4/11/2/21 | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019+Δ | ? | — |
| `image-proxy` | public | F! | Gold* | 2/3/1/9 | `IMAGE_PROXY_ALLOW_LOCALHOST`, `IMAGE_PROXY_MAX_BYTES` | console | S019 | ? | — |
| `intelligence-substitute-applied` | AUSENTE | T | Gold* | 2/1/0/0 | — | SL+RID | S019 | ? | — |
| `kit-ai-builder` | authenticated | T | Gold* | 1/5/1/7 | — | console | S019 | ? | — |
| `kit-identity-suggest` | authenticated | T | Gold* | 1/3/0/6 | — | — | S019 | ? | — |
| `load-test` | dev | T | Gold* | 0/3/0/6 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `log-login-attempt` | public | F! | Gold* | 6/3/1/15 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `magazine-import-local` | AUSENTE | F! | Gold* | 3/1/0/1 | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `magazine-public-react` | AUSENTE | F! | Gold* | 0/1/0/1 | `MAGAZINE_IP_SALT`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `magazine-public-view` | AUSENTE | F! | Gold* | 2/1/1/2 | `MAGAZINE_IP_SALT`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `magazine-reader-state-read` | AUSENTE | F! | Gold* | 2/1/0/1 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `magazine-reader-state-write` | AUSENTE | F! | Gold* | 2/1/0/1 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `magic-up-score` | authenticated | T | Gold* | 1/3/2/6 | — | console | S019+Δ | ? | — |
| `manage-users` | supervisor | T | Gold* | 3/3/0/4 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `market-intelligence-insights` | authenticated | T | Gold* | 2/4/2/6 | — | console | S451+Δ | ? | — |
| `materials-api` | public | T | Gold* | 1/4/1/6 | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | — |
| `mcp-keys-issue` | dev | T | Gold* | 7/6/3/5 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019 | ? | — |
| `mcp-keys-revoke` | dev | T | Gold* | 2/6/0/5 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019 | ? | — |
| `mcp-keys-rotate` | dev | T | Gold* | 3/7/0/5 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019 | ? | — |
| `mcp-keys-update` | dev | T | Gold* | 2/7/0/5 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019 | ? | — |
| `mcp-server` | scoped | F! | Gold* | 2/4/2/10 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019 | ? | — |
| `ownership-audit` | authenticated | F! | Gold* | 2/5/0/10 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `ownership-repair` | supervisor | T | Gold* | 1/4/1/10 | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `process-queue` | authenticated | F! | Gold* | 0/3/5/6 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | cron OK 2026-08-26 19:24Z |
| `process-scheduled-reports` | authenticated | F! | Gold* | 0/3/0/6 | `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019+Δ | ? | cron OK 2026-08-26 19:05Z |
| `product-visual-search` | AUSENTE | T | Gold* | 0/0/0/3 | `ROBOFLOW_API_KEY`, `ROBOFLOW_MODEL_ID`, `SIMULATION_BYPASS_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | sem job+Δ | ? | — |
| `product-webhook` | public | T | Gold* | 0/10/5/19 | `N8N_PRODUCT_WEBHOOK_SECRET`, `N8N_PRODUCT_WEBHOOK_TOLERANCE_SEC`, `PRODUCT_WEBHOOK_ALLOWED_ORIGINS`, `PRODUCT_WEBHOOK_BATCH_SIZE`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | — |
| `quote-followup-reminders` | authenticated | F! | Gold* | 1/3/1/8 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | cron OK 2026-08-26 09:17Z |
| `quote-sync` | authenticated | T | Gold* | 3/8/0/17 | `EXTERNAL_CRM_ANON_KEY`, `EXTERNAL_CRM_SERVICE_ROLE_KEY`, `EXTERNAL_CRM_URL`, `N8N_QUOTE_WEBHOOK_URL`, `QUOTE_SYNC_API_KEY`, `SALESPRO_WEBHOOK_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | — |
| `quote-sync-promo-champions` | AUSENTE | T | Gold* | 1/1/0/1 | `PROMO_CHAMPIONS_WEBHOOK_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL | S019+Δ | ? | — |
| `rate-limit-check` | public | T | Gold* | 0/3/0/11 | — | console | S019 | ? | — |
| `receive-crm-callback` | scoped | F! | Gold* | 2/2/0/11 | `CRM_CALLBACK_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019+Δ | ? | — |
| `rls-audit` | dev | T | Gold* | 2/3/0/6 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `rls-integration-tests` | dev | T | Gold* | 1/3/0/4 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `rls-matrix-export` | dev | T | Gold* | 1/3/0/7 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `secrets-manager` | dev | T | Gold* | 14/7/1/10 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019+Δ | ? | — |
| `secure-upload` | authenticated | T | Gold* | 2/3/0/7 | `VIRUSTOTAL_API_KEY` | SL+RID | S019+Δ | ? | — |
| `semantic-search` | public | T | Gold* | 2/4/2/9 | `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `send-digest` | authenticated | F! | Gold* | 0/3/1/7 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | cron OK 2026-08-24 08:00Z |
| `send-notification` | authenticated | F! | Gold* | 0/3/3/9 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `send-scheduled-reports` | authenticated | F! | Gold* | 0/3/0/7 | `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | cron OK 2026-08-26 19:10Z |
| `send-transactional-email` | authenticated | T | Gold* | 2/5/0/12 | `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019+Δ | @adm01-debug | — |
| `simulation-orchestrator` | scoped | T | Gold* | 1/4/0/8 | `N8N_PRODUCT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019+Δ | ? | — |
| `step-up-verify` | authenticated | T | Gold* | 4/5/0/10 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `sync-external-db` | service | F! | Gold* | 1/3/0/7 | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019+Δ | ? | — |
| `sync-quote-bitrix` | authenticated | T | Gold* | 2/5/0/5 | `N8N_QUOTE_WEBHOOK_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019+Δ | @adm01-debug | — |
| `test-cart-concurrency` | dev | T | Gold* | 0/2/1/4 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `test-cart-limit` | dev | T | Gold* | 1/2/1/4 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `test-cart-rls` | dev | T | Gold* | 0/2/1/4 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019 | ? | — |
| `test-contract-orchestrator` | dev | T | Gold* | 0/2/0/3 | `SIMULATION_BYPASS_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019+Δ | ? | — |
| `test-inventory-orchestrator` | dev | T | Gold* | 0/2/0/2 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | — | S019+Δ | ? | — |
| `trends-insights` | authenticated | T | Gold* | 3/4/1/8 | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | console | S019+Δ | ? | — |
| `validate-access` | authenticated | T | Gold* | 2/7/0/8 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `verify-2fa-token` | authenticated | T | Gold* | 1/2/0/5 | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019 | ? | — |
| `verify-email` | public | T | Gold* | 0/3/0/5 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | console | S019 | ? | — |
| `visual-search` | authenticated | T | Gold* | 7/5/0/11 | `LOVABLE_API_KEY`, `MINIMAX_API_KEY`, `SIMULATION_BYPASS_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | RID | S019+Δ | ? | — |
| `voice-agent` | authenticated | T | Gold* | 2/4/1/8 | — | console | S019+Δ | ? | — |
| `webhook-dispatcher` | authenticated | F! | Gold* | 5/9/8/15 | `WEBHOOK_DISPATCHER_SECRET` | console | S019+Δ | ? | — |
| `webhook-inbound` | public | F! | Gold* | 2/13/3/25 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `WEBHOOK_INBOUND_SIGNING_SECRET` | console | S019 | @adm01-debug | — |
| `word-magic` | authenticated | T! | Gold* | 9/2/1/5 | `DEEPSEEK_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | SL+RID | S019+Δ | ? | — |

## 9. Gaps priorizados — recomendações, não alterações

### P0 — conter antes de qualquer uso adicional

- [ ] Decidir com o PO se `load-test`, `test-cart-*`, `test-contract-orchestrator`, `test-inventory-orchestrator`, `audit-suite` e `simulation-orchestrator` podem existir no projeto Gold.
- [ ] Para os que permanecerem, exigir role dev/admin ou autenticação de serviço efetiva no handler; não confiar apenas em rationale `custom`.
- [ ] Remover a possibilidade de `load-test` enviar service role a host arbitrário e aplicar allowlist/limites de carga.
- [ ] Classificar e adicionar ao manifesto os dez slugs ausentes, com contrato de auth verificável.
- [ ] Não realizar qualquer deploy dessas correções sem autorização explícita do PO para o projeto canônico.

### P1 — restaurar confiabilidade operacional

- [ ] Corrigir o drift check para falhar quando `missing_in_dl > 0` e validar hash/bundle de fato.
- [ ] Adicionar `environment` protegido e política explícita de inclusão/exclusão de funções dev/test no workflow de produção.
- [ ] Reconciliar, por download/hash autorizado, as 42 fontes atuais sem alinhamento remoto comprovado.
- [ ] Sincronizar `VERIFY_JWT_FALSE` com `config.toml` e tornar o teste derivado automaticamente da configuração.
- [ ] Corrigir `audit-suite`, `test-cart-limit` e `test-cart-rls` para testar o contrato atual sem falso positivo/negativo.
- [ ] Garantir cleanup em `finally` e remoção de usuários temporários em `audit-suite` e `rls-integration-tests`.
- [ ] Remover persistência não limpa de `test-contract-orchestrator` ou introduzir teardown idempotente.
- [ ] Preencher telemetria não sensível de invocação/status/latência para que “último uso” deixe de ser desconhecido.
- [ ] Adicionar o teste LIVE ausente e ampliar happy paths em ambiente isolado, nunca no Gold por padrão.

### P2 — governança e documentação

- [ ] Atualizar o catálogo README de 78 para 105 somente após conciliar categorias.
- [ ] Regenerar o snapshot CORS e incluí-lo em gate de criação de nova função.
- [ ] Definir owner por módulo para os 98 slugs sem regra direta.
- [ ] Documentar versão do CLI também no drift check; hoje deploy fixa `2.101.0` e drift usa `latest`.
- [ ] Criar inventário gerado e determinístico em CI, distinguindo referência estática, deploy e uso runtime.

## 10. Desconhecidos que exigem nova evidência ou autorização

Permanecem intencionalmente desconhecidos:

- versão numérica e hash/bundle remoto atual de cada uma das 105 funções;
- presença/origem real de cada segredo no Gold;
- último uso runtime das 90 funções sem evidência de scheduler;
- resposta HTTP real das 15 chamadas potencialmente disparadas por cron;
- owner funcional/negócio de 98 funções;
- se `run-script` e `xbz-image-uploader` apontam para o projeto canônico ou para Edge Functions;
- diferenças intencionais versus perdas reais entre o source local e o remoto.

Para resolver esses pontos com segurança, a próxima auditoria precisaria de acesso read-only à Management API/logs do Supabase e autorização explícita do PO. Mesmo com esse acesso, a consulta deve listar metadados e hashes, não valores de segredo nem payloads.

## 11. Validação deste inventário

Validações executadas:

- contagem por filesystem: 105 diretórios com `supabase/functions/<slug>/index.ts`;
- cruzamento determinístico dos 105 slugs da tabela com o filesystem;
- contagem de 36 `verify_jwt=false`, 3 `true` e 66 defaults;
- cruzamento manifesto/config/harness LIVE;
- `git diff --no-index --check /dev/null` no documento (sem diagnóstico de whitespace; exit 1 esperado por haver diferença);
- validação de todos os links locais relativos;
- busca por padrões de token/JWT para confirmar que nenhum valor sensível foi incluído;
- consulta dos links das quatro runs pelo `gh run view`, em modo read-only.

Nenhuma Edge Function, migration, job, segredo ou endpoint externo foi alterado ou invocado durante a etapa 88.
