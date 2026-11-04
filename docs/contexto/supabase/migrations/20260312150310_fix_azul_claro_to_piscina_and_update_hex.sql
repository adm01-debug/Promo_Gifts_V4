-- 1. AZUL CLARO: equiv Azul Céu → Azul Piscina (aprovado pelo Joaquim via foto do produto 15144)
UPDATE color_equivalences 
SET promo_variation_id = '4152c812-a293-48c8-8bd0-d059d26fd123',  -- Azul Piscina
    notes = 'Corrigido Joaquim 12/03/2026: foto produto 15144 confirma Azul Piscina, não Azul Céu'
WHERE id = 'de132298-7158-46df-930f-58b9dfed1b17';

-- 2. ATUALIZAR supplier_colors.hex_code com hex REAL do site XBZ
-- Fonte: swatches JPG de xbzbrindes.com.br/img/cores/ extraídos via análise de pixels

-- 🔴 GRANDES DELTAS (>100)
UPDATE supplier_colors SET hex_code = '#FF33FF' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'ROS';  -- ROSA: #E91E63→#FF33FF
UPDATE supplier_colors SET hex_code = '#787878' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'INO';  -- INOX: #C0C0C0→#787878

-- 🟡 DELTAS MODERADOS (50-100)
UPDATE supplier_colors SET hex_code = '#999967' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'BEG';  -- BEGE: #D4C4A8→#999967
UPDATE supplier_colors SET hex_code = '#F5B077' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'BRZ';  -- BRONZE: #CD7F32→#F5B077 (nota: supplier_color hex, não muda color_variation)
UPDATE supplier_colors SET hex_code = '#E5C252' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'DOU';  -- DOURADO: #FFD700→#E5C252
UPDATE supplier_colors SET hex_code = '#FE0000' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'VM';   -- VERMELHO: #F44336→#FE0000
UPDATE supplier_colors SET hex_code = '#01CC34' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'VD';   -- VERDE: #4CAF50→#01CC34
UPDATE supplier_colors SET hex_code = '#552B17' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'MAD';  -- MADEIRA: #8B5E3C→#552B17
UPDATE supplier_colors SET hex_code = '#0066CB' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'AZU';  -- AZUL: #2196F3→#0066CB
UPDATE supplier_colors SET hex_code = '#A95D3B' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'CAR';  -- CARAMELO: #C68E17→#A95D3B
UPDATE supplier_colors SET hex_code = '#464243' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'CHU';  -- CHUMBO: #696969→#464243
UPDATE supplier_colors SET hex_code = '#4C3525' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'MAR';  -- MARROM: #795548→#4C3525
UPDATE supplier_colors SET hex_code = '#FFFF00' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'AMA';  -- AMARELO: #FFEB3B→#FFFF00
UPDATE supplier_colors SET hex_code = '#7E7F81' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'CIN';  -- CINZA: #9E9E9E→#7E7F81

-- 🟢 AJUSTES MENORES (20-50)
UPDATE supplier_colors SET hex_code = '#0099FF' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'AZC';  -- AZUL CLARO: #03A9F4→#0099FF
UPDATE supplier_colors SET hex_code = '#DEA872' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'BAM';  -- BAMBU: #D4B87A→#DEA872
UPDATE supplier_colors SET hex_code = '#FD7F04' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'LAR';  -- LARANJA: #FF9800→#FD7F04
UPDATE supplier_colors SET hex_code = '#B0582F' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'COB';  -- COBRE: #B87333→#B0582F
UPDATE supplier_colors SET hex_code = '#EAEAEA' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'TRA';  -- TRANSPARENTE: #D8D8D8→#EAEAEA
UPDATE supplier_colors SET hex_code = '#9900CC' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'ROX';  -- ROXO: #9C27B0→#9900CC
UPDATE supplier_colors SET hex_code = '#F5F3DA' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'CRE';  -- CREME: #FFFDD0→#F5F3DA
UPDATE supplier_colors SET hex_code = '#C3C3C7' WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND code = 'PRA';  -- PRATA: #C0C0C0→#C3C3C7
