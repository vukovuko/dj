#!/bin/bash

set -e

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans

echo "🧹 Cleaning up unused images..."
docker image prune -f

echo "🔨 Building and starting containers..."
docker-compose up -d --build

echo "📊 Showing container status..."
docker-compose ps

echo "✅ Deployment complete!"
echo ""
echo "📝 Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  View app logs: docker-compose logs -f dj-app"
echo "  View db logs:  docker-compose logs -f db"
echo "  Stop all:      docker-compose down"
