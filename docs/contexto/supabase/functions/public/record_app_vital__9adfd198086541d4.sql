CREATE OR REPLACE FUNCTION public.record_app_vital(_name text, _value double precision, _rating text DEFAULT NULL::text, _req_id text DEFAULT NULL::text, _url text DEFAULT NULL::text, _ua text DEFAULT NULL::text, _uid uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.app_vitals (metric_name, metric_value, rating, request_id, page_url, user_agent, user_id)
  VALUES (_name, _value, _rating, _req_id, _url, _ua, _uid);
END;
$function$
