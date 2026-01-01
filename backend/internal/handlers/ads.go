package handlers

import (
	"net/http"
	"streamcast-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetAds handles GET /api/ads
func GetAds(c *gin.Context) {
	var ads []models.Ad
	if err := models.DB.Find(&ads).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ads"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": ads})
}

// CreateAd handles POST /api/ads
func CreateAd(c *gin.Context) {
	var input models.Ad
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := models.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ad"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": input})
}

// UpdateAd handles PUT /api/ads/:id
func UpdateAd(c *gin.Context) {
	var ad models.Ad
	if err := models.DB.First(&ad, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ad not found"})
		return
	}

	var input models.Ad
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := models.DB.Model(&ad).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ad"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": ad})
}

// DeleteAd handles DELETE /api/ads/:id
func DeleteAd(c *gin.Context) {
	var ad models.Ad
	if err := models.DB.First(&ad, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ad not found"})
		return
	}
	models.DB.Delete(&ad)
	c.JSON(http.StatusOK, gin.H{"message": "Ad deleted"})
}
