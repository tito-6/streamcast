package main

import (
	"log"
	"time"

	"streamcast-backend/internal/handlers"
	"streamcast-backend/internal/models"
	"streamcast-backend/internal/rtmp"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Connect to Database
	models.ConnectDatabase()

	// 2. Start RTMP Server
	rtmpServer := rtmp.NewRtmpServer(":1935")
	rtmpServer.Start()
	defer rtmpServer.Stop()

	// 3. Setup Router
	r := gin.Default()

	// CORS Setup
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Allow all for dev
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "StreamCast API v1",
			"status":  "online",
			"rtmp":    "rtmp://localhost:1935/live",
		})
	})

	// Static Files
	r.Static("/uploads", "./uploads")
	r.Static("/api/uploads", "./uploads")

	// Live Stream (HTTP-FLV)
	r.GET("/live.flv", func(c *gin.Context) {
		rtmpServer.HandleFLV(c.Writer, c.Request)
	})

	api := r.Group("/api")
	{
		api.POST("/login", handlers.Login)
		api.POST("/seed", handlers.Seed)
		api.POST("/upload", handlers.UploadFile)

		// Archives
		api.GET("/archives", handlers.GetArchives)
		api.DELETE("/archives/:id", handlers.DeleteArchive)

		// Streams
		api.GET("/streams", handlers.GetStreams)
		api.GET("/streams/:id", handlers.GetStream)
		api.POST("/streams", handlers.CreateStream)
		api.PUT("/streams/:id", handlers.UpdateStream)
		api.DELETE("/streams/:id", handlers.DeleteStream)
		api.POST("/streams/:id/stop", handlers.StopStream)

		// Search
		api.GET("/search", handlers.SearchContent)

		// Analytics
		api.GET("/stats", handlers.GetStats)
		api.POST("/heartbeat", handlers.ViewerHeartbeat)
		api.GET("/admin/insights/realtime", handlers.GetAnalyticsRealtime)
		api.GET("/admin/insights/historical", handlers.GetAnalyticsHistorical)

		// CMS - Users
		api.GET("/users", handlers.GetUsers)
		api.POST("/users/:id/ban", handlers.ToggleBanUser)

		// CMS - Banners
		api.GET("/content/banners", handlers.GetBanners)
		api.GET("/content/active-banner", handlers.GetActiveBanner)
		api.POST("/content/banners", handlers.UpdateBanner)
		api.DELETE("/content/banners/:id", handlers.DeleteBanner)

		// CMS - Events
		api.GET("/events", handlers.GetEvents)
		api.GET("/events/:id", handlers.GetEvent)
		api.POST("/events", handlers.CreateEvent)
		api.PUT("/events/:id", handlers.UpdateEvent)
		api.DELETE("/events/:id", handlers.DeleteEvent)

		// CMS - Posts (Homepage)
		api.GET("/posts", handlers.GetPosts)
		api.GET("/posts/:id", handlers.GetPost)
		api.POST("/posts", handlers.CreatePost)
		api.PUT("/posts/:id", handlers.UpdatePost)
		api.DELETE("/posts/:id", handlers.DeletePost)

		// CMS - Ads
		api.GET("/ads", handlers.GetAds)
		api.POST("/ads", handlers.CreateAd)
		api.PUT("/ads/:id", handlers.UpdateAd)
		api.DELETE("/ads/:id", handlers.DeleteAd)

		// Settings & SEO
		api.GET("/settings", handlers.GetSettings)
		api.POST("/settings", handlers.UpdateSettings)
		api.GET("/instagram", handlers.GetInstagramFeed)

		// SEO Tools
		api.GET("/seo/audit", handlers.AuditPage)
		api.GET("/seo/backlink-check", handlers.CheckBacklink)
	}

	// Sitemap (Outside API group for root access if proxied, but backend usually serves via API)
	// We will serve it at /api/sitemap.xml and let frontend proxy it or next.js render it.
	r.GET("/sitemap.xml", handlers.GenerateSitemap)

	log.Println("HTTP Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Server startup failed:", err)
	}
}
