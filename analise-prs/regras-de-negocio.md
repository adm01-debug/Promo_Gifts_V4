# Regras de Negocio — Criterios de Merge de PRs

**Sessao:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Atualizado em:** 2026-11-09

## Regras Absolutas (NAO NEGOCIAVEIS)

### R1 — Gate Final deve passar
Gate Final - Deploy Ready (`deploy-gates.yml`) e o unico check required em `main`.
PR com Gate Final=FAILURE = NAO_MERGEAR. Sem excecao.

### R2 — Nao tocar .github/workflows/
Qualquer PR que altere arquivos em `.github/workflows/` e mandato PROIBIDO para merge autonomo.
Sempre AGUARDA_PO — independente do CI.

### R3 — DDL exige aprovacao do PO (REGRA E056)
PRs com `supabase/migrations/` contendo DDL (CREATE, ALTER, DROP, GRANT, REVOKE, CREATE POLICY,
CREATE INDEX, CREATE FUNCTION, cron.alter_job, cron.schedule, cron.unschedule) = AGUARDA_PO.
Mesmo que CI verde.

### R4 — REGRA #10: sem push em branch de outro agente
Branches `codex/*`, `devin/*`, `dependabot/*` e branches de outras sessoes Claude sao somente leitura.
Nao e possivel corrigir CI empurrando nessas branches.

### R5 — Major version bumps exigem aprovacao
Bump major (vX->vY onde Y > X) em dependencias de producao = AGUARDA_PO.
Risco de breaking changes sem testes adaptativos.

### R6 — DRAFT nao merge
PR em estado draft nao pode ser mergeado. Sempre AGUARDA_CI ou AGUARDA_PO.

## Criterios de Elegibilidade para Merge Autonomo

Um PR pode ser mergeado autonomamente SOMENTE se TODOS estes criterios forem atendidos:

1. Gate Final = SUCCESS (verificado via GraphQL statusCheckRollup)
2. Nao toca `.github/workflows/` (verificado via diff de arquivos)
3. Nao contem DDL em `supabase/migrations/`
4. Nao e branch de outro agente (codex/*, devin/*, dependabot/*)
5. Nao e DRAFT
6. Nao e major version bump de dependencia
7. Nao e RLS policy change sem teste em Postgres temporario
8. mergeable != CONFLICTING

## Categorias de Veredito

**MERGEADA_AGENTE** — Mergeada por este agente nesta sessao  
**MERGEADA_EXTERNA** — Mergeada pelo PO ou outro agente  
**NAO_MERGEAR** — CI falhou; correcao necessaria antes de merge  
**AGUARDA_CI** — CI pendente ou PR em draft  
**AGUARDA_PO** — Requer aprovacao explicita do PO (workflow, DDL, major bump, RLS)

## Hierarquia de Verificacao CI

1. GraphQL `statusCheckRollup state` — estado agregado do commit mais recente
2. GraphQL `contexts(first:30)` — checks individuais (truncado em 30; Gate Final pode estar alem)
3. `github_list_check_runs` — verificacao direta de um check especifico
4. `github_get_workflow_run` — detalhes de execucao especifica

## Supabase Producao — Verificacao Pos-Merge

Apos cada merge, verificar `doufsxqlfjyuvxuezpln`:
- `SELECT count(*) FROM products` — deve retornar >= 8321
- `SELECT pg_postmaster_start_time()` — confirma banco ativo

## Evidencias Coletadas Nesta Sessao

- 5 batches GraphQL cobrindo 36 PRs abertas
- SQL de 12 migrations lido e verificado (sessoes anteriores)
- Gate Final verificado em todos os 36 PRs
- Supabase producao: 8321 produtos, HEALTHY
- Main SHA: b4c1167c7ce91e664d23fddc43570d0a61efd048
