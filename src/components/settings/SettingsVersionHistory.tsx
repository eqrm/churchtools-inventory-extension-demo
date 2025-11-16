import { useState } from 'react';
import { Badge, Button, Card, Group, Loader, Modal, Stack, Table, Text, Textarea, Tooltip } from '@mantine/core';
import { IconHistory, IconRestore } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useSettingsVersions } from '../../hooks/useSettingsVersions';
import type { SettingsVersion } from '../../types/settings';

const MAX_SUMMARY_LENGTH = 500;

export function SettingsVersionHistory() {
  const { t } = useTranslation('settings');
  const { versions, isLoading, rollbackVersionId, createVersion, rollbackToVersion, error } = useSettingsVersions();
  const [summary, setSummary] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmVersion, setConfirmVersion] = useState<SettingsVersion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentVersionId = versions[0]?.versionId ?? null;

  const openModal = () => {
    setSummary('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) {
      setModalOpen(false);
    }
  };

  const handleCreate = async () => {
    if (!summary.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createVersion(summary);
      notifications.show({
        title: t('versioning.notifications.createSuccessTitle'),
        message: t('versioning.notifications.createSuccessMessage'),
        color: 'green',
      });
      setModalOpen(false);
      setSummary('');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('versioning.notifications.genericError');
      notifications.show({
        title: t('versioning.notifications.createErrorTitle'),
        message,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestRollback = (version: SettingsVersion) => {
    setConfirmVersion(version);
  };

  const handleRollback = async () => {
    if (!confirmVersion) {
      return;
    }

    try {
      await rollbackToVersion(confirmVersion.versionId);
      notifications.show({
        title: t('versioning.notifications.rollbackSuccessTitle'),
        message: t('versioning.notifications.rollbackSuccessMessage', { version: confirmVersion.versionNumber }),
        color: 'green',
      });
      setConfirmVersion(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('versioning.notifications.genericError');
      notifications.show({
        title: t('versioning.notifications.rollbackErrorTitle'),
        message,
        color: 'red',
      });
    }
  };

  const renderHistory = () => {
    if (isLoading) {
      return (
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      );
    }

    if (versions.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          {t('versioning.emptyState')}
        </Text>
      );
    }

    return (
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('versioning.table.version')}</Table.Th>
            <Table.Th>{t('versioning.table.summary')}</Table.Th>
            <Table.Th>{t('versioning.table.changedBy')}</Table.Th>
            <Table.Th>{t('versioning.table.created')}</Table.Th>
            <Table.Th>{t('versioning.table.expires')}</Table.Th>
            <Table.Th style={{ width: 140 }}>{t('versioning.table.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {versions.map((version) => {
            const isCurrent = version.versionId === currentVersionId;
            const tooltipLabel = isCurrent ? t('versioning.rollback.disabled') : undefined;
            return (
              <Table.Tr key={version.versionId}>
                <Table.Td>
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text fw={600}>#{version.versionNumber}</Text>
                      {isCurrent && (
                        <Badge color="green" size="xs">
                          {t('versioning.currentBadge')}
                        </Badge>
                      )}
                      <OriginBadge origin={version.origin} />
                    </Group>
                    <AgeBadge createdAt={version.createdAt} expiresAt={version.expiresAt} />
                    {version.sourceVersionId && (
                      <Text size="xs" c="dimmed">
                        {t('versioning.rollbackSource', { id: version.sourceVersionId.slice(0, 8) })}
                      </Text>
                    )}
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{version.changeSummary}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{version.changedByName ?? version.changedBy}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatTimestamp(version.createdAt)}</Text>
                </Table.Td>
                <Table.Td>
                  <ExpiryBadge expiresAt={version.expiresAt} />
                </Table.Td>
                <Table.Td>
                  <Tooltip label={tooltipLabel} disabled={!tooltipLabel}>
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<IconRestore size={14} />}
                      onClick={() => requestRollback(version)}
                      disabled={isCurrent}
                      loading={rollbackVersionId === version.versionId}
                    >
                      {t('versioning.rollback.action')}
                    </Button>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    );
  };

  return (
    <>
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Group gap="xs">
                <IconHistory size={18} />
                <Text fw={600}>{t('versioning.title')}</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {t('versioning.description')}
              </Text>
            </Stack>
            <Button onClick={openModal}>{t('versioning.createButton')}</Button>
          </Group>

          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}

          {renderHistory()}
        </Stack>
      </Card>

      <Modal opened={modalOpen} onClose={closeModal} title={t('versioning.createModal.title')} centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('versioning.createModal.description')}
          </Text>
          <Textarea
            label={t('versioning.createModal.summaryLabel')}
            placeholder={t('versioning.createModal.summaryPlaceholder')}
            value={summary}
            onChange={(event) => setSummary(event.currentTarget.value.slice(0, MAX_SUMMARY_LENGTH))}
            autosize
            minRows={3}
            maxLength={MAX_SUMMARY_LENGTH}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal} disabled={isSubmitting}>
              {t('versioning.createModal.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={isSubmitting} disabled={!summary.trim()}>
              {t('versioning.createModal.submit')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmVersion !== null}
        onClose={() => setConfirmVersion(null)}
        title={t('versioning.rollback.confirmation', { version: confirmVersion?.versionNumber ?? '' })}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('versioning.rollback.details', {
              summary: confirmVersion?.changeSummary ?? '',
            })}
          </Text>
          {confirmVersion && (
            <Stack gap={2}>
              <Text size="sm" fw={600}>
                #{confirmVersion.versionNumber}
              </Text>
              <Text size="sm">{confirmVersion.changeSummary}</Text>
            </Stack>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmVersion(null)}>
              {t('versioning.createModal.cancel')}
            </Button>
            <Button
              color="red"
              leftSection={<IconRestore size={14} />}
              onClick={handleRollback}
              loading={confirmVersion ? rollbackVersionId === confirmVersion.versionId : false}
            >
              {t('versioning.rollback.action')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function OriginBadge({ origin }: { origin?: SettingsVersion['origin'] }) {
  const { t } = useTranslation('settings');
  if (!origin) {
    return null;
  }

  const color = origin === 'import' ? 'grape' : origin === 'rollback' ? 'yellow' : 'blue';
  return (
    <Badge size="xs" color={color} variant="light">
      {t(`versioning.origin.${origin}`)}
    </Badge>
  );
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const AGE_WARNING_DAYS = 85;
const AGE_CRITICAL_DAYS = 90;

function AgeBadge({ createdAt, expiresAt }: { createdAt?: string; expiresAt?: string }) {
  const { t } = useTranslation('settings');
  if (!createdAt) {
    return null;
  }

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  const now = new Date();
  const ageDays = Math.max(0, Math.floor((now.getTime() - createdDate.getTime()) / MS_PER_DAY));
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired = expiresDate ? !Number.isNaN(expiresDate.getTime()) && expiresDate.getTime() <= now.getTime() : false;

  if (isExpired) {
    return (
      <Badge size="xs" color="red" variant="light">
        {t('versioning.age.expired')}
      </Badge>
    );
  }

  let color: 'gray' | 'yellow' | 'red' = 'gray';
  let labelKey: 'versioning.age.label' | 'versioning.age.warning' | 'versioning.age.critical' = 'versioning.age.label';

  if (ageDays >= AGE_CRITICAL_DAYS) {
    color = 'red';
    labelKey = 'versioning.age.critical';
  } else if (ageDays >= AGE_WARNING_DAYS) {
    color = 'yellow';
    labelKey = 'versioning.age.warning';
  }

  return (
    <Badge size="xs" color={color} variant="light">
      {t(labelKey, { days: ageDays })}
    </Badge>
  );
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string }) {
  const { t } = useTranslation('settings');
  if (!expiresAt) {
    return <Badge color="gray" size="xs">{t('versioning.expiry.noExpiry')}</Badge>;
  }

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return (
      <Badge color="red" size="xs">
        {t('versioning.expiry.expired')}
      </Badge>
    );
  }

  if (days <= 5) {
    return (
      <Badge color="yellow" size="xs">
        {t('versioning.expiry.warning', { days })}
      </Badge>
    );
  }

  return (
    <Badge color="gray" size="xs">
      {t('versioning.expiry.active', { days })}
    </Badge>
  );
}
