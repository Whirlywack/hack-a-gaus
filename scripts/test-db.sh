#!/usr/bin/env bash
# Run the Vitest suite against a throwaway Postgres of its own.
#
# Every run starts a fresh supabase/postgres container on a random free host
# port, applies this worktree's supabase/migrations/*.sql, runs Vitest with
# TEST_DATABASE_URL pointing at it, and removes the container on exit.
# Nothing is shared between runs, so worktrees on different branches can run
# at the same time without clashing over ports, data or migrations.
#
# A run that is killed outright (kill -9) cannot clean up, so each container
# is labelled with the host and the PID of the run that owns it, and every run
# first removes this host's test containers whose run no longer exists.
#
# Usage: bash scripts/test-db.sh [vitest args]     (or: npm test)
# Env:   GAUS_TEST_PG_IMAGE  override the Postgres image
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${GAUS_TEST_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.043}"
NAME="gaus-test-$$-$RANDOM"
HOST="$(hostname)"
PASSWORD="postgres"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# A trapped signal only runs its handler; exit so the EXIT trap cleans up and the run stops.
trap 'exit 130' INT
trap 'exit 143' TERM

# Remove containers left by runs on this host that were killed before they could clean up.
docker ps -a --filter label=gaus-test=1 --filter "label=gaus-test.host=$HOST" \
  --format '{{.ID}} {{.Label "gaus-test.pid"}}' |
  while read -r id pid; do
    if [ -n "$pid" ] && ! ps -p "$pid" >/dev/null 2>&1; then
      docker rm -f "$id" >/dev/null 2>&1 || true
    fi
  done

docker run -d --rm --name "$NAME" \
  --label gaus-test=1 --label "gaus-test.host=$HOST" --label "gaus-test.pid=$$" \
  -e POSTGRES_PASSWORD="$PASSWORD" \
  -p 127.0.0.1::5432 "$IMAGE" >/dev/null

# Wait until the server accepts queries (the image restarts once while it initialises).
ready=0
for _ in $(seq 1 90); do
  if docker exec "$NAME" psql -U postgres -h 127.0.0.1 -Atc 'select 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != 1 ]; then
  echo "test database did not start" >&2
  docker logs "$NAME" 2>&1 | tail -20 >&2
  exit 1
fi

# Apply this worktree's migrations in file order.
shopt -s nullglob
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migration: $(basename "$f")"
  docker exec -i "$NAME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -q <"$f"
done

PORT="$(docker port "$NAME" 5432/tcp | head -n1 | sed 's/.*://')"
export TEST_DATABASE_URL="postgres://postgres:${PASSWORD}@127.0.0.1:${PORT}/postgres"

cd "$ROOT"
npx --no-install vitest run "$@"
