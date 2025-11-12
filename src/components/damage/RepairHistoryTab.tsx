import { Alert, Badge, Box, Button, Group, Image, Modal, Paper, Stack, Text, Textarea, Timeline } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconCheck, IconTool } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../utils/formatters';
import { useDamageReports } from '../../hooks/useDamageReports';
import type { DamageReport } from '../../types/damage';

interface RepairHistoryTabProps {
  /** Asset ID to show damage history for */
  assetId: string;
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
 * Uses useDamageReports hook to fetch damage reports for the asset.
 * 
 * @example
 * ```tsx
 * <RepairHistoryTab
 *   assetId={asset.id}
 *   onMarkRepaired={handleMarkRepaired}
 *   loading={isRepairing}
 * />
 * ```
 */
export function RepairHistoryTab({
  assetId,
  onMarkRepaired,
  loading = false,
}: RepairHistoryTabProps) {
  const { t } = useTranslation('damage');
  const { t: tCommon } = useTranslation('common');
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [repairNotes, setRepairNotes] = useState('');
  const [repairModalOpened, { open: openRepairModal, close: closeRepairModal }] = useDisclosure(false);
  
  // Fetch damage reports for this asset
  const { reports: damageReports, isLoading, error } = useDamageReports(assetId);

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

  if (isLoading) {
    return (
      <Box p="md" style={{ textAlign: 'center' }}>
        <Text c="dimmed" size="sm">
          Loading damage history...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="md" style={{ textAlign: 'center' }}>
        <Text c="red" size="sm">
          {error}
        </Text>
      </Box>
    );
  }

  if (damageReports.length === 0) {
    return (
      <Box p="md" style={{ textAlign: 'center' }}>
        <IconCheck size={48} opacity={0.3} style={{ marginBottom: 16 }} />
        <Text c="dimmed" size="sm">
          {t('timeline.empty')}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Timeline active={-1} bulletSize={24} lineWidth={2}>
        {damageReports.map((report) => {
          const isRepaired = report.status === 'repaired';
          const reportedByName = report.reportedByName ?? t('timeline.unknownUser');
          const reportedDate = formatDateTime(report.reportedAt);
          const statusKey = `status.${report.status}` as const;
          const statusLabel = t(statusKey);
          const repairedByName = report.repairedByName ?? t('timeline.unknownUser');
          const repairedMeta = report.repairedAt
            ? t('timeline.repairedByWithDate', {
                name: repairedByName,
                date: formatDateTime(report.repairedAt),
              })
            : t('timeline.repairedBy', { name: repairedByName });

          return (
            <Timeline.Item
              key={report.id}
              bullet={isRepaired ? <IconCheck size={12} /> : <IconAlertCircle size={12} />}
              title={
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={500}>
                    {isRepaired ? t('timeline.repaired') : t('timeline.reported')}
                  </Text>
                  <Badge color={isRepaired ? 'green' : 'red'} size="sm">
                    {statusLabel}
                  </Badge>
                </Group>
              }
            >
              <Paper withBorder p="md" mt="xs">
                <Stack gap="sm">
                  <div>
                    <Text size="xs" c="dimmed">
                      {t('timeline.reportedBy', { name: reportedByName, date: reportedDate })}
                    </Text>
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      {t('timeline.description')}
                    </Text>
                    <Text size="sm">{report.description}</Text>
                  </div>

                  {report.photos && report.photos.length > 0 && (
                    <div>
                      <Text size="sm" fw={500} mb={8}>
                        {t('timeline.photos')}
                      </Text>
                      <Group gap="md">
                        {report.photos.map((photo, photoIndex) => (
                          <Image
                            key={photo.id}
                            src={photo.base64Data}
                            alt={t('photoUpload.dropzone.imageAlt', { index: photoIndex + 1 })}
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
                        {t('timeline.repairNotes')}
                      </Text>
                      <Text size="sm">{report.repairNotes}</Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        {repairedMeta}
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
                        {t('timeline.markAsRepaired')}
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
        title={t('timeline.markAsRepairedTitle')}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('timeline.markAsRepairedHint')}
          </Text>

          <Textarea
            label={t('timeline.repairNotes')}
            placeholder={t('timeline.notesPlaceholder')}
            minRows={4}
            value={repairNotes}
            onChange={(e) => setRepairNotes(e.currentTarget.value)}
            disabled={loading}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeRepairModal} disabled={loading}>
              {tCommon('actions.cancel')}
            </Button>
            <Button onClick={handleSubmitRepair} loading={loading} disabled={loading || !repairNotes.trim()}>
              {t('timeline.markAsRepairedSubmit')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
