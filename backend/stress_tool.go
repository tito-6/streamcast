package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// CONFIGURATION
const (
	// FIXED URL: Pointing to /hls/ instead of /live/
	TargetURL     = "http://sportevent.online/hls/live_283e7d99-f234-4254-a5eb-ce7ee60ddc93/index.m3u8"
	TotalViewers  = 5000 // Simulating 5,000 viewers
)

var (
	successCount uint64
	errorCount   uint64
)

func main() {
	// Custom transport to allow thousands of connections on Windows
	tr := &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        2000,
		MaxIdleConnsPerHost: 2000,
	}
	client := &http.Client{Transport: tr, Timeout: 5 * time.Second}

	fmt.Printf("🚀 LAUNCHING STRESS TEST: %d Viewers\n", TotalViewers)
	fmt.Printf("🎯 Target: %s\n", TargetURL)

	var wg sync.WaitGroup

	// Launch Viewers
	for i := 0; i < TotalViewers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				resp, err := client.Get(TargetURL)
				if err != nil {
					atomic.AddUint64(&errorCount, 1)
					// If connection error, wait 1s
					time.Sleep(1 * time.Second)
				} else {
					// Must read and close body to free the connection
					io.Copy(ioutil.Discard, resp.Body)
					resp.Body.Close()

					if resp.StatusCode == 200 {
						atomic.AddUint64(&successCount, 1)
					} else {
						// If 404 or 500, count as error
						atomic.AddUint64(&errorCount, 1)
					}
				}
				// Viewers normally wait 2s for the next chunk
				time.Sleep(2 * time.Second)
			}
		}()

		// Ramp up slowly to avoid freezing your PC (200 viewers per batch)
		if i%200 == 0 {
			fmt.Printf("\rViewers Launched: %d", i)
			time.Sleep(50 * time.Millisecond)
		}
	}

	fmt.Println("\n✅ All Viewers Launched. Monitoring Stats...")

	// Print Stats Loop
	for {
		time.Sleep(2 * time.Second)
		s := atomic.LoadUint64(&successCount)
		e := atomic.LoadUint64(&errorCount)
		fmt.Printf("STATS: ✅ Success: %d | ❌ Errors: %d\n", s, e)
	}
}