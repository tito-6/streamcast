package handlers

import (
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"time"

	"streamcast-backend/internal/models"

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

// Heartbeat Tracking (Memory + DB)
var viewerHeartbeats = make(map[string]map[string]interface{}) // ip -> {metadata}
var statsLock sync.Mutex

type HeartbeatRequest struct {
	Language   string `json:"language"`
	DeviceType string `json:"device_type"`
}

func ViewerHeartbeat(c *gin.Context) {
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	var req HeartbeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = HeartbeatRequest{Language: "unknown", DeviceType: "unknown"}
	}

	statsLock.Lock()
	viewerHeartbeats[ip] = map[string]interface{}{
		"last_seen":   time.Now(),
		"language":    req.Language,
		"device_type": req.DeviceType,
		"user_agent":  userAgent,
	}
	statsLock.Unlock()

	// Persist to DB (sampled or every hit? For now every hit to be safe, but ideally batched)
	// To avoid spamming DB, we only insert if we haven't seen this IP in the last minute?
	// Or just log it as a separate "session tick".
	// Let's use a "Session" approach later. For now, we rely on the memory map for "Realtime"
	// and we insert a record into ViewerStat for "Historical" only once per minute per IP?
	// Simpler: Just save it. We will aggregate later.
	stat := models.ViewerStat{
		IP:         ip,
		UserAgent:  userAgent,
		DeviceType: req.DeviceType,
		Language:   req.Language,
		CreatedAt:  time.Now(),
	}
	models.DB.Create(&stat)

	c.Status(200)
}

func GetRealViewerCount() (int, map[string]int, map[string]int) {
	statsLock.Lock()
	defer statsLock.Unlock()

	count := 0
	languages := make(map[string]int)
	devices := make(map[string]int)
	threshold := time.Now().Add(-15 * time.Second)

	for ip, data := range viewerHeartbeats {
		lastSeen := data["last_seen"].(time.Time)
		if lastSeen.After(threshold) {
			count++
			lang := data["language"].(string)
			dev := data["device_type"].(string)
			languages[lang]++
			devices[dev]++
		} else {
			delete(viewerHeartbeats, ip)
		}
	}

	if count == 0 {
		return 0, languages, devices
	}
	// x10 Multiplier (Keep consistency)
	return count * 10, languages, devices
}

func GetStats(c *gin.Context) {
	cpuPercent, _ := cpu.Percent(0, false)
	currentCPU := 0.0
	if len(cpuPercent) > 0 {
		currentCPU = cpuPercent[0]
	}

	v, _ := mem.VirtualMemory()
	currentRAM := 0.0
	if v != nil {
		currentRAM = v.UsedPercent
	}

	realViewers, _, _ := GetRealViewerCount()

	// History
	now := time.Now().Format("15:04:05")
	viewerHistory = append(viewerHistory, ViewerHistory{Time: now, Count: realViewers})
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

// Advanced Analytics Handlers

func GetAnalyticsRealtime(c *gin.Context) {
	count, langs, devs := GetRealViewerCount()
	c.JSON(http.StatusOK, gin.H{
		"total_viewers": count,
		"languages":     langs,
		"devices":       devs,
	})
}

func GetAnalyticsHistorical(c *gin.Context) {
	period := c.Query("period") // "custom", "24h", "7d", "30d"
	startStr := c.Query("start")
	endStr := c.Query("end")

	var startTime time.Time
	var endTime time.Time = time.Now()

	if period == "custom" && startStr != "" {
		parsedStart, err := time.Parse(time.RFC3339, startStr)
		if err == nil {
			startTime = parsedStart
		}
		if endStr != "" {
			parsedEnd, err := time.Parse(time.RFC3339, endStr)
			if err == nil {
				endTime = parsedEnd
			}
		}
	} else {
		// Presets
		switch period {
		case "7d":
			startTime = time.Now().AddDate(0, 0, -7)
		case "30d":
			startTime = time.Now().AddDate(0, 0, -30)
		default: // 24h
			startTime = time.Now().Add(-24 * time.Hour)
		}
	}

	type ChartPoint struct {
		Time  string `json:"time"`
		Count int    `json:"count"`
	}
	var chartData []ChartPoint

	// Grouping interval depends on range
	// < 2 days -> Group by hour
	// > 2 days -> Group by day
	interval := "YYYY-MM-DD HH24:00"
	if endTime.Sub(startTime).Hours() > 48 {
		interval = "YYYY-MM-DD"
	}

	// Postgres query
	// Note: created_at between ? and ?
	models.DB.Raw(fmt.Sprintf(`
		SELECT to_char(created_at, '%s') as time, count(*) as count 
		FROM viewer_stats 
		WHERE created_at BETWEEN ? AND ?
		GROUP BY time 
		ORDER BY time ASC`, interval), startTime, endTime).Scan(&chartData)

	c.JSON(http.StatusOK, gin.H{
		"chart": chartData,
		"range": map[string]string{
			"start": startTime.Format(time.RFC3339),
			"end":   endTime.Format(time.RFC3339),
		},
	})
}
