package main

import (
	"log"

	"github.com/8bury/list2gether/config"
	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()
	config.InitializeDependencies(router)
	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

