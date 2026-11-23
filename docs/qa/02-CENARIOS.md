# 02 · Matriz de cenários por jornada

> Auditoria somente-leitura · 2026-11-22 · commit `ded84e9`.
> **EXECUTADO** = comando, consulta SQL ou request HTTP rodado e saída observada.
> **RASTREADO** = caminho seguido lendo o código que roda (interface → hook → chamada → backend → banco).
> Nenhuma escrita foi feita em produção. Cenários de escrita/concorrência são, por isso, RASTREADOS.
> Cada linha em que "encontrado ≠ esperado" vira achado em `03-ACHADOS.md` (coluna Achado).

**Contagem:** 42 cenários de jornada — **11 EXECUTADOS** e **31 RASTREADOS** — mais **13 verificações globais**
executadas (seção 6). Total: 24 verificações executadas de verdade, 31 rastreadas por leitura de código.

Dimensões cruzadas, conforme pedido: **ator** (anon / buyer / vendedor / admin / dev / outra conta) ×
**estado do dado** (vazio / 1 / muitos / limite / inválido / duplicado / excluído) × **entrada**
(válida / vazia / enorme / malformada / caractere especial / borda) × **condição** (duplo clique /
duas abas / dois usuários / rede caindo / sessão expirada / terceiro fora do ar / reenvio / fora de ordem).

---

## J1 · Catálogo público (anon e buyer)

| # | Ator | Estado | Entrada | Condição | Esperado | Encontrado | Marca | Achado |
|---|---|---|---|---|---|---|---|---|
| 1.1 | anon | muitos | — | — | lê catálogo público, sem custo de fornecedor | `GET /rest/v1/v_products_public` → 200 com `"cost_price":null` (mascarado, correto) | **EXECUTADO** | — |
| 1.2 | anon | muitos | — | — | **não** deve ler custo de compra | `GET /rest/v1/v_compras_catalogo` → **200 com `cost_price:4.34`, `supplier_name`, `supplier_reference`, `ipi_rate`** | **EXECUTADO** | **DB-01** |
| 1.3 | anon | muitos | — | — | **não** deve ler custo por faixa de quantidade | `GET /rest/v1/v_compras_precos_faixa` → **200 com `unit_cost:150.15`** | **EXECUTADO** | **DB-01** |
| 1.4 | anon | muitos | — | — | view de preço por variante responde ou 403 coerente | `GET /rest/v1/v_compras_precos_variante` → **401 `42501 permission denied for table suppliers`** (quebrada, não negada por política) | **EXECUTADO** | **DB-03** |
| 1.5 | anon | muitos | — | — | fornecedores públicos sem PII/credencial | `GET /rest/v1/v_suppliers_public` → 200, só id/nome/UF/flags | **EXECUTADO** | — |
| 1.6 | anon | muitos | — | — | tabelas-base da cadeia continuam fechadas | `vw_variant_sale_prices`, `variant_supplier_sources`, `stock_daily_summary` → **401 42501** | **EXECUTADO** | — |
| 1.7 | anon | muitos | — | — | `markup_configurations` sem linhas para anon | 200 com `[]` (GRANT existe, RLS corta) | **EXECUTADO** | DB-04 |
| 1.8 | buyer | vazio | busca sem resultado | — | estado vazio explícito | `FiltersPage.tsx:763-782` mostra "Nenhum produto encontrado" | RASTREADO | — |
| 1.9 | buyer | muitos | — | **rede caindo** / erro de query | mensagem de erro + ação de tentar de novo | `useCatalogState.ts:260-273` ignora `isError` → a tela mostra "Nenhum produto encontrado" como se o catálogo estivesse vazio | RASTREADO | **UI-03** |
| 1.10 | anon | muitos | filtro com caractere especial | — | filtro não quebra nem injeta | `fn_super_filtro` é `SECURITY DEFINER` com `search_path` fixo e parâmetros tipados | RASTREADO | — |

## J2 · Montar e enviar orçamento (buyer)

| # | Ator | Estado | Entrada | Condição | Esperado | Encontrado | Marca | Achado |
|---|---|---|---|---|---|---|---|---|
| 2.1 | buyer | vazio | — | — | orçamento vazio não envia | CHECKs em `quote_items` (`quantity > 0`, `subtotal >= 0`, `unit_price >= 0`) | RASTREADO | — |
| 2.2 | buyer | 1 item | quantidade 0 / negativa | — | banco recusa | CHECK `quantity > 0` presente | RASTREADO | — |
| 2.3 | buyer | 1 item | quantidade abaixo do MOQ | — | erro antes do envio (regra §5 das regras de negócio) | não há constraint de MOQ no banco; a checagem vive no front | RASTREADO | ver `NEG-*` |
| 2.4 | buyer | muitos | — | **duplo clique em Enviar** | 1 orçamento, não 2 | RASTREADO no código do builder; **não executado** (escreveria em produção) | RASTREADO | — |
| 2.5 | buyer | 1 | — | **duas abas** editando o mesmo rascunho | última escrita vence sem perder item | não verificável sem escrita | RASTREADO | — |
| 2.6 | buyer | 1 | — | **sessão expirada** no meio | redireciona para `/auth` preservando retorno | `ProtectedRoute.tsx:41-48` redireciona com `state.from` | RASTREADO | — |
| 2.7 | buyer | muitos | — | rede cai no envio | erro visível, rascunho preservado | rascunho é auto-salvo (Gate 1.5 proíbe botão "Salvar Alterações") | RASTREADO | — |
| 2.8 | buyer | — | — | abrir `/orcamentos/templates` | 1 carga por query | **3 instâncias de `useQuoteTemplates`** → as mesmas 3 queries rodam 3× | RASTREADO | **UI-12** |
| 2.9 | buyer | — | — | erro ao listar templates | erro visível | `useQuoteTemplates.ts:110-111,464-469` expõe `error`, nenhum consumidor lê | RASTREADO | **UI-05** |

## J3/J4 · Negociação, desconto e aprovação (vendedor, admin)

| # | Ator | Estado | Entrada | Condição | Esperado | Encontrado | Marca | Achado |
|---|---|---|---|---|---|---|---|---|
| 3.1 | vendedor | 1 | desconto dentro do limite | — | aplica | limite por vendedor em `seller_discount_limits` com CHECK 0–100 | RASTREADO | — |
| 3.2 | vendedor | 1 | desconto acima do limite | — | exige aprovação | trigger `fn_deferred_quote_discount_integrity` existe no banco | RASTREADO | — |
| 3.3 | admin | muitos pendentes | — | — | badge de pendências no menu | `SidebarReorganized.tsx:482` compara `href === '/admin/usuarios?tab=discounts'`, href que não existe → **badge nunca aparece** | RASTREADO | **UI-07** |
| 3.4 | vendedor | 1 | — | **reenvio** da mesma aprovação | idempotente | não verificável sem escrita | RASTREADO | — |
| 3.5 | outra conta | 1 de outro vendedor | — | — | não vê nem altera | RLS de `quotes` por organização/dono | RASTREADO (amostragem de policy) | — |

## J7 · Magazine com link público

| # | Ator | Estado | Entrada | Condição | Esperado | Encontrado | Marca | Achado |
|---|---|---|---|---|---|---|---|---|
| 7.1 | anon com token | 1 | — | — | abre a revista | `magazine-public-view` (`verify_jwt=false`) valida token | RASTREADO | — |
| 7.2 | anon com token | 1 | — | clicar em **Imprimir** | abre versão de impressão | `PublicMagazineView.tsx:346` manda para `/magazine/print`, que está sob `ProtectedRoute` → **cai no login** | RASTREADO | **UI-01** |
| 7.3 | anon | 1 | `viewer_fingerprint` forjado | **reenvio em massa** | gravação limitada | `magazine-reader-state-write` aceita fingerprint livre na chave do upsert, sem teto por revista | RASTREADO | **ED-13** |
| 7.4 | anon | 1 | reação duplicada | **duplo clique** | 1 reação | índice único de idempotência confirmado em produção | **EXECUTADO** (consulta a `pg_index`) | — |

## J9/J10 · Ingestão e integrações

| # | Ator | Estado | Entrada | Condição | Esperado | Encontrado | Marca | Achado |
|---|---|---|---|---|---|---|---|---|
| 9.1 | service_role | muitos | lote do fornecedor | — | grava em `supplier_products_raw` | edge `asia-ingestion` (`verify_jwt=false`) valida antes de mutar | RASTREADO | — |
| 9.2 | service_role | — | — | **terceiro fora do ar** | timeout e erro registrado | `webhook-dispatcher/index.ts:162,305` faz POST **sem `AbortSignal`** → pendura a função | RASTREADO | **ED-02** |
| 9.3 | admin | 1 webhook | — | **entrega duplicada** | 1 gravação | índices `idx_webhook_idempotency` e `crm_callback_events_idempotency_uk` presentes | **EXECUTADO** | — |
| 9.4 | admin | 1 webhook | — | clicar "Testar webhook" | funciona para admin | `_shared/dispatcher-auth.ts:25` não tem `admin` no `ROLE_RANK` → **403 para as 4 contas admin** | RASTREADO | **ED-01** |
| 9.5 | service_role | — | `backoff_seconds` absurdo no banco | — | delay limitado | `webhook-dispatcher:241-243` não faz clamp do delay | RASTREADO | **ED-08** |
| 9.6 | — | 0 | — | fila de saída | processador rodando | `webhook_outbox` com 0 linhas e cron `process-webhook-outbox` (jobid 202) **inativo** | **EXECUTADO** | DB-08 |
| 9.7 | anon | — | `op=ping` | reenvio em massa | exige auth antes de responder | `crm-db-bridge:877-880` responde ao `ping` **antes** do auth e do rate limit | RASTREADO | **ED-07** |

## J11 · Login, MFA e rate limit

| # | Ator | Estado | Entrada | Condição | Esperado | Encontrado | Marca | Achado |
|---|---|---|---|---|---|---|---|---|
| 11.1 | anon | — | e-mail de terceiro | **reenvio** para trancar a conta | não trancar conta alheia | `fn_check_login_allowed` conta por par (email, ip); só zera com `verified=true` decidido na edge | **EXECUTADO** (leitura da função no banco) | — |
| 11.2 | anon | — | — | Turnstile fora do ar | fail-closed | `check-login` bloqueia (fail-closed) | RASTREADO | — |
| 11.3 | admin sem MFA | — | — | acessa `/admin/*` | força cadastro de MFA | `AdminRoute.tsx:40-50` abre enrollment obrigatório | RASTREADO | — |
| 11.4 | admin com MFA, sessão aal1 | — | — | acessa `/admin/*` | pede challenge | idem, eleva a sessão | RASTREADO | — |

## J12 · Papéis e permissões

| # | Ator | Estado | Entrada | Condição | Esperado | Encontrado | Marca | Achado |
|---|---|---|---|---|---|---|---|---|
| 12.1 | buyer | — | abre `/admin/roles` à força pela URL | — | negado | `<AdminRoute>` em `admin-routes.tsx:66` nega (tela `app-access-denied`) | RASTREADO | — |
| 12.2 | admin | — | consulta a matriz RBAC da tela | — | matriz = rotas reais | `route-matrix.ts` tem 5 entradas fantasma e **omite 25 rotas reais** | RASTREADO | **UI-06** |
| 12.3 | dev | — | — | — | acessa telas dev | `<DevRoute>` em `admin-routes.tsx:118` | RASTREADO | — |

---

## 6 · Verificações globais executadas

| Verificação | Comando | Resultado | Marca |
|---|---|---|---|
| Tipos | `npm run qa:typecheck` | exit 0, nenhum erro | EXECUTADO |
| Lint | `npm run lint` | exit 0, 0 erros / 0 warnings vs baseline | EXECUTADO |
| Dependências | `npm audit --omit=dev --json` e `npm audit --json` | **0 vulnerabilidades em todas as severidades** | EXECUTADO |
| Segredos | `gitleaks v8.21.2`, mesmo comando do CI | 30 achados, **todos** em `graphify-out/cache/stat-index.json`, que é gitignored e não existe no checkout do CI | EXECUTADO |
| Permissões de workflow | leitura dos 89 workflows + MCP | 0 `write-all`, 0 `pull_request_target`, 0 `if: false`; `default_workflow_permissions: read`; 100% das actions pinadas em SHA | EXECUTADO |
| Saúde do cron | `cron.job_run_details` (48 h) | `fails_7d = 0` em 100% dos jobs ativos; `smoke_tests_monthly` (jobid 32) **ativo e nunca executado** | EXECUTADO |
| RLS | `pg_class.relrowsecurity` em `public` | **0 tabelas sem RLS em 417** | EXECUTADO |
| `SECURITY DEFINER` | `pg_proc.proconfig` | **0 funções sem `search_path` fixo** | EXECUTADO |
| Deploy de produção | `github_list_deployments` + status | deployment 7983148308, `state=success`, sha `ded84e97` = HEAD de `main` | EXECUTADO |
| Rotas | `npx vitest run src/routes` | 4 arquivos / 9 testes verdes — **9 testes para 141 rotas** | EXECUTADO |
| Suíte completa | `npm test` (`TZ=America/Sao_Paulo vitest run`) | **7 arquivos falham · 26 testes falham** de 1.869 arquivos / 34.035 testes · `EXIT=1` | EXECUTADO |
| Edge repo × produção | MCP `list_edge_functions` × `supabase/functions/` | **0 divergência de `verify_jwt`**, 0 função em produção ausente do repo | EXECUTADO |
| Chamadas do front para edge inexistente | grep de `functions.invoke(` × pastas | **0** (`receive-quote-sync` é URL de outro projeto Supabase) | EXECUTADO |

> **Resultado de `npm test` (EXECUTADO, commit `ded84e9`):**
> `Test Files 7 failed | 1731 passed | 131 skipped (1869)` · `Tests 26 failed | 32841 passed | 1 expected fail | 1143 skipped | 24 todo (34035)`.
> Os arquivos que falham e a causa raiz medida estão em ACH-101. O gate de teste que bloqueia merge roda
> `test:ci-core`, uma lista fixa de ~70 arquivos, e nenhum dos 7 que falham está nela (ACH-102) — por isso o CI
> de `main` está verde com a suíte vermelha.

## 7 · Cenários NÃO cobertos

| Cenário | Motivo |
|---|---|
| Qualquer cenário de **escrita** (criar/editar/excluir orçamento, aprovar desconto, enviar webhook) | Escreveria em produção. Auditoria somente-leitura. |
| Concorrência real (duplo clique, duas abas, dois usuários) | Idem — foi RASTREADA no código, nunca EXECUTADA. |
| Rede caindo no meio / terceiro fora do ar | Exige injeção de falha em ambiente controlado. |
| E2E Playwright (627 testes) | Exige Supabase local com seed ou preview autenticado. |
| Jornadas J5 (kit-builder), J6 (mockup), J8 (frete) de ponta a ponta | Cobertas por leitura e por testes unitários existentes, sem execução de UI. |
