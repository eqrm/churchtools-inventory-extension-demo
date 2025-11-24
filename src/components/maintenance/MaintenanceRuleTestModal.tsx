import { useEffect, useMemo, useState } from 'react';
import { Modal, Stack, Text, NumberInput, Group, Badge, Paper, ScrollArea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useTranslation } from 'react-i18next';
import type { MaintenanceRule } from '../../types/maintenance';
import { previewRuleSchedule } from '../../services/maintenanceScheduler';

interface MaintenanceRuleTestModalProps {
  opened: boolean;
  onClose: () => void;
  rule: MaintenanceRule;
}

const DEFAULT_OCCURRENCES = 3;
const MAX_OCCURRENCES = 12;

export function MaintenanceRuleTestModal({ opened, onClose, rule }: MaintenanceRuleTestModalProps) {
  const { t } = useTranslation('maintenance');
  const [occurrences, setOccurrences] = useState(DEFAULT_OCCURRENCES);
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [startOverride, setStartOverride] = useState<Date | null>(null);

  useEffect(() => {
    if (!opened) {
      return;
    }
    setOccurrences(DEFAULT_OCCURRENCES);
    setAnchorDate(new Date());
    setStartOverride(null);
  }, [opened, rule.id]);

  const previewItems = useMemo(
    () =>
      previewRuleSchedule(rule, {
        occurrences,
        now: anchorDate,
        startDateOverride: startOverride ?? undefined,
      }),
    [rule, occurrences, anchorDate, startOverride],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
      }),
    [],
  );

  const formatIsoDate = (iso: string): string => {
    const parsed = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return iso;
    }
    return dateFormatter.format(parsed);
  };

  const handleOccurrencesChange = (value: string | number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      setOccurrences(1);
      return;
    }
    const next = Math.min(Math.max(1, Math.trunc(value)), MAX_OCCURRENCES);
    setOccurrences(next);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('maintenance:rules.testRuleModalTitle')} size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('maintenance:rules.testRuleDescription')}
        </Text>

        <Group grow>
          <NumberInput
            label={t('maintenance:rules.previewOccurrencesLabel')}
            min={1}
            max={MAX_OCCURRENCES}
            value={occurrences}
            onChange={handleOccurrencesChange}
          />
          <DateInput
            label={t('maintenance:rules.previewAnchorLabel')}
            value={anchorDate}
            onChange={(value) => value && setAnchorDate(value)}
          />
        </Group>

        <DateInput
          label={t('maintenance:rules.previewStartOverrideLabel')}
          description={t('maintenance:rules.previewStartOverrideHelp')}
          value={startOverride}
          onChange={setStartOverride}
          clearable
        />

        {previewItems.length === 0 ? (
          <Paper withBorder p="md">
            <Text size="sm" c="dimmed">
              {t('maintenance:rules.previewEmptyState')}
            </Text>
          </Paper>
        ) : (
          <ScrollArea h={260} type="hover">
            <Stack gap="sm">
              {previewItems.map((item, index) => (
                <Paper key={`${item.dueDate}-${index}`} withBorder p="sm">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={600}>{formatIsoDate(item.dueDate)}</Text>
                      <Text size="xs" c="dimmed">
                        {item.dueDate}
                      </Text>
                      <Text size="sm" mt={4}>
                        {t('maintenance:rules.previewLeadTimeLabel', {
                          date: formatIsoDate(item.leadTimeStart),
                        })}
                      </Text>
                    </div>
                    <Badge color={item.isPast ? 'red' : 'green'} variant="light">
                      {item.isPast
                        ? t('maintenance:rules.previewPastBadge')
                        : t('maintenance:rules.previewUpcomingBadge')}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Modal>
  );
}
