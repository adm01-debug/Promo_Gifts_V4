# Incidente 2026-10-13 — Baseline para comparação em 30 dias

Projeto Gold SSOT: `doufsxqlfjyuvxuezpln`. Capturado pelo Agente 5/5 (Permissões,
Auditoria, Secrets e Observabilidade) na sessão de correção do incidente de
2026-10-13. Objetivo: ter números de referência para comparar em ~30 dias
(2026-11-12) e confirmar que as correções desta Fase 5/9 não degradaram nada
e que os problemas (permissões, secret exposto) não voltaram.

> Todas as queries abaixo foram rodadas via Supabase MCP (`execute_sql`),
> somente leitura, direto no projeto canônico — nunca via PostgREST (REGRA #8
> corolário, CLAUDE.md).

## 1. Tamanho do banco

| Métrica | Valor em 2026-10-13 |
|---|---|
| `pg_database_size(current_database())` | **6504 MB** (~6,5 GB) |
| `admin_audit_log` — linhas | **525** (tamanho ~568 kB) |

Comparar em 30 dias:
```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT count(*), pg_size_pretty(pg_total_relation_size('public.admin_audit_log'))
FROM public.admin_audit_log;
```

## 2. Erros / telemetria (janela de 24h, medida em 2026-10-13)

| Métrica | Valor |
|---|---|
| `query_telemetry` com `created_at > now() - 24h`, agrupado por `severity` | **0 linhas no total** (tabela sem volume nas últimas 24h no momento da medição — não necessariamente o normal histórico; reavaliar junto com o volume de tráfego real) |

Comparar em 30 dias:
```sql
SELECT severity, count(*) FROM public.query_telemetry
WHERE created_at > now() - interval '24 hours'
GROUP BY severity ORDER BY 2 DESC;

SELECT * FROM public.fn_detect_recurring_errors_last_hour(100);
```

## 3. Permissões corrigidas nesta sessão (estado ANTES → DEPOIS)

| Objeto | Antes (2026-10-13) | Depois |
|---|---|---|
| `admin_audit_log` GRANT `authenticated` | INSERT, UPDATE, DELETE, SELECT, REFERENCES, TRIGGER | SELECT, REFERENCES, TRIGGER (INSERT/UPDATE/DELETE revogados) |
| `log_access_denied`, `record_dev_route_telemetry`, `log_user_logout` | `SECURITY INVOKER` (dependiam do GRANT de tabela + RLS do caller) | `SECURITY DEFINER` |
| `check_telemetry_regression` EXECUTE | só `postgres`/`service_role` | + `authenticated` |
| `profiles`, `user_roles`, `ip_access_control`, `outbound_webhooks` GRANT `anon` | INSERT/UPDATE/DELETE/REFERENCES/TRIGGER | nenhum (revogado `ALL PRIVILEGES`) |
| `mcp_api_keys`, `secret_rotation_log` GRANT `authenticated` | incluía INSERT/UPDATE/DELETE (RLS já bloqueava com `WITH CHECK(false)`) | só SELECT/REFERENCES/TRIGGER |
| `login_attempts` GRANT `authenticated` | incluía INSERT/UPDATE/DELETE (sem policy correspondente) | só SELECT/REFERENCES/TRIGGER |

Comparar em 30 dias — confirmar que nenhum desses GRANTs voltou (ex.: um
`GRANT ALL` genérico de uma migration futura reintroduzindo o problema):
```sql
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name IN ('admin_audit_log','profiles','user_roles','ip_access_control',
  'outbound_webhooks','mcp_api_keys','secret_rotation_log','login_attempts')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;
```

## 4. Achado de segurança: credencial exposta em `COMMENT ON`

- `public.video_import_queue` tinha um token Cloudflare Stream
  (`cfat_7CnrimH0S6...`) em texto claro no `COMMENT ON TABLE`, documentado
  desde ~2026-06-07 (histórico de correções do próprio comentário mostra a
  data).
- Comentário sanitizado nesta sessão (migration
  `20261013170913_incidente20261013_fase5_permissoes_auditoria.sql`).
- **Pendência (decisão do PO):** rotacionar o token Cloudflare real — não
  executado por esta sessão (serviço externo, fora do escopo de uma sessão
  automatizada no Supabase).
- Comparar em 30 dias:
  ```sql
  SELECT objoid::regclass, description FROM pg_description
  WHERE description ILIKE '%cfat_%' OR description ~ '[A-Za-z0-9_-]{25,}';
  ```
  Deve continuar retornando vazio para `cfat_`.

## 5. Observabilidade — estado dos detectores existentes

| Objeto | Estado em 2026-10-13 |
|---|---|
| `schema_signature_baseline` | Existe. 7.201 colunas, label `certified_baseline_20260627_v3_post_lovable_audit` (parado desde 2026-06-27 — esperado, não é um bug desta etapa). |
| `schema_drift_log` | Existe e ativo. 478 linhas, última execução `2026-10-13 14:11:00 UTC`. |
| `cron.job` id 245 (`schema-drift-check`) | `active=true`, agenda `11 2,8,14,20 * * *` (4x/dia). |
| `cron.job` id 21 (`cleanup-security-logs`) | `active=true`, diário 03:30. |
| `cron.job` id 271 (`cleanup-log-tables-weekly`) | `active=true`, domingo 03:07. |
| `fn_detect_recurring_errors_last_hour` (novo, etapa 93/94) | Criada nesta sessão; retornou 0 linhas no teste inicial (sem erro recorrente >100 ocorrências no momento). |

## 6. Pendências que exigem decisão do PO (não executadas por esta sessão)

1. Rotação do token Cloudflare Stream exposto (`video_import_queue`, item 4).
2. Centralizar a whitelist de `get_edge_function_secret` numa tabela
   `allowed_edge_secrets` (etapa 58) — não implementado nesta sessão para não
   colidir com a mudança concorrente do Agente 1 (adição de
   `ASIA_INGESTION_CRON_SECRET` à mesma função). Fica como proposta para uma
   sessão futura, depois que a mudança do Agente 1 estiver consolidada.
3. Causa raiz dos 1.269 erros reportados em `fn_get_product_customization_options`
   — confirmado que NÃO é falta de GRANT (já tinha `EXECUTE` para
   `authenticated`); investigação funcional fica fora do escopo de
   permissões/auditoria deste agente.
4. Política de retenção de dados para tabelas de telemetria/histórico que
   não têm cleanup automático documentado, se alguma for identificada no
   futuro — não implementar sem aprovação do PO (mesma régua já aplicada a
   `admin_audit_log`, cuja retenção de 90 dias já existia e foi apenas
   confirmada, não criada, nesta sessão).
