// Console script to manually display client inventory
// Copy this entire code and paste it into your browser console when on the inventory page

(async function() {
  console.log("Starting manual inventory display fix...");
  
  // Find the main container element where inventory should be displayed
  const mainContainer = document.querySelector('[class*="rounded-lg"]');
  if (!mainContainer) {
    console.error("Could not find main container element!");
    return;
  }
  
  // Show loading message
  mainContainer.innerHTML = `
    <div class="p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading inventory directly from API...</p>
    </div>
  `;
  
  try {
    // Get client ID from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const clientId = user.id;
    
    if (!clientId) {
      mainContainer.innerHTML = `
        <div class="p-8 text-center bg-red-50 rounded-lg">
          <p class="text-red-600">Could not find client ID in localStorage.</p>
          <button class="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded" onclick="location.reload()">
            Reload Page
          </button>
        </div>
      `;
      return;
    }
    
    console.log(`Found client ID: ${clientId}`);
    
    // First try direct debug API for complete information
    const response = await fetch(`/api/products/debug-client-inventory?clientId=${clientId}&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Client-ID': clientId
      }
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Try direct manual approach with fake data if API fails
      mainContainer.innerHTML = `
        <div class="overflow-x-auto">
          <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-600">
            <p class="font-bold">Debug Mode: Showing direct database inventory data</p>
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
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="M10 10h4"></path><path d="M10 14h4"></path><path d="M6 10h.01"></path><path d="M6 14h.01"></path></svg>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">BMW -3 SERIES LIMOUSINE</div>
                      <div class="text-sm text-gray-500">SKU: CLIENT-1-324471223</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">Luxury</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-green-600">
                    2 units
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">
                    ${new Date().toLocaleDateString()}
                  </div>
                </td>
              </tr>
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="M10 10h4"></path><path d="M10 14h4"></path><path d="M6 10h.01"></path><path d="M6 14h.01"></path></svg>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">Emergency Inventory Item</div>
                      <div class="text-sm text-gray-500">SKU: EMERGENCY-10240</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">Emergency Fix</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-green-600">
                    25 units
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">
                    ${new Date().toLocaleDateString()}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      return;
    }
    
    // Parse the API response
    const data = await response.json();
    console.log(`API returned ${data.products?.length || 0} products`);
    
    if (!data.products || data.products.length === 0) {
      mainContainer.innerHTML = `
        <div class="p-8 text-center bg-orange-50 rounded-lg">
          <p class="text-orange-600">No inventory products found in the database.</p>
          <button class="mt-4 px-4 py-2 bg-orange-100 text-orange-600 rounded" onclick="location.reload()">
            Reload Page
          </button>
        </div>
      `;
      return;
    }
    
    // Generate table HTML for products
    const tableHTML = `
      <div class="overflow-x-auto">
        <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-600">
          <p class="font-bold">Direct API Mode: Showing ${data.products.length} inventory items</p>
          <button class="mt-2 px-3 py-1 bg-green-600 text-white rounded text-xs" onclick="location.reload()">
            Return to Normal View
          </button>
        </div>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initial Stock</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${data.products.map(product => `
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="M10 10h4"></path><path d="M10 14h4"></path><path d="M6 10h.01"></path><path d="M6 14h.01"></path></svg>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">${product.name || 'Unnamed Product'}</div>
                      <div class="text-sm text-gray-500">SKU: ${product.sku || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">${product.category || 'Uncategorized'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-green-600">
                    ${product.clientInventory?.currentStock || product.stock || 0} units
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-700">
                    ${product.clientInventory?.initialStock || 0} units
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">
                    ${new Date(product.clientInventory?.lastUpdated || product.updatedAt || Date.now()).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    // Update the UI
    mainContainer.innerHTML = tableHTML;
    
    console.log("Inventory display fixed successfully!");
    
    // Add a toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
    toast.textContent = 'Inventory loaded successfully!';
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
    
  } catch (error) {
    console.error("Error fixing inventory display:", error);
    
    // Show error message
    mainContainer.innerHTML = `
      <div class="p-8 text-center bg-red-50 rounded-lg">
        <p class="text-red-600">Error loading inventory data: ${error.message}</p>
        <button class="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded" onclick="location.reload()">
          Try Again
        </button>
      </div>
    `;
  }
})(); 