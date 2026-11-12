#!/usr/bin/env bash
# Linux/macOS counterpart of stop-local-postgres.ps1. Accepts the same --bin-dir /
# PG_BIN and PG_RUN_AS settings as start-local-postgres.sh.
set -euo pipefail

bin_dir="${PG_BIN:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --bin-dir) bin_dir="${2:?--bin-dir needs a value}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
if [ -z "$bin_dir" ]; then
  if [ -x /opt/pg17/bin/pg_ctl ]; then
    bin_dir=/opt/pg17/bin
  elif command -v pg_ctl >/dev/null 2>&1; then
    bin_dir="$(dirname "$(command -v pg_ctl)")"
  fi
fi
if [ -z "$bin_dir" ] || [ ! -x "$bin_dir/pg_ctl" ]; then
  echo 'Set --bin-dir or PG_BIN to an existing PostgreSQL bin folder' >&2
  exit 1
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cluster_path="$project_root/work/database/cluster"
if [ "$(id -u)" -eq 0 ]; then
  su "${PG_RUN_AS:-postgres}" -s /bin/sh -c "$(printf '%q ' "$bin_dir/pg_ctl" -D "$cluster_path" -m fast -w stop)"
else
  "$bin_dir/pg_ctl" -D "$cluster_path" -m fast -w stop
fi
