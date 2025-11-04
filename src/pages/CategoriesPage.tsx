import { useState } from 'react';
import { Button, Container, Menu, Modal } from '@mantine/core';
import { IconChevronDown, IconPlus, IconTemplate } from '@tabler/icons-react';
import { AssetCategoryList } from '../components/categories/AssetCategoryList';
import { AssetCategoryForm } from '../components/categories/AssetCategoryForm';
import { CategoryTemplates } from '../components/categories/CategoryTemplates';
import type { AssetCategory, CustomFieldDefinition } from '../types/entities';

function NewCategoryMenu({
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
          New Category
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPlus size={16} />} onClick={onCreateNew}>
          Blank Category
        </Menu.Item>
        <Menu.Item leftSection={<IconTemplate size={16} />} onClick={onShowTemplates}>
          From Template
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

 
export function CategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | undefined>();
  const [templateData, setTemplateData] = useState<{
    name: string;
    icon?: string;
    customFields: Omit<CustomFieldDefinition, 'id'>[];
  } | undefined>();

  const handleEdit = (category: AssetCategory) => {
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
      <AssetCategoryList
        onEdit={handleEdit}
        headerActions={
          <NewCategoryMenu
            onCreateNew={handleCreateNew}
            onShowTemplates={handleShowTemplates}
          />
        }
      />

      <Modal
        opened={isFormOpen}
        onClose={handleCancel}
        title={editingCategory ? 'Edit Category' : 'New Category'}
        size="lg"
      >
        <AssetCategoryForm
          category={editingCategory}
          initialData={templateData}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Modal>

      <Modal
        opened={isTemplateOpen}
        onClose={handleCancelTemplates}
        title="Choose a Template"
        size="xl"
      >
        <CategoryTemplates onSelectTemplate={handleSelectTemplate} />
      </Modal>
    </Container>
  );
}
