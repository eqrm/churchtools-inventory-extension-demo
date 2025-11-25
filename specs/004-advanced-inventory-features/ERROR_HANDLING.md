# Error Handling Requirements

**Status**: Approved  
**References**: CHK028, CHK080  
**Last Updated**: 2025-01-20

## Overview

This document defines error handling requirements for the advanced inventory system, ensuring consistent, user-friendly error messages with internationalization (i18n) support and proper error code tracking.

## 1. Error Message Principles

### 1.1 User-Friendly Requirements

All error messages displayed to users must:
- **Be actionable**: Tell the user what went wrong and how to fix it
- **Avoid technical jargon**: No stack traces, HTTP codes, or technical terms in UI
- **Use plain language**: Write for non-technical church staff
- **Be specific**: "Asset name is required" not "Validation error"
- **Be empathetic**: Acknowledge the issue without blaming the user

### 1.2 Developer-Friendly Requirements

Error logs and monitoring must:
- **Include error codes**: Unique identifiers for debugging
- **Include context**: Stack traces, request IDs, affected entity IDs
- **Include severity**: ERROR, WARN, INFO levels
- **Be searchable**: Error codes enable log aggregation and trend analysis

## 2. Error Code System

### 2.1 Error Code Format

**Pattern**: `ERR_[ENTITY]_[NUMBER]`

**Examples**:
- `ERR_ASSET_001`: Asset validation error
- `ERR_WORKORDER_404`: Work order not found
- `ERR_API_500`: ChurchTools API server error
- `ERR_AUTH_401`: Authentication failed

### 2.2 Error Code Ranges

Entity-specific ranges (001-099 per entity):

```
ERR_ASSET_001 - ERR_ASSET_099       Asset-related errors
ERR_KIT_001 - ERR_KIT_099           Kit-related errors
ERR_MODEL_001 - ERR_MODEL_099       Asset model errors
ERR_DAMAGE_001 - ERR_DAMAGE_099     Damage report errors
ERR_ASSIGN_001 - ERR_ASSIGN_099     Assignment errors
ERR_WORKORDER_001 - ERR_WORKORDER_099  Work order errors
ERR_OFFER_001 - ERR_OFFER_099       Offer errors
ERR_MAINT_001 - ERR_MAINT_099       Maintenance errors
ERR_VIEW_001 - ERR_VIEW_099         Data view errors
ERR_SETTINGS_001 - ERR_SETTINGS_099 Settings errors
ERR_UNDO_001 - ERR_UNDO_099         Undo action errors

System-level ranges:
ERR_API_001 - ERR_API_099           ChurchTools API errors
ERR_AUTH_001 - ERR_AUTH_099         Authentication/authorization errors
ERR_VALID_001 - ERR_VALID_099       Validation errors
ERR_STORAGE_001 - ERR_STORAGE_099   Storage/persistence errors
ERR_PHOTO_001 - ERR_PHOTO_099       Photo upload/storage errors
```

### 2.3 Error Code Registry

Maintain centralized registry:

```typescript
// src/constants/errorCodes.ts
export const ERROR_CODES = {
  // Asset Errors
  ASSET_NOT_FOUND: 'ERR_ASSET_001',
  ASSET_NAME_REQUIRED: 'ERR_ASSET_002',
  ASSET_DUPLICATE_BARCODE: 'ERR_ASSET_003',
  ASSET_ACTIVE_ASSIGNMENT: 'ERR_ASSET_004',
  ASSET_INVALID_STATUS: 'ERR_ASSET_005',
  
  // Work Order Errors
  WORKORDER_NOT_FOUND: 'ERR_WORKORDER_001',
  WORKORDER_INVALID_ASSET: 'ERR_WORKORDER_002',
  WORKORDER_NO_ASSIGNEE: 'ERR_WORKORDER_003',
  
  // API Errors
  API_NETWORK_ERROR: 'ERR_API_001',
  API_RATE_LIMIT: 'ERR_API_429',
  API_SERVER_ERROR: 'ERR_API_500',
  
  // Auth Errors
  AUTH_UNAUTHORIZED: 'ERR_AUTH_401',
  AUTH_FORBIDDEN: 'ERR_AUTH_403',
  
  // Validation Errors
  VALID_REQUIRED_FIELD: 'ERR_VALID_001',
  VALID_INVALID_FORMAT: 'ERR_VALID_002',
  VALID_OUT_OF_RANGE: 'ERR_VALID_003',
  
  // Photo Errors
  PHOTO_TOO_LARGE: 'ERR_PHOTO_001',
  PHOTO_INVALID_FORMAT: 'ERR_PHOTO_002',
  PHOTO_LIMIT_EXCEEDED: 'ERR_PHOTO_003',
} as const;
```

## 3. Internationalization (i18n)

### 3.1 Error Message Structure

Store error messages in i18n translation files:

```json
// src/i18n/locales/en.json
{
  "errors": {
    "ERR_ASSET_001": {
      "title": "Asset Not Found",
      "message": "The asset you're looking for doesn't exist or has been deleted.",
      "action": "Check the asset ID or browse the asset list."
    },
    "ERR_ASSET_002": {
      "title": "Asset Name Required",
      "message": "Please enter a name for the asset.",
      "action": "Asset names help identify equipment quickly."
    },
    "ERR_ASSET_003": {
      "title": "Duplicate Barcode",
      "message": "This barcode is already used by another asset.",
      "action": "Choose a unique barcode or leave blank to auto-generate."
    },
    "ERR_ASSET_004": {
      "title": "Active Assignment Exists",
      "message": "This asset is currently assigned and cannot be deleted.",
      "action": "Check in the asset before deleting, or cancel the deletion."
    }
  }
}
```

### 3.2 German (de) Translation

Provide German translations for all error messages:

```json
// src/i18n/locales/de.json
{
  "errors": {
    "ERR_ASSET_001": {
      "title": "Asset nicht gefunden",
      "message": "Das gesuchte Asset existiert nicht oder wurde gelöscht.",
      "action": "Überprüfen Sie die Asset-ID oder durchsuchen Sie die Asset-Liste."
    },
    "ERR_ASSET_002": {
      "title": "Asset-Name erforderlich",
      "message": "Bitte geben Sie einen Namen für das Asset ein.",
      "action": "Asset-Namen helfen, Geräte schnell zu identifizieren."
    }
  }
}
```

### 3.3 i18n Usage Pattern

```typescript
import { useTranslation } from 'react-i18next';
import { ERROR_CODES } from '@/constants/errorCodes';

function AssetForm() {
  const { t } = useTranslation();
  
  function handleError(errorCode: string) {
    const errorKey = `errors.${errorCode}`;
    
    showNotification({
      title: t(`${errorKey}.title`),
      message: t(`${errorKey}.message`),
      color: 'red',
      // Optional action button
      action: {
        label: t('common.learnMore'),
        onClick: () => showHelpDialog(errorCode)
      }
    });
  }
}
```

## 4. Error Display Patterns

### 4.1 Toast Notifications

For transient errors (network failures, validation errors):

```typescript
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';

notifications.show({
  title: t('errors.ERR_API_001.title'),
  message: t('errors.ERR_API_001.message'),
  color: 'red',
  icon: <IconAlertCircle />,
  autoClose: 5000,  // 5 seconds
});
```

### 4.2 Inline Form Errors

For field-level validation:

```tsx
<TextInput
  label="Asset Name"
  error={t('errors.ERR_ASSET_002.message')}
  // Show error without title/action for brevity
/>
```

### 4.3 Modal Error Dialogs

For critical errors requiring acknowledgment:

```tsx
<Modal
  opened={hasError}
  onClose={closeErrorModal}
  title={t('errors.ERR_ASSET_004.title')}
  centered
>
  <Stack spacing="md">
    <Text>{t('errors.ERR_ASSET_004.message')}</Text>
    <Text size="sm" color="dimmed">
      {t('errors.ERR_ASSET_004.action')}
    </Text>
    <Group position="right">
      <Button onClick={closeErrorModal}>OK</Button>
    </Group>
  </Stack>
</Modal>
```

### 4.4 Empty State Error Pages

For missing resources (404):

```tsx
<EmptyState
  icon={<IconAlertCircle size={48} />}
  title={t('errors.ERR_ASSET_001.title')}
  description={t('errors.ERR_ASSET_001.message')}
  action={
    <Button onClick={() => navigate('/assets')}>
      {t('errors.ERR_ASSET_001.action')}
    </Button>
  }
/>
```

## 5. Error Logging

### 5.1 Client-Side Logging

Log errors for debugging without exposing to users:

```typescript
// src/utils/errorLogger.ts
export function logError(
  errorCode: string,
  error: Error,
  context?: Record<string, any>
) {
  console.error('[Error]', {
    code: errorCode,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
  
  // Future: Send to monitoring service (Sentry, LogRocket, etc.)
}
```

### 5.2 Error Context

Include relevant context for debugging:

```typescript
try {
  await assetService.update(assetId, updates);
} catch (error) {
  logError(ERROR_CODES.ASSET_UPDATE_FAILED, error, {
    assetId,
    updates,
    userId: currentUser.id,
    attempt: retryCount + 1,
  });
  
  // Show user-friendly error
  handleError(ERROR_CODES.ASSET_UPDATE_FAILED);
}
```

### 5.3 Error Severity Levels

```typescript
export enum ErrorSeverity {
  INFO = 'INFO',       // Expected errors (validation failures)
  WARN = 'WARN',       // Recoverable errors (network timeouts with retry)
  ERROR = 'ERROR',     // Unexpected errors (API failures)
  CRITICAL = 'CRITICAL' // System failures (auth broken, storage unavailable)
}

export function logError(
  errorCode: string,
  error: Error,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  context?: Record<string, any>
) {
  // Log with severity for filtering/alerting
}
```

## 6. Error Recovery Patterns

### 6.1 Retry Logic

For transient errors (network failures):

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  errorCode: string,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      logError(errorCode, error, ErrorSeverity.WARN, {
        attempt: attempt + 1,
        maxRetries,
      });
      
      // Exponential backoff: 1s, 2s, 4s
      await delay(1000 * Math.pow(2, attempt));
    }
  }
  
  // Final failure after all retries
  logError(errorCode, lastError!, ErrorSeverity.ERROR, {
    finalFailure: true,
    maxRetries,
  });
  
  throw lastError!;
}
```

### 6.2 Fallback Values

For non-critical failures:

```typescript
async function getAssetName(assetId: string): Promise<string> {
  try {
    const asset = await assetService.getById(assetId);
    return asset.name;
  } catch (error) {
    logError(ERROR_CODES.ASSET_NOT_FOUND, error as Error, ErrorSeverity.WARN, {
      assetId,
    });
    
    // Fallback to ID for display
    return `Asset ${assetId}`;
  }
}
```

### 6.3 Offline Detection

For network errors:

```typescript
function handleApiError(error: Error) {
  if (!navigator.onLine) {
    // User is offline
    notifications.show({
      title: t('errors.ERR_API_OFFLINE.title'),
      message: t('errors.ERR_API_OFFLINE.message'),
      color: 'orange',
      icon: <IconWifiOff />,
    });
    return;
  }
  
  // Online but API failed
  handleError(ERROR_CODES.API_NETWORK_ERROR);
}
```

## 7. Validation Error Patterns

### 7.1 Zod Schema Integration

Use Zod for schema validation with error mapping:

```typescript
import { z } from 'zod';
import { ERROR_CODES } from '@/constants/errorCodes';

const assetSchema = z.object({
  name: z.string()
    .min(1, ERROR_CODES.ASSET_NAME_REQUIRED)
    .max(100, ERROR_CODES.ASSET_NAME_TOO_LONG),
  
  barcode: z.string()
    .regex(/^[A-Z0-9-]+$/, ERROR_CODES.ASSET_INVALID_BARCODE)
    .optional(),
  
  status: z.enum(['Available', 'InUse', 'Broken', 'InRepair', 'Retired'], {
    errorMap: () => ({ message: ERROR_CODES.ASSET_INVALID_STATUS }),
  }),
});

// Usage
try {
  const validatedData = assetSchema.parse(formData);
} catch (error) {
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    const errorCode = firstError.message;  // ERROR_CODES.ASSET_NAME_REQUIRED
    
    handleError(errorCode);
  }
}
```

### 7.2 Form Error Display

Map Zod errors to form fields:

```typescript
import { useForm, zodResolver } from '@mantine/form';

const form = useForm({
  validate: zodResolver(assetSchema),
  transformValues: (values) => {
    // Transform error codes to i18n messages
    return values;
  },
});

// Errors automatically shown in form
<TextInput
  label="Asset Name"
  {...form.getInputProps('name')}
  // error prop automatically populated with i18n message
/>
```

## 8. ChurchTools API Error Mapping

### 8.1 HTTP Status Code Mapping

Map ChurchTools API errors to application error codes:

```typescript
function mapApiError(response: Response): string {
  switch (response.status) {
    case 400:
      return ERROR_CODES.API_BAD_REQUEST;
    case 401:
      return ERROR_CODES.AUTH_UNAUTHORIZED;
    case 403:
      return ERROR_CODES.AUTH_FORBIDDEN;
    case 404:
      return ERROR_CODES.API_NOT_FOUND;
    case 429:
      return ERROR_CODES.API_RATE_LIMIT;
    case 500:
    case 502:
    case 503:
      return ERROR_CODES.API_SERVER_ERROR;
    default:
      return ERROR_CODES.API_UNKNOWN_ERROR;
  }
}
```

### 8.2 ChurchTools Error Response Parsing

```typescript
interface ChurchToolsErrorResponse {
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

async function handleChurchToolsError(response: Response) {
  const errorCode = mapApiError(response);
  
  try {
    const body: ChurchToolsErrorResponse = await response.json();
    
    // Log detailed ChurchTools error
    logError(errorCode, new Error(body.message), ErrorSeverity.ERROR, {
      status: response.status,
      url: response.url,
      churchtoolsMessage: body.message,
      churchtoolsErrors: body.errors,
    });
  } catch {
    // Failed to parse JSON, log HTTP error only
    logError(errorCode, new Error(`HTTP ${response.status}`), ErrorSeverity.ERROR, {
      status: response.status,
      url: response.url,
    });
  }
  
  // Show user-friendly error
  handleError(errorCode);
}
```

## 9. Testing Requirements

### 9.1 Error Message Tests

```typescript
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

test('displays user-friendly error for missing asset', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <ErrorDisplay errorCode={ERROR_CODES.ASSET_NOT_FOUND} />
    </I18nextProvider>
  );
  
  expect(screen.getByText(/Asset Not Found/i)).toBeInTheDocument();
  expect(screen.queryByText(/ERR_ASSET_001/)).not.toBeInTheDocument();  // No error codes in UI
  expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();  // No stack traces
});
```

### 9.2 Error Code Registry Tests

```typescript
test('error codes follow naming convention', () {
  Object.entries(ERROR_CODES).forEach(([key, code]) => {
    expect(code).toMatch(/^ERR_[A-Z]+_\d{3}$/);
  });
});

test('error codes have i18n translations', () => {
  const errorCodes = Object.values(ERROR_CODES);
  
  errorCodes.forEach((code) => {
    expect(i18n.exists(`errors.${code}.title`)).toBe(true);
    expect(i18n.exists(`errors.${code}.message`)).toBe(true);
    expect(i18n.exists(`errors.${code}.action`)).toBe(true);
  });
});
```

### 9.3 Retry Logic Tests

```typescript
test('retries failed API calls with exponential backoff', async () => {
  const mockFn = vi.fn()
    .mockRejectedValueOnce(new Error('Network error'))
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({ success: true });
  
  const result = await withRetry(mockFn, ERROR_CODES.API_NETWORK_ERROR);
  
  expect(mockFn).toHaveBeenCalledTimes(3);
  expect(result).toEqual({ success: true });
});
```

## 10. Implementation Checklist

- [ ] Create error code registry (`src/constants/errorCodes.ts`)
- [ ] Add error translations to i18n files (en.json, de.json)
- [ ] Implement error logging utility (`src/utils/errorLogger.ts`)
- [ ] Create reusable error display components (toast, modal, inline)
- [ ] Integrate Zod schema validation with error codes
- [ ] Map ChurchTools API errors to error codes
- [ ] Write tests for error handling (display, retry, logging)
- [ ] Document error codes in developer guide
- [ ] Set up error monitoring (future: Sentry integration)

## References

- CHK028: Validation error message consistency
- CHK080: User-friendly error messages
- i18next documentation: https://www.i18next.com/
- Zod documentation: https://zod.dev/
- Mantine Notifications: https://mantine.dev/others/notifications/
