/**
 * supabase/functions/_shared/contracts/schemas/sync-external-db.ts
 *
 * v1: table obrigatório. Sunset 2026-11-30.
 * v2: strict + since como ISO 8601 + idempotency_key.
 */
import { z } from "https://esm.sh/zod@3.23.8";

const DirectionEnum = z.enum(["to-external", "from-external"]);

// E089: allowlist de tabelas sincronizáveis — impede upsert em tabelas arbitrárias via service_role
const SYNC_ALLOWED_TABLES = [
  "products", "categories", "suppliers", "tags",
  "personalization_techniques", "customization_price_tables",
  "product_images", "product_videos", "product_variants",
  "product_materials", "product_tags", "product_categories",
  "product_suppliers", "product_print_areas", "product_kit_components",
  "color_groups", "color_nuances", "color_equivalences", "color_variations",
  "material_groups", "material_types", "material_variations",
  "supplier_colors", "supplier_materials",
  "supplier_attribute_definitions", "supplier_product_attributes",
  "product_attributes", "category_attributes",
  "price_lists", "variant_stocks", "variant_cost_tiers", "variant_sale_prices",
  "variation_types", "variation_values", "stock_movements",
  "collections", "collection_products",
] as const;

const AllowedTableEnum = z.enum(SYNC_ALLOWED_TABLES);

export const SyncExternalDbV1 = z.object({
  table: AllowedTableEnum,
  direction: DirectionEnum.optional(),
  since: z.string().max(50).optional(),
});

export const SyncExternalDbV2 = z
  .object({
    table: AllowedTableEnum,
    direction: DirectionEnum,
    since: z.string().datetime({ offset: true }).optional(),
    idempotency_key: z.string().uuid(),
  })
  .strict();

export const SyncExternalDbSchemas = {
  name: "sync-external-db",
  versions: { "1": SyncExternalDbV1, "2": SyncExternalDbV2 },
  defaultVersion: "1" as const,
  deprecated: [
    {
      version: "1",
      sunset: "2026-11-30",
      migrationUrl:
        "https://github.com/adm01-debug/promo-gifts-v4/blob/main/docs/contracts/MIGRATION_GUIDE.md#sync-external-db",
    },
  ],
};
