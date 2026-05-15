#!/bin/sh
echo "Running migrations..."
npx prisma migrate deploy
echo "Regenerating Prisma client..."
npx prisma generate
echo "Starting server..."
exec node src/index.js
