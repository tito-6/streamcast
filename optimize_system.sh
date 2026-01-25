#!/bin/bash
# System Optimization Script for 7,000+ Concurrent Viewers
# Run as root: sudo bash optimize_system.sh

echo "=== StreamCast System Optimization for High Concurrency ==="
echo "Target: 7,000+ concurrent HLS viewers"
echo ""

# 1. Increase File Descriptors
echo "[1/4] Setting File Descriptor Limits..."
ulimit -n 65535

# Make it permanent
cat >> /etc/security/limits.conf << EOF
# StreamCast High Concurrency Settings
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF

# 2. Tune TCP Stack for High Concurrency
echo "[2/4] Tuning TCP/IP Stack..."
cat >> /etc/sysctl.conf << EOF

# StreamCast Network Tuning for 7k+ Viewers
# Connection Queue
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# TCP Connection Reuse
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Buffer Sizes for Video Streaming
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 16777216
net.core.wmem_default = 16777216
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# Optimize for High Bandwidth
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Increase max connections
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_max_tw_buckets = 2000000

# Disable slow start after idle
net.ipv4.tcp_slow_start_after_idle = 0

# Enable TCP Fast Open
net.ipv4.tcp_fastopen = 3
EOF

# Apply sysctl changes
sysctl -p

# 3. Optimize Nginx Worker Settings
echo "[3/4] Checking Nginx configuration..."
if [ -f /etc/nginx/nginx.conf ]; then
    echo "Nginx found. Please ensure worker_rlimit_nofile is set to 65535"
else
    echo "Nginx not found at /etc/nginx/nginx.conf"
fi

# 4. Disable Transparent Huge Pages (THP) for better latency
echo "[4/4] Disabling Transparent Huge Pages..."
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Make THP disable permanent
cat >> /etc/rc.local << EOF
# Disable THP for StreamCast
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
EOF

chmod +x /etc/rc.local

echo ""
echo "=== Optimization Complete ==="
echo ""
echo "Summary:"
echo "✓ File descriptors: 65,535"
echo "✓ TCP connection queue: 65,535"
echo "✓ TCP buffer sizes: 128MB max"
echo "✓ BBR congestion control enabled"
echo "✓ TCP Fast Open enabled"
echo "✓ Transparent Huge Pages disabled"
echo ""
echo "IMPORTANT: Reboot the system for all changes to take effect:"
echo "  sudo reboot"
echo ""
echo "After reboot, verify with:"
echo "  ulimit -n"
echo "  sysctl net.core.somaxconn"
echo "  sysctl net.ipv4.tcp_congestion_control"
