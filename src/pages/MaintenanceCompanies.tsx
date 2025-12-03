/**
 * Maintenance Companies Page (T151)
 * 
 * Compact, tablet-friendly companies management.
 */

import { useState } from 'react';
import {
  Container,
  Button,
  Table,
  Group,
  ActionIcon,
  Modal,
  Text,
  Stack,
  Badge,
  Box,
  ScrollArea,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconPhone, IconMail } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  useMaintenanceCompanies,
  useDeleteMaintenanceCompany,
  useCreateMaintenanceCompany,
  useUpdateMaintenanceCompany,
} from '../hooks/useMaintenance';
import { MaintenanceCompanyForm } from '../components/maintenance/MaintenanceCompanyForm';
import type { MaintenanceCompany } from '../types/maintenance';

type MaintenanceCompanyFormValues = Omit<
  MaintenanceCompany,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'
>;

export function MaintenanceCompanies() {
  const { t } = useTranslation(['maintenance', 'common']);
  const { data: companies = [], isLoading } = useMaintenanceCompanies();
  const deleteCompany = useDeleteMaintenanceCompany();
  const createCompany = useCreateMaintenanceCompany();
  const updateCompany = useUpdateMaintenanceCompany();

  const companyList = (companies as MaintenanceCompany[]) || [];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<MaintenanceCompany | null>(null);

  const handleCreate = () => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  };

  const handleEdit = (company: MaintenanceCompany) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (company: MaintenanceCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompany(company);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedCompany) {
      await deleteCompany.mutateAsync(selectedCompany.id);
      setIsDeleteOpen(false);
      setSelectedCompany(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedCompany(null);
  };

  const handleFormSubmit = async (values: MaintenanceCompanyFormValues) => {
    try {
      const companyData = values as Omit<MaintenanceCompany, 'id' | 'createdAt' | 'updatedAt'>;
      if (selectedCompany) {
        await updateCompany.mutateAsync({ id: selectedCompany.id, data: companyData });
      } else {
        await createCompany.mutateAsync(companyData);
      }
    } finally {
      handleFormClose();
    }
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="sm">
        {/* Header */}
        <Group justify="flex-end">
          <Button size="sm" leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            {t('maintenance:companies.addNew')}
          </Button>
        </Group>

        {/* Content */}
        {isLoading ? (
          <Text c="dimmed" size="sm">{t('common:loading')}</Text>
        ) : companyList.length === 0 ? (
          <Box py="xl" ta="center">
            <Text c="dimmed">{t('maintenance:companies.noCompanies')}</Text>
          </Box>
        ) : (
          <ScrollArea>
            <Table highlightOnHover verticalSpacing="sm" style={{ minWidth: 500 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('maintenance:fields.name')}</Table.Th>
                  <Table.Th style={{ width: 150 }}>{t('maintenance:fields.contactPerson')}</Table.Th>
                  <Table.Th style={{ width: 120 }}>{t('maintenance:fields.contact')}</Table.Th>
                  <Table.Th style={{ width: 100 }}>{t('maintenance:fields.hourlyRate')}</Table.Th>
                  <Table.Th style={{ width: 80 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {companyList.map((company) => (
                  <Table.Tr key={company.id} onClick={() => handleEdit(company)} style={{ cursor: 'pointer' }}>
                    <Table.Td>
                      <Text size="sm" fw={500} lineClamp={1}>{company.name}</Text>
                      {company.address && (
                        <Text size="xs" c="dimmed" lineClamp={1}>{company.address}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {company.contactPerson || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        {company.contactEmail && (
                          <ActionIcon 
                            variant="subtle" 
                            color="gray" 
                            size="sm"
                            component="a"
                            href={`mailto:${company.contactEmail}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconMail size={14} />
                          </ActionIcon>
                        )}
                        {company.contactPhone && (
                          <ActionIcon 
                            variant="subtle" 
                            color="gray" 
                            size="sm"
                            component="a"
                            href={`tel:${company.contactPhone.replace(/\s+/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconPhone size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{formatCurrency(company.hourlyRate)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon variant="subtle" color="gray" onClick={(e) => { e.stopPropagation(); handleEdit(company); }}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={(e) => handleDeleteClick(company, e)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={isFormOpen}
        onClose={handleFormClose}
        title={selectedCompany ? t('maintenance:companies.editCompany') : t('maintenance:companies.addNew')}
        size="lg"
      >
        <MaintenanceCompanyForm
          company={selectedCompany || undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormClose}
          isLoading={createCompany.isPending || updateCompany.isPending}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal opened={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title={t('maintenance:companies.deleteCompany')} size="sm">
        <Stack gap="md">
          <Text size="sm">{t('maintenance:companies.deleteConfirm')}</Text>
          {selectedCompany && <Badge size="lg" variant="light">{selectedCompany.name}</Badge>}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="sm" onClick={() => setIsDeleteOpen(false)}>{t('common:cancel')}</Button>
            <Button color="red" size="sm" onClick={handleDeleteConfirm} loading={deleteCompany.isPending}>{t('common:delete')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
