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
Deploiar todas as 106 funções requer:
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
3. Aplicar migration guide do zustand v5

---

## P6 — `Running Copilot Code Review` — Bot externo (não controlável)

**Status:** Aparece como "action_required" no workflow list  
**Impacto:** Informativo — não bloqueia CI

### Causa raiz
`Running Copilot Code Review` é um check dinâmico criado pelo GitHub Copilot bot quando ele revisa um PR. Não é um workflow YAML no repositório — é uma check run criada pelo GitHub App do Copilot.

### Por que não foi resolvido
- Não existe arquivo de workflow para modificar
- O resultado depende do que o Copilot decide revisar e aprovar
- Não é possível controlar o resultado via código

### Ação necessária
Nenhuma — ignorar como parte do processo de revisão. Se bloquear merge em algum PR, revisar os comentários do Copilot manualmente.

---

## Resumo de prioridades

| # | Workflow | Prioridade | Decisão do PO |
|---|---|---|---|
| P1 | `edge-functions-drift-check.yml` | ALTA | Deploy de 106 funções em prod — precisa de `APROVADO` |
| P2 | `ci-security-drift.yml` | MÉDIA | Fix de seletores E2E — pode ser delegado |
| P3 | `e2e-swatch-quickview.yml` | MÉDIA | Investigação de dados de teste |
| P4 | `e2e.yml` | BAIXA | Nenhuma ação — próximo push resolve |
| P5 | `e2e-magazine-header.yml` | ALTA | Migração zustand v5 — trabalho de desenvolvimento |
| P6 | `Running Copilot Code Review` | NENHUMA | Ignorar |
