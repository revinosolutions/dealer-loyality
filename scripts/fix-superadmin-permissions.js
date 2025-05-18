import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function fixSuperadminPermissions() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Define minimal schemas to avoid hooks and middleware
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      status: String,
      isPermanentSuperadmin: Boolean,
      organizationId: mongoose.Schema.Types.ObjectId
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Find the superadmin
    console.log('Looking for superadmin user...');
    const superadmin = await User.findOne({ email: 'superadmin@revino.com' });
    
    if (!superadmin) {
      console.error('Could not find superadmin user! Please run the reset-all-collections.js script first.');
      process.exit(1);
    }
    
    console.log('Found superadmin:', superadmin._id);
    
    // Ensure superadmin has the correct permissions
    superadmin.isPermanentSuperadmin = true;
    superadmin.role = 'superadmin';
    superadmin.status = 'active';
    // Remove organization ID from superadmin if it exists
    superadmin.organizationId = undefined;
    
    await superadmin.save();
    console.log('Updated superadmin permissions:');
    console.log('- isPermanentSuperadmin: true');
    console.log('- role: superadmin');
    console.log('- status: active');
    console.log('- organizationId: removed');
    
    // Test creating an organization
    if (mongoose.models.Organization) {
      delete mongoose.models.Organization;
    }
    
    const organizationSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      description: String,
      status: { type: String, default: 'active' },
      createdBy: mongoose.Schema.Types.ObjectId,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    const Organization = mongoose.model('Organization', organizationSchema);
    
    // Check for existing test organization
    const existingOrg = await Organization.findOne({ name: 'Test Organization' });
    if (existingOrg) {
      console.log('Removing existing test organization...');
      await Organization.deleteOne({ name: 'Test Organization' });
    }
    
    // Create a test organization to verify superadmin permissions
    console.log('Creating test organization...');
    const testOrg = new Organization({
      name: 'Test Organization',
      description: 'A test organization created to verify superadmin permissions',
      status: 'active',
      createdBy: superadmin._id
    });
    
    await testOrg.save();
    console.log('Test organization created successfully with ID:', testOrg._id);
    
    // Verify indices on the Organization collection
    console.log('\nVerifying indices on Organization collection...');
    const indices = await Organization.collection.indexes();
    console.log('Current indices:', indices);
    
    // Delete the test organization
    console.log('\nDeleting test organization...');
    await Organization.deleteOne({ _id: testOrg._id });
    console.log('Test organization deleted successfully');
    
    console.log('\n✅ Superadmin permissions have been fixed successfully!');
    console.log('You should now be able to create organizations as the superadmin.');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error fixing superadmin permissions:', error);
    process.exit(1);
  }
}

// Run the function
fixSuperadminPermissions(); 