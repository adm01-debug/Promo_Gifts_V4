# Validação de backup, restore e rollback — 2026-08-26

Escopo: etapa 9, em modo estritamente read-only.

Regra operacional desta validação:

- Não executei restore, deploy, migration, DDL ou chamada externa mutante.
- Os comandos abaixo foram validados apenas por inspeção de workflows, scripts e documentação versionada.
- Onde o repositório não comprova a existência operacional do mecanismo, a classificação é `NÃO COMPROVADO`.

## Resumo executivo

O repositório comprova hoje:

- rollback automático de deploy web na Vercel, com snapshot do deploy anterior e smoke pós-deploy;
- exportação read-only de snapshot de schema e drift do Supabase para auditoria;
- alguns artefatos concretos e específicos de restauração/rollback de banco;
- mecanismos documentados de reversão via Git/GitHub (`git revert`) para incidentes em `main`.

O repositório não comprova hoje:

- backup geral de dados do banco versionado no repo;
- PITR, snapshot de volume ou restore automatizado de dados do Supabase a partir do próprio repositório;
- rollback automatizado de Edge Functions;
- canário de tráfego real para web ou Edge;
- que os backups `_backup_*_YYYYMMDD` existam previamente para cada mudança destrutiva; a exigência está documentada, mas a existência é caso a caso.

Para banco de dados, a política segura e compatível com o projeto é forward-only:

- se houver backup/snapshot restaurável já existente e autorizado, restaurar a partir dele;
- se não houver restore aprovado, usar migration compensatória;
- nunca “renomear/reverter o passado” de migrations já aplicadas como estratégia padrão.

## Metodologia e fontes inspecionadas

Artefatos principais usados nesta validação:

- `.github/workflows/deploy-vercel.yml`
- `.github/workflows/deploy-edge-functions.yml`
- `.github/workflows/schema-snapshot-export.yml`
- `scripts/export-schema-snapshot.mjs`
- `supabase/migrations-snapshot/README.md`
- `scripts/faxina-rollback.sql`
- `docs/sql/quote-number-hardening-rollback.sql`
- `docs/deploy-flow.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/prod-health.yml`
- `.github/workflows/branch-protection-sentinel.yml`
- `docs/observability/log-login-canary.md`
- `src/lib/external-db/kill-switch-client.ts`

## Matriz de evidências

| Camada | Mecanismo | Status | Evidência | Observação operacional |
|---|---|---|---|---|
| Web | Rollback automático do deploy de produção | `COMPROVADO` | `.github/workflows/deploy-vercel.yml` | Captura o deploy anterior, sobe o novo, roda smoke e faz `vercel rollback` em falha |
| Web | Smoke pós-deploy | `COMPROVADO` | `.github/workflows/deploy-vercel.yml` | Verifica `/api/health` e `/api/ready` com retries |
| Web | Preview antes de produção | `COMPROVADO` | `.github/workflows/deploy-vercel.yml` | Há trilha de preview para refs fora de `main` |
| Web | Canário de tráfego real por porcentagem | `NÃO COMPROVADO` | ausência de mecanismo explícito no workflow | Há smoke e preview, mas não rollout progressivo de tráfego |
| Edge | Deploy automatizado de Edge Functions | `COMPROVADO` | `.github/workflows/deploy-edge-functions.yml` | Faz deploy por função, com `dry_run` para listagem |
| Edge | Rollback automatizado de Edge Functions | `NÃO COMPROVADO` | ausência no workflow/repo | O repo não traz comando ou job de rollback equivalente ao da Vercel |
| Edge | Canário operacional de Edge | `NÃO COMPROVADO` | ausência no workflow/repo | Existe monitoria e drafts, mas não rollout progressivo comprovado |
| DB Schema | Snapshot read-only do schema | `COMPROVADO` | `.github/workflows/schema-snapshot-export.yml`, `scripts/export-schema-snapshot.mjs` | Gera `ALL_IN_ONE.sql`, `SCHEMA_LIVE.sql`, `SCHEMA_DRIFT.sql`, `SNAPSHOT_META.json` |
| DB Dados | Backup geral de dados restaurável no repo | `NÃO COMPROVADO` | ausência de mecanismo versionado no repo | O que existe no repo é schema/auditoria, não backup global de linhas/dados |
| DB | Rollback específico de faxina/arquivamento | `COMPROVADO` | `scripts/faxina-rollback.sql` | Recupera objetos arquivados a partir de `archive._cleanup_manifest` |
| DB | Rollback específico de hardening de quotes | `COMPROVADO` | `docs/sql/quote-number-hardening-rollback.sql` | Artefato pontual, não política geral |
| Git/GitHub | Reversão segura de incidentes em `main` | `COMPROVADO` | `docs/deploy-flow.md`, `.github/workflows/prod-health.yml`, `.github/workflows/branch-protection-sentinel.yml` | `git revert` é o caminho seguro e documentado |
| App | Mecanismo de rollout gradual/kill switch | `COMPROVADO` | `src/lib/external-db/kill-switch-client.ts` | Serve como mitigação funcional, não como rollback global de deploy |
| Observabilidade | Canário sintético `log-login-attempt` | `NÃO COMPROVADO` como ativo; `COMPROVADO` como draft | `docs/observability/log-login-canary.md` | Documento explicita que está em draft e não aplicado |

## Evidência detalhada por camada

## Web / Vercel

O workflow `.github/workflows/deploy-vercel.yml` comprova uma trilha robusta de rollback web:

- faz `vercel pull` e `vercel build` para production ou preview;
- antes do deploy em `main`, captura o deploy de produção anterior com `vercel ls --prod`;
- faz o novo deploy com `vercel deploy --prebuilt --prod`;
- valida o novo deploy via `/api/health` e `/api/ready`, com retries;
- em caso de falha, executa `vercel rollback "$PREV" --yes`.

Conclusão:

- rollback web automatizado está comprovado;
- smoke e stop condition também estão comprovados;
- canário por tráfego percentual não está comprovado.

## Edge Functions

O workflow `.github/workflows/deploy-edge-functions.yml` comprova:

- detecção automática das functions;
- `dry_run` para apenas listar;
- deploy por função via `supabase functions deploy ... --project-ref ... --use-api`.

Não há no repositório, porém:

- job de rollback automático de Edge Functions;
- comando versionado equivalente a “promover deploy anterior”;
- canário percentual de Edge.

Conclusão:

- deploy existe e é verificável;
- rollback operacional precisa ser tratado como procedimento externo e autorizado, não como capacidade comprovada do repo.

## Banco de dados / schema / restauração

### O que está comprovado

O workflow `.github/workflows/schema-snapshot-export.yml` e o script `scripts/export-schema-snapshot.mjs` comprovam uma trilha read-only de auditoria:

- `ALL_IN_ONE.sql` sempre é gerado a partir das migrations versionadas;
- `SCHEMA_LIVE.sql` pode ser gerado com `supabase db dump --linked --schema public`;
- `SCHEMA_DRIFT.sql` pode ser gerado com `supabase db diff --linked --schema public`;
- `SNAPSHOT_META.json` registra metadados do snapshot;
- o workflow publica artefato no GitHub e não faz commit automático.

O arquivo `supabase/migrations-snapshot/README.md` reforça explicitamente:

- os snapshots são read-only;
- não devem ser aplicados direto no banco;
- a SSOT continua sendo `supabase/migrations/`.

Também há artefatos concretos de rollback pontual:

- `scripts/faxina-rollback.sql` restaura objetos arquivados da sessão `claude-faxina-2026-06-20` a partir de `archive._cleanup_manifest`;
- `docs/sql/quote-number-hardening-rollback.sql` restaura uma versão anterior da função `generate_quote_number()` e orienta a remoção separada do índice.

### O que não está comprovado

Não encontrei no repositório:

- rotina geral de backup lógico completo de dados;
- restore automatizado de dados do Supabase;
- PITR versionado ou orquestrado a partir do repo;
- prova versionada de que cada operação destrutiva já tenha seu `_backup_*_YYYYMMDD` materialmente criado.

Há exigência processual de backup antes de mudança destrutiva em:

- `docs/deploy-flow.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `CONTRIBUTING.md`

Mas isso não equivale, por si só, à prova de que o backup já exista.

### Regra forward-only para DB

Para este projeto, a política operacional segura fica:

1. Nunca usar rename/rewrite/revert de migration já aplicada como estratégia padrão.
2. Se houver restore autorizado e comprovadamente restaurável, usar restore.
3. Se não houver restore aprovado, usar migration compensatória.
4. Sem restore comprovado ou compensação aprovada, a mudança destrutiva deve parar.

## Git e GitHub

O repositório documenta reversão segura via Git:

- `docs/deploy-flow.md` orienta `git revert <sha do merge>` para rollback;
- `.github/workflows/prod-health.yml` instrui `git revert <sha> && git push origin main` ao responder a falhas;
- `.github/workflows/branch-protection-sentinel.yml` também lista `git revert` como opção segura.

O mesmo sentinel mostra uma opção destrutiva com `git reset --hard` + force push, mas isso deve ser tratado apenas como exceção operacional extraordinária, nunca como trilha padrão.

## Canário, mitigação e stop conditions

## Web

Canário comprovado:

- não há canário de tráfego real;
- o que existe comprovadamente é preview + smoke pós-deploy.

Stop conditions comprovadas:

- `/api/health` não retorna `200` com `status=ok` e `commit == github.sha`;
- `/api/ready` não retorna `200` com `status=ready` ou `status=degraded`;
- esgotam-se os retries de smoke;
- nesse caso, o workflow tenta rollback automático do deploy anterior.

## Edge

Canário comprovado:

- não há canário percentual comprovado no workflow de Edge.

Stop conditions mínimas por evidência do repo:

- ausência de `SUPABASE_ACCESS_TOKEN`;
- função inexistente ou sem `index.ts`;
- falha de deploy da function.

Como não há rollback automatizado comprovado, qualquer falha após deploy exige pausa operacional e decisão explícita do PO sobre a remediação.

## Aplicação / rollout funcional

O arquivo `src/lib/external-db/kill-switch-client.ts` comprova:

- consulta de kill switches em `public.system_kill_switches`;
- rollout gradual por bucket;
- fail-open em caso de erro.

Isso é útil como mitigação progressiva de funcionalidade, mas não substitui:

- rollback de deploy web;
- rollback de Edge;
- restore de banco.

## Observabilidade

`docs/observability/log-login-canary.md` comprova apenas um draft de canário sintético:

- o próprio documento declara “Status: Draft SQL (não aplicado)”;
- o desenho prevê cron a cada 5 minutos e rollback com `cron.unschedule(...)`;
- portanto, o canário existe como especificação, não como mecanismo ativo comprovado.

## Comandos validados apenas por inspeção

Os comandos abaixo aparecem em workflows/scripts/docs e foram validados somente por leitura:

```bash
vercel ls --prod
vercel deploy --prebuilt --prod
vercel rollback "$PREV" --yes
curl "$BASE/api/health"
curl "$BASE/api/ready"

supabase link --project-ref "$SUPABASE_PROJECT_REF" -p "$SUPABASE_DB_PASSWORD"
supabase db dump --linked --schema public
supabase db diff --linked --schema public
supabase functions deploy "<fn>" --project-ref "$SUPABASE_PROJECT_REF" --use-api

\i scripts/faxina-rollback.sql
\i docs/sql/quote-number-hardening-rollback.sql

git revert <sha>
```

Importante:

- a presença desses comandos no repo não substitui autorização operacional;
- para DB, restore/rollback só pode seguir com autorização explícita e confirmação prévia de que o alvo é restaurável.

## Pré-condições e autorizações mínimas

Antes de qualquer ação real de rollback, restore ou deploy, devem existir:

- `[AUTORIZAÇÃO DEPLOY]` para deploy, canário, rollback operacional ou retirada remota;
- `[AUTORIZAÇÃO BD]` para schema, DML, jobs, RLS, policies, migrations ou restore de banco;
- `[AUTORIZAÇÃO GITHUB]` se houver alteração em workflows, schedules, checks ou settings;
- `[AUTORIZAÇÃO EXTERNA]` se houver chamada mutante a provedor externo;
- `[VALIDAÇÃO PO]` para remoção, consolidação, aposentadoria ou limpeza irreversível.

Além disso:

- web: capturar explicitamente o deploy anterior antes de trocar produção;
- Edge: ter plano de remediação aprovado, já que rollback automatizado não está comprovado;
- DB: confirmar antes da mudança destrutiva se existe backup/snapshot restaurável ou migration compensatória aprovada;
- GitHub: preferir `git revert`; evitar trilhas destrutivas sem autorização extraordinária.

## Stop conditions operacionais recomendadas

Mesmo sem executar nada nesta etapa, as evidências do repo indicam que devemos parar quando:

- o smoke web falhar ou o commit servido não corresponder ao SHA esperado;
- o estado de dependências em `/api/ready` não for aceitável;
- faltar secret obrigatório para Edge ou para snapshot live/drift;
- não houver prova de backup/snapshot restaurável antes de mudança destrutiva em DB;
- a única alternativa proposta para corrigir `main` envolver reset destrutivo sem autorização excepcional;
- o “canário” existir apenas como draft e estiver sendo tratado incorretamente como se já estivesse em produção.

## Conclusão operacional

Hoje o projeto tem uma boa base de rollback web e de auditoria read-only de schema, além de alguns rollback scripts pontuais de banco. O principal gap é que Edge rollback e backup/restore geral de dados do Supabase não estão comprovados no repositório como mecanismos operacionais prontos.

Em resumo:

- web: pronto e comprovado para rollback automatizado;
- Edge: deploy comprovado, rollback não comprovado;
- DB schema: snapshot/drift read-only comprovados;
- DB dados: backup/restore geral não comprovado no repo;
- Git/GitHub: `git revert` comprovado e deve ser a trilha padrão de reversão.

Nenhuma ação mutante foi executada nesta etapa. Nenhum script, config ou migration foi alterado.
