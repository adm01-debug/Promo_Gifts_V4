CREATE OR REPLACE FUNCTION public.process_notifications_queue(p_limit integer DEFAULT 100) RETURNS TABLE(...) LANGUAGE sql SECURITY DEFINER SET search_path=public

CREATE OR REPLACE FUNCTION public.confirm_notifications_dispatched(p_ids uuid[]) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public
