/**
 * Validation utilities for forms and data
 */

/**
 * Validate asset number format (1-5 digits)
 */
export function isValidAssetNumber(value: string): boolean {
    return /^\d{1,5}$/.test(value);
}

/**
 * Validate asset number and return error message if invalid
 */
export function validateAssetNumber(value: string): string | null {
    if (!value || value.trim() === '') {
        return 'Asset number is required';
    }
    if (!isValidAssetNumber(value)) {
        return 'Asset number must contain 1-5 digits';
    }
    return null;
}

/**
 * Validate barcode format (Code-128: printable ASCII)
 */
export function isValidBarcode(value: string): boolean {
    // Code-128 can encode printable ASCII 32-126
    return /^[ -~]+$/.test(value) && value.length > 0;
}

/**
 * Validate QR code format (alphanumeric, up to 4,296 characters)
 */
export function isValidQRCode(value: string): boolean {
    return value.length > 0 && value.length <= 4296;
}

/**
 * Validate email format
 */
export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validate date is not in the past
 */
export function isDateInFuture(date: Date): boolean {
    return date.getTime() > Date.now();
}

/**
 * Validate date range (start before end)
 */
export function isValidDateRange(start: Date, end: Date): boolean {
    return start.getTime() < end.getTime();
}

/**
 * Validate required field
 */
export function validateRequired(value: string | null | undefined, fieldName: string): string | null {
    if (!value || value.trim() === '') {
        return `${fieldName} is required`;
    }
    return null;
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): string | null {
    if (value.length < minLength) {
        return `${fieldName} must be at least ${minLength.toString()} characters long`;
    }
    return null;
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
    if (value.length > maxLength) {
        return `${fieldName} must be at most ${maxLength.toString()} characters long`;
    }
    return null;
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number, fieldName: string): string | null {
    if (value <= 0) {
        return `${fieldName} must be a positive number`;
    }
    return null;
}

/**
 * Validate non-negative number
 */
export function validateNonNegativeNumber(value: number, fieldName: string): string | null {
    if (value < 0) {
        return `${fieldName} cannot be negative`;
    }
    return null;
}

/**
 * Validate URL format
 */
export function isValidURL(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate URL and return error message if invalid
 */
export function validateURL(value: string): string | null {
    if (!value || value.trim() === '') {
        return null; // Empty is valid for optional fields
    }
    if (!isValidURL(value)) {
        return 'Please enter a valid URL (e.g., https://example.com)';
    }
    return null;
}

/**
 * Check if value is empty
 */
function isEmptyValue(value: string | number | boolean | string[] | undefined | null): boolean {
    if (value === undefined) return true;
    if (value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
}

/**
 * Validate text field value
 */
function validateTextField(value: string, validation: { minLength?: number; maxLength?: number; pattern?: string } | undefined, fieldName: string): string | null {
    if (validation?.minLength && value.length < validation.minLength) {
        return `${fieldName} must be at least ${validation.minLength.toString()} characters long`;
    }
    if (validation?.maxLength && value.length > validation.maxLength) {
        return `${fieldName} must be at most ${validation.maxLength.toString()} characters long`;
    }
    if (validation?.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
            return `${fieldName} does not match the required format`;
        }
    }
    return null;
}

/**
 * Validate number field value
 */
function validateNumberField(value: number, validation: { min?: number; max?: number } | undefined, fieldName: string): string | null {
    if (isNaN(value)) {
        return `${fieldName} must be a number`;
    }
    if (validation?.min !== undefined && value < validation.min) {
        return `${fieldName} must be at least ${validation.min.toString()}`;
    }
    if (validation?.max !== undefined && value > validation.max) {
        return `${fieldName} must be at most ${validation.max.toString()}`;
    }
    return null;
}

/**
 * Validate multi-select field value
 */
function validateMultiSelectField(value: string[], options: string[] | undefined, fieldName: string): string | null {
    if (!Array.isArray(value)) {
        return `${fieldName} must be an array`;
    }
    if (options) {
        const invalidOptions = value.filter(v => !options.includes(v));
        if (invalidOptions.length > 0) {
            return `${fieldName} contains invalid options: ${invalidOptions.join(', ')}`;
        }
    }
    return null;
}

/**
 * Validate field value by type
 */
function validateByFieldType(
    type: string,
    value: string | number | boolean | string[],
    field: { validation?: { min?: number; max?: number; pattern?: string; minLength?: number; maxLength?: number }; options?: string[] },
    fieldName: string
): string | null {
    switch (type) {
        case 'text':
        case 'long-text':
            return validateTextField(String(value), field.validation, fieldName);
        case 'number':
            return validateNumberField(Number(value), field.validation, fieldName);
        case 'url':
            return validateURL(String(value));
        case 'select':
            if (field.options && !field.options.includes(String(value))) {
                return `${fieldName} must be one of the available options`;
            }
            return null;
        case 'multi-select':
            return validateMultiSelectField(value as string[], field.options, fieldName);
        case 'date': {
            const dateValue = new Date(String(value));
            if (isNaN(dateValue.getTime())) {
                return `${fieldName} must be a valid date`;
            }
            return null;
        }
        case 'checkbox':
            if (typeof value !== 'boolean') {
                return `${fieldName} must be true or false`;
            }
            return null;
        case 'person-reference':
            if (typeof value !== 'string' || value.trim() === '') {
                return `${fieldName} must be a valid person reference`;
            }
            return null;
        default:
            return null;
    }
}

/**
 * Validate custom field value based on field definition
 */
export function validateCustomFieldValue(
    value: string | number | boolean | string[] | undefined,
    field: {
        type: string;
        required: boolean;
        validation?: {
            min?: number;
            max?: number;
            pattern?: string;
            minLength?: number;
            maxLength?: number;
        };
        options?: string[];
    },
    fieldName: string
): string | null {
    // Check required
    if (field.required && isEmptyValue(value)) {
        return `${fieldName} is required`;
    }

    // If value is empty and not required, it's valid
    if (isEmptyValue(value)) {
        return null;
    }

    // Type-specific validation
    return validateByFieldType(field.type, value as string | number | boolean | string[], field, fieldName);
}
