import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models to register them
import './models/User.js';
import './models/Organization.js';
import './models/Product.js';
import './models/PurchaseRequest.js';
import './models/Order.js';
import './models/ClientInventory.js';
import './models/InventoryTransaction.js';

const User = mongoose.model('User');
const Organization = mongoose.model('Organization');

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB - prioritize env variable, then fall back to default
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bolt-app';
    
    console.log(`Using MongoDB URI: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Step 1: Find superadmin user and org
    console.log('Finding superadmin user...');
    const superadmin = await User.findOne({ role: 'superadmin' });
    
    if (!superadmin) {
      console.error('No superadmin user found! Aborting reset process.');
      return process.exit(1);
    }
    
    console.log(`Found superadmin: ${superadmin.name} (${superadmin.email})`);
    
    // Get organization of superadmin
    const organization = await Organization.findById(superadmin.organizationId);
    
    if (!organization) {
      console.error('Organization not found for superadmin! Will create a new one.');
    } else {
      console.log(`Found organization: ${organization.name} (${organization._id})`);
    }
    
    // Step 2: Backup superadmin details
    const superadminBackup = superadmin.toObject();
    const organizationBackup = organization ? organization.toObject() : null;
    
    // Step 3: Get a list of all collections
    console.log('Getting list of collections...');
    const collections = await mongoose.connection.db.collections();
    console.log(`Found ${collections.length} collections in database`);
    
    // Step 4: Drop all collections except system collections
    console.log('Dropping all collections...');
    for (const collection of collections) {
      const collName = collection.collectionName;
      
      // Skip system collections
      if (collName.startsWith('system.')) {
        console.log(`Skipping system collection: ${collName}`);
        continue;
      }
      
      try {
        await mongoose.connection.db.dropCollection(collName);
        console.log(`Dropped collection: ${collName}`);
      } catch (error) {
        console.error(`Error dropping collection ${collName}:`, error.message);
      }
    }
    
    // Step 5: Recreate necessary collections and insert superadmin
    console.log('Recreating organization...');
    let orgId;
    
    if (organizationBackup) {
      // Create a new organization with the same data
      const newOrg = new Organization({
        name: organizationBackup.name,
        description: organizationBackup.description || 'Default organization recreated after database reset',
        status: organizationBackup.status || 'active',
        settings: organizationBackup.settings || {
          theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#1e40af'
          }
        }
      });
      
      const savedOrg = await newOrg.save();
      orgId = savedOrg._id;
      console.log(`Recreated organization with ID: ${orgId}`);
    } else {
      // Create a default organization
      const newOrg = new Organization({
        name: 'Default Organization',
        description: 'Default organization created after database reset',
        status: 'active',
        settings: {
          theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#1e40af'
          }
        }
      });
      
      const savedOrg = await newOrg.save();
      orgId = savedOrg._id;
      console.log(`Created new default organization with ID: ${orgId}`);
    }
    
    // Step 6: Recreate superadmin user
    console.log('Recreating superadmin user...');
    const newSuperadmin = new User({
      name: superadminBackup.name,
      email: superadminBackup.email,
      password: superadminBackup.password, // Password hash will be preserved
      role: 'superadmin',
      organizationId: orgId,
      status: superadminBackup.status || 'active',
      settings: superadminBackup.settings || {}
    });
    
    await newSuperadmin.save();
    console.log(`Recreated superadmin user with email: ${newSuperadmin.email}`);
    
    console.log('\n====== DATABASE RESET COMPLETE ======');
    console.log('All collections have been cleared except for Organization and User.');
    console.log('Only the superadmin user has been restored.');
    console.log(`Superadmin email: ${newSuperadmin.email}`);
    console.log('\nYou should now be able to log in with the superadmin credentials.');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error during database reset:', error);
    process.exit(1);
  }
}

// Run the reset function
resetDatabase(); 