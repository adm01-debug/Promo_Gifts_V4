# ADR — resultado, persistência e contratos do `simulation-orchestrator`

- **Data:** 2026-08-26
- **Status:** aplicado localmente; implantação e qualquer alteração de banco seguem bloqueadas
- **Escopo do plano:** etapas 39–40
- **Projeto canônico:** Supabase `doufsxqlfjyuvxuezpln`
- **Natureza:** caracterização local + correção de semântica no repositório. Não houve deploy, DDL, migration, leitura de segredo, escrita ou chamada mutante no banco.

## Decisão executiva

O `simulation-orchestrator` **não pode declarar sucesso nem disparar seus alvos padrão** no estado atual. A implementação anterior:

1. ignorava falhas ao criar/atualizar `simulation_runs` e ao inserir `simulation_logs`;
2. contava 400, 401, 404, 422 e até 500 como sucesso em diferentes cenários;
3. chamava três alvos sem um contrato de simulação seguro: um foi aposentado, outro está em reconciliação de contrato e o terceiro pode gravar produtos reais;
4. enviava HMAC/headers incompatíveis com os handlers atuais.

Foi adotado um **fail-closed local**:

- falha de persistência de run, log ou fechamento retorna `503` com `outcome: "infra_failed"`, antes de chamar qualquer alvo quando a criação de run falha;
- alvos sem cenário seguro ficam explícitos como `skipped`, sem `fetch` para a Edge alvo;
- o relatório devolve `424 Failed Dependency` quando todos os alvos estão bloqueados, nunca `200` verde;
- a semântica reutilizável distingue `passed`, `rejected`, `infra_failed` e `skipped`; HTTP 4xx/5xx não incrementa `successes`.

Nenhuma tabela foi criada para "fazer o teste passar". A ausência de `simulation_runs` e `simulation_logs` é uma divergência registrada como infraestrutura Lovable, não autorização para DDL no banco Gold.

## Evidências verificadas

| Evidência | Resultado |
|---|---|
| Catálogo live, consulta somente leitura | `public.simulation_runs` e `public.simulation_logs` não existem; `public.inbound_webhook_endpoints` e `public.inbound_webhook_events` existem. |
| Endpoint de teste live, somente metadados | há exatamente um `simulation-test`, ativo e com referência de segredo preenchida; o valor do segredo não foi lido. |
| Allowlist histórica | `simulation_logs` e `simulation_runs` aparecem como `infra_lovable` / telemetria interna do Lovable em `supabase/migrations/20260522160000_align_wave_3_5_5_drift_allowlist.sql:16-18,118-119`. |
| Alvo `external-db-bridge` | `supabase/functions/external-db-bridge/index.ts:1-39` retorna 410 para toda chamada. |
| Alvo `webhook-inbound` | ADR da etapa 37 confirmou handler, schema e banco divergentes; o destino live é `inbound_webhook_events`, enquanto o handler atual tenta `webhook_events`. |
| Alvo `product-webhook` | processa upsert/sync/delete de catálogo e exige assinatura, nonce e timestamp; não há sandbox/canário aprovado para a simulação. |

## Modelo de resultado adotado

| Estado | Significado | Entra em `successes`? | HTTP agregado |
|---|---|---:|---:|
| `passed` | resposta 2xx para cenário que deve ser aceito | sim | 200, se não houver bloqueio/falha |
| `rejected` | alvo respondeu 4xx | não | 200 somente se era um cenário negativo explicitamente esperado; caso contrário 502 |
| `infra_failed` | 5xx, rede, 3xx inesperado, aceitação de payload negativo ou persistência falha | não | 502; 503 para persistência/configuração do próprio orquestrador |
| `skipped` | não há pré-condição, contrato ou ambiente seguro para executar | não | 424 |

`successes` permanece para compatibilidade com a UI, mas agora significa somente `passed`. `failures`, `rejections`, `skipped`, `outcomes` e `expectation_failed` deixam a classificação auditável. A página recebe um erro pelo wrapper de Edge para 424/5xx e não produz o toast de conclusão bem-sucedida.

## Contrato HMAC/header/segredo: reconciliação

| Caminho | Código anterior do orquestrador | Contrato real observado | Decisão local |
|---|---|---|---|
| Invocação do próprio orquestrador | o manifesto declara HMAC `N8N_PRODUCT_WEBHOOK_SECRET`, mas o handler não verificava HMAC | precisa de revisão de auth antes de exposição externa; não foi alterado nesta etapa | registrado como gap `SIM-08`; fora de escopo mudar autenticação sem decisão de dono/rollout |
| `webhook-inbound` | `x-signature-256: sha256=HMAC(rawBody, service_role)` | handler atual aceita `x-webhook-signature` com segredo global; ADR de webhook propõe HMAC por endpoint em `hmac_secret_ref` e bypass interno restrito | não emitir assinatura incompatível; cenário fica `skipped: webhook_contract_pending` até a decisão D1–D7 do ADR do webhook |
| `product-webhook` | `x-webhook-secret` e fallback perigoso `sim-secret` | exige `x-webhook-signature`, `x-webhook-nonce`, `x-webhook-timestamp` e `HMAC(timestamp.nonce.rawBody, N8N_PRODUCT_WEBHOOK_SECRET)`; pode alterar produtos | não reutilizar segredo nem forjar headers; cenário fica `skipped: mutating_target_requires_approved_sandbox` |

O HMAC não deve usar a service role como segredo de simulação. A service role é credencial de infraestrutura, não chave de assinatura para fornecedor/webhook. Nenhum segredo foi lido, exposto ou rotacionado nesta etapa.

## Alvos bloqueados de forma explícita

| Alvo solicitado | Estado | Motivo | Condição para liberar |
|---|---|---|---|
| `external-db-bridge` | `skipped` | endpoint aposentado (410) | não reativar para simulação; definir substituto read-only se o PO precisar deste teste |
| `webhook-inbound` | `skipped` | contrato HMAC/destino/idempotência em reparo | aprovar e concluir ADR/etapa 38, depois criar cenário por endpoint isolado |
| `product-webhook` | `skipped` | ação pode alterar catálogo real | sandbox ou dry-run transacional aprovado, assinatura correta e rollback testado |
| `webhook-dispatcher` | `skipped` | não existe cenário definido no orquestrador | contrato, isolamento e dono explícitos |
| qualquer string V1 fora da allowlist | `skipped` | não deve virar fan-out com service role controlado pelo chamador | adicionar cenário tipado e revisado |

## Implementação local

- [`outcomes.ts`](../supabase/functions/simulation-orchestrator/outcomes.ts) define a classificação e o status agregado.
- [`index.ts`](../supabase/functions/simulation-orchestrator/index.ts) verifica persistência, registra um relatório bloqueado sem invocar alvo e retorna 424/503 apropriado.
- [`outcomes_test.ts`](../supabase/functions/simulation-orchestrator/outcomes_test.ts) comprova os quatro estados e que 401 inesperado não é sucesso.
- [`handler_characterization_test.ts`](../supabase/functions/simulation-orchestrator/handler_characterization_test.ts) intercepta `Deno.serve` e `fetch` localmente para provar que falha de run, log ou update retorna 503 e que alvos bloqueados não recebem chamada.

Comando executado:

```bash
deno test --config supabase/functions/deno.json --allow-env --allow-net \
  supabase/functions/simulation-orchestrator/outcomes_test.ts \
  supabase/functions/simulation-orchestrator/handler_characterization_test.ts
```

Resultado: **4 testes passaram**, sem rede real ou escrita em banco.

## Decisões pendentes do PO / gates obrigatórios

1. **D-SIM-01 — ciclo de vida:** manter o orquestrador bloqueado, substituir por suíte local/CI ou aposentá-lo. A aposentadoria remota só pode ser considerada após inventário das etapas 88–90, validação do PO e autorização de deploy.
2. **D-SIM-02 — persistência:** não recriar `simulation_runs`/`simulation_logs` automaticamente. Se houver necessidade de auditoria persistente no Gold, especificar owner, retenção, RLS, índices, volume, acessos e rollback nas etapas 81–90, com `[AUTORIZAÇÃO BD]` explícita.
3. **D-SIM-03 — webhook:** fechar as decisões do ADR `ADR_WEBHOOK_INBOUND_CONTRATO_2026-08-26.md` antes de emitir HMAC de teste ou gravar eventos no endpoint `simulation-test`.
4. **D-SIM-04 — catálogo:** criar um contrato `dry_run`/sandbox para `product-webhook`; não usar `upsert` sintético no catálogo canônico.
5. **D-SIM-05 — idempotência:** o schema V2 exige `idempotency_key`, mas o handler anterior não a consumia. Definir armazenamento/semântica antes de qualquer reativação para impedir replays de execução.
6. **D-SIM-06 — autenticação:** reconciliar o manifesto que anuncia HMAC no orquestrador com a autenticação realmente aplicada, sem assumir que o gateway/configuração cobre o gap.

## Critérios de reabertura

Um alvo só volta a executar quando todos os itens abaixo estiverem comprovados em teste local e ambiente aprovado:

- cenário tipado com expectativa positiva/negativa explícita;
- credencial, header e HMAC alinhados ao handler real, sem fallback de segredo;
- isolamento de dados e rollback para qualquer escrita;
- persistência ou alternativa observável aprovada;
- teste que force 4xx, 5xx, erro de rede e erro de persistência sem resultado verde;
- autorização correspondente para banco, configuração externa e deploy.
