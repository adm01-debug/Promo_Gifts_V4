-- 1) Normalizador na entrada (preserva raw_data intacto; apara apenas as chaves)
create or replace function public.fn_spr_normalize_keys()
returns trigger
language plpgsql
as $$
begin
  if new.supplier_reference is not null then
    new.supplier_reference := btrim(new.supplier_reference);
  end if;
  if new.supplier_sku is not null then
    new.supplier_sku := btrim(new.supplier_sku);
  end if;
  return new;
end;
$$;

comment on function public.fn_spr_normalize_keys()
  is 'BEFORE INSERT/UPDATE em supplier_products_raw: apara espacos de supplier_reference/supplier_sku para evitar duplicatas por whitespace. Nao altera raw_data (payload fiel).';

drop trigger if exists trg_spr_normalize_keys on public.supplier_products_raw;
create trigger trg_spr_normalize_keys
  before insert or update on public.supplier_products_raw
  for each row
  execute function public.fn_spr_normalize_keys();

-- 2) Rede de seguranca: invariante garantida no schema (NOT VALID + VALIDATE = menos lock)
alter table public.supplier_products_raw
  add constraint chk_spr_reference_trimmed
  check (supplier_reference = btrim(supplier_reference)) not valid;
alter table public.supplier_products_raw
  validate constraint chk_spr_reference_trimmed;

alter table public.supplier_products_raw
  add constraint chk_spr_sku_trimmed
  check (supplier_sku is null or supplier_sku = btrim(supplier_sku)) not valid;
alter table public.supplier_products_raw
  validate constraint chk_spr_sku_trimmed;;
