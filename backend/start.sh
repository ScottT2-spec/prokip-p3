#!/bin/sh
echo "Running schema sync..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "Schema sync warning (may already be up to date)"
echo "Starting server..."
exec node src/index.js
