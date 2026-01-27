#!/bin/bash
# 100k Engine Tuning Script
# Run as root: sudo ./tune_server.sh

echo "🚀 Applying Maximum Velocity Kernel Tuning..."

# 1. Maximize File Descriptors (for 100k connections)
sysctl -w fs.file-max=1000000

# 2. Maximize Connection Backlog
sysctl -w net.core.somaxconn=65535

# 3. Optimize TCP Time Wait (recycle connections fast)
sysctl -w net.ipv4.tcp_max_tw_buckets=1440000
sysctl -w net.ipv4.tcp_tw_reuse=1

# 4. Expand Ephemeral Port Range
sysctl -w net.ipv4.ip_local_port_range="1024 65000"

# 5. Optimize TCP Buffers for High Bandwidth Video
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216

# 6. Enable BBR Congestion Control (Google's Algo for Video)
# Check available if we can
sysctl -w net.core.default_qdisc=fq
sysctl -w net.ipv4.tcp_congestion_control=bbr

sysctl -p

echo "✅ System Tuned for 100k Concurrent Viewers."
