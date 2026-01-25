package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"streamcast-backend/internal/models"
	"strings"

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
	// 1. Check for Custom Manual Feed (Admin Overrides)
	var customSetting models.Setting
	if err := models.DB.Where("key = ?", "instagram_custom_feed").First(&customSetting).Error; err == nil && customSetting.Value != "" {
		// Try to parse as JSON first
		var customData []interface{}
		if err := json.Unmarshal([]byte(customSetting.Value), &customData); err == nil {
			c.JSON(http.StatusOK, gin.H{
				"source": "manual",
				"data":   customData,
			})
			return
		}

		// If not JSON, treat as Newline Separated URLs (User-Friendly Mode)
		// User just pastes links like: https://instagram.com/p/ABC / https://instagram.com/reels/XYZ

		lines := strings.Split(customSetting.Value, "\n")
		var parsedData []gin.H

		re := regexp.MustCompile(`/(p|reels|reel)/([^/?#&]+)`)

		for _, line := range lines {
			link := strings.TrimSpace(line)
			if link == "" {
				continue
			}

			// Try to extract shortcode
			id := "post-" + fmt.Sprintf("%d", len(parsedData))
			// Default image if shortcode not found or for placeholder
			img := "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&q=80" // Placeholder
			isVideo := false

			matches := re.FindStringSubmatch(link)
			if len(matches) > 2 {
				mType := matches[1]
				shortcode := matches[2]
				id = shortcode

				if mType == "reels" || mType == "reel" {
					isVideo = true
				}

				// Use a proxy (weserv.nl) to bypass hotlinking protection for public images
				img = fmt.Sprintf("https://images.weserv.nl/?url=https://www.instagram.com/p/%s/media/?size=l&w=600&h=800&fit=cover&default=https://via.placeholder.com/600x800", shortcode)
			}

			parsedData = append(parsedData, gin.H{
				"id":        id,
				"media_url": img,
				"caption":   "View latest update on Instagram",
				"permalink": link,
				"is_video":  isVideo,
			})
		}

		if len(parsedData) > 0 {
			c.JSON(http.StatusOK, gin.H{
				"source": "links",
				"data":   parsedData,
			})
			return
		}
	}

	// 2. Get Token from Settings
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
