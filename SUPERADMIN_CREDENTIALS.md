# 🔐 **REVINO SUPERADMIN CREDENTIALS**

## 🚀 **Default Superadmin Login**

### **Primary Superadmin Account:**
```
Email:    superadmin@revino.com
Password: password123
Role:     superadmin
```

### **Account Features:**
- ✅ **Permanent Account** - Cannot be deleted or modified
- ✅ **Full Platform Access** - All features and data
- ✅ **Organization Independent** - Not tied to any specific organization
- ✅ **Auto-Created** - Generated automatically when database is empty

---

## 🎭 **Demo Accounts Available**

Your application also includes demo login functionality:

### **Demo Superadmin:**
```
Email:    demo-superadmin@example.com
Password: demo123
```

### **Demo Admin:**
```
Email:    demo-admin@example.com
Password: demo123
```

### **Demo Client:**
```
Email:    demo-client@example.com
Password: demo123
```

### **Demo Dealer:**
```
Email:    demo-dealer@example.com
Password: demo123
```

---

## 🔧 **Credential Management Scripts**

Your project includes several scripts to manage superadmin credentials:

### **Verify Superadmin:**
```bash
npm run admin:verify
```
This checks if the superadmin exists and verifies the password.

### **Reset Superadmin Password:**
```bash
npm run admin:fix-password
```
This resets the superadmin password to the default.

### **Set Permanent Superadmin:**
```bash
npm run admin:set-permanent
```
This ensures the superadmin account is protected from deletion.

---

## 🏃‍♂️ **Quick Start Guide**

### **1. Start Your Application:**
```bash
# Start both frontend and backend
npm run start:both

# OR start separately
npm run server    # Backend on port 5000
npm run dev       # Frontend on port 3000
```

### **2. Access the Application:**
- **Frontend URL:** http://localhost:3000
- **API URL:** http://localhost:5000/api

### **3. Login Process:**
1. Go to http://localhost:3000/login
2. Use the superadmin credentials:
   - Email: `superadmin@revino.com`
   - Password: `password123`
3. You'll be redirected to the superadmin dashboard

### **4. Demo Login (Alternative):**
1. On the login page, click "Try Demo Access"
2. Select "Demo Superadmin Login"
3. You'll be automatically logged in

---

## 🛡️ **Security Features**

### **Superadmin Protection:**
- ✅ **Cannot be deleted** - Protected by middleware
- ✅ **Cannot change email** - Locked to superadmin@revino.com
- ✅ **Cannot change role** - Always remains superadmin
- ✅ **Cannot be deactivated** - Status always active
- ✅ **Password hashing** - Uses bcrypt with salt

### **Database Protection:**
```javascript
// The superadmin is protected by these mechanisms:
- Pre-save middleware prevents role/email changes
- Pre-delete middleware prevents account deletion
- Pre-update middleware prevents critical field changes
- isPermanentSuperadmin flag provides additional protection
```

---

## 🎯 **Superadmin Capabilities**

### **User Management:**
- Create/Edit/Delete all user types
- Manage organizations and hierarchies
- View all user statistics and activity

### **Platform Management:**
- Global analytics and reporting
- System-wide settings configuration
- Contest and reward program oversight
- Database management and cleanup

### **Business Intelligence:**
- Cross-organization performance metrics
- Platform-wide sales analytics
- User engagement statistics
- Revenue and growth tracking

---

## 🔍 **Troubleshooting**

### **If Login Fails:**

1. **Check Database Connection:**
   ```bash
   # Verify MongoDB is running and accessible
   npm run debug:mongodb
   ```

2. **Verify Superadmin Exists:**
   ```bash
   npm run admin:verify
   ```

3. **Reset Password:**
   ```bash
   npm run admin:fix-password
   ```

4. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for authentication errors
   - Check network requests to `/api/auth/login`

### **Common Issues:**

#### **"User not found" Error:**
- Database might be empty
- Run the server to auto-create the superadmin
- Check MongoDB connection string

#### **"Invalid password" Error:**
- Password might have been changed
- Use the reset password script
- Try the demo login instead

#### **"Access denied" Error:**
- User might not have superadmin role
- Check user role in database
- Use the permanent superadmin script

---

## 📊 **Database Information**

### **MongoDB Collections:**
- **users** - All user accounts including superadmin
- **organizations** - Company/organization data
- **products** - Product catalog
- **sales** - Sales transactions and records
- **contests** - Contests and competitions
- **orders** - Purchase orders and requests
- **notifications** - System notifications

### **Superadmin Document Structure:**
```javascript
{
  _id: ObjectId,
  name: "Super Admin",
  email: "superadmin@revino.com",
  password: "$2a$10$...", // bcrypt hash
  role: "superadmin",
  status: "active",
  isPermanentSuperadmin: true,
  phone: "+1234567000",
  avatar: "/images/avatars/superadmin.jpg",
  company: {
    name: "Revino Global",
    position: "Super Administrator"
  },
  stats: {
    totalSales: 0,
    contestsWon: 0,
    contestsParticipated: 0,
    rewardsRedeemed: 0,
    lastActive: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎉 **You're All Set!**

Use these credentials to access your Revino Dealer Loyalty Platform:

**🔑 Login URL:** http://localhost:3000/login
**📧 Email:** superadmin@revino.com
**🔒 Password:** password123

**Happy testing! 🚀**
