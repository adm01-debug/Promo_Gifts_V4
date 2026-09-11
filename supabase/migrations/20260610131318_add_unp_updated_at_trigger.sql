DROP TRIGGER IF EXISTS trg_unp_updated_at ON public.user_notification_preferences;
CREATE TRIGGER trg_unp_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();;
