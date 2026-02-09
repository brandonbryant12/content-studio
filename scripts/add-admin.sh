#!/usr/bin/env bash
# Usage: ./scripts/add-admin.sh <email>
# Sets a user's role to 'admin' in the local database.

set -euo pipefail

EMAIL="${1:-}"

if [ -z "$EMAIL" ]; then
  echo "Usage: ./scripts/add-admin.sh <email>"
  echo "Example: ./scripts/add-admin.sh b@b.com"
  exit 1
fi

# Load DB URL from server .env
ENV_FILE="$(dirname "$0")/../apps/server/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

DB_URL=$(grep '^SERVER_POSTGRES_URL=' "$ENV_FILE" | cut -d= -f2-)
if [ -z "$DB_URL" ]; then
  echo "Error: SERVER_POSTGRES_URL not found in $ENV_FILE"
  exit 1
fi

RESULT=$(psql "$DB_URL" -t -A -c "UPDATE \"user\" SET role = 'admin' WHERE email = '$EMAIL' RETURNING email, role;")

if [ -z "$RESULT" ]; then
  echo "No user found with email: $EMAIL"
  exit 1
fi

echo "Done: $RESULT"
