# UAOL Backend - Environment Setup Script
# This script copies .env.example to .env if it doesn't exist

$envExample = ".env.example"
$envFile = ".env"

if (Test-Path $envFile) {
    Write-Host "WARNING: .env file already exists!" -ForegroundColor Yellow
    Write-Host "If you want to reset it, delete .env and run this script again." -ForegroundColor Yellow
} else {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "SUCCESS: Created .env file from .env.example" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Edit .env and update the configuration values" -ForegroundColor White
        Write-Host "   2. At minimum, set DATABASE_URL if using a local database" -ForegroundColor White
        Write-Host "   3. Set JWT_SECRET to a secure random string" -ForegroundColor White
    } else {
        Write-Host "ERROR: .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

