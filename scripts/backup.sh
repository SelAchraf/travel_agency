#!/usr/bin/env bash
# ==============================================================================
# Numidia Voyages - Automated PostgreSQL & Document Backup Script
# Usage: ./scripts/backup.sh [--with-files] [--keep <days>]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env if present
if [ -f "${ROOT_DIR}/.env" ]; then
  # Export non-comment lines
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

DATABASE_URL="${DATABASE_URL:-postgresql://travel_user:travel_password_secure_2026@127.0.0.1:5432/travel_agency}"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
DB_BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
FILES_BACKUP_FILE="${BACKUP_DIR}/storage_backup_${TIMESTAMP}.tar.gz"

WITH_FILES=false
KEEP_DAYS=14

while [[ $# -gt 0 ]]; do
  case $1 in
    --with-files)
      WITH_FILES=true
      shift
      ;;
    --keep)
      KEEP_DAYS="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--with-files] [--keep <days>]"
      exit 1
      ;;
  esac
done

mkdir -p "${BACKUP_DIR}"

echo "=========================================================="
echo " Starting Backup for Numidia Voyages Platform"
echo " Timestamp: $(date)"
echo " Database URL: $(echo "${DATABASE_URL}" | sed -E 's/:[^@]+@/:****@/')"
echo " Destination: ${BACKUP_DIR}"
echo "=========================================================="

# 1. Database dump
echo "--> Dumping PostgreSQL database..."
if ! command -v pg_dump &> /dev/null; then
  echo "ERROR: pg_dump is not installed or not in PATH."
  exit 1
fi

pg_dump --clean --if-exists --no-owner --no-privileges "${DATABASE_URL}" | gzip -9 > "${DB_BACKUP_FILE}"

# Test gzip integrity
gzip -t "${DB_BACKUP_FILE}"
DB_SIZE="$(du -h "${DB_BACKUP_FILE}" | cut -f1)"
echo "✓ Database backup created successfully: $(basename "${DB_BACKUP_FILE}") (${DB_SIZE})"

# 2. Private documents backup (if requested or if storage dir exists)
STORAGE_DIR="${ROOT_DIR}/apps/api/storage/private"
if [ "${WITH_FILES}" = true ] && [ -d "${STORAGE_DIR}" ]; then
  echo "--> Archiving private storage documents..."
  tar -czf "${FILES_BACKUP_FILE}" -C "${ROOT_DIR}/apps/api" storage/private
  FILES_SIZE="$(du -h "${FILES_BACKUP_FILE}" | cut -f1)"
  echo "✓ Files archive created successfully: $(basename "${FILES_BACKUP_FILE}") (${FILES_SIZE})"
fi

# 3. Retention policy: purge older backups
if [ "${KEEP_DAYS}" -gt 0 ]; then
  echo "--> Applying retention policy: keeping last ${KEEP_DAYS} days..."
  find "${BACKUP_DIR}" -name "db_backup_*.sql.gz" -mtime +"${KEEP_DAYS}" -delete || true
  find "${BACKUP_DIR}" -name "storage_backup_*.tar.gz" -mtime +"${KEEP_DAYS}" -delete || true
fi

echo "=========================================================="
echo " Backup completed successfully at $(date)!"
echo " Target: ${DB_BACKUP_FILE}"
echo "=========================================================="

