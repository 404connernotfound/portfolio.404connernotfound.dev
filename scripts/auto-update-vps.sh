#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
PROJECT_DIR="${PROJECT_DIR:-${REPO_DIR}}"
AUTO_UPDATE_REMOTE="${AUTO_UPDATE_REMOTE:-origin}"
AUTO_UPDATE_BRANCH="${AUTO_UPDATE_BRANCH:-$(git -C "${REPO_DIR}" branch --show-current 2>/dev/null || true)}"
AUTO_UPDATE_LOCK_FILE="${AUTO_UPDATE_LOCK_FILE:-/tmp/portfolio-auto-update.lock}"
AUTO_UPDATE_FORCE_REDEPLOY="${AUTO_UPDATE_FORCE_REDEPLOY:-0}"
DRY_RUN="${DRY_RUN:-0}"

log() {
	printf '[portfolio-auto-update] %s\n' "$*"
}

die() {
	printf '[portfolio-auto-update] error: %s\n' "$*" >&2
	exit 1
}

require_tool() {
	if ! command -v "$1" >/dev/null 2>&1; then
		die "$1 is required"
	fi
}

require_tool flock
require_tool git
require_tool docker

if [[ -z "${AUTO_UPDATE_BRANCH}" ]]; then
	die "AUTO_UPDATE_BRANCH is empty and the current checkout is not on a branch"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
	die "missing env file: ${ENV_FILE}"
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
	die "missing compose file: ${COMPOSE_FILE}"
fi

if ! docker compose version >/dev/null 2>&1; then
	die "docker compose plugin is required"
fi

exec 9>"${AUTO_UPDATE_LOCK_FILE}"
if ! flock -n 9; then
	log "another update is already running"
	exit 0
fi

if ! git -C "${REPO_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	die "${REPO_DIR} is not a git checkout"
fi

current_branch="$(git -C "${REPO_DIR}" branch --show-current)"
if [[ "${current_branch}" != "${AUTO_UPDATE_BRANCH}" ]]; then
	die "checkout is on ${current_branch:-detached HEAD}, expected ${AUTO_UPDATE_BRANCH}"
fi

if ! git -C "${REPO_DIR}" diff-index --quiet HEAD --; then
	die "tracked local changes are present; refusing to auto-update"
fi

remote_ref="refs/remotes/${AUTO_UPDATE_REMOTE}/${AUTO_UPDATE_BRANCH}"
log "checking ${AUTO_UPDATE_REMOTE}/${AUTO_UPDATE_BRANCH}"
git -C "${REPO_DIR}" fetch --prune --tags "${AUTO_UPDATE_REMOTE}" \
	"+refs/heads/${AUTO_UPDATE_BRANCH}:${remote_ref}"

local_rev="$(git -C "${REPO_DIR}" rev-parse HEAD)"
remote_rev="$(git -C "${REPO_DIR}" rev-parse "${remote_ref}")"

if [[ "${local_rev}" == "${remote_rev}" && "${AUTO_UPDATE_FORCE_REDEPLOY}" != "1" ]]; then
	log "already up to date at ${local_rev}"
	exit 0
fi

merge_base="$(git -C "${REPO_DIR}" merge-base HEAD "${remote_ref}")"
if [[ "${merge_base}" != "${local_rev}" ]]; then
	die "local checkout is not a fast-forward of ${AUTO_UPDATE_REMOTE}/${AUTO_UPDATE_BRANCH}"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
	log "would update ${local_rev} -> ${remote_rev} and restart the Docker Compose stack"
	exit 0
fi

cd "${PROJECT_DIR}"

if [[ "${local_rev}" != "${remote_rev}" ]]; then
	git -C "${REPO_DIR}" merge --ff-only "${remote_ref}"
fi

export PORTFOLIO_ENV_FILE="${ENV_FILE}"
log "stopping Docker Compose stack"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" down --remove-orphans

log "building and starting updated stack"
"${REPO_DIR}/scripts/deploy-vps.sh"

log "deployed ${remote_rev}"
