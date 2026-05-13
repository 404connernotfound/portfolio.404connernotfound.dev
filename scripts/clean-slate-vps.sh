#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
ENV_EXAMPLE="${ENV_EXAMPLE:-${REPO_DIR}/deploy/portfolio.env.example}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-portfolio}"
DOMAIN="${DOMAIN:-portfolio.404connernotfound.dev}"
SERVICE_NAME="${SERVICE_NAME:-portfolio-auto-update}"
DRY_RUN="${DRY_RUN:-0}"

REMOVE_ENV="${REMOVE_ENV:-1}"
REMOVE_LOCAL_ENV="${REMOVE_LOCAL_ENV:-0}"
REMOVE_IMAGES="${REMOVE_IMAGES:-1}"
REMOVE_SYSTEMD="${REMOVE_SYSTEMD:-1}"
REMOVE_NGINX="${REMOVE_NGINX:-1}"
REMOVE_TLS="${REMOVE_TLS:-0}"
REMOVE_CLOUDFLARE_REALIP="${REMOVE_CLOUDFLARE_REALIP:-0}"
REMOVE_WORKTREE_ARTIFACTS="${REMOVE_WORKTREE_ARTIFACTS:-0}"
TEMP_ENV_FILE=""

log() {
	printf '[portfolio-clean-slate] %s\n' "$*"
}

run() {
	if [[ "${DRY_RUN}" == "1" ]]; then
		printf '+'
		printf ' %q' "$@"
		printf '\n'
	else
		"$@"
	fi
}

run_optional() {
	if ! run "$@"; then
		log "ignored failure: $*"
	fi
}

make_fallback_env() {
	TEMP_ENV_FILE="$(mktemp)"
	cat >"${TEMP_ENV_FILE}" <<'EOF'
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
ORIGIN=https://portfolio.404connernotfound.dev
HOST_APP_PORT=3000
POSTGRES_DB=portfolio
POSTGRES_USER=portfolio
POSTGRES_PASSWORD=unused-cleanup-password
DATABASE_URL=postgres://portfolio:unused-cleanup-password@postgres:5432/portfolio
PG_SSL=false
REDIS_URL=redis://redis:6379
ADMIN_SESSION_SECRET=unused-cleanup-secret
ADMIN_EMAIL=cleanup@example.com
ADMIN_PASSWORD=unused-cleanup-password
EOF
	printf '%s\n' "${TEMP_ENV_FILE}"
}

cleanup_temp_files() {
	if [[ -n "${TEMP_ENV_FILE}" ]]; then
		rm -f "${TEMP_ENV_FILE}"
	fi
}

trap cleanup_temp_files EXIT

compose_env_file() {
	if [[ -f "${ENV_FILE}" ]]; then
		printf '%s\n' "${ENV_FILE}"
	elif [[ -f "${ENV_EXAMPLE}" ]]; then
		printf '%s\n' "${ENV_EXAMPLE}"
	else
		make_fallback_env
	fi
}

remove_docker_ids() {
	local object_type="$1"
	shift
	local ids=()

	if [[ "${DRY_RUN}" == "1" ]]; then
		log "would remove Docker ${object_type} matching: $*"
		return 0
	fi

	case "${object_type}" in
		containers)
			mapfile -t ids < <(docker ps -aq "$@" 2>/dev/null || true)
			for id in "${ids[@]}"; do
				[[ -n "${id}" ]] && run_optional docker rm -f "${id}"
			done
			;;
		volumes)
			mapfile -t ids < <(docker volume ls -q "$@" 2>/dev/null || true)
			for id in "${ids[@]}"; do
				[[ -n "${id}" ]] && run_optional docker volume rm -f "${id}"
			done
			;;
		networks)
			mapfile -t ids < <(docker network ls -q "$@" 2>/dev/null || true)
			for id in "${ids[@]}"; do
				[[ -n "${id}" ]] && run_optional docker network rm "${id}"
			done
			;;
	esac
}

cleanup_docker() {
	local env_for_compose
	env_for_compose="$(compose_env_file)"

	if ! command -v docker >/dev/null 2>&1; then
		log "docker is not installed; skipping Docker cleanup"
		return 0
	fi

	export PORTFOLIO_ENV_FILE="${env_for_compose}"

	if [[ "${DRY_RUN}" == "1" ]]; then
		run_optional docker compose \
			--project-name "${PROJECT_NAME}" \
			--env-file "${env_for_compose}" \
			-f "${COMPOSE_FILE}" \
			down --remove-orphans --volumes --rmi local
	elif docker compose version >/dev/null 2>&1; then
		run_optional docker compose \
			--project-name "${PROJECT_NAME}" \
			--env-file "${env_for_compose}" \
			-f "${COMPOSE_FILE}" \
			down --remove-orphans --volumes --rmi local
	else
		log "docker compose plugin is not available; falling back to label-based cleanup"
	fi

	remove_docker_ids containers --filter "label=com.docker.compose.project=${PROJECT_NAME}"
	remove_docker_ids volumes --filter "label=com.docker.compose.project=${PROJECT_NAME}"
	remove_docker_ids networks --filter "label=com.docker.compose.project=${PROJECT_NAME}"

	if [[ "${REMOVE_IMAGES}" == "1" ]]; then
		run_optional docker image rm -f portfolio-website:latest
		run_optional docker image rm -f localhost/portfolio-website:latest
	fi
}

cleanup_systemd() {
	if [[ "${REMOVE_SYSTEMD}" != "1" ]]; then
		return 0
	fi

	if [[ "${EUID}" -ne 0 && "${DRY_RUN}" != "1" ]]; then
		log "not root; skipping systemd cleanup"
		return 0
	fi

	if ! command -v systemctl >/dev/null 2>&1; then
		log "systemctl is not available; skipping systemd cleanup"
		return 0
	fi

	run_optional systemctl disable --now "${SERVICE_NAME}.timer"
	run_optional systemctl stop "${SERVICE_NAME}.service"
	run_optional systemctl disable --now portfolio.service

	run_optional rm -f "/etc/systemd/system/${SERVICE_NAME}.timer"
	run_optional rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
	run_optional rm -f /etc/systemd/system/portfolio.service

	run_optional systemctl daemon-reload
	run_optional systemctl reset-failed "${SERVICE_NAME}.timer" "${SERVICE_NAME}.service" portfolio.service
}

cleanup_nginx() {
	if [[ "${REMOVE_NGINX}" != "1" ]]; then
		return 0
	fi

	if [[ "${EUID}" -ne 0 && "${DRY_RUN}" != "1" ]]; then
		log "not root; skipping Nginx cleanup"
		return 0
	fi

	run_optional rm -f "/etc/nginx/sites-enabled/${DOMAIN}.conf"
	run_optional rm -f "/etc/nginx/sites-available/${DOMAIN}.conf"

	if [[ "${REMOVE_CLOUDFLARE_REALIP}" == "1" ]]; then
		run_optional rm -f /etc/nginx/cloudflare-realip.conf
	fi

	if [[ "${REMOVE_TLS}" == "1" ]]; then
		run_optional rm -rf "/etc/ssl/cloudflare/${DOMAIN}"
	fi

	if command -v nginx >/dev/null 2>&1; then
		if run nginx -t; then
			run_optional systemctl reload nginx
		else
			log "Nginx config did not validate after cleanup; not reloading"
		fi
	fi
}

cleanup_repo_files() {
	if [[ "${REMOVE_ENV}" == "1" ]]; then
		run_optional rm -f "${REPO_DIR}/deploy/portfolio.env"
	fi

	if [[ "${REMOVE_LOCAL_ENV}" == "1" ]]; then
		run_optional rm -f "${REPO_DIR}/.env"
	fi

	if [[ "${REMOVE_WORKTREE_ARTIFACTS}" == "1" ]]; then
		run_optional rm -rf "${REPO_DIR}/build"
		run_optional rm -rf "${REPO_DIR}/.svelte-kit"
		run_optional rm -rf "${REPO_DIR}/data"
		run_optional rm -f "${REPO_DIR}/error.log"
	fi
}

cleanup_docker
cleanup_systemd
cleanup_nginx
cleanup_repo_files

log "clean slate complete"
