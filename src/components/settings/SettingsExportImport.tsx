import { useState } from 'react';
import { Button, Card, FileInput, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useSettingsVersions } from '../../hooks/useSettingsVersions';

export function SettingsExportImport() {
  const { t } = useTranslation('settings');
  const { exportSettings, importSettings, isImporting } = useSettingsVersions();
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (scope: 'full' | 'scanner-only' = 'scanner-only') => {
    setIsExporting(true);
    try {
      const payload = await exportSettings({ scope });
      const blob = new Blob([payload], { type: 'application/json' });
      const prefix = scope === 'scanner-only' ? 'inventory-scanner-settings' : 'inventory-full-settings';
      const fileName = `${prefix}-${formatTimestampForFile(new Date())}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      notifications.show({
        title: t('export.notifications.successTitle'),
        message: t('export.notifications.successMessage'),
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: t('export.notifications.errorTitle'),
        message: error instanceof Error ? error.message : t('versioning.notifications.genericError'),
        color: 'red',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      notifications.show({
        title: t('import.notifications.errorTitle'),
        message: t('import.validation.noFile'),
        color: 'red',
      });
      return;
    }

    try {
      const contents = await file.text();
      await importSettings(contents, summary);
      setFile(null);
      setSummary('');
      notifications.show({
        title: t('import.notifications.successTitle'),
        message: t('import.notifications.successMessage'),
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: t('import.notifications.errorTitle'),
        message: error instanceof Error ? error.message : t('versioning.notifications.genericError'),
        color: 'red',
      });
    }
  };

  return (
    <Card withBorder>
      <Stack gap="lg">
        <Stack gap={4}>
          <Text fw={600}>{t('export.title')}</Text>
          <Text size="sm" c="dimmed">
            {t('export.description')}
          </Text>
          <Group>
            <Button leftSection={<IconDownload size={16} />} onClick={() => handleExport('scanner-only')} loading={isExporting}>
              {t('export.buttonScannerOnly') || 'Export Scanner Settings'}
            </Button>
            <Button variant="subtle" size="xs" onClick={() => handleExport('full')} loading={isExporting}>
              {t('export.buttonFull') || 'Export All (Admin)'}
            </Button>
          </Group>
        </Stack>

        <Stack gap="sm">
          <Text fw={600}>{t('import.title')}</Text>
          <Text size="sm" c="dimmed">
            {t('import.description')}
          </Text>
          <FileInput
            label={t('import.fileLabel')}
            placeholder={t('import.filePlaceholder')}
            accept="application/json,.json"
            value={file}
            onChange={setFile}
            clearable
          />
          <Textarea
            label={t('import.summaryLabel')}
            placeholder={t('import.summaryPlaceholder')}
            value={summary}
            onChange={(event) => setSummary(event.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button
              leftSection={<IconUpload size={16} />}
              onClick={handleImport}
              loading={isImporting}
              disabled={!file}
            >
              {t('import.button')}
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}

function formatTimestampForFile(value: Date): string {
  return value
    .toISOString()
    .replace(/[:]/g, '-')
    .replace(/\..*/, '');
}
