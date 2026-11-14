#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f github.local.env ]]; then
  set -a
  # shellcheck source=/dev/null
  source github.local.env
  set +a
fi

export GITHUB_ENABLED=true
export GITHUB_OWNER="${GITHUB_OWNER:-venkat-devish}"
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-cloudify}"
export GITHUB_DEFAULT_BRANCH="${GITHUB_DEFAULT_BRANCH:-main}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Missing GITHUB_TOKEN. Create apps/api/github.local.env with:"
  echo '  GITHUB_TOKEN=github_pat_...   # Contents + Pull requests (write) on venkat-devish/cloudify'
  exit 1
fi

exec mvn spring-boot:run
