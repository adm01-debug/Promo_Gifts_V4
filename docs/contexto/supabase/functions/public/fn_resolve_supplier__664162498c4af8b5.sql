CREATE OR REPLACE FUNCTION public.fn_resolve_supplier(p_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_active boolean;
begin
  select id, active into v_id, v_active from suppliers
   where upper(code)=upper(p_code) or upper(name)=upper(p_code)
   order by (upper(code)=upper(p_code)) desc limit 1;
  if v_id is null   then raise exception 'Fornecedor % nao encontrado', p_code; end if;
  if v_active is false then raise exception 'Fornecedor % inativo', p_code; end if;
  return v_id;
end $function$
