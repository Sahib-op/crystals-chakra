#!/usr/bin/env bash
# Linux/macOS counterpart of start-local-postgres.ps1: an isolated, loopback-only
# PostgreSQL cluster in ignored work/database, with credentials in work/database/.env.
#
# Usage: scripts/start-local-postgres.sh [--bin-dir DIR] [--port PORT]
# PG_BIN and PG_PORT may be used instead of the flags. Without a bin directory the
# script uses /opt/pg17/bin when present, otherwise the pg_ctl found on PATH.
# PostgreSQL refuses to run as root; when started as root the server runs as the
# "postgres" system user (override with PG_RUN_AS).
set -euo pipefail

bin_dir="${PG_BIN:-}"
port="${PG_PORT:-55432}"
while [ $# -gt 0 ]; do
  case "$1" in
    --bin-dir) bin_dir="${2:?--bin-dir needs a value}"; shift 2 ;;
    --port) port="${2:?--port needs a value}"; shift 2 ;;
    -h | --help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
  echo 'Port must be between 1024 and 65535' >&2
  exit 2
fi

if [ -z "$bin_dir" ]; then
  if [ -x /opt/pg17/bin/pg_ctl ]; then
    bin_dir=/opt/pg17/bin
  elif command -v pg_ctl >/dev/null 2>&1; then
    bin_dir="$(dirname "$(command -v pg_ctl)")"
  fi
fi
if [ -z "$bin_dir" ] || [ ! -x "$bin_dir/pg_ctl" ] || [ ! -x "$bin_dir/initdb" ]; then
  echo 'Set --bin-dir or PG_BIN to an existing PostgreSQL 17 bin folder' >&2
  exit 1
fi
server_version="$("$bin_dir/postgres" --version)"
case "$server_version" in
  *' 17.'*) ;;
  *) echo "Warning: expected PostgreSQL 17, found: $server_version" >&2 ;;
esac

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
database_root="$project_root/work/database"
cluster_path="$database_root/cluster"
environment_path="$database_root/.env"
mkdir -p "$database_root"

run_as=''
if [ "$(id -u)" -eq 0 ]; then
  run_as="${PG_RUN_AS:-postgres}"
  if ! id "$run_as" >/dev/null 2>&1; then
    echo "Running as root needs an unprivileged user for PostgreSQL; '$run_as' does not exist (set PG_RUN_AS)" >&2
    exit 1
  fi
  chown "$run_as" "$database_root"
  if ! su "$run_as" -s /bin/sh -c "$(printf 'test -w %q' "$database_root")"; then
    echo "User '$run_as' cannot reach $database_root; make its parent folders traversable (chmod o+x) or set PG_RUN_AS" >&2
    exit 1
  fi
fi
pg() {
  if [ -n "$run_as" ]; then
    local quoted
    printf -v quoted '%q ' "$@"
    su "$run_as" -s /bin/sh -c "$quoted"
  else
    "$@"
  fi
}

if [ ! -f "$cluster_path/PG_VERSION" ]; then
  if [ -e "$environment_path" ]; then
    echo 'Refusing to overwrite an existing database environment without its cluster' >&2
    exit 1
  fi
  test_password="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
  password_file="$(mktemp)"
  trap 'rm -f "$password_file"' EXIT
  printf '%s' "$test_password" >"$password_file"
  [ -n "$run_as" ] && chown "$run_as" "$password_file"
  if ! pg "$bin_dir/initdb" -D "$cluster_path" -U chakra_test_admin --auth=scram-sha-256 \
    --encoding=UTF8 --locale=C "--pwfile=$password_file" >/dev/null; then
    echo 'PostgreSQL initialization failed' >&2
    exit 1
  fi
  rm -f "$password_file"
  (
    umask 077
    printf 'TEST_DATABASE_URL=postgresql://chakra_test_admin:%s@127.0.0.1:%s/postgres\n' \
      "$test_password" "$port" >"$environment_path"
  )
fi

if ! pg "$bin_dir/pg_ctl" status -D "$cluster_path" >/dev/null 2>&1; then
  if ! pg "$bin_dir/pg_ctl" -D "$cluster_path" -l "$database_root/postgres.log" \
    -o "-h 127.0.0.1 -p $port" -w start >/dev/null; then
    echo 'Local PostgreSQL did not start; inspect the ignored database log' >&2
    exit 1
  fi
fi
echo "Local PostgreSQL is ready on 127.0.0.1:$port. Credentials remain in ignored work/database/.env."
