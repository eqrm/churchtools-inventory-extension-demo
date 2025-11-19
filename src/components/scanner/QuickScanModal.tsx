import { Suspense, lazy, useEffect, useState } from 'react';
import { Loader, Modal, Stack, Text, Select } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ScannerInput } from './ScannerInput';
import { provideScanSuccessFeedback, provideScanErrorFeedback } from '../../services/scanner/ScanFeedback';
import { useStorageProvider } from '../../hooks/useStorageProvider';
import { useScannerStore } from '../../stores/scannerStore';
import { useScannerPreference } from '../../hooks/useScannerPreference';
import type { ScannerModel } from '../../types/entities';

const BarcodeScanner = lazy(() =>
  import('./BarcodeScanner').then((module) => ({ default: module.BarcodeScanner })),
);

interface QuickScanModalProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * QuickScan Modal - Overlay for quick asset lookup via scanning
 * 
 * Features:
 * - Integrated barcode/QR scanner
 * - Manual entry fallback
 * - Automatic navigation to asset detail
 * - Scan history tracking
 * - Audio/visual feedback
 * - Keyboard shortcut support (Alt+S)
 */
 
export function QuickScanModal({ opened, onClose }: QuickScanModalProps) {
  const navigate = useNavigate();
  const storage = useStorageProvider();
  const addScan = useScannerStore((state) => state.addScan);
  const { preferredScannerId, setPreference } = useScannerPreference();
  const [scannerModels, setScannerModels] = useState<ScannerModel[]>([]);

  // Load scanner models from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('scannerModels');
      if (stored) {
        setScannerModels(JSON.parse(stored) as ScannerModel[]);
      }
    } catch (error) {
      console.warn('Failed to load scanner models:', error);
    }
  }, []);

  // Detect platform for correct keyboard shortcut display
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const scanShortcut = isMac ? '⌘S' : 'Alt+S';

  const handleScan = (rawCode: string) => {
    const scannedCode = rawCode.trim();
    if (!scannedCode) {
      provideScanErrorFeedback('Scan code is empty');
      return;
    }

    if (!storage) {
      provideScanErrorFeedback('Storage provider not available');
      return;
    }

    const lookupPromise = (async () => {
      const [assets, groups] = await Promise.all([
        storage.getAssets(),
        storage.getAssetGroups(),
      ]);

      const normalizedCode = scannedCode.toLowerCase();

      const matchedAsset = assets.find((asset) => {
        const barcodeMatches = asset.barcode?.toLowerCase() === normalizedCode;
        const assetNumberMatches = asset.assetNumber?.toLowerCase() === normalizedCode;
        return barcodeMatches || assetNumberMatches;
      });

      if (matchedAsset) {
        addScan({
          type: 'asset',
          code: scannedCode,
          assetId: matchedAsset.id,
          assetNumber: matchedAsset.assetNumber,
          assetName: matchedAsset.name,
          groupId: matchedAsset.assetGroup?.id,
          groupName: matchedAsset.assetGroup?.name,
          scannedAt: new Date().toISOString(),
        });

        provideScanSuccessFeedback(matchedAsset.assetNumber, matchedAsset.name);

        const targetPath = matchedAsset.assetGroup?.id
          ? `/assets/${matchedAsset.id}?groupId=${matchedAsset.assetGroup.id}`
          : `/assets/${matchedAsset.id}`;

        navigate(targetPath);
        onClose();
        return;
      }

      const matchedGroup = groups.find((group) => {
        const barcodeMatches = group.barcode?.toLowerCase() === normalizedCode;
        const numberMatches = group.groupNumber?.toLowerCase() === normalizedCode;
        return barcodeMatches || numberMatches;
      });

      if (matchedGroup) {
        addScan({
          type: 'group',
          code: scannedCode,
          groupId: matchedGroup.id,
          groupNumber: matchedGroup.groupNumber,
          groupName: matchedGroup.name,
          scannedAt: new Date().toISOString(),
        });

        const identifier = matchedGroup.groupNumber ?? matchedGroup.barcode ?? matchedGroup.name;
        provideScanSuccessFeedback(identifier, matchedGroup.name);
        navigate(`/asset-groups?groupId=${matchedGroup.id}`);
        onClose();
        return;
      }

      provideScanErrorFeedback(`No asset or group found for code: ${scannedCode}`);
    })().catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lookup code';
      provideScanErrorFeedback(errorMessage);
    });

    void lookupPromise;
  };

  const handleError = (error: string) => {
    provideScanErrorFeedback(error);
  };

  // Global keyboard shortcut (Alt+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!opened) {
          // Open modal logic would be handled by parent component
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Quick Scan"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Scan a barcode or enter an asset/group number to jump directly to inventory or group details
        </Text>

        {/* Scanner Selection */}
        {scannerModels.length > 0 && (
          <Select
            label="Scanner Model"
            placeholder="Select scanner model"
            description="Choose your scanner model for optimized scanning"
            data={scannerModels.map(model => ({
              value: model.id,
              label: `${model.manufacturer} ${model.modelName}`,
            }))}
            value={preferredScannerId || null}
            onChange={(value) => setPreference(value)}
            allowDeselect
          />
        )}

        {/* Barcode Scanner */}
        <Suspense fallback={<ScannerFallback />}>
          <BarcodeScanner
            onScan={handleScan}
            onError={handleError}
            enableCamera={true}
            enableKeyboard={true}
            scannerModels={scannerModels}
            selectedScannerId={preferredScannerId}
          />
        </Suspense>

        {/* Manual Entry Fallback */}
        <ScannerInput
          onScan={handleScan}
          placeholder="Or enter barcode / asset number / group number manually..."
          label="Manual Entry"
          buttonText="Lookup"
          autoFocus={false}
        />

        <Text size="xs" c="dimmed" ta="center">
          Tip: Press {scanShortcut} anytime to open Quick Scan
        </Text>
      </Stack>
    </Modal>
  );
}

function ScannerFallback() {
  return (
    <Stack gap="xs" align="center" style={{ padding: 'var(--mantine-spacing-lg)' }}>
      <Loader size="sm" />
      <Text size="sm" c="dimmed">
        Loading scanner tools...
      </Text>
    </Stack>
  );
}
