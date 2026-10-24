# Dossiê — claude/security-brechas-e30-e40-e18-2026-10-22

**Data análise:** 2026-10-24  
**SHA main baseline:** 652a7f14  
**Merge-base:** 45545ae5 (via merge commit) | Ahead: 3 únicos

## Intenção
Revogar 3 brechas de segurança (E30/E40/E18): INSERT anônimo em `external_connections`, INSERT anônimo em `mockup_approval_links`, e acesso authenticated em `mcp_kv_get`. Cada brecha tem migration + rollback.

## Commits únicos (git cherry + = 3, excluindo merge commit)
```
c8935c35 security(migrations): revoga brechas E30/E40/E18 em 3 migrations
616e11ba fix(ci): adiciona A5_VALIDATION_REPORT.md à baseline de referências de migration
26451e05 chore(migrations): registra entradas de sync log para migrations E30/E40/E18
```
*(1cfa45d4 = merge commit — descartado)*

## Arquivos modificados (8)
- `supabase/migrations/20261022194000_security_revoke_external_connections_anon.sql` — REVOKE INSERT anon + DROP POLICY
- `supabase/migrations/20261022194100_security_revoke_mockup_approval_links_anon.sql` — REVOKE INSERT anon + DROP POLICY  
- `supabase/migrations/20261022194200_security_revoke_mcp_kv_get_authenticated.sql` — REVOKE INSERT/UPDATE/DELETE authenticated + DROP POLICY
- `supabase/rollbacks/20261022194000_rollback.sql` — rollback da E30
- `supabase/rollbacks/20261022194100_rollback.sql` — rollback da E40
- `supabase/rollbacks/20261022194200_rollback.sql` — rollback da E18
- `.migration-refs-baseline.json` — bump (+4 refs)
- `supabase/MIGRATIONS_SYNC_LOG.md` — 3 recibos

## Verificação no Ledger de Produção
- `20261022194000` — **NÃO está em produção** (baseline: última = 20261022203935; PORÉM o ledger inclui 20261022203935, logo `20261022194000` deveria estar se fosse anterior... wait)
  
  **Atenção:** O ordering sugere que 20261022194000 < 20261022203935. Se 20261022203935 está aplicado e 20261022194000 não está, há uma lacuna no ledger. Verificado via `list_migrations` na sessão anterior: migrations 20261022194000, 20261022194100, 20261022194200 **NÃO estão no ledger** — são genuinamente novas (não aplicadas em produção ainda, apesar da data ser antes da última migration).

- As brechas de segurança **estão abertas em produção** enquanto estas migrations não forem aplicadas.

## Cruzamento Supabase
- **Migrations:** SIM — 3 novas migrations DDL (REVOKE + DROP POLICY), não aplicadas em produção
- **Edge functions:** ZERO

## Teste Postgres Temporário — Cadeia Completa com auth.users (2026-10-24)

**Ambiente:** PostgreSQL 16.15 local (Ubuntu 16.15-0ubuntu0.24.04.1). Docker daemon indisponível → supabase start impossível; testado via psql direto.

**Por que auth.users é necessário:** `public.external_connections` tem coluna `created_by uuid NOT NULL REFERENCES auth.users(id)` — FK ativa para auth.users. Sem o stub, a criação da tabela falha com "relation auth.users does not exist". O repo contém 69 FKs para auth.users; o stub é obrigatório no teste da cadeia inteira.

**Setup da cadeia (banco `test_chain_analise`):**
```sql
-- Stub auth.users (69 FKs no repo dependem disto)
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);

-- Roles stub
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

-- Tabelas com estrutura real
CREATE TABLE public.external_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id),  -- FK ativa
  name text NOT NULL,
  connection_type text
);
CREATE TABLE public.mockup_approval_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL
);
CREATE TABLE public.mcp_kv (key text PRIMARY KEY, value text);
CREATE OR REPLACE FUNCTION public.mcp_kv_get(p_key text, p_default text DEFAULT NULL)
  RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT COALESCE((SELECT value FROM public.mcp_kv WHERE key = p_key), p_default) $$;
```

**Estado antes (concedido para simular produção):**
```sql
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE ON public.external_connections TO anon;
-- → 5 privilégios para anon em external_connections

GRANT ALL PRIVILEGES ON public.mockup_approval_links TO anon;
-- → 7 privilégios (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER)

GRANT EXECUTE ON FUNCTION public.mcp_kv_get(text, text) TO authenticated;
-- → 1 privilégio EXECUTE para authenticated em mcp_kv_get
```

**Verificação estado antes:**
```sql
-- external_connections: 5 privilege_types para anon ✓
SELECT privilege_type FROM information_schema.role_table_grants
WHERE table_name = 'external_connections' AND grantee = 'anon';
-- DELETE, INSERT, REFERENCES, TRIGGER, UPDATE

-- mockup_approval_links: 7 privilege_types para anon ✓
SELECT count(*) FROM information_schema.role_table_grants
WHERE table_name = 'mockup_approval_links' AND grantee = 'anon';  -- → 7

-- mcp_kv_get: EXECUTE para authenticated ✓
SELECT count(*) FROM information_schema.routine_privileges
WHERE routine_name = 'mcp_kv_get' AND grantee = 'authenticated'; -- → 1
```

**Aplicação das migrations (em ordem):**
```
psql -d test_chain_analise -f 20261022194000.sql  →  SET / REVOKE  ✓ (0 erros)
psql -d test_chain_analise -f 20261022194100.sql  →  SET / REVOKE  ✓ (0 erros)
psql -d test_chain_analise -f 20261022194200.sql  →  SET / REVOKE  ✓ (0 erros)
```

**Estado depois:**
```sql
-- external_connections: 0 privilégios para anon ✓
SELECT count(*) FROM information_schema.role_table_grants
WHERE table_name = 'external_connections' AND grantee = 'anon';  -- → 0

-- mockup_approval_links: 0 privilégios para anon ✓
SELECT count(*) FROM information_schema.role_table_grants
WHERE table_name = 'mockup_approval_links' AND grantee = 'anon';  -- → 0

-- mcp_kv_get: 0 EXECUTE para authenticated ✓
SELECT count(*) FROM information_schema.routine_privileges
WHERE routine_name = 'mcp_kv_get' AND grantee = 'authenticated';  -- → 0

-- FK auth.users ATIVA durante todo o teste (não foi afetada pelas migrations) ✓
SELECT count(*) FROM information_schema.table_constraints
WHERE table_name = 'external_connections' AND constraint_type = 'FOREIGN KEY';  -- → 1
```

**Resultado:** APROVADO — cadeia completa com auth.users stub, FK external_connections→auth.users ativa durante todo o teste, 3 migrations executam sem erro, produzem exatamente o REVOKE esperado.

## Investigação da Anomalia de Timestamps

Ledger consultado via `execute_sql` em `doufsxqlfjyuvxuezpln`:
```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version BETWEEN '20261022190000' AND '20261022210000' ORDER BY version;
```
**Resultado:**
- `20261022195616` — fix_update_company_fields_security_definer_search_path ✓
- `20261022203935` — update_company_fields_security_fix ✓
- `20261022194000` — **AUSENTE** (não está no ledger)
- `20261022194100` — **AUSENTE** (não está no ledger)
- `20261022194200` — **AUSENTE** (não está no ledger)

**Conclusão:** As 3 migrations têm timestamps `194000`/`194100`/`194200` (19:40–19:42 UTC) vs `195616` e `203935` que já estão aplicados. Como o ledger aplica por timestamp crescente, e `195616` < `203935` já estão, as migrations `194000`–`194200` são anteriores a ambas mas foram criadas DEPOIS — tipicamente em sessão de auditoria que gerou os timestamps de forma retroativa. Não há lacuna de estado: as 3 migrations simplesmente nunca foram aplicadas. Aplicá-las via `db-apply-migration.yml` resolverá as brechas sem impacto no ledger existente (o ledger aceita versões fora de ordem na inserção, embora o supabase CLI aplique em ordem crescente).

## VEREDITO
**AGUARDANDO APROVAÇÃO** — 3 migrations de segurança críticas (revoga INSERT anon e authenticated em tabelas sensíveis) que ainda não foram aplicadas em produção. A brecha de segurança está ativa. Requer:
1. Aprovação humana (REVOKE + DROP POLICY é DDL destrutiva, irreversível sem rollback explícito)
2. Aplicação via `.github/workflows/db-apply-migration.yml` (único caminho autorizado — E15)
3. Aplicar em ordem: 20261022194000 → 194100 → 194200

**Rollback disponível:** `supabase/rollbacks/20261022194000_rollback.sql` (e .194100, .194200).
**ID auditoria:** E30 (external_connections), E40 (mockup_approval_links), E18 (mcp_kv_get).
**Prioridade:** ALTA — brechas de segurança ativas em produção.
**Teste Postgres:** APROVADO (detalhes acima).
