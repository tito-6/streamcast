# StreamCast Scalability & Maintenance Plan

## 1. Disk Space Management
**Issue**: Disk was full (83%) due to 70GB+ of old test archives.
**Fix**: Deleted `archive_test_*.mp4` files older than 7 days.
**Maintenance**:
- A cron job should be added to automatically delete old archives:
  `0 3 * * * find /var/www/archive -name "archive_*.mp4" -mtime +30 -delete`
- Consider moving long-term archives to AWS S3 / Wasabi.

## 2. Video Quality (1080p)
**Issue**: "Fake" 1080p and low bitrate (3500k) resulted in poor quality.
**Fix**:
- **Bitrate**: Increased to **6000 Kbps** (CBR) for 1080p.
- **Preset**: Changed to `superfast` (better quality/CPU balance).
- **Profile**: Set to `high` profile.
- **FPS**: Maintained 30fps for stability (can be bumped to 60fps if CPU allows).

## 3. Scalability (100k Viewers)
**Status**: Single VPS cannot handle 100k viewers (requires ~200 Gbps bandwidth).
**Required Action**: **You MUST use a CDN.**
**What we did**:
- Updated Nginx configuration to support CDN Caching.
- `.ts` video segments are now cached (`Cache-Control: public, max-age=3600`).
- `.m3u8` playlists are NOT cached (`no-cache`).

**Next Steps**:
1.  **Cloudflare**: Point `sportevent.online` DNS to Cloudflare.
2.  **Page Rules**: Create a Page Rule for `sportevent.online/hls/*.ts`:
    - **Cache Level**: Cache Everything.
    - **Edge Cache TTL**: 2 hours.
3.  **Load Balancing** (Optional for now): If ingestion CPU hits 100%, split Ingestion (RTMP) and Egress (Nginx) servers.

## 4. Deployment
- Updated `deploy_to_vps.ps1` to include Nginx updates and correct Go build paths.
- Ensure `pm2` is installed on server (Done).
