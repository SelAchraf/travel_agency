# Operations: Deployment, Backup & Restore

## Database Backup and Restore

### Backup
```bash
# Using Docker container
docker exec -t travel_agency_postgres pg_dump -U travel_user -d travel_agency -F c -f /tmp/backup.dump
docker cp travel_agency_postgres:/tmp/backup.dump ./backup_$(date +%Y%m%d_%H%M%S).dump

# Or using local pg_dump
pg_dump -U travel_user -h 127.0.0.1 -p 5432 -d travel_agency -F c -f ./backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore
```bash
# Using Docker container
docker cp ./backup_file.dump travel_agency_postgres:/tmp/backup.dump
docker exec -t travel_agency_postgres pg_restore -U travel_user -d travel_agency --clean /tmp/backup.dump

# Or using local pg_restore
pg_restore -U travel_user -h 127.0.0.1 -p 5432 -d travel_agency --clean ./backup_file.dump
```

