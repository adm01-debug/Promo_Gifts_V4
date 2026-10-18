import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";
import { safeJson } from "../_shared/json-parser.ts";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { readJwtAal } from "../_shared/authorize.ts";

const uuidSchema = z.string().uuid();
const emailSchema = z.string().email().max(255);
// Hierarquia atual: dev > supervisor > vendedor (=agente). admin/manager
// permanecem aceitos como aliases legados de supervisor.
const roleSchema = z.enum(['dev', 'supervisor', 'coordenador', 'agente', 'vendedor', 'admin', 'manager']);
const promotionRoleSchema = z.enum(['supervisor', 'coordenador', 'agente', 'vendedor']);

const CreateSchema = z.object({
  action: z.literal('create'),
  email: emailSchema,
  password: z.string().min(8).max(128),
  full_name: z.string().max(200).optional().default(''),
  role: roleSchema.optional(),
});

const UpdateEmailSchema = z.object({
  action: z.literal('update_email'),
  user_id: uuidSchema,
  new_email: emailSchema,
});

const UpdatePasswordSchema = z.object({
  action: z.literal('update_password'),
  user_id: uuidSchema,
  new_password: z.string().min(8).max(128),
});

const DeleteSchema = z.object({
  action: z.literal('delete'),
  user_id: uuidSchema,
});

// Revoga TODAS as sessões de um usuário (GoTrue só oferece signOut global por
// usuário — não há revogação de uma sessão específica). Usado pelo painel de
// sessões ativas (/admin/sessoes).
const RevokeSessionsSchema = z.object({
  action: z.literal('revoke_sessions'),
  user_id: uuidSchema,
});

/**
 * Promoção de papel (agente <-> supervisor) com step-up:
 * exige a senha do próprio caller + justificativa que vai para auditoria.
 */
const PromoteRoleSchema = z.object({
  action: z.literal('promote_role'),
  user_id: uuidSchema,
  new_role: promotionRoleSchema,
  caller_password: z.string().min(1).max(128),
  reason: z.string().trim().min(10, 'Justificativa muito curta').max(500),
});

const PayloadSchema = z.discriminatedUnion('action', [
  CreateSchema,
  UpdateEmailSchema,
  UpdatePasswordSchema,
  DeleteSchema,
  RevokeSessionsSchema,
  PromoteRoleSchema,
]);

function jsonRes(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: 'manage-users', requestId, req });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonRes(corsHeaders, { error: 'Não autorizado' }, 401);
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return jsonRes(corsHeaders, { error: 'Não autorizado' }, 401);
    }

    // Verificação de papel via SECURITY DEFINER (compat com hierarquia atual).
    const { data: isSupOrAbove, error: sopErr } = await castRpcResult<{
      data: boolean | null;
      error: { message: string } | null;
    }>(supabaseAdmin.rpc(
      'is_supervisor_or_above',
      { _user_id: caller.id }
    ));
    if (sopErr || !isSupOrAbove) {
      return jsonRes(corsHeaders, { error: 'Apenas supervisores podem gerenciar usuários' }, 403);
    }

    // Validate input with Zod
    const rawBody = await safeJson(req);
    const parsed = PayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonRes(corsHeaders, { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, 400);
    }

    const payload = parsed.data;

    if (payload.action === 'create') {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: { full_name: payload.full_name || '' },
      });

      if (createError) {
        return jsonRes(corsHeaders, { error: createError.message }, 400);
      }

      if (payload.role && payload.role !== 'vendedor' && newUser.user) {
        await supabaseAdmin
          .from('user_roles')
          .update({ role: payload.role })
          .eq('user_id', newUser.user.id);
      }

      return jsonRes(corsHeaders, { success: true, user_id: newUser.user?.id });
    }

    if (payload.action === 'update_email') {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        payload.user_id,
        { email: payload.new_email }
      );

      if (updateError) {
        return jsonRes(corsHeaders, { error: updateError.message }, 400);
      }

      await supabaseAdmin.from('profiles').update({ email: payload.new_email }).eq('user_id', payload.user_id);
      return jsonRes(corsHeaders, { success: true });
    }

    if (payload.action === 'update_password') {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        payload.user_id,
        { password: payload.new_password }
      );

      if (updateError) {
        return jsonRes(corsHeaders, { error: updateError.message }, 400);
      }

      return jsonRes(corsHeaders, { success: true });
    }

    if (payload.action === 'delete') {
      if (payload.user_id === caller.id) {
        return jsonRes(corsHeaders, { error: 'Não é possível excluir seu próprio usuário' }, 400);
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(payload.user_id);

      if (deleteError) {
        return jsonRes(corsHeaders, { error: deleteError.message }, 400);
      }

      return jsonRes(corsHeaders, { success: true });
    }

    if (payload.action === 'revoke_sessions') {
      // Rota /admin/sessoes é devOnly + AAL2 — espelha a restrição aqui no
      // servidor: a guarda global da função só garante supervisor+, então a
      // action exige o papel dev e claim aal=aal2 do JWT do caller.
      const { data: isDev, error: devErr } = await supabaseAdmin.rpc(
        'has_role',
        { _user_id: caller.id, _role: 'dev' }
      );
      if (devErr || !isDev) {
        return jsonRes(corsHeaders, { error: 'Apenas devs podem revogar sessões' }, 403);
      }
      const callerToken = authHeader.replace(/^Bearer\s+/i, '');
      const aal = readJwtAal(callerToken);
      if (aal !== 'aal2') {
        return jsonRes(corsHeaders, { error: 'aal2_required', message: 'MFA assurance level 2 is required' }, 403);
      }

      if (payload.user_id === caller.id) {
        return jsonRes(
          corsHeaders,
          { error: 'Para revogar suas próprias sessões use a opção de logout nos outros dispositivos' },
          400
        );
      }

      // auth.admin.signOut exige o JWT da sessão alvo — um user_id não é
      // aceito. admin_revoke_user_sessions (migration 20261015150000)
      // revoga refresh_tokens + hmac v2 e marca revoke_all_user_tokens.
      // Chamada via callerClient (JWT do dev): auth.uid() com service role
      // seria NULL e a guarda dev+aal2 dentro da RPC rejeitaria a chamada.
      const { error: revokeError } = await callerClient.rpc(
        'admin_revoke_user_sessions',
        { _user_id: payload.user_id }
      );
      if (revokeError) {
        log.error('admin_revoke_user_sessions falhou', {
          target_user_id: payload.user_id,
          error: revokeError.message,
        });
        // Erros SQL não voltam ao cliente — podem expor internals do banco.
        return jsonRes(corsHeaders, { error: 'Falha ao revogar sessões' }, 400);
      }

      // IP derivado da conexão: o gateway anexa o IP real como ÚLTIMO
      // elemento do x-forwarded-for — o primeiro e x-real-ip são forjáveis
      // (mesmo padrão de log-login-attempt, Devin Review SEC_0001).
      const xff = req.headers.get('x-forwarded-for');
      const ipAddress =
        (xff?.split(',').pop()?.trim() || req.headers.get('cf-connecting-ip')) ??
        req.headers.get('x-real-ip') ??
        null;

      const { error: auditError } = await supabaseAdmin
        .from('admin_audit_log')
        .insert({
          user_id: caller.id,
          action: 'session.revoke_all',
          resource_type: 'auth',
          resource_id: payload.user_id,
          status: 'success',
          source: 'manage-users.revoke_sessions',
          details: { target_user_id: payload.user_id, scope: 'global' },
          ip_address: ipAddress,
          user_agent: req.headers.get('user-agent') ?? null,
        });
      if (auditError) {
        log.error('audit insert falhou após revoke_sessions', {
          target_user_id: payload.user_id,
          error: auditError.message,
        });
      }

      return jsonRes(corsHeaders, { success: true, audit_logged: !auditError });
    }

    if (payload.action === 'promote_role') {
      // Não pode alterar a si mesmo (evita rebaixamento acidental do único supervisor).
      if (payload.user_id === caller.id) {
        return jsonRes(corsHeaders, { error: 'Você não pode alterar seu próprio papel' }, 400);
      }

      // Step-up: revalida a senha do caller via signInWithPassword usando anon client isolado.
      if (!caller.email) {
        return jsonRes(corsHeaders, { error: 'Conta sem e-mail — step-up indisponível' }, 400);
      }
      const stepUpClient = createClient(supabaseUrl, anonKey);
      const { error: stepUpErr } = await stepUpClient.auth.signInWithPassword({
        email: caller.email,
        password: payload.caller_password,
      });
      if (stepUpErr) {
        return jsonRes(corsHeaders, { error: 'Senha incorreta' }, 401);
      }

      // Carrega papel atual do alvo para validar e auditar a transição.
      const { data: targetRows, error: targetErr } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', payload.user_id);
      if (targetErr) {
        return jsonRes(corsHeaders, { error: targetErr.message }, 500);
      }
      const previousRole = targetRows?.[0]?.role ?? 'vendedor';
      const normalizedPrev =
        previousRole === 'admin' || previousRole === 'manager' ? 'supervisor' : previousRole;
      if (normalizedPrev === 'dev') {
        return jsonRes(
          corsHeaders,
          { error: 'O papel Dev só pode ser alterado por outro Dev em fluxo dedicado' },
          403
        );
      }
      if (normalizedPrev === payload.new_role) {
        return jsonRes(corsHeaders, { error: 'Usuário já possui esse papel' }, 400);
      }

      // Aplica a mudança via service role (bypassa RLS de forma controlada).
      let upsertErr;
      if (targetRows && targetRows.length > 0) {
        ({ error: upsertErr } = await supabaseAdmin
          .from('user_roles')
          .update({ role: payload.new_role })
          .eq('user_id', payload.user_id));
      } else {
        ({ error: upsertErr } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: payload.user_id, role: payload.new_role }));
      }
      if (upsertErr) {
        return jsonRes(corsHeaders, { error: upsertErr.message }, 500);
      }

      // Auditoria
      await supabaseAdmin.from('admin_audit_log').insert({
        user_id: caller.id,
        action: payload.new_role === 'supervisor' ? 'role.promote' : 'role.demote',
        resource_type: 'user_roles',
        resource_id: payload.user_id,
        status: 'success',
        source: 'manage-users.promote_role',
        details: {
          previous_role: previousRole,
          new_role: payload.new_role,
          reason: payload.reason,
        },
        ip_address:
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          req.headers.get('x-real-ip') ??
          null,
        user_agent: req.headers.get('user-agent') ?? null,
      });

      return jsonRes(corsHeaders, {
        success: true,
        previous_role: previousRole,
        new_role: payload.new_role,
      });
    }

    return jsonRes(corsHeaders, { error: 'Ação inválida' }, 400);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    return jsonRes(corsHeaders, { error: msg }, 500);
  }
});
