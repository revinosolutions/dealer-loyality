import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Define User model (simplified version for the script)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  clientId: mongoose.Schema.Types.ObjectId,
  organizationId: mongoose.Schema.Types.ObjectId,
  status: String,
  // Other user fields...
});

// Config object similar to what the server uses
const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    accessExpiration: '1d', // 1 day
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiration: '7d', // 7 days
  }
};

/**
 * Verify a JWT token
 * @param {string} token - Token to verify
 * @returns {object} Decoded token payload or error
 */
function verifyToken(token) {
  try {
    console.log('Verifying token with secret:', config.jwt.secret.substring(0, 5) + '...');
    const decoded = jwt.verify(token, config.jwt.secret);
    return { success: true, decoded };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      name: error.name,
      details: 'Token verification failed. Could be expired, invalid signature, or malformed.'
    };
  }
}

/**
 * Create test tokens with various payload formats for debugging
 * @param {string} userId - User ID to use in tokens
 * @returns {object} Various test tokens
 */
function createTestTokens(userId) {
  const directFormat = { id: userId, role: 'client' };
  const nestedFormat = { user: { id: userId, role: 'client' } };
  
  const directToken = jwt.sign(directFormat, config.jwt.secret, { expiresIn: '1h' });
  const nestedToken = jwt.sign(nestedFormat, config.jwt.secret, { expiresIn: '1h' });
  
  return {
    directFormat,
    nestedFormat,
    directToken,
    nestedToken
  };
}

/**
 * Main function to run the script
 */
async function main() {
  console.log('=== JWT VERIFICATION DEBUGGING TOOL ===');
  
  const tokenToVerify = process.argv[2];
  
  if (!tokenToVerify) {
    console.log('\n❌ No token provided!');
    console.log('Usage: node verify-token.js <your-jwt-token>');
    console.log('Or: node verify-token.js generate <user-id>');
    
    // If no token is provided, we'll create some test tokens
    console.log('\n🔧 Creating test tokens using a sample user ID...');
    
    const sampleUserId = new mongoose.Types.ObjectId().toString();
    const testTokens = createTestTokens(sampleUserId);
    
    console.log('\n📝 DIRECT FORMAT TOKEN:');
    console.log('Payload:', testTokens.directFormat);
    console.log('Token:', testTokens.directToken);
    console.log('Verification result:', verifyToken(testTokens.directToken));
    
    console.log('\n📝 NESTED FORMAT TOKEN:');
    console.log('Payload:', testTokens.nestedFormat);
    console.log('Token:', testTokens.nestedToken);
    console.log('Verification result:', verifyToken(testTokens.nestedToken));
    
    console.log('\nUse one of these tokens in your frontend for testing.');
    return;
  }
  
  // If we have a 'generate' command with a user ID
  if (tokenToVerify === 'generate' && process.argv[3]) {
    const userId = process.argv[3];
    console.log(`🔧 Generating tokens for user ID: ${userId}`);
    
    const testTokens = createTestTokens(userId);
    
    console.log('\n📝 DIRECT FORMAT TOKEN:');
    console.log('Payload:', testTokens.directFormat);
    console.log('Token:', testTokens.directToken);
    
    console.log('\n📝 NESTED FORMAT TOKEN:');
    console.log('Payload:', testTokens.nestedFormat);
    console.log('Token:', testTokens.nestedToken);
    
    return;
  }
  
  // Verify the provided token
  console.log('🔑 Verifying token:', tokenToVerify.substring(0, 20) + '...');
  
  const result = verifyToken(tokenToVerify);
  console.log('\n📋 Verification Result:');
  console.log(result);
  
  if (result.success) {
    console.log('\n✅ Token is valid!');
    console.log('\n📄 Token payload:');
    console.log(result.decoded);
    
    // Extract user ID from the token (handle both formats)
    const userId = result.decoded.id || (result.decoded.user && result.decoded.user.id);
    
    if (userId) {
      console.log(`\n👤 User ID: ${userId}`);
      
      try {
        // Connect to MongoDB and look up the user
        console.log('\n🔍 Connecting to MongoDB to look up user...');
        
        await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        const User = mongoose.model('User', UserSchema);
        
        const user = await User.findById(userId);
        
        if (user) {
          console.log('✅ Found user in database!');
          console.log('User data:', {
            id: user._id,
            email: user.email,
            role: user.role,
            status: user.status,
            organizationId: user.organizationId,
            clientId: user.clientId
          });
        } else {
          console.log('❌ User not found in database. Check if ID is correct.');
        }
      } catch (error) {
        console.error('❌ Error connecting to MongoDB or looking up user:', error.message);
      } finally {
        await mongoose.connection.close();
        console.log('Closed MongoDB connection');
      }
    } else {
      console.log('❌ No user ID found in token!');
    }
  } else {
    console.log('❌ Token is invalid!');
    console.log('Error:', result.error);
  }
}

// Run the main function
main()
  .then(() => {
    console.log('\n=== SCRIPT COMPLETED ===');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 