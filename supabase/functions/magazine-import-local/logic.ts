export interface LocalMagazineImportItem {
  localItemId: string;
  productId: string;
  productSnapshot: Record<string, unknown>;
  variantColorName?: string | null;
  position: number;
  pageNumber?: number | null;
  overrides?: Record<string, unknown>;
}

export interface LocalMagazineImportPayload {
  localId: string;
  title: string;
  subtitle?: string;
  templateId: string;
  branding?: Record<string, unknown>;
  content?: Record<string, unknown>;
  pageOrder?: unknown;
  items: LocalMagazineImportItem[];
  status: 'archived' | 'draft' | 'published';
}

export interface LocalMagazineImportResult {
  localId: string;
  newId: string | null;
  publicToken: null;
  idempotent?: boolean;
  error?: string;
}

export interface LocalMagazineImportSummary {
  results: LocalMagazineImportResult[];
  complete: boolean;
  success: number;
  failure: number;
  successCount: number;
  failureCount: number;
}

interface RpcResult {
  data: unknown;
  error: { message?: string } | null;
}

export interface MagazineImportRpcClient {
  rpc(
    name: 'magazine_import_local_v2',
    args: { p_idempotency_key: string; p_payload: Record<string, unknown> },
  ): PromiseLike<RpcResult>;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Uma RPC transacional e idempotente por revista; não exige compensação cliente. */
export async function importLocalMagazineBatch(
  client: MagazineImportRpcClient,
  magazines: LocalMagazineImportPayload[],
): Promise<LocalMagazineImportSummary> {
  const results: LocalMagazineImportResult[] = [];

  for (const magazine of magazines) {
    try {
      const { data, error } = await client.rpc('magazine_import_local_v2', {
        p_idempotency_key: magazine.localId,
        p_payload: {
          title: magazine.title,
          subtitle: magazine.subtitle ?? '',
          templateId: magazine.templateId,
          ...(magazine.branding === undefined ? {} : { branding: magazine.branding }),
          ...(magazine.content === undefined ? {} : { content: magazine.content }),
          ...(magazine.pageOrder === undefined ? {} : { pageOrder: magazine.pageOrder }),
          status: magazine.status,
          items: magazine.items,
        },
      });
      const payload = record(data);
      const magazineId = payload?.magazine_id;
      if (error || typeof magazineId !== 'string') {
        results.push({
          localId: magazine.localId,
          newId: null,
          publicToken: null,
          error: error?.message ?? 'invalid_import_response',
        });
        continue;
      }
      results.push({
        localId: magazine.localId,
        newId: magazineId,
        publicToken: null,
        idempotent: payload?.idempotent === true,
      });
    } catch (error) {
      results.push({
        localId: magazine.localId,
        newId: null,
        publicToken: null,
        error: error instanceof Error ? error.message : 'import_failed',
      });
    }
  }

  const successCount = results.filter((result) => result.newId !== null).length;
  const failureCount = results.length - successCount;
  return {
    results,
    complete: results.length === magazines.length && failureCount === 0,
    success: successCount,
    failure: failureCount,
    successCount,
    failureCount,
  };
}
