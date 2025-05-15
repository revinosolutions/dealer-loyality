# Dealer Loyalty Platform - Deployment Guide

This guide provides detailed instructions for deploying the Dealer Loyalty Platform to production environments.

## Prerequisites

- Node.js (v16+)
- MongoDB (v4.4+)
- WhatsApp Business API access
- SMTP server for email notifications
- Domain name (for production deployment)
- SSL certificate (for HTTPS)

## Production Environment Setup

### 1. Server Preparation

- Use a Linux-based server (Ubuntu 20.04 LTS recommended)
- Minimum specifications:
  - 2 CPU cores
  - 4GB RAM
  - 20GB SSD storage
- Install Node.js and npm:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- Install PM2 for process management:
  ```bash
  npm install -g pm2
  ```

### 2. MongoDB Setup

#### Option 1: MongoDB Atlas (Recommended for production)

1. Create a MongoDB Atlas account
2. Set up a new cluster
3. Create a database user with appropriate permissions
4. Whitelist your server's IP address
5. Get the connection string

#### Option 2: Self-hosted MongoDB

1. Install MongoDB:
   ```bash
   sudo apt-get install -y mongodb
   ```
2. Enable and start MongoDB service:
   ```bash
   sudo systemctl enable mongodb
   sudo systemctl start mongodb
   ```
3. Secure MongoDB with authentication

### 3. Application Deployment

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dealer-loyalty-platform
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

3. Create and configure environment variables:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Update all environment variables with production values.

4. Build the frontend:
   ```bash
   npm run build
   ```

5. Seed the database (if needed):
   ```bash
   npm run seed
   ```

6. Start the application with PM2:
   ```bash
   pm2 start server/server.js --name dealer-loyalty
   ```

7. Configure PM2 to start on system boot:
   ```bash
   pm2 startup
   pm2 save
   ```

### 4. Nginx Setup (Reverse Proxy)

1. Install Nginx:
   ```bash
   sudo apt-get install -y nginx
   ```

2. Create Nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/dealer-loyalty
   ```

3. Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dealer-loyalty /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 5. SSL Configuration

1. Install Certbot:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   ```

2. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. Configure auto-renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

## WhatsApp Business API Integration

1. Register for WhatsApp Business API through Meta Business Suite
2. Complete the verification process
3. Create message templates for approval
4. Update the following environment variables:
   - `WHATSAPP_API_URL`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`

## Email Service Configuration

1. Set up an SMTP server (or use services like SendGrid, Mailgun, etc.)
2. Update the following environment variables:
   - `EMAIL_HOST`
   - `EMAIL_PORT`
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - `EMAIL_FROM`

## Monitoring and Maintenance

### Application Monitoring

1. Monitor the application with PM2:
   ```bash
   pm2 monit
   pm2 logs dealer-loyalty
   ```

2. Set up PM2 monitoring dashboard (optional):
   ```bash
   pm2 install pm2-server-monit
   pm2 install pm2-logrotate
   ```

### Database Monitoring

1. For MongoDB Atlas: Use the built-in monitoring tools
2. For self-hosted MongoDB: Set up MongoDB monitoring tools

### Backup Strategy

1. Database backups:
   ```bash
   # Create a backup script
   mongodump --uri="mongodb://username:password@localhost:27017/dealer-loyalty" --out=/backup/mongodb/$(date +"%Y-%m-%d")
   ```

2. Set up a cron job for regular backups:
   ```bash
   0 0 * * * /path/to/backup-script.sh
   ```

## Scaling Considerations

### Horizontal Scaling

1. Use a load balancer to distribute traffic across multiple application instances
2. Configure PM2 for cluster mode:
   ```bash
   pm2 start server/server.js -i max --name dealer-loyalty
   ```

### Vertical Scaling

1. Increase server resources (CPU, RAM) as needed
2. Optimize MongoDB performance with proper indexing

## Troubleshooting

### Common Issues

1. **Application won't start**:
   - Check logs: `pm2 logs dealer-loyalty`
   - Verify environment variables
   - Ensure MongoDB is accessible

2. **WhatsApp messages not sending**:
   - Verify WhatsApp API credentials
   - Check template approval status
   - Review message logs

3. **Performance issues**:
   - Monitor server resources
   - Check database query performance
   - Optimize frontend assets

## Security Checklist

- [ ] Update all default passwords
- [ ] Secure MongoDB with authentication
- [ ] Enable HTTPS
- [ ] Set secure HTTP headers
- [ ] Implement rate limiting
- [ ] Configure firewall rules
- [ ] Set up regular security updates
- [ ] Protect sensitive environment variables
- [ ] Implement proper error handling
- [ ] Validate all user inputs

## Conclusion

Following this deployment guide will help you set up a secure, scalable, and maintainable instance of the Dealer Loyalty Platform. For additional support or questions, please refer to the project documentation or contact the development team.