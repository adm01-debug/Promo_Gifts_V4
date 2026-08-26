# ADR — contrato canônico do `webhook-inbound`

- **Data da auditoria:** 2026-08-26
- **Status:** PROPOSTO — aguardando decisões D1–D7 e autorização de implantação
- **Escopo do plano:** etapas 36–38
- **Sistema:** Promo Gifts V4 / Supabase `doufsxqlfjyuvxuezpln`
- **Natureza desta entrega:** documentação e teste local de caracterização; nenhuma alteração em produção

## 1. Decisão executiva

O contrato executado hoje **não é o contrato descrito pelos schemas, pela tela administrativa, pelas migrations nem pelos testes**. Há quatro definições concorrentes e incompatíveis:

1. o handler atual usa um segredo HMAC global, ignora `slug`, ignora V1/V2 e tenta gravar em `webhook_events`;
2. o domínio administrativo cria endpoints por `slug`, com segredo por endpoint, e exibe a URL `?slug=...`;
3. o schema compartilhado define V2 strict como padrão e V1 passthrough depreciado;
4. os testes existentes em Vitest simulam respostas e descrevem um contrato que o handler real não executa.

A consulta somente leitura ao catálogo do banco canônico confirmou que `public.webhook_events` **não existe** e que o destino estrutural disponível é `public.inbound_webhook_events`. Portanto, com o flag V1 live desabilitado, uma chamada externa com HMAC válido chega a uma tentativa de escrita em tabela inexistente e tende a retornar 500. Se o flag for habilitado, o ramo V1 retorna sucesso sem persistir ou processar o evento.

O caminho recomendado é restaurar semanticamente o contrato por endpoint que já existiu no histórico, preservando as correções posteriores de autenticação e mudando duas decisões antigas perigosas: assinatura inválida não deve ser persistida e não se deve responder `queued: true` sem consumidor/fila. **Não é seguro simplesmente recuperar uma versão histórica inteira.**

Até as decisões ao final deste ADR serem aprovadas, o handler de produção não foi alterado.

## 2. Limites e método da auditoria

Foram usados somente meios sem mutação:

- leitura do handler, contratos compartilhados, migrations, componentes e todos os conjuntos de testes relacionados;
- busca estrutural do repositório com o grafo Graphify existente, seguida de validação manual nos arquivos-fonte;
- inspeção do histórico Git, sem checkout, reset, merge ou commit;
- consultas `pg_catalog`/SQL somente leitura pelo MCP do Supabase de produção;
- teste local do callback real, com `Deno.serve` interceptado e `fetch` Supabase substituído por stub determinístico local.

Não houve deploy, rotação/leitura de valor de segredo, DDL, migration, alteração de tabela, chamada de função mutante, inserção, atualização ou exclusão no banco. Nomes e valores sensíveis não são reproduzidos aqui.

## 3. Fontes de verdade encontradas

| Camada | Evidência | Contrato que ela expressa |
|---|---|---|
| Handler atual | `supabase/functions/webhook-inbound/index.ts:73-235` | HMAC global; header `x-webhook-signature`; sem `slug`; sem parsing de contrato; destino `webhook_events` |
| Config da Edge Function | `supabase/config.toml:18-19` | endpoint público no gateway (`verify_jwt = false`) |
| Schema compartilhado | `supabase/functions/_shared/contracts/schemas/webhook-inbound.ts:20-60` | V1 `any`; V2 strict; V2 default; V1 sunset em 2026-06-30 |
| Negociação compartilhada | `supabase/functions/_shared/contracts/versioning.ts:59-118` | `accept-version`, depois `?v=`, depois default; versão inválida retorna 406 |
| Parser compartilhado | `supabase/functions/_shared/contracts/parse.ts:71-161` | body vazio/JSON inválido/schema inválido recebem respostas padronizadas |
| UI administrativa | `src/components/admin/connections/WebhooksTab.tsx:57-68,102-124` | endpoint por `slug`; `hmac_secret_ref` por endpoint; URL `?slug=<slug>` |
| Gerenciador de segredos | `supabase/functions/secrets-manager/index.ts:35-41` | prefixo `INBOUND_WEBHOOK_HMAC_` permitido |
| Migration-base | `supabase/migrations/20260419130037_5f01e5dd-e3d5-4d26-8a08-328d432a05aa.sql:121-193` | tabelas `inbound_webhook_endpoints` e `inbound_webhook_events` |
| Migration de idempotência | `supabase/migrations/20260526141615_52d285ed-e141-4437-9a13-0fec9285c93c.sql:16-24` | chave opcional e unicidade parcial por endpoint |
| RPC de métricas | `supabase/migrations/20260526141659_5cd6e346-f106-4e21-b2b7-171d86b581b6.sql:9-28` | argumentos `(p_endpoint_id uuid, p_is_invalid boolean)` |
| Histórico do handler | commit `244503200` | já implementava `slug`, V1/V2, segredo por endpoint, destino correto e idempotência |
| Regressão histórica | commit `bd7e2acfa` | removeu 365 linhas do contrato ao reaplicar uma correção pontual de bearer token |
| Banco live, somente leitura | snapshot desta auditoria | destino real é `inbound_webhook_events`; `webhook_events` não existe |

## 4. Contrato efetivamente executado hoje (`as-is`)

### 4.1 Sequência real

1. `OPTIONS` retorna antes de autenticação e de qualquer acesso ao banco.
2. Toda chamada não marcada como interna passa por `runBotProtection`.
3. O bypass interno exige simultaneamente `X-Internal-Call: true` e bearer exatamente igual à service role (`index.ts:78-102`). A correção contra substring está ativa.
4. Métodos diferentes de `POST` recebem 405 (`index.ts:104-109`).
5. O body cru é lido uma vez (`index.ts:111-120`).
6. Para chamadas externas, `WEBHOOK_INBOUND_SIGNING_SECRET` vazio causa 503; assinatura ausente/incorreta causa 401 (`index.ts:122-143`).
7. Só `x-webhook-signature` é considerado. O prefixo `sha256=` é opcional e case-insensitive; o hex também é comparado sem diferenciar caixa (`index.ts:46-71,133-136`).
8. O JSON é parseado sem o schema compartilhado. `null`, array, string, boolean e número viram silenciosamente `{}`, produzindo `source = custom` e `event = unknown` (`index.ts:145-162`).
9. O handler consulta `WEBHOOK_INBOUND_V1_COMPAT_ENABLED` em `integration_credentials` (`index.ts:170-177`).
10. Com o flag diferente de `true`, tenta inserir em `webhook_events` e chama a RPC com argumentos inexistentes `p_source`/`p_event` (`index.ts:179-204`).
11. Com o flag igual a `true`, verifica uma allowlist pelo campo `source`, mas retorna `compat_v1: true` sem persistência e sem processamento (`index.ts:212-234`).

### 4.2 O que o handler atual não faz

- não exige, lê ou valida o `slug`;
- não consulta `inbound_webhook_endpoints` nem `is_active`;
- não resolve `hmac_secret_ref` por endpoint;
- não usa `allowed_ips` nem `allowed_events`;
- não negocia `accept-version`/`?v=`;
- não chama `parseContract` nem valida V2;
- não preenche `contract_version`;
- não resolve nem grava `idempotency_key`;
- não usa a unicidade parcial para corrida idempotente;
- não grava `endpoint_id`, `headers`, `ip_address`, `signature_valid` ou `error_message`;
- não possui consumidor/dispatcher para justificar `queued: true` ou `processed = false`;
- não usa a resolução canônica de credenciais em `_shared/credentials.ts`.

### 4.3 Contradição interna no próprio arquivo

O comentário em `index.ts:27-30` ainda descreve fail-open quando o segredo global não está configurado. O código em `index.ts:122-131` é fail-closed e retorna 503. O comportamento comprovado pelo teste local é o do código, não o do comentário.

## 5. Snapshot estrutural live, somente leitura

O snapshot abaixo foi obtido em 2026-08-26 no projeto canônico. Ele descreve o estado observado; não autoriza nem executa alteração.

### 5.1 `public.inbound_webhook_endpoints`

- existe, tem RLS habilitada e 17 colunas;
- identidade: `id uuid` PK e `slug text NOT NULL` único;
- configuração: `name`, `description`, `source_system`, `hmac_secret_ref`, `secret_key`, `is_active`, `allowed_ips`, `allowed_events`, `metadata`;
- auditoria/estatísticas: `created_by`, `created_at`, `updated_at`, `last_received_at`, `total_received`, `total_invalid`;
- FK `created_by -> auth.users`;
- trigger de `updated_at`;
- policy administrativa `ALL`;
- 2 endpoints observados, ambos ativos e ambos com referência HMAC preenchida; são endpoints de teste conhecidos, não prova de emissor produtivo ativo.

### 5.2 `public.inbound_webhook_events`

- existe, tem RLS habilitada e 13 colunas;
- `id uuid` PK;
- `endpoint_id uuid` com FK para endpoints e `ON DELETE CASCADE`;
- `event_type text NOT NULL` e `payload jsonb NOT NULL`;
- `headers jsonb`, `ip_address text`, `signature_valid boolean`;
- `processed boolean NOT NULL DEFAULT false`, `processed_at`, `error_message`;
- `created_at`, `contract_version text NOT NULL DEFAULT '1'`, `idempotency_key text`;
- índice único parcial `(endpoint_id, idempotency_key) WHERE idempotency_key IS NOT NULL`;
- policies administrativas de `SELECT` e `DELETE`;
- 57 eventos observados: todos marcados com assinatura inválida, versão `1`, sem idempotency key, não processados e ligados a endpoint;
- os 57 registros vieram de carga de teste documentada pela migration `20260522145830_wave_3_3_c_3_oficial_migrar_57_events_hmac_invalid.sql`, portanto não constituem evidência de tráfego real.

### 5.3 Funções, privilégios e retenção relacionados

- `increment_webhook_stats(uuid, boolean)` existe, é `SECURITY DEFINER` e executável apenas por papéis privilegiados; o handler chama nomes de argumentos errados.
- `cleanup_webhook_logs()` existe, mas sua definição live usa `inbound_webhook_events.received_at`; a coluna live é `created_at`. A função falharia ao alcançar esse `DELETE`.
- não foi encontrado cron ativo de limpeza dos eventos inbound.
- todos os 57 eventos estavam além da janela de 90 dias pretendida, coerente com retenção não executada.
- não existe `public.webhook_events`.

A correção da função de retenção ou do cron é mudança de banco e permanece fora deste ADR operacional, marcada como **`[AUTORIZAÇÃO BD]`**.

## 6. Gaps e falhas confirmadas

| ID | Severidade | Falha | Evidência | Efeito provável |
|---|---|---|---|---|
| WHI-01 | P0 funcional | destino `webhook_events` não existe live | `index.ts:181-190` + catálogo live | HMAC válido termina em 500 quando compat V1 está false |
| WHI-02 | P0 funcional | ramo compat retorna sucesso sem gravar/processar | `index.ts:212-234` | perda silenciosa de evento quando o flag está true |
| WHI-03 | P1 contrato | `slug` e endpoint são ignorados | handler vs `WebhooksTab.tsx:102-124` | toda configuração por endpoint fica desligada |
| WHI-04 | P1 autenticação | segredo global substitui segredo por endpoint | `index.ts:125-136` + `hmac_secret_ref` live | isolamento entre emissores não existe |
| WHI-05 | P1 contrato | V1/V2 e schema compartilhado não são usados | ausência de imports/chamada | V2 default/strict é apenas documental |
| WHI-06 | P1 integridade | idempotência não é usada | handler vs índice live | retries podem duplicar eventos após correção do destino |
| WHI-07 | P1 observabilidade | RPC recebe nomes de parâmetros errados | `index.ts:200-204` | estatísticas não são atualizadas; erro é só warning |
| WHI-08 | P1 semântica | resposta afirma `queued: true` sem fila/worker identificado | busca de consumidores + `index.ts:206-209` | cliente recebe garantia inexistente |
| WHI-09 | P1 validação | primitivos/arrays/null viram evento `unknown` | `index.ts:145-162` | lixo aceito e normalizado, se a escrita voltar a funcionar |
| WHI-10 | P1 autorização | `allowed_ips` e `allowed_events` são configuração morta | colunas live sem uso no handler | restrições administrativas não são aplicadas |
| WHI-11 | P1 CORS | headers HMAC/versionamento/idempotência não estão na allowlist comum | `_shared/cors.ts:44-55` | emissores browser não passam preflight; teste descreve outra allowlist |
| WHI-12 | P1 retenção | função usa coluna inexistente e cron não está ativo | catálogo live + migration de 90 dias | dados antigos não são removidos |
| WHI-13 | P1 UI | painel consulta `source_ip`, `received_at`, `error` | `InboundEventsPanel.tsx:59-109` | consulta diverge de `ip_address`, `created_at`, `error_message` live |
| WHI-14 | P2 origem | `source` vem do body não autenticado como identidade do endpoint | `index.ts:161` | emissor pode atribuir a si mesmo outra origem |
| WHI-15 | P2 documentação | comentário declara fail-open; código é fail-closed | `index.ts:27-30,122-131` | operação e testes podem assumir comportamento errado |

WHI-13 pertence à UI e só deve ser corrigido pelo owner desse módulo. WHI-12 exige autorização explícita de banco. Nenhum deles foi alterado nesta etapa.

## 7. Por que isso é uma regressão, não ausência original

O commit `244503200` (`fix(webhook-inbound): refactor híbrido v1/v2 + idempotência + migrations seguras`) continha um handler de 405 linhas que:

- buscava endpoint ativo pelo `slug`;
- usava `parseContract` e `WebhookInboundSchemas`;
- resolvia segredo por `hmac_secret_ref`;
- persistia em `inbound_webhook_events` com as colunas atuais;
- gravava `contract_version` e `idempotency_key`;
- tratava duplicidade prévia e corrida `23505`;
- chamava `increment_webhook_stats` com os argumentos corretos.

Seis horas depois, `bd7e2acfa` reaplicou BUG-A07 — uma correção pontual de comparação exata do bearer — mas substituiu o handler e removeu 365 linhas. O código posterior preservou a correção do bearer e adicionou HMAC global fail-closed, sem restaurar o domínio por endpoint.

O handler histórico é evidência da intenção estrutural, não um patch pronto. Ele também tinha problemas que não devem voltar:

- aceitava `authHeader.includes(serviceKey)`;
- persistia tentativas com assinatura inválida antes de responder 401;
- derivava idempotência antes de validar HMAC;
- permitia regras V1 vencidas;
- marcava `processed` sem uma semântica formal;
- lia credencial diretamente, em vez do helper canônico atual.

## 8. Contrato canônico proposto (`to-be`)

Os termos **DEVE**, **NÃO DEVE** e **PODE** abaixo são normativos, mas só passam de proposta para decisão após aprovação D1–D7.

### 8.1 Rota e identidade

- Rota: `POST /functions/v1/webhook-inbound?slug=<slug>`.
- `slug` ausente ou vazio DEVE retornar 400.
- `slug` desconhecido ou endpoint inativo DEVE retornar 404, sem indicar existência de segredo.
- O endpoint DEVE buscar `inbound_webhook_endpoints` por `slug` e `is_active = true`.
- A origem confiável DEVE vir de `endpoint.source_system`, nunca de `payload.source`.
- `allowed_ips`, quando não vazio, DEVE ser aplicado ao IP já normalizado pela infraestrutura confiável. Não se deve confiar cegamente em qualquer `x-forwarded-for` fornecido pelo cliente.
- `allowed_events`: lista vazia significa “todos”; lista preenchida DEVE bloquear evento fora dela.

### 8.2 HMAC comum a V1 e V2

- HMAC DEVE ser validado sobre os bytes exatos do body cru, antes de parsear/persistir.
- Algoritmo: HMAC-SHA256.
- Formato canônico: `x-webhook-signature: sha256=<64 hex>`.
- Comparação DEVE ser constante e não diferenciar caixa no hex/prefixo.
- Segredo DEVE ser resolvido a partir de `endpoint.hmac_secret_ref` pelo helper canônico `getCredential`/`resolveCredential`, com acesso service role já criado.
- Ausência do segredo referenciado DEVE retornar 503 e não persistir.
- Assinatura ausente, malformada, conflitante ou incorreta DEVE retornar 401 e não persistir evento.
- Para transição, o handler PODE aceitar `x-signature-256` e `x-hub-signature-256`; se mais de um header estiver presente com valores diferentes, DEVE rejeitar.
- `WEBHOOK_INBOUND_SIGNING_SECRET` global só PODE ser mantido como compatibilidade temporária se Operações confirmar emissor real dependente. Não deve haver fallback global silencioso entre endpoints.
- O bypass interno permanece restrito à conjunção `X-Internal-Call: true` + bearer exatamente igual à service role. Esse caminho NÃO DEVE aparecer em documentação externa.

### 8.3 Versionamento e payload

- Negociação DEVE reutilizar `parseContract`: `accept-version` > `?v=` > default.
- Default proposto: V2.
- V2 DEVE ser o schema strict já existente:

```json
{
  "event": "order.created",
  "occurred_at": "2026-08-26T12:00:00.000Z",
  "data": {},
  "idempotency_key": "00000000-0000-4000-8000-000000000001"
}
```

- Em V2, `event` é slug-like (1–150), `occurred_at` é datetime ISO, `data` é objeto e `idempotency_key` é UUID opcional; campos extras são rejeitados.
- V1 tem sunset documental em 2026-06-30, data já vencida. Deve ficar bloqueado por padrão.
- Compatibilidade V1, se aprovada, exige simultaneamente flag explícito e allowlist por endpoint/issuer, retorna headers de depreciação e deve ter nova data final.
- V1 não deve transformar primitivos/arrays/null em `{}`. A decisão D3 define se V1 aceita qualquer JSON ou pelo menos objeto não vazio.
- Versão não suportada retorna 406. JSON inválido retorna 400. Falha de schema retorna o status padronizado de `parseContract` (hoje 422).
- Em V2, `event_type` vem de `payload.event`. Em V1, a precedência proposta é `x-event` e depois campo `event`; conflito explícito deve ser rejeitado, não resolvido silenciosamente.

### 8.4 Idempotência

- Chave explícita: `x-idempotency-key` ou `payload.idempotency_key`.
- Se header e payload vierem juntos e forem diferentes, a requisição DEVE ser rejeitada com 400.
- Para compatibilidade com emissores sem chave, a assinatura HMAC normalizada PODE ser fallback (`sig:<hex>`), o que torna replay byte-idêntico idempotente.
- A busca/insert usa o escopo `(endpoint_id, idempotency_key)`.
- O índice único parcial live é a garantia atômica; erro Postgres `23505` deve virar resposta de duplicidade, não 500.
- Duplicata válida retorna 200, `duplicate: true` e o ID original quando disponível; não reexecuta efeitos nem incrementa `total_received` pela segunda vez.
- A janela real de idempotência é limitada pela retenção do evento. Sem retenção funcional, ela é indefinida; depois da limpeza, o mesmo key pode voltar a ser aceito. D7 precisa formalizar isso.
- A checagem de idempotência só ocorre depois de autenticação HMAC e validação mínima, para não criar oracle de IDs/eventos.

### 8.5 Persistência e destino

Destino confirmado: `public.inbound_webhook_events`.

| Coluna live | Valor proposto |
|---|---|
| `endpoint_id` | `endpoint.id` |
| `event_type` | V2 `payload.event`; V1 pela regra aprovada |
| `payload` | envelope validado completo, não apenas `data` |
| `headers` | allowlist sanitizada; nunca `authorization`, assinatura ou segredo |
| `ip_address` | IP confiável normalizado ou `null` |
| `signature_valid` | sempre `true`, pois inválidos não persistem |
| `processed` | depende de D5/D6; ver abaixo |
| `processed_at` | coerente com `processed` |
| `error_message` | `null` na ingestão válida |
| `contract_version` | versão resolvida (`1` ou `2`) |
| `idempotency_key` | chave explícita ou fallback normalizado |

Não existe requisito de schema para corrigir o handler: todas as colunas e o índice necessários já existem live. Mudanças de coluna, tabela, constraint, policy ou índice continuam proibidas sem autorização do PO.

### 8.6 Semântica de processamento e resposta

Não foi encontrado worker/dispatcher que consuma `inbound_webhook_events` e altere `processed`. Portanto, há duas opções coerentes:

- **D5-A, recomendada enquanto não existe consumidor:** “processed” significa ingestão concluída; inserir `processed = true`, `processed_at = now()` e responder `received: true`. Não usar `queued`.
- **D5-B:** “processed” significa efeito de negócio concluído; inserir `false`, responder `queued: true` e, antes do rollout, implementar/identificar o consumidor, retry e dead-letter. Isso amplia muito o escopo.

Resposta recomendada para nova ingestão:

```json
{
  "ok": true,
  "received": true,
  "event_id": "<uuid>",
  "duplicate": false,
  "contract_version": "2"
}
```

## 9. Ordem segura do fluxo proposto

1. preflight CORS;
2. método permitido;
3. request ID/log seguro;
4. rate limit/bot protection;
5. extrair e validar `slug`;
6. buscar endpoint ativo;
7. validar IP permitido, se configurado;
8. ler body cru uma única vez;
9. resolver segredo do endpoint;
10. validar HMAC;
11. negociar versão e parsear contrato;
12. derivar e validar `event_type`/`allowed_events`;
13. resolver idempotency key e conflito header/body;
14. verificar duplicata válida;
15. inserir evento sanitizado;
16. converter corrida `23505` em duplicata 200;
17. chamar `increment_webhook_stats(p_endpoint_id, p_is_invalid=false)`;
18. responder com ID, versão e headers de contrato.

Tentativas inválidas podem incrementar `total_invalid` por RPC depois que o endpoint foi identificado, mas **não** devem criar uma linha em `inbound_webhook_events`.

## 10. Matriz de respostas proposta

| Cenário | Status | Persistência | Observação |
|---|---:|---|---|
| `OPTIONS` | 200 ou 204 | não | headers CORS completos |
| método não permitido | 405 | não | incluir `Allow: POST, OPTIONS` |
| `slug` ausente | 400 | não | `missing_slug` |
| endpoint desconhecido/inativo | 404 | não | `endpoint_not_found` |
| IP fora da allowlist | 403 | não | sem revelar regra interna |
| segredo referenciado ausente | 503 | não | falha operacional, não 401 |
| assinatura ausente/inválida/conflitante | 401 | não | pode incrementar contador inválido |
| body vazio/JSON inválido | 400 | não | envelope padronizado |
| versão não suportada | 406 | não | listar versões suportadas |
| V1 bloqueado após sunset | 426 | não | deprecation/migração |
| schema V2 inválido | 422 | não | campos normalizados por `parseContract` |
| evento fora de `allowed_events` | 403 ou 422 | não | decisão D4 |
| idempotency keys conflitantes | 400 | não | não escolher uma silenciosamente |
| duplicata | 200 | não novamente | `duplicate: true` |
| evento novo válido | 200 ou 201 | uma linha | decisão D6 |
| falha de persistência | 500 | não confirmado | request ID; sem detalhe DB ao cliente |

## 11. Simulação de cenários e gaps de rollout

| Cenário simulado | Falha/gap previsto | Mitigação exigida antes de rollout |
|---|---|---|
| emissor atual usa segredo global | troca direta para segredo por slug gera 401/503 | confirmar telemetria/emissores; janela explícita de compatibilidade ou provisionar segredo por endpoint |
| emissor usa `x-signature-256` | header canônico único quebra integração | aceitar aliases temporários e medir qual header foi usado |
| dois headers HMAC divergem | ambiguidade permite downgrade/erro operacional | rejeitar conflito com 401 |
| body é reserializado antes de verificar | HMAC legítimo falha | ler body cru uma vez e passar `prereadBody` ao parser |
| retry simultâneo | duas consultas “não encontrou” e dois inserts | índice parcial + tratamento de `23505` |
| header e body têm keys diferentes | deduplicação inconsistente | retornar 400 |
| V1 sem `event` | `event_type NOT NULL` falha ou vira `unknown` | definir requisito mínimo V1 em D3 |
| flag V1 true e allowlist malformada | `JSON.parse` atual lança erro | parser defensivo/credencial estruturada; fail-closed |
| `allowed_ips` usa header forjado | atacante declara IP permitido | usar apenas cadeia de proxy confiável fornecida pela plataforma |
| nenhum worker consome evento | backlog eterno com resposta `queued` | escolher D5-A ou entregar worker antes de D5-B |
| retenção remove evento | mesma key volta a ser válida após 90 dias | documentar janela de replay/idempotência |
| retenção continua quebrada | crescimento sem limite e keys eternas | correção/cron separados com `[AUTORIZAÇÃO BD]` |
| painel admin usa colunas antigas | backend corrige mas operador não vê eventos | owner da UI corrige mapeamento em tarefa separada |
| erro DB é devolvido integralmente | exposição de detalhes internos | corpo público estável + detalhe somente em log estruturado |
| stats RPC falha depois do insert | evento existe, contador diverge | warning com request/event ID e reconciliação periódica opcional |

## 12. Auditoria dos testes

### 12.1 Testes que parecem integração, mas não exercitam o handler

`tests/edge-functions/integration/webhook-inbound.test.ts` programa `mockEdgeFunctionFetch` antes de cada chamada. Seus cenários validam apenas a resposta que o próprio teste configurou. Eles não importam nem executam `supabase/functions/webhook-inbound/index.ts`.

Problemas concretos nesse arquivo:

- `VALID_V2_PAYLOAD.idempotency_key = "idem-key-001"` (`:11-16`) viola o schema UUID real;
- espera `x-signature-256`, enquanto o handler atual só lê `x-webhook-signature`;
- descreve `slug`, V1/V2, idempotência e CORS sem implementar ou observar esses comportamentos;
- ausência de `slug` aceita 400 **ou** 401 (`:137-146`), o que enfraquece o contrato.

Os testes Vitest de contrato continuam úteis para schemas e envelopes, mas não são prova do handler.

### 12.2 Teste Deno HMAC legado também não mede HMAC externo

`supabase/functions/tests/integration/edge/webhook-inbound/hmac_test.ts` chama `invokeFunction`. O helper em `supabase/functions/tests/integration/edge/_shared.ts:17-28` sempre injeta service role exata e `X-Internal-Call: true`. Isso ativa o bypass do handler, inclusive quando o teste fornece `X-Hub-Signature-256`. Assim, os casos rotulados “HMAC inválido” não exercitam a verificação externa.

### 12.3 Teste remoto avulso é mutante e está defasado

`supabase/functions/webhook-inbound/integration_test.ts` cria/exclui endpoint no banco remoto e por isso não foi executado nesta auditoria. Além disso:

- usa `active`, mas o live expõe `is_active`;
- não preenche todos os campos requeridos observados;
- usa `x-signature-256`;
- o payload não satisfaz V2 strict;
- espera persistência tanto da assinatura válida quanto da inválida (`:76-85`), contrariando o gate da etapa 36.

Ele deve ser substituído por fixture local/ambiente efêmero antes de entrar em CI; não deve apontar para produção.

### 12.4 Caracterização handler-real adicionada

Foi criado `supabase/functions/webhook-inbound/handler_characterization_test.ts`. O teste:

- intercepta somente o registro de `Deno.serve` e chama o callback real do `index.ts`;
- substitui `fetch` por stub Supabase local, sem rede e sem banco;
- comprova preflight sem acesso ao banco;
- comprova 503 fail-closed sem segredo global;
- comprova 401 e zero tentativa de persistência para HMAC errado;
- comprova HMAC sobre body cru e compatibilidade de caixa no prefixo/hex;
- comprova bypass somente com bearer exato + header interno;
- comprova que token contendo a service role como substring não passa;
- comprova que JSON inválido não chega à persistência.

Ele deliberadamente **não fixa em assertions** os comportamentos quebrados de `slug`, V1/V2, destino, RPC e idempotência. Fixar essas regressões em um teste de caracterização tornaria a correção futura artificialmente incompatível.

## 13. Evidência de verificação local

Comandos executados na worktree isolada:

```text
deno fmt --check supabase/functions/webhook-inbound/handler_characterization_test.ts
deno check --config supabase/functions/deno.json supabase/functions/webhook-inbound/handler_characterization_test.ts
deno test --cached-only --allow-env --config supabase/functions/deno.json supabase/functions/webhook-inbound/handler_characterization_test.ts
```

Resultado final: 1 teste handler-real aprovado, 0 falhas, sem rede e sem banco.

Também foram executados os conjuntos existentes focados:

```text
node node_modules/vitest/vitest.mjs run \
  tests/contracts/webhooks.contract.test.ts \
  tests/contracts/webhook-scenario-matrix.test.ts \
  tests/edge-functions/integration/webhook-inbound.test.ts \
  --reporter=verbose
```

Resultado: 3 arquivos, 134 testes aprovados. Esse resultado valida os testes simulados/schemas, não o handler real, conforme seção 12.

## 14. Decisões necessárias antes de alterar produção

Marcar uma opção por decisão:

### D1 — Identidade e segredo

- [ ] **D1-A (recomendada):** `slug` obrigatório + segredo por `hmac_secret_ref`; global apenas em janela de compatibilidade explicitamente confirmada.
- [ ] D1-B: manter segredo global e não usar endpoints configurados.

### D2 — Headers HMAC legados

- [ ] **D2-A (recomendada):** canônico `x-webhook-signature`; aceitar temporariamente `x-signature-256` e `x-hub-signature-256`, rejeitando conflito.
- [ ] D2-B: aceitar imediatamente só o header canônico.

### D3 — V1 após o sunset

- [ ] **D3-A (recomendada):** V1 bloqueado por padrão; compat apenas com flag + allowlist e payload no mínimo objeto não vazio.
- [ ] D3-B: V1 continua `z.any()` para allowlist explícita.
- [ ] D3-C: V1 removido imediatamente.

### D4 — Eventos permitidos

- [ ] **D4-A (recomendada):** lista vazia permite todos; lista preenchida retorna 403 para evento não permitido.
- [ ] D4-B: evento não permitido retorna 422.

### D5 — Significado de `processed`

- [ ] **D5-A (recomendada agora):** ingestão concluída; gravar `true`/`processed_at`, responder `received`, sem alegar fila.
- [ ] D5-B: efeito de negócio; gravar `false`, mas somente após identificar/implementar worker, retry e dead-letter.

### D6 — Sucesso de criação

- [ ] **D6-A (recomendada por compatibilidade):** evento novo retorna 200; duplicata retorna 200.
- [ ] D6-B: evento novo retorna 201; duplicata retorna 200.

### D7 — Retenção/idempotência

- [ ] **D7-A (recomendada):** 90 dias; documentar que idempotência tem a mesma janela e abrir tarefa `[AUTORIZAÇÃO BD]` para reparar função/cron.
- [ ] D7-B: outra janela, a especificar, com avaliação de volume/compliance.

## 15. Plano de implementação depois das decisões

### Etapa 36 — cenários e gates

- [x] mapear HMAC atual e aliases concorrentes;
- [x] provar localmente que HMAC inválido não persiste;
- [x] provar fail-closed sem segredo;
- [x] provar bearer exato e rejeição de substring;
- [x] simular falhas de slug, versão, idempotência, destino, worker e retenção;
- [ ] aprovar D1–D7.

### Etapa 37 — ADR/contrato

- [x] inventariar contratos concorrentes;
- [x] reconciliar handler, UI, schemas, migrations, histórico e live;
- [x] propor contrato normativo e matriz de respostas;
- [x] separar correção de código de mudança de banco;
- [ ] promover status deste ADR de PROPOSTO para ACEITO após decisão do PO.

### Etapa 38 — correção e validação

- [ ] corrigir o handler sem restaurar vulnerabilidades históricas;
- [ ] criar testes handler-real separados para slug, V1/V2, aliases, IP/event allowlist, persistência e corrida idempotente;
- [ ] atualizar/remover testes totalmente stubados que se apresentam como integração;
- [ ] alinhar CORS do endpoint sem ampliar a allowlist global desnecessariamente;
- [ ] executar Deno check/test, Vitest focal e gates de segurança;
- [ ] validar em ambiente efêmero/staging com segredo dedicado;
- [ ] obter autorização explícita antes de deploy;
- [ ] abrir separadamente correção do painel UI com o owner;
- [ ] abrir separadamente `[AUTORIZAÇÃO BD]` para retenção/cron, se D7-A for aprovado.

## 16. Critérios de aceite para fechar a etapa 38

- [ ] nenhuma assinatura inválida ou payload inválido cria evento;
- [ ] cada evento válido está ligado ao endpoint correto;
- [ ] segredo de um endpoint não autentica outro endpoint;
- [ ] V2 sem `event`, `occurred_at` ou `data` recebe erro de contrato;
- [ ] V1 segue exatamente a decisão aprovada e emite headers deprecation quando ativo;
- [ ] retry sequencial e concorrente não duplica linha/efeito;
- [ ] destino e nomes de colunas correspondem ao catálogo live;
- [ ] RPC usa `p_endpoint_id`/`p_is_invalid`;
- [ ] resposta não afirma fila inexistente;
- [ ] logs não contêm body, authorization, assinatura nem segredo;
- [ ] testes handler-real rodam sem rede e o teste staging não aponta para produção;
- [ ] qualquer DDL/cron/retention permanece fora do deploy de código sem autorização específica.

## 17. Conclusão

As etapas 36 e 37 estão concluídas no limite seguro de análise, simulação e documentação. A etapa 38 está conscientemente bloqueada nas decisões D1–D7: alterar o handler antes delas poderia quebrar emissores que usem o segredo/header global, consolidar uma semântica falsa de processamento ou reviver a persistência de HMAC inválido.

O fato estrutural mais importante já está resolvido: o destino canônico existente é `public.inbound_webhook_events`, e o domínio do produto já foi desenhado para endpoint/slug/segredo por endpoint. A implementação pode ser feita sem DDL depois da aprovação, com teste local real e rollout controlado.
