/**
 * Maintenance Rules Page (T152)
 * 
 * Compact, tablet-friendly rules management.
 */

import { useEffect, useMemo, useState } from 'react';
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
  Tooltip,
  Box,
  ScrollArea,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
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

  const assetsForForm = useMemo(
    () =>
      (assets as Array<{ id: string; name?: string; assetNumber?: string; status?: string }>)
        .filter((asset) => asset.status !== 'deleted')
        .map((a) => ({ id: a.id, name: a?.name || a?.assetNumber || a.id })),
    [assets],
  );

  const modelsForForm = useMemo(
    () =>
      (models as Array<{ id: string; name: string; manufacturer?: string }>).map((m) => ({
        id: m.id,
        name: m.manufacturer ? `${m.name} (${m.manufacturer})` : m.name,
      })),
    [models],
  );

  const tagsForForm = useMemo(() =>
    (tags as Array<{ id: string; name: string; color?: string }>).map(t => ({
      id: t.id, name: t.name, color: t.color
    })),
    [tags]
  );

  const ruleList = useMemo(() => (rules as MaintenanceRule[]) || [], [rules]);
  const conflictSet = useMemo(() => {
    const set = new Set<string>();
    (conflicts as Array<{ rule1Id: string; rule2Id: string }>).forEach((c) => {
      set.add(c.rule1Id);
      set.add(c.rule2Id);
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
    if (!routeRuleId) return;
    const ruleFromRoute = ruleList.find((rule) => rule.id === routeRuleId);
    if (!ruleFromRoute) return;
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

  const handleDeleteClick = (rule: MaintenanceRule, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRule(rule);
    setIsDeleteOpen(true);
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
      const ruleData = data as Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt'>;
      if (selectedRule) {
        await updateRule.mutateAsync({ id: selectedRule.id, data: ruleData });
      } else {
        await createRule.mutateAsync(ruleData);
      }
      handleFormClose();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const getWorkTypeLabel = (workType: string): string => {
    const predefinedTypes = ['inspection', 'maintenance', 'planned-repair', 'unplanned-repair', 'improvement', 'custom'];
    if (predefinedTypes.includes(workType)) {
      return t(`maintenance:workTypes.${workType}`, workType);
    }
    return workType;
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            {conflictSet.size > 0 && (
              <Tooltip label={t('maintenance:rules.conflictWarning')}>
                <Badge color="orange" leftSection={<IconAlertTriangle size={12} />}>
                  {conflictSet.size / 2} {t('maintenance:rules.conflicts')}
                </Badge>
              </Tooltip>
            )}
          </Group>
          <Button size="sm" leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            {t('maintenance:rules.addNew')}
          </Button>
        </Group>

        {/* Content */}
        {isLoading ? (
          <Text c="dimmed" size="sm">{t('common:loading')}</Text>
        ) : ruleList.length === 0 ? (
          <Box py="xl" ta="center">
            <Text c="dimmed">{t('maintenance:rules.noRules')}</Text>
          </Box>
        ) : (
          <ScrollArea>
            <Table highlightOnHover verticalSpacing="sm" style={{ minWidth: 600 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('maintenance:fields.name')}</Table.Th>
                  <Table.Th style={{ width: 120 }}>{t('maintenance:fields.workType')}</Table.Th>
                  <Table.Th style={{ width: 80 }}>{t('maintenance:fields.isInternal')}</Table.Th>
                  <Table.Th style={{ width: 100 }}>{t('maintenance:fields.targets')}</Table.Th>
                  <Table.Th style={{ width: 100 }}>{t('maintenance:fields.intervalType')}</Table.Th>
                  <Table.Th style={{ width: 80 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ruleList.map((rule) => {
                  const hasConflict = conflictSet.has(rule.id);
                  const targetCount = rule.targets?.[0]?.ids?.length || 0;
                  const targetType = rule.targets?.[0]?.type || 'asset';

                  return (
                    <Table.Tr
                      key={rule.id}
                      onClick={() => handleEdit(rule)}
                      style={{
                        cursor: 'pointer',
                        background: hasConflict ? 'var(--mantine-color-red-0)' : undefined,
                      }}
                    >
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          {hasConflict && <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" />}
                          <Text size="sm" fw={500} lineClamp={1}>{rule.name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" lineClamp={1}>{getWorkTypeLabel(rule.workType)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={rule.isInternal ? 'blue' : 'orange'} variant="light">
                          {rule.isInternal ? 'INT' : 'EXT'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{targetCount} {t(`maintenance:targetTypes.${targetType}`)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{rule.intervalValue} {t(`maintenance:intervalTypes.${rule.intervalType}`)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon variant="subtle" color="gray" onClick={(e) => { e.stopPropagation(); handleEdit(rule); }}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={(e) => handleDeleteClick(rule, e)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={isFormOpen}
        onClose={handleFormClose}
        title={selectedRule ? t('maintenance:rules.editRule') : t('maintenance:rules.addNew')}
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
      <Modal opened={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title={t('maintenance:rules.deleteRule')} size="sm">
        <Stack gap="md">
          <Text size="sm">{t('maintenance:rules.deleteConfirm')}</Text>
          {selectedRule && <Badge size="lg" variant="light">{selectedRule.name}</Badge>}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="sm" onClick={() => setIsDeleteOpen(false)}>{t('common:cancel')}</Button>
            <Button color="red" size="sm" onClick={handleDeleteConfirm} loading={deleteRule.isPending}>{t('common:delete')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
