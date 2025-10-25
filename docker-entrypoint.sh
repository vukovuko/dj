#!/bin/sh
set -e

echo "🔧 Enabling PostgreSQL extensions..."
node enable-unaccent.js

echo "🔄 Running database migrations..."
npx drizzle-kit migrate

echo "🚀 Starting application..."
exec node .output/server/index.mjs
