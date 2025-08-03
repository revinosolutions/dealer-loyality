# Vercel Deployment Guide for Revino Dealer Loyalty Platform

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup
Before deploying to Vercel, you need to set up the following environment variables in your Vercel dashboard:

**Required Variables:**
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - A strong secret key for JWT tokens
- `FRONTEND_URL` - Your Vercel app URL (e.g., https://your-app.vercel.app)
- `NODE_ENV` - Set to "production"

**Optional Variables:**
- `WHATSAPP_API_URL` - WhatsApp Business API URL
- `WHATSAPP_PHONE_NUMBER_ID` - Your WhatsApp phone number ID
- `WHATSAPP_ACCESS_TOKEN` - Your WhatsApp access token
- `EMAIL_HOST` - SMTP server for email notifications
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - Email username
- `EMAIL_PASS` - Email password
- `EMAIL_FROM` - From email address

### 2. MongoDB Atlas Setup
1. Create a MongoDB Atlas account at https://cloud.mongodb.com/
2. Create a new cluster
3. Create a database user
4. Whitelist all IP addresses (0.0.0.0/0) for Vercel
5. Get your connection string and add it to `MONGODB_URI`

### 3. Project Configuration
Make sure these files are properly configured:
- ✅ `.gitignore` - Updated to exclude sensitive files
- ✅ `vercel.json` - Vercel configuration file
- ✅ `package.json` - Build scripts configured
- ✅ `.env.example` - Template for environment variables

## 🚀 Deployment Steps

### Method 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com/
   - Sign up/Login with your GitHub account
   - Click "New Project"
   - Import your repository

3. **Configure Environment Variables:**
   - In Vercel dashboard, go to your project
   - Navigate to "Settings" > "Environment Variables"
   - Add all required environment variables from `.env.example`

4. **Deploy:**
   - Vercel will automatically deploy your app
   - You'll get a URL like `https://your-app.vercel.app`

### Method 2: Deploy with Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## 🔧 Project Structure for Vercel

Your project is configured as a **full-stack application** with:

- **Frontend**: React + TypeScript + Vite (builds to `/dist`)
- **Backend**: Node.js + Express API (in `/server`)
- **Database**: MongoDB Atlas (cloud database)

## 📁 Important Files Created/Updated

### `.gitignore`
- Comprehensive ignore patterns for Node.js, React, and deployment
- Excludes sensitive files like `.env`, `node_modules`, build artifacts
- Optimized for Vercel deployment

### `vercel.json`
- Configures Vercel to handle both frontend and API routes
- Sets up proper routing for React SPA
- Configures CORS headers for API endpoints
- Specifies Node.js runtime version

### `.env.example`
- Template for all required environment variables
- Production-ready configuration examples
- Security best practices included

## 🔒 Security Considerations

1. **Never commit `.env` files** - They're ignored in `.gitignore`
2. **Use strong JWT secrets** - Generate random, long strings
3. **Whitelist domains** - Update CORS settings for production
4. **Use HTTPS** - Vercel provides SSL certificates automatically
5. **Secure database** - Use MongoDB Atlas with proper authentication

## 🐛 Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:** Make sure all dependencies are in `package.json` and run `npm install`

### Issue: API routes not working
**Solution:** Check `vercel.json` routing configuration and API endpoint paths

### Issue: Database connection fails
**Solution:** 
- Verify MongoDB Atlas connection string
- Check IP whitelist settings (allow 0.0.0.0/0 for Vercel)
- Ensure database user has proper permissions

### Issue: Environment variables not loading
**Solution:**
- Set variables in Vercel dashboard, not in code
- Redeploy after adding new environment variables
- Check variable names match exactly

## 📈 Post-Deployment

After successful deployment:

1. **Test all features:**
   - User authentication
   - Database operations
   - API endpoints
   - File uploads (if any)

2. **Monitor performance:**
   - Check Vercel Analytics
   - Monitor database usage
   - Watch for errors in Vercel logs

3. **Update DNS (if using custom domain):**
   - Add custom domain in Vercel dashboard
   - Update DNS records at your domain provider

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas](https://cloud.mongodb.com/)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review MongoDB Atlas logs
3. Test API endpoints with tools like Postman
4. Check browser console for frontend errors

---

**🎉 Your Revino Dealer Loyalty Platform is now ready for production deployment on Vercel!**
