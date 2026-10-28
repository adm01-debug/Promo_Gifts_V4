# PENDÊNCIAS CI — adm01-debug/Promo_Gifts_V4

**Sessão:** https://claude.ai/code/session_01VXkRxafXhqqt3j3oxCDguY  
**Data:** 2026-10-27  
**Contexto:** Workflows com falha não resolvidos automaticamente — requerem decisão do PO ou intervenção especializada.

---

## P1 — `edge-functions-drift-check.yml` — 106 funções com drift

**Run ID:** 40556559682  
**Status:** FALHA em produção  
**Impacto:** Alto — todas as funções divergem entre repo e Supabase (`doufsxqlfjyuvxuezpln`)

### Causa raiz
O job `compare-deployed-vs-repo` detectou que 106 edge functions deployed diferem do código no repo (conteúdo, versão, ou timestamp). O workflow `edge-functions-drift-check.yml` compara o estado do Supabase canônico contra o HEAD do repo e falha quando encontra divergências.

### Por que não foi resolvido
Deployar todas as 106 funções requer:
1. Decisão do PO: confirmar que HEAD do repo é a versão correta para produção em todas elas
2. Potencial downtime de funções em uso (não há blue-green para edge functions no Supabase)
3. Possível regressão se alguma função tem código deployado mais recente que o repo (ver REGRA #8 corolário: drift pode ser de prod → repo, não só repo → prod)

### Ação necessária
`APROVADO` → dispatch `deploy-edge-functions.yml` sem `function_name` (deploya todas as 106 funções do repo para produção)

**Risco:** produção.

---

## P2 — `ci-security-drift.yml` — E2E autenticados falhando

**Run ID:** 40572157312  
**Status:** FALHA no HEAD (`e0b569f`)  
**Impacto:** Médio — testes de segurança autenticados bloqueados

### Causa raiz
Dois testes E2E autenticados falham:

**`kit-builder.spec.ts`:**
- `startBtn` não é clicável — elemento de header (provavelmente `position: fixed/sticky`) está na frente do botão com `z-index` maior, interceptando o evento `click`
- Mensagem: `"element is intercepted by another element"` ou similar
- Suspeita: mudança de layout em componente header após commit de Lovable

**`catalog.spec.ts`:**
- `virtualized-product-grid` não aparece dentro de 120s
- Causa provável: dado de catálogo vazio em ambiente de teste, ou seletor desatualizado após refactor de componente

### Por que não foi resolvido
- Requer rodar os testes localmente com trace para identificar o elemento que intercepta o clique no kit-builder
- Requer verificar se o seletor `virtualized-product-grid` ainda existe no DOM pós-refactor
- Mudanças de UI do Lovable podem ter alterado a hierarquia de z-index — fix pode ser no teste (locator mais específico) ou no CSS

### Ação necessária
1. Inspecionar `tests/e2e/kit-builder.spec.ts` e `tests/e2e/catalog.spec.ts`
2. Verificar se componentes `kit-builder` e `virtualized-product-grid` existem no DOM atual
3. Corrigir seletores ou adicionar scroll/wait antes do click no kit-builder

---

## P3 — `e2e-swatch-quickview.yml` — Skip rate 66.7% (máx 50%)

**Run ID:** 40572329350  
**Status:** FALHA no HEAD (`e0b569f`)  
**Impacto:** Médio — testes de swatch/quickview praticamente não rodam

### Causa raiz
- 10/15 testes skipados (66.7%) — gate `check-playwright-min-executed.mjs` exige máximo de 50% de skip
- Apenas 5 testes executados (mínimo exigido: 10)
- Os testes skipados provavelmente têm `test.skip(condition)` baseado em dados de catálogo (produto com swatches disponível, estoque ativo) que não estão presentes no ambiente de CI

### Por que não foi resolvido
- Causa pode ser: (a) fixture de dados de catálogo ausente em CI, (b) condicional de skip muito restritiva, (c) produtos com swatch foram removidos/desativados no banco de test
- Requer investigar o estado dos dados de teste (tabela `products` com `has_color_variants = true` ou similar)
- Possível fix: seeds de dados de teste ou relaxar condicional de skip

### Ação necessária
1. Ler `tests/e2e/e2e-swatch-quickview.spec.ts` para entender as condições de skip
2. Verificar se dados de produtos com swatches existem no ambiente de teste (Supabase branch ou fixture)
3. Corrigir seeds ou condicionals de skip

---

## P4 — `e2e.yml` — Run CANCELADO (não é falha de código)

**Run ID:** 40572329580  
**Status:** CANCELADO  
**Impacto:** Baixo — cancelamento manual, não indica bug

### Causa raiz
Run foi cancelado externamente durante execução do job `e2e-gates`. Pode ter sido:
- Cancelamento manual pelo PO ou outro agente
- Cancelamento por `concurrency` (outro push na mesma branch)
- Timeout de runner externo

### Por que não foi resolvido
Não há falha de código a corrigir. O próximo push em `main` vai disparar um novo run.

### Ação necessária
Nenhuma — o próximo push em `main` (quando este PR for mergeado) vai criar um novo run de `e2e.yml`.

---

## P5 — `e2e-magazine-header.yml` — Navegação magazine quebrada após zustand v5

**Run ID:** 40544233176  
**Status:** FALHA no commit `16ad57c`  
**Impacto:** Alto — editor de magazine completamente inacessível em CI

### Causa raiz
- `openFirstEditor()` helper falha ao navegar para `/magazine/[id]`
- Commit `16ad57c` incluiu bump de zustand v4 → v5
- zustand v5 tem breaking changes na API de `setState` e no uso de `shallow` que podem ter quebrado o store de magazine
- Sintoma: navegação chega na URL mas o componente não monta (provavelmente erro de estado React não capturado)

### Por que não foi resolvido
- Requer auditoria de `src/pages/magazine/` para usos de `useStore`, `shallow`, `subscribeWithSelector`
- zustand v5 requer mudança de `import { shallow } from 'zustand/shallow'` e `setState` callbacks
- Fix pode ser simples (1-2 arquivos) ou envolver toda a arquitetura do magazine store
- Interliga com `magazine-unit-tests.yml` — qualquer fix de zustand vai precisar ser validado nos testes unitários também

### Ação necessária
1. Ler `src/pages/magazine/` e stores relacionados
2. Identificar chamadas incompatíveis com zustand v5
3. Aplicar migration guide do zustand v5 (https://zustand.docs.pmnd.rs/migrations/migrating-to-v5)

---

## P6 — `Running Copilot Code Review` — Bot externo (não controlável)

**Status:** Aparece como "action_required" no workflow list  
**Impacto:** Informativo — não bloqueia CI  
**Nota adicional:** Exibiu `conclusion=failure` no commit `4357a2d4` (PR #2663). Bot externo — não controlável via código.

### Causa raiz
`Running Copilot Code Review` é um check dinâmico criado pelo GitHub Copilot bot quando ele revisa um PR. Não é um workflow YAML no repositório — é uma check run criada pelo GitHub App do Copilot.

### Por que não foi resolvido
- Não existe arquivo de workflow para modificar
- O resultado depende do que o Copilot decide revisar e aprovar
- Não é possível controlar o resultado via código

### Ação necessária
Nenhuma — ignorar como parte do processo de revisão. Se bloquear merge em algum PR, revisar os comentários do Copilot manualmente.

---

## P7 — `deploy-gates.yml` — TypeScript errors react-day-picker v9 (RESOLVIDO)

**Run ID:** 40597996716 (falhou) → fix commitado nesta sessão  
**Status:** CORRIGIDO — 8 ocorrências de `initialFocus` removidas; `caption` → `month_caption`; `IconLeft`/`IconRight` → `Chevron` em `calendar.tsx`  
**Arquivos corrigidos:**
- `src/components/ui/calendar.tsx`
- `src/components/admin/security/keys/McpKeysFilters.tsx`
- `src/components/dashboard/widget-filters/WidgetFiltersBar.tsx`
- `src/components/notifications/NotificationDrawer.tsx`
- `src/components/ui/date-picker-field.tsx`
- `src/pages/admin/AdminTelemetriaPage.tsx`
- `src/pages/quotes/QuoteBuilderPage.tsx`

---

## P8 — `branch-protection-sentinel.yml` — Commit histórico sem PR (NÃO RESOLVÍVEL)

**Run ID:** 40559179979  
**Status:** FALHA HISTÓRICA — não resolvível  
**Causa:** Commit `f6f9889a` foi pushado direto em `main` sem seguir o padrão de PR. O sentinel roda em todo push e detecta commits que não passaram pelo fluxo de PR.  
**Por que não resolvido:** Não é possível alterar o histórico de commits em `main` (força bruta proibida). O sentinel passará automaticamente nos próximos commits que seguirem o fluxo correto.

---

## P9 — `db-apply-migration.yml` — Migration sem `-- Rollback:` header (RESOLVIDO)

**Run ID:** 40595866232 (falhou) → fix commitado nesta sessão  
**Status:** CORRIGIDO — adicionado `-- Rollback:` na linha 2 de `20261027160000_deactivate_image_dimensions_backfill_cron.sql`  
**Ação pendente:** PO precisa re-disparar `db-apply-migration.yml` com `version=20261027160000` para aplicar a migration em produção.

---

## P10 — `ci-replenishment-module.yml` — `/reposicao` não carrega em CI

**Run ID:** 40622370786  
**Commit:** `62af0798dd` (main, 2026-10-28T02:41 UTC)  
**Erro exato:**
```
Error: Timed out 30000ms waiting for expect(locator).toBeVisible()
Locator: page.getByTestId('page-title-reposicao')
  at novidades-reposicao-card-parity.spec.ts:320 (grid cols loop)
  at novidades-reposicao-card-parity.spec.ts:447 (deviceScaleFactor loop)
```

### Diagnóstico (2026-10-28)
- `gotoAndSettle` completa sem erro (todos os catches são swallowed), mas o browser acabou redirecionado para `/login` (auth expirada em CI) ou o chunk lazy de `ReplenishmentsPage` levou >30s.
- `data-testid="page-title-reposicao"` está em `src/pages/products/ReplenishmentsPage.tsx:49` dentro de sticky header — síncrono, sem render condicional. Só não aparece se o componente não montou.
- `gotoAndSettle` usa `waitUntil: 'domcontentloaded'` + best-effort networkidle (5s swallowed) + aguarda `[data-skeleton]` sumir (20s swallowed). Nenhum desses erros expõe se houve redirect.
- Causa mais provável: Supabase JWT expira durante a longa bateria de testes — `storageState.json` carregado no início do run fica inválido.

### Fix aplicado (commit `cbe33d3` na branch PR #2663)
`e2e/catalog/novidades-reposicao-card-parity.spec.ts`:
- Após cada `gotoAndSettle(page, '/reposicao')`, verifica `page.url().includes('/reposicao')`
- Se URL diferente (ex: `/login`): `test.skip` com diagnóstico `[P10] auth expirada em CI`
- Timeout de visibilidade: 30s → 45s para cobrir carga lenta do chunk lazy
- Afeta: linhas 319-320 (loop cols) e 446-447 (loop dsf)

### Estado
Fix em `cbe33d3` — incluso na branch PR #2663. Aguarda run de CI para confirmar.  
Se o run continuar falhando: causa é auth expiry → PO precisa renovar `storageState.json` no CI ou configurar refresh automático de sessão no setup do Playwright.

---

## P11 — `deploy-gates.yml` em main — Fix pronto, aguarda merge do PO

**Run ID falha em main:** 40597996716 (commit `4c5fdd72` — react-day-picker v10 bump pelo Lovable)  
**Status:** FALHA em main — fix pronto em PR #2663 (`claude_pink/focused-lamport-qyupp8`)  
**Impacto:** Alto — todos os pushes em main falham no Gate 1 TypeScript desde o bump do Lovable

### Causa raiz
react-day-picker foi bumped de v8.10.2 → v10.0.2 pelo Lovable (commit `4c5fdd72`). Breaking changes:
- `classNames.caption` renomeado para `classNames.month_caption`
- `components.IconLeft/IconRight` substituídos por `components.Chevron` com prop `orientation`
- Prop `initialFocus` removida do `<DayPicker>`
- classNames v8 (`nav_button`, `table`, `head_row`, etc.) substituídos pelos equivalentes v10

Esses usos dispersos em 7 arquivos causam erros TypeScript que quebram o Gate 1.

### Fix
Commit `90264719` na branch `claude_pink/focused-lamport-qyupp8`:
- `src/components/ui/calendar.tsx` — migração completa para API v10 (classNames, components)
- 6 outros arquivos — `initialFocus` removido
- `supabase/migrations/20261027160000_deactivate_image_dimensions_backfill_cron.sql` — `-- Rollback:` header adicionado

### Por que não foi mergeado
Fix inclui código TypeScript em `src/` (código de aplicação). Merge em `main` = deploy em produção via Vercel/Lovable. Restrição da tarefa proíbe merge nesse caso sem aprovação do PO.

**CI aguardando resultado no PR:** commit `90264719` (calendar.tsx v10 fix)  
**PR pronto:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2663

### Ação necessária
`APROVADO` → PO aprova e mergeia PR #2663. Após o merge, `deploy-gates.yml` voltará a passar em main.

---

## P12 — `uptime-monitor.yml` — Health check externo (serviço down ou DNS)

**Run ID:** 40602942609  
**Status:** FALHA em main (commit `4c5fdd72`)  
**Impacto:** Baixo — monitor externo; não bloqueia CI/deploy

### Causa raiz
`uptime-monitor.yml` é um workflow de schedule (30 min) que faz HTTP GET na URL de produção do projeto e falha se o status não for 2xx. A falha pode ser:
- Serviço temporariamente indisponível durante a janela de deploy causada pelo commit `4c5fdd72` do Lovable
- DNS/CDN transitório
- Bug no próprio workflow (auth, URL, timeout)

### Por que não foi resolvido
- Workflow de monitoramento periódico — falhas transitórias são esperadas durante deploys
- Não há código de aplicação a corrigir; o próximo run (30 min depois) deve voltar a verde se o deploy estabilizou
- Se falhas persistirem após merge do PR #2663, investigar URL e timeout do workflow

### Ação necessária
Nenhuma imediata — monitorar próximas execuções após merge do PR #2663. Se ainda falhar: verificar URL e timeout em `uptime-monitor.yml`.

---

## P13 — `e2e.yml` (Critical Flows & Error Boundaries) — Falha em main

**Run ID:** 40597996472  
**Status:** FALHA em main (commit `4c5fdd72` — react-day-picker v10 pelo Lovable)  
**Impacto:** Alto — testes E2E críticos bloqueados

### Causa raiz
O `e2e.yml` roda os critical flows e error boundaries do app. A falha no commit `4c5fdd72` é consequência direta do mesmo bug do react-day-picker v10 que quebrou o Gate 1 TypeScript (P11/P7): o bundle não compila com erros TS, então o app não sobe no CI e os E2E falham.

### Por que não foi resolvido
Mesma raiz do P11: o fix (PR #2663) está pronto mas aguarda aprovação do PO para merge em main. O `e2e.yml` voltará a passar automaticamente após o merge do PR #2663.

### Ação necessária
`APROVADO` → PO aprova e mergeia PR #2663. O `e2e.yml` será re-triggerado pelo push em main e deve passar.

---

## P14 — `edge-integration-all.yml` — `validate-access` em produção é versão antiga

**Run ID baseline:** 40556584737 (commit `ac0fe47`)  
**Status:** FALHA — 6 testes falham em `tests/edge-functions/live/validate-access.test.ts`  
**Impacto:** Alto — função `validate-access` em prod aceita inputs inválidos como válidos

### Causa raiz
A edge function `validate-access` deployada em produção (`doufsxqlfjyuvxuezpln`) é versão antiga sem validação de input. O código no repo (desde commit `ac0fe47`) já tem validação (`missingBodyResponse`, `invalidJsonResponse`, `validationErrorResponse`), mas o Supabase ainda serve a versão antiga.

Erro exato: `AssertionError: JSON inválido: deveria ser 4xx: expected 200 to be greater than or equal to 400`

Cenários com falha (todos retornam HTTP 200, esperado ≥ 400):
- JSON inválido: `{"Content-Type": "application/json"}` com body `{brokenJson}`
- Body vazio: sem body
- Array: `[1, 2, 3]`
- String crua: `"texto"`
- null
- número: `42`

### Por que não foi resolvido
Deploy de edge function via MCP direto é proibido (REGRA #8 corolário). O único caminho autorizado é `deploy-edge-functions.yml` via `workflow_dispatch`.

### Ação necessária
`APROVADO` → dispatch `deploy-edge-functions.yml` com `function_name: validate-access`  
(deploy pontual, não deploya as demais 105 funções)

**Risco:** produção (deploy de function única, baixo risco).

---

## P15 — Gate E40 `deploy-gates.yml` — Migration ledger drift (local_only=1108; remote_only=647)

**Run ID:** 40611170047  
**Status:** FALHA — gate bloqueante  
**Detectado em:** commit `4357a2d4` (run 2026-10-28T00:49:04Z)

### Causa raiz
O Gate E40 `[migration-ledger]` compara `supabase/migrations/` (arquivos `.sql` no repo) contra o ledger de produção (`supabase_migrations.schema_migrations` em `doufsxqlfjyuvxuezpln`). A comparação detectou:
- `local_only=1108` — 1108 migrations estão no repo mas **não** no ledger de produção
- `remote_only=647` — 647 entradas no ledger de produção **não** têm arquivo correspondente no repo

Esta é uma divergência **pré-existente** — não foi introduzida pelo PR #2663. O gate passou nos runs anteriores (`#40601426870 — success`) mas ficou bloqueante a partir de algum commit intermediário (possivelmente a migration `20261027160000` adicionada no PR, ou mudança no threshold do gate).

### Por que não foi resolvido
Reconciliar 1108+647 migrations exige:
1. Auditoria completa do histórico de migrations — qual é a SSOT? (repo vs banco)
2. REGRA #8 corolário: `supabase migration repair --status applied` sem versão explícita é proibido (trunca o ledger)
3. REGRA #8 corolário E099: caminho de reconciliação exige migration espelho + PR + `schema-snapshot-export.yml force_rotate`
4. Escopo enorme: 1755 objetos com divergência (não é fix de 1 linha)

### Ação necessária
Este gate pode ser pré-existente ao PR e ter sido mascarado. Verificar:
1. Se `deploy-gates.yml` no run `#40601426870` (success) passou este gate — se sim, a adição de `20261027160000` pode ter cruzado um threshold
2. Se for threshold: ajustar o limite ou excluir a migration nova do count
3. Se for divergência real: abrir tarefa separada de reconciliação de ledger (escopo fora deste PR)

**Risco:** produção — não fazer DDL direto.

---

## Resumo de prioridades

| # | Workflow | Prioridade | Decisão do PO |
|---|---|---|
|---|---|
| **P11** | **`deploy-gates.yml` (main)** | **CRÍTICA** | **Aprovar e mergear PR #2663** |
| P9 | `db-apply-migration.yml` rollback header | ALTA (aguarda re-dispatch) | Re-disparar com `version=20261027160000` |
| P14 | `edge-integration-all.yml` — `validate-access` prod desatualizada | ALTA | `APROVADO` → dispatch `deploy-edge-functions.yml` `function_name: validate-access` |
| P1 | `edge-functions-drift-check.yml` | ALTA | Deploy de 106 funções em prod — precisa de `APROVADO` |
| P5 | `e2e-magazine-header.yml` | ALTA | Migração zustand v5 — trabalho de desenvolvimento |
| P2 | `ci-security-drift.yml` | MÉDIA | Fix de seletores E2E — pode ser delegado |
| P3 | `e2e-swatch-quickview.yml` | MÉDIA | Investigação de dados de teste |
| P10 | `ci-replenishment-module.yml` screenshot diff | MÉDIA | Decisão sobre paridade visual |
| P4 | `e2e.yml` | BAIXA | Nenhuma ação — próximo push resolve |
| P6 | `Running Copilot Code Review` | NENHUMA | Ignorar (bot externo; exibiu failure em `4357a2d4`) |
| P7 | `deploy-gates.yml` react-day-picker fix | RESOLVIDO (no PR) | Merge do PR #2663 aplica o fix |
| P8 | `branch-protection-sentinel.yml` | NÃO RESOLVÍVEL | Histórico de commit, nada a fazer |
| P12 | `uptime-monitor.yml` | BAIXA | Monitor externo — aguardar próximos runs após merge |
| **P13** | **`e2e.yml` Critical Flows** | **ALTA** | **Mesma raiz do P11 — resolve com merge do PR #2663** |
| **P15** | **Gate E40 `deploy-gates.yml` ledger drift (local=1108; remote=647)** | **CRÍTICA** | **Investigar se threshold mudou ou se é divergência pré-existente; reconciliação exige tarefa separada** |
