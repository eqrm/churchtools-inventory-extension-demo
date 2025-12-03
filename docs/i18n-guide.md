# Internationalization (i18n) Guide

This guide explains how to manage translations in the ChurchTools Inventory Extension.

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Adding New Translation Keys](#adding-new-translation-keys)
4. [Namespace Conventions](#namespace-conventions)
5. [Using Translations in Code](#using-translations-in-code)
6. [Handling Dynamic Keys](#handling-dynamic-keys)
7. [Running Validation](#running-validation)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The project uses [i18next](https://www.i18next.com/) for internationalization with React integration via [react-i18next](https://react.i18next.com/). Translations are organized by feature namespaces in JSON files.

### Key Features
- Type-safe translation keys
- Namespace-based organization
- Automatic key extraction and validation
- CI integration for missing key detection

---

## Project Structure

```
src/i18n/
├── config.ts              # i18next configuration
├── bookingStrings.ts      # Booking-related string mappings
└── locales/
    └── en/                # English locale (primary)
        ├── assets.json    # Asset management translations
        ├── assignment.json
        ├── common.json    # Shared translations
        ├── damage.json
        ├── dashboard.json
        ├── kits.json
        ├── maintenance.json
        ├── models.json
        ├── navigation.json
        ├── settings.json
        ├── tags.json
        ├── undo.json
        └── views.json

scripts/
├── extract-i18n-keys.mjs  # Extract keys from source code
└── validate-i18n.mjs      # Validate keys exist in locale files
```

---

## Adding New Translation Keys

### Step 1: Add the key to the locale file

Open the appropriate namespace file in `src/i18n/locales/en/` and add your key:

```json
// src/i18n/locales/en/assets.json
{
  "existingKey": "Existing translation",
  "newSection": {
    "title": "New Section Title",
    "description": "This is a new description"
  }
}
```

### Step 2: Use the key in code

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('assets');
  
  return (
    <div>
      <h1>{t('newSection.title')}</h1>
      <p>{t('newSection.description')}</p>
    </div>
  );
}
```

### Step 3: Validate your changes

```bash
# Extract keys from source and validate
npm run i18n:check

# Or run separately:
npm run i18n:extract
npm run i18n:validate
```

---

## Namespace Conventions

| Namespace | Purpose | Example Keys |
|-----------|---------|--------------|
| `common` | Shared strings (actions, labels) | `actions.save`, `labels.name` |
| `assets` | Asset management | `list.title`, `detail.edit` |
| `maintenance` | Maintenance/work orders | `rules.create`, `workOrders.state` |
| `kits` | Kit management | `form.name`, `errors.invalid` |
| `settings` | Settings page | `export.title`, `scanner.setup` |
| `navigation` | Nav items | `home`, `assets`, `maintenance` |
| `tags` | Tag management | `create`, `delete`, `colors` |
| `views` | Data views | `saved`, `filters` |
| `undo` | Undo/history | `action.reverted`, `history.empty` |
| `damage` | Damage reports | `report.title`, `severity.high` |
| `dashboard` | Dashboard | `metrics.total`, `charts.status` |
| `assignment` | Asset assignments | `assign.title`, `return.confirm` |
| `models` | Asset models | `form.create`, `list.empty` |

---

## Using Translations in Code

### Basic Usage

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  // Single namespace
  const { t } = useTranslation('assets');
  return <h1>{t('list.title')}</h1>;
}
```

### Multiple Namespaces

```tsx
function MyComponent() {
  // Multiple namespaces
  const { t } = useTranslation(['assets', 'common']);
  
  return (
    <div>
      <h1>{t('assets:list.title')}</h1>
      <button>{t('common:actions.save')}</button>
    </div>
  );
}
```

### With Interpolation

```tsx
// In locale file:
// "greeting": "Hello, {{name}}!"
// "items": "{{count}} item(s) selected"

function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <p>{t('greeting', { name: 'John' })}</p>
      <p>{t('items', { count: 5 })}</p>
    </div>
  );
}
```

### Pluralization

```tsx
// In locale file:
// "asset": "{{count}} asset",
// "asset_other": "{{count}} assets"

function AssetCount({ count }) {
  const { t } = useTranslation('assets');
  return <span>{t('asset', { count })}</span>;
}
```

---

## Handling Dynamic Keys

Some keys are constructed dynamically and cannot be statically validated. These require special handling.

### Example: Status-based Keys

```tsx
// Dynamic key construction
const statusKey = `status.${asset.status}`; // e.g., 'status.available'
t(statusKey);

// Better: Explicit mapping (allows static validation)
const statusMessages = {
  available: t('status.available'),
  'in-use': t('status.inUse'),
  broken: t('status.broken'),
};
return statusMessages[asset.status];
```

### Validation for Dynamic Keys

The extraction script flags dynamic keys for manual verification:

```
⚡ t(`status.${status}`)
   File: src/components/AssetStatus.tsx:42
```

When you see these warnings, verify:
1. All possible key values exist in the locale file
2. Consider refactoring to explicit mappings if possible

---

## Running Validation

### Available Commands

```bash
# Extract all i18n keys from source code
npm run i18n:extract

# Validate extracted keys exist in locale files
npm run i18n:validate

# Run both extraction and validation
npm run i18n:check
```

### Validation Output

```
=== i18n Validation Results ===

Total extracted keys: 342
Valid keys: 340
Missing keys: 2
Unused keys: 15
Dynamic keys (manual check): 5

--- Missing Keys ---

  ❌ assets:bulkActions.newFeature
     Reason: Key 'bulkActions.newFeature' not found in assets.json
     Used in: src/components/assets/BulkActionBar.tsx:45

--- Unused Keys (first 10) ---

  ⚠️  common:deprecated.oldKey

✅ Validation PASSED / ❌ Validation FAILED
```

### CI Integration

The validation runs as part of the CI pipeline. If missing keys are detected, the build will fail.

To run the same check locally before committing:

```bash
npm run i18n:check
```

---

## Common Patterns

### Action Buttons

```json
// common.json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "close": "Close"
  }
}
```

```tsx
<Button onClick={handleSave}>{t('common:actions.save')}</Button>
<Button onClick={handleCancel}>{t('common:actions.cancel')}</Button>
```

### Form Labels

```json
// assets.json
{
  "form": {
    "name": "Name",
    "description": "Description",
    "status": "Status",
    "location": "Location"
  }
}
```

```tsx
<TextInput label={t('form.name')} />
<Select label={t('form.status')} />
```

### Success/Error Messages

```json
// assets.json
{
  "notifications": {
    "created": "Asset created successfully",
    "updated": "Asset updated successfully",
    "deleted": "Asset deleted successfully",
    "error": "An error occurred"
  }
}
```

```tsx
notifications.show({
  title: t('notifications.created'),
  color: 'green',
});
```

### Confirmation Dialogs

```json
// assets.json
{
  "confirmDelete": {
    "title": "Delete Asset",
    "message": "Are you sure you want to delete this asset?",
    "confirm": "Delete",
    "cancel": "Cancel"
  }
}
```

---

## Troubleshooting

### Key Not Found at Runtime

If you see `assets:missing.key` rendered in the UI:

1. Check the key exists in the locale file
2. Verify the namespace is correct
3. Run `npm run i18n:check` to find the issue

### Namespace Not Loading

If translations from a specific namespace aren't loading:

1. Check the file exists: `src/i18n/locales/en/{namespace}.json`
2. Verify the JSON is valid (no syntax errors)
3. Check the namespace is imported in `useTranslation()`

### Interpolation Not Working

```tsx
// Wrong - missing curly braces
t('greeting', { name });

// Correct
t('greeting', { name: userName });
```

Ensure your locale file uses double curly braces: `"greeting": "Hello, {{name}}!"`

### Validation Fails but Key Exists

The extraction script might miss some patterns. Check if:

1. You're using an unusual `t()` call pattern
2. The key is in a different namespace than expected
3. The file is excluded from extraction (check `getAllFiles()` in the script)

---

## Adding New Languages

Currently, the project only supports English. To add a new language:

1. Create a new locale directory: `src/i18n/locales/{lang}/`
2. Copy all JSON files from `en/` to the new directory
3. Translate all values (keep keys the same)
4. Update `src/i18n/config.ts` to include the new language

---

## Best Practices

1. **Keep keys consistent**: Use dot notation for nesting (`section.subsection.key`)
2. **Group related keys**: Put related translations together in the JSON
3. **Use namespaces wisely**: Don't put everything in `common`
4. **Avoid duplicate values**: If the same text is used across features, consider `common`
5. **Run validation before committing**: `npm run i18n:check`
6. **Document dynamic keys**: Add comments for keys that can't be statically validated
7. **Prefer explicit over dynamic**: Map enum values to explicit keys when possible
