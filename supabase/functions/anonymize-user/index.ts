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
 *      preferências, bitrix_id) — is_active continua true: só desativa
 *      depois do ban confirmar, senão uma falha no passo 3 deixaria
 *      conta logável com perfil morto.
 *   2. login_attempts: apaga as linhas do usuário (email + user_id).
 *   3. auth.users: anonimiza e-mail/telefone/user_metadata e bane a
 *      conta (~100 anos) — passo irreversível, por último: se um wipe
 *      anterior falhar o usuário ainda consegue logar e retentar.
 *      Só então marca profiles.is_active=false.
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
    //    is_active só vira false depois do ban de auth.users: se a API
    //    administrativa falhar no passo 3, o usuário fica com login vivo e
    //    perfil ATIVO (já sem PII) — consegue retentar. Desativar aqui
    //    deixaria conta logável com perfil morto.
    const { error: profileErr, count: profileCount } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: "Usuário excluído",
        email: anonymizedEmail,
        phone: null,
        avatar_url: null,
        department: null,
        preferences: null,
        bitrix_id: null,
      }, { count: "exact" })
      .eq("user_id", userId);
    if (profileErr) {
      log.error("profile_anonymize_failed", { error: profileErr.message });
      return jsonRes(corsHeaders, { error: "anonymize_failed" }, 500);
    }

    // 2) Apaga tentativas de login (email + user_id carregam PII direta).
    //    ilike cobre variações de case de linhas legadas — a edge nova já
    //    normaliza para lowercase, mas histórico pode ter misto.
    // O filtro .or() é só um superconjunto: aspas no valor protegem ',',
    // '(' e ')' do parser do PostgREST, mas `%`/`_` do email seguem
    // curingas do ilike (e sanitizar chars corromperia o match — "o'hara"
    // viraria "ohara"). `"` não pode ser escapada dentro de um valor
    // entre aspas no PostgREST, então é trocada por `%` — o ilike casa
    // qualquer char naquela posição e o superconjunto fica um pouco
    // maior, sem perder a linha com a aspa literal. A seleção é
    // refiltrada em JS com comparação exata case-insensitive antes de
    // deletar só os ids confirmados.
    const emailFilter = (email ?? "").replace(/"/g, "%");
    const emailClause = emailFilter ? `,email.ilike."${emailFilter}"` : "";
    const emailLc = (email ?? "").toLowerCase();
    const isAttemptMatch = (r: { user_id: string | null; email: string | null }) =>
      r.user_id === userId ||
      (emailLc !== "" && typeof r.email === "string" &&
        r.email.toLowerCase() === emailLc);
    // PostgREST limita o SELECT a 1000 linhas por página. Paginação por
    // keyset (id > lastId, ordem estável) varre o superconjunto INTEIRO
    // mesmo com deletes mutando o conjunto — sem cap de rodadas, então
    // nenhuma tentativa fica para trás. O bound MAX_PAGES existe só como
    // segurança de tempo: se for atingido, marca erro e a resposta
    // reporta falha em vez de confirmar o expurgo.
    let attemptsErr: { message: string } | null = null;
    let attemptsWiped = 0;
    // login_attempts.id é UUID — o cursor começa nulo e o .gt() só entra
    // depois que a primeira página devolve um id real.
    let lastAttemptId: string | null = null;
    let exhausted = false;
    const nextAttemptPage = async () => {
      let query = supabaseAdmin
        .from("login_attempts")
        .select("id, user_id, email")
        .or(`user_id.eq.${userId}${emailClause}`)
        .order("id", { ascending: true })
        .limit(1000);
      if (lastAttemptId !== null) query = query.gt("id", lastAttemptId);
      return await query;
    };
    // MAX_PAGES é só segurança de tempo (~400k linhas varridas). Sucesso
    // exige uma página completamente vazia — nenhuma contagem de páginas
    // ou amostra parcial prova que o superconjunto acabou, pois linhas
    // não-candidatas (falsos positivos do ilike) podem preencher páginas
    // inteiras antes de um candidato real. Se o bound for atingido, a
    // resposta reporta incompleto, nunca sucesso com dados restantes.
    const MAX_PAGES = 400;
    for (let page = 0; page < MAX_PAGES && !exhausted && !attemptsErr; page++) {
      const { data: attemptRows, error: selErr } = await nextAttemptPage();
      if (selErr) {
        attemptsErr = selErr;
        break;
      }
      if (!attemptRows || attemptRows.length === 0) {
        exhausted = true;
        break;
      }
      lastAttemptId = attemptRows[attemptRows.length - 1].id;
      const ids = attemptRows.filter(isAttemptMatch).map((r) => r.id);
      if (ids.length === 0) continue;
      const { error: delErr, count } = await supabaseAdmin
        .from("login_attempts")
        .delete({ count: "exact" })
        .in("id", ids);
      if (delErr) {
        attemptsErr = delErr;
        break;
      }
      attemptsWiped += count ?? ids.length;
    }
    if (!attemptsErr && !exhausted) {
      attemptsErr = { message: "login_attempts_purge_incomplete" };
    }
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

    // 3b) Ban confirmado: desativa o perfil. Falha aqui não é fatal — a
    //     conta já está banida no auth e a flag vira cleanup do próximo
    //     sweep/admin, então só loga.
    const { error: deactivateErr } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: false })
      .eq("user_id", userId);
    if (deactivateErr) {
      log.warn("profile_deactivate_failed", { error: deactivateErr.message });
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
      loginAttemptsWiped: attemptsWiped,
      sessionsWiped,
    });

    return jsonRes(corsHeaders, {
      anonymized: true,
      wiped: {
        // Conta real de linhas — `true` com 0 linhas mentiria que um
        // perfil foi anonimizado quando nem existia.
        profile: profileCount ?? 0,
        login_attempts: attemptsErr ? "failed" : (attemptsWiped),
        sessions: sessionsWiped ? "revoked" : "partial",
      },
    });
  } catch (err) {
    log.error("unhandled_error", { error: String(err) });
    return jsonRes(corsHeaders, { error: "internal_error" }, 500);
  }
});
