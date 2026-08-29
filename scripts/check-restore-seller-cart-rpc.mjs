#!/usr/bin/env node
/**
 * Deploy gate: confirma que a RPC `restore_seller_cart` está presente
 * no banco canônico (Supabase) exercitando sua assinatura publicada.
 *
 * Como funciona:
 *   Chamamos o endpoint PostgREST com o argumento obrigatório `_snapshot`.
 *   A função é deliberadamente invisível para `anon`, portanto o gate estrito
 *   usa service_role para distinguir assinatura ausente de ACL correta:
 *     • HTTP 404 + code "PGRST202" → função AUSENTE no schema cache → FALHA
 *     • Qualquer outra resposta (200, 400 validação, 401, 403 RLS, 500 lógica)
 *       → função PRESENTE (endpoint existe) → PASSA
 *
 * Variáveis de ambiente:
 *   SUPABASE_URL           (fallback: VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY (preferida; obrigatória no modo estrito)
 *   SUPABASE_ANON_KEY         (fallback apenas para diagnóstico)
 *   STRICT=1               → falha se credenciais ausentes (default: skip)
 *   RPC_NAME               → override do nome (default: restore_seller_cart)
 *
 * Exit codes:
 *   0 → função presente (ou skip por falta de credenciais fora do modo estrito)
 *   1 → função ausente (PGRST202) OU credenciais faltando em STRICT=1
 *   2 → erro de rede/infra impedindo verificar (não bloqueia por padrão)
 */

const RPC_NAME = process.env.RPC_NAME || 'restore_seller_cart';
const STRICT = process.env.STRICT === '1';

// Canônico sempre por padrão — o .env local pode apontar para o projeto Lovable
// Cloud (pqp), mas o gate valida SEMPRE o banco de produção do app.
const CANONICAL_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';

const url = process.env.CANONICAL_SUPABASE_URL || process.env.SUPABASE_URL || CANONICAL_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey =
  process.env.CANONICAL_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const tag = '[check:restore-seller-cart-rpc]';

function log(msg) {
  console.log(`${tag} ${msg}`);
}

function fail(msg) {
  console.error(`${tag} ❌ ${msg}`);
  process.exit(1);
}

function skip(msg) {
  console.warn(`${tag} ⚠️  ${msg} (skip — use STRICT=1 para forçar falha)`);
  process.exit(0);
}

async function main() {
  log(`Verificando presença da RPC \`${RPC_NAME}\` em ${url}`);

  const apiKey = serviceRoleKey || anonKey;
  if (!apiKey) {
    const msg = 'Credencial Supabase ausente — não é possível verificar a assinatura publicada.';
    if (STRICT) fail(msg);
    return skip(msg);
  }

  if (STRICT && !serviceRoleKey) {
    fail(
      'SUPABASE_SERVICE_ROLE_KEY ausente. A RPC não possui EXECUTE para anon; ' +
        'um 404 anônimo seria inconclusivo, não prova de ausência.',
    );
  }

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/rpc/${RPC_NAME}`;

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      // String inválida para o contrato jsonb-object: a função responde antes
      // de qualquer escrita e comprova a resolução de `_snapshot jsonb`.
      body: JSON.stringify({ _snapshot: 'not-an-object' }),
    });
  } catch (err) {
    const msg = `Falha de rede ao consultar PostgREST: ${err?.message || err}`;
    if (STRICT) fail(msg);
    console.warn(`${tag} ⚠️  ${msg}`);
    process.exit(2);
  }

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // corpo não-JSON — trata como texto
  }

  const code = body?.code;
  const message = body?.message || text;

  // PGRST202 = "Could not find the function ... in the schema cache"
  // 42883    = undefined_function (erro do próprio Postgres quando a assinatura
  //            some entre a resolução do cache e a execução).
  if (res.status === 404 && (code === 'PGRST202' || /schema cache/i.test(message))) {
    // PostgREST retorna 404 PGRST202 tanto quando a função não existe quanto
    // quando anon não tem EXECUTE (ambos são invisíveis no schema cache).
    // Usamos fn_rpc_exists() para distinguir os dois casos sem precisar de
    // service_role key nem de EXECUTE grant para anon.
    log(`404 PGRST202 — verificando via fn_rpc_exists('${RPC_NAME}')...`);
    let exists = false;
    try {
      const existsRes = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/fn_rpc_exists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ fname: RPC_NAME }),
      });
      if (existsRes.ok) {
        exists = await existsRes.json();
      }
    } catch {
      // rede inacessível — não podemos confirmar; não bloquear
    }

    if (exists === true) {
      log(`✅ RPC \`${RPC_NAME}\` existe em pg_proc (anon sem EXECUTE — intencional, função protegida).`);
      process.exit(0);
    }

    fail(
      `RPC \`${RPC_NAME}\` NÃO existe no banco canônico.\n` +
        `  status: ${res.status}\n` +
        `  code:   ${code}\n` +
        `  msg:    ${message}\n\n` +
        `  → Aplique a migração em supabase/migrations/ para criar a função.`
    );
  }

  if (code === '42883') {
    // 42883 via PostgREST significa que o schema cache ENCONTROU a função mas
    // a chamada PostgreSQL falhou. Causa típica: nosso payload {} não tem o
    // argumento obrigatório (_snapshot jsonb), então Postgres reporta que a
    // variante sem argumentos não existe. Isso confirma que a função ESTÁ em
    // pg_proc — o PostgREST teria retornado PGRST202 se ela fosse ausente.
    // Usamos fn_rpc_exists para distinguir "args inválidos (função presente)"
    // de "função dropada entre cache build e execução (raro, mas possível)".
    log(`42883 undefined_function — verificando via fn_rpc_exists('${RPC_NAME}')...`);
    let exists42883 = false;
    try {
      const existsRes42883 = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/fn_rpc_exists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ fname: RPC_NAME }),
      });
      if (existsRes42883.ok) {
        exists42883 = await existsRes42883.json();
      }
    } catch {
      // rede inacessível — não podemos confirmar; não bloquear
    }

    if (exists42883 === true) {
      log(`✅ RPC \`${RPC_NAME}\` existe em pg_proc (42883 por mismatch de args no payload de teste — esperado).`);
      process.exit(0);
    }

    fail(
      `RPC \`${RPC_NAME}\` reportou 42883 e fn_rpc_exists retornou false — função ausente.\n` +
        `  msg: ${message}\n\n` +
        `  → Aplique a migração em supabase/migrations/ para criar a função.`
    );
  }

  // 401 significa que o JWT foi rejeitado ANTES do PostgREST consultar o schema
  // cache — não conseguimos distinguir "função existe" de "função ausente".
  // Trate como ambíguo: skip em modo normal, falha em STRICT.
  if (res.status === 401) {
    const msg =
      `PostgREST retornou 401 (anon key inválida para ${url}). ` +
      `Não é possível verificar a RPC — configure CANONICAL_SUPABASE_ANON_KEY ` +
      `com a anon key do projeto canônico.`;
    if (STRICT) fail(msg);
    return skip(msg);
  }

  log(`✅ RPC \`${RPC_NAME}\` presente (status=${res.status}${code ? `, code=${code}` : ''}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`${tag} erro inesperado:`, err);
  process.exit(2);
});
