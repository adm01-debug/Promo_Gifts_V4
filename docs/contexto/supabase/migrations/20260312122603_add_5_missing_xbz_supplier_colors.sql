-- PASSO 1: Criar 5 supplier_colors faltantes para XBZ
-- Seguindo padrão: code = 3 letras, api_color_id = xbz_color_id da API, source = 'xbz_api'
INSERT INTO supplier_colors (organization_id, supplier_id, name, code, hex_code, api_color_id, source, notes)
VALUES
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'd6718a29-e954-4c1b-bd84-03ea24884900', 
   'MADEIRA', 'MAD', '#8B5E3C', '16', 'xbz_api', 'Material orgânico — 152 variantes'),
  
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'd6718a29-e954-4c1b-bd84-03ea24884900', 
   'CHUMBO', 'CHU', '#696969', '13', 'xbz_api', 'Cinza escuro — 132 variantes'),
  
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'd6718a29-e954-4c1b-bd84-03ea24884900', 
   'KRAFT', 'KRA', '#C4A36D', '17', 'xbz_api', 'Papel kraft — 75 variantes'),
  
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'd6718a29-e954-4c1b-bd84-03ea24884900', 
   'BAMBU', 'BAM', '#D4B87A', '21', 'xbz_api', 'Material orgânico — 42 variantes'),
  
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'd6718a29-e954-4c1b-bd84-03ea24884900', 
   'BRONZE', 'BRZ', '#CD7F32', '32', 'xbz_api', 'Metálico dourado — 6 variantes');
