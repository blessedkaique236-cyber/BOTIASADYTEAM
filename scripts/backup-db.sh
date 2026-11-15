#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL não foi definida." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/boom-queue-$timestamp.dump"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump não encontrado. Instale o cliente PostgreSQL 17 ou execute o backup dentro do container PostgreSQL." >&2
  exit 1
fi

pg_dump --format=custom --no-owner --no-acl --file="$output" "$DATABASE_URL"
chmod 600 "$output"
find "$BACKUP_DIR" -type f -name 'boom-queue-*.dump' -mtime "+$RETENTION_DAYS" -delete
echo "Backup criado: $output"
