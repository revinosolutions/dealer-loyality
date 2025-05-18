import { execSync } from 'child_process';
import { spawn } from 'child_process';

// Configuration
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 5000;

// Only use standard ports 3000 and 5000

// Function to check if a port is in use (synchronous)
function isPortInUse(port) {
  try {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}` 
      : `lsof -i:${port} -t`;
    
    const result = execSync(command, { encoding: 'utf8' });
    return result.trim().length > 0;
  } catch (error) {
    // If the command fails, the port is likely not in use
    return false;
  }
}

// Function to kill processes on a port (synchronous)
function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      // Windows
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = result.split('\n');
      
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const pidMatch = /\s+(\d+)$/.exec(line);
          if (pidMatch && pidMatch[1]) {
            const pid = pidMatch[1];
            console.log(`Killing process with PID ${pid} on port ${port}`);
            execSync(`taskkill /F /PID ${pid}`);
          }
        }
      }
    } else {
      // Unix-like systems
      const pids = execSync(`lsof -i:${port} -t`, { encoding: 'utf8' }).trim().split('\n');
      for (const pid of pids) {
        if (pid) {
          console.log(`Killing process with PID ${pid} on port ${port}`);
          execSync(`kill -9 ${pid}`);
        }
      }
    }
    return true;
  } catch (error) {
    console.error(`Error killing process on port ${port}:`, error.message);
    return false;
  }
}

// Main function
function startApplication() {
  console.log('🚀 Starting application with fixed ports...');
  console.log(`📌 Frontend port: ${FRONTEND_PORT}`);
  console.log(`📌 Backend port: ${BACKEND_PORT}`);
  
  // Check and free the ports
  if (isPortInUse(FRONTEND_PORT)) {
    console.log(`⚠️ Port ${FRONTEND_PORT} is in use. Attempting to free it...`);
    if (killProcessOnPort(FRONTEND_PORT)) {
      console.log(`✅ Successfully freed port ${FRONTEND_PORT}`);
    } else {
      console.error(`❌ Could not free port ${FRONTEND_PORT}. Please close it manually.`);
      process.exit(1);
    }
  }
  
  if (isPortInUse(BACKEND_PORT)) {
    console.log(`⚠️ Port ${BACKEND_PORT} is in use. Attempting to free it...`);
    if (killProcessOnPort(BACKEND_PORT)) {
      console.log(`✅ Successfully freed port ${BACKEND_PORT}`);
    } else {
      console.error(`❌ Could not free port ${BACKEND_PORT}. Please close it manually.`);
      process.exit(1);
    }
  }
  
  // Start the backend server with explicit port
  console.log('📡 Starting backend server...');
  const backendProcess = spawn('node', ['server/server.js'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: BACKEND_PORT.toString(),
      NODE_ENV: 'development'
    }
  });
  
  // Start the frontend with explicit port
  console.log('🖥️ Starting frontend server...');
  const frontendProcess = spawn('npm', ['run', 'dev', '--', '--port', FRONTEND_PORT.toString(), '--strictPort'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });
  
  // Handle process errors
  backendProcess.on('error', (error) => {
    console.error('Backend error:', error);
  });
  
  frontendProcess.on('error', (error) => {
    console.error('Frontend error:', error);
  });
  
  // Handle process exits
  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    frontendProcess.kill();
    process.exit(code || 0);
  });
  
  frontendProcess.on('exit', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    backendProcess.kill();
    process.exit(code || 0);
  });
}

// Run the application
startApplication();