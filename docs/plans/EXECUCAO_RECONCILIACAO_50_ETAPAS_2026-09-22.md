# Execução controlada do plano de reconciliação — 22/09/2026

**Alvo único:** Supabase `doufsxqlfjyuvxuezpln`; GitHub `adm01-debug/Promo_Gifts_V4`; produção `www.promogifts.com.br`.

**Método:** simulações locais e consultas somente leitura no banco; nenhuma DDL, reparo de ledger, exclusão, deploy de Edge ou alteração de settings foi executada.
**Veredito:** **NÃO ALINHADO**. Este relatório não transforma a ausência de erro HTTP, o build local ou uma migration versionada em prova de aplicação no banco.

**Decisão posterior do PO:** a proposta `20260922170000` foi explicitamente aprovada e promovida ao diretório de migrations, sem mudança no SQL executável. A PR #1872 já está mergeada. Aplicação canônica ainda pendente do gate de reviewer do environment Production; ver [pacote de aplicação](../db/APLICACAO_SIGNUP_20260922170000.md). A aprovação da migration não é um recibo de execução.

**Atualização de publicação, 15:47 UTC:** o PO `adm01-debug` mergeou a PR #1870 às 15:30:58 UTC, gerando `bb59efcd7e1a989066f06c87aba542213a258538`. `/api/health` já retorna esse SHA e `/api/ready` retorna `ready`. A continuação desta sessão foi portada por cherry-pick de seu único commit novo para `codex/signup-safe-reconciliation-20260922`, criada sobre essa `main`, sem reaplicar o conteúdo do squash. As referências a PR não mergeada/SHA anterior abaixo descrevem a coleta anterior e não o estado mais recente. O banco permanece sem a correção de cadastro.

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

**Governança E15:** a leitura de `repos/adm01-debug/Promo_Gifts_V4/environments/production` mostrou `protection_rules: []`. Portanto o environment `Production` **não exigia reviewer**, apesar do comentário do workflow E15 afirmar que essa proteção seria configurada. Foi preparado um preflight fail-closed no workflow: se não existir regra `required_reviewers` com ao menos um reviewer, nenhum job de aplicação será iniciado. Configurar o reviewer continua sendo ação externa pendente do PO; não houve despacho do workflow.

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

**Próxima ordem segura:** não aplicar isoladamente a versão `20260920120000`: a simulação adicional abaixo encontrou concessão de privilégios por metadata. Revisar a proposta substituta e aprovar/rejeitar individualmente os demais objetos P0; executar pelo workflow controlado E15 com preflight e rollback documentado; validar ledger, grants/RLS e signup; depois resolver as divergências P1 e repetir comparação bidirecional. Não há base técnica para marcar 50/50 ou “10/10” hoje.

### Resultado da PR #1870

A branch foi publicada em [PR #1870](https://github.com/adm01-debug/Promo_Gifts_V4/pull/1870), sem merge. O gate de base64 sinalizou apenas dois literais SQL já existentes dentro de `ALL_IN_ONE.sql`, artefato gerado por concatenação; a correção limita a exceção **somente** a esse arquivo e mantém o scan dos SQLs de origem. Já os gates **“Recibo de migration”** (12 arquivos herdados da branch local sem recibo de aplicação) e **“Migrations x Canonical schema”** (474/2 no ledger) falharam por divergências reais. Essas falhas permanecem bloqueantes; criar recibos fictícios, mudar o comparador para sucesso ou usar bypass não é remediação.

O preview Vercel desta PR também ficou `ERROR`: a API do deployment `dpl_DopAcFkS4pNeosaBgPDo1ERPmnBt` informa `BUILD_FAILED` / `Resource provisioning failed`, sem eventos de build recuperáveis. O `npm run build` local passou; logo, esta falha **não demonstra** regressão do código, mas o preview não está validado. Não houve tentativa repetida de deploy com risco de quota/custo. A produção permanece no SHA anterior `12c11e5dd`.

## Continuação: simulação de cadastro e remediação do CI (22/09, 15:44 UTC)

### Falha real do teste de qualidade

No SHA `29e3aab9e`, a PR apresentou 89 checks aprovados, quatro falhas, dois neutros e cinco skips. O job `quality-gate` da run `35744750514` executou **24.080 testes aprovados, 1 falha e 1.138 skips**. A única falha foi a expectativa fixa de 241 scripts em `package.json`, cujo catálogo já tem 247. Não é falha de runtime: o contrato de unicidade não exige cardinalidade fixa.

O teste foi substituído por mutações do catálogo real: introduzir uma duplicata de uma chave do início, meio e fim deve falhar, independentemente do crescimento legítimo do catálogo. O teste que exige zero duplicatas no arquivo real permanece. Não houve alteração de snapshot, bypass ou redução de um gate.

### Simulação PostgreSQL 17, sem escrita no Supabase

Foi criado `scripts/simulate-signup-migration.mjs`. Cada execução usa um container com nome UUID exclusivo, **rede desabilitada, sem porta publicada, sem volume de dados do host e com dados em tmpfs**. Só esse container é removido ao final. O modo `--live-readonly` lê oito definições pela Management API read-only e as executa exclusivamente no fixture local.

Esta é uma simulação com quatro tabelas mínimas, a FK `user_roles.user_id → profiles.user_id` e os **seis triggers não internos** observados ao vivo em `auth.users`, `profiles`, `user_roles` e `seller_discount_limits`. Além de `handle_new_user` e `fn_grant_default_role_on_profile`, são carregadas as funções de sincronização de papéis, mapeamento enum/perfil, inicialização do limite de desconto e atualização de timestamps. **Não** é clone completo, teste GoTrue, RLS integral ou teste E2E da Edge administrativa. Esses limites continuam abertos na etapa 39.

Resultados:

- Função viva original: cadastro falha pela FK; nenhuma linha parcial permanece.
- Migration original `20260920120000`: cadastro normal passa, defaults/metadados são preservados e rollback não deixa profile/role parcial.
- **Falha de segurança reproduzida:** após essa migration, metadata `role=admin` gera papel `admin`; `role=manager` gera `coordenador`. O simulador retorna **exit 1**, não sucesso, nesse cenário.
- Configuração Auth consultada em 22/09: `disable_signup=true`, `external_email_enabled=true`, `external_google_enabled=false`. Portanto o achado acima é **risco latente do caminho de cadastro**, não prova de exploração pública ou incidente. Não foram criadas contas reais nem alterados providers.
- A versão antiga é protegida contra reaplicação por pré-condição, **não** idempotente/reentrante como sugere seu comentário. A segunda execução falhou conforme esperado.

Definições vivas inspecionadas (SHA-256 de `pg_get_functiondef`):

- `handle_new_user`: `7c57f33155307becbdcb8b20a7f9f80e51479e3e96c69be56b75965ebdfa884a`.
- `fn_grant_default_role_on_profile`: `13ffc31def3de66b4ba650670dce4bf351f73524bc9c536c4c5d325afc5cffc1`.

### Proposta substituta preparada — NÃO aplicada

SQL exato: [20260922170000_signup_identity_safe_default.sql](../db/proposals/20260922170000_signup_identity_safe_default.sql). SHA-256: `eb34eec2213709efdca288933d7214deb5b2c4d343c5fcb68740377586dcdb78`.

O arquivo fica **fora de `supabase/migrations`**, para não entrar em aplicação automática ou aparentar recibo de aplicação. Substitui a proposta anterior; não aplicar as duas. Altera somente `public.handle_new_user()`: define `profiles.user_id=NEW.id` e usa papel inicial `sales` (convertido a `vendedor` pelo trigger existente), sem confiar em `raw_user_meta_data.role`. Não muda contas existentes, grants, triggers, policies ou schema das tabelas.

O consumidor `supabase/functions/manage-users/index.ts` cria o usuário com apenas `full_name` nos metadados e atribui o papel separadamente depois da autorização administrativa. Essa compatibilidade foi inspecionada no código; seu E2E não foi executado.

Com `--hardened-proposal`, passaram: cadastro normal, metadata nula/inválida, fallback de nome, preservação de department/preferences, identidade duplicada, rollback, rejeição de `admin`/`manager` não confiáveis, rejeição de reaplicação, detecção de mudança concorrente no corpo da função, trigger desabilitado e rollback do próprio `CREATE OR REPLACE` quando a pós-condição falha. Uma atribuição privilegiada explícita no fixture continua possível e sincroniza `profiles.role`; o limite de desconto inicial permanece zero para os cinco vendedores sintéticos. Isso **não** certifica a autorização da Edge.

Reprodução offline:

```bash
node scripts/simulate-signup-migration.mjs
# esperado: exit 1, demonstra risco da migration original
node scripts/simulate-signup-migration.mjs --hardened-proposal
# esperado: exit 0, proposta passa o fixture reduzido
```

O pacote ainda exige aprovação da **versão substituta**, recoleta dos triggers na janela (o encadeamento observado foi simulado), preservação da definição anterior e teste administrativo controlado na aplicação. Não houve reparo de ledger nem DDL canônica. A nova branch preserva também a referência antiga `codex/reconcile-local-github-supabase-20260922`; nenhuma branch/worktree de outro agente foi descartada.

### Endurecimento do executor E15

- Input `version` passa por variável de ambiente e validação antes do uso; não é interpolado diretamente no shell.
- Preflight e repair usam o project ref canônico fixo, não um secret que pode apontar a outro projeto.
- Antes de `psql`, um guard exige PG* completos, database `postgres`, porta conhecida e host canônico direto, ou pooler Supabase com project ref no usuário. Diagnósticos não imprimem valores de secrets.
- `psql` exige TLS; o job de aplicação recebe apenas `contents:read` no GitHub.
- O requisito anterior de reviewer permanece. Nova leitura do environment `Production` retornou `protection_rules: []`; settings não foram modificados e workflow não foi disparado.

As etapas 22/23/40/48 avançaram, mas continuam parciais: esta rodada não transforma 474 versões sem ledger em aplicadas, não cria recibos fictícios e não certifica 50/50.

**Validação local da continuação:** 44 testes passaram em três arquivos (unicidade de scripts, preflight e validação do executor/target); `lint:baseline` passou com zero erros e zero warnings; Gate 0/SSOT e `git diff --check` passaram. O simulador da proposta passou tanto com o snapshot quanto com as oito definições recolhidas ao vivo por leitura. Nenhuma destas aprovações locais substitui a nova execução remota de CI ou validação do deployment.
