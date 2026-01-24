package handlers

import (
	"net/http"
	"regexp"
	"strconv"
	"streamcast-backend/internal/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func makeSlug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	// Replace spaces with dashes
	s = strings.ReplaceAll(s, " ", "-")
	// Remove invalid chars (allow letters, numbers, arabic chars, dashes)
	reg, _ := regexp.Compile(`[^a-zA-Z0-9\p{Arabic}\-]+`)
	s = reg.ReplaceAllString(s, "")
	// Clean up multiple dashes
	reg2, _ := regexp.Compile(`-+`)
	s = reg2.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func GetPosts(c *gin.Context) {
	var posts []models.Post
	models.DB.Order("created_at desc").Find(&posts)
	c.JSON(http.StatusOK, gin.H{"data": posts})
}

func GetPost(c *gin.Context) {
	param := c.Param("id")
	var post models.Post
	var err error

	// Try numeric ID first
	if _, errConv := strconv.Atoi(param); errConv == nil {
		err = models.DB.First(&post, param).Error
	} else {
		// Try slug
		err = models.DB.Where("slug = ?", param).First(&post).Error
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": post})
}

func CreatePost(c *gin.Context) {
	var input models.Post
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate Slug
	baseTitle := input.TitleEn
	if baseTitle == "" {
		baseTitle = input.TitleAr
	}
	input.Slug = makeSlug(baseTitle)

	// Ensure uniqueness (simple append)
	var count int64
	originalSlug := input.Slug
	for {
		models.DB.Model(&models.Post{}).Where("slug = ?", input.Slug).Count(&count)
		if count == 0 {
			break
		}
		input.Slug = originalSlug + "-" + strconv.FormatInt(time.Now().Unix(), 10) // append timestamp if collision
	}

	models.DB.Create(&input)
	c.JSON(http.StatusOK, gin.H{"data": input})
}

func UpdatePost(c *gin.Context) {
	id := c.Param("id")
	var post models.Post
	if err := models.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	var input models.Post
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update Slug if title changes (optional, but requested for SEO)
	// Only if slug is empty or we want to force update. Let's force update if TitleEn/Ar changes.
	baseTitle := input.TitleEn
	if baseTitle == "" {
		baseTitle = input.TitleAr
	}
	newSlug := makeSlug(baseTitle)
	if newSlug != "" && newSlug != post.Slug {
		input.Slug = newSlug
	}

	models.DB.Model(&post).Updates(input)
	c.JSON(http.StatusOK, gin.H{"data": post})
}

func DeletePost(c *gin.Context) {
	id := c.Param("id")
	models.DB.Delete(&models.Post{}, id)
	c.JSON(http.StatusOK, gin.H{"data": true})
}
