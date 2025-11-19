/**
 * Work Orders Page (T153)
 * 
 * Multiple view modes (table/kanban/timeline) with filtering and CRUD operations.
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
  SegmentedControl,
  Select,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTable, IconColumns, IconTimeline } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useWorkOrders,
  useMaintenanceCompanies,
  useMaintenanceRules,
} from '../hooks/useMaintenance';
import { useAssets } from '../hooks/useAssets';
import { WorkOrderForm } from '../components/maintenance/WorkOrderForm';
import type { WorkOrder, WorkOrderState, WorkOrderType } from '../types/maintenance';
import { routes } from '../router/routes';

type ViewMode = 'table' | 'kanban' | 'timeline';

export function WorkOrders() {
  const { t } = useTranslation(['maintenance', 'common']);
  const { data: workOrders = [], isLoading } = useWorkOrders();
  const { data: companies = [] } = useMaintenanceCompanies();
  const { data: rules = [] } = useMaintenanceRules();
  const { data: assets = [] } = useAssets();

  const workOrderList = useMemo(() => (workOrders as WorkOrder[]) || [], [workOrders]);

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
    if (!routeWorkOrderId) {
      return;
    }
    const workOrderFromRoute = workOrderList.find((wo) => wo.id === routeWorkOrderId);
    if (!workOrderFromRoute) {
      return;
    }
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

  const filteredWorkOrders = workOrderList.filter((wo) => {
    if (filterState !== 'all' && wo.state !== filterState) return false;
    if (filterType !== 'all' && wo.type !== filterType) return false;
    return true;
  });

  const getStateBadgeColor = (state: WorkOrderState): string => {
    switch (state) {
      case 'backlog':
        return 'gray';
      case 'assigned':
        return 'blue';
      case 'planned':
        return 'cyan';
      case 'offer-requested':
        return 'yellow';
      case 'offer-received':
        return 'lime';
      case 'in-progress':
        return 'orange';
      case 'completed':
        return 'green';
      case 'done':
        return 'teal';
      case 'aborted':
        return 'red';
      case 'obsolete':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTableView = () => (
    <Paper withBorder>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('maintenance:fields.workOrderNumber')}</Table.Th>
            <Table.Th>{t('maintenance:fields.type')}</Table.Th>
            <Table.Th>{t('maintenance:fields.state')}</Table.Th>
            <Table.Th>{t('maintenance:fields.scheduledStart')}</Table.Th>
            <Table.Th>{t('maintenance:fields.assignedTo')}</Table.Th>
            <Table.Th>{t('common:columns.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filteredWorkOrders.map((workOrder) => (
            <Table.Tr key={workOrder.id}>
              <Table.Td>
                <Text fw={500} size="sm">
                  {workOrder.workOrderNumber}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color={workOrder.type === 'internal' ? 'blue' : 'orange'} variant="light">
                  {t(`maintenance:types.${workOrder.type}`)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Badge color={getStateBadgeColor(workOrder.state)} variant="filled">
                  {t(`maintenance:states.${workOrder.state}`)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {formatDate(workOrder.scheduledStart)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{workOrder.assignedTo || '-'}</Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="light" color="blue" onClick={() => handleEdit(workOrder)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );

  const renderKanbanView = () => (
    <Text c="dimmed" ta="center" py="xl">
      {t('common:comingSoon')} - Kanban view
    </Text>
  );

  const renderTimelineView = () => (
    <Text c="dimmed" ta="center" py="xl">
      {t('common:comingSoon')} - Timeline view
    </Text>
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>{t('maintenance:workOrders.title')}</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            {t('maintenance:workOrders.addNew')}
          </Button>
        </Group>

        <Group justify="space-between">
          <Group gap="md">
            <SegmentedControl
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              data={[
                {
                  label: (
                    <Group gap={5}>
                      <IconTable size={16} />
                      <span>{t('maintenance:workOrders.viewMode.table')}</span>
                    </Group>
                  ),
                  value: 'table',
                },
                {
                  label: (
                    <Group gap={5}>
                      <IconColumns size={16} />
                      <span>{t('maintenance:workOrders.viewMode.kanban')}</span>
                    </Group>
                  ),
                  value: 'kanban',
                },
                {
                  label: (
                    <Group gap={5}>
                      <IconTimeline size={16} />
                      <span>{t('maintenance:workOrders.viewMode.timeline')}</span>
                    </Group>
                  ),
                  value: 'timeline',
                },
              ]}
            />
          </Group>

          <Group gap="sm">
            <Select
              placeholder={t('maintenance:workOrders.filterByState')}
              value={filterState}
              onChange={(value) => setFilterState((value as WorkOrderState | 'all') || 'all')}
              data={[
                { label: t('maintenance:workOrders.showAll'), value: 'all' },
                { label: t('maintenance:states.backlog'), value: 'backlog' },
                { label: t('maintenance:states.assigned'), value: 'assigned' },
                { label: t('maintenance:states.planned'), value: 'planned' },
                { label: t('maintenance:states.in-progress'), value: 'in-progress' },
                { label: t('maintenance:states.completed'), value: 'completed' },
                { label: t('maintenance:states.done'), value: 'done' },
              ]}
              style={{ width: 200 }}
            />
            <Select
              placeholder={t('maintenance:workOrders.filterByType')}
              value={filterType}
              onChange={(value) => setFilterType((value as WorkOrderType | 'all') || 'all')}
              data={[
                { label: t('maintenance:workOrders.showAll'), value: 'all' },
                { label: t('maintenance:types.internal'), value: 'internal' },
                { label: t('maintenance:types.external'), value: 'external' },
              ]}
              style={{ width: 200 }}
            />
          </Group>
        </Group>

        {isLoading ? (
          <Text c="dimmed">{t('common:loading')}</Text>
        ) : filteredWorkOrders.length === 0 ? (
          <Paper p="xl" withBorder>
            <Text c="dimmed" ta="center">
              {t('maintenance:workOrders.noWorkOrders')}
            </Text>
          </Paper>
        ) : (
          <>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'kanban' && renderKanbanView()}
            {viewMode === 'timeline' && renderTimelineView()}
          </>
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={isFormOpen}
        onClose={handleFormClose}
        title={
          selectedWorkOrder
            ? t('maintenance:workOrders.editWorkOrder')
            : t('maintenance:workOrders.addNew')
        }
        size="xl"
      >
        <WorkOrderForm
          workOrder={selectedWorkOrder || undefined}
          type={selectedWorkOrder?.type || 'internal'}
          companies={(companies as Array<{ id: string; name: string }>) || []}
          assets={(assets as Array<{ id: string; assetNumber: string; name: string }>) || []}
          rules={(rules as Array<{ id: string; name: string }>) || []}
          onSubmit={handleFormClose}
          onCancel={handleFormClose}
        />
      </Modal>
    </Container>
  );
}
