# 11 — INTEGRAÇÕES COM TERCEIROS (estado medido)

> **Auditoria de estado — somente leitura.** Data da medição: **2026-08-16**.
> Método: varredura do repositório (`src/`, `supabase/functions/`, `supabase/migrations/`,
> `scripts/`, `cloudflare-workers/`, `.github/workflows/`, `index.html`, `vercel.json`,
> `public/_headers`, `.env.example`, `.env.e2e.example`, `.env.production`).
>
> **README.md / STATUS.md / CLAUDE.md / docs/*.md NÃO foram usados como fonte de verdade.**
> Onde documentação aparece, está marcada explicitamente como *pista de planejamento*.
>
> **Nenhum valor de segredo foi lido ou reproduzido.** Só nomes de variáveis + `arquivo:linha`.
>
> **Limite estrutural desta auditoria:** não há como verificar, a partir do repositório, se uma
> credencial está de fato provisionada em produção (Supabase Edge Secrets, Supabase Vault,
> `integration_credentials`, GitHub Secrets ou Vercel). Toda coluna "credencial existe em prod?"
> é **NAO_VERIFICADO** por construção.

---

## 0. Como o projeto resolve credenciais (contexto necessário para ler a tabela)

Existem **quatro** cofres distintos em uso, e isso muda o significado de "credencial declarada":

| Cofre | Quem lê | Evidência |
|---|---|---|
| Tabela `public.integration_credentials` (DB-first) | `resolveCredential()` / `getCredential()` | `supabase/functions/_shared/credentials.ts:1-10` |
| `Deno.env.get()` (Supabase Edge Secrets) | fallback do mesmo resolver | `supabase/functions/_shared/credentials.ts:6` |
| Supabase **Vault** (`vault.decrypted_secrets`) | funções SQL / pg_cron | `supabase/migrations/20260616172001_product_images_cf_reconciliation.sql:24-25` |
| GitHub Actions Secrets | CI/CD | `.github/workflows/deploy-vercel.yml:67` |

Ordem canônica declarada em `supabase/functions/_shared/credentials.ts:4-7`:
`integration_credentials` → `Deno.env.get(nome)` → aliases legados (`credentials.ts:32-42`).

**Consequência prática:** o `.env.example` **não é** o inventário de credenciais deste projeto.
Ele lista 5 secrets de servidor; o código exige **28+**. Ver §C.

Mecanismos de desligamento existentes:

| Mecanismo | Onde | Estado declarado no repo |
|---|---|---|
| `system_kill_switches` (tabela, checada em runtime) | `supabase/functions/_shared/kill_switch.ts:85-90` | ver §D |
| `AI_ROUTER_DISABLE=true` (env) | `supabase/functions/_shared/ai-usage.ts:225` | não setado em nenhum arquivo do repo |
| `ALLOW_HTTP_FETCH=1` (env, permite http:// externo) | `supabase/functions/_shared/external-fetch.ts:26` | não setado no repo |
| Circuit breaker por serviço | `supabase/functions/_shared/external-fetch.ts:36-42` | ativo para `cnpja`, `image-cdn`, `dropbox`, `elevenlabs`, `bitrix`, `lovable-ai` |
| Allowlist de URL (anti-SSRF) | `supabase/functions/_shared/url-allowlist.ts:26-49` | ativa |
| CSP `connect-src` (bloqueio de rede no browser) | `vercel.json:106` e `public/_headers:24` | ativa — ver §D.2, tem furos |

---

# A) TABELA MESTRA DE INTEGRAÇÕES

Legenda de classificação:
✅ `IMPLEMENTADO_TOTAL` · 🟨 `IMPLEMENTADO_PARCIAL` · 🟦 `SUGERIDO_OU_INICIADO` · ⬛ `MORTO_OU_ABANDONADO`

## A.1 — IA / LLM

### 1. Lovable AI Gateway (`ai.gateway.lovable.dev`) ✅ IMPLEMENTADO_TOTAL

**(a)** Gateway LLM (Gemini/GPT via Lovable) usado por 12 features de IA do produto.
**(b)** Ponto de contato (8 call sites diretos):
- `supabase/functions/_shared/ai-usage.ts:308` (caminho "legacy" central)
- `supabase/functions/ai-recommendations/index.ts:10` + `:81`
- `supabase/functions/bi-copilot/index.ts:90`
- `supabase/functions/comparison-ai-advisor/index.ts:105`
- `supabase/functions/expert-chat/index.ts:168`
- `supabase/functions/kit-ai-builder/index.ts:57`
- `supabase/functions/kit-identity-suggest/index.ts:89`
- `supabase/functions/market-intelligence-insights/index.ts:333`

**(c)** `LOVABLE_API_KEY`. Resolvida via SSOT em `supabase/functions/_shared/ai-credentials.ts:34` e
`supabase/functions/ai-recommendations/index.ts:50`, `bi-copilot/index.ts:56`,
`analyze-logo-colors/index.ts:119`. **Declarada em `.env.example`: SIM** (`.env.example:102`).
Existência real em produção: **NAO_VERIFICADO**.

**(d)** Frontend, com telas reais:
- `src/hooks/intelligence/useAIRecommendations.ts:168` → `AIRecommendationsPanel.tsx:153`, `SmartRecommendations.tsx:210`
- `src/components/bi/BIAiCopilot.tsx:112`
- `src/components/compare/AIComparisonAdvisor.tsx:93`
- `src/components/intelligence/MarketIntelligenceInsightsCard.tsx:136`
- `src/components/kit-builder/KitAIPromptDialog.tsx:47`
- `src/hooks/kit-builder/useKitIdentitySuggestion.ts:33`
- `src/components/search/useGlobalSearch.ts:320` (`semantic-search`)
- `src/hooks/simulation/useLogoColorAnalysis.ts:85` (`analyze-logo-colors`)
- `src/hooks/products/useProductSeoAI.ts:54` (`generate-product-seo`)
- `src/hooks/intelligence/useMagicUpGeneration.ts:166` (`generate-ad-image`)
- `src/hooks/mockup/mockupGenerationService.ts:368` (`generate-mockup`)

**(e)** Destino: `ai_usage_logs` (`supabase/functions/_shared/ai-usage.ts:152`, `:408`),
`ai_insights_cache` e `ai_usage_events` (`market-intelligence-insights/index.ts:274,283,411,427`).
Quota por usuário via `acquireAiQuota` (`ai-usage.ts:217`).

**(f)** Kill-switches:
- `edge_bi_copilot` (`bi-copilot/index.ts:56`), seed `enabled=true` em `supabase/migrations/20260525200103_corrections_kill_switches.sql:10`
- `edge_expert_chat` (`expert-chat/index.ts` via `assertSwitchEnabled`), seed `true` (`…20260525200103…:9`)
- `edge_generate_mockup` (`generate-mockup/index.ts:347`), seed em `supabase/migrations/20260531120000_corretiva_kill_switches_reason_col.sql:44`
- `AI_ROUTER_DISABLE` (`ai-usage.ts:225`)

**(g)** ✅ **IMPLEMENTADO_TOTAL** — código, credencial declarada, chamadores reais em tela, tabela de log alimentada.
Ressalva: `edge_ai_recommendations` foi semeado como switch (`…20260525200103…:8`) mas
`ai-recommendations/index.ts` **nunca chama `assertSwitchEnabled`** — esse switch específico é inerte.

---

### 2. AI Router multi-provider (OpenAI / Anthropic / Google Gemini) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Camada de roteamento que permite trocar o provedor LLM por função, com fallback ordenado.
**(b)** `supabase/functions/_shared/ai-router/index.ts:241-320`; adapters:
`anthropic-native.ts:66` (`{baseUrl}/messages`), `google-genai.ts`, `openai-compatible.ts`,
`openai-bridge.ts`. Endpoint **não é hardcoded** — vem de `provider.baseUrl`, lido da tabela `ai_providers`.
**(c)** `provider.secret_name` — nome dinâmico por linha da tabela, resolvido em
`supabase/functions/_shared/ai-router/index.ts:312`. **Declarada em `.env.example`: NÃO**
(por natureza — é dinâmica).
**(d)** Único consumidor real: `supabase/functions/trends-insights/index.ts:11` (`callAiForFunction`),
chamado por `src/components/intelligence/TrendsInsightsCard.tsx:41`.
Todas as outras funções de IA só entram no router pelo desvio de `ai-usage.ts:232-236`,
que **cai de volta no caminho Lovable legacy** se não houver routing ativo (`ai-usage.ts:270-278`).
**(e)** `ai_usage_logs` com `metadata.via = "router"` (`ai-usage.ts:243-262`).
As tabelas de configuração (`ai_providers`, `ai_models`, `v_ai_function_routing_effective`)
são lidas de um **cliente Supabase separado** (`ai-router/index.ts:93-107`) que aponta para
`EXTERNAL_SUPABASE_URL`/`EXTERNAL_PROMOBRIND_URL` com fallback para o projeto interno.
**(f)** `AI_ROUTER_DISABLE=true` (`ai-usage.ts:225`) desliga tudo. Além disso,
`is_active` por provider/model (`ai-router/index.ts:245,255`).
**(g)** 🟨 **PARCIAL**. Falta:
1. **Nenhuma migration semeia `ai_providers` / `ai_models` / `ai_function_routing`** — busca por
   `INSERT INTO … ai_providers` em `supabase/migrations/` retorna 0 resultados. Sem linhas, o router
   lança "No active routing" e sempre cai no legacy.
2. `ai_providers` **não existe em `src/integrations/supabase/types.ts`** (grep = 0 ocorrências),
   confirmando que a tabela vive fora do schema tipado do projeto canônico.
3. A UI de administração existe e é completa (`src/components/admin/connections/AiProvidersTab.tsx`,
   `AiModelsTab.tsx`, `AiRoutingTab.tsx`, hooks em `src/hooks/intelligence/useAiRouter.ts:166-330`),
   o que torna a configuração *possível em runtime* — mas o estado inicial no repo é vazio.

---

### 3. DeepSeek (`api.deepseek.com`) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Geração de títulos/descrições enriquecidos de produto ("Word Magic").
**(b)** `supabase/functions/word-magic/index.ts:12` (const) e `:241` (fetch).
**(c)** `DEEPSEEK_API_KEY` — `supabase/functions/word-magic/index.ts:213`.
**Declarada em `.env.example`: NÃO.**
**(d)** **Não há chamador no repositório.** Grep por `'word-magic'` / `functions/v1/word-magic`
em `src/`, `supabase/migrations/`, `scripts/`, `.github/` = 0 resultados.
O código declara o disparador: comentário em `supabase/functions/word-magic/index.ts:213-217`
e `src/hooks/word-magic/useWordMagic.ts:6` — *"Sem geração on-demand — textos vêm do banco (gerados pelo n8n)"*.
Ou seja: **quem dispara é um workflow n8n externo ao repositório**. NAO_VERIFICADO.
**(e)** Destino real e verificável: `ai_enrichment_queue` (`word-magic/index.ts:173,181,197,217`)
e campos `ai_title/ai_description/ai_summary` do produto, consumidos em
`src/hooks/word-magic/useWordMagic.ts:25-33` → `src/components/products/ProductCard.tsx:86-87`.
**(f)** Sem kill-switch dedicado. Timeout duro `DEEPSEEK_TIMEOUT_MS` (`word-magic/index.ts:236`).
**(g)** 🟨 **PARCIAL** — o fluxo de leitura está fechado (tela consome), mas **o gatilho vive fora do repo**
e a credencial não está declarada em nenhum arquivo de exemplo. Falta: documentar/versionar o workflow n8n
e declarar `DEEPSEEK_API_KEY` no `.env.example`.

---

### 4. Hugging Face Inference (`api-inference.huggingface.co`) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Provedor alternativo de visão (Llama-3.2-11B-Vision) para busca visual por imagem.
**(b)** `supabase/functions/visual-search/index.ts:266`.
**(c)** `HF_ACCESS_TOKEN` — `supabase/functions/visual-search/index.ts:113`.
**Declarada em `.env.example`: NÃO.**
**(d)** `src/components/search/VisualSearchButton.tsx:57`; página `src/pages/tools/VisualSearchPage.tsx`.
**(e)** Sem tabela própria de resultado; erros vão para `system_error_logs` (`visual-search/index.ts:90`).
Retorna produtos de `products` (`:417,:430`).
**(f)** Degrada para Lovable AI se `HF_ACCESS_TOKEN` ausente (`visual-search/index.ts:110-135`);
retorna 503 `AI_CREDENTIALS_MISSING` se nenhuma das duas existir (`:120-131`).
**(g)** 🟨 **PARCIAL** — é o *caminho secundário* da busca visual, sem credencial declarada em lugar nenhum
e sem tabela de histórico/uso própria. Falta: declarar `HF_ACCESS_TOKEN` e registrar uso em `ai_usage_logs`
(hoje o path HF não passa por `callAiWithTracking`).

---

## A.2 — Dados cadastrais / enriquecimento

### 5. CNPJá (`api.cnpja.com`) ✅ IMPLEMENTADO_TOTAL

**(a)** Consulta de CNPJ (razão social, endereço, CNAE, situação cadastral) no cadastro de empresas/fornecedores.
**(b)** `supabase/functions/cnpj-lookup/index.ts:89` (via `fetchWithBreaker('cnpja', …)`).
**(c)** `CNPJA_API_KEY` — `supabase/functions/cnpj-lookup/index.ts:80`. **`.env.example`: NÃO.**
**(d)** Frontend: `src/utils/cnpj-lookup.ts:28` → consumido em
`src/components/admin/products/new-supplier/useNewSupplierForm.ts`,
`src/components/admin/suppliers-manager/useSuppliersManager.ts`,
`src/hooks/products/useSupplierFiscalData.ts`, `src/components/cart/CartCompanyPicker.tsx`.
**(e)** Sem tabela de log da chamada; o payload normalizado (`cnpj-lookup/index.ts:127-141`) volta ao
formulário e é gravado em `suppliers`/`companies` pelo caller.
**(f)** Circuit breaker com `Retry-After` de 3600s (`_shared/external-fetch.ts:37` — *"CNPJA: limite diário ~35 req/dia"*).
Sem chave → 503 explícito (`cnpj-lookup/index.ts:81-87`). Modo mock para testes (`cnpj-lookup/index.ts:44-77`).
CSP libera `https://api.cnpja.com` (`vercel.json:106`) — o que indica que **já houve** chamada direta do browser.
**(g)** ✅ **TOTAL** — código completo, chamadores reais em 5+ telas, tratamento de erro maduro
(429/404/422 mapeados em `:110-117`), circuit breaker calibrado. Único débito: credencial fora do `.env.example`.

---

### 6. ViaCEP (`viacep.com.br`) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Auto-preenchimento de endereço por CEP.
**(b)** `src/utils/viacep.ts:20` — `fetch` **direto do browser**, sem edge function.
**(c)** Nenhuma credencial (API pública). N/A para `.env.example`.
**(d)** `src/components/admin/suppliers-manager/useSuppliersManager.ts:11` e
`src/components/admin/products/new-supplier/useNewSupplierForm.ts:9`.
**(e)** Sem destino próprio — preenche campos do formulário de fornecedor.
**(f)** Timeout de 5s via AbortController (`src/utils/viacep.ts:16-17`). Falha silenciosa (`return null`, `:27`).
**(g)** 🟨 **PARCIAL — provável fio partido em produção.**
`https://viacep.com.br` **não está no `connect-src` da CSP** (`vercel.json:106`, `public/_headers:24`).
A CSP está em modo *enforce* (`report-uri …/csp/enforce`). O `catch{}` em `src/utils/viacep.ts:27`
engole o `TypeError` do bloqueio, então a falha é invisível ao usuário — o campo simplesmente não preenche.
Falta: adicionar o host à CSP **ou** mover a chamada para uma edge function.

---

### 7. ipify (`api.ipify.org`) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Descobrir o IP público do usuário para a tela de allowlist de IPs administrativos.
**(b)** `src/hooks/admin/useAllowedIPs.ts:41` e `src/hooks/admin/useIPValidation.ts:26` — fetch direto do browser.
**(c)** Nenhuma credencial.
**(d)** Tela de segurança administrativa (`src/hooks/admin/useAllowedIPs.ts`).
**(e)** O IP resultante é gravado na allowlist (tabela de IPs permitidos) pelo caller.
**(f)** AbortSignal (`useAllowedIPs.ts:41`). Comentário no próprio arquivo (`:26`) registra que o fetch
já foi um problema conhecido.
**(g)** 🟨 **PARCIAL — mesmo furo de CSP do ViaCEP.** `https://api.ipify.org` **não está no `connect-src`**
(`vercel.json:106`). Redundante com a integração nº 8, que resolve o mesmo problema server-side e corretamente.
Falta: eliminar o fetch direto e usar `get-visitor-info`.

---

### 8. ip-api.com (geolocalização de visitante) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Resolver cidade/país a partir do IP do visitante no login.
**(b)** `supabase/functions/get-visitor-info/index.ts:31` — **`http://ip-api.com/json/…`, texto claro**.
**(c)** Nenhuma credencial (tier gratuito do ip-api só suporta HTTP).
**(d)** `src/hooks/admin/useIPValidation.ts:21` e `src/pages/auth/Auth.tsx:166`.
**(e)** Sem tabela própria nesta função; o resultado alimenta `log-login-attempt`
(`src/contexts/AuthContext.tsx:365`, `src/hooks/admin/useIPValidation.ts:176`).
**(f)** Timeout de 3s (`get-visitor-info/index.ts:32`) + bot protection com rate limit 30/60s (`:11-16`).
**(g)** 🟨 **PARCIAL — risco de segurança medido.** A chamada usa `fetch` cru, **não** `fetchWithBreaker`,
portanto **escapa do `assertSecureUrl()`** que proíbe `http://` (`supabase/functions/_shared/external-fetch.ts:25-32`).
Dados de geolocalização de usuários trafegam sem TLS. Falta: migrar para endpoint HTTPS ou provedor pago.

---

## A.3 — Comunicação

### 9. Resend (`api.resend.com`) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Envio de e-mail transacional e de relatórios agendados.
**(b)** Três call sites:
- `supabase/functions/send-transactional-email/index.ts:112`
- `supabase/functions/process-scheduled-reports/index.ts:99`
- `supabase/functions/send-scheduled-reports/index.ts:167`

**(c)** `RESEND_API_KEY` — `send-transactional-email/index.ts:102`, `process-scheduled-reports/index.ts:95`,
`send-scheduled-reports/index.ts:25`. **`.env.example`: NÃO.**
Remetente fixo `Promo Gifts <noreply@promogifts.com.br>` (`send-transactional-email/index.ts:116`).
**(d)** **Assimétrico:**
- `send-transactional-email` → **tem chamador real**: `src/hooks/common/useTransactionalEmail.ts:18`
  ← `src/services/quoteService.ts:431` (envio de orçamento).
- `send-scheduled-reports` / `process-scheduled-reports` → **NINGUÉM**. Sem referência em `src/`,
  sem `cron.schedule` em `supabase/migrations/` (grep `functions/v1/` nas migrations retorna apenas
  `connections-auto-test`, `webhook-dispatcher`, `external-db-bridge`, `hash-product-images`,
  `generate-blurhashes`, `backfill-image-dimensions`), sem workflow em `.github/`.

**(e)** `workspace_notifications` (`send-transactional-email/index.ts:92`);
`scheduled_reports` marcada como enviada (`process-scheduled-reports/index.ts:117`,
`send-scheduled-reports/index.ts:65`).
**(f)** Sem chave → 500/erro explícito apontando para `/admin/conexoes`
(`send-transactional-email/index.ts:104-107`). Sem kill-switch.
**(g)** 🟨 **PARCIAL.** Falta: **agendador para os relatórios.** A UI de criação existe
(`src/hooks/intelligence/useScheduledReports.ts:58-124` — CRUD completo de `scheduled_reports`),
mas nada dispara as duas edge functions que os enviariam. O usuário agenda um relatório que nunca sai.
Além disso, `RESEND_API_KEY` não está declarada em nenhum `.env*`.

---

### 10. ElevenLabs — Scribe (STT realtime) ✅ IMPLEMENTADO_TOTAL

**(a)** Transcrição de voz em tempo real para a busca por voz.
**(b)** `supabase/functions/elevenlabs-scribe-token/index.ts:43`
(`/v1/single-use-token/realtime_scribe`).
**(c)** `ELEVENLABS_API_KEY` — `supabase/functions/elevenlabs-scribe-token/index.ts:36`.
**`.env.example`: NÃO.**
**(d)** `src/hooks/voice/scribeTokenCache.ts:43` → `src/hooks/intelligence/useVoiceAgent.ts:2,6`
(SDK `@elevenlabs/react`) → `src/components/search/VoiceSearchOverlayConnected.tsx`,
`src/components/search/AdvancedSearch.tsx:71`, `src/components/search/useGlobalSearch.ts:149`.
**(e)** Token efêmero — não persiste. A evidência de uso é a **tela**: overlay de busca por voz,
com fallback documentado em `src/hooks/voice/webSpeechFallback.ts:2`.
**(f)** Cache de token com invalidação (`scribeTokenCache.ts:61`, `useVoiceAgent.ts:248`);
circuit breaker `elevenlabs` com Retry-After 30s (`_shared/external-fetch.ts:39`);
CSP libera `https://*.elevenlabs.io` **e** `wss://*.elevenlabs.io` (`vercel.json:106`).
**(g)** ✅ **TOTAL** — fluxo fechado ponta a ponta, incluindo WebSocket liberado na CSP e fallback nativo.

---

### 11. ElevenLabs — TTS 🟨 IMPLEMENTADO_PARCIAL

**(a)** Síntese de voz (respostas faladas do agente).
**(b)** `supabase/functions/elevenlabs-tts/index.ts:78`.
**(c)** `ELEVENLABS_API_KEY` — `supabase/functions/elevenlabs-tts/index.ts:50`. **`.env.example`: NÃO.**
**(d)** `src/hooks/voice/playTtsAudio.ts:110` — chamada por `fetch` cru a `functions/v1/elevenlabs-tts`,
**fora do SSOT `invokeEdgeSafe`** (`src/lib/edge/safeInvokeCall.ts`, guardado por
`scripts/check-invoke-direct-calls.mjs:29`).
**(e)** Retorna áudio MP3 — sem persistência, sem log de uso.
**(f)** Allowlist rígida de vozes (`elevenlabs-tts/index.ts:11` — `VALID_VOICE_IDS`).
**(g)** 🟨 **PARCIAL.** Falta: (1) passar pelo wrapper canônico de invocação;
(2) registro de consumo — TTS é cobrado por caractere e não alimenta `ai_usage_logs`.
Existe teste marcado como pulado para o cenário de crédito esgotado:
`tests/p0/external-integrations.test.ts:47` (`it.skip`, *"402 (insufficient credits)"*).

---

### 12. WhatsApp via deep link `wa.me` ✅ IMPLEMENTADO_TOTAL

**(a)** Compartilhamento de produto/kit/mockup/orçamento por WhatsApp.
**(b)** `src/components/products/share/whatsapp.ts:27-28` (helper canônico) + 9 call sites diretos:
`src/components/mockup/ShareMenu.tsx:99`, `src/components/kit-builder/kit-summary/KitActionsBar.tsx:53`,
`src/components/bi/ChurnRiskBanner.tsx:88`, `src/components/simulator/wizard/ConfirmedSummary.tsx:54`,
`src/components/simulator/wizard/StepLocation.tsx:89`,
`src/components/inventory/risk/RupturePanelEma.tsx:107`,
`src/hooks/intelligence/useMagicUpGeneration.ts:482`, `src/hooks/mockup/useMockupGenerator.ts:696`,
`src/components/products/gallery/VideoShareWhatsAppDialog.tsx`.
**(c)** Nenhuma credencial — é URL scheme público, não API.
**(d)** Botões de UI (`window.open`).
**(e)** Sem destino no banco — é navegação para fora.
**(f)** Fallback para `window.location.href` se popup for bloqueado (`whatsapp.ts:37-41`).
**(g)** ✅ **TOTAL** para o que é: deep link. **Não é** integração com WhatsApp Business API (ver §B).

---

## A.4 — CRM / Automação / ERP

### 13. Bitrix24 REST — `bitrix-sync` ⬛ MORTO_OU_ABANDONADO

**(a)** Sincronização bidirecional de empresas e negócios com o Bitrix24.
**(b)** `supabase/functions/bitrix-sync/index.ts` — 8 chamadas:
`:83` `crm.company.list`, `:103` `crm.company.get`, `:115`, `:131` `crm.deal.list`,
`:149-150` `crm.deal.productrows.get`, `:164`, `:205` `crm.deal.add`, `:219` `crm.deal.update`.
**(c)** `BITRIX24_WEBHOOK_URL` — `supabase/functions/bitrix-sync/index.ts:51`. **`.env.example`: NÃO.**
**(d)** **NINGUÉM.** Prova:
- grep por `bitrix-sync` em `src/` retorna **apenas** `src/components/navigation/Breadcrumbs.tsx:56`,
  que é um dicionário de rótulo de breadcrumb — não uma chamada.
- grep por `bitrix` em `src/routes/` = **0 resultados** → a rota `/…/bitrix-sync` que o breadcrumb
  rotularia **não existe**.
- 0 `cron.schedule` apontando para essa função em `supabase/migrations/`.
- 0 referências em `.github/workflows/` e `scripts/`.

**(e)** Destino declarado no código (nunca alcançado): `bitrix_clients` (`:172`, upsert por `bitrix_id`),
`bitrix_deals` (`:196`), `sync_logs` (`:232`).
**(f)** Sem kill-switch. Circuit breaker `bitrix` Retry-After 5s (`_shared/external-fetch.ts:40`).
**(g)** ⬛ **MORTO** — função completa, credencial resolvida pelo SSOT, tabelas de destino previstas,
**e nenhum caminho de execução chega nela**. O rótulo órfão em `Breadcrumbs.tsx:56` é o resíduo de
uma tela que foi removida.
Observação: o **teste de conectividade** com Bitrix continua vivo por outro caminho — ver nº 20.

---

### 14. n8n — webhook de orçamento ✅ IMPLEMENTADO_TOTAL

**(a)** Empurra orçamentos para um workflow n8n, que por sua vez alimenta o Bitrix24.
**(b)** `supabase/functions/quote-sync/index.ts:221` e `:368` (`sendToN8N`);
`supabase/functions/sync-quote-bitrix/index.ts:159`.
**(c)** `N8N_QUOTE_WEBHOOK_URL` — `quote-sync/index.ts:131`, `sync-quote-bitrix/index.ts:82`.
**`.env.example`: NÃO.** Configurável pela UI: `src/components/admin/connections/N8nTab.tsx:96`,
validador em `src/components/admin/connections/secretValidators.ts:124-135`.
**(d)** Frontend:
- `src/hooks/quotes/useQuotes.ts:320` e `:340` (`quote-sync`)
- `src/pages/quotes/quote-view/QuoteBitrixSync.ts:117` e
  `src/pages/quotes/quote-view/QuoteActionHandlers.ts:162` (`sync-quote-bitrix`)

**(e)** `quotes.synced_to_bitrix` (`quote-sync/index.ts:164-171`, `:329`), no **CRM externo**
(cliente separado, `quote-sync/index.ts:25-27`). Modo batch varre pendentes em `:188`.
**(f)** Validação de esquema `https://` obrigatória (`sync-quote-bitrix/index.ts:166`);
falha de upstream vira 502, não 500 (`:180-183`); n8n com corpo vazio é tratado como sucesso (`:187-195`);
**`synced_to_bitrix` só vira `true` se o n8n realmente respondeu** (`quote-sync/index.ts:140-141`)
— isso é o oposto do padrão "marca e esquece" e é a razão de eu classificar como TOTAL.
**(g)** ✅ **IMPLEMENTADO_TOTAL** — chamador real em tela, destino verificável, tratamento de falha
com retry pelo batch. Débito: credencial fora do `.env.example`.

---

### 15. SalesPro (webhook de orçamento) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Segundo destino de sincronização de orçamento (além do n8n).
**(b)** `supabase/functions/quote-sync/index.ts:237` e `:387`.
**(c)** `SALESPRO_WEBHOOK_URL` + `QUOTE_SYNC_API_KEY` — `quote-sync/index.ts:233-234` e `:382-383`.
**`.env.example`: NÃO** (nenhuma das duas). **Não aparecem na UI de conexões**:
grep por `SALESPRO_WEBHOOK_URL` em `src/` = 0 resultados; não está no `ALLOWED_SECRETS` do
`supabase/functions/secrets-manager/index.ts:16-30`, nem em
`src/components/admin/connections/KeysValidationTab.tsx` (que lista 13 chaves, `:58-154`),
nem em `secretImpactMap.ts` (`:79-170`).
**(d)** Mesmo caller do nº 14 (`useQuotes.ts:320`), como ramo condicional.
**(e)** Nenhum. O retorno do SalesPro não é gravado em lugar nenhum.
**(f)** Sem kill-switch. Se a credencial for nula, o ramo simplesmente não executa (`quote-sync/index.ts:384-390`).
**(g)** 🟨 **PARCIAL — dormente por falta de credencial gerenciável.** Falta:
(1) expor `SALESPRO_WEBHOOK_URL`/`QUOTE_SYNC_API_KEY` no `secrets-manager`/UI para que possam ser
preenchidas sem redeploy; (2) declarar no `.env.example`; (3) persistir o resultado.
Como está, é código que só liga se alguém inserir as linhas direto em `integration_credentials`.

---

### 16. Promo Champions (webhook de orçamento) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Sincronização de orçamento com o sistema "Promo Champions".
**(b)** `supabase/functions/quote-sync-promo-champions/index.ts`.
**(c)** `PROMO_CHAMPIONS_WEBHOOK_SECRET` — `quote-sync-promo-champions/index.ts:61`.
**`.env.example`: NÃO.**
**(d)** `src/pages/quotes/quote-view/QuotePromoChampionsSync.ts:45`.
**(e)** NAO_VERIFICADO em detalhe (função fora do escopo de leitura linha a linha desta auditoria).
**(f)** Sem kill-switch identificado.
**(g)** 🟨 **PARCIAL** — e **com defeito conhecido e registrado pelo próprio CI**:
`.audit-credentials-baseline.json:5-6` congela duas violações nesta função —
`quote-sync-promo-champions/index.ts:55:module-scope-credential-read` e `:55:ssot-bypass`.
Leitura de credencial em escopo de módulo significa **valor congelado no cold-start**: rotacionar
o segredo via `/admin/conexoes` **não** tem efeito até o isolate reciclar. Falta: mover a leitura
para dentro do handler via `resolveCredential`.

---

### 17. CRM externo V4 — callback de entrada 🟨 IMPLEMENTADO_PARCIAL

**(a)** Recebe callbacks do CRM externo confirmando processamento de orçamento.
**(b)** `supabase/functions/receive-crm-callback/index.ts` (entrada HTTP; `verify_jwt=false` em
`supabase/config.toml:95-96`).
**(c)** `CRM_CALLBACK_API_KEY` — `receive-crm-callback/index.ts:122`.
**`.env.example`: NÃO.** Também é secret de CI (`.github/workflows/`, `secrets.CRM_CALLBACK_API_KEY`).
**(d)** Externo (o CRM chama). Reprocesso manual: `src/hooks/admin/useV4Callbacks.ts:194`
(`crm-callback-reprocess`).
**(e)** `crm_callback_events` (`receive-crm-callback/index.ts:237-238`, `:326`, `:356`) — tabela de
dead-letter/histórico, lida por `src/hooks/admin/useV4Callbacks.ts`.
**(f)** Sem kill-switch.
**(g)** 🟨 **PARCIAL** — o mesmo `.audit-credentials-baseline.json:7` registra
`receive-crm-callback/index.ts:133:ssot-bypass:CRM_CALLBACK_API_KEY`. Falta corrigir o bypass do SSOT.
O restante do fluxo (recepção → dead-letter → tela de reprocesso) está fechado.

---

### 18. Alertas de callback CRM → GlitchTip/Sentry (server) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Monitorar falhas de `crm_callback_events` e emitir evento Sentry server-side.
**(b)** `supabase/functions/crm-callback-alerts/index.ts:81` (POST no envelope Sentry),
URL montada a partir do DSN em `:60-64`.
**(c)** `SENTRY_DSN_SERVER` — `supabase/functions/crm-callback-alerts/index.ts:172`.
**`.env.example`: NÃO.**
**(d)** **NINGUÉM no repositório.** Sem `cron.schedule`, sem referência em `src/`, sem workflow.
O cabeçalho da função declara a intenção (`crm-callback-alerts/index.ts:18`:
*"Auth: verify_jwt=false (cron server-side). Sem SENTRY_DSN_SERVER → dry-run"*), mas o cron não existe no repo.
**(e)** Lê `system_settings` (`:112`) e `crm_callback_events` (`:123`); escreve fora (Sentry).
**(f)** Ausência de `SENTRY_DSN_SERVER` → modo dry-run (comportamento declarado em `:18`).
**(g)** 🟨 **PARCIAL** — pronta, sem agendador e sem credencial declarada. Falta o `cron.schedule`.
Isto confirma a lacuna registrada em `docs/AUDITORIA-BACKEND-2026-05-25.md:275`
*(fonte documental, citada como pista, não como verdade)*: nada pageia um humano.

---

### 19. MCP Server (expõe dados do ERP a clientes MCP externos) ✅ IMPLEMENTADO_TOTAL

**(a)** Servidor MCP que expõe orçamentos/pedidos/clientes a agentes externos autenticados.
**(b)** `supabase/functions/mcp-server/index.ts` (`verify_jwt=false`, `supabase/config.toml:21-22`).
**(c)** **Não usa env var** — autentica por header `X-MCP-Key` validado contra
`mcp_api_keys.key_hash` (`supabase/functions/mcp-server/index.ts:3`).
`MCP_SHARED_SECRET` existe no `ALLOWED_SECRETS` (`secrets-manager/index.ts:29`) e na UI
(`KeysValidationTab.tsx:154`) mas **não é lida pelo `mcp-server`** — ver §C.
**(d)** Clientes MCP externos. Ciclo de vida das chaves na UI:
`src/components/admin/connections/IssueMcpKeyForm.tsx:117` (`mcp-keys-issue`),
`src/components/admin/security/keys/RotateMcpKeyDialog.tsx:80` (`mcp-keys-rotate`),
`src/components/admin/security/keys/UpdateMcpKeyDialog.tsx:171` (`mcp-keys-update`),
`src/components/admin/connections/McpTab.tsx:91` + `src/components/admin/security/keys/useMcpKeys.ts:254` (`mcp-keys-revoke`).
**(e)** Toda operação é auditada em `admin_audit_log`
(`mcp-server/index.ts:88`, `:389`, `:429`, `:462`); leituras em `quotes` (`:289`, `:309`, `:325`) e `orders` (`:344`).
**(f)** Revogação por chave (`revoked_at`), expiração, escopos
(`_shared/mcp-scopes.ts`, `_shared/mcp-violations.ts`); erros tipados em `mcp-server/index.ts:54-60`
incluindo `MCP_KEY_AUTO_REVOKED_DEV_LOST`.
**(g)** ✅ **TOTAL** — autenticação própria, escopos, auditoria, UI completa de emissão/rotação/revogação,
e o teste de conexão MCP conta chaves ativas (`_shared/connection-test-runner.ts:283-288`).

---

### 20. Testador de conexões (Bitrix24 / n8n / Supabase externos / MCP) ✅ IMPLEMENTADO_TOTAL

**(a)** Health-check ativo de todas as integrações configuradas, com histórico.
**(b)** `supabase/functions/_shared/connection-test-runner.ts`:
`:167` ping Supabase (`/rest/v1/`), `:176-181` ping Bitrix (`/crm.contact.fields.json`),
`:193-201` ping n8n (`/healthz`, header `X-N8N-API-KEY`), `:207-215` ping webhook outbound (POST de teste).
**(c)** Resolvidas em `connection-test-runner.ts:249` (`BITRIX24_WEBHOOK_URL`),
`:259-260` (`N8N_BASE_URL`, `N8N_API_KEY`), `:247-248` (`EXTERNAL_CRM_*` / `EXTERNAL_PROMOBRIND_*`).
`.env.example`: apenas as `EXTERNAL_*` (linhas 105-119); as demais **NÃO**.
**(d)** Três gatilhos reais:
1. Manual: `src/hooks/intelligence/useConnectionTestHistory.ts:50` e
   `src/components/admin/connections/TestAllConnectionsButton.tsx`.
2. **Cron a cada 15 min**: `supabase/migrations/20260619210000_fix_cron_connections_auto_test_canonical_url.sql:35-51`
   → `net.http_post` em `functions/v1/connections-auto-test` com `x-cron-secret`.
3. `connections-health-check` (`supabase/config.toml:51-52`).
**(e)** `external_connections` (update de status/latência, `connection-test-runner.ts:309-315`) e
`connection_test_history` (insert, `:317-327`), lidos por
`src/components/admin/connections/IntegrationsHealthCard.tsx:101,106` e
`ConnectionErrorDetailsDialog.tsx:173`.
**(f)** Timeout por tipo (`_shared/connection-timeouts.ts`); `CONNECTIONS_AUTO_TEST_SECRET`
(`connections-auto-test/index.ts:132`) — com retrocompatibilidade anônima documentada em `:8`.
**(g)** ✅ **TOTAL** — é a integração mais bem instrumentada do repositório: cron real,
tabela de histórico, telas de leitura, classificação de erro (`error_kind`) e auto-registro
da conexão no primeiro teste (`connection-test-runner.ts:328-340`).

---

## A.5 — Fornecedores (catálogo)

### 21. Asia Import (`asia.ajung.site`) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Ingestão do catálogo de produtos do fornecedor Asia Import.
**(b)** `supabase/functions/asia-ingestion/index.ts:11` (base URL) e `:37` (`/api/products?por_pagina=…&pagina=…`).
**(c)** Três nomes:
- `ASIA_BASE_URL` (env, com default hardcoded) — `asia-ingestion/index.ts:11`
- `ASIA_SUPPLIER_ID` (SSOT) — `asia-ingestion/index.ts:104`
- `ASIA_INGESTION_CRON_SECRET` (autorização do cron) — `asia-ingestion/index.ts:90`,
  allowlistado no Vault por `supabase/migrations/20260620150000_fix_catalog_critical_bugs.sql:150`

**`.env.example`: NÃO** (nenhum dos três).
**(d)** **Nenhum gatilho declarado no repositório.** Não há `cron.schedule` apontando para
`asia-ingestion` em `supabase/migrations/` (grep = 0), nem chamador em `src/`, nem workflow.
Só existe a suíte LIVE de teste (`tests/edge-functions/live/asia-ingestion.test.ts:9`).
A migration `…20260620150000…:130-132` diz que a ausência do secret *"blocked ASIA catalog sync"*,
o que **sugere** que o cron existe no banco de produção mas **não está versionado**. NAO_VERIFICADO.
**(e)** `supplier_products_raw` — upsert por `(supplier_id, supplier_sku)`
(`asia-ingestion/index.ts:29-30`). Daí o pipeline Bronze→Silver→Gold assume:
`process-pending-products` a cada 5 min
(`supabase/migrations/20260611120400_fase9_05_restore_main_ingestion_cron.sql:9-13`).
**(f)** `authorizeCron` com header `x-cron-secret` (`asia-ingestion/index.ts:88-93`);
método restrito a POST (`:95`); falha de upstream vira 502 (`:110`).
**(g)** 🟨 **PARCIAL.** Falta: **versionar o `cron.schedule`**. Hoje o agendador é conhecimento
que só existe no banco de produção — exatamente o tipo de estado que some numa recriação de ambiente.
`ASIA_BASE_URL` também tem default de produção hardcoded (`:11`), o que impede detectar má configuração.

---

### 22. XBZ / SPOT (Stricker) / Só Marcas / 88 Brindes 🟦 SUGERIDO_OU_INICIADO

**(a)** Fornecedores do catálogo. **Não há cliente de API para nenhum deles neste repositório.**
**(b)** O que existe são **hostnames de CDN em allowlist**, para consumir *imagens*:
`supabase/functions/_shared/url-allowlist.ts:33-40` (`cdn.xbzbrindes.com.br`, `www.spotgifts.com.br`,
`cdndeprodutos.azureedge.net`, `s.asiaimport.com.br`, `www.88brindes.com.br`) e o mesmo conjunto em
`supabase/functions/image-proxy/index.ts:23-24`.
Também há cores de badge por fornecedor (`src/lib/supplier-colors.ts:15-27`) e menções em comentários
(`src/types/product-catalog.ts:43`, `src/hooks/common/useSearch.ts:268`).
**(c)** Nenhuma credencial. Não há `XBZ_*`, `SPOT_*`, `SOMARCAS_*` em nenhum arquivo do repo.
**(d)** Ninguém — não há chamada de API.
**(e)** Os produtos desses fornecedores chegam a `supplier_products_raw` / `products` por
**outro caminho não versionado aqui** (importação externa). NAO_VERIFICADO.
**(f)** N/A.
**(g)** 🟦 **SUGERIDO_OU_INICIADO** — no escopo deste repositório, XBZ/SPOT/Só Marcas são
**dados**, não integrações. Só o Asia Import (nº 21) tem código de ingestão.

---

### 23. Webhook de produtos (`product-webhook`) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Endpoint de entrada para sincronização de produtos vinda de sistema de fornecedor.
**(b)** `supabase/functions/product-webhook/index.ts` (entrada HTTP).
**(c)** `PRODUCT_WEBHOOK_ALLOWED_ORIGINS` (`:35`), `PRODUCT_WEBHOOK_BATCH_SIZE` (`:16`).
**`.env.example`: NÃO** (ambas).
**(d)** Externo. Único disparador versionado é o **smoke de CI**:
`.github/workflows/contract-tests.yml:119` (`curl -X POST "$SUPABASE_URL/functions/v1/product-webhook"`).
Nenhum produtor de produção identificável no repo.
**(e)** `webhook_request_nonces` (anti-replay, `:165`), `product_sync_logs` (`:306-307`, `:378`),
`products` (`:358`, `:461-527`).
**(f)** Nonce anti-replay (`:165`, migration `supabase/migrations/20260524202319_add_product_webhook_nonces.sql:54`
inclusive com cron de limpeza), allowlist de origem (`:35`), batch size configurável.
**(g)** 🟨 **PARCIAL** — infraestrutura defensiva completa, **produtor desconhecido**.
Falta: documentar/versionar quem posta nesse endpoint.

---

## A.6 — Infraestrutura de mídia

### 24. Cloudflare Images — API de controle ✅ IMPLEMENTADO_TOTAL

**(a)** Reconciliação autoritativa entre `product_images` e o que existe de fato na Cloudflare Images.
**(b)** `supabase/migrations/20260616172001_product_images_cf_reconciliation.sql:29`
(`https://api.cloudflare.com/client/v4/accounts/{acct}/images/v1/`) via `net.http_get` (`:39`).
**Engine 100% Postgres — sem edge function** (`:1`).
**(c)** `CF_ACCOUNT_ID` e `CF_API_TOKEN`, lidos do **Supabase Vault**
(`…cf_reconciliation.sql:24-25`), com exceção explícita se ausentes (`:26-28`).
**`.env.example`: NÃO** (e nem deveriam — são secrets de Vault, não de Edge).
**(d)** **Cron a cada minuto**, versionado:
`supabase/migrations/20260616172002_product_images_cf_reconciliation_cron.sql:7-8`
(`cf-recon-dispatch` 200/min + `cf-recon-collect`).
**(e)** `product_images.cf_sync_status / cf_verified_at / cf_check_attempts / cf_last_error`
(`…cf_reconciliation.sql:63-71`); fila `cf_recon_inflight` (`:10-14`);
view de progresso `v_cf_recon_progress` (`:90`).
**(f)** Limite de 5 tentativas por imagem (`:34`), timeout 8s (`:41`),
GC de inflight > 15 min (`:82`), `REVOKE ALL` das funções para `anon`/`authenticated` (`:87-88`).
**(g)** ✅ **IMPLEMENTADO_TOTAL** — e é o exemplo mais rigoroso do repositório: credencial em Vault,
cron versionado, tabela de estado, view de progresso, e um comentário de campo (`:4-7`) explicando
por que sondar o CDN (`imagedelivery.net`) era **não confiável** (retorna 206 para IDs inexistentes)
e por que a API de controle é a fonte autoritativa. Telas: `/admin/cloudflare-images`
(`src/components/layout/SidebarReorganized.tsx:363-364`),
`src/components/admin/products/image-gallery/ImageGrid.tsx:26-35` (badges por `cf_sync_status`).

---

### 25. Cloudflare Images — CDN (`imagedelivery.net`) ✅ IMPLEMENTADO_TOTAL

**(a)** CDN de entrega das imagens de produto (57k+ segundo `url-allowlist.ts:29`).
**(b)** `src/hooks/products/useProductImages.ts:60` (`CF_BASE`),
`src/components/ui/OptimizedImage.tsx:59-71` (troca de variante para thumbnail),
`src/utils/imageProxy.ts:116`, `src/utils/image-utils.ts:92`.
**(c)** Nenhuma (URLs públicas assinadas por variante).
**(d)** Toda a renderização de catálogo.
**(e)** Leitura — origem é `product_images.cloudflare_image_id`.
**(f)** Validação de host **por hostname parseado**, não por `includes()` —
`src/utils/image-utils.ts:84-92` traz o comentário explicando o bypass evitado
(`imagedelivery.net.evil.com`). CSP libera o host (`vercel.json:106`); preconnect em `index.html:145-146`.
**(g)** ✅ **TOTAL**.

---

### 26. Cloudflare Stream (vídeo) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Hospedagem e player de vídeos de produto.
**(b)** `src/utils/cloudflare-stream.ts:5` (subdomínio `customer-ksi0mrlcw6rwzezz.cloudflarestream.com`)
e `:84` (`iframe.cloudflarestream.com/{streamId}`);
player em `src/components/products/gallery/PromoFlixPlayer.tsx:275`.
**(c)** Nenhuma credencial no repositório para **upload**.
**(d)** Consumo: `src/components/admin/products/ProductVideoGallery.tsx:211`.
**(e)** `product_videos.cloudflare_video_id` / `cloudflare_status`
(`src/components/admin/products/video-gallery/types.ts:14-15`).
**(f)** CSP libera `https://*.cloudflarestream.com`, `https://videodelivery.net` e
`frame-src https://iframe.cloudflarestream.com` (`vercel.json:106`); preconnect em `index.html:149-155`.
**(g)** 🟨 **PARCIAL — só metade do fluxo.** Existe **leitura/reprodução**, não existe **ingestão**:
nenhum código no repositório faz upload para a Stream API nem preenche `cloudflare_video_id`.
Falta o lado de escrita (ou a documentação de que é feito manualmente pelo dashboard CF).

---

### 27. `image-proxy` (proxy de CDNs de fornecedor) ✅ IMPLEMENTADO_TOTAL

**(a)** Proxy server-side para servir imagens brutas de fornecedores que não suportam CORS/HTTPS adequado.
**(b)** `supabase/functions/image-proxy/index.ts` (`verify_jwt=false`, `supabase/config.toml:12-13`);
allowlist em `:23-24`.
**(c)** `IMAGE_PROXY_ALLOW_LOCALHOST` (`image-proxy/index.ts:48`) e
`IMAGE_PROXY_MAX_BYTES` (`:129`, default 5 MB). **`.env.example`: SIM** — linhas 98 e 99.
`VITE_SUPABASE_PROJECT_ID` monta a URL no frontend (`src/utils/imageProxy.ts:42-46`;
`.env.example:28`, com aviso explícito nas linhas 20-27 sobre o bug de URL duplicada).
**(d)** 8+ componentes: `src/components/products/ProductCardImage.tsx:211`,
`src/components/admin/products/image-gallery/ImageGrid.tsx:23`,
`src/components/compare/ImageZoomCell.tsx:6`, `SyncedZoomGallery.tsx:10`,
`src/components/search/SearchResultGroups.tsx:11`, `src/components/clients/ClientDetailHeader.tsx:10`,
`src/components/products/ProductHoverPreview.tsx:9`,
`src/components/products/kit-composition/KitComponentCard.tsx:30`.
**(e)** Streaming direto — sem persistência (é proxy).
**(f)** Circuit breaker `image-cdn` Retry-After 10s (`_shared/external-fetch.ts:38`);
limite de bytes; allowlist de host.
**(g)** ✅ **TOTAL**.

---

### 28. Cloudflare Worker — `og-meta-bot` 🟨 IMPLEMENTADO_PARCIAL

**(a)** Injeta meta tags Open Graph estáticas para crawlers (WhatsApp/Facebook/X/Slack) em `/produto/*` e `/categoria/*`.
**(b)** `cloudflare-workers/og-meta-bot.js:18-33`.
**(c)** `SUPABASE_URL`, `SUPABASE_ANON_KEY` — `cloudflare-workers/og-meta-bot.js:23-24`,
**com fallback hardcoded do projeto canônico** (`:23`) e chave vazia como default (`:24`).
**`.env.example`: NÃO.**
**(d)** Route da Cloudflare — **fora do repositório**. O próprio arquivo declara o deploy manual:
`cloudflare-workers/og-meta-bot.js:4` — *"Deploy: CF Dashboard > Workers > Create > colar codigo"*.
Não há `wrangler.toml`, não há workflow de deploy.
**(e)** Lê `products` e `categories` via PostgREST (`:29`, `:31`). Não escreve.
**(f)** Nenhum.
**(g)** 🟨 **PARCIAL** — código funcional, **deploy manual não automatizado e não verificável**.
Se alguém editar este arquivo, nada acontece em produção até um copy-paste manual. Falta: `wrangler.toml` + CI.

---

## A.7 — Observabilidade / Plataforma

### 29. GlitchTip / Sentry (frontend) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Captura de erros, replay de sessão e métricas de navegação do browser.
**(b)** `src/lib/sentry.ts:78-110` (import dinâmico de `@sentry/react`, `package.json:281`).
**(c)** `VITE_SENTRY_DSN` (`src/lib/sentry.ts:55`, `:81`), `VITE_SENTRY_ENVIRONMENT` (`:85`),
`VITE_VERCEL_GIT_COMMIT_SHA` (`:87`). **`.env.example`: SIM** — linhas 50, 54 e 63 (comentada).
**(d)** `src/main.tsx:18` (`initSentry()`); consumidores:
`src/lib/error-reporter.ts:13`, `src/lib/telemetry/structuredLogger.ts:16`,
`src/lib/telemetry/navigationMetrics.ts:27`, `src/lib/telemetry/magazineMetrics.ts:12`.
**(e)** Externo (GlitchTip/Sentry) — sem tabela local.
**(f)** Três desligamentos:
1. DSN vazio → `shouldLoadSentry()` retorna `false` (`src/lib/sentry.ts:55`) — init é no-op.
2. DSN com formato inválido → também `false`, com aviso (`:57-66`).
3. `VITE_ENABLE_NAV_METRICS` (`src/lib/telemetry/navigationMetrics.ts:56`;
   `.env.production:13` = `true`) + kill switch por navegador
   `localStorage.setItem('nav_metrics_disabled','1')` (`.env.example:76`).
**(g)** 🟨 **PARCIAL.** `VITE_SENTRY_DSN` está **vazia no `.env.example:50`** e
**não aparece em nenhum workflow do GitHub Actions** (grep `VITE_SENTRY` em `.github/workflows/` = 0).
O deploy Vercel (`.github/workflows/deploy-vercel.yml`) não a injeta. Portanto: ou a variável está
configurada diretamente no painel do Vercel (**NAO_VERIFICADO**), ou o Sentry está **inerte em produção**.
Nota de conformidade positiva: replay mascara todo texto e input e bloqueia mídia (`src/lib/sentry.ts:96-100`, "LGPD").

---

### 30. Report-URI (relatórios de CSP) ✅ IMPLEMENTADO_TOTAL

**(a)** Coleta de violações de Content-Security-Policy.
**(b)** `vercel.json:106` (`report-uri https://promogifts.report-uri.com/r/d/csp/enforce`)
e `:110` (`Reporting-Endpoints: csp-endpoint="https://promogifts.report-uri.com/a/d/g"`).
Espelhado em `public/_headers:24-25`.
**(c)** Nenhuma credencial (o endpoint é a própria identificação).
**(d)** O navegador, automaticamente, a cada violação.
**(e)** Externo (report-uri.com).
**(f)** Nenhum — está em modo `enforce`.
**(g)** ✅ **TOTAL** — configurado nos dois pontos de entrega de headers (Vercel + `_headers`).

---

### 31. Vercel (hospedagem/deploy) ✅ IMPLEMENTADO_TOTAL

**(a)** Build e deploy do frontend.
**(b)** `.github/workflows/deploy-vercel.yml:103-122` (`vercel pull` / `build` / `ls`).
**(c)** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — `.github/workflows/deploy-vercel.yml:67`,
mais as `VITE_*`. **`.env.example`: NÃO** (é CI). O `.env.example:57-63` documenta que o Vercel injeta
`VITE_VERCEL_GIT_COMMIT_SHA` automaticamente.
**(d)** GitHub Actions.
**(e)** N/A.
**(f)** **Gate explícito**: se `VERCEL_TOKEN` estiver vazio o job pula com mensagem
(`deploy-vercel.yml:52-77`) — não falha o pipeline.
**(g)** ✅ **TOTAL** — inclusive com CSP e headers de segurança versionados em `vercel.json:13-110`.

---

### 32. GitHub API (validação de credenciais na UI) ✅ IMPLEMENTADO_TOTAL

**(a)** Testar, a partir do painel admin, se o token/repo/branch do GitHub configurados são válidos.
**(b)** `supabase/functions/github-credentials-test/index.ts:103` (`GET /user`),
`:161` (`GET /repos/{repo}`), `:226` (`GET /repos/{repo}/branches/{branch}`).
**(c)** `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_DEFAULT_BRANCH` —
`github-credentials-test/index.ts:78-80`, via `loadSecret` (DB-first, `:33`; env fallback, `:39`).
No `ALLOWED_SECRETS` do `secrets-manager/index.ts` e na UI (`KeysValidationTab.tsx:145-170`).
**`.env.example`: NÃO.**
**(d)** `src/components/admin/connections/GitHubCredentialsTester.tsx:48`.
**(e)** Sem persistência — resultado é exibido como badge por chave (`GitHubCredentialsTester.tsx:38-45`).
**(f)** Exige papel administrativo (`github-credentials-test/index.ts:71`).
**(g)** ✅ **TOTAL** para o escopo declarado (validação). Não há automação que *use* o token
(nenhum commit/PR programático a partir do produto) — o que é correto para uma ferramenta de diagnóstico.

---

### 33. Ecossistema GitHub Actions (CI) ✅ IMPLEMENTADO_TOTAL

**(a)** Quality gates, segurança e publicação.
**(b)** Actions de terceiros em uso: `github/codeql-action/*` (SAST),
`gitleaks/gitleaks-action` (segredos), `supabase/setup-cli`, `denoland/setup-deno`,
`oven-sh/setup-bun`, `peaceiris/actions-gh-pages`, `dorny/paths-filter`,
`dawidd6/action-download-artifact`, `crazy-max/ghaction-github-labeler`.
**(c)** `secrets.GITHUB_TOKEN` (16 usos), `SUPABASE_ACCESS_TOKEN` (13),
`SUPABASE_SERVICE_ROLE_KEY` (11), `SUPABASE_DB_PASSWORD`, `PG*` (5 vars),
`LHCI_GITHUB_APP_TOKEN`, `TEST_*_JWT`, `SUPABASE_TEST_BYPASS_TOKEN`, `V4_CALLBACK_URL`, `KIT_FIXTURE_ID`.
**`.env.example`: NÃO** (são CI).
**(d)** Push/PR/schedule.
**(e)** Artefatos e status checks.
**(f)** `continue-on-error` restrito por política (`CLAUDE.md` REGRA #5 — *pista documental*).
**(g)** ✅ **TOTAL**.

---

### 34. Lighthouse CI 🟨 IMPLEMENTADO_PARCIAL

**(a)** Gate de performance/a11y/SEO.
**(b)** `.github/workflows/deploy-gates.yml:130` (`lhci autorun --config=.lighthouserc.json`).
**(c)** `LHCI_GITHUB_APP_TOKEN` — `.github/workflows/deploy-gates.yml:132`. **`.env.example`: NÃO.**
**(d)** Job `lighthouse` (`deploy-gates.yml:111`).
**(e)** Comentário/status no PR (depende do token).
**(f)** N/A.
**(g)** 🟨 **PARCIAL** — o job usa uma chave Supabase *placeholder*
(`deploy-gates.yml:118`: `VITE_SUPABASE_PUBLISHABLE_KEY: lighthouse-placeholder-key`),
o que significa que a auditoria roda contra uma app **sem backend funcional**.
Mede shell, não a experiência real.

---

### 35. Slack (alerta de sentinela) 🟨 IMPLEMENTADO_PARCIAL

**(a)** Notificar quebra de branch protection e falha de health de produção.
**(b)** `.github/workflows/prod-health.yml:173` (`curl` no webhook) e
`.github/workflows/branch-protection-sentinel.yml:193`.
**(c)** `SENTINEL_SLACK_WEBHOOK` — `prod-health.yml:164`, `branch-protection-sentinel.yml:193`.
**`.env.example`: NÃO.**
**(d)** GitHub Actions, apenas em falha (`prod-health.yml:162`: `if: failure() && env.… != ''`).
**(e)** Externo (Slack).
**(f)** Auto-desliga se o secret estiver vazio
(`branch-protection-sentinel.yml:200`: *"SENTINEL_SLACK_WEBHOOK não configurado — pulando notificação"*).
**(g)** 🟨 **PARCIAL** — é o **único canal de push para humanos** em todo o sistema, e ele é opcional
por design. Cobre apenas 2 workflows de CI; **não cobre erro de runtime em produção**
(a integração nº 18, que faria isso, não tem agendador).

---

### 36. Google Fonts ✅ IMPLEMENTADO_TOTAL

**(a)** Tipografia (Outfit, Plus Jakarta Sans).
**(b)** `index.html:160-162` (preload + stylesheet + noscript), preconnect em `:141-142`.
**(c)** Nenhuma.
**(d)** Carregamento da página.
**(e)** N/A.
**(f)** `display=optional` (`index.html:160`) e carregamento via `media="print" onload` (`:161`)
— não bloqueia render.
**(g)** ✅ **TOTAL**. CSP permite `fonts.googleapis.com` em `style-src` e `fonts.gstatic.com` em `font-src` (`vercel.json:106`).

---

### 37. Google OAuth (login social via Supabase Auth) ✅ IMPLEMENTADO_TOTAL

**(a)** Login com Google.
**(b)** `src/services/authService.ts:143` (`supabase.auth.signInWithOAuth`),
acionado por `src/components/auth/SocialLoginButtons.tsx:158-161`.
**(c)** Client ID/Secret vivem **no painel do Supabase**, não no repositório. NAO_VERIFICADO.
**`.env.example`: N/A** (por design).
**(d)** Botão em `src/components/auth/SocialLoginButtons.tsx:189-201` (`data-testid="social-login-google"`).
**(e)** `auth.users` do Supabase; callback em `/auth/callback` (`SocialLoginButtons.tsx:145`).
**(f)** Timeout duro com fallback automático para e-mail/senha
(`SocialLoginButtons.tsx:150-156`); mapeamento de erro `provider_is_not_enabled` (`:12-13`)
— ou seja, o código **prevê explicitamente** que o provider possa estar desabilitado no Supabase.
**(g)** ✅ **TOTAL** no que o repositório controla. Se o provider está habilitado em produção: **NAO_VERIFICADO**
(mas o tratamento de erro sugere que já esteve desabilitado alguma vez).

---

### 38. Lovable Cloud Auth (`@lovable.dev/cloud-auth-js`) ⬛ MORTO_OU_ABANDONADO

**(a)** Broker de SSO da Lovable (apple/google/lovable/microsoft).
**(b)** `src/integrations/lovable/index.ts:2` (`createLovableAuth`), `:14-38`.
Dependência instalada: `package.json:257` (`"@lovable.dev/cloud-auth-js": "^1.1.2"`).
**(c)** Nenhuma env var — o SDK se autoconfigura.
**(d)** **NINGUÉM.** Prova: grep por `integrations/lovable` em `src/` (excluindo o próprio arquivo)
= **0 resultados**. O único consumidor plausível, `SocialLoginButtons.tsx`, documenta em `:56-64`
que o broker **foi removido**: *"Antes desta refatoração, o componente tinha um broker Lovable Cloud
(@lovable.dev/cloud-auth-js) … Como saímos do Lovable Cloud, agora usamos sempre Supabase Auth direto."*
**(e)** Nenhum.
**(f)** N/A.
**(g)** ⬛ **MORTO** — arquivo órfão + dependência de produção não utilizada.
O cabeçalho `src/integrations/lovable/index.ts:1` (*"auto-generated by Lovable. Do not modify"*)
explica por que sobreviveu: é regenerado pelo bot.
CSP ainda libera `https://api.lovable.dev` e `https://*.lovable.app` em `connect-src` (`vercel.json:106`)
e `https://cdn.gpteng.co` em `script-src` — superfície aberta para código que já não existe.

---

## A.8 — Bancos externos / Bridges

### 39. Supabase externo "Promobrind" (catálogo) ⬛ MORTO_OU_ABANDONADO (como bridge)

**(a)** Ponte para um segundo projeto Supabase que hospedava o catálogo de produtos.
**(b)** `supabase/functions/external-db-bridge/index.ts:1-39` — **a função inteira retorna 410 Gone**
(`:31`). O cabeçalho declara (`:2-8`): *"DECOMMISSIONED … bridge permanently killed via kill-switch
`edge_external_db_bridge`. All traffic routes to REST native (/rest/v1/)."*
**(c)** `EXTERNAL_PROMOBRIND_URL` / `_SERVICE_ROLE_KEY` / `_ANON_KEY`
(`.env.example:110-112`) + aliases legados `EXTERNAL_SUPABASE_*` (`.env.example:115-117`,
mapeados em `_shared/credentials.ts:33-38`). **`.env.example`: SIM.**
**(d)** Frontend ainda tenta (`src/lib/external-db/invoke.ts:235`), mas o kill-switch cliente
intercepta antes (`src/lib/external-db/index.ts:26`) e o 410 é tratado como erro conhecido (`invoke.ts:267`).
**(e)** Nada — a função não toca banco.
**(f)** Kill-switch `edge_external_db_bridge` semeado com **`enabled = false`**:
`supabase/migrations/20260524204148_colapso_p0_kill_switch_table_20260524.sql:41-47`
e `supabase/migrations/20260529164602_…:37-38` (rollout 100%).
**(g)** ⬛ **MORTO por decisão explícita**, e substituído com sucesso:
`src/lib/external-db/rest-native.ts:18` importa `@/integrations/supabase/client` — ou seja,
**o "banco externo" foi colapsado dentro do projeto canônico**. As credenciais `EXTERNAL_PROMOBRIND_*`
continuam vivas só para o *teste de conexão* (nº 20) e para o AI Router (nº 2, `ai-router/index.ts:96-103`).

---

### 40. Supabase externo "CRM" ✅ IMPLEMENTADO_TOTAL

**(a)** Projeto Supabase separado que hospeda empresas/contatos/orçamentos do CRM.
**(b)** `supabase/functions/crm-db-bridge/index.ts:63-86` (cliente dedicado),
`supabase/functions/quote-sync/index.ts:25-27`, `supabase/functions/expert-chat/index.ts:728-730`.
**(c)** `EXTERNAL_CRM_URL`, `EXTERNAL_CRM_SERVICE_ROLE_KEY`, `EXTERNAL_CRM_ANON_KEY`.
**`.env.example`: SIM** — linhas 105-107 (+ aliases `CRM_SUPABASE_*` nas linhas 118-119).
**(d)** `src/lib/crm-db.ts:321` → usado por `src/hooks/crm/useCrmCompanies.ts`,
`src/components/quotes/CompanyContactSelector.tsx`, `src/pages/clients/ClientsPage.tsx`.
**(e)** Leitura/escrita direta no CRM externo (`crm-db-bridge/index.ts:107` — `companies`;
`quote-sync/index.ts:272,276,329` — `quotes`, `quote_items`).
**(f)** Kill-switch `edge_crm_db_bridge` (`crm-db-bridge/index.ts` via `assertSwitchEnabled`),
seed `enabled=true` em `supabase/migrations/20260525200103_corrections_kill_switches.sql:8`.
Warmup de conexão no cold start (`crm-db-bridge/index.ts:94-126`).
**(g)** ✅ **TOTAL** — credenciais declaradas, chamadores em tela, kill-switch, e resolução
em bulk otimizada (`crm-db-bridge/index.ts:77-80`: *"bulk fetch (1 query DB) em vez de 3x resolveCredential"*).

---

## A.9 — Webhooks genéricos

### 41. Webhooks de saída (`webhook-dispatcher`) ✅ IMPLEMENTADO_TOTAL

**(a)** Despacho de eventos do sistema para URLs de terceiros configuradas pelo cliente.
**(b)** `supabase/functions/webhook-dispatcher/index.ts:162` e `:305` (`fetch(hook.url, …)`).
**(c)** `WEBHOOK_DISPATCHER_SECRET` (autorização do próprio dispatcher) — `:53`.
**`.env.example`: SIM** (`.env.example:95`).
Segredo de assinatura **por hook**: `Deno.env.get(hook.secret_ref)` (`:156`, `:300`)
— nome dinâmico vindo da linha de `outbound_webhooks`.
**(d)** Dois gatilhos:
1. **Cron versionado** — 6 referências a `functions/v1/webhook-dispatcher` em `supabase/migrations/`.
2. UI: `src/components/admin/connections/WebhookPlaygroundPanel.tsx:88` e
   `FailedDeliveriesPanel.tsx:69`.
**(e)** `outbound_webhooks` (`:131`, `:205`, `:331`, `:392`) e
`webhook_deliveries` (`:190`, `:283`, `:308`, `:350`), lidos em
`src/components/admin/connections/ConnectionsPulseBar.tsx:245,279`.
**(f)** Kill-switch `edge_webhook_dispatcher` (`:48`), seed `enabled=true`
(`supabase/migrations/20260525200103_corrections_kill_switches.sql:7`
— *"desabilitar para parar todos os webhooks"*).
**(g)** ✅ **TOTAL** — cron, tabela de entregas, painel de falhas, retry e kill-switch de emergência.
Ressalva de arquitetura: `hook.secret_ref` é lido com `Deno.env.get` **direto** (`:156`, `:300`),
fora do SSOT `resolveCredential` — rotação de segredo de webhook exige redeploy.

---

### 42. Webhooks de entrada (`webhook-inbound`) 🟨 IMPLEMENTADO_PARCIAL — **fio partido**

**(a)** Endpoint genérico para receber eventos de terceiros.
**(b)** `supabase/functions/webhook-inbound/index.ts` (`verify_jwt=false`, `supabase/config.toml:18-19`).
**(c)** `WEBHOOK_INBOUND_SIGNING_SECRET` — `webhook-inbound/index.ts:125`. **`.env.example`: NÃO.**
**(d)** Externo. Painel de leitura: `src/components/admin/connections/InboundEventsPanel.tsx:103`.
**(e)** **Aqui está o problema.** A função grava em `public.webhook_events`
(`webhook-inbound/index.ts:182-189`), mas:
1. **Não existe `CREATE TABLE … webhook_events` em `supabase/migrations/`** (grep = 0).
2. **`webhook_events` não existe em `src/integrations/supabase/types.ts`** — só `inbound_webhook_events`
   (`types.ts:2470`).
3. A função chama `increment_webhook_stats(p_source: text, p_event: text)`
   (`webhook-inbound/index.ts:200-203`), mas a RPC é declarada como
   `increment_webhook_stats(p_endpoint_id UUID, p_is_invalid BOOLEAN)`
   (`supabase/migrations/20260526141659_…:9-12`, confirmado em `types.ts:7741-7743`).
   **Assinatura incompatível** — a chamada falha (tratada como não-fatal em `:204`).
4. O painel `InboundEventsPanel.tsx:103` lê `inbound_webhook_events` —
   e **nenhuma edge function escreve nessa tabela** (grep em `supabase/functions/` retorna
   apenas o teste `webhook-inbound/integration_test.ts:78`, o inventário
   `connections-hub-audit/index.ts:39` e uma leitura em `simulation-orchestrator/index.ts:176`).
5. O caminho "v1 compat" é um **stub que não processa nada** (`webhook-inbound/index.ts:230-234`).

**(f)** Flag `WEBHOOK_INBOUND_V1_COMPAT_ENABLED` lida de `integration_credentials`
(`webhook-inbound/index.ts:170-176`) + allowlist `WEBHOOK_INBOUND_V1_ALLOWLIST` (`:212-217`).
**(g)** 🟨 **PARCIAL — fio partido em três pontos.** Falta: criar/versionar `webhook_events`
(ou apontar o insert para `inbound_webhook_events`), corrigir a assinatura da RPC, e conectar o painel
à tabela que de fato recebe dados. Hoje o painel de eventos de entrada mostra vazio por construção.

---

### 43. VirusTotal 🟨 IMPLEMENTADO_PARCIAL

**(a)** Verificação antivírus de arquivos enviados por usuários (logos, artes de personalização).
**(b)** `supabase/functions/secure-upload/index.ts:82` (`/api/v3/files/{sha256}`).
**(c)** `VIRUSTOTAL_API_KEY` — `supabase/functions/secure-upload/index.ts:75`
(via `getCredential`, SSOT). **`.env.example`: NÃO.**
Também **não está** no `ALLOWED_SECRETS` do `secrets-manager/index.ts:16-30`
nem na `KeysValidationTab.tsx` — ou seja, **não é gerenciável pela UI**.
**(d)** `src/components/admin/ImageUploadButton.tsx:59` e
`src/components/admin/security/SecureUploadManager.tsx:75`.
**(e)** `file_scan_logs` (`secure-upload/index.ts:114`, `:148`, `:184`), lido por
`src/components/admin/security/SecureUploadManager.tsx:46`.
**(f)** **Degrada silenciosamente**: se `vtApiKey` for nulo, o bloco inteiro é pulado
(`secure-upload/index.ts:77`) e o arquivo é aceito com
`scan_result: { message: "Arquivo recebido para análise" }` (`:64`) — ou seja,
**um log que parece verificação, mas não é**. Timeout de 10s (`:79`);
404 do VirusTotal = "arquivo novo, permitido" (`:101-103`).
**(g)** 🟨 **PARCIAL — falha aberta por design.** Falta: (1) tornar a chave gerenciável pela UI;
(2) declarar no `.env.example`; (3) distinguir no `file_scan_logs` entre "verificado e limpo" e
"não verificado por falta de credencial" — hoje o operador não consegue saber se a varredura ocorreu.

---

### 44. Dropbox 🟨 IMPLEMENTADO_PARCIAL

**(a)** Navegação de arquivos de uma pasta Dropbox (fonte de artes/catálogos).
**(b)** `supabase/functions/dropbox-list/index.ts:66` (`/2/files/list_folder/continue`)
e `:76` (`/2/files/list_folder`).
**(c)** `DROPBOX_ACCESS_TOKEN` — `supabase/functions/dropbox-list/index.ts:43`. **`.env.example`: NÃO.**
**(d)** `src/hooks/intelligence/useDropboxFiles.ts:30` (`action: 'check'`) e `:47` (listagem)
→ `src/pages/tools/DropboxBrowserPage.tsx:23`.
**(e)** **Nenhum.** A listagem volta direto para a tela; nada é persistido, nada é importado.
**(f)** Endpoint `action: 'check'` (`dropbox-list/index.ts:44-49`) permite à UI mostrar
"conectado/não conectado" sem token. Circuit breaker `dropbox` Retry-After 15s
(`_shared/external-fetch.ts:38`). 401 → mensagem específica apontando para `/admin/conexoes` (`:97-107`).
**(g)** 🟨 **PARCIAL — é um visualizador, não uma integração de dados.** Falta: importação
(nada do Dropbox entra no catálogo) e renovação de token — `DROPBOX_ACCESS_TOKEN` é token de
acesso de vida curta na API v2 do Dropbox e **não há refresh token nem fluxo OAuth** no repositório,
o que torna a integração auto-expirante. A própria mensagem de erro em `:100` admite isso
(*"Token Dropbox expirado ou inválido. Reconfigure…"*).

---

# B) INTEGRAÇÕES APENAS SUGERIDAS / PLANEJADAS

> **Nada abaixo tem código executável.** Origem citada; tratar como intenção, não como estado.

| Integração | Origem (arquivo:linha) | O que existe de fato |
|---|---|---|
| **Twilio (SMS + WhatsApp)** | `docs/NOTIFICATION_SYSTEM.md:45`, `:90-91`, `:127-130` | **Nada.** Grep por `TWILIO`/`twilio` em `src/`, `supabase/`, `scripts/` retorna **1 ocorrência**, e é um comentário de teste sobre limite de caracteres (`src/components/products/share/__tests__/MessageTemplates.test.ts:77`). O doc afirma *"✅ SMS - Twilio (estrutura pronta)"* — **isso é falso**: não há estrutura. |
| **Mercado Pago** | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:277`, `:666` | Nada. `src/lib/payments/` contém apenas `order-payment-simulator.ts` — simulador local, sem gateway. |
| **WhatsApp Business API** | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:359-365`, `:668` | Nada. O que existe é deep link `wa.me` (nº 12), que **não é** a Business API. |
| **PagerDuty / Opsgenie** | `docs/AUDITORIA-BACKEND-2026-05-25.md:275` | Nada — o próprio doc registra a ausência. |
| **Alertas Slack/e-mail para erros críticos** | `docs/AUDITORIA_2026-05-07.md:814` (checkbox não marcado), `docs/OBSERVABILITY.md:56-61` (tabela de rotas de alerta "Slack #ops/#int/#ai") | Só o webhook de CI (nº 35). As rotas `#ops`/`#int`/`#ai` do `OBSERVABILITY.md` **não existem em código**. |
| **`MCP_SERVER_URL`** | `src/components/admin/connections/secretValidators.ts:141`, `secretNormalizers.ts:192` | Validador e normalizador de UI para uma chave que **nenhuma edge function lê**. Ver §C. |
| **`BITRIX24_DOMAIN` / `BITRIX24_USER_ID` / `BITRIX24_TOKEN`** | `KeysValidationTab.tsx:111-121`, `secretImpactMap.ts:103-121`, `secrets-manager/index.ts:24-26` | Gerenciáveis pela UI, **mas nenhum consumidor os usa para chamar o Bitrix** — `bitrix-sync` só lê `BITRIX24_WEBHOOK_URL`. Ver §C. |
| **`N8N_BASE_URL` / `N8N_API_KEY`** | `N8nTab.tsx:96`, `KeysValidationTab.tsx:135-140` | Usados **exclusivamente** pelo ping `/healthz` do testador (`_shared/connection-test-runner.ts:259-260`). Nenhum workflow n8n é acionado por eles — o disparo real usa `N8N_QUOTE_WEBHOOK_URL` (nº 14). |
| **Cron jobs de notificação** (`process-queue`, `send-digest`, `cleanup-notifications`) | `supabase/cron/cron-config.sql:12-56` | Arquivo **fora de `supabase/migrations/`** — não é aplicado por nenhum pipeline. Além disso depende de `current_setting('app.supabase_url')` (`:18`), GUC que não é definida em migration alguma. Status de aplicação em produção: **NAO_VERIFICADO**. |
| **Google Analytics / GTM / Meta Ads** | — | Nenhuma menção em código ou doc. Confirmado ausente. |
| **Stripe / PagSeguro / Asaas** | — | Nenhuma menção. Confirmado ausente. |
| **Correios / Melhor Envio / cálculo de frete** | — | Nenhuma menção em código. Existe simulador de logística (`src/components/simulator/wizard/StepLocation.tsx`) que **não chama transportadora**. |

---

# C) CRUZAMENTO `.env.example` × CÓDIGO

## C.1 — Credenciais declaradas sem uso

Varredura de **todas** as 20 variáveis de `.env.example` e das 4 de `.env.e2e.example`:

**Resultado: nenhuma variável declarada está órfã.** Todas têm consumidor:

| Variável | `.env.example` | Consumidor |
|---|---|---|
| `VITE_SUPABASE_URL` / `_PROJECT_ID` / `_ANON_KEY` / `_PUBLISHABLE_KEY` | :18, :28, :35, :37 | `src/integrations/supabase/client.ts`, `src/utils/imageProxy.ts:42-46` |
| `VITE_SENTRY_DSN` / `_ENVIRONMENT` | :50, :54 | `src/lib/sentry.ts:55`, `:85` |
| `VITE_VERCEL_GIT_COMMIT_SHA` | :63 (comentada) | `src/lib/sentry.ts:87` |
| `VITE_SHOW_DEV_INFRA_MESSAGES` | :71 (comentada) | `src/lib/system/dev-gate/providers.ts:31` |
| `VITE_ENABLE_NAV_METRICS` | :77 (comentada) | `src/lib/telemetry/navigationMetrics.ts:56` |
| `VITE_NAV_METRICS_SAMPLE_RATE` | :80 (comentada) | `src/lib/telemetry/navigationMetrics.ts:66` |
| `E2E_CLEANUP_TOKEN` / `_ALLOWED_EMAILS` | :90, :91 | `supabase/functions/e2e-cleanup/index.ts:48`, `:49` |
| `CONNECTIONS_AUTO_TEST_SECRET` | :94 | `supabase/functions/connections-auto-test/index.ts:132` |
| `WEBHOOK_DISPATCHER_SECRET` | :95 | `supabase/functions/webhook-dispatcher/index.ts:53` |
| `IMAGE_PROXY_ALLOW_LOCALHOST` / `_MAX_BYTES` | :98, :99 | `supabase/functions/image-proxy/index.ts:48`, `:129` |
| `LOVABLE_API_KEY` | :102 | `supabase/functions/_shared/ai-credentials.ts:34` (+8 funções) |
| `EXTERNAL_CRM_URL` / `_SERVICE_ROLE_KEY` / `_ANON_KEY` | :105-107 | `supabase/functions/quote-sync/index.ts:25-27` |
| `EXTERNAL_PROMOBRIND_*` | :110-112 | `supabase/functions/_shared/connection-test-runner.ts:247-248` |
| `EXTERNAL_SUPABASE_*` / `CRM_SUPABASE_*` (aliases) | :115-119 | `supabase/functions/_shared/credentials.ts:33-41` |

**Porém — credenciais gerenciáveis pela UI sem nenhum consumidor real** (o equivalente funcional
de "declarada sem uso", só que num cofre diferente):

| Credencial | Onde é declarada/gerenciada | Por que está órfã |
|---|---|---|
| `BITRIX24_DOMAIN` | `supabase/functions/secrets-manager/index.ts:24`; `KeysValidationTab.tsx:111` | Nenhuma função a lê para chamar o Bitrix. `bitrix-sync/index.ts:51` usa só `BITRIX24_WEBHOOK_URL`. |
| `BITRIX24_USER_ID` | `secrets-manager/index.ts:25`; `KeysValidationTab.tsx:116` | idem |
| `BITRIX24_TOKEN` | `secrets-manager/index.ts:26`; `KeysValidationTab.tsx:121` | idem — só aparece em `_shared/credentials.test.ts:136-153` (fixture de teste) |
| `MCP_SHARED_SECRET` | `secrets-manager/index.ts:29`; `KeysValidationTab.tsx:154` | `mcp-server/index.ts:3` autentica por `X-MCP-Key` contra `mcp_api_keys.key_hash`. O shared secret não é lido em lugar nenhum. |
| `MCP_SERVER_URL` | `secretValidators.ts:141`, `secretNormalizers.ts:192` | Existe validador e normalizador de UI; **nem sequer está no `ALLOWED_SECRETS`** do `secrets-manager`. Zero consumidores. |
| `N8N_BASE_URL` / `N8N_API_KEY` | `secrets-manager/index.ts:28`; `N8nTab.tsx:96` | Usados só pelo ping de health (`connection-test-runner.ts:259-260`). Nenhuma automação depende deles. |

---

## C.2 — Uso sem credencial declarada

**Este é o achado estrutural mais relevante desta auditoria.** O `.env.example` declara **5**
secrets de servidor de integração; o código exige no mínimo **28**. Lista completa das ausentes:

| Credencial exigida pelo código | `arquivo:linha` | Integração | Gerenciável pela UI? |
|---|---|---|---|
| `CNPJA_API_KEY` | `supabase/functions/cnpj-lookup/index.ts:80` | CNPJá (nº 5) | ❌ |
| `RESEND_API_KEY` | `supabase/functions/send-transactional-email/index.ts:102` | Resend (nº 9) | ❌ |
| `ELEVENLABS_API_KEY` | `supabase/functions/elevenlabs-scribe-token/index.ts:36` | ElevenLabs (nº 10, 11) | ❌ |
| `DROPBOX_ACCESS_TOKEN` | `supabase/functions/dropbox-list/index.ts:43` | Dropbox (nº 44) | ❌ |
| `DEEPSEEK_API_KEY` | `supabase/functions/word-magic/index.ts:213` | DeepSeek (nº 3) | ❌ |
| `HF_ACCESS_TOKEN` | `supabase/functions/visual-search/index.ts:113` | Hugging Face (nº 4) | ❌ |
| `VIRUSTOTAL_API_KEY` | `supabase/functions/secure-upload/index.ts:75` | VirusTotal (nº 43) | ❌ |
| `BITRIX24_WEBHOOK_URL` | `supabase/functions/bitrix-sync/index.ts:51` | Bitrix24 (nº 13, 20) | ✅ `secrets-manager:23` |
| `N8N_QUOTE_WEBHOOK_URL` | `supabase/functions/quote-sync/index.ts:131` | n8n (nº 14) | ✅ `N8nTab.tsx` |
| `SALESPRO_WEBHOOK_URL` | `supabase/functions/quote-sync/index.ts:233` | SalesPro (nº 15) | ❌ |
| `QUOTE_SYNC_API_KEY` | `supabase/functions/quote-sync/index.ts:234` | SalesPro (nº 15) | ❌ |
| `PROMO_CHAMPIONS_WEBHOOK_SECRET` | `supabase/functions/quote-sync-promo-champions/index.ts:61` | Promo Champions (nº 16) | ❌ |
| `CRM_CALLBACK_API_KEY` | `supabase/functions/receive-crm-callback/index.ts:122` | CRM V4 (nº 17) | ❌ (é GH Secret) |
| `GITHUB_TOKEN` / `GITHUB_REPO` / `GITHUB_DEFAULT_BRANCH` | `supabase/functions/github-credentials-test/index.ts:78-80` | GitHub (nº 32) | ✅ `secrets-manager` |
| `SENTRY_DSN_SERVER` | `supabase/functions/crm-callback-alerts/index.ts:172` | GlitchTip server (nº 18) | ❌ |
| `CF_ACCOUNT_ID` / `CF_API_TOKEN` | `supabase/migrations/20260616172001_…:24-25` | Cloudflare Images (nº 24) | ❌ (Vault) |
| `ASIA_BASE_URL` | `supabase/functions/asia-ingestion/index.ts:11` | Asia Import (nº 21) | ❌ |
| `ASIA_SUPPLIER_ID` | `supabase/functions/asia-ingestion/index.ts:104` | Asia Import (nº 21) | ❌ |
| `ASIA_INGESTION_CRON_SECRET` | `supabase/functions/asia-ingestion/index.ts:90` | Asia Import (nº 21) | ❌ (Vault, `…20260620150000…:150`) |
| `CRON_SECRET` | `supabase/functions/asia-ingestion/index.ts` (+45 refs) | Autorização de cron | ❌ (Vault) |
| `WEBHOOK_INBOUND_SIGNING_SECRET` | `supabase/functions/webhook-inbound/index.ts:125` | Webhook inbound (nº 42) | ❌ |
| `PRODUCT_WEBHOOK_ALLOWED_ORIGINS` / `_BATCH_SIZE` | `supabase/functions/product-webhook/index.ts:35`, `:16` | product-webhook (nº 23) | ❌ |
| `MOCKUP_FETCH_ALLOWED_HOSTS` | `supabase/functions/generate-mockup/index.ts:124` | Geração de mockup | ❌ |
| `SIMULATION_BYPASS_KEY` | `supabase/functions/visual-search/index.ts:136` | Bypass de teste | ❌ |
| `CSRF_SECRET` | `supabase/functions/` (2 refs) | Segurança | ❌ |
| `MAGAZINE_IP_SALT` | `supabase/functions/` (2 refs) | Anonimização de leitor | ❌ |
| `ADMIN_BATCH_TOKEN` | `supabase/functions/` (1 ref) | Operações em lote | ❌ |
| `AI_ROUTER_DISABLE` / `ALLOW_HTTP_FETCH` / `LOG_CREDENTIAL_RESOLUTION` / `LOG_CRM_BRIDGE_VERBOSE` / `ENVIRONMENT` | `_shared/ai-usage.ts:225`, `_shared/external-fetch.ts:26` etc. | Flags operacionais | ❌ |

**Consequência prática:** um desenvolvedor que siga o `.env.example` literalmente
consegue rodar Supabase + Lovable AI + CRM externo, e **mais nada**. Todas as demais integrações
falham silenciosamente ou com 503. As linhas 82-87 do `.env.example` prometem
*"Essas variáveis devem ser configuradas no Supabase (Edge Functions Secrets) e no GitHub Actions"* —
mas a lista abaixo dessa promessa cobre menos de 20% do que o código realmente lê.

---

# D) INTEGRAÇÕES DESLIGADAS POR KILL-SWITCH

## D.1 — `system_kill_switches` (tabela, checada em runtime)

Checagem em `supabase/functions/_shared/kill_switch.ts:85-90` (cache 60s, timeout 1,5s, **fail-open** `:16`).
Retorna HTTP **410 Gone** quando desligado (`kill_switch.ts:7`).

| Switch | Função que checa | Seed no repo | Estado semeado |
|---|---|---|---|
| `edge_external_db_bridge` | *(nenhuma — a função virou stub 410)* | `supabase/migrations/20260524204148_…:41-47` e `20260529164602_…:37-38` | **`false` — DESLIGADO** |
| `edge_crm_db_bridge` | `supabase/functions/crm-db-bridge/index.ts` | `supabase/migrations/20260525200103_…:8` | `true` (ligado) |
| `edge_webhook_dispatcher` | `supabase/functions/webhook-dispatcher/index.ts:48` | `…20260525200103…:7` | `true` |
| `edge_bi_copilot` | `supabase/functions/bi-copilot/index.ts:56` | `…20260525200103…:10` | `true` |
| `edge_expert_chat` | `supabase/functions/expert-chat/index.ts` | `…20260525200103…:9` | `true` |
| `edge_generate_mockup` | `supabase/functions/generate-mockup/index.ts:347` | `supabase/migrations/20260531120000_…:44` | NAO_VERIFICADO (seed corretivo) |
| `edge_ai_recommendations` | **NENHUMA** — switch inerte | `…20260525200103…:8` | `true`, mas sem efeito |

**Única integração comprovadamente desligada por kill-switch: `external-db-bridge`** (nº 39),
com `enabled=false` semeado e a função reescrita como stub 410.
Espelho no cliente: `src/lib/external-db/bridge-status-events.ts:4`
(*"permanently OFF (kill-switch enabled=false, rollout=100%)"*).

⚠️ **Os estados acima são apenas os `INSERT … ON CONFLICT DO NOTHING` das migrations.**
A tabela é editável em runtime por admin
(`supabase/migrations/20260524210300_…:28,33` — policies de INSERT/UPDATE).
**O estado real em produção é NAO_VERIFICADO.**

## D.2 — CSP `connect-src` (kill-switch de fato para o frontend)

`vercel.json:106` e `public/_headers:24` restringem, em modo **enforce**, os destinos de rede do browser.
Hosts liberados: `*.supabase.co`, `wss://*.supabase.co`, `api.lovable.dev`, `*.lovable.app`,
`*.ingest.sentry.io`, `*.glitchtip.io`, `*.elevenlabs.io`, `wss://*.elevenlabs.io`, `api.cnpja.com`,
`*.bitrix24.com.br`, `*.bitrix24.com`, `fonts.googleapis.com`, `fonts.gstatic.com`,
`imagedelivery.net`, `*.cloudflarestream.com`, `videodelivery.net`.

**Dois hosts usados em código estão FORA da lista — logo, bloqueados em produção:**

| Host bloqueado | Chamado em | Efeito |
|---|---|---|
| `https://viacep.com.br` | `src/utils/viacep.ts:20` | Auto-preenchimento de endereço por CEP **não funciona**. Falha engolida pelo `catch{}` em `:27`. |
| `https://api.ipify.org` | `src/hooks/admin/useAllowedIPs.ts:41`, `src/hooks/admin/useIPValidation.ts:26` | Detecção de IP próprio **não funciona** na tela de allowlist. |

Inversamente, a CSP libera hosts de integrações **mortas** — `api.lovable.dev` e `*.lovable.app`
(nº 38, sem consumidor) e `cdn.gpteng.co` em `script-src` — superfície de ataque sem contrapartida.

## D.3 — Outros desligamentos

| Mecanismo | Local | Efeito |
|---|---|---|
| `AI_ROUTER_DISABLE=true` | `supabase/functions/_shared/ai-usage.ts:225` | Força todo tráfego de IA para o gateway Lovable legacy. Não setado no repo. |
| `ALLOW_HTTP_FETCH=1` | `supabase/functions/_shared/external-fetch.ts:26` | Desativa a proibição de `http://` em fetches externos. Não setado no repo. |
| `WEBHOOK_INBOUND_V1_COMPAT_ENABLED` | `supabase/functions/webhook-inbound/index.ts:170-176` (lido de `integration_credentials`) | Ativa um caminho v1 que hoje é stub vazio (`:230-234`). |
| Circuit breakers | `supabase/functions/_shared/external-fetch.ts:36-42` | Abrem automaticamente após falhas: `cnpja` (1h), `elevenlabs` (30s), `dropbox` (15s), `image-cdn` (10s), `bitrix` (5s). |
| `is_active` por provider/model de IA | `supabase/functions/_shared/ai-router/index.ts:245`, `:255` | Desliga provedor individual. |
| `revoked_at` / expiração de chave MCP | `supabase/functions/mcp-server/index.ts:55-57` | Desliga cliente MCP individual. |
| `localStorage.nav_metrics_disabled='1'` | `.env.example:76` | Desliga métricas de navegação por navegador. |
| Gate de `VERCEL_TOKEN` vazio | `.github/workflows/deploy-vercel.yml:52-77` | Pula o deploy sem falhar o pipeline. |
| Gate de `SENTINEL_SLACK_WEBHOOK` vazio | `.github/workflows/branch-protection-sentinel.yml:200` | Pula a notificação Slack. |

---

# E) COBERTURA DA VARREDURA

## E.1 — Método aplicado

1. **Endpoints de terceiros por host** — `grep -rn "https://"` em `src/`, `supabase/functions/`,
   `scripts/`, `cloudflare-workers/`, `api/` (`.ts`, `.tsx`, `.mjs`, `.js`), excluindo
   `supabase.co`, `w3.org`, `schema.org`, `localhost`, `example.com`. 60+ hosts distintos triados
   manualmente; fixtures de teste (`evil.com`, `attacker.com`, `cdn.test`, `from-env.example.co`)
   descartados após inspeção.
2. **Credenciais** — `grep -rhoE "Deno\.env\.get\(['\"][A-Z0-9_]+"` em `supabase/functions/`
   (46 nomes distintos), mais `import.meta.env` em `src/` e `process.env` em `scripts/`.
3. **SSOT de credenciais** — `grep -rn "resolveCredential(['\"]"` e `getCredential(` → 30 call sites
   com nome literal, mapeados 1:1 para `arquivo:linha`.
4. **`.env.example` e `.env.e2e.example` lidos integralmente** (linha a linha, 119 e 29 linhas)
   e cruzados individualmente contra o código — resultado em §C.
   `.env.production` também lido (13 linhas).
5. **Webhooks** — `grep -rn "webhook"` em `src/`, `supabase/`, `scripts/`, `.github/`.
6. **Gatilhos** — três varreduras independentes:
   - `grep -rn "functions/v1/" supabase/migrations/*.sql` (cron → edge)
   - `grep -rn "cron.schedule" supabase/migrations/` (60+ jobs)
   - mapeamento de **cada uma das 118 pastas** em `supabase/functions/` contra referências em `src/`,
     `e2e/`, `tests/`, `scripts/`, `.github/` e `supabase/migrations/` — foi assim que
     `bitrix-sync`, `crm-callback-alerts`, `send-scheduled-reports` e `asia-ingestion`
     foram identificados como sem chamador.
7. **Destinos** — `grep -nE "\.from\(|insert\(|upsert\(|rpc\("` por função, cruzado com
   `src/integrations/supabase/types.ts` e com as telas que leem cada tabela.
8. **Fornecedores/parceiros do ramo** — busca dirigida por XBZ, SPOT/Stricker, Asia Import,
   Só Marcas, 88 Brindes, Bitrix, Dropbox, ElevenLabs, OpenAI/Anthropic/Gemini/DeepSeek/HuggingFace,
   Sentry/GlitchTip, Vercel, Cloudflare, GitHub, Lovable, n8n, WhatsApp/Evolution, Resend/SendGrid,
   Stripe/Mercado Pago/PagSeguro/Asaas, Google (Auth/Maps/Analytics), Correios/Melhor Envio,
   CNPJ/Receita/ViaCEP, Twilio, Zapier/Make, Slack.
9. **Configuração de plataforma** — `index.html`, `vercel.json`, `public/_headers`,
   `supabase/config.toml`, `.github/workflows/*` (`secrets.*` e `uses:`), `package.json`
   (deps de SDK de terceiros), `.audit-credentials-baseline.json`.

## E.2 — O que ficou de fora (e por quê)

| Fora do escopo | Motivo |
|---|---|
| **Se cada credencial existe de fato em produção** | Impossível verificar a partir do repositório. Vale para Edge Secrets, Vault, `integration_credentials`, GitHub Secrets e variáveis do painel Vercel. **NAO_VERIFICADO** em toda a tabela mestra. |
| **Conteúdo de `system_kill_switches` em produção** | A tabela é editável em runtime (`…20260524210300…:28,33`). Só os seeds das migrations foram lidos. |
| **Conteúdo de `ai_providers` / `ai_models` / `ai_function_routing`** | Nenhuma migration os semeia; vivem num projeto Supabase externo (`ai-router/index.ts:95-96`). |
| **Cron jobs criados fora de migration** | Há evidência forte de que existem (ex.: `…20260620150000…:130-132` fala de sync ASIA bloqueado por secret, mas o `cron.schedule` correspondente não está versionado). Só `pg_catalog`/`cron.job` responderia. |
| **Workflows n8n** | Vivem no servidor n8n. São o gatilho real de `word-magic` (nº 3) e o destino de `quote-sync` (nº 14). Fora do repositório. |
| **Worker `og-meta-bot` em produção** | Deploy manual por copy-paste (`cloudflare-workers/og-meta-bot.js:4`); não há `wrangler.toml`. Não há como saber qual versão está no ar. |
| **Conteúdo de `supabase/migrations-snapshot/ALL_IN_ONE.sql`** | Arquivo consolidado redundante; usei as migrations individuais como fonte. |
| **`docs/` como estado** | Por instrução. Usado apenas como pista de intenção em §B, sempre com origem citada. |
| **Testes** (`tests/`, `e2e/`, `*.test.ts`) | Excluídos da contagem de "chamador real" — um teste não é evidência de uso em produção. Citados só quando informam sobre estado (ex.: `it.skip` em `tests/p0/external-integrations.test.ts:47`). |
| **Auditoria via `pg_catalog`** | Não executada. Conforme CLAUDE.md REGRA #8 (corolário), auditoria de schema exige `pg_catalog` — esta auditoria é **estática, sobre o repositório**, e não afirma nada sobre o estado do banco. |

## E.3 — Contagem final

| Classificação | Qtd | Itens |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | **18** | 1, 5, 10, 12, 14, 19, 20, 24, 25, 27, 30, 31, 32, 33, 36, 37, 40, 41 |
| 🟨 IMPLEMENTADO_PARCIAL | **22** | 2, 3, 4, 6, 7, 8, 9, 11, 15, 16, 17, 18, 21, 23, 26, 28, 29, 34, 35, 42, 43, 44 |
| 🟦 SUGERIDO_OU_INICIADO | **1 + 11** | 22 (fornecedores XBZ/SPOT/Só Marcas/88 Brindes) + as 11 linhas da §B |
| ⬛ MORTO_OU_ABANDONADO | **3** | 13 (`bitrix-sync`), 38 (Lovable Cloud Auth), 39 (`external-db-bridge`) |

Total: **44 integrações numeradas** na tabela mestra + 11 sugestões só documentais.

## E.4 — Os cinco fios partidos, em ordem de gravidade

1. **`webhook-inbound` grava numa tabela inexistente** e chama uma RPC com assinatura errada;
   o painel de leitura aponta para outra tabela que ninguém escreve (nº 42).
   Todo webhook de entrada recebido é perdido.
2. **Relatórios agendados não têm agendador** (nº 9) — a UI cria `scheduled_reports`,
   nenhuma automação os envia.
3. **`viacep` e `ipify` são bloqueados pela própria CSP do projeto** (§D.2) e falham em silêncio.
4. **`bitrix-sync` está morto** (nº 13) — 8 chamadas ao CRM, 3 tabelas de destino, zero caminhos de execução.
5. **VirusTotal falha aberto** (nº 43) — sem chave, o upload é aceito e o log registra
   "Arquivo recebido para análise", indistinguível de uma varredura real.

---

*Documento gerado por auditoria estática somente-leitura em 2026-08-16. Nenhum arquivo do projeto
foi modificado além deste. Nenhum valor de segredo foi lido, transcrito ou inferido.*
