-- ============================================================
--  Criar 4 usuários do painel de cotação
--  Senha inicial: Promo@2026!  (trocar no 1º login)
-- ============================================================

do $$
declare
  v_users record;
  v_user_id uuid;
  v_email text;
  v_pass text := 'Promo@2026!';
begin
  for v_users in
    select * from (values
      ('joaquim@promobrindes.com.br',   'Joaquim (Pink)', 'admin'),
      ('tiago@promobrindes.com.br',     'Tiago',          'cotacao'),
      ('marcus@promobrindes.com.br',    'Marcus',         'cotacao'),
      ('gabryelly@promobrindes.com.br', 'Gabryelly',      'cotacao')
    ) as t(email, nome, role)
  loop
    v_email := v_users.email;

    -- Pula se já existe (idempotência)
    if exists (select 1 from auth.users where email = v_email) then
      raise notice 'Usuário % já existe, pulando.', v_email;
      continue;
    end if;

    v_user_id := gen_random_uuid();

    -- 1) Cria entrada em auth.users
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_user_id,
      'authenticated', 'authenticated',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'nome',           v_users.nome,
        'role',           v_users.role,
        'email_verified', true,
        'app',            'painel-cotacoes'
      ),
      jsonb_build_object(
        'provider',  'email',
        'providers', jsonb_build_array('email')
      ),
      now(), now(),
      '', '', '', ''
    );

    -- 2) Cria identity (provider email) — necessário pra login funcionar
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub',            v_user_id::text,
        'email',          v_email,
        'email_verified', true
      ),
      'email',
      v_email,
      now(), now(), now()
    );

    raise notice 'Usuário % criado (id=%).', v_email, v_user_id;
  end loop;
end $$;
