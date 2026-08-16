# 07 — EDGE FUNCTIONS (`supabase/functions/`)

> **Auditoria de estado — somente leitura, baseada em código medido.**
> Data da medição: 2026-08-16. Fonte: **apenas** o conteúdo de `supabase/functions/`,
> `src/`, `supabase/migrations/`, `supabase/cron/`, `scripts/`, `.github/`, `e2e/`.
> Nenhum `.md`, README ou STATUS foi usado como fonte de verdade.
> Toda afirmação tem evidência `caminho:LINHA`. Onde não houve evidência → `NAO_VERIFICADO` ou 🟦.

---

## 0. CONTAGEM REAL DO ESCOPO (correção do enunciado)

O briefing informava "108 entradas (107 funções + `_shared`)". A medição contradiz:

```
$ ls -d supabase/functions/*/ | wc -l          → 106
$ ls supabase/functions/*/index.ts | wc -l     → 104
$ for d in supabase/functions/*/; do [ -f "$d/index.ts" ] || basename "$d"; done
  _shared
  tests
$ ls -p supabase/functions/ | grep -v /
  README.md
  deno.json
```

**108 entradas = 104 funções + `_shared` + `tests` + `README.md` + `deno.json`.**
O número real de edge functions é **104**, não 107.

**COBERTURA: Funções no escopo: 104. Inspecionadas: 104.**
Todas as 104 foram cobertas em profundidade nos 5 eixos exigidos (o-que-faz / quem-chama /
env / integração externa / auth). Nenhuma ficou em nível raso.

---

## 0.1 CAMADA DE AUTORIZAÇÃO DO GATEWAY (`supabase/config.toml`)

Fato medido que muda a leitura de **toda** a tabela: `supabase/config.toml:1-155` lista
**apenas 39 funções** com `verify_jwt = false`. As **65 restantes** caem no default
`verify_jwt = true` do gateway Supabase.

⚠️ **Ressalva de segurança (não é opinião — é como o gateway funciona):** `verify_jwt = true`
aceita **qualquer JWT válido do projeto, inclusive a `anon key` pública**. Portanto
`verify_jwt = true` **não** é autorização de usuário. Funções sem checagem in-code estão
efetivamente abertas a qualquer um que possua a anon key (que é pública por definição, embutida
no bundle do front). Isso é a base da seção C.

Funções com `verify_jwt = false` explícito (`supabase/config.toml`):
`crm-db-bridge:3`, `ai-recommendations:6`, `external-db-inspect:9`, `image-proxy:12`,
`webhook-dispatcher:15`, `webhook-inbound:18`, `mcp-server:21`, `connections-auto-test:24`,
`e2e-cleanup:27`, `get-visitor-info:32`, `cleanup-notifications:39`, `cleanup-novelties:42`,
`collections-watcher:45`, `comparison-price-watcher:48`, `connections-health-check:51`,
`favorites-watcher:54`, `ownership-audit:57`, `process-queue:60`, `process-scheduled-reports:63`,
`quote-followup-reminders:66`, `send-digest:69`, `send-notification:72`,
`send-scheduled-reports:75`, `sync-external-db:78`, `log-login-attempt:81`, `check-login:84`,
`asia-ingestion:87`, `backfill-image-dimensions:90`, `receive-crm-callback:95`,
`crm-callback-reprocess:99`, `crm-callback-alerts:103`, `magazine-public-view:129`,
`magazine-public-react:133`, `magazine-reader-state-read:137`,
`magazine-reader-state-write:141`, `magazine-import-local:148`.
Com `verify_jwt = true` explícito: `word-magic:106`, `generate-mockup:112`, `analyze-logo-colors:115`.

---

## 0.2 CRONS — O QUE FOI POSSÍVEL PROVAR NO REPO

23 funções chamam `authorizeCron(...)` com header `x-cron-secret`. Mas o registro do job
**só existe no repo para 10 endpoints**:

```
$ grep -rhno "functions/v1/[a-z0-9-]*" supabase/migrations/ supabase/cron/ | sed 's/.*v1\///' | sort | uniq -c | sort -rn
      9 connections-auto-test
      6 webhook-dispatcher
      4 external-db-bridge      ← keepalive de uma função HOJE descomissionada (410)
      1 send-digest
      1 process-queue
      1 log-login-attempt       ← DRAFT COMENTADO, não aplicado
      1 hash-product-images
      1 generate-blurhashes
      1 cleanup-notifications
      1 backfill-image-dimensions
```

`grep -rn "cron.schedule" supabase/migrations/ supabase/cron/` não retorna job algum para
`cleanup-novelties`, `collections-watcher`, `comparison-price-watcher`,
`connections-health-check`, `favorites-watcher`, `ownership-audit`,
`process-scheduled-reports`, `quote-followup-reminders`, `send-notification`,
`send-scheduled-reports`, `sync-external-db`, `asia-ingestion`.

➡️ Para essas 12, o **caminho de execução cron existe no código** (`authorizeCron`), mas o
**agendamento não é auditável a partir do repo**. Ele pode existir só na instância viva.
Classificação: **🟨** com nota `cron NAO_VERIFICADO (não registrado em migration)`.
Isso é o método exigido: não invento chamador que não consigo provar.

---

## A. TABELA MESTRA — 104 FUNÇÕES

Legenda de auth: `authenticateRequest` = `_shared/auth.ts`; `authorizeCron` = `_shared/dispatcher-auth.ts`;
`authorize()` = `_shared/authorize.ts`; `getUser()` = validação JWT inline.
Env: `SB` = `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (ambiente injetado pela plataforma).
Credenciais marcadas `[vault]` vêm de `_shared/credentials.ts` (tabela `integration_credentials`), não de `Deno.env`.

| # | Função | O que faz (lido do código) | Chamadores (arquivo:linha) | Env / segredos | Integração externa | Auth | Classe |
|---|---|---|---|---|---|---|---|
| 1 | **ai-recommendations** | Recomendações por IA; POST no gateway Lovable | `src/hooks/intelligence/useAIRecommendations.ts:168` (fetch direto) | `LOVABLE_API_KEY` [vault] | `ai.gateway.lovable.dev/v1/chat/completions` (`index.ts:10`) | `authenticateRequest` `:37` | ✅ |
| 2 | **analyze-logo-colors** | Extrai paleta de cores de logo por URL, com guarda SSRF | `src/hooks/simulation/useLogoColorAnalysis.ts:85` | — | fetch de URL pública validada (`:73`) | `authenticateRequest` `:33` + gateway `verify_jwt=true` (`config.toml:115`) | ✅ |
| 3 | **asia-ingestion** | Sync paginado do catálogo ASIA para Bronze | cron (código `:88`); **nenhum registro no repo** | `ASIA_BASE_URL:11`, `SB:7-8`, `ASIA_INGESTION_CRON_SECRET`, `ASIA_SUPPLIER_ID` [vault] | `asia.ajung.site` (`:11`) | `authorizeCron` `:88-91` | 🟨 cron NAO_VERIFICADO |
| 4 | **audit-suite** | **Cria usuários reais** via `auth.admin.createUser`, insere em `user_roles`/`seller_carts`/`seller_cart_items` e roda cenários de auditoria | `src/components/audit/AuditReport.tsx:32`; `src/pages/Simulation.tsx:60` | `SB:8-10`, `SUPABASE_ANON_KEY:9` | — | ❌ **NENHUMA** (`:28` → service_role `:36`) | 🟨 **achado grave** |
| 5 | **backfill-image-dimensions** | Baixa 32KB de cada imagem (Range), extrai width/height/file_size | cron `supabase/migrations/20260617000005_fix_backfill_dim_cron_add_auth_header.sql:23-27` | `SB:10-11`, `BACKFILL_DIM_CRON_SECRET` | CDNs de imagem dos fornecedores | `authorizeCron` `:123-126` | ✅ |
| 6 | **bi-copilot** | "Pergunte ao BI" — NL→resposta via Lovable AI | `src/components/bi/BIAiCopilot.tsx:112` | `LOVABLE_API_KEY:23` | `ai.gateway.lovable.dev` (`:90`) | `authenticateRequest:47` + `requireRole('agente'):48` | ✅ |
| 7 | **bitrix-sync** | Sync de entidades no CRM Bitrix24 externo | ❌ nenhum (só breadcrumb de rota `src/components/navigation/Breadcrumbs.tsx:56`) | `BITRIX24_WEBHOOK_URL:12` [vault], `SB:35-36` | webhook Bitrix24 (URL do vault) | `authorize(requireRole:'supervisor')` `:47` | 🟦 |
| 8 | **block-ip-temporarily** | Bloqueia IP temporariamente | `src/components/admin/security/BlockIpButton.tsx:48` | `SB:31-32`, `SUPABASE_ANON_KEY:33` | — | `getUser()` `:42` + `has_role` inline | ✅ |
| 9 | **bulk-random-passwords** | Reset em lote de senhas via `auth.admin` | ❌ nenhum (front/cron/CI vazios) | `ADMIN_BATCH_TOKEN:108`, `SB:125-126` | — | `x-admin-token` timing-safe `:118` | 🟦 |
| 10 | **categories-api** | Catálogo de categorias (proxy ao Supabase externo) | `src/hooks/products/useProductsByCategory.ts:97,199` | `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY:53` [vault] | Supabase externo PromoBrindes | `authenticateRequest` `:38` | ✅ |
| 11 | **check-login** | Checagem pré-login (IP/cidade/lockout) antes de `signIn()` | ❌ nenhum caller no `src/` | `SB:66-67` | — | ❌ nenhuma (público por design, `config.toml:84`) | 🟦 |
| 12 | **cleanup-notifications** | Purga notificações antigas | cron `supabase/cron/cron-config.sql:56` | `SB:34-35`, `CRON_SECRET` | — | `authorizeCron` `:25` | ✅ |
| 13 | **cleanup-novelties** | Expira flags `is_new` de produtos | cron (código `:13`); sem registro no repo | `SB:26-27`, `CRON_SECRET:15` | — | `authorizeCron` `:13-16` | 🟨 cron NAO_VERIFICADO |
| 14 | **cnpj-lookup** | Consulta CNPJ na API CNPJá | `src/utils/cnpj-lookup.ts:28` ← `useSuppliersManager.ts:12`, `useNewSupplierForm.ts:10` | `CNPJA_API_KEY` [vault], `SIMULATION_BYPASS_KEY:31`, `ENVIRONMENT:47`, `SUPABASE_DB_URL:48` | `api.cnpja.com/office/` (`:89`) | `authenticateRequest` `:29` | ✅ |
| 15 | **collections-watcher** | Cron: detecta queda de preço em coleções → `workspace_notifications` | cron (código `:37`); sem registro no repo | `SB:46-47`, `CRON_SECRET:39` | — | `authorizeCron` `:37-40` | 🟨 cron NAO_VERIFICADO |
| 16 | **commemorative-dates** | Calendário comemorativo + produtos do Supabase externo | `src/hooks/intelligence/useCommemorativeDates.ts:63` | `EXTERNAL_SUPABASE_URL/SERVICE_KEY:7`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY:64` [vault] | Supabase externo | `getUser()` `:44` | ✅ |
| 17 | **comparison-ai-advisor** | 3-5 bullets + `bestFor` sobre produtos comparados (IA) | `src/components/compare/AIComparisonAdvisor.tsx:93` | `LOVABLE_API_KEY` [vault] | `ai.gateway.lovable.dev` (`:105`) | `authenticateRequest:72` + `requireRole:73` | ✅ |
| 18 | **comparison-price-watcher** | Cron: queda >5%/7d em produtos comparados → notificação | cron (código `:32`); sem registro no repo | `SB:40-41`, `CRON_SECRET:34` | — | `authorizeCron` `:32-35` | 🟨 cron NAO_VERIFICADO |
| 19 | **connection-tester** | Ping manual de sistemas externos; delega a `_shared/connection-test-runner.ts` | `src/hooks/intelligence/useConnectionTester.ts:65,147`; `useConnectionTestHistory.ts:50` | `SB:60-62` | endpoints das conexões cadastradas | header `Authorization` `:54` + `is_dev()` inline | ✅ |
| 20 | **connections-auto-test** | Cron 15min: re-testa todas as conexões ativas, grava `connection_test_history` | cron `supabase/migrations/20260619210000_fix_cron_connections_auto_test_canonical_url.sql`; `20260601140100_...sql:12-16` | `SB:140-141`, `CONNECTIONS_AUTO_TEST_SECRET` | endpoints das conexões | `authorizeCron` `:130-133` | ✅ |
| 21 | **connections-health-check** | Cron: transições active→error, webhooks auto-desabilitados, segredos >90d | cron (código `:66`); sem registro no repo | `SB:75-76`, `CRON_SECRET:68` | endpoints das conexões | `authorizeCron` `:66-69` | 🟨 cron NAO_VERIFICADO |
| 22 | **connections-hub-audit** | Auditoria do Hub: tabelas, edges, crons, triggers → score 0-10 | `src/components/admin/connections/IntegrationsHealthCard.tsx:270` | `SB:73-74,164` | — | `authenticateRequest`+`requireDev` `:81` | ✅ |
| 23 | **cors-audit** | Devolve a config CORS de todas as edges (diagnóstico) | ❌ nenhum caller (só `scripts/build-cors-snapshot.mjs:16` como comentário) | — | — | `authorize({requireRole:'dev'})` `:110` | 🟦 |
| 24 | **crm-callback-alerts** | Varre `crm_callback_events`, aplica thresholds de `system_settings`, dispara alerta Sentry | ❌ nenhum (cron "recomendado" só em comentário `:93`) | `SB:104-105`, `SENTRY_DSN_SERVER:172` | Sentry (`:60`, `:64`) | ❌ **NENHUMA** + `verify_jwt=false` (`config.toml:103`) | 🟨 **achado grave** |
| 25 | **crm-callback-reprocess** | Reprocessa dead-letters de `crm_callback_events` | `src/hooks/admin/useV4Callbacks.ts:194,211` | `SB:89-91` | — | `Authorization` `:85` + `getUser` + role admin/dev | ✅ |
| 26 | **crm-db-bridge** | Ponte RPC/CRUD para o Supabase do CRM externo, com circuit breaker + rate-limit por userId | `src/lib/telemetry/requestId.ts` (invoke); `src/components/admin/telemetry/BreakerStatusCard.tsx:45`; `ColdVsWarmCrmCard.tsx:47`; e2e `e2e/carrinhos/header-reflects-active-cart.spec.ts:37` | `SB:45-46`, `SUPABASE_ANON_KEY:328`, `LOG_CRM_BRIDGE_VERBOSE:689`, `EXTERNAL_CRM_*` [vault] `:19,82,172` | Supabase do CRM externo | `authenticateRequest` local `:321` chamado em `:643` | ✅ |
| 27 | **detect-new-device** | Grava `user_known_devices`, `device_login_notifications`, `workspace_notifications` para o `userId` **vindo do body** | `src/hooks/admin/useDeviceDetection.ts:97` | `SB:33-34` | — | ❌ **NENHUMA** (`:26` → service_role `:35`) | 🟨 **achado grave** |
| 28 | **dropbox-list** | Lista arquivos/pastas no Dropbox com paginação por cursor | `src/hooks/intelligence/useDropboxFiles.ts:30,47` | `DROPBOX_ACCESS_TOKEN` [vault] | `api.dropboxapi.com/2/files/list_folder(/continue)` (`:66`,`:76`) | `authenticateRequest:20` + `requireRole:21` | ✅ |
| 29 | **e2e-cleanup** | Apaga dados criados por usuários de teste E2E | `e2e/helpers/cleanup-client.ts:2`; `e2e/helpers/e2e-resources.ts:6` | `E2E_CLEANUP_TOKEN:48`, `E2E_CLEANUP_ALLOWED_EMAILS:49`, `E2E_CLEANUP_RATE_LIMIT_MAX:53`, `..._WINDOW_SECONDS:54`, `SB:46-47` | — | token dedicado `:48` + allowlist de e-mails `:49` + 401 `:80` | ✅ |
| 30 | **elevenlabs-scribe-token** | Emite token de uso único para o Scribe realtime | `src/hooks/voice/scribeTokenCache.ts:43` | `ELEVENLABS_API_KEY` [vault] | `api.elevenlabs.io/v1/single-use-token/realtime_scribe` (`:43`) | `authenticateRequest` `:19` | ✅ |
| 31 | **elevenlabs-tts** | Text-to-speech | `src/hooks/voice/playTtsAudio.ts:110` | `ELEVENLABS_API_KEY` [vault] | `api.elevenlabs.io/v1/text-to-speech/` (`:78`) | `authenticateRequest` `:35` | ✅ |
| 32 | **expert-chat** | Maior função do repo (1467 linhas): chat especialista com tool-calling, consulta CRM e catálogo externo, streaming | `src/components/ai/AIChat.tsx:196`; `src/components/expert/chat/useExpertChat.ts:508` | `LOVABLE_API_KEY`, `EXTERNAL_CRM_SERVICE_ROLE_KEY:729`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY:1009` [vault] | `ai.gateway.lovable.dev` (`:168`) | `authenticateRequest` `:602` | ✅ |
| 33 | **external-db-bridge** | **Stub 410 Gone.** Retorna `endpoint_decommissioned` para todo request | `src/lib/external-rpc.ts:4`, `src/hooks/products/useCategoriesTree.ts:66`, `useColorSystem.ts:35`, `useExternalCategoriesQuery.ts:3`, `src/components/admin/products/kit-components/api.ts:4` — **todos comentários de migração "to REST native"**; cron keepalive `supabase/migrations/20260424154125_...sql:12-20` ainda aponta pra cá | — | — | ❌ nenhuma (`index.ts:18`) — irrelevante, nada executa | ⬛ **MORTO** |
| 34 | **external-db-inspect** | Inspeciona schema/colunas do BD externo (modo `columns`) | `src/hooks/intelligence/useExternalDbInspect.ts:34`; `src/pages/admin/AdminExternalDbPage.tsx:97` | `SUPABASE_URL:43`, `SUPABASE_ANON_KEY:44` | BD externo | `getUser()` `:49` + `is_dev` | ✅ |
| 35 | **favorites-watcher** | Cron: queda de preço em favoritos → `workspace_notifications` | cron (código `:37`); sem registro no repo | `SB:46-47`, `CRON_SECRET:39` | — | `authorizeCron` `:37-40` | 🟨 cron NAO_VERIFICADO |
| 36 | **force-global-logout** | Revoga todas as sessões do próprio usuário | `src/components/admin/security/ForceGlobalLogoutDialog.tsx:30` | `SB:28-29`, `SUPABASE_ANON_KEY:30` | — | `getUser()` `:40` | ✅ |
| 37 | **full-op-diagnostics** | Diagnóstico read-only de 4 RPCs (`is_dev`, `can_grant_mcp_full`, `validate_mcp_key`, introspect step-up) | `src/components/admin/security/keys/diagnostics/FullOpDiagnosticsPanel.tsx:118` | `SB:62-64` | — | `getUser()` `:72`, 401 `:74`, RPC `is_dev` `:97` | ✅ |
| 38 | **generate-ad-image** | Gera imagem de anúncio (Magic-Up) | `src/hooks/intelligence/useMagicUpGeneration.ts:166` | via `requireAiApiKey('generate-ad-image')` [vault] | gateway de IA (roteado por `ai_function_routing`) | `authenticateRequest` `:54` | ✅ |
| 39 | **generate-ad-prompt** | Gera prompts criativos para anúncio | `src/components/magic-up/PromptGenerator.tsx:181` | via `requireAiApiKey('generate-ad-prompt')` [vault] | gateway de IA | `authenticateRequest` `:15` | ✅ |
| 40 | **generate-blurhashes** | Calcula blurhash 32×32 de imagens verificadas (JPEG/PNG/WebP/GIF) | cron `supabase/migrations/20260617000003_generate_blurhashes_cron.sql:39-43` | `SB:22-23`, `GENERATE_BLURHASHES_CRON_SECRET:169` | CDNs de imagem | `authorizeCron` `:167-170` | ✅ |
| 41 | **generate-mockup** | Compositor de mockup determinístico em canvas (rota IA removida) | `src/hooks/mockup/mockupGenerationService.ts:368` | `MOCKUP_FETCH_ALLOWED_HOSTS:124`, `SB:473-474` | fetch de imagens em hosts allowlistados | `authenticateRequest` `:351` + gateway `verify_jwt=true` (`config.toml:112`) | ✅ |
| 42 | **generate-product-seo** | Gera título/descrição SEO de produto | `src/hooks/products/useProductSeoAI.ts:54` | `requireAiApiKey('generate-product-seo')` [vault] | gateway de IA | `authenticateRequest` `:15` | ✅ |
| 43 | **get-visitor-info** | Retorna IP + cidade + país do visitante (geo server-side) | `src/hooks/admin/useIPValidation.ts:21`; `src/pages/auth/Auth.tsx:166` | — | `http://ip-api.com/json/` (`:31`) — ⚠️ **HTTP puro, não HTTPS** | apenas `runBotProtection` `:11-16` (30 req/60s) | 🟨 |
| 44 | **github-credentials-test** | Valida `GITHUB_TOKEN`/`REPO`/`DEFAULT_BRANCH` na API do GitHub | `src/components/admin/connections/GitHubCredentialsTester.tsx:48` | `SB:56-58` | `api.github.com/user` (`:103`), `/repos/` (`:161`,`:226`) | `getUser()` `:63` + `is_dev` | ✅ |
| 45 | **hash-product-images** | SHA-256 hex de cada `product_image` (download completo) | cron `supabase/migrations/20260617000002_hash_product_images_cron.sql:38-42` | `SB:14-15`, `HASH_PRODUCT_IMAGES_CRON_SECRET:75` | CDNs de imagem | `authorizeCron` `:73-76` | ✅ |
| 46 | **health-check** | Sonda `products`/`profiles` + credenciais externas; snapshot cacheado, `X-Health-Version` | `scripts/observability-check.mjs:143-150` (só se env configurado) | `SB:28-29`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY:42` [vault] | Supabase externo | ❌ nenhuma (`:166`) — aceitável: read-only | 🟨 |
| 47 | **image-proxy** | Proxy CORS de imagens de fornecedores com allowlist de domínio | `src/utils/imageProxy.ts:77` ← `src/components/products/ProductCardImage.tsx:211` | `IMAGE_PROXY_ALLOW_LOCALHOST:48`, `IMAGE_PROXY_MAX_BYTES:129` | CDNs dos fornecedores (allowlist `:1-10`) | `runBotProtection` `:71` + 403 `:83`,`:110`; `verify_jwt=false` (`config.toml:12`) | ✅ |
| 48 | **intelligence-substitute-applied** | Espelha evento `intelligence.substitute_applied` em `ai_usage_events` | `src/lib/analytics/intelligenceAnalytics.ts:17` (`MIRROR_FN`), invocado em `:163` | — | — | `authenticateRequest` `:69` | ✅ |
| 49 | **kit-ai-builder** | Prompt natural → sugestão estruturada de kit | `src/components/kit-builder/KitAIPromptDialog.tsx:47` | `LOVABLE_API_KEY` [vault] | `ai.gateway.lovable.dev` (`:57`) | `authenticateRequest:26` + `requireRole:27` | ✅ |
| 50 | **kit-identity-suggest** | Sugere tag + cor hex + ícone lucide para o kit (tool-calling) | `src/hooks/kit-builder/useKitIdentitySuggestion.ts:33` | `LOVABLE_API_KEY` [vault] | `ai.gateway.lovable.dev` (`:89`) | ⚠️ **apenas `runBotProtection` `:45`** — sem JWT, mas **gasta crédito de IA** | 🟨 |
| 51 | **load-test** | Dispara N requests concorrentes contra `targetEndpoint` arbitrário usando a **service_role key** no header | `supabase/functions/tests/shockwave-load-test.ts:14` (teste) | `SUPABASE_URL:43`, `SUPABASE_SERVICE_ROLE_KEY:66` | qualquer endpoint passado no body | ❌ **NENHUMA** (`:11`) | 🟨 **achado grave** |
| 52 | **log-login-attempt** | Registra tentativa de login em `login_attempts` (contrato "nunca-5xx") | `src/contexts/AuthContext.tsx:365`; `src/hooks/admin/useIPValidation.ts:176` | `SB:108,156` | — | `applyRateLimit` `:117`; sem JWT (`config.toml:81`) — intencional (pré-login) | ✅ |
| 53 | **magazine-import-local** | Migra revistas de `localStorage` → Gold (`magazines`/`magazine_items`) | `src/pages/magazine/hooks/useMagazineGoldImport.ts:35` | `SUPABASE_URL`,`SUPABASE_ANON_KEY:65` | — | `getUser()` `:68` (gateway em false por HS256, `config.toml:148`) | ✅ |
| 54 | **magazine-public-react** | Reações anônimas (like/love/fire/idea) por `public_token` | ❌ nenhum caller no `src/` | `MAGAZINE_IP_SALT:29`, `SB:63` | — | token público `:66` → 401 `:68`; `verify_jwt=false` | 🟦 |
| 55 | **magazine-public-view** | Único caminho de leitura pública de revista por `public_token` | `src/services/magazineService.ts:198`; e2e `e2e/flows/magazine-smoke.spec.ts:38,62` | `MAGAZINE_IP_SALT:35`, `SB:80` | — | token público + service_role `:80`; `verify_jwt=false` | ✅ |
| 56 | **magazine-reader-state-read** | GET de bookmarks/última-página do leitor anônimo | `src/pages/magazine/hooks/useMagazineReaderState.ts:50,269` | `SB:62` | — | token + `magazine_token_hash` SHA-256 `:64`; `verify_jwt=false` | ✅ |
| 57 | **magazine-reader-state-write** | Upsert (debounced) de bookmarks/última-página | `src/pages/magazine/hooks/useMagazineReaderState.ts:51,337` | `SB:58` | — | token + hash `:60`, 401 `:70`; `verify_jwt=false` | ✅ |
| 58 | **magic-up-score** | Diagnóstico de qualidade criativa (score) | `src/hooks/intelligence/useMagicUpGeneration.ts:100` | `requireAiApiKey('magic-up-score')` [vault] | gateway de IA | `authenticateRequest` `:52` | ✅ |
| 59 | **manage-users** | Promove/rebaixa role, gestão de usuários (dev>supervisor>vendedor) | `src/components/admin/users/useUserManagement.ts:129,158`; `PromotionDialog.tsx:82` | `SB:78-79`, `SUPABASE_ANON_KEY:88` | — | `getUser()` `:92` + `has_role` inline | ✅ |
| 60 | **market-intelligence-insights** | Insights de IA do dashboard Market Intelligence; cache server-side + quota | `src/components/intelligence/MarketIntelligenceInsightsCard.tsx:145` | `LOVABLE_API_KEY` [vault] | `ai.gateway.lovable.dev` (`:333`) | `authenticateRequest` `:260` | ✅ |
| 61 | **materials-api** | Catálogo de materiais (proxy ao Supabase externo) | `src/services/materialService.ts:58` | `SUPABASE_URL:29`, `SUPABASE_ANON_KEY:30`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY:50` [vault] | Supabase externo | ⚠️ **JWT decorativo**: `:25-33` valida e só faz `console.log`; resultado nunca usado como gate | 🟨 |
| 62 | **mcp-keys-issue** | Emite chave MCP (escopos, TTL); gate extra `mcp_full_grantors` p/ FULL | `src/components/admin/connections/IssueMcpKeyForm.tsx:117`; `src/contexts/DevChallengeContext.tsx:13`; `src/lib/security/sanitize-error.ts:91` | `SB:40-41`, `SUPABASE_ANON_KEY:42` | — | `Authorization` `:193` + `getUser` `:203` + `has_role` + `step_up_token` `:58`, gate FULL `:270` | ✅ |
| 63 | **mcp-keys-revoke** | Revoga chave MCP com auditoria IP/UA/request_id | `src/components/admin/connections/McpTab.tsx:91`; `src/components/admin/security/keys/useMcpKeys.ts:254` | `SB:21-22`, `SUPABASE_ANON_KEY:23` | — | `Authorization` `:92` + step-up `:29` | ✅ |
| 64 | **mcp-keys-rotate** | Duplica chave preservando nome/escopos/expiração | `src/components/admin/security/keys/RotateMcpKeyDialog.tsx:80`; `src/pages/admin/DevChallengeExamplesPage.tsx:100` | `SB:28-29`, `SUPABASE_ANON_KEY:30` | — | `Authorization` `:109` + step-up `:37` | ✅ |
| 65 | **mcp-keys-update** | Atualiza name/description/scopes/expires_at | `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx:187`; `src/pages/admin/DevChallengeExamplesPage.tsx:153` | `SB:28-29`, `SUPABASE_ANON_KEY:30` | — | `Authorization` `:107` + step-up `:45` | ✅ |
| 66 | **mcp-server** | Servidor MCP p/ Claude Desktop; cada tool declara `{scope,mode}` e é auditada | `src/components/admin/connections/McpTab.tsx:39` (URL exposta ao operador); clientes MCP externos | `SB:26-27` | clientes MCP externos (entrada) | `x-mcp-key` `:125` → RPC `validate_mcp_key` `:131` → `authorizeTool` `:173`/`:227`; `verify_jwt=false` (`config.toml:21`) | ✅ |
| 67 | **ownership-audit** | Varredura de registros órfãos (RPC com service_role) | `src/pages/admin/OwnershipAuditAdminPage.tsx:101`; cron (código `:28`) sem registro no repo | `SB:36-37`, `CRON_SECRET:30` | — | `authorizeCron` `:28-30` | ✅ (front) / cron NAO_VERIFICADO |
| 68 | **ownership-repair** | Repara órfãos do último relatório, com dry-run | `src/components/admin/OwnershipRepairDialog.tsx:97` | `SUPABASE_URL:33`, `SUPABASE_ANON_KEY:34` | — | `getUser()` `:45` + 401 `:46`; RPC valida `has_role` | ✅ |
| 69 | **process-queue** | Drena fila de notificações (RPCs `process_notifications_queue`) | cron `supabase/cron/cron-config.sql:18` | `SB:20-21`, `CRON_SECRET:11` | — | `authorizeCron` `:11` | ✅ |
| 70 | **process-scheduled-reports** | Processa relatórios agendados e envia e-mail | cron (código `:12`); sem registro no repo | `SB:20-21`, `RESEND_API_KEY` [vault] | `api.resend.com/emails` (`:99`) | `authorizeCron` `:12` | 🟨 cron NAO_VERIFICADO |
| 71 | **product-webhook** | Recebe lote de produtos do n8n e faz upsert por `external_id`; nonce anti-replay | webhook externo (n8n); contrato em `scripts/contract-testing.mjs:53`; migration `20260524202328_products_external_id_and_unique_keys.sql:7` | `SB:14-15`, `PRODUCT_WEBHOOK_BATCH_SIZE:16`, `PRODUCT_WEBHOOK_ALLOWED_ORIGINS:35`, `N8N_PRODUCT_WEBHOOK_SECRET` + `..._TOLERANCE_SEC` [vault] | n8n (entrada) | HMAC-SHA256 `:136-141` + nonce (`migrations/20260524202319_add_product_webhook_nonces.sql`) | ✅ |
| 72 | **quote-followup-reminders** | Cron: lembretes de follow-up de orçamentos (`quotes.sent_at`) | cron (código `:19`); sem registro no repo; gate `scripts/check-no-followup-frontend.mjs:6` **proíbe** caller no front | `SB:28-29`, `CRON_SECRET:21` | — | `authorizeCron` `:19-22` | 🟨 cron NAO_VERIFICADO |
| 73 | **quote-sync** | Sincroniza orçamento do vendedor com CRM/n8n | `src/hooks/quotes/useQuotes.ts:320,340` | `N8N_QUOTE_WEBHOOK_URL:15` [vault], `SB:13-14`, `EXTERNAL_CRM_SERVICE_ROLE_KEY:26`, `QUOTE_SYNC_API_KEY` [vault] | webhook n8n | `authenticateRequest:115` + `requireRole('agente'):116` | ✅ |
| 74 | **quote-sync-promo-champions** | Proxy fino: assina HMAC e POSTa no Promo Champions | `src/pages/quotes/quote-view/QuotePromoChampionsSync.ts:45` | `SB:43-44,74`, `PROMO_CHAMPIONS_WEBHOOK_SECRET` [vault] | `rapjswienfhkobhlamxb.supabase.co/functions/v1/receive-quote-sync` (`:16`) | `Authorization` `:38` + 401 `:40` + `getUser` | ✅ |
| 75 | **rate-limit-check** | Rate-limit **em memória do isolate** (`requestCounts` Map) por `endpoint:IP` | ❌ apenas scripts de carga/fuzz: `scripts/stress-burst.mjs:62`, `scripts/massive-load-test.mjs:82`, `scripts/fuzz-testing.mjs:414` | — | — | ❌ **NENHUMA** (`:29`) | 🟦 |
| 76 | **receive-crm-callback** | Receptor de callbacks do CRM Promo Champions V2 | webhook externo; `scripts/qa/inject-crm-dead-letters.mjs:32`; `.github/workflows/e2e-crm-callback-approved.yml:12` | `SB:207-208`, `CRM_CALLBACK_API_KEY` [vault] | CRM Promo Champions (entrada) | `x-api-key` timing-safe `:124`; `verify_jwt=false` (`config.toml:95`) | ✅ |
| 77 | **rls-audit** | Testa SELECT/INSERT/UPDATE/DELETE em `quotes`/`orders`/`discount_approval_requests` com o JWT do usuário | `src/components/admin/security/RlsAuditPanel.tsx:32` | `SUPABASE_URL:33`, `SUPABASE_ANON_KEY:34`, `SB:35` | — | `Authorization` `:25` + `getUser` `:48` | ✅ |
| 78 | **rls-integration-tests** | Simula vendedor e admin contra registros próprios/de terceiros; setup/teardown com service role | `src/components/admin/RlsIntegrationTestsDialog.tsx:61` | `SUPABASE_URL:10`, `SUPABASE_ANON_KEY:11`, `SB:12` | — | `Authorization` `:116` + `getUser` `:124` | ✅ |
| 79 | **rls-matrix-export** | Exporta matriz RLS (tabela × operação) em CSV/JSON | `src/pages/admin/OwnershipAuditAdminPage.tsx:126` | `SUPABASE_URL:33`, `SUPABASE_ANON_KEY:34`, `SB:35` | — | `Authorization` `:37` + `getUser` `:47` | ✅ |
| 80 | **secrets-manager** | CRUD de segredos em `integration_credentials`; nunca devolve plaintext | `src/hooks/admin/useSecretsManager.ts:101`; `SecretsManagerHealthPanel.tsx:145`; `CredentialCacheMetricsPanel.tsx:99`; `DataSourceDebugTab.tsx:162` | `SUPABASE_URL:84`, `SUPABASE_ANON_KEY:85`, `SB:86` | — | `Authorization` `:113` + `is_dev` inline | ✅ |
| 81 | **secure-upload** | Upload com scan antivírus VirusTotal; audita em `file_scan_logs` | `src/components/admin/ImageUploadButton.tsx:59`; `src/components/admin/security/SecureUploadManager.tsx:75` | `VIRUSTOTAL_API_KEY` [vault] | `virustotal.com/api/v3/files/` (`:82`) | `authenticateRequest` `:29` | ✅ |
| 82 | **semantic-search** | Busca semântica via RPC `search_products_semantic`, com guarda de timeout e degradação | `src/components/search/useGlobalSearch.ts:320` | `SB:44-45`, `LOVABLE_API_KEY:269` | gateway de IA (embeddings) | `authenticateRequest` `:175` | ✅ |
| 83 | **send-digest** | Cron: digest semanal | cron `supabase/cron/cron-config.sql:37` | `SB:33-34`, `CRON_SECRET:26` | — | `authorizeCron` `:24-27` | ✅ |
| 84 | **send-notification** | Disparo interno de notificação com checagem DND (RPC) | ❌ nenhum caller identificado (só `scripts/fuzz-testing.mjs:399`) | `SB:50-51`, `CRON_SECRET:43` | — | `authorizeCron` `:41-43` | 🟦 |
| 85 | **send-scheduled-reports** | Cron: envio em lote de relatórios por e-mail | cron (código `:14`); sem registro no repo | `SB:22-23`, `RESEND_API_KEY` [vault] | `api.resend.com/emails` (`:167`) | `authorizeCron` `:14-17` | 🟨 cron NAO_VERIFICADO |
| 86 | **send-transactional-email** | E-mails transacionais (quote_sent/approved/rejected, order_created) | `src/hooks/common/useTransactionalEmail.ts:18`; **edge→edge** `supabase/functions/step-up-verify/index.ts:202` | `SB:86-87`, `RESEND_API_KEY` [vault] | `api.resend.com/emails` (`:112`) | `authenticateRequest` `:70` | ✅ |
| 87 | **simulation-orchestrator** | Orquestra simulações: grava `simulation_runs`/`simulation_logs`, injeta em `inbound_webhook_events` assinando HMAC | `src/pages/Simulation.tsx:60` | `SB:65-66`, `N8N_PRODUCT_WEBHOOK_SECRET` | chama outras edges com `Authorization: Bearer service_role` (`:105`) | HMAC `:14-19` | ✅ |
| 88 | **step-up-verify** | MFA step-up (senha + OTP por e-mail) + re-check de role dev; audita todas as transições | `src/hooks/auth/useStepUpAuth.ts:63,103,126,150` | `SUPABASE_URL:22`, `SUPABASE_ANON_KEY:23`, `SB:24` | invoca `send-transactional-email` (`:202`) → Resend | `Authorization` `:102`, evento `unauthorized` `:106`, audita em `step_up_audit_log` `:83` | ✅ |
| 89 | **sync-external-db** | Sync destrutivo com o BD externo | `src/pages/admin/StorageTestPage.tsx:161` | `SB:42-43`, `CRON_SECRET:28` | BD externo | `authorizeCron` `:26-29` (comentário `:3` registra BUG-EF-005 corrigido) | ✅ |
| 90 | **sync-quote-bitrix** | Sync do orçamento no Bitrix; resolve `bitrix_id` via `profiles` | `src/pages/quotes/quote-view/QuoteActionHandlers.ts:162`; `QuoteBitrixSync.ts:117` | `SB:95-96`, `SALESPRO_WEBHOOK_URL` [vault] | webhook Bitrix/SalesPro (`:166`) | `authorize({requireRole:'vendedor'})` `:61` | ✅ |
| 91 | **test-cart-concurrency** | CI: 10 INSERTs simultâneos p/ validar `unique_cart_item_variant` | ❌ nenhum (nem CI nem front) | `SB:13-14` | — | ❌ **NENHUMA** (`:21` service_role) | 🟦 |
| 92 | **test-cart-limit** | CI: valida trigger `enforce_seller_cart_limit`; cria usuário via `auth.admin` | ❌ nenhum invoke; só leitura do arquivo em `src/components/cart/__tests__/CartLimitExhaustive.test.tsx:106` | `SB:14-15` | — | ❌ **NENHUMA** (`:23` service_role) | 🟦 |
| 93 | **test-cart-rls** | E2E de RLS do módulo Carrinhos com usuários reais | ❌ nenhum | `SB:18-19`, `SUPABASE_ANON_KEY:20` | — | ❌ **NENHUMA** (`:27` service_role) | 🟦 |
| 94 | **test-contract-orchestrator** | Orquestra testes de contrato assinando HMAC; usa `SIM_BYPASS` como Bearer | ❌ nenhum (`scripts/check-no-bypass-literals.mjs:10` apenas *proíbe* o literal) | `SB:22-23` | chama outras edges (`:49`) | HMAC `:10-15`; **bypass literal** `:49` | 🟦 |
| 95 | **test-inventory-orchestrator** | Lista/valida presença de env vars e endpoints de inventário | ❌ nenhum | `SB:12-13` | — | ❌ **NENHUMA** (`:13` service_role) | 🟦 |
| 96 | **trends-insights** | Agrega métricas de Tendências e narra via AI Router (`ai_function_routing`) | `src/components/intelligence/TrendsInsightsCard.tsx:41` | `SUPABASE_URL:60`, `SUPABASE_ANON_KEY:61` | gateway de IA (DeepSeek primário, fallback) | `Authorization` `:52` + `getUser` `:67` + 401 `:69` | ✅ |
| 97 | **validate-access** | Valida IP/cidade contra `ip_whitelist`/`city_whitelist`/`access_security_settings`; grava `access_blocked_log` | `src/hooks/admin/useIPValidation.ts:92` | `SB:50-51`, `SUPABASE_ANON_KEY:95` | — | `Authorization` `:55` + guarda SEC-001 contra service_role sem flag `:63-65` | ✅ |
| 98 | **verify-2fa-token** | Verifica TOTP server-side para operações sensíveis | `src/hooks/auth/use2FA.ts:151` | `SUPABASE_URL:26`, `SUPABASE_ANON_KEY:28`, `SB:27` | — | `Authorization` `:49` + `getUser` `:59`; gateway `verify_jwt=true` (default) | ✅ |
| 99 | **verify-email** | Verifica `token_hash` de e-mail via `auth.verifyOtp` | ❌ nenhum caller (fluxo de link do Supabase Auth) | `SB:22-23` | — | o próprio `token_hash` é o fator (`:59`); sem JWT | 🟦 |
| 100 | **visual-search** | Busca por imagem: embedding + match no catálogo | `src/components/search/VisualSearchButton.tsx:57` | `SB:80-81`, `LOVABLE_API_KEY:110`, `SIMULATION_BYPASS_KEY:136`, `HF_ACCESS_TOKEN` [vault] | `api-inference.huggingface.co/models/` (`:266`) | `authenticateRequest` `:145` | ✅ |
| 101 | **voice-agent** | Agente de voz (NL → ação), roteado por `ai_function_routing` | `src/hooks/voice/processTranscript.ts:18` | `requireAiApiKey('voice-agent')` [vault] | gateway de IA | `authenticateRequest` `:24` | ✅ |
| 102 | **webhook-dispatcher** | Dispara evento p/ todos os `outbound_webhooks` inscritos; assina HMAC, retry com backoff, log em `webhook_deliveries` | trigger SQL `supabase/migrations/20260419130037_...sql:363`; `20260419132122_...sql:65`; front `WebhookPlaygroundPanel.tsx:88`, `FailedDeliveriesPanel.tsx:69` | `WEBHOOK_DISPATCHER_SECRET` [vault] | webhooks de terceiros (saída) | `authorizeDispatcher` `:18` — 3 modos (cron secret / JWT ≥supervisor / fail-closed 503) | ✅ |
| 103 | **webhook-inbound** | Recebe webhooks externos por slug; valida HMAC obrigatório e schema de contrato | webhook externo; URL montada em `src/components/admin/connections/WebhooksTab.tsx:57`; `scripts/contract-testing.mjs:156` | `SB:82,165`, `WEBHOOK_INBOUND_SIGNING_SECRET:125` | terceiros (entrada) | HMAC-SHA256 **obrigatório** `:23-33`, `:62`; bypass só p/ service_role `:33` | ✅ |
| 104 | **word-magic** | Geração de copy por IA (DeepSeek) | `src/hooks/word-magic/useWordMagic.ts` ← `src/components/products/ProductCard.tsx:86`, `ProductListItem.tsx:67` | `SB:110-111`, `DEEPSEEK_API_KEY` [vault] | `api.deepseek.com/v1/chat/completions` (`:12`) | `authenticateRequest` `:87` + gateway `verify_jwt=true` (`config.toml:106`) | ✅ |

### Resumo da classificação

| Classe | Qtd | % |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 73 | 70% |
| 🟨 IMPLEMENTADO_PARCIAL | 17 | 16% |
| 🟦 SUGERIDO_OU_INICIADO | 13 | 13% |
| ⬛ MORTO_OU_ABANDONADO | 1 | 1% |
| **Total** | **104** | **100%** |

Detalhe dos 17 🟨: 4 achados graves de auth (§C.1), 9 com cron `NAO_VERIFICADO` (§0.2)
e 4 com auth fraca/ausente porém read-only ou mitigada (§C.2).

---

## B. FUNÇÕES SEM CHAMADOR IDENTIFICADO (com os comandos de prova)

Para cada uma abaixo, as **três frentes** exigidas retornaram vazio (excluídos testes,
manifests declarativos, snapshots CORS e scripts de lint/CORS que apenas *listam* nomes).

### B.1 — Zero chamador em qualquer frente

| Função | Prova |
|---|---|
| **bulk-random-passwords** | `grep -rn "bulk-random-passwords" src/` → vazio · `grep -rn ... supabase/ --include='*.sql'` → vazio · `grep -rn ... scripts/ .github/ e2e/` → vazio. Únicos hits: `_shared/edge-authz-manifest.ts:121` e `_shared/cors-snapshot.json:75` (declarativos). |
| **cors-audit** | `grep -rn "cors-audit" src/` → vazio · SQL → vazio · `scripts/` → só `build-cors-snapshot.mjs:16` **em comentário**, não invocação. |
| **check-login** | `grep -rn "check-login" src/` → vazio (a função existe para ser chamada antes de `signIn()`, mas **nada no front a chama**). SQL → só `config.toml:84`. |
| **magazine-public-react** | `grep -rn "magazine-public-react" src/` → vazio · SQL → só `config.toml:133` · CI → vazio. É a única das 5 edges Magazine sem consumidor. |
| **rate-limit-check** | `grep -rn "rate-limit-check" src/` → vazio. Só scripts de carga: `scripts/stress-burst.mjs:62`, `scripts/massive-load-test.mjs:82`, `scripts/fuzz-testing.mjs:414`. **Nenhum caminho de produção.** |
| **send-notification** | `grep -rn "send-notification" src/` → vazio · SQL → só migrations que *comentam* a função (`20260620150000_faxina_tier1_archive_orphan_tables.sql:40`) · CI → só `scripts/fuzz-testing.mjs:399`. |
| **test-cart-concurrency** | `src/` vazio · SQL só comentário `20260623160000_cart_missing_fk_auth_users.sql:10` · CI só `scripts/check-edge-structured-logging.mjs:53` (lista de lint). |
| **test-cart-limit** | `src/` → só `src/components/cart/__tests__/CartLimitExhaustive.test.tsx:106`, que **lê o arquivo do disco** (`path.resolve`) para comparar constantes — não invoca a função. |
| **test-cart-rls** | Todas as três frentes vazias. Único hit: `_shared/edge-authz-manifest.ts:162`. |
| **test-contract-orchestrator** | `src/` vazio · SQL vazio · CI: `scripts/check-no-bypass-literals.mjs:10` existe **para proibir** o literal de bypass dentro dela, não para chamá-la. |
| **test-inventory-orchestrator** | Todas as três frentes vazias. Único hit: `_shared/edge-authz-manifest.ts:139`. |
| **verify-email** | `src/` vazio · SQL vazio · CI vazio. É acionada pelo link de verificação gerado pelo Supabase Auth — caminho externo, **não comprovável no repo**. |

### B.2 — Chamador apenas simbólico

| Função | Situação |
|---|---|
| **bitrix-sync** | O único hit em `src/` é `src/components/navigation/Breadcrumbs.tsx:56` — um **rótulo de breadcrumb** (`'bitrix-sync': 'Sincronização Bitrix'`), não uma invocação. Nenhum `invoke`/`fetch` aponta para ela. 267 linhas de sync de CRM sem gatilho comprovável. |
| **load-test** | Único chamador: `supabase/functions/tests/shockwave-load-test.ts:14` — arquivo de teste. Sem caminho de produção. |

### B.3 — Morta com prova

**`external-db-bridge`** — ⬛. Não é falta de chamador: é ausência de função.
O corpo inteiro (`supabase/functions/external-db-bridge/index.ts:18-39`) retorna
**HTTP 410** para todo request:

```ts
// index.ts:29-36
JSON.stringify({
  error: "endpoint_decommissioned",
  message: "external-db-bridge foi descomissionada. Use REST nativo (/rest/v1/).",
}), { status: 410, ... }
```

Os 5 hits em `src/` (`src/lib/external-rpc.ts:4`, `useCategoriesTree.ts:66`,
`useColorSystem.ts:35`, `useExternalCategoriesQuery.ts:3`,
`components/admin/products/kit-components/api.ts:4`) são **comentários de migração**
("migrated `invoke('external-db-bridge')` to dbInvoke / to native"), não chamadas.

⚠️ **Sujeira ativa:** o cron `external-db-bridge-keepalive`
(`supabase/migrations/20260424154125_0988f1e1-658b-423c-ae58-d4166a59fc10.sql:12-20`)
ainda faz `net.http_post` a cada 4 minutos para uma função que só sabe responder 410.
São ~360 invocações/dia gastas para receber erro.

---

## C. FUNÇÕES SEM VERIFICAÇÃO DE AUTORIZAÇÃO

Critério: nenhuma checagem in-code de JWT, role, cron-secret, HMAC ou API-key.
Lembrete da §0.1: `verify_jwt=true` do gateway **aceita a anon key pública** — não protege.

### C.1 — 🔴 GRAVES: sem auth **e** escrevem dados / consomem recurso

| Função | Linha do handler | O que faz sem gate | Por que é grave |
|---|---|---|---|
| **audit-suite** | `supabase/functions/audit-suite/index.ts:28` (`Deno.serve`) → `:36` `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` | `admin.auth.admin.createUser(...)` `:49-50`; `admin.from("user_roles").insert(...)` `:57`; escreve `seller_carts`, `seller_cart_items` | **Cria contas de autenticação reais e concede roles** com service_role, sem nenhuma checagem de quem chamou. `config.toml` não lista a função → gateway aceita a anon key. Contradiz diretamente o manifesto, que declara `"audit-suite": { category: "dev", rationale: "Suite de auditoria — service_role + has_role(dev) inline" }` (`_shared/edge-authz-manifest.ts:156`). **O `has_role(dev) inline` não existe no código.** |
| **detect-new-device** | `supabase/functions/detect-new-device/index.ts:26` → `:35` service_role | escreve `user_known_devices`, `device_login_notifications`, `workspace_notifications` | O `userId` alvo vem **do corpo da requisição** (`:47`, `const { userId, userEmail, deviceInfo } = parsed.data`) e nunca é confrontado com o JWT do chamador. Qualquer portador da anon key forja notificação de "novo dispositivo" para qualquer `user_id`. |
| **crm-callback-alerts** | `supabase/functions/crm-callback-alerts/index.ts:93` | lê `system_settings` + `crm_callback_events` com service_role `:107`; dispara alerta ao Sentry `:60`,`:64` | Combinação pior do conjunto: `verify_jwt = false` explícito (`config.toml:103`) **e** zero auth in-code. **Endpoint totalmente público**, sem nem a barreira fraca da anon key. Vaza volumetria de callbacks do CRM e permite inundar o Sentry. |
| **load-test** | `supabase/functions/load-test/index.ts:11` | dispara N requests concorrentes contra `targetEndpoint` (`:28`, vindo do body) usando `Authorization: Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` `:66` | Amplificador de tráfego com credencial máxima. `concurrency` e `totalRequests` vêm do body (`:26-27`). Vetor de DoS interno e de uso indevido da service_role contra endpoints escolhidos pelo atacante. |

### C.2 — 🟡 Sem auth de identidade, mas com mitigação parcial

| Função | Linha | Mitigação presente | Ressalva |
|---|---|---|---|
| **kit-identity-suggest** | `index.ts:45` — só `runBotProtection` (10 req/60s, block 1h) | rate limit por IP | Chama `ai.gateway.lovable.dev` (`:89`) → **consome crédito de IA sem JWT**. Todas as outras 3 edges de kit/IA usam `authenticateRequest` + `requireRole('agente')` (ex.: `kit-ai-builder/index.ts:26-27`). É a exceção inconsistente. |
| **get-visitor-info** | `index.ts:11` — só `runBotProtection` (30 req/60s) | read-only | Adicional: usa **`http://ip-api.com`** em texto puro (`:31`), não HTTPS. Resposta de geo trafega sem TLS e alimenta decisão de anti-fraude. |
| **image-proxy** | `index.ts:71` — `runBotProtection` + allowlist de domínio + `IMAGE_PROXY_MAX_BYTES:129` | proxy read-only com allowlist e teto de bytes | Aceitável para a função. |
| **health-check** | `index.ts:166` | read-only, snapshot cacheado | Expõe status de dependências internas publicamente; baixo impacto. |
| **materials-api** | `index.ts:25-33` | — | **Auth decorativa**: valida o Bearer e o único efeito é `console.log('Materials API authenticated request')` `:33`. O `user` nunca vira gate. Funcionalmente equivale a ausência de auth. |
| **test-cart-concurrency** / **test-cart-limit** / **test-cart-rls** / **test-inventory-orchestrator** | `:21` / `:23` / `:27` / `:13` | nenhuma | 4 endpoints com service_role e sem gate. `test-cart-limit:23` e `test-cart-rls` criam usuários via `auth.admin`. Estão deployáveis em produção (constam de `_shared/cors-snapshot.json:731,739,747,763`). |
| **rate-limit-check** | `:29` | nenhuma | Read-only e o estado é um `Map` em memória do isolate (`:58`) — some a cada cold start, então nem serve como rate-limiter distribuído. |
| **check-login** | — | público por design (`config.toml:84`) | Correto para o caso de uso (pré-login), mas sem chamador (§B.1). |
| **verify-email** | `:59` | o `token_hash` é o fator de autenticação | Correto por design. |
| **log-login-attempt** | `:117` `applyRateLimit` | rate-limit; sem JWT por ser pré-login | Correto por design. |

### C.3 — Divergências manifesto × código

`_shared/edge-authz-manifest.ts` é declarativo e **não é usado por nenhum `index.ts`**
(medido: 0 imports). Ele descreve intenção, não enforcement. Divergências encontradas:

| Manifesto declara | Código faz | Evidência |
|---|---|---|
| `audit-suite`: `"service_role + has_role(dev) inline"` (`edge-authz-manifest.ts:156`) | service_role sim; **`has_role` inexistente** | `audit-suite/index.ts:28-60` |
| `load-test`: `"Load testing utility — sem auth no caller; uso dev/CI only"` (`:140`) | confirma a ausência, mas a função **está publicada** e usa a service_role | `load-test/index.ts:11,66` |
| `materials-api`: `category: "public"` (`:61`) | coerente com o comportamento, mas o código simula uma validação de JWT que não decide nada | `materials-api/index.ts:25-33` |
| `test-cart-*`: `"service_role interno"` (`:160-162`) | não há nada de "interno" — não há gate algum | `test-cart-limit/index.ts:23` |

---

## D. `_SHARED` — O QUE OFERECE E QUEM USA

30 módulos de produção + 8 arquivos `.test.ts` + `contracts/` + `ai-router/` + `cors-snapshot.json`.
A coluna "usado por" conta **imports em `*/index.ts`** (não em testes).

### D.1 — Núcleo (adoção alta, é o que sustenta o padrão)

| Módulo | index.ts que importam | Exports principais |
|---|---|---|
| `cors.ts` | **100 / 104** | `getCorsHeaders`, `handleCorsPreflightIfNeeded`, `buildPublicCorsHeaders`, `handleCorsPreflight`, `publicCorsHeaders`, `CORS_INTROSPECTION` |
| `request-id.ts` | **36** | `REQUEST_ID_HEADER`, `getOrCreateRequestId`, `makeRequestLogger`, `withRequestIdBody`, `withRequestIdHeader` |
| `credentials.ts` | **34** | resolução SSOT de credenciais DB-first→env (`resolveCredential`/`getCredential`), métricas de cache (`getCredentialCacheMetrics`), health (`CredentialsHealthSummary`) |
| `structured-logger.ts` | **31** | `createStructuredLogger`, `StructuredLogger`, `LogLevel` |
| `auth.ts` | **26** | `authenticateRequest`, `requireRole`, `requireDev`, `authErrorResponse`, `AuthResult` |
| `dispatcher-auth.ts` | **20** | `authorizeCron`, `authorizeDispatcher`, `constantTimeEqual`, modos A/B/C |
| `supabase-client-adapter.ts` | **19** | `assertServiceClient`, `castSupabaseClient`, `castRpcResult` |
| `bot-protection.ts` | **17** | `detectBot`, `getClientIp`, `runBotProtection` |
| `log-safety.ts` | **13** | `maskLogText`, `safeErrorFields`, `safeCount` |
| `zod-validate.ts` | **13** | `parseBodyWithSchema`, `validationErrorResponse`, `ERROR_CODES`, `uuidSchema` |
| `ai-credentials.ts` | **12** | `resolveAiApiKey`, `requireAiApiKey`, `AI_NOT_CONFIGURED_*`, `aiNotConfiguredResp` |
| `error-response.ts` | **11** | `safeErrorResponse` |
| `rate-limiter.ts` | **10** | `RateLimiter`, `rateLimiters`, `applyRateLimit` |
| `ai-usage.ts` | **9** | `checkAiQuota`, `acquireAiQuota`, `logAiUsage`, `callAiWithTracking`, `QuotaExceededError` |
| `external-fetch.ts` | **9** | `fetchWithBreaker`, `CircuitOpenError`, `InsecureUrlError` |
| `audit-log.ts` | **7** | `writeAuditEntry`, `redactPayload`, `summarizePayload`, `extractRequestMeta` |
| `kill_switch.ts` | **5** | `assertSwitchEnabled` (integra com a tabela de kill switches) |
| `mcp-violations.ts` | **4** | `recordMcpViolation`, `mapViolationReason` |
| `authorize.ts` | **3** | `authorize` com `requireRole` + `enforceServerSide` |
| `json-parser.ts` | **3** | `extractAndParseAIJSON`, `safeJson` |
| `mcp-scopes.ts` | **3** | `KNOWN_SCOPES`, `FULL_SCOPE`, `isFullAccess`, `FULL_SCOPE_MAX_TTL_MS` |
| `circuit-breaker.ts` | **2** | `getBreaker`, `getAllBreakerStatuses`, `circuitOpenResponse` |
| `connection-test-runner.ts` | **2** | `runConnectionTest`, `isTransientFailure`, `validateUrlFormat` |
| `connection-timeouts.ts` | **1** | `resolveTimeout`, `DEFAULT_TIMEOUTS_MS` |
| `security.ts` | **1** | `logSecurityEvent`, `validateCsrfToken`, `generateCsrfToken` |

### D.2 — 🟦 Módulos `_shared` com **zero** consumidores em `index.ts`

Medido com `grep -rl "_shared/<arquivo>" supabase/functions/*/index.ts`:

| Módulo | Exports que ninguém usa | Observação |
|---|---|---|
| `createEdge.ts` | `createEdge`, `EdgeRole`, `EdgeConfig`, `EdgeContext`, `EdgeHandler`, `jsonResponse` | Framework de handler com role embutida. **Nenhuma das 104 funções o adota** — todas montam `Deno.serve` à mão. Tem teste próprio (`createEdge.test.ts`), o que mantém o CI verde sobre código que nada executa. Era exatamente o mecanismo que resolveria a §C. |
| `url-allowlist.ts` | `ALLOWED_HOSTS`, `ALLOWED_HOST_SUFFIXES`, `validateExternalUrl`, `assertAllowedExternalUrl`, `ExternalUrlError` | Guarda anti-SSRF centralizada, **não importada por ninguém**. As funções que fazem fetch externo reimplementam allowlist local (`image-proxy/index.ts:1-10`, `generate-mockup` via `MOCKUP_FETCH_ALLOWED_HOSTS:124`, `analyze-logo-colors:73`). Tem 141 linhas de teste (`url-allowlist.test.ts`). |
| `token-revocation.ts` | `decodeJwtPayload`, `getTokenIssuedAt`, `isTokenRevoked`, `clearRevocationCache`, `getCacheStats` | Checagem de revogação de token. Zero importadores — ou seja, **nenhuma edge verifica se o JWT foi revogado**, apesar de `force-global-logout` existir e de haver o cron `cleanup-expired-token-revocations` nas migrations. Gap funcional real: revogar sessão não invalida chamadas às edges. Tem 193 linhas de teste. |
| `retry-backoff.ts` | `retryWithBackoff`, `retrySupabaseCall`, `isTransientError`, `nextDelayMs` | Zero importadores; funções que precisam de retry o implementam localmente (`webhook-dispatcher/index.ts:2` "Retries with backoff"). |
| `edge-authz-manifest.ts` | `EDGE_AUTHZ_MANIFEST` | Zero importadores por construção — é consumido por gates de CI, não em runtime. **Documenta intenção que o código não cumpre** (§C.3). |

### D.3 — Contratos versionados (`_shared/contracts/`)

`contracts/` expõe `_zod.ts`, `errors.ts`, `index.ts`, `parse.ts`, `versioning.ts` e **16 schemas**:
`bi-copilot`, `block-ip-temporarily`, `e2e-cleanup`, `force-global-logout`, `kit-ai-builder`,
`market-intelligence-insights`, `ownership-audit`, `ownership-repair`, `product-webhook`,
`send-transactional-email`, `simulation-orchestrator`, `step-up-verify`, `sync-external-db`,
`trends-insights`, `webhook-dispatcher`, `webhook-inbound`.

**16 de 104 funções (15%)** têm contrato versionado. As restantes validam com Zod inline
(`zod-validate.ts`, 13 funções) ou não validam. Base do versionamento:
`supabase/migrations/20260522010000_contract_versioning.sql:4`.

### D.4 — `_shared/cors-snapshot.json`

Snapshot congelado da config CORS de todas as edges, gerado por
`scripts/build-cors-snapshot.mjs` e servido em runtime por `cors-audit`
(que, conforme §B.1, não tem chamador).
`scripts/check-edge-structured-logging.mjs:58` fixa `SNAPSHOT_SIZE = 81`, valor **abaixo** das
104 funções atuais — o gate cobre 78% do parque.

---

## E. RISCOS DE ENV — VARIÁVEIS FORA DO `.env.example`

`.env.example` declara **23 variáveis**. As funções consomem **47 nomes distintos** via
`Deno.env.get(...)`, mais ~26 credenciais resolvidas pelo vault (`integration_credentials`).

### E.1 — Consumidas por `Deno.env.get` e **ausentes** do `.env.example`

| Variável | Onde é lida | Risco se ausente |
|---|---|---|
| `CRON_SECRET` | `secretEnvName` em **14** funções (`cleanup-novelties:15`, `collections-watcher:39`, `comparison-price-watcher:34`, `connections-health-check:68`, `favorites-watcher:39`, `ownership-audit:30`, `process-queue:11`, `process-scheduled-reports:12`, `quote-followup-reminders:21`, `send-digest:26`, `send-notification:43`, `send-scheduled-reports:16`, `sync-external-db:28`, `cleanup-notifications:25`) | Segredo compartilhado por 14 endpoints, **não documentado**. Rotação exige tocar todos os crons de uma vez. |
| `ASIA_INGESTION_CRON_SECRET` | `asia-ingestion/index.ts:90` | Ingestão de catálogo trava ou fica aberta conforme fail-open/closed. |
| `BACKFILL_DIM_CRON_SECRET` | `backfill-image-dimensions/index.ts:125` | idem |
| `GENERATE_BLURHASHES_CRON_SECRET` | `generate-blurhashes/index.ts:169` | idem |
| `HASH_PRODUCT_IMAGES_CRON_SECRET` | `hash-product-images/index.ts:75` | idem |
| `ADMIN_BATCH_TOKEN` | `bulk-random-passwords/index.ts:108` | Sem ele a função retorna 500 `:111` (fail-closed, correto). Mas é o **único** gate de um reset de senhas em lote, e não está documentado. |
| `WEBHOOK_INBOUND_SIGNING_SECRET` | `webhook-inbound/index.ts:125` | Segredo do HMAC de entrada. Não documentado. |
| `PROMO_CHAMPIONS_WEBHOOK_SECRET` | `quote-sync-promo-champions` (assinatura HMAC, `index.ts:3`) | idem |
| `CRM_CALLBACK_API_KEY` | `receive-crm-callback/index.ts:10,124` | Única credencial do receptor de callbacks do CRM. |
| `SENTRY_DSN_SERVER` | `crm-callback-alerts/index.ts:172` | Sem ele a função roda em dry-run silencioso (`:18`) — alertas somem **sem erro**. |
| `MAGAZINE_IP_SALT` | `magazine-public-view:35`, `magazine-public-react:29` | Salt de pseudonimização de IP. Sem ele o hash pode virar previsível/vazio → desanonimização de leitores. |
| `MOCKUP_FETCH_ALLOWED_HOSTS` | `generate-mockup/index.ts:124` | **Allowlist anti-SSRF**. Ausência muda a superfície de fetch da função. |
| `PRODUCT_WEBHOOK_ALLOWED_ORIGINS` | `product-webhook/index.ts:35` | Controle de origem do webhook de produtos. |
| `PRODUCT_WEBHOOK_BATCH_SIZE` | `product-webhook/index.ts:16` | Tuning; baixo risco. |
| `SIMULATION_BYPASS_KEY` | `cnpj-lookup:31`, `visual-search:136` | **Chave de bypass de autenticação** em duas funções de produção — não documentada em lugar nenhum. |
| `ASIA_BASE_URL` | `asia-ingestion/index.ts:11` | Endpoint do fornecedor. |
| `BITRIX24_WEBHOOK_URL` | `bitrix-sync/index.ts:12` (com fallback vault) | — |
| `N8N_QUOTE_WEBHOOK_URL` | `quote-sync/index.ts:15` (com fallback vault) | — |
| `SUPABASE_DB_URL` | `cnpj-lookup/index.ts:48` | Connection string direta ao Postgres a partir de uma edge. |
| `ENVIRONMENT` | `cnpj-lookup/index.ts:47` | Ramificação de comportamento por ambiente. |
| `E2E_CLEANUP_RATE_LIMIT_MAX` / `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS` | `e2e-cleanup/index.ts:53-54` | Só os limites; o `E2E_CLEANUP_TOKEN` está documentado. |
| `LOG_CRM_BRIDGE_VERBOSE` | `crm-db-bridge/index.ts:689` | Se ligado em produção, aumenta verbosidade de log da ponte CRM. |
| `CSRF_SECRET` | `_shared/security.ts` | Módulo usado por 1 função; segredo não documentado. |
| `AI_ROUTER_DISABLE`, `ALLOW_HTTP_FETCH`, `LOG_CREDENTIAL_RESOLUTION` | `_shared/*` | Flags operacionais. ⚠️ `ALLOW_HTTP_FETCH` **afrouxa a exigência de HTTPS** em fetch externo e não está documentada. |
| `TEST_ADMIN_JWT`, `TEST_SELLER_A_JWT`, `TEST_SELLER_B_JWT`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` | `supabase/functions/tests/` | Credenciais de teste; risco baixo, mas indocumentadas. |

### E.2 — Documentadas no `.env.example` porém **nunca lidas** por nenhuma função

`CRM_SUPABASE_URL`, `CRM_SUPABASE_SERVICE_KEY`, `EXTERNAL_CRM_ANON_KEY`,
`EXTERNAL_PROMOBRIND_ANON_KEY`, `EXTERNAL_SUPABASE_ANON_KEY` aparecem em `.env.example`
mas não são lidas em `supabase/functions/*/index.ts` — apenas resolvidas via
`_shared/credentials.ts` como aliases, ou legado.

### E.3 — Nomes de credencial resolvidos pelo vault (não são `Deno.env`)

`ASIA_SUPPLIER_ID`, `BITRIX24_WEBHOOK_URL`, `CNPJA_API_KEY`, `CRM_CALLBACK_API_KEY`,
`DEEPSEEK_API_KEY`, `DROPBOX_ACCESS_TOKEN`, `ELEVENLABS_API_KEY` (×2),
`EXTERNAL_CRM_ANON_KEY` (×2), `EXTERNAL_CRM_SERVICE_ROLE_KEY` (×2), `EXTERNAL_CRM_URL` (×2),
`EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY` (×9), `EXTERNAL_PROMOBRIND_URL` (×9),
`HF_ACCESS_TOKEN`, `LOVABLE_API_KEY` (×3), `N8N_PRODUCT_WEBHOOK_SECRET` (×2),
`N8N_PRODUCT_WEBHOOK_TOLERANCE_SEC`, `N8N_QUOTE_WEBHOOK_URL` (×2),
`PROMO_CHAMPIONS_WEBHOOK_SECRET`, `QUOTE_SYNC_API_KEY` (×2), `RESEND_API_KEY` (×3),
`SALESPRO_WEBHOOK_URL` (×2), `SIMULATION_BYPASS_KEY`, `VIRUSTOTAL_API_KEY`,
`WEBHOOK_DISPATCHER_SECRET`.

Esse é o caminho **correto** (`_shared/credentials.ts`, 34 consumidores) — DB-first com
fallback para env, permitindo rotação pela UI `/admin/conexoes` sem redeploy.

---

## F. INTEGRAÇÕES EXTERNAS — MAPA CONSOLIDADO

| Destino | Funções | Evidência |
|---|---|---|
| `ai.gateway.lovable.dev` | 8: `ai-recommendations:10`, `bi-copilot:90`, `comparison-ai-advisor:105`, `expert-chat:168`, `kit-ai-builder:57`, `kit-identity-suggest:89`, `market-intelligence-insights:333`, (+`semantic-search` via `LOVABLE_API_KEY:269`) | fetch direto |
| `api.resend.com/emails` | 3: `process-scheduled-reports:99`, `send-scheduled-reports:167`, `send-transactional-email:112` | e-mail transacional |
| `api.elevenlabs.io` | 2: `elevenlabs-scribe-token:43`, `elevenlabs-tts:78` | voz |
| `api.github.com` | 1: `github-credentials-test:103,161,226` | validação de credencial |
| `api.dropboxapi.com` | 1: `dropbox-list:66,76` | listagem de arquivos |
| `api.cnpja.com` | 1: `cnpj-lookup:89` | consulta CNPJ |
| `api.deepseek.com` | 1: `word-magic:12` | geração de copy |
| `api-inference.huggingface.co` | 1: `visual-search:266` | embedding de imagem |
| `virustotal.com/api/v3` | 1: `secure-upload:82` | antivírus |
| `asia.ajung.site` | 1: `asia-ingestion:11` | catálogo do fornecedor ASIA |
| `rapjswienfhkobhlamxb.supabase.co` (Promo Champions) | 1: `quote-sync-promo-champions:16` | POST em `receive-quote-sync` |
| **`http://ip-api.com`** (⚠️ sem TLS) | 1: `get-visitor-info:31` | geolocalização |
| Sentry | 1: `crm-callback-alerts:60,64` | alertas |
| Supabase externo (PromoBrindes / CRM) | ~12 via `_shared/credentials.ts` | `EXTERNAL_PROMOBRIND_*` (×9), `EXTERNAL_CRM_*` (×2) |
| Webhooks de saída (terceiros) | 1: `webhook-dispatcher` | HMAC + retry |
| Webhooks de entrada | 3: `webhook-inbound`, `product-webhook`, `receive-crm-callback` | HMAC / x-api-key |

---

## G. SÍNTESE DOS ACHADOS

1. **Escopo real é 104 funções, não 107** — a diferença de 4 são `_shared`, `tests`,
   `README.md` e `deno.json` (§0).
2. **4 endpoints graves sem autorização**: `audit-suite` (cria usuários e concede roles),
   `detect-new-device` (escreve para `user_id` arbitrário do body), `crm-callback-alerts`
   (público total: `verify_jwt=false` + zero gate), `load-test` (amplificador com service_role).
3. **`_shared/edge-authz-manifest.ts` documenta enforcement que não existe** — declara
   `has_role(dev) inline` para `audit-suite`, que não tem. E não é importado por nenhuma função,
   logo não pode enforçar nada em runtime (§C.3).
4. **4 módulos `_shared` bem construídos e testados com zero adoção**: `createEdge.ts`
   (o framework que resolveria §C), `url-allowlist.ts` (anti-SSRF centralizado),
   `token-revocation.ts` (⚠️ **nenhuma edge checa revogação de JWT**), `retry-backoff.ts` (§D.2).
5. **Cron não auditável no repo para 12 funções** — o código chama `authorizeCron`, mas o
   `cron.schedule` não existe em nenhuma migration. Marcadas 🟨/`NAO_VERIFICADO` (§0.2).
6. **`external-db-bridge` está morta (410) mas ainda recebe keepalive a cada 4 minutos**
   via `migrations/20260424154125_...sql:12-20` (§B.3).
7. **~26 variáveis de ambiente fora do `.env.example`**, incluindo `CRON_SECRET`
   (compartilhado por 14 endpoints), `SIMULATION_BYPASS_KEY` (bypass de auth em 2 funções
   de produção), `MOCKUP_FETCH_ALLOWED_HOSTS` (allowlist anti-SSRF), `MAGAZINE_IP_SALT`
   e `ALLOW_HTTP_FETCH` (§E.1).
8. **`get-visitor-info` faz geolocalização por HTTP puro** (`index.ts:31`) e o resultado
   alimenta decisão de anti-fraude.
9. **Cobertura de contrato versionado: 16/104 (15%)**; o gate de logging estruturado fixa
   `SNAPSHOT_SIZE = 81`, cobrindo 78% do parque (§D.3, §D.4).
10. **12 funções sem chamador algum** e 2 com chamador apenas simbólico — 4 delas
    (`test-cart-*`, `test-inventory-orchestrator`) rodam com service_role sem gate e
    constam do snapshot CORS, ou seja, estão publicadas (§B, §C.2).

---

*Documento gerado por auditoria somente-leitura. Nenhum arquivo além deste foi modificado.
Nenhuma função de produção foi invocada. Nenhum deploy ou migration foi executado.*
