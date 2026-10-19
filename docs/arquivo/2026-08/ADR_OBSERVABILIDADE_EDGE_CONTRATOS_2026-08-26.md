# ADR — contratos de observabilidade das Edge Functions `visual-search` e `e2e-cleanup`

- **Data:** 2026-08-26
- **Status:** proposto — requer decisão do PO para qualquer alteração de runtime/deploy
- **Escopo:** apenas os contratos de persistência e observabilidade de `visual-search` e `e2e-cleanup`.
- **Fora do escopo:** DDL, migrations, dados de produção, deploy, mudanças de segurança/autorização e remoção de objetos.

## Decisão em uma frase

Não recriar `system_error_logs` nem `e2e_cleanup_audit` por reflexo. Para uma função que
permaneça no projeto canônico, o único destino de telemetria de Edge Function já presente e
compatível por estrutura é `public.edge_function_invocations`; para `e2e-cleanup`, primeiro
é preciso decidir se ela continua disponível no canônico ou se fica estritamente isolada em
ambiente de teste.

## Método e limites da evidência

Foram inspecionados o código local e o catálogo do projeto canônico
`doufsxqlfjyuvxuezpln`, exclusivamente por consultas `SELECT` em `pg_catalog` (2026-08-26).
Não foi lida nem alterada linha de negócio no banco. Resultados relevantes:

| Evidência | Resultado |
|---|---|
| `pg_class` em todos os schemas | `system_error_logs` e `e2e_cleanup_audit` **não existem**; `audit_log`, `admin_audit_log`, `edge_function_invocations` e `e2e_cleanup_rate_limit` existem em `public`. |
| `pg_class`/`pg_policy` | As três relações existentes têm RLS ativado; `service_role` tem `rolbypassrls = true`. |
| `pg_attribute`, constraints, índices e grants | `edge_function_invocations` possui os campos e índices próprios para telemetria por função; detalhes abaixo. |
| `pg_proc` | `e2e_cleanup_check_rate_limit(text, integer, integer)` existe, é `SECURITY DEFINER`, usa `p_key` e é executável apenas por `service_role`/`postgres`. |
| Código local | `visual-search` tenta escrever em `system_error_logs`; `e2e-cleanup` tenta escrever cinco vezes em `e2e_cleanup_audit`. |

Esta ADR não conclui que uma migration local foi ou não aplicada: a verdade operacional é o
catálogo live. O histórico de migrations serve somente para explicar a intenção e a
incompatibilidade de contratos.

## Estado observado no runtime

### `visual-search`

Em [`supabase/functions/visual-search/index.ts`](../supabase/functions/visual-search/index.ts),
o helper `logToDb` (linhas 99–116) insere em `system_error_logs` os campos `user_id`,
`function_name`, `error_message`, `stack_trace` e `metadata`. Ele é chamado no `catch`
principal (linhas 549–567), depois do `console.error` e antes da resposta de erro.

Como a relação não existe no catálogo, essa escrita não é persistida. Além disso, o helper
não extrai nem verifica o campo `error` retornado por Supabase; portanto, uma falha PostgREST
resolvida como resultado não é necessariamente capturada pelo `catch` interno. O efeito é
que a resposta principal continua sendo devolvida, mas a telemetria de banco pode se perder
silenciosamente.

O caminho de retorno antecipado de credenciais de IA ausentes (503) também não chama
`logToDb`; se o aceite for “toda falha é rastreável”, esse caso deve entrar no teste de
contrato da implementação futura.

### `e2e-cleanup`

Em [`supabase/functions/e2e-cleanup/index.ts`](../supabase/functions/e2e-cleanup/index.ts),
há cinco inserções em `e2e_cleanup_audit`: token inválido, rate limit, allowlist negada,
sucesso e exceção (linhas 76, 102, 114, 161 e 171). A relação não existe no canônico.
Essas operações também não verificam o `error` retornado, portanto a ausência não impede a
resposta HTTP, mas elimina o registro esperado.

Há um segundo desvio independente do log: o handler chama a RPC com `p_ip` (linhas 94–99),
mas a assinatura vigente no catálogo é `e2e_cleanup_check_rate_limit(p_key text, p_max int,
p_window_seconds int)`. Como `rlResult.error` não é tratado, uma falha de RPC pode deixar a
proteção sem uma decisão explícita de falhar fechada ou aberta. Isto deve ter teste de
caracterização antes de qualquer correção; não é justificativa para mexer no schema.

## Classificação: intenção documentada versus perda de contrato

| Objeto | Classificação | Evidência | Consequência |
|---|---|---|---|
| `public.e2e_cleanup_audit` | **Ausência intencional no canônico, mas dependência de código residual.** | A migration `20260522160000_align_wave_3_5_5_drift_allowlist.sql` classifica-a como “Audit de testes E2E no Lovable Cloud”. | Não restaurar a tabela sem decisão de produto/ambiente; remover ou redirecionar a dependência do handler. |
| `public.system_error_logs` | **Contrato runtime quebrado / drift a reconciliar.** | A migration local `20260527121746_…` tenta criá-la, não há allowlist equivalente e há caller executável em `visual-search`; `pg_class` live não a contém. | Não criar a tabela por inferência; adotar um canal existente ou obter aprovação para novo contrato. |
| `public.edge_function_invocations` | **Contrato canônico existente, sem uso comprovado pelos dois callers.** | Tabela live, RLS/policies/grants, índices por slug e usuário, FK para `auth.users`, e função live de retenção. | Candidato preferencial para telemetria genérica de Edge Function. |
| `public.audit_log` | **Não compatível para erros genéricos.** | `entity_id uuid NOT NULL`; `CHECK (action IN ('INSERT','UPDATE','DELETE'))`; FK opcional para `profiles`. | Não usar como substituto de `system_error_logs`. |
| `public.admin_audit_log` | **Não compatível para erros anônimos/técnicos por padrão.** | `user_id uuid NOT NULL`, embora aceite `details`, `request_id`, duração e status. | Reservar para auditoria de ações administrativas com ator conhecido; não sobrecarregar como erro técnico de Edge. |

## Contrato canônico candidato: `edge_function_invocations`

O catálogo live informa:

| Campo | Tipo/regra | Uso proposto para estes dois handlers |
|---|---|---|
| `function_slug` | `text NOT NULL`; índice `(function_slug, invoked_at DESC)` | `visual-search` ou `e2e-cleanup` |
| `invoked_by` | `uuid`, nullable; FK `auth.users(id) ON DELETE SET NULL` | ID autenticado quando realmente disponível; `NULL` para token compartilhado/erro pré-auth. Nunca usar o usuário-alvo da limpeza como se fosse o ator. |
| `invoked_at` | `timestamptz NOT NULL DEFAULT now()` | Horário do evento. |
| `request_method` | `text`, nullable | Método HTTP. |
| `request_metadata` | `jsonb`, nullable | Somente metadados redigidos: `request_id`, etapa, provider, resultado, `dry_run` e contagens agregadas. Nunca corpo/base64, token, API key, e-mail bruto ou stack completo. `e2e-cleanup` hoje não cria request ID, portanto o adaptador precisará gerá-lo ou propagá-lo. |
| `status_code` | `integer`, nullable | Status HTTP final. |
| `duration_ms` | `integer`, nullable | Duração total medida pelo handler. |
| `error_message` | `text`, nullable | Mensagem truncada e sem segredo. |
| `ip_address` / `user_agent` | `inet` / `text`, nullable | IP e UA somente quando necessários ao contrato de operação. O fallback atual de E2E é a string `"unknown"`, que **não** cabe em `inet`; convertê-lo para `NULL` antes de inserir. |

RLS está ativado. As policies permitem `INSERT` autenticado sob condição de `invoked_by`,
`SELECT` para coordenação ou acima e `DELETE` apenas para dev. O papel `service_role` possui
grant de inserção e bypass de RLS, que é exatamente o cliente já usado pelos dois handlers.
Não há trigger live nessa tabela. A função live `purge_edge_invocations_old()` remove entradas
com `invoked_at` superior a 90 dias; qualquer implementação deve respeitar esse horizonte de
retenção, em vez de tratá-la como arquivo forense permanente.

> Atenção de manutenção: existe um script local de retenção que referencia `created_at` para
> essa relação, mas a coluna live é `invoked_at`. A implementação e qualquer validação futura
> devem usar o contrato live, não esse fragmento histórico.

## Opções e decisão proposta

### D1 — `visual-search`

| Opção | Benefício | Risco/custo | Situação |
|---|---|---|---|
| A. Recriar `system_error_logs` | Replica o formato antigo. | É DDL não autorizado e duplica telemetria; não prova que seja o destino canônico. | Rejeitada nesta ADR. |
| B. Usar `audit_log` ou `admin_audit_log` | Reaproveita tabelas existentes. | Viola os constraints/semântica acima, em especial erros sem entidade ou ator administrativo. | Rejeitada. |
| C. Usar `edge_function_invocations` com um helper fail-soft e testado | Não exige schema; preserva slug, request ID, status, duração e causa. | Retenção de 90 dias; exige redigir metadados e validar falha do próprio log. | **Recomendada, pendente de aprovação/implementação.** |
| D. Somente `console.error` | Zero escrita no banco. | Não atende ao aceite de rastrear função + request ID + causa no banco. | Apenas fallback temporário. |

**Decisão proposta D1:** substituir somente o helper de persistência de erro por um adaptador
para `edge_function_invocations`. O adaptador deve ser não bloqueante, inspecionar o retorno
`{ error }`, emitir `console.error` correlacionado se a telemetria falhar e nunca mudar a
resposta de negócio. Inicialmente registrar apenas resultados de erro; registrar todas as
invocações é uma decisão de volume/retenção separada.

### D2 — `e2e-cleanup`

| Opção | Benefício | Risco/custo | Situação |
|---|---|---|---|
| A. Recriar `e2e_cleanup_audit` a partir da migration histórica | Mantém uma tabela dedicada. | DDL não autorizado; contradiz a allowlist de infraestrutura Lovable; a schema histórica não aceita o payload/status atual. | Rejeitada. |
| B. Isolar a função fora do canônico (ambiente de teste) e remover sua dependência de log de banco | Coerente com a intenção documentada de “testes Lovable”; nenhum objeto fantasma em produção. | Alteração de operação/deploy e política de acesso; exige decisão do PO. | **Preferível se a função não precisa existir em produção.** |
| C. Se a função permanecer no canônico, registrar eventos mínimos em `edge_function_invocations` | Elimina a relação fantasma sem DDL e deixa tentativa/sucesso/falha pesquisáveis. | O handler executa limpeza; metadados precisam evitar PII e a identidade do ator pode ser nula. | **Alternativa recomendada se B não for escolhida.** |

**Decisão proposta D2:** não restaurar `e2e_cleanup_audit`. O PO deve escolher B ou C. Em
ambas, corrigir e caracterizar a chamada da RPC de rate limit como trabalho separado e
reversível; não misturá-la com uma migration de observabilidade.

## Por que a tabela histórica de E2E não pode ser restaurada cegamente

A migration local original define, entre outros, `email text NOT NULL`, status limitado a
`ok`, `error`, `rate_limited`, `unauthorized`, `forbidden`, `not_found` e `invalid`, além de
`duration_ms` e `deleted_by_table`. Já o handler atual tenta gravar:

- `auth_failed` e `success`, que não pertencem ao `CHECK` histórico;
- tentativas de token inválido sem `email`, contra o `NOT NULL` histórico;
- `total_ms` em vez de `duration_ms`;
- `totals` em vez de `deleted_by_table`.

Logo, mesmo que a migration fosse aplicada, vários registros continuariam falhando. Essa é
evidência de contrato evoluído de forma desconectada, não autorização para ajustar tabela ou
handler sem caracterização.

## Sequência segura de execução após decisão

1. Criar testes locais de caracterização com um cliente falso que devolve `{ error }`, sem
   dependência de banco remoto.
2. Testar que a falha de observabilidade não altera status, corpo ou CORS do fluxo principal.
3. Para D1/C, implementar um helper pequeno que mapeie os campos para
   `edge_function_invocations` e redija metadados antes de inserir.
4. Para `e2e-cleanup`, testar token inválido, rate limit, allowlist, `dryRun`, sucesso e
   exceção; o teste deve confirmar que nenhum path chama objeto ausente.
5. Corrigir separadamente a assinatura `p_key` e definir explicitamente o comportamento em
   erro de RPC (preferencialmente decisão fail-closed para uma operação destrutiva, mas isso
   requer concordância do PO).
6. Executar os testes Deno/contrato relevantes e o gate de referência inexistente;
   validar em staging autorizado com uma falha sintética e consultar a linha pelo
   `request_id`.
7. Só depois de evidência em staging, fazer deploy autorizado. Não há migration nesta rota.

## Critérios de aceite

- Nenhuma referência executável a `system_error_logs` ou `e2e_cleanup_audit` permanece no
  handler escolhido (`rg` como gate estático).
- Uma falha sintética de `visual-search` preserva a resposta atual e deixa uma linha com
  `function_slug`, `request_metadata.request_id`, `status_code`, `duration_ms` e
  `error_message` no destino aprovado.
- O logger trata tanto exceção quanto resultado `{ error }` sem mascarar o erro primário.
- Se `e2e-cleanup` permanecer no canônico, cada resultado autorizado registra apenas
  metadados mínimos/redigidos e não exige e-mail bruto para persistir.
- A chamada RPC usa a assinatura viva `p_key`, trata seu erro de forma explícita e possui teste
  que evita regressão do fail-open.
- Não há DDL, migration, alteração de RLS, GRANT, trigger, job ou dado de produção neste
  conjunto de mudanças.

## Rollback

As opções B/C e D1 podem ser revertidas por `git revert` do commit de handler/helper e
redeploy autorizado; nenhuma estrutura de banco é removida ou recriada. Linhas já escritas em
`edge_function_invocations` permanecem sujeitas à retenção canônica de 90 dias. Caso a
telemetria nova apresente erro, o comportamento de contingência é `console.error` com
`request_id`, sem indisponibilizar o fluxo de negócio.

## Perguntas para decisão do PO

1. `e2e-cleanup` deve continuar acessível no projeto canônico, ou deve existir somente no
   ambiente de teste/Lovable?
2. Se permanecer no canônico, o histórico mínimo de 90 dias em
   `edge_function_invocations` atende à auditoria operacional da limpeza?
3. Podemos tratar falha da RPC de rate limit como bloqueante para a limpeza real, após teste
   de caracterização?
