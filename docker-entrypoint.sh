#!/bin/sh
set -e

echo "🔧 Enabling PostgreSQL extensions..."
node enable-unaccent.js

echo "🔄 Running database migrations..."
npx drizzle-kit migrate

echo "🌱 Seeding database with initial data..."
node --experimental-strip-types src/db/seed.ts

echo "🔨 Starting background worker..."
node --experimental-strip-types worker.ts &
WORKER_PID=$!

echo "🚀 Starting application..."
node .output/server/index.mjs &
APP_PID=$!

# Wait for either process to exit
wait -n $WORKER_PID $APP_PID

# If one exits, kill the other
kill $WORKER_PID $APP_PID 2>/dev/null

exit $?
