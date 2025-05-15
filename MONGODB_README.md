# Dealer Loyalty Platform - MongoDB Backend Setup

This guide will help you set up and run the Dealer Loyalty Platform using MongoDB as the backend database.

## Prerequisites

1. Node.js (v14 or higher)
2. MongoDB (either local installation or MongoDB Atlas account)
3. MongoDB Compass (optional, for database visualization)

## MongoDB Setup

### Option 1: Local MongoDB

1. Install MongoDB Community Edition from [MongoDB's official website](https://www.mongodb.com/try/download/community)
2. Start the MongoDB service on your machine
3. The application will connect to `mongodb://localhost:27017/dealer-loyalty` by default

### Option 2: MongoDB Atlas (Cloud)

1. Create a free MongoDB Atlas account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Set up a new cluster
3. Create a database user with read/write permissions
4. Add your IP address to the IP Access List
5. Get your connection string and update the `.env` file with your MongoDB URI

## Application Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your environment variables:
   - The application will automatically create a `.env` file with default settings
   - Modify the `.env` file with your MongoDB connection string if needed

## Running the Application

### Development Mode

To run both frontend and backend in development mode with hot reloading:

```
npm run dev:both
```

### Production Mode

To run both frontend and backend in production mode:

```
npm run build
npm run start:both
```

## Database Structure

The application uses the following main collections:

1. **Users**: Stores user information with different roles
   - Superadmin: Platform owner
   - Admin: Manufacturer representatives
   - Client: Bulk buyers
   - Dealer: Retailers

2. **Contests**: Sales and achievement competitions

3. **Products**: Product catalog

4. **Orders**: Purchase orders between clients and dealers

5. **Inventory**: Stock tracking

6. **Sales**: Sales records

7. **Achievements**: User achievement records

8. **Rewards**: Redeemable rewards for loyalty points

## API Documentation

The backend provides the following main API endpoints:

### Authentication
- POST `/api/auth/login`: User login
- POST `/api/auth/register`: User registration
- POST `/api/auth/refresh-token`: Refresh JWT token
- GET `/api/auth/me`: Get current user info
- PUT `/api/auth/profile`: Update user profile
- POST `/api/auth/logout`: User logout

### Users
- GET `/api/users`: Get all users (admin only)
- GET `/api/users/my-dealers`: Get client's dealers
- GET `/api/users/:id`: Get user by ID
- POST `/api/users`: Create new user
- PUT `/api/users/:id`: Update user
- DELETE `/api/users/:id`: Delete/deactivate user

### Contests
- GET `/api/contests`: Get all contests
- GET `/api/contests/:id`: Get contest by ID
- POST `/api/contests`: Create new contest
- PUT `/api/contests/:id`: Update contest
- POST `/api/contests/:id/join`: Join a contest
- POST `/api/contests/:id/leave`: Leave a contest
- POST `/api/contests/:id/complete`: Complete a contest

## Testing with MongoDB Compass

1. Install MongoDB Compass
2. Connect to your MongoDB instance using the connection string
3. Explore and manage your data with the graphical interface

## Default Admin Account

After initial setup, a default admin account is created with:
- Email: admin@revino.com
- Password: admin123

It's recommended to change this password after your first login.

## Troubleshooting

If you encounter any issues with the MongoDB connection:

1. Verify your MongoDB service is running
2. Check the connection string in your `.env` file
3. Ensure your IP is allowed in MongoDB Atlas (if using cloud version)
4. Check for error messages in the server logs

For any other issues, please refer to the MongoDB documentation or open an issue on our GitHub repository. 