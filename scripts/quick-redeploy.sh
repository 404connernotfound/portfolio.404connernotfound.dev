#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
HOT_UPDATE_REMOTE="${HOT_UPDATE_REMOTE:-origin}"
HOT_UPDATE_BRANCH="${HOT_UPDATE_BRANCH:-}"
HOT_UPDATE_LOCK_FILE="${HOT_UPDATE_LOCK_FILE:-/tmp/portfolio-zero-downtime-update.lock}"
HOT_UPDATE_RELEASE_ROOT="${HOT_UPDATE_RELEASE_ROOT:-/tmp/portfolio-releases}"
HOT_UPDATE_PORT_START="${HOT_UPDATE_PORT_START:-3001}"
HOT_UPDATE_PORT_END="${HOT_UPDATE_PORT_END:-3099}"
HOT_UPDATE_IMAGE_REPO="${HOT_UPDATE_IMAGE_REPO:-portfolio-website}"
HOT_UPDATE_CONTAINER_PREFIX="${HOT_UPDATE_CONTAINER_PREFIX:-portfolio-hot}"
HOT_UPDATE_NETWORK="${HOT_UPDATE_NETWORK:-portfolio_default}"
HOT_UPDATE_SQLITE_VOLUME="${HOT_UPDATE_SQLITE_VOLUME:-portfolio_portfolio_sqlite_data}"
HOT_UPDATE_UPLOADS_VOLUME="${HOT_UPDATE_UPLOADS_VOLUME:-portfolio_portfolio_uploads}"
HOT_UPDATE_WORK_ASSETS_VOLUME="${HOT_UPDATE_WORK_ASSETS_VOLUME:-portfolio_portfolio_work_assets}"
HOT_UPDATE_HEALTH_TIMEOUT="${HOT_UPDATE_HEALTH_TIMEOUT:-90}"
HOT_UPDATE_APPLY_NGINX="${HOT_UPDATE_APPLY_NGINX:-1}"
HOT_UPDATE_PRUNE_OLD="${HOT_UPDATE_PRUNE_OLD:-0}"
HOT_UPDATE_SKIP_GITHUB="${HOT_UPDATE_SKIP_GITHUB:-0}"
DRY_RUN="${DRY_RUN:-0}"

log() {
	printf '[portfolio-zero-downtime-update] %s\n' "$*"
}

die() {
	printf '[portfolio-zero-downtime-update] error: %s\n' "$*" >&2
	exit 1
}

require_tool() {
	if ! command -v "$1" >/dev/null 2>&1; then
		die "$1 is required"
	fi
}

require_tool flock
require_tool git

if [[ "${DRY_RUN}" != "1" ]]; then
	require_tool curl
	require_tool docker

	if ! docker compose version >/dev/null 2>&1; then
		die "docker compose plugin is required"
	fi
fi

if [[ ! -f "${ENV_FILE}" ]]; then
	die "missing env file: ${ENV_FILE}"
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
	die "missing compose file: ${COMPOSE_FILE}"
fi

if [[ "${HOT_UPDATE_APPLY_NGINX}" == "1" && "${DRY_RUN}" != "1" && "${EUID}" -ne 0 ]]; then
	die "run as root to rewrite and reload Nginx, or set HOT_UPDATE_APPLY_NGINX=0"
fi

exec 9>"${HOT_UPDATE_LOCK_FILE}"
if ! flock -n 9; then
	log "another zero-downtime update is already running"
	exit 0
fi

if ! git -C "${REPO_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	die "${REPO_DIR} is not a git checkout"
fi

if [[ "${HOT_UPDATE_SKIP_GITHUB}" == "1" ]]; then
	local_rev="$(git -C "${REPO_DIR}" rev-parse HEAD)"
	short_rev="${local_rev:0:12}"
	deploy_id="${short_rev}-local-$(date -u +%Y%m%d%H%M%S)"
	image_tag="${HOT_UPDATE_IMAGE_REPO}:${deploy_id}"
	container_name="${HOT_UPDATE_CONTAINER_PREFIX}-${deploy_id}"
	release_dir="${REPO_DIR}"
	log "skipping GitHub fetch; using local checkout at ${local_rev}"
else
	if [[ -z "${HOT_UPDATE_BRANCH}" ]]; then
		HOT_UPDATE_BRANCH="$(git -C "${REPO_DIR}" branch --show-current 2>/dev/null || true)"
	fi

	if [[ -z "${HOT_UPDATE_BRANCH}" ]]; then
		HOT_UPDATE_BRANCH="$(git -C "${REPO_DIR}" symbolic-ref --short "refs/remotes/${HOT_UPDATE_REMOTE}/HEAD" 2>/dev/null | sed "s#^${HOT_UPDATE_REMOTE}/##" || true)"
	fi

	if [[ -z "${HOT_UPDATE_BRANCH}" ]]; then
		HOT_UPDATE_BRANCH="main"
	fi

	remote_ref="refs/remotes/${HOT_UPDATE_REMOTE}/${HOT_UPDATE_BRANCH}"
	log "checking ${HOT_UPDATE_REMOTE}/${HOT_UPDATE_BRANCH}"
	git -C "${REPO_DIR}" fetch --prune --tags "${HOT_UPDATE_REMOTE}" \
		"+refs/heads/${HOT_UPDATE_BRANCH}:${remote_ref}"

	remote_rev="$(git -C "${REPO_DIR}" rev-parse "${remote_ref}")"
	short_rev="${remote_rev:0:12}"
	image_tag="${HOT_UPDATE_IMAGE_REPO}:${short_rev}"
	container_name="${HOT_UPDATE_CONTAINER_PREFIX}-${short_rev}"
	release_dir="${HOT_UPDATE_RELEASE_ROOT}/${short_rev}"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
	if [[ "${HOT_UPDATE_SKIP_GITHUB}" == "1" ]]; then
		log "would build ${image_tag} from local checkout at ${REPO_DIR}"
	else
		log "would build ${image_tag} from ${HOT_UPDATE_REMOTE}/${HOT_UPDATE_BRANCH}@${remote_rev}"
	fi
	log "would run it as ${container_name} on a free localhost port in ${HOT_UPDATE_PORT_START}-${HOT_UPDATE_PORT_END}"
	log "would health-check it, then reload Nginx to the new upstream"
	exit 0
fi

if docker ps --format '{{.Names}}' | grep -Fxq "${container_name}"; then
	log "${container_name} is already running"
	if [[ "${HOT_UPDATE_APPLY_NGINX}" == "1" && "${DRY_RUN}" != "1" ]]; then
		published_port="$(docker port "${container_name}" 3000/tcp | sed -n 's/^127\.0\.0\.1:\([0-9][0-9]*\)$/\1/p' | head -n 1)"
		[[ -n "${published_port}" ]] || die "could not determine published port for ${container_name}"
		APP_UPSTREAM="127.0.0.1:${published_port}" \
			SKIP_CLOUDFLARE_IP_FETCH="${SKIP_CLOUDFLARE_IP_FETCH:-1}" \
			REPO_DIR="${REPO_DIR}" \
			"${REPO_DIR}/scripts/setup-cloudflare-nginx.sh"
	fi
	exit 0
fi

if ! docker network inspect "${HOT_UPDATE_NETWORK}" >/dev/null 2>&1; then
	die "missing Docker network ${HOT_UPDATE_NETWORK}; start the base stack with scripts/deploy-vps.sh first"
fi

find_free_port() {
	local port
	for port in $(seq "${HOT_UPDATE_PORT_START}" "${HOT_UPDATE_PORT_END}"); do
		if ! docker ps --format '{{.Ports}}' | grep -Eq "127\\.0\\.0\\.1:${port}->|0\\.0\\.0\\.0:${port}->|:::${port}->"; then
			printf '%s\n' "${port}"
			return 0
		fi
	done
	return 1
}

app_port="$(find_free_port)" || die "no free localhost port in ${HOT_UPDATE_PORT_START}-${HOT_UPDATE_PORT_END}"

if [[ "${HOT_UPDATE_SKIP_GITHUB}" != "1" ]]; then
	mkdir -p "${HOT_UPDATE_RELEASE_ROOT}"
	if [[ -d "${release_dir}" ]]; then
		git -C "${REPO_DIR}" worktree remove --force "${release_dir}" >/dev/null 2>&1 || rm -rf "${release_dir}"
	fi
	git -C "${REPO_DIR}" worktree add --force --detach "${release_dir}" "${remote_rev}"
fi

cleanup_failed_container() {
	docker rm -f "${container_name}" >/dev/null 2>&1 || true
}
trap cleanup_failed_container ERR

log "building ${image_tag}"
docker build -t "${image_tag}" "${release_dir}"

log "seeding static volumes"
docker run --rm \
	--user "0:0" \
	--network "${HOT_UPDATE_NETWORK}" \
	-v "${HOT_UPDATE_UPLOADS_VOLUME}:/app/static/uploads" \
	-v "${HOT_UPDATE_WORK_ASSETS_VOLUME}:/app/static/assets/work" \
	"${image_tag}" \
	sh scripts/seed-static-volumes.sh

log "running database seed/migration step"
docker run --rm \
	--env-file "${ENV_FILE}" \
	--network "${HOT_UPDATE_NETWORK}" \
	-v "${HOT_UPDATE_SQLITE_VOLUME}:/data" \
	-v "${HOT_UPDATE_UPLOADS_VOLUME}:/app/static/uploads" \
	-v "${HOT_UPDATE_WORK_ASSETS_VOLUME}:/app/static/assets/work" \
	"${image_tag}" \
	npm run db:seed

log "starting ${container_name} on 127.0.0.1:${app_port}"
docker run -d \
	--name "${container_name}" \
	--restart unless-stopped \
	--env-file "${ENV_FILE}" \
	--network "${HOT_UPDATE_NETWORK}" \
	-p "127.0.0.1:${app_port}:3000" \
	-v "${HOT_UPDATE_SQLITE_VOLUME}:/data" \
	-v "${HOT_UPDATE_UPLOADS_VOLUME}:/app/static/uploads" \
	-v "${HOT_UPDATE_WORK_ASSETS_VOLUME}:/app/static/assets/work" \
	"${image_tag}" >/dev/null

deadline=$((SECONDS + HOT_UPDATE_HEALTH_TIMEOUT))
until curl -fsS "http://127.0.0.1:${app_port}/healthz" >/dev/null; do
	if (( SECONDS >= deadline )); then
		die "health check timed out for ${container_name} on port ${app_port}"
	fi
	sleep 2
done
log "health check passed on 127.0.0.1:${app_port}"

if [[ "${HOT_UPDATE_APPLY_NGINX}" == "1" ]]; then
	log "switching Nginx upstream to 127.0.0.1:${app_port}"
	APP_UPSTREAM="127.0.0.1:${app_port}" \
		SKIP_CLOUDFLARE_IP_FETCH="${SKIP_CLOUDFLARE_IP_FETCH:-1}" \
		REPO_DIR="${release_dir}" \
		"${release_dir}/scripts/setup-cloudflare-nginx.sh"
else
	log "HOT_UPDATE_APPLY_NGINX=0; leaving Nginx unchanged"
fi

trap - ERR

if [[ "${HOT_UPDATE_PRUNE_OLD}" == "1" ]]; then
	log "pruning older hot-update containers"
	while read -r old_container; do
		[[ -n "${old_container}" && "${old_container}" != "${container_name}" ]] || continue
		docker rm -f "${old_container}" >/dev/null 2>&1 || true
	done < <(docker ps -a --format '{{.Names}}' | grep -E "^${HOT_UPDATE_CONTAINER_PREFIX}-" || true)
fi

if [[ "${HOT_UPDATE_SKIP_GITHUB}" == "1" ]]; then
	log "deployed local checkout ${local_rev} as ${container_name}"
else
	log "deployed ${remote_rev} as ${container_name}"
fi
