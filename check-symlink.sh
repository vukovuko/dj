#!/bin/bash
echo "=== Checking .output/public directory ==="
docker exec dj-app ls -la /app/.output/public/

echo ""
echo "=== Checking public/videos directory ==="
docker exec dj-app ls -la /app/public/videos/ | head -20

echo ""
echo "=== Checking if symlink exists ==="
docker exec dj-app ls -la /app/.output/public/videos 2>&1

echo ""
echo "=== Testing if video file is accessible via symlink ==="
docker exec dj-app test -f /app/.output/public/videos/f1590d8b-fad9-4da3-9a8f-63353983a567.mp4 && echo "✓ Video accessible via symlink" || echo "✗ Video NOT accessible via symlink"

echo ""
echo "=== Testing if video file exists directly ==="
docker exec dj-app test -f /app/public/videos/f1590d8b-fad9-4da3-9a8f-63353983a567.mp4 && echo "✓ Video exists in public/videos" || echo "✗ Video NOT in public/videos"
