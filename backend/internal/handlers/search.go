package handlers

import (
	"net/http"
	"streamcast-backend/internal/models"
	"strings"

	"github.com/gin-gonic/gin"
)

// SearchContent searches across Posts, Events, and Streams
func SearchContent(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	query = strings.ToLower(query)
	searchPattern := "%" + query + "%"

	var posts []models.Post
	var events []models.Event
	var streams []models.Stream

	// perform search
	models.DB.Where("LOWER(title) LIKE ? OR LOWER(content) LIKE ?", searchPattern, searchPattern).Find(&posts)
	models.DB.Where("LOWER(title) LIKE ? OR LOWER(team_home) LIKE ? OR LOWER(team_away) LIKE ?", searchPattern, searchPattern, searchPattern).Find(&events)
	models.DB.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern).Find(&streams)

	c.JSON(http.StatusOK, gin.H{
		"posts":   posts,
		"events":  events,
		"streams": streams,
	})
}
