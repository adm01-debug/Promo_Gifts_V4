-- SB-0003: REPLICA IDENTITY FULL nas 3 tabelas de realtime
-- Severidade: MÉDIO | Tipo: INTEGRIDADE
-- Evidência: relreplident = 'D' (DEFAULT) para login_attempts,
--            workspace_notifications, device_login_notifications
-- Impacto: Subscribers de realtime recebem UPDATE/DELETE sem dados do estado anterior,
--          apenas PK. Notificações de segurança/login chegam incompletas ao React client.
-- Risco de regressão: baixo — expande informação emitida, não restringe.
-- Verificação pré-apply:
--   SELECT relname, relreplident FROM pg_class WHERE relname IN
--   ('login_attempts','workspace_notifications','device_login_notifications')
--   AND relnamespace = 'public'::regnamespace; → todos 'D'
-- Verificação pós-apply: mesma query → todos 'f'

ALTER TABLE public.login_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.device_login_notifications REPLICA IDENTITY FULL;

-- ROLLBACK:
-- ALTER TABLE public.login_attempts REPLICA IDENTITY DEFAULT;
-- ALTER TABLE public.workspace_notifications REPLICA IDENTITY DEFAULT;
-- ALTER TABLE public.device_login_notifications REPLICA IDENTITY DEFAULT;
