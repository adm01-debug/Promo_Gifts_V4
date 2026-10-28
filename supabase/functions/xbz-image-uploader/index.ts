// xbz-image-uploader — cron periódico de upload de imagens XBZ para Cloudflare Images
// Chamado por pg_cron 'xbz-image-uploader' (schedule: 3,13,23,33,43,53 * * * *)
// Requisito: XBZ_IMAGE_UPLOADER_CRON_SECRET no vault + no allowlist de get_edge_function_secret
//
// Fluxo esperado:
//   1. Autenticação via x-cron-secret (XBZ_IMAGE_UPLOADER_CRON_SECRET do vault)
//   2. Query em xbz_image_import_staging para itens pendentes (cloudflare_id IS NULL)
//   3. Upload de cada imagem para Cloudflare Images
//   4. Chamada a complete_xbz_image_import(staging_id, cloudflare_id) para marcar como concluído
//
// TODO: implementar a lógica de upload (ver complete_xbz_image_import em public schema)
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { authorizeCron } from '../_shared/dispatcher-auth.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cronAuth = await authorizeCron(req, {
    corsHeaders: { 'Content-Type': 'application/json' },
    secretEnvName: 'XBZ_IMAGE_UPLOADER_CRON_SECRET',
    headerName: 'x-cron-secret',
  })
  if (!cronAuth.ok) return cronAuth.response

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Query itens pendentes em xbz_image_import_staging
  const { data: pending, error: selectErr } = await supabase
    .from('xbz_image_import_staging')
    .select('id, image_url')
    .is('cloudflare_id', null)
    .limit(20)

  if (selectErr) {
    console.error('xbz-image-uploader: select_failed', { message: selectErr.message })
    return new Response(JSON.stringify({ error: 'select_failed', detail: selectErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // TODO: implementar upload para Cloudflare Images + chamada a complete_xbz_image_import
  // Por ora retorna contagem de pendentes sem processar
  console.log('xbz-image-uploader: pending_count', { count: pending?.length ?? 0 })

  return new Response(
    JSON.stringify({ ok: true, pending: pending?.length ?? 0, processed: 0, message: 'not_implemented' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
