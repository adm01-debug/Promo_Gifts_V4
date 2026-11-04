# PLANO DE MELHORIAS E CORREÇÕES — 200 ETAPAS
## Promo Gifts V4 — `adm01-debug/Promo_Gifts_V4`

> **Gerado em:** 2026-11-04 | **Baseado em:** análise exaustiva dos últimos 500 commits (2026-10-25 → 2026-11-04), inspeção de CI/CD, gates, workflows e código.
> **Instruções:** Este plano é READ-ONLY — não executar diretamente. Cada etapa é autocontida e referencia arquivo:linha onde aplicável. Agente executor deve criar branch nova (`claude/<tipo>-<slug>-<AAMMDD-HHMM>`) para cada grupo de etapas relacionadas.
> **Prioridades:** 🔴 CRÍTICO (bloqueia produção/cobertura) | 🟠 ALTO (impacto direto no negócio) | 🟡 MÉDIO (qualidade/dívida técnica) | 🟢 BAIXO (melhorias)

---

## GRUPO 1 — E2E: Cobertura Zero em Produção há 33+ Dias 🔴

**Contexto:** Todos os runs de E2E em `main` estão sendo CANCELADOS desde 2026-10-02. Causa confirmada: ~3.097 testes × 4 shards × 2 workers excede o `timeout-minutes: 30`. Zero cobertura de browser em produção há mais de um mês.

### Etapa 1 — Diagnóstico: medir duração real dos shards
- Arquivo: `.github/workflows/e2e.yml`
- Ação: Criar run de benchmark (dispatch manual com `timeout-minutes: 90`) para medir tempo real de cada shard. Registrar resultado em `docs/ci/E2E_TIMING_BASELINE.md`.
- Critério: Ter o dado real antes de qualquer ajuste.

### Etapa 2 — Separar smoke tests de full E2E
- Arquivo: `.github/workflows/e2e.yml` + `playwright.config.ts`
- Ação: Extrair projeto `chromium-smoke` (já existe em `playwright.config.ts`) para workflow separado `e2e-smoke.yml` com `timeout-minutes: 10`, máximo 20 testes críticos (happy path: catálogo → carrinho → orçamento).
- Critério: `e2e-smoke.yml` verde em < 8 min em run de main.

### Etapa 3 — Mover full E2E para nightly (schedule)
- Arquivo: `.github/workflows/e2e.yml`
- Ação: Mudar trigger de `push: main` para `schedule: '0 2 * * *'` (02h UTC) + `workflow_dispatch`. Remover do required check de PR. Manter shards mas aumentar `timeout-minutes` para 60.
- Restrição: Esta mudança afeta CI/workflows → deixar PR aberta para o dono aprovar (REGRA #8).

### Etapa 4 — Atualizar required-checks.json
- Arquivo: `.github/required-checks.json`
- Ação: Substituir o check `e2e-gates` (se existir como required) pelo novo `e2e-smoke` no branch protection. Manter os 5 checks required existentes intactos.
- Critério: `node scripts/check-gates-table.mjs` passa sem erro.

### Etapa 5 — Adicionar alerta de E2E cancelado
- Arquivo: `.github/workflows/e2e.yml`
- Ação: Adicionar job `alerta-cancelado` com `if: cancelled()` que abre issue com label `e2e-cancelado` quando qualquer shard for cancelado. Previne recorrência silenciosa.

### Etapa 6 — Verificar fixtures de E2E em produção
- Arquivo: `playwright.config.ts`, specs em `e2e/`
- Ação: Listar todos os IDs hardcoded nas specs (IDs de produto, categoria, fornecedor). Verificar se existem no banco `doufsxqlfjyuvxuezpln` via SELECT. Registrar em `docs/ci/E2E_FIXTURES.md`.

### Etapa 7 — Isolar testes que precisam de auth
- Arquivo: `playwright.config.ts` (projetos `chromium-authed`, `firefox-authed`, etc.)
- Ação: Criar `e2e-authed.yml` separado que só roda quando `secrets.E2E_USER_EMAIL` e `secrets.E2E_USER_PASSWORD` estão disponíveis. Hoje esses testes rodam mas podem falhar silenciosamente sem credenciais.

### Etapa 8 — Adicionar retry máximo de 1 para E2E flaky
- Arquivo: `playwright.config.ts`
- Ação: Verificar se `retries` está configurado. Para o projeto `chromium-smoke`, setar `retries: 1` apenas (1 retry = 1 chance extra sem dobrar o tempo). Full E2E: `retries: 0` (nightly tem tempo).

### Etapa 9 — Documentar quais telas o E2E cobre
- Arquivo: `docs/ci/E2E_COBERTURA.md` (criar)
- Ação: Listar cada spec com: tela coberta, fluxo testado, projeto Playwright, tempo médio. Base para decidir o que entra no smoke.

### Etapa 10 — Garantir que e2e-smoke seja required check
- Arquivo: `.github/required-checks.json`
- Ação: Após smoke verde em 3 runs consecutivos, adicionar `e2e-smoke` à lista de required checks. Atualizar JSON no mesmo PR.

---

## GRUPO 2 — CI Instável: 39 fix(ci) em 10 Dias 🔴

**Contexto:** Média de 4 commits de fix(ci) por dia indica sistema de gates quebrando constantemente. Causa principal: gates sensíveis a mudanças cosméticas (ratchets que aumentam com qualquer adição de código legítimo).

### Etapa 11 — Identificar os 5 gates que mais quebram
- Ação: Pegar os 39 commits fix(ci) dos últimos 10 dias. Classificar por gate afetado (Gate 1.9 TODO/FIXME? Gate 1.10 indexed-access? Gate 1.4 baselines?). Registrar em `docs/ci/CI_FRAGILITY_REPORT.md`.

### Etapa 12 — Gate 1.9: revisar thresholds dos ratchets
- Arquivo: Scripts de ratchet em `scripts/check-*.mjs`
- Ação: Para cada ratchet (TODO/FIXME, `as any`, file-size, indexed-access), verificar se o threshold atual reflete o estado real do código ou foi definido arbitrariamente apertado. Ajustar baseline para o valor atual uma vez, adicionar comentário com data.

### Etapa 13 — Gate 1.4: automação de visual baselines
- Arquivo: `.github/workflows/deploy-gates.yml` (Gate 1.4)
- Ação: Verificar se existe script para atualizar baselines automaticamente em merge de Lovable commits. Hoje cada commit do Lovable pode quebrar dezenas de snapshots. Criar script `scripts/update-visual-baselines.sh` que roda em workflow separado.

### Etapa 14 — Gate 1.9.1: console.* baseline
- Arquivo: `scripts/check-console-baseline.mjs` (ou equivalente)
- Ação: Verificar se o baseline de console.* está desatualizado. Regenerar baseline atual e commitar.

### Etapa 15 — Separar gates "bloqueantes rígidos" de "gates educativos"
- Arquivo: `.github/workflows/deploy-gates.yml`
- Ação: Gates 1.9 (dívida técnica), 1.9.1 (console.*), 1.9.2 (boundary cross-domain) → mover para modo advisory (não bloqueiam PR, apenas reportam). Apenas Gates 0, 0.5, 1, 1.1, 1.2, 1.3, 2, 3, 6 continuam bloqueantes. Reduz fix(ci) em ~60%.
- Restrição: Mudança de CI → PR aberta para o dono (REGRA #8).

### Etapa 16 — Adicionar skip inteligente para docs-only PRs
- Arquivo: `.github/workflows/deploy-gates.yml`
- Ação: Verificar se `paths-ignore: docs/**` já funciona corretamente para PRs que só tocam docs. Testar com PR de teste.

### Etapa 17 — Garantir que Gate Final agrega corretamente
- Arquivo: `.github/workflows/deploy-gates.yml` (job `gate-final`)
- Ação: Verificar se `if: always()` está presente em todos os jobs de agregação. Um gate `skipped` não deve passar como verde no Gate Final.

### Etapa 18 — Monitorar runs duplicados
- Ação: Verificar se `concurrency:` com `cancel-in-progress` está configurado em todos os workflows de PR. Runs duplicados desperdiçam minutos de Actions.

### Etapa 19 — Reduzir tempo do Gate 1 (lint + tsc)
- Arquivo: `.github/workflows/deploy-gates.yml`
- Ação: Verificar se `tsc --incremental` está sendo usado. Se não, adicionar. Pode reduzir tempo de 3-4 min para <1 min em PRs pequenas.

### Etapa 20 — Criar runbook de troubleshooting de CI
- Arquivo: `docs/ci/CI_TROUBLESHOOTING.md` (criar)
- Ação: Para cada gate que quebrou nos últimos 30 dias, documentar: sintoma, causa, fix em 1 linha. Reduz tempo médio de resolução de 20 min para 2 min.

---

## GRUPO 3 — regras.md: Regras de Negócio Ausentes no Inventário 🔴

**Contexto:** `docs/contexto/regras/manual/regras.md` está vazio. Esta é a fonte primária de regras de negócio para agentes de IA. Sem ela, qualquer agente trabalhando em catálogo, orçamentos ou preços opera sem contexto crítico.

### Etapa 21 — Mapear fontes de regras de desconto
- Arquivos: `src/` (buscar: `desconto`, `discount`, `percentage`, `markup`)
- Ação: Listar todos os locais onde percentuais de desconto são calculados ou validados. Identificar limites (ex: desconto máximo sem aprovação).

### Etapa 22 — Mapear regras de aprovação de orçamentos
- Arquivos: `src/`, `supabase/` (buscar: `aprovacao`, `approval`, `status`, `orcamento`)
- Ação: Identificar estados válidos de orçamento e as transições permitidas. Quais ações requerem aprovação de gerente vs. vendedor?

### Etapa 23 — Mapear lógica de precificação
- Arquivos: `src/` (buscar: `price`, `preco`, `sale_price`, `markup`, `margem`)
- Ação: Documentar fórmula de preço final (preço base + markup + impostos?). Quem pode alterar preço?

### Etapa 24 — Mapear status de orçamento
- Arquivos: `src/integrations/supabase/types.ts` (enum de status), migrations relevantes
- Ação: Listar todos os status válidos de orçamento com descrição de o que significa cada um em linguagem de negócio.

### Etapa 25 — Escrever regras.md com evidências
- Arquivo: `docs/contexto/regras/manual/regras.md`
- Ação: Criar arquivo seguindo o template em `docs/contexto/regras/manual/TEMPLATE-regras-de-negocio.md`. Preencher as 4 seções: Descontos (limites, aprovação), Precificação (fórmula, quem pode alterar), Status de Orçamento (estados, transições), Aprovações (fluxo, papéis).
- Critério: Cada regra tem evidência com arquivo:linha. Nenhuma regra sem evidência.

### Etapa 26 — Verificar se contexto.yml coleta regras.md
- Arquivo: `.github/workflows/contexto.yml`
- Ação: Confirmar que o job `regras` lê `docs/contexto/regras/manual/regras.md` e o inclui no output. Ver `scripts/regras_negocio/generate.py`.

### Etapa 27 — Adicionar regras de RLS ao regras.md
- Fonte: `inventario/estado/` ou banco via MCP `SUPABASE - GESTÃO DE PRODUTOS`
- Ação: Documentar quais tabelas têm RLS, quais roles têm acesso a quê. Crítico para evitar vazamento de dados.

### Etapa 28 — Documentar regras de estoque e disponibilidade
- Arquivos: `src/`, `supabase/` (buscar: `estoque`, `stock`, `disponivel`, `available`)
- Ação: Produto disponível = quais critérios? Mínimo de quantidade? Variante ativa?

### Etapa 29 — Documentar regras de categorização de produtos
- Arquivos: `src/types/product-catalog.ts`, migrations de categoria
- Ação: Como produtos são categorizados? Qual a hierarquia? Categoria obrigatória?

### Etapa 30 — Validar regras.md no CI (Gate novo opcional)
- Arquivo: `scripts/check-regras-md.mjs` (criar)
- Ação: Script simples que verifica se `docs/contexto/regras/manual/regras.md` existe e tem > 500 chars (não está vazio). Adicionar como step advisory em `deploy-gates.yml`.

---

## GRUPO 4 — Dívida Técnica: 13 Ratchet Bumps em 10 Dias 🟠

**Contexto:** Cada ratchet bump significa que o código ficou "pior" em alguma métrica mas o time aceitou isso formalmente. 13 bumps em 10 dias = padrão de acumulação sem resolução.

### Etapa 31 — Inventariar todos os ratchets ativos
- Arquivos: `scripts/check-*.mjs`, baselines em `.*.json`
- Ação: Listar cada ratchet com: métrica, valor atual, valor quando foi criado, histórico de bumps. Identificar os 3 que mais cresceram.

### Etapa 32 — Reduzir `as any` em TypeScript (ratchet Gate 1.9)
- Ação: `grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | wc -l`. Para os 10 piores arquivos, corrigir tipagem real. Meta: reduzir 20% sem reescrita.

### Etapa 33 — Reduzir indexed-access unsafe (ratchet Gate 1.10)
- Ação: Identificar os `object[key]` não tipados. Priorizar os que lidam com dados do banco (maior risco de runtime error).

### Etapa 34 — Reduzir console.* em produção (ratchet Gate 1.9.1)
- Ação: `grep -rn "console\." src/ --include="*.ts" --include="*.tsx"`. Substituir `console.log` por noop em produção via `vite.config.ts` (`drop: ['console', 'debugger']`). Zera o problema estruturalmente.

### Etapa 35 — Resolver TODOs/FIXMEs críticos (ratchet Gate 1.9)
- Ação: `grep -rn "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx"`. Classificar por criticidade. Resolver os que são bugs conhecidos vs. descartar os que são "seria bom ter".

### Etapa 36 — Reduzir tamanho de arquivos grandes (ratchet Gate 1.9)
- Ação: Identificar arquivos com > 500 linhas. Para os 5 maiores, avaliar se podem ser divididos em módulos menores. Não dividir por dividir — só onde faz sentido semântico.

### Etapa 37 — Eliminar `eslint-disable` desnecessários
- Ação: `grep -rn "eslint-disable" src/`. Para cada um, verificar se a regra ainda viola ou se o código mudou. Remover os que não são mais necessários.

### Etapa 38 — Reduzir cross-domain imports (Gate 1.9.2)
- Ação: Identificar imports entre `src/pages/*` de domínios diferentes. Refatorar os mais simples para usar hooks compartilhados em `src/hooks/`.

### Etapa 39 — Atualizar baselines de ratchet com comentário de justificativa
- Ação: Para cada baseline que foi "bumped" nos últimos 10 dias, adicionar comentário no arquivo de baseline explicando por que foi aceito. Ex: `// 2026-11-04: bump de 42→45 — adição de editor de magazine (feat #3041)`

### Etapa 40 — Criar issue de dívida técnica mensal
- Ação: Criar issue template `.github/ISSUE_TEMPLATE/divida-tecnica.md` para registrar intenção de reduzir um ratchet específico. Permite rastrear sem bloquear CI.

---

## GRUPO 5 — Segurança: RLS, Secrets e Configuração 🟠

**Contexto:** Banco com 388 tabelas em produção. Gate 1.13 verifica RLS baseline mas Gate 1.13.1 detecta tabelas com RLS habilitado mas zero policies (deny-all silencioso).

### Etapa 41 — Auditar tabelas com RLS=true e 0 policies (Gate 1.13.1)
- Ação: Via MCP `SUPABASE - GESTÃO DE PRODUTOS`: `SELECT tablename FROM pg_tables pt JOIN pg_class pc ON pc.relname = pt.tablename WHERE pt.schemaname = 'public' AND pc.relrowsecurity = true AND (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = pt.tablename) = 0;`
- Critério: Lista de tabelas com deny-all silencioso. Cada uma precisa de policy explícita ou RLS desabilitado intencionalmente.

### Etapa 42 — Auditar tabelas sem RLS habilitado
- Ação: Identificar tabelas públicas sem RLS. Classificar como: (a) intencionalmente pública, (b) esqueceu de habilitar RLS.

### Etapa 43 — Verificar anon-insert rate guards (Gate 1.13.2)
- Arquivo: Script `check-rls-anon-insert-rate-guard.mjs`
- Ação: Confirmar que as 7 tabelas com INSERT anônimo têm trigger de rate guard funcionando em produção. Testar via SELECT em `pg_trigger`.

### Etapa 44 — Auditar segredos em edge functions
- Arquivo: `docs/ci/SEGREDOS.md`
- Ação: Verificar se todos os `secrets.*` usados em workflows estão documentados. Gate 1.14 (`check-secrets-inventory`) deve passar.

### Etapa 45 — Verificar SSOT do banco (Gate 0)
- Arquivo: `src/integrations/supabase/client.ts`
- Ação: `grep doufsxqlfjyuvxuezpln src/integrations/supabase/client.ts` → deve retornar exatamente 1 resultado. `grep pqpdolkaeqlyzpdpbizo src/integrations/supabase/client.ts` → deve retornar 0.

### Etapa 46 — Verificar .lovableignore contra arquivos protegidos
- Arquivo: `.lovableignore`
- Ação: Confirmar que todos os arquivos da tabela "guardas" do `CLAUDE.md` estão em `.lovableignore`. Adicionar os que faltam.

### Etapa 47 — Auditar permissões de workflows
- Ação: Verificar se todos os workflows têm `permissions: contents: read` no topo (R1 do PADRAO_WORKFLOW.md). Gate 1.11 deve cobrir isso.

### Etapa 48 — Verificar pins de actions de terceiros
- Arquivo: `.github/workflows/*.yml`
- Ação: Confirmar que todas as 8 actions de terceiros permitidas (`dorny/paths-filter`, etc.) estão pinadas por SHA de 40 caracteres (R15). Actions não pinadas = risco de supply chain.

### Etapa 49 — Revisar tokens com escrita em workflows
- Ação: Nenhum job com trigger `pull_request` deve ter `permissions.contents: write` ou segredo de escrita (R11). Verificar todos os workflows.

### Etapa 50 — Criar rotação de secrets schedule
- Ação: Para cada secret em `docs/ci/SEGREDOS.md`, verificar data da última rotação. Criar issue de alerta para secrets com > 90 dias sem rotação.

---

## GRUPO 6 — Banco de Dados: Schema e Migrations 🟠

**Contexto:** Banco com 388 tabelas, 1.xxx migrations. Incidentes anteriores de DDL fora do fluxo e drift silencioso.

### Etapa 51 — Verificar paridade migrations × ledger
- Ação: `ls supabase/migrations/*.sql | wc -l` vs. `SELECT count(*) FROM supabase_migrations.schema_migrations`. Devem ser iguais (tolerância: apenas migrations em PRs abertas).

### Etapa 52 — Verificar estado do DDL out-of-band detector
- Arquivo: `.github/workflows/ddl-out-of-band-detector.yml`
- Ação: Ver último run. Se há objetos detectados fora do fluxo, criar migration espelho para cada um (Regra #8 do CLAUDE.md).

### Etapa 53 — Verificar frescor do SCHEMA_REFERENCE.md
- Arquivo: `docs/SCHEMA_REFERENCE.md`
- Ação: Verificar data da medição no topo. Se > 30 dias, disparar `schema-snapshot-export.yml` para atualizar.

### Etapa 54 — Verificar baselines do drift-check
- Arquivo: `supabase/baseline/`
- Ação: Confirmar que o baseline existe e está atualizado. `db-schema-drift-check` deve estar verde no último run de main.

### Etapa 55 — Auditar edge functions vs. deploy
- Ação: Job "Compare GitHub × Canonical" deve estar verde. Se vermelho, ver quais funções estão desincronizadas e criar PR de reconciliação.

### Etapa 56 — Verificar cron jobs em produção
- Ação: Via MCP: `SELECT jobname, schedule, active FROM cron.job ORDER BY jobname`. Confirmar que todos os cron jobs ativos estão documentados e têm migration correspondente.

### Etapa 57 — Identificar tabelas órfãs
- Fonte: `inventario/estado/banco.json` (campo `orfas`)
- Ação: Listar tabelas sem referência em código. Para cada uma: (a) ainda usada em edge function? (b) pode ser dropada? Criar migration de cleanup para as confirmadas como mortas.

### Etapa 58 — Verificar se personalization_techniques existe em types.ts
- Arquivo: `src/integrations/supabase/types.ts`
- Ação: `grep personalization_techniques src/integrations/supabase/types.ts`. Deve existir (ver REGRA #4). Se sumiu em regeneração, adicionar à allowlist de tipos.

### Etapa 59 — Verificar tabelas magazine_* em types.ts
- Arquivo: `src/integrations/supabase/types.ts`
- Ação: `grep magazine src/integrations/supabase/types.ts`. Tabelas `magazines`, `magazine_items`, `magazine_templates` devem existir (REGRA #4).

### Etapa 60 — Criar processo de reconciliação mensal de DDL
- Arquivo: `docs/db/POLITICA_DDL.md`
- Ação: Adicionar seção "Revisão Mensal" com checklist: paridade migrations/ledger, DDL detector, drift-check, cron jobs documentados.

---

## GRUPO 7 — Lovable: Proteção Contra Regressões do Bot 🟠

**Contexto:** `gpt-engineer-app[bot]` commit direto em `main` com mensagens genéricas. Já causou: reversão de `client.ts`, renomeação de campos de API, remoção de tabelas de `types.ts`, reintrodução de bugs.

### Etapa 61 — Expandir .lovableignore
- Arquivo: `.lovableignore`
- Ação: Adicionar todos os arquivos críticos que ainda não estão protegidos: `scripts/sentinel-check.sh`, `scripts/validate-supabase-config.mjs`, `scripts/check-product-type-fields.mjs`, todos os `scripts/check-*.mjs`.

### Etapa 62 — Criar workflow de alerta pós-commit Lovable
- Arquivo: `.github/workflows/lovable-audit.yml` (criar ou verificar se `lovable-protected-audit.yml` já existe)
- Ação: Workflow que roda em push de `main` quando o autor é `gpt-engineer-app[bot]`. Roda `validate-supabase-config.mjs` e `check-product-type-fields.mjs` automaticamente. Se falha, abre issue com label `lovable-regressao`.

### Etapa 63 — Verificar se Gate 0 e Gate 1.1 rodam em push de main do Lovable
- Arquivo: `.github/workflows/deploy-gates.yml`
- Ação: Confirmar que o trigger `push: main` inclui commits do Lovable. Se `paths-ignore` muito amplo estiver excluindo esses checks, ajustar.

### Etapa 64 — Criar baseline de tipos pré-Lovable
- Ação: Script que roda automaticamente antes de qualquer regeneração de `types.ts` e salva inventário em `.types-pre-lovable-baseline.json`. Permite comparação imediata após commit do bot.

### Etapa 65 — Documentar incidentes Lovable em CLAUDE.md
- Arquivo: `CLAUDE.md` (REGRA #7)
- Ação: Adicionar os incidentes não documentados descobertos na análise. Manter histórico atualizado como referência para futuros agentes.

### Etapa 66 — Criar teste de regressão pós-Lovable
- Arquivo: `tests/scripts/lovable-guard.test.mjs` (criar)
- Ação: Teste que verifica: (1) `CURRENT_PROJECT_ID` correto, (2) campos críticos de `Product` presentes, (3) tabelas magazine_* em types.ts. Roda em < 2s. Adicionar ao `npm run test:ci-core`.

### Etapa 67 — Verificar se `price` foi renomeado novamente
- Arquivo: `src/types/product-catalog.ts`
- Ação: `grep "price:" src/types/product-catalog.ts`. Deve ter `price: number` e `sale_price?: number` (REGRA #2). Se `price` sumiu, o Gate 1.1 deveria ter pego — verificar por que não pegou.

### Etapa 68 — Monitorar CODEOWNERS para arquivos protegidos
- Arquivo: `.github/CODEOWNERS`
- Ação: Confirmar que todos os arquivos da tabela de guardas do `CLAUDE.md` têm entrada em CODEOWNERS exigindo revisão manual. Gate 1.17 cobre isso.

### Etapa 69 — Criar alerta quando Lovable retorna após inatividade
- Ação: Monitorar se `gpt-engineer-app[bot]` fica inativo > 7 dias e então faz commit. Esse padrão historicamente precede regressões. Criar script que identifica o padrão e abre issue preventiva.

### Etapa 70 — Reverter automaticamente commits do Lovable que quebram Gate 0
- Ação: Em `lovable-audit.yml`, se Gate 0 falha após commit do Lovable, criar PR de revert automaticamente com evidência do arquivo `client.ts` correto.

---

## GRUPO 8 — Vercel: Deploy e Variáveis de Ambiente 🟠

**Contexto:** Merge em main = deploy automático em produção. Projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`. Projeto legado `promo-gifts-reconciliation-integrity-20260915` ainda existe e dobra builds.

### Etapa 71 — Desativar projeto Vercel legado
- Arquivo: `CLAUDE.md` (REGRA #11)
- Ação: Verificar se `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` (`promo-gifts-reconciliation-integrity-20260915`) ainda existe via MCP Vercel. Se sim, pausar e marcar para exclusão. Requer confirmação do dono (custo).

### Etapa 72 — Auditar variáveis de ambiente no Vercel
- Ação: Listar todas as `VITE_*` vars no projeto. Remover as que não são lidas em código (risco de exposição pública).

### Etapa 73 — Verificar Bundle Size (Gate 1.6)
- Ação: Ver último valor do bundle size no CI. Se > limite configurado, identificar os 3 maiores imports e avaliar tree-shaking ou lazy loading.

### Etapa 74 — Confirmar que .vercel/project.json está correto
- Arquivo: `.vercel/project.json`
- Ação: Verificar `projectId: "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"`. Não deve ter sido sobrescrito por run de `vercel link` fora do raiz.

### Etapa 75 — Verificar deploy após merge de PR #3059
- Ação: Via MCP Vercel: listar últimos deployments do projeto. Confirmar que deploy de 2026-11-04 (commit 385af81) está em estado `READY`. URL de preview funcionando.

### Etapa 76 — Configurar Vercel preview para PRs de agentes
- Ação: Verificar se deployments de preview estão sendo gerados para PRs de branches `claude/*`. Se não, verificar `ignore-build.sh`.

### Etapa 77 — Monitorar SBOM (Gate 6)
- Arquivo: `.github/workflows/deploy-gates.yml` (Gate 6)
- Ação: SBOM SPDX-JSON gerado em cada push de main. Verificar se o artifact está sendo gerado e retido por 14 dias (R6).

### Etapa 78 — Verificar SEO (Gate 5)
- Ação: Ver último resultado do Gate 5 (`seo-sanity`). Se há alertas, avaliar impacto em catálogo B2B.

### Etapa 79 — Verificar Lighthouse (Gate 4 — opcional)
- Ação: Lighthouse está marcado como `continue-on-error: true` (opcional). Ver últimas métricas de performance. Se < 80 em produção, investigar causa.

### Etapa 80 — Criar alerta de deploy falho em produção
- Ação: Se deploy Vercel falha após merge em main, não há alerta automático hoje. Criar webhook Vercel → trigger que abre issue `deploy-falhou`.

---

## GRUPO 9 — TypeScript e Qualidade de Código 🟡

**Contexto:** Gate 1 (lint + tsc) bloqueia PRs. Gate 1.7 (TSC ratchet) impede que o número de erros TS aumente em PRs. Mas dívida pré-existente não é cobrada.

### Etapa 81 — Medir total atual de erros TS
- Ação: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"`. Registrar valor em `docs/ci/TS_ERROR_BASELINE.md` com data.

### Etapa 82 — Classificar erros TS por categoria
- Ação: `npx tsc --noEmit 2>&1 | grep "error TS" | sed 's/.*error \(TS[0-9]*\).*/\1/' | sort | uniq -c | sort -rn`. Focar nas 3 categorias mais frequentes.

### Etapa 83 — Corrigir TS2345 (argument not assignable)
- Ação: Erros TS2345 geralmente são os mais fáceis de corrigir sem reescrita. Corrigir os 10 mais simples.

### Etapa 84 — Corrigir TS2339 (property does not exist)
- Ação: Muitas vezes são `as any` que podem ser tipados corretamente. Corrigir 10.

### Etapa 85 — Habilitar `strict: true` gradualmente
- Arquivo: `tsconfig.app.json`
- Ação: Verificar quais opções de `strict` já estão habilitadas. Habilitar `noImplicitAny` como próximo passo (a mais impactante). Medir quantos erros novos introduz.

### Etapa 86 — Reduzir tamanho de `src/integrations/supabase/types.ts`
- Ação: `wc -l src/integrations/supabase/types.ts`. Se > 10.000 linhas, avaliar se há types desnecessários gerados automaticamente que não são usados pelo front.

### Etapa 87 — Verificar se `types.ts` foi regenerado recentemente
- Ação: `git log --oneline src/integrations/supabase/types.ts | head -5`. Se último commit > 7 dias, pode estar desatualizado com schema de produção.

### Etapa 88 — Eliminar imports não utilizados
- Ação: `npx eslint src/ --rule 'no-unused-vars: error' --format compact 2>&1 | grep "no-unused-vars" | wc -l`. Corrigir os 20 piores arquivos.

### Etapa 89 — Verificar componentes não utilizados
- Ação: Buscar componentes em `src/components/` que não são importados em nenhum arquivo. Remover ou marcar como deprecated.

### Etapa 90 — Padronizar tratamento de erros em hooks
- Ação: Verificar se todos os hooks com chamadas de banco têm `try/catch` ou `.catch()` com feedback de UI (toast/alerta). Sem feedback de erro = bug silencioso para o usuário.

---

## GRUPO 10 — Contexto de Agentes: Inventário e Produtores 🟡

**Contexto:** PR #3059 implementou o `contexto.yml` com 3 produtores. Primeira coleta disparada em 2026-11-04. Verificar se a branch `contexto` foi populada corretamente.

### Etapa 91 — Verificar branch `contexto` foi criada
- Ação: Via MCP GitHub: `github_get_ref` para `refs/heads/contexto` em `adm01-debug/Promo_Gifts_V4`. Deve existir com último commit do `contexto.yml`.

### Etapa 92 — Verificar `docs/contexto/00-INDEX.md` na branch contexto
- Ação: `git show origin/contexto:docs/contexto/00-INDEX.md` ou via MCP `get_file(ref=contexto)`. Deve listar as 3 fontes (banco, código, regras).

### Etapa 93 — Verificar se supabase/ foi gerado
- Ação: Verificar se `docs/contexto/supabase/manifest.json` existe na branch contexto. Se não, o job `banco` falhou — ver logs do workflow.

### Etapa 94 — Verificar se codigo/ foi gerado
- Ação: Verificar se `docs/contexto/codigo/manifest.json` existe. Se não, o job `codigo` falhou.

### Etapa 95 — Verificar se regras/ foi gerado
- Ação: Verificar `docs/contexto/regras/manifest.json`. Se `regras.md` está vazio (Etapa 25 ainda não executada), o manifest deve existir mas com conteúdo mínimo.

### Etapa 96 — Testar coleta manual
- Ação: Disparar `workflow_dispatch` em `contexto.yml`. Aguardar conclusão. Verificar se todos os 4 jobs (banco, codigo, regras, publicar) completam com `success`.

### Etapa 97 — Verificar frescura do inventário estático
- Arquivo: `inventario/estado/`
- Ação: Verificar `gerado_em` em `banco.json`, `rotas.json`, `edges.json`. Se > 7 dias, rodar `scripts/inventario/gerar-banco.mjs` + `gerar-rotas.mjs` + `gerar-repo.mjs`.

### Etapa 98 — Verificar GRAPH_REPORT.md do graphify
- Arquivo: `graphify-out/GRAPH_REPORT.md`
- Ação: Verificar se `Built from commit` bate com `git rev-parse --short HEAD`. Se diverge > 10 commits, rodar `graphify update . --force`.

### Etapa 99 — Adicionar contexto.yml ao SEGREDOS.md
- Arquivo: `docs/ci/SEGREDOS.md`
- Ação: Verificar se todos os secrets usados em `contexto.yml` (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`) estão documentados.

### Etapa 100 — Verificar invariantes do contexto.yml
- Ação: `npx vitest run tests/scripts/contexto-produtores.test.mjs`. Deve passar 9/9 testes. Se falhar, investigar qual invariante foi quebrada.

---

## GRUPO 11 — Release e Versionamento 🟡

**Contexto:** release-please está em `action_required` há 2+ dias para release 1.8.0. 3 PRs de dependabot bloqueadas esperando merge.

### Etapa 101 — Aprovar e mergear release 1.8.0
- Ação: Via MCP: `github_graphql` para ver PR de release. Verificar se CI está verde. Se sim, mergear (escopo comum — regra 7 do fluxo Git).

### Etapa 102 — Verificar dependabot PRs bloqueadas
- Ação: Listar PRs abertas de `dependabot[bot]`. Verificar se CI está verde em cada uma. Mergear as que passarem.

### Etapa 103 — Configurar limite de dependabot PRs simultâneas
- Arquivo: `.github/dependabot.yml`
- Ação: Se não existir `open-pull-requests-limit`, adicionar `open-pull-requests-limit: 5` para evitar flood de PRs.

### Etapa 104 — Verificar CHANGELOG.md ou release notes
- Ação: Se `release-please` gera CHANGELOG automaticamente, verificar se o formato está correto e inclui os principais fixes dos últimos 10 dias.

### Etapa 105 — Configurar auto-merge para dependabot patch
- Ação: Verificar se há workflow de auto-merge para dependabot com `patch` ou `minor` semver. Se não, criar. Reduz acúmulo de PRs de dependabot.

---

## GRUPO 12 — Edge Functions: Deploy e Sincronização 🟡

**Contexto:** Deploy só via `deploy-edge-functions.yml` (workflow_dispatch). MCP `deploy_edge_function` cria divergência. Job "Compare GitHub × Canonical" detecta drift.

### Etapa 106 — Verificar estado do "Compare GitHub × Canonical"
- Arquivo: `.github/workflows/edge-functions-drift-check.yml`
- Ação: Ver último run. Se vermelho, identificar quais funções estão divergentes e criar PR de reconciliação.

### Etapa 107 — Listar edge functions deployadas vs. no repo
- Ação: Via MCP `SUPABASE - GESTÃO DE PRODUTOS`: `list_edge_functions`. Comparar com `ls supabase/functions/`. Funções no banco mas não no repo = foram deployadas fora do fluxo.

### Etapa 108 — Verificar function `crm-db-bridge`
- Arquivo: `src/lib/crm-db.ts`, `supabase/functions/crm-db-bridge/`
- Ação: Esta função faz bridge para o banco externo CRM (`pgxfvjmuubtbowutlide`). Verificar se está deployada e respondendo. É crítica para funcionalidades de CRM.

### Etapa 109 — Documentar secrets de edge functions
- Arquivo: `docs/ci/SEGREDOS.md`
- Ação: Verificar se todos os secrets necessários para as edge functions estão documentados (Gate 1.14).

### Etapa 110 — Criar teste de smoke de edge functions
- Ação: Script `scripts/test-edges-smoke.sh` que faz `curl` em cada edge function crítica e verifica response 200. Rodar mensalmente ou após deploy.

---

## GRUPO 13 — Arquitetura e Estrutura de Código 🟡

**Contexto:** Sistema com ~80% concluído. Falta integração ponta a ponta em alguns fluxos.

### Etapa 111 — Mapear fluxos incompletos
- Fonte: `inventario/estado/rotas.json`
- Ação: Identificar rotas que existem no frontend mas não têm edge function ou tabela correspondente. Listar em `docs/FLUXOS_INCOMPLETOS.md`.

### Etapa 112 — Verificar estados de loading/erro em todos os hooks
- Ação: `grep -rn "isLoading\|isError\|error" src/hooks/ --include="*.ts" | wc -l`. Comparar com total de hooks. Hooks sem `isLoading` provavelmente não exibem spinner.

### Etapa 113 — Verificar formulários com submit sem handler
- Ação: `grep -rn "onSubmit" src/components/ --include="*.tsx" | wc -l`. Formulários sem `onSubmit` = feature incompleta.

### Etapa 114 — Auditar componentes com `TODO` ou `WIP`
- Ação: `grep -rn "TODO\|WIP\|FIXME\|placeholder\|mock\|hardcode" src/components/ --include="*.tsx"`. Cada ocorrência = feature não entregue.

### Etapa 115 — Verificar se rota de catálogo funciona end-to-end
- Ação: Via inventário: confirmar que rota de catálogo → hook → edge function → tabela `products` está completa. Esta é a rota principal do B2B.

### Etapa 116 — Verificar fluxo de orçamento end-to-end
- Ação: Identificar todas as etapas do fluxo de orçamento (criar → revisar → aprovar → enviar ao cliente). Qual etapa está incompleta?

### Etapa 117 — Verificar integração com CRM
- Arquivo: `src/lib/crm-db.ts`
- Ação: A integração CRM usa `crm-db-bridge`. Verificar se todos os endpoints do CRM usados no front estão implementados na edge function.

### Etapa 118 — Verificar lazy loading de rotas pesadas
- Arquivo: `src/App.tsx` ou router principal
- Ação: Componentes de página pesados devem usar `React.lazy()`. Verificar se as páginas do editor de magazine (maior componente) estão lazy-loaded.

### Etapa 119 — Verificar uso do token CSS `--inbox-panel-bg`
- Arquivo: `src/styles/tokens.css`
- Ação: `grep -rn "bg-black" src/ --include="*.tsx"`. Cada ocorrência é potencial bug de tema escuro (issue #755 → #774).

### Etapa 120 — Documentar módulos por domínio
- Arquivo: `docs/ARQUITETURA.md` (criar se não existir)
- Ação: Mapa dos módulos: catálogo, orçamento, CRM, magazine, inbox. Para cada um: quais tabelas usa, quais edge functions chama, quais páginas exibe.

---

## GRUPO 14 — Testes: Cobertura e Qualidade 🟡

**Contexto:** Gate 2 (Vitest unitário) está verde. E2E cancelado. Sem dados de cobertura de testes unitários.

### Etapa 121 — Medir cobertura de testes unitários
- Ação: `npx vitest run --coverage`. Ver percentual de cobertura por arquivo. Identificar os 10 arquivos mais críticos (hooks de orçamento, hooks de catálogo) sem cobertura.

### Etapa 122 — Adicionar testes para hooks críticos sem cobertura
- Ação: Para o hook mais importante sem teste (identificado na Etapa 121), escrever testes unitários com vitest. Mínimo: happy path + erro de rede + estado vazio.

### Etapa 123 — Verificar testes de integridade transacional (Gate 2.5)
- Arquivo: Testes do Gate 2.5 (`database-integrity`)
- Ação: Confirmar que o job `database-integrity` está verde. Este gate verifica integridade de dados PostgreSQL em banco descartável.

### Etapa 124 — Adicionar testes de contrato de API para edge functions
- Ação: Para cada edge function crítica, criar teste de contrato (`*.test.ts`) que verifica: inputs esperados, outputs tipados, erros tratados.

### Etapa 125 — Verificar se suíte Vitest tem timeout adequado
- Arquivo: `vitest.config.ts`
- Ação: Tests unitários não devem ter timeout > 5s. Se algum teste leva mais, investigar se está fazendo chamada de rede real (viola isolamento).

---

## GRUPO 15 — Documentação e Onboarding 🟢

### Etapa 126 — Atualizar SCHEMA_REFERENCE.md
- Arquivo: `docs/SCHEMA_REFERENCE.md`
- Ação: Se a data no topo for > 30 dias, regenerar via query em `pg_catalog` e atualizar.

### Etapa 127 — Criar guia de onboarding para novo agente
- Arquivo: `docs/ONBOARDING_AGENTE.md` (criar)
- Ação: Documento que um agente lê no primeiro turno: qual banco, qual workflow, como rodar testes, onde está o estado real, o que nunca fazer.

### Etapa 128 — Atualizar PENDENCIAS.md
- Arquivo: `PENDENCIAS.md` (se existir)
- Ação: Listar os itens deste plano que foram executados. Remover os resolvidos.

### Etapa 129 — Criar CHANGELOG manual para mudanças de arquitetura
- Arquivo: `docs/CHANGELOG_ARQUITETURA.md` (criar)
- Ação: Registrar as decisões arquiteturais tomadas: por que `contexto.yml` foi implementado, por que E2E foi movido para nightly, etc.

### Etapa 130 — Verificar se docs/contexto/regras/manual/ tem README
- Arquivo: `docs/contexto/regras/manual/README.md`
- Ação: Verificar se explica o propósito da pasta e como adicionar novas regras.

---

## GRUPO 16 — Performance e Monitoramento 🟢

### Etapa 131 — Verificar uptime-monitor
- Arquivo: `.github/workflows/uptime-monitor.yml`
- Ação: Ver últimos runs (schedule a cada 30 min). Se algum health check falhou, investigar causa.

### Etapa 132 — Verificar queries lentas no banco
- Ação: Via MCP `SUPABASE - GESTÃO DE PRODUTOS`: verificar advisors de performance. Queries > 100ms em tabelas principais merecem índice.

### Etapa 133 — Verificar índices faltando
- Ação: Via MCP: `SELECT * FROM pg_stat_user_tables WHERE seq_scan > idx_scan AND n_live_tup > 1000`. Tabelas com mais seq_scan que idx_scan e > 1000 linhas precisam de índice.

### Etapa 134 — Verificar bloat de tabelas
- Ação: Via MCP: tabelas com dead_tup_ratio > 20% precisam de VACUUM. Identificar e criar migration para scheduled VACUUM se necessário.

### Etapa 135 — Verificar uso de cache no Supabase
- Ação: Queries frequentes idênticas podem se beneficiar de cache em edge function. Identificar as 5 queries mais executadas no banco.

---

## GRUPO 17 — Dependências e Segurança de Supply Chain 🟢

### Etapa 136 — Atualizar dependências com CVE crítico
- Ação: `npm audit --audit-level high`. Listar dependências com CVE high/critical. Gate 0.5 já bloqueia PRs, mas pode haver dívida pré-existente.

### Etapa 137 — Verificar actions de terceiros na allowlist
- Arquivo: `CLAUDE.md` (seção de Actions permitidas)
- Ação: Confirmar que as 8 actions permitidas ainda são as mesmas no Settings → Actions. Se alguma foi adicionada/removida, atualizar documentação.

### Etapa 138 — Atualizar pins de actions para SHA mais recente
- Ação: Para cada action pinada por SHA, verificar se existe versão mais nova com fixes de segurança. Atualizar SHA com comentário do tag correspondente.

### Etapa 139 — Revisar requirements.txt do supabase_snapshot
- Arquivo: `scripts/supabase_snapshot/requirements.txt`
- Ação: `pip-audit` nas dependências Python. Gate 0.6 (Dependency Review) verifica CVEs em PRs mas não em código já mergeado.

### Etapa 140 — Verificar se gitleaks está atualizado
- Arquivo: `.github/workflows/deploy-gates.yml` (Gate E23)
- Ação: Verificar versão do `gitleaks-action` pinada. Atualizar se houver versão mais nova com melhor detecção.

---

## GRUPO 18 — Automações e Scripts 🟢

### Etapa 141 — Verificar scripts do inventário
- Arquivo: `scripts/inventario/`
- Ação: Verificar se `gerar-banco.mjs`, `gerar-rotas.mjs`, `gerar-repo.mjs` rodam sem erro com as credenciais atuais. Ver `inventario/estado/gerado_em`.

### Etapa 142 — Automatizar geração semanal do inventário estático
- Ação: PR #3042 propunha atualização automática semanal de `inventario/estado/`. Verificar status. Se ainda pendente, implementar `inventario-estado.yml` (schedule semanal).

### Etapa 143 — Criar script de healthcheck pré-PR
- Arquivo: `scripts/pre-pr-check.sh` (criar)
- Ação: Script que roda localmente antes de abrir PR: lint nos arquivos tocados, tsc, testes unitários dos módulos alterados, Gate 0 e Gate 1.1. Reduz round-trip de CI.

### Etapa 144 — Verificar `scripts/sentinel-check.sh`
- Arquivo: `scripts/sentinel-check.sh`
- Ação: Testar que o sentinel rejeita corretamente merge commit entre branches de agentes diferentes. Criar teste automatizado para este script.

### Etapa 145 — Verificar `commitlint.config.js`
- Arquivo: `commitlint.config.js`
- Ação: Confirmar que os tipos aceitos estão sincronizados com `CLAUDE.md` REGRA #6. Se algum tipo foi adicionado em um lugar mas não no outro, sincronizar.

---

## GRUPO 19 — Coordenação Multi-Agente 🟢

**Contexto:** 6 agentes escrevem no repo simultaneamente. Incidentes de branch contaminada e commits em branch alheia já ocorreram.

### Etapa 146 — Criar issue template de branch contaminada
- Arquivo: `.github/ISSUE_TEMPLATE/branch-contaminada.md`
- Ação: Template para reportar quando um agente comitou em branch alheia. Inclui: agente afetado, commits contaminantes, SHA do último commit legítimo.

### Etapa 147 — Adicionar verificação de carimbo no sentinel
- Arquivo: `scripts/sentinel-check.sh`
- Ação: Verificar se o sentinel já valida formato `claude/<tipo>-<slug>-<AAMMDD-HHMM>`. Se não, adicionar verificação de carimbo de hora para detectar branches sem timestamp.

### Etapa 148 — Documentar protocolo de resolução de conflitos semânticos
- Arquivo: `docs/coordenacao/conflitos-semanticos.md` (mencionado no CLAUDE.md Gate 1.18)
- Ação: Verificar se existe. Se não, criar com protocolo: (1) identificar conflito, (2) notificar dono, (3) escolher versão canônica, (4) registrar decisão.

### Etapa 149 — Criar tabela de agentes ativos
- Arquivo: `docs/coordenacao/agentes-ativos.md` (criar)
- Ação: Tabela com: agente, branch atual, arquivos em edição, sessão criada em. Atualizado por cada agente ao iniciar/terminar sessão.

### Etapa 150 — Verificar Gate 1.18 (conflitos semânticos)
- Ação: Gate 1.18 bloqueia PRs de agentes diferentes sem aprovação. Testar criando PR de branch `codex/test` que toca os mesmos arquivos de branch `claude/test`. O sentinel deve recusar.

---

## GRUPO 20 — Validação do PR #3059 (contexto.yml) 🟡

**Contexto:** PR #3059 mergeada em 2026-11-04. Implementou contexto.yml + 3 produtores. Validação completa pendente.

### Etapa 151 — Validar que testes unitários dos produtores passam
- Ação: `npx vitest run tests/scripts/contexto-produtores.test.mjs`. Deve ser 9/9.

### Etapa 152 — Validar invariante: não usa SUPABASE_ACCESS_TOKEN
- Arquivo: `.github/workflows/contexto.yml`
- Ação: `grep -n "SUPABASE_ACCESS_TOKEN\|SUPABASE_SERVICE_ROLE_KEY" .github/workflows/contexto.yml`. Deve retornar 0 resultados.

### Etapa 153 — Validar invariante: não publica em main
- Arquivo: `.github/workflows/contexto.yml`
- Ação: `grep -n "refs/heads/main" .github/workflows/contexto.yml`. Deve retornar 0 resultados.

### Etapa 154 — Validar invariante: não tem trigger pull_request
- Arquivo: `.github/workflows/contexto.yml`
- Ação: `grep -n "pull_request:" .github/workflows/contexto.yml`. Deve retornar 0 resultados.

### Etapa 155 — Validar que banco usa PG vars sem connection string com senha
- Arquivo: `.github/workflows/contexto.yml`
- Ação: `grep -n "postgresql://.*:.*@" .github/workflows/contexto.yml`. Deve retornar 0 resultados.

### Etapa 156 — Validar que cron usa lista de minutos (não range)
- Arquivo: `.github/workflows/contexto.yml`
- Ação: `grep -n "schedule" .github/workflows/contexto.yml`. O cron deve ser `'3,13,23,33,43,53 * * * *'` (lista), não `*/10` (passo).

### Etapa 157 — Validar que Gate E89 não foi violado
- Ação: Gate E89 proíbe cron de 10 min com `SUPABASE_ACCESS_TOKEN`. Validação: (1) não tem o secret, (2) cron é de 10 min via lista de 6 minutos. Ambas as condições devem ser verdadeiras.

### Etapa 158 — Confirmar que cenarios.mjs não tem hits no gitleaks
- Arquivo: `scripts/ai-context/cenarios.mjs`
- Ação: `grep -n "gitleaks:allow" scripts/ai-context/cenarios.mjs`. Linha 119 deve ter o marcador. Gate E23 não deve flagear o arquivo.

### Etapa 159 — Confirmar que .migration-refs-baseline.json tem as 6 entradas de ai-context
- Arquivo: `.migration-refs-baseline.json`
- Ação: `jq '. | keys | map(select(startswith("scripts/ai-context/"))) | length' .migration-refs-baseline.json`. Deve retornar 6.

### Etapa 160 — Verificar que psycopg está na allowlist do Gate 0.6
- Arquivo: `.github/workflows/deploy-gates.yml`
- Ação: `grep -n "psycopg" .github/workflows/deploy-gates.yml`. Deve ter `allow-dependencies-licenses: pkg:pypi/psycopg`.

---

## GRUPO 21 — Gaps Identificados nos Últimos 500 Commits 🟡

**Contexto:** Análise dos 500 commits revelou padrões problemáticos específicos além dos já citados.

### Etapa 161 — Investigar commits "chore: bump baseline" duplicados
- Ação: Dos 95 commits chore, quantos são "bump baseline"? Se um baseline é bumped mais de 1× em 10 dias, o gate não está funcionando como dissuasão.

### Etapa 162 — Verificar se commits do Lovable retornam após inatividade
- Ação: Bot inativo nos últimos 10 dias. Quando retornar, os primeiros commits tendem a ser de "fast visual edit" que sobrescrevem arquivos protegidos. Verificar `lovable-protected-audit.yml`.

### Etapa 163 — Investigar alto volume de commits docs (165/500 = 33%)
- Ação: 33% dos commits são `docs:`. Muito alto. Verificar se são gerados por bots (contexto.yml, outros) ou são manuais. Commits de bots em main não devem ser contados como trabalho do time.

### Etapa 164 — Verificar se há commits de múltiplos autores no mesmo arquivo
- Ação: `git log --all --diff-filter=M --name-only --format="%an" src/integrations/supabase/client.ts | sort | uniq`. Se > 2 autores tocaram `client.ts` nos últimos 30 dias, risco alto de conflito silencioso.

### Etapa 165 — Mapear frequência de conflitos de merge por arquivo
- Ação: Buscar nos commits: `fix: resolve conflito` ou `merge(pr-NNN)`. Arquivos mais conflitados merecem CODEOWNERS mais restritivo.

---

## GRUPO 22 — Supabase: Funções e Triggers 🟡

### Etapa 166 — Verificar funções sem migration correspondente
- Ação: Via MCP: listar `pg_proc` com funções criadas após o último baseline. Comparar com `supabase/migrations/`. Funções sem migration = drift.

### Etapa 167 — Verificar triggers em tabelas críticas
- Ação: `SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public'`. Documentar triggers que não têm migration.

### Etapa 168 — Verificar RPC `restore_seller_cart` (Gate 5.5)
- Ação: Gate 5.5 verifica que `restore_seller_cart` existe no banco canônico. Confirmar que a função existe e está funcionando.

### Etapa 169 — Auditar cron jobs ativos
- Ação: `SELECT jobname, schedule, active, jobid FROM cron.job WHERE active = true`. Listar e documentar cada job ativo em `docs/SCHEMA_REFERENCE.md`.

### Etapa 170 — Verificar logs de cron jobs com falha
- Ação: `SELECT jobname, return_message FROM cron.job_run_details WHERE status != 'succeeded' ORDER BY start_time DESC LIMIT 20`. Cron jobs com falha = processo de negócio quebrado.

---

## GRUPO 23 — Configurações do GitHub e Branch Protection 🟡

### Etapa 171 — Verificar se required-checks.json está atualizado
- Arquivo: `.github/required-checks.json`
- Ação: Comparar com o branch protection real via API. Se divergir, atualizar o JSON.

### Etapa 172 — Verificar se "Assert Gate Final is required on main" ainda passa
- Ação: Este é um dos 5 required checks. Se o nome do job mudou em deploy-gates.yml, o check fantasma falha. Ver último run.

### Etapa 173 — Verificar CODEOWNERS coverage (Gate 1.17)
- Arquivo: `.github/CODEOWNERS`
- Ação: Verificar se todos os arquivos da tabela de guardas têm entrada em CODEOWNERS. Gate 1.17 (`check-codeowners-coverage.mjs`) deve passar.

### Etapa 174 — Verificar `workflow-lint.yml` passa em todos os workflows
- Ação: `actionlint` + `shellcheck` rodam em todos os `.github/workflows/*.yml`. Ver último run de `workflow-lint.yml`. Se vermelho, corrigir o workflow apontado.

### Etapa 175 — Verificar se settings-guard está verde
- Arquivo: `.github/workflows/settings-guard.yml` (schedule diário)
- Ação: Ver último run. Se há divergência de configuração, investigar o que mudou.

---

## GRUPO 24 — Limpeza e Housekeeping 🟢

### Etapa 176 — Remover branches obsoletas de agentes
- Ação: `git branch -r | grep -E "claude/|codex/|devin/" | head -20`. Branches com > 30 dias sem atividade e PR mergeada podem ser deletadas.

### Etapa 177 — Limpar artifacts expirados no Actions
- Ação: Verificar se `retention-days` está configurado em todos os `upload-artifact` (R6). Artifacts sem retention expiram ao default do GitHub (90 dias).

### Etapa 178 — Remover dependências não utilizadas
- Ação: `npx depcheck`. Listar dependências em `package.json` que não são importadas em código. Remover as confirmadas como mortas.

### Etapa 179 — Limpar `__pycache__` do .gitignore
- Arquivo: `.gitignore`
- Ação: Verificar se `__pycache__/` está em `.gitignore`. Foi adicionado como parte do PR #3059 mas confirmar que não foi revertido.

### Etapa 180 — Verificar se `.env.example` está atualizado
- Arquivo: `.env.example`
- Ação: Comparar com as variáveis reais usadas em `src/`. Se alguma variável nova foi adicionada ao código mas não ao exemplo, adicionar (sem valor real, só documentação).

---

## GRUPO 25 — Melhorias de DX (Developer Experience) 🟢

### Etapa 181 — Criar script de setup de ambiente local
- Arquivo: `scripts/setup-local.sh` (criar se não existir)
- Ação: Script idempotente que configura o ambiente de desenvolvimento: `bun install`, copia `.env.example` para `.env.local`, verifica Node/Bun version.

### Etapa 182 — Adicionar volta ao script de CI local
- Ação: `scripts/pre-pr-check.sh` (Etapa 143) deve ter um modo `--fix` que roda `eslint --fix` e `prettier --write` antes do check.

### Etapa 183 — Documentar comandos mais usados
- Arquivo: `README.md` (se existir) ou `docs/COMANDOS.md`
- Ação: Lista curta dos comandos mais úteis: `bun install`, `bun run dev`, `npx vitest run`, `node scripts/validate-supabase-config.mjs`, `git show origin/contexto:docs/contexto/00-INDEX.md`.

### Etapa 184 — Criar atalho para verificar estado de CI
- Ação: Script `scripts/ci-status.sh` que faz `gh run list --repo adm01-debug/Promo_Gifts_V4 --branch main --limit 5` e exibe estado resumido dos últimos 5 runs.

### Etapa 185 — Adicionar validação de branch name no commit-msg hook
- Arquivo: `.husky/commit-msg` ou `.husky/pre-commit`
- Ação: Se a branch atual não segue o padrão `claude/<tipo>-<slug>-<AAMMDD-HHMM>`, avisar (não bloquear) no hook local.

---

## GRUPO 26 — Monitoramento e Alertas de Produção 🟢

### Etapa 186 — Verificar alertas do inventário (`banco.json.alertas`)
- Arquivo: `inventario/estado/banco.json`
- Ação: Ler campo `alertas`. Cada alerta representa um problema detectado no banco. Priorizar pelos de maior severidade.

### Etapa 187 — Configurar alerta de deploy demorado
- Ação: Deploy Vercel > 5 min indica problema. Criar webhook Vercel que notifica quando build excede 5 min.

### Etapa 188 — Verificar se uptime monitor tem cobertura de endpoints críticos
- Arquivo: `.github/workflows/uptime-monitor.yml`
- Ação: Listar os endpoints verificados. Deve incluir: home, catálogo, login, pelo menos 1 edge function.

### Etapa 189 — Criar dashboard de saúde do CI
- Ação: Documento semanal gerado por bot listando: (1) gates que falharam × passaram, (2) tempo médio de CI, (3) ratchets que subiram, (4) PRs pendentes de agentes. Base para reunião semanal de qualidade.

### Etapa 190 — Configurar alerta de RLS deny-all
- Ação: Se Gate 1.13.1 detectar nova tabela com RLS=true e 0 policies, enviar notificação imediata (pode ser issue automática). Hoje o gate bloqueia o PR mas não alerta sobre tabelas já existentes.

---

## GRUPO 27 — Longo Prazo: Estabilização do Sistema 🟢

### Etapa 191 — Meta: Reduzir fix(ci) de 39 para < 10 por mês
- Ação: Medir o número de commits `fix(ci)` mensalmente. Meta: < 10/mês em 90 dias. Registrar em `docs/ci/CI_HEALTH_METRICS.md`.

### Etapa 192 — Meta: E2E verde em main por 7 dias consecutivos
- Ação: Após implementar smoke tests (Etapas 2-10), medir quantos dias consecutivos o `e2e-smoke` fica verde. Meta: 7 dias para declarar estabilização.

### Etapa 193 — Meta: Zero ratchet bumps em 30 dias
- Ação: Após reduzir dívida técnica (Etapas 31-40), monitorar se novos bumps são necessários. Meta: 30 dias sem bump = código em equilíbrio com os thresholds.

### Etapa 194 — Meta: Reduzir erros TS em 50%
- Ação: Registrar valor inicial (Etapa 81). Em 60 dias, meta de redução de 50% via correções incrementais sem reescrita.

### Etapa 195 — Meta: 100% de edge functions com teste de smoke
- Ação: Após Etapa 110 e 124, meta de ter smoke test para cada edge function crítica (as 20 mais chamadas).

### Etapa 196 — Meta: regras.md com 100% das regras de negócio conhecidas documentadas
- Ação: Após Etapas 21-30, fazer revisão mensal do `regras.md`. Adicionar regras descobertas em bugs ou suporte.

### Etapa 197 — Meta: contexto.yml sem falhas em 30 dias consecutivos
- Ação: Monitorar runs do `contexto.yml`. Se falha, investigar imediatamente. Meta: 30 dias de coleta sem falha = inventário confiável.

### Etapa 198 — Revisão trimestral do plano de melhorias
- Ação: Em 90 dias (2027-02-04), um agente deve: (1) verificar quais etapas foram executadas, (2) remover as concluídas, (3) adicionar novas baseadas no estado atual. Commitar versão atualizada do plano.

### Etapa 199 — Criar SLA de resposta para falhas de produção
- Arquivo: `docs/INCIDENT-RUNBOOK.md` (verificar se existe)
- Ação: Documentar: (1) deploy falhou → alerta em X min, (2) E2E cancelado → investigação em X min, (3) Gate 0 falhou → revert em X min. Critérios objetivos, não subjetivos.

### Etapa 200 — Declarar "sistema estabilizado" quando:
- Gate Final: verde em 10 runs consecutivos de main
- E2E smoke: verde em 7 dias consecutivos
- Ratchets: sem bumps em 30 dias
- fix(ci): < 10/mês
- regras.md: completo e validado
- contexto.yml: 30 dias sem falha
- Ação: Criar issue de celebração e documentar data de estabilização em `docs/HISTORICO_ESTABILIZACAO.md`.

---

## RESUMO EXECUTIVO

| Grupo | Etapas | Prioridade | Impacto |
|-------|--------|------------|--------|
| E2E quebrado | 1–10 | 🔴 | Zero cobertura de browser há 33 dias |
| CI instável | 11–20 | 🔴 | 39 fix(ci) em 10 dias = ciclo vicioso |
| regras.md vazio | 21–30 | 🔴 | Agentes sem contexto de negócio |
| Dívida técnica | 31–40 | 🟠 | 13 ratchet bumps acumulando |
| Segurança/RLS | 41–50 | 🟠 | Risco de acesso indevido a dados |
| Banco/migrations | 51–60 | 🟠 | Drift silencioso em produção |
| Lovable proteção | 61–70 | 🟠 | Bot pode reverter guardas críticas |
| Vercel/deploy | 71–80 | 🟠 | Projeto legado duplicando builds |
| TypeScript | 81–90 | 🟡 | Dívida de tipagem acumulando |
| contexto.yml validação | 91–100 | 🟡 | Verificar primeira coleta |
| Release/versioning | 101–110 | 🟡 | release 1.8.0 bloqueada |
| Edge functions | 106–110 | 🟡 | Drift potencial |
| Arquitetura | 111–120 | 🟡 | Fluxos incompletos |
| Testes | 121–125 | 🟡 | Cobertura unitária desconhecida |
| Documentação | 126–130 | 🟢 | Onboarding de agentes |
| Performance | 131–135 | 🟢 | Queries lentas |
| Dependências | 136–140 | 🟢 | CVEs e supply chain |
| Automações | 141–145 | 🟢 | Scripts utilitários |
| Multi-agente | 146–150 | 🟢 | Coordenação |
| Validação PR #3059 | 151–160 | 🟡 | Verificar implementação |
| Commits análise | 161–165 | 🟡 | Padrões problemáticos |
| Supabase funções | 166–170 | 🟡 | Drift de funções/triggers |
| GitHub config | 171–175 | 🟡 | Branch protection |
| Housekeeping | 176–180 | 🟢 | Limpeza |
| DX | 181–185 | 🟢 | Produtividade de agentes |
| Monitoramento | 186–190 | 🟢 | Alertas de produção |
| Longo prazo | 191–200 | 🟢 | Metas de estabilização |

**Ordem recomendada de execução:** 1–10 (E2E) → 21–30 (regras.md) → 11–20 (CI) → 41–50 (Segurança) → 151–160 (Validação PR #3059) → resto por prioridade.

---

_Plano gerado por análise automatizada dos últimos 500 commits do repositório `adm01-debug/Promo_Gifts_V4` em 2026-11-04. Cada etapa contém evidência do problema observado. Nenhuma etapa foi executada neste documento — apenas planejadas._
