package rtmp

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nareix/joy4/av/avutil"
	"github.com/nareix/joy4/av/pubsub"
	"github.com/nareix/joy4/format"
	"github.com/nareix/joy4/format/rtmp"

	"streamcast-backend/internal/models"
)

type Server struct {
	server *rtmp.Server
	queues map[string]*pubsub.Queue
	mu     sync.Mutex
	addr   string
}

var (
	activeCmds    = make(map[string]*exec.Cmd)
	activeIngests = make(map[string]bool)
	cmdsMu        sync.Mutex
	serverAddr    = ":1935"
)

func GetHlsDir(streamKey string) string {
	var baseDir string
	if runtime.GOOS == "windows" {
		baseDir = filepath.Join("..", "frontend", "public", "hls")
	} else {
		if _, err := os.Stat("/dev/shm"); err == nil {
			baseDir = "/dev/shm/hls"
		} else {
			baseDir = "/var/www/hls"
		}
	}
	return filepath.Join(baseDir, streamKey)
}

func KillStream(streamKey string) {
	cmdsMu.Lock()
	defer cmdsMu.Unlock()
	if cmd, ok := activeCmds[streamKey]; ok {
		if cmd.Process != nil {
			log.Printf("Force killing FFmpeg process for stream: %s", streamKey)
			cmd.Process.Kill()
		}
		delete(activeCmds, streamKey)
	}

	// Clean up files immediately to prevent "cached" playback
	hlsDir := GetHlsDir(streamKey)
	log.Printf("Cleaning up HLS directory: %s", hlsDir)
	os.RemoveAll(hlsDir)
}

// EnsureTranscoding checks if a stream should be transcoding and starts/stops it accordingly
func EnsureTranscoding(streamKey string, shouldBeLive bool) {
	cmdsMu.Lock()
	isIngesting := activeIngests[streamKey]
	_, isRunning := activeCmds[streamKey]
	cmdsMu.Unlock()

	if shouldBeLive && isIngesting && !isRunning {
		log.Printf("Restarting transcoding for %s (Manually enabled while ingesting)", streamKey)
		startTranscoder(streamKey)
	} else if !shouldBeLive && isRunning {
		log.Printf("Stopping transcoding for %s (Manually disabled)", streamKey)
		KillStream(streamKey)
	}
}

func startTranscoder(streamKey string) {
	hlsDir := GetHlsDir(streamKey)
	if err := os.MkdirAll(hlsDir, 0755); err != nil {
		log.Printf("Failed to create HLS dir: %v", err)
		return
	}

	// 2. Start Relaxed Reaper (90s buffer)
	stopReaper := make(chan bool)
	go startSegmentReaper(hlsDir, stopReaper)

	// Detect FFmpeg Path
	ffmpegBin := "ffmpeg"
	if runtime.GOOS == "windows" {
		ffmpegBin = `C:\Users\sheha\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe`
	}

	// Use localhost with the correct port from serverAddr
	port := "1935"
	if strings.Contains(serverAddr, ":") {
		parts := strings.Split(serverAddr, ":")
		port = parts[len(parts)-1]
	}
	rtmpUrl := fmt.Sprintf("rtmp://localhost:%s/live/%s", port, streamKey)

	// FFmpeg Args - PASSTHROUGH MODE (Low CPU)
	args := []string{
		"-y",
		"-fflags", "+genpts",
		"-i", rtmpUrl,
		"-thread_queue_size", "4096",
		"-avoid_negative_ts", "make_zero",
		"-c:v", "copy",
		"-c:a", "copy",
		"-f", "hls",
		"-hls_time", "2",
		"-hls_list_size", "6",
		"-hls_flags", "delete_segments+append_list+independent_segments",
		"-hls_segment_type", "mpegts",
		"-hls_segment_filename", filepath.Join(hlsDir, "seg_%03d.ts"),
		filepath.Join(hlsDir, "index.m3u8"),
	}

	// Master Playlist
	masterPlaylist := "#EXTM3U\n" +
		"#EXT-X-VERSION:3\n" +
		"#EXT-X-STREAM-INF:BANDWIDTH=6000000,RESOLUTION=1920x1080,NAME=\"Source\"\n" +
		"index.m3u8"
	os.WriteFile(filepath.Join(hlsDir, "master.m3u8"), []byte(masterPlaylist), 0644)

	cmd := exec.Command(ffmpegBin, args...)
	// cmd.Stderr = os.Stderr // Uncomment for debugging

	cmdsMu.Lock()
	activeCmds[streamKey] = cmd
	cmdsMu.Unlock()

	go func() {
		log.Printf("FFmpeg Started for %s", streamKey)
		if err := cmd.Start(); err != nil {
			log.Printf("FFmpeg failed to start: %v", err)
			return
		}
		cmd.Wait()
		stopReaper <- true
		cmdsMu.Lock()
		if activeCmds[streamKey] == cmd {
			delete(activeCmds, streamKey)
		}
		cmdsMu.Unlock()
		log.Printf("FFmpeg Exited for %s", streamKey)
	}()
}

func NewRtmpServer(addr string) *Server {
	format.RegisterAll()
	serverAddr = addr

	s := &rtmp.Server{
		Addr: addr,
	}

	srv := &Server{
		server: s,
		queues: make(map[string]*pubsub.Queue),
		addr:   addr,
	}

	s.HandlePublish = func(conn *rtmp.Conn) {
		path := strings.TrimPrefix(conn.URL.Path, "/")
		parts := strings.Split(path, "/")
		streamKey := parts[len(parts)-1]
		if streamKey == "" {
			return
		}

		log.Printf("RTMP Publish started for key: %s", streamKey)

		cmdsMu.Lock()
		activeIngests[streamKey] = true
		queue := pubsub.NewQueue()
		srv.queues[streamKey] = queue
		cmdsMu.Unlock()

		// Check DB if it SHOULD be live
		var stream models.Stream
		models.DB.Where("stream_key = ?", streamKey).First(&stream)

		// Update DB status
		models.DB.Model(&models.Stream{}).Where("stream_key = ?", streamKey).Updates(map[string]interface{}{
			"ingest_status": "receiving",
			"is_live":       true, // Auto-set to live when OBS starts, but user can override
		})

		// Start transcoding if enabled (defaulting to true for now since we auto-set it)
		startTranscoder(streamKey)

		streams, _ := conn.Streams()
		queue.WriteHeader(streams)

		// Copy OBS to local queue
		err := avutil.CopyFile(queue, conn)
		if err != nil {
			log.Printf("Ingest loop ended for %s: %v", streamKey, err)
		}

		// Cleanup
		cmdsMu.Lock()
		activeIngests[streamKey] = false
		delete(srv.queues, streamKey)
		cmdsMu.Unlock()

		// Kill FFmpeg if it's still running
		KillStream(streamKey)

		// Update DB to OFFLINE
		models.DB.Model(&models.Stream{}).Where("stream_key = ?", streamKey).Updates(map[string]interface{}{
			"is_live":       false,
			"ingest_status": "offline",
		})
	}

	s.HandlePlay = func(conn *rtmp.Conn) {
		path := strings.TrimPrefix(conn.URL.Path, "/")
		parts := strings.Split(path, "/")
		streamKey := parts[len(parts)-1]

		cmdsMu.Lock()
		queue, ok := srv.queues[streamKey]
		cmdsMu.Unlock()

		if ok {
			cursor := queue.Latest()
			avutil.CopyFile(conn, cursor)
		}
	}

	go func() {
		log.Printf("RTMP Server listening on %s", addr)
		if err := s.ListenAndServe(); err != nil {
			log.Printf("RTMP ListenAndServe failed: %v", err)
		}
	}()

	return srv
}

func (s *Server) Start() {
	if runtime.GOOS != "windows" {
		exec.Command("pkill", "-f", "ffmpeg").Run()
	}
}

func (s *Server) Stop() {
	cmdsMu.Lock()
	defer cmdsMu.Unlock()
	for _, cmd := range activeCmds {
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
	}
}

func (s *Server) HandleFLV(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not implemented", 404)
}

func GenerateStreamKey() (string, error) {
	return uuid.New().String(), nil
}

func startSegmentReaper(dir string, stop chan bool) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			files, err := os.ReadDir(dir)
			if err != nil {
				continue
			}
			threshold := time.Now().Add(-60 * time.Second)
			for _, f := range files {
				if strings.HasSuffix(f.Name(), ".ts") {
					info, err := f.Info()
					if err == nil && info.ModTime().Before(threshold) {
						os.Remove(filepath.Join(dir, f.Name()))
					}
				}
			}
		}
	}
}
