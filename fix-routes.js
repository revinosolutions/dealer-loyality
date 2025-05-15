import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fix all route files to use consistent auth middleware
async function fixAllRouteFiles() {
  const routesDir = path.join(__dirname, 'routes');
  
  console.log('🔧 Fixing route files...');
  
  try {
    const files = await fs.promises.readdir(routesDir);
    
    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      
      // Skip auth.js to prevent circular issues
      if (file === 'auth.js') {
        console.log(`  ✓ Skipped: ${file} (auth file protected from changes)`);
        continue;
      }
      
      const filePath = path.join(routesDir, file);
      let content = await fs.promises.readFile(filePath, 'utf8');
      let modified = false;
      
      // Check for any auth imports from authMiddleware.js (incorrect path)
      const hasIncorrectAuthImport = content.includes('from \'../middleware/authMiddleware.js\'') || 
                                     content.includes('from "../middleware/auth.js"');
      
      if (hasIncorrectAuthImport) {
        const oldContent = content;
        
        // Replace incorrect auth import with correct one
        content = content.replace(
          /import\s+{[^}]*}\s+from\s+['"]\.\.\/middleware\/authMiddleware\.js['"]/g, 
          `import { authMiddleware, authorize } from '../middleware/auth.js'`
        );
        
        if (content !== oldContent) {
          await fs.promises.writeFile(filePath, content);
          console.log(`  ✓ Fixed incorrect middleware path in: ${file}`);
          modified = true;
        }
      }
      
      // Check for any auth imports with correct path
      const hasAuthImport = content.includes('from \'../middleware/auth.js\'') || 
                           content.includes('from "../middleware/auth.js"');
      
      if (hasAuthImport && !modified) {
        const oldContent = content;
        
        // Replace all auth import variations with the standard import
        content = content.replace(
          /import\s+{[^}]*(?:authenticateToken|authenticateJWT|auth|authorizeRoles|authorizeRole)[^}]*}\s+from\s+['"]\.\.\/middleware\/auth\.js['"]/g, 
          `import { authMiddleware, authorize } from '../middleware/auth.js'`
        );
        
        // Replace function names in actual use
        content = content.replace(/authenticateToken/g, 'authMiddleware');
        content = content.replace(/authenticateJWT/g, 'authMiddleware');
        content = content.replace(/\bauth\b(?!Middleware)/g, 'authMiddleware');
        content = content.replace(/authorizeRoles/g, 'authorize');
        content = content.replace(/authorizeRole/g, 'authorize');
        
        if (content !== oldContent) {
          await fs.promises.writeFile(filePath, content);
          console.log(`  ✓ Fixed: ${file}`);
          modified = true;
        }
      }
      
      if (!modified) {
        console.log(`  ✓ Skipped: ${file} (no changes needed)`);
      }
    }
    
    console.log('✅ All route files fixed successfully!');
    return true;
  } catch (err) {
    console.error(`❌ Error fixing route files: ${err.message}`);
    return false;
  }
}

// Run the function
fixAllRouteFiles().then(result => {
  if (result) {
    console.log('Routes fixed successfully!');
  } else {
    console.error('❌ Failed to update route files.');
    process.exit(1);
  }
}); 