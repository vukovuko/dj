# Video Storage Directory

This directory stores generated video files and thumbnails.

## Structure

```
public/videos/
├── README.md              # This file
├── .gitkeep               # Keeps directory in git
├── thumbnails/            # Video thumbnail images
│   ├── .gitkeep
│   └── {video-id}.jpg     # Generated thumbnails
└── {video-id}.mp4         # Generated video files
```

## File Naming Convention

- **Videos:** `{video-id}.mp4` (e.g., `abc-123-def-456.mp4`)
- **Thumbnails:** `{video-id}.jpg` (e.g., `abc-123-def-456.jpg`)

Video ID matches the UUID from the database `videos` table.

## Storage Locations

### Development (Local)
```
/path/to/dj/public/videos/
```

### Production (VPS via Docker)
```
Host: /path/to/dj/videos/
Container: /app/public/videos/
```

Docker volume mount: `./videos:/app/public/videos`

## Access URLs

Generated videos are accessible via:
- Video: `/videos/{video-id}.mp4`
- Thumbnail: `/videos/thumbnails/{video-id}.jpg`

Example: `http://localhost:3000/videos/abc-123.mp4`

## Git Ignored

Video files (`.mp4`, `.webm`, `.mov`) and thumbnails (`.jpg`, `.png`, `.webp`) are gitignored to avoid committing large binary files to the repository.

See `.gitignore` for ignored patterns.

## VPS Setup

On VPS, create the videos directory before deploying:

```bash
mkdir -p videos/thumbnails
chmod -R 755 videos
```

The `docker-compose.yml` mounts `./videos` → `/app/public/videos` for persistent storage across container restarts.

## Cleanup (Future)

Consider implementing a cleanup job to delete old videos:

```typescript
// Delete videos older than 30 days
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const oldVideos = await db
  .select()
  .from(videos)
  .where(lt(videos.createdAt, thirtyDaysAgo))

// Delete files and DB records
for (const video of oldVideos) {
  await fs.unlink(`public/videos/${video.id}.mp4`)
  await fs.unlink(`public/videos/thumbnails/${video.id}.jpg`)
  await db.delete(videos).where(eq(videos.id, video.id))
}
```

## Monitoring

Track disk usage periodically:

```bash
# Check videos directory size
du -sh public/videos/

# VPS (inside container)
docker exec dj-app du -sh /app/public/videos/
```

Average video size: ~50-100MB per 30-second video.
