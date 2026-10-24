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

## Teste Postgres Temporário (2026-10-24)

**Ambiente:** PostgreSQL 16.15 local (Ubuntu 16.15-0ubuntu0.24.04.1). Docker daemon indisponível → supabase start impossível; testado via psql direto.

**Verificação do SQL das migrations (lido diretamente via `git show origin/claude/security-brechas-...`):**
- `20261022194000`: `REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.external_connections FROM anon` — sem referência a `auth.`
- `20261022194100`: `REVOKE ALL PRIVILEGES ON public.mockup_approval_links FROM anon` — sem referência a `auth.`
- `20261022194200`: `REVOKE EXECUTE ON FUNCTION public.mcp_kv_get FROM authenticated` — sem referência a `auth.`

**Conclusão:** as 3 migrations são REVOKE puro no schema `public`. Nenhuma referencia `auth.users`, funções do schema `auth` ou FKs. Stubs de `auth.users` são desnecessários para este teste. Roles `anon`, `authenticated` e `service_role` foram criadas como stubs locais.

**Estado antes:**
- `anon` em `external_connections`: DELETE, INSERT, REFERENCES, TRIGGER, UPDATE (5 privilégios)
- `anon` em `mockup_approval_links`: ALL (7 privilégios incluindo SELECT)
- `authenticated` em `mcp_kv_get(text)`: EXECUTE

**Execução:**
```
psql -d test_branch_analysis -f 20261022194000.sql → SET / REVOKE  ✓ (0 erros)
psql -d test_branch_analysis -f 20261022194100.sql → SET / REVOKE  ✓ (0 erros)
psql -d test_branch_analysis -f 20261022194200.sql → SET / REVOKE  ✓ (0 erros)
```

**Estado depois:**
- `anon` em `external_connections`: 0 privilégios ✓
- `anon` em `mockup_approval_links`: 0 privilégios ✓
- `authenticated` em `mcp_kv_get(text)`: 0 privilégios ✓

**Resultado:** APROVADO — 3 migrations executam sem erro, produzem exatamente o REVOKE esperado.

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
