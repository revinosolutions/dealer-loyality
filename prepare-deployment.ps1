# PowerShell script to prepare Revino for Vercel deployment

Write-Host "🚀 Preparing Revino for Vercel Deployment..." -ForegroundColor Green

# Check if required files exist
Write-Host "📋 Checking required files..." -ForegroundColor Blue

$requiredFiles = @("package.json", "vercel.json", ".gitignore")

foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Host "❌ $file not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ All required files found!" -ForegroundColor Green

# Check if .env exists (it shouldn't be committed)
if (Test-Path ".env") {
    Write-Host "⚠️  WARNING: .env file found! This should not be committed to git." -ForegroundColor Yellow
    Write-Host "   Please make sure it is in .gitignore and set environment variables in Vercel dashboard." -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}

# Run linting
Write-Host "🔍 Running linter..." -ForegroundColor Blue
npm run lint

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Linting issues found. Please fix them before deploying." -ForegroundColor Yellow
}

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Your project is ready for Vercel deployment!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Push your code to GitHub" -ForegroundColor White
    Write-Host "2. Connect your repository to Vercel" -ForegroundColor White
    Write-Host "3. Set environment variables in Vercel dashboard" -ForegroundColor White
    Write-Host "4. Deploy!" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions." -ForegroundColor Cyan
} else {
    Write-Host "❌ Build failed! Please fix errors before deploying." -ForegroundColor Red
    exit 1
}
