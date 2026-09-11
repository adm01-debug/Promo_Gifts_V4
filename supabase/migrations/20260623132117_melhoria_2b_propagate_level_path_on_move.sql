CREATE OR REPLACE FUNCTION public.fn_trigger_propagate_fpr()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
BEGIN
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
    IF OLD.name IS NOT DISTINCT FROM NEW.name AND OLD.parent_id IS NOT DISTINCT FROM NEW.parent_id THEN RETURN NEW; END IF;
    IF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        WITH RECURSIVE sub AS (
            SELECT c.id,
                   NEW.full_path_readable||' > '||UPPER(COALESCE(c.name,'')) AS fpr,
                   NEW.path||c.id::TEXT||'/'                                   AS p,
                   NEW.level+1                                                  AS lv
            FROM categories c WHERE c.parent_id = NEW.id
            UNION ALL
            SELECT c2.id, s.fpr||' > '||UPPER(COALESCE(c2.name,'')), s.p||c2.id::TEXT||'/', s.lv+1
            FROM categories c2 JOIN sub s ON c2.parent_id = s.id
        )
        UPDATE categories ct
        SET full_path_readable = s.fpr, path = s.p, level = s.lv
        FROM sub s
        WHERE ct.id = s.id
          AND (ct.full_path_readable IS DISTINCT FROM s.fpr OR ct.path IS DISTINCT FROM s.p OR ct.level IS DISTINCT FROM s.lv);
    ELSE
        WITH RECURSIVE sub AS (
            SELECT c.id, NEW.full_path_readable||' > '||UPPER(COALESCE(c.name,'')) AS chain
            FROM categories c WHERE c.parent_id = NEW.id
            UNION ALL
            SELECT c2.id, s.chain||' > '||UPPER(COALESCE(c2.name,''))
            FROM categories c2 JOIN sub s ON c2.parent_id = s.id
        )
        UPDATE categories ct SET full_path_readable = s.chain FROM sub s
        WHERE ct.id = s.id AND ct.full_path_readable IS DISTINCT FROM s.chain;
    END IF;
    RETURN NEW;
END;
$fn$;;
