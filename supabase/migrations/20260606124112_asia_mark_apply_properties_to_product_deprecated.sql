COMMENT ON FUNCTION public.fn_apply_asia_properties_to_product(text, jsonb, numeric, numeric, numeric, numeric, text) IS
'DEPRECATED 2026-06-06: aplicava propriedades ASIA diretamente em products (Gold), furando a camada Silver/DE>PARA. Funcao ORFA (zero chamadas). Substituida por fn_asia_enrich_parent, que escreve em produtos_padronizacao. Mantida apenas para historico; candidata a DROP.';;
