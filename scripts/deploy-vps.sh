#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
PROJECT_DIR="${PROJECT_DIR:-${REPO_DIR}}"
DRY_RUN="${DRY_RUN:-0}"

if [[ ! -f "${ENV_FILE}" ]]; then
	cp "${REPO_DIR}/deploy/portfolio.env.example" "${ENV_FILE}"
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
  ENV_FILE=${ENV_FILE} ${0}
EOF
	exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
	echo "docker is required on the VPS." >&2
	exit 1
fi

cd "${PROJECT_DIR}"
export PORTFOLIO_ENV_FILE="${ENV_FILE}"
if [[ "${DRY_RUN}" == "1" ]]; then
	docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config
	exit 0
fi
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --build --wait
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

if command -v curl >/dev/null 2>&1; then
	host_app_port="$(awk -F= '/^HOST_APP_PORT=/{print $2}' "${ENV_FILE}" | tail -n 1)"
	host_app_port="${host_app_port:-3000}"
	curl -fsS "http://127.0.0.1:${host_app_port}/healthz" >/dev/null
	echo "Local app health check passed at http://127.0.0.1:${host_app_port}/healthz"
fi

cat <<EOF
Docker deployment is running.

To configure host Nginx for Cloudflare:
  sudo ${REPO_DIR}/scripts/setup-cloudflare-nginx.sh
EOF
