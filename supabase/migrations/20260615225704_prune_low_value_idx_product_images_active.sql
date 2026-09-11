-- Poda do único índice de baixíssimo valor: is_active=true casa com 73.187/73.210 linhas
-- (seletividade ~0), 11 scans no histórico. Planner praticamente nunca o escolhe.
-- Reversível a qualquer momento. Demais 13 índices preservados por uso comprovado.
DROP INDEX IF EXISTS public.idx_product_images_active;;
