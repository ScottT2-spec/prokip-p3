#!/bin/sh
echo "Pushing schema to database..."
npx prisma db push --accept-data-loss 2>&1 || echo "DB push warning (continuing)"
echo "Starting server..."
exec node src/index.js
