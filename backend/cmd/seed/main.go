package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"streamcast-backend/internal/models"
	"strings"
	"unicode/utf8"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func sanitizeUTF8(s string) string {
	if utf8.ValidString(s) {
		return s
	}
	var res strings.Builder
	for i := 0; i < len(s); {
		r, size := utf8.DecodeRuneInString(s[i:])
		if r == utf8.RuneError && size == 1 {
			// Skip invalid byte
			i++
			continue
		}
		res.WriteRune(r)
		i += size
	}
	return res.String()
}

type ProductionPost struct {
	ID         uint   `json:"id"`
	TitleAr    string `json:"title_ar"`
	TitleEn    string `json:"title_en"`
	TitleTr    string `json:"title_tr"`
	ContentAr  string `json:"content_ar"`
	ContentEn  string `json:"content_en"`
	ContentTr  string `json:"content_tr"`
	ImageURL   string `json:"image_url"`
	Category   string `json:"category"`
	IsFeatured bool   `json:"is_featured"`
	CreatedAt  string `json:"created_at"`
}

func makeSlug(s string) string {
	s = sanitizeUTF8(s)
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

func main() {
	// Connect to local DB
	dsn := "host=localhost user=postgres password=postgres dbname=streamcast port=5432 sslmode=disable client_encoding=UTF8"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db.AutoMigrate(&models.Post{})

	// Read JSON
	data, err := os.ReadFile("d:\\streamcast\\services\\sports_engine\\production_posts.json")
	if err != nil {
		log.Fatal("Error reading JSON file:", err)
	}

	var result struct {
		Data []ProductionPost `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		log.Fatal("Error parsing JSON:", err)
	}

	fmt.Printf("Importing %d posts...\n", len(result.Data))

	for i, p := range result.Data {
		if i >= 50 {
			break
		}
		fmt.Printf("[%d/%d] Processing Post ID: %d\n", i+1, len(result.Data), p.ID)
		slug := makeSlug(p.TitleAr)
		if slug == "" {
			slug = makeSlug(p.TitleEn)
		}
		if slug == "" {
			slug = fmt.Sprintf("post-%d", p.ID)
		}

		// Ensure slug uniqueness for this batch
		// (Simple: just append ID to slug to be safe and SEO friendly)
		slug = fmt.Sprintf("%s-%d", slug, p.ID)

		// Check if exists by ID
		var count int64
		db.Model(&models.Post{}).Where("id = ?", p.ID).Count(&count)
		if count > 0 {
			fmt.Printf("Skipping existing post (ID: %d, Slug: %s)\n", p.ID, slug)
			continue
		}

		newPost := models.Post{
			ID:              p.ID,
			TitleAr:         sanitizeUTF8(p.TitleAr),
			TitleEn:         sanitizeUTF8(p.TitleEn),
			TitleTr:         sanitizeUTF8(p.TitleTr),
			ContentAr:       sanitizeUTF8(p.ContentAr),
			ContentEn:       sanitizeUTF8(p.ContentEn),
			ContentTr:       sanitizeUTF8(p.ContentTr),
			ImageURL:        sanitizeUTF8(p.ImageURL),
			Category:        sanitizeUTF8(p.Category),
			IsFeatured:      p.IsFeatured,
			Slug:            sanitizeUTF8(slug),
			MetaTitle:       sanitizeUTF8(p.TitleAr),
			MetaDescription: sanitizeUTF8(strings.Split(p.ContentAr, "\n")[0]),
		}
		if len(newPost.MetaDescription) > 160 {
			newPost.MetaDescription = newPost.MetaDescription[:157] + "..."
		}

		if err := db.Create(&newPost).Error; err != nil {
			fmt.Printf("FAIL: Post %d (%s) - Error: %v\n", p.ID, slug, err)
			fmt.Printf("Hex TitleAr: %x\n", newPost.TitleAr)
			fmt.Printf("Hex ContentAr: %x\n", newPost.ContentAr)
		} else {
			fmt.Printf("OK: Post %d (%s)\n", p.ID, slug)
		}
	}

	fmt.Println("Migration complete!")
}
