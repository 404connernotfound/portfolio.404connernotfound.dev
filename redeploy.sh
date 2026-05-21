#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-}"
SKIP_GITHUB_CHECK="${SKIP_GITHUB_CHECK:-0}"
REDEPLOY_LOCK_FILE="${REDEPLOY_LOCK_FILE:-/tmp/portfolio-redeploy.lock}"
DRY_RUN="${DRY_RUN:-0}"

log() {
	printf '[portfolio-redeploy] %s\n' "$*"
}

die() {
	printf '[portfolio-redeploy] error: %s\n' "$*" >&2
	exit 1
}

require_tool() {
	if ! command -v "$1" >/dev/null 2>&1; then
		die "$1 is required"
	fi
}

if command -v flock >/dev/null 2>&1; then
	exec 9>"${REDEPLOY_LOCK_FILE}"
	if ! flock -n 9; then
		log "another redeploy is already running"
		exit 0
	fi
fi

cd "${REPO_DIR}"

if [[ "${SKIP_GITHUB_CHECK}" != "1" ]]; then
	require_tool git

	if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
		die "${REPO_DIR} is not a git checkout"
	fi

	current_branch="$(git branch --show-current 2>/dev/null || true)"
	if [[ -z "${GIT_BRANCH}" ]]; then
		GIT_BRANCH="${current_branch}"
	fi

	if [[ -z "${GIT_BRANCH}" ]]; then
		remote_head="$(git symbolic-ref --short "refs/remotes/${GIT_REMOTE}/HEAD" 2>/dev/null || true)"
		GIT_BRANCH="${remote_head#${GIT_REMOTE}/}"
	fi

	if [[ -z "${GIT_BRANCH}" ]]; then
		GIT_BRANCH="main"
	fi

	if [[ -n "${current_branch}" && "${current_branch}" != "${GIT_BRANCH}" ]]; then
		die "checkout is on ${current_branch}, but GIT_BRANCH is ${GIT_BRANCH}"
	fi

	remote_ref="refs/remotes/${GIT_REMOTE}/${GIT_BRANCH}"
	log "checking ${GIT_REMOTE}/${GIT_BRANCH}"
	git fetch --prune "${GIT_REMOTE}" "+refs/heads/${GIT_BRANCH}:${remote_ref}"

	local_rev="$(git rev-parse HEAD)"
	remote_rev="$(git rev-parse "${remote_ref}")"
	merge_base="$(git merge-base HEAD "${remote_ref}")"

	if [[ "${local_rev}" == "${remote_rev}" ]]; then
		log "github is already matched at ${local_rev}"
	elif [[ "${merge_base}" == "${local_rev}" ]]; then
		if [[ -n "$(git status --porcelain)" ]]; then
			die "local changes are present; refusing to pull newer GitHub data"
		fi

		if [[ "${DRY_RUN}" == "1" ]]; then
			log "would fast-forward ${local_rev} -> ${remote_rev}"
		else
			log "pulling newer GitHub data ${local_rev} -> ${remote_rev}"
			git merge --ff-only "${remote_ref}"
		fi
	elif [[ "${merge_base}" == "${remote_rev}" ]]; then
		log "local checkout is ahead of GitHub at ${local_rev}; no pull needed"
	else
		die "local checkout and ${GIT_REMOTE}/${GIT_BRANCH} have diverged"
	fi
else
	log "skipping GitHub check"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
	log "would run ./down.sh then ./up.sh"
	exit 0
fi

"${REPO_DIR}/down.sh"
"${REPO_DIR}/up.sh"
