/**
 * Seed determinístico para /orcamentos — cobre TODOS os 14 status canônicos
 * do SSOT `QUOTE_ROW_BADGE_STYLES` (chips do topo + badges da linha).
 *
 * Status no banco canônico `doufsxqlfjyuvxuezpln`: o CHECK `valid_quote_status`
 * aceita os 10 status do enum FE — incluindo `cancelled`. Verificado
 * empiricamente em 2026-06-27: INSERT autenticado de status `cancelled` passa
 * por CHECK + RLS + todos os triggers. Portanto TODOS os 14 badges são
 * semeáveis e não há mais `unseedable_reason`.
 *
 * RLS: `quotes` exige `organization_id` (NOT NULL) e a policy
 * `org_members_create_quotes` valida `user_is_org_member(organization_id)`. O
 * seed resolve o org do próprio usuário autenticado via `user_organizations`
 * (a fonte que a RLS checa), com fallback em `profiles.organization_id`. Sem
 * isso o INSERT falha com 42501 (RLS) para QUALQUER status.
 *
 * Reusa o JWT do admin no `localStorage`. Idempotente: se já houver um quote
 * E2E com o tuple alvo, pula a inserção. Nomes seguem `e2eName(...)` para o
 * `e2e-cleanup` apagar apenas estes registros.
 */
import type { Page } from "@playwright/test";
import { e2eName } from "./e2e-resources";
import { requireE2EBaseUrl } from "./require-env-base-url";

const SUPABASE_URL =
  requireE2EBaseUrl();
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

/** Chaves canônicas do SSOT `QUOTE_ROW_BADGE_STYLES`. */
export const ALL_BADGE_KEYS = [
  "draft",
  "unsynced",
  "synced",
  "awaiting",
  "approved",
  "rejected",
  "expired",
  "expired_discount",
  "sent",
  "viewed",
  "quote_approved",
  "converted",
  "cancelled",
  "quote_rejected",
] as const;
export type BadgeKey = (typeof ALL_BADGE_KEYS)[number];

interface QuoteSeedTarget {
  badge_key: BadgeKey;
  label: string;
  status: string;
  synced_to_bitrix: boolean;
  discount_approval_status: string | null;
  /** Se preenchido, o seed NÃO tenta inserir e devolve esta razão. */
  unseedable_reason?: string;
}

/**
 * Mapeamento (badge → tuple BD) espelha a lógica de `getQuoteRowBadge`.
 * Mantenha sincronizado quando o SSOT mudar.
 */
const TARGETS: QuoteSeedTarget[] = [
  { badge_key: "draft", label: "draft", status: "draft", synced_to_bitrix: false, discount_approval_status: null },
  { badge_key: "unsynced", label: "unsynced", status: "pending", synced_to_bitrix: false, discount_approval_status: null },
  { badge_key: "synced", label: "synced", status: "pending", synced_to_bitrix: true, discount_approval_status: null },
  { badge_key: "awaiting", label: "awaiting", status: "pending_approval", synced_to_bitrix: true, discount_approval_status: "pending" },
  { badge_key: "approved", label: "dar-approved", status: "pending", synced_to_bitrix: true, discount_approval_status: "approved" },
  { badge_key: "rejected", label: "dar-rejected", status: "pending", synced_to_bitrix: true, discount_approval_status: "rejected" },
  { badge_key: "expired", label: "expired", status: "expired", synced_to_bitrix: false, discount_approval_status: null },
  { badge_key: "expired_discount", label: "dar-expired", status: "pending", synced_to_bitrix: true, discount_approval_status: "expired" },
  { badge_key: "sent", label: "sent", status: "sent", synced_to_bitrix: true, discount_approval_status: null },
  { badge_key: "viewed", label: "viewed", status: "viewed", synced_to_bitrix: true, discount_approval_status: null },
  { badge_key: "quote_approved", label: "quote-approved", status: "approved", synced_to_bitrix: true, discount_approval_status: null },
  { badge_key: "converted", label: "converted", status: "converted", synced_to_bitrix: true, discount_approval_status: null },
  { badge_key: "cancelled", label: "cancelled", status: "cancelled", synced_to_bitrix: false, discount_approval_status: null },
  { badge_key: "quote_rejected", label: "quote-rejected", status: "rejected", synced_to_bitrix: true, discount_approval_status: null },
];

export interface QuotesStatusSeedTargetResult {
  badge_key: BadgeKey;
  seeded: boolean;
  reason: string | null;
  name: string | null;
}

export interface QuotesStatusSeedResult {
  /** Total de inserts realizados nesta corrida (não conta idempotentes). */
  created: number;
  /** Erro fatal (sem JWT, sem anon key) — encerra o seed antes de tudo. */
  skipped: string | null;
  /** Nomes de quotes recém-criados (para cleanup). */
  names: string[];
  /** Resultado por badge — usado pelo spec para iterar com diagnóstico. */
  perTarget: QuotesStatusSeedTargetResult[];
}

export async function seedQuotesForStatusChips(
  page: Page,
): Promise<QuotesStatusSeedResult> {
  const targets = TARGETS.map((t) => ({ ...t, name: e2eName(`chip-${t.label}`) }));

  return await page.evaluate(
    async ({ url, anonKey, targets }) => {
      let jwt = "";
      let sellerId = "";
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)!;
          if (!k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          jwt = parsed?.access_token ?? "";
          sellerId = parsed?.user?.id ?? "";
          if (jwt) break;
        }
      } catch {
        /* noop */
      }
      if (!jwt || !sellerId) {
        return {
          created: 0,
          skipped: "no-jwt",
          names: [] as string[],
          perTarget: [] as QuotesStatusSeedTargetResult[],
        };
      }

      const headers: Record<string, string> = {
        apikey: anonKey,
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      };

      // Organização e tuples já existentes não dependem entre si: resolvê-los
      // em paralelo evita multiplicar a latência do gateway. A versão anterior
      // fazia até 14 GETs de existência em série por teste e podia consumir o
      // timeout inteiro antes de chegar ao cenário de undo.
      const resolveOrganizationId = async (): Promise<string> => {
        try {
          const uoResp = await fetch(
            `${url}/rest/v1/user_organizations?user_id=eq.${sellerId}&select=organization_id&limit=1`,
            { headers },
          );
          if (uoResp.ok) {
            const uoRows = (await uoResp.json()) as Array<{ organization_id: string }>;
            const organizationId = uoRows[0]?.organization_id ?? "";
            if (organizationId) return organizationId;
          }

          const profResp = await fetch(
            `${url}/rest/v1/profiles?id=eq.${sellerId}&select=organization_id&limit=1`,
            { headers },
          );
          if (!profResp.ok) return "";
          const profRows = (await profResp.json()) as Array<{
            organization_id: string | null;
          }>;
          return profRows[0]?.organization_id ?? "";
        } catch {
          return "";
        }
      };

      const loadExistingTuples = async () => {
        const pageSize = 1_000;
        const maxRows = 10_000;
        const tupleKey = (row: {
          status: string;
          synced_to_bitrix: boolean;
          discount_approval_status: string | null;
        }) =>
          JSON.stringify([
            row.status,
            row.synced_to_bitrix,
            row.discount_approval_status,
          ]);
        const requiredKeys = new Set(
          targets.filter((target) => !target.unseedable_reason).map(tupleKey),
        );
        const existingKeys = new Set<string>();
        const q = new URLSearchParams({
          select: "id,status,synced_to_bitrix,discount_approval_status",
          client_name: "like.[E2E%",
          limit: String(pageSize),
          order: "id.asc",
        });
        const rows: Array<{
          id: string;
          status: string;
          synced_to_bitrix: boolean;
          discount_approval_status: string | null;
        }> = [];
        let cursor = "";

        for (let scanned = 0; scanned < maxRows; scanned += pageSize) {
          if (cursor) q.set("id", `gt.${cursor}`);
          const response = await fetch(`${url}/rest/v1/quotes?${q}`, { headers });
          if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(
              `seed lookup falhou (${response.status}): ${detail.slice(0, 160)}`,
            );
          }

          const pageRows = (await response.json()) as typeof rows;
          rows.push(...pageRows);
          for (const row of pageRows) existingKeys.add(tupleKey(row));
          if ([...requiredKeys].every((key) => existingKeys.has(key))) return rows;
          if (pageRows.length < pageSize) return rows;
          cursor = pageRows.at(-1)!.id;
        }

        throw new Error(
          `seed lookup atingiu o limite de ${maxRows} quotes E2E; execute o cleanup antes de continuar`,
        );
      };

      const [organizationId, existingTuples] = await Promise.all([
        resolveOrganizationId(),
        loadExistingTuples(),
      ]);
      if (!organizationId) {
        return {
          created: 0,
          skipped: "no-org",
          names: [] as string[],
          perTarget: [] as QuotesStatusSeedTargetResult[],
        };
      }

      const resultByBadge = new Map<BadgeKey, QuotesStatusSeedTargetResult>();
      const missingTargets: typeof targets = [];

      for (const t of targets) {
        if (t.unseedable_reason) {
          resultByBadge.set(t.badge_key, {
            badge_key: t.badge_key,
            seeded: false,
            reason: t.unseedable_reason,
            name: null,
          });
          continue;
        }

        const alreadyExists = existingTuples.some(
          (row) =>
            row.status === t.status &&
            row.synced_to_bitrix === t.synced_to_bitrix &&
            row.discount_approval_status === t.discount_approval_status,
        );
        if (alreadyExists) {
          resultByBadge.set(t.badge_key, {
            badge_key: t.badge_key,
            seeded: true,
            reason: "already-existed",
            name: null,
          });
        } else {
          missingTargets.push(t);
        }
      }

      if (missingTargets.length > 0) {
        const bodies = missingTargets.map((t) => ({
          seller_id: sellerId,
          organization_id: organizationId,
          client_name: t.name,
          status: t.status,
          synced_to_bitrix: t.synced_to_bitrix,
          discount_approval_status: t.discount_approval_status,
          total: 100,
          notes: "e2e-seed-chips-v2",
        }));

        const insertResp = await fetch(`${url}/rest/v1/quotes`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodies),
        });
        if (!insertResp.ok) {
          const errBody = await insertResp.text().catch(() => "");
          throw new Error(
            `seed insert em lote falhou (${insertResp.status}): ${errBody.slice(0, 160)}`,
          );
        } else {
          for (const t of missingTargets) {
            resultByBadge.set(t.badge_key, {
              badge_key: t.badge_key,
              seeded: true,
              reason: "created",
              name: t.name,
            });
          }
        }
      }

      const perTarget = targets.map((t) => resultByBadge.get(t.badge_key)!);
      const names = perTarget
        .filter((result) => result.reason === "created" && result.name)
        .map((result) => result.name!);
      return { created: names.length, skipped: null, names, perTarget };
    },
    { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, targets },
  );
}
