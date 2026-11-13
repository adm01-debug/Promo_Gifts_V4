/**
 * Escopo de ownership do crm-db-bridge (E081) — lógica pura, sem Deno/IO,
 * para ser testada isoladamente (vitest + deno test).
 *
 * BUGFIX (log de console de produção, 12/11): o filtro antigo usava
 * `owner_id`, coluna que NÃO existe no CRM externo (pgxfvjmuubtbowutlide).
 * Toda leitura de `companies`/`contacts` feita por quem caía na role
 * "vendedor" voltava 500 "column companies.owner_id does not exist".
 *
 * Dois defeitos somados:
 *  1. A coluna de dono real no CRM é `user_id` (src/types/crm.ts — CrmCompany
 *     e CrmContact, "schema mapeado diretamente do banco externo real").
 *     `contact_emails` e `contact_phones` não têm coluna de dono (seguem o contato);
 *     `customers` tem `vendedor_id` (FK customers_vendedor_id_fkey → users.id).
 *  2. A resolução de role só conhecia supervisor/gerente/vendedor; `admin`,
 *     `dev` e `manager` (valores reais do enum app_role) caíam no fallback
 *     "vendedor" e recebiam o filtro — inclusive o dono do sistema.
 */

/** Roles com leitura ampla do CRM (mesma tier ≥ 2 de _shared/authorize.ts, + manager/gerente). */
export const CRM_BROAD_READ_ROLES = ["dev", "admin", "supervisor", "manager", "gerente"] as const;

/**
 * Resolve a role efetiva do chamador. Qualquer role com leitura ampla vence;
 * caso contrário o chamador é tratado como "vendedor" (escopo restrito).
 */
export function resolveCrmRole(roles: readonly string[]): string {
  return CRM_BROAD_READ_ROLES.find((r) => roles.includes(r)) ?? "vendedor";
}

/** Tabelas com PII cuja leitura por vendedor é restrita ao próprio registro. */
export const CRM_PII_TABLES = new Set([
  "companies", "contacts", "contact_emails", "contact_phones", "customers",
]);

/** Coluna de dono REAL no CRM externo, por tabela. Ausente = sem coluna de dono. */
export const CRM_OWNER_COLUMN: Readonly<Record<string, string>> = {
  companies: "user_id",
  contacts: "user_id",
  customers: "vendedor_id",
};

/**
 * Tabelas sem coluna de dono própria, cujo dono é o do registro pai (regra do dono, 12/11:
 * "vendedor só vê os dele" — e-mails/telefones do contato seguem o dono do contato).
 */
export const CRM_OWNER_VIA: Readonly<Record<string, { parent: string; fk: string }>> = {
  contact_emails: { parent: "contacts", fk: "contact_id" },
  contact_phones: { parent: "contacts", fk: "contact_id" },
};

export type CrmOwnerScope =
  | { kind: "none" }
  | { kind: "filter"; column: string; value: string }
  | { kind: "via"; parent: string; parentColumn: string; fk: string; value: string }
  | { kind: "deny" };

/**
 * Decide o escopo de leitura:
 *  - role ampla ou tabela sem PII → sem filtro;
 *  - vendedor em tabela PII com coluna de dono → filtra pela coluna real;
 *  - vendedor em tabela filha (e-mails/telefones) → filtra pelos ids do pai que são dele;
 *  - vendedor em tabela PII sem coluna de dono → nega (403), em vez de
 *    devolver PII sem escopo ou estourar 500 por coluna inexistente.
 */
export function crmOwnerScope(table: string, userRole?: string, userId?: string): CrmOwnerScope {
  if (userRole !== "vendedor" || !CRM_PII_TABLES.has(table)) return { kind: "none" };
  if (!userId) return { kind: "deny" };
  const column = CRM_OWNER_COLUMN[table];
  if (column) return { kind: "filter", column, value: userId };
  const via = CRM_OWNER_VIA[table];
  const parentColumn = via ? CRM_OWNER_COLUMN[via.parent] : undefined;
  if (via && parentColumn) return { kind: "via", parent: via.parent, parentColumn, fk: via.fk, value: userId };
  return { kind: "deny" };
}
