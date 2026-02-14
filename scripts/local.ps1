[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("help", "setup", "backend-ci", "frontend-ci", "ci", "dev")]
    [string]$Action = "help"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-External {
    param(
        [string]$FilePath,
        [string[]]$Arguments
    )
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        $joinedArgs = $Arguments -join " "
        throw "Command failed: $FilePath $joinedArgs (exit code: $LASTEXITCODE)"
    }
}

function Invoke-BackendSetup {
    Write-Step "Downloading backend dependencies"
    Push-Location $backendDir
    try {
        Invoke-External "go" @("mod", "download")
    }
    finally {
        Pop-Location
    }
}

function Invoke-FrontendSetup {
    Write-Step "Installing frontend dependencies"
    Push-Location $frontendDir
    try {
        Invoke-External "npm" @("ci")
    }
    finally {
        Pop-Location
    }
}

function Invoke-BackendCI {
    Write-Step "Running backend tests (race + coverage)"
    Push-Location $backendDir
    try {
        Invoke-External "go" @("test", "./...", "-race", "-coverprofile=coverage.out", "-covermode=atomic", "-timeout", "30s")
    }
    finally {
        Pop-Location
    }
}

function Invoke-FrontendCI {
    Write-Step "Running frontend lint"
    Push-Location $frontendDir
    try {
        Invoke-External "npm" @("run", "lint")
        Write-Step "Running frontend build"
        Invoke-External "npm" @("run", "build")
    }
    finally {
        Pop-Location
    }
}

function Quote-Single {
    param([string]$Value)
    return $Value.Replace("'", "''")
}

function Start-DevWindows {
    Write-Step "Starting backend and frontend in new PowerShell windows"

    $safeBackendDir = Quote-Single $backendDir
    $safeFrontendDir = Quote-Single $frontendDir

    $backendCommand = "Set-Location '$safeBackendDir'; go run main.go"
    $frontendCommand = "Set-Location '$safeFrontendDir'; npm run dev"

    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand | Out-Null
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand | Out-Null

    Write-Host "Backend:  http://localhost:8080"
    Write-Host "Frontend: http://localhost:5173"
}

function Show-Help {
    Write-Host "Usage:"
    Write-Host "  .\scripts\local.cmd <action>"
    Write-Host "  .\scripts\local.ps1 <action>"
    Write-Host ""
    Write-Host "Actions:"
    Write-Host "  help         Show this help"
    Write-Host "  setup        Install local dependencies (Go + npm)"
    Write-Host "  backend-ci   Run backend tests (same profile used in CI)"
    Write-Host "  frontend-ci  Run frontend lint + build"
    Write-Host "  ci           Run backend-ci and frontend-ci"
    Write-Host "  dev          Start backend and frontend in separate windows"
}

switch ($Action) {
    "help" {
        Show-Help
    }
    "setup" {
        Assert-Command "go"
        Assert-Command "npm"
        Invoke-BackendSetup
        Invoke-FrontendSetup
    }
    "backend-ci" {
        Assert-Command "go"
        Invoke-BackendCI
    }
    "frontend-ci" {
        Assert-Command "npm"
        Invoke-FrontendCI
    }
    "ci" {
        Assert-Command "go"
        Assert-Command "npm"
        Invoke-BackendCI
        Invoke-FrontendCI
    }
    "dev" {
        Assert-Command "go"
        Assert-Command "npm"
        Start-DevWindows
    }
}
