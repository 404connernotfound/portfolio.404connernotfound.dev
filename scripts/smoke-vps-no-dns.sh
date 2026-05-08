#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
DOMAIN="${DOMAIN:-portfolio.404connernotfound.dev}"
CLEANUP_ON_EXIT="${CLEANUP_ON_EXIT:-1}"
REQUIRE_NGINX="${REQUIRE_NGINX:-0}"

if [[ ! -f "${ENV_FILE}" ]]; then
	echo "Missing ${ENV_FILE}. Run ./scripts/deploy-vps.sh once to create it, then edit secrets." >&2
	exit 1
fi

cleanup() {
	if [[ "${CLEANUP_ON_EXIT}" == "1" ]]; then
		"${REPO_DIR}/scripts/cleanup-vps.sh"
	fi
}
trap cleanup EXIT

"${REPO_DIR}/scripts/deploy-vps.sh"

host_app_port="$(awk -F= '/^HOST_APP_PORT=/{print $2}' "${ENV_FILE}" | tail -n 1)"
host_app_port="${host_app_port:-3000}"

curl -fsS "http://127.0.0.1:${host_app_port}/healthz" >/dev/null
echo "App health passed on 127.0.0.1:${host_app_port}."

if curl -fsSI -H "Host: ${DOMAIN}" http://127.0.0.1/ >/dev/null 2>&1; then
	echo "Host-header HTTP smoke passed through local Nginx."
elif [[ "${REQUIRE_NGINX}" == "1" ]]; then
	echo "Nginx HTTP smoke failed." >&2
	exit 1
else
	echo "Nginx HTTP smoke skipped or failed; set REQUIRE_NGINX=1 to make this fatal."
fi

if curl -kfsSI --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/" >/dev/null 2>&1; then
	echo "Loopback HTTPS smoke passed with --resolve."
elif [[ "${REQUIRE_NGINX}" == "1" ]]; then
	echo "Nginx HTTPS smoke failed." >&2
	exit 1
else
	echo "Nginx HTTPS smoke skipped or failed; install the origin cert and Nginx config first."
fi
