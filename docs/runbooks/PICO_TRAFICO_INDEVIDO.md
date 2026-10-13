# Runbook — Pico de tráfego indevido (bot/scraper/DDoS leve)

Projeto Gold SSOT: `doufsxqlfjyuvxuezpln`. Ver `docs/SCHEMA_REFERENCE.md` §8 para
queries canônicas de auditoria (sempre via `pg_catalog`, nunca PostgREST).

Criado no incidente 2026-10-13 (Fase 9, etapa 99).

## Sintomas

- Latência (`p95`) sobe de repente sem deploy recente.
- `edge_function_invocations` ou `query_telemetry` mostram um volume anormal
  vindo de poucos IPs/user-agents.
- `login_attempts` ou `public_token_failures` disparam em sequência rápida.

## Diagnóstico (somente leitura)

```sql
-- Taxa de requisições/erro na última hora vs baseline de 24h atrás
SELECT * FROM public.fn_detect_recurring_errors_last_hour(50);

-- Regressão de latência/erro (mesma função usada pelo painel admin)
SELECT public.check_telemetry_regression();

-- Top IPs/user-agents em login_attempts na última hora
SELECT ip_address, count(*) FROM public.login_attempts
WHERE created_at > now() - interval '1 hour'
GROUP BY ip_address ORDER BY 2 DESC LIMIT 20;

-- ip_access_control já tem alguma entrada automática recente?
SELECT * FROM public.ip_access_control ORDER BY created_at DESC LIMIT 20;
```

Via MCP (`query_logs`, janela ≤ 24h): buscar textualmente por `429`, `503` ou um
único IP repetido nas últimas 1–2h.

## Contenção

1. Confirmar que é tráfego indevido, não um lançamento/campanha legítima
   (perguntar ao PO antes de bloquear nada — falso positivo custa caro).
2. Se confirmado: inserir o IP/range em `public.ip_access_control` com
   `action='block'` (via função administrativa existente, nunca INSERT direto
   do frontend — a tabela é `is_admin_or_above` via RLS).
3. Se o pico for de um endpoint específico (ex.: RPC pública), checar se há
   rate limit configurado em `edge_function_invocations`/middleware da edge
   function correspondente antes de qualquer bloqueio geral.
4. Monitorar `auto_block_extreme_offenders()` — função já existente que
   bloqueia automaticamente ofensores extremos; confirmar que o cron dela
   está ativo (`SELECT * FROM cron.job WHERE jobname ILIKE '%offender%'`).

## Depois que passar

- Registrar o incidente em `admin_audit_log` via `log_audit()` (action
  `hardening` ou similar), nunca INSERT direto.
- Se o padrão se repetir, considerar WAF/rate-limit no Cloudflare (fora do
  Supabase) — decisão de infraestrutura externa, não aplicar sem aprovação
  do PO.

## Não faça

- Não rode `DELETE`/`TRUNCATE` em `login_attempts` para "limpar" o pico antes
  de documentar — é evidência do incidente.
- Não desative RLS como atalho para debugar performance.
