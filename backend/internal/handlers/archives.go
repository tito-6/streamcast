package handlers

import (
	"net/http"
	"streamcast-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetArchives returns a list of archived streams
func GetArchives(c *gin.Context) {
	var archives []models.Archive
	if result := models.DB.Order("created_at desc").Find(&archives); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": archives})
}

// DeleteArchive deletes an archive entry and its file
// NOTE: File deletion not implemented for safety, just DB entry.
func DeleteArchive(c *gin.Context) {
	id := c.Param("id")
	if result := models.DB.Delete(&models.Archive{}, id); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Archive deleted"})
}
