#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
ENV_EXAMPLE="${ENV_EXAMPLE:-${REPO_DIR}/deploy/portfolio.env.example}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-portfolio}"
DRY_RUN="${DRY_RUN:-0}"

log() {
	printf '[portfolio-up] %s\n' "$*"
}

die() {
	printf '[portfolio-up] error: %s\n' "$*" >&2
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

if [[ ! -f "${ENV_FILE}" ]]; then
	if [[ ! -f "${ENV_EXAMPLE}" ]]; then
		die "missing env file: ${ENV_FILE}"
	fi

	if [[ "${DRY_RUN}" == "1" ]]; then
		COMPOSE_ENV_FILE="${ENV_EXAMPLE}"
		log "missing ${ENV_FILE}; using ${ENV_EXAMPLE} for compose variables"
	else
		cp "${ENV_EXAMPLE}" "${ENV_FILE}"
		cat >&2 <<EOF
Created ${ENV_FILE}.

Edit it first, especially:
  POSTGRES_PASSWORD
  DATABASE_URL
  ADMIN_SESSION_SECRET
  ADMIN_EMAIL
  ADMIN_PASSWORD
  ORIGIN

Then rerun:
  ${0}
EOF
		exit 1
	fi
else
	COMPOSE_ENV_FILE="${ENV_FILE}"
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

log "removing old one-shot seed containers"
"${compose[@]}" rm -sf static-seed migrate >/dev/null 2>&1 || true

log "building and starting Docker Compose stack"
"${compose[@]}" up -d --build --wait
"${compose[@]}" ps

if command -v curl >/dev/null 2>&1; then
	host_app_port="$(awk -F= '/^HOST_APP_PORT=/{print $2}' "${COMPOSE_ENV_FILE}" | tail -n 1)"
	host_app_port="${host_app_port:-3000}"

	curl -fsS "http://127.0.0.1:${host_app_port}/healthz" >/dev/null
	log "health check passed at http://127.0.0.1:${host_app_port}/healthz"

	curl -fsSI "http://127.0.0.1:${host_app_port}/uploads/resume/resume.pdf" >/dev/null
	log "resume PDF check passed"
else
	log "curl is not installed; skipped local HTTP checks"
fi
