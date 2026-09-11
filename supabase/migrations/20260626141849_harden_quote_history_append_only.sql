-- quote_history é log de auditoria de orçamentos. App só faz insert/select (5 usos confirmados);
-- nenhuma função faz update/delete; não há policy de UPDATE/DELETE (já negados por RLS).
-- Tornamos append-only também no nível de GRANT (least-privilege, análogo ao M2 de
-- discount_approval_audit): anon sem acesso; authenticated só INSERT+SELECT.
REVOKE ALL ON public.quote_history FROM anon;
REVOKE UPDATE, DELETE, REFERENCES, TRIGGER ON public.quote_history FROM authenticated;;
