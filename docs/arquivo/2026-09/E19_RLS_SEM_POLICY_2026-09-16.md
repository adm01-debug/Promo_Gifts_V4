# E19 — As 2 tabelas com RLS sem policy (2026-09-16)

`[REQUER-PO]`. Migration pronta, não aplicada:
`supabase/migrations/20260916201000_e19_comment_rls_deny_intentional.sql`.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 458-464).
Achado espelhado em `docs/SCHEMA_REFERENCE.md` §3 P5.

---

## 1. Estado ao vivo `[RO]`

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname='public' AND pp.tablename=c.relname) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('magazine_duplicate_requests','anon_catalog_grant_audit_log');
```

Ambas: `relrowsecurity=true`, `relforcerowsecurity=false`, `policy_count=0`.

```sql
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('magazine_duplicate_requests','anon_catalog_grant_audit_log')
  AND grantee IN ('anon','authenticated');
-- 0 linhas
```

Sem policy e sem GRANT a `anon`/`authenticated`: hoje só `service_role` e
funções `SECURITY DEFINER` (que rodam como o owner `postgres`, role com
`rolbypassrls=true`) conseguem ler/escrever nestas duas tabelas. É o padrão
"deny-all" — mas o Postgres/Supabase advisor não distingue "deny-all
intencional" de "RLS ligada e esquecida sem policy", por isso a etapa E19
pede uma decisão explícita e documentada, não uma suposição.

---

## 2. `magazine_duplicate_requests` — decisão: INTENCIONAL

Grep em `src/` e `supabase/functions/` por `magazine_duplicate_requests`: zero
consumidores diretos (só a referência esperada em `types.ts` gerado).

```sql
SELECT p.proname, p.prosecdef, p.proowner::regrole::text AS owner,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p WHERE p.proname = 'magazine_duplicate_v2';
```

`magazine_duplicate_v2(...)` é `SECURITY DEFINER`, owner `postgres`. Lendo
`pg_get_functiondef`, o corpo faz `SELECT`/`INSERT` diretamente em
`magazine_duplicate_requests` como chave de idempotência
(`actor_id + idempotency_key`) — evita duplicar a mesma requisição de
duplicação de revista se o cliente reenviar. A tabela nunca é exposta em
`SELECT` direto ao cliente: só o resultado transformado (`jsonb`) da função
volta pela API. `anon` **não** tem `EXECUTE` nesta função — só
`authenticated`, e o corpo da função exige `auth.uid()` (`RAISE EXCEPTION
'magazine_auth_required'` caso contrário).

**Conclusão:** deny-all é o comportamento desejado. A única via de acesso
(SECDEF explícito, com seu próprio controle de autenticação) já está
documentada e é auditável.

---

## 3. `anon_catalog_grant_audit_log` — decisão: INTENCIONAL

Grep em `src/` e `supabase/functions/` por `anon_catalog_grant_audit_log`:
zero consumidores (nem sequer referência em types gerados além da própria
definição da tabela).

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE command ~* 'fn_anon_catalog_grant_audit_run' OR jobname ~* 'anon_catalog|catalog_grant';
```

Resultado: job `303 / anon-catalog-grant-audit-6h / 0 */6 * * * /
SELECT public.fn_anon_catalog_grant_audit_run()` — **ativo**.
`fn_anon_catalog_grant_audit_run()` é `SECURITY DEFINER`, owner `postgres`;
seu corpo grava o resultado de `fn_verify_anon_catalog_grants()` nesta
tabela — é o próprio mecanismo que monitora ao longo do tempo o achado
P1/E22 (garantir que `anon` continua sem GRANT de escrita indevido). Não é
uma feature morta: é a trilha de auditoria de outro controle de segurança já
em produção, rodando a cada 6h.

**Conclusão:** deny-all é o comportamento desejado — é um log de auditoria
interno, não deveria ser lido por ninguém além de quem investiga um
incidente (via `service_role`/painel Supabase).

---

## 4. Ação preparada

`COMMENT ON TABLE` para as duas tabelas, registrando a decisão e a evidência
resumida diretamente no catálogo (visível a qualquer DBA futuro que rode
`\d+` ou consulte `pg_description`) — não muda comportamento de acesso, já
que RLS sem policy já nega tudo por padrão a não-owner/não-bypassrls.

Migration: `supabase/migrations/20260916201000_e19_comment_rls_deny_intentional.sql`.
Self-checking: precondition confirma que nenhuma das duas ganhou policy desde
este levantamento; postcondition confirma que o comentário foi gravado e que
RLS continua ligada (nenhuma regressão de segurança).

### Allowlist nova — `.security/rls-no-policy-allowlist.json`

Não existia nenhuma allowlist geral para "RLS habilitada sem policy" no
repo antes desta etapa (busca por `*rls-no-policy*` e por `rls_enabled_no_policy`
em `.security/` não encontrou nada). Criei
`.security/rls-no-policy-allowlist.json` com as 2 entradas desta etapa,
seguindo o mesmo formato de `.security/secdef-anon-allowlist.json`
(`{table, reason, secdef_fn, cron_job}`). Diferente do
`secdef-anon-allowlist.json`, **não há hoje nenhum script de CI que leia este
arquivo** — é um artefato novo para consulta humana e para uma futura gate
(`check-rls-no-policy-drift.mjs`, análogo ao script de SECDEF) poder ser
construída em cima dele. Ficou fora do escopo desta etapa escrever esse
script; documentado aqui para não se perder.

---

## 5. Opção complementar (não incluída nesta migration): silenciar o lint `rls_enabled_no_policy`

O `COMMENT ON TABLE` acima documenta a intenção, mas **não** faz o advisor de
lint do Supabase (`rls_enabled_no_policy`) parar de reportar as duas tabelas
— esse lint olha só para `relrowsecurity=true AND policy_count=0`, não para
`pg_description`. Existe uma migration já escrita no repo para isso,
**nunca aplicada**: `supabase/migrations/20260716000055_dynamic_explicit_deny_rls_no_policy_tables.sql`
— um `DO` dinâmico que varre `pg_policies` em tempo de apply e adiciona uma
policy `RESTRICTIVE ... USING (false)` chamada `internal_deny_direct_access`
em qualquer tabela RLS-sem-policy encontrada naquele momento (confirmado via
`SELECT count(*) FROM pg_policies WHERE policyname='internal_deny_direct_access'`
= 0 — nunca rodou).

Não resssuscito essa migration dinâmica nesta etapa (ela varre "qualquer
tabela futura", o que é mais difícil de auditar/revisar que uma lista
nomeada) nem escrevo uma versão escopada equivalente — o pedido desta etapa
era especificamente `COMMENT ON TABLE` + allowlist. Deixo registrado como
opção: se o PO quiser também silenciar o lint do advisor, aplicar a
`20260716000055` existente (ou uma versão nova escopada só a estas 2
tabelas) é uma decisão separada e independente desta migration.

---

## 6. Resumo para aprovação

| Item | Tipo | Risco | Reversível |
|---|---|---|---|
| `COMMENT ON TABLE` (2x, migration nova) | DDL real (metadado) | Nenhum — não muda RLS/policy/grant | Sim, `COMMENT ON TABLE ... IS NULL` |
| `.security/rls-no-policy-allowlist.json` (novo arquivo) | Doc/config, sem DDL | Nenhum | Sim, é só arquivo |
| Aplicar `20260716000055` (opcional, não incluído) | DDL real, fora desta migration | Baixo — RESTRICTIVE `USING (false)` não muda acesso hoje (já é deny-all), só silencia o lint | Sim, `DROP POLICY` |

Responda "aprovado" para aplicar a migration
`20260916201000_e19_comment_rls_deny_intentional.sql`, e decida
separadamente sobre a opção complementar do §5.
