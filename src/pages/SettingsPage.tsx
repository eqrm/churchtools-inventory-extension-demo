import { Container, Stack, Tabs, Title } from '@mantine/core';
import { IconBarcode, IconHash, IconMapPin, IconBuilding, IconTag, IconToggleLeft, IconHistory } from '@tabler/icons-react';
import { useState } from 'react';
import { PrefixSettingsPanel } from '../components/settings/PrefixSettingsPanel';
import { LocationSettings } from '../components/settings/LocationSettings';
import { ManufacturerSettings } from '../components/settings/ManufacturerSettings';
import { ModelSettings } from '../components/settings/ModelSettings';
import { ScannerModelList } from '../components/settings/ScannerModelList';
import { ScannerModelForm } from '../components/settings/ScannerModelForm';
import type { ScannerModel, ScannerModelCreate } from '../types/entities';
import { FeatureToggleSettings } from '../components/settings/FeatureToggleSettings';
import { loadScannerModels, saveScannerModels, upsertScannerModel } from '../services/settings/scannerModels';
import { SettingsVersionHistory } from '../components/settings/SettingsVersionHistory';
import { SettingsExportImport } from '../components/settings/SettingsExportImport';

/**
 * Settings page for organization-wide configuration (T227a, T290)
 * Provides tabs for different settings sections including scanner configuration
 */
export function SettingsPage() {
  const [scannerModels, setScannerModels] = useState<ScannerModel[]>(() => loadScannerModels());
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ScannerModel | undefined>();

  const { handleAddModel, handleEditModel, handleDeleteModel, handleSubmitModel } = useScannerModelHandlers(
    scannerModels,
    setScannerModels,
    setFormOpen,
    setEditingModel,
    editingModel,
  );

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1}>Settings</Title>

        <Tabs defaultValue="prefixes">
          <SettingsTabs
            scannerModels={scannerModels}
            onAddModel={handleAddModel}
            onEditModel={handleEditModel}
            onDeleteModel={handleDeleteModel}
          />
        </Tabs>

        <ScannerModelForm
          opened={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmitModel}
          initialModel={editingModel}
        />
      </Stack>
    </Container>
  );
}

function useScannerModelHandlers(
  scannerModels: ScannerModel[],
  setScannerModels: (models: ScannerModel[]) => void,
  setFormOpen: (open: boolean) => void,
  setEditingModel: (model: ScannerModel | undefined) => void,
  editingModel?: ScannerModel,
) {
  const persist = (models: ScannerModel[]) => {
    saveScannerModels(models);
    setScannerModels(models);
  };

  const handleAddModel = () => {
    setEditingModel(undefined);
    setFormOpen(true);
  };

  const handleEditModel = (model: ScannerModel) => {
    setEditingModel(model);
    setFormOpen(true);
  };

  const handleDeleteModel = (id: string) => {
    const updated = scannerModels.filter((m) => m.id !== id);
    persist(updated);
  };

  const handleSubmitModel = (modelData: ScannerModelCreate) => {
    const updated = upsertScannerModel(scannerModels, modelData, editingModel);
    persist(updated);
    setFormOpen(false);
    setEditingModel(undefined);
  };

  return { handleAddModel, handleEditModel, handleDeleteModel, handleSubmitModel };
}

interface SettingsTabsProps {
  scannerModels: ScannerModel[];
  onAddModel: () => void;
  onEditModel: (model: ScannerModel) => void;
  onDeleteModel: (id: string) => void;
}

function SettingsTabs({ scannerModels, onAddModel, onEditModel, onDeleteModel }: SettingsTabsProps) {
  return (
    <>
      <Tabs.List>
        <Tabs.Tab value="prefixes" leftSection={<IconHash size={16} />}>
          Asset Prefixes
        </Tabs.Tab>
        <Tabs.Tab value="manufacturers" leftSection={<IconBuilding size={16} />}>
          Manufacturers
        </Tabs.Tab>
        <Tabs.Tab value="models" leftSection={<IconTag size={16} />}>
          Models
        </Tabs.Tab>
        <Tabs.Tab value="locations" leftSection={<IconMapPin size={16} />}>
          Locations
        </Tabs.Tab>
        <Tabs.Tab value="modules" leftSection={<IconToggleLeft size={16} />}>
          Modules
        </Tabs.Tab>
        <Tabs.Tab value="scanners" leftSection={<IconBarcode size={16} />}>
          Scanners
        </Tabs.Tab>
        <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
          History
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="prefixes" pt="md">\n        <PrefixSettingsPanel />
      </Tabs.Panel>
      <Tabs.Panel value="manufacturers" pt="md">
        <ManufacturerSettings />
      </Tabs.Panel>
      <Tabs.Panel value="models" pt="md">
        <ModelSettings />
      </Tabs.Panel>

      <Tabs.Panel value="locations" pt="md">
        <LocationSettings />
      </Tabs.Panel>

      <Tabs.Panel value="modules" pt="md">
        <FeatureToggleSettings />
      </Tabs.Panel>

      <Tabs.Panel value="scanners" pt="md">
        <ScannerModelList
          models={scannerModels}
          onAdd={onAddModel}
          onEdit={onEditModel}
          onDelete={onDeleteModel}
        />
      </Tabs.Panel>
      <Tabs.Panel value="history" pt="md">
        <Stack gap="md">
          <SettingsExportImport />
          <SettingsVersionHistory />
        </Stack>
      </Tabs.Panel>
    </>
  );
}
