DROP TRIGGER IF EXISTS trg_sync_quote_dar ON public.discount_approval_requests;
CREATE TRIGGER trg_sync_quote_dar
AFTER INSERT OR UPDATE OF status, responded_at OR DELETE
ON public.discount_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_quote_discount_approval();;
