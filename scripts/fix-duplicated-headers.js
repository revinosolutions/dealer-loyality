import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name from the current file URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pages directory path
const pagesDir = path.join(__dirname, '..', 'src', 'pages');

// List all TypeScript files in the pages directory
const pageFiles = fs.readdirSync(pagesDir)
  .filter(file => file.endsWith('.tsx') && file !== 'HomePage.tsx' && file !== 'LoginPage.tsx' && file !== 'NotFoundPage.tsx');

// Counter for modified files
let modifiedCount = 0;

// Process each file
pageFiles.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the file imports and uses Layout
  const hasLayoutImport = content.includes('import Layout from');
  const usesLayout = content.includes('<Layout');
  
  if (hasLayoutImport && usesLayout) {
    console.log(`Processing ${file}...`);
    
    // Remove Layout import
    content = content.replace(/import Layout from ['"]\.\.\/components\/layout\/Layout['"];?\n?/g, '');
    
    // Replace Layout wrapper with its children
    content = content.replace(/<Layout[^>]*>([\s\S]*?)<\/Layout>/g, (match, inside) => {
      // Preserve the inside content
      return inside.trim();
    });
    
    // Write back to file
    fs.writeFileSync(filePath, content);
    modifiedCount++;
    console.log(`✓ Fixed ${file}`);
  }
});

console.log(`\nCompleted! Modified ${modifiedCount} files to fix duplicated headers.`); 