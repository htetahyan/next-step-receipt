import fs from 'fs';
import path from 'path';

function replaceInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace colors (Blue to Emerald for that Dark Green aesthetic)
  content = content.replace(/blue-50\b/g, 'emerald-50');
  content = content.replace(/blue-100\b/g, 'emerald-100');
  content = content.replace(/blue-200\b/g, 'emerald-200');
  content = content.replace(/blue-300\b/g, 'emerald-300');
  content = content.replace(/blue-400\b/g, 'emerald-400');
  content = content.replace(/blue-500\b/g, 'emerald-600'); // Shift to darker
  content = content.replace(/blue-600\b/g, 'emerald-700'); // Shift to darker
  content = content.replace(/blue-700\b/g, 'emerald-800'); // Shift to darker
  content = content.replace(/blue-800\b/g, 'emerald-900');
  content = content.replace(/blue-900\b/g, 'emerald-950');

  // Tone down shadows for Anthropic flat UI look
  content = content.replace(/shadow-xl/g, 'shadow-sm');
  content = content.replace(/shadow-2xl/g, 'shadow-md');
  content = content.replace(/shadow-lg/g, 'shadow-sm');
  content = content.replace(/shadow-\[.*?\]/g, 'shadow-sm');
  
  // Make borders a bit more subtle and rounded corners slightly less bubbly
  // content = content.replace(/rounded-3xl/g, 'rounded-2xl');
  // content = content.replace(/rounded-\[.*?\]/g, 'rounded-xl');

  fs.writeFileSync(filePath, content, 'utf8');
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        walkDir(fullPath);
      }
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        replaceInFile(fullPath);
      }
    }
  }
}

walkDir('./app');
walkDir('./components');
console.log('UI Transformation Complete.');
