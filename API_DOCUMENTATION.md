# Dealer Loyalty Platform - API Documentation

This document provides detailed information about all API endpoints available in the Dealer Loyalty Platform.

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:5000/api
```

For production, replace with your domain name.

## Authentication

Most API endpoints require authentication using JWT tokens.

### Headers

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All responses are returned in JSON format with the following structure for successful requests:

```json
{
  "data": { ... },  // Response data
  "message": "Success message"
}
```

For errors:

```json
{
  "message": "Error message",
  "errors": [ ... ]  // Optional array of validation errors
}
```

## API Endpoints

### Authentication

#### Login

```
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "dealer"
  }
}
```

#### Register

```
POST /auth/register
```

**Request Body:**

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "dealer",
  "phone": "+1234567890"
}
```

**Response:**

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "New User",
    "email": "newuser@example.com",
    "role": "dealer"
  }
}
```

#### Get Current User

```
GET /auth/me
```

**Response:**

```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "dealer",
    "phone": "+1234567890",
    "points": 1500,
    "notificationPreferences": {
      "app": true,
      "email": true,
      "whatsapp": true
    }
  }
}
```

#### Update Profile

```
PUT /auth/profile
```

**Request Body:**

```json
{
  "name": "Updated Name",
  "phone": "+9876543210",
  "avatar": "/images/avatars/custom.png"
}
```

**Response:**

```json
{
  "user": {
    "id": "user_id",
    "name": "Updated Name",
    "email": "user@example.com",
    "phone": "+9876543210",
    "avatar": "/images/avatars/custom.png"
  },
  "message": "Profile updated successfully"
}
```

### Contests

#### List All Contests

```
GET /contests
```

**Query Parameters:**

- `status` (optional): Filter by status (active, completed, upcoming)
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**

```json
{
  "contests": [
    {
      "id": "contest_id",
      "title": "Summer Sales Challenge",
      "description": "Achieve the highest sales during the summer season",
      "startDate": "2023-06-01T00:00:00.000Z",
      "endDate": "2023-08-31T00:00:00.000Z",
      "goal": "Reach 50,000 in sales",
      "goalType": "sales_amount",
      "targetValue": 50000,
      "progress": 65,
      "status": "active",
      "approvalStatus": "approved"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

#### Create Contest

```
POST /contests
```

**Request Body:**

```json
{
  "title": "New Contest",
  "description": "Contest description",
  "startDate": "2023-10-01T00:00:00.000Z",
  "endDate": "2023-12-31T00:00:00.000Z",
  "goal": "Reach 30,000 in sales",
  "goalType": "sales_amount",
  "targetValue": 30000,
  "rewards": [
    { "position": 1, "description": "First prize", "pointsValue": 5000 },
    { "position": 2, "description": "Second prize", "pointsValue": 3000 }
  ]
}
```

**Response:**

```json
{
  "contest": {
    "id": "contest_id",
    "title": "New Contest",
    "description": "Contest description",
    "startDate": "2023-10-01T00:00:00.000Z",
    "endDate": "2023-12-31T00:00:00.000Z",
    "goal": "Reach 30,000 in sales",
    "goalType": "sales_amount",
    "targetValue": 30000,
    "approvalStatus": "pending",
    "rewards": [
      { "position": 1, "description": "First prize", "pointsValue": 5000 },
      { "position": 2, "description": "Second prize", "pointsValue": 3000 }
    ]
  },
  "message": "Contest created successfully and pending approval"
}
```

#### Get Contest Details

```
GET /contests/:id
```

**Response:**

```json
{
  "contest": {
    "id": "contest_id",
    "title": "Summer Sales Challenge",
    "description": "Achieve the highest sales during the summer season",
    "startDate": "2023-06-01T00:00:00.000Z",
    "endDate": "2023-08-31T00:00:00.000Z",
    "goal": "Reach 50,000 in sales",
    "goalType": "sales_amount",
    "targetValue": 50000,
    "progress": 65,
    "status": "active",
    "approvalStatus": "approved",
    "createdBy": {
      "id": "user_id",
      "name": "Client Name"
    },
    "rewards": [
      { "position": 1, "description": "First prize", "pointsValue": 5000 },
      { "position": 2, "description": "Second prize", "pointsValue": 3000 },
      { "position": 3, "description": "Third prize", "pointsValue": 2000 }
    ],
    "participants": [
      {
        "userId": "user_id",
        "name": "Dealer Name",
        "progress": 75,
        "currentPosition": 1
      }
    ]
  }
}
```

### Sales

#### Record New Sale

```
POST /sales
```

**Request Body:**

```json
{
  "amount": 12500,
  "type": "product_sale",
  "products": [
    {
      "name": "Premium Toolkit",
      "category": "Tools",
      "quantity": 5,
      "unitPrice": 2500,
      "totalPrice": 12500
    }
  ],
  "customerInfo": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "paymentMethod": "credit_card"
}
```

**Response:**

```json
{
  "sale": {
    "id": "sale_id",
    "amount": 12500,
    "type": "product_sale",
    "products": [
      {
        "name": "Premium Toolkit",
        "category": "Tools",
        "quantity": 5,
        "unitPrice": 2500,
        "totalPrice": 12500
      }
    ],
    "date": "2023-08-15T14:30:00.000Z",
    "status": "completed",
    "pointsEarned": 1250,
    "verificationStatus": "pending"
  },
  "message": "Sale recorded successfully"
}
```

#### Get Sales Data

```
GET /sales/data
```

**Query Parameters:**

- `period` (optional): daily, weekly, monthly (default: daily)
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**

```json
{
  "salesData": {
    "labels": ["Aug 1", "Aug 2", "Aug 3", "Aug 4", "Aug 5"],
    "datasets": [
      {
        "label": "Sales Amount",
        "data": [12500, 8750, 15000, 9200, 11000]
      }
    ],
    "totalSales": 56450,
    "averageSale": 11290,
    "totalTransactions": 5
  }
}
```

#### Get Leaderboard

```
GET /sales/leaderboard
```

**Query Parameters:**

- `period` (optional): weekly, monthly, yearly, all_time (default: monthly)
- `limit` (optional): Number of top dealers to return (default: 10)

**Response:**

```json
{
  "leaderboard": [
    {
      "userId": "user_id",
      "name": "Dealer Name",
      "salesAmount": 45000,
      "salesCount": 12,
      "points": 4500,
      "rank": 1
    },
    {
      "userId": "user_id2",
      "name": "Another Dealer",
      "salesAmount": 38000,
      "salesCount": 10,
      "points": 3800,
      "rank": 2
    }
  ],
  "userRank": {
    "rank": 5,
    "salesAmount": 22000,
    "salesCount": 7,
    "points": 2200
  }
}
```

### Rewards

#### List All Rewards

```
GET /rewards
```

**Query Parameters:**

- `status` (optional): active, inactive
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**

```json
{
  "rewards": [
    {
      "id": "reward_id",
      "title": "Premium Tool Set",
      "description": "High-quality professional tool set with lifetime warranty",
      "pointsCost": 5000,
      "image": "/images/rewards/tool-set.png",
      "isActive": true,
      "quantity": 10,
      "expiryDate": "2023-12-31T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

#### Redeem Reward

```
POST /rewards/:id/redeem
```

**Response:**

```json
{
  "redemption": {
    "id": "redemption_id",
    "rewardId": "reward_id",
    "rewardTitle": "Premium Tool Set",
    "pointsCost": 5000,
    "redeemedAt": "2023-08-15T15:30:00.000Z",
    "status": "pending"
  },
  "userPoints": {
    "previous": 10000,
    "current": 5000,
    "deducted": 5000
  },
  "message": "Reward redeemed successfully"
}
```

### Notifications

#### Get User Notifications

```
GET /notifications
```

**Query Parameters:**

- `read` (optional): true, false (filter by read status)
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**

```json
{
  "notifications": [
    {
      "id": "notification_id",
      "title": "New Reward Available",
      "message": "A new reward 'Premium Tool Set' is now available for 5000 points",
      "type": "reward",
      "isRead": false,
      "createdAt": "2023-08-10T10:30:00.000Z",
      "channels": ["app", "whatsapp"],
      "deliveryStatus": {
        "app": "sent",
        "whatsapp": "delivered"
      }
    }
  ],
  "unreadCount": 3,
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

#### Update Notification Preferences

```
PUT /notifications/preferences
```

**Request Body:**

```json
{
  "app": true,
  "email": true,
  "whatsapp": false
}
```

**Response:**

```json
{
  "preferences": {
    "app": true,
    "email": true,
    "whatsapp": false
  },
  "message": "Notification preferences updated successfully"
}
```

### WhatsApp

#### Send WhatsApp Message

```
POST /whatsapp/send
```

**Request Body:**

```json
{
  "recipient": "user_id",
  "message": "Your custom message here",
  "templateName": "loyalty_update",
  "templateParams": {
    "name": "John",
    "points": "1500",
    "rank": "5"
  }
}
```

**Response:**

```json
{
  "messageId": "whatsapp_message_id",
  "status": "sent",
  "recipient": {
    "id": "user_id",
    "phone": "+1234567890"
  },
  "message": "WhatsApp message sent successfully"
}
```

#### Get WhatsApp Templates

```
GET /whatsapp/templates
```

**Response:**

```json
{
  "templates": [
    {
      "name": "loyalty_update",
      "language": "en_US",
      "status": "approved",
      "category": "MARKETING",
      "components": [
        {
          "type": "HEADER",
          "format": "TEXT",
          "text": "Loyalty Program Update",
          "example": {
            "header_text": ["Loyalty Program Update"]
          }
        },
        {
          "type": "BODY",
          "text": "Hello {{1}}, you now have {{2}} points and your current rank is {{3}}.",
          "example": {
            "body_text": [["John", "1500", "5"]]
          }
        }
      ]
    }
  ]
}
```

### Achievements

#### List All Achievements

```
GET /achievements
```

**Response:**

```json
{
  "achievements": [
    {
      "id": "achievement_id",
      "title": "Sales Master",
      "description": "Achieve 100,000 in total sales",
      "type": "sales_milestone",
      "icon": "award",
      "badgeImage": "/images/badges/sales-master.png",
      "pointsAwarded": 5000,
      "criteria": { "salesAmount": 100000 },
      "isGlobal": true,
      "userStatus": {
        "earned": false,
        "progress": 45,
        "currentValue": 45000,
        "targetValue": 100000
      }
    }
  ]
}
```

#### Get User Achievements

```
GET /achievements/user/:userId
```

**Response:**

```json
{
  "achievements": [
    {
      "id": "achievement_id",
      "title": "Loyalty Legend",
      "description": "Be an active dealer for 1 year",
      "type": "loyalty_duration",
      "icon": "clock",
      "badgeImage": "/images/badges/loyalty-legend.png",
      "pointsAwarded": 2000,
      "earnedAt": "2023-05-15T10:30:00.000Z"
    }
  ],
  "stats": {
    "totalAchievements": 1,
    "totalPointsEarned": 2000,
    "nextAchievements": [
      {
        "id": "achievement_id2",
        "title": "Sales Master",
        "progress": 45
      }
    ]
  }
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation errors |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limiting

API requests are subject to rate limiting to prevent abuse. Current limits:

- 100 requests per 15-minute window per IP address
- Authenticated endpoints have higher limits

When rate limited, the API will respond with a 429 status code and a Retry-After header indicating when you can resume making requests.

## Webhooks

The platform supports webhooks for real-time event notifications:

- `/api/whatsapp/webhook` - WhatsApp message status updates

Webhook endpoints expect POST requests with JSON payloads and respond with 200 OK status codes upon successful processing.

## Pagination

Endpoints that return collections support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10, max: 100)

Paginated responses include a pagination object with total count, current page, and total pages.