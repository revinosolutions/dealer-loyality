import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { execSync } from 'child_process';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use standard ports 5000 for backend and 3000 for frontend
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;

// Check if a port is in use
async function isPortInUse(port) {
  try {
    const { stdout, stderr } = await execPromise(`netstat -ano | findstr :${port}`);
    return stdout.length > 0;
  } catch (error) {
    return false; // Command failed, port is likely not in use
  }
}

// Terminate process by port
async function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      // Windows platform
      const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n');
      
      // Find lines that contain the LISTENING state
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const pidMatch = line.trim().match(/\s+(\d+)$/);
          if (pidMatch && pidMatch[1]) {
            const pid = pidMatch[1];
            console.log(`Attempting to kill process using port ${port} (PID: ${pid})...`);
            try {
              await execPromise(`taskkill /F /PID ${pid}`);
              console.log(`Successfully killed process with PID ${pid}`);
              return true;
            } catch (killError) {
              console.error(`Failed to kill process with PID ${pid}:`, killError.message);
              // Continue trying other processes if one fails
            }
          }
        }
      }
    } else {
      // Unix-like systems (Linux, macOS)
      try {
        const { stdout } = await execPromise(`lsof -i :${port} -t`);
        const pids = stdout.trim().split('\n');
        
        if (pids.length > 0 && pids[0]) {
          for (const pid of pids) {
            if (pid.trim()) {
              console.log(`Attempting to kill process using port ${port} (PID: ${pid})...`);
              try {
                await execPromise(`kill -9 ${pid}`);
                console.log(`Successfully killed process with PID ${pid}`);
                return true;
              } catch (killError) {
                console.error(`Failed to kill process with PID ${pid}:`, killError.message);
                // Continue trying other processes if one fails
              }
            }
          }
        }
      } catch (lsofError) {
        // lsof command may fail if no process is using the port
        console.log(`No process found on port ${port}.`);
      }
    }
    
    // Check if the port is now available
    return !(await isPortInUse(port));
  } catch (error) {
    console.error(`Error checking or killing process on port ${port}:`, error.message);
    return false;
  }
}

// Start backend and frontend servers
async function startServers() {
  try {
    // Check and kill processes on port 5000 (backend)
    const backendPort = BACKEND_PORT;
    if (await isPortInUse(backendPort)) {
      console.log(`Port ${backendPort} is in use. Attempting to terminate the process...`);
      if (await killProcessOnPort(backendPort)) {
        console.log(`Process using port ${backendPort} was terminated.`);
      } else {
        console.error(`Could not free up port ${backendPort}. Please close the application using it manually.`);
        process.exit(1);
      }
    }

    // Check and kill processes on port 3000 (frontend)
    const frontendPort = FRONTEND_PORT;
    if (await isPortInUse(frontendPort)) {
      console.log(`Port ${frontendPort} is in use. Attempting to terminate the process...`);
      if (await killProcessOnPort(frontendPort)) {
        console.log(`Process using port ${frontendPort} was terminated.`);
      } else {
        console.error(`Could not free up port ${frontendPort}. Please close the application using it manually.`);
        process.exit(1);
      }
    }

    // Temporarily skip running fix-routes.js
    console.log('Skipping fix-routes.js temporarily...');
    // await execPromise('node fix-routes.js');

    // Start backend server
    const backend = spawn('node', ['server/server.js'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: backendPort
      },
    });

    // Start frontend server with forced port 3000
    const frontend = spawn('npm', ['run', 'dev', '--', '--port', frontendPort, '--strictPort'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        VITE_API_URL: `http://localhost:${backendPort}/api`,
      },
    });

    // Handle process termination
    process.on('SIGINT', () => {
      backend.kill();
      frontend.kill();
      process.exit();
    });

    // Handle backend exit
    backend.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      frontend.kill();
      process.exit(code);
    });

    // Handle frontend exit
    frontend.on('exit', (code) => {
      console.log(`Frontend process exited with code ${code}`);
      backend.kill();
      process.exit(code);
    });
  } catch (error) {
    console.error('Error starting services:', error);
    process.exit(1);
  }
}

// Check if all necessary files exist
async function checkRequiredFiles() {
  const requiredFiles = [
    'server/server.js',
    'server/db.js',
    'server/config.js',
    'middleware/auth.js',
    'models/User.js',
    'models/Contest.js'
  ];

  for (const file of requiredFiles) {
    try {
      const filePath = path.join(__dirname, file);
      await fs.promises.access(filePath);
      console.log(`✅ Found: ${file}`);
    } catch (err) {
      console.error(`❌ Missing: ${file}`);
      return false;
    }
  }
  return true;
}

// Create mock modules for missing dependencies
async function createMockModules() {
  // Create services directory if it doesn't exist
  const servicesDir = path.join(__dirname, 'services');
  try {
    await fs.promises.access(servicesDir);
  } catch (err) {
    await fs.promises.mkdir(servicesDir, { recursive: true });
    console.log('📁 Created services directory');
  }

  // Define mock modules to create if they don't exist
  const mockModules = [
    {
      path: 'services/whatsappService.js',
      content: `
/**
 * Mock WhatsApp Service
 */

export const sendWhatsAppMessage = async (phone, message, template = null, params = null) => {
  console.log(\`[MOCK] WhatsApp message to \${phone}: \${message}\`);
  return { success: true, messageId: 'mock-' + Date.now() };
};

export const getWhatsAppTemplates = async () => {
  return { 
    success: true,
    templates: [
      { name: 'welcome', language: 'en' },
      { name: 'notification', language: 'en' }
    ] 
  };
};

export default { sendWhatsAppMessage, getWhatsAppTemplates };
`
    },
    {
      path: 'services/notificationDeliveryService.js',
      content: `
/**
 * Mock Notification Delivery Service
 */

export const deliverNotification = async (notification) => {
  console.log(\`[MOCK] Delivering notification: \${notification?.title || 'Untitled'}\`);
  return { success: true };
};

export const sendEmailNotification = async (to, subject, text) => {
  console.log(\`[MOCK] Email to \${to}: \${subject}\`);
  return { success: true };
};

export const processNotificationQueue = async () => {
  console.log('[MOCK] Processing notification queue');
  return { success: true };
};

export default { deliverNotification, sendEmailNotification, processNotificationQueue };
`
    },
    {
      path: 'models/Notification.js',
      content: `
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['contest', 'reward', 'achievement', 'sales', 'system'],
    default: 'system'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  channels: [{
    type: String,
    enum: ['app', 'email', 'whatsapp'],
    default: 'app'
  }],
  deliveryStatus: {
    app: {
      type: String,
      enum: ['pending', 'sent', 'read', 'failed', 'not_sent'],
      default: 'pending'
    },
    email: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'not_sent'],
      default: 'not_sent'
    },
    whatsapp: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'not_sent'],
      default: 'not_sent'
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
`
    },
    {
      path: 'models/Sales.js',
      content: `
import mongoose from 'mongoose';

const salesSchema = new mongoose.Schema({
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    name: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  customer: {
    name: String,
    email: String,
    phone: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Sales = mongoose.model('Sales', salesSchema);

export default Sales;
`
    }
  ];

  // Create mock modules if they don't exist
  for (const module of mockModules) {
    const filePath = path.join(__dirname, module.path);
    try {
      await fs.promises.access(filePath);
      console.log(`✅ Found: ${module.path}`);
    } catch (err) {
      await fs.promises.writeFile(filePath, module.content.trim());
      console.log(`📝 Created mock: ${module.path}`);
    }
  }
}

// Create .env file if it doesn't exist
if (!fs.existsSync('.env')) {
  console.log('Creating .env file with MongoDB connection details...');
  const envContent = `# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/dealer-loyalty

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=dealer-loyalty-platform-secret-key
JWT_REFRESH_SECRET=dealer-loyalty-refresh-secret-key
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# File Upload Paths
AVATAR_UPLOAD_DIR=uploads/avatars
PRODUCT_UPLOAD_DIR=uploads/products
`;

  fs.writeFileSync('.env', envContent);
  console.log('.env file created successfully');
}

// Start the server
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    
    // Check required files
    const filesExist = await checkRequiredFiles();
    if (!filesExist) {
      console.error('❌ Missing required files. Please check your project structure.');
      process.exit(1);
    }
    
    // Create mock modules for missing dependencies
    await createMockModules();
    
    // Start the servers
    await startServers();
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Run the startup
startServer();