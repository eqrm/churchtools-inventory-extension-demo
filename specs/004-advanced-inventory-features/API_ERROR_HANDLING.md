# API Error Handling Requirements

**Status**: Approved  
**References**: CHK031, CHK046  
**Last Updated**: 2025-01-20

## Overview

This document defines error handling requirements for ChurchTools API interactions, ensuring robust retry strategies, graceful degradation, and user-friendly error feedback.

## 1. ChurchTools API Error Types

### 1.1 HTTP Status Codes

**Expected Error Responses**:
- `400 Bad Request`: Invalid request data, validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks permission for requested resource
- `404 Not Found`: Resource doesn't exist
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: ChurchTools server error
- `502 Bad Gateway`: ChurchTools proxy/gateway error
- `503 Service Unavailable`: ChurchTools temporarily down
- `504 Gateway Timeout`: ChurchTools request timeout

### 1.2 Network Errors

**Non-HTTP Errors**:
- Network disconnection (offline)
- DNS resolution failure
- Connection timeout
- Request timeout (no response)
- CORS errors (misconfiguration)

## 2. Error Handling Strategies

### 2.1 Strategy Matrix

| Status Code | Strategy | User Feedback | Retry |
|-------------|----------|---------------|-------|
| 400 | Show validation errors | Inline form errors | No |
| 401 | Redirect to login | Toast notification | No |
| 403 | Show permission error | Modal dialog | No |
| 404 | Show not found page | Empty state | No |
| 429 | Queue request | Banner with countdown | Yes (after delay) |
| 500 | Retry with backoff | Toast with retry button | Yes (3x) |
| 502 | Retry with backoff | Toast with retry button | Yes (3x) |
| 503 | Retry with backoff | Banner "Service unavailable" | Yes (5x) |
| 504 | Retry with backoff | Toast with retry button | Yes (3x) |
| Network | Detect offline/online | Banner "You're offline" | Yes (when online) |

### 2.2 Retry Configuration

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // milliseconds
  maxDelay: number;       // milliseconds
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,        // 1 second
  maxDelay: 10000,        // 10 seconds
  retryableStatuses: [429, 500, 502, 503, 504],
};
```

## 3. Exponential Backoff Implementation

### 3.1 Backoff Algorithm

```typescript
function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential: 1s, 2s, 4s, 8s...
  const delay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  
  // Cap at maxDelay
  return Math.min(delay + jitter, maxDelay);
}

// Examples:
// Attempt 0: 1000ms ± 100ms = 900-1100ms
// Attempt 1: 2000ms ± 200ms = 1800-2200ms
// Attempt 2: 4000ms ± 400ms = 3600-4400ms
// Attempt 3: 8000ms ± 800ms = 7200-8800ms
```

### 3.2 Retry Loop

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if not retryable
      if (!isRetryable(error, config.retryableStatuses)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw error;
      }
      
      // Calculate delay
      const delay = calculateBackoff(
        attempt,
        config.baseDelay,
        config.maxDelay
      );
      
      // Log retry
      console.warn(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`, {
        error: error.message,
      });
      
      // Wait before retry
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

function isRetryable(error: Error, retryableStatuses: number[]): boolean {
  // Network errors are retryable
  if (error.message.includes('Network Error')) {
    return true;
  }
  
  // Check HTTP status
  const status = (error as any).response?.status;
  return retryableStatuses.includes(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 4. Status-Specific Handlers

### 4.1 401 Unauthorized

**Behavior**: User session expired or invalid token

```typescript
import { notifications } from '@mantine/notifications';
import { IconLock } from '@tabler/icons-react';

function handle401Error(error: AxiosError) {
  // Log user out
  authService.logout();
  
  // Show notification
  notifications.show({
    title: t('errors.ERR_AUTH_401.title'),
    message: t('errors.ERR_AUTH_401.message'),
    color: 'red',
    icon: <IconLock />,
    autoClose: false,  // Don't auto-dismiss
  });
  
  // Redirect to ChurchTools login
  window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
}
```

### 4.2 403 Forbidden

**Behavior**: User lacks permission for resource

```typescript
function handle403Error(error: AxiosError, context: { resource: string }) {
  notifications.show({
    title: t('errors.ERR_AUTH_403.title'),
    message: t('errors.ERR_AUTH_403.message', { resource: context.resource }),
    color: 'red',
    icon: <IconShieldOff />,
    autoClose: 5000,
  });
  
  // Log for debugging
  console.error('[403 Forbidden]', {
    url: error.config?.url,
    method: error.config?.method,
    resource: context.resource,
    userId: currentUser.id,
  });
}
```

### 4.3 429 Rate Limit

**Behavior**: Too many requests, queue and retry

```typescript
function handle429Error(error: AxiosError): Promise<any> {
  const retryAfter = parseRetryAfter(error.response?.headers['retry-after']);
  
  // Show countdown banner
  const notificationId = notifications.show({
    title: t('errors.ERR_API_429.title'),
    message: t('errors.ERR_API_429.message', { seconds: retryAfter }),
    color: 'orange',
    icon: <IconClock />,
    loading: true,
    autoClose: false,
  });
  
  // Countdown
  let remaining = retryAfter;
  const countdownInterval = setInterval(() => {
    remaining--;
    
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      notifications.hide(notificationId);
    } else {
      notifications.update({
        id: notificationId,
        message: t('errors.ERR_API_429.message', { seconds: remaining }),
      });
    }
  }, 1000);
  
  // Wait and retry
  return sleep(retryAfter * 1000).then(() => {
    return withRetry(() => axios(error.config!));
  });
}

function parseRetryAfter(header: string | undefined): number {
  if (!header) return 60;  // Default 60 seconds
  
  // Parse as seconds (integer) or HTTP date
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return seconds;
  
  // Parse as date
  const retryDate = new Date(header);
  const now = new Date();
  return Math.max(1, Math.ceil((retryDate.getTime() - now.getTime()) / 1000));
}
```

### 4.4 5xx Server Errors

**Behavior**: ChurchTools server error, retry with backoff

```typescript
async function handle5xxError(error: AxiosError): Promise<any> {
  const statusText = error.response?.statusText || 'Server Error';
  
  // Show error with retry button
  const notificationId = notifications.show({
    title: t('errors.ERR_API_500.title'),
    message: t('errors.ERR_API_500.message', { statusText }),
    color: 'red',
    icon: <IconServerOff />,
    autoClose: false,
    action: {
      label: t('common.retry'),
      onClick: async () => {
        notifications.hide(notificationId);
        
        try {
          return await withRetry(() => axios(error.config!));
        } catch (retryError) {
          // Show final error
          notifications.show({
            title: t('errors.ERR_API_500.title'),
            message: t('errors.ERR_API_500_FINAL.message'),
            color: 'red',
            icon: <IconX />,
          });
        }
      },
    },
  });
  
  // Auto-retry in background
  return withRetry(() => axios(error.config!), {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    retryableStatuses: [500, 502, 503, 504],
  });
}
```

### 4.5 Network Errors

**Behavior**: Offline detection and queue

```typescript
import { useNetworkState } from '@mantine/hooks';

function handleNetworkError(error: Error): Promise<any> {
  if (!navigator.onLine) {
    // User is offline
    showOfflineBanner();
    
    // Queue request for when online
    return queueForOnline(() => axios(error.config!));
  }
  
  // Online but network error (DNS, timeout, etc.)
  notifications.show({
    title: t('errors.ERR_API_NETWORK.title'),
    message: t('errors.ERR_API_NETWORK.message'),
    color: 'red',
    icon: <IconWifiOff />,
  });
  
  throw error;
}

// Offline banner
function showOfflineBanner() {
  const bannerId = 'offline-banner';
  
  if (document.getElementById(bannerId)) return;  // Already shown
  
  notifications.show({
    id: bannerId,
    title: t('errors.ERR_OFFLINE.title'),
    message: t('errors.ERR_OFFLINE.message'),
    color: 'orange',
    icon: <IconWifiOff />,
    autoClose: false,
    withCloseButton: false,
  });
  
  // Listen for online event
  window.addEventListener('online', () => {
    notifications.hide(bannerId);
    
    // Show "back online" notification
    notifications.show({
      title: t('status.BACK_ONLINE.title'),
      message: t('status.BACK_ONLINE.message'),
      color: 'green',
      icon: <IconWifi />,
    });
    
    // Process queued requests
    processQueuedRequests();
  }, { once: true });
}
```

## 5. Request Queue

### 5.1 Queue Implementation

```typescript
interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  
  add(
    config: AxiosRequestConfig,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: generateId(),
        config,
        resolve,
        reject,
        priority,
        timestamp: new Date(),
      };
      
      this.queue.push(request);
      this.sortQueue();
      
      this.processQueue();
    });
  }
  
  private sortQueue() {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    this.queue.sort((a, b) => {
      // Sort by priority, then timestamp
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }
  
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      try {
        const response = await axios(request.config);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
      
      // Rate limit: Wait 100ms between requests
      await sleep(100);
    }
    
    this.processing = false;
  }
  
  clear() {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
  
  size(): number {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();
```

### 5.2 Priority System

**High Priority**: User-initiated actions (clicks, form submissions)
- Asset create/update
- Damage report submission
- Work order actions

**Medium Priority**: Background refreshes
- List refreshes
- Auto-save
- Polling updates

**Low Priority**: Preloading, analytics
- Next page preload
- Telemetry
- Non-critical caching

```typescript
// Usage
await requestQueue.add(
  { url: '/api/assets', method: 'POST', data: assetData },
  'high'  // User action
);

await requestQueue.add(
  { url: '/api/assets?page=2', method: 'GET' },
  'low'  // Preload next page
);
```

## 6. Axios Interceptors

### 6.1 Request Interceptor

```typescript
import axios from 'axios';

// Add auth token
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add request ID for tracing
axios.interceptors.request.use(
  (config) => {
    config.headers['X-Request-ID'] = generateRequestId();
    return config;
  },
  (error) => Promise.reject(error)
);
```

### 6.2 Response Interceptor

```typescript
axios.interceptors.response.use(
  (response) => response,  // Success, no change
  async (error: AxiosError) => {
    const status = error.response?.status;
    
    // Handle specific status codes
    switch (status) {
      case 401:
        handle401Error(error);
        break;
      case 403:
        handle403Error(error, { resource: 'asset' });
        break;
      case 429:
        return handle429Error(error);
      case 500:
      case 502:
      case 503:
      case 504:
        return handle5xxError(error);
      default:
        // Unknown error
        if (!error.response) {
          // Network error
          return handleNetworkError(error);
        }
    }
    
    return Promise.reject(error);
  }
);
```

## 7. TanStack Query Integration

### 7.1 Query Configuration

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          return false;
        }
        
        // Retry up to 3 times for 5xx errors
        return failureCount < 3;
      },
      
      retryDelay: (attemptIndex) => {
        // Exponential backoff
        return Math.min(1000 * 2 ** attemptIndex, 10000);
      },
      
      staleTime: 60000,  // 60 seconds (reduce redundant requests)
      cacheTime: 300000, // 5 minutes (keep in memory)
      
      refetchOnWindowFocus: false,  // Don't refetch on tab focus
      refetchOnReconnect: true,     // Refetch when back online
    },
    
    mutations: {
      retry: false,  // Don't retry mutations (idempotency concerns)
    },
  },
});
```

### 7.2 Error Handling in Queries

```typescript
import { useQuery } from '@tanstack/react-query';

function AssetListPage() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetService.getAll(),
    onError: (error: AxiosError) => {
      // Custom error handling
      const status = error.response?.status;
      
      if (status !== 401 && status !== 403) {
        // Show error notification (401/403 handled by interceptor)
        notifications.show({
          title: 'Failed to load assets',
          message: error.message,
          color: 'red',
        });
      }
    },
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <EmptyState
        title="Failed to Load Assets"
        description={error.message}
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }
  
  return <AssetList assets={data} />;
}
```

## 8. Testing Requirements

### 8.1 Error Handler Tests

```typescript
import { vi } from 'vitest';
import axios from 'axios';

test('retries 5xx errors with exponential backoff', async () => {
  const mockRequest = vi.fn()
    .mockRejectedValueOnce({ response: { status: 500 } })
    .mockRejectedValueOnce({ response: { status: 500 } })
    .mockResolvedValueOnce({ data: { success: true } });
  
  const result = await withRetry(mockRequest);
  
  expect(mockRequest).toHaveBeenCalledTimes(3);
  expect(result).toEqual({ data: { success: true } });
});

test('does not retry 400 errors', async () => {
  const mockRequest = vi.fn()
    .mockRejectedValue({ response: { status: 400 } });
  
  await expect(withRetry(mockRequest)).rejects.toThrow();
  
  expect(mockRequest).toHaveBeenCalledTimes(1);  // No retries
});

test('redirects on 401 error', async () => {
  const error = { response: { status: 401 } };
  
  handle401Error(error as AxiosError);
  
  expect(window.location.href).toContain('/login');
});
```

### 8.2 Network State Tests

```typescript
test('shows offline banner when network disconnected', () => {
  // Mock offline
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  
  handleNetworkError(new Error('Network Error'));
  
  expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
});
```

## 9. Implementation Checklist

- [ ] Configure Axios with base URL and interceptors
- [ ] Implement retry logic with exponential backoff
- [ ] Create status-specific error handlers (401, 403, 429, 5xx)
- [ ] Implement request queue with priority system
- [ ] Add offline detection and queueing
- [ ] Configure TanStack Query retry behavior
- [ ] Create reusable error notification components
- [ ] Write tests for error handlers and retry logic
- [ ] Document API error codes in ERROR_HANDLING.md
- [ ] Add error monitoring (console logs, future: Sentry)

## References

- CHK031: ChurchTools API error handling consistency
- CHK046: Error recovery requirements
- ERROR_HANDLING.md: Error codes and i18n messages
- TanStack Query: https://tanstack.com/query/
- Axios: https://axios-http.com/
