import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Group, Stack, Text } from '@mantine/core';
import { IconCamera, IconKeyboard, IconSettings, IconX } from '@tabler/icons-react';
import { ScannerSetupModal } from './ScannerSetupModal';
import type { ScannerModel } from '../../types/entities';
import type { Html5Qrcode } from 'html5-qrcode';
import { loadHtml5Qrcode } from '../../utils/scannerLoader';
import { loadScannerModelsAsync } from '../../services/settings/scannerModels';

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  enableCamera?: boolean;
  enableKeyboard?: boolean;
  showSetupButton?: boolean;
  scannerModels?: ScannerModel[];
  selectedScannerId?: string | null;
}

type ScanMode = 'keyboard' | 'camera';

/**
 * BarcodeScanner component - Handles USB/Bluetooth keyboard emulation + camera scanning
 * 
 * Features:
 * - Keyboard mode: Listens for barcode scanner input (USB/Bluetooth devices that emulate keyboard)
 * - Camera mode: Uses device camera with html5-qrcode library
 * - Automatic detection of Enter key after barcode scan
 * - Buffer management for rapid character input
 * - Cleanup on unmount
 */
 
export function BarcodeScanner({
  onScan,
  onError,
  onClose,
  enableCamera = true,
  enableKeyboard = true,
  showSetupButton = true,
  scannerModels,
  selectedScannerId,
}: BarcodeScannerProps) {
  const [mode, setMode] = useState<ScanMode>('keyboard');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ScannerModel | null>(null);
  const [internalModels, setInternalModels] = useState<ScannerModel[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<{ value: string; timestamp: number } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!scannerModels) {
      loadScannerModelsAsync().then(setInternalModels);
    }
  }, [scannerModels]);

  const availableModels = useMemo<ScannerModel[]>(() => {
    if (scannerModels && scannerModels.length > 0) {
      return scannerModels
    }
    return internalModels
  }, [scannerModels, internalModels])

  useEffect(() => {
    if (availableModels.length === 0) {
      setSelectedModel(null)
      return
    }

    const preferred = selectedScannerId
      ? availableModels.find((model) => model.id === selectedScannerId) ?? availableModels[0]
      : availableModels[0]

    setSelectedModel((prev) => {
      if (prev && preferred && prev.id === preferred.id) {
        return prev
      }
      return preferred ?? null
    })
  }, [availableModels, selectedScannerId])

  const handleOpenSetup = () => {
    if (selectedModel) {
      setSetupModalOpen(true)
      return
    }

    if (availableModels.length > 0) {
      const fallbackModel = availableModels[0]
      if (fallbackModel) {
        setSelectedModel(fallbackModel)
        setSetupModalOpen(true)
      }
    }
  }

  // Play success beep sound
  const playSuccessBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800; // High pitch beep
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  // Debounced scan handler - prevents duplicate scans within 1 second
  const handleScanWithDebounce = useCallback((value: string) => {
    const now = Date.now();
    
    // Check if this is a duplicate scan within 1 second
    if (lastScanRef.current && 
        lastScanRef.current.value === value && 
        now - lastScanRef.current.timestamp < 1000) {
      return; // Ignore duplicate
    }
    
    // Update last scan reference
    lastScanRef.current = { value, timestamp: now };
    
    // Play success sound
    playSuccessBeep();
    
    // Call the original onScan handler
    onScan(value);
  }, [onScan]);

  // Keyboard scanning mode
  useEffect(() => {
    if (mode !== 'keyboard' || !enableKeyboard) {
      return;
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if typing in an input field (unless it's our scanner input)
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle Enter key - submit buffered code
      if (event.key === 'Enter' && bufferRef.current.length > 0) {
        const scannedValue = bufferRef.current.trim();
        bufferRef.current = '';
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (scannedValue.length > 0) {
          handleScanWithDebounce(scannedValue);
        }
        return;
      }

      // Accumulate characters (alphanumeric, dash, underscore)
      if (/^[a-zA-Z0-9\-_]$/.test(event.key)) {
        bufferRef.current += event.key;

        // Clear buffer after 100ms of inactivity (in case Enter was missed)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          const scannedValue = bufferRef.current.trim();
          bufferRef.current = '';
          
          // Only submit if we have a reasonable barcode length (typically 8+ characters)
          if (scannedValue.length >= 5) {
            handleScanWithDebounce(scannedValue);
          }
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [mode, enableKeyboard, handleScanWithDebounce]);

  // Camera scanning mode
  const startCamera = async () => {
    if (!enableCamera) {
      onError?.('Camera scanning is disabled');
      return;
    }

    try {
      const Html5QrcodeCtor = await loadHtml5Qrcode();
      const html5QrCode = new Html5QrcodeCtor('barcode-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanWithDebounce(decodedText);
          // Stop camera after successful scan (with slight delay to allow beep to play)
          setTimeout(() => {
            void stopCamera();
          }, 200);
        },
        () => {
          // Ignore frequent scanning errors during active scanning
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start camera';
      onError?.(error);
      console.error('Camera start error:', err);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isCameraActive) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsCameraActive(false);
      } catch (err) {
        console.error('Camera stop error:', err);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isCameraActive) {
        scannerRef.current.stop().catch((err: unknown) => {
          console.error('Camera cleanup error:', err);
        });
      }
    };
  }, [isCameraActive]);

  // Switch to camera mode and start
  const handleCameraMode = () => {
    setMode('camera');
    void startCamera();
  };

  // Switch to keyboard mode and stop camera
  const handleKeyboardMode = () => {
    void stopCamera();
    setMode('keyboard');
  };

  return (
    <>
      <Stack gap="md">
        {/* Mode selector */}
        <Group justify="space-between">
          <Group>
            {enableKeyboard && (
              <Button
                variant={mode === 'keyboard' ? 'filled' : 'light'}
                leftSection={<IconKeyboard size={16} />}
                onClick={handleKeyboardMode}
                disabled={mode === 'keyboard'}
              >
                USB Scanner
              </Button>
            )}
            {enableCamera && (
              <Button
                variant={mode === 'camera' ? 'filled' : 'light'}
                leftSection={<IconCamera size={16} />}
                onClick={handleCameraMode}
                disabled={isCameraActive}
              >
                Camera
              </Button>
            )}
          </Group>
          <Group>
            {showSetupButton && availableModels.length > 0 && (
              <Button
                variant="light"
                leftSection={<IconSettings size={16} />}
                onClick={handleOpenSetup}
              >
                Scanner Setup
              </Button>
            )}
            {onClose && (
              <Button
                variant="subtle"
                leftSection={<IconX size={16} />}
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </Group>
        </Group>

      {/* Scanner area */}
      <Box>
        {mode === 'keyboard' && (
          <Box
            p="xl"
            style={{
              border: '2px dashed var(--mantine-color-gray-4)',
              borderRadius: 'var(--mantine-radius-md)',
              textAlign: 'center',
            }}
          >
            <Stack gap="sm" align="center">
              <IconKeyboard size={48} stroke={1.5} color="var(--mantine-color-gray-6)" />
              <Text size="lg" fw={600}>
                Ready to Scan
              </Text>
              <Text size="sm" c="dimmed">
                Point your USB/Bluetooth barcode scanner at a barcode
              </Text>
              <Text size="xs" c="dimmed">
                The scanner will automatically detect the code
              </Text>
            </Stack>
          </Box>
        )}

        {mode === 'camera' && (
          <Box>
            <Box
              id="barcode-reader"
              style={{
                width: '100%',
                maxWidth: '500px',
                margin: '0 auto',
              }}
            />
            {!isCameraActive && (
              <Box
                p="xl"
                style={{
                  border: '2px dashed var(--mantine-color-gray-4)',
                  borderRadius: 'var(--mantine-radius-md)',
                  textAlign: 'center',
                }}
              >
                <Stack gap="sm" align="center">
                  <IconCamera size={48} stroke={1.5} color="var(--mantine-color-gray-6)" />
                  <Text size="sm" c="dimmed">
                    Camera will start automatically
                  </Text>
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Stack>

    <ScannerSetupModal
      opened={setupModalOpen}
      onClose={() => setSetupModalOpen(false)}
      model={selectedModel}
    />
  </>
  );
}
