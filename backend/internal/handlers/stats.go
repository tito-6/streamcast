package handlers

import (
	"net/http"
	"runtime"
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
	ViewerCount int64   `json:"viewer_count"` // Mock or real from streams
}

type ViewerHistory struct {
	Time  string `json:"time"`
	Count int    `json:"count"`
}

var viewerHistory = []ViewerHistory{}

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

	// 3. Update History Mock (Keep last 20 points)
	now := time.Now().Format("15:04:05")
	// Simulate some fluctuation
	mockViewers := int(currentCPU) * 2 // Just a dynamic number for demo
	if mockViewers < 5 {
		mockViewers = 5
	}

	viewerHistory = append(viewerHistory, ViewerHistory{Time: now, Count: mockViewers})
	if len(viewerHistory) > 20 {
		viewerHistory = viewerHistory[1:]
	}

	stats := SystemStats{
		CPUUsage:    currentCPU,
		RAMUsage:    currentRAM,
		GoRoutines:  runtime.NumGoroutine(),
		ActiveUsers: 15, // Mock
		ViewerCount: int64(mockViewers),
	}

	c.JSON(http.StatusOK, gin.H{
		"system":  stats,
		"history": viewerHistory,
	})
}
