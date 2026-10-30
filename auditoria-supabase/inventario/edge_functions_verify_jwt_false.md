# Edge Functions com verify_jwt=false
## Evidência coletada em: 2026-10-22

**Total de edge functions publicadas:** 82  
**Com verify_jwt=false:** 36 (43,9%)

## Funções Críticas sem Autenticação JWT

| Slug | Versão | Risco |
|------|--------|-------|
| `mcp-server` | 301 | CRÍTICO — servidor MCP público sem auth |
| `crm-db-bridge` | 301 | CRÍTICO — ponte para BD CRM sem auth |
| `external-db-inspect` | 287 | CRÍTICO — inspeção de BDs externos sem auth |
| `e2e-cleanup` | 297 | CRÍTICO — limpeza de dados sem auth |
| `sync-external-db` | 251 | CRÍTICO — sincronização BD externo sem auth |
| `webhook-dispatcher` | 305 | ALTO — dispatcher de webhooks sem auth |
| `magazine-reader-state-write` | 43 | ALTO — escrita de estado sem auth |
| `backfill-image-dimensions` | 123 | ALTO — tarefa admin sem auth |
| `asia-ingestion` | 123 | ALTO — ingestão de dados sem auth |
| `ownership-audit` | 296 | MÉDIO — auditoria sem auth |

## Lista Completa de verify_jwt=false

1. ai-recommendations (v293)
2. cleanup-novelties (v301)
3. cleanup-notifications (v311)
4. collections-watcher (v297)
5. comparison-price-watcher (v289)
6. connections-auto-test (v296)
7. connections-health-check (v310)
8. crm-db-bridge (v301) ⚠️ CRÍTICO
9. e2e-cleanup (v297) ⚠️ CRÍTICO
10. external-db-inspect (v287) ⚠️ CRÍTICO
11. favorites-watcher (v308)
12. get-visitor-info (v277)
13. image-proxy (v291)
14. log-login-attempt (v280)
15. mcp-server (v301) ⚠️ CRÍTICO
16. ownership-audit (v296)
17. process-queue (v299)
18. process-scheduled-reports (v304)
19. quote-followup-reminders (v297)
20. send-digest (v295)
21. send-notification (v306)
22. send-scheduled-reports (v301)
23. webhook-dispatcher (v305)
24. webhook-inbound (v299)
25. check-login (v128)
26. backfill-image-dimensions (v123) ⚠️ ALTO
27. asia-ingestion (v123) ⚠️ ALTO
28. magazine-import-local (v44)
29. magazine-public-react (v42)
30. magazine-public-view (v42)
31. magazine-reader-state-read (v46)
32. magazine-reader-state-write (v43) ⚠️ ALTO
33. receive-crm-callback (v75)
34. crm-callback-alerts (v72)
35. crm-callback-reprocess (v72)
36. sync-external-db (v251) ⚠️ CRÍTICO

## Query de evidência usada
```
mcp__SUPABASE_-_GEST_O_DE_PRODUTOS_-_PROMO_GIFTS_V4__list_edge_functions
```
