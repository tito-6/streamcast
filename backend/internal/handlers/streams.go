package handlers

import (
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

	// Dynamic update of all allowed fields
	stream.Title = input.Title
	stream.Description = input.Description
	stream.SportCategory = input.SportCategory
	stream.BannerURL = input.BannerURL
	stream.ThumbnailURL = input.ThumbnailURL
	stream.PreMatchDetails = input.PreMatchDetails
	stream.PostMatchDetails = input.PostMatchDetails

	// Explicitly set IsLive as it's boolean
	stream.IsLive = input.IsLive

	models.DB.Save(&stream)
	c.JSON(http.StatusOK, gin.H{"data": stream})
}

func DeleteStream(c *gin.Context) {
	id := c.Param("id")
	models.DB.Delete(&models.Stream{}, id)
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

	// In a real app with joy4/avutil, we would also find the active connection in a map and close it.
	// For now, updating the DB will trigger the frontend to stop playback.

	models.DB.Save(&stream)
	c.JSON(http.StatusOK, gin.H{"data": stream, "message": "Stream stopped successfully"})
}
