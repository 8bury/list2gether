package main

import (
	"github.com/8bury/list2gether/config"
	"github.com/gin-gonic/gin"
)

func main() {
	_ = gin.Default()

	_ = config.ConnectDatabase()

}
