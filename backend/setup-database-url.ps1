# Script to add DATABASE_URL to .env file
$envFile = ".env"
$databaseUrl = "postgresql://postgres:AYr%3F6-65%26wb5e*%24@db.yhdgadyquizxrfmehkno.supabase.co:5432/postgres"

# Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Run .\setup-env.ps1 first to create .env from .env.example" -ForegroundColor Yellow
    exit 1
}

# Read current .env content
$content = Get-Content $envFile -Raw

# Check if DATABASE_URL already exists
if ($content -match "DATABASE_URL\s*=") {
    Write-Host "DATABASE_URL already exists in .env file" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Current DATABASE_URL line:" -ForegroundColor Cyan
    Get-Content $envFile | Select-String "DATABASE_URL"
    Write-Host ""
    $response = Read-Host "Do you want to replace it? (y/n)"
    if ($response -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    # Replace existing DATABASE_URL
    $content = $content -replace "DATABASE_URL\s*=.*", "DATABASE_URL=$databaseUrl"
} else {
    # Add DATABASE_URL at the beginning
    $content = "DATABASE_URL=$databaseUrl`n`n" + $content
}

# Write back to file
Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "SUCCESS: DATABASE_URL added to .env file" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying..." -ForegroundColor Cyan
node check-env.js

