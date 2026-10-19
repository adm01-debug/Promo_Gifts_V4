CREATE OR REPLACE FUNCTION public.calculate_category_hierarchy() ... (adicionado full_path_readable);
CREATE OR REPLACE FUNCTION public.fn_trigger_propagate_fpr() ... (nova função de propagação);
DROP TRIGGER IF EXISTS trigger_calculate_hierarchy ON categories;
CREATE TRIGGER trigger_calculate_hierarchy BEFORE INSERT OR UPDATE OF name, parent_id ON categories ...;
DROP TRIGGER IF EXISTS trg_propagate_fpr ON categories;
CREATE TRIGGER trg_propagate_fpr AFTER UPDATE OF name, parent_id ON categories ...;
CREATE OR REPLACE FUNCTION public.fn_resync_full_path_readable(UUID DEFAULT NULL) ... (função de resync manual);
