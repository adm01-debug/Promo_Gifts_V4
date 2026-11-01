# Dossiê — `claude/fix-audit-acl-regrole-261024-1635`

**Veredito:** FECHAR / DRIFT já resolvido
**Base:** main `5ae127ea` (2026-11-01) · produção doufsxqlfjyuvxuezpln (somente leitura)

**Contexto:** PRs #2424 e #2404 fechadas sem merge; mesma correção entrou no main.

## Evidências
- Migration 20261024163500_fix_audit_security_definer_acl_regrole_cast.sql está em main (93/98 linhas idênticas; o resto é comentário).
- Produção: ledger tem 20261024163500 (fix_audit_security_definer_acl_regrole_cast) e o corpo de public.audit_security_definer_acl não contém mais `regrole` (SELECT prosrc ILIKE %regrole% = false).
- scripts/migration-ledger-remote-only-allowlist.json: main já lista 20261022193000, 194000, 194100, 194200 e 20261019000000.
- Relatório antigo dizia "migration pendente em produção" — FALSO hoje.

**Conclusão:** Auditoria: correção do achado de audit_acl (ver propostas) aplicada.

> Método: diff via REST compare (main...branch) + presença de cada linha no main atual + consultas SELECT em produção. Merge de teste/worktree não executado: nenhum candidato a merge.
