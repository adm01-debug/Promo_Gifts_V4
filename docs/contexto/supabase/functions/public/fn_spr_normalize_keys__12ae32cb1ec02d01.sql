CREATE OR REPLACE FUNCTION public.fn_spr_normalize_keys()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if new.supplier_reference is not null then
    new.supplier_reference := btrim(new.supplier_reference);
  end if;
  if new.supplier_sku is not null then
    new.supplier_sku := btrim(new.supplier_sku);
  end if;
  return new;
end;
$function$
