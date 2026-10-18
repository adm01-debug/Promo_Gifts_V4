// supabase/functions/bulk-random-passwords/index.ts
// BUG-EF-002 FIXED: Timing attack na comparacao do admin token.
// BUG-EF-010 FIXED: supabase-js@2.49.8 (futuro/typo) -> @2.49.4.
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { z } from "../_shared/zod-validate.ts";

// Tipos do body — falha de schema cai em {} (dry_run + defaults), mesmo
// comportamento atual de body inválido.
const bodySchema = z.object({
  mode: z.enum(["dry_run", "apply"]).optional(),
  // Numéricos sem teto aqui: o handler já faz Math.min/Math.max nos
  // valores (clamp existente) — capar no schema converteria um pedido
  // apply em dry_run silencioso via fallback {}.
  length: z.number().optional(),
  includeUpper: z.boolean().optional(),
  includeLower: z.boolean().optional(),
  includeDigits: z.boolean().optional(),
  includeSymbols: z.boolean().optional(),
  excludeEmails: z.array(z.string().max(320)).optional(),
  onlyEmails: z.array(z.string().max(320)).optional(),
  maxUsers: z.number().optional(),
  pageSize: z.number().optional(),
}).passthrough();

type RunMode = "dry_run" | "apply";

interface BulkRequest {
  mode?: RunMode;
  length?: number;
  includeUpper?: boolean;
  includeLower?: boolean;
  includeDigits?: boolean;
  includeSymbols?: boolean;
  excludeEmails?: string[];
  onlyEmails?: string[];
  maxUsers?: number;
  pageSize?: number;
}

interface UpdatedUser {
  id: string;
  email: string | null;
}

// E094: corsHeaders calculado por request — origem restrita ao domínio do solicitante
// (não mais Access-Control-Allow-Origin: *)
let _corsHeaders: Record<string, string> = {};

function pick(chars: string): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return chars[arr[0] % chars.length];
}

function shuffle(input: string): string {
  const a = input.split("");
  for (let i = a.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.join("");
}

function generatePassword(
  opts: Required<Pick<BulkRequest, "length" | "includeUpper" | "includeLower" | "includeDigits" | "includeSymbols">>
): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+?";

  const sets: string[] = [];
  if (opts.includeUpper) sets.push(upper);
  if (opts.includeLower) sets.push(lower);
  if (opts.includeDigits) sets.push(digits);
  if (opts.includeSymbols) sets.push(symbols);

  if (sets.length === 0) throw new Error("At least one charset must be enabled");
  if (opts.length < sets.length) throw new Error("Password length must be >= number of enabled charsets");

  const required = sets.map((s) => pick(s));
  const all = sets.join("");

  let out = required.join("");
  for (let i = required.length; i < opts.length; i++) {
    out += pick(all);
  }
  return shuffle(out);
}

/**
 * BUG-EF-002 FIX: Comparacao em tempo constante para evitar timing attacks.
 * Antes: adminTokenHeader !== expectedAdminToken (comparacao direta vulneravel)
 * Agora: XOR byte-a-byte via TextEncoder (tempo constante independente do match)
 */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  // E094: origen restrita por request — não mais Access-Control-Allow-Origin: *
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // E028: autorização via JWT com role dev (substitui x-admin-token estático)
    const authResult = await authorize(req, { requireRole: 'dev' });
    if (!authResult.ok) return authResult.response;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: BulkRequest = {};
    try {
      const raw: unknown = await req.json();
      const parsedBody = bodySchema.safeParse(raw);
      body = parsedBody.success ? parsedBody.data : {};
    } catch {
      body = {};
    }

    const mode: RunMode = body.mode === "apply" ? "apply" : "dry_run";
    const pwLength = Math.min(Math.max(Number(body.length ?? 12), 8), 32);
    const includeUpper = body.includeUpper ?? true;
    const includeLower = body.includeLower ?? true;
    const includeDigits = body.includeDigits ?? true;
    const includeSymbols = body.includeSymbols ?? false;
    const excludeEmails = new Set(body.excludeEmails ?? []);
    const onlyEmails = body.onlyEmails && body.onlyEmails.length > 0
      ? new Set(body.onlyEmails)
      : null;
    const maxUsers = Math.min(Number(body.maxUsers ?? 200), 1000);
    const pageSize = Math.min(Math.max(Number(body.pageSize ?? 100), 10), 500);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const updatedUsers: UpdatedUser[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && updatedUsers.length < maxUsers) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
      if (error) throw error;

      const users = data?.users ?? [];
      if (users.length < pageSize) hasMore = false;
      page++;

      for (const u of users) {
        if (updatedUsers.length >= maxUsers) break;

        const email = u.email ?? null;
        if (email && excludeEmails.has(email)) continue;
        // Usuário SEM e-mail não pode estar em onlyEmails — o guard anterior
        // (`email && !has`) deixava contas sem e-mail serem resetadas mesmo
        // com a lista restritiva ligada.
        if (onlyEmails && (!email || !onlyEmails.has(email))) continue;

        const password = generatePassword({
          length: pwLength,
          includeUpper,
          includeLower,
          includeDigits,
          includeSymbols,
        });

        if (mode === "apply") {
          const { error: updateErr } = await admin.auth.admin.updateUserById(u.id, { password });
          if (updateErr) {
            console.error(`[bulk-passwords] Failed to update user ${u.id}:`, updateErr.message);
            continue;
          }
        }

        updatedUsers.push({ id: u.id, email });
      }
    }

    // E028: registrar execução apply em admin_audit_log
    if (mode === 'apply') {
      await admin.from("admin_audit_log").insert({
        user_id: authResult.user.id,
        action: "bulk_password_reset",
        resource_type: "auth",
        details: { count: updatedUsers.length, maxUsers, pwLength },
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    // E029: dry_run não expõe lista de usuários/emails — só contagem
    const responsePayload = mode === 'apply'
      ? { mode, count: updatedUsers.length, users: updatedUsers }
      : { mode, count: updatedUsers.length };  // E029: sem dump de diretório em dry_run

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[bulk-passwords] Unexpected error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
