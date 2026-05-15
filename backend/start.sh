#!/bin/sh
echo "Running migrations..."
npx prisma migrate deploy || echo "Migration warning (continuing anyway)"
echo "Regenerating Prisma client..."
npx prisma generate || echo "Generate warning (continuing anyway)"
echo "Starting server..."
exec node src/index.js
