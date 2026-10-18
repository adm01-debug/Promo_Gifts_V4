# Manifesto de Idempotência — Edges de Escrita

Última atualização: 2026-10-11 (auditoria 22 dimensões).

## Contrato

- Toda edge function de **escrita** que pode ser re-tentada pelo cliente DEVE
  aceitar o header `Idempotency-Key` (allowlistado em `_shared/cors.ts`).
- O cliente envia a mesma chave em todas as retentativas da MESMA operação lógica.
- A edge DEVE deduplicar por `(key, user_id)` ou derivar um nome de objeto/
  identidade estável via **hash da chave crua** (ex.: `idem-<sha256>`) — nunca
  sanitização que remova caracteres (colide: `a.b` == `ab`).

## Estado por edge

| Edge | Deduplicação | Mecanismo |
|---|---|---|
| `generate-mockup` | ✅ | `idem-<sha256(key)>` → path único no storage; resposta reutilizada |
| `anonymize-user` | n/a | Operação monótona por estado da conta (idempotente por natureza) |
| `mcp-keys-update` / `step-up-verify` / `verify-2fa-token` | ✅ parcial | retry é no-op pela validação de estado na edge; o header `Idempotency-Key` enviado pelo cliente é ignorado hoje (cosmético) |
| `webhook-inbound` | ✅ | `idempotency_key` (header `x-idempotency-key` ou body) deduplica em `inbound_webhook_events` |
| `log-login-attempt` | ❌ por design | cada tentativa é um evento distinto (append) |
| `secure-upload` | parcial | nome de objeto único por upload; retry cria objeto novo (aceitável) |
| demais edges de escrita | pendente | adotar tabela `idempotency_keys (key, user_id, response)` quando houver retry de cliente |

## Regra para novos call sites

Ao adicionar `idempotencyKey` num call site (`invokeEdgeSafe`), a edge destino
DEVE constar nesta tabela com mecanismo implementado — caso contrário a chave é
cosmética. Gate futuro: cruzar call sites × esta tabela.
