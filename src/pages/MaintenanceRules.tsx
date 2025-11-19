/**
 * Maintenance Rules Page (T152)
 * 
 * Table view with conflict highlighting and CRUD operations for maintenance rules.
 */

import { useEffect, useMemo, useState } from 'react';
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
  Alert,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useMaintenanceRules,
  useRuleConflicts,
  useCreateMaintenanceRule,
  useUpdateMaintenanceRule,
  useDeleteMaintenanceRule,
  useMaintenanceCompanies,
} from '../hooks/useMaintenance';
import { useAssets } from '../hooks/useAssets';
import { useKits } from '../hooks/useKits';
import { useAssetModels } from '../hooks/useAssetModels';
import { useTags } from '../hooks/useTags';
import { MaintenanceRuleForm } from '../components/maintenance/MaintenanceRuleForm';
import type { MaintenanceRule } from '../types/maintenance';
import { routes } from '../router/routes';

export function MaintenanceRules() {
  const { t } = useTranslation(['maintenance', 'common']);
  const { data: rules = [], isLoading } = useMaintenanceRules();
  const { data: conflicts = [] } = useRuleConflicts();
  const createRule = useCreateMaintenanceRule();
  const updateRule = useUpdateMaintenanceRule();
  const deleteRule = useDeleteMaintenanceRule();
  const { data: companies = [] } = useMaintenanceCompanies();
  const { data: assets = [] } = useAssets();
  const { data: kits = [] } = useKits();
  const { models = [] } = useAssetModels();
  const { tags = [] } = useTags();

  // Map assets to the format expected by the form
  const assetsForForm = useMemo(() => 
    (assets as Array<{ id: string; name: string; assetNumber?: string }>).map(a => ({ 
      id: a.id, 
      name: a.name || a.assetNumber || a.id 
    })),
    [assets]
  );

  // Map models to the format expected by the form  
  const modelsForForm = useMemo(() =>
    (models as Array<{ id: string; name: string }>).map(m => ({
      id: m.id,
      name: m.name
    })),
    [models]
  );

  // Map tags to the format expected by the form
  const tagsForForm = useMemo(() =>
    (tags as Array<{ id: string; name: string; color?: string }>).map(t => ({
      id: t.id,
      name: t.name,
      color: t.color
    })),
    [tags]
  );

  const ruleList = useMemo(() => (rules as MaintenanceRule[]) || [], [rules]);
  const conflictSet = useMemo(() => {
    const set = new Set<string>();
    (conflicts as Array<{ rule1Id: string; rule2Id: string }>).forEach((conflict) => {
      set.add(conflict.rule1Id);
      set.add(conflict.rule2Id);
    });
    return set;
  }, [conflicts]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<MaintenanceRule | null>(null);
  const [newRuleFormKey, setNewRuleFormKey] = useState(0);
  const navigate = useNavigate();
  const { id: routeRuleId } = useParams<{ id?: string }>();

  useEffect(() => {
    if (!routeRuleId) {
      return;
    }
    const ruleFromRoute = ruleList.find((rule) => rule.id === routeRuleId);
    if (!ruleFromRoute) {
      return;
    }
    setSelectedRule(ruleFromRoute);
    setIsFormOpen(true);
  }, [routeRuleId, ruleList]);

  const handleCreate = () => {
    setSelectedRule(null);
    setNewRuleFormKey((prev) => prev + 1);
    setIsFormOpen(true);
    navigate(routes.maintenance.rules.list(), { replace: false });
  };

  const handleEdit = (rule: MaintenanceRule) => {
    setSelectedRule(rule);
    setIsFormOpen(true);
    navigate(routes.maintenance.rules.detail(rule.id), { replace: false });
  };

  const handleDeleteClick = (rule: MaintenanceRule) => {
    setSelectedRule(rule);
    setIsDeleteOpen(true);
    navigate(routes.maintenance.rules.detail(rule.id), { replace: false });
  };

  const handleDeleteConfirm = async () => {
    if (selectedRule) {
      await deleteRule.mutateAsync(selectedRule.id);
      setIsDeleteOpen(false);
      setSelectedRule(null);
      navigate(routes.maintenance.rules.list(), { replace: true });
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedRule(null);
    if (routeRuleId) {
      navigate(routes.maintenance.rules.list(), { replace: true });
    }
  };

  const handleFormSubmit = async (data: Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'nextDueDate'>) => {
    try {
      if (selectedRule) {
        // Update existing rule
        await updateRule.mutateAsync({ id: selectedRule.id, data });
      } else {
        // Create new rule
        await createRule.mutateAsync(data);
      }
      handleFormClose();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const getWorkTypeLabel = (workType: string): string => {
    return t(`maintenance:workTypes.${workType}`, workType);
  };

  const getTargetSummary = (rule: MaintenanceRule): string => {
    const targetCount = rule.targets?.length || 0;
    const targetType = rule.targets?.[0]?.type || 'asset';
    return `${targetCount} ${t(`maintenance:targetTypes.${targetType}`)}`;
  };

  const getIntervalSummary = (rule: MaintenanceRule): string => {
    const value = rule.intervalValue;
    const type = rule.intervalType;
    return `${value} ${t(`maintenance:intervalTypes.${type}`)}`;
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>{t('maintenance:rules.title')}</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            {t('maintenance:rules.addNew')}
          </Button>
        </Group>

        {(conflicts as Array<unknown>).length > 0 && (
          <Alert icon={<IconAlertCircle size={16} />} color="orange" title={t('maintenance:rules.conflicts')}>
            {t('maintenance:rules.conflictWarning')}
          </Alert>
        )}

        {isLoading ? (
          <Text c="dimmed">{t('common:loading')}</Text>
        ) : ruleList.length === 0 ? (
          <Paper p="xl" withBorder>
            <Text c="dimmed" ta="center">
              {t('maintenance:rules.noRules')}
            </Text>
          </Paper>
        ) : (
          <Paper withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('maintenance:fields.name')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.workType')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.isInternal')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.targets')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.intervalType')}</Table.Th>
                  <Table.Th>{t('common:columns.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ruleList.map((rule) => {
                  const hasConflict = conflictSet.has(rule.id);
                  return (
                    <Table.Tr key={rule.id} bg={hasConflict ? 'red.0' : undefined}>
                      <Table.Td>
                        <Group gap="xs">
                          <Text fw={500}>{rule.name}</Text>
                          {hasConflict && (
                            <Tooltip label={t('maintenance:rules.conflictWarning')}>
                              <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{getWorkTypeLabel(rule.workType)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={rule.isInternal ? 'blue' : 'orange'} variant="light">
                          {rule.isInternal ? t('maintenance:types.internal') : t('maintenance:types.external')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{getTargetSummary(rule)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{getIntervalSummary(rule)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="light" color="blue" onClick={() => handleEdit(rule)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDeleteClick(rule)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
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
          selectedRule ? t('maintenance:rules.editRule') : t('maintenance:rules.addNew')
        }
        size="lg"
      >
        {isFormOpen && (
          <MaintenanceRuleForm
            key={selectedRule?.id ?? `new-${newRuleFormKey}`}
            rule={selectedRule || undefined}
            companies={(companies as Array<{ id: string; name: string }>) || []}
            assets={assetsForForm}
            kits={(kits as Array<{ id: string; name: string }>) || []}
            models={modelsForForm}
            tags={tagsForForm}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            isLoading={createRule.isPending || updateRule.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={t('maintenance:rules.deleteRule')}
      >
        <Stack gap="md">
          <Text>{t('maintenance:rules.deleteConfirm')}</Text>
          {selectedRule && (
            <Badge size="lg" variant="light">
              {selectedRule.name}
            </Badge>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsDeleteOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button color="red" onClick={handleDeleteConfirm} loading={deleteRule.isPending}>
              {t('common:delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
