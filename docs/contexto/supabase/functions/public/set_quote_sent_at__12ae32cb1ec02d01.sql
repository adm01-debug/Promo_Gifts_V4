CREATE OR REPLACE FUNCTION public.set_quote_sent_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Stamp the first time a quote enters 'sent' (covers INSERT-as-sent and UPDATE-to-sent),
  -- and never overwrite an existing timestamp.
  if new.status = 'sent' and new.sent_at is null
     and (tg_op = 'INSERT' or old.status is distinct from 'sent') then
    new.sent_at := now();
  end if;
  return new;
end;
$function$
