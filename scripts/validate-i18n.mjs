#!/usr/bin/env node

/**
 * Validate i18n keys against locale files
 * 
 * This script checks that all extracted translation keys exist
 * in the locale files.
 * 
 * Usage: node scripts/validate-i18n.mjs
 * Exit code: 0 if all keys valid, 1 if missing keys found
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const localesDir = path.join(rootDir, 'src', 'i18n', 'locales', 'en');
const extractedKeysPath = path.join(rootDir, 'extracted-i18n-keys.json');

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Load all locale files
 */
function loadLocaleFiles() {
  const locales = {};
  
  if (!fs.existsSync(localesDir)) {
    console.error(`Locale directory not found: ${localesDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(localesDir);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const namespace = path.basename(file, '.json');
      const filePath = path.join(localesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      try {
        locales[namespace] = JSON.parse(content);
      } catch (err) {
        console.error(`Failed to parse ${file}: ${err.message}`);
      }
    }
  }
  
  return locales;
}

/**
 * Get all keys from a locale object (flattened with dot notation)
 */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Validate extracted keys against locale files
 */
function validateKeys() {
  // Load extracted keys
  if (!fs.existsSync(extractedKeysPath)) {
    console.error('Extracted keys file not found. Run extract-i18n-keys.mjs first.');
    process.exit(1);
  }
  
  const extracted = JSON.parse(fs.readFileSync(extractedKeysPath, 'utf-8'));
  const locales = loadLocaleFiles();
  
  const missingKeys = [];
  const unusedKeys = [];
  const validKeys = [];
  
  // Check each extracted key exists in locale files
  for (const [fullKey, data] of Object.entries(extracted.staticKeys)) {
    const { namespace, key, usages } = data;
    const localeData = locales[namespace];
    
    if (!localeData) {
      missingKeys.push({
        fullKey,
        namespace,
        key,
        reason: `Namespace '${namespace}' not found`,
        usages,
      });
      continue;
    }
    
    const value = getNestedValue(localeData, key);
    
    if (value === undefined) {
      missingKeys.push({
        fullKey,
        namespace,
        key,
        reason: `Key '${key}' not found in ${namespace}.json`,
        usages,
      });
    } else {
      validKeys.push(fullKey);
    }
  }
  
  // Check for unused keys in locale files
  const usedKeys = new Set(validKeys);
  
  for (const [namespace, data] of Object.entries(locales)) {
    const allKeys = flattenKeys(data);
    
    for (const key of allKeys) {
      const fullKey = `${namespace}:${key}`;
      if (!usedKeys.has(fullKey)) {
        // Check if any variation of this key is used (handles alias keys like tNav, tUndo)
        const keyUsed = Array.from(usedKeys).some(k => 
          k.endsWith(`:${key}`) || k === fullKey
        );
        if (!keyUsed) {
          unusedKeys.push({ namespace, key, fullKey });
        }
      }
    }
  }
  
  return {
    missingKeys,
    unusedKeys,
    validKeys,
    dynamicKeys: extracted.dynamicKeys,
    stats: {
      totalExtracted: Object.keys(extracted.staticKeys).length,
      totalValid: validKeys.length,
      totalMissing: missingKeys.length,
      totalUnused: unusedKeys.length,
      totalDynamic: extracted.dynamicKeys.length,
    },
  };
}

// Run validation
const result = validateKeys();

// Output results
console.log('\n=== i18n Validation Results ===\n');
console.log(`Total extracted keys: ${result.stats.totalExtracted}`);
console.log(`Valid keys: ${result.stats.totalValid}`);
console.log(`Missing keys: ${result.stats.totalMissing}`);
console.log(`Unused keys: ${result.stats.totalUnused}`);
console.log(`Dynamic keys (manual check): ${result.stats.totalDynamic}`);

if (result.missingKeys.length > 0) {
  console.log('\n--- Missing Keys ---\n');
  for (const missing of result.missingKeys.slice(0, 20)) {
    console.log(`  ❌ ${missing.fullKey}`);
    console.log(`     Reason: ${missing.reason}`);
    for (const usage of missing.usages.slice(0, 3)) {
      console.log(`     Used in: ${usage.file}:${usage.line}`);
    }
    if (missing.usages.length > 3) {
      console.log(`     ... and ${missing.usages.length - 3} more usages`);
    }
  }
  if (result.missingKeys.length > 20) {
    console.log(`\n  ... and ${result.missingKeys.length - 20} more missing keys`);
  }
}

if (result.unusedKeys.length > 0) {
  console.log('\n--- Unused Keys (first 10) ---\n');
  for (const unused of result.unusedKeys.slice(0, 10)) {
    console.log(`  ⚠️  ${unused.fullKey}`);
  }
  if (result.unusedKeys.length > 10) {
    console.log(`\n  ... and ${result.unusedKeys.length - 10} more unused keys`);
  }
}

if (result.dynamicKeys.length > 0) {
  console.log('\n--- Dynamic Keys (require manual verification) ---\n');
  for (const dynamic of result.dynamicKeys.slice(0, 10)) {
    console.log(`  ⚡ ${dynamic.pattern.trim()}`);
    console.log(`     File: ${dynamic.file}:${dynamic.line}`);
  }
  if (result.dynamicKeys.length > 10) {
    console.log(`\n  ... and ${result.dynamicKeys.length - 10} more dynamic keys`);
  }
}

// Write full results to file
const outputPath = path.join(rootDir, 'i18n-validation-results.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\nFull results written to: ${outputPath}`);

// Exit with error code if missing keys found
if (result.missingKeys.length > 0) {
  console.log('\n❌ Validation FAILED: Missing translation keys found');
  process.exit(1);
} else {
  console.log('\n✅ Validation PASSED: All translation keys are defined');
  process.exit(0);
}
