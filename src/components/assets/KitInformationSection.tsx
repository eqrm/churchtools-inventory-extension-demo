/**
 * Kit Information Section Component
 * 
 * Displays kit-specific information when an asset is marked as a kit
 */

import { Badge, Card, Group, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconPackage, IconUsers, IconCalendar, IconLink } from '@tabler/icons-react';
import type { Asset } from '../../types/entities';

interface KitInformationSectionProps {
  asset: Asset;
}

export function KitInformationSection({ asset }: KitInformationSectionProps) {
  if (!asset.isKit) {
    return null;
  }

  const formatDate = (value?: string | null): string => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // T2.1.3: Only fixed kits supported
  const kitTypeLabel = 'Fixed Kit';
  const completenessLabel = asset.kitCompletenessStatus === 'complete' ? 'Complete' : 'Incomplete';
  const completenessColor = asset.kitCompletenessStatus === 'complete' ? 'green' : 'orange';

  return (
    <Card withBorder p="sm">
      <Stack gap="sm">
        {/* Header - Compact */}
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            <IconPackage size={18} />
            <Text size="sm" fw={600}>Kit</Text>
          </Group>
          <Group gap={4}>
            <Badge size="xs" variant="light" color="blue">{kitTypeLabel}</Badge>
            {asset.kitCompletenessStatus && (
              <Badge size="xs" variant="light" color={completenessColor}>
                {completenessLabel}
              </Badge>
            )}
          </Group>
        </Group>

        {/* Assembly Dates - Inline */}
        {(asset.kitAssemblyDate || asset.kitDisassemblyDate) && (
          <Group gap="md">
            {asset.kitAssemblyDate && (
              <Tooltip label="Assembly date">
                <Group gap={4}>
                  <IconCalendar size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  <Text size="xs">{formatDate(asset.kitAssemblyDate)}</Text>
                </Group>
              </Tooltip>
            )}
            {asset.kitDisassemblyDate && (
              <Tooltip label="Disassembly date">
                <Group gap={4}>
                  <IconCalendar size={14} style={{ color: 'var(--mantine-color-orange-6)' }} />
                  <Text size="xs">{formatDate(asset.kitDisassemblyDate)}</Text>
                </Group>
              </Tooltip>
            )}
          </Group>
        )}

        {/* Bound Assets - Compact Table */}
        {asset.kitType === 'fixed' && asset.kitBoundAssets && asset.kitBoundAssets.length > 0 && (
          <Stack gap={4}>
            <Group gap={4}>
              <IconUsers size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Text size="xs" fw={500}>Bound Assets ({asset.kitBoundAssets.length})</Text>
            </Group>
            <Table withRowBorders={false} verticalSpacing={4}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ fontSize: 11, padding: '4px 8px' }}>Asset #</Table.Th>
                  <Table.Th style={{ fontSize: 11, padding: '4px 8px' }}>Name</Table.Th>
                  <Table.Th style={{ fontSize: 11, padding: '4px 8px' }}>Inheritance</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {asset.kitBoundAssets.map((boundAsset) => {
                  const inheritanceProps = boundAsset.inherits
                    ? Object.entries(boundAsset.inherits)
                        .filter(([_, inherits]) => inherits)
                        .map(([prop]) => prop)
                    : [];
                  
                  return (
                    <Table.Tr key={boundAsset.assetId}>
                      <Table.Td style={{ fontSize: 12, padding: '4px 8px' }}>
                        <Text size="xs" ff="monospace">{boundAsset.assetNumber}</Text>
                      </Table.Td>
                      <Table.Td style={{ fontSize: 12, padding: '4px 8px' }}>
                        <Text size="xs" truncate style={{ maxWidth: 200 }}>{boundAsset.name}</Text>
                      </Table.Td>
                      <Table.Td style={{ fontSize: 12, padding: '4px 8px' }}>
                        {inheritanceProps.length > 0 ? (
                          <Group gap={2}>
                            {inheritanceProps.map((prop) => (
                              <Badge key={prop} size="xs" variant="dot" color="blue">
                                {prop}
                              </Badge>
                            ))}
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">—</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        )}

        {/* Inherited Properties - Compact */}
        {asset.kitInheritedProperties && asset.kitInheritedProperties.length > 0 && (
          <Group gap={4} wrap="wrap">
            <Tooltip label="Properties inherited to sub-assets">
              <IconLink size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
            </Tooltip>
            {asset.kitInheritedProperties.map((prop) => (
              <Badge key={prop} size="xs" variant="light" color="blue">
                {prop}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
