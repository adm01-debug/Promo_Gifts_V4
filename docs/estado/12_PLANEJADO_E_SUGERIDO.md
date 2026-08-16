# 12 — Planejado, Sugerido e Prometido × Realidade do Código

> **Auditoria de estado — lote 12.** Levantamento de tudo que foi **sugerido, planejado,
> prometido ou proposto** para o `promo-gifts-v4`, confrontado item a item com o código
> executável do repositório.
>
> **Data da auditoria:** 2026-08-16 · **Branch:** `claude/system-status-roadmap-oe6awn` ·
> **HEAD:** `f73ecef`
> **Modo:** somente leitura. Nenhum arquivo do sistema foi alterado.

---

## 0. Aviso metodológico — documento não é prova

Este relatório parte de uma constatação verificada: **a documentação deste repositório cita
como existentes arquivos que não existem**. Uma varredura automatizada de todas as referências
a arquivos (`*.ts|tsx|mjs|sql`) em 263 documentos `.md` encontrou:

| Métrica | Valor | Comando |
|---|---|---|
| Referências a arquivo quebradas (caminho não resolve) | **284** | script Python sobre `docs/**/*.md` + `.md` da raiz |
| Dessas, **inexistentes em qualquer caminho** (basename não existe no repo) | **120** | idem, cruzando com índice de `src/`, `supabase/`, `scripts/`, `tests/`, `e2e/` |
| Concentradas em `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` | **93** | idem |

Por isso, **cada item abaixo tem um comando de verificação executado e seu resultado**.
Onde não foi possível verificar (estado de banco de produção, GitHub, Vercel), o item está
marcado `NAO_VERIFICADO`.

### Legenda de classificação

| Rótulo | Significado |
|---|---|
| 🟦 SUGERIDO_OU_INICIADO | Só existe em documentação/TODO, ou há esqueleto sem consumo real |
| 🟨 IMPLEMENTADO_PARCIAL | Existe algo real no código, porém incompleto |
| ✅ IMPLEMENTADO_TOTAL | Promessa cumprida, com evidência de código forte |
| ⬛ MORTO_OU_ABANDONADO | Foi construído e depois removido/desligado |
| ❌ NUNCA_MATERIALIZADO | Planejado, **nenhum vestígio** no código executável |

---

## A. TABELA MESTRA — Planejado × Realidade

### A.1 Funcionalidades de negócio

| # | Item planejado | Origem (arquivo:linha) | Data da proposta | Comando de verificação | Resultado | Classificação |
|---|---|---|---|---|---|---|
| N01 | **Módulo de Pedidos (Orders)** — listar, detalhe, status, tracking, notas | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:187`; `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:447` (cita `src/pages/OrdersPage.tsx` + `src/hooks/useOrders.ts`) | doc datado 03/03/2026 | `grep -rn "orderService" src/ tests/`; `grep -rniE "pedidos\|orders" src/routes/*.tsx` | `src/services/orderService.ts:43` existe (só leitura, `fetchOrderForCurrentSeller`); **único consumidor é o próprio teste** `src/services/__tests__/orderService.test.ts:3`. Zero rotas, zero páginas, zero itens de menu | 🟦 SUGERIDO_OU_INICIADO (esqueleto órfão) |
| N02 | **Aprovação pública de orçamento** (link com token, QR Code, página sem login) | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:250`; `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:405`; `README.md:366` | 03/03/2026 e README | `grep -rniE "aprovacao\|approval\|/aprovar" src/routes/*.tsx`; `grep -rn "quote_approval_tokens" src/`; `ls supabase/functions/quote-approval` | Nenhuma rota. Tabela `quote_approval_tokens` existe só no schema gerado (`src/integrations/supabase/types.ts:4872`), **sem nenhum consumidor de aplicação**. Edge `quote-approval/` não existe. `PublicQuoteApproval.tsx` e `QuoteQRCode.tsx` não existem | ❌ NUNCA_MATERIALIZADO (no frontend) |
| N03 | **Templates de orçamento** (página, lista, formulário, seletor, admin) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:393` a `:399` | 03/03/2026 | `grep -rn "useQuoteTemplates" src/ e2e/` | Hook real em `src/hooks/quotes/useQuoteTemplates.ts:85`, porém **só é referenciado pelo próprio teste** (`src/hooks/quotes/__tests__/useQuoteTemplates.test.ts:17`). Nenhum dos 6 componentes de UI citados existe | 🟦 SUGERIDO_OU_INICIADO (hook órfão) |
| N04 | **Módulo de Pagamentos** — Mercado Pago, PIX, cartão, boleto, webhooks, conciliação | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:271`; `docs/05_ROADMAP_PROXIMOS_PASSOS.md:665` (`"payments": "Mercado Pago"`) | 03/03/2026 | `grep -rniE "mercado ?pago\|mercadopago" src/ supabase/ scripts/`; `grep -oE "^ *(payments\|payment_[a-z_]+): \{" src/integrations/supabase/types.ts` | Único vestígio: seed SQL `supabase/migrations/20250103150000_seed_updated.sql:198` gravando `('payment_gateway_default','"mercadopago"')`. **Zero código de aplicação**, zero tabela `payments` no schema gerado | ❌ NUNCA_MATERIALIZADO |
| N05 | **WhatsApp Business API** — envio de link de aprovação, notificações de status, chat | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:359`; `docs/05_ROADMAP_PROXIMOS_PASSOS.md:668` | 03/03/2026 | `grep -rniE "whatsapp" src/ supabase/functions -l` | Existem apenas *deep links* `wa.me`/compartilhamento manual (ex.: `src/components/quotes/QuoteMobileActionBar.tsx`, `src/components/kit-builder/kit-summary/KitActionsBar.tsx`). **Nenhuma integração com a API WhatsApp Business**; `QuoteWhatsAppShare.tsx` citado na doc não existe | 🟨 IMPLEMENTADO_PARCIAL (só share por link; falta API oficial) |
| N06 | **Gamificação — loja de recompensas + conquistas** (`RewardsStorePage`, `useGamification`, `useRewardsStore`, tabela `achievements`) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:486` a `:489` | 03/03/2026 | `grep -rniE "gamif\|reward\|achievement" src/ --include='*.ts*' -l`; `grep -cE "^ *achievements: \{" src/integrations/supabase/types.ts` | Zero resultado para gamificação/rewards. Tabela `achievements` **ausente** de `src/integrations/supabase/types.ts`. Nenhuma das 3 unidades citadas existe | ❌ NUNCA_MATERIALIZADO |
| N07 | **Metas de vendas** (`SalesGoalsCard`, `useSalesGoals`) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:494` a `:495` | 03/03/2026 | `grep -rn "SalesGoalsCard" src/ e2e/ tests/` | `src/components/goals/SalesGoalsCard.tsx:35` e `src/hooks/intelligence/useSalesGoals.ts:41` existem, **mas o card não é renderizado em lugar nenhum** (única ocorrência é a própria declaração). O hook acessa `untypedFrom('sales_goals')` (`src/hooks/intelligence/useSalesGoals.ts:68`) porque a tabela não está no schema tipado | 🟦 SUGERIDO_OU_INICIADO (componente órfão) |
| N08 | **Sistema multi-tenant com Organizations** (switch de org, `OrganizationSwitcher`, `useOrgData`/`Create`/`Update`/`Delete`) | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:51`, `:75`, `:95`; `docs/03_ARQUITETURA_DO_SISTEMA.md:10` | doc de arquitetura sem data própria | `find src -iname '*OrganizationSwitcher*'`; `grep -rn "useOrgData" src/ --include='*.tsx' \| grep -v __tests__` | O contexto declara explicitamente: `src/contexts/OrganizationContext.tsx:2` — *"OrganizationContext — SINGLE-TENANT (Promo Brindes)"* e `:4` — *"A camada multi-organização foi removida do front-end"*. `OrganizationSwitcher` não existe. `useOrgData`/`useOrgCreate`/`useOrgUpdate`/`useOrgDelete` existem em `src/hooks/common/useOrgData.ts` mas **só são consumidos pelo teste** `src/hooks/common/__tests__/useOrgData.test.ts:29` | ⬛ MORTO_OU_ABANDONADO |
| N09 | **Geração de mockups com IA** (upload de logo, técnica, preview, download) | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:226`; `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:128` | 03/03/2026 | `ls src/pages/mockups/MockupGenerator.tsx supabase/functions/generate-mockup/index.ts` | Ambos existem. Página registrada em `src/routes/lazy-pages.ts` (`MockupGenerator`). ~30 componentes em `src/components/mockup/`. Edge `generate-mockup` presente | ✅ IMPLEMENTADO_TOTAL |
| N10 | **Edge `generate-mockup-nanobanana`** (motor NanoBanana separado) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:130`; `:1123` | 03/03/2026 | `ls supabase/functions/ \| grep -i mockup` | Só existe `generate-mockup`. O diretório `generate-mockup-nanobanana/` **não existe**. O provider NanoBanana está embutido em `supabase/functions/generate-mockup/index.ts` | 🟨 IMPLEMENTADO_PARCIAL (fundido, não separado) |
| N11 | **Magic Up — geração de imagens publicitárias** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:188` a `:194` | 03/03/2026 | `ls src/pages/tools/MagicUp.tsx src/pages/magic-up/` | Existe (`src/pages/tools/MagicUp.tsx`, `src/pages/magic-up/MagicUpConfigPanel.tsx`, `src/hooks/intelligence/useMagicUpGeneration.ts`), registrado em `src/routes/lazy-pages.ts`. Caminho documentado (`src/pages/MagicUp.tsx`) está errado | ✅ IMPLEMENTADO_TOTAL |
| N12 | **Montador de Kits** (drag-and-drop, volume, frete, link público) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:991`; `README.md:376` | 03/03/2026 | `ls src/pages/kit-builder/` | `KitBuilderPage.tsx`, `KitLibraryPage.tsx`, `useKitBuilderQuote.ts` + `src/hooks/kit-builder/useKitBuilder.ts`. Rotas `KitBuilderPage`/`MeusKitsPage` em `src/routes/lazy-pages.ts` | ✅ IMPLEMENTADO_TOTAL |
| N13 | **Simulador de preços — wizard** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:902`; `README.md:357` | 03/03/2026 | `ls src/pages/tools/SimuladorWizard.tsx src/components/simulator/wizard/` | Existem. Rota `SimuladorWizard` em `src/routes/lazy-pages.ts` | ✅ IMPLEMENTADO_TOTAL |
| N14 | **Simulador legacy** — 18 componentes citados (`DecisionMatrixChart`, `MarginThermometer`, `MultiProductComparison`, `ScenarioComparison`, `UpsellPlusPlus`, `ExportActions`…) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:944` a `:962` | 03/03/2026 | `python3` cruzando cada caminho com índice do repo | **16 dos 18 não existem em nenhum caminho** (só `UpsellPlusPlus` migrou para `src/components/pricing/simulator/upsell/UpsellPlusPlus.tsx` e `MockupPreview.tsx` sobreviveu) | ⬛ MORTO_OU_ABANDONADO |
| N15 | **BI de cliente 360 com dados reais** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1244`; `README.md:382` | 03/03/2026 | `grep -rniE "mock" src/hooks/bi/ --include='*.ts' \| grep -v __tests__` | Módulo existe mas serve **dados simulados** quando não há `orders`: `src/hooks/bi/useClientBI.ts:8` importa `MOCK_CLIENT_STATS`, `:61` marca `isMock: true`, `:124` — *"Categorias reais ainda não temos… fallback mock parcial"*. Idem `src/hooks/bi/useIndustryTrends.ts:117`, `src/hooks/bi/useClientCategoryAffinity.ts:113` | 🟨 IMPLEMENTADO_PARCIAL (fallback mock em produção) |
| N16 | **Follow-up / lembretes no frontend** | `README.md:770` ("🚫 Removido do frontend (`src/`) — NÃO reintroduzir") | README atual | `ls scripts/check-no-followup-frontend.mjs` | Backend mantido (`supabase/functions/quote-followup-reminders/`, tabela `follow_up_reminders` presente em `src/integrations/supabase/types.ts`); frontend removido e **protegido por gate de CI** (`README.md:784`) | ⬛ MORTO_OU_ABANDONADO (por decisão) |
| N17 | **Comandos de voz** (`useVoiceCommands`, `useVoiceFeedback`, `useVoiceCommandHistory`) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:582` a `:586` | 03/03/2026 | `ls src/hooks/voice/` | Feature existe, reorganizada: `src/hooks/voice/processTranscript.ts`, `playTtsAudio.ts`, `webSpeechFallback.ts`, `useVoiceHistory.ts`, `scribeTokenCache.ts`. Os 3 nomes de hook documentados **não existem** | 🟨 IMPLEMENTADO_PARCIAL (doc descreve API inexistente) |
| N18 | **Busca visual por imagem** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:121` | 03/03/2026 | `ls src/pages/tools/VisualSearchPage.tsx supabase/functions/visual-search/index.ts` | Ambos existem; rota `VisualSearchPage` em `src/routes/lazy-pages.ts` | ✅ IMPLEMENTADO_TOTAL |
| N19 | **Busca semântica** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:115` | 03/03/2026 | `ls supabase/functions/semantic-search/index.ts` | Existe | ✅ IMPLEMENTADO_TOTAL |
| N20 | **Novidades (Novelties)** com cleanup automático | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:280` a `:286` | 03/03/2026 | `ls src/pages/products/NoveltiesPage.tsx src/hooks/products/useNovelties.ts` | Ambos existem (caminhos diferentes dos documentados) | ✅ IMPLEMENTADO_TOTAL |
| N21 | **Estoque futuro** (`AddFutureStockDialog`, `FutureStockModal`, `useFutureStock`, tabela `future_stock_entries`) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1022` a `:1025` | 03/03/2026 | `grep -rniE "future_stock\|FutureStock" src/ -l`; `grep -cE "^ *future_stock_entries: \{" src/integrations/supabase/types.ts` | Feature existe sob outros nomes: `src/components/products/FutureStockModal.tsx`, `src/components/inventory/FutureStockDialog.tsx`, `src/hooks/products/useFutureStockPreference.ts`. `AddFutureStockDialog.tsx`, `useFutureStock.ts` e a tabela `future_stock_entries` **não existem** | 🟨 IMPLEMENTADO_PARCIAL |
| N22 | **Datas comemorativas** (widget + filtro + edge) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:474` a `:477` | 03/03/2026 | `ls supabase/functions/commemorative-dates/index.ts src/hooks/intelligence/useCommemorativeDates.ts` | Ambos existem | ✅ IMPLEMENTADO_TOTAL |
| N23 | **Revistas de produtos (Magazine)** — módulo inteiro | `docs/MAGAZINE_MODULE.md`; `docs/prompts/magazine-module-implementation-prompt.md` | 2026-07 | `ls src/pages/magazine/` | 4 páginas + editor + templates gallery + `src/services/magazineService.ts`. **Não consta em `docs/FUNCIONALIDADES_E_FERRAMENTAS.md`** — a doc de inventário está cega para o módulo mais recente | ✅ IMPLEMENTADO_TOTAL (doc de inventário desatualizada) |
| N24 | **Feature de embalagens (`packagings`)** | `docs/db/EMPTY_TABLES_2026-05-12.md:28` — *"Feature de embalagem não implementada; sem FK ativa"* | 2026-05-12 | `grep -rn "packagings" src/` | Zero ocorrências em `src/`. Restam 4 tabelas vazias no banco | ❌ NUNCA_MATERIALIZADO (auto-declarado pela doc) |
| N25 | **Multi-idioma (i18n) / multi-moeda / app mobile nativo / marketplace** | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:622` ("Won't Have — Futuro") | 03/03/2026 | `grep -rniE "i18next\|useTranslation" src/ -l`; `grep -nE "capacitor\|react-native\|expo" package.json`; `grep -rniE "marketplace" src/ -l` | Nenhum resultado nos três. Moeda fixa em BRL (`src/lib/format.ts:7`) | ❌ NUNCA_MATERIALIZADO (coerente com o rótulo "Won't Have") |

### A.2 Ferramentas

| # | Item planejado | Origem (arquivo:linha) | Data | Comando de verificação | Resultado | Classificação |
|---|---|---|---|---|---|---|
| F01 | **Autenticação de dois fatores (2FA)** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:35` | 03/03/2026 | `ls src/hooks/auth/use2FA.ts src/components/security/TwoFactorSetup.tsx` | Ambos existem | ✅ IMPLEMENTADO_TOTAL |
| F02 | **WebAuthn / Passkeys** (`useWebAuthn`, `PasskeyManager`) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:41` a `:42` | 03/03/2026 | `grep -rniE "webauthn\|passkey\|publicKeyCredential" src/ supabase/functions` | Nenhuma implementação WebAuthn. Único hit correlato é `navigator.credentials.store` (gerenciador de senha do browser) em `src/pages/auth/Auth.tsx:371`. Os 2 arquivos citados não existem | ❌ NUNCA_MATERIALIZADO |
| F03 | **CAPTCHA** (`useCaptcha`) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:81` | 03/03/2026 | `grep -rniE "captcha\|hcaptcha\|turnstile\|recaptcha" src/ supabase/functions -l` | Zero ocorrências | ❌ NUNCA_MATERIALIZADO |
| F04 | **Restrição por IP** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:47` a `:49` | 03/03/2026 | `ls src/hooks/admin/useAllowedIPs.ts src/hooks/admin/useIPValidation.ts` | Ambos existem (em `hooks/admin/`, não em `hooks/`) | ✅ IMPLEMENTADO_TOTAL |
| F05 | **Geo-blocking** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:55` a `:57` | 03/03/2026 | `ls src/hooks/admin/useGeoBlocking.ts supabase/functions/validate-access/` | Ambos existem | ✅ IMPLEMENTADO_TOTAL |
| F06 | **Verificação de senha vazada (HIBP)** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:86` | 03/03/2026 | `grep -rniE "pwnedpasswords\|haveibeenpwned\|hibp" src/ -l` | `src/hooks/auth/usePasswordBreachCheck.tsx` existe | ✅ IMPLEMENTADO_TOTAL |
| F07 | **Notificações Push (Web Push API)** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:535` a `:537` | 03/03/2026 | `grep -n "pushManager\|applicationServerKey\|VAPID" src/hooks/ui/usePushNotifications.tsx public/sw.js src/lib/sw-register.ts` | **Zero resultado.** `src/hooks/ui/usePushNotifications.tsx` usa apenas a `Notification` API local + Supabase Realtime (`:185 .subscribe(...)`). `public/sw.js:507` tem `showNotification`, mas **não há assinatura push (PushManager/VAPID)** — push server→browser não funciona | 🟨 IMPLEMENTADO_PARCIAL |
| F08 | **PWA / Service Worker** | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:395`, `:478`, `:620` | 03/03/2026 | `ls public/sw.js public/manifest.json src/lib/sw-register.ts` | Os 3 existem | ✅ IMPLEMENTADO_TOTAL |
| F09 | **Export para Excel** | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:303`; `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:595` (cita `src/lib/export/`) | 03/03/2026 | `grep -rn "xlsx" src/ --include='*.ts*' \| grep -iE "import\|require"` | Feature existe em `src/utils/excelExport.ts:5` e `src/utils/personalizationExport.ts:1` via `@e965/xlsx`. **`src/lib/export/` não existe** e a lib documentada (`xlsx ^0.18.5`, linha `:1166`) não é a usada | 🟨 IMPLEMENTADO_PARCIAL (doc aponta caminho e lib errados) |
| F10 | **Export PDF de propostas** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:421` a `:432` | 03/03/2026 | `ls src/components/pdf/proposal/` | Existe (`ProposalHeader.tsx`, `ProposalProductTable.tsx`, `ProposalTotals.tsx`, etc.). Só `QuoteProposalPreview.tsx` (`:422`) não existe | ✅ IMPLEMENTADO_TOTAL |
| F11 | **Onboarding / tour guiado** | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:510`; `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1072` | 03/03/2026 | `ls src/components/onboarding/` | `OnboardingTour.tsx`, `RestartTourButton.tsx` + `src/contexts/OnboardingContext.tsx` | ✅ IMPLEMENTADO_TOTAL |
| F12 | **Dashboard de rate limit** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:628` | 03/03/2026 | `ls src/pages/system/RateLimitDashboardPage.tsx` | Existe; rota `RateLimitDashboard` em `src/routes/lazy-pages.ts` | ✅ IMPLEMENTADO_TOTAL |
| F13 | **Audit log** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1050` | 03/03/2026 | `ls src/hooks/admin/useAuditLog.ts` | Existe | ✅ IMPLEMENTADO_TOTAL |
| F14 | **`UserBehaviorTracking`** (analytics de comportamento) | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:516` | 03/03/2026 | `grep -rn "UserBehaviorTracking" src/` | Zero ocorrências | ❌ NUNCA_MATERIALIZADO |
| F15 | **Assistente IA "Flow"** (chat SSE, TTS, voz, modo CRM) | `README.md:369` a `:374` | README atual | `ls src/components/expert/`; `grep -n "text/event-stream" supabase/functions/expert-chat/index.ts` | `src/components/expert/FlowFilterPanel.tsx`, `FlowFilterSections.tsx`, `ExpertChatDialog.tsx` + streaming SSE confirmado em `supabase/functions/expert-chat/index.ts:1449` | ✅ IMPLEMENTADO_TOTAL |

### A.3 Integrações

| # | Item planejado | Origem (arquivo:linha) | Data | Comando de verificação | Resultado | Classificação |
|---|---|---|---|---|---|---|
| I01 | **Bitrix24** (OAuth, importar clientes, sync contatos, criar deals, webhooks) | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:330`; `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:465` a `:469` | 03/03/2026 | `grep -rniE "bitrix" src/ supabase/functions -l` | Integração real existe (`src/components/admin/connections/Bitrix24Tab.tsx`, `src/types/crm.ts`, `src/components/quotes/…QuoteBitrixSync…`). Porém `BitrixSyncPageV2.tsx`, `useBitrixSync.ts`, `useBitrixSyncAsync.ts` e as tabelas `bitrix_clients`/`bitrix_deals` (`:1208`) **não existem** — a tabela `bitrix_clients` está ausente de `src/integrations/supabase/types.ts` | 🟨 IMPLEMENTADO_PARCIAL |
| I02 | **n8n — automações** (quote aprovado → email; order criado → notificação; pagamento → Bitrix) | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:345` | 03/03/2026 | `grep -rniE "n8n" src/ supabase/functions -l` | Existe apenas como *conector configurável* na tela de conexões (`src/components/admin/connections/secretValidators.ts`, `secretNormalizers.ts`). **Nenhum dos 3 workflows prometidos tem contraparte no repo** | 🟦 SUGERIDO_OU_INICIADO |
| I03 | **Replicate (Flux Schnell) para mockups** | `docs/05_ROADMAP_PROXIMOS_PASSOS.md:236`, `:667` | 03/03/2026 | `grep -rniE "replicate\.(com\|delivery)\|REPLICATE_API" src/ supabase/` | Zero ocorrências. A geração usa Lovable AI Gateway / NanoBanana | ❌ NUNCA_MATERIALIZADO (substituído) |
| I04 | **Dropbox** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:841` | 03/03/2026 | `ls supabase/functions/dropbox-list src/pages/tools/DropboxBrowserPage.tsx` | Ambos existem | ✅ IMPLEMENTADO_TOTAL |
| I05 | **Edge `github-fix-config`** | `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:846`; `:1124` | 03/03/2026 | `ls supabase/functions/ \| grep -i github` | Diretório **não existe** | ⬛ MORTO_OU_ABANDONADO |
| I06 | **ElevenLabs TTS no agente de voz** | `README.md:463` | README atual | `grep -rniE "elevenlabs" src/ supabase/functions -l` | `src/hooks/voice/playTtsAudio.ts`, `scribeTokenCache.ts`, `webSpeechFallback.ts` + integração em `src/components/search/VoiceSearchOverlayConnected.tsx` | ✅ IMPLEMENTADO_TOTAL |
| I07 | **Cloudflare Images** | `AUDIT_200_COMMITS_2026-07-16.md` (contexto de imagens); rotas admin | 2026-07 | `ls src/pages/admin/AdminCloudflareImagesPage.tsx` | Existe e está registrada em `src/routes/lazy-pages.ts` | ✅ IMPLEMENTADO_TOTAL |
| I08 | **Rede unificada de notificações — 15 sistemas restantes** (Compras, ESTOKI WMS, DP System, TaskGifts, FUXICO, HELLO Contact Center, MULTIPLIXE, SalesPro CRM, Loggi-Flow, ZAPP WhatsApp, Fast Grava ES, Match ATS, Lalamove Guardian, **Finance Hub ⚠️ PRIORIDADE**, Bitrix24 Action) | `docs/NOTIFICATION_SYSTEM.md:264` a `:279` | 02/01/2026 | `grep -rniE "estoki\|taskgifts\|fuxico\|hello contact\|dp system\|sistema de compras" src/ supabase/functions` | **Zero ocorrências.** A base (`src/hooks/ui/useNotifications.ts`, `src/components/notifications/NotificationDrawer.tsx`, `NotificationPreferences.tsx`, `supabase/functions/send-notification/`) está pronta; **nenhum dos 15 sistemas foi conectado em ~7,5 meses** | ❌ NUNCA_MATERIALIZADO |
| I09 | **SSO Google — ativação em produção** (6 passos, incl. Apple Sign-In opcional) | `docs/AUTH-SSO-ACTIVATION.md:13` a `:18` | doc de ativação | `ls src/pages/auth/SSOCallbackPage.tsx`; leitura dos checkboxes | Código de callback existe (`src/pages/auth/SSOCallbackPage.tsx`, rota em `src/routes/lazy-pages.ts`), mas **os 6 passos de ativação continuam desmarcados** — passos de console externo | 🟨 IMPLEMENTADO_PARCIAL (código pronto, ativação `NAO_VERIFICADO` fora do repo) |

### A.4 Infra e qualidade

| # | Item planejado | Origem (arquivo:linha) | Data | Comando de verificação | Resultado | Classificação |
|---|---|---|---|---|---|---|
| Q01 | **Migração do `magazineService` para queries tipadas** (remover `untypedFrom`, usar `supabase.from('magazines')`) | `docs/plans/magazine-typed-queries-migration.md:3` — *"Aguardando merge do PR de regeneração do `types.ts`"* | 2026-07-12 | `grep -c "magazine" src/integrations/supabase/types.ts`; `grep -n "MagazineDatabase" src/services/magazineService.ts` | **Pré-condição do plano continua falhando**: 0 ocorrências de `magazine` em `src/integrations/supabase/types.ts`. O serviço segue com shim manual (`src/services/magazineService.ts:27` importando `MagazineDatabase` de `src/integrations/supabase/magazine-schema.ts:96`, que faz `supabase as unknown as SupabaseClient<MagazineDatabase>` na linha `:120`) | 🟦 SUGERIDO_OU_INICIADO (bloqueado há ~1 mês) |
| Q02 | **Remoção de `useMagazineGoldImport`** após 30 dias de telemetria (janela ≥ 2026-08-11) | `docs/plans/magazine-gold-import-removal.md:4`, `:22` a `:30` | 2026-07-12 | `ls src/pages/magazine/hooks/useMagazineGoldImport.ts`; `grep -rn "useMagazineGoldImport" src/` | Hook ainda existe (`:91`) e é chamado em `src/pages/magazine/MagazineListPage.tsx:69`. A janela de 30 dias **já venceu** (2026-08-11 < 2026-08-16) e a telemetria pré-requisito não foi instrumentada | 🟦 SUGERIDO_OU_INICIADO (prazo vencido) |
| Q03 | **Rewrite das policies RLS de `user_roles`/`order_items`/`admin_audit_log`** | `docs/RLS_REWRITE_PLAN.md:3` — *"⏸️ POSTERGADO (migration 141234 está como NO-OP)"* | 2026-05-26 | leitura do doc + `ls supabase/migrations/20260526141234_*.sql` | Migration existe como NO-OP; plano segue postergado desde 26/05 (~3 meses) | 🟦 SUGERIDO_OU_INICIADO |
| Q04 | **Aposentadoria do `external-db-bridge`** — deletar edge após 7 dias estáveis, migrar escritas admin, remover `invokeBridge()`/`bridge-interceptor.ts`/`bridge-compat.ts`, `gen types` para `system_kill_switches` | `docs/ARQUITETURA_BRIDGE_REST_NATIVE.md:233` a `:236` (4 checkboxes abertos) | 2026-05/06 | `ls supabase/functions/external-db-bridge`; `grep -rn "system_kill_switches" src/lib/external-db/kill-switch-client.ts` | Edge ainda no repo; `src/lib/external-db/kill-switch-client.ts:223` ainda tem o comentário sobre cast manual porque a tabela *"ainda não está no Database type"*. Os 4 itens seguem abertos | 🟦 SUGERIDO_OU_INICIADO |
| Q05 | **Testes P0 (skeletons `it.skip`)** — RLS, webhooks, integrações externas, edge functions, auth recovery | `tests/p0/README.md:19`; 5 arquivos | doc do diretório | `grep -rn "TODO(P0)" tests/ \| wc -l`; `grep -rEn "\b(it\|test\|describe)\.(skip\|todo)\b" tests/p0/ \| wc -l` | **23 marcadores `TODO(P0)`** e **41 testes skipados** em 5 arquivos. Nenhum foi destravado | 🟦 SUGERIDO_OU_INICIADO |
| Q06 | **Etapas 14-16 do plano de 20 — redução de warnings ESLint** (`SupabaseConnectionsTab`, `CatalogContent`, `ProductQuickView`, `useSimulatorWizard`, `useGlobalSearch`) — prazo alvo 2026-06-10 | `STATUS.md:127` a `:129`; `STATUS.md:250` | 2026-05-23 | `cat .eslint-baseline.json` | Baseline atual (`.eslint-baseline.json`, gerado 2026-07-24) = **`totalErrors: 0`**, com 1 única exceção em `src/lib/auth/safeAuthCall.ts`. O objetivo foi atingido (por outro caminho), mas o `STATUS.md` nunca foi atualizado — ainda cita 442 erros na linha `:54` | ✅ IMPLEMENTADO_TOTAL (doc desatualizada) |
| Q07 | **Coverage obrigatório em fluxos críticos de receita/autorização** (P0, prazo 2026-06-07) | `STATUS.md:249` | 2026-06-02 | `ls tests/integration/discountApprovalFlow.test.ts tests/integration/simulator-wizard-pricing-parity.test.ts tests/contracts/send-transactional-email.contract.test.ts` | `NAO_VERIFICADO` quanto a "gate obrigatório no CI"; os arquivos-alvo existem no repo, mas a exigência de cobertura mínima bloqueante não foi confirmada em `.github/workflows/` | 🟨 IMPLEMENTADO_PARCIAL |
| Q08 | **Runner de qualidade unificado (plano 10/10 #3 e #4)** com gate único de coverage+smoke+contratos — prazo 2026-06-17 | `STATUS.md:252` | 2026-06-02 | `ls .github/workflows/ \| wc -l` | **107 workflows** — o oposto de um pipeline único; a fragmentação aumentou | 🟦 SUGERIDO_OU_INICIADO |
| Q09 | **Migrar `EXTERNAL_CRM_*` para `integration_credentials`** (P3, dependente de sponsor) | `STATUS.md:253` | 2026-06-02 | `grep -rn "integration_credentials" src/components/admin/connections/ \| head` | Infra de `integration_credentials` existe (`src/components/admin/connections/CredentialsSourceIndicator.tsx:252` ainda mostra o estado *"ainda não existe em `integration_credentials`"*). Migração específica dos `EXTERNAL_CRM_*`: `NAO_VERIFICADO` (estado de segredos fora do repo) | 🟨 IMPLEMENTADO_PARCIAL |
| Q10 | **P0-1 — RLS + REVOKE nas partições `magazine_public_view_events_2026_*`** (anon lê/grava PII) | `AUDIT_200_COMMITS_2026-07-16.md:20` a `:34` | 2026-07-16 | `grep -rln "magazine_public_view_events" supabase/migrations/ \| tail -3` | `NAO_VERIFICADO` — exige `pg_catalog` do projeto `doufsxqlfjyuvxuezpln` (fora do escopo somente-leitura deste lote). Não localizei migration posterior a 2026-07-16 endereçando as partições | 🟦 SUGERIDO_OU_INICIADO / `NAO_VERIFICADO` |
| Q11 | **P1-1 — rotacionar service_role vazada no histórico git** | `AUDIT_200_COMMITS_2026-07-16.md:40` a `:45` | 2026-07-16 | — | `NAO_VERIFICADO` — depende do painel Supabase e do GitHub secret scanning | `NAO_VERIFICADO` |
| Q12 | **P1-4 — tornar E2E/Full CI/Credentials Audit *required checks* do deploy** | `AUDIT_200_COMMITS_2026-07-16.md:57` a `:59` | 2026-07-16 | `ls .github/workflows/deploy-gates.yml .github/workflows/deploy-vercel.yml` | Workflows existem; a marcação como *required* vive nas configurações do repositório no GitHub → `NAO_VERIFICADO` | `NAO_VERIFICADO` |
| Q13 | **P2 — migrar `MockupPromptManager` de `untypedFrom` para `supabase.from()` tipado** ("`personalization_techniques` **já está** em `types.ts`") | `AUDIT_200_COMMITS_2026-07-16.md:90` | 2026-07-16 | `grep -n "personalization_techniques" src/integrations/supabase/types.ts` | **A premissa é falsa hoje:** zero ocorrências. `src/components/admin/MockupPromptManager.tsx:81` segue com `const db = supabase as unknown as { from: (t: string) => QB }` e `:83` consulta `'personalization_techniques'` sem tipo | 🟦 SUGERIDO_OU_INICIADO (premissa da auditoria não confere) |
| Q14 | **P2 — endurecer o gate `as any`** (regex `:\s*any\b` / `\bas\s+any\b`) | `AUDIT_200_COMMITS_2026-07-16.md:88` | 2026-07-16 | `cat .any-type-baseline.json` | Baseline regenerado em 2026-07-17 com `productionAnyCount: 1` (`src/hooks/products/useSellerCarts.ts`). Casts reais foram resolvidos | ✅ IMPLEMENTADO_TOTAL |
| Q15 | **P2 — remover arquivos-lixo da raiz do repo público** (`test_hardcoded_key.ts`, `check_external_*.ts`, `whitelist_external_ip.ts`, `_check.ps1`, `CHANGES_SUMMARY.md`, `FINAL_STATUS.md`) | `AUDIT_200_COMMITS_2026-07-16.md:89` | 2026-07-16 | `ls` na raiz | Nenhum desses arquivos está presente na raiz atual | ✅ IMPLEMENTADO_TOTAL |
| Q16 | **Plano A/B de desligamento do `external-db-bridge`** (canary 5% → 50% → 100%) | `docs/PLANO_AB_DESLIGAMENTO_SWITCH.md:1`, fases a partir de `:30` | 2026-05-25 | `ls src/lib/external-db/kill-switch-client.ts` | Mecânica implementada no cliente; o estado do `rollout_percentage` em `system_kill_switches` é dado de produção → `NAO_VERIFICADO` | 🟨 IMPLEMENTADO_PARCIAL |
| Q17 | **`CANONICAL_DB_CREATION_PROMPT` — criação do schema canônico em 14 fases** | `docs/prompts/CANONICAL_DB_CREATION_PROMPT.md:1` | 2026-07-16 | leitura de `docs/SCHEMA_REFERENCE.md:246` a `:268` | **Explicitamente rejeitado e não executado**, com 9 defeitos medidos documentados (esperava ~145 tabelas vs 388 reais; dropava trigger `on_auth_user_created` em uso; proibia FKs para `auth.users` das quais existem 69). Origem da ordem: bot Lovable → barrado pela REGRA #8 (`CLAUDE.md`) | ⬛ MORTO_OU_ABANDONADO (por decisão consciente) |
| Q18 | **RECOVERY_PLAN — restaurar 65 tabelas faltantes** (carrinho persistente, Expert Chat com histórico, Kit Builder colaborativo, Magic Up com histórico, BI com analytics reais) | `docs/historico/RECOVERY_PLAN.md:31` a `:40` | 2026-05-10 | `grep -cE "^ *[a-z_]+: \{" src/integrations/supabase/types.ts`; verificação item a item | Schema atual tem 269 entradas em `types.ts`. Carrinho (`src/hooks/products/useSellerCarts.ts`), Expert Chat (`expert_conversations` presente em `types.ts`), Kit Builder e Magic Up funcionam. **Exceção: "BI/Intelligence com analytics reais" continua com fallback mock** (ver N15) | 🟨 IMPLEMENTADO_PARCIAL |
| Q19 | **Política de retenção / TTL para logs e telemetria** (90d logs, 30d telemetria) | `docs/SUPABASE_AUDIT_REPORT_20260602.md:194`; `docs/AUDITORIA_2026-05-07.md:543` | 2026-05/06 | `grep -rln "retention\|TTL" supabase/migrations/ \| tail -3` | `NAO_VERIFICADO` no banco. Sem doc de fechamento correspondente | 🟦 SUGERIDO_OU_INICIADO |
| Q20 | **Script `scripts/check-security-headers.mjs`** | `docs/SECURITY_HEADERS.md:86` — *"Sugestão: criar…"* | doc de headers | `ls scripts/check-security-headers.mjs` | Arquivo **não existe** | ❌ NUNCA_MATERIALIZADO |
| Q21 | **Sink server-side real (Sentry/GlitchTip SDK Deno) nas edges + 1 canal de alerta** | `docs/AUDITORIA-BACKEND-2026-05-25.md:277` | 2026-05-25 | `grep -rn "navigationMetrics\|Sentry" src/lib/telemetry/ \| head -3` | Telemetria de navegação para Sentry existe no **frontend** (`src/lib/telemetry/navigationMetrics.ts`, citada em `README.md:510`). Sink nas **edge functions**: não localizado | 🟨 IMPLEMENTADO_PARCIAL |
| Q22 | **Remover `bun.lock`** (recomendação de auditoria de backend) | `docs/AUDITORIA-BACKEND-2026-05-25.md:304` | 2026-05-25 | `ls -la bun.lock` | `bun.lock` (276 KB) **continua versionado** junto com `package-lock.json` (521 KB) | ❌ NUNCA_MATERIALIZADO |
| Q23 | **Auto-gerar os números do `STATUS.md` no CI** | `docs/AUDITORIA-BACKEND-2026-05-25.md:304` | 2026-05-25 | `grep -rn "STATUS.md" .github/workflows/ \| head` | Nenhum workflow gera o STATUS. Consequência medida na seção E.2 (todos os números do `STATUS.md` e do `README.md` estão errados) | ❌ NUNCA_MATERIALIZADO |
| Q24 | **Estratégia de dados determinísticos de teste** (fábrica única de IDs/datas, namespace `RUN_ID+WORKER_ID`, reset idempotente, sem `waitForTimeout`) | `docs/testing/DETERMINISTIC_TEST_DATA_STRATEGY.md:165` a `:170` (6 checkboxes abertos) | doc de testing | leitura dos checkboxes | Os 6 critérios seguem desmarcados no próprio documento | 🟦 SUGERIDO_OU_INICIADO |

---

## B. Evidência fabricada encontrada — **seção crítica**

Itens que a documentação apresenta como **PRONTOS**, com nome de arquivo/objeto citado como
prova, cujo artefato **não existe em nenhum caminho do repositório**.

### B.1 Método

```bash
# Extrai toda referência a arquivo em backticks/colchetes nos 263 .md + .md da raiz,
# testa existência no caminho citado e, se falhar, procura o basename em
# src/, supabase/, scripts/, tests/, e2e/.
python3 <<'EOF'
import re, os, glob
index = {}
for root in ['src','supabase','scripts','tests','e2e']:
    for dp, dn, fn in os.walk(root):
        for f in fn: index.setdefault(f, []).append(os.path.join(dp, f))
for d in sorted(glob.glob('docs/**/*.md', recursive=True)) + glob.glob('*.md'):
    for i, line in enumerate(open(d, encoding='utf-8', errors='replace'), 1):
        for m in re.finditer(r'[`\[]([A-Za-z0-9_./@-]+\.(?:tsx|ts|mjs|sql))[`\]]', line):
            p = m.group(1)
            if p.startswith(('src/','supabase/','scripts/','tests/','e2e/')) and not os.path.exists(p):
                if not index.get(os.path.basename(p)):
                    print(f"{d}:{i}\t{p}\tINEXISTENTE")
EOF
```

**Resultado:** 284 referências quebradas, das quais **120 apontam para artefatos que não
existem em lugar nenhum**. Distribuição:

| Documento | Refs inexistentes |
|---|---|
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` | **93** |
| `docs/sessoes/2026-05-09-09h57-onda-1-completa-handoff.md` | 5 |
| `docs/02_INTEGRACAO_FRONTEND_REACT.md` | 3 |
| `docs/AUDIT_FRONTEND_DATABASE.md` · `docs/CONFIGURACAO_LOCALE_PT_BR.md` · `docs/EXCEL_INTEGRATION_GUIDE.md` · `docs/hardening/ONDA-3-REMOVE-ORPHANS.md` | 2 cada |
| 11 outros documentos | 1 cada |

> ⚠️ Além destas 120, outras **125 referências** citam caminhos errados de arquivos que
> **existem sob outro caminho** (ex.: `src/hooks/useProducts.ts` → real
> `src/hooks/products/useProducts.ts`). São desatualização, não fabricação — não entram
> nesta seção.

### B.2 Os casos mais graves (features de negócio dadas como prontas)

| Doc:linha | Artefato citado como prova | Comando de busca | Resultado |
|---|---|---|---|
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:405` | `src/pages/PublicQuoteApproval.tsx` | `find src -name 'PublicQuoteApproval*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:406` | `src/components/quotes/QuoteQRCode.tsx` | `find src -name 'QuoteQRCode*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:407` | `supabase/functions/quote-approval/index.ts` | `ls supabase/functions/quote-approval` | diretório inexistente |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:408` | `src/hooks/useQuoteApproval.ts` | `find src -name 'useQuoteApproval*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:447` | `src/pages/OrdersPage.tsx` | `find src -name 'OrdersPage*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:448` | `src/hooks/useOrders.ts` | `find src -name 'useOrders*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:486` | `src/pages/RewardsStorePage.tsx` | `find src -name 'RewardsStore*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:487` | `src/hooks/useGamification.ts` | `find src -name 'useGamification*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:488` | `src/hooks/useRewardsStore.ts` | `find src -name 'useRewardsStore*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:465` | `src/pages/BitrixSyncPageV2.tsx` | `find src -name 'BitrixSync*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:467`,`:468` | `src/hooks/useBitrixSync.ts`, `useBitrixSyncAsync.ts` | `find src -name 'useBitrixSync*'` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:393`–`:398` | 6 arquivos de Templates de Orçamento (`QuoteTemplatesPage`, `QuoteTemplatesList`, `AdminTemplatesManager`, `QuoteTemplateForm`, `QuoteTemplateSelector`, `SaveAsTemplateButton`) | `find src -name 'QuoteTemplate*' -o -name 'SaveAsTemplate*'` | vazio (6/6) |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:364`,`:365`,`:369`,`:370`,`:373`,`:376`,`:378`,`:380`,`:381` | 9 componentes do Quote Builder (`QuoteProductSelector`, `QuoteClientSelector`, `QuotePersonalizationSelector`, `DraggableQuoteItems`, `QuoteSummary`, `QuoteNextActionBanner`, `QuoteConvertToOrder`, `TagManager`, `QuoteWhatsAppShare`) | `find src/components/quotes -name '<nome>*'` | vazio (9/9) |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:41`,`:42` | `src/hooks/useWebAuthn.ts`, `src/components/security/PasskeyManager.tsx` | `grep -rniE "webauthn\|passkey" src/` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:81` | `src/hooks/useCaptcha.ts` | `grep -rniE "captcha" src/` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:516` | `src/components/analytics/UserBehaviorTracking.tsx` | `grep -rn "UserBehaviorTracking" src/` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:130` | `supabase/functions/generate-mockup-nanobanana/index.ts` | `ls supabase/functions \| grep -i mockup` | só `generate-mockup` |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:846` | `supabase/functions/github-fix-config/index.ts` | `ls supabase/functions \| grep -i github` | vazio |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:944`–`:961` | 16 componentes do simulador legacy | `python3` cruzando com índice | 16/18 inexistentes |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:546`,`:562`,`:570` | `FavoritesContext.tsx`, `ComparisonContext.tsx`, `RecentlyViewedContext.tsx` | `ls src/contexts/` | os 3 não existem (a feature migrou para hooks) |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:595` | `src/lib/export/` | `ls src/lib/export` | diretório inexistente (real: `src/utils/excelExport.ts`) |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1084`,`:1094` | `src/pages/AdminPanel.tsx`, `src/pages/ProfilePage.tsx` | `find src/pages -name 'AdminPanel*' -o -name 'ProfilePage*'` | vazio |

### B.3 Evidência fabricada em **auditorias** (não só no inventário)

| Doc:linha | Afirmação | Comando | Resultado real |
|---|---|---|---|
| `AUDIT_200_COMMITS_2026-07-16.md:13` | *"types.ts: **todas** as tabelas exigidas presentes (`personalization_techniques`, …)"* | `grep -n "personalization_techniques" src/integrations/supabase/types.ts` | **zero ocorrências** — a tabela exigida pela REGRA #4 do `CLAUDE.md` está ausente hoje |
| `AUDIT_200_COMMITS_2026-07-16.md:90` | *"`personalization_techniques` **já está** em `types.ts`; migrar de `untypedFrom` para `supabase.from()` tipado"* | `sed -n '78,84p' src/components/admin/MockupPromptManager.tsx` | premissa falsa; `src/components/admin/MockupPromptManager.tsx:81` mantém `supabase as unknown as { from: (t: string) => QB }` |
| `CLAUDE.md` REGRA #4 (lista de tabelas obrigatórias) | exige `magazines`, `magazine_items`, `magazine_templates` em `types.ts` (restaurado em `4cff1e1`) | `grep -c "magazine" src/integrations/supabase/types.ts` | **0** — a regressão descrita como corrigida está de volta; por isso existe o shim `src/integrations/supabase/magazine-schema.ts:96` |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1166` | `xlsx ^0.18.5` como dependência | `grep -n '"xlsx"' package.json` | pacote real é `@e965/xlsx` (`src/utils/excelExport.ts:5`) |
| `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1232` | tabela `notifications` | `grep -oE "^ *notifications: \{" src/integrations/supabase/types.ts` | a tabela real é `workspace_notifications` |
| `docs/03_ARQUITETURA_DO_SISTEMA.md:10` | *"O Gifts Store é um sistema multi-tenant… isolamento completo de dados"* | `sed -n '1,8p' src/contexts/OrganizationContext.tsx` | o código diz o contrário: *"SINGLE-TENANT (Promo Brindes)… A camada multi-organização foi removida do front-end"* |

---

## C. Promessas de interface (visíveis ao usuário final)

| Arquivo:linha | Texto exibido | Situação |
|---|---|---|
| `src/components/bi/ClientOverview360.tsx:80` | **"Dados simulados · em breve dados reais"** | Confessa ao usuário que o painel 360° de cliente exibe mock. Origem: `src/hooks/bi/useClientBI.ts:61` (`isMock: true`) |
| `src/pages/Simulation.tsx:311` | **"Métricas de latência p-series em desenvolvimento."** | Bloco de métricas não implementado, exposto na página |
| `src/components/ai/AIMockupAssistant.tsx:210` | **"Beta"** (badge) | Assistente de mockup marcado como beta; usado em `src/pages/mockups/MockupGenerator.tsx:555` |
| `src/hooks/bi/useClientBI.ts:124` | comentário: *"Categorias reais ainda não temos (depende de `order_items` + categoria) — fallback mock parcial"* | Alimenta `topCategories` do BI com `MOCK_CLIENT_STATS` mesmo no caminho "real" (`:118 isMock: false`) — **o pior caso: marca como real dado que é mock** |
| `src/components/providers/AppBootstrap.tsx:51` | **"Estamos realizando melhorias programadas. Voltaremos em breve!"** | Tela de manutenção programada (intencional) |
| `src/hooks/voice/processTranscript.ts:32` | **"Assistente de voz indisponível no momento. Tente novamente mais tarde."** | Degradação do assistente de voz |
| `src/components/simulator/wizard/StepLocation.tsx:69` | *"Este produto ainda não possui áreas de personalização configuradas. Solicite o cadastro ao time de operações"* | Lacuna de dados repassada ao usuário |
| `src/pages/collections/CollectionDetailPage.tsx:697` | *"Esta coleção do catálogo ainda não possui produtos vinculados."* | Estado vazio legítimo |
| `src/pages/products/seller-carts/mapRestoreCartError.ts:92` | **"Restauração indisponível no momento."** | Degradação quando a RPC de restauração não está no schema cache (`PGRST202`) — indica RPC planejada e não implantada |
| `src/components/products/FutureStockModal.tsx:530` | **"Em breve"** | Rótulo de coluna de estoque futuro (semântica de negócio, não promessa de feature) |
| `src/components/novelties/ExpiringNoveltiesWidget.tsx:96` · `src/components/common/UrgencyBadge.tsx:37` · `src/components/products/ProductStatusBadge.tsx:235` | "Expirando em breve" / "Termina em breve" | Semântica de prazo — **não** são promessas de feature |

---

## D. TODO / FIXME / HACK no código

### D.1 Contagem

```bash
grep -rEn "TODO|FIXME|HACK|XXX:" src/ supabase/functions/ scripts/ | wc -l
# → 76 (inclui falsos positivos: "TODOS", "TODA", "HACKED" em fixtures de teste RLS)
```

| Área | Ocorrências brutas | Marcadores reais de dívida |
|---|---|---|
| `src/components` | 23 | 0 |
| `src/lib` | 14 | 0 |
| `src/hooks` | 9 | **1** |
| `supabase/functions` | 8 | 0 (3 são strings `"HACKED"` em testes de RLS) |
| `src/pages` | 5 | 0 |
| `scripts/` | ~10 | 0 (todos são `reason: 'TODO: documentar…'` de *gates*, não dívida) |
| **`tests/p0/`** | — | **23 `TODO(P0)` + 41 testes skipados** |
| `e2e/flows/` | — | **2 `FIXME` provisórios** |

### D.2 Os marcadores relevantes

| Arquivo:linha | Marcador | Conteúdo |
|---|---|---|
| `src/hooks/__tests__/useCatalogState.unit.test.tsx:101` | `TODO` | *"hook cresceu demais — cascata de imports (Supabase + ProductsContext + …)"* — suíte desabilitada; corresponde à Etapa 26 do `STATUS.md:116` |
| `e2e/flows/20-all-features-smoke.spec.ts:299` | `FIXME` | *"T14 UPDATE 9 (2026-05-23): FIXME provisório para desbloquear o gate"* — provisório há **~3 meses** |
| `e2e/flows/23-rocket-animation-snapshot.spec.ts:18` | pendência | *"Issue dedicada será aberta após T14 fechar"* |
| `e2e/flows/24-visual-regression-stars.spec.ts:17` | pendência | ref. a `docs/redeploy/REDEPLOY-T14-UPDATE-9-FIXME.md` |
| `tests/p0/webhooks-resilience.test.ts:38`,`:57`,`:62`,`:67`,`:94` | `TODO(P0)` | retry com jitter, `AbortController`+`retry_queue`, idempotência, Zod na edge, assinatura `X-Hub-Signature-256` |
| `tests/p0/external-integrations.test.ts:23`,`:30`,`:35`,`:42`,`:48`,`:54`,`:64` | `TODO(P0)` | banner "modo degradado", selo de price-freshness, `AbortController` no CNPJ, fallback de vídeo, chat sem áudio, cobertura de todas as features de IA, `connections_health_check` |
| `tests/p0/rls-data-integrity.test.ts:88`,`:93`,`:137` | `TODO(P0)` | testes de RLS que "exigem seed + execução real" |
| `tests/p0/edge-functions-failing.test.ts:34`,`:58`,`:80`,`:94` | `TODO(P0)` | shape após fix de `catch unknown`, não vazar stack trace, headers de retry, adapter `castSupabaseClient` |
| `scripts/check-secdef-anon-drift.mjs:108` · `check-lint-0029-drift.mjs:102` · `check-lint-0011-drift.mjs:113` | `TODO` | template `reason: 'TODO: documentar motivo antes de aprovar PR'` — gate que **exige** justificativa; `scripts/check-allowlist-memory-crosscheck.mjs:81` falha o build se ficar `TODO` |

> **Leitura:** o código de produção é **excepcionalmente limpo de marcadores de dívida**
> (1 único `TODO` real em `src/`), o que confirma `docs/AUDITORIA-EXAUSTIVA-2026-05-23.md:131`.
> A dívida declarada migrou toda para `tests/p0/` (41 testes skipados) e para documentos.

---

## E. Roadmap declarado — o que os documentos dizem que vem a seguir

### E.1 Roadmap de produto (`docs/05_ROADMAP_PROXIMOS_PASSOS.md`, sem data no corpo; irmão do inventário datado 03/03/2026)

O documento declara **142 checkboxes abertos** e nenhum fechado — descreve o sistema como
se estivesse na Fase 1 (*"Criar primeira Organization"*, `:39`), com **8 semanas** até o MVP
(`:593`) e a "Próxima Ação IMEDIATA" sendo implementar o `OrganizationContext` (`:696`).

| Prioridade MoSCoW | Item | Situação medida |
|---|---|---|
| Must Have (`:601`) | Organizations funcionando | ⬛ removido do front (`src/contexts/OrganizationContext.tsx:2`) |
| Must Have (`:602`–`:604`) | Produtos / Quotes / Orders CRUD | Produtos ✅, Quotes ✅, **Orders 🟦 órfão** |
| Must Have (`:605`) | Mockups IA | ✅ |
| Must Have (`:606`) | Aprovação pública | ❌ |
| Should Have (`:610`) | Pagamentos | ❌ |
| Should Have (`:611`) | Relatórios básicos | 🟨 (BI com mock) |
| Should Have (`:612`) | Integração Bitrix24 | 🟨 |
| Should Have (`:613`) | Gerenciamento de usuários | ✅ (`src/pages/admin/AdminUsuariosPage.tsx`) |
| Could Have (`:617`) | WhatsApp | 🟨 (só deep link) |
| Could Have (`:618`) | n8n workflows | 🟦 |
| Could Have (`:620`) | PWA | ✅ |
| Won't Have (`:624`–`:627`) | Multi-idioma / multi-moeda / app nativo / marketplace | ❌ (coerente) |

> **Diagnóstico:** este roadmap descreve um produto que **não é** o que existe no repositório.
> O sistema real já tem Magazine, BI, Kit Builder, Simulador Wizard, Replenishments,
> Coverage Insights, Product Match, Cloudflare Images — **nada disso aparece no roadmap**.

### E.2 Roadmap operacional (`STATUS.md`) — congelado em 2026-06-02

`STATUS.md:11` diz *"Última sessão: 2026-06-02/03"* — **~2,5 meses de defasagem**. As ondas
P0→P3 (`:145` a `:213`) tinham horizonte de 4 semanas a partir de 2026-05-25, ou seja,
encerravam em 2026-06-21. Os prazos do backlog (`:249`–`:254`) — 2026-06-07, 06-10, 06-14,
06-17, 06-21 — **todos venceram**.

Métricas declaradas × medidas hoje:

| Métrica | `STATUS.md` / `README.md` | Medido em 2026-08-16 | Comando |
|---|---|---|---|
| Erros ESLint no baseline | 442 (`STATUS.md:54`) / 472 (`README.md:541`) / 196 (`AUDIT_200_COMMITS:91`) | **0** | `cat .eslint-baseline.json` |
| Erros TS no baseline | 1.010 (`STATUS.md:53`) / 1.375 (`README.md:542`) / 13 (`AUDIT_200_COMMITS:91`) | **145** (31 arquivos) | `python3 -c "…json.load(open('.tsc-baseline.json'))"` |
| Arquivos TypeScript | 1.736 (`README.md:533`) | **2.543** | `find src -name '*.ts' -o -name '*.tsx' \| wc -l` |
| Edge Functions | 82 (`README.md:534`) / 81 (`README.md:439`) | **106** | `ls -d supabase/functions/*/ \| wc -l` |
| Migrations SQL | 708 (`README.md:535`) / 1.564 (`README.md:424`) | **1.672** | `ls supabase/migrations/*.sql \| wc -l` |
| Workflows GitHub Actions | 11 (`README.md:536`) / "40+" (`CLAUDE.md`) | **107** | `ls .github/workflows/*.yml \| wc -l` |
| Arquivos de teste Vitest | 349 (`README.md:538`) | **1.191** | `find src tests -name '*.test.ts*' \| wc -l` |
| Specs Playwright | 155 (`README.md:539`) | **555** | `find e2e -name '*.spec.ts' \| wc -l` |

### E.3 Roadmap de segurança/infra (`AUDIT_200_COMMITS_2026-07-16.md:104`–`:110`) — prioridade declarada

1. **P0-1** — RLS + REVOKE nas partições `magazine_public_view_events_2026_*` → `NAO_VERIFICADO` (Q10)
2. **P1-1** — rotacionar service_role vazada → `NAO_VERIFICADO` (Q11)
3. **P1-2/P1-3** — REVOKE em 380 funções `SECURITY DEFINER` executáveis por `anon`; converter 104 views para `security_invoker` → `NAO_VERIFICADO`
4. **P1-4** — tornar E2E/Full CI/Credentials Audit bloqueantes → `NAO_VERIFICADO` (Q12)
5. **P1-5** — sanitizer (`src/lib/security/sanitize.ts:71`), `Math.random()` em contexto de segurança, allowlist de host por substring → **parcialmente corrigido**: `src/pages/magazine/hooks/useMagazineReaderState.ts:114` já traz *"Fallback: use getRandomValues (CSPRNG) instead of Math.random"* (`grep -n "Math.random\|crypto.getRandomValues"` → só o comentário do fix). Os demais achados CodeQL: `NAO_VERIFICADO`
6. **P1-6** — canonizar migrations que hardcodam o ID do **projeto legado** `pqpdolkaeqlyzpdpbizo` [LEGACY_INFORMATIVO — menção histórica; **não use** este ID. O canônico é `doufsxqlfjyuvxuezpln`] → `NAO_VERIFICADO`
7. **P1-7** — HMAC fail-closed em `webhook-inbound` → `NAO_VERIFICADO`

### E.4 Roadmap de integrações (`docs/NOTIFICATION_SYSTEM.md:295`–`:301`, 02/01/2026)

Cronograma declarado: *"Semana 1: Finance Hub + Compras + WMS"*, com estimativa total de
**~8 horas para 16 sistemas** (`:249`). **Nenhum dos 15 sistemas foi conectado em ~7,5 meses**
(`grep` por `estoki|taskgifts|fuxico|hello contact|dp system` em `src/` e
`supabase/functions/` → vazio).

### E.5 Planos com prazo vencido ou bloqueio ativo

| Plano | Origem:linha | Status declarado | Situação em 2026-08-16 |
|---|---|---|---|
| Migração `magazineService` para queries tipadas | `docs/plans/magazine-typed-queries-migration.md:3` | "Aguardando merge do PR de regeneração do `types.ts`" | Pré-condição ainda falha (0 `magazine` em `types.ts`) — **bloqueado há 35 dias** |
| Remoção de `useMagazineGoldImport` | `docs/plans/magazine-gold-import-removal.md:4` | "🟡 Aguardando janela de telemetria (30 dias)" — janela ≥ 2026-08-11 | **Janela vencida há 5 dias**; telemetria pré-requisito não instrumentada |
| RLS rewrite | `docs/RLS_REWRITE_PLAN.md:3` | "⏸️ POSTERGADO" | Postergado há **~2,7 meses** |
| Aposentadoria do `external-db-bridge` | `docs/ARQUITETURA_BRIDGE_REST_NATIVE.md:233`–`:236` | 4 checkboxes abertos | Edge ainda no repo; cast manual documentado em `src/lib/external-db/kill-switch-client.ts:223` |
| Ativação SSO Google em produção | `docs/AUTH-SSO-ACTIVATION.md:13`–`:18` | 6 passos abertos | Código pronto; ativação fora do repo → `NAO_VERIFICADO` |

---

## F. Cobertura desta auditoria

### F.1 Fontes de intenção varridas

| Fonte | Total | Lidos integralmente ou em parte substancial | Varridos por `grep`/script |
|---|---|---|---|
| `docs/**/*.md` | **263** | **24** | **263** (100%) |
| `.md` da raiz (`README`, `STATUS`, `CHANGELOG`, `CONTRIBUTING`, `AUDIT_*`, `SECURITY`, `SUPABASE_CONNECTION`, `CLAUDE`) | 12 | **8** | 12 (100%) |
| `.agents/`, `.claude/`, `.codex/` | 6 arquivos | **4** | 6 (100%) |
| Código-fonte (`src/`, `supabase/functions/`, `scripts/`, `tests/`, `e2e/`) | — | — | ~60 comandos de verificação executados |

**Documentos lidos integralmente ou em parte substancial (24 em `docs/` + 8 na raiz):**
`05_ROADMAP_PROXIMOS_PASSOS.md`, `FUNCIONALIDADES_E_FERRAMENTAS.md` (1.287 linhas, integral),
`03_ARQUITETURA_DO_SISTEMA.md`, `NOTIFICATION_SYSTEM.md`, `SCHEMA_REFERENCE.md` (§7–§8),
`RLS_REWRITE_PLAN.md`, `REST_NATIVE_MIGRATION.md`, `PLANO_AB_DESLIGAMENTO_SWITCH.md`,
`ARQUITETURA_BRIDGE_REST_NATIVE.md`, `plans/magazine-typed-queries-migration.md`,
`plans/magazine-gold-import-removal.md`, `historico/RECOVERY_PLAN.md`,
`AUDITORIA_2026-05-07.md`, `issues-pendentes-2026-05-22.md`,
`prompts/CANONICAL_DB_CREATION_PROMPT.md`, `AUTH-SSO-ACTIVATION.md`, `DESIGN_TOKENS.md`,
`PAGE_STRUCTURE_STANDARD.md`, `MAGIC_UP_ONDA5_A11Y.md`,
`testing/DETERMINISTIC_TEST_DATA_STRATEGY.md`, `db/EMPTY_TABLES_2026-05-12.md`,
`SECURITY_HEADERS.md`, `AUDITORIA-BACKEND-2026-05-25.md` (recomendações),
`AUDITORIA-EXAUSTIVA-2026-05-23.md` (seção TODO) · raiz: `README.md`, `STATUS.md`,
`CLAUDE.md`, `AUDIT_200_COMMITS_2026-07-16.md`, `AUDIT_FINAL_REPORT.md`, `AUDIT_REPORT.md`,
`AUDIT_REPORT_2026.md`, `tests/p0/README.md`.

### F.2 O que ficou fora / limitações

1. **Banco de produção não foi consultado.** Itens Q10, Q11, Q16, Q19 e todo E.3 dependem de
   `pg_catalog` do projeto `doufsxqlfjyuvxuezpln`. Este lote é somente-leitura de repositório.
2. **GitHub e Vercel não foram consultados** — status de *required checks* (Q12), alertas de
   secret scanning (Q11), issues e PRs citados nos docs (`STATUS.md:13` cita PRs #608/#623;
   `docs/issues-pendentes-2026-05-22.md` traz 3 specs de issue nunca abertas).
3. **Histórico git raso.** `git log` cobre apenas **192 commits** a partir de 2026-07-24, o que
   impede datar por commit itens propostos antes disso. As datas na tabela vêm do **corpo dos
   documentos** (ex.: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:4` — *"Última atualização: 03/03/2026"*).
4. **Os ~239 documentos não lidos integralmente** foram cobertos por 4 varreduras completas:
   (a) referências a arquivos quebradas, (b) checkboxes `- [ ]` abertos, (c) linguagem de
   proposta/recomendação/não-implementado, (d) marcadores de status pendente. Itens de baixo
   sinal (relatórios de sessão, runbooks concluídos, ADRs aprovadas, auditorias de banco já
   executadas) não foram promovidos à tabela mestra.
5. **`docs/AUDITORIA_2026-05-07.md`** contém **178 checkboxes abertos** (6 fases de faxina e
   migração). Foi lido apenas o sumário executivo; a granularidade completa desse plano
   merece um lote dedicado.

### F.3 Números-resumo

| Classificação | Quantidade na tabela mestra |
|---|---|
| ✅ IMPLEMENTADO_TOTAL | 19 |
| 🟨 IMPLEMENTADO_PARCIAL | 14 |
| 🟦 SUGERIDO_OU_INICIADO | 11 |
| ⬛ MORTO_OU_ABANDONADO | 6 |
| ❌ **NUNCA_MATERIALIZADO** | **12** |
| `NAO_VERIFICADO` (puro) | 3 |
| **Total de itens rastreados** | **65** |

---

## G. Conclusões para o dono do sistema

1. **`docs/FUNCIONALIDADES_E_FERRAMENTAS.md` não pode ser usado como inventário.** Das 518
   referências a arquivos que faz, **223 não resolvem** e **93 apontam para artefatos que não
   existem em lugar nenhum**. Ele descreve um sistema paralelo e **omite** o módulo Magazine
   inteiro, BI, Replenishments, Coverage Insights e Product Match.

2. **A hipótese do lote se confirma:** páginas administrativas têm lastro real (Admin Usuários,
   Segurança, Conexões, Prompts IA, Cloudflare Images, RBAC — todas registradas em
   `src/routes/lazy-pages.ts`), enquanto **features de negócio prometidas não têm**:
   Pedidos (órfão), Aprovação pública (inexistente), Pagamentos (inexistente),
   Gamificação (inexistente), Templates de orçamento (hook órfão).

3. **Quatro artefatos são "código zumbi testado"** — existem, têm teste, e não são usados por
   nenhuma tela: `src/services/orderService.ts:43`, `src/hooks/quotes/useQuoteTemplates.ts:85`,
   `src/components/goals/SalesGoalsCard.tsx:35`, `src/hooks/common/useOrgData.ts`. Eles
   sustentam a ilusão documental de que os módulos existem.

4. **Risco ativo de dado falso ao usuário:** `src/hooks/bi/useClientBI.ts:124` injeta
   `MOCK_CLIENT_STATS.topCategories` no caminho marcado `isMock: false` (`:118`). O usuário vê
   "dados reais" com categorias fabricadas — e o aviso da UI
   (`src/components/bi/ClientOverview360.tsx:80`) só aparece no caminho mock.

5. **A REGRA #4 do `CLAUDE.md` está violada agora:** `personalization_techniques` e todas as
   tabelas `magazine_*` estão ausentes de `src/integrations/supabase/types.ts`, contrariando o
   que `AUDIT_200_COMMITS_2026-07-16.md:13` afirma. Dois planos (`Q01`, `Q13`) estão bloqueados
   por essa mesma causa.

6. **Os números de todos os documentos de status estão errados** — em alguns casos por ordem de
   grandeza (11 vs 107 workflows; 155 vs 555 specs Playwright). A recomendação de auto-gerar
   esses números no CI (`docs/AUDITORIA-BACKEND-2026-05-25.md:304`) nunca foi implementada e é,
   provavelmente, a correção de maior retorno deste relatório.
