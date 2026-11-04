CREATE OR REPLACE FUNCTION public.trg_fn_sanitize_restock_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  -- (1) Anula janelas com data já vencida (< hoje). Mantém datas de hoje/futuro.
  if NEW.next_date_1 is not null and NEW.next_date_1 < current_date then NEW.next_date_1 := null; NEW.next_quantity_1 := null; end if;
  if NEW.next_date_2 is not null and NEW.next_date_2 < current_date then NEW.next_date_2 := null; NEW.next_quantity_2 := null; end if;
  if NEW.next_date_3 is not null and NEW.next_date_3 < current_date then NEW.next_date_3 := null; NEW.next_quantity_3 := null; end if;
  if NEW.next_date_4 is not null and NEW.next_date_4 < current_date then NEW.next_date_4 := null; NEW.next_quantity_4 := null; end if;
  if NEW.next_date_5 is not null and NEW.next_date_5 < current_date then NEW.next_date_5 := null; NEW.next_quantity_5 := null; end if;
  if NEW.next_date_6 is not null and NEW.next_date_6 < current_date then NEW.next_date_6 := null; NEW.next_quantity_6 := null; end if;
  -- (2) Pares incoerentes: quantidade futura sem data não é reposição rastreável.
  if NEW.next_date_1 is null and NEW.next_quantity_1 is not null then NEW.next_quantity_1 := null; end if;
  if NEW.next_date_2 is null and NEW.next_quantity_2 is not null then NEW.next_quantity_2 := null; end if;
  if NEW.next_date_3 is null and NEW.next_quantity_3 is not null then NEW.next_quantity_3 := null; end if;
  if NEW.next_date_4 is null and NEW.next_quantity_4 is not null then NEW.next_quantity_4 := null; end if;
  if NEW.next_date_5 is null and NEW.next_quantity_5 is not null then NEW.next_quantity_5 := null; end if;
  if NEW.next_date_6 is null and NEW.next_quantity_6 is not null then NEW.next_quantity_6 := null; end if;
  return NEW;
end;
$function$
