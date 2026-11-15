# Inventário — Edge Functions

**Projeto:** doufsxqlfjyuvxuezpln | **Data:** 2026-11-01

## Resumo

| Métrica | Valor |
|---|---|
| Total publicadas | 110 |
| Status ACTIVE | 110 (100%) |
| verify_jwt = true | 74 |
| verify_jwt = false | 36 |
| Risco R2 (efeito externo) | estimado ~30 |

## Funções com verify_jwt = false

Essas funções aceitam chamadas **sem JWT válido**. Cada uma deve implementar auth alternativa.

| Função | Risco estimado | Observação |
|---|---|---|
| `ai-search-hub` | R1/R2 | Consulta AI + escreve no banco |
| `art-workflow` | R1 | Workflow de arte |
| `backfill-image-dimensions` | R1 | Worker de backfill — cron-controlled |
| `browser-screenshot` | R0 | Captura screenshot |
| `catalog-cache-refresh` | R1 | Refresh de cache |
| `cfimages-batch` | R1 | Upload batch Cloudflare Images |
| `cfimages-upload` | R1 | Upload individual Cloudflare Images |
| `cleanup-notifications` | R1 | DELETE dados — cron-controlled |
| `cleanup-novelties` | R1 | DELETE dados — cron-controlled |
| `cln-category-embed` | R1 | Gera embeddings |
| `cln-image-embed` | R1 | Gera embeddings |
| `cln-text-embed` | R1 | Gera embeddings |
| `comparison-price-watcher` | R1 | Escreve banco — cron-controlled |
| `connections-auto-test` | R0/R1 | Testa conexões — usa CONNECTIONS_AUTO_TEST_SECRET |
| `connections-health-check` | R0/R1 | Health check — usa CRON_SECRET |
| `daily-summary-worker` | R1 | Agrega dados diários |
| `diagnostics` | R0 | Informações de diagnóstico |
| `dispatcher-proxy` | R2 | Proxy para serviços externos |
| `favorites-watcher` | R1 | Monitora favoritos — cron-controlled |
| `fn-catalog-refresh` | R1 | Refresh de catálogo |
| `invite-user` | R1/R2 | Convida usuário — CRON_SECRET ou user token |
| `kit-ai-builder` | R1/R2 | Constrói kits com AI |
| `magazine-reader-state-read` | R0/R1 | Estado de leitura |
| `mcp-gateway` | R1/R2 | Gateway MCP — acesso amplo |
| `process-queue` | R1 | Processa fila — cron-controlled |
| `process-scheduled-reports` | R1/R2 | Envia relatórios — cron-controlled |
| `run-script` | R1/R2 | Executor genérico de scripts — ALTO RISCO |
| `send-digest` | R2 | Envia e-mail digest — cron-controlled |
| `send-scheduled-reports` | R2 | Envia relatórios — cron-controlled |
| `session-bridge` | R1 | Bridge de sessão |
| `setup-wizard` | R1 | Wizard de setup |
| `shop-ai-hub` | R1/R2 | Hub AI para loja |
| `smart-search` | R0/R1 | Busca inteligente |
| `storage-gateway` | R1 | Gateway de storage |
| `supplier-integrator` | R1/R2 | Integração com fornecedores |
| `video-process` | R1 | Processa vídeos |

## Funções invocadas do frontend (verificadas contra publicadas)

| Função frontend | Publicada | Status |
|---|---|---|
| `external-db-bridge` | ✓ | OK |
| `manage-users` | ✓ | OK |
| `crm-callback-reprocess` | ✓ | OK |
| `mcp-keys-issue` | ✓ | OK |
| `mcp-keys-update` | ✓ | OK |
| `visual-search` | ✓ | OK |
| `secrets-manager` | ✓ | OK |
| `crm-db-bridge` | ✓ | OK |

**Drift código publicado × repo:** NÃO VERIFICADO (code review individual de 36 funções com verify_jwt=false não executado por limite de sessão)
