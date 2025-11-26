import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Issue 11: Remove Settings Version History
 * 
 * These tests verify that the version history feature has been removed.
 * We verify that the files have been deleted and imports removed.
 */

describe('Issue 11: Settings Version History Removal', () => {
  const srcRoot = path.resolve(__dirname, '../..');
  
  it('SettingsVersionHistory component file should not exist', () => {
    const filePath = path.join(srcRoot, 'components/settings/SettingsVersionHistory.tsx');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('useSettingsVersions hook file should not exist', () => {
    const filePath = path.join(srcRoot, 'hooks/useSettingsVersions.ts');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('SettingsVersionService file should not exist', () => {
    const filePath = path.join(srcRoot, 'services/SettingsVersionService.ts');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('SettingsPage should not import SettingsVersionHistory', () => {
    const filePath = path.join(srcRoot, 'pages/SettingsPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('SettingsVersionHistory');
    expect(content).not.toContain('IconHistory');
    expect(content).not.toContain('value="history"');
  });

  it('SettingsExportImport should not import useSettingsVersions', () => {
    const filePath = path.join(srcRoot, 'components/settings/SettingsExportImport.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('useSettingsVersions');
  });
});
