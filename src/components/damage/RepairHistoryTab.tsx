import { Alert, Badge, Box, Button, Group, Image, Modal, Paper, Stack, Text, Textarea, Timeline } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconCheck, IconTool } from '@tabler/icons-react';
import { useState } from 'react';
import { formatDateTime } from '../../utils/formatters';
import type { DamageReport } from '../../types/damage';

interface RepairHistoryTabProps {
  /** Array of damage reports for this asset */
  damageReports: DamageReport[];
  /** Callback when marking a report as repaired */
  onMarkRepaired?: (reportId: string, repairNotes: string) => void;
  /** Whether repair operation is in progress */
  loading?: boolean;
}

/**
 * RepairHistoryTab Component
 * 
 * Displays chronological timeline of damage reports and repairs.
 * Shows photos, descriptions, and repair notes.
 * Allows marking broken items as repaired with notes.
 * 
 * @example
 * ```tsx
 * <RepairHistoryTab
 *   damageReports={assetDamageReports}
 *   onMarkRepaired={handleMarkRepaired}
 *   loading={isRepairing}
 * />
 * ```
 */
export function RepairHistoryTab({
  damageReports,
  onMarkRepaired,
  loading = false,
}: RepairHistoryTabProps) {
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [repairNotes, setRepairNotes] = useState('');
  const [repairModalOpened, { open: openRepairModal, close: closeRepairModal }] = useDisclosure(false);

  const handleOpenRepairModal = (report: DamageReport) => {
    setSelectedReport(report);
    setRepairNotes('');
    openRepairModal();
  };

  const handleSubmitRepair = () => {
    if (selectedReport && onMarkRepaired) {
      onMarkRepaired(selectedReport.id, repairNotes);
      closeRepairModal();
      setSelectedReport(null);
      setRepairNotes('');
    }
  };

  if (damageReports.length === 0) {
    return (
      <Box p="md" style={{ textAlign: 'center' }}>
        <IconCheck size={48} opacity={0.3} style={{ marginBottom: 16 }} />
        <Text c="dimmed" size="sm">
          No damage reports on record
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Timeline active={-1} bulletSize={24} lineWidth={2}>
        {damageReports.map((report) => {
          const isRepaired = report.status === 'repaired';

          return (
            <Timeline.Item
              key={report.id}
              bullet={isRepaired ? <IconCheck size={12} /> : <IconAlertCircle size={12} />}
              title={
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={500}>
                    {isRepaired ? 'Repaired' : 'Damage Reported'}
                  </Text>
                  <Badge color={isRepaired ? 'green' : 'red'} size="sm">
                    {report.status}
                  </Badge>
                </Group>
              }
            >
              <Paper withBorder p="md" mt="xs">
                <Stack gap="sm">
                  <div>
                    <Text size="xs" c="dimmed">
                      Reported by {report.reportedByName || 'Unknown'} on {formatDateTime(report.reportedAt)}
                    </Text>
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Description:
                    </Text>
                    <Text size="sm">{report.description}</Text>
                  </div>

                  {report.photos && report.photos.length > 0 && (
                    <div>
                      <Text size="sm" fw={500} mb={8}>
                        Photos:
                      </Text>
                      <Group gap="md">
                        {report.photos.map((photo) => (
                          <Image
                            key={photo.id}
                            src={photo.base64Data}
                            alt="Damage photo"
                            w={120}
                            h={120}
                            fit="cover"
                            radius="md"
                          />
                        ))}
                      </Group>
                    </div>
                  )}

                  {isRepaired && report.repairNotes && (
                    <Alert icon={<IconTool size={16} />} color="green">
                      <Text size="sm" fw={500} mb={4}>
                        Repair Notes:
                      </Text>
                      <Text size="sm">{report.repairNotes}</Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        Repaired by {report.repairedByName || 'Unknown'}
                        {report.repairedAt && ` on ${formatDateTime(report.repairedAt)}`}
                      </Text>
                    </Alert>
                  )}

                  {!isRepaired && onMarkRepaired && (
                    <Group justify="flex-end" mt="xs">
                      <Button
                        size="xs"
                        leftSection={<IconTool size={14} />}
                        onClick={() => handleOpenRepairModal(report)}
                        disabled={loading}
                      >
                        Mark as Repaired
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Paper>
            </Timeline.Item>
          );
        })}
      </Timeline>

      <Modal
        opened={repairModalOpened}
        onClose={closeRepairModal}
        title="Mark as Repaired"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Add notes about the repair work performed
          </Text>

          <Textarea
            label="Repair Notes"
            placeholder="Describe the repair work..."
            minRows={4}
            value={repairNotes}
            onChange={(e) => setRepairNotes(e.currentTarget.value)}
            disabled={loading}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeRepairModal} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRepair} loading={loading} disabled={loading || !repairNotes.trim()}>
              Mark as Repaired
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
