import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Contest from '../models/Contest.js';
import Sales from '../models/Sales.js';
import Reward from '../models/Reward.js';
import Achievement from '../models/Achievement.js';
import config from '../server/config.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, config.mongodb.options)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Sample user data with phone numbers and notification preferences
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'super_admin',
    phone: '+1234567890',
    notificationPreferences: {
      app: true,
      email: true,
      whatsapp: true
    }
  },
  {
    name: 'Client Company',
    email: 'client@example.com',
    password: 'password123',
    role: 'client',
    phone: '+1987654321',
    company: {
      name: 'Client Corp',
      position: 'Owner'
    },
    notificationPreferences: {
      app: true,
      email: true,
      whatsapp: true
    }
  },
  {
    name: 'Dealer One',
    email: 'dealer1@example.com',
    password: 'password123',
    role: 'dealer',
    phone: '+1122334455',
    points: 1500,
    notificationPreferences: {
      app: true,
      email: true,
      whatsapp: true
    }
  },
  {
    name: 'Dealer Two',
    email: 'dealer2@example.com',
    password: 'password123',
    role: 'dealer',
    phone: '+1567890123',
    points: 2200,
    notificationPreferences: {
      app: true,
      email: false,
      whatsapp: true
    }
  },
  {
    name: 'Dealer Three',
    email: 'dealer3@example.com',
    password: 'password123',
    role: 'dealer',
    phone: '+1678901234',
    points: 800,
    notificationPreferences: {
      app: true,
      email: true,
      whatsapp: false
    }
  }
];

// Sample notifications with WhatsApp delivery status
const sampleNotifications = [
  {
    title: 'Welcome to the Loyalty Program',
    message: 'Welcome to our dealer loyalty program. You now have access to exclusive rewards and contests.',
    type: 'system',
    channels: ['app', 'whatsapp', 'email'],
    deliveryStatus: {
      app: 'sent',
      whatsapp: 'delivered',
      email: 'sent'
    }
  },
  {
    title: 'New Reward Available',
    message: 'A new reward "Premium Tool Set" is now available for 1000 points. Log in to redeem it!',
    type: 'reward',
    channels: ['app', 'whatsapp'],
    deliveryStatus: {
      app: 'sent',
      whatsapp: 'sent',
      email: 'not_applicable'
    }
  },
  {
    title: 'Achievement Unlocked',
    message: 'Congratulations! You\'ve earned the "Sales Master" achievement and 500 points have been added to your account.',
    type: 'achievement',
    channels: ['app', 'whatsapp', 'email'],
    deliveryStatus: {
      app: 'sent',
      whatsapp: 'read',
      email: 'delivered'
    }
  }
];

// Sample contests data
const sampleContests = [
  {
    title: 'Summer Sales Challenge',
    description: 'Achieve the highest sales during the summer season and win exciting rewards!',
    startDate: new Date('2023-06-01'),
    endDate: new Date('2023-08-31'),
    goal: 'Reach 50,000 in sales',
    goalType: 'sales_amount',
    targetValue: 50000,
    progress: 65,
    approvalStatus: 'approved',
    rewards: [
      { position: 1, description: 'Premium Toolkit + 5000 points', pointsValue: 5000 },
      { position: 2, description: 'Gift Card + 3000 points', pointsValue: 3000 },
      { position: 3, description: '2000 bonus points', pointsValue: 2000 }
    ],
    participants: [],
    status: 'active'
  },
  {
    title: 'New Customer Acquisition',
    description: 'Bring in the most new customers this quarter',
    startDate: new Date('2023-07-01'),
    endDate: new Date('2023-09-30'),
    goal: 'Acquire 20 new customers',
    goalType: 'new_customers',
    targetValue: 20,
    progress: 40,
    approvalStatus: 'approved',
    rewards: [
      { position: 1, description: 'Weekend Getaway + 4000 points', pointsValue: 4000 },
      { position: 2, description: 'Smart Watch + 2000 points', pointsValue: 2000 }
    ],
    participants: [],
    status: 'active'
  }
];

// Sample sales data
const sampleSales = [
  {
    amount: 12500,
    type: 'product_sale',
    products: [
      {
        name: 'Premium Toolkit',
        category: 'Tools',
        quantity: 5,
        unitPrice: 2500,
        totalPrice: 12500
      }
    ],
    date: new Date('2023-07-15'),
    status: 'completed',
    pointsEarned: 1250,
    verificationStatus: 'verified',
    paymentMethod: 'credit_card',
    customerInfo: {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1234567890'
    }
  },
  {
    amount: 8750,
    type: 'service_sale',
    products: [
      {
        name: 'Premium Service Package',
        category: 'Services',
        quantity: 1,
        unitPrice: 8750,
        totalPrice: 8750
      }
    ],
    date: new Date('2023-07-20'),
    status: 'completed',
    pointsEarned: 875,
    verificationStatus: 'verified',
    paymentMethod: 'bank_transfer',
    customerInfo: {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+1987654321'
    }
  }
];

// Sample rewards data
const sampleRewards = [
  {
    title: 'Premium Tool Set',
    description: 'High-quality professional tool set with lifetime warranty',
    pointsCost: 5000,
    image: '/images/rewards/tool-set.png',
    isActive: true,
    quantity: 10,
    expiryDate: new Date('2023-12-31')
  },
  {
    title: 'Weekend Getaway',
    description: 'Two-night stay at a luxury resort for two',
    pointsCost: 15000,
    image: '/images/rewards/getaway.png',
    isActive: true,
    quantity: 5,
    expiryDate: new Date('2023-12-31')
  },
  {
    title: 'Smart Watch',
    description: 'Latest model smart watch with fitness tracking',
    pointsCost: 8000,
    image: '/images/rewards/smart-watch.png',
    isActive: true,
    quantity: 15,
    expiryDate: new Date('2023-12-31')
  }
];

// Sample achievements data
const sampleAchievements = [
  {
    title: 'Sales Master',
    description: 'Achieve 100,000 in total sales',
    type: 'sales_milestone',
    icon: 'award',
    badgeImage: '/images/badges/sales-master.png',
    pointsAwarded: 5000,
    criteria: { salesAmount: 100000 },
    isGlobal: true
  },
  {
    title: 'Contest Champion',
    description: 'Win 5 contests',
    type: 'contest_winner',
    icon: 'trophy',
    badgeImage: '/images/badges/contest-champion.png',
    pointsAwarded: 3000,
    criteria: { contestsWon: 5 },
    isGlobal: true
  },
  {
    title: 'Loyalty Legend',
    description: 'Be an active dealer for 1 year',
    type: 'loyalty_duration',
    icon: 'clock',
    badgeImage: '/images/badges/loyalty-legend.png',
    pointsAwarded: 2000,
    criteria: { daysActive: 365 },
    isGlobal: true
  }
];

// Seed the database
async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Notification.deleteMany({});
    await Contest.deleteMany({});
    await Sales.deleteMany({});
    await Reward.deleteMany({});
    await Achievement.deleteMany({});
    
    console.log('Existing data cleared');
    
    // Insert admin user first
    const adminUser = await User.create(sampleUsers[0]);
    console.log('Admin user created');
    
    // Insert client user
    const clientUser = await User.create(sampleUsers[1]);
    console.log('Client user created');
    
    // Insert dealers with client reference
    const dealerPromises = sampleUsers.slice(2).map(dealer => {
      dealer.clientId = clientUser._id;
      return User.create(dealer);
    });
    
    const dealers = await Promise.all(dealerPromises);
    console.log(`${dealers.length} dealer users created`);
    
    // Create notifications for each dealer
    const notificationPromises = [];
    
    for (const dealer of dealers) {
      for (const notif of sampleNotifications) {
        notificationPromises.push(
          Notification.create({
            ...notif,
            recipient: dealer._id,
            sender: clientUser._id
          })
        );
      }
    }
    
    await Promise.all(notificationPromises);
    console.log('Sample notifications created');
    
    // Create contests with client as creator
    const contestPromises = sampleContests.map(contest => {
      return Contest.create({
        ...contest,
        createdBy: clientUser._id,
        approvedBy: adminUser._id,
        approvalDate: new Date(),
        participants: dealers.map(dealer => ({
          userId: dealer._id,
          progress: Math.floor(Math.random() * 100),
          currentPosition: Math.floor(Math.random() * 3) + 1
        }))
      });
    });
    
    const contests = await Promise.all(contestPromises);
    console.log(`${contests.length} contests created`);
    
    // Create sales for each dealer
    const salesPromises = [];
    
    for (const dealer of dealers) {
      for (const sale of sampleSales) {
        salesPromises.push(
          Sales.create({
            ...sale,
            userId: dealer._id,
            clientId: clientUser._id,
            userRole: 'dealer'
          })
        );
      }
    }
    
    await Promise.all(salesPromises);
    console.log('Sample sales created');
    
    // Create rewards from client
    const rewardPromises = sampleRewards.map(reward => {
      return Reward.create({
        ...reward,
        clientId: clientUser._id
      });
    });
    
    const rewards = await Promise.all(rewardPromises);
    console.log(`${rewards.length} rewards created`);
    
    // Create achievements
    const achievementPromises = sampleAchievements.map(achievement => {
      return Achievement.create({
        ...achievement,
        userAchievements: [
          {
            userId: dealers[0]._id,
            earnedAt: new Date(),
            pointsAwarded: achievement.pointsAwarded
          }
        ]
      });
    });
    
    await Promise.all(achievementPromises);
    console.log('Sample achievements created');
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();