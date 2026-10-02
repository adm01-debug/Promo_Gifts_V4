# Matriz RBAC — Edge Functions

> **Gerado de `supabase/functions/_shared/edge-authz-manifest.ts`** (SSOT de autorização por edge). Regenerar após alterar o manifest — o gate de CI `scripts/check-edge-authorization.mjs` já bloqueia função fora do manifest.

Última atualização: 2026-10-02 · 108 funções mapeadas.

Categorias: **public** = chamável sem JWT · **authenticated** = JWT válido · **supervisor** = role supervisor/admin/dev · **dev** = só dev · **service** = server-to-server (cron/edge) · **scoped** = autenticação custom (HMAC/token/scope MCP).

## Públicas (sem autenticação) — 22

| Função | Justificativa |
|---|---|
| `image-proxy` | Proxy de imagens (anti-hotlink CDN externos) |
| `cnpj-lookup` | Lookup CNPJ via API pública |
| `health-check` | Health endpoint para uptime monitors |
| `get-visitor-info` | Geo/IP do visitante para anti-fraude |
| `verify-email` | Verificação de email no signup público |
| `log-login-attempt` | Telemetria de login (anti-bruteforce) |
| `rate-limit-check` | Rate-limit consult anonymous |
| `commemorative-dates` | Calendário público |
| `categories-api` | Catálogo de categorias público |
| `materials-api` | Catálogo de materiais público |
| `product-webhook` | Webhook de produto — HMAC inline |
| `webhook-inbound` | Webhook inbound — assinatura HMAC |
| `semantic-search` | Busca semântica — rate-limited, sem dados sensíveis |
| `detect-new-device` | Detecção de novo dispositivo no login |
| `dropbox-list` | Listagem Dropbox — token público |
| `elevenlabs-scribe-token` | Token temporário para ElevenLabs scribe |
| `elevenlabs-tts` | TTS público via ElevenLabs |
| `check-login` | Pre-login security check — IP/city/lockout, chamada antes de supabase.auth.signIn() |
| `magazine-public-view` | Leitura por public_token publicado |
| `magazine-public-react` | Reação anônima limitada por public_token |
| `magazine-reader-state-read` | Estado anônimo pseudonimizado por token+fingerprint |
| `magazine-reader-state-write` | Upsert anônimo pseudonimizado por token+fingerprint |

## Autenticadas (JWT válido, qualquer role) — 45

| Função | Justificativa |
|---|---|
| `send-notification` | Notificação do próprio user |
| `send-digest` | Digest do próprio user |
| `send-scheduled-reports` | Relatórios agendados do user |
| `process-scheduled-reports` | Processamento dos relatórios agendados |
| `process-queue` | Fila de jobs do user |
| `webhook-dispatcher` | Dispatcher de webhooks com autenticação |
| `connections-hub-audit` | Auditoria de conexões do user |
| `connections-auto-test` | Teste automático de conexões do user |
| `connections-health-check` | Health check das conexões do user |
| `quote-followup-reminders` | Lembretes de follow-up de cotações |
| `ownership-audit` | Auditoria de propriedade — JWT + service-role |
| `cleanup-notifications` | Limpeza de notificacoes via cron — authorizeCron |
| `cleanup-novelties` | Limpeza de novidades via cron — authorizeCron |
| `collections-watcher` | Watcher de coleções do user |
| `favorites-watcher` | Watcher de favoritos do user |
| `comparison-price-watcher` | Watcher de preços para comparação |
| `external-db-bridge` | Bridge para DB externo do user |
| `kit-ai-builder` | Builder de kit por IA |
| `kit-identity-suggest` | Sugestão de identidade do kit |
| `expert-chat` | Chat com expert — JWT user |
| `visual-search` | Busca visual — JWT user |
| `ai-recommendations` | Recomendações de IA |
| `generate-ad-image` | Geração de imagem de anúncio |
| `generate-ad-prompt` | Geração de prompt para anúncio |
| `generate-product-seo` | SEO de produto |
| `analyze-logo-colors` | Análise de cores de logo |
| `generate-mockup` | Geração de mockup (compositor canvas) — authenticateRequest (JWT obrigatório) |
| `magic-up-score` | Scoring criativo do user |
| `voice-agent` | Voice agent do user |
| `quote-sync` | Sync do orçamento do próprio vendedor |
| `sync-quote-bitrix` | Sync do orçamento do vendedor |
| `trends-insights` | Insights do BI |
| `comparison-ai-advisor` | Conselheiro IA na comparação |
| `market-intelligence-insights` | BI insights |
| `bi-copilot` | BI copilot |
| `send-transactional-email` | Envio de e-mail trans (user logado) |
| `step-up-verify` | MFA step-up — quem está fazendo |
| `validate-access` | Validação de acesso pós-login |
| `force-global-logout` | Logout global do próprio user |
| `secure-upload` | Upload com scan VirusTotal anti-malware — exige JWT (uso de SERVICE_ROLE_KEY interno; auditoria em file_scan_logs com user_id obrigatório) |
| `intelligence-substitute-applied` | Telemetria de substituição — JWT obrigatório via helper compartilhado |
| `magazine-import-local` | Import do próprio usuário com JWT e RLS |
| `quote-sync-promo-champions` | JWT e ownership do orçamento antes do sync |
| `verify-2fa-token` | Verificação TOTP server-side — JWT Bearer obrigatório (verify_jwt: true) |
| `word-magic` | Geração de copy via IA — authenticateRequest (JWT obrigatório) |

## Supervisor+ (admin/dev) — 6

| Função | Justificativa |
|---|---|
| `bitrix-sync` | Sync no CRM externo — admin/dev |
| `manage-users` | Gestão de usuários via has_role inline |
| `block-ip-temporarily` | Bloqueio de IP — has_role inline |
| `ownership-repair` | Reparo de órfãos — has_role inline + dry-run |
| `bulk-random-passwords` | Bulk reset de senhas — x-admin-token inline |
| `crm-callback-reprocess` | Reprocessamento de dead-letter — JWT admin/dev inline |

## Dev only — 25

| Função | Justificativa |
|---|---|
| `cors-audit` | Auditoria CORS — dev only via shared-authorize |
| `secrets-manager` | is_dev() inline check |
| `connection-tester` | is_dev() inline check |
| `github-credentials-test` | is_dev() inline check |
| `external-db-inspect` | is_dev() inline check |
| `rls-audit` | Auditoria via service-role + has_role inline |
| `rls-integration-tests` | Testes RLS — dev/cron only |
| `rls-matrix-export` | Export matriz — has_role inline |
| `tests` | Pasta de Deno tests, não é edge deployada |
| `e2e-cleanup` | Cleanup E2E — JWT + service-role + e2e-shared-secret |
| `full-op-diagnostics` | Diagnóstico — has_role(dev) inline |
| `migrate-helper` | Desativada com 410; JWT dev impede acesso ao handler legado |
| `ema-pipeline-health` | Saúde técnica EMA — JWT dev e fontes service-role canônicas |
| `mcp-keys-issue` | MCP keys — has_role(dev) + step-up token |
| `mcp-keys-revoke` | MCP keys — has_role(dev) inline |
| `mcp-keys-rotate` | MCP keys — has_role(dev) + step-up token |
| `mcp-keys-update` | MCP keys — has_role(dev) inline |
| `test-contract-orchestrator` | Teste de contratos — dev/CI only, HMAC inline |
| `test-inventory-orchestrator` | Teste de inventario — dev/CI only, service_role inline |
| `load-test` | Load testing utility — sem auth no caller; uso dev/CI only |
| `simulation-orchestrator` | Orquestrador de simulacoes — JWT dev via authorize compartilhado |
| `audit-suite` | Suite de auditoria — service_role + has_role(dev) inline |
| `test-cart-concurrency` | Teste CI de concorrência de carrinho — service_role interno |
| `test-cart-limit` | Teste CI de limite de carrinho — service_role interno |
| `test-cart-rls` | Teste CI de RLS de carrinho — service_role interno |

## Service (server-to-server / cron) — 6

| Função | Justificativa |
|---|---|
| `sync-external-db` | Sync DB externo — service_role_key server-to-server |
| `crm-callback-alerts` | Cron de alertas — Bearer service_role em comparação constante |
| `asia-ingestion` | Sync paginado catálogo ASIA — cron/service via x-cron-secret (ASIA_INGESTION_CRON_SECRET) |
| `backfill-image-dimensions` | Backfill dimensões product_images — cron via x-cron-secret (BACKFILL_DIM_CRON_SECRET) |
| `generate-blurhashes` | Gera blurhashes — cron via authorizeCron (service_role + x-cron-secret) |
| `hash-product-images` | Hash perceptual de imagens — cron via authorizeCron (service_role + x-cron-secret) |

## Scoped (auth custom: token/HMAC/MCP) — 4

| Função | Justificativa |
|---|---|
| `product-visual-search` | JWT de usuário (bypass de simulação removido em T38) |
| `mcp-server` | Token MCP com escopos read/write/admin |
| `crm-db-bridge` | JWT + RBAC custom interno |
| `receive-crm-callback` | Callback do CRM Promo Champions — x-api-key custom (timing-safe) |

## Notas de enforcement

- O mecanismo padrão é o helper compartilhado (`shared-authorize`); entradas com `enforcedBy: "custom"` têm validação própria validada no manifest.
- Cobertura de bypass: `tests/security/edge-authz-bypass.test.ts` testa chamadas anon/authenticated indevidas por categoria (flags `skipAnonBypassTest`/`skipAuthBypassTest` no manifest dispensam casos legítimos).
- Helpers SQL de papel (is_dev, is_supervisor_or_above, etc.): `docs/RBAC_HELPERS.md`.
