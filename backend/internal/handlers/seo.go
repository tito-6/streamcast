package handlers

import (
	"encoding/xml"
	"fmt"
	"streamcast-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
)

// Sitemap Logic

type SitemapURL struct {
	Loc        string `xml:"loc"`
	LastMod    string `xml:"lastmod"`
	ChangeFreq string `xml:"changefreq"`
	Priority   string `xml:"priority"`
}

type UrlSet struct {
	XMLName xmlns        `xml:"urlset"`
	Xmlns   string       `xml:"xmlns,attr"`
	URLs    []SitemapURL `xml:"url"`
}

type xmlns struct{}

func GenerateSitemap(c *gin.Context) {
	// Base URL should ideally be from settings, defaulting for now
	baseURL := "https://sportevent.online"

	var urls []SitemapURL

	// 1. Static Pages
	urls = append(urls, SitemapURL{Loc: baseURL + "/", LastMod: time.Now().Format("2006-01-02"), ChangeFreq: "daily", Priority: "1.0"})
	urls = append(urls, SitemapURL{Loc: baseURL + "/archive", LastMod: time.Now().Format("2006-01-02"), ChangeFreq: "weekly", Priority: "0.8"})

	// 2. Posts (Dynamic)
	var posts []models.Post
	models.DB.Find(&posts)
	for _, p := range posts {
		slug := p.Slug
		if slug == "" {
			slug = fmt.Sprintf("%d", p.ID)
		}
		urls = append(urls, SitemapURL{
			Loc:        fmt.Sprintf("%s/posts/%s", baseURL, slug),
			LastMod:    p.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "weekly",
			Priority:   "0.7",
		})
	}

	// 3. Events (Dynamic)
	var events []models.Event
	models.DB.Find(&events)
	for _, e := range events {
		urls = append(urls, SitemapURL{
			Loc:        fmt.Sprintf("%s/events/%d", baseURL, e.ID),
			LastMod:    e.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "weekly",
			Priority:   "0.6",
		})
	}

	output := UrlSet{
		Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}

	c.Writer.Header().Set("Content-Type", "application/xml")
	x, _ := xml.MarshalIndent(output, "", "  ")
	c.Writer.Write([]byte(xml.Header + string(x)))
}
