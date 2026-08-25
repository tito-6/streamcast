#!/usr/bin/env bash
cd "$(dirname "$0")"
set -a
# shellcheck disable=SC1091
. ./.env
set +a
exec ./main
