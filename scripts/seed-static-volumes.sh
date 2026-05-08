#!/bin/sh
set -eu

STATIC_DEFAULTS_DIR="${STATIC_DEFAULTS_DIR:-/app/static-defaults}"
STATIC_DIR="${STATIC_DIR:-/app/static}"

seed_tree() {
	source_dir="$1"
	target_dir="$2"

	if [ ! -d "${source_dir}" ]; then
		return 0
	fi

	mkdir -p "${target_dir}"
	cp -a -n "${source_dir}/." "${target_dir}/"
}

seed_tree "${STATIC_DEFAULTS_DIR}/uploads" "${STATIC_DIR}/uploads"
seed_tree "${STATIC_DEFAULTS_DIR}/assets/uploads" "${STATIC_DIR}/assets/uploads"
seed_tree "${STATIC_DEFAULTS_DIR}/assets/work" "${STATIC_DIR}/assets/work"

chown -R node:node \
	"${STATIC_DIR}/uploads" \
	"${STATIC_DIR}/assets/uploads" \
	"${STATIC_DIR}/assets/work"
