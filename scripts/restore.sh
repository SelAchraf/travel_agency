#!/usr/bin/env bash
# ==============================================================================
# Numidia Voyages - PostgreSQL & Document Restore Script
# Usage: ./scripts/restore.sh <backup_file.sql.gz> [--force] [--with-files <tar.gz>]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env if present
if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

DATABASE_URL="${DATABASE_URL:-postgresql://travel_user:travel_password_secure_2026@127.0.0.1:5432/travel_agency}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file.sql.gz> [--force] [--with-files <files.tar.gz>]"
  exit 1
fi

BACKUP_FILE="$1"
shift

FORCE=false
FILES_ARCHIVE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    --with-files)
      FILES_ARCHIVE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file '${BACKUP_FILE}' does not exist."
  exit 1
fi

echo "=========================================================="
echo " Restore Procedure for Numidia Voyages Platform"
echo " Timestamp: $(date)"
echo " Database URL: $(echo "${DATABASE_URL}" | sed -E 's/:[^@]+@/:****@/')"
echo " Source File: ${BACKUP_FILE}"
echo "=========================================================="

if [ "${FORCE}" != true ]; then
  echo "WARNING: This operation will overwrite and replace the database contents."
  read -r -p "Are you sure you want to proceed with restore? [y/N]: " confirm
  if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled by user."
    exit 0
  fi
fi

if ! command -v psql &> /dev/null; then
  echo "ERROR: psql is not installed or not in PATH."
  exit 1
fi

echo "--> Restoring PostgreSQL database..."
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}" > /dev/null
else
  psql "${DATABASE_URL}" < "${BACKUP_FILE}" > /dev/null
fi
echo "✓ Database restored successfully."

# Restore files if specified
if [ -n "${FILES_ARCHIVE}" ] && [ -f "${FILES_ARCHIVE}" ]; then
  echo "--> Restoring private storage documents..."
  mkdir -p "${ROOT_DIR}/apps/api"
  tar -xzf "${FILES_ARCHIVE}" -C "${ROOT_DIR}/apps/api"
  echo "✓ Files archive restored into apps/api/storage/private."
fi

# Verification query
echo "--> Verifying database tables and counts..."
psql "${DATABASE_URL}" -c "
  SELECT 'users' AS table_name, count(*) AS count FROM users
  UNION ALL
  SELECT 'travel_offers', count(*) FROM travel_offers
  UNION ALL
  SELECT 'customers', count(*) FROM customers
  UNION ALL
  SELECT 'reservations', count(*) FROM reservations
  UNION ALL
  SELECT 'payments', count(*) FROM payments;
"

echo "=========================================================="
echo " Restore verified and completed successfully!"
echo "=========================================================="

