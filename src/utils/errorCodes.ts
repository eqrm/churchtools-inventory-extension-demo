/**
 * Error Code Mapping Utilities
 * 
 * Provides standardized error codes following ERR_<ENTITY>_<NUMBER> pattern
 * as defined in ERROR_HANDLING.md
 */

export const ERROR_CODES = {
  // Asset errors (ERR_ASSET_001-099)
  ASSET_NOT_FOUND: 'ERR_ASSET_001',
  ASSET_INVALID_STATUS: 'ERR_ASSET_002',
  ASSET_ALREADY_ASSIGNED: 'ERR_ASSET_003',
  ASSET_NOT_AVAILABLE: 'ERR_ASSET_004',
  ASSET_IN_KIT: 'ERR_ASSET_005',
  ASSET_HAS_CHILDREN: 'ERR_ASSET_006',
  ASSET_INVALID_BARCODE: 'ERR_ASSET_007',
  ASSET_DUPLICATE_BARCODE: 'ERR_ASSET_008',
  ASSET_REQUIRED_FIELD: 'ERR_ASSET_009',

  // Model errors (ERR_MODEL_001-099)
  MODEL_NOT_FOUND: 'ERR_MODEL_001',
  MODEL_INVALID_NAME: 'ERR_MODEL_002',
  MODEL_INVALID_TYPE: 'ERR_MODEL_003',
  MODEL_IN_USE: 'ERR_MODEL_004',

  // Kit errors (ERR_KIT_001-099)
  KIT_NOT_FOUND: 'ERR_KIT_001',
  KIT_INVALID_TYPE: 'ERR_KIT_002',
  KIT_EMPTY: 'ERR_KIT_003',
  KIT_ASSET_CONFLICT: 'ERR_KIT_004',
  KIT_INCOMPLETE: 'ERR_KIT_005',

  // Assignment errors (ERR_ASSIGNMENT_001-099)
  ASSIGNMENT_NOT_FOUND: 'ERR_ASSIGNMENT_001',
  ASSIGNMENT_INVALID_PERSON: 'ERR_ASSIGNMENT_002',
  ASSIGNMENT_ALREADY_ASSIGNED: 'ERR_ASSIGNMENT_003',
  ASSIGNMENT_NOT_ASSIGNED: 'ERR_ASSIGNMENT_004',

  // Damage errors (ERR_DAMAGE_001-099)
  DAMAGE_NOT_FOUND: 'ERR_DAMAGE_001',
  DAMAGE_INVALID_STATUS: 'ERR_DAMAGE_002',
  DAMAGE_PHOTO_TOO_LARGE: 'ERR_DAMAGE_003',
  DAMAGE_TOO_MANY_PHOTOS: 'ERR_DAMAGE_004',
  DAMAGE_INVALID_PHOTO: 'ERR_DAMAGE_005',

  // Booking errors (ERR_BOOKING_001-099)
  BOOKING_NOT_FOUND: 'ERR_BOOKING_001',
  BOOKING_CONFLICT: 'ERR_BOOKING_002',
  BOOKING_INVALID_DATES: 'ERR_BOOKING_003',
  BOOKING_PAST_DATE: 'ERR_BOOKING_004',
  BOOKING_ASSET_UNAVAILABLE: 'ERR_BOOKING_005',

  // Maintenance errors (ERR_MAINTENANCE_001-099)
  MAINTENANCE_NOT_FOUND: 'ERR_MAINTENANCE_001',
  MAINTENANCE_INVALID_INTERVAL: 'ERR_MAINTENANCE_002',
  MAINTENANCE_RULE_CONFLICT: 'ERR_MAINTENANCE_003',
  MAINTENANCE_COMPANY_NOT_FOUND: 'ERR_MAINTENANCE_004',

  // Work order errors (ERR_WORKORDER_001-099)
  WORKORDER_NOT_FOUND: 'ERR_WORKORDER_001',
  WORKORDER_INVALID_TRANSITION: 'ERR_WORKORDER_002',
  WORKORDER_MISSING_PREREQUISITE: 'ERR_WORKORDER_003',
  WORKORDER_ALREADY_COMPLETED: 'ERR_WORKORDER_004',

  // Tag errors (ERR_TAG_001-099)
  TAG_NOT_FOUND: 'ERR_TAG_001',
  TAG_DUPLICATE_NAME: 'ERR_TAG_002',
  TAG_IN_USE: 'ERR_TAG_003',
  TAG_INHERITED: 'ERR_TAG_004',

  // View errors (ERR_VIEW_001-099)
  VIEW_NOT_FOUND: 'ERR_VIEW_001',
  VIEW_INVALID_FILTER: 'ERR_VIEW_002',
  VIEW_UNAUTHORIZED: 'ERR_VIEW_003',

  // Settings errors (ERR_SETTINGS_001-099)
  SETTINGS_NOT_FOUND: 'ERR_SETTINGS_001',
  SETTINGS_INVALID_VERSION: 'ERR_SETTINGS_002',
  SETTINGS_IMPORT_FAILED: 'ERR_SETTINGS_003',

  // API errors (ERR_API_001-099)
  API_NETWORK_ERROR: 'ERR_API_001',
  API_UNAUTHORIZED: 'ERR_API_002',
  API_FORBIDDEN: 'ERR_API_003',
  API_NOT_FOUND: 'ERR_API_004',
  API_RATE_LIMITED: 'ERR_API_005',
  API_SERVER_ERROR: 'ERR_API_006',
  API_TIMEOUT: 'ERR_API_007',

  // Validation errors (ERR_VALIDATION_001-099)
  VALIDATION_REQUIRED_FIELD: 'ERR_VALIDATION_001',
  VALIDATION_INVALID_FORMAT: 'ERR_VALIDATION_002',
  VALIDATION_OUT_OF_RANGE: 'ERR_VALIDATION_003',
  VALIDATION_INVALID_DATE: 'ERR_VALIDATION_004',

  // Bulk operations (ERR_BULK_001-099)
  BULK_OPERATION_TOO_LARGE: 'ERR_BULK_001',
  BULK_OPERATION_INVALID_INPUT: 'ERR_BULK_002',
  BULK_OPERATION_PARTIAL_FAILURE: 'ERR_BULK_003',

  // Generic errors
  UNKNOWN_ERROR: 'ERR_UNKNOWN_000',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Application error with error code and user-friendly message
 */
export class AppError extends Error {
  code: ErrorCode;
  userMessage: string;
  details?: unknown;

  constructor(code: ErrorCode, userMessage: string, details?: unknown) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

/**
 * Create a typed error with code
 */
export function createError(code: ErrorCode, userMessage: string, details?: unknown): AppError {
  return new AppError(code, userMessage, details);
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (isAppError(error)) {
    return error.code;
  }
  return ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Format error for logging (includes code and details)
 */
export function formatErrorForLogging(error: unknown): string {
  if (isAppError(error)) {
    const parts = [`[${error.code}]`, error.userMessage];
    if (error.details) {
      parts.push(JSON.stringify(error.details));
    }
    return parts.join(' - ');
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
