import { useEffect, useState } from 'react';
import { Box, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconPrinter, IconX } from '@tabler/icons-react';
import type { Asset } from '../../types/entities';
import { generateBarcode, generateQRCode } from '../../services/barcode/BarcodeService';

interface AssetLabelPrintProps {
  asset: Asset;
  onClose?: () => void;
}

interface LabelCodesProps {
  barcodeUrl: string | null;
  qrCodeUrl: string | null;
  assetNumber: string;
  isLoading: boolean;
}

/**
 * PrintStyles component - Injects print-specific CSS
 */
function PrintStyles() {
  return (
    <style>{`
      @media print {
        /* Hide everything except the label */
        body * {
          visibility: hidden;
        }
        
        .asset-label,
        .asset-label * {
          visibility: visible;
        }
        
        .asset-label {
          position: absolute;
          left: 0;
          top: 0;
          width: 4in;
          height: 6in;
          margin: 0;
          padding: 0.5in;
          border: none;
          box-shadow: none;
        }
        
        /* Hide screen-only elements */
        .no-print {
          display: none !important;
        }
        
        /* Optimize for printing */
        @page {
          size: 4in 6in;
          margin: 0;
        }
        
        /* Ensure images print */
        img {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
      
      @media screen {
        /* Preview styling */
        .asset-label {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      }
    `}</style>
  );
}

/**
 * LabelCodes component - Displays barcode and QR code images
 */
function LabelCodes({ barcodeUrl, qrCodeUrl, assetNumber, isLoading }: LabelCodesProps) {
  return (
    <>
      {/* Barcode */}
      <Box ta="center">
        {isLoading ? (
          <Text size="sm" c="dimmed">Generating barcode...</Text>
        ) : barcodeUrl ? (
          <img
            src={barcodeUrl}
            alt={`Barcode: ${assetNumber}`}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        ) : (
          <Text size="sm" c="red">Failed to generate barcode</Text>
        )}
      </Box>

      {/* QR Code */}
      <Box ta="center">
        {isLoading ? (
          <Text size="sm" c="dimmed">Generating QR code...</Text>
        ) : qrCodeUrl ? (
          <Box>
            <img
              src={qrCodeUrl}
              alt={`QR Code: ${assetNumber}`}
              style={{ width: '150px', height: '150px' }}
            />
            <Text size="xs" c="dimmed" mt={4}>
              Scan for details
            </Text>
          </Box>
        ) : (
          <Text size="sm" c="red">Failed to generate QR code</Text>
        )}
      </Box>
    </>
  );
}

/**
 * AssetLabelPrint component - Printable asset label with barcode and QR code
 * 
 * Features:
 * - Displays asset information in a print-friendly format
 * - Shows barcode for asset number
 * - Shows QR code linking to asset detail page
 * - Optimized CSS for physical label printing
 * - Typical label size: 4" x 6" (102mm x 152mm)
 */
 
export function AssetLabelPrint({ asset, onClose }: AssetLabelPrintProps) {
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function generateCodes() {
      try {
        setIsLoading(true);
        
        // Generate barcode
        const barcode = generateBarcode(asset.assetNumber, {
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
        setBarcodeUrl(barcode);

        // Generate QR code
        const assetUrl = `${window.location.origin}${window.location.pathname}#/assets/${asset.id}`;
        const qrCode = await generateQRCode(assetUrl, {
          width: 150,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
        setQrCodeUrl(qrCode);
      } catch (err) {
        console.error('Failed to generate codes for label:', err);
      } finally {
        setIsLoading(false);
      }
    }

    void generateCodes();
  }, [asset.id, asset.assetNumber]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Screen controls (hidden when printing) */}
      <Box className="no-print" mb="md">
        <Group justify="space-between">
          <Title order={3}>Print Asset Label</Title>
          <Group>
            <Button
              leftSection={<IconPrinter size={16} />}
              onClick={handlePrint}
              disabled={isLoading}
            >
              Print Label
            </Button>
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
      </Box>

      {/* Printable label */}
      <Paper
        withBorder
        p="md"
        className="asset-label"
        style={{
          width: '4in',
          height: '6in',
          margin: '0 auto',
          pageBreakAfter: 'always',
        }}
      >
        <Stack gap="sm" h="100%" justify="space-between">
          {/* Header */}
          <Box>
            <Text size="xl" fw={700} ta="center" lineClamp={2}>
              {asset.name}
            </Text>
            <Text size="sm" c="dimmed" ta="center" mt={4}>
              {asset.assetType.name}
            </Text>
          </Box>

          {/* Barcode and QR Code */}
          <LabelCodes
            barcodeUrl={barcodeUrl}
            qrCodeUrl={qrCodeUrl}
            assetNumber={asset.assetNumber}
            isLoading={isLoading}
          />

          {/* Asset Details */}
          <Stack gap={4}>
            {asset.manufacturer && (
              <Group gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ minWidth: '80px' }}>
                  Manufacturer:
                </Text>
                <Text size="xs" fw={500} lineClamp={1}>
                  {asset.manufacturer}
                </Text>
              </Group>
            )}
            {asset.model && (
              <Group gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ minWidth: '80px' }}>
                  Model:
                </Text>
                <Text size="xs" fw={500} lineClamp={1}>
                  {asset.model}
                </Text>
              </Group>
            )}
            {asset.location && (
              <Group gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ minWidth: '80px' }}>
                  Location:
                </Text>
                <Text size="xs" fw={500} lineClamp={1}>
                  {asset.location}
                </Text>
              </Group>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Print styles */}
      <PrintStyles />
    </>
  );
}
