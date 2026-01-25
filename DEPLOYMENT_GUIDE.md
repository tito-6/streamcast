# StreamCast High-Performance Deployment Guide
## Optimized for 7,000+ Concurrent Viewers

### Overview
This deployment eliminates CPU bottlenecks and optimizes the entire stack for maximum concurrency.

**Key Improvements:**
- ✅ **Passthrough Mode**: No transcoding (0% CPU for encoding)
- ✅ **1-Second Segments**: Ultra-low latency HLS
- ✅ **65,535 File Descriptors**: Handle massive connections
- ✅ **BBR Congestion Control**: Optimized TCP for video
- ✅ **Thread Pools**: Asynchronous I/O in Nginx
- ✅ **Aggressive Caching**: Reduce server load

---

## Deployment Steps

### 1. Deploy Backend (Go + FFmpeg Passthrough)

```bash
# SSH into VPS
ssh -i ~/.ssh/id_github_streamcast root@72.62.91.240

# Pull latest code
cd /root/streamcast
git pull origin master

# Rebuild Go backend
cd backend
go build -o main cmd/main.go

# Restart backend
pm2 restart streamcast-backend
pm2 save
```

### 2. Run System Optimization Script

```bash
# Make script executable
chmod +x /root/streamcast/optimize_system.sh

# Run as root
sudo bash /root/streamcast/optimize_system.sh

# Verify settings
ulimit -n  # Should show 65535
sysctl net.core.somaxconn  # Should show 65535
```

### 3. Update Nginx Configuration

```bash
# Backup current config
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Copy optimized main config
cp /root/streamcast/nginx_main.conf /etc/nginx/nginx.conf

# Copy optimized site config
cp /root/streamcast/nginx_production_hls.conf /etc/nginx/sites-available/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 4. Reboot System (IMPORTANT!)

```bash
# Reboot to apply kernel parameters
sudo reboot
```

### 5. Verify After Reboot

```bash
# Check file descriptors
ulimit -n  # Should be 65535

# Check TCP settings
sysctl net.core.somaxconn  # Should be 65535
sysctl net.ipv4.tcp_congestion_control  # Should be bbr

# Check Nginx workers
ps aux | grep nginx  # Should see multiple worker processes

# Check backend
pm2 status  # All services should be online

# Test HLS endpoint
curl -I https://sportevent.online/hls/test/index.m3u8
```

---

## OBS Settings for Maximum Quality

### Video Settings
- **Output Resolution**: 1920x1080 (Full HD)
- **FPS**: 60 (or 30 for lower bandwidth)
- **Encoder**: x264 or NVENC (hardware encoding)
- **Rate Control**: CBR (Constant Bitrate)
- **Bitrate**: 6000-8000 Kbps for 1080p60
- **Keyframe Interval**: 2 seconds
- **Preset**: Quality (for x264) or Max Quality (for NVENC)
- **Profile**: High
- **Tune**: zerolatency

### Audio Settings
- **Sample Rate**: 48000 Hz
- **Bitrate**: 192 Kbps
- **Codec**: AAC

### Stream Settings
- **Server**: rtmp://sportevent.online:1935/live
- **Stream Key**: test

---

## Performance Expectations

### With Passthrough Mode:
- **CPU Usage**: <5% (just copying data, no encoding)
- **Latency**: 2-4 seconds (1s segments + network)
- **Quality**: Identical to OBS output
- **Concurrent Viewers**: 7,000+ (limited by bandwidth, not CPU)

### Bandwidth Calculation:
- **Per Viewer**: ~6-8 Mbps (1080p60)
- **7,000 Viewers**: ~42-56 Gbps total
- **Note**: Use a CDN (Cloudflare, AWS CloudFront) for this scale

---

## Monitoring Commands

```bash
# Watch CPU usage
htop

# Monitor network connections
watch -n 1 'ss -s'

# Check Nginx connections
watch -n 1 'curl -s http://localhost/nginx_status'

# Monitor HLS directory
watch -n 1 'ls -lh /var/www/hls/test/'

# FFmpeg logs
pm2 logs streamcast-backend --lines 50

# Nginx access log (live)
tail -f /var/log/nginx/access.log
```

---

## Troubleshooting

### Issue: "Too many open files"
**Solution**: Verify ulimit settings
```bash
ulimit -n  # Should be 65535
# If not, reboot the system
```

### Issue: High CPU usage
**Solution**: Verify passthrough mode
```bash
pm2 logs streamcast-backend | grep "copy"
# Should see: -c:v copy -c:a copy
```

### Issue: Lag/buffering
**Solution**: Check segment generation
```bash
ls -lh /var/www/hls/test/
# Should see new .ts files every 1 second
```

### Issue: No video playback
**Solution**: Check CORS headers
```bash
curl -I https://sportevent.online/hls/test/index.m3u8
# Should see: Access-Control-Allow-Origin: *
```

---

## CDN Integration (Recommended for 7k+ viewers)

For 7,000+ viewers, use a CDN to distribute the load:

### Cloudflare (Free Tier)
1. Add your domain to Cloudflare
2. Enable "Proxy" (orange cloud) for your domain
3. Go to "Caching" → "Configuration"
4. Add cache rule for `/hls/*.ts` → Cache Everything, TTL: 1 hour
5. Add cache rule for `/hls/*.m3u8` → Bypass Cache

### AWS CloudFront
1. Create CloudFront distribution
2. Origin: sportevent.online
3. Cache behavior for `*.ts`: Cache for 1 hour
4. Cache behavior for `*.m3u8`: No cache
5. Update HLS URL in frontend to CloudFront URL

---

## Success Metrics

✅ **CPU < 10%** during streaming  
✅ **Latency < 5 seconds** end-to-end  
✅ **0 dropped frames** in OBS  
✅ **Smooth playback** on all devices  
✅ **7,000+ concurrent viewers** without lag  

---

## Support

If issues persist:
1. Check logs: `pm2 logs streamcast-backend`
2. Verify Nginx: `nginx -t && systemctl status nginx`
3. Test locally: `ffplay http://localhost:8080/hls/test/index.m3u8`
4. Monitor resources: `htop` and `iftop`
