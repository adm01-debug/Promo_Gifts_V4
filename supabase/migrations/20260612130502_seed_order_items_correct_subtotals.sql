
-- subtotal = ROUND(qty * (unit_price - discount_amount + personalization_cost), 2)
-- Usando discount_amount=0, personalization_cost=0 para simplicidade
INSERT INTO public.order_items (
  order_id, product_id, product_sku, product_name, product_image_url,
  quantity, unit_price, subtotal, discount_amount, personalization_cost, created_at
) VALUES
-- PED-26-0005 (hoje)
('11308c8e-fc34-400a-8217-5b85cd57c0f7',
 'e0ad65da-6812-404e-bf7e-debf68774d6c', '18904', 'Garrafa térmica inox 320ml',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-18904-01/public',
 50, 45.00, 2250.00, 0, 0, now()),
('11308c8e-fc34-400a-8217-5b85cd57c0f7',
 '818883b9-11ca-4408-8f97-d472b5e299fe', 'KT-9094Q', 'Kit para café - 5 pçs',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/sm-kt-9094q-main/public',
 20, 60.00, 1200.00, 0, 0, now()),
-- PED-26-0004 (2 dias atrás)
('73164101-b28b-4883-b0ff-977a12c03884',
 '46588525-cc7e-47ff-9101-d30c26ebc6fb', '57252', 'Caixa de som em alumínio reciclado',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/spot-57252_103/public',
 30, 180.00, 5400.00, 0, 0, now() - INTERVAL '2 days'),
('73164101-b28b-4883-b0ff-977a12c03884',
 '92b81fde-b711-427f-93ba-61ff74d1578f', '04508', 'Mochila nylon 18L',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-mochila-nylon-20-litros-17743-1702555951/public',
 25, 115.00, 2875.00, 0, 0, now() - INTERVAL '2 days'),
-- PED-26-0001 (5 dias atrás)
('3d77ab9b-46fa-4e93-b32a-c8a681d0a2e5',
 '2522941c-11ec-4327-8342-eaea07367741', 'IX-02411', 'Conj. garrafa e caneca inox 3 pçs',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/sm-ix-02411-00/public',
 100, 75.00, 7500.00, 0, 0, now() - INTERVAL '5 days'),
('3d77ab9b-46fa-4e93-b32a-c8a681d0a2e5',
 '6037a3a0-118a-4c7b-b5bd-0f6a3e8c857c', '18518A', 'Garrafa térmica 780ml',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-garrafa-termica-780ml-26079-1761939072/public',
 60, 65.00, 3900.00, 0, 0, now() - INTERVAL '5 days'),
-- PED-26-0002 (12 dias atrás)
('9778f5be-cff1-4691-b9f8-e7fd333826fe',
 '4edfb993-05ce-4f2d-be5d-06c0f56213e9', '18759', 'Caderneta em bambu',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-caderneta-em-bambu-19703-1726254845/public',
 80, 38.00, 3040.00, 0, 0, now() - INTERVAL '12 days'),
('9778f5be-cff1-4691-b9f8-e7fd333826fe',
 '3774cfe1-d919-4eee-995b-ec52bc5edbba', '03970', 'Copo inox 150ml',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-03970-01/public',
 40, 35.00, 1400.00, 0, 0, now() - INTERVAL '12 days'),
-- PED-26-0003 (18 dias atrás)
('5bda99c9-f069-4c00-9d19-9c95c983526c',
 'fbe2a990-8e2c-4610-82ef-ac6e34aa17ff', 'P@08098', 'Pochete de nylon impermeável',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-p08098-20958/public',
 50, 35.00, 1750.00, 0, 0, now() - INTERVAL '18 days');
;
