package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"streamcast-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type InstaMedia struct {
	ID        string `json:"id"`
	Caption   string `json:"caption"`
	MediaType string `json:"media_type"`
	MediaURL  string `json:"media_url"`
	Permalink string `json:"permalink"`
}

type InstaResponse struct {
	Data []InstaMedia `json:"data"`
}

func GetInstagramFeed(c *gin.Context) {
	// 1. Get Token from Settings
	var setting models.Setting
	if err := models.DB.Where("key = ?", "instagram_token").First(&setting).Error; err != nil || setting.Value == "" {
		// Mock Data if no token
		c.JSON(http.StatusOK, gin.H{
			"source": "mock",
			"data": []gin.H{
				{"id": "1", "media_url": "https://images.unsplash.com/photo-1518091043069-c61bbc48d563?w=400&q=80", "caption": "Follow us on Instagram! @event_01s", "permalink": "https://instagram.com/event_01s"},
				{"id": "2", "media_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80", "caption": "Live coverage of major events.", "permalink": "https://instagram.com/event_01s"},
				{"id": "3", "media_url": "https://images.unsplash.com/photo-1522778119026-d647f0565c6d?w=400&q=80", "caption": "Goal of the season?", "permalink": "https://instagram.com/event_01s"},
			},
		})
		return
	}

	// 2. Fetch from Instagram API
	apiURL := fmt.Sprintf("https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink&access_token=%s", setting.Value)
	resp, err := http.Get(apiURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to Instagram"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Instagram API error"})
		return
	}

	var instaResp InstaResponse
	if err := json.NewDecoder(resp.Body).Decode(&instaResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Instagram response"})
		return
	}

	// Filter only IMAGE or CAROUSEL_ALBUM (skip VIDEO if thumbnail not available easily without other fields)
	// Actually media_url works for images.
	var cleanData []InstaMedia
	for _, m := range instaResp.Data {
		if m.MediaType == "IMAGE" || m.MediaType == "CAROUSEL_ALBUM" {
			cleanData = append(cleanData, m)
		}
		if len(cleanData) >= 3 {
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"source": "api",
		"data":   cleanData,
	})
}
