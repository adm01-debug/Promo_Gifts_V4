-- Regularização retroativa de DDL out-of-band (docs/db/POLITICA_DDL.md).
--
-- Origem: aplicada diretamente via MCP/dashboard em 2026-09-16 15:57:25 UTC,
-- já presente no ledger como version=20260916155725,
-- name=catalog_stats_price_range_top_colors_materials — sem migration
-- versionada correspondente até esta regularização. Descoberta durante
-- verificação independente da etapa E48 (docs/PACOTE_APROVACAO_1_2026-09-16.md,
-- Ação 4).
--
-- Este arquivo é só espelho textual do que já roda em produção (o ledger já
-- tem a linha; `supabase migration repair` NÃO é necessário aqui, diferente
-- do caso E09 3b/3c). Reproduz CREATE OR REPLACE FUNCTION public.zapp_catalog_stats()
-- exatamente como capturado de supabase_migrations.schema_migrations.statements
-- para essa version, acrescentando 4 chaves ao jsonb retornado: price_min,
-- price_max, top_colors, top_materials (comentários "-- E36"/"-- E22" no
-- corpo são de uma numeração de feature alheia à deste plano de 50 etapas —
-- não confundir com a etapa E36 deste documento, que é sobre custo de
-- fn_cron_safe_run).
--
-- Efeito ao aplicar num ambiente que ainda não tem esta version: idempotente
-- (CREATE OR REPLACE), reproduz o comportamento já ao vivo no projeto
-- canônico. CREATE OR REPLACE FUNCTION preserva owner e ACL quando a
-- assinatura não muda — confirmado ao vivo nesta investigação que
-- authenticated segue com EXECUTE (mesmo estado de antes desta DDL, não
-- alterado por ela). A pendência de segurança (REVOKE de authenticated) é
-- ação separada e independente — ver Ação 1 em
-- docs/PACOTE_APROVACAO_1_2026-09-16.md. Este arquivo NÃO revoga nem concede
-- privilégio nenhum.

CREATE OR REPLACE FUNCTION public.zapp_catalog_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'total', (select count(*) from products where is_active and is_deleted is not true),
    'in_stock', (select count(*) from products where is_active and is_deleted is not true and not is_stockout),
    'featured', (select count(*) from products where is_active and is_deleted is not true and is_featured
      and (is_featured_expires_at is null or is_featured_expires_at > now())),
    'new_30d', (select count(*) from products where is_active and is_deleted is not true
      and (created_at > now() - interval '30 days'
        or (is_new and (is_new_expires_at is null or is_new_expires_at > now())))),
    'bestseller', (select count(*) from products where is_active and is_deleted is not true and is_bestseller
      and (is_bestseller_expires_at is null or is_bestseller_expires_at > now())),
    'kits', (select count(*) from products where is_active and is_deleted is not true and is_kit),
    'low_stock', (select count(*) from products where is_active and is_deleted is not true
      and stock_quantity between 1 and 10),
    'categories_root', (select count(*) from categories where level = 1 and is_active and deleted_at is null),
    'suppliers_active', (select count(distinct supplier_id) from products
      where is_active and is_deleted is not true),
    'last_sync_at', (select max(last_sync_at) from products),
    'last_update_at', (select max(updated_at) from products),
    'by_month', (
      select coalesce(jsonb_agg(jsonb_build_object('month', month, 'count', count) order by month), '[]'::jsonb)
      from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*) as count
        from products
        where is_active and is_deleted is not true
          and created_at >= date_trunc('month', now()) - interval '6 months'
        group by 1
      ) months
    ),
    -- E36: faixa de preco real para o slider (min/max ja ignora NULL por
    -- padrao do agregado SQL; 4 produtos ativos sem sale_price hoje).
    'price_min', (select min(sale_price) from products where is_active and is_deleted is not true),
    'price_max', (select max(sale_price) from products where is_active and is_deleted is not true),
    -- E36: top 20 cores/materiais por frequencia. colors/materials sao
    -- jsonb com 2 formatos reais (confirmado por SQL antes de escrever,
    -- mesmo achado da E22): elemento string OU objeto {"nome": "..."} -
    -- coalesce(elem->>'nome', elem #>> '{}') cobre os dois. upper()
    -- normaliza porque o filtro de listagem (color/material da action
    -- list_products) ja compara em upper() - sem isso "Colorido" e
    -- "COLORIDO" apareceriam como 2 chips diferentes pro usuario.
    'top_colors', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', freq) order by freq desc), '[]'::jsonb)
      from (
        select upper(coalesce(elem->>'nome', elem #>> '{}')) as label, count(*) as freq
        from products p, jsonb_array_elements(p.colors) elem
        where p.is_active and p.is_deleted is not true
        group by 1 order by 2 desc limit 20
      ) tc
    ),
    'top_materials', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', freq) order by freq desc), '[]'::jsonb)
      from (
        select upper(coalesce(elem->>'nome', elem #>> '{}')) as label, count(*) as freq
        from products p, jsonb_array_elements(p.materials) elem
        where p.is_active and p.is_deleted is not true
        group by 1 order by 2 desc limit 20
      ) tm
    )
  );
$function$;

DO $postcondition$
BEGIN
  IF NOT has_function_privilege('service_role', 'public.zapp_catalog_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Postcondition failed: service_role perdeu EXECUTE em public.zapp_catalog_stats()';
  END IF;
END
$postcondition$;
