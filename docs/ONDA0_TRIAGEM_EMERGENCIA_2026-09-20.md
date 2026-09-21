# Onda 0 — Triagem de emergência (2026-09-20)

Achados fora do escopo original dos planos DBA (`PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`)
e Engenharia Sênior (`PLANO_ENGENHARIA_SENIOR_50_ETAPAS_2026-09-17.md`), descobertos ao investigar os
4 gates de CI vermelhos em `main` no início da execução exaustiva desses dois planos.

## 1. `RPC availability · staging/production` — `AuthApiError: Database error creating new user`

**Causa raiz confirmada** (postgres_logs, 2026-09-20T09:25Z):
```
insert or update on table "user_roles" violates foreign key constraint "user_roles_user_id_profiles_fkey"
```

`user_roles.user_id` referencia `profiles.user_id` (não `profiles.id` — a tabela tem as duas colunas;
`id` é a PK própria, `user_id` é `UNIQUE` e é a coluna que o resto do app usa para ligar a `auth.users`:
`src/services/authService.ts` busca perfil via `.eq('user_id', userId)`; FKs de `seller_id`/`admin_id`
em outras tabelas também apontam para `profiles.user_id`).

`public.handle_new_user()` (trigger `on_auth_user_created` em `auth.users`) insere a linha em
`public.profiles` mas nunca setava `user_id` — ficava `NULL`. O trigger seguinte
`trg_grant_default_role` → `fn_grant_default_role_on_profile()` (em `public.profiles`, `AFTER INSERT`)
tenta inserir em `user_roles(user_id)` usando `NEW.id`, que não bate com o `user_id` (`NULL`) da linha
recém-criada — a FK rejeita. Os dois triggers rodam na mesma transação do `INSERT` em `auth.users`
(GoTrue chama isso via transação única), então a falha aborta a criação do usuário inteira — **qualquer
signup novo (real ou via dashboard admin) estaria quebrado agora**, não só o teste de CI.

Confirmado ao vivo: 13/13 `profiles` existentes têm `user_id = id`. A migration
`20260511200050_fix_handle_new_user_profiles_id.sql` (11/mai) já setava `user_id` corretamente; uma
reescrita posterior da função (série `20260524204239`/`20260524210000`, focada em corrigir o mapeamento
de role seller→vendedor) reintroduziu o corpo sem a coluna `user_id`. Não há nenhum signup novo desde
`2026-05-17` (antes das edições de 24/05) — o bug nunca foi exercitado por um usuário real até o teste
de CI de hoje.

**Corrigido em:** `supabase/migrations/20260920120000_fix_handle_new_user_missing_profiles_user_id.sql`
(restaura `user_id = NEW.id`, idempotente, com pré/pós-condição). Aguarda aplicação via E15.

## 2. `Dry-run migration drafts` — `PGHOST` não resolve (DNS)

O run de 10:52:57Z falhou com `could not translate host name "***" to address`. Os secrets
`PGDATABASE`/`PGHOST`/`PGPASSWORD`/`PGUSER` do GitHub Actions foram **todos atualizados entre
10:50:49Z e 10:57:14Z hoje** — dentro da janela de rotação confirmada na issue #1807 (fechada às
10:39:57Z, "credencial já foi rotacionada"). O run que falhou (10:52:57Z) caiu bem no meio dessa janela
de atualização — forte indício de que pegou um valor intermediário/incompleto do `PGHOST`, não um erro
de código.

**Status:** provavelmente autorresolvido pela própria conclusão da rotação (10:57:14Z). Não há como eu
confirmar sem disparar o workflow de novo (só roda em PR tocando `qa/migrations-draft/**` ou o script) —
vai ser exercitado naturalmente pelo PR desta sessão. Se continuar falhando após isso, o valor de
`PGHOST` no GitHub precisa ser conferido manualmente pelo PO contra o connection string atual do projeto
(Settings → Database → Connection string, formato `host` puro, sem `postgres://` nem porta).

## 3. `Migrations x Canonical schema` / `db-schema-drift-check` — `column categories.bitrix_id does not exist`

Vermelho desde 2026-09-17 (4 execuções diárias consecutivas antes de hoje) — não é regressão de hoje,
é pré-existente, mas nunca tinha sido diagnosticado (só listado como "causa raiz conhecida, ver E02/E46
do plano DBA" no achado do PR #1866).

**Causa raiz confirmada:** `public.categories.bitrix_id` existe no banco canônico ao vivo (`integer`,
nullable, `UNIQUE` via `categories_bitrix_id_key`), mas nenhuma migration em `supabase/migrations/`
cria essa coluna — é DDL out-of-band, mesma categoria dos achados de `ai_providers.secret_name` e
`zapp_catalog_stats` já tratados nos Pacotes de Aprovação #1/#2. A migration
`20260512000000_bootstrap_missing_application_schemas.sql` seleciona `categories.bitrix_id` assumindo
que já existe; no rebuild do shadow DB (do zero, sem a DDL out-of-band) a coluna nunca tinha sido
criada até ali, e `supabase db diff` quebra com erro de SQL — não com "drift detectado", por isso o gate
fica vermelho de um jeito diferente do que ele foi desenhado pra reportar.

**Corrigido em:** `supabase/migrations/20260511235900_mirror_categories_bitrix_id_out_of_band.sql`
(datada antes de `20260512000000` de propósito, para a ordem do shadow rebuild funcionar; 100% no-op
no canônico via `IF NOT EXISTS`). Aguarda aplicação via E15.

## 4. Engenharia E17 (P0 — issue #1807) — confirmado resolvido

Issue #1807 fechada em 2026-09-20T10:39:57Z: *"Confirmado pelo PO em 2026-09-20: a credencial já foi
rotacionada. Fechando."* Isso resolve o item de maior prioridade do plano de engenharia sênior. A
rotação dos secrets `PG*` do GitHub Actions (ver item 2 acima) é, com alta probabilidade, parte dessa
mesma ação de rotação.

## Notas

- Achados 1 e 3 vão para a fila de aplicação da Onda 2, junto com as 11 ações já validadas dos Pacotes
  de Aprovação #1/#2 — mesmo caminho (`db-apply-migration.yml`), mesma disciplina de um-de-cada-vez com
  post-check.
- Achado 3 é um 3º caso confirmado do mesmo padrão de DDL out-of-band que a REGRA #8/E12 (detector
  semanal) foi criada para pegar — reforça que o detector precisa estar rodando de verdade (ver E46 do
  plano DBA, "2 execuções verdes ainda não comprovadas").
