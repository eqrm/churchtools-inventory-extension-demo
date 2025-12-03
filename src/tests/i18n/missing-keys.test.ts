import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '../../..');

describe('i18n Translation Keys', () => {
  beforeAll(() => {
    // Run extraction before validation
    try {
      execSync('npm run i18n:extract', { 
        cwd: rootDir,
        stdio: 'pipe',
        encoding: 'utf-8'
      });
    } catch {
      // Extraction might write to stderr for logging, that's ok
    }
  });

  it('should have extraction results file', () => {
    const extractedPath = path.join(rootDir, 'extracted-i18n-keys.json');
    expect(fs.existsSync(extractedPath)).toBe(true);
    
    const content = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));
    expect(content.stats.totalStaticKeys).toBeGreaterThan(0);
  });

  it('should have all required namespaces', () => {
    const localesDir = path.join(rootDir, 'src', 'i18n', 'locales', 'en');
    const requiredNamespaces = ['common', 'assets', 'maintenance', 'navigation'];
    
    for (const ns of requiredNamespaces) {
      const filePath = path.join(localesDir, `${ns}.json`);
      expect(fs.existsSync(filePath), `Missing namespace file: ${ns}.json`).toBe(true);
    }
  });

  it('should report missing keys count under threshold', () => {
    // Run validation and check results
    const resultsPath = path.join(rootDir, 'i18n-validation-results.json');
    
    // If results don't exist yet, run validation
    if (!fs.existsSync(resultsPath)) {
      try {
        execSync('npm run i18n:validate', { 
          cwd: rootDir,
          stdio: 'pipe',
          encoding: 'utf-8'
        });
      } catch {
        // Validation exits with code 1 if missing keys, that's expected
      }
    }
    
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    
    // Allow up to 50 missing keys as a threshold (can be tightened over time)
    const MAX_MISSING_KEYS = 50;
    
    expect(
      results.stats.totalMissing,
      `Too many missing translation keys: ${results.stats.totalMissing}. ` +
      `Fix missing keys or update threshold. First missing key: ${results.missingKeys[0]?.fullKey || 'none'}`
    ).toBeLessThanOrEqual(MAX_MISSING_KEYS);
  });

  it('should have valid JSON in all locale files', () => {
    const localesDir = path.join(rootDir, 'src', 'i18n', 'locales', 'en');
    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(localesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      expect(() => JSON.parse(content), `Invalid JSON in ${file}`).not.toThrow();
    }
  });

  it('should not have empty string values in translations', () => {
    const localesDir = path.join(rootDir, 'src', 'i18n', 'locales', 'en');
    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    
    const emptyValues: string[] = [];
    
    function checkForEmptyStrings(obj: unknown, prefix = ''): void {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (value === '') {
            emptyValues.push(fullKey);
          } else if (typeof value === 'object') {
            checkForEmptyStrings(value, fullKey);
          }
        }
      }
    }
    
    for (const file of files) {
      const filePath = path.join(localesDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const namespace = path.basename(file, '.json');
      checkForEmptyStrings(content, namespace);
    }
    
    expect(emptyValues, `Found empty translation values: ${emptyValues.join(', ')}`).toHaveLength(0);
  });
});
