#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-portfolio.404connernotfound.dev}"
APP_UPSTREAM="${APP_UPSTREAM:-127.0.0.1:3000}"
PLAYGROUND_UPSTREAM="${PLAYGROUND_UPSTREAM:-127.0.0.1:24680}"
UPLOADS_ROOT="${UPLOADS_ROOT:-/var/lib/docker/volumes/portfolio_portfolio_uploads/_data}"
WORK_ASSETS_ROOT="${WORK_ASSETS_ROOT:-/var/lib/docker/volumes/portfolio_portfolio_work_assets/_data}"
ASSET_UPLOADS_ROOT="${ASSET_UPLOADS_ROOT:-/var/lib/docker/volumes/portfolio_portfolio_asset_uploads/_data}"
TLS_CERT_PATH="${TLS_CERT_PATH:-/etc/ssl/cloudflare/${DOMAIN}/origin.pem}"
TLS_KEY_PATH="${TLS_KEY_PATH:-/etc/ssl/cloudflare/${DOMAIN}/origin.key}"
CLOUDFLARE_REALIP_CONF="${CLOUDFLARE_REALIP_CONF:-/etc/nginx/cloudflare-realip.conf}"
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TEMPLATE="${TEMPLATE:-${REPO_DIR}/nginx/portfolio.conf.template}"
SITE_AVAILABLE="${SITE_AVAILABLE:-/etc/nginx/sites-available/${DOMAIN}.conf}"
SITE_ENABLED="${SITE_ENABLED:-/etc/nginx/sites-enabled/${DOMAIN}.conf}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_CLOUDFLARE_IP_FETCH="${SKIP_CLOUDFLARE_IP_FETCH:-0}"

if [[ "${DRY_RUN}" != "1" && "${EUID}" -ne 0 ]]; then
	echo "Run as root: sudo $0" >&2
	exit 1
fi

if [[ ! -f "${TEMPLATE}" ]]; then
	echo "Nginx template not found: ${TEMPLATE}" >&2
	exit 1
fi

if [[ "${DRY_RUN}" != "1" ]] && ! command -v nginx >/dev/null 2>&1; then
	if command -v apt-get >/dev/null 2>&1; then
		apt-get update
		apt-get install -y nginx ca-certificates curl
	else
		echo "nginx is not installed and this script only auto-installs with apt-get." >&2
		exit 1
	fi
fi

if [[ "${DRY_RUN}" != "1" && "${SKIP_CLOUDFLARE_IP_FETCH}" != "1" ]]; then
	"${REPO_DIR}/scripts/refresh-cloudflare-real-ip.sh" "${CLOUDFLARE_REALIP_CONF}"
fi

if [[ "${DRY_RUN}" == "1" && ! -s "${CLOUDFLARE_REALIP_CONF}" ]]; then
	REALIP_DIRECTIVE=$'\t# Dry-run placeholder. Production setup includes Cloudflare IP ranges here.\n\treal_ip_header CF-Connecting-IP;\n\treal_ip_recursive on;'
else
	REALIP_DIRECTIVE="	include ${CLOUDFLARE_REALIP_CONF};"
fi

if [[ "${DRY_RUN}" != "1" && (! -s "${TLS_CERT_PATH}" || ! -s "${TLS_KEY_PATH}") ]]; then
	cat >&2 <<EOF
Missing Cloudflare origin certificate files:
  ${TLS_CERT_PATH}
  ${TLS_KEY_PATH}

Create a Cloudflare Origin CA certificate for ${DOMAIN}, then install it with:
  sudo DOMAIN=${DOMAIN} ${REPO_DIR}/scripts/install-cloudflare-origin-cert.sh /path/origin.pem /path/origin.key
EOF
	exit 1
fi

if [[ "${DRY_RUN}" != "1" ]]; then
	install -d -m 0755 /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot
fi

tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

sed \
	-e "s#__DOMAIN__#${DOMAIN}#g" \
	-e "s#__APP_UPSTREAM__#${APP_UPSTREAM}#g" \
	-e "s#__PLAYGROUND_UPSTREAM__#${PLAYGROUND_UPSTREAM}#g" \
	-e "s#__UPLOADS_ROOT__#${UPLOADS_ROOT}#g" \
	-e "s#__WORK_ASSETS_ROOT__#${WORK_ASSETS_ROOT}#g" \
	-e "s#__ASSET_UPLOADS_ROOT__#${ASSET_UPLOADS_ROOT}#g" \
	-e "s#__TLS_CERT_PATH__#${TLS_CERT_PATH}#g" \
	-e "s#__TLS_KEY_PATH__#${TLS_KEY_PATH}#g" \
	"${TEMPLATE}" \
	| awk -v replacement="${REALIP_DIRECTIVE}" '
		/__CLOUDFLARE_REALIP_DIRECTIVE__/ {
			count = split(replacement, lines, "\n");
			for (i = 1; i <= count; i += 1) print lines[i];
			next;
		}
		{ print }
	' > "${tmp}"

if [[ "${DRY_RUN}" == "1" ]]; then
	cat "${tmp}"
	exit 0
fi

install -m 0644 "${tmp}" "${SITE_AVAILABLE}"
ln -sfn "${SITE_AVAILABLE}" "${SITE_ENABLED}"

nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

cat <<EOF
Nginx is configured for ${DOMAIN}.

Cloudflare settings expected:
  DNS: proxied A/AAAA record for ${DOMAIN} -> this VPS public IP
  SSL/TLS mode: Full (strict)
  Origin certificate: installed at ${TLS_CERT_PATH}
EOF
