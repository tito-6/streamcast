package handlers

import (
	"net/http"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/gin-gonic/gin"
)

// -- AUDITOR --

type AuditResult struct {
	Score       int      `json:"score"`
	Title       string   `json:"title"`
	TitleStatus string   `json:"title_status"` // "good", "too_short", "too_long", "missing"
	Desc        string   `json:"desc"`
	DescStatus  string   `json:"desc_status"`
	H1Count     int      `json:"h1_count"`
	H1Status    string   `json:"h1_status"`
	Images      int      `json:"images"`
	ImagesNoAlt int      `json:"images_no_alt"`
	OGTags      bool     `json:"og_tags"`
	Canonical   string   `json:"canonical"`
	Robots      string   `json:"robots"`
	Issues      []string `json:"issues"`
}

func AuditPage(c *gin.Context) {
	targetURL := c.Query("url")
	if targetURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL parameter required"})
		return
	}

	// Internal Check: If absolute URL not provided, assume localhost/internal
	// But mostly we audit live pages.
	if !strings.HasPrefix(targetURL, "http") {
		// Use internal reference if needed, but for SEO we audit public.
		// For verification, client sends full URL
	}

	resp, err := http.Get(targetURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch URL: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse HTML"})
		return
	}

	res := AuditResult{Issues: []string{}}
	score := 100

	// 1. Title Check
	res.Title = doc.Find("title").Text()
	if len(res.Title) == 0 {
		res.TitleStatus = "missing"
		score -= 20
		res.Issues = append(res.Issues, "Missing Title Tag")
	} else if len(res.Title) < 10 {
		res.TitleStatus = "too_short"
		score -= 5
		res.Issues = append(res.Issues, "Title is too short (< 10 chars)")
	} else if len(res.Title) > 60 {
		res.TitleStatus = "too_long"
		score -= 5
		res.Issues = append(res.Issues, "Title is too long (> 60 chars)")
	} else {
		res.TitleStatus = "good"
	}

	// 2. Meta Description
	res.Desc, _ = doc.Find("meta[name='description']").Attr("content")
	if len(res.Desc) == 0 {
		res.DescStatus = "missing"
		score -= 20
		res.Issues = append(res.Issues, "Missing Meta Description")
	} else if len(res.Desc) < 50 {
		res.DescStatus = "too_short"
		score -= 5
		res.Issues = append(res.Issues, "Meta Description too short (< 50 chars)")
	} else if len(res.Desc) > 160 {
		res.DescStatus = "too_long"
		score -= 5
		res.Issues = append(res.Issues, "Meta Description too long (> 160 chars)")
	} else {
		res.DescStatus = "good"
	}

	// 3. Headings
	res.H1Count = doc.Find("h1").Length()
	if res.H1Count == 0 {
		res.H1Status = "missing"
		score -= 20
		res.Issues = append(res.Issues, "No H1 Tag found")
	} else if res.H1Count > 1 {
		res.H1Status = "multiple"
		score -= 10
		res.Issues = append(res.Issues, "Multiple H1 Tags found (Should be 1)")
	} else {
		res.H1Status = "good"
	}

	// 4. Images
	doc.Find("img").Each(func(i int, s *goquery.Selection) {
		res.Images++
		alt, exists := s.Attr("alt")
		if !exists || alt == "" {
			res.ImagesNoAlt++
		}
	})
	if res.ImagesNoAlt > 0 {
		score -= (res.ImagesNoAlt * 2)
		res.Issues = append(res.Issues, "Images missing Alt text")
	}

	// 5. Open Graph
	ogTitle, _ := doc.Find("meta[property='og:title']").Attr("content")
	if ogTitle != "" {
		res.OGTags = true
	} else {
		score -= 10
		res.Issues = append(res.Issues, "Missing Open Graph Tags")
	}

	// 6. Robots / Canonical
	res.Canonical, _ = doc.Find("link[rel='canonical']").Attr("href")
	res.Robots, _ = doc.Find("meta[name='robots']").Attr("content")

	if score < 0 {
		score = 0
	}
	res.Score = score

	c.JSON(http.StatusOK, gin.H{"data": res})
}

// -- BACKLINK MONITOR --

func CheckBacklink(c *gin.Context) {
	partnerURL := c.Query("partner_url")
	// myURL := "https://sportevent.online"

	if partnerURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Partner URL required"})
		return
	}

	resp, err := http.Get(partnerURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Could not reach partner site"})
		return
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "HTML Parse Error"})
		return
	}

	found := false
	anchorText := ""
	linkUrl := ""

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists {
			// Normalize
			if strings.Contains(href, "sportevent.online") {
				found = true
				anchorText = strings.TrimSpace(s.Text())
				linkUrl = href
			}
		}
	})

	if found {
		c.JSON(http.StatusOK, gin.H{
			"status": "active",
			"anchor": anchorText,
			"link":   linkUrl,
		})
	} else {
		c.JSON(http.StatusOK, gin.H{
			"status": "not_found",
		})
	}
}
