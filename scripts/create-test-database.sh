#!/bin/sh
# Creates the database the integration suite runs against.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE weight_tracker_test'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'weight_tracker_test')\gexec
EOSQL
