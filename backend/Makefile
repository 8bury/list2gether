.PHONY: test test-verbose test-coverage lint lint-fix fmt vet clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  test           - Run all tests"
	@echo "  test-verbose   - Run tests with verbose output"
	@echo "  test-coverage  - Run tests with coverage report"
	@echo "  lint           - Run golangci-lint"
	@echo "  lint-fix       - Run golangci-lint with auto-fix"
	@echo "  fmt            - Format code with gofmt"
	@echo "  vet            - Run go vet"
	@echo "  clean          - Clean test cache and build artifacts"
	@echo "  all            - Run fmt, vet, lint, and test"

# Run all tests
test:
	@echo "Running tests..."
	go test ./... -race -timeout 30s

# Run tests with verbose output
test-verbose:
	@echo "Running tests (verbose)..."
	go test ./... -v -race -timeout 30s

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test ./... -race -coverprofile=coverage.out -covermode=atomic
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run golangci-lint
lint:
	@echo "Running golangci-lint..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint not found. Install it from https://golangci-lint.run/usage/install/"; \
		exit 1; \
	fi

# Run golangci-lint with auto-fix
lint-fix:
	@echo "Running golangci-lint with auto-fix..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run --fix ./...; \
	else \
		echo "golangci-lint not found. Install it from https://golangci-lint.run/usage/install/"; \
		exit 1; \
	fi

# Format code
fmt:
	@echo "Formatting code..."
	gofmt -s -w .
	go mod tidy

# Run go vet
vet:
	@echo "Running go vet..."
	go vet ./...

# Clean test cache and build artifacts
clean:
	@echo "Cleaning..."
	go clean -testcache
	rm -f coverage.out coverage.html

# Run all checks
all: fmt vet lint test
	@echo "All checks passed!"
