#!/bin/sh
# Backup do banco e das fotos. Agende no cron do LXC, ex.:
#   0 3 * * * /opt/resgate-animal/scripts/backup.sh >> /var/log/resgate-backup.log 2>&1
set -eu

cd "$(dirname "$0")/.."
. ./.env

DEST="backups/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DEST"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > "$DEST/banco.dump"
docker compose exec -T api tar -C /app/uploads -czf - . > "$DEST/uploads.tar.gz"

# Mantém os últimos 14 backups
ls -1d backups/*/ | head -n -14 | xargs -r rm -rf

echo "Backup concluído em $DEST"
