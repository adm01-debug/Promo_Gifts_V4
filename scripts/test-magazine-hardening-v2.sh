#!/usr/bin/env bash
set -euo pipefail

readonly container_name="promo_magazine_hardening_pg17_$$"
readonly image="postgres:17.6"
readonly database="magazine_hardening_test"
readonly actor="00000000-0000-0000-0000-000000000001"
race_dir=$(mktemp -d /tmp/promo-magazine-hardening-race-XXXXXX)

cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
  find "${race_dir}" -type f -delete 2>/dev/null || true
  rmdir "${race_dir}" 2>/dev/null || true
}
trap cleanup EXIT

docker run -d --name "${container_name}" \
  -e POSTGRES_PASSWORD=magazine_test_only \
  -e POSTGRES_DB="${database}" \
  -v "$(pwd):/workspace:ro" "${image}" >/dev/null

ready=false
for _attempt in $(seq 1 60); do
  if docker exec "${container_name}" psql -U postgres -d "${database}" -Atq \
      -c 'SELECT 1' 2>/dev/null | grep -qx '1'; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "${ready}" != true ]]; then
  docker logs "${container_name}" >&2 || true
  exit 1
fi

readonly psql_base=(docker exec "${container_name}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${database}")
"${psql_base[@]}" -f /workspace/tests/magazine/sql/magazine_rpc_schema.sql >/dev/null

readonly migrations=(
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
for migration in "${migrations[@]}"; do
  "${psql_base[@]}" -f "/workspace/supabase/migrations/${migration}" >/dev/null
done

# A expansão precisa ser compatível com o cliente legado durante o rollout.
"${psql_base[@]}" -f /workspace/tests/magazine/sql/magazine_rpc_expand_compatibility.sql >/dev/null

# Reapplication is the idempotence gate for each forward-only rollout phase.
"${psql_base[@]}" -f /workspace/supabase/migrations/20260909200000_magazine_hardening_v2.sql >/dev/null
"${psql_base[@]}" -f /workspace/qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql >/dev/null
"${psql_base[@]}" -f /workspace/qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql >/dev/null
"${psql_base[@]}" -f /workspace/tests/magazine/sql/magazine_rpc_scenarios.sql >/dev/null
# The canonical constraint is deferred. Tighten it here to prove that v2's
# two-phase reorder is also safe with immediate uniqueness (swap/cycle).
"${psql_base[@]}" -c "
  ALTER TABLE public.magazine_items DROP CONSTRAINT magazine_items_position_unique;
  ALTER TABLE public.magazine_items ADD CONSTRAINT magazine_items_position_unique
    UNIQUE (magazine_id, position);" >/dev/null
"${psql_base[@]}" -f /workspace/tests/magazine/sql/magazine_rpc_v2_scenarios.sql >/dev/null
"${psql_base[@]}" -f /workspace/tests/magazine/sql/magazine_import_local_v2_scenarios.sql >/dev/null

create_result=$("${psql_base[@]}" -Atq -c "
  SELECT set_config('request.jwt.claim.sub','${actor}',false);
  SELECT magazine_create_v2(NULL,'CAS race','editorial-vogue');" | tail -1)
race_magazine=$(printf '%s' "${create_result}" | sed -E 's/.*"magazine_id": "([^"]+)".*/\1/')

set +e
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_add_items_v2('${race_magazine}',0,'[{\"product_id\":\"22000000-0000-0000-0000-000000000001\",\"product_snapshot\":{}}]');" >"${race_dir}/add-a" 2>"${race_dir}/add-a.err") &
pid_a=$!
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_add_items_v2('${race_magazine}',0,'[{\"product_id\":\"22000000-0000-0000-0000-000000000002\",\"product_snapshot\":{}}]');" >"${race_dir}/add-b" 2>"${race_dir}/add-b.err") &
pid_b=$!
wait "${pid_a}"; rc_a=$?
wait "${pid_b}"; rc_b=$?
set -e
if [[ $((rc_a == 0 ? 1 : 0)) -eq $((rc_b == 0 ? 1 : 0)) ]]; then
  echo "CAS add race must have exactly one winner: rc_a=${rc_a} rc_b=${rc_b}" >&2
  exit 1
fi
if [[ "$("${psql_base[@]}" -Atq -c "SELECT edit_version||'|'||(SELECT count(*) FROM magazine_items WHERE magazine_id='${race_magazine}') FROM magazines WHERE id='${race_magazine}'")" != "1|1" ]]; then
  echo "CAS add race left an invalid version/item count" >&2
  exit 1
fi

set +e
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_publish_v2('${race_magazine}',1);" >"${race_dir}/publish" 2>"${race_dir}/publish.err") &
pid_publish=$!
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_add_items_v2('${race_magazine}',1,'[{\"product_id\":\"22000000-0000-0000-0000-000000000003\",\"product_snapshot\":{}}]');" >"${race_dir}/add-after" 2>"${race_dir}/add-after.err") &
pid_add=$!
wait "${pid_publish}"; rc_publish=$?
wait "${pid_add}"; rc_add=$?
set -e
if [[ $((rc_publish == 0 ? 1 : 0)) -eq $((rc_add == 0 ? 1 : 0)) ]]; then
  echo "publish/add race must have exactly one winner: publish=${rc_publish} add=${rc_add}" >&2
  exit 1
fi

remove_race_result=$("${psql_base[@]}" -Atq -c "
  SELECT set_config('request.jwt.claim.sub','${actor}',false);
  SELECT magazine_create_v2(NULL,'Publish/remove race','editorial-vogue');" | tail -1)
remove_race_magazine=$(printf '%s' "${remove_race_result}" | sed -E 's/.*"magazine_id": "([^"]+)".*/\1/')
"${psql_base[@]}" -Atq -c "
  SELECT set_config('request.jwt.claim.sub','${actor}',false);
  SELECT magazine_add_items_v2('${remove_race_magazine}',0,'[
    {\"product_id\":\"23000000-0000-0000-0000-000000000001\",\"product_snapshot\":{}},
    {\"product_id\":\"23000000-0000-0000-0000-000000000002\",\"product_snapshot\":{}}
  ]');" >/dev/null
remove_race_item=$("${psql_base[@]}" -Atq -c "SELECT id FROM magazine_items WHERE magazine_id='${remove_race_magazine}' ORDER BY position LIMIT 1")

set +e
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_publish_v2('${remove_race_magazine}',1);" >"${race_dir}/publish-remove-publish" 2>"${race_dir}/publish-remove-publish.err") &
pid_remove_publish=$!
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_remove_items_v2('${remove_race_magazine}',1,ARRAY['${remove_race_item}'::uuid]);" >"${race_dir}/publish-remove-delete" 2>"${race_dir}/publish-remove-delete.err") &
pid_remove_delete=$!
wait "${pid_remove_publish}"; rc_remove_publish=$?
wait "${pid_remove_delete}"; rc_remove_delete=$?
set -e
if [[ $((rc_remove_publish == 0 ? 1 : 0)) -eq $((rc_remove_delete == 0 ? 1 : 0)) ]]; then
  echo "publish/remove race must have exactly one winner: publish=${rc_remove_publish} remove=${rc_remove_delete}" >&2
  exit 1
fi
remove_race_state=$("${psql_base[@]}" -Atq -c "SELECT status||'|'||edit_version||'|'||(SELECT count(*) FROM magazine_items WHERE magazine_id='${remove_race_magazine}') FROM magazines WHERE id='${remove_race_magazine}'")
if [[ "${remove_race_state}" != "published|2|2" && "${remove_race_state}" != "draft|2|1" ]]; then
  echo "publish/remove race left invalid state: ${remove_race_state}" >&2
  exit 1
fi

current_version=$("${psql_base[@]}" -Atq -c "SELECT edit_version FROM magazines WHERE id='${race_magazine}'")
set +e
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_duplicate_v2('${race_magazine}',${current_version},'concurrent-duplicate','Concurrent copy');" >"${race_dir}/duplicate-a" 2>"${race_dir}/duplicate-a.err") &
pid_dup_a=$!
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_duplicate_v2('${race_magazine}',${current_version},'concurrent-duplicate','Concurrent copy');" >"${race_dir}/duplicate-b" 2>"${race_dir}/duplicate-b.err") &
pid_dup_b=$!
wait "${pid_dup_a}"; rc_dup_a=$?
wait "${pid_dup_b}"; rc_dup_b=$?
set -e
if [[ "${rc_dup_a}" -ne 0 || "${rc_dup_b}" -ne 0 ]]; then
  echo "concurrent idempotent duplicate failed" >&2
  exit 1
fi
dup_a=$(tail -1 "${race_dir}/duplicate-a" | sed -E 's/.*"magazine_id": "([^"]+)".*/\1/')
dup_b=$(tail -1 "${race_dir}/duplicate-b" | sed -E 's/.*"magazine_id": "([^"]+)".*/\1/')
if [[ -z "${dup_a}" || "${dup_a}" != "${dup_b}" ]]; then
  echo "concurrent duplicate returned different magazine ids" >&2
  exit 1
fi

readonly concurrent_import_payload='{"title":"Concurrent local import","templateId":"editorial-vogue","status":"draft","items":[],"pageOrder":null}'
set +e
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_import_local_v2('concurrent-local-import','${concurrent_import_payload}'::jsonb);" >"${race_dir}/import-a" 2>"${race_dir}/import-a.err") &
pid_import_a=$!
("${psql_base[@]}" -Atq -c "SELECT set_config('request.jwt.claim.sub','${actor}',false); SELECT magazine_import_local_v2('concurrent-local-import','${concurrent_import_payload}'::jsonb);" >"${race_dir}/import-b" 2>"${race_dir}/import-b.err") &
pid_import_b=$!
wait "${pid_import_a}"; rc_import_a=$?
wait "${pid_import_b}"; rc_import_b=$?
set -e
if [[ "${rc_import_a}" -ne 0 || "${rc_import_b}" -ne 0 ]]; then
  echo "concurrent idempotent local import failed" >&2
  exit 1
fi
import_a=$(tail -1 "${race_dir}/import-a" | sed -E 's/.*"magazine_id": "([^"]+)".*/\1/')
import_b=$(tail -1 "${race_dir}/import-b" | sed -E 's/.*"magazine_id": "([^"]+)".*/\1/')
if [[ -z "${import_a}" || "${import_a}" != "${import_b}" ]]; then
  echo "concurrent local import returned different magazine ids" >&2
  exit 1
fi
if [[ "$("${psql_base[@]}" -Atq -c "SELECT count(*) FROM magazines WHERE owner_id='${actor}' AND content_settings #>> '{__magazine_import_v2,key_hash}'=encode(extensions.digest('${actor}:concurrent-local-import','sha256'),'hex')")" != "1" ]]; then
  echo "concurrent local import persisted more than one marker" >&2
  exit 1
fi

echo "MAGAZINE_HARDENING_V2_PG17_OK"
