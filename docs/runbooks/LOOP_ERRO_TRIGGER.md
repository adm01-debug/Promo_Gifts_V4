# Runbook — Loop de erro em trigger (ou função chamada por trigger)

Projeto Gold SSOT: `doufsxqlfjyuvxuezpln`.

Criado no incidente 2026-10-13 (Fase 9, etapa 99).

## Sintomas

- Um `UPDATE`/`INSERT` simples trava ou demora muito mais que o normal.
- `admin_audit_log` ou `query_telemetry` acumulam a MESMA mensagem de erro
  repetida centenas/milhares de vezes em pouco tempo (ex.: o próprio bug que
  gerou 42.946 linhas de `client_error` em `admin_audit_log` em 2026-06-15 —
  ver `COMMENT ON TABLE admin_audit_log`).
- `pg_stat_activity` mostra a mesma query (ou uma `fn_...` SECURITY DEFINER)
  presa em `active` por muito mais tempo que seu padrão histórico.

## Diagnóstico (somente leitura)

```sql
-- Mensagens de erro recorrentes na última hora (função criada neste incidente)
SELECT * FROM public.fn_detect_recurring_errors_last_hour(100);

-- Sessões/queries presas agora
SELECT pid, now()-query_start AS running_for, state, query
FROM pg_stat_activity
WHERE state != 'idle' AND now()-query_start > interval '30 seconds'
ORDER BY running_for DESC;

-- Qual trigger está em cada tabela suspeita
SELECT tgname, tgrelid::regclass, tgenabled, pg_get_triggerdef(oid)
FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT tgisinternal AND tgrelid::regclass::text = '<tabela_suspeita>';

-- Locks relacionados, se houver travamento real (não só volume de erro)
SELECT * FROM pg_locks WHERE NOT granted;
```

## Contenção

1. **Nunca** `DROP TRIGGER` em produção sem confirmar primeiro que é
   seguro — muitos triggers aqui são de auditoria obrigatória (ex.:
   `audit_user_role_changes`, `fn_block_unauthorized_product_deactivation`).
   Desativar o trigger errado pode remover uma proteção de segurança.
2. Se o trigger está causando um loop real (ex.: ele mesmo dispara outro
   UPDATE na mesma tabela), desativar temporariamente com
   `ALTER TABLE <tabela> DISABLE TRIGGER <nome>;` — e reabilitar
   (`ENABLE TRIGGER`) assim que a causa raiz for corrigida. Documentar os
   dois comandos no PR/ticket, nunca deixar desabilitado silenciosamente.
3. Se o volume de erro está só poluindo uma tabela de auditoria/telemetria
   (não travando nada), seguir o padrão já documentado em
   `COMMENT ON TABLE admin_audit_log` (SINTOMA 1): `DELETE` dos registros de
   ruído + `VACUUM FULL` + corrigir a função/trigger que está gravando lá por
   engano, redirecionando para `frontend_telemetry`.

## Causa raiz comum (já vista neste projeto)

- Função `SECURITY INVOKER` que deveria ser `SECURITY DEFINER` chocando com
  RLS mais restritiva do que o caller tem (foi o achado deste mesmo incidente
  em `log_access_denied`/`record_dev_route_telemetry`/`log_user_logout` —
  ver migration `20261013170913_incidente20261013_fase5_permissoes_auditoria.sql`).
- Trigger `BEFORE UPDATE` que reexecuta `UPDATE` na mesma linha sem guarda de
  recursão (`pg_trigger_depth() > 1`).

## Não faça

- Não aumente `statement_timeout` globalmente para "resolver" o sintoma —
  trate a causa.
- Não desative RLS na tabela afetada como atalho.
