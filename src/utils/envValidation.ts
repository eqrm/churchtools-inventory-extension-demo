/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are set before app initialization.
 * Provides helpful error messages if configuration is incomplete.
 */

import { getExtensionKey } from './extensionKey';

interface RequiredEnvVars {
  VITE_BASE_URL: string;
  VITE_KEY: string;
}

interface OptionalEnvVars {
  VITE_USERNAME?: string;
  VITE_PASSWORD?: string;
  VITE_MODULE_ID?: string;
  VITE_ENVIRONMENT?: string;
}

/**
 * Validates that all required environment variables are set
 * @throws {Error} If any required environment variable is missing
 */
 
export function validateEnvironment(): RequiredEnvVars & OptionalEnvVars {
  const missing: string[] = [];
  
  // Check required variables
  const rawBaseUrl = (import.meta.env.VITE_BASE_URL ?? '').trim();
  const rawKey = (import.meta.env.VITE_KEY ?? '').trim();
  
  // Collect missing variables
  if (!rawBaseUrl) missing.push('VITE_BASE_URL');
  if (!rawKey) missing.push('VITE_KEY');
  
  // Throw if any required variables are missing
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n\n` +
      missing.map(key => `  - ${key}`).join('\n') +
      `\n\nPlease create a .env file based on .env.example and configure all required variables.\n` +
      `See docs/quickstart.md for setup instructions.`
    );
  }
  
  // At this point TypeScript knows these are strings (not undefined)
  // Validate URL format
  try {
    new URL(rawBaseUrl);
  } catch {
    throw new Error(
      `Invalid VITE_BASE_URL: "${rawBaseUrl}"\n\n` +
      `VITE_BASE_URL must be a valid URL (e.g., https://your-church.church.tools)`
    );
  }
  
  const environmentInput = (import.meta.env.VITE_ENVIRONMENT ?? '').trim().toLowerCase();
  const environment = environmentInput === 'production' ? 'production' : 'development';
  if (environmentInput && !['development', 'production'].includes(environmentInput)) {
    console.warn(
      `[Config] Invalid VITE_ENVIRONMENT: "${environmentInput}" - using "${environment}".\n` +
      'Valid values: "development" or "production"'
    );
  }
  
  const VITE_KEY = getExtensionKey();
  const normalizedKey = rawKey.toLowerCase();
  if (normalizedKey !== rawKey) {
    console.warn(
      `[Config] Normalized VITE_KEY from "${rawKey}" to "${VITE_KEY}".`
    );
  }
  
  const VITE_USERNAME = (import.meta.env.VITE_USERNAME ?? '').trim() || undefined;
  const VITE_PASSWORD = (import.meta.env.VITE_PASSWORD ?? '').trim() || undefined;
  const VITE_MODULE_ID = (import.meta.env.VITE_MODULE_ID ?? '').trim() || undefined;
  const VITE_ENVIRONMENT = environment;
  
  return {
    VITE_BASE_URL: rawBaseUrl,
    VITE_KEY,
    VITE_USERNAME,
    VITE_PASSWORD,
    VITE_MODULE_ID,
    VITE_ENVIRONMENT,
  };
}

/**
 * Gets the current environment (development or production)
 */
export function getEnvironment(): 'development' | 'production' {
  const env = import.meta.env.VITE_ENVIRONMENT || 'development';
  return env === 'production' ? 'production' : 'development';
}

/**
 * Checks if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Checks if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}
