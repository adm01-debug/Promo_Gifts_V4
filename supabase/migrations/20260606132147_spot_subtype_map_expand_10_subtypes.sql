-- Adiciona 10 subtypes SPOT ao mapa de categoria (derivados do estado real do Gold).
-- ON CONFLICT para idempotência: ignora se já existir par (supplier_id, subtype_desc).
INSERT INTO public.supplier_subtype_category_map (supplier_id, subtype_desc, subtype_code, category_id, match_method)
VALUES
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'T-Shirts',                 '23',  '65ebab67-60fc-40e3-ad28-360fa9694618', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Mini Colunas',              NULL,  '6f595c2f-907d-4b0b-9f62-13eef959aa0c', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Canivetes',                 NULL,  '11131ebf-f78e-41d7-8589-4f4eae9ff087', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Porta-Cartões',             NULL,  'a78025d7-d1ad-4f18-9d78-37ca1d1fbe01', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Utilitários de Viagem',     NULL,  'b4840892-abae-4b32-bfc6-2e6be8c229fe', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Anti-estress',              NULL,  '201ba25d-750e-44f8-97e0-05fdb155129e', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Capas de Chuva',            NULL,  'b91053cd-c7f9-4e6a-b8ed-ee226071b4d6', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Aventais',                  NULL,  '533a8b4d-6e73-4e88-99d9-1392d40bdd86', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Bolsas Multiusos',          NULL,  '980541dc-224b-4684-be3e-b1af7ebd9052', 'gold_lookup'),
  ('bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0', 'Suportes para Telemóvel',   NULL,  '6f595c2f-907d-4b0b-9f62-13eef959aa0c', 'gold_lookup')
ON CONFLICT (supplier_id, subtype_desc) DO NOTHING;

-- Verifica total no mapa SPOT
SELECT count(*) as total_spot_map FROM public.supplier_subtype_category_map
WHERE supplier_id='bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';;
