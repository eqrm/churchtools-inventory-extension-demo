/**
 * Kit Information Section Component
 * 
 * Displays kit-specific information when an asset is marked as a kit
 */

import { Badge, Card, Divider, Group, Stack, Table, Text, Title } from '@mantine/core';
import { IconPackage, IconUsers, IconCalendar } from '@tabler/icons-react';
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

  const kitTypeLabel = asset.kitType === 'fixed' ? 'Fixed Kit' : 'Flexible Kit';
  const completenessLabel = asset.kitCompletenessStatus === 'complete' ? 'Complete' : 'Incomplete';
  const completenessColor = asset.kitCompletenessStatus === 'complete' ? 'green' : 'orange';

  return (
    <Card withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconPackage size={20} />
            <Title order={4}>Kit Information</Title>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="blue">{kitTypeLabel}</Badge>
            {asset.kitCompletenessStatus && (
              <Badge variant="light" color={completenessColor}>
                {completenessLabel}
              </Badge>
            )}
          </Group>
        </Group>

        <Divider />

        {/* Kit Assembly Information */}
        {(asset.kitAssemblyDate || asset.kitDisassemblyDate) && (
          <>
            <Stack gap="xs">
              <Group gap="xs">
                <IconCalendar size={16} />
                <Text size="sm" fw={500}>Assembly Dates</Text>
              </Group>
              <Group gap="md">
                {asset.kitAssemblyDate && (
                  <Text size="sm">
                    <Text span c="dimmed">Assembled:</Text> {formatDate(asset.kitAssemblyDate)}
                  </Text>
                )}
                {asset.kitDisassemblyDate && (
                  <Text size="sm">
                    <Text span c="dimmed">Disassembled:</Text> {formatDate(asset.kitDisassemblyDate)}
                  </Text>
                )}
              </Group>
            </Stack>
            <Divider />
          </>
        )}

        {/* Bound Assets (for fixed kits) */}
        {asset.kitType === 'fixed' && asset.kitBoundAssets && asset.kitBoundAssets.length > 0 && (
          <>
            <Stack gap="xs">
              <Group gap="xs">
                <IconUsers size={16} />
                <Text size="sm" fw={500}>Bound Assets ({asset.kitBoundAssets.length})</Text>
              </Group>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Asset Number</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Inheritance</Table.Th>
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
                        <Table.Td>
                          <Text size="sm" ff="monospace">{boundAsset.assetNumber}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{boundAsset.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          {inheritanceProps.length > 0 ? (
                            <Group gap={4}>
                              {inheritanceProps.map((prop) => (
                                <Badge key={prop} size="xs" variant="light">
                                  {prop}
                                </Badge>
                              ))}
                            </Group>
                          ) : (
                            <Text size="sm" c="dimmed">None</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Stack>
            <Divider />
          </>
        )}

        {/* Pool Requirements (for flexible kits) */}
        {asset.kitType === 'flexible' && asset.kitPoolRequirements && asset.kitPoolRequirements.length > 0 && (
          <Stack gap="xs">
            <Group gap="xs">
              <IconUsers size={16} />
              <Text size="sm" fw={500}>Pool Requirements</Text>
            </Group>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Asset Type</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {asset.kitPoolRequirements.map((requirement) => (
                  <Table.Tr key={requirement.assetTypeId}>
                    <Table.Td>
                      <Text size="sm">{requirement.assetTypeName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{requirement.quantity}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}

        {/* Inherited Properties */}
        {asset.kitInheritedProperties && asset.kitInheritedProperties.length > 0 && (
          <>
            <Divider />
            <Stack gap="xs">
              <Text size="sm" fw={500}>Properties inherited to sub-assets:</Text>
              <Group gap={4}>
                {asset.kitInheritedProperties.map((prop) => (
                  <Badge key={prop} variant="light" color="blue">
                    {prop}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}
