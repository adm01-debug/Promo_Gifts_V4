-- Porta de ingestao canonica (UPSERT). Substitui o padrao DELETE+INSERT do SM.
-- Efeitos: (1) chave aparada pelo trigger; (2) ON CONFLICT atualiza em vez de duplicar;
-- (3) ao mudar raw_data, content_hash (generated) muda e trg_spr_history arquiva a versao anterior.
create or replace function public.fn_ingest_supplier_raw(
  p_supplier_id uuid,
  p_reference   text,
  p_raw         jsonb,
  p_sku         text default null,
  p_source      text default 'n8n'
)
returns table(acao text, raw_id uuid, content_hash text)
language plpgsql
as $$
declare
  v_ref     text := btrim(p_reference);
  v_existed boolean;
  v_id      uuid;
  v_hash    text;
begin
  if p_supplier_id is null or v_ref is null or v_ref = '' then
    raise exception 'fn_ingest_supplier_raw: supplier_id e reference sao obrigatorios';
  end if;
  if p_raw is null or jsonb_typeof(p_raw) <> 'object' then
    raise exception 'fn_ingest_supplier_raw: raw deve ser um objeto jsonb';
  end if;

  v_existed := exists (
    select 1 from public.supplier_products_raw
     where supplier_id = p_supplier_id and supplier_reference = v_ref
  );

  insert into public.supplier_products_raw
    (supplier_id, supplier_reference, supplier_sku, raw_data, source_channel)
  values
    (p_supplier_id, v_ref, coalesce(nullif(btrim(p_sku), ''), v_ref), p_raw, coalesce(p_source, 'n8n'))
  on conflict (supplier_id, supplier_reference) do update
     set raw_data       = excluded.raw_data,
         supplier_sku   = excluded.supplier_sku,
         source_channel = excluded.source_channel,
         status         = 'pending'::supplier_raw_status,
         updated_at     = now()
  returning id, supplier_products_raw.content_hash into v_id, v_hash;

  return query select case when v_existed then 'updated' else 'inserted' end, v_id, v_hash;
end;
$$;

comment on function public.fn_ingest_supplier_raw(uuid, text, jsonb, text, text)
  is 'Porta de ingestao idempotente (UPSERT) para supplier_products_raw. Recomendada para o n8n substituir DELETE+INSERT. Atualiza raw_data no conflito, disparando versionamento via trg_spr_history.';;
