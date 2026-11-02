#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p -- "$DEST"
DEST="$(cd -- "$DEST" && pwd)"
exec 9>"$DEST/.backup.lock"
flock -n 9 || exit 0
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TEMP="$(mktemp -d "$DEST/.backup.XXXXXX")"
trap 'rm -rf -- "$TEMP"' EXIT
cd -- "$ROOT"

docker compose exec -T db pg_dump -U resgateanimal -d resgateanimal -Fc > "$TEMP/database.dump"
docker compose exec -T api tar -C /app/uploads -czf - . > "$TEMP/uploads.tar.gz"
test -s "$TEMP/database.dump"
test -s "$TEMP/uploads.tar.gz"
mv -T -- "$TEMP" "$DEST/$STAMP"
trap - EXIT
printf 'Backup criado: %s\n' "$DEST/$STAMP"
if ! find "$DEST" -mindepth 1 -maxdepth 1 -type d -name '????????T??????Z' -mtime +6 -exec rm -rf -- {} +; then
  printf 'Backup preservado, mas a limpeza dos backups antigos falhou.\n' >&2
  exit 1
fi
