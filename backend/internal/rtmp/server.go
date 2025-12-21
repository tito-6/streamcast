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

		args := []string{
			"-y",
			"-i", rtmpUrl,

			// HLS Configuration (4 Qualities: 1080p, 720p, 480p, 240p)
			"-filter_complex", "[0:v]split=4[v1][v2][v3][v4];[v1]scale=w=1920:h=1080[v1080];[v2]scale=w=1280:h=720[v720];[v3]scale=w=854:h=480[v480];[v4]scale=w=426:h=240[v240]",

			// Stream 0: 1080p (Full HD)
			"-map", "[v1080]", "-map", "0:a",
			"-c:v:0", "libx264", "-b:v:0", "3500k", "-maxrate:v:0", "3500k", "-bufsize:v:0", "7000k",
			"-preset", "ultrafast", "-tune", "zerolatency", "-g", "60", "-keyint_min", "60", "-sc_threshold", "0", "-r", "30",
			"-c:a:0", "aac", "-b:a:0", "192k", "-ac", "2", "-ar", "44100",

			// Stream 1: 720p (HD)
			"-map", "[v720]", "-map", "0:a",
			"-c:v:1", "libx264", "-b:v:1", "2000k", "-maxrate:v:1", "2000k", "-bufsize:v:1", "4000k",
			"-preset", "ultrafast", "-tune", "zerolatency", "-g", "60", "-keyint_min", "60", "-sc_threshold", "0", "-r", "30",
			"-c:a:1", "aac", "-b:a:1", "128k", "-ac", "2", "-ar", "44100",

			// Stream 2: 480p (SD)
			"-map", "[v480]", "-map", "0:a",
			"-c:v:2", "libx264", "-b:v:2", "1000k", "-maxrate:v:2", "1000k", "-bufsize:v:2", "2000k",
			"-preset", "ultrafast", "-tune", "zerolatency", "-g", "60", "-keyint_min", "60", "-sc_threshold", "0", "-r", "30",
			"-c:a:2", "aac", "-b:a:2", "96k", "-ac", "2", "-ar", "44100",

			// Stream 3: 240p (Low Bandwidth)
			"-map", "[v240]", "-map", "0:a",
			"-c:v:3", "libx264", "-b:v:3", "400k", "-maxrate:v:3", "400k", "-bufsize:v:3", "800k",
			"-preset", "ultrafast", "-tune", "zerolatency", "-g", "60", "-keyint_min", "60", "-sc_threshold", "0", "-r", "30",
			"-c:a:3", "aac", "-b:a:3", "64k", "-ac", "2", "-ar", "44100",

			// HLS Output settings
			"-f", "hls",
			"-hls_time", "2",
			"-hls_list_size", "6",
			"-hls_flags", "delete_segments+append_list",
			"-var_stream_map", "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p v:3,a:3,name:240p",
			"-master_pl_name", "master.m3u8",
			"-hls_segment_filename", filepath.Join(hlsDir, "%v/seg_%03d.ts"),
			filepath.Join(hlsDir, "%v/index.m3u8"),
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
