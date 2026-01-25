package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	resp, _ := http.Get("http://localhost:8080/api/posts")
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data []interface{} `json:"data"`
	}
	json.Unmarshal(body, &result)
	fmt.Printf("DB now contains %d posts\n", len(result.Data))
}
