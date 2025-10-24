#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx drizzle-kit migrate

echo "🚀 Starting application..."
exec node .output/server/index.mjs
