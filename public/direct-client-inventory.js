/**
 * Direct Client Inventory Fix
 * 
 * This script can be run from the browser console to directly fix client inventory display issues.
 * Copy all of this code and paste it into your browser console when on the inventory page.
 */

// Self-executing function to avoid polluting global scope
(async function() {
  console.log("Direct Client Inventory Fix - Starting...");

  // Get auth token and user info
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const clientId = user.id;

  if (!token || !clientId) {
    console.error("Missing authentication data. Please log in again.");
    alert("Authentication error. Please log out and log back in.");
    return;
  }

  console.log(`Found client ID: ${clientId}`);

  try {
    // First, try to repair the client inventory on the server
    console.log("Attempting to repair client inventory on server...");
    try {
      const repairResponse = await fetch('/api/products/repair-client-inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Client-ID': clientId
        },
        body: JSON.stringify({
          clientId,
          forceRebuild: true
        })
      });

      if (repairResponse.ok) {
        const repairData = await repairResponse.json();
        console.log("Repair successful:", repairData);
      }
    } catch (repairError) {
      console.warn("Repair attempt failed:", repairError);
    }

    // Next, directly fetch client inventory data
    console.log("Fetching client inventory data directly...");
    const response = await fetch(`/api/products/debug-client-inventory?clientId=${clientId}&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-ID': clientId
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`API returned ${data.products?.length || 0} products:`, data.products);

    if (!data.products || data.products.length === 0) {
      console.warn("No products found in client inventory.");
      
      // Create a message that will be visible to the user
      const pageContent = document.querySelector('.container') || document.body;
      const messageDiv = document.createElement('div');
      messageDiv.style.position = 'fixed';
      messageDiv.style.top = '50%';
      messageDiv.style.left = '50%';
      messageDiv.style.transform = 'translate(-50%, -50%)';
      messageDiv.style.padding = '20px';
      messageDiv.style.backgroundColor = '#FEF2F2';
      messageDiv.style.border = '1px solid #F87171';
      messageDiv.style.borderRadius = '8px';
      messageDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      messageDiv.style.zIndex = '9999';
      messageDiv.style.maxWidth = '400px';
      messageDiv.style.width = '100%';
      messageDiv.style.textAlign = 'center';
      messageDiv.innerHTML = `
        <h3 style="color: #B91C1C; font-weight: bold; margin-bottom: 8px;">No Products Found</h3>
        <p style="color: #4B5563; margin-bottom: 16px;">We couldn't find any products in your inventory. There might be an issue with your account or you may not have any approved purchase requests yet.</p>
        <button id="close-message" style="background-color: #EF4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
      `;
      pageContent.appendChild(messageDiv);
      
      document.getElementById('close-message').addEventListener('click', () => {
        messageDiv.remove();
      });
      
      return;
    }

    // Find the inventory container
    const inventoryPage = document.querySelector('.bg-white.shadow.rounded-lg');
    if (!inventoryPage) {
      console.error("Could not find inventory container element.");
      alert("Page structure not recognized. Please try refreshing.");
      return;
    }

    // Replace the "empty inventory" message with our direct results
    const productsHTML = data.products.map(product => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><rect width="20" height="16" x="2" y="4" rx="2"></rect></svg>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${product.name || 'Unknown Product'}</div>
              <div class="text-sm text-gray-500">SKU: ${product.sku || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${product.category || 'N/A'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-green-600">
            ${product.clientInventory?.currentStock || product.stock || 0} units
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-500">
            ${product.clientInventory?.lastUpdated ? 
              new Date(product.clientInventory.lastUpdated).toLocaleDateString() : 
              'N/A'}
          </div>
        </td>
      </tr>
    `).join('');

    // Create the complete table HTML
    const tableHTML = `
      <div class="overflow-x-auto">
        <div class="bg-green-50 p-4 rounded-md mb-4 flex justify-between items-center">
          <div>
            <h3 class="text-green-800 font-medium">Direct Inventory View</h3>
            <p class="text-green-600 text-sm">Showing ${data.products.length} products</p>
          </div>
          <button class="px-3 py-1 bg-green-600 text-white rounded" onclick="window.location.reload()">
            Refresh
          </button>
        </div>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${productsHTML}
          </tbody>
        </table>
      </div>
    `;

    // Replace the content
    inventoryPage.innerHTML = tableHTML;
    
    console.log("Successfully displayed client inventory data!");
    
    // Add a success notification
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#10B981';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.zIndex = '9999';
    notification.textContent = `Successfully loaded ${data.products.length} inventory items`;
    document.body.appendChild(notification);
    
    // Let React/parent page know we've succeeded
    if (window.parent) {
      try {
        // Create a custom event that the React app can listen for
        const inventoryEvent = new CustomEvent('direct-inventory-loaded', { 
          detail: { products: data.products, count: data.products.length } 
        });
        window.dispatchEvent(inventoryEvent);
      } catch (e) {
        console.warn("Could not notify parent window:", e);
      }
    }
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
    
  } catch (error) {
    console.error("Error fixing client inventory:", error);
    alert(`Error loading inventory: ${error.message}. Try refreshing the page.`);
  }
})(); 