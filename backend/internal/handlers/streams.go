package handlers

import (
	"log"
	"net/http"
	"streamcast-backend/internal/models"
	"streamcast-backend/internal/rtmp"

	"github.com/gin-gonic/gin"
)

func GetStreams(c *gin.Context) {
	var streams []models.Stream
	models.DB.Find(&streams)
	c.JSON(http.StatusOK, gin.H{"data": streams})
}

func CreateStream(c *gin.Context) {
	var input models.Stream
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key, _ := rtmp.GenerateStreamKey()
	input.StreamKey = key
	input.IngestStatus = "offline"
	input.IsLive = false
	if input.Title == "" {
		input.Title = "Untitled Stream"
	}
	// For HLS, we might generate a PlaybackID based on the ID or random
	input.PlaybackID = "hls-" + key[:8]

	models.DB.Create(&input)
	if input.ID == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stream in database"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": input})
}

func UpdateStream(c *gin.Context) {
	id := c.Param("id")
	var stream models.Stream
	if err := models.DB.First(&stream, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stream not found"})
		return
	}

	var input models.Stream
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check for transition from Live to Offline
	wasLive := stream.IsLive
	stream.Title = input.Title
	stream.Description = input.Description
	stream.SportCategory = input.SportCategory
	stream.BannerURL = input.BannerURL
	stream.ThumbnailURL = input.ThumbnailURL
	stream.OfflineBannerURL = input.OfflineBannerURL
	stream.PreMatchDetails = input.PreMatchDetails
	stream.PostMatchDetails = input.PostMatchDetails
	stream.IsLive = input.IsLive

	// If we changed visibility, notify RTMP server to start/stop transcoding
	if wasLive != stream.IsLive {
		rtmp.EnsureTranscoding(stream.StreamKey, stream.IsLive)
		if !stream.IsLive {
			stream.IngestStatus = "offline"
		} else {
			// If we manually set it to live, ingest status might still be receiving if OBS is on
			// Ingest status will be updated by the RTMP server normally
		}
	}

	models.DB.Save(&stream)
	c.JSON(http.StatusOK, gin.H{"data": stream})
}

func DeleteStream(c *gin.Context) {
	id := c.Param("id")
	var stream models.Stream
	// Fetch the stream first to get the key for cleanup
	if err := models.DB.First(&stream, id).Error; err == nil {
		log.Printf("Deleting stream %s, killing active processes for key %s", id, stream.StreamKey)
		rtmp.KillStream(stream.StreamKey)
	} else {
		log.Printf("Stream %s not found in DB, but proceeding with batch delete to be safe", id)
	}

	if err := models.DB.Delete(&models.Stream{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete stream"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": true})
}

func GetStream(c *gin.Context) {
	id := c.Param("id")
	var stream models.Stream
	if err := models.DB.First(&stream, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stream not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stream})
}

func StopStream(c *gin.Context) {
	id := c.Param("id")
	var stream models.Stream
	if err := models.DB.First(&stream, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stream not found"})
		return
	}

	stream.IsLive = false
	stream.IngestStatus = "stopped"
	stream.UpdatedAt = models.DB.NowFunc()

	// Notify RTMP server to stop transcoding
	rtmp.EnsureTranscoding(stream.StreamKey, false)

	models.DB.Save(&stream)
	c.JSON(http.StatusOK, gin.H{"data": stream, "message": "Stream stopped successfully"})
}
