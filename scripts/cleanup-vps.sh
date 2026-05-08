#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
REMOVE_VOLUMES="${REMOVE_VOLUMES:-0}"

if ! command -v docker >/dev/null 2>&1; then
	echo "docker is required for compose cleanup." >&2
	exit 1
fi

export PORTFOLIO_ENV_FILE="${ENV_FILE}"
if [[ "${REMOVE_VOLUMES}" == "1" ]]; then
	docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" down --remove-orphans --volumes
else
	docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" down --remove-orphans
fi

echo "Portfolio Docker stack stopped."
