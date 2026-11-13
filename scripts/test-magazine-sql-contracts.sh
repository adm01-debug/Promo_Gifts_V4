#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/missing-prerequisite.sh"
if [[ -z "${DATABASE_URL:-}" ]]; then
  missing_prerequisite "test-magazine-sql-contracts" "DATABASE_URL ausente" 1
fi

PSQL=(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f tests/magazine/sql/magazine_rpc_schema.sql

MIGRATIONS=(
  20260909181000_magazine_add_items_atomic.sql
  20260909181100_magazine_remove_items_atomic.sql
  20260909181200_magazine_reorder_items_atomic.sql
  20260909181300_magazine_duplicate_atomic.sql
  20260909181400_magazine_update_metadata_atomic.sql
  20260909190000_magazine_duplicate_remap_page_order.sql
  20260909190100_magazine_page_order_validation_null_safe.sql
  20260909190200_magazine_add_items_null_safe.sql
  20260909190300_magazine_publish_atomic.sql
  20260909190400_magazine_page_order_numeric_version.sql
  20260909200000_magazine_hardening_v2.sql
)

for migration in "${MIGRATIONS[@]}"; do
  "${PSQL[@]}" -f "supabase/migrations/$migration"
done

"${PSQL[@]}" -f tests/magazine/sql/magazine_rpc_expand_compatibility.sql
"${PSQL[@]}" -f qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql
"${PSQL[@]}" -f qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql
"${PSQL[@]}" -f tests/magazine/sql/magazine_rpc_scenarios.sql
"${PSQL[@]}" -f tests/magazine/sql/magazine_import_local_v2_scenarios.sql
"${PSQL[@]}" -f tests/magazine/sql/magazine_rpc_v2_scenarios.sql
