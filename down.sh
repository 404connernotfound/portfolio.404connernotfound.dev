#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
ENV_EXAMPLE="${ENV_EXAMPLE:-${REPO_DIR}/deploy/portfolio.env.example}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-portfolio}"
COMPOSE_TIMEOUT="${COMPOSE_TIMEOUT:-30}"
REMOVE_VOLUMES="${REMOVE_VOLUMES:-0}"
DRY_RUN="${DRY_RUN:-0}"

log() {
	printf '[portfolio-down] %s\n' "$*"
}

die() {
	printf '[portfolio-down] error: %s\n' "$*" >&2
	exit 1
}

if command -v docker-compose >/dev/null 2>&1; then
	COMPOSE_CMD=(docker-compose)
elif command -v docker >/dev/null 2>&1; then
	COMPOSE_CMD=(docker compose)
else
	die "docker compose or docker-compose is required"
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
	die "missing compose file: ${COMPOSE_FILE}"
fi

if [[ -f "${ENV_FILE}" ]]; then
	COMPOSE_ENV_FILE="${ENV_FILE}"
elif [[ -f "${ENV_EXAMPLE}" ]]; then
	COMPOSE_ENV_FILE="${ENV_EXAMPLE}"
	log "missing ${ENV_FILE}; using ${ENV_EXAMPLE} for compose variables"
else
	die "missing env file: ${ENV_FILE}"
fi

compose=(
	"${COMPOSE_CMD[@]}"
	--project-name "${COMPOSE_PROJECT_NAME}"
	--env-file "${COMPOSE_ENV_FILE}"
	-f "${COMPOSE_FILE}"
)

cd "${REPO_DIR}"
export PORTFOLIO_ENV_FILE="${COMPOSE_ENV_FILE}"

if [[ "${DRY_RUN}" == "1" ]]; then
	"${compose[@]}" config
	exit 0
fi

down_args=(down --remove-orphans --timeout "${COMPOSE_TIMEOUT}")
if [[ "${REMOVE_VOLUMES}" == "1" ]]; then
	down_args+=(--volumes)
fi

log "stopping Docker Compose stack"
"${compose[@]}" "${down_args[@]}"
log "stack stopped"
