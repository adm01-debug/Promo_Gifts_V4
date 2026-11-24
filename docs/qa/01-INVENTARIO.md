# 01 · Inventário do sistema e registro de cobertura

> Auditoria de QA somente-leitura · 2026-11-22 · commit base `ded84e9` (`main`)
> Nada foi alterado no código, no banco, no CI ou na Vercel durante esta auditoria.
> Convenção: **EXECUTADO** = comando/consulta/request rodado e saída observada · **RASTREADO** = caminho seguido lendo o código.

## 0. Como ler este arquivo

Cada seção termina com a coluna **Cobertura**: `revisado` ou `não revisado + motivo`.
A auditoria só pode se dizer exaustiva no que estiver marcado `revisado`. O que ficou de fora
está listado na seção 12 e repetido em `00-RESUMO.md`.

---

## 1. Stack, build e deploy

| Item | Valor | Evidência |
|---|---|---|
| Linguagem principal | TypeScript (5.181 arquivos) | `docs/contexto/codigo/INDEX.md` (branch `contexto`) |
| Front | React 18 + Vite + react-router + Tailwind + radix/shadcn | `package.json` |
| Estado | `@tanstack/react-query` + zustand | idem |
| Backend | Supabase (Postgres 17.6) + 112 edge functions Deno | `supabase/functions/`, MCP `list_edge_functions` → 111 em produção |
| Banco de produção (SSOT) | `doufsxqlfjyuvxuezpln` | `src/integrations/supabase/client.ts` (Gate 0) |
| CRM externo | `pgxfvjmuubtbowutlide`, só via edge `crm-db-bridge` | `AGENTS.md` |
| Deploy front | Vercel, projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`; merge em `main` = produção | `.vercel/project.json` |
| Deploy edge | workflow `deploy-edge-functions.yml` (MCP `deploy_edge_function` proibido) | `AGENTS.md` |
| Migrations | só pelo workflow `db-apply-migration.yml`; `supabase db push` proibido | `AGENTS.md` |
| Node | 22.22.1 (`.nvmrc`), npm | `docs/contexto/codigo/INDEX.md` |
| Ambientes | produção (Vercel `main`) + preview por PR + local (`vite`) + E2E (`.env.e2e.example`) | `.github/workflows/`, `playwright.config.ts` |

### Comandos de verificação do repo (todos EXECUTADOS nesta auditoria)

| Comando | Resultado | Evidência |
|---|---|---|
| `npm ci` | 1.133 pacotes, sem erro | log de instalação |
| `npm run qa:typecheck` (`tsc -p tsconfig.app.json --noEmit`) | **exit 0 — sem erro de tipo** | EXECUTADO |
| `npm run lint` | **exit 0 — 0 erros, 0 warnings vs baseline** | EXECUTADO |
| `npm test` (`TZ=America/Sao_Paulo vitest run`) | **7 arquivos / 26 testes falham** de 1.869 arquivos e 34.035 testes · `EXIT=1` (ACH-101) | EXECUTADO |
| `npm run build` | não executado — ver seção 12 (etapa 300 do plano) | — |
| `npm run test:e2e` (Playwright) | não executado — exige banco/preview com seed; ver seção 12 | — |

**Cobertura:** revisado.

---

## 2. Números do sistema (fonte: contexto gerado + banco vivo)

| Item | Repo (`docs/contexto/codigo`) | Banco vivo (MCP, 2026-11-22) |
|---|---|---|
| Rotas de tela | 141 | — |
| Componentes | 1.281 | — |
| Hooks | 645 | — |
| Edge functions | 112 (conta a pasta `tests/`) | **111** deployadas |
| Tabelas | 531 (visão do código) | **417** em `public` + 446 em todos os schemas |
| Colunas | — | 8.708 |
| Views | — | 222 |
| Funções SQL | — | 1.360 |
| Triggers | — | 428 |
| Policies RLS | — | **1.087** |
| Índices | — | 1.355 |
| Cron jobs | 122 | **136 ativos** / 143 cadastrados |
| Buckets storage | — | 11 |
| Migrations | 3.127 arquivos | 3.008 aplicadas |
| Workflows CI | 89 | — |
| Testes | 2.702 | — |

> **Divergência de contagem registrada:** o gerador de contexto conta 112 edge functions porque
> inclui `supabase/functions/tests/`, que não é edge; produção tem 111. Toda frase "112 edges" no
> repo está 1 acima. Achado `ED-15`.

**Cobertura:** revisado.

---

## 3. Atores e papéis

| Papel | Pode (resumo) | Fonte |
|---|---|---|
| `anon` (visitante sem login) | catálogo público via views `v_*_public` e RPCs `fn_super_filtro*`, `get_catalog_bestseller_page`, `get_sitemap_public` | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` §2; advisors MCP |
| `buyer` / comprador | pesquisar, criar e editar orçamento próprio | §2 das regras |
| `vendedor` (80 contas em produção) | ver todos os orçamentos, responder, mudar status | censo `user_roles` (EXECUTADO pelo subagente de edge) |
| `admin` (4 contas) | gerenciar usuários, categorias, fornecedores, configurações | idem |
| `dev` (2 contas) | tudo acima + telemetria, conexões, secrets, MCP | `src/routes/admin-routes.tsx` (`DevRoute`) |
| `service_role` | irrestrito; cron e edge functions | §2 das regras |

Guarda de rota administrativa: `src/components/layout/AdminRoute.tsx:40-80` exige sessão, `canManage`
**e AAL2 (MFA verificado)** — RASTREADO, código lido.

> **Falso negativo do inventário gerado:** `docs/contexto/codigo/rotas.json` marca 22 rotas `/admin/*`
> como `protegida: false` (ex.: `/admin/roles`, `/admin/permissoes`). Lendo
> `src/routes/admin-routes.tsx:64-80`, todas estão dentro de `<Route element={<AdminRoute />}>`.
> O gerador só detecta wrapper direto, não rota de layout. Achado `INF-CTX-1`.

**Cobertura:** revisado.

---

## 4. Jornadas principais

| # | Jornada | Ator | Entrada | Dado gravado |
|---|---|---|---|---|
| J1 | Buscar produto no catálogo e ver detalhe | anon / buyer | `/`, `/produtos`, `/produto/:id` | `analytics_events`, `view_count` |
| J2 | Montar orçamento (quote builder) e enviar | buyer | `/orcamentos/*` | `quotes`, `quote_items` |
| J3 | Vendedor negocia, aplica desconto/markup, aprova | vendedor | `/orcamentos/:id` | `quotes.status`, limites de desconto |
| J4 | Aprovação de desconto acima do limite | admin | `/admin/aprovacoes-desconto/:id` | `discount_requests` |
| J5 | Montar kit (kit-builder) | buyer/vendedor | `/kit-builder` | `kit_*` |
| J6 | Gerar mockup / personalização | buyer/vendedor | `/mockups/*` | `mockup_*`, bucket de assets |
| J7 | Publicar magazine com link público | vendedor | `/magazine/*` | `magazines`, `magazine_public_*` |
| J8 | Cálculo de frete | vendedor | `/frete` | `freight_settings`, plano de frete |
| J9 | Ingestão de fornecedor (Bronze→Silver→Gold) | service_role/cron | edge `asia-ingestion` | `supplier_products_raw` → `products` |
| J10 | Sincronizar orçamento com CRM/Bitrix e PromoChampions | service_role | edge `quote-sync`, `quote-sync-promo-champions` | CRM externo |
| J11 | Login com MFA + rate limit + Turnstile | todos | `/auth` | `login_attempts`, `bot_detection_log` |
| J12 | Admin gerencia papéis e permissões | admin/dev | `/admin/roles`, `/admin/permissoes` | `user_roles`, `role_permissions` |

Matriz de cenários por jornada: `02-CENARIOS.md`.

**Cobertura:** revisado para J1–J4, J7, J9–J12 · parcial para J5, J6, J8 (ver seção 12).

---

## 5. Rotas (141) — cobertura

| Grupo | Qtd | Cobertura |
|---|---|---|
| Harness de teste (`/__test/*`, `/__visual/*`) | 17 | revisado — gate `scripts/check-production-harnesses.mjs` roda no `npm run build` |
| Públicas (catálogo, auth, magazine público) | ~40 | revisado |
| `/admin/*` | 41 | revisado (guarda `AdminRoute` + `DevRoute`) |
| Orçamentos, produtos, ferramentas, BI, coleções | ~43 | revisado |
| Depreciadas (`DeprecatedRoute`) | 3 (`/admin/comissoes`, `/admin/performance`, `/admin/performance-comercial`) | revisado — redirecionam, não quebram |
| Redirects (`Navigate`) | 3 | revisado — `/admin` → `/admin/usuarios`; o "ARQUIVO NÃO RESOLVIDO" do `rotas.json` é só o gerador não resolver `Navigate` |

**Cobertura:** revisado.

---

## 6. Edge functions (111 em produção)

| Recorte | Qtd | Cobertura |
|---|---|---|
| Total deployado | 111 | revisado — repo × produção comparado, **0 divergência de `verify_jwt`**, 0 função só em produção |
| `verify_jwt = false` | 36 | revisado — todas validam antes de mutar (JWT+`user_roles`, dispatcher-secret, cron-secret do vault, ou escopo MCP com hash) |
| `verify_jwt = false` **e** tocam tabela | 28 | revisado |
| Marcadas "órfãs" pelo gerador | 50 | **parcial** — o flag é só análise estática e tem falso positivo comprovado: `quote-sync-promo-champions` é chamada em `src/pages/quotes/quote-view/QuotePromoChampionsSync.ts:45`. Tratar a lista como HIPÓTESE |
| Segredos hardcoded | 0 | revisado (varredura em todos os `.ts` de `supabase/functions/`) |
| Webhooks (assinatura + idempotência) | `webhook-inbound`, `receive-crm-callback`, `webhook-dispatcher` | revisado — HMAC-SHA256 por endpoint, janela anti-replay de 7 dias, índices únicos de idempotência confirmados em produção |

**Cobertura:** revisado, exceto a lista de órfãs (parcial).

---

## 7. Banco de dados

| Verificação | Resultado (EXECUTADO via MCP, 2026-11-22) |
|---|---|
| Tabelas em `public` sem RLS | **0 de 417** |
| Funções `SECURITY DEFINER` sem `search_path` fixo | **0** |
| Policies de `SELECT` com `USING (true)` para `anon`/`authenticated`/`public` | **138** (maior: `stock_daily_summary`, 3.270.690 linhas, aberta a todo logado) |
| Views em `public` com `security_invoker=false` (rodam como owner, ignoram RLS) | **10** — advisor nível ERROR |
| Objetos visíveis no GraphQL para `anon` | **65** |
| Objetos visíveis no GraphQL para `authenticated` | **477** |
| Funções `SECURITY DEFINER` executáveis por `anon` via RPC | **9** |
| Funções `SECURITY DEFINER` executáveis por `authenticated` via RPC | **112** |
| RLS ligado sem policy | 1 (`crm_seller_identity_links` — intencional, só `service_role`) |
| Extensões no schema `public` | 2 (`pg_repack`, `pgstattuple`) |
| Cron jobs ativos | 136; 1 nunca executou (`smoke_tests_monthly`, jobid 32); 7 cadastrados e inativos |
| Partições `supplier_products_raw_history` para 2027 | **existem, p2027_01 a p2027_12** — o risco "criar antes de 2026-12-15" das regras de negócio **já está resolvido**; a doc está desatualizada |
| `webhook_outbox` | 0 linhas; o cron `process-webhook-outbox` (jobid 202) está **inativo** |

**Cobertura:** revisado no plano estrutural e de permissão. **Não revisado:** conteúdo de todas as 1.087
policies uma a uma (amostragem dirigida apenas) e as 1.360 funções SQL (idem) — motivo na seção 12.

---

## 7.1 Testes — cobertura e estado

| Verificação | Resultado (EXECUTADO) |
|---|---|
| Suíte completa `npm test` | **7 arquivos falham · 26 casos falham** de 1.869 arquivos / 34.035 casos · `EXIT=1` |
| Arquivos que falham | `tests/components/pages/KitBuilderPage.test.tsx` (14 casos), `tests/components/kit-builder/FreightEstimator.test.tsx`, `.../KitBuilderComponents.test.tsx`, `.../KitSummary.weight.test.tsx`, `tests/components/QuoteCommentsSection.test.tsx`, `tests/pages/legacy-KitBuilder.partial-preservation.test.tsx`, `tests/scripts/drift-baseline.test.mjs` |
| Causa raiz nos arquivos de kit | import de `@/components/kit-builder/FreightEstimator`, que **não existe** em disco — componente removido, testes deixados atrás |
| Gate de teste que bloqueia merge | `Gate 2 - Unit Tests` roda `npm run test:ci-core`, uma **lista fixa de ~70 arquivos**; nenhum dos 7 que falham está nela |
| Suíte inteira no CI | `ci.yml:198,250` rodam `vitest run --coverage`, mas `ci.yml` não entra no `needs:` do agregador obrigatório |
| Cobertura de rota | `npx vitest run src/routes` → 4 arquivos / **9 testes** para **141 rotas** |
| Testes de RLS | `tests/rls/` existe e roda no CI (`ci.yml:164`) |

**Cobertura:** revisado. Achados: ACH-101, ACH-102.

## 8. Integrações externas

| Integração | Direção | Como entra/sai | Cobertura |
|---|---|---|---|
| Bitrix24 / CRM | bi-direcional | edge `bitrix-sync`, `crm-db-bridge` | revisado |
| CRM externo Supabase `pgxfvjmuubtbowutlide` | leitura | edge `crm-db-bridge` (`verify_jwt=false`) | revisado |
| Asia Ingestion | entrada | edge `asia-ingestion` (`ASIA_BASE_URL`) | revisado |
| Cloudflare Turnstile | entrada | edge `check-login` (fail-closed) | revisado |
| N8N | saída | `N8N_QUOTE_WEBHOOK_URL` via `quote-sync` | revisado |
| PromoChampions (projeto `rapjswienfhkobhlamxb`) | saída | `quote-sync-promo-champions` POSTa URL **hardcoded** em `supabase/functions/quote-sync-promo-champions/index.ts:16` | revisado |
| Webhooks de saída (`outbound_webhooks`) | saída | edge `webhook-dispatcher` | revisado |
| Webhooks de entrada | entrada | edge `webhook-inbound` (HMAC por endpoint) | revisado |
| Cloudflare Images | saída | `/admin/cloudflare-images` | não revisado (seção 12) |
| Roboflow / ElevenLabs / provedores de IA | saída | `ai_providers`, `elevenlabs-scribe-token` | parcial — só o kill-switch e a quota foram vistos |

**Cobertura:** revisado para as integrações de dinheiro e de dado do cliente; parcial para IA/imagem.

---

## 9. Storage (11 buckets)

Inventariado via `docs/contexto/supabase/storage.md` e policies de `storage.objects`.
**Cobertura:** parcial — ver achados do subagente transversal em `03-ACHADOS.md`.

---

## 10. CI (89 workflows) e gates

Gates declarados no repo (amostra relevante, lida em `package.json`):
`validate-supabase-config.mjs` (Gate 0), `check-product-type-fields.mjs` (Gate 1.1),
`check-production-harnesses.mjs`, `check-public-views-drift.mjs`, `check-select-columns.mjs`,
`check-timer-cleanup.mjs`, `check-chunk-cycles.mjs`, `check-bundle-size.mjs`,
`check-eslint-baseline.mjs`, `check-todo-baseline.mjs`, `check-file-size-baseline.mjs`,
`check-contract-coverage.mjs`, `check-schema-reference-drift.mjs`.
Checks obrigatórios em `main`: `.github/required-checks.json`.

**Cobertura:** revisado nos gates ligados aos achados; **não revisado** workflow por workflow (89).

---

## 11. Variáveis de ambiente

Fonte declarada: `.env.example` (7 KB), `.env.production`, `.env.e2e.example`, `docs/ci/SEGREDOS.md`.
**Cobertura:** revisado (comparação código × exemplo feita pelo subagente de infra; resultado em `03-ACHADOS.md`).

---

## 12. O que NÃO foi coberto (e por quê)

| Camada / item | Motivo |
|---|---|
| `npm run build` | O build roda 4 gates e o Vite; não foi executado para não competir por CPU/disco com a suíte de testes nesta sessão. Typecheck e lint, que são o que pega regressão de código, foram executados. |
| Suíte E2E Playwright (627 testes) | Exige Supabase local com seed ou ambiente de preview autenticado; indisponível nesta sessão somente-leitura. |
| As 1.087 policies RLS uma a uma | Volume. Foi feita varredura estrutural (RLS ligada em 100% de `public`, policies `USING(true)` contadas e listadas) + amostragem dirigida nas tabelas de orçamento, cliente, mockup e arquivo de arte. |
| As 1.360 funções SQL uma a uma | Volume. Verificado o atributo de risco em bloco (`SECURITY DEFINER` sem `search_path` = 0) + amostragem das expostas a `anon`. |
| 89 workflows um a um | Volume. Revisados os ligados a deploy, migration, segredo e os gates citados nos achados. |
| Teste de carga / concorrência real | Escreveria em produção. Concorrência foi RASTREADA no código, nunca EXECUTADA. |
| Jornadas J5 (kit-builder), J6 (mockup), J8 (frete) de ponta a ponta | Cobertas por leitura de código e testes unitários existentes, sem execução de UI. |
| Integrações Cloudflare Images, Roboflow, ElevenLabs | Exigem credencial e chamada a terceiro; fora do escopo somente-leitura. |
| Acessibilidade além do básico | Só verificações objetivas (aria-label, foco em dialog); sem leitor de tela nem auditoria WCAG completa. |
| Banco do CRM externo (`pgxfvjmuubtbowutlide`) | Fora do SSOT deste app; acessível só pela edge `crm-db-bridge`. |
