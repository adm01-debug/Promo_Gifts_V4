/**
 * Executa uma consulta SQL somente leitura no projeto Supabase.
 *
 * O endpoint pg-meta sob `*.supabase.co` não é público e responde 404 nos
 * projetos hospedados. Em CI usamos a Management API com um PAT e project ref;
 * o caminho pg-meta permanece apenas para ambientes locais que o exponham.
 */
export async function querySupabaseReadOnly(sql) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF;

  if (accessToken && projectRef) {
    return fetchRows({
      endpoint: `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/query/read-only`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: { query: sql },
      source: 'management-api',
      target: `project:${projectRef}`,
    });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    return fetchRows({
      endpoint: `${url.replace(/\/$/, '')}/pg-meta/default/query`,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: { query: sql },
      source: 'pg-meta',
      target: url,
    });
  }

  return { kind: 'missing-config' };
}

async function fetchRows({ endpoint, headers, body, source, target }) {
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: 'network-error', source, target };
  }

  if (!response.ok) {
    return {
      kind: 'http-error',
      source,
      target,
      httpStatus: response.status,
      bodyLength: (await response.text()).length,
    };
  }

  let rows;
  try {
    rows = await response.json();
  } catch {
    return { kind: 'invalid-json', source, target };
  }

  if (!Array.isArray(rows)) {
    return {
      kind: 'invalid-response',
      source,
      target,
      responseType: typeof rows,
    };
  }

  return { kind: 'live', source, target, rows };
}
