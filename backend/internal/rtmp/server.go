package rtmp

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"streamcast-backend/internal/models"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nareix/joy4/av/avutil"
	"github.com/nareix/joy4/av/pubsub"
	"github.com/nareix/joy4/format/flv"
	"github.com/nareix/joy4/format/rtmp"
)

type Server struct {
	server *rtmp.Server
	queue  *pubsub.Queue
	lock   sync.Mutex
}

func NewRtmpServer(port string) *Server {
	s := &rtmp.Server{
		Addr: ":" + port,
	}

	srv := &Server{
		server: s,
		queue:  pubsub.NewQueue(),
	}

	s.HandlePublish = func(conn *rtmp.Conn) {
		log.Println("RTMP Publish connected from", conn.NetConn().RemoteAddr())
		log.Println("Stream Key/Path:", conn.URL.Path)

		// 1. Prepare Directory Structure (HLS Scaffolding)
		// FORCE 'test' key to match frontend hardcoding
		// irrespective of what OBS sends.
		streamKey := "test"

		hlsDir := filepath.Join("/var/www/hls", streamKey)

		// CLEANUP: Remove old HLS data to prevent "ghost" streams
		if err := os.RemoveAll(hlsDir); err != nil {
			log.Printf("Warning: Failed to clean HLS dir %s: %v", hlsDir, err)
		}

		if err := os.MkdirAll(hlsDir, 0755); err != nil {
			log.Printf("CRITICAL: Failed to create HLS directory %s: %v", hlsDir, err)
			return
		}

		// 2. Simplified FFmpeg Command (Single Bitrate for Stability)
		// We pipe stderr to a buffer to log it if it fails instantly, or stream it.
		// For production, streaming stderr to logs is better.
		ffmpegBinary := "ffmpeg"
		rtmpUrl := "rtmp://localhost:1935" + conn.URL.Path

		// Prepare FFmpeg
		time.Sleep(3 * time.Second) // Wait for stream to stabilize

		// Multi-Bitrate ABR Command
		ffmpegBinary = "ffmpeg"
		rtmpUrl = "rtmp://localhost:1935" + conn.URL.Path

		// PASSTHROUGH MODE - NO TRANSCODING (Trust OBS Quality)
		// This eliminates CPU bottleneck and preserves source quality
		args := []string{
			"-y",
			"-i", rtmpUrl,
			"-thread_queue_size", "2048", // Large input buffer for stability

			// PASSTHROUGH: Copy video and audio directly (NO RE-ENCODING)
			"-c:v", "copy", // Copy video codec as-is from OBS
			"-c:a", "copy", // Copy audio codec as-is from OBS

			// HLS Output Settings - OPTIMIZED FOR LOW LATENCY & HIGH CONCURRENCY
			"-f", "hls",
			"-hls_time", "1", // 1 second segments (low latency)
			"-hls_list_size", "5", // Keep only 5 segments in playlist (minimal memory)
			"-hls_flags", "delete_segments+append_list+independent_segments",
			"-hls_segment_type", "mpegts",
			"-hls_segment_filename", filepath.Join(hlsDir, "seg_%03d.ts"),
			filepath.Join(hlsDir, "index.m3u8"),
		}

		// 4. Archive & VOD Setup
		archiveDir := "/var/www/archive"
		archiveFilename := fmt.Sprintf("archive_%s_%d.mp4", streamKey, time.Now().Unix())
		archivePath := filepath.Join(archiveDir, archiveFilename)

		// Add MP4 recording output mapping [v1080_archive] to file
		// Note: We are re-encoding for the archive to ensure single file compatibility.
		// Alternatively, we could map [0:v] directly but we want 1080p specifically if available (or source).
		// Let's use [v1080_archive] and [0:a].
		args = append(args,
			"-map", "0:v", "-map", "0:a",
			"-c:v:4", "copy", "-c:a:4", "copy",
			archivePath,
		)

		cmd := exec.Command(ffmpegBinary, args...)

		// 3. Deep Logging: Pipe Stderr to Go logs
		stderrPipe, err := cmd.StderrPipe()
		if err != nil {
			log.Println("Failed to open stderr pipe for FFmpeg:", err)
		} else {
			// Spawn a goroutine to read stderr
			go func() {
				// We can use a scanner or just copy to os.Stderr
				// Log prefixing for clarity
				buf := make([]byte, 1024)
				for {
					n, err := stderrPipe.Read(buf)
					if n > 0 {
						log.Printf("[FFMPEG %s] %s", streamKey, string(buf[:n]))
					}
					if err != nil {
						break
					}
				}
			}()
		}

		// 4. Process Management & Zombie Prevention
		startTime := time.Now()
		if err := cmd.Start(); err != nil {
			log.Printf("CRITICAL: Failed to start FFmpeg for key %s: %v", streamKey, err)
		} else {
			log.Printf("FFmpeg started for stream %s (PID: %d)", streamKey, cmd.Process.Pid)

			// Master creation is handled by ffmpeg now (-master_pl_name)

			// Wait Routine (Cleanup & Archiving)
			go func() {
				err := cmd.Wait() // Blocking wait ensures zombie process is reaped
				if err != nil {
					log.Printf("FFmpeg process for %s exited with error: %v", streamKey, err)
				} else {
					log.Printf("FFmpeg process for %s exited clean.", streamKey)

					// Register Archive in DB
					duration := time.Since(startTime).String() // Approx duration
					fileInfo, err := os.Stat(archivePath)
					var fileSize int64 = 0
					if err == nil {
						fileSize = fileInfo.Size()
						log.Printf("Archive created: %s (%d bytes)", archivePath, fileSize)

						// Create Archive Entry
						archiveEntry := models.Archive{ // Assumes we added Archive to models
							Title:     fmt.Sprintf("Live Stream %s", time.Now().Format("2006-01-02 15:04")),
							FilePath:  "/archive/" + archiveFilename, // Web path
							Duration:  duration,
							FileSize:  fileSize,
							CreatedAt: time.Now(),
						}

						if models.DB != nil {
							if result := models.DB.Create(&archiveEntry); result.Error != nil {
								log.Printf("Failed to save archive to DB: %v", result.Error)
							} else {
								log.Printf("Archive saved to DB with ID: %d", archiveEntry.ID)
							}
						}
					}
				}

				// Optional: Cleanup HLS files on stop?
				// os.RemoveAll(hlsDir) // Maybe keep for VOD?
			}()
		}

		// 5. Standard RTMP Handlers
		streams, _ := conn.Streams()
		srv.queue.WriteHeader(streams)
		avutil.CopyFile(srv.queue, conn)

		// Cleanup when RTMP connection drops
		log.Printf("RTMP Source %s disconnected, killing FFmpeg...", streamKey)
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}

		srv.queue.Close()
		srv.queue = pubsub.NewQueue()
	}

	s.HandlePlay = func(conn *rtmp.Conn) {
		cursor := srv.queue.Latest()
		avutil.CopyFile(conn, cursor)
	}

	return srv
}

func (s *Server) Start() {
	// Start RTMP Listener
	go func() {
		log.Println("RTMP Server listening on", s.server.Addr)
		if err := s.server.ListenAndServe(); err != nil {
			log.Println("RTMP Server Error:", err)
		}
	}()

	// Start HTTP-FLV Handler
	// We will attach this to the default http mux since we are running in the same process,
	// but main.go sets up a separate Gin router.
	// We should expose a method to register the handler or start a separate HTTP listener for video.
	// For simplicity, let's start a dedicated video port on :8081 if possible, or assume main.go will call us.
	// Actually, main.go uses Gin. We can provide a Gin handler.
}

func (s *Server) HandleFLV(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "video/x-flv")
	w.Header().Set("Transfer-Encoding", "chunked")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(200)

	flvWriter := flv.NewMuxer(w)
	cursor := s.queue.Latest()

	avutil.CopyFile(flvWriter, cursor)
}

func (s *Server) Stop() {
}

func GenerateStreamKey() (string, error) {
	return "live_" + uuid.New().String(), nil
}
