# Correções — Auditoria Supabase 2026-10-27

Ordenadas por impacto. Todas requerem PR + revisão humana antes do merge.
Nenhuma DDL deve ser aplicada via execute_sql — usar `db-apply-migration.yml`.

---

## C1 — ALTO: Revogar GRANT ALL do anon e criar grants granulares

**Impacto:** elimina superfície de ataque de escrita anônima em 223 tabelas

**Migration:**
```sql
-- Revogar grants genéricos
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
-- Re-conceder apenas o necessário (ajustar lista real)
GRANT SELECT ON products, product_variants, suppliers TO anon;
-- Para cada tabela que anon PRECISA escrever (ex: carrinho de visitante):
-- GRANT INSERT ON cart_items TO anon;
```

**Antes de fazer:** inventariar quais tabelas o frontend usa com anon (via logs de acesso PostgREST / Supabase Studio → Logs → API).

**Via:** `db-apply-migration.yml` com versão timestamp + aprovação PO

---

## C2 — ALTO: Ativar verify_jwt na edge function ai-recommendations

**Impacto:** bloqueia acesso não autenticado à API de recomendações de AI

**Como:** editar a configuração da função (se `supabase/functions/ai-recommendations/index.ts` tem `serve(..., { verifyJwt: false })`), mudar para `true` ou remover o parâmetro (default é `true`).

**Deploy via:** `.github/workflows/deploy-edge-functions.yml` com `function_name: ai-recommendations`

**Verificar primeiro:** se existe client-side que chama essa função sem token (catálogo público sem login) — se sim, implementar auth de service role no backend antes de ativar.

---

## C3 — ALTO: Migrar integration_credentials.secret_value para Vault

**Impacto:** segredos de integração ficam criptografados em repouso e fora do alcance de SQL injection

**Passos:**
1. Para cada linha: `SELECT vault.create_secret(secret_value, provider) FROM integration_credentials`
2. Adicionar coluna `vault_secret_id UUID REFERENCES vault.secrets(id)`
3. Popular com os IDs dos secrets criados
4. `ALTER TABLE integration_credentials DROP COLUMN secret_value` (migration separada, após validação)

**Via:** `db-apply-migration.yml` em duas fases (adicionar coluna + popular; depois remover coluna)

---

## C4 — MÉDIO: Investigar e corrigir falhas de cron (9-13% por job)

**Impacto:** ~100 falhas/dia em 17 jobs críticos (sync de estoque, guard de anonimos, alertas)

**Diagnóstico:**
1. Verificar CPU/RAM da instância no dashboard Supabase (Compute > Metrics)
2. Se houver picos de CPU correlacionados com horários de falha → upgrade de compute tier
3. Se jobs pesados estão competindo: escalonar schedules para não sobrepor
4. Verificar se algum job tem leak de conexões (não fecha cursor/conexão)

**Investigação SQL:**
```sql
SELECT d.jobid, c.jobname, d.return_message, COUNT(*)
FROM cron.job_run_details d
JOIN cron.job c ON c.jobid = d.jobid
WHERE d.status = 'failed' AND d.start_time > now() - interval '7 days'
GROUP BY d.jobid, c.jobname, d.return_message
ORDER BY COUNT(*) DESC LIMIT 20;
```

---

## C5 — MÉDIO: Corrigir seq scans em tabelas vazias (user_organizations, user_roles, admin_settings)

**Impacto:** 18M+ seq scans desnecessários em tabelas vazias — desperdício de I/O

**Diagnóstico:** identificar qual query/cron produz esse volume:
```sql
-- Habilitar pg_stat_statements e filtrar por tabela
SELECT query, calls, total_exec_time FROM pg_stat_statements
WHERE query ILIKE '%user_organizations%' ORDER BY calls DESC LIMIT 10;
```

Se as tabelas nunca serão populadas (features não implementadas): avaliar se os crons/queries que as usam devem ser desabilitados.
Se serão populadas: adicionar índice na coluna de filtro principal.

---

## C6 — MÉDIO: Ativar health-check para hardening_health_snapshots

**Impacto:** detecta degradação silenciosa de configurações de segurança

**Como:** verificar se existe cron/function que deveria popular essa tabela e está desabilitado ou com bug. Buscar no código:
```
grep -r "hardening_health_snapshots" supabase/functions/ src/
```

---

## C7 — MÉDIO: Auditar buckets públicos (avatars, mockup-assets)

**Impacto:** confirmar se exposição pública é intencional; se não, converter para signed URLs

**Ação:**
- Se intencional (CDN público): documentar em `docs/SCHEMA_REFERENCE.md` e adicionar Cloudflare policy
- Se não intencional: `UPDATE storage.buckets SET public = false WHERE id IN ('avatars','mockup-assets')` via migration + ajustar código que gera URLs para usar `createSignedUrl`

---

## C8 — BAIXO: Adicionar filtro de tenant na policy ai_usage_quotas

**Migration:**
```sql
DROP POLICY "policy_name" ON ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_own_only" ON ai_usage_quotas
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
```

---

## C9 — BAIXO: Hardening de SECURITY DEFINER no schema graphql

**Para cada função SECURITY DEFINER sem search_path:**
```sql
ALTER FUNCTION graphql.<nome>(...) SET search_path = '';
```
Ou adicionar `SET search_path TO ''` na declaração da função.

---

## Ordem de execução sugerida

1. **Imediato (esta semana):** C2 (edge fn JWT) — zero custo, deploy em 5min
2. **Próxima sprint:** C4 (diagnóstico crons) + C5 (seq scans) — investigação antes de corrigir
3. **Planejado (30 dias):** C1 (revogar anon grants) — requer inventário de uso real primeiro
4. **Planejado (60 dias):** C3 (Vault para credenciais) — migration multi-fase
5. **Técnico (qualquer PR):** C7, C8, C9 — pequenas mudanças, baixo risco
