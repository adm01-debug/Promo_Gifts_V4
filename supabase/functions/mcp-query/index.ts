/**
 * mcp-query — DESCOMISSIONADA em 2026-09-05 (audit r3)
 *
 * Razão: verify_jwt=false + SQL arbitrário via x-mcp-secret + CORS *
 * = vetor de ataque em produção. 0 invocações em 24h antes da remoção.
 *
 * Esta versão retorna 410 Gone para todas as requisições.
 * A função pode ser deletada pelo Supabase Dashboard.
 */
Deno.serve(() =>
  new Response(
    JSON.stringify({ error: 'decommissioned', message: 'Esta função foi descomissionada em 2026-09-05. Use os MCPs da VPS para acesso ao banco.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  )
);
