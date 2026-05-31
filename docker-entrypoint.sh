#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --skip-generate 2>&1 || {
  echo "Schema sync failed, but continuing to start application..."
  echo "You may need to run prisma db push manually"
}

echo "Starting application..."
exec node dist/main
