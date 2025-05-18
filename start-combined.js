/**
 * Combined startup script for both frontend and backend
 * Uses concurrently to run both the Vite dev server and Express API server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Function to print colored, prefix messages
function logWithPrefix(prefix, message, color) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}[${prefix}]${colors.reset} ${message}`);
}

// Function to run a command in a child process
function runCommand(command, args, name, color) {
  const child = spawn(command, args, { shell: true });
  
  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => logWithPrefix(name, line, color));
  });
  
  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => logWithPrefix(name, line, colors.red));
  });
  
  child.on('error', (error) => {
    logWithPrefix(name, `Error: ${error.message}`, colors.red);
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      logWithPrefix(name, `Process exited with code ${code}`, colors.red);
    }
  });
  
  return child;
}

// Check if MongoDB is running
function checkMongoDB() {
  logWithPrefix('SYSTEM', 'Checking MongoDB connection...', colors.yellow);
  
  return new Promise((resolve) => {
    const mongo = spawn('mongosh', ['--eval', 'db.version()'], { shell: true });
    
    mongo.on('close', (code) => {
      if (code === 0) {
        logWithPrefix('SYSTEM', 'MongoDB is running', colors.green);
        resolve(true);
      } else {
        logWithPrefix('SYSTEM', 'MongoDB does not appear to be running!', colors.red);
        logWithPrefix('SYSTEM', 'Please start MongoDB before running this application', colors.red);
        resolve(false);
      }
    });
    
    // Handle potential error when mongosh is not installed
    mongo.on('error', () => {
      logWithPrefix('SYSTEM', 'Could not check MongoDB status - mongosh might not be installed', colors.yellow);
      logWithPrefix('SYSTEM', 'Attempting to start server anyway...', colors.yellow);
      resolve(true);
    });
  });
}

// Fix common issues before starting
function autoFixCommonIssues() {
  logWithPrefix('SYSTEM', 'Running automatic fixes for common issues...', colors.cyan);
  
  try {
    // Check for .env file
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      logWithPrefix('SYSTEM', 'Creating default .env file', colors.yellow);
      const defaultEnv = 
        'PORT=5000\n' +
        'NODE_ENV=development\n' +
        'MONGODB_URI=mongodb://localhost:27017/dealer-loyalty\n' +
        'JWT_SECRET=dealer-loyalty-secret-key\n' +
        'JWT_REFRESH_SECRET=dealer-loyalty-refresh-secret\n' +
        'JWT_ACCESS_EXPIRATION=15m\n' +
        'JWT_REFRESH_EXPIRATION=7d\n';
      
      fs.writeFileSync(envPath, defaultEnv);
      logWithPrefix('SYSTEM', '.env file created with default values', colors.green);
    }
  } catch (error) {
    logWithPrefix('SYSTEM', `Error running auto-fixes: ${error.message}`, colors.red);
  }
}

// Main function
async function main() {
  console.log('\n');
  logWithPrefix('SYSTEM', 'Starting Dealer Loyalty Platform...', colors.bright + colors.cyan);
  
  // Auto-fix common issues
  autoFixCommonIssues();
  
  // Check MongoDB
  const mongoIsRunning = await checkMongoDB();
  
  if (!mongoIsRunning) {
    logWithPrefix('SYSTEM', 'Starting without MongoDB confirmation - some features may not work', colors.yellow);
  }
  
  // Start backend server
  const backendProcess = runCommand('node', ['server/server.js'], 'SERVER', colors.magenta);
  
  // Short delay to allow backend to start up
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start frontend dev server
  const frontendProcess = runCommand('npm', ['run', 'dev'], 'CLIENT', colors.green);
  
  // Handle termination
  process.on('SIGINT', () => {
    logWithPrefix('SYSTEM', 'Shutting down...', colors.yellow);
    backendProcess.kill();
    frontendProcess.kill();
    setTimeout(() => process.exit(0), 500);
  });
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
