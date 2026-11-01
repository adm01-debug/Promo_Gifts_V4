#!/usr/bin/env bash
set -u

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "::error::GITHUB_OUTPUT não está definido"
  exit 1
fi

ANON_KEY="${SUPABASE_ANON_KEY:-$(grep -o 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*' src/integrations/supabase/client.ts | head -1)}"
if [[ -z "$ANON_KEY" ]]; then
  echo "::error::anon key não encontrada em src/integrations/supabase/client.ts — falha do monitor, não do site"
  for probe in site fn login auth; do
    printf '%s=-1\n%s_http=000\n' "$probe" "$probe" >> "$GITHUB_OUTPUT"
  done
  exit 1
fi

PROBE_FAILED=0

probe() {
  local name="$1"
  local url="$2"
  shift 2

  local result
  local curl_exit
  local http_code
  result=$(curl -sS -f --max-time 30 --retry 2 --retry-delay 10 --retry-all-errors \
    "$@" -o /dev/null -w $'\n%{http_code}' "$url")
  curl_exit=$?
  http_code="${result##*$'\n'}"
  if [[ ! "$http_code" =~ ^[0-9]{3}$ ]]; then
    http_code="000"
  fi

  printf '%s=%s\n%s_http=%s\n' "$name" "$curl_exit" "$name" "$http_code" >> "$GITHUB_OUTPUT"
  if [[ "$curl_exit" -ne 0 ]]; then
    PROBE_FAILED=1
  fi
}

probe site "$SITE_URL"
probe fn "$FN_URL" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
probe login "$LOGIN_FN_URL" \
  -X OPTIONS \
  -H "Origin: https://www.promogifts.com.br" \
  -H "Access-Control-Request-Method: POST"
probe auth "$AUTH_HEALTH_URL" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

exit "$PROBE_FAILED"
