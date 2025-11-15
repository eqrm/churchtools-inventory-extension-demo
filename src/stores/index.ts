/**
 * Zustand stores structure
 * 
 * This directory contains client-side UI state management using Zustand.
 * 
 * State management philosophy:
 * - TanStack Query: Server state (assets, bookings, categories)
 * - Zustand: UI state (filters, preferences, view modes, scanner sessions)
 */

export { useUIStore } from './uiStore';
export { useScannerStore } from './scannerStore';
export { useFeatureSettingsStore } from './featureSettingsStore';
export { useUndoStore } from './undoStore';
export { useDataViewStore } from './dataViewStore';

