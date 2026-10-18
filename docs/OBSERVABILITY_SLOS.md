# SLOs e Burn-Rate — Observabilidade

Última atualização: 2026-10-11 (auditoria 22 dimensões).

## SLOs definidos

| Jornada | Indicador | SLO | Janela |
|---|---|---|---|
| Login | `navigationMetrics` login-success rate | ≥ 99% | 7d |
| Catálogo | carregamento p95 da página de produtos | ≤ 3s LCP | 7d |
| Checkout/orçamento | RPC `respond_discount_approval*` + save quote sem erro | ≥ 99,5% | 7d |
| Edge functions | taxa de erro 5xx no Supabase | ≤ 0,5% | 24h |

## Alertas (configurar no Sentry → Alerts → Metric)

1. **burn-rate rápido:** erro de login > 3× o orçamento em 1h → página o on-call.
2. **burn-rate lento:** consumo de orçamento > 50% em 6h → abrir issue.
3. **breaker aberto:** `breaker_open` em qualquer edge por > 5min → investigar
   dependência. Hoje emitem: `log-login-attempt` (reason em `log_login_fallback`)
   e as edges com `fetchWithBreaker` (quote-sync, sync-quote-bitrix,
   webhook-dispatcher, etc. — logam `console.warn [circuit-breaker:<nome>] OPEN`;
   o cliente emite `edge_invoke_breaker_open`). O gate de login `check-login`
   não tem breaker ainda.
4. **fallback audit:** `log_login_fallback` > 10/hora → auditoria degradada.

Fonte dos eventos: `src/lib/telemetry/navigationMetrics.ts` (buffer),
`supabase/functions/_shared/log-safety.ts`, `structuredLogger` nas edges
(`log.info/warn/error` com `source=`).
