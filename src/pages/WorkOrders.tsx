/**
 * Work Orders Page (T153)
 * 
 * Compact, tablet-friendly work orders management with Notion-like filters.
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
  Menu,
  Box,
  Tooltip,
  ScrollArea,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTable,
  IconLayoutKanban,
  IconChartLine,
  IconCalendar,
  IconFilter,
  IconX,
  IconChevronDown,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useWorkOrders,
  useMaintenanceCompanies,
  useMaintenanceRules,
  useCreateWorkOrder,
  useUpdateWorkOrder,
} from '../hooks/useMaintenance';
import { useAssets } from '../hooks/useAssets';
import { WorkOrderForm } from '../components/maintenance/WorkOrderForm';
import type {
  WorkOrder,
  WorkOrderState,
  WorkOrderType,
} from '../types/maintenance';
import type { UUID } from '../types/entities';
import { routes } from '../router/routes';
import { WorkOrderCalendar } from '../components/maintenance/WorkOrderCalendar';

type ViewMode = 'table' | 'kanban' | 'timeline' | 'calendar';

// Notion-like filter pill component
interface FilterPillProps {
  label: string;
  value: string;
  onClear: () => void;
  color?: string;
}

function FilterPill({ label, value, onClear, color = 'blue' }: FilterPillProps) {
  return (
    <Badge
      size="lg"
      variant="light"
      color={color}
      rightSection={
        <ActionIcon size="xs" color={color} radius="xl" variant="transparent" onClick={onClear}>
          <IconX size={12} />
        </ActionIcon>
      }
      style={{ paddingRight: 4, textTransform: 'none', fontWeight: 500 }}
    >
      {label}: {value}
    </Badge>
  );
}

export function WorkOrders() {
  const { t } = useTranslation(['maintenance', 'common']);
  const { data: workOrders = [], isLoading } = useWorkOrders();
  const { data: companies = [] } = useMaintenanceCompanies();
  const { data: rules = [] } = useMaintenanceRules();
  const { data: assets = [] } = useAssets();
  const createWorkOrder = useCreateWorkOrder();
  const updateWorkOrder = useUpdateWorkOrder();

  const workOrderList = useMemo(() => (workOrders as WorkOrder[]) || [], [workOrders]);
  const assetsForForm = useMemo(
    () =>
      (assets as Array<{ id: string; assetNumber: string; name?: string; status?: string; barcode?: string }>)
        .filter((asset) => asset.status !== 'deleted')
        .map((asset) => ({
          id: asset.id,
          assetNumber: asset.assetNumber,
          name: asset.name || asset.assetNumber,
          barcode: asset.barcode,
        })),
    [assets],
  );

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterState, setFilterState] = useState<WorkOrderState | 'all'>('all');
  const [filterType, setFilterType] = useState<WorkOrderType | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeWorkOrderId } = useParams<{ id?: string }>();
  const isEditRoute = location.pathname.endsWith('/edit');

  useEffect(() => {
    if (!routeWorkOrderId) return;
    const workOrderFromRoute = workOrderList.find((wo) => wo.id === routeWorkOrderId);
    if (!workOrderFromRoute) return;
    setSelectedWorkOrder(workOrderFromRoute);
    setIsFormOpen(true);
  }, [routeWorkOrderId, workOrderList]);

  const handleCreate = () => {
    setSelectedWorkOrder(null);
    setIsFormOpen(true);
    navigate(routes.maintenance.workOrders.list(), { replace: false });
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setIsFormOpen(true);
    navigate(routes.maintenance.workOrders.edit(workOrder.id), { replace: false });
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedWorkOrder(null);
    if (routeWorkOrderId || isEditRoute) {
      navigate(routes.maintenance.workOrders.list(), { replace: true });
    }
  };

  const handleFormSubmit = (data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'workOrderNumber' | 'history'>) => {
    if (selectedWorkOrder) {
      updateWorkOrder.mutate({ id: selectedWorkOrder.id, data }, { onSuccess: handleFormClose });
    } else {
      createWorkOrder.mutate(
        { ...data, workOrderNumber: '', history: [], createdBy: '' as UUID },
        { onSuccess: handleFormClose }
      );
    }
  };

  const filteredWorkOrders = workOrderList.filter((wo) => {
    if (filterState !== 'all' && wo.state !== filterState) return false;
    if (filterType !== 'all' && wo.type !== filterType) return false;
    return true;
  });

  const activeFiltersCount = (filterState !== 'all' ? 1 : 0) + (filterType !== 'all' ? 1 : 0);

  const getStateBadgeColor = (state: WorkOrderState): string => {
    const colors: Record<string, string> = {
      scheduled: 'violet', backlog: 'gray', assigned: 'blue', planned: 'cyan',
      'offer-requested': 'yellow', 'offer-received': 'lime', 'in-progress': 'orange',
      completed: 'green', done: 'teal', aborted: 'red', obsolete: 'gray',
    };
    return colors[state] || 'gray';
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  const viewIcons = [
    { mode: 'table' as ViewMode, icon: IconTable },
    { mode: 'kanban' as ViewMode, icon: IconLayoutKanban },
    { mode: 'timeline' as ViewMode, icon: IconChartLine },
    { mode: 'calendar' as ViewMode, icon: IconCalendar },
  ];

  const stateOptions: Array<{ value: WorkOrderState | 'all'; label: string }> = [
    { value: 'all', label: t('maintenance:workOrders.showAll') },
    { value: 'scheduled', label: t('maintenance:states.scheduled') },
    { value: 'backlog', label: t('maintenance:states.backlog') },
    { value: 'in-progress', label: t('maintenance:states.in-progress') },
    { value: 'completed', label: t('maintenance:states.completed') },
    { value: 'done', label: t('maintenance:states.done') },
  ];

  const typeOptions: Array<{ value: WorkOrderType | 'all'; label: string }> = [
    { value: 'all', label: t('maintenance:workOrders.showAll') },
    { value: 'internal', label: t('maintenance:types.internal') },
    { value: 'external', label: t('maintenance:types.external') },
  ];

  return (
    <Container size="xl" py="md">
      <Stack gap="sm">
        {/* Header - Compact */}
        <Group justify="space-between">
          <Group gap="xs">
            {/* View Mode Icons */}
            <Group gap={4}>
              {viewIcons.map(({ mode, icon: Icon }) => (
                <Tooltip key={mode} label={t(`maintenance:workOrders.viewMode.${mode}`)}>
                  <ActionIcon
                    variant={viewMode === mode ? 'filled' : 'subtle'}
                    color={viewMode === mode ? 'blue' : 'gray'}
                    onClick={() => setViewMode(mode)}
                    size="lg"
                  >
                    <Icon size={18} />
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>

            {/* Filter Menu */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  leftSection={<IconFilter size={16} />}
                  rightSection={activeFiltersCount > 0 ? (
                    <Badge size="xs" circle color="blue">{activeFiltersCount}</Badge>
                  ) : <IconChevronDown size={14} />}
                >
                  {t('common:filters.title')}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t('maintenance:fields.state')}</Menu.Label>
                {stateOptions.map((opt) => (
                  <Menu.Item
                    key={opt.value}
                    onClick={() => setFilterState(opt.value)}
                    style={{ fontWeight: filterState === opt.value ? 600 : 400 }}
                  >
                    {opt.label}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Label>{t('maintenance:fields.type')}</Menu.Label>
                {typeOptions.map((opt) => (
                  <Menu.Item
                    key={opt.value}
                    onClick={() => setFilterType(opt.value)}
                    style={{ fontWeight: filterType === opt.value ? 600 : 400 }}
                  >
                    {opt.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            {/* Active Filter Pills */}
            {filterState !== 'all' && (
              <FilterPill
                label={t('maintenance:fields.state')}
                value={t(`maintenance:states.${filterState}`)}
                onClear={() => setFilterState('all')}
                color="violet"
              />
            )}
            {filterType !== 'all' && (
              <FilterPill
                label={t('maintenance:fields.type')}
                value={t(`maintenance:types.${filterType}`)}
                onClear={() => setFilterType('all')}
                color="blue"
              />
            )}
          </Group>

          <Button size="sm" leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            {t('maintenance:workOrders.addNew')}
          </Button>
        </Group>

        {/* Content */}
        {isLoading ? (
          <Text c="dimmed" size="sm">{t('common:loading')}</Text>
        ) : filteredWorkOrders.length === 0 ? (
          <Box py="xl" ta="center">
            <Text c="dimmed">{t('maintenance:workOrders.noWorkOrders')}</Text>
          </Box>
        ) : viewMode === 'table' ? (
          <ScrollArea>
            <Table highlightOnHover verticalSpacing="sm" style={{ minWidth: 700 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 140 }}>#</Table.Th>
                  <Table.Th style={{ width: 100 }}>{t('maintenance:fields.state')}</Table.Th>
                  <Table.Th style={{ width: 90 }}>{t('maintenance:fields.type')}</Table.Th>
                  <Table.Th style={{ width: 100 }}>{t('maintenance:fields.scheduledStart')}</Table.Th>
                  <Table.Th>{t('maintenance:fields.assignedTo')}</Table.Th>
                  <Table.Th style={{ width: 50 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredWorkOrders.map((wo) => (
                  <Table.Tr
                    key={wo.id}
                    onClick={() => handleEdit(wo)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Table.Td>
                      <Text size="sm" fw={500}>{wo.workOrderNumber}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color={getStateBadgeColor(wo.state)} variant="filled">
                        {t(`maintenance:states.${wo.state}`)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color={wo.type === 'internal' ? 'blue' : 'orange'} variant="light">
                        {wo.type === 'internal' ? 'INT' : 'EXT'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{formatDate(wo.scheduledStart)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={wo.assignedTo ? undefined : 'dimmed'}>
                        {wo.assignedTo || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon variant="subtle" color="gray" onClick={(e) => { e.stopPropagation(); handleEdit(wo); }}>
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        ) : viewMode === 'calendar' ? (
          <WorkOrderCalendar workOrders={filteredWorkOrders} onWorkOrderClick={handleEdit} />
        ) : (
          <Box py="xl" ta="center">
            <Text c="dimmed">{t('common:comingSoon')} - {viewMode}</Text>
          </Box>
        )}
      </Stack>

      {/* Modal */}
      <Modal
        opened={isFormOpen}
        onClose={handleFormClose}
        title={selectedWorkOrder ? t('maintenance:workOrders.editWorkOrder') : t('maintenance:workOrders.addNew')}
        size="xl"
        fullScreen
      >
        <WorkOrderForm
          workOrder={selectedWorkOrder || undefined}
          type={selectedWorkOrder?.type || 'internal'}
          companies={(companies as Array<{ id: string; name: string }>) || []}
          assets={assetsForForm as Array<{ id: string; assetNumber: string; name: string }>}
          rules={(rules as Array<{ id: string; name: string }>) || []}
          onSubmit={handleFormSubmit}
          onCancel={handleFormClose}
          isLoading={createWorkOrder.isPending || updateWorkOrder.isPending}
        />
      </Modal>
    </Container>
  );
}
