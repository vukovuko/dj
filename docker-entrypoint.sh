#!/bin/sh
set -e

echo "🔧 Enabling PostgreSQL extensions..."
node enable-unaccent.js

echo "🔄 Running database migrations..."
npx drizzle-kit migrate

echo "🌱 Seeding database with initial data..."
node --experimental-strip-types src/db/seed.ts

echo "🚀 Starting application..."
exec node .output/server/index.mjs
