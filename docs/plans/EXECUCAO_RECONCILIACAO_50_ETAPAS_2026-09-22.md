# Execução controlada do plano de reconciliação — 22/09/2026

**Alvo único:** Supabase `doufsxqlfjyuvxuezpln`; GitHub `adm01-debug/Promo_Gifts_V4`; produção `www.promogifts.com.br`.

**Método:** simulações locais e consultas somente leitura no banco; nenhuma DDL, reparo de ledger, exclusão, deploy de Edge ou alteração de settings foi executada.
**Veredito:** **NÃO ALINHADO**. Este relatório não transforma a ausência de erro HTTP, o build local ou uma migration versionada em prova de aplicação no banco.

## Manifesto de linha de base

| Fonte | Identificador verificado | Evidência |
|---|---|---|
| Branch local de trabalho | `codex/reconcile-local-github-supabase-20260922` | merge semântico `a87f871e0`, preservando comentários de rollback nos dois conflitos; alterações adicionais ainda dependem do PR desta rodada |
| GitHub `main` | `12c11e5dd73056a30dfa023280a77427400a7d34` | `git ls-remote`, `gh pr view 1869`; PR #1869 mergeada em 22/09 11:10:16Z |
| Deployment Production | `12c11e5dd73056a30dfa023280a77427400a7d34` | GitHub deployment `6589271611` com status `success`; `/api/health` retorna esse SHA |
| Banco canônico | PostgreSQL 17.6; 397 tabelas públicas, 193 views comuns, 15 enums | Management SQL read-only / `pg_catalog`, 22/09/2026 |
| CLI/ledger | 2.499 versões coincidentes, 474 somente locais, 2 somente remotas | `supabase migration list --linked --output-format json`; **não** executar `db push` |

CLI local: `2.115.0`. A worktree inicial estava limpa exceto pelo plano novo ainda não rastreado; a branch inicial era `claude/exec-plano-50-etapas-20260920` em `30e6e4501`. O merge local ocorreu em branch nova para preservar essa referência; o relatório foi revisado pelo Codex nesta sessão.

O ruleset ativo de `main` é `Protect main` (`16764622`), com `required_status_checks` e `pull_request`; foi observada exigência de `Gate Final - Deploy Ready`, mas não foi feito ensaio de bloqueio de merge com PR de teste. As 474 versões locais **não** significam 474 DDLs pendentes.

## Simulações e testes executados

1. **Merge concorrente:** `main` já continha a PR #1869; o merge local teve duas colisões add/add de migrations. O SQL executável era igual; foram preservados os comentários de rollback da branch local. Nenhum arquivo histórico foi reescrito para manipular o ledger.
2. **Tipos gerados:** `supabase gen types typescript --project-id doufsxqlfjyuvxuezpln --schema public,graphql_public` foi gerado primeiro em `/tmp`, comparado e depois incorporado. O `types.ts` controlado ficou byte a byte igual ao gerado, com 96 linhas adicionais e nenhuma remoção: `quote_items.product_variant_id`, oito relações FK, `set_custom_kit_pinned` e `zapp_catalog_stats`. O consumidor de pin do Kit Maker deixou de usar cast manual da RPC.
3. **Falhas do advisor:** testes simulam `404`, `401`, timeout, JSON inválido, projeto errado, novo `ERROR` e falha de gate `pg_catalog`. O endpoint atual `/advisors/security` respondeu `200` ao vivo; o endpoint antigo `/database/lint` não foi tratado como sucesso quando retorna `404`.
4. **Advisor ao vivo:** 633 findings: 8 `ERROR` em views públicas intencionalmente owner-context, 623 `WARN` e 2 `INFO`. As oito views têm comentário de intenção no catálogo e passam no gate existente de colunas públicas. **Três colunas de `v_products_public` ainda estão classificadas `REQUER-PO`** (`ncm_code`, `ncm_id`, `bitrix_product_id`). Os 623 WARN **não** foram aprovados em bloco: 94 SECDEF para authenticated, 11 para anon, 59 tabelas GraphQL para anon, 457 para authenticated e 2 materialized views expostas. Os gates de catálogo passaram: lint 0011=0, lint 0029=94 allowlisted, SECDEF anon=11 allowlisted, GRANT de escrita anon=0, oito views públicas sem drift de colunas.
5. **Regressão local:** 34 testes direcionados passaram (ledger, types inventory, linter e persistência Kit Maker); `tsc --noEmit -p tsconfig.app.json` e `npm run build` passaram. O build ainda emite avisos de import dinâmico ineficaz; não foram confundidos com erro funcional.
6. **Produção somente leitura:** `/api/health`, `/api/ready`, `/montar-kit` e `/magazine` responderam `200` em 22/09. `/api/ready` reportou `config`, `auth` e `postgrest` como `ok`. Isso prova disponibilidade de rota, **não** o happy path autenticado ou paridade visual.

## Diferenças reais e bloqueios

| Prioridade | Objeto/versão | Estado observado no canônico | Decisão necessária |
|---|---|---|---|
| P0 | `20260920120000_fix_handle_new_user_missing_profiles_user_id.sql` / `public.handle_new_user()` | corpo vivo **não** preenche `user_id`; a coluna é nullable e não tem default, não há trigger `BEFORE INSERT` que a preencha; os triggers `auth.on_auth_user_created` e `profiles.trg_grant_default_role` estão habilitados, e `user_roles.user_id → profiles.user_id`. Os 13 profiles atuais têm `user_id=id`, mas o caminho novo tenta criar a role com `NEW.id` quando o profile recém-inserido teria `user_id=NULL`; a FK aborta o cadastro. A correção local não consta do ledger remoto. | Aprovar **esta versão e esta função** após revisão de pré-condições; testar cadastro sintético em janela controlada e verificar ledger. O comentário da migration dizendo “aplicado” contradiz o catálogo atual. |
| P0 | `20260917060000_e18_revoke_authenticated_mcp_kv_get.sql` / `public.mcp_kv_get(text,text)` | `authenticated` ainda tem `EXECUTE`. | Aprovar ou rejeitar o `REVOKE` específico após conferir consumidores; não presumir aplicação pelo arquivo existente. |
| P0 | `20260917061500_e18_revoke_authenticated_authz_gaps.sql` / quatro RPCs | `authenticated` ainda tem `EXECUTE` em `confirm_notifications_dispatched`, `registrar_entrada_estoque`, `registrar_saida_estoque` e `fn_notify_user`. | Decisão por **cada grant/função**, validando que consumidores legítimos continuam com `service_role` quando aplicável. |
| P1 | `20260916202000_e23_force_rls_secret_tables.sql` | `public.integration_credentials.relforcerowsecurity=false`; migration local-only. | Revisar as cinco tabelas alvo e o impacto em jobs antes de aprovar DDL/grants. |
| P1 | `20260916211500_e30_ops_table_size_history.sql`, `20260917150000_e40_ops_pgss_history.sql`, `20260917160000_e33_ops_wraparound_monitor.sql` | `ops.table_size_history`, `ops.pgss_history` e `ops.wraparound_monitor_log` não existem. | Autorizar cada objeto/job separadamente, ou aceitar ausência dos monitores. |
| P1 | `20260917070000_e38_unschedule_dead_cron_jobs.sql` | cron `pipeline-classify-categories` ainda existe. | Confirmar intenção operacional e autorizar `unschedule` específico; não remover jobs sem decisão. |
| P1 | `20260916155725` remoto-only + mirror local `20260916210000` | `zapp_catalog_stats()` vivo já possui `price_min/max`, `top_colors`, `top_materials`; hash do corpo vivo `2c167d8e4f99943f312a58e48ac9a70de40c59907e84e2c67221fa84f0f84fc4`. | Decidir como registrar proveniência sem reaplicar DDL já vivo. |
| P1 | `20260712` remoto-only aparente | ledger registra `fix_rls_policies_critical`; existem dois arquivos locais com prefixo `20260712`, causando colisão da CLI. | Identificar conteúdo/recibo antes de qualquer reparo de metadados; não renomear migration histórica às cegas. |
| P1 | `SCHEMA_DRIFT.sql` | replay **não calculado** porque ledger diverge (2.499/474/2). Snapshot novo declara explicitamente `computed:false`. | Resolver classificação/replay em clone; até lá, não afirmar “zero drift”. |

Além desses alvos, **20 IDs** local-only estavam fora da classificação de 16/09, incluindo dois IDs com dois arquivos (`20260620000001`, `20260623130000`). A tabela acima cobre os casos com diferença viva demonstrada nesta rodada; os demais continuam **indeterminados**, não “pendentes de aplicar”. Inventário completo de IDs no plano-fonte, etapa 19. O dump `SCHEMA_LIVE.sql` cobre apenas `public`; `auth`, `storage`, `ops` e demais schemas requerem auditoria própria antes de certificado global.

## Artefatos locais preparados

- `src/integrations/supabase/types.ts`: atualização gerada do canônico, validada sem remoção de entidades.
- `src/hooks/kit-builder/useCustomKitPersistence.ts`: chamada RPC tipada.
- `.github/workflows/regenerate-supabase-types.yml` e `package.json`: geração consistente de `public,graphql_public`; o comando local escreve em arquivo temporário antes de substituir types.
- `scripts/check-supabase-linter.mjs`, `.github/workflows/supabase-linter-gate.yml` e testes: advisor atual + cinco gates live, fail-closed para acesso/erro não revisado/projeto errado.
- `scripts/export-schema-snapshot.mjs` e `supabase/migrations-snapshot/*`: snapshot vivo atualizado; drift não calculado é explícito; `ALL_IN_ONE.sql` contém 3.006 arquivos para **auditoria**, jamais aplicação direta.

## Estado das 50 etapas

**Concluídas com evidência nesta rodada:** 01, 03, 07, 09, 12, 35, 36, 38, 45, 47.

**Parciais/inconclusivas:** 02, 04–06, 08, 10–11, 13–23, 26–34, 37, 39–44, 46, 48–49. O snapshot foi regenerado, mas a etapa 30 fica aberta até o fechamento semântico da 29; os testes de orçamento da 37 ainda exigem contrato específico de variante.

**Dependem de autorização granular de produção:** 24–25.
**Veredito emitido, mas aceite final não satisfeito:** 50, porque há diferenças reais e etapas abertas.

**Próxima ordem segura:** revisar e aprovar/rejeitar individualmente os objetos P0 acima; executar pelo workflow controlado E15 com preflight e rollback documentado; validar ledger, grants/RLS e signup; depois resolver as divergências P1 e repetir comparação bidirecional. Não há base técnica para marcar 50/50 ou “10/10” hoje.
