/**
 * anonymize-user — Edge Function autenticada (verify_jwt: true)
 *
 * LGPD — direito ao esquecimento. O usuário anonimiza o PRÓPRIO perfil:
 * exige frase de confirmação explícita para evitar invocação acidental.
 *
 * POST /functions/v1/anonymize-user
 * Body: { confirm_phrase: "EXCLUIR MINHA CONTA" }
 * Response 200: { anonymized: true, wiped: { profile, login_attempts } }
 *
 * O que faz (service_role, transacional por passo):
 *   1. profiles: zera PII (nome, email, telefone, avatar, departamento,
 *      preferências, bitrix_id) e marca is_active=false.
 *   2. login_attempts: apaga as linhas do usuário (email + user_id).
 *   3. Encerra todas as sessões do usuário (signOut global).
 *
 * O que NÃO faz (documentado):
 *   - Não apaga auth.users nem linhas de negócio (quotes/orders/carts):
 *     FKs e a trilha de auditoria precisam permanecer íntegras. Exclusão
 *     física completa é processo manual escalado (admin_audit_log).
 *   - Não reescreve admin_audit_log/audit_log: trilhas de segurança são
 *     interesse legítimo e não contêm PII além do user_id (uuid opaco).
 */
import { z } from "npm:zod@3.23.8";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

const AnonymizeUserSchema = z.object({
  confirm_phrase: z.literal("EXCLUIR MINHA CONTA"),
});

function jsonRes(
  corsHeaders: Record<string, string>,
  body: unknown,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes(corsHeaders, { error: "method_not_allowed" }, 405);
  }

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "anonymize-user", requestId, req });
  log.info("request_start");

  const auth = await authorize(req);
  if (!auth.ok) return auth.response;

  const { user, supabaseAdmin } = auth;
  const userId = user.id;
  const email = user.email ?? null;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = AnonymizeUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonRes(
        corsHeaders,
        {
          error: "confirmation_required",
          message:
            "Envie { confirm_phrase: 'EXCLUIR MINHA CONTA' } para confirmar a anonimização irreversível.",
        },
        400,
      );
    }

    // 1) Anonimiza o perfil — uuid opaco preserva FKs sem vazar identidade.
    const anonymizedEmail = `deleted-${userId}@anonymized.invalid`;
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: "Usuário excluído",
        email: anonymizedEmail,
        phone: null,
        avatar_url: null,
        department: null,
        preferences: null,
        bitrix_id: null,
        is_active: false,
      })
      .eq("user_id", userId);
    if (profileErr) {
      log.error("profile_anonymize_failed", { error: profileErr.message });
      return jsonRes(corsHeaders, { error: "anonymize_failed" }, 500);
    }

    // 2) Apaga tentativas de login (email + user_id carregam PII direta).
    const { error: attemptsErr, count: attemptsWiped } = await supabaseAdmin
      .from("login_attempts")
      .delete({ count: "exact" })
      .or(`user_id.eq.${userId}${email ? `,email.eq.${email}` : ""}`);
    if (attemptsErr) {
      // Não é fatal: perfil já foi anonimizado; loga e segue.
      log.warn("login_attempts_wipe_failed", { error: attemptsErr.message });
    }

    // 3) Revoga credenciais em duas camadas complementares:
    //    a) user_token_revocations — isTokenRevoked rejeita JWTs já emitidos
    //       (signOut sozinho deixa access tokens válidos até expirarem);
    //    b) admin.signOut global — invalida refresh tokens no GoTrue.
    const { error: revokeErr } = await supabaseAdmin.rpc(
      "revoke_all_user_tokens",
      { _user_id: userId },
    );
    if (revokeErr) {
      log.warn("token_revoke_failed", { error: revokeErr.message });
    }
    const { error: signOutErr } = await supabaseAdmin.auth.admin.signOut(
      userId,
      "global",
    );
    if (signOutErr) {
      // signOut resolve com { error } (não lança) — precisa inspeção explícita.
      log.warn("signout_failed", { error: signOutErr.message });
    }
    const sessionsWiped = !revokeErr && !signOutErr;

    log.info("user_anonymized", {
      userId,
      loginAttemptsWiped: attemptsWiped ?? 0,
      sessionsWiped,
    });

    return jsonRes(corsHeaders, {
      anonymized: true,
      wiped: {
        profile: true,
        login_attempts: attemptsErr ? "failed" : (attemptsWiped ?? 0),
        sessions: sessionsWiped ? "revoked" : "partial",
      },
    });
  } catch (err) {
    log.error("unhandled_error", { error: String(err) });
    return jsonRes(corsHeaders, { error: "internal_error" }, 500);
  }
});
