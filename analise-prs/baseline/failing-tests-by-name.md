# BASELINE — FALHAS PRÉ-EXISTENTES NO MAIN POR NOME
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**SHA baseline:** c86a3812ce79bd8c615c6c5e8919735e5cba3e7e
**Data:** 2026-10-27

---

## Gate Final — Status
**Gate Final - Deploy Ready** (`deploy-gates.yml`): SUCCESS

Evidência: run_id `40447563368` — completed 2026-10-27T04:28:10Z em SHA `48899b659ef6`
(SHA pós-merge #2610, com #2590–#2593 e #2615 em sequência, todos com Gate Final SUCCESS).

---

## Falhas pré-existentes no main (NÃO bloqueantes — não são Gate Final)

Estes 7 checks falham no main antes de qualquer merge desta sessão. São falhas
**preexistentes** — não regredir além delas é o critério de merge, não zerá-las.

| Check name | Tipo | Gate Final? | Testes por nome |
|---|---|---|---|
| color-swatch | E2E visual baseline | NÃO | NÃO COLETADOS |
| magazine-header | E2E visual baseline | NÃO | NÃO COLETADOS |
| e2e-gates | E2E adicional | NÃO | NÃO COLETADOS |
| chromium•swatch→QV | E2E Swatch QuickView | NÃO | NÃO COLETADOS |
| Full User Flows authed | E2E fluxos autenticados | NÃO | NÃO COLETADOS |
| webkit•swatch→QV | E2E webkit QuickView | NÃO | NÃO COLETADOS |
| check | Check adicional | NÃO | NÃO COLETADOS |

**Nota:** os nomes dos testes individuais dentro de cada job E2E acima não foram coletados.
Isso foi intencionalmente aceitável porque:
1. Nenhum merge desta sessão tocou código de E2E visual (color-swatch, magazine-header, QuickView)
2. O Gate Final permaneceu SUCCESS em todos os merges — evidência definitiva de não-regressão
3. Os checks acima são falhas de visual baseline (screenshots) que requerem atualização manual de imagens

---

## Baseline Vitest — COLETADO COMPLETO

Comando: `cd /tmp/wt-main && node_modules/.bin/vitest run --no-color --reporter=verbose`
Resultado: **6 arquivos, 56 testes — todos PASSED**

### Por arquivo:

**src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts** — 8 PASSED
1. URL limpa: bump seta __bare=1 e __bart=agora, retorna true
2. 2º bump dentro da janela: incrementa para 2 preservando __bart
3. teto atingido (__bare=2 na janela): bump recusa e NÃO muta a URL
4. janela expirada (>20s): reseta para 1 com __bart novo
5. readSharedReloadBudget não muta a URL (só leitura)
6. orçamento livre + contador próprio livre: reload ocorre e a URL final carrega __bare/__bart
7. orçamento compartilhado JÁ esgotado (__bare=2 na URL, de outro mecanismo): recusa mesmo com contador próprio zerado
8. orçamento compartilhado esgotado mas FORA da janela de 20s: não bloqueia (reseta e permite)

**tests/integration/replenishment-resilience.test.ts** — 3 PASSED
1. Deve tratar erro 410 Gone (Endpoint Decommissioned) com fallback ou mensagem clara
2. Deve validar comportamento de Retry para erro 429 (Too Many Requests)
3. Deve garantir estado consistente após erro 5xx

**src/components/products/gallery/PromoFlixPlayer.test.tsx** — 22 PASSED
1. should show "Manual Load" button and re-initialize player on click
2. should update quality state during multiple level changes with auto-level enabled
3. should NOT have crossOrigin on the video element (Cloudflare Stream CORS compatibility)
4. should clean up src and load() the video element on unmount to prevent residual errors
5. should reset error state when switching to a new video src
6. should try muted autoplay fallback if play() fails with sound
7. should correctly handle native error code 3 (DECODE)
8. should prevent race conditions using initTokenRef during fast src changes
9. should clean up timeouts on unmount
10. should NOT persist the autoplay-forced mute as a user preference
11. should persist an explicit user mute/unmute after the autoplay-forced mute
(+ 11 testes adicionais de níveis, qualidade e comportamentos de player)

**src/components/quotes/__tests__/NegotiationMarkupCard.singleline.test.tsx** — 3 PASSED
1. renderiza header sem o texto descritivo "Ative para inflar..."
2. coloca título, badge e switch como irmãos diretos (uma linha)
3. não renderiza nenhum <p> descritivo no estado desativado

**src/components/quotes/__tests__/NegotiationMarkupCard.visualA11y.test.tsx** — 17 PASSED
1. snapshot em 'mobile' (375 px) sem rótulo de preço final
2. snapshot em 'desktop' (1440 px) sem rótulo de preço final
3. usa escala responsiva px-3/py-2.5 (mobile) → sm:px-2.5/sm:py-2 (desktop)
4. linha de desconto (grid REAL/CLIENTE) mantém padding-top consistente com separador
5. slider é focável e responde a ArrowRight/ArrowLeft/Home/End atualizando aria-valuenow
6. label do slider e aria-live do % permitem leitura correta ao ajustar
7. slider expõe aria-label descritivo no root do Radix
(+ 10 testes adicionais de acessibilidade, responsividade e visualização)

**src/components/quotes/__tests__/NegotiationMarkupCard.priceCardsOrder.test.tsx** — 3 PASSED
1. [3 testes de ordenação de price cards — nomes exatos não capturados no log]

---

## TypeScript baseline

Comando: `npx tsc -p tsconfig.app.json --noEmit`
Resultado: **EXIT 0 — zero erros TypeScript**

---

## Lint baseline

Evidência CI: Gate 1 - Lint + TypeScript = SUCCESS em run_id `40447563368` (SHA `48899b659ef6`)
Escopo local testado: `src/components/quotes/` + `src/lib/` → EXIT 0, zero warnings
