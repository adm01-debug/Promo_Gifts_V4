#!/usr/bin/env bash
set -euo pipefail

readonly container_name="promo_wave1_forward_only_pg17"
readonly image="postgres:17.6"

cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
docker run -d --name "${container_name}" \
  -e POSTGRES_PASSWORD=wave1_test_only \
  -e POSTGRES_DB=wave1_test \
  -v "$(pwd):/workspace:ro" \
  "${image}" >/dev/null

for _attempt in $(seq 1 60); do
  if docker exec "${container_name}" pg_isready -U postgres -d wave1_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "${container_name}" \
  psql -v ON_ERROR_STOP=1 -U postgres -d wave1_test \
  -f /workspace/tests/sql/wave1_forward_only_migrations_test.sql
