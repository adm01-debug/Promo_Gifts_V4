# ADR — checks inconclusivos sem segredo, credencial ou alvo de teste

- **Status:** em implementação — lote 1 de RPC concluído localmente; demais superfícies permanecem em análise/aguardam decisão de ambiente
- **Data:** 2026-08-26
- **Escopo:** etapas 92 e 94 do plano de melhorias: smoke/integrations reais e semântica de checks sem segredo.
- **Não escopo:** não foram executados requests remotos, migrations, DDL, deploys, cargas, webhooks ou testes contra produção. Não há alteração de schema, dados ou secrets; os dois workflows alterados nesta rodada passam a recusar aprovação sem evidência live nos checks de RPC e drift de `SECURITY DEFINER` descritos abaixo.

## Decisão proposta

Um check só pode ser chamado de **aprovado/validado** quando produziu evidência do escopo que declara validar. Falta de segredo, credencial inválida, permissão insuficiente, endpoint inacessível, conta de teste ausente, alvo não permitido ou zero requests reais são estados **inconclusivos**, não aprovação.

Há dois tipos legítimos de execução sem integração remota:

1. **Estática/dry-run:** valida arquivo, contrato local, sintaxe ou construção de payload. Deve ter nome próprio (`static`, `dry-run`, `spec-coverage`) e não se apresentar como smoke/live/load aprovado.
2. **Opcional/advisory:** pode encerrar sem bloquear, desde que seu resumo diga explicitamente `INCONCLUSIVO` e não seja contado pelo job/summary de qualidade como `success` de integração.

Para checks obrigatórios, a ausência da evidência necessária deve falhar o job final com diagnóstico acionável. GitHub Actions não oferece um resultado universal nativo chamado `inconclusivo`; portanto o mecanismo mínimo é produzir um artefato/JSON com `status: "passed" | "inconclusive" | "failed"`, e um job agregador só considerar `passed` como aprovação. Onde o check é obrigatório, `inconclusive` deve fazer o agregador falhar; onde é advisory, deve permanecer visível e separado de checks aprovados.

## Critério de evidência proposto

| Estado reportado | Evidência mínima | Pode satisfazer gate obrigatório? |
|---|---|---|
| `passed` | alvo permitido identificado, credenciais válidas, requests/testes realmente executados, contagem de executados maior que zero e asserções aprovadas | Sim |
| `failed` | execução real ocorreu e uma asserção falhou | Não |
| `inconclusive` | qualquer pré-requisito externo ausente/inválido, alvo não permitido, provider indisponível, suite toda skipped ou zero requests | Não |
| `static-pass` / `dry-run-pass` | só evidência local, sem alegação de integração real | Somente para um gate explicitamente estático |

## Inventário confirmado — banco, segurança e governança

| Caso e arquivos | Comportamento atual | Risco de falso verde | Mudança mínima proposta | Autorização externa? |
|---|---|---|---|---|
| **ACL SECURITY DEFINER** — `scripts/check-security-definer-acl.mjs`; `.github/workflows/magazine-unit-tests.yml`; `.github/workflows/security-definer-acl-multi-env.yml`; `.github/workflows/freight-quality-gates.yml` | **Lote 1 aplicado no script:** sem URL/chave ele emite `static-pass` ou `inconclusive` em `--require-live`; falha de rede/HTTP/resposta inválida também é `inconclusive`, com URL mascarada. Os consumidores legados ainda precisam declarar se são advisory ou live obrigatório. | Um summary legado ainda pode agregar o modo estático, portanto a classificação dos jobs permanece pendente. | Passar `--require-live` somente aos jobs que realmente possuam credencial/alvo permitido e excluir `static-pass` de summaries que declaram segurança live. | **Sim**, para provisionar segredo de leitura no Environment de staging e definir se o gate é obrigatório em PR/fork. A alteração de código por si só não exige acesso externo. |
| **Drift de lints 0011, 0029 e EXECUTE para anon** — `scripts/check-lint-0011-drift.mjs`, `scripts/check-lint-0029-drift.mjs`, `scripts/check-secdef-anon-drift.mjs`; `.github/workflows/ci.yml` | **Lote 1 aplicado:** os scripts diferenciam `static-pass`, `inconclusive` e achado real; erro de rede/HTTP/JSON é `inconclusive`, e o `ci.yml` usa `--require-live` nos três gates. O modo `--from-file` continua sendo evidência estática/testável. | PR/fork sem segredo agora fica explicitamente inconclusivo no gate live, em vez de sugerir “nenhum drift”. | Provisionar rota/credencial de leitura não produtiva e decidir política de PRs externos antes de converter o resultado em aprovação live. | **Sim**, para uma credencial de leitura `pg-meta` no alvo não produtivo; decisão do PO sobre obrigatoriedade por tipo de evento. |
| **Presença de RPC `restore_seller_cart`** — `scripts/check-restore-seller-cart-rpc.mjs`; `.github/workflows/restore-seller-cart-rpc.yml` | Sem chave anônima, e também em HTTP 401 no modo padrão, usa `skip` + `exit 0`; só `STRICT=1` falha. O workflow dedicado pula passos por falta de credenciais e fecha verde. | A RPC pode não ter sido consultada, mas o workflow aparenta validar a presença. | Tornar o workflow dedicado estrito ou renomeá-lo explicitamente como diagnóstico; exigir `STRICT=1` no job que alimenta qualquer conclusão de deploy. Preservar o `deploy-gates.yml`, que já usa o modo estrito, como padrão. | **Sim**, para disponibilizar a chave de staging/canônica autorizada; sem autorização, manter apenas uma verificação estática declarada como tal. |
| **Drift de schema vivo** — `.github/workflows/db-schema-drift-check.yml` | O próprio workflow declara modo “safe-by-default”: sem `SUPABASE_ACCESS_TOKEN`/senha, os passos live são condicionais e o job passa com aviso. | Verde não prova comparação entre migrations e schema vivo. | Separar `schema-drift-static` de `schema-drift-live`; no segundo, gerar `inconclusive` sem credenciais e impedir que seja agregado como aprovação. | **Sim**, para token/credencial de leitura do ambiente de staging e, se for requerido, ajuste dos required checks do GitHub. |
| **Dry-run de drafts de migration** — `scripts/dry-run-migration-draft.mjs`; `.github/workflows/migration-dry-run.yml` | Sem `PGHOST`, o script escreve que foi pulado e retorna `0`. O workflow também tolera o baseline ACL com `continue-on-error` e `|| true`. | Um draft pode não ter sido executado em transação/rollback, embora o job pareça concluído. | Retornar `inconclusive` no modo CI quando houver draft elegível sem PG*, conservar `dry-run-local` para uso manual e remover a máscara do resultado apenas no gate que promete validação. | **Sim**, para banco de teste isolado, credencial PG e aprovação do responsável pelo ambiente. Nenhum draft deve ir para produção para esta validação. |
| **Snapshot/export de schema** — `scripts/export-schema-snapshot.mjs`; `.github/workflows/schema-snapshot-export.yml` | Sempre gera `ALL_IN_ONE.sql`; sem token/senha pula `SCHEMA_LIVE.sql` e `SCHEMA_DRIFT.sql`, mas o job passa e publica artefato parcial. | Consumidor pode interpretar um artefato de snapshot como retrato live, sem ele existir. | Incluir no `SNAPSHOT_META.json` `live_status: inconclusive` e fazer o nome/sumário do artefato dizer `partial-static` quando não houve dump. Não usar esse job como evidência de drift vivo. | **Sim**, somente para obter dump read-only real; a rotulagem é interna. |
| **Branch Protection remoto** — `scripts/check-required-checks.mjs`; `.github/workflows/required-checks-guard.yml` | A parte estática do SSOT é válida. A comparação remota é best-effort: sem `GH_TOKEN`/repo sai `0`; 403/404/API inacessível viram warnings + `0`, inclusive no workflow guard. | O SSOT local pode estar certo enquanto as regras reais do GitHub estão ausentes/diferentes. | Dividir em `required-checks:ssot` e `required-checks:github`; o segundo deve reportar `inconclusive` por falta de `Administration:read`, sem afirmar sincronismo remoto. | **Sim**, para token/permissions de leitura de Branch Protection e, se aplicável, alteração de rulesets. |
| **Gate de RPC `get_profile_and_roles`** — `scripts/check-rpc-permissions.mjs`; `scripts/check-rpc-get-profile-and-roles.mjs`; `.github/workflows/supabase-security-gate.yml` | **Lote 1 aplicado:** ambos emitem resultado estruturado `passed`/`failed`/`inconclusive`; Gate 5 chama `--require-live`, logo credencial ausente, HTTP/rede/payload não verificável encerram com `exit 2`, sem afirmar aprovação. O smoke 404 só aprova após `fn_rpc_exists()` devolver booleano `true`. | O gate pode agora ficar explicitamente inconclusivo até existir rota/credencial de leitura adequada; isso é preferível ao falso verde anterior. | Preservar o resultado estruturado e provisionar uma rota/credencial de leitura estável no ambiente de teste antes de classificá-lo como `passed`. | **Sim**, para uma rota de auditoria/credencial de leitura estável no ambiente de teste. |
| **Supabase Management Linter** — `scripts/check-supabase-linter.mjs` | Segredo/ref ausentes falham corretamente com `exit 2`, mas HTTP 404 do endpoint `/database/lint` faz `exit 0` após “Pulando lint”. | Indisponibilidade de API/plano parece ausência de finding novo. | Manter falha de configuração e converter 404 em `inconclusive` com a causa, ou desabilitar formalmente este check para projetos sem suporte. | **Sim**, para confirmar suporte/escopo do endpoint e, se necessário, token de Management API. |
| **Geração de tipos a partir do schema** — `.github/workflows/quality-gate.yml` | A etapa `Supabase Types Sync` usa `SUPABASE_PROJECT_ID` mas está com `continue-on-error: true`; falta de segredo/erro de CLI pode não impedir o sucesso do workflow. | Tipos desatualizados ou não gerados podem ser percebidos como verificados. | Criar preflight explícito e um resultado `inconclusive`; se a sincronização for gate, remover a tolerância somente desse caminho. | **Sim**, para project id/token autorizados e decisão de tornar o gate obrigatório. |

## Inventário confirmado — smoke, fuzz, carga e integrações externas

| Caso e arquivos | Comportamento atual | Risco de falso verde | Mudança mínima proposta | Autorização externa? |
|---|---|---|---|---|
| **Smoke HTTP genérico** — `scripts/smoke-tests.mjs`; `package.json` (`smoke`) | `SMOKE_BASE_URL` e `SMOKE_HEALTH_FN_URL` são opcionais. Sem ambos, só as rotas estáticas são verificadas; o processo pode encerrar `0` com avisos de HTTP pulado. | “Smoke” pode ser interpretado como disponibilidade de aplicação/health-check, apesar de nenhuma chamada remota. | Dividir em `smoke:static` e `smoke:remote`; no segundo, exigir URL, health endpoint e ao menos uma request por grupo. Publicar contagens `static_checks`, `http_requests`, `skipped`. | **Sim**, para URL de staging/preview permitida. |
| **Fuzz geral de Edge Functions** — `scripts/fuzz-testing.mjs`; `.github/workflows/edge-integration-all.yml`; `.github/workflows/freight-quality-gates.yml` | Define `DRY_RUN` quando URL/chave faltam; processa a matriz de payloads sem HTTP e pode informar todos os cenários como sucesso. Alguns workflows o executam intencionalmente com URL vazia. | Cobertura de geração/fuzz local parece robustez de endpoints reais. | Separar `fuzz:payloads` de `fuzz:live`; o relatório live deve exigir `requests > 0`, alvo de staging e funções efetivamente chamadas. | **Sim**, para chave e ambiente de teste isolado; para live, aprovação do dono das funções potencialmente mutantes. |
| **Fuzz de uploads** — `scripts/fuzz-edge-uploads.mjs`; `.github/workflows/edge-integration-all.yml`; `.github/workflows/freight-quality-gates.yml` | Sem credenciais, callbacks não são executados e os 134 cenários podem passar em dry-run. | O número de “passes” pode ser confundido com testes de Storage/upload reais. | Emitir `executed_requests` e `dry_run`; não permitir que o resultado dry-run alimente o título/summary de integração live. | **Sim**, para bucket/tenant de teste, chave limitada e política de limpeza. |
| **Carga e burst genéricos** — `scripts/massive-load-test.mjs`; `scripts/stress-burst.mjs`; `.github/workflows/ci-freight-quality.yml`; `.github/workflows/freight-quality-gates.yml` | Ambos encerram `0` quando URL ou token faltam. O job de carga é advisory e há workflow que o trata como dry-run. | Nenhuma métrica de latência, erro ou recuperação é coletada, mas o job pode parecer “passou”. | Renomear resultados sem credenciais para `load:dry-run`/`stress:inconclusive`; exigir relatório com `requests`, `p95`, `p99`, `error_rate` antes de aceitar SLA. | **Sim**, para janela de teste, limite de tráfego, ambiente isolado e aval de quem opera endpoints. |
| **Carga freight-quest** — `scripts/freight-quest-load-test.mjs`; `.github/workflows/freight-quality-gates.yml` | Usa `DRY_RUN` sem URL/chave e valida estrutura sem HTTP. Os endpoints previstos incluem `webhook-inbound`, `quote-sync` e cálculo de frete. | Um teste que só monta payloads pode ser interpretado como stress de integrações freight. | Mesmo contrato de evidência: modo dry-run separado e resultado live exige request real por endpoint. | **Sim**, para sandbox de freight/webhook e dados de teste descartáveis. |
| **Suíte live de Edge Functions** — `tests/edge-functions/live/_live-client.ts`; `tests/edge-functions/live/_live-suite.ts`; `.github/workflows/edge-integration-all.yml` | `describeLive` é `describe.skip` quando URL/chave não são reais. Credenciais de role ausentes fazem happy paths específicos não rodar. O workflow chama a suíte mesmo sem preflight estrito. | Uma suíte inteiramente skipped pode deixar o job verde sem testar Edge Functions. | Preflight no workflow e manifesto da suíte com `live`, `requests`, `skipped`, roles e alvo; falhar o agregador live se não houve execução obrigatória. | **Sim**, para contas de teste por role, chaves de staging e autorização dos donos de cada função. |
| **“Cobertura live” por existência de arquivo** — `scripts/check-edge-live-coverage.mjs`; `docs/testing/EDGE_LIVE_TESTS.md` | O script confere a presença de `tests/edge-functions/live/<function>.test.ts`; não comprova que Vitest enviou request. A própria documentação registra skip silencioso sem segredos. | “Cobertura LIVE completa” pode significar apenas especificações presentes. | Renomear para `check-edge-live-spec-coverage`; manter uma métrica separada de cobertura de execução, construída a partir do manifesto acima. | Não para renomear/medir arquivos; **sim** para executar testes live. |
| **Visual search / provider oneroso** — `tests/edge-functions/live/product-visual-search.test.ts` | Happy path pode ser skipped sem `ROBOFLOW_API_KEY`/flag de custo; quando roda, aceita respostas de erro de provider como opções previstas. | A existência do teste não prova que serviço externo está saudável ou configurado. | Adicionar canário de staging explicitamente opcional, com assertion de resposta saudável e custo máximo; em falta de provider, reportar `inconclusive`, não “pass”. | **Sim**, para API key sandbox, orçamento e consentimento do dono da integração. |

## Inventário confirmado — E2E autenticado e alvo remoto

| Caso e arquivos | Comportamento atual | Risco de falso verde | Mudança mínima proposta | Autorização externa? |
|---|---|---|---|---|
| **Setup de autenticação Playwright** — `e2e/fixtures/auth.setup.ts`; `e2e/fixtures/test-base.ts` | Sem `E2E_USER_*`, ou quando o login falha, grava `storageState` vazio e retorna sucesso. `requireAuth()`/`requireAdmin()` faz `test.skip`. Há 172 arquivos sob `e2e/` que referenciam `requireAuth(`. | A suíte pode passar com grande cobertura autenticada não executada; login inválido e Supabase indisponível recebem o mesmo tratamento que “não aplicável”. | Para projetos/gates autenticados, preflight deve falhar como `inconclusive` antes do Playwright. Manter o helper de skip somente para suites declaradamente públicas/mock. Incluir `executed/skipped` no resumo. | **Sim**, para usuários de teste, senha/rotação, fixtures e ambiente de staging. |
| **Smoke de autenticação** — `e2e/smoke.spec.ts`; `.github/workflows/e2e.yml` | O teste de login é explicitamente skipped sem credenciais, enquanto testes públicos podem passar. O workflow usa fallback do URL/anon key canônico quando secrets não existem. | O marcador de smoke pode dizer sucesso sem validar login; além disso, um run que obtenha credenciais pode atingir o projeto canônico. | Separar `e2e:public-smoke` de `e2e:authenticated-smoke`; exigir ao menos um teste autenticado executado para a segunda. Usar URL de staging explícita, sem fallback para produção, no caminho mutante. | **Sim**, para staging, usuários de teste e aprovação para retirar fallback dos jobs correspondentes. |
| **E2E condicionais/advisory** — `.github/workflows/e2e-quotes-undo.yml`; `.github/workflows/delivery-quality.yml`; `.github/workflows/replenishment-quality.yml`; `.github/workflows/freight-quality-gates.yml`; `.github/workflows/ci-freight-quality.yml`; `e2e/flows/36-freight-dashboard-stress.spec.ts` | Há passos/jobs condicionais à presença de credenciais, `continue-on-error`, `--pass-with-no-tests` e `CI_SKIP_FREIGHT_E2E`. Alguns resumos já mostram `skipped`, mas um job verde ainda pode ser consumido como qualidade funcional aprovada. | Fluxos de quote, delivery, replenishment e freight podem não rodar sem uma falha clara no agregador. | Declarar cada workflow como `public`, `mock`, `advisory` ou `required-live`; no resumo agregado, excluir `skipped`/advisory do contador de aprovados e publicar cobertura efetivamente executada. | **Sim**, para credenciais/fixtures por fluxo e decisão do PO sobre quais são gates obrigatórios. |
| **Fallback para Supabase canônico** — 33 workflows em `.github/workflows/` contêm `secrets.VITE_SUPABASE_URL || 'https://doufsxqlfjyuvxuezpln.supabase.co'` (inclui `e2e.yml`, `freight-quality-gates.yml`, `delivery-quality.yml` e diversos E2E) | Se o secret de URL não está configurado, o workflow pode apontar para `doufsxqlfjyuvxuezpln`, o projeto canônico de produção. Nem todos os workflows são mutantes, mas vários chamam E2E/integrações. | A correção de “sem segredo” pode acabar executando smoke/live/load contra produção, especialmente para callbacks/webhooks/carga. | Para qualquer teste que faça request, exigir `TEST_TARGET=staging` e allowlist explícita de project ref; recusar o ref canônico em testes mutantes. Avaliar cada um dos 33 workflows antes de alterar, preservando os checks estáticos legítimos. | **Sim, obrigatória:** aprovação explícita do PO e dos donos de ambiente para criar/usar staging e classificar os 33 fluxos. |

## Simulação de cenários — falhas e gaps previstos

| Cenário | Comportamento atual provável | Resultado correto proposto | Salvaguarda mínima |
|---|---|---|---|
| PR de fork sem secrets | Scripts de ACL/lint, smoke e suites live podem retornar `0`/skip. | `inconclusive`; o PR ainda pode passar somente os gates estáticos declarados. | Agregador que não conte `inconclusive` como aprovado. |
| Secret existe, mas está inválido/sem permissão | Alguns checks de `pg-meta`, GitHub API e RPC tratam HTTP/rede como skip/sucesso. | `inconclusive` com causa `credential_invalid`, `forbidden` ou `endpoint_unavailable`. | Preservar status HTTP/erro no artefato; não substituir por “OK”. |
| Nenhuma conta de teste autentica | `auth.setup` escreve estado vazio, `requireAuth` pula specs. | `inconclusive` para a parcela autenticada. | Preflight obrigatório para jobs autenticados e contagem de testes executados. |
| Provider CRM/email/mockup/catálogo não tem sandbox | Happy path pode ser skipped, negativo/local pode passar. | `inconclusive` para a integração real; `static-pass`/teste negativo continuam visíveis separadamente. | Credencial sandbox, fixture idempotente e observabilidade do callback. |
| URL de secret ausente cai no projeto canônico | Possível execução remota contra produção, inclusive em fluxos que criam payloads de webhook/carga. | Recusar antes de enviar request. | Allowlist de ref de staging + bloqueio explícito de `doufsxqlfjyuvxuezpln` para testes mutantes. |
| Carga/fuzz é habilitada sem isolamento | Os scripts possuem POSTs para `webhook-inbound`, `quote-sync`, `rate-limit-check`, upload e outros endpoints. | Não executar sem ambiente isolado e autorização. | `CI_TEST_ENV=staging`, prefixo/tenant de dados de teste, rate limit, cleanup e kill switch. |

## Cobertura necessária para a etapa 92 — smoke de integrações reais

O objetivo não é transformar produção em ambiente de teste. Cada cenário abaixo precisa de alvo não produtivo, evidência de request e limpeza/idempotência definida antes de ser ativado.

| Integração | Cobertura atual observada | Gap para smoke real | Pré-requisito externo |
|---|---|---|---|
| CRM | Há workflow de callback com guard estrito (`e2e-crm-callback-approved.yml`), o que é um padrão positivo. | Faltam evidência consolidada de sandbox/callback recebido e dados de teste descartados. | Chave e endpoint sandbox, usuário admin de teste, aprovação do dono do CRM. |
| Webhook | Fuzz/carga conhecem `webhook-inbound`, mas em ausência de segredos ficam dry-run; em live podem fazer POST. | Assinatura válida, evento canário, deduplicação e consulta de entrega no ambiente de teste. | Segredo de assinatura/test tenant e autorização do dono do webhook. |
| Email | Não há evidência nesta análise de uma smoke positiva com caixa de correio de teste. | Envelope/recebimento verificável em sandbox, sem envio a destinatário real. | Provider/sink de email de teste e domínio autorizado. |
| Storage/upload | Fuzz de upload pode validar somente payload sem request. | Upload, leitura/metadata e cleanup em bucket/prefixo de teste. | Bucket/policy/credencial limitada e retenção/limpeza aprovadas. |
| Mockup/IA | Há teste que pode pular happy path por chave/custo. | Canário barato que confirme provider e contrato de resposta. | Key sandbox, limite de custo e aprovação do fornecedor/dono. |
| Catálogo externo | Endpoints de bridge aparecem em carga, sem provar catálogo externo real. | Consulta canário read-only, contrato e timeout controlado. | Credencial/tenant de sandbox e autorização do fornecedor. |
| Callback V4 | Workflow específico já rejeita segredos essenciais ausentes. | Definir alvo não produtivo e asserção de recebimento/idempotência ponta a ponta. | URL callback de staging, segredo e usuário/fixture de teste. |

## Execução do lote 1 — checks de segurança live (concluída localmente)

Foi introduzido `scripts/check-result-contract.mjs`, que normaliza os status
`passed`, `failed`, `inconclusive`, `static-pass` e `dry-run-pass`. Sem
pré-requisito live, o modo advisory/local usa `static-pass`; em
`--require-live` (ou `REQUIRE_LIVE=1`) a mesma ausência vira `inconclusive`
com `exit 2`. Erros de rede/HTTP/payload já são `inconclusive` em qualquer
modo. O contrato escreve também no `GITHUB_STEP_SUMMARY` quando essa variável é
fornecida, sem expor URL ou credencial.

Os dois checks de RPC foram reescritos para não usar “confirmado via MCP na
migration” como evidência de runtime. Foram adicionados seis cenários herméticos
com servidor HTTP local: credencial ausente, HTTP inacessível, grants válidos,
audit indisponível, confirmação de existência após 404 e RPC comprovadamente
ausente. Os três lint gates e o check de ACL receberam contratos equivalentes
para credencial ausente; seus fluxos de erro agora preservam `inconclusive` e
não imprimem corpo remoto ou URL não mascarada. Nenhum teste chama Supabase ou
qualquer serviço externo.

## Plano mínimo dos lotes seguintes

1. Estender a convenção já introduzida com `mode`, alvo mascarado, contagem de requests, `tests_executed` e `tests_skipped` para scripts que realmente executam HTTP.
2. Renomear comandos atuais para deixar claro `static`, `dry-run`, `advisory` e `live`; não mudar a semântica de nenhum script sem atualizar o workflow consumidor.
3. Adicionar preflight único para checks live: segredo presente, URL válida, ref allowlisted, ambiente não produtivo e conta/fixture requerida disponível.
4. Fazer o job agregador de cada domínio consumir o resultado estruturado, não apenas `job.result == success`.
5. Estender o lote já aplicado em RPC/ACL/lint para schema, pois esses gates também alegam verificação de estado vivo do banco.
6. Migrar smoke/fuzz/carga para relatórios de execução real e bloquear alvo canônico para caminhos mutantes.
7. Migrar E2E autenticado, preservando suites públicas e mocks como categorias independentes.
8. Só então provisionar e executar os smokes da etapa 92 em staging, um domínio por vez, com registro de custo, impacto e cleanup.

## Padrões positivos já existentes

Os seguintes caminhos demonstram que o repositório já possui o comportamento mais seguro para checks que realmente devem ser obrigatórios:

- `scripts/check-supabase-linter.mjs` falha quando token/ref essenciais estão ausentes (a exceção 404 continua sendo item deste inventário).
- `.github/workflows/e2e-customization-collapse.yml` valida secrets obrigatórios antes de executar seu cenário.
- `.github/workflows/e2e-crm-callback-approved.yml` falha explicitamente quando o segredo de callback ou contas admin estão ausentes.
- `.github/workflows/deploy-gates.yml` chama `check-restore-seller-cart-rpc.mjs` com `STRICT=1`.
- Os checks estáticos locais continuam úteis; o ajuste proposto não os remove, apenas impede que sejam confundidos com prova remota.

## Evidência e validação realizada

Foi usada consulta Graphify para localizar relações entre CI, scripts e smokes, seguida de validação direta no código. Os comandos abaixo foram executados de forma local/read-only; nos testes com `env -i`, a ausência deliberada das variáveis fez os ramos de skip serem escolhidos antes de qualquer `fetch`.

```bash
env -i PATH="$PATH" node scripts/check-security-definer-acl.mjs --baseline .security-definer-acl-baseline.json
env -i PATH="$PATH" node scripts/check-lint-0011-drift.mjs
env -i PATH="$PATH" node scripts/check-lint-0029-drift.mjs
env -i PATH="$PATH" node scripts/check-secdef-anon-drift.mjs
env -i PATH="$PATH" node scripts/check-restore-seller-cart-rpc.mjs
env -i PATH="$PATH" node scripts/smoke-tests.mjs
env -i PATH="$PATH" node scripts/fuzz-testing.mjs
env -i PATH="$PATH" node scripts/fuzz-edge-uploads.mjs
env -i PATH="$PATH" node scripts/massive-load-test.mjs
env -i PATH="$PATH" node scripts/stress-burst.mjs
```

Todos os comandos acima encerraram com código `0` sem credenciais. Em especial, o fuzz geral informou 920 payloads processados em dry-run e o fuzz de upload informou 134 passes, sem evidência de HTTP. Isso confirma o problema de semântica; não é uma inferência baseada apenas em comentários.

Também foram usados `rg`/leitura direta dos scripts e workflows citados. A busca por fallback de URL canônica encontrou 33 workflows; a busca por `requireAuth(` encontrou 172 arquivos sob `e2e/`. Esses números são inventário de superfície, não prova de que todos os workflows sejam mutantes ou que todos os specs sejam pulados em todo run.

## Consequência de não agir

Sem esta separação, um painel de CI pode mostrar todos os checks verdes enquanto faltam exatamente as credenciais ou o ambiente necessários para validar banco vivo, permissões, disponibilidade, autenticação ou integrações externas. O risco não é apenas cobertura incompleta: é tomar uma decisão de merge/deploy com evidência que não foi produzida.
