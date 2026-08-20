#!/bin/bash
# Backup diario de la base de datos de Tecnia Academy.
# Pensado para correr como cron job en el servidor (ver backend/scripts/README-backups.md).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Cargamos las variables de conexión desde el .env del backend
set -a
source "$BACKEND_DIR/.env"
set +a

BACKUP_DIR="/var/backups/tecnia-academy"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="tecnia_academy_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

# Nos quedamos solo con los últimos 14 días de backups, para no llenar el disco
find "$BACKUP_DIR" -name "tecnia_academy_*.sql.gz" -mtime +14 -delete

echo "$(date '+%Y-%m-%d %H:%M:%S'): Backup creado -> $BACKUP_DIR/$FILENAME" >> "$BACKUP_DIR/backup.log"
