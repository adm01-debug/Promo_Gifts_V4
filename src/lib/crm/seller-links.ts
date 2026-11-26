/**
 * Regras puras da tela /admin/vinculos-vendedor-crm.
 *
 * O mapeamento 1:1 `auth.users.id -> vendedor do CRM externo` vive em
 * `public.crm_seller_identity_links`, tabela deny-all consumida pelo bridge
 * `supabase/functions/crm-db-bridge`. A tela só enxerga os dados pelas RPCs
 * `fn_admin_list_crm_seller_links` / `fn_admin_link_crm_seller` /
 * `fn_admin_unlink_crm_seller` (SECURITY DEFINER + `is_admin_or_above`).
 */

export type CrmSellerLinkAction = 'created' | 'unchanged' | 'updated';

export interface CrmSellerLinkRow {
  auth_user_id: string;
  crm_seller_id: number;
  link_source: string;
  created_at: string | null;
  full_name: string | null;
  email: string | null;
}

export interface CrmSellerLinkSummary {
  total: number;
  manual: number;
  bootstrap: number;
  lastLinkedAt: string | null;
}

export interface CrmSellerLinkResult {
  action: CrmSellerLinkAction;
  previous_crm_seller_id: number | null;
  auth_user_id: string;
  email: string | null;
}

export type LinkInputValidation =
  { ok: false; error: string } | { ok: true; email: string; sellerId: number };

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  email_bootstrap: 'Automático (e-mail)',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function toSellerId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/** Vínculo criado pela tela tem prioridade e não é sobrescrito pelo bootstrap por e-mail. */
export function isManualLink(source: string | null): boolean {
  return source === 'manual';
}

export function linkSourceLabel(source: string | null): string {
  if (!source) return 'Desconhecida';
  return SOURCE_LABELS[source] ?? source;
}

export function parseCrmSellerLinkRows(value: unknown): CrmSellerLinkRow[] {
  if (!Array.isArray(value)) return [];
  const rows: CrmSellerLinkRow[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const authUserId = toText(item.auth_user_id);
    const crmSellerId = toSellerId(item.crm_seller_id);
    if (!authUserId || crmSellerId === null) continue;
    rows.push({
      auth_user_id: authUserId,
      crm_seller_id: crmSellerId,
      link_source: toText(item.link_source) ?? 'desconhecida',
      created_at: toText(item.created_at),
      full_name: toText(item.full_name),
      email: toText(item.email),
    });
  }
  return rows;
}

export function summarizeCrmSellerLinks(rows: readonly CrmSellerLinkRow[]): CrmSellerLinkSummary {
  let manual = 0;
  let bootstrap = 0;
  let lastLinkedAt: string | null = null;
  for (const row of rows) {
    if (row.link_source === 'manual') manual += 1;
    else if (row.link_source === 'email_bootstrap') bootstrap += 1;
    if (row.created_at && (lastLinkedAt === null || row.created_at > lastLinkedAt)) {
      lastLinkedAt = row.created_at;
    }
  }
  return { total: rows.length, manual, bootstrap, lastLinkedAt };
}

export function filterCrmSellerLinks(
  rows: readonly CrmSellerLinkRow[],
  search: string,
): CrmSellerLinkRow[] {
  const needle = search.trim().toLowerCase();
  if (needle === '') return [...rows];
  return rows.filter((row) => {
    const haystack = [
      row.email ?? '',
      row.full_name ?? '',
      String(row.crm_seller_id),
      row.auth_user_id,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function validateLinkInput(email: string, sellerIdInput: string): LinkInputValidation {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === '') {
    return { ok: false, error: 'Informe o e-mail do usuário do sistema.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: 'E-mail inválido.' };
  }
  const sellerId = toSellerId(sellerIdInput.trim());
  if (sellerId === null) {
    return { ok: false, error: 'O id do vendedor no CRM deve ser um inteiro positivo.' };
  }
  return { ok: true, email: normalizedEmail, sellerId };
}

export function parseCrmSellerLinkResult(value: unknown): CrmSellerLinkResult | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!isRecord(row)) return null;
  const authUserId = toText(row.auth_user_id);
  const action = toText(row.action);
  if (!authUserId || action === null) return null;
  if (action !== 'created' && action !== 'updated' && action !== 'unchanged') return null;
  return {
    action,
    previous_crm_seller_id: toSellerId(row.previous_crm_seller_id),
    auth_user_id: authUserId,
    email: toText(row.email),
  };
}

export function parseUnlinkResult(value: unknown): number | null {
  if (Array.isArray(value)) return value.length === 0 ? null : toSellerId(value[0]);
  return toSellerId(value);
}

export function linkActionMessage(action: CrmSellerLinkAction, email: string | null): string {
  const who = email ?? 'o usuário';
  if (action === 'created') return `Vínculo criado: ${who} agora é o vendedor do CRM informado.`;
  if (action === 'updated') return `Vínculo corrigido: ${who} aponta para o novo id do CRM.`;
  return `Nada mudou: ${who} já estava vinculado a esse vendedor.`;
}

/**
 * Traduz o erro do PostgREST para linguagem de operação. As RPCs levantam
 * SQLSTATE próprios (42501 permissão, 22023 entrada, 23503 usuário
 * inexistente, 23505 vendedor já vinculado) e a mensagem do banco é preservada.
 */
export function describeCrmLinkError(error: unknown): string {
  if (!isRecord(error)) return 'Falha ao salvar o vínculo. Tente novamente.';
  const code = toText(error.code);
  const message = toText(error.message);
  const prefix =
    code === '42501'
      ? 'Sem permissão para alterar vínculos de vendedor.'
      : code === '23505'
        ? 'Vendedor já vinculado.'
        : code === '23503'
          ? 'Usuário não encontrado no sistema.'
          : code === '22023'
            ? 'Dados inválidos.'
            : 'Falha ao salvar o vínculo.';
  return message ? `${prefix} ${message}` : `${prefix} Tente novamente.`;
}
