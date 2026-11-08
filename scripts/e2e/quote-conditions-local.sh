#!/usr/bin/env bash
# Roda o spec visual do card "Condições" localmente com os MESMOS parâmetros do CI:
# viewports 375/768/1280, temas light+dark, trace/video em falha e relatório HTML.
#
# Uso:
#   bash scripts/e2e/quote-conditions-local.sh               # roda (fail-on-diff)
#   bash scripts/e2e/quote-conditions-local.sh --update      # regenera baselines
#   UPDATE=1 bash scripts/e2e/quote-conditions-local.sh      # idem
set -euo pipefail

# Guard: sem servidor de dev acessível e sem env vars de E2E → static-pass
if [[ -z "${E2E_BASE_URL:-}" ]] && [[ -z "${E2E_REUSE_EXISTING_SERVER:-}" ]] && [[ -z "${E2E_FORCE_START_SERVER:-}" ]]; then
  if ! curl -sf --max-time 2 http://localhost:8080 >/dev/null 2>&1; then
    echo "[quote-conditions-local] static-pass: servidor de dev não acessível (inicie com npm run dev); E2E ignorado."
    exit 0
  fi
fi

UPDATE_FLAG=""
if [[ "${1:-}" == "--update" || "${UPDATE:-}" == "1" ]]; then
  UPDATE_FLAG="--update-snapshots"
  echo "🖼️  Modo: --update-snapshots (regenera baselines)"
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "🎭  Espelha config do CI: project=chromium-public, trace/video=retain-on-failure"

PLAYWRIGHT_JSON_OUTPUT_NAME=playwright-report/results.json \
  npx playwright test e2e/ui/quote-conditions-visual.spec.ts \
  --project=chromium-public \
  --trace=retain-on-failure \
  --reporter=list,html,json \
  ${UPDATE_FLAG} || TEST_EXIT=$?

TEST_EXIT="${TEST_EXIT:-0}"

# Gera relatório HTML de diffs se houver falha
if [[ "$TEST_EXIT" -ne 0 ]]; then
  echo "❌  Testes falharam — gerando relatório HTML de diffs…"
  node scripts/build-visual-diff-report.mjs \
    --results test-results \
    --out visual-diff-report/index.html \
    --title "Card Condições — local"
  echo "📎  Abra visual-diff-report/index.html no navegador."
  echo "📎  HTML report do Playwright: npx playwright show-report"
fi

exit "$TEST_EXIT"
