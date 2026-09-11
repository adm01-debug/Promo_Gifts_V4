-- 1) supplier_subtype_category_map: RLS estava DESLIGADO -> ligar + leitura autenticada
--    (alinha ao padrao das tabelas-irmas de mapeamento: auth_read_* com authenticated/true)
alter table public.supplier_subtype_category_map enable row level security;

drop policy if exists auth_read_supplier_subtype_category_map on public.supplier_subtype_category_map;
create policy auth_read_supplier_subtype_category_map
  on public.supplier_subtype_category_map
  for select to authenticated
  using (true);

-- 2) supplier_colors: remover anon da policy de leitura (mantem authenticated)
alter policy supplier_colors_public_read on public.supplier_colors to authenticated;

-- 3) material_equivalences: remover anon/public da policy de leitura (service_role mantem ALL)
alter policy me_select on public.material_equivalences to authenticated;;
