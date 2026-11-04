-- ETAPA 5: Sincronizar is_active = active na categoria divergente
UPDATE categories
SET is_active = active
WHERE active IS DISTINCT FROM is_active;
