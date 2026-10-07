import { authenticateRequest, authErrorResponse } from "../_shared/auth.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/error-response.ts";
import { getCredential } from "../_shared/credentials.ts";

interface ScanLog {
  user_id: string;
  bucket: string;
  path: string;
  hash: string;
  scan_result: Record<string, unknown>;
  status_code: number;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  // SVG propositalmente fora: XML ativo pode carregar <script>/event
  // handlers e vira stored XSS quando servido como documento.
]);

/** Sniffa magic bytes e devolve o MIME real ou null se desconhecido. */
function sniffMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a &&
      bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
      bytes[3] === 0x38) return "image/gif";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
      bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 &&
      bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 &&
      bytes[7] === 0x70 && ((bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 &&
      bytes[11] === 0x66) || (bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 &&
      bytes[11] === 0x73))) return "image/avif";
  const head = new TextDecoder().decode(bytes.slice(0, 512)).trimStart().toLowerCase();
  // Detecta SVG mesmo sem estar em ALLOWED_MIME: quem declarar outro
  // tipo com conteúdo SVG cai no mismatch e é rejeitado do mesmo jeito.
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
  return null;
}

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "secure-upload", requestId, req });
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return log.respond(new Response("ok", { headers: corsHeaders }));
  }

  // 1. Autenticação obrigatória — rejeita anônimos antes de qualquer trabalho.
  let auth;
  try {
    auth = await authenticateRequest(req);
  } catch (err) {
    log.warn("auth_failed", { err });
    return log.respond(authErrorResponse(err, corsHeaders));
  }

  const supabaseAdmin = auth.localServiceClient;
  log.info("request_start", { user_id: auth.userId });

  // Variáveis para auditoria persistente mesmo em caso de erro
  let auditData: Partial<ScanLog> = {
    user_id: auth.userId,
    status_code: 500,
    scan_result: { message: "Iniciando processamento" },
  };

  try {
    // formData() lança em body malformado/sem boundary — era 500 via
    // catch externo; requisição inválida é 400, não erro de servidor.
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return log.respond(
        new Response(JSON.stringify({ error: "Corpo inválido: esperado multipart/form-data", request_id: requestId }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      );
    }
    const fileField = formData.get("file");
    // folder compõe o path no Storage e é controlado pelo cliente — validação
    // por segmento preserva hierarquias legítimas (products/<id>, groups/<id>)
    // e barra path traversal ("../"). Entrada inválida é rejeitada com 400 em
    // vez de cair silenciosamente em outra pasta.
    const rawFolder = (formData.get("folder") as string) || "uploads";
    const folderSegments = rawFolder.split("/");
    const folderValid =
      folderSegments.length <= 4 &&
      folderSegments.every((s) => /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(s));
    if (!folderValid) {
      log.warn("upload_blocked_bad_folder", { folder: rawFolder, user_id: auth.userId });
      await supabaseAdmin.from("file_scan_logs").insert({
        user_id: auth.userId,
        bucket: "personalization-images",
        path: "rejected/invalid_folder",
        hash: "not_computed",
        status_code: 400,
        scan_result: { error: true, reason: "Pasta de destino inválida", folder: rawFolder },
      });
      return log.respond(
        new Response(JSON.stringify({ error: "Pasta de destino inválida", request_id: requestId }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      );
    }
    const folder = rawFolder;

    // Campo ausente ou string (não-File) → 400 explícito em vez de
    // TypeError em file.name/file.size caindo no catch externo como 500.
    if (!(fileField instanceof File)) {
      await supabaseAdmin.from("file_scan_logs").insert({
        user_id: auth.userId,
        bucket: "personalization-images",
        path: `rejected/${folder}/missing_file`,
        hash: "not_computed",
        status_code: 400,
        scan_result: { error: true, reason: "Arquivo obrigatório" },
      });
      return log.respond(
        new Response(JSON.stringify({ error: "Arquivo obrigatório", request_id: requestId }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      );
    }
    const file = fileField;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Rejeição por tamanho ANTES de materializar o buffer — file.size não
    // consome memória nem CPU de hashing do worker.
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      const tooBig = file.size > MAX_UPLOAD_BYTES;
      const status = tooBig ? 413 : 400;
      const message = tooBig
        ? `Arquivo excede o limite de ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`
        : "Arquivo vazio";
      await supabaseAdmin.from("file_scan_logs").insert({
        user_id: auth.userId,
        bucket: "personalization-images",
        path: `rejected/${folder}/${safeName}`,
        hash: "not_computed",
        status_code: status,
        scan_result: { error: true, reason: message },
      });
      return log.respond(
        new Response(JSON.stringify({ error: message, request_id: requestId }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // file_scan_logs exige bucket/path/hash NOT NULL — preencher já na
    // entrada para as trilhas de rejeição não falharem silenciosamente.
    auditData = {
      user_id: auth.userId,
      bucket: "personalization-images",
      path: `rejected/${folder}/${safeName}`,
      hash: hashHex,
      status_code: 500,
      scan_result: { message: "Arquivo recebido para análise" },
    };

    const declaredMime = (file.type || "").toLowerCase().replace("image/jpg", "image/jpeg");
    const sniffedMime = sniffMimeType(new Uint8Array(fileBuffer.slice(0, 512)));
    if (!ALLOWED_MIME.has(declaredMime) || sniffedMime !== declaredMime) {
      log.warn("upload_blocked_bad_type", {
        declared: file.type,
        sniffed: sniffedMime,
        user_id: auth.userId,
      });
      await supabaseAdmin.from("file_scan_logs").insert({
        ...auditData,
        status_code: 415,
        scan_result: {
          error: true,
          reason: "Tipo de arquivo não permitido ou conteúdo divergente do tipo declarado",
          declared_mime: file.type,
          sniffed_mime: sniffedMime,
        },
      });
      return log.respond(
        new Response(
          JSON.stringify({
            error: "Tipo de arquivo não permitido (apenas imagens PNG, JPEG, WebP, GIF ou AVIF)",
            request_id: requestId,
          }),
          { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        ),
      );
    }
    auditData.path = `verified/${folder}/${safeName}`;
    auditData.status_code = 200;

    let isSuspicious = false;
    let scanDetails: Record<string, unknown> = {
      source: "VirusTotal",
      checked_at: new Date().toISOString(),
    };
    let targetBucket = "personalization-images";
    let targetPrefix = "verified";
    // fix: ssot-bypass — credential vault
    const vtApiKey = await getCredential("VIRUSTOTAL_API_KEY");

    if (vtApiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const vtRes = await fetch(
          `https://www.virustotal.com/api/v3/files/${hashHex}`,
          {
            headers: { "x-apikey": vtApiKey },
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);

        if (vtRes.ok) {
          const vtData = await vtRes.json();
          scanDetails = { ...scanDetails, ...vtData.data.attributes.last_analysis_stats };
          const malicious = (scanDetails.malicious as number | undefined) ?? 0;
          const suspicious = (scanDetails.suspicious as number | undefined) ?? 0;
          if (malicious > 0 || suspicious > 0) {
            isSuspicious = true;
            scanDetails.reason = `Detectado: ${malicious} maliciosos, ${suspicious} suspeitos`;
          } else {
            scanDetails.reason = "Arquivo limpo (base VirusTotal)";
          }
        } else if (vtRes.status === 404) {
          scanDetails.reason =
            "Arquivo novo no VirusTotal (análise pendente). Permitido upload inicial.";
          scanDetails.pending_review = true;
          log.warn("upload_pending_vt_scan", { user_id: auth.userId });
        } else {
          throw new Error(`Falha na API de segurança (Status: ${vtRes.status})`);
        }
      } catch (err) {
        const errorObj = err as { name?: string; message?: string };
        const reason = errorObj.name === "AbortError"
          ? "Timeout na verificação (10s)"
          : (errorObj.message ?? "Erro desconhecido");
        log.error("security_check_failed", { err, reason, user_id: auth.userId });

        await supabaseAdmin.from("file_scan_logs").insert({
          ...auditData,
          status_code: 403,
          scan_result: { ...scanDetails, error: true, reason: `Bloqueio preventivo: ${reason}` },
        });

        return log.respond(
          new Response(JSON.stringify({ error: `Segurança: ${reason}`, request_id: requestId }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }),
        );
      }
    }

    if (isSuspicious) {
      targetBucket = "quarantine";
      targetPrefix = "suspect";
    }

    const ext = (file.name.split(".").pop() ?? "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || "bin";
    const fileName = `${targetPrefix}/${folder}/${Date.now()}-${
      Math.random().toString(36).substring(7)
    }.${ext}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(fileName, fileBuffer, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    auditData.path = uploadData.path;
    auditData.bucket = targetBucket;
    auditData.status_code = isSuspicious ? 403 : 200;
    auditData.scan_result = scanDetails;

    await supabaseAdmin.from("file_scan_logs").insert(auditData as ScanLog);

    if (isSuspicious) {
      log.warn("upload_blocked_malware", {
        bucket: targetBucket,
        path: uploadData.path,
        user_id: auth.userId,
      });
      return log.respond(
        new Response(
          JSON.stringify({ error: "Arquivo bloqueado: Malware detectado", request_id: requestId }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        ),
      );
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(targetBucket)
      .getPublicUrl(uploadData.path);

    log.info("upload_ok", {
      bucket: targetBucket,
      path: uploadData.path,
      user_id: auth.userId,
    });

    return log.respond(
      new Response(
        JSON.stringify({ url: publicUrl, path: uploadData.path, request_id: requestId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      ),
    );
  } catch (error) {
    const errorObj = error as { message?: string };
    log.error("upload_failed", { err: error, user_id: auth.userId });
    if (auditData.hash) {
      await supabaseAdmin.from("file_scan_logs").insert({
        ...auditData,
        status_code: 500,
        scan_result: { error: true, message: errorObj.message ?? "Erro desconhecido" },
      });
    }
    return log.respond(
      safeErrorResponse(error, { corsHeaders, publicMessage: "upload_failed", requestId, logLabel: "secure-upload error:" }),
    );
  }
});
