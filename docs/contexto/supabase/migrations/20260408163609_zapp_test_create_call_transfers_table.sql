-- Versão adaptada da migration 01 pro schema zapp_test
-- Substituí public.* por zapp_test.* e removi RLS (testaremos isolado)

CREATE TABLE zapp_test.call_transfers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_call_id    UUID NULL,
  contact_id          UUID NOT NULL,
  contact_phone       TEXT NOT NULL,
  from_agent_id       UUID NOT NULL,
  from_agent_name     TEXT NOT NULL,
  to_agent_id         UUID NULL,
  to_agent_name       TEXT NULL,
  to_department       TEXT NOT NULL,
  accepted_by_agent_id   UUID NULL,
  accepted_by_agent_name TEXT NULL,
  reason              TEXT NOT NULL,
  context_summary     TEXT NULL,
  urgency             TEXT NOT NULL DEFAULT 'normal',
  status              TEXT NOT NULL DEFAULT 'pending',
  callback_call_id    UUID NULL,
  gap_seconds         INTEGER NULL,
  customer_notified   BOOLEAN NOT NULL DEFAULT FALSE,
  customer_notified_at TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ NULL,
  completed_at        TIMESTAMPTZ NULL,
  expired_at          TIMESTAMPTZ NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT call_transfers_status_check
    CHECK (status IN ('pending', 'accepted', 'completed', 'failed', 'cancelled', 'expired')),
  CONSTRAINT call_transfers_urgency_check
    CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  CONSTRAINT call_transfers_reason_not_empty
    CHECK (LENGTH(TRIM(reason)) >= 3)
);

CREATE INDEX idx_test_ct_contact ON zapp_test.call_transfers(contact_id);
CREATE INDEX idx_test_ct_from_agent ON zapp_test.call_transfers(from_agent_id, created_at DESC);
CREATE INDEX idx_test_ct_to_agent_pending ON zapp_test.call_transfers(to_agent_id, status) WHERE status = 'pending';
CREATE INDEX idx_test_ct_dept_pending ON zapp_test.call_transfers(to_department, status, created_at) WHERE status = 'pending';

-- Trigger de lifecycle
CREATE OR REPLACE FUNCTION zapp_test.fn_calc_transfer_gap()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.accepted_at := COALESCE(NEW.accepted_at, NOW());
  END IF;
  IF NEW.status = 'completed' AND OLD.status IN ('accepted', 'pending') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    NEW.gap_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.created_at))::INTEGER;
  END IF;
  IF NEW.status = 'expired' AND OLD.status = 'pending' THEN
    NEW.expired_at := COALESCE(NEW.expired_at, NOW());
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_test_ct_lifecycle
  BEFORE UPDATE ON zapp_test.call_transfers
  FOR EACH ROW
  EXECUTE FUNCTION zapp_test.fn_calc_transfer_gap();

SELECT 'Tabela e trigger criados' AS status;
