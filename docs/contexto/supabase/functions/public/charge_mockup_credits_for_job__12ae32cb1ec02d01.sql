CREATE OR REPLACE FUNCTION public.charge_mockup_credits_for_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance   numeric(10,2);
  v_credit_id uuid;
BEGIN
  IF NEW.status = 'processing' AND (OLD.status IS NULL OR OLD.status != 'processing') THEN
    SELECT id, balance INTO v_credit_id, v_balance
    FROM public.mockup_credits
    WHERE user_id = NEW.user_id
    FOR UPDATE;
    
    IF v_credit_id IS NULL THEN
      RAISE EXCEPTION 'Conta de créditos não encontrada pro user %', NEW.user_id;
    END IF;
    
    IF v_balance < NEW.estimated_cost THEN
      RAISE EXCEPTION 'Saldo insuficiente: necessário R$ %, disponível R$ %', 
        NEW.estimated_cost, v_balance;
    END IF;
    
    UPDATE public.mockup_credits SET 
      balance             = balance - NEW.estimated_cost,
      lifetime_spent      = lifetime_spent + NEW.estimated_cost,
      current_month_spent = current_month_spent + NEW.estimated_cost,
      current_day_spent   = current_day_spent + NEW.estimated_cost
    WHERE user_id = NEW.user_id;
    
    INSERT INTO public.mockup_credit_transactions (
      user_id, credit_account_id, type, amount, balance_before, balance_after, job_id, description
    ) VALUES (
      NEW.user_id, v_credit_id, 'charge', NEW.estimated_cost, v_balance, 
      v_balance - NEW.estimated_cost, NEW.id, 
      format('Geração de %s mockups - Job %s', NEW.total_mockups, NEW.id)
    );
  END IF;
  RETURN NEW;
END $function$
