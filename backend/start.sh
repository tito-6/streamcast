#!/usr/bin/env bash
set -a
if [ -f .env ]; then
  . ./.env
fi
set +a
exec ./main
