package main

import (
	"github.com/gin-gonic/gin"
	"github.com/8bury/list2gether/config"
)

func main() {
	router := gin.Default()
	config.InitializeDependencies(router)
	router.Run(":8080")
}
