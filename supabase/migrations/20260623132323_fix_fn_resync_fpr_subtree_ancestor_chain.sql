CREATE OR REPLACE FUNCTION public.fn_resync_full_path_readable(
    p_root_id UUID DEFAULT NULL
)
RETURNS TABLE(updated_count INT, elapsed_ms NUMERIC)
LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
DECLARE
    v_start TIMESTAMPTZ := clock_timestamp();
    v_updated INT;
    v_root_chain TEXT;
BEGIN
    IF p_root_id IS NULL THEN
        -- Resync GLOBAL: partir das raízes reais
        WITH RECURSIVE correct_fpr AS (
            SELECT c.id, UPPER(COALESCE(c.name,'')) AS chain
            FROM categories c WHERE c.parent_id IS NULL
            UNION ALL
            SELECT child.id, cf.chain||' > '||UPPER(COALESCE(child.name,''))
            FROM categories child JOIN correct_fpr cf ON child.parent_id = cf.id
        )
        UPDATE categories cat SET full_path_readable = cf.chain
        FROM correct_fpr cf
        WHERE cat.id = cf.id AND cat.full_path_readable IS DISTINCT FROM cf.chain;
    ELSE
        -- Resync de subárvore: calcular a chain correta a partir dos ancestrais reais
        SELECT CASE WHEN c.parent_id IS NULL THEN UPPER(COALESCE(c.name,''))
                    ELSE (SELECT full_path_readable FROM categories WHERE id = c.parent_id)
                         ||' > '||UPPER(COALESCE(c.name,''))
               END INTO v_root_chain
        FROM categories c WHERE c.id = p_root_id;

        IF v_root_chain IS NULL THEN
            RAISE EXCEPTION 'Category % not found or parent has no full_path_readable', p_root_id;
        END IF;

        WITH RECURSIVE correct_fpr AS (
            SELECT p_root_id AS id, v_root_chain AS chain
            UNION ALL
            SELECT child.id, cf.chain||' > '||UPPER(COALESCE(child.name,''))
            FROM categories child JOIN correct_fpr cf ON child.parent_id = cf.id
        )
        UPDATE categories cat SET full_path_readable = cf.chain
        FROM correct_fpr cf
        WHERE cat.id = cf.id AND cat.full_path_readable IS DISTINCT FROM cf.chain;
    END IF;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN QUERY SELECT v_updated, ROUND(EXTRACT(EPOCH FROM (clock_timestamp()-v_start))*1000, 2);
END;
$fn$;;
