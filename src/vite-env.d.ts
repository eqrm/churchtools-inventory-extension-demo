/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BASE_URL: string
    readonly VITE_KEY: string
    readonly VITE_USERNAME?: string
    readonly VITE_PASSWORD?: string
    readonly VITE_MODULE_ID?: string
    readonly VITE_ENVIRONMENT?: string
    readonly VITE_API_RATE_LIMIT?: string
    readonly VITE_CHURCHTOOLS_API?: string
    readonly VITEST?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
