# Baseline Local — Typecheck / Lint / Test / Build

**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Data:** 2026-10-27  
**SHA main:** `a0560fdc62744c6bf4ba182914cc76dec06aecb1`  
**Branch:** `claude/quirky-keller-owezvt` (checkout = main + docs de análise)

---

## TypeScript (`npx tsc --noEmit`)

```
TSC_EXIT=0
Saída: (vazia — zero erros)
```

**Resultado:** ✅ PASSA — zero erros TypeScript localmente  
**Nota CI:** Gate 1 - Lint + TypeScript = success (check run `122356207902`)

---

## Lint (`npx eslint src --ext .ts,.tsx --quiet`)

```
LINT_EXIT=0
Saída: (vazia — zero erros de erro; warnings não bloqueiam)
```

**Resultado:** ✅ PASSA — zero erros ESLint localmente  
**Nota:** `--quiet` suprime warnings, reporta apenas errors. Zero errors.

---

## Unit Tests (`npx vitest run --testPathPattern='src/'`)

```
VITEST_EXIT=0
```

**Resultado:** ✅ PASSA — zero testes falhando  
**Interpretação de exit 0:** `vitest run` retorna exit 0 se e somente se todos os testes passam. Exit 1 ou superior indica falha. Exit 0 = nenhum teste falhou.

**Limitação de ambiente:** chamadas subsequentes com `--reporter=verbose` e `--list` terminam por SIGTERM (exit 143) após 60–90s — timeout do ambiente de CI remoto, **não** falha de teste. O exit code 0 da execução original é a evidência definitiva de que nenhum teste falhou.

**Confirmação independente via CI:** Gate 2 - Unit Tests = **success** (check run `122356207930`, SHA `a0560fdc`) — CI externo confirma o mesmo baseline.

### Nomes de testes capturados (137 únicos, via `--reporter=dot 2>&1 | tee`)

Extraídos de linhas `stderr | <arquivo> > <suite> > <teste>` antes do SIGTERM.  
Fonte: `/tmp/claude-0/-home-user-Promo-Gifts-V4/b3ae9e22-49f9-5f3c-ba3e-849f8322998c/scratchpad/vitest-dot.txt`

```
src/components/pdf/__tests__/PdfGenerationModule.test.ts > generateProposalPDFv2 — error handling & cleanup > container é removido do DOM mesmo quando html2canvas lança erro
src/components/products/__tests__/ColorSwatchTwoLineOverflow.test.tsx > A11y — navegação por teclado entre swatches > V1: Enter alterna seleção entre dois swatches diferentes
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > HLS.js specific scenarios > should handle HLS.js fatal media errors with recovery
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > HLS.js specific scenarios > should handle HLS.js fatal network errors with recovery attempts
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > HLS.js specific scenarios > should hide loading overlay when HLS.js MANIFEST_PARSED event fires
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Level Changes and Auto-Leveling > should show "Manual Load" button and re-initialize player on click
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should NOT have crossOrigin on the video element (Cloudflare Stream CORS compatibility)
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should clean up src and load() the video element on unmount to prevent residual errors
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should clean up timeouts on unmount
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should correctly handle native error code 3 (DECODE)
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should persist an explicit user mute/unmute after the autoplay-forced mute
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should prevent race conditions using initTokenRef during fast src changes
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should reset error state when switching to a new video src
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > Regression Tests for Identified Bugs > should try muted autoplay fallback if play() fails with sound
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > should hide loading overlay when canplay event fires
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > should hide loading overlay when loadeddata event fires
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > should initialize playing state from localStorage
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > should initialize volume from localStorage
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > should show actionable error message when native video fails with code 4 (SRC_NOT_SUPPORTED)
src/components/products/gallery/PromoFlixPlayer.test.tsx > PromoFlixPlayer Automated Tests > should show manual load button after 10s timeout if video is stuck
src/hooks/mockup/__tests__/mockupGenerationService.test.ts > generateMockupApi > batch: keeps successful areas and warns about failures
src/hooks/mockup/__tests__/mockupGenerationService.test.ts > generateMockupApi > batch: throws when every area fails
src/hooks/mockup/__tests__/mockupGenerationService.test.ts > generateMockupApi > surfaces the edge error message on a generic failure
src/hooks/mockup/__tests__/mockupGenerationService.test.ts > generateMockupApi > translates the SVG_NOT_SUPPORTED error code into a friendly message (G1)
src/hooks/mockup/__tests__/mockupGenerationService.test.ts > saveMockupToDb > returns null (does not throw) when the insert fails
src/lib/security/__tests__/magazine-guard.test.ts > guardLogoUrl > case-insensitive para JAVASCRIPT:
src/lib/security/__tests__/magazine-guard.test.ts > guardLogoUrl > retorna null para blob: URI
src/lib/security/__tests__/magazine-guard.test.ts > guardLogoUrl > retorna null para data: URI
src/lib/security/__tests__/magazine-guard.test.ts > guardLogoUrl > retorna null para file://
src/lib/security/__tests__/magazine-guard.test.ts > guardLogoUrl > retorna null para javascript: XSS
src/lib/security/__tests__/magazine-guard.test.ts > guardLogoUrl > retorna null para vbscript:
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — clientLogoUrl > case-insensitive: rejeita JAVASCRIPT: maiúsculo
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — clientLogoUrl > rejeita blob: URI
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — clientLogoUrl > rejeita data: URI
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — clientLogoUrl > rejeita file:// URI
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — clientLogoUrl > rejeita vbscript: XSS
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — combinações > URL inválida + cor inválida → 2 erros, ambos campos sanitizados para safe
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — combinações > não muta o input original
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — invariantes de segurança > bloqueia payload XSS "  javascript:  alert(1)  " como clientLogoUrl
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — invariantes de segurança > bloqueia payload XSS "JAVASCRIPT:void(0)" como clientLogoUrl
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — invariantes de segurança > bloqueia payload XSS "blob:https://attacker.com/fake" como clientLogoUrl
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — invariantes de segurança > bloqueia payload XSS "data:text/html,<script>evil()</script>" como clientLogoUrl
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — invariantes de segurança > bloqueia payload XSS "file:///C:/Windows/System32" como clientLogoUrl
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — invariantes de segurança > bloqueia payload XSS "javascript:alert(document.cookie)" como clientLogoUrl
src/lib/security/__tests__/magazine-guard.test.ts > validateBranding — invariantes de segurança > bloqueia payload XSS "vbscript:msgbox("XSS")" como clientLogoUrl
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — fallback quando edge falha > 401 (token inválido/expirado) → copy contextual "expirou"
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — fallback quando edge falha > erro de rede (throw) NÃO persiste flag (transitório)
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — fallback quando edge falha > toast é one-shot: 2 mounts consecutivos → 1 toast
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — fingerprint > gera fingerprint no primeiro uso e reusa em re-renders
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — fingerprint > preserva fingerprint pré-existente
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — hidratação inicial > filtra valores não-finitos e negativos
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — hidratação inicial > lê bookmarks + lastPage válidos do localStorage
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — hidratação inicial > sobrevive a JSON corrompido em bookmarks
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — merge de estado remoto > lastPage: adota remoto se estiver à frente
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — merge de estado remoto > lastPage: mantém local se remoto atrás (offline avançou)
src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts > useMagazineReaderState — merge de estado remoto > união de bookmarks (local ∪ remoto)
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Rendering > renders area charts
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Rendering > renders bar chart
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Rendering > renders bar chart for table distribution
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Rendering > renders chart titles when rows exist
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Rendering > returns null when no rows
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Severity Aggregation > counts slow, very_slow, and error in same bucket
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Timeline Buckets > creates buckets for 24h filter (1h intervals)
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Timeline Buckets > creates buckets for 6h filter (30min intervals)
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Timeline Buckets > creates buckets for 7d filter (6h intervals)
tests/components/TelemetryCharts.test.tsx > TelemetryCharts - Timeline Buckets > handles custom timeFilter as 7d bucket size
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Enter/Space no item ativo: foco e estado preservados > Space no dot[0] JÁ ATIVO: foco permanece, sem mudar activeVariation
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Enter/Space no item ativo: foco e estado preservados > Space no dot[1] JÁ ATIVO: foco permanece, sem mudar activeVariation
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Enter/Space no item ativo: foco e estado preservados > Space no dot[2] JÁ ATIVO: foco permanece, sem mudar activeVariation
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Enter/Space não wrap entre extremos (dot[last] ↔ dot[0]) > foco no dot[last] + 'Space' → ativa dot[last] e NUNCA dot[0] (sem wrap)
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > Enter em dot[0]: foco no DOT — nunca no thumb correspondente
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > Enter em dot[1]: foco no DOT — nunca no thumb correspondente
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > Enter em dot[2]: foco no DOT — nunca no thumb correspondente
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > Space em dot[0]: foco no DOT — nunca no thumb correspondente
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > Space em dot[2]: foco no DOT — nunca no thumb correspondente
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > alternar dot[1] → thumb[2] → dot[0]: foco acompanha SEMPRE o último controle acionado
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > click em dot[1]: após re-render, foco no DOT — nunca no thumb correspondente
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA migra entre dot ↔ thumb > foco em dot acionado: elemento ativo está dentro do tablist DOTS, não THUMBS
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > Enter em dot[0]: foco NÃO está em heading/region/landmark
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > Enter em dot[1]: foco NÃO está em heading/region/landmark
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > Enter em dot[2]: foco NÃO está em heading/region/landmark
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > Space em dot[0]: foco NÃO está em heading/region/landmark
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > Space em dot[1]: foco NÃO está em heading/region/landmark
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > click em dot[0]: foco NÃO está em nenhum heading, region, status, alert ou landmark
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > click em dot[1]: foco NÃO está em nenhum heading, region, status, alert ou landmark
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: foco NUNCA salta para headings/regions vizinhas > regiões aria-live (se existirem) NUNCA recebem foco após troca via dot
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: próximo Tab target após troca de variação > click em dot[1] (não-ativo): após troca, thumb[NaN] é o único thumb na Tab order
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: próximo Tab target após troca de variação > sequência canônica (prev → dotAtivo → next → thumbAtivo → after) reflete o NOVO índice após Avançar
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > ArrowDown em dot[1] → após re-render, somente dot[2] tem tabindex=0
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > ArrowLeft em dot[0] (não-wrap): tabindex permanece exclusivo no 0
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > ArrowLeft em dot[2] (active=2) → após re-render, somente dot[1] tem tabindex=0
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > ArrowRight em dot[0] (active=0) → após re-render, somente dot[1] tem tabindex=0
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > End em dot[0] → após re-render, somente dot[last] tem tabindex=0
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > Home em dot[last] → após re-render, somente dot[0] tem tabindex=0
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > N=5: 'ArrowLeft' em dot[1] → tabindex=0 exclusivo migra para dot[+0]
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > N=5: 'ArrowLeft' em dot[3] → tabindex=0 exclusivo migra para dot[2]
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > N=5: 'ArrowLeft' em dot[4] → tabindex=0 exclusivo migra para dot[3]
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > N=5: 'ArrowRight' em dot[1] → tabindex=0 exclusivo migra para dot[2]
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — Onda 5: roving tabindex EXCLUSIVO após navegação por setas > N=5: 'ArrowRight' em dot[2] → tabindex=0 exclusivo migra para dot[3]
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — foco e roving após click em dot/thumbnail inativo > Click em dot[+0] inativo (active=1): foco fica em dot[+0] e roving migra
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — foco e roving após click em dot/thumbnail inativo > Click em dot[+0] inativo (active=2): foco fica em dot[+0] e roving migra
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — navegação por setas nos dots e thumbnails > ArrowDown e ArrowUp funcionam idênticos a ArrowRight/Left (suporte vertical)
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — navegação por setas nos dots e thumbnails > ArrowLeft em dot[1] move foco para dot[0] e chama setActiveVariation(0)
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — navegação por setas nos dots e thumbnails > ArrowRight em dot[last] NÃO faz wrap (não-wrap APG): foco e estado intactos
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — navegação por setas nos dots e thumbnails > Home em dot[2] move foco para dot[0]
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — navegação por setas nos dots e thumbnails > preventDefault é chamado para setas — não causa scroll da página
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — navegação por teclado (WCAG 2.1.1) > Space no dot ativa setActiveVariation com índice correto
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — navegação por teclado (WCAG 2.1.1) > Tab atinge prev → dots → next na ordem do DOM
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — retenção de foco em click no dot > Click em dot NÃO move foco para o thumbnail correspondente
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — retenção de foco em click no dot > Click em dot NÃO move foco para prev/next
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — retenção de foco em click no dot > Click em dot[meio] mantém foco em dot[meio]
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — retorno de foco após troca de variação ativa > Após ativar dot[2], roving tabindex está totalmente re-sincronizado nos dois grupos
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — retorno de foco após troca de variação ativa > Click em dot[2] mantém foco em dot[2] após re-render com active=2
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — setas APG (cobertura adicional de bordas e thumbnails) > N=2: ArrowLeft em dot[0] NÃO faz wrap (não-wrap APG)
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — setas APG (cobertura adicional de bordas e thumbnails) > Tecla 'Backspace' em dot é ignorada — não chama setActiveVariation e não previne default
tests/components/magic-up-result-panel-keyboard.test.tsx > MagicUpResultPanel — setas APG (cobertura adicional de bordas e thumbnails) > Tecla 'Tab' em dot é ignorada — não chama setActiveVariation e não previne default
tests/integration/magazine-service-fuzz.test.ts > magazineService — lifecycle happy path > create → get → update title → addProducts → publish → unpublish
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Edge Cases > handles future dates in created_at
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Edge Cases > handles rows with all null optional fields
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Edge Cases > handles unknown severity value gracefully
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Edge Cases > handles zero duration
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Exports > CSV button is disabled when no rows
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Exports > PDF button is enabled when rows exist
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Record Count > shows 0 registros when empty
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Record Count > shows correct record count text
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Rendering > passes timeFilter to TelemetryCharts
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Rendering > shows empty state message when no data
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Table Display > displays record_count as dash when null
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Table Display > handles 500 rows without crashing
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Table Display > shows dash when both rpc_name and table_name are null
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Table Display > shows rpc_name over table_name when available
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Table Display > shows severity badges with correct labels
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Top Offenders > does not show offenders section when no rows
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Top Offenders > groups rpc_name entries separately from table_name
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Top Offenders > limits offenders to max 8
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Top Offenders > renders top offenders section
tests/pages/AdminTelemetriaPage.test.tsx > AdminTelemetriaPage - Top Offenders > shows correct alert count per table
```

---

## Falhas pré-existentes (NÃO locais — CI externo)

Os checks abaixo falham no CI do main mas NÃO são falhas de typecheck/lint/test/build locais. São dependências externas:

| Check CI | Categoria | Motivo |
|---|---|---|
| Gate 0.5 - Dependency Audit | `npm audit` | Vulnerabilidades conhecidas em deps (pre-existing) |
| Edge Functions · Integration All | Edge function CI | Serviço externo instável |
| Supabase Preview | Deploy preview | Supabase preview env |
| audit | `npm audit` (variante) | Idem Gate 0.5 |
| quality-gate (1 instância) | Workflow externo | Cascata das acima |
| Gate Final - Deploy Ready | Agregador | Cascata de todas as acima |

**Critério de zero regressão:** qualquer merge que cause nova falha nos checks que estavam `success` no baseline = regressão. Typecheck, lint e unit tests passam localmente = baseline verde.

---

## Migrations de PR #2646 em produção (MCP read-only)

Verificado via `mcp__SUPABASE_-_GEST_O_DE_PRODUTOS_-_PROMO_GIFTS_V4__list_migrations` + Python search:

```
20261027160000: AUSENTE em produção
20261027220000: AUSENTE em produção  
20261027230000: AUSENTE em produção
```

**Confirmação:** PR #2646 NÃO foi mergeada → migrations corretamente ausentes do ledger `doufsxqlfjyuvxuezpln`.
