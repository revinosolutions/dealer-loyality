import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to walk through directory and get all JavaScript files
function getAllJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllJSFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Process each file to fix imports
function fixAuthImports(files) {
  let filesFixed = 0;
  
  console.log('Fixing auth middleware imports...');
  
  files.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf8');
      let originalContent = content;
      
      // Replace all variations of authMiddleware imports
      const variations = [
        "from '../middleware/auth.js'",
        "from '../middleware/auth.js'",
        "from \"../middleware/authMiddleware.js\"",
        "from \"../middleware/authMiddleware\"",
        "from '../server/middleware/auth.js'",
        "from '../server/middleware/auth.js'"
      ];
      
      const correctImport = "from '../middleware/auth.js'";
      const serverCorrectImport = "from '../server/middleware/auth.js'";
      
      // Replace all variations
      variations.forEach(variation => {
        if (content.includes(variation)) {
          if (variation.includes('server')) {
            content = content.replace(variation, serverCorrectImport);
          } else {
            content = content.replace(variation, correctImport);
          }
        }
      });
      
      // Use regex for more complex replacements
      content = content.replace(
        /import\s+{[^}]*}\s+from\s+['"]\.\.\/middleware\/authMiddleware\.js['"]/g,
        `import { authMiddleware, authorize } from '../middleware/auth.js'`
      );
      
      content = content.replace(
        /import\s+{[^}]*}\s+from\s+['"]\.\.\/server\/middleware\/authMiddleware\.js['"]/g,
        `import { authMiddleware, authorize } from '../server/middleware/auth.js'`
      );
      
      // Save if changed
      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed imports in: ${file}`);
        filesFixed++;
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  });
  
  console.log(`\nFixed imports in ${filesFixed} files.`);
  return filesFixed;
}

// Main function
function main() {
  const rootDir = __dirname;
  const files = getAllJSFiles(rootDir);
  const fixedCount = fixAuthImports(files);
  
  if (fixedCount > 0) {
    console.log('All imports have been updated from authMiddleware.js to auth.js');
  } else {
    console.log('No files needed fixing.');
  }
}

main(); 