import { create } from 'zustand';

/**
 * Scan history entry (supports assets and asset groups)
 */
type ScanHistoryEntry =
        | {
                type: 'asset';
                code: string;
                assetNumber: string;
                assetId: string;
                assetName: string;
                groupId?: string | null;
                groupName?: string;
                scannedAt: string;
            }
        | {
                type: 'group';
                code: string;
        groupNumber?: string | null;
                groupId: string;
                groupName: string;
                scannedAt: string;
            };

/**
 * Scanner State Store
 * Manages barcode/QR scanner state
 */
interface ScannerState {
    // Scanner status
    isScanning: boolean;
    isCameraActive: boolean;
    error: string | null;
    
    // Scanner mode
    scanMode: 'barcode' | 'qr' | 'both';
    setScanMode: (mode: 'barcode' | 'qr' | 'both') => void;
    
    // Last scan result
    lastScan: {
        code: string;
        type: 'barcode' | 'qr';
        timestamp: number;
    } | null;
    
    // Scan history (last 20 scans)
    scanHistory: ScanHistoryEntry[];
    addScan: (entry: ScanHistoryEntry) => void;
    clearHistory: () => void;
    
    // Actions
    startScanning: () => void;
    stopScanning: () => void;
    setError: (error: string | null) => void;
    recordScan: (code: string, type: 'barcode' | 'qr') => void;
    clearLastScan: () => void;
    
    // Camera selection
    selectedCamera: string | null;
    availableCameras: Array<{ id: string; label: string }>;
    setSelectedCamera: (cameraId: string) => void;
    setAvailableCameras: (cameras: Array<{ id: string; label: string }>) => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
    // Scanner status
    isScanning: false,
    isCameraActive: false,
    error: null,
    
    // Scanner mode
    scanMode: 'both',
    setScanMode: (mode) => {
        set({ scanMode: mode });
    },
    
    // Last scan result
    lastScan: null,
    
    // Scan history
    scanHistory: [],
    addScan: (entry) => {
        set((state) => ({
            scanHistory: [entry, ...state.scanHistory].slice(0, 20), // Keep last 20 scans
        }));
    },
    clearHistory: () => {
        set({ scanHistory: [] });
    },
    
    // Actions
    startScanning: () => {
        set({ isScanning: true, isCameraActive: true, error: null });
    },
    stopScanning: () => {
        set({ isScanning: false, isCameraActive: false });
    },
    setError: (error) => {
        set({ error, isScanning: false });
    },
    recordScan: (code, type) => {
        set({
            lastScan: {
                code,
                type,
                timestamp: Date.now(),
            },
        });
    },
    clearLastScan: () => {
        set({ lastScan: null });
    },
    
    // Camera selection
    selectedCamera: null,
    availableCameras: [],
    setSelectedCamera: (cameraId) => {
        set({ selectedCamera: cameraId });
    },
    setAvailableCameras: (cameras) => {
        set({ availableCameras: cameras });
    },
}));
