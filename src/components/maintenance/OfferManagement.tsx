/**
 * Offer Management Component (T149)
 * 
 * Displays received offers for external work orders, allows requesting more,
 * and selecting the accepted offer.
 */

import { Button, Table, Text, Badge, Stack, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconRefresh, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { WorkOrder } from '../../types/maintenance';

interface OfferManagementProps {
  workOrder: WorkOrder;
  onRequestMoreOffers: () => Promise<void>;
  onSelectOffer: (companyId: string) => Promise<void>;
  isLoading?: boolean;
  companyNames?: Map<string, string>; // Map of companyId to company name
}

export function OfferManagement({
  workOrder,
  onRequestMoreOffers,
  onSelectOffer,
  isLoading = false,
  companyNames = new Map(),
}: OfferManagementProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  if (workOrder.type !== 'external') {
    return null;
  }

  const offers = workOrder.offers || [];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="lg" fw={600}>
          {t('maintenance:offers.title')} ({offers.length})
        </Text>
        {workOrder.state === 'offer-received' && (
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={onRequestMoreOffers}
            loading={isLoading}
          >
            {t('maintenance:offers.requestMore')}
          </Button>
        )}
      </Group>

      {offers.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t('maintenance:offers.noOffersYet')}
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('maintenance:offers.columns.company')}</Table.Th>
              <Table.Th>{t('maintenance:offers.columns.amount')}</Table.Th>
              <Table.Th>{t('maintenance:offers.columns.receivedAt')}</Table.Th>
              <Table.Th>{t('maintenance:offers.columns.notes')}</Table.Th>
              <Table.Th>{t('maintenance:offers.columns.status')}</Table.Th>
              <Table.Th>{t('common:actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {offers.map((offer, index) => {
              const isAccepted = workOrder.companyId === offer.companyId;
              const companyName = companyNames.get(offer.companyId) || offer.companyId;

              return (
                <Table.Tr key={`${offer.companyId}-${index}`}>
                  <Table.Td>
                    <Text size="sm">{companyName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {formatCurrency(offer.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDate(offer.receivedAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2} maw={300}>
                      {offer.notes || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {isAccepted ? (
                      <Badge color="green" leftSection={<IconCheck size={12} />}>
                        {t('maintenance:offers.accepted')}
                      </Badge>
                    ) : (
                      <Badge color="gray">{t('maintenance:offers.pending')}</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {!isAccepted && workOrder.state === 'offer-received' && (
                      <Tooltip label={t('maintenance:offers.acceptTooltip')}>
                        <ActionIcon
                          color="green"
                          variant="light"
                          onClick={() => onSelectOffer(offer.companyId)}
                          loading={isLoading}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
