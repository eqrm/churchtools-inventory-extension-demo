/**
 * Axios Configuration with Error Handling
 * 
 * Configures Axios with base URL, interceptors, and error handling per API_ERROR_HANDLING.md.
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getRequestQueue, ChurchToolsRequestQueue } from '../ChurchToolsRequestQueue';
import { createError, ERROR_CODES } from '../../utils/errorCodes';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Track retry attempts per request
 */
const retryCount = new WeakMap<InternalAxiosRequestConfig, number>();

/**
 * Check if error is retryable
 */
function isRetryableError(error: AxiosError, config: RetryConfig): boolean {
  if (!error.response) {
    // Network error - retryable
    return true;
  }

  return config.retryableStatuses.includes(error.response.status);
}

/**
 * Get retry delay with exponential backoff
 */
function getRetryDelay(attempt: number, config: RetryConfig): number {
  return ChurchToolsRequestQueue.getExponentialBackoff(attempt, config.baseDelay, config.maxDelay);
}

/**
 * Create Axios instance with base configuration
 */
export function createAxiosInstance(baseURL?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: baseURL || process.env['CHURCHTOOLS_API_URL'] || '/api',
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add to queue
  instance.interceptors.request.use(
    async (config) => {
      // Initialize retry count
      if (!retryCount.has(config)) {
        retryCount.set(config, 0);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor - handle rate limits
  instance.interceptors.response.use(
    (response) => {
      // Parse rate limit headers
      const queue = getRequestQueue();
      if (response.headers) {
        queue.parseRateLimitHeaders(new Headers(response.headers as Record<string, string>));
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config;

      if (!originalRequest) {
        return Promise.reject(error);
      }

      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        throw createError(
          ERROR_CODES.API_UNAUTHORIZED,
          'Your session has expired. Please log in again.',
          { originalError: error },
        );
      }

      // Handle 403 Forbidden
      if (error.response?.status === 403) {
        throw createError(
          ERROR_CODES.API_FORBIDDEN,
          'You do not have permission to perform this action.',
          { originalError: error },
        );
      }

      // Handle 429 Rate Limited
      if (error.response?.status === 429) {
        const queue = getRequestQueue();
        await queue.handle429Error(new Headers(error.response.headers as Record<string, string>));
        
        // This will throw an error with retry information
        return Promise.reject(error);
      }

      // Handle retryable errors
      const currentRetryCount = retryCount.get(originalRequest) || 0;

      if (
        isRetryableError(error, DEFAULT_RETRY_CONFIG) &&
        currentRetryCount < DEFAULT_RETRY_CONFIG.maxRetries
      ) {
        // Increment retry count
        retryCount.set(originalRequest, currentRetryCount + 1);

        // Calculate delay
        const delay = getRetryDelay(currentRetryCount, DEFAULT_RETRY_CONFIG);

        console.warn(
          `Request failed (attempt ${currentRetryCount + 1}/${DEFAULT_RETRY_CONFIG.maxRetries}). Retrying in ${delay}ms...`,
          {
            url: originalRequest.url,
            status: error.response?.status,
            error: error.message,
          },
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry request
        return instance(originalRequest);
      }

      // Handle network errors
      if (!error.response) {
        throw createError(
          ERROR_CODES.API_NETWORK_ERROR,
          'Network error. Please check your internet connection.',
          { originalError: error },
        );
      }

      // Handle 404 Not Found
      if (error.response.status === 404) {
        throw createError(
          ERROR_CODES.API_NOT_FOUND,
          'The requested resource was not found.',
          { originalError: error },
        );
      }

      // Handle server errors (500, 502, 503, 504)
      if (error.response.status >= 500) {
        throw createError(
          ERROR_CODES.API_SERVER_ERROR,
          'Server error. Please try again later.',
          {
            status: error.response.status,
            originalError: error,
          },
        );
      }

      // Handle validation errors (400)
      if (error.response.status === 400) {
        throw createError(
          ERROR_CODES.VALIDATION_INVALID_FORMAT,
          'Invalid request. Please check your input.',
          {
            validationErrors: error.response.data,
            originalError: error,
          },
        );
      }

      // Unknown error
      throw createError(ERROR_CODES.UNKNOWN_ERROR, 'An unexpected error occurred.', {
        originalError: error,
      });
    },
  );

  return instance;
}

/**
 * Singleton Axios instance
 */
let axiosInstance: AxiosInstance | null = null;

/**
 * Get or create Axios instance
 */
export function getAxiosInstance(baseURL?: string): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = createAxiosInstance(baseURL);
  }
  return axiosInstance;
}

/**
 * Reset Axios instance (for testing)
 */
export function resetAxiosInstance(): void {
  axiosInstance = null;
}

/**
 * Common API error handler for manual use
 */
export function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (!axiosError.response) {
      throw createError(
        ERROR_CODES.API_NETWORK_ERROR,
        'Network error. Please check your internet connection.',
      );
    }

    const status = axiosError.response.status;

    if (status === 401) {
      throw createError(ERROR_CODES.API_UNAUTHORIZED, 'Session expired. Please log in again.');
    }

    if (status === 403) {
      throw createError(
        ERROR_CODES.API_FORBIDDEN,
        'You do not have permission to perform this action.',
      );
    }

    if (status === 404) {
      throw createError(ERROR_CODES.API_NOT_FOUND, 'Resource not found.');
    }

    if (status === 429) {
      throw createError(ERROR_CODES.API_RATE_LIMITED, 'Too many requests. Please try again later.');
    }

    if (status >= 500) {
      throw createError(ERROR_CODES.API_SERVER_ERROR, 'Server error. Please try again later.');
    }

    throw createError(ERROR_CODES.UNKNOWN_ERROR, 'An unexpected error occurred.');
  }

  // Non-Axios error
  throw error;
}
