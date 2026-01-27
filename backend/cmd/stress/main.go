package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"sync/atomic"
	"time"
)

var (
	targetUrl    string
	concurrency  int
	totalReqs    uint64
	failedReqs   uint64
	totalLatency int64 // Microseconds
)

func main() {
	flag.StringVar(&targetUrl, "url", "http://localhost:8080/hls/test/index.m3u8", "Target URL (Direct to Nginx/Backend)")
	flag.IntVar(&concurrency, "c", 20000, "Concurrency (Default 20k to be safe locally)")
	flag.Parse()

	fmt.Printf("🚀 Starting High-Velocity Stress Test against %s\n", targetUrl)
	fmt.Printf("Target Concurrency: %d Viewers\n", concurrency)
	fmt.Printf("Simulating Playlist Refresh every 2 seconds...\n")

	// Metrics Monitor
	go func() {
		for {
			time.Sleep(1 * time.Second)
			reqs := atomic.SwapUint64(&totalReqs, 0)
			errs := atomic.SwapUint64(&failedReqs, 0)
			lat := atomic.SwapInt64(&totalLatency, 0)
			avgLat := float64(0)
			if reqs > 0 {
				avgLat = float64(lat) / float64(reqs) / 1000.0 // ms
			}

			// Check RAM
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			ram := m.Alloc / 1024 / 1024

			fmt.Printf("RPS: %d | Errors: %d | Latency: %.2f ms | Setup RAM: %v MB\n", reqs, errs, avgLat, ram)

			if ram > 6000 { // Safety cutoff 6GB
				fmt.Println("⚠️ CRITICAL RAM USAGE - ABORTING TEST")
				os.Exit(1)
			}
		}
	}()

	// Spawn Workers (Simulated Viewers)
	// Rate limit spawning to prevent local port exhaustion during ramp-up
	for i := 0; i < concurrency; i++ {
		go func(id int) {
			tr := &http.Transport{
				MaxIdleConnsPerHost: 1,
				DisableKeepAlives:   false,
			}
			client := &http.Client{
				Transport: tr,
				Timeout:   2 * time.Second,
			}

			for {
				start := time.Now()
				resp, err := client.Get(targetUrl)
				dur := time.Since(start).Microseconds()
				atomic.AddInt64(&totalLatency, dur)

				if err != nil {
					atomic.AddUint64(&failedReqs, 1)
					time.Sleep(1 * time.Second) // Backoff on error
				} else {
					if resp.StatusCode != 200 {
						atomic.AddUint64(&failedReqs, 1)
					} else {
						atomic.AddUint64(&totalReqs, 1)
					}
					resp.Body.Close()
				}

				// Wait 2s (Segment duration / Playlist refresh interval)
				time.Sleep(2 * time.Second)
			}
		}(i)

		if i%500 == 0 {
			time.Sleep(10 * time.Millisecond) // Slow ramp
		}
	}

	// Keep monitor running
	select {}
}
