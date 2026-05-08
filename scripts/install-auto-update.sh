#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/deploy/portfolio.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.yml}"
SERVICE_NAME="${SERVICE_NAME:-portfolio-auto-update}"
SERVICE_USER="${SERVICE_USER:-${SUDO_USER:-$(id -un)}}"
SERVICE_GROUP="${SERVICE_GROUP:-$(id -gn "${SERVICE_USER}" 2>/dev/null || printf '%s' "${SERVICE_USER}")}"
DOCKER_GROUP="${DOCKER_GROUP:-docker}"
AUTO_UPDATE_REMOTE="${AUTO_UPDATE_REMOTE:-origin}"
AUTO_UPDATE_BRANCH="${AUTO_UPDATE_BRANCH:-$(git -C "${REPO_DIR}" branch --show-current 2>/dev/null || printf 'main')}"
TIMER_BOOT_DELAY="${TIMER_BOOT_DELAY:-5min}"
TIMER_INTERVAL="${TIMER_INTERVAL:-30min}"
TIMER_RANDOMIZED_DELAY="${TIMER_RANDOMIZED_DELAY:-2min}"
DRY_RUN="${DRY_RUN:-0}"

if [[ "${DRY_RUN}" != "1" && "${EUID}" -ne 0 ]]; then
	echo "Run as root: sudo $0" >&2
	exit 1
fi

if [[ ! -x "${REPO_DIR}/scripts/auto-update-vps.sh" ]]; then
	echo "Missing executable updater: ${REPO_DIR}/scripts/auto-update-vps.sh" >&2
	exit 1
fi

supplementary_groups=""
if [[ -n "${DOCKER_GROUP}" ]]; then
	supplementary_groups="SupplementaryGroups=${DOCKER_GROUP}"
fi

service_tmp="$(mktemp)"
timer_tmp="$(mktemp)"
trap 'rm -f "${service_tmp}" "${timer_tmp}"' EXIT

cat >"${service_tmp}" <<EOF
[Unit]
Description=Portfolio Docker auto-update from GitHub
Wants=network-online.target docker.service
After=network-online.target docker.service

[Service]
Type=oneshot
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
${supplementary_groups}
WorkingDirectory=${REPO_DIR}
Environment="REPO_DIR=${REPO_DIR}"
Environment="ENV_FILE=${ENV_FILE}"
Environment="COMPOSE_FILE=${COMPOSE_FILE}"
Environment="AUTO_UPDATE_REMOTE=${AUTO_UPDATE_REMOTE}"
Environment="AUTO_UPDATE_BRANCH=${AUTO_UPDATE_BRANCH}"
ExecStart=${REPO_DIR}/scripts/auto-update-vps.sh
SyslogIdentifier=${SERVICE_NAME}
EOF

cat >"${timer_tmp}" <<EOF
[Unit]
Description=Check GitHub for portfolio updates every ${TIMER_INTERVAL}

[Timer]
OnBootSec=${TIMER_BOOT_DELAY}
OnUnitActiveSec=${TIMER_INTERVAL}
RandomizedDelaySec=${TIMER_RANDOMIZED_DELAY}
Persistent=true
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF

if [[ "${DRY_RUN}" == "1" ]]; then
	echo "# ${SERVICE_NAME}.service"
	cat "${service_tmp}"
	echo
	echo "# ${SERVICE_NAME}.timer"
	cat "${timer_tmp}"
	exit 0
fi

install -m 0644 "${service_tmp}" "/etc/systemd/system/${SERVICE_NAME}.service"
install -m 0644 "${timer_tmp}" "/etc/systemd/system/${SERVICE_NAME}.timer"

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}.timer"
systemctl list-timers "${SERVICE_NAME}.timer" --no-pager
