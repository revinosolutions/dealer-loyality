# Dealer Loyalty Platform

A comprehensive platform for managing dealer loyalty programs, contests, sales tracking, and WhatsApp notifications.

## Project Structure

```
├── server/
│   ├── server.js    # Express server setup
│   ├── config.js    # Configuration settings
│   └── db.js        # Database connection
├── models/
│   ├── User.js      # User model (super_admin, client, dealer)
│   ├── Contest.js   # Contest model for loyalty programs
│   └── Sales.js     # Sales tracking model
├── routes/
│   ├── auth.js      # Authentication routes
│   ├── contests.js  # Contest management routes
│   └── sales.js     # Sales data and leaderboard routes
├── middleware/
│   └── auth.js      # Authentication middleware
└── .env            # Environment configuration
```

## Features

- User Authentication (JWT-based)
- Role-based Authorization (super_admin, client, dealer)
- Contest Management
- Sales Tracking
- Leaderboard System
- Points and Rewards System
- Multi-channel Notifications (App, Email, WhatsApp)
- WhatsApp Business API Integration
- Achievement System
- Reward Redemption

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the variables as needed

3. Start MongoDB:
   - Ensure MongoDB is running locally
   - Default connection: mongodb://localhost:27017/dealer-loyalty

4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- POST /api/auth/login - User login
- POST /api/auth/register - User registration
- GET /api/auth/me - Get current user

### WhatsApp Integration
- POST /api/whatsapp/send - Send WhatsApp message
- GET /api/whatsapp/templates - Get available WhatsApp templates
- POST /api/whatsapp/webhook - Webhook for WhatsApp status updates

### Notifications
- GET /api/notifications - Get user notifications
- GET /api/notifications/:id - Get notification by ID
- POST /api/notifications - Create new notification
- PUT /api/notifications/:id/read - Mark notification as read

### Contests
- GET /api/contests - List all contests
- POST /api/contests - Create new contest
- GET /api/contests/:id - Get contest details
- PUT /api/contests/:id - Update contest
- DELETE /api/contests/:id - Delete contest

### Sales
- GET /api/sales/data - Get sales data (daily/weekly/monthly)
- GET /api/sales/leaderboard - Get dealer leaderboard

## Integration Points

1. **User Authentication Flow**
   - JWT token generation on login/register
   - Token verification middleware
   - Role-based access control

2. **Contest Management**
   - Contest creation by clients
   - Progress tracking
   - Reward distribution

3. **Sales Tracking**
   - Sales data recording
   - Points calculation
   - Leaderboard updates

4. **WhatsApp Integration**
   - Send notifications via WhatsApp Business API
   - Template-based messaging
   - Delivery status tracking
   - User preference management for notifications

## Security Measures

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- CORS configuration

## Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/dealer-loyalty

# JWT Configuration
JWT_SECRET=your-secret-key

# WhatsApp Business API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
MONGODB_URI=mongodb://localhost:27017/dealer-loyalty

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```#
