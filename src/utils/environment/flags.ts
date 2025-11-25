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

export function isDemoToolsEnabled(): boolean {
    const override = parseBooleanFlag(import.meta.env?.['VITE_ENABLE_DEMO_TOOLS']);
    if (typeof override === 'boolean') {
        return override;
    }

    return false;
}

export function ensureDemoToolsEnabled(context: string): void {
    if (!isDemoToolsEnabled()) {
        throw new Error(`Demo tooling is disabled in this environment (context: ${context}).`);
    }
}
