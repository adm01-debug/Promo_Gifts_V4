# Crons Inativos — Log de Decisão

> Auditado em 2026-10-27 · 7 jobs com `active = false`  
> Cada item requer decisão do PO: **reativar** ou **documentar como legado desativado**

---

## 1. `dispatcher-log-sync` — `*/2 * * * *`

**Comando:** `SELECT * FROM public.fn_sync_dispatcher_log_from_net();`  
**Risco de ficar inativo:** Médio — dispatcher logs não sincronizados acumulam em `net._http_response`. Pode dificultar diagnóstico de falhas HTTP de crons.  
**Decisão recomendada:** Reativar se `fn_sync_dispatcher_log_from_net` ainda existe e é usada para diagnóstico.

---

## 2. `generate-blurhashes` — a cada 2 minutos

**Comando:** Chama `/functions/v1/generate-blurhashes` com `GENERATE_BLURHASHES_CRON_SECRET`  
**Risco de ficar inativo:** Baixo a médio — novas imagens ficam sem blurhash (placeholder azul no carregamento).  
**Risco de reativar:** **ALTO** — schedule a cada 2 minutos adicionaria 30 execuções/hora sobre os 135 jobs ativos, agravando o problema de burst `job startup timeout`.  
**Decisão recomendada:** Manter inativo até o problema de burst ser resolvido. Avaliar mudar para schedule `*/10` antes de reativar.

---

## 3. `monitor-connections` — a cada minuto

**Comando:** `SELECT public.fn_capture_connection_snapshot();`  
**Risco de ficar inativo:** Baixo — sem snapshots de conexão, histórico de saúde das conexões não é gravado.  
**Risco de reativar:** Médio — 60 execuções/hora contribuem para o problema de burst.  
**Decisão recomendada:** Manter inativo. Snapshots são para diagnóstico histórico, não para funcionamento.

---

## 4. `pipeline-classify-categories` — a cada 10 minutos

**Comando:** `fn_pipeline_classify_pending_products(50)` — classifica produtos pendentes  
**Risco de ficar inativo:** **Alto** se há produtos novos entrando sem classificação de categoria. Produtos sem categoria não aparecem em filtros.  
**Decisão recomendada:** Verificar `SELECT count(*) FROM products WHERE category_id IS NULL` antes de decidir. Se > 0, reativar urgente.

---

## 5. `process-webhook-outbox` — a cada minuto

**Comando:** `fn_process_webhook_outbox_batch(10)` — processa fila de saída de webhooks  
**Risco de ficar inativo:** **Crítico** se webhooks são usados para integração com Bitrix24, N8N ou externos. Webhooks acumulam na outbox sem ser enviados.  
**Decisão recomendada:** Verificar `SELECT count(*) FROM public.webhook_outbox WHERE sent_at IS NULL` (ou tabela equivalente). Se > 0, reativar urgente.

---

## 6. `refresh-analytics-mv-product-intelligence` — a cada 6 horas

**Comando:** `REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_intelligence`  
**Risco de ficar inativo:** Baixo — dados de analytics ficam defasados em >6h. Não afeta operação.  
**Decisão recomendada:** Reativar quando conveniente. Não é urgente.

---

## 7. `refresh-analytics-mv-stock-velocity` — a cada 8 horas

**Comando:** `fn_cron_safe_run(147)` + `REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_stock_velocity`  
**Risco de ficar inativo:** Baixo — dados de velocidade de estoque ficam defasados. Não afeta operação.  
**Decisão recomendada:** Reativar quando conveniente. Não é urgente.

---

## Resumo por prioridade

| Prioridade | Job | Ação |
|---|---|---|
| ✅ Sem impacto atual | `process-webhook-outbox` | 0 pendentes na outbox (verificado 2026-10-27) |
| ✅ Sem impacto atual | `pipeline-classify-categories` | 0 produtos sem categoria (verificado 2026-10-27) |
| ✅ Migration criada | `generate-blurhashes` | Migration `20261027180000` — reativa com `*/10` após burst fix `20261027140000` |
| 🟡 Reativar se diagnóstico for necessário | `dispatcher-log-sync` | Avaliar uso real |
| 🟢 Manter inativo | `monitor-connections` | Só para histórico |
| 🟢 Reativar quando conveniente | `refresh-analytics-mv-product-intelligence` | Não urgente |
| 🟢 Reativar quando conveniente | `refresh-analytics-mv-stock-velocity` | Não urgente |
