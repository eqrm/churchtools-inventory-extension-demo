import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Alert, Avatar, Badge, Box, Button, Divider, Group, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUser, IconUserPlus, IconUserX } from '@tabler/icons-react';
import { formatDateTime } from '../../utils/formatters';
import { PersonSearch, type PersonResult } from './PersonSearch';
import type { Assignment } from '../../types/assignment';

interface AssignmentFieldProps {
  /** Current assignment (if any) */
  currentAssignment: Assignment | null;
  /** Callback to search for persons */
  onSearchPerson: (query: string) => Promise<PersonResult[]>;
  /** Callback when asset is assigned */
  onAssign: (personId: string, personName: string) => void | Promise<void>;
  /** Callback when asset is checked in */
  onCheckIn: () => void;
  /** Whether assignment operation is in progress */
  loading?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
}

/**
 * AssignmentField Component
 * 
 * Displays current assignment status and allows assigning/checking in assets.
 * Shows person search when unassigned, assignment info when assigned.
 * 
 * @example
 * ```tsx
 * <AssignmentField
 *   currentAssignment={asset.currentAssignment}
 *   onSearchPerson={searchChurchToolsPersons}
 *   onAssign={handleAssignAsset}
 *   onCheckIn={handleCheckInAsset}
 *   loading={isAssigning}
 * />
 * ```
 */
export function AssignmentField({
  currentAssignment,
  onSearchPerson,
  onAssign,
  onCheckIn,
  loading = false,
  disabled = false,
}: AssignmentFieldProps) {
  const [assignModalOpened, { open: openAssignModal, close: closeAssignModal }] = useDisclosure(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const focusSearchInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus({ preventScroll: true });
        searchInputRef.current.select();
      }
    });

    window.setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus({ preventScroll: true });
        searchInputRef.current.select();
      }
    }, 120);
  }, []);

  useEffect(() => {
    if (!assignModalOpened) {
      return;
    }

    focusSearchInput();
  }, [assignModalOpened, focusSearchInput]);

  const handlePersonSelect = (person: PersonResult | null) => {
    if (!person) {
      return;
    }

    const result = onAssign(person.id, `${person.firstName} ${person.lastName}`);

    if (result && typeof (result as PromiseLike<void>).then === 'function') {
      (result as PromiseLike<void>)
        .then(
          () => {
            closeAssignModal();
          },
          () => {
            // Keep modal open to allow retry on failure
          }
        );
      return;
    }

    closeAssignModal();
  };

  const isAssigned = currentAssignment?.status === 'active';

  const assigneeValue = useMemo(() => {
    if (!isAssigned || !currentAssignment) {
      return (
        <Group gap="sm" wrap="wrap">
          <Badge color="gray" variant="light">
            Unassigned
          </Badge>
          <Button
            size="xs"
            leftSection={<IconUserPlus size={14} />}
            onClick={openAssignModal}
            disabled={disabled || loading}
          >
            Assign Asset
          </Button>
        </Group>
      );
    }

    return (
      <Group gap="sm" justify="space-between" align="flex-start" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <Avatar size="sm" radius="xl">
            <IconUser size={16} />
          </Avatar>
          <Stack gap={2}>
            <Text size="sm" fw={500}>
              {currentAssignment.target.name}
            </Text>
            <Text size="xs" c="dimmed">
              Assigned {formatDateTime(currentAssignment.assignedAt)}
            </Text>
          </Stack>
        </Group>
        <Badge color="blue" variant="light">
          In Use
        </Badge>
      </Group>
    );
  }, [currentAssignment, disabled, isAssigned, loading, openAssignModal]);

  const rows = useMemo(
    () => [
      { key: 'assignee', label: 'Assignee', icon: <IconUser size={16} />, content: assigneeValue },
    ],
    [assigneeValue]
  );

  const renderRow = (row: { key: string; label: string; icon: ReactNode; content: ReactNode }, index: number) => (
    <Box key={row.key}>
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <Box c="dimmed" style={{ display: 'flex', alignItems: 'flex-start' }}>
          {row.icon}
        </Box>
        <Box style={{ flex: 1 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {row.label}
          </Text>
          <Box mt={4}>{row.content}</Box>
        </Box>
      </Group>
      {index < rows.length - 1 && <Divider my="sm" />}
    </Box>
  );

  return (
    <>
      <Stack gap="sm">
        {rows.map((row, index) => renderRow(row, index))}

        {!isAssigned && (
          <Text size="xs" c="dimmed">
            Asset status will automatically change to "In Use" when assigned.
          </Text>
        )}

        {isAssigned && currentAssignment && (
          <Stack gap="xs">
            {currentAssignment.notes && (
              <Alert icon={<IconUser size={16} />} color="blue" radius="md">
                <Text size="sm">{currentAssignment.notes}</Text>
              </Alert>
            )}
            <Group justify="space-between" align="center">
              {currentAssignment.dueAt ? (
                <Text size="xs" c="dimmed">
                  Due back {formatDateTime(currentAssignment.dueAt)}
                </Text>
              ) : (
                <span />
              )}
              <Button
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconUserX size={14} />}
                onClick={onCheckIn}
                loading={loading}
                disabled={disabled || loading}
              >
                Check In
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>

      <Modal
        opened={assignModalOpened}
        onClose={closeAssignModal}
        title="Assign Asset"
        centered
        size="lg"
        withinPortal
      >
        <Stack gap="sm">
          <PersonSearch
            value={null}
            onChange={handlePersonSelect}
            onSearch={onSearchPerson}
            placeholder="Search for a person..."
            label="Assign to"
            disabled={disabled || loading}
            inputRef={searchInputRef}
            autoFocus
          />
          <Text size="xs" c="dimmed">
            Use the arrow keys to navigate results and press Enter to assign.
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
