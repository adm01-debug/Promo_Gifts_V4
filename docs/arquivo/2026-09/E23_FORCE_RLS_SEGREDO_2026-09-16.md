# E23 — FORCE RLS e revogação em tabelas de segredo (2026-09-16)

`[REQUER-PO]`. Migration pronta, não aplicada:
`supabase/migrations/20260916202000_e23_force_rls_secret_tables.sql`.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 494-501).

---

## 1. Estado ao vivo `[RO]`

```sql
SELECT c.relname, c.relforcerowsecurity, c.relowner::regrole::text AS owner,
       (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname='public' AND pp.tablename=c.relname) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('mcp_api_keys','integration_credentials','external_connections','secret_rotation_log','step_up_tokens','user_token_revocations');
```

- `mcp_api_keys`: `relforcerowsecurity=true` — **já em produção**, confirmado, fora do escopo desta migration.
- `integration_credentials`, `external_connections`, `secret_rotation_log`, `step_up_tokens`, `user_token_revocations`: `relforcerowsecurity=false` hoje. Todas têm policies reais (1 a 4 cada, sustentando acesso legítimo do usuário autenticado dono do recurso).
- Todas as 6, incluindo `mcp_api_keys`, são `owner=postgres`.

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('postgres','service_role');
```

Ambas `rolbypassrls=true`. `postgres` **não** é `rolsuper`.

```sql
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee='anon'
  AND table_name IN ('integration_credentials','external_connections','secret_rotation_log','step_up_tokens','user_token_revocations');
-- 0 linhas
```

`anon` já não tem nenhum grant nas 5 tabelas hoje.

---

## 2. Achado central — BYPASSRLS torna FORCE um no-op funcional para os owners atuais

O texto do plano trata `FORCE ROW LEVEL SECURITY` como algo que passa a
sujeitar até o dono da tabela às policies. Isso é verdade **apenas quando o
dono não tem o atributo `BYPASSRLS`**. `BYPASSRLS` é um atributo de role
independente de `rolsuper` que ignora RLS incondicionalmente — com ou sem
`FORCE`. As 6 tabelas são `owner=postgres`, e tanto `postgres` quanto
`service_role` têm `rolbypassrls=true` neste projeto.

**Consequência prática confirmada:** aplicar `FORCE` nas 5 tabelas não muda
o comportamento de nenhum consumidor legítimo hoje. Isso reduz — mas não
elimina — o trabalho de "verificar se alguma SECDEF depende do bypass do
owner": mesmo que dependesse, o bypass continua vindo do atributo do role,
não da ausência de `FORCE`.

---

## 3. Funções SECURITY DEFINER que tocam as 6 tabelas `[RO]`

```sql
SELECT p.proname, p.prosecdef, p.proowner::regrole::text AS owner
FROM pg_proc p
WHERE p.prosrc ~* '(mcp_api_keys|integration_credentials|external_connections|secret_rotation_log|step_up_tokens|user_token_revocations)'
  AND p.pronamespace = 'public'::regnamespace;
```

Das funções encontradas, as que são `prosecdef=true` (as únicas relevantes
para o risco "FORCE quebra o bypass do owner" — funções `SECURITY INVOKER`
já rodam sob o role chamador e a RLS dele, `FORCE` não as afeta) são **todas
`owner=postgres`**: `audit_mcp_api_keys_changes`,
`auto_revoke_orphan_full_keys`, `check_mcp_abuse_threshold`,
`cleanup_expired_step_up`, `cleanup_expired_step_up_tokens`,
`fn_admin_sync_external_connections`, `force_logout_all_users`,
`guard_mcp_api_keys_writes`, `sync_external_connections_from_credentials`
(2 sobrecargas), `trg_auto_revoke_mcp_on_role_loss` — 11 no total.

Nenhuma depende de rodar como um owner sem `BYPASSRLS`: todas herdam o
bypass de `postgres` independentemente de `FORCE`. **Nenhuma das 5 tabelas
precisa ser excluída da migration por esse motivo.**

---

## 4. Edge functions — quais tabelas cada uma toca `[RO, grep]`

```
grep -n 'admin\.from(' supabase/functions/{secrets-manager,mcp-keys-issue,mcp-keys-revoke,mcp-keys-rotate,mcp-keys-update,step-up-verify}/index.ts
```

- `secrets-manager`, `mcp-keys-issue`, `mcp-keys-revoke`, `mcp-keys-rotate`,
  `mcp-keys-update`: todas usam `admin.from(...)` com a `SERVICE_ROLE_KEY`
  (client Supabase autenticado como `service_role`) para tocar
  `integration_credentials`/`external_connections`/`mcp_api_keys` — já
  bypassam RLS pelo atributo do role (`service_role` tem `rolbypassrls=true`),
  não pela ausência de `FORCE`.
- `step-up-verify`: **não** toca `step_up_tokens` diretamente. Grep em
  `.rpc(`/`.from(` mostra que ele chama RPCs (`is_dev`,
  `request_step_up_challenge`, `mark_step_up_password_verified`,
  `verify_step_up_otp`) e escreve apenas em `step_up_audit_log` (tabela
  diferente, fora do escopo desta etapa) via `admin.from(...)`. O acesso a
  `step_up_tokens` acontece dentro do corpo dessas RPCs no Postgres, não
  diretamente do edge function.

Nenhuma via legítima identificada depende da ausência de `FORCE` para
funcionar — todas passam por `service_role` (bypass) ou por RPCs
`SECURITY DEFINER` owned by `postgres` (bypass).

---

## 5. Ação preparada

Uma migration só, para as 5 tabelas (não 6 — `mcp_api_keys` já tem `FORCE`,
não é tocada):

```sql
ALTER TABLE public.integration_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.external_connections    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.secret_rotation_log     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.step_up_tokens          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_token_revocations  FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.integration_credentials FROM anon;
REVOKE ALL ON public.external_connections    FROM anon;
REVOKE ALL ON public.secret_rotation_log     FROM anon;
REVOKE ALL ON public.step_up_tokens          FROM anon;
REVOKE ALL ON public.user_token_revocations  FROM anon;
```

`REVOKE ALL FROM anon` é um no-op sobre o estado atual (§1: `anon` já não
tem nenhum grant) — fecha a porta a um `GRANT` futuro acidental (ex.: um
script de hardening genérico tipo `GRANT SELECT ON ALL TABLES IN SCHEMA
public TO anon` sem exclusão explícita). `authenticated` **não** é tocado —
sustenta acesso legítimo via RPCs `SECURITY INVOKER` que rodam como o
próprio usuário (ex.: `verify_step_up_otp`).

A migration inclui uma precondição que **reconfirma em tempo de apply** que
`postgres`/`service_role` ainda têm `rolbypassrls=true` — se essa premissa
deixar de ser verdade entre a preparação e a aplicação, a migration se
recusa a prosseguir cegamente, porque todo o raciocínio de segurança acima
depende dela.

Migration: `supabase/migrations/20260916202000_e23_force_rls_secret_tables.sql`.
Self-checking completo (pre/postcondition), incluindo checagem de que
`mcp_api_keys` continua com `FORCE` (não deveria ter sido tocada).

---

## 6. Resumo para aprovação

| Item | Tipo | Risco | Reversível |
|---|---|---|---|
| `FORCE ROW LEVEL SECURITY` (5x) | DDL real | Nenhum comportamental hoje (postgres/service_role têm bypassrls) — defesa em profundidade/postura documentada | Sim, `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` |
| `REVOKE ALL ... FROM anon` (5x) | DDL real | Nenhum — no-op sobre estado atual, fecha porta a grant futuro acidental | Sim, `GRANT` de volta se necessário |
| `mcp_api_keys` | Não tocada | N/A | N/A |

Responda "aprovado" para aplicar a migration
`20260916202000_e23_force_rls_secret_tables.sql` inteira.
