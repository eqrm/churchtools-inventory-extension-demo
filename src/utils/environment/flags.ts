type EnvironmentKind = 'development' | 'production';

function resolveEnvironment(): EnvironmentKind {
    const explicit = (import.meta.env?.['VITE_ENVIRONMENT'] ?? '').toString().trim().toLowerCase();
    if (explicit === 'production') {
        return 'production';
    }
    if (explicit === 'development') {
        return 'development';
    }

    const mode = (import.meta.env?.MODE ?? '').toString().trim().toLowerCase();
    if (mode === 'production') {
        return 'production';
    }

    return 'development';
}

const environmentKind: EnvironmentKind = resolveEnvironment();

function parseBooleanFlag(value: unknown): boolean | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return undefined;
}

export function getEnvironmentKind(): EnvironmentKind {
    return environmentKind;
}

export function isDevelopmentEnvironment(): boolean {
    return getEnvironmentKind() !== 'production';
}

export function getBooleanFlag(key: string): boolean | undefined {
    const rawValue = import.meta.env?.[key];
    if (typeof rawValue === 'boolean') {
        return rawValue;
    }
    if (typeof rawValue === 'string') {
        return parseBooleanFlag(rawValue);
    }
    return undefined;
}
