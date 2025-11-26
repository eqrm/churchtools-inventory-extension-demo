/**
 * WorkOrderCalendar Component (T6.3.2)
 * 
 * Displays scheduled work orders in a calendar/list view
 * grouped by month with date indicators and click-to-view details.
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Group,
  Paper,
  Text,
  Title,
  Badge,
  ActionIcon,
  Tooltip,
  Popover,
  Button,
  Card,
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight, IconCalendarEvent } from '@tabler/icons-react';
import {
  format,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import type { WorkOrder } from '../../types/maintenance';

export interface WorkOrderCalendarProps {
  /** Work orders to display on the calendar */
  workOrders: WorkOrder[];
  /** Only show work orders with 'scheduled' state */
  showOnlyScheduled?: boolean;
  /** Callback when a work order is clicked */
  onWorkOrderClick?: (workOrder: WorkOrder) => void;
}

interface WorkOrdersByDate {
  [dateKey: string]: WorkOrder[];
}

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  workOrders: WorkOrder[];
}

/**
 * Calendar view for scheduled work orders
 */
export function WorkOrderCalendar({
  workOrders,
  showOnlyScheduled = false,
  onWorkOrderClick,
}: WorkOrderCalendarProps) {
  const { t } = useTranslation(['maintenance', 'common']);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [popoverOpened, setPopoverOpened] = useState(false);

  // Filter and process work orders
  const filteredWorkOrders = useMemo(() => {
    let filtered = workOrders.filter((wo) => wo.scheduledStart);
    if (showOnlyScheduled) {
      filtered = filtered.filter((wo) => wo.state === 'scheduled');
    }
    return filtered;
  }, [workOrders, showOnlyScheduled]);

  // Group work orders by date for calendar indicators
  const workOrdersByDate = useMemo<WorkOrdersByDate>(() => {
    const grouped: WorkOrdersByDate = {};
    filteredWorkOrders.forEach((wo) => {
      if (wo.scheduledStart) {
        const dateKey = format(parseISO(wo.scheduledStart), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(wo);
      }
    });
    return grouped;
  }, [filteredWorkOrders]);

  // Group work orders by month for list view
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const groups: { [key: string]: MonthGroup } = {};
    
    filteredWorkOrders
      .sort((a, b) => {
        const dateA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
        const dateB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
        return dateA - dateB;
      })
      .forEach((wo) => {
        if (wo.scheduledStart) {
          const date = parseISO(wo.scheduledStart);
          const monthKey = format(date, 'yyyy-MM');
          const monthLabel = format(date, 'MMMM yyyy');
          
          if (!groups[monthKey]) {
            groups[monthKey] = {
              monthKey,
              monthLabel,
              workOrders: [],
            };
          }
          groups[monthKey].workOrders.push(wo);
        }
      });
    
    return Object.values(groups).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredWorkOrders]);

  // Calendar navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  // Work order click handler
  const handleWorkOrderClick = useCallback(
    (wo: WorkOrder) => {
      setSelectedWorkOrder(wo);
      setPopoverOpened(true);
      onWorkOrderClick?.(wo);
    },
    [onWorkOrderClick]
  );

  // Get state badge color
  const getStateBadgeColor = (state: string): string => {
    switch (state) {
      case 'scheduled':
        return 'violet';
      case 'backlog':
        return 'gray';
      case 'assigned':
        return 'blue';
      case 'planned':
        return 'cyan';
      case 'in-progress':
        return 'orange';
      case 'completed':
        return 'green';
      case 'done':
        return 'teal';
      default:
        return 'gray';
    }
  };

  // Render day cell with indicator for work orders
  const renderDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayWorkOrders = workOrdersByDate[dateKey] || [];
    const hasWorkOrders = dayWorkOrders.length > 0;
    const day = date.getDate();

    return (
      <Tooltip
        label={hasWorkOrders ? `${dayWorkOrders.length} work order(s)` : null}
        disabled={!hasWorkOrders}
        position="top"
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span>{day}</span>
          {hasWorkOrders && (
            <div
              data-work-order-indicator
              style={{
                position: 'absolute',
                bottom: 2,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--mantine-color-violet-6)',
              }}
            />
          )}
        </div>
      </Tooltip>
    );
  };

  if (filteredWorkOrders.length === 0) {
    return (
      <Paper p="xl" withBorder>
        <Stack align="center" gap="md">
          <IconCalendarEvent size={48} stroke={1.5} color="gray" />
          <Text c="dimmed" ta="center">
            {t('maintenance:workOrders.noScheduledWorkOrders', 'No scheduled work orders')}
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="lg" role="application" aria-label="Work order calendar">
      {/* Calendar View */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>{format(currentMonth, 'MMMM yyyy')}</Title>
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                onClick={handlePreviousMonth}
                aria-label="Previous month"
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <ActionIcon variant="subtle" onClick={handleNextMonth} aria-label="Next month">
                <IconChevronRight size={20} />
              </ActionIcon>
            </Group>
          </Group>

          <Calendar
            date={currentMonth}
            renderDay={renderDay}
            getDayProps={(date) => ({
              onClick: () => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayWorkOrders = workOrdersByDate[dateKey];
                if (dayWorkOrders && dayWorkOrders.length > 0 && dayWorkOrders[0]) {
                  handleWorkOrderClick(dayWorkOrders[0]);
                }
              },
            })}
          />
        </Stack>
      </Paper>

      {/* Monthly List View */}
      <Stack gap="md">
        {monthGroups.map((group) => (
          <Paper key={group.monthKey} p="md" withBorder>
            <Stack gap="sm">
              <Title order={4}>{group.monthLabel}</Title>
              {group.workOrders.map((wo) => (
                <Popover
                  key={wo.id}
                  opened={selectedWorkOrder?.id === wo.id && popoverOpened}
                  onClose={() => setPopoverOpened(false)}
                  position="right"
                  withArrow
                >
                  <Popover.Target>
                    <Card
                      withBorder
                      padding="sm"
                      radius="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleWorkOrderClick(wo)}
                    >
                      <Group justify="space-between">
                        <Group gap="sm">
                          <Text fw={500}>{wo.workOrderNumber}</Text>
                          <Badge color={getStateBadgeColor(wo.state)} size="sm">
                            {t(`maintenance:states.${wo.state}`)}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {wo.scheduledStart
                            ? format(parseISO(wo.scheduledStart), 'MMM d, yyyy')
                            : '-'}
                        </Text>
                      </Group>
                      {wo.ruleId && (
                        <Text size="xs" c="dimmed" mt="xs">
                          {t('maintenance:fields.rule')}: {wo.ruleId}
                        </Text>
                      )}
                    </Card>
                  </Popover.Target>
                  <Popover.Dropdown role="tooltip">
                    <Stack gap="xs">
                      <Text fw={600}>{wo.workOrderNumber}</Text>
                      <Text size="sm">
                        {t('maintenance:fields.state')}: {t(`maintenance:states.${wo.state}`)}
                      </Text>
                      <Text size="sm">
                        {t('maintenance:fields.scheduledStart')}:{' '}
                        {wo.scheduledStart
                          ? format(parseISO(wo.scheduledStart), 'PPP')
                          : '-'}
                      </Text>
                      <Text size="sm">
                        {t('maintenance:fields.leadTimeDays')}: {wo.leadTimeDays}{' '}
                        {t('common:days', 'days')}
                      </Text>
                      {wo.assignedTo && (
                        <Text size="sm">
                          {t('maintenance:fields.assignedTo')}: {wo.assignedTo}
                        </Text>
                      )}
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => onWorkOrderClick?.(wo)}
                        mt="xs"
                      >
                        {t('maintenance:actions.viewDetails')}
                      </Button>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}
