\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), is_active boolean DEFAULT true,
  is_deleted boolean, secret_cost numeric
);
CREATE TABLE public.product_kit_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kit_product_id uuid NOT NULL
);
CREATE TABLE public.kit_component_print_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kit_component_id uuid NOT NULL,
  location_code text, location_name text, location_order integer,
  max_width numeric, max_height numeric, shape text, is_curved boolean,
  technique_order jsonb, is_active boolean DEFAULT true
);
CREATE VIEW public.v_kit_component_print_areas_public
WITH (security_invoker=true) AS
SELECT kpa.id, kpa.kit_component_id, kpa.location_code, kpa.location_name,
       kpa.location_order, kpa.max_width, kpa.max_height, kpa.shape,
       kpa.is_curved, kpa.technique_order
FROM public.kit_component_print_areas kpa
JOIN public.product_kit_components pkc ON pkc.id=kpa.kit_component_id
JOIN public.products p ON p.id=pkc.kit_product_id
WHERE kpa.is_active AND p.is_active AND p.is_deleted IS NOT TRUE;
GRANT SELECT ON public.product_kit_components, public.kit_component_print_areas TO anon;

\ir ../../supabase/migrations/20260829110000_kit_print_areas_anon_minimum_grant.sql

DO $$ BEGIN
  IF has_column_privilege('anon','public.products','secret_cost','SELECT')
     OR has_table_privilege('anon','public.products','SELECT') THEN
    RAISE EXCEPTION 'anon grant is broader than the view predicate';
  END IF;
END $$;

CREATE TABLE public.user_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE TABLE public.seller_discount_limits (
  user_id uuid PRIMARY KEY, max_discount_percent numeric NOT NULL
);
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_number text NOT NULL,
  client_id uuid, client_name text NOT NULL DEFAULT '', created_by uuid,
  seller_id uuid NOT NULL, organization_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft', subtotal numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0, discount_amount numeric DEFAULT 0,
  negotiation_markup_percent numeric DEFAULT 0, total numeric DEFAULT 0,
  real_discount_percent numeric DEFAULT 0, version integer DEFAULT 1,
  discount_approval_status text, discount_approved_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id uuid, product_sku text, product_name text NOT NULL,
  quantity integer NOT NULL, unit_price numeric NOT NULL, subtotal numeric NOT NULL,
  sort_order integer DEFAULT 0
);
CREATE TABLE public.quote_item_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id uuid NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  technique_id uuid, colors_count integer DEFAULT 1, positions_count integer DEFAULT 1,
  total_cost numeric DEFAULT 0
);
CREATE TABLE public.discount_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quotes(id),
  seller_id uuid NOT NULL, requested_discount_percent numeric NOT NULL,
  max_allowed_percent numeric NOT NULL, status text NOT NULL DEFAULT 'pending',
  admin_id uuid, admin_notes text, seller_notes text, responded_at timestamptz,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  valid_until timestamptz, quote_snapshot_hash text
);
CREATE UNIQUE INDEX uniq_dar_quote_pending
  ON public.discount_approval_requests(quote_id) WHERE status='pending';
CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL,
  user_id uuid NOT NULL, action text NOT NULL, field_changed text,
  old_value text, new_value text, description text NOT NULL,
  metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now()
);
CREATE TABLE public.test_dar_audit (
  id bigint GENERATED ALWAYS AS IDENTITY, request_id uuid, event text
);
CREATE TABLE public.test_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY, request_id uuid, event text
);

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id=_user_id AND role IN ('supervisor','admin','dev'))
$$;

CREATE OR REPLACE FUNCTION public.compute_quote_snapshot_hash(_quote_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SET search_path TO public AS $$
DECLARE _value text;
BEGIN
  SELECT concat_ws('|', q.client_id, q.client_name, q.subtotal,
    q.discount_percent, q.discount_amount, q.negotiation_markup_percent, q.total,
    COALESCE((SELECT string_agg(concat_ws(':', qi.product_id, qi.product_sku,
      qi.quantity, qi.unit_price, qi.subtotal), '|' ORDER BY qi.sort_order, qi.product_id)
      FROM quote_items qi WHERE qi.quote_id=q.id), ''),
    COALESCE((SELECT string_agg(concat_ws(':', p.technique_id, p.colors_count,
      p.positions_count, p.total_cost), '|' ORDER BY qi.sort_order, p.technique_id)
      FROM quote_item_personalizations p JOIN quote_items qi ON qi.id=p.quote_item_id
      WHERE qi.quote_id=q.id), ''))
  INTO _value FROM quotes q WHERE q.id=_quote_id;
  RETURN md5(COALESCE(_value,''));
END $$;

CREATE OR REPLACE FUNCTION public.fn_quotes_validate_discount()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER trg_quotes_validate_discount BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_validate_discount();

CREATE OR REPLACE FUNCTION public.test_dar_events() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE _event text;
BEGIN
  IF TG_OP='INSERT' THEN _event := 'requested';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN _event := NEW.status;
  ELSE RETURN NEW; END IF;
  INSERT INTO public.test_dar_audit(request_id,event) VALUES(NEW.id,_event);
  INSERT INTO public.test_notifications(request_id,event) VALUES(NEW.id,_event);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_test_dar_events AFTER INSERT OR UPDATE ON public.discount_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.test_dar_events();

\ir ../../supabase/migrations/20260829111000_discount_approval_transactional_integrity.sql
\ir ../../supabase/migrations/20260829112000_discount_approval_reuse_status.sql
\ir ../../supabase/migrations/20260829113000_discount_integrity_owner_and_reparent.sql

INSERT INTO public.user_roles(user_id,role) VALUES
 ('10000000-0000-4000-8000-000000000010','admin');
INSERT INTO public.seller_discount_limits(user_id,max_discount_percent) VALUES
 ('10000000-0000-4000-8000-000000000001',10),
 ('10000000-0000-4000-8000-000000000002',5);

-- Sem desconto e gestores preservam as exceções do validador original, mesmo
-- sem seller_discount_limits.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
INSERT INTO public.quotes(id,quote_number,client_name,seller_id,created_by,organization_id,
  status,subtotal,total,real_discount_percent)
VALUES('30000000-0000-4000-8000-000000000010','Q-ZERO','Cliente',
  '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001','draft',100,100,0);
INSERT INTO public.quote_items(id,quote_id,product_name,product_sku,quantity,unit_price,subtotal)
VALUES('40000000-0000-4000-8000-000000000010',
  '30000000-0000-4000-8000-000000000010','Destino','DST-1',1,1,1);

SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000010',false);
INSERT INTO public.quotes(id,quote_number,client_name,seller_id,created_by,organization_id,
  status,subtotal,total,real_discount_percent)
VALUES('30000000-0000-4000-8000-000000000011','Q-MANAGER','Cliente',
  '10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-000000000001','pending',100,10,90);

-- Solicitação: deriva valores, é idempotente e produz eventos uma vez.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
INSERT INTO public.quotes(id,quote_number,client_name,seller_id,created_by,organization_id,
  status,subtotal,total,real_discount_percent)
VALUES('30000000-0000-4000-8000-000000000001','Q-1','Cliente',
  '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001','pending_approval',100,80,20);
INSERT INTO public.quote_items(id,quote_id,product_name,product_sku,quantity,unit_price,subtotal)
VALUES('40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001','Caneta','CAN-1',10,10,100);
INSERT INTO public.quote_item_personalizations(
  id,quote_item_id,technique_id,colors_count,positions_count,total_cost
) VALUES (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',2,1,25
);

SELECT (public.request_discount_approval_transactional(
  '30000000-0000-4000-8000-000000000001','cliente estratégico')).id AS request_id \gset
SELECT (public.request_discount_approval_transactional(
  '30000000-0000-4000-8000-000000000001','retry')).id AS retry_id \gset
SELECT set_config('app.test.request_id', :'request_id', false);
SELECT set_config('app.test.retry_id', :'retry_id', false);

DO $$ BEGIN
  IF current_setting('app.test.request_id') <> current_setting('app.test.retry_id') THEN
    RAISE EXCEPTION 'request retry not idempotent';
  END IF;
  IF (SELECT requested_discount_percent FROM discount_approval_requests
      WHERE id=current_setting('app.test.request_id')::uuid) <> 20
     OR (SELECT max_allowed_percent FROM discount_approval_requests
         WHERE id=current_setting('app.test.request_id')::uuid) <> 10 THEN
    RAISE EXCEPTION 'client-supplied values were not derived server-side';
  END IF;
  IF (SELECT count(*) FROM test_dar_audit
      WHERE request_id=current_setting('app.test.request_id')::uuid AND event='requested') <> 1
     OR (SELECT count(*) FROM test_notifications
         WHERE request_id=current_setting('app.test.request_id')::uuid AND event='requested') <> 1
     OR (SELECT count(*) FROM quote_history WHERE quote_id='30000000-0000-4000-8000-000000000001'
         AND action='discount_approval_requested') <> 1 THEN
    RAISE EXCEPTION 'request event cardinality mismatch';
  END IF;
END $$;

-- Falha após INSERT do DAR reverte DAR, eventos e histórico.
INSERT INTO public.quotes(id,quote_number,client_name,seller_id,created_by,organization_id,
  status,subtotal,total,real_discount_percent)
VALUES('30000000-0000-4000-8000-000000000002','Q-2','Cliente',
  '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001','pending_approval',100,80,20);
CREATE OR REPLACE FUNCTION public.test_fail_quote_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.test_fail_quote_update',true)='on' THEN
    RAISE EXCEPTION 'synthetic quote failure';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_test_fail_quote_update BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.test_fail_quote_update();

DO $$ BEGIN
  PERFORM set_config('app.test_fail_quote_update','on',true);
  BEGIN
    PERFORM public.request_discount_approval_transactional(
      '30000000-0000-4000-8000-000000000002','must rollback');
    RAISE EXCEPTION 'failure injection did not fire';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  PERFORM set_config('app.test_fail_quote_update','off',true);
  IF EXISTS (SELECT 1 FROM discount_approval_requests WHERE quote_id='30000000-0000-4000-8000-000000000002')
     OR EXISTS (SELECT 1 FROM quote_history WHERE quote_id='30000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'request rollback left partial state';
  END IF;
END $$;

-- Aprovação e retry terminal não duplicam evento/histórico.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000010',false);
SELECT (public.respond_discount_approval_transactional(:'request_id',true,'ok')).status;
SELECT (public.respond_discount_approval_transactional(:'request_id',true,'retry')).status;
DO $$ BEGIN
  IF (SELECT status FROM quotes WHERE id='30000000-0000-4000-8000-000000000001') <> 'pending'
     OR (SELECT count(*) FROM test_dar_audit
         WHERE request_id=current_setting('app.test.request_id')::uuid AND event='approved') <> 1
     OR (SELECT count(*) FROM test_notifications
         WHERE request_id=current_setting('app.test.request_id')::uuid AND event='approved') <> 1
     OR (SELECT count(*) FROM quote_history WHERE quote_id='30000000-0000-4000-8000-000000000001'
         AND action='discount_approved') <> 1 THEN
    RAISE EXCEPTION 'approval idempotency/cardinality mismatch';
  END IF;
END $$;

-- Reutilização de aprovação válida também reconcilia pending_approval->pending,
-- sem criar um novo DAR nem novo histórico.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
UPDATE quotes SET status='pending_approval'
WHERE id='30000000-0000-4000-8000-000000000001';
SELECT (public.request_discount_approval_transactional(
  '30000000-0000-4000-8000-000000000001','reuse')).id AS reused_id \gset
SELECT set_config('app.test.reused_id', :'reused_id', false);
DO $$ BEGIN
  IF current_setting('app.test.reused_id')::uuid <> current_setting('app.test.request_id')::uuid
     OR (SELECT status FROM quotes WHERE id='30000000-0000-4000-8000-000000000001') <> 'pending'
     OR (SELECT count(*) FROM discount_approval_requests
         WHERE quote_id='30000000-0000-4000-8000-000000000001') <> 1
     OR (SELECT count(*) FROM quote_history
         WHERE quote_id='30000000-0000-4000-8000-000000000001'
           AND action='discount_approval_requested') <> 1 THEN
    RAISE EXCEPTION 'approved snapshot reuse did not reconcile quote idempotently';
  END IF;
END $$;

-- Aprovações legadas sem expiração continuam válidas. Snapshot final:
-- delete/reinsert idêntico passa; mudança financeira reverte.
UPDATE discount_approval_requests SET valid_until=NULL
WHERE id=current_setting('app.test.request_id')::uuid;
BEGIN;
DELETE FROM quote_items WHERE quote_id='30000000-0000-4000-8000-000000000001';
INSERT INTO quote_items(id,quote_id,product_name,product_sku,quantity,unit_price,subtotal)
VALUES('40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001','Caneta','CAN-1',10,10,100);
INSERT INTO quote_item_personalizations(
  id,quote_item_id,technique_id,colors_count,positions_count,total_cost
) VALUES (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',2,1,25
);
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

DO $$ BEGIN
  BEGIN
    UPDATE quote_items SET unit_price=11, subtotal=110
    WHERE quote_id='30000000-0000-4000-8000-000000000001';
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'changed final snapshot should fail';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS (SELECT 1 FROM quote_items
             WHERE quote_id='30000000-0000-4000-8000-000000000001' AND unit_price=11) THEN
    RAISE EXCEPTION 'changed item survived rollback';
  END IF;
END $$;

-- Reparent deve validar o pai antigo e o novo. Alterar o pai antigo aprovado
-- por item ou personalização é revertido.
DO $$ BEGIN
  BEGIN
    UPDATE quote_items SET quote_id='30000000-0000-4000-8000-000000000010'
    WHERE id='40000000-0000-4000-8000-000000000001';
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'item reparent should invalidate old approved quote';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF (SELECT quote_id FROM quote_items WHERE id='40000000-0000-4000-8000-000000000001')
     <> '30000000-0000-4000-8000-000000000001'::uuid THEN
    RAISE EXCEPTION 'item reparent survived rollback';
  END IF;

  BEGIN
    UPDATE quote_item_personalizations
    SET quote_item_id='40000000-0000-4000-8000-000000000010'
    WHERE id='50000000-0000-4000-8000-000000000001';
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'personalization reparent should invalidate old approved quote';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF (SELECT quote_item_id FROM quote_item_personalizations
      WHERE id='50000000-0000-4000-8000-000000000001')
     <> '40000000-0000-4000-8000-000000000001'::uuid THEN
    RAISE EXCEPTION 'personalization reparent survived rollback';
  END IF;
END $$;

-- Rejeição transacional libera somente pending_approval->draft e mantém o
-- snapshot rejeitado imutável.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
INSERT INTO public.quotes(id,quote_number,client_name,seller_id,created_by,organization_id,
  status,subtotal,total,real_discount_percent)
VALUES('30000000-0000-4000-8000-000000000003','Q-3','Cliente',
  '10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001','pending_approval',100,80,20);
INSERT INTO quote_items(quote_id,product_name,product_sku,quantity,unit_price,subtotal)
VALUES('30000000-0000-4000-8000-000000000003','Agenda','AG-1',10,10,100);
SELECT (public.request_discount_approval_transactional(
  '30000000-0000-4000-8000-000000000003','rejeitar')).id AS reject_id \gset
SELECT set_config('app.test.reject_id', :'reject_id', false);
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000010',false);
SELECT (public.respond_discount_approval_transactional(:'reject_id',false,'acima da política')).status;

DO $$ BEGIN
  IF (SELECT status FROM quotes WHERE id='30000000-0000-4000-8000-000000000003') <> 'draft' THEN
    RAISE EXCEPTION 'rejection did not move quote to draft';
  END IF;
  BEGIN
    UPDATE quotes SET total=70 WHERE id='30000000-0000-4000-8000-000000000003';
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'financial mutation after rejection should fail';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- Vendedor não pode decidir; gestor não pode trocar decisão terminal.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
  BEGIN
    PERFORM public.respond_discount_approval_transactional(
      current_setting('app.test.request_id')::uuid,false,'forged');
    RAISE EXCEPTION 'seller decision should fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000010',false);
DO $$ BEGIN
  BEGIN
    PERFORM public.respond_discount_approval_transactional(
      current_setting('app.test.request_id')::uuid,false,'conflict');
    RAISE EXCEPTION 'conflicting terminal decision should fail';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

SELECT 'approved plan database scenarios: PASS' AS result;
