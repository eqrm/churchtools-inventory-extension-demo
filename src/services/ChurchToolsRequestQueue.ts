/**
 * ChurchTools Request Queue
 * 
 * Provides rate limiting and request queuing for ChurchTools API interactions.
 * Implements RATE_LIMITING.md requirements with p-queue integration.
 */

import PQueue from 'p-queue';
import { createError, ERROR_CODES } from '../utils/errorCodes';

/**
 * Rate limit information from response headers
 */
export interface RateLimitInfo {
  limit: number; // Total allowed requests
  remaining: number; // Requests remaining in current window
  reset: Date; // When limit resets
  retryAfter?: number; // Seconds to wait (if rate limited)
}

/**
 * Request queue configuration
 */
export interface RequestQueueConfig {
  concurrency?: number; // Max parallel requests (default: 10)
  interval?: number; // Time window in ms (default: 1000)
  intervalCap?: number; // Max requests per interval (default: 10)
}

/**
 * Request priority levels
 */
export const RequestPriority = {
  LOW: 0,
  MEDIUM: 5,
  HIGH: 10,
} as const;

export type RequestPriority = typeof RequestPriority[keyof typeof RequestPriority];

/**
 * ChurchTools Request Queue with rate limiting
 */
export class ChurchToolsRequestQueue {
  private queue: PQueue;
  private rateLimitInfo: RateLimitInfo | null = null;
  private rateLimitWarningThreshold = 10; // Warn when <10 requests remaining

  constructor(config: RequestQueueConfig = {}) {
    const {
      concurrency = 10, // 10 parallel requests
      interval = 1000, // 1 second
      intervalCap = 10, // 10 requests/second (burst)
    } = config;

    this.queue = new PQueue({
      concurrency,
      interval,
      intervalCap,
    });
  }

  /**
   * Add a request to the queue with priority
   */
  async add<T>(fn: () => Promise<T>, priority: RequestPriority = RequestPriority.MEDIUM): Promise<T> {
    // Check if we're close to rate limit
    if (this.isApproachingRateLimit()) {
      console.warn('Approaching ChurchTools API rate limit', {
        remaining: this.rateLimitInfo?.remaining,
        reset: this.rateLimitInfo?.reset,
      });
    }

    return this.queue.add(fn, { priority });
  }

  /**
   * Parse rate limit headers from response
   */
  parseRateLimitHeaders(headers: Headers): RateLimitInfo {
    const info: RateLimitInfo = {
      limit: parseInt(headers.get('X-RateLimit-Limit') || '60', 10),
      remaining: parseInt(headers.get('X-RateLimit-Remaining') || '60', 10),
      reset: new Date(parseInt(headers.get('X-RateLimit-Reset') || '0', 10) * 1000),
      retryAfter: headers.get('Retry-After')
        ? parseInt(headers.get('Retry-After') || '0', 10)
        : undefined,
    };

    this.rateLimitInfo = info;
    return info;
  }

  /**
   * Check if approaching rate limit
   */
  isApproachingRateLimit(): boolean {
    if (!this.rateLimitInfo) return false;
    return this.rateLimitInfo.remaining < this.rateLimitWarningThreshold;
  }

  /**
   * Check if rate limited
   */
  isRateLimited(): boolean {
    if (!this.rateLimitInfo) return false;
    return this.rateLimitInfo.remaining === 0;
  }

  /**
   * Get time to wait before next request (in ms)
   */
  getRetryDelay(): number {
    if (!this.rateLimitInfo) return 0;

    // If retryAfter header present, use it
    if (this.rateLimitInfo.retryAfter) {
      return this.rateLimitInfo.retryAfter * 1000;
    }

    // Otherwise wait until reset time
    const now = new Date();
    const resetTime = this.rateLimitInfo.reset;
    const delay = resetTime.getTime() - now.getTime();

    return Math.max(0, delay);
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(): Promise<void> {
    const delay = this.getRetryDelay();

    if (delay > 0) {
      console.warn(`Waiting ${delay}ms for rate limit to reset`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  /**
   * Get current rate limit info
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused,
    };
  }

  /**
   * Pause the queue
   */
  pause(): void {
    this.queue.pause();
  }

  /**
   * Resume the queue
   */
  start(): void {
    this.queue.start();
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Handle 429 Too Many Requests error
   */
  async handle429Error(headers: Headers): Promise<void> {
    this.parseRateLimitHeaders(headers);

    const retryDelay = this.getRetryDelay();

    throw createError(
      ERROR_CODES.API_RATE_LIMITED,
      `Rate limit exceeded. Please wait ${Math.ceil(retryDelay / 1000)} seconds.`,
      {
        retryAfter: retryDelay,
        reset: this.rateLimitInfo?.reset,
        remaining: this.rateLimitInfo?.remaining,
      },
    );
  }

  /**
   * Exponential backoff with jitter
   */
  static getExponentialBackoff(attempt: number, baseDelayMs = 1000, maxDelayMs = 30000): number {
    const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
    
    // Add jitter (random 0-25% of delay)
    const jitter = Math.random() * 0.25 * exponentialDelay;
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Retry request with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000,
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delay = ChurchToolsRequestQueue.getExponentialBackoff(attempt, baseDelayMs);
        
        console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`, error);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Singleton instance
 */
let requestQueueInstance: ChurchToolsRequestQueue | null = null;

/**
 * Get or create singleton request queue
 */
export function getRequestQueue(config?: RequestQueueConfig): ChurchToolsRequestQueue {
  if (!requestQueueInstance) {
    requestQueueInstance = new ChurchToolsRequestQueue(config);
  }
  return requestQueueInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetRequestQueue(): void {
  requestQueueInstance = null;
}
