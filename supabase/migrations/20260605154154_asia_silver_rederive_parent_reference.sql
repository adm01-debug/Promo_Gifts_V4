
-- Re-derivar parent_reference na silver Asia usando fn_derive_parent_ref atualizada
-- (que agora lê raw_data->>'referencia' diretamente)
-- Atualiza variantes que têm raw_id ligado ao bronze corrigido

UPDATE public.produtos_padronizacao_variantes pv
SET parent_reference = fn_derive_parent_ref(
  pv.supplier_id,
  pv.variant_reference,
  br.raw_data
)
FROM public.supplier_products_raw br
WHERE br.id = pv.raw_id
  AND pv.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
  AND br.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
  -- só atualiza se mudou (evita writes desnecessários e protege content_hash)
  AND pv.parent_reference IS DISTINCT FROM fn_derive_parent_ref(
    pv.supplier_id, pv.variant_reference, br.raw_data
  );

-- Re-derivar parent_reference também nos pais (supplier_reference já está correto,
-- mas garantir que standardized_at e pad_id nas variantes estejam consistentes)
-- O trigger trg_aa_padvar_sync re-resolverá pad_id automaticamente
UPDATE public.produtos_padronizacao_variantes SET pad_id = NULL
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
  AND raw_id IS NOT NULL;
-- Trigger trg_aa_padvar_sync vai re-resolver pad_id no próximo UPDATE
UPDATE public.produtos_padronizacao_variantes pv
SET pad_id = NULL
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118';
-- Agora forçar re-resolução (UPDATE trivial que dispara trigger)
UPDATE public.produtos_padronizacao_variantes
SET updated_at = now()
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118';
;
