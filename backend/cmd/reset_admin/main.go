package main

import (
	"fmt"
	"log"
	"os"
	"streamcast-backend/internal/models"
)

func main() {
	// Set env to match what running app likely uses, though db.go has fallback
	os.Setenv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=streamcast port=5432 sslmode=disable")

	models.ConnectDatabase()

	var user models.User
	// Try to find the user
	if err := models.DB.Where("username = ?", "admin").First(&user).Error; err != nil {
		fmt.Println("User 'admin' not found. Creating...")
		user = models.User{
			Username: "admin",
			Password: "admin",
			Role:     "admin",
		}
		if err := models.DB.Create(&user).Error; err != nil {
			log.Fatal(err)
		}
	} else {
		fmt.Println("User 'admin' found. Updating password...")
		user.Password = "admin"
		if err := models.DB.Save(&user).Error; err != nil {
			log.Fatal(err)
		}
	}

	fmt.Println("---------------------------------------------------")
	fmt.Println("SUCCESS: User 'admin' password set to 'admin'")
	fmt.Println("---------------------------------------------------")
}
