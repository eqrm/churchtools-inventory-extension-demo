#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const targetDir = path.join(projectRoot, 'src');

const ignoredFiles = new Set([
  path.join('src', 'utils', 'ct-types.d.ts'),
]);

const germanCharRegex = /[äöüßÄÖÜ]/u;
const germanWordFragments = [
  'ausstehend',
  'genehmigt',
  'abgelehnt',
  'verfügbar',
  'nutzung',
  'wartung',
  'wartungsblock',
  'gerät',
  'geräte',
  'hinweis',
  'speichern',
  'abbrechen',
  'löschen',
  'entwickler',
  'zurück',
  'offline',
  'synchro',
  'über',
  'demo',
  'daten',
  'unbekannt',
  'sie sind',
];

const boundaryFragments = new Set(['demo', 'daten']);

function escapeForRegex(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const germanWordRegexes = germanWordFragments.map((fragment) => {
  const pattern = escapeForRegex(fragment);
  if (boundaryFragments.has(fragment)) {
    return new RegExp(`\\b${pattern}\\b`, 'i');
  }
  return new RegExp(pattern, 'i');
});

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    const relPath = path.relative(projectRoot, fullPath);
    if (ignoredFiles.has(relPath)) {
      continue;
    }
    const ext = path.extname(entry.name);
    if (!allowedExtensions.has(ext)) {
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function findMatches(text) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line) {
      return;
    }
    if (germanCharRegex.test(line)) {
      matches.push({ line: index + 1, text: line });
      return;
    }
    if (germanWordRegexes.some(regex => regex.test(line))) {
      matches.push({ line: index + 1, text: line });
    }
  });
  return matches;
}

async function main() {
  const files = await walk(targetDir);
  const violations = [];

  for (const file of files) {
    const contents = await fs.readFile(file, 'utf8');
    const matches = findMatches(contents);
    if (matches.length > 0) {
      matches.forEach(match => {
        violations.push({ file, ...match });
      });
    }
  }

  if (violations.length > 0) {
    console.error('German text detected in the following locations:');
    violations.forEach((violation) => {
      console.error(`  - ${path.relative(projectRoot, violation.file)}:${violation.line}`);
      console.error(`    ${violation.text.trim()}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log('✅ No German text detected in src/');
}

main().catch((error) => {
  console.error('Failed to run German text detection:', error);
  process.exitCode = 1;
});
