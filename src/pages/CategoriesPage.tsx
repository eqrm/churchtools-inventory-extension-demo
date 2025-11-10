import { useState } from 'react';
import { Button, Container, Menu, Modal } from '@mantine/core';
import { IconChevronDown, IconPlus, IconTemplate } from '@tabler/icons-react';
import { AssetTypeList } from '../components/categories/AssetTypeList';
import { AssetTypeForm } from '../components/categories/AssetTypeForm';
import { CategoryTemplates } from '../components/categories/CategoryTemplates';
import type { AssetType, CustomFieldDefinition } from '../types/entities';

function NewAssetTypeMenu({
  onCreateNew,
  onShowTemplates,
}: {
  onCreateNew: () => void;
  onShowTemplates: () => void;
}) {
  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button
          leftSection={<IconPlus size={16} />}
          rightSection={<IconChevronDown size={16} />}
        >
          Neuer Asset-Typ
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPlus size={16} />} onClick={onCreateNew}>
          Leerer Asset-Typ
        </Menu.Item>
        <Menu.Item leftSection={<IconTemplate size={16} />} onClick={onShowTemplates}>
          Aus Vorlage
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

 
export function CategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetType | undefined>();
  const [templateData, setTemplateData] = useState<{
    name: string;
    icon?: string;
    customFields: Omit<CustomFieldDefinition, 'id'>[];
  } | undefined>();

  const handleEdit = (category: AssetType) => {
    setEditingCategory(category);
    setTemplateData(undefined);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingCategory(undefined);
    setTemplateData(undefined);
    setIsFormOpen(true);
  };

  const handleShowTemplates = () => {
    setIsTemplateOpen(true);
  };

  const handleSelectTemplate = (template: {
    name: string;
    icon: string;
    customFields: Omit<CustomFieldDefinition, 'id'>[];
  }) => {
    setTemplateData({
      name: template.name,
      icon: template.icon,
      customFields: template.customFields,
    });
    setIsTemplateOpen(false);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
    setTemplateData(undefined);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
    setTemplateData(undefined);
  };

  const handleCancelTemplates = () => {
    setIsTemplateOpen(false);
  };

  return (
    <Container size="xl" py="xl">
      <AssetTypeList
        onEdit={handleEdit}
        headerActions={
          <NewAssetTypeMenu onCreateNew={handleCreateNew} onShowTemplates={handleShowTemplates} />
        }
      />

      <Modal
        opened={isFormOpen}
        onClose={handleCancel}
        title={editingCategory ? 'Asset-Typ bearbeiten' : 'Neuer Asset-Typ'}
        size="lg"
      >
        <AssetTypeForm
          category={editingCategory}
          initialData={templateData}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Modal>

      <Modal
        opened={isTemplateOpen}
        onClose={handleCancelTemplates}
        title="Vorlage auswählen"
        size="xl"
      >
        <CategoryTemplates onSelectTemplate={handleSelectTemplate} />
      </Modal>
    </Container>
  );
}
