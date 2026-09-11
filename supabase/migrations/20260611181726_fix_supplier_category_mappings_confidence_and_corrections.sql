
-- Passo 8: Corrigir supplier_category_mappings — 2 operações:
-- A) Elevar confidence de mapeamentos CORRETOS com score baixo
-- B) Corrigir category_id de mapeamentos ERRADOS

-- A) ELEVAR CONFIDENCE — mapeamentos semanticamente corretos
UPDATE supplier_category_mappings SET confidence = 1.00
WHERE id = '6a71b3c9-e15d-49c2-89bf-1a0bf9be9666';  -- "Copos" Asia → Copos (nome idêntico)

UPDATE supplier_category_mappings SET confidence = 0.95
WHERE id IN (
  '2fb756c9-45f2-44aa-9d82-d543cfc73ad8',  -- "Kit Ferramenta" → Kit Ferramentas
  '78694bb9-eeeb-4621-aade-9d7d481a0dea',  -- "Blocos de Anotações" → Cadernetas|Cadernos|Blocos
  'd424881d-9a44-4474-be48-7180e309ba1c'   -- "Cadernos" → Cadernetas|Cadernos|Blocos
);

UPDATE supplier_category_mappings SET confidence = 0.90
WHERE id IN (
  '67374031-04b9-4f71-91a8-71c416a002dc',  -- "Caderno Espiral" → Cadernetas|Cadernos|Blocos
  'fedb5834-6484-49d2-ae85-8cf659285445',  -- "Garrafas" → Squeeze|Garrafas
  '73d827a4-2051-4565-ad96-e1a64d1a15a5',  -- "Vidro Borossilicato" → Copos|Vidro
  '34612236-35d7-4577-924c-f3d2b277a3f0'   -- "Vidro" → Copos|Vidro
);

UPDATE supplier_category_mappings SET confidence = 0.85
WHERE id IN (
  'b221cc8a-9c57-48cc-91c6-56d7a8d421b4',  -- "Bambu" Asia → Canetas|Bambu
  '7dd64eac-01dd-4c1b-a4e6-14295649d6cd'   -- "Poliéster & TNT" → Sacola|Ecobag|TNT
);

UPDATE supplier_category_mappings SET confidence = 0.75
WHERE id IN (
  '66cc1ce9-483c-4f31-a7c4-b1cbdd1e0858',  -- "Kit Churrasco & Vinho & Drink" → Kit Churrasco
  'd23fa454-d8d6-4a26-9a31-ef7afd94a48a',  -- "Canecas & Garrafas" → Squeeze|Garrafas
  'c46855a7-632d-4472-8c6a-f8d698d5bd24',  -- "Guarda Chuvas & Lancheiras" → Marmitas|Lancheiras
  '195310bd-81da-480c-9c13-b3d940a7961d',  -- "Sacolas" → Sacola|Ecobag|Algodão
  '42e93401-b269-4ba0-8cab-c7b8b5ee932a'   -- "Canetas" Asia → Canetas|Metal (aceitável no contexto)
);

-- B) CORRIGIR CATEGORIA INTERNA — mapeamentos com categoria errada

-- "Kit Escritório" Asia → deveria ser Papelaria | Escritório, não Canetas | Metal
UPDATE supplier_category_mappings 
SET category_id = '1f004c4e-0d01-47b9-9b97-0fc4d8bca2d1', confidence = 0.80
WHERE id = 'c0c875e2-5b5d-4c9f-b3b0-76d9e1862e66';

-- "Acessórios" Asia → deveria ser Utensílios | Decoração, não Kit Executivo
UPDATE supplier_category_mappings 
SET category_id = 'd9fbf215-1841-4f2b-9a7c-e5b0238fbcda', confidence = 0.70
WHERE id = 'd0f51c81-df30-444d-93d7-0593dcfa17f2';

-- "Mochilas & Malas" Asia → deveria ser Mochilas (geral), não Mochila Notebook
UPDATE supplier_category_mappings 
SET category_id = 'f285c7c7-f143-4ed8-b33d-6b899d517ee3', confidence = 0.85
WHERE id = 'bcb0f986-d879-49e4-87be-d616e482ee83';

-- "Algodão & Juta" Asia → deveria ser Sacola|Ecobag, não Bolsa Térmica
UPDATE supplier_category_mappings 
SET category_id = 'e0000000-0000-0000-0000-000000000000', confidence = 0.80
WHERE id = '498ca8bb-39ee-4767-9458-f7b89042a4f0';

-- "Malas & Maletas" Asia → Mochilas, não Mochila Notebook
UPDATE supplier_category_mappings 
SET category_id = 'f285c7c7-f143-4ed8-b33d-6b899d517ee3', confidence = 0.75
WHERE id = 'a5c76e0e-eefd-4d6a-87d0-7f31e0f03f79';

-- "Escritório" Asia → Papelaria | Escritório, não Canetas | Metal
UPDATE supplier_category_mappings 
SET category_id = '1f004c4e-0d01-47b9-9b97-0fc4d8bca2d1', confidence = 0.85
WHERE id = 'fb6ee985-a53d-4e31-b4ec-7d829f75dc8a';

-- "Caderno c/ Caneta" Asia → Cadernetas | Cadernos | Blocos, não Canetas | Ecológicas
UPDATE supplier_category_mappings 
SET category_id = 'cad3e001-0001-4001-8001-000000000001', confidence = 0.85
WHERE id = '0b1c57b1-27d6-4892-a7ca-1aca374f8182';

-- "Conjuntos Escritório" Asia → Kit Executivo, não Canetas | Metal
UPDATE supplier_category_mappings 
SET category_id = 'e739acc1-c9f2-4201-bbb3-49f8b0101f3c', confidence = 0.80
WHERE id = '9ca28dfe-cb30-4613-a4a0-cbf0f7da951e';

-- "Ecológico" Asia → Sacola | Ecobag (contexto Asia: sacolas ecológicas), não Copos | Plástico
UPDATE supplier_category_mappings 
SET category_id = 'e0000000-0000-0000-0000-000000000000', confidence = 0.72
WHERE id = '2dff1ef1-f129-4995-8e4b-f296ed624c23';

-- "Canecas" Asia → Canecas (BAR|COZINHA > CANECAS), não Copos | Inox
UPDATE supplier_category_mappings 
SET category_id = '05bfe651-78c7-4a26-8a62-aba0d72ca2af', confidence = 0.90
WHERE id = '96c57a59-6f0a-4fd3-9562-69c8d264e011';

-- "Xícaras" Asia → Canecas (mais próximo disponível), não Copos | Vidro
UPDATE supplier_category_mappings 
SET category_id = '05bfe651-78c7-4a26-8a62-aba0d72ca2af', confidence = 0.80
WHERE id = '5419b4bd-167a-4302-bf61-113caf14c595';

-- "Diversos" Asia → Utensílios | Decoração (mais genérico, não Chaveiros)
UPDATE supplier_category_mappings 
SET category_id = 'd9fbf215-1841-4f2b-9a7c-e5b0238fbcda', confidence = 0.65
WHERE id = '5b9c16a4-35d5-42af-9975-98087c939335';

-- "Promoções" Só Marcas → Bar | Cozinha: contexto Só Marcas (especializada em Bar|Cozinha)
-- Mantém categoria mas aumenta confiança com nota contextual
UPDATE supplier_category_mappings SET confidence = 0.72
WHERE id = '4a66b8bb-963c-47c1-91c0-1e7843365075';

-- "Lançamentos" Só Marcas → Bar | Cozinha: mesmo raciocínio
UPDATE supplier_category_mappings SET confidence = 0.72
WHERE id = '79556531-54f2-41b8-8e85-4b741a01714a';
;
