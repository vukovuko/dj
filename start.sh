#!/bin/bash

set -e

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "📁 Setting up videos directory..."
# Create directory if it doesn't exist
if [ ! -d "videos" ]; then
  echo "  Creating videos directory..."
  sudo mkdir -p videos/thumbnails
  sudo chown -R $(whoami):$(whoami) videos
  sudo chmod -R 755 videos
  echo "✓ Videos directory created"
else
  # Fix permissions if needed (but keep existing videos!)
  echo "  Videos directory exists, checking permissions..."
  sudo chown -R $(whoami):$(whoami) videos 2>/dev/null || true
  sudo chmod -R 755 videos 2>/dev/null || true
  echo "✓ Permissions updated"
fi

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
