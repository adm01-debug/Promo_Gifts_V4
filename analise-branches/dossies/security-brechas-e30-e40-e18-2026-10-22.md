# Dossiê — `claude/security-brechas-e30-e40-e18-2026-10-22`

**Veredito:** JÁ MERGEADA (branch deletada)
**Base:** main `5ae127ea` (2026-11-01) · produção doufsxqlfjyuvxuezpln (somente leitura)

**Contexto:** PR #2416 mergeada em 2026-10-24T20:16:44Z (PR #2357 anterior fechada). Branch não existe mais (compare → 404).

## Evidências
- Ledger de produção contém 20261022194000 security_revoke_external_connections_anon, 194100 ..._mockup_approval_links_anon, 194200 ..._mcp_kv_get_authenticated.
- has_table_privilege em produção: external_connections e mockup_approval_links → anon INSERT/UPDATE/DELETE = false.
- has_function_privilege: mcp_kv_get(text,text) → authenticated=false, anon=false, service_role=true.
- Os arquivos das 3 migrations estão em supabase/migrations/ do main.
- O relatório de 24/10 que dizia "brechas ativas / AUSENTES no ledger" está desatualizado.

**Conclusão:** Achados E30/E40/E18 fechados em produção.

> Método: diff via REST compare (main...branch) + presença de cada linha no main atual + consultas SELECT em produção. Merge de teste/worktree não executado: nenhum candidato a merge.
