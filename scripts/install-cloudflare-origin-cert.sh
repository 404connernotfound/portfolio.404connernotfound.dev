#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-portfolio.404connernotfound.dev}"
CERT_SOURCE="${1:-${CF_ORIGIN_CERT:-}}"
KEY_SOURCE="${2:-${CF_ORIGIN_KEY:-}}"
CERT_DIR="${CERT_DIR:-/etc/ssl/cloudflare/${DOMAIN}}"

if [[ "${EUID}" -ne 0 ]]; then
	echo "Run as root: sudo DOMAIN=${DOMAIN} $0 /path/origin.pem /path/origin.key" >&2
	exit 1
fi

if [[ -z "${CERT_SOURCE}" || -z "${KEY_SOURCE}" ]]; then
	echo "Usage: sudo DOMAIN=${DOMAIN} $0 /path/origin.pem /path/origin.key" >&2
	exit 1
fi

if [[ ! -s "${CERT_SOURCE}" ]]; then
	echo "Certificate file is missing or empty: ${CERT_SOURCE}" >&2
	exit 1
fi

if [[ ! -s "${KEY_SOURCE}" ]]; then
	echo "Private key file is missing or empty: ${KEY_SOURCE}" >&2
	exit 1
fi

install -d -m 0750 "${CERT_DIR}"
install -m 0644 "${CERT_SOURCE}" "${CERT_DIR}/origin.pem"
install -m 0600 "${KEY_SOURCE}" "${CERT_DIR}/origin.key"

echo "Installed Cloudflare origin certificate under ${CERT_DIR}"
