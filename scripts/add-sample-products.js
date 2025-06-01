/**
 * Add Sample Products to Client Inventories
 * 
 * This script adds sample products to client inventories
 * to resolve the blank inventory page issue
 */

// Run the fix directly in the browser console
// This can be embedded in a script tag during development
function addSampleProducts() {
  console.log('Adding sample products to client inventory...');
  
  // Create a sample product object
  const sampleProduct = {
    name: "Sample Inventory Item",
    description: "This is a sample product added to fix the blank inventory page",
    price: 99.99,
    sku: `SAMPLE-${Date.now()}`,
    stock: 5,
    reorderLevel: 2,
    category: "General",
    status: "active",
    isClientUploaded: true
  };
  
  // Get auth data from localStorage
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token || !user || !user.id) {
    console.error('User not logged in or missing auth data');
    return;
  }
  
  console.log(`Adding sample product for user: ${user.name || user.email || user.id}`);
  
  // Add the sample product to client inventory through API
  fetch('/api/client-inventory/add-sample', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      product: sampleProduct
    })
  })
  .then(response => {
    if (!response.ok) {
      // If the specific endpoint is not available, try the direct product creation
      console.log('Sample product API not available, trying direct product creation...');
      return fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...sampleProduct,
          clientId: user.id,
          clientInventory: {
            currentStock: 5,
            lastUpdated: new Date()
          }
        })
      });
    }
    return response;
  })
  .then(response => response.json())
  .then(data => {
    console.log('Sample product added successfully:', data);
    alert('Sample product added to inventory. Please refresh the page.');
  })
  .catch(error => {
    console.error('Error adding sample product:', error);
    alert('Failed to add sample product. Please check console for details.');
  });
}

// Add a button to the page for easy execution
function addFixButton() {
  const button = document.createElement('button');
  button.textContent = 'Fix Inventory';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '10px 15px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
  
  button.addEventListener('click', addSampleProducts);
  
  document.body.appendChild(button);
  console.log('Fix button added to page');
}

// Instruction for use in browser console
console.log(`
===========================================
CLIENT INVENTORY FIX TOOL
===========================================
To use this script:

1. Copy the entire script
2. Open your browser console on the client inventory page
3. Paste and press Enter
4. Click the "Fix Inventory" button that appears

This will add a sample product to your inventory.
===========================================
`);

// Automatically add the button when running in browser
if (typeof window !== 'undefined' && window.document) {
  addFixButton();
} 