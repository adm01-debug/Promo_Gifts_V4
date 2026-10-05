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
 *   3. auth.users: anonimiza e-mail/telefone/user_metadata e bane a
 *      conta (~100 anos) — passo irreversível, por último: se um wipe
 *      anterior falhar o usuário ainda consegue logar e retentar.
 *   4. Encerra todas as sessões do usuário (revoke + signOut global).
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

    const anonymizedEmail = `deleted-${userId}@anonymized.invalid`;

    // 1) Anonimiza o perfil — uuid opaco preserva FKs sem vazar identidade.
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
    //    ilike cobre variações de case de linhas legadas — a edge nova já
    //    normaliza para lowercase, mas histórico pode ter misto.
    const { error: attemptsErr, count: attemptsWiped } = await supabaseAdmin
      .from("login_attempts")
      .delete({ count: "exact" })
      .or(`user_id.eq.${userId}${email ? `,email.ilike.${email}` : ""}`);
    if (attemptsErr) {
      // Não é fatal: perfil já foi anonimizado; loga e segue.
      log.warn("login_attempts_wipe_failed", { error: attemptsErr.message });
    }

    // 3) Passo irreversível por último: anonimiza auth.users (e-mail,
    //    telefone e user_metadata — updateUserById substitui o objeto
    //    inteiro) e bane a conta ~100 anos. Depois deste update o usuário
    //    não loga mais, então ele só roda quando os wipes de PII já
    //    passaram — se um deles falhar, o cliente ainda entra e retenta.
    try {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          email: anonymizedEmail,
          phone: "",
          user_metadata: {},
          ban_duration: "876000h",
        },
      );
      if (authErr) {
        log.error("auth_user_anonymize_failed", { error: authErr.message });
        return jsonRes(corsHeaders, { error: "anonymize_failed" }, 500);
      }
    } catch (authThrow) {
      log.error("auth_user_anonymize_failed", { error: String(authThrow) });
      return jsonRes(corsHeaders, { error: "anonymize_failed" }, 500);
    }

    // 4) Revoga credenciais em duas camadas complementares:
    //    a) user_token_revocations — isTokenRevoked rejeita JWTs já emitidos
    //       (signOut sozinho deixa access tokens válidos até expirarem);
    //    b) admin.signOut global — invalida refresh tokens no GoTrue.
    //    Ambas falham de dois jeitos (resolve {error} OU rejeita a promise)
    //    e nenhuma deve esconder que a anonimização já ocorreu — por isso o
    //    catch local: o cliente recebe sessions:"partial", não um 500 cego.
    let sessionsWiped = true;
    try {
      const { error: revokeErr } = await supabaseAdmin.rpc(
        "revoke_all_user_tokens",
        { _user_id: userId },
      );
      if (revokeErr) {
        sessionsWiped = false;
        log.warn("token_revoke_failed", { error: revokeErr.message });
      }
    } catch (revokeThrow) {
      sessionsWiped = false;
      log.warn("token_revoke_failed", { error: String(revokeThrow) });
    }
    try {
      const { error: signOutErr } = await supabaseAdmin.auth.admin.signOut(
        userId,
        "global",
      );
      if (signOutErr) {
        sessionsWiped = false;
        log.warn("signout_failed", { error: signOutErr.message });
      }
    } catch (signOutThrow) {
      sessionsWiped = false;
      log.warn("signout_failed", { error: String(signOutThrow) });
    }

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
