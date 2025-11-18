/**
 * Maintenance Companies Page (T151)
 * 
 * Table view with CRUD operations for maintenance service provider companies.
 */

import { useState } from 'react';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  ActionIcon,
  Modal,
  Text,
  Stack,
  Paper,
  Badge,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  useMaintenanceCompanies,
  useDeleteMaintenanceCompany,
  useCreateMaintenanceCompany,
  useUpdateMaintenanceCompany,
} from '../hooks/useMaintenance';
import { MaintenanceCompanyForm } from '../components/maintenance/MaintenanceCompanyForm';
import type { MaintenanceCompany } from '../types/maintenance';

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

  const handleDeleteClick = (company: MaintenanceCompany) => {
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

  const handleFormSubmit = async (values: any) => {
    try {
      if (selectedCompany) {
        await updateCompany.mutateAsync({ id: selectedCompany.id, data: values });
      } else {
        await createCompany.mutateAsync(values);
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
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>{t('maintenance:companies.title')}</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            {t('maintenance:companies.addNew')}
          </Button>
        </Group>

        {isLoading ? (
          <Text c="dimmed">{t('common:loading')}</Text>
        ) : companyList.length === 0 ? (
          <Paper p="xl" withBorder>
            <Text c="dimmed" ta="center">
              {t('maintenance:companies.noCompanies')}
            </Text>
          </Paper>
        ) : (
          <Paper withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('maintenance:fields.name')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.contactPerson')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.address')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.hourlyRate')}</Table.Th>
                  <Table.Th>{t('common:actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {companyList.map((company) => (
                  <Table.Tr key={company.id}>
                    <Table.Td>
                      <Text fw={500}>{company.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{company.contactPerson}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1} maw={300}>
                        {company.address}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatCurrency(company.hourlyRate)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEdit(company)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDeleteClick(company)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={isFormOpen}
        onClose={handleFormClose}
        title={
          selectedCompany
            ? t('maintenance:companies.editCompany')
            : t('maintenance:companies.addNew')
        }
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
      <Modal
        opened={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={t('maintenance:companies.deleteCompany')}
      >
        <Stack gap="md">
          <Text>{t('maintenance:companies.deleteConfirm')}</Text>
          {selectedCompany && (
            <Badge size="lg" variant="light">
              {selectedCompany.name}
            </Badge>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsDeleteOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              color="red"
              onClick={handleDeleteConfirm}
              loading={deleteCompany.isPending}
            >
              {t('common:delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
