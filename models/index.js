// Import all models and export them
import './User.js';
import './Organization.js';
import './Contest.js';
import './Product.js';
import './Order.js';
import './Inventory.js';
import './Sales.js';
import './Achievement.js';
import './Reward.js';
import './Notification.js';
import './DealerSlot.js';
import './ClientOrder.js';

// Export models - this ensures all models are loaded before the routes use them
export default {
  // This file simply ensures all models are loaded
  modelsLoaded: true
}; 