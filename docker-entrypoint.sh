#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || {
  echo "Migration failed, but continuing to start application..."
  echo "You may need to run migrations manually"
}

echo "Starting application..."
exec node dist/main
