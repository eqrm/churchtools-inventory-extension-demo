import { useState } from 'react';
import { Button, Card, FileInput, Group, Stack, Text } from '@mantine/core';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { collectSettingsSnapshot, applySettingsSnapshot, validateSettingsSnapshot } from '../../services/settings/settingsSnapshot';
import { settingsExportSchema } from '../../schemas/settings';
import { churchToolsAPIClient } from '../../services/api/ChurchToolsAPIClient';

export function SettingsExportImport() {
  const { t } = useTranslation('settings');
  const [file, setFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async (scope: 'full' | 'scanner-only' = 'scanner-only') => {
    setIsExporting(true);
    try {
      const snapshot = await collectSettingsSnapshot();
      const actor = await churchToolsAPIClient.getCurrentUser();
      const payload = settingsExportSchema.parse({
        version: '1.0',
        type: scope,
        exportedAt: new Date().toISOString(),
        exportedBy: { id: actor.id, name: actor.name },
        settings: validateSettingsSnapshot(snapshot),
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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

    setIsImporting(true);
    try {
      const contents = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(contents);
      } catch {
        throw new Error('Invalid JSON file');
      }
      
      const envelope = settingsExportSchema.parse(parsed);
      const snapshot = validateSettingsSnapshot(envelope.settings);
      await applySettingsSnapshot(snapshot, envelope.type);
      
      setFile(null);
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
    } finally {
      setIsImporting(false);
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
