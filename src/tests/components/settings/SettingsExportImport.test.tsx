import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Issue 9: Settings Export - Scanner Only
 * 
 * These tests verify that:
 * 1. Scanner-only export is the primary/default action
 * 2. Full export is secondary/hidden
 * 3. Export filename includes 'scanner-settings' by default
 */

describe('Issue 9: Settings Export - Scanner Only', () => {
  const srcRoot = path.resolve(__dirname, '../../..');
  
  it('SettingsExportImport should have scanner-only as primary export', () => {
    const filePath = path.join(srcRoot, 'components/settings/SettingsExportImport.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // The primary button should call handleExport('scanner-only')
    expect(content).toContain("handleExport('scanner-only')");
    
    // The full export should be secondary (subtle variant)
    expect(content).toContain('variant="subtle"');
    expect(content).toContain("handleExport('full')");
  });

  it('default export scope should be scanner-only', () => {
    const filePath = path.join(srcRoot, 'components/settings/SettingsExportImport.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // The function signature should default to 'scanner-only'
    expect(content).toContain("= 'scanner-only'");
  });

  it('export filename should indicate scanner settings', () => {
    const filePath = path.join(srcRoot, 'components/settings/SettingsExportImport.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // The filename should use 'inventory-scanner-settings' prefix
    expect(content).toContain("'inventory-scanner-settings'");
  });

  it('import should detect and apply scope from exported file', () => {
    const filePath = path.join(srcRoot, 'components/settings/SettingsExportImport.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Import should use the type from the envelope
    expect(content).toContain('envelope.type');
    expect(content).toContain('applySettingsSnapshot(snapshot, envelope.type)');
  });
});
