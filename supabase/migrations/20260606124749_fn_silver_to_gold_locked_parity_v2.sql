create or replace function public.fn_silver_to_gold(p_silver_id uuid)
 returns jsonb
 language plpgsql
as $function$
declare
  v_sp silver_products%rowtype;
  v_gold_id uuid; v_slug text;
  v_vars_ok int := 0; v_new_var_id uuid; sv record;
  v_var_name text;
  v_locked text[] := '{}';
begin
  select * into v_sp from silver_products where id = p_silver_id;
  if not found then raise exception 'Silver product % nao encontrado', p_silver_id; end if;
  if v_sp.norm_status = 'promoted' then
    return jsonb_build_object('gold_product_id',v_sp.gold_product_id,'status','already_promoted');
  end if;
  if v_sp.name is null then raise exception 'Silver product % sem nome', p_silver_id; end if;

  -- PARIDADE COM A V1: marca a escrita como pipeline (evita captura de "edicao manual"
  -- corromper locked_fields) e suprime automacoes pesadas de products.
  perform set_config('app.write_source','pipeline',true);
  perform set_config('app.bulk_import_mode','true',true);

  v_slug := lower(regexp_replace(regexp_replace(
    translate(left(v_sp.name,80),
      'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAEEEEIIIIOOOOOUUUUCN'),
    '[^a-z0-9\s]','','g'),'\s+','-','g'))
    || '-' || substr(p_silver_id::text,1,8);

  if v_sp.gold_product_id is not null then
    -- carrega os campos travados do produto Gold
    select coalesce(locked_fields,'{}') into v_locked from products where id = v_sp.gold_product_id;

    update products p set
      name               = case when 'name'        = any(v_locked) then p.name        else v_sp.name end,
      description        = case when 'description'  = any(v_locked) then p.description else coalesce(v_sp.description, p.description) end,
      category_id        = case when 'category_id' = any(v_locked) or 'main_category_id' = any(v_locked)
                                 then p.category_id else coalesce(v_sp.norm_category_id, p.category_id) end,
      supplier_id        = v_sp.supplier_id,
      brand              = case when 'brand'        = any(v_locked) then p.brand     else coalesce(v_sp.brand, p.brand) end,
      ncm_code           = case when 'ncm_code'     = any(v_locked) then p.ncm_code  else coalesce(v_sp.ncm_code, p.ncm_code) end,
      supply_mode        = coalesce(v_sp.supply_mode, p.supply_mode),
      min_order_quantity = case when 'min_quantity' = any(v_locked) then p.min_order_quantity else coalesce(v_sp.min_order_quantity, p.min_order_quantity) end,
      is_active          = case when 'is_active'    = any(v_locked) then p.is_active else v_sp.is_active end,
      updated_at         = now()
    where p.id = v_sp.gold_product_id;
    v_gold_id := v_sp.gold_product_id;
  else
    insert into products (
      organization_id, supplier_id, name, description, category_id, brand,
      ncm_code, supply_mode, min_order_quantity, is_active, slug
    ) values (
      v_sp.organization_id, v_sp.supplier_id, v_sp.name, v_sp.description,
      v_sp.norm_category_id, v_sp.brand, v_sp.ncm_code,
      coalesce(v_sp.supply_mode,'pronta_entrega_liso'),
      coalesce(v_sp.min_order_quantity,1), v_sp.is_active, v_slug
    ) returning id into v_gold_id;
  end if;

  for sv in select * from silver_variants where silver_product_id = p_silver_id loop
    v_var_name := v_sp.name || coalesce(' | ' || sv.color_name, '');

    if sv.gold_variant_id is not null then
      update product_variants set
        name=v_var_name, stock_quantity=coalesce(sv.stock_quantity,0),
        is_active=sv.is_active, color_code=sv.color_code, color_name=sv.color_name,
        color_hex=sv.color_hex, size_code=sv.size_code, supplier_sku=sv.supplier_sku,
        updated_at=now()
      where id=sv.gold_variant_id;
    else
      insert into product_variants (
        product_id, sku, name, supplier_sku, color_code, color_name, color_hex, size_code,
        stock_quantity, is_active, attributes, images
      ) values (
        v_gold_id, sv.supplier_sku, v_var_name, sv.supplier_sku,
        sv.color_code, sv.color_name, sv.color_hex, sv.size_code,
        coalesce(sv.stock_quantity,0), sv.is_active, '{}'::jsonb, '[]'::jsonb
      ) returning id into v_new_var_id;
      update silver_variants set gold_variant_id=v_new_var_id where id=sv.id;
    end if;
    v_vars_ok := v_vars_ok + 1;
  end loop;

  update silver_products set
    gold_product_id=v_gold_id, norm_status='promoted',
    promoted_at=now(), updated_at=now()
  where id=p_silver_id;

  return jsonb_build_object(
    'gold_product_id',v_gold_id,'silver_id',p_silver_id,
    'supplier_reference',v_sp.supplier_reference,
    'variants_promoted',v_vars_ok,'status','promoted');
exception when others then
  raise warning 'fn_silver_to_gold falhou %: %', p_silver_id, sqlerrm; raise;
end;
$function$;;
