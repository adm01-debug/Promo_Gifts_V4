CREATE OR REPLACE FUNCTION public.fn_apply_crm_callback(
  p_quote_id UUID, p_event_type TEXT, p_occurred_at TIMESTAMPTZ,
  p_approved_by TEXT DEFAULT NULL, p_rejection_reason TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL, p_order_number TEXT DEFAULT NULL)
RETURNS TABLE(affected INTEGER, applied BOOLEAN, detail TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$...$$;;
GRANT EXECUTE ON FUNCTION public.fn_apply_crm_callback TO service_role;;
