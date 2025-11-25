# Rate Limiting Requirements

**Status**: Approved  
**References**: CHK065  
**Last Updated**: 2025-01-20

## Overview

This document defines rate limiting mitigation strategies for ChurchTools API interactions, ensuring reliable operation under API rate limits with request queuing, exponential backoff, and intelligent caching.

## 1. ChurchTools API Rate Limits

### 1.1 Assumed Limits

**Note**: ChurchTools rate limits may vary by instance. These are conservative assumptions:

- **Per-minute limit**: 60 requests/minute (average 1 request/second)
- **Burst limit**: 10 requests/second (short bursts allowed)
- **Per-hour limit**: 3000 requests/hour
- **Response headers**: 
  - `X-RateLimit-Limit`: Total allowed requests
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `Retry-After`: Seconds to wait before retry (on 429 response)

### 1.2 Rate Limit Detection

```typescript
interface RateLimitInfo {
  limit: number;           // Total allowed
  remaining: number;       // Remaining in window
  reset: Date;             // When limit resets
  retryAfter?: number;     // Seconds to wait (if rate limited)
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    limit: parseInt(headers.get('X-RateLimit-Limit') || '60', 10),
    remaining: parseInt(headers.get('X-RateLimit-Remaining') || '60', 10),
    reset: new Date(
      parseInt(headers.get('X-RateLimit-Reset') || '0', 10) * 1000
    ),
    retryAfter: headers.get('Retry-After') 
      ? parseInt(headers.get('Retry-After')!, 10)
      : undefined,
  };
}
```

## 2. Mitigation Strategies

### 2.1 Request Queue

**Queue requests** to control concurrency and respect rate limits:

```typescript
import PQueue from 'p-queue';

interface RequestQueueConfig {
  concurrency: number;      // Max parallel requests
  interval: number;         // Time window (ms)
  intervalCap: number;      // Max requests per interval
}

class ChurchToolsRequestQueue {
  private queue: PQueue;
  private rateLimitInfo: RateLimitInfo | null = null;
  
  constructor(config: RequestQueueConfig = {
    concurrency: 10,        // 10 parallel requests
    interval: 1000,         // 1 second
    intervalCap: 10,        // 10 requests/second (burst)
  }) {
    this.queue = new PQueue(config);
  }
  
  async add<T>(
    fn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    // Check if we're close to rate limit
    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 5) {
      const waitTime = this.rateLimitInfo.reset.getTime() - Date.now();
      
      if (waitTime > 0) {
        console.warn(`[Rate Limit] Close to limit, waiting ${waitTime}ms`);
        await sleep(waitTime);
      }
    }
    
    return this.queue.add(fn, { priority });
  }
  
  updateRateLimitInfo(info: RateLimitInfo) {
    this.rateLimitInfo = info;
    
    // If rate limited, pause queue
    if (info.retryAfter) {
      this.pauseQueue(info.retryAfter * 1000);
    }
  }
  
  private pauseQueue(ms: number) {
    this.queue.pause();
    
    setTimeout(() => {
      this.queue.start();
    }, ms);
  }
  
  get size(): number {
    return this.queue.size + this.queue.pending;
  }
  
  clear() {
    this.queue.clear();
  }
}

export const requestQueue = new ChurchToolsRequestQueue();
```

### 2.2 Exponential Backoff

**Handle 429 responses** with exponential backoff:

```typescript
async function handleRateLimitError(
  error: AxiosError,
  attempt: number
): Promise<void> {
  const headers = error.response?.headers;
  const retryAfter = headers?.['retry-after'];
  
  let waitTime: number;
  
  if (retryAfter) {
    // Use server-provided retry time
    waitTime = parseInt(retryAfter, 10) * 1000;
  } else {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    waitTime = Math.min(1000 * Math.pow(2, attempt), 60000);  // Max 60s
  }
  
  // Show user feedback
  showRateLimitNotification(waitTime);
  
  // Wait before retry
  await sleep(waitTime);
}

function showRateLimitNotification(waitTimeMs: number) {
  const seconds = Math.ceil(waitTimeMs / 1000);
  
  notifications.show({
    id: 'rate-limit-wait',
    title: t('errors.ERR_API_429.title'),
    message: t('errors.ERR_API_429.message', { seconds }),
    color: 'orange',
    icon: <IconClock />,
    loading: true,
    autoClose: waitTimeMs,
  });
}
```

### 2.3 Request Batching

**Batch multiple requests** into single API calls when possible:

```typescript
interface BatchRequest {
  method: string;
  url: string;
  data?: any;
}

async function batchRequests(
  requests: BatchRequest[]
): Promise<any[]> {
  // Check if ChurchTools supports batch API
  const supportsBatch = await checkBatchApiSupport();
  
  if (!supportsBatch || requests.length === 1) {
    // Fall back to individual requests
    return Promise.all(
      requests.map(req => axios(req))
    );
  }
  
  // Use batch API
  const response = await axios.post('/api/batch', {
    requests: requests.map((req, index) => ({
      id: index,
      method: req.method,
      url: req.url,
      body: req.data,
    })),
  });
  
  return response.data.responses;
}

// Example: Batch asset fetches
const assetIds = ['id1', 'id2', 'id3'];

// ❌ Bad: 3 individual requests
for (const id of assetIds) {
  await assetService.getById(id);
}

// ✅ Good: 1 batched request
const assets = await batchRequests(
  assetIds.map(id => ({
    method: 'GET',
    url: `/api/assets/${id}`,
  }))
);
```

### 2.4 Request Debouncing

**Debounce rapid user actions** to reduce request count:

```typescript
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';

function AssetSearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounce search by 300ms
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
  
  const { data: results } = useQuery({
    queryKey: ['assets', 'search', debouncedSearchTerm],
    queryFn: () => assetService.search(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 2,
  });
  
  return (
    <TextInput
      placeholder="Search assets..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
}

// User types "Camera"
// Without debounce: 6 requests (C, Ca, Cam, Came, Camer, Camera)
// With debounce: 1 request (Camera) after 300ms of inactivity
```

### 2.5 Caching with TanStack Query

**Cache responses** to reduce redundant requests:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 60 seconds
      staleTime: 60000,
      
      // Keep in memory for 5 minutes
      cacheTime: 300000,
      
      // Reuse cached data across components
      refetchOnMount: false,
      
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      
      // Refetch when back online
      refetchOnReconnect: true,
    },
  },
});

// Example: Multiple components use same asset data
function AssetDetailPage() {
  const { data: asset } = useQuery({
    queryKey: ['assets', assetId],
    queryFn: () => assetService.getById(assetId),
  });
  // ...
}

function AssetEditForm() {
  const { data: asset } = useQuery({
    queryKey: ['assets', assetId],  // Same key = cached
    queryFn: () => assetService.getById(assetId),
  });
  // No additional API request! Uses cached data
}
```

## 3. Priority Queue

### 3.1 Request Priority Levels

Prioritize requests based on user intent:

**High Priority** (0): User-initiated actions
- Form submissions (create/update asset)
- Damage report creation
- Work order actions
- Delete operations

**Medium Priority** (50): Background refreshes
- Auto-refresh list data
- Polling for updates
- Sync operations

**Low Priority** (100): Non-critical operations
- Preloading next page
- Telemetry/analytics
- Non-essential caching

### 3.2 Implementation

```typescript
class PriorityRequestQueue extends ChurchToolsRequestQueue {
  async addHigh<T>(fn: () => Promise<T>): Promise<T> {
    return this.add(fn, 0);  // Highest priority
  }
  
  async addMedium<T>(fn: () => Promise<T>): Promise<T> {
    return this.add(fn, 50);
  }
  
  async addLow<T>(fn: () => Promise<T>): Promise<T> {
    return this.add(fn, 100);  // Lowest priority
  }
}

export const requestQueue = new PriorityRequestQueue();

// Usage
// User clicks "Save" button
await requestQueue.addHigh(() => 
  assetService.update(assetId, updates)
);

// Background refresh (not urgent)
await requestQueue.addLow(() => 
  assetService.getAll()
);
```

## 4. User Feedback

### 4.1 Rate Limit Banner

**Show persistent banner** when rate limited:

```tsx
import { Alert, Text, Progress } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

function RateLimitBanner({ 
  visible, 
  retryAfter 
}: { 
  visible: boolean; 
  retryAfter: number; 
}) {
  const [countdown, setCountdown] = useState(retryAfter);
  
  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <Alert
      icon={<IconAlertCircle />}
      title="Rate Limit Reached"
      color="orange"
      mb="md"
    >
      <Text size="sm" mb="xs">
        Too many requests. Slowing down to avoid errors...
      </Text>
      
      <Progress 
        value={(1 - countdown / retryAfter) * 100} 
        size="sm" 
        color="orange"
        animate
      />
      
      <Text size="xs" color="dimmed" mt="xs">
        Retrying in {countdown} seconds
      </Text>
    </Alert>
  );
}
```

### 4.2 Queue Status Indicator

**Show queue size** in UI:

```tsx
import { Badge, Tooltip } from '@mantine/core';
import { IconLoader } from '@tabler/icons-react';

function QueueStatusIndicator() {
  const queueSize = useRequestQueueSize();
  
  if (queueSize === 0) return null;
  
  return (
    <Tooltip label={`${queueSize} requests pending`}>
      <Badge 
        leftSection={<IconLoader size={12} />}
        color="blue"
        variant="light"
      >
        {queueSize}
      </Badge>
    </Tooltip>
  );
}
```

### 4.3 Disable Non-Critical Features

**During high load**, disable non-essential features:

```typescript
function useHighLoadMode() {
  const [highLoad, setHighLoad] = useState(false);
  const queueSize = useRequestQueueSize();
  
  useEffect(() => {
    // High load if >50 requests queued
    setHighLoad(queueSize > 50);
  }, [queueSize]);
  
  return highLoad;
}

function AssetListPage() {
  const highLoad = useHighLoadMode();
  
  return (
    <div>
      <AssetList />
      
      {/* Disable preloading during high load */}
      {!highLoad && <PreloadNextPage />}
      
      {/* Disable live updates during high load */}
      {!highLoad && <LiveUpdatePoller />}
    </div>
  );
}
```

## 5. Monitoring & Logging

### 5.1 Rate Limit Metrics

**Track rate limit hits** for monitoring:

```typescript
interface RateLimitMetrics {
  totalRequests: number;
  rateLimitHits: number;
  avgWaitTime: number;      // milliseconds
  maxQueueSize: number;
  lastRateLimitDate: Date | null;
}

class RateLimitMonitor {
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    rateLimitHits: 0,
    avgWaitTime: 0,
    maxQueueSize: 0,
    lastRateLimitDate: null,
  };
  
  recordRequest() {
    this.metrics.totalRequests++;
  }
  
  recordRateLimit(waitTime: number) {
    this.metrics.rateLimitHits++;
    this.metrics.lastRateLimitDate = new Date();
    
    // Update average wait time
    const prevAvg = this.metrics.avgWaitTime;
    const count = this.metrics.rateLimitHits;
    this.metrics.avgWaitTime = (prevAvg * (count - 1) + waitTime) / count;
  }
  
  recordQueueSize(size: number) {
    this.metrics.maxQueueSize = Math.max(this.metrics.maxQueueSize, size);
  }
  
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }
  
  reset() {
    this.metrics = {
      totalRequests: 0,
      rateLimitHits: 0,
      avgWaitTime: 0,
      maxQueueSize: 0,
      lastRateLimitDate: null,
    };
  }
}

export const rateLimitMonitor = new RateLimitMonitor();
```

### 5.2 Development Logging

**Log rate limit events** in development:

```typescript
function logRateLimitEvent(
  event: 'hit' | 'close' | 'recovered',
  details: any
) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const colors = {
    hit: '🔴',
    close: '🟡',
    recovered: '🟢',
  };
  
  console.log(
    `${colors[event]} [Rate Limit ${event.toUpperCase()}]`,
    details
  );
}

// Usage
logRateLimitEvent('hit', {
  remaining: 0,
  reset: new Date(),
  waitTime: 60000,
});

logRateLimitEvent('close', {
  remaining: 5,
  limit: 60,
  percentage: '8%',
});

logRateLimitEvent('recovered', {
  queueSize: 0,
  totalWait: 120000,
});
```

## 6. Adaptive Rate Limiting

### 6.1 Dynamic Adjustment

**Adjust queue settings** based on observed rate limits:

```typescript
class AdaptiveRequestQueue extends PriorityRequestQueue {
  private consecutiveRateLimits = 0;
  
  updateRateLimitInfo(info: RateLimitInfo) {
    super.updateRateLimitInfo(info);
    
    if (info.retryAfter) {
      this.consecutiveRateLimits++;
      
      // After 3 consecutive rate limits, slow down permanently
      if (this.consecutiveRateLimits >= 3) {
        this.reduceRequestRate();
      }
    } else {
      this.consecutiveRateLimits = 0;
    }
  }
  
  private reduceRequestRate() {
    console.warn('[Rate Limit] Reducing request rate permanently');
    
    // Reduce concurrency from 10 to 5
    this.queue.concurrency = 5;
    
    // Reduce interval cap from 10/sec to 5/sec
    this.queue.intervalCap = 5;
  }
}
```

### 6.2 Smart Prefetching

**Disable prefetching** when approaching rate limit:

```typescript
function useSmartPrefetch() {
  const rateLimitInfo = useRateLimitInfo();
  
  const shouldPrefetch = useMemo(() => {
    if (!rateLimitInfo) return true;
    
    // Disable prefetch if <20% remaining
    const percentRemaining = 
      (rateLimitInfo.remaining / rateLimitInfo.limit) * 100;
    
    return percentRemaining > 20;
  }, [rateLimitInfo]);
  
  return shouldPrefetch;
}

function AssetList() {
  const shouldPrefetch = useSmartPrefetch();
  
  // Only prefetch next page if we have headroom
  useQuery({
    queryKey: ['assets', 'page', 2],
    queryFn: () => assetService.getPage(2),
    enabled: shouldPrefetch,
  });
}
```

## 7. Axios Integration

### 7.1 Axios Interceptor

```typescript
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Request interceptor: Add to queue
axios.interceptors.request.use(
  async (config) => {
    // Queue all requests
    await requestQueue.add(async () => {
      rateLimitMonitor.recordRequest();
      rateLimitMonitor.recordQueueSize(requestQueue.size);
    });
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle rate limits
axios.interceptors.response.use(
  (response) => {
    // Update rate limit info from headers
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    requestQueue.updateRateLimitInfo(rateLimitInfo);
    
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 429) {
      // Rate limited
      const rateLimitInfo = parseRateLimitHeaders(error.response.headers);
      requestQueue.updateRateLimitInfo(rateLimitInfo);
      
      const waitTime = (rateLimitInfo.retryAfter || 60) * 1000;
      rateLimitMonitor.recordRateLimit(waitTime);
      logRateLimitEvent('hit', rateLimitInfo);
      
      // Wait and retry
      await handleRateLimitError(error, 0);
      return axios(error.config!);
    }
    
    return Promise.reject(error);
  }
);
```

## 8. Testing Requirements

### 8.1 Rate Limit Tests

```typescript
import { vi } from 'vitest';
import axios from 'axios';

test('queues requests to respect rate limits', async () => {
  const mockRequest = vi.fn().mockResolvedValue({ data: 'success' });
  
  const queue = new ChurchToolsRequestQueue({
    concurrency: 5,
    interval: 1000,
    intervalCap: 5,
  });
  
  // Queue 20 requests
  const promises = Array.from({ length: 20 }, () =>
    queue.add(mockRequest)
  );
  
  await Promise.all(promises);
  
  expect(mockRequest).toHaveBeenCalledTimes(20);
  // Verify requests were spread out over time
});

test('pauses queue on 429 response', async () => {
  const queue = new ChurchToolsRequestQueue();
  
  queue.updateRateLimitInfo({
    limit: 60,
    remaining: 0,
    reset: new Date(Date.now() + 60000),
    retryAfter: 60,
  });
  
  expect(queue['queue'].isPaused).toBe(true);
  
  // Should resume after retryAfter
  await sleep(60100);
  expect(queue['queue'].isPaused).toBe(false);
});
```

### 8.2 Priority Tests

```typescript
test('processes high-priority requests first', async () => {
  const queue = new PriorityRequestQueue();
  const callOrder: number[] = [];
  
  // Add in reverse priority order
  queue.addLow(async () => { callOrder.push(3); });
  queue.addMedium(async () => { callOrder.push(2); });
  queue.addHigh(async () => { callOrder.push(1); });
  
  await queue.onIdle();
  
  expect(callOrder).toEqual([1, 2, 3]);
});
```

## 9. Implementation Checklist

- [ ] Install p-queue library (`npm install p-queue`)
- [ ] Create ChurchToolsRequestQueue class
- [ ] Add priority queue implementation
- [ ] Integrate queue with Axios interceptors
- [ ] Parse rate limit headers from responses
- [ ] Implement exponential backoff for 429 errors
- [ ] Add rate limit banner UI component
- [ ] Implement request debouncing for search
- [ ] Configure TanStack Query caching
- [ ] Add rate limit monitoring/metrics
- [ ] Write tests for queue and rate limit handling
- [ ] Document rate limit patterns in developer guide

## References

- CHK065: ChurchTools API rate limiting
- p-queue: https://github.com/sindresorhus/p-queue
- API_ERROR_HANDLING.md: 429 error handling
- comprehensive-requirements.md
