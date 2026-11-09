#!/usr/bin/env bash
# Contrato único para "pré-requisito ausente" em scripts shell (espelho de
# scripts/lib/missing-prerequisite.mjs). Uso, depois de `source`:
#
#   missing_prerequisite "<check>" "<motivo>" [exit_code]
#
# - Modo estrito (CI=true|1, GITHUB_ACTIONS=true ou REQUIRE_LIVE=1) → falha fechado.
# - Fora do CI → static-pass explícito (exit 0): nada foi verificado.
#
# GUARD: um gate nunca pode sair 0 no CI sem ter verificado.
missing_prerequisite() {
  local check="$1" reason="$2" code="${3:-1}"
  if [[ "${CI:-}" == "true" || "${CI:-}" == "1" || "${GITHUB_ACTIONS:-}" == "true" || "${REQUIRE_LIVE:-}" == "1" ]]; then
    echo "[${check}] ❌ pré-requisito ausente: ${reason}" >&2
    echo "[${check}] modo estrito (CI ou REQUIRE_LIVE=1): a verificação não pode ser pulada." >&2
    [[ "$code" == "0" ]] && code=1
    exit "$code"
  fi
  echo "[${check}] static-pass: ${reason}; nada foi verificado (REQUIRE_LIVE=1 torna obrigatório)."
  exit 0
}
