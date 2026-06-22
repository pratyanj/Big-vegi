import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = path.join(__dirname, '..', 'App_logo.png');
const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (fs.existsSync(srcPath)) {
  // 1. Regular legacy icon
  fs.copyFileSync(srcPath, path.join(assetsDir, 'icon.png'));
  
  // 2. Adaptive icon - Foreground (the logo itself)
  fs.copyFileSync(srcPath, path.join(assetsDir, 'icon-foreground.png'));
  
  // 3. Adaptive icon - Icon Only (used by generator as fallback)
  fs.copyFileSync(srcPath, path.join(assetsDir, 'icon-only.png'));
  
  console.log('Successfully prepared all asset sources:');
  console.log(' - assets/icon.png');
  console.log(' - assets/icon-foreground.png');
  console.log(' - assets/icon-only.png');
} else {
  console.error('Source App_logo.png not found at:', srcPath);
}
