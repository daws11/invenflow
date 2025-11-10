#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '../dist');

/**
 * Recursively walk through directory and yield all .js files
 */
async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.name.endsWith('.js')) {
      yield fullPath;
    }
  }
}

/**
 * Fix import statements by adding .js extension to relative imports
 * Fixes: from "./module" -> from "./module.js"
 * Fixes: import "./module" -> import "./module.js"
 * Fixes: from "../module" -> from "../module.js"
 */
async function fixImports(filePath) {
  let content = await readFile(filePath, 'utf-8');
  const original = content;
  
  // Helper function to check if import path needs fixing
  const needsFix = (importPath) => {
    // Skip if it's a directory import (ends with /)
    if (importPath.endsWith('/')) {
      return false;
    }
    // Skip if it's an external package (doesn't start with ./ or ../)
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
      return false;
    }
    // Skip if already has extension
    if (importPath.match(/\.(js|json|mjs|ts)$/)) {
      return false;
    }
    return true;
  };
  
  // Fix: import { ... } from "./module" or import "./module"
  // Match both: from "./module" and import "./module"
  content = content.replace(
    /(?:from\s+|import\s+)(['"])(\.\.?\/[^'"]+)\1/g,
    (match, quote, importPath) => {
      if (needsFix(importPath)) {
        // Special handling for directory imports that should resolve to index.js
        // e.g., '../db' -> '../db/index.js'
        // Check if this import path might be a directory (common patterns)
        const dirImports = ['db', 'schema', 'config', 'middleware', 'routes', 'utils'];
        const pathParts = importPath.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        
        if (dirImports.includes(lastPart) && !importPath.endsWith('.js')) {
          return match.replace(importPath, `${importPath}/index.js`);
        }
        
        return match.replace(importPath, `${importPath}.js`);
      }
      return match;
    }
  );
  
  // Fix: import() dynamic imports
  content = content.replace(
    /import\s*\(\s*(['"])(\.\.?\/[^'"]+)\1\s*\)/g,
    (match, quote, importPath) => {
      if (needsFix(importPath)) {
        return match.replace(importPath, `${importPath}.js`);
      }
      return match;
    }
  );
  
  if (content !== original) {
    await writeFile(filePath, content, 'utf-8');
    const relativePath = filePath.replace(process.cwd(), '.');
    console.log(`✅ Fixed: ${relativePath}`);
    return true;
  }
  return false;
}

/**
 * Main function to process all files
 */
async function main() {
  try {
    let fixed = 0;
    let processed = 0;
    
    for await (const file of walk(distDir)) {
      processed++;
      if (await fixImports(file)) {
        fixed++;
      }
    }
    
    if (fixed > 0) {
      console.log(`\n✅ Fixed ${fixed} file(s) out of ${processed} processed`);
    } else {
      console.log(`\n✅ No files needed fixing (${processed} files processed)`);
    }
  } catch (error) {
    console.error('❌ Error fixing imports:', error);
    process.exit(1);
  }
}

main();

