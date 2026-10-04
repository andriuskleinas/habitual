#!/usr/bin/env bash
# Apply every migration to a scratch Postgres database and run the
# access-rule tests against it.
#
#   supabase/tests/run.sh                # uses $DATABASE_URL, or the local default
#
# The target database is dropped and recreated, so never point this at
# anything but a throwaway server.
set -euo pipefail

cd "$(dirname "$0")/../.."

ADMIN_URL="${DATABASE_URL:-postgres:///postgres}"
DB=habitual_test

psql "$ADMIN_URL" -qX -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
TEST_URL="${ADMIN_URL%/*}/$DB" # same server, scratch database

psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f supabase/tests/stubs.sql

for f in supabase/migrations/*.sql; do
  # pg_net isn't available on plain Postgres; stubs.sql fakes net.http_post.
  sed '/^create extension if not exists pg_net;/d' "$f" |
    psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f -
done

psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -o /dev/null -f supabase/tests/rls_test.sql 2>&1 |
  sed "s/^psql:[^ ]* NOTICE:  //"
