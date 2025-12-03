#!/usr/bin/env node

/**
 * Extract i18n keys from source files
 * 
 * This script scans all TypeScript/TSX files in src/ and extracts
 * translation keys used with the t() function.
 * 
 * Usage: node scripts/extract-i18n-keys.mjs
 * Output: JSON with extracted keys and their locations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

/**
 * Recursively get all files matching the extensions
 */
function getAllFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (!['node_modules', 'dist', 'coverage', '.git'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Extract translation keys from file content
 * Detects the namespace from useTranslation() calls
 */
function extractKeysFromFile(filePath, content) {
  const keys = [];
  const dynamicKeys = [];
  const lines = content.split('\n');
  
  // First, detect all namespace bindings in the file
  // Pattern: useTranslation('namespace') or useTranslation(['ns1', 'ns2'])
  // Also handles: { t: tNs } = useTranslation('namespace')
  const namespaceBindings = new Map(); // function name -> namespace
  
  const useTranslationPattern = /(?:const\s+)?\{\s*t(?:\s*:\s*(\w+))?\s*[,}].*useTranslation\(\s*['"]([^'"]+)['"]/g;
  const fullContent = content;
  
  let match;
  while ((match = useTranslationPattern.exec(fullContent)) !== null) {
    const alias = match[1] || 't';
    const namespace = match[2];
    namespaceBindings.set(alias, namespace);
  }
  
  // Also detect pattern: const { t } = useTranslation('namespace') 
  const simplePattern = /const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\s*['"]([^'"]+)['"]/g;
  while ((match = simplePattern.exec(fullContent)) !== null) {
    namespaceBindings.set('t', match[1]);
  }
  
  // Default namespace if no binding found
  if (!namespaceBindings.has('t') && namespaceBindings.size === 0) {
    namespaceBindings.set('t', 'common');
  }
  
  // Patterns to match t() calls - now we'll determine namespace from context
  const tCallPatterns = [
    // t('key') or t("key") - simple call
    { pattern: /\b(t|t[A-Z][a-zA-Z]*)\(\s*['"]([^'"]+)['"]\s*(?:,|\))/g, aliasGroup: 1, keyGroup: 2 },
  ];
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    // Check for t() calls
    for (const { pattern, aliasGroup, keyGroup } of tCallPatterns) {
      pattern.lastIndex = 0;
      let callMatch;
      while ((callMatch = pattern.exec(line)) !== null) {
        const funcAlias = callMatch[aliasGroup];
        const keyValue = callMatch[keyGroup];
        
        // Skip dynamic keys
        if (keyValue.includes('$') || keyValue.includes('`')) {
          continue;
        }
        
        // Determine namespace
        let namespace;
        if (keyValue.includes(':')) {
          // Key already has namespace prefix
          const colonIdx = keyValue.indexOf(':');
          namespace = keyValue.substring(0, colonIdx);
        } else {
          // Use namespace from binding, or default
          namespace = namespaceBindings.get(funcAlias) || namespaceBindings.get('t') || 'common';
        }
        
        const key = keyValue.includes(':') ? keyValue.substring(keyValue.indexOf(':') + 1) : keyValue;
        
        keys.push({
          key: `${namespace}:${key}`,
          file: path.relative(rootDir, filePath),
          line: lineNum + 1,
        });
      }
    }
    
    // Check for dynamic keys
    const dynamicPatterns = [
      /\bt\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g, // template literals
    ];
    
    for (const pattern of dynamicPatterns) {
      pattern.lastIndex = 0;
      let dynMatch;
      while ((dynMatch = pattern.exec(line)) !== null) {
        dynamicKeys.push({
          pattern: dynMatch[0],
          file: path.relative(rootDir, filePath),
          line: lineNum + 1,
        });
      }
    }
  }
  
  return { keys, dynamicKeys };
}

/**
 * Parse a namespaced key into namespace and key parts
 */
function parseKey(fullKey) {
  const colonIndex = fullKey.indexOf(':');
  if (colonIndex > 0) {
    return {
      namespace: fullKey.substring(0, colonIndex),
      key: fullKey.substring(colonIndex + 1),
    };
  }
  // Default namespace is 'common' if no namespace specified
  return {
    namespace: 'common',
    key: fullKey,
  };
}

/**
 * Main extraction function
 */
function extractAllKeys() {
  const files = getAllFiles(srcDir);
  const allKeys = new Map(); // key -> { namespace, key, usages: [...] }
  const allDynamicKeys = [];
  
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { keys, dynamicKeys } = extractKeysFromFile(filePath, content);
    
    for (const { key, file, line } of keys) {
      const parsed = parseKey(key);
      const fullKey = `${parsed.namespace}:${parsed.key}`;
      
      if (!allKeys.has(fullKey)) {
        allKeys.set(fullKey, {
          namespace: parsed.namespace,
          key: parsed.key,
          usages: [],
        });
      }
      
      allKeys.get(fullKey).usages.push({ file, line });
    }
    
    allDynamicKeys.push(...dynamicKeys);
  }
  
  return {
    staticKeys: Object.fromEntries(allKeys),
    dynamicKeys: allDynamicKeys,
    stats: {
      totalFiles: files.length,
      totalStaticKeys: allKeys.size,
      totalDynamicKeys: allDynamicKeys.length,
    },
  };
}

// Run extraction
const result = extractAllKeys();

// Output to stdout as JSON
console.log(JSON.stringify(result, null, 2));

// Also write to file for use by validation script
const outputPath = path.join(rootDir, 'extracted-i18n-keys.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.error(`\nExtracted ${result.stats.totalStaticKeys} static keys from ${result.stats.totalFiles} files`);
console.error(`Found ${result.stats.totalDynamicKeys} dynamic keys (require manual verification)`);
console.error(`Output written to: ${outputPath}`);
