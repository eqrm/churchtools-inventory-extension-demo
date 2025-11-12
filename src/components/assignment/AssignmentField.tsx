import { Alert, Avatar, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
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
  onAssign: (personId: string, personName: string) => void;
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
  const handleAssign = (person: PersonResult | null) => {
    if (person) {
      onAssign(person.id, `${person.firstName} ${person.lastName}`);
    }
  };

  // If currently assigned
  if (currentAssignment && currentAssignment.status === 'active') {
    return (
      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} mb={4}>
                Currently Assigned To:
              </Text>
              <Group gap="sm">
                <Avatar size="sm" radius="xl">
                  <IconUser size={16} />
                </Avatar>
                <div>
                  <Text size="sm" fw={500}>
                    {currentAssignment.target.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Assigned {formatDateTime(currentAssignment.assignedAt)}
                  </Text>
                </div>
              </Group>
            </div>
            <Badge color="blue" size="lg">
              In Use
            </Badge>
          </Group>

          {currentAssignment.notes && (
            <Alert icon={<IconUser size={16} />} color="blue">
              <Text size="sm">{currentAssignment.notes}</Text>
            </Alert>
          )}

          {currentAssignment.dueAt && (
            <Text size="xs" c="dimmed">
              Due back: {formatDateTime(currentAssignment.dueAt)}
            </Text>
          )}

          <Button
            leftSection={<IconUserX size={16} />}
            onClick={onCheckIn}
            loading={loading}
            disabled={disabled || loading}
            variant="light"
            color="orange"
            fullWidth
          >
            Check In
          </Button>
        </Stack>
      </Paper>
    );
  }

  // If not assigned - show search
  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group>
          <IconUserPlus size={20} />
          <Text size="sm" fw={500}>
            Assign Asset
          </Text>
        </Group>

        <PersonSearch
          value={null}
          onChange={handleAssign}
          onSearch={onSearchPerson}
          placeholder="Search for a person..."
          label="Assign to"
          disabled={disabled || loading}
        />

        <Text size="xs" c="dimmed">
          Asset status will automatically change to "In Use" when assigned
        </Text>
      </Stack>
    </Paper>
  );
}
