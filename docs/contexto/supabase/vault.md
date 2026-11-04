# Vault (somente nomes — valores nunca são exportados)

| nome | descrição | criado em |
|---|---|---|
| asia_api_key | Chave de API Asia Import para ingestão listarProdutos2 | 2026-06-09 16:43:20.802117+00:00 |
| asia_secret_key | Secret key API Asia Import | 2026-06-09 16:50:58.303827+00:00 |
| BACKFILL_DIM_CRON_SECRET | Secret for backfill-image-dimensions pg_cron job | 2026-06-17 01:08:32.684529+00:00 |
| CF_ACCOUNT_ID | Cloudflare Account ID (Images + Stream) | 2026-06-07 19:11:04.444024+00:00 |
| CF_API_TOKEN | Cloudflare API Token (Images:Write + Stream:Write) | 2026-06-07 19:11:04.444024+00:00 |
| CHAMPIONS_RECEIVE_QUOTE_SYNC_URL |  | 2026-07-10 11:31:09.775100+00:00 |
| CONNECTIONS_AUTO_TEST_SECRET | Secret para autenticar chamadas ao connections-auto-test edge function (cron job). Sincronizar com painel Supabase Edge Functions Secrets. | 2026-05-14 11:20:56.858269+00:00 |
| CRM_CALLBACK_API_KEY | API key para autenticar callbacks do Champions V2 → Gifts V4. fix_version=2026-07-09-crm-callback | 2026-07-09 10:34:56.772434+00:00 |
| CRON_SECRET |  | 2026-05-15 11:02:43.544676+00:00 |
| EDGE_FUNCTIONS_BASE_URL | Base URL das Edge Functions (prod). Consumido por public.get_edge_functions_base_url(). Env-specific: cada ambiente seta o seu. | 2026-05-30 15:01:26.199116+00:00 |
| GENERATE_BLURHASHES_CRON_SECRET | Secret for generate-blurhashes pg_cron job | 2026-06-17 01:00:04.537768+00:00 |
| HASH_PRODUCT_IMAGES_CRON_SECRET | Secret for hash-product-images pg_cron job | 2026-06-17 00:59:50.231422+00:00 |
| jina_api_key | Chave API Jina Reader. Sem chave = free tier. Ver https://jina.ai/api-key | 2026-06-07 12:00:19.411371+00:00 |
| sm_session_cookie | Cookie sessão B2B somarcas.com.br. Renovar via SM Session Sync quando expirar. | 2026-06-07 12:00:19.411371+00:00 |
| SPOT_ACCESS_KEY | SPOT/Stricker webservice access key — client 12869. Usado pelo fetcher de ingestao. | 2026-06-06 13:33:40.007545+00:00 |
| WEBHOOK_DISPATCHER_SECRET | Secret para autenticar chamadas ao webhook-dispatcher edge function (Modo A). Sincronizar com painel Supabase Edge Functions Secrets. | 2026-05-14 11:20:56.858269+00:00 |
