#!/usr/bin/env bash
set -euo pipefail

readonly container_name="promo_approved_plan_pg17"
readonly image="postgres:17.6"

cleanup() { docker rm -f "${container_name}" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "${container_name}" \
  -e POSTGRES_PASSWORD=approved_plan_test_only \
  -e POSTGRES_DB=approved_plan_test \
  -v "$(pwd):/workspace:ro" "${image}" >/dev/null

database_ready=false
for _attempt in $(seq 1 60); do
  # `pg_isready -d` only checks whether PostgreSQL accepts connections; during
  # first boot it can return success before POSTGRES_DB has been created. A
  # real query against the target database closes that initialization race.
  if docker exec "${container_name}" psql -U postgres -d approved_plan_test \
    -Atq -c 'SELECT 1' 2>/dev/null | grep -qx '1'; then
    database_ready=true
    break
  fi
  sleep 1
done

if [[ "${database_ready}" != "true" ]]; then
  echo "PostgreSQL target database did not become queryable within 60 seconds" >&2
  docker logs "${container_name}" >&2 || true
  exit 1
fi

docker exec "${container_name}" psql -v ON_ERROR_STOP=1 \
  -U postgres -d approved_plan_test \
  -f /workspace/tests/sql/approved_plan_execution_test.sql

readonly psql_base=(docker exec "${container_name}" psql -v ON_ERROR_STOP=1 -U postgres -d approved_plan_test)
readonly seller="10000000-0000-4000-8000-000000000001"
readonly admin="10000000-0000-4000-8000-000000000010"
readonly org="20000000-0000-4000-8000-000000000001"
readonly race_quote="30000000-0000-4000-8000-000000000004"
readonly decision_quote="30000000-0000-4000-8000-000000000005"
race_dir=$(mktemp -d /tmp/promo-approved-plan-race-XXXXXX)

"${psql_base[@]}" -q -c "
  SET request.jwt.claim.sub='${seller}';
  SET request.jwt.claim.role='service_role';
  INSERT INTO quotes(id,quote_number,client_name,seller_id,created_by,organization_id,status,subtotal,total,real_discount_percent)
  VALUES('${race_quote}','Q-RACE','Cliente','${seller}','${seller}','${org}','pending_approval',100,80,20),
        ('${decision_quote}','Q-DECISION','Cliente','${seller}','${seller}','${org}','pending_approval',100,80,20);
  INSERT INTO quote_items(quote_id,product_name,product_sku,quantity,unit_price,subtotal)
  VALUES('${race_quote}','Race','R-1',10,10,100),('${decision_quote}','Decision','D-1',10,10,100);"

("${psql_base[@]}" -Atq -c "SET request.jwt.claim.sub='${seller}'; SELECT (request_discount_approval_transactional('${race_quote}','race-a')).id;" >"${race_dir}/request-a") &
pid_a=$!
("${psql_base[@]}" -Atq -c "SET request.jwt.claim.sub='${seller}'; SELECT (request_discount_approval_transactional('${race_quote}','race-b')).id;" >"${race_dir}/request-b") &
pid_b=$!
wait "${pid_a}"
wait "${pid_b}"

if [[ "$(tail -1 "${race_dir}/request-a")" != "$(tail -1 "${race_dir}/request-b")" ]]; then
  echo "concurrent request returned different ids" >&2
  exit 1
fi

request_counts=$("${psql_base[@]}" -Atq -c "SELECT
  (SELECT count(*) FROM discount_approval_requests WHERE quote_id='${race_quote}'),
  (SELECT count(*) FROM test_dar_audit a JOIN discount_approval_requests d ON d.id=a.request_id WHERE d.quote_id='${race_quote}' AND a.event='requested'),
  (SELECT count(*) FROM quote_history WHERE quote_id='${race_quote}' AND action='discount_approval_requested');")
if [[ "${request_counts}" != "1|1|1" ]]; then
  echo "concurrent request cardinality failed: ${request_counts}" >&2
  exit 1
fi

decision_request=$("${psql_base[@]}" -Atq -c "SET request.jwt.claim.sub='${seller}'; SELECT (request_discount_approval_transactional('${decision_quote}','decision-race')).id;" | tail -1)
set +e
("${psql_base[@]}" -Atq -c "SET request.jwt.claim.sub='${admin}'; SELECT (respond_discount_approval_transactional('${decision_request}',true,'approve-race')).status;" >"${race_dir}/approve" 2>"${race_dir}/approve.err") &
pid_approve=$!
("${psql_base[@]}" -Atq -c "SET request.jwt.claim.sub='${admin}'; SELECT (respond_discount_approval_transactional('${decision_request}',false,'reject-race')).status;" >"${race_dir}/reject" 2>"${race_dir}/reject.err") &
pid_reject=$!
wait "${pid_approve}"; rc_approve=$?
wait "${pid_reject}"; rc_reject=$?
set -e

if [[ $((rc_approve == 0 ? 1 : 0)) -eq $((rc_reject == 0 ? 1 : 0)) ]]; then
  echo "approve/reject race must have exactly one winner" >&2
  exit 1
fi

decision_counts=$("${psql_base[@]}" -Atq -c "SELECT
  (SELECT count(*) FROM discount_approval_requests WHERE id='${decision_request}' AND status IN ('approved','rejected')),
  (SELECT count(*) FROM test_dar_audit WHERE request_id='${decision_request}' AND event IN ('approved','rejected')),
  (SELECT count(*) FROM test_notifications WHERE request_id='${decision_request}' AND event IN ('approved','rejected')),
  (SELECT count(*) FROM quote_history WHERE quote_id='${decision_quote}' AND action IN ('discount_approved','discount_rejected'));" )
if [[ "${decision_counts}" != "1|1|1|1" ]]; then
  echo "concurrent decision cardinality failed: ${decision_counts}" >&2
  exit 1
fi

echo "approved plan concurrency scenarios: PASS"
