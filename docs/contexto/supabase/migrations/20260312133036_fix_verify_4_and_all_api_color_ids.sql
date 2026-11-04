-- PASSO B-1: Verificar as 4 equivalências que mantêm variação
UPDATE color_equivalences SET verified = true, notes = 'Confirmado Joaquim 12/03/2026' WHERE id = '8272b55b-ef30-441f-80d6-5f5dac10e6f6'; -- BRANCO → Branco
UPDATE color_equivalences SET verified = true, notes = 'Confirmado Joaquim 12/03/2026' WHERE id = 'b3601a53-d9df-48b8-b1bb-6d9ff8486e3b'; -- AMARELO → Amarelo Ouro
UPDATE color_equivalences SET verified = true, notes = 'Confirmado Joaquim 12/03/2026' WHERE id = '84219070-fe06-493c-b920-4f5675465f0b'; -- PRATA → Prata
UPDATE color_equivalences SET verified = true, notes = 'Confirmado Joaquim 12/03/2026' WHERE id = 'ba6d25c7-ca87-4a27-afa9-45805fa913b3'; -- PRETO → Preto

-- PASSO B-2: Corrigir api_color_id em todas as supplier_colors XBZ
-- Fonte: CorWebPrincipalId do staging (xbz_color_equivalences.xbz_color_id)
UPDATE supplier_colors SET api_color_id = '2'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'AMA';  -- AMARELO: 6→2
UPDATE supplier_colors SET api_color_id = '18' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'BEG';  -- BEGE: null→18
UPDATE supplier_colors SET api_color_id = '5'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'BRA';  -- BRANCO: 8→5
UPDATE supplier_colors SET api_color_id = '34' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'CIN';  -- CINZA: 30→34
UPDATE supplier_colors SET api_color_id = '15' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'COB';  -- COBRE: ''→15
UPDATE supplier_colors SET api_color_id = '10' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'DOU';  -- DOURADO: ''→10
UPDATE supplier_colors SET api_color_id = '8'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'EST';  -- ESTAMPA: null→8
UPDATE supplier_colors SET api_color_id = '19' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'INO';  -- INOX: 32→19
UPDATE supplier_colors SET api_color_id = '11' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'LAR';  -- LARANJA: 4→11
UPDATE supplier_colors SET api_color_id = '14' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'MAR';  -- MARROM: 5→14
UPDATE supplier_colors SET api_color_id = '12' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'PRA';  -- PRATA: 10→12
UPDATE supplier_colors SET api_color_id = '9'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'PRE';  -- PRETO: 13→9
UPDATE supplier_colors SET api_color_id = '6'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'ROS';  -- ROSA: 14→6
UPDATE supplier_colors SET api_color_id = '7'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'ROX';  -- ROXO: 17→7
UPDATE supplier_colors SET api_color_id = '33' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'TRA';  -- TRANSPARENTE: null→33
UPDATE supplier_colors SET api_color_id = '4'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'VD';   -- VERDE: 18→4
UPDATE supplier_colors SET api_color_id = '3'  WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'VM';   -- VERMELHO: 21→3
-- AZUL CLARO e CREME: sem CorWebPrincipalId no staging → NULL
UPDATE supplier_colors SET api_color_id = NULL WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'AZC';  -- AZUL CLARO: 2→NULL
UPDATE supplier_colors SET api_color_id = NULL WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'CRE';  -- CREME: 28→NULL
UPDATE supplier_colors SET api_color_id = NULL WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'CAR';  -- CARAMELO: ''→NULL
