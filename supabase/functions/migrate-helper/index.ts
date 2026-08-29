// migrate-helper foi um utilitário temporário e não deve executar migrações,
// revelar credenciais nem ser implantado como caminho administrativo.
import { authorize } from '../_shared/authorize.ts';
import { buildPublicCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = buildPublicCorsHeaders({ allowMethods: 'GET, POST, OPTIONS' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = await authorize(req, { requireRole: 'dev' });
  if (!auth.ok) return auth.response;

  return new Response(
    JSON.stringify({
      error: 'migration_helper_disabled',
      message: 'This temporary migration helper is permanently disabled.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
