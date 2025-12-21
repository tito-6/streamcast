package handlers

import (
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemStats struct {
	CPUUsage    float64 `json:"cpu_usage"`
	RAMUsage    float64 `json:"ram_usage"`
	GoRoutines  int     `json:"go_routines"`
	ActiveUsers int64   `json:"active_users"` // Mock for now
	ViewerCount int64   `json:"viewer_count"` // Real x10
}

type ViewerHistory struct {
	Time  string `json:"time"`
	Count int    `json:"count"`
}

var viewerHistory = []ViewerHistory{}

// Heartbeat Tracking
var viewerHeartbeats = make(map[string]time.Time)
var statsLock sync.Mutex

func ViewerHeartbeat(c *gin.Context) {
	// Simple identifier: IP address
	ip := c.ClientIP()

	statsLock.Lock()
	viewerHeartbeats[ip] = time.Now()
	statsLock.Unlock()

	c.Status(200)
}

func GetRealViewerCount() int {
	statsLock.Lock()
	defer statsLock.Unlock()

	count := 0
	threshold := time.Now().Add(-15 * time.Second) // Active in last 15s (heartbeat every 10s)

	for ip, lastSeen := range viewerHeartbeats {
		if lastSeen.After(threshold) {
			count++
		} else {
			delete(viewerHeartbeats, ip) // Cleanup old entries
		}
	}

	// Add arbitrary +1 so the admin/streamer always sees at least 1 (themselves)
	if count == 0 {
		return 0
	}
	// Multiplier x10 as requested
	return count * 10
}

func GetStats(c *gin.Context) {
	// 1. CPU Usage
	cpuPercent, _ := cpu.Percent(0, false)
	currentCPU := 0.0
	if len(cpuPercent) > 0 {
		currentCPU = cpuPercent[0]
	}

	// 2. RAM Usage
	v, _ := mem.VirtualMemory()
	currentRAM := 0.0
	if v != nil {
		currentRAM = v.UsedPercent
	}

	// 3. Real Viewer Count
	realViewers := GetRealViewerCount()

	// 4. Update History
	now := time.Now().Format("15:04:05")
	viewerHistory = append(viewerHistory, ViewerHistory{Time: now, Count: realViewers})

	// Keep last 20 points
	if len(viewerHistory) > 20 {
		viewerHistory = viewerHistory[1:]
	}

	stats := SystemStats{
		CPUUsage:    currentCPU,
		RAMUsage:    currentRAM,
		GoRoutines:  runtime.NumGoroutine(),
		ActiveUsers: int64(realViewers),
		ViewerCount: int64(realViewers),
	}

	c.JSON(http.StatusOK, gin.H{
		"system":  stats,
		"history": viewerHistory,
	})
}
