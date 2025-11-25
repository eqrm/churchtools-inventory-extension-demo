/**
 * Application-wide constants derived from environment variables
 */

import { getExtensionKey } from '../utils/extensionKey';

export const KEY = getExtensionKey();
export const MODULE_ID = (import.meta.env.VITE_MODULE_ID ?? '').trim() || undefined;
