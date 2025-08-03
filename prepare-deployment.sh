#!/bin/bash

echo "🚀 Preparing Revino for Vercel Deployment..."

# Check if required files exist
echo "📋 Checking required files..."

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found!"
    exit 1
fi

if [ ! -f ".gitignore" ]; then
    echo "❌ .gitignore not found!"
    exit 1
fi

echo "✅ All required files found!"

# Check if .env exists (it shouldn't be committed)
if [ -f ".env" ]; then
    echo "⚠️  WARNING: .env file found! This should not be committed to git."
    echo "   Please make sure it's in .gitignore and set environment variables in Vercel dashboard."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run linting
echo "🔍 Running linter..."
npm run lint

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Your project is ready for Vercel deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Push your code to GitHub"
    echo "2. Connect your repository to Vercel"
    echo "3. Set environment variables in Vercel dashboard"
    echo "4. Deploy!"
    echo ""
    echo "📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions."
else
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi
