# Registro de deploys de Edge Functions

Ledger de todo deploy de edge function no projeto canônico `doufsxqlfjyuvxuezpln`,
análogo ao `supabase/MIGRATIONS_SYNC_LOG.md` para migrations (PLANO_DBA E15).

**Por quê:** 2 casos de deploy fora do fluxo git só foram descobertos pelo job
"Compare GitHub × Canonical" (drift check) — sem ledger algum que os apontasse
antes disso: `kit-ai-builder` (2026-09-23, timeout de 20s implementado direto
em produção) e `magazine-reader-state-read` (2026-09-24, fix de segurança
fail-open deployado via MCP antes de qualquer revisão do PR #1899). Ver o
corolário "caminho único para deploy de edge function" em `CLAUDE.md`
(REGRA #8) e as etapas E66/E67 de
`docs/plans/PLANO_CONSOLIDACAO_AUDITORIAS_100_ETAPAS_2026-09-24.md`.

**Caminho normal:** `.github/workflows/deploy-edge-functions.yml`
(`workflow_dispatch` com `function_name`, ou automático em `push` para `main`
tocando `supabase/functions/**`). Cada deploy bem-sucedido grava aqui uma
linha automaticamente (job `ledger` do mesmo workflow) e abre um PR com o
recibo — nunca commit direto em `main`.

**Deploy de emergência fora do fluxo (MCP/dashboard):** só sob as 3 condições
de `docs/db/POLITICA_EDGE_DEPLOY.md` (E73) — uma delas é registrar aqui
manualmente, no mesmo dia, com o método `emergência-MCP`.

## Recibos

| Data (UTC) | Slug | Versão | SHA (git) | Run | Executor | Método |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-25T06:08:52.597Z | `kit-ai-builder` | 288 | `a79944b53f436d428dab1ce9fb5984b31e79489f` | 36101511155 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-26T00:33:54.525Z | `check-login` | 125 | `4c0defd60ff826d70eb85f2b52e06b2ebc25f2b9` | 36205266158 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.279Z | `ai-recommendations` | 290 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.303Z | `expert-chat` | 259 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.328Z | `log-login-attempt` | 276 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.352Z | `magazine-public-react` | 40 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.377Z | `magazine-public-view` | 40 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.402Z | `magazine-reader-state-read` | 44 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.448Z | `magazine-reader-state-write` | 41 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.473Z | `receive-crm-callback` | 73 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.497Z | `semantic-search` | 269 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-09-27T11:58:11.558Z | `visual-search` | 272 | `7297c51db685883e0cd3401e06af79f3bdde2ccb` | 36315788137 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-10-01T12:02:29.052Z | `crm-db-bridge` | 298 | `de1c5f949145b77d60ed2460a743cd070c925472` | 36858924000 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-02T14:19:28.343Z | `secure-upload` | 277 | `6b2156c6604ba5c933c6c1c169bc73336efb003a` | 37018857101 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T16:35:55.840Z | `anonymize-user` | 1 | `95c1a1f4e2bee1ebcaa3d91b327f6e34d27c0515` | 37341833593 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:34:07.029Z | `anonymize-user` | 5 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37450487765 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-10-06T10:31:03.257Z | `ai-recommendations` | 292 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.285Z | `analyze-logo-colors` | 256 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.313Z | `anonymize-user` | 4 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.341Z | `asia-ingestion` | 122 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.369Z | `audit-suite` | 131 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.398Z | `backfill-image-dimensions` | 122 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.425Z | `bi-copilot` | 256 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.453Z | `bitrix-sync` | 262 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.480Z | `block-ip-temporarily` | 285 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.513Z | `bulk-random-passwords` | 226 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.542Z | `categories-api` | 277 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.572Z | `check-login` | 127 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.601Z | `cleanup-notifications` | 310 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.629Z | `cleanup-novelties` | 300 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.658Z | `cnpj-lookup` | 270 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.686Z | `collections-watcher` | 297 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.713Z | `commemorative-dates` | 284 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.741Z | `comparison-ai-advisor` | 276 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.769Z | `comparison-price-watcher` | 289 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.797Z | `connection-tester` | 281 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.826Z | `connections-auto-test` | 296 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.853Z | `connections-health-check` | 310 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.881Z | `connections-hub-audit` | 273 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.910Z | `cors-audit` | 271 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.938Z | `crm-callback-alerts` | 72 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.966Z | `crm-callback-reprocess` | 72 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:03.994Z | `crm-db-bridge` | 301 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.022Z | `detect-new-device` | 275 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.050Z | `dropbox-list` | 288 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.078Z | `e2e-cleanup` | 297 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.106Z | `elevenlabs-scribe-token` | 278 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.133Z | `elevenlabs-tts` | 272 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.161Z | `ema-pipeline-health` | 19 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.188Z | `expert-chat` | 261 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.216Z | `external-db-bridge` | 290 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.244Z | `external-db-inspect` | 287 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.272Z | `favorites-watcher` | 308 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.300Z | `force-global-logout` | 279 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.328Z | `full-op-diagnostics` | 263 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.356Z | `generate-ad-image` | 290 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.384Z | `generate-ad-prompt` | 279 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.412Z | `generate-blurhashes` | 118 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.439Z | `generate-mockup` | 265 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.466Z | `generate-product-seo` | 275 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.493Z | `get-visitor-info` | 277 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.521Z | `github-credentials-test` | 278 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.549Z | `hash-product-images` | 117 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.577Z | `health-check` | 274 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.604Z | `image-proxy` | 291 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.633Z | `intelligence-substitute-applied` | 29 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.662Z | `kit-ai-builder` | 290 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.690Z | `kit-identity-suggest` | 265 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.719Z | `load-test` | 182 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.748Z | `log-login-attempt` | 279 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.777Z | `magazine-import-local` | 44 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.806Z | `magazine-public-react` | 42 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.834Z | `magazine-public-view` | 42 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.862Z | `magazine-reader-state-read` | 46 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.891Z | `magazine-reader-state-write` | 43 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.919Z | `magic-up-score` | 273 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.947Z | `manage-users` | 269 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:04.974Z | `market-intelligence-insights` | 280 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.002Z | `materials-api` | 276 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.030Z | `mcp-keys-issue` | 276 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.057Z | `mcp-keys-revoke` | 280 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.085Z | `mcp-keys-rotate` | 272 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.113Z | `mcp-keys-update` | 281 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.141Z | `mcp-query` | 11 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.169Z | `mcp-server` | 301 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.197Z | `migrate-helper` | 18 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.225Z | `ownership-audit` | 296 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.254Z | `ownership-repair` | 278 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.281Z | `process-queue` | 299 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.309Z | `process-scheduled-reports` | 304 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.336Z | `product-visual-search` | 20 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.364Z | `product-webhook` | 267 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.391Z | `quote-followup-reminders` | 297 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.418Z | `quote-sync` | 267 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.445Z | `quote-sync-promo-champions` | 63 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.473Z | `rate-limit-check` | 274 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.501Z | `receive-crm-callback` | 75 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.529Z | `rls-audit` | 277 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.557Z | `rls-integration-tests` | 272 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.584Z | `rls-matrix-export` | 263 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.612Z | `secrets-manager` | 285 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.639Z | `secure-upload` | 280 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.667Z | `semantic-search` | 271 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.694Z | `send-digest` | 295 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.721Z | `send-notification` | 306 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.748Z | `send-scheduled-reports` | 301 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.775Z | `send-transactional-email` | 273 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.802Z | `simulation-orchestrator` | 209 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.829Z | `step-up-verify` | 276 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.856Z | `sync-external-db` | 251 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.884Z | `sync-quote-bitrix` | 279 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.913Z | `test-cart-concurrency` | 117 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.942Z | `test-cart-limit` | 118 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.970Z | `test-cart-rls` | 115 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:05.999Z | `test-contract-orchestrator` | 227 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.030Z | `test-inventory-orchestrator` | 223 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.058Z | `trends-insights` | 279 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.085Z | `validate-access` | 282 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.114Z | `verify-2fa-token` | 187 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.141Z | `verify-email` | 272 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.169Z | `visual-search` | 273 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.197Z | `voice-agent` | 278 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.225Z | `webhook-dispatcher` | 305 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.254Z | `webhook-inbound` | 299 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-06T10:31:06.282Z | `word-magic` | 123 | `f5b007542b6fc99df78c8606ac3e92416c068b0f` | 37449001108 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.088Z | `ai-recommendations` | 291 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.112Z | `analyze-logo-colors` | 256 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.137Z | `anonymize-user` | 3 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.160Z | `asia-ingestion` | 121 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.188Z | `audit-suite` | 130 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.213Z | `backfill-image-dimensions` | 121 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.237Z | `bi-copilot` | 255 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.260Z | `bitrix-sync` | 261 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.282Z | `block-ip-temporarily` | 284 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.304Z | `bulk-random-passwords` | 225 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.326Z | `categories-api` | 276 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.348Z | `check-login` | 126 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.370Z | `cleanup-notifications` | 309 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.391Z | `cleanup-novelties` | 299 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.414Z | `cnpj-lookup` | 269 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.437Z | `collections-watcher` | 296 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.471Z | `commemorative-dates` | 283 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.495Z | `comparison-ai-advisor` | 275 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.518Z | `comparison-price-watcher` | 288 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.543Z | `connection-tester` | 280 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.567Z | `connections-auto-test` | 295 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.591Z | `connections-health-check` | 309 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.615Z | `connections-hub-audit` | 272 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.638Z | `cors-audit` | 270 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.664Z | `crm-callback-alerts` | 71 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.686Z | `crm-callback-reprocess` | 71 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.707Z | `crm-db-bridge` | 300 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.729Z | `detect-new-device` | 274 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.750Z | `dropbox-list` | 287 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.770Z | `e2e-cleanup` | 296 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.791Z | `elevenlabs-scribe-token` | 277 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.811Z | `elevenlabs-tts` | 271 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.833Z | `ema-pipeline-health` | 18 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.855Z | `expert-chat` | 260 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.877Z | `external-db-bridge` | 289 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.899Z | `external-db-inspect` | 286 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.956Z | `favorites-watcher` | 307 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:36.977Z | `force-global-logout` | 278 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.000Z | `full-op-diagnostics` | 262 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.022Z | `generate-ad-image` | 289 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.045Z | `generate-ad-prompt` | 278 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.069Z | `generate-blurhashes` | 117 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.093Z | `generate-mockup` | 264 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.142Z | `generate-product-seo` | 274 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.181Z | `get-visitor-info` | 277 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.210Z | `github-credentials-test` | 277 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.231Z | `hash-product-images` | 117 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.253Z | `health-check` | 273 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.303Z | `image-proxy` | 290 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.334Z | `intelligence-substitute-applied` | 28 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.463Z | `kit-ai-builder` | 289 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.684Z | `kit-identity-suggest` | 264 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.890Z | `load-test` | 181 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:37.982Z | `log-login-attempt` | 278 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.099Z | `magazine-import-local` | 43 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.190Z | `magazine-public-react` | 41 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.291Z | `magazine-public-view` | 41 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.401Z | `magazine-reader-state-read` | 45 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.519Z | `magazine-reader-state-write` | 42 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.650Z | `magic-up-score` | 272 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.768Z | `manage-users` | 268 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:38.890Z | `market-intelligence-insights` | 279 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.008Z | `materials-api` | 275 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.138Z | `mcp-keys-issue` | 275 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.257Z | `mcp-keys-revoke` | 279 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.376Z | `mcp-keys-rotate` | 271 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.496Z | `mcp-keys-update` | 280 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.616Z | `mcp-query` | 10 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.735Z | `mcp-server` | 300 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.854Z | `migrate-helper` | 17 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:39.974Z | `ownership-audit` | 295 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.094Z | `ownership-repair` | 277 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.216Z | `process-queue` | 298 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.334Z | `process-scheduled-reports` | 303 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.393Z | `product-visual-search` | 19 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.421Z | `product-webhook` | 266 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.464Z | `quote-followup-reminders` | 296 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.495Z | `quote-sync` | 266 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.523Z | `quote-sync-promo-champions` | 62 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.552Z | `rate-limit-check` | 273 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.582Z | `receive-crm-callback` | 74 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.604Z | `rls-audit` | 276 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.631Z | `rls-integration-tests` | 271 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.682Z | `rls-matrix-export` | 262 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.734Z | `secrets-manager` | 284 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.761Z | `secure-upload` | 279 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.790Z | `semantic-search` | 270 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.832Z | `send-digest` | 294 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.859Z | `send-notification` | 305 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:40.992Z | `send-scheduled-reports` | 300 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.020Z | `send-transactional-email` | 272 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.052Z | `simulation-orchestrator` | 208 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.081Z | `step-up-verify` | 275 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.121Z | `sync-external-db` | 250 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.150Z | `sync-quote-bitrix` | 278 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.181Z | `test-cart-concurrency` | 116 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.211Z | `test-cart-limit` | 117 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.239Z | `test-cart-rls` | 114 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.267Z | `test-contract-orchestrator` | 226 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.288Z | `test-inventory-orchestrator` | 222 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.309Z | `trends-insights` | 278 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.350Z | `validate-access` | 281 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.380Z | `verify-2fa-token` | 186 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.408Z | `verify-email` | 271 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.439Z | `visual-search` | 273 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.477Z | `voice-agent` | 277 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.508Z | `webhook-dispatcher` | 304 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.531Z | `webhook-inbound` | 298 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T22:16:41.629Z | `word-magic` | 122 | `bbb84978209432d355c54232845d4399f6beefae` | 37380000049 | GitHub Actions (disparado por adm01-debug) | push |
| 2026-10-05T21:52:36.596Z | `anonymize-user` | 2 | `7d4d0a42ff6f85e86ff8c1e565661a4b231980bb` | 37378673430 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-10-05T21:50:31.138Z | `secure-upload` | 278 | `7d4d0a42ff6f85e86ff8c1e565661a4b231980bb` | 37378442614 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-10-05T21:48:13.285Z | `validate-access` | 280 | `7d4d0a42ff6f85e86ff8c1e565661a4b231980bb` | 37378208159 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |
| 2026-10-05T21:46:07.335Z | `check-login` | 126 | `7d4d0a42ff6f85e86ff8c1e565661a4b231980bb` | 37377946904 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |

## Retro-registro (casos anteriores a este ledger, E67)

| Data | Slug | Versão | Como foi descoberto | Reconciliação |
| --- | --- | --- | --- | --- |
| 2026-09-23 | `kit-ai-builder` | v285 | Job "Compare GitHub × Canonical" (drift check) — timeout de 20s presente em produção sem commit correspondente | Reconciliado em `7899b0254`, trazendo o timeout para o git |
| 2026-09-24 | `magazine-reader-state-read` | v39–v42 | Job "Compare GitHub × Canonical" (drift check) no PR #1899 — fix de segurança fail-open deployado via MCP antes de qualquer revisão | Reconciliado em `558b30daf` (git) + `workflow_dispatch` run 36015927545 (deploy oficial, byte-idêntico ao git) |
