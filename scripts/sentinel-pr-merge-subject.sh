#!/usr/bin/env bash
# Return success when a commit subject identifies a PR merge/squash.
# The Branch Protection Sentinel uses this to avoid re-auditing commits that
# were already reviewed inside the PR. Keep these patterns aligned with
# scripts/sentinel-check.sh and tests/scripts/sentinel-pr-merge-subject.test.mjs.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "ERRO: uso: $0 \"<subject>\"" >&2
  exit 2
fi

SUBJECT=$(printf '%s' "$1" | tr -d '\r')

if printf '%s' "$SUBJECT" | grep -qE '\(#[0-9]+\)[[:space:]]*$'; then
  exit 0
fi

if printf '%s' "$SUBJECT" | grep -qE '^Merge (pull request|PR) #[0-9]+([[:space:]:]|$)'; then
  exit 0
fi

if printf '%s' "$SUBJECT" | grep -qE '^merge\(pr-[0-9]+\):[[:space:]]+[^[:space:]]'; then
  exit 0
fi

exit 1
