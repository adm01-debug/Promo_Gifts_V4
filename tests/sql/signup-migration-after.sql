INSERT INTO auth.users VALUES
 ('10000000-0000-4000-8000-000000000002','normal@example.invalid','{"name":"  Normal  ","department":" Sales ","title":"Test"}'),
 ('10000000-0000-4000-8000-000000000003','null@example.invalid',NULL),
 ('10000000-0000-4000-8000-000000000004','invalid@example.invalid','{"role":"unknown","name":" ","full_name":"Fallback"}');
DO $$
BEGIN
  IF (SELECT count(*) FROM profiles WHERE user_id = id) <> 3 OR (SELECT count(*) FROM user_roles WHERE role='vendedor') <> 3 THEN
    RAISE EXCEPTION 'Signup did not preserve identity and safe default role';
  END IF;
  IF NOT EXISTS (SELECT FROM profiles WHERE email='normal@example.invalid' AND full_name='Normal'
    AND department='Sales' AND preferences='{"title":"Test"}'::jsonb AND is_active) THEN
    RAISE EXCEPTION 'Metadata preservation regression';
  END IF;
  IF NOT EXISTS (SELECT FROM profiles WHERE email='null@example.invalid' AND full_name=email) OR
     NOT EXISTS (SELECT FROM profiles WHERE email='invalid@example.invalid' AND full_name='Fallback') THEN
    RAISE EXCEPTION 'Name or null metadata fallback regression';
  END IF;
  BEGIN
    INSERT INTO auth.users VALUES ('10000000-0000-4000-8000-000000000002','duplicate@example.invalid','{}');
    RAISE EXCEPTION 'Duplicate identity accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
SELECT 'PASS: normal, null and invalid metadata; name fallback; identity uniqueness';
BEGIN;
INSERT INTO auth.users VALUES ('10000000-0000-4000-8000-000000000005','rollback@example.invalid','{}');
ROLLBACK;
DO $$ BEGIN
  IF EXISTS (SELECT FROM profiles WHERE email='rollback@example.invalid') OR (SELECT count(*) FROM user_roles) <> 3 THEN
    RAISE EXCEPTION 'Rollback leaked profile or grant';
  END IF;
END $$;
SELECT 'PASS: rollback leaves neither profile nor grant';
-- Negative security scenarios: inspect the outcome; the runner fails closed on privileged grants.
INSERT INTO auth.users VALUES
 ('10000000-0000-4000-8000-000000000006','untrusted-admin@example.invalid','{"role":"admin"}'),
 ('10000000-0000-4000-8000-000000000007','untrusted-manager@example.invalid','{"role":"manager"}');
SELECT 'INFO: untrusted role outcome=' || r.role || ', profile_role=' || p.role
FROM user_roles r JOIN profiles p ON p.user_id=r.user_id
WHERE p.email LIKE 'untrusted-%';
