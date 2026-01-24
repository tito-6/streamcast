package handlers

import (
	"net/http"
	"streamcast-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// -- SETTINGS --

func GetSettings(c *gin.Context) {
	var settings []models.Setting
	models.DB.Find(&settings)

	// Convert to map for easier frontend consumption
	settingMap := make(map[string]string)
	for _, s := range settings {
		settingMap[s.Key] = s.Value
	}

	c.JSON(http.StatusOK, gin.H{"data": settingMap})
}

func UpdateSettings(c *gin.Context) {
	var input map[string]string
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for key, value := range input {
		var setting models.Setting
		// Upsert
		if err := models.DB.Where("key = ?", key).First(&setting).Error; err != nil {
			// Create
			models.DB.Create(&models.Setting{Key: key, Value: value, Type: "string"})
		} else {
			// Update
			setting.Value = value
			models.DB.Save(&setting)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
}
