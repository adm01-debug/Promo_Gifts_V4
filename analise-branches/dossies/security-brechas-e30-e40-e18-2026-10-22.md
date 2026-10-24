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

## VEREDITO
**AGUARDANDO APROVAÇÃO** — 3 migrations de segurança críticas (revoga INSERT anon e authenticated em tabelas sensíveis) que ainda não foram aplicadas em produção. A brecha de segurança está ativa. Requer:
1. Aprovação humana (REVOKE + DROP POLICY é DDL destrutiva)
2. Aplicação via `.github/workflows/db-apply-migration.yml` (único caminho autorizado)
3. Verificar por que essas 3 migrations com timestamp < 20261022203935 não estão no ledger

**Prioridade:** ALTA — brechas de segurança (E30/E40/E18) ativas em produção.
