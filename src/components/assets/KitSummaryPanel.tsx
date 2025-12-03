import { Badge, Box, Card, Divider, Grid, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import { BarcodeDisplay } from '../scanner/BarcodeDisplay';
import type { Asset } from '../../types/entities';
import type { Tag, InheritedTag } from '../../types/tag';
import { TagListWithInheritance } from '../tags/InheritedTagBadge';
import { KitMemberBadge } from './KitMemberBadge';

interface KitSummaryPanelProps {
  asset: Asset;
  directTags: Tag[];
  inheritedTags: Array<{ tag: Tag; inheritedFrom: InheritedTag }>;
}

export function KitSummaryPanel({ asset, directTags, inheritedTags }: KitSummaryPanelProps) {
  if (!asset.isKit) {
    return null;
  }

  const kitMembers = asset.kitBoundAssets ?? [];
  const memberPreview = kitMembers.slice(0, 4);
  const remainingCount = Math.max(0, kitMembers.length - memberPreview.length);
  const completenessColor = asset.kitCompletenessStatus === 'complete' ? 'green' : 'orange';
  // T2.1.3: Only fixed kits supported, no need for type label distinction
  const kitTypeLabel = 'Fixed Kit';

  return (
    <Card withBorder p="md" data-testid="kit-summary-panel">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <IconPackage size={24} />
            <div>
              <Title order={4}>{asset.name}</Title>
              <Text size="sm" c="dimmed">
                {asset.assetNumber}
              </Text>
            </div>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="violet">
              {kitTypeLabel}
            </Badge>
            {asset.kitCompletenessStatus && (
              <Badge variant="light" color={completenessColor}>
                {asset.kitCompletenessStatus === 'complete' ? 'Complete' : 'Incomplete'}
              </Badge>
            )}
          </Group>
        </Group>

        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="sm" align="center">
              <Box
                w="100%"
                h={160}
                bg="gray.1"
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--mantine-color-gray-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {asset.mainImage ? (
                  <Image src={asset.mainImage} alt={asset.name} fit="contain" w="100%" h="100%" />
                ) : (
                  <IconPackage size={48} color="var(--mantine-color-gray-5)" />
                )}
              </Box>
              <Stack gap={2} align="center">
                <BarcodeDisplay value={asset.barcode} alt={asset.barcode} width={140} />
                <Text size="xs" c="dimmed">
                  {asset.barcode}
                </Text>
              </Stack>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="sm">
              <Group gap="xs" wrap="wrap">
                <KitMemberBadge members={kitMembers} />
                {asset.location && (
                  <Badge variant="light" color="blue">
                    {asset.location}
                  </Badge>
                )}
                {asset.status && (
                  <Badge variant="outline" color="dark">
                    Status: {asset.status}
                  </Badge>
                )}
              </Group>

              {kitMembers.length > 0 && (
                <Stack gap={4} data-testid="kit-member-preview">
                  {memberPreview.map((member) => (
                    <Group key={`${member.assetId}-${member.assetNumber}`} gap="xs" wrap="nowrap">
                      <Text size="sm" fw={500} ff="monospace">
                        {member.assetNumber}
                      </Text>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {member.name}
                      </Text>
                    </Group>
                  ))}
                  {remainingCount > 0 && (
                    <Text size="xs" c="dimmed">
                      +{remainingCount} more members
                    </Text>
                  )}
                </Stack>
              )}

              {(directTags.length > 0 || inheritedTags.length > 0) && (
                <Box>
                  <Text size="xs" fw={600} mb={4} c="dimmed">
                    Tags & inheritance
                  </Text>
                  <TagListWithInheritance
                    directTags={directTags}
                    inheritedTags={inheritedTags}
                    size="xs"
                    showLabels
                  />
                </Box>
              )}

              {asset.kitInheritedProperties && asset.kitInheritedProperties.length > 0 && (
                <Box>
                  <Text size="xs" fw={600} mb={4} c="dimmed">
                    Properties inherited by members
                  </Text>
                  <Group gap={4}>
                    {asset.kitInheritedProperties.map((prop) => (
                      <Badge key={prop} variant="light" color="teal" size="xs">
                        {prop}
                      </Badge>
                    ))}
                  </Group>
                </Box>
              )}
            </Stack>
          </Grid.Col>
        </Grid>

        {(asset.kitAssemblyDate || asset.kitDisassemblyDate) && (
          <>
            <Divider />
            <Group gap="lg" wrap="wrap">
              {asset.kitAssemblyDate && (
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Assembled on
                  </Text>
                  <Text size="sm">
                    {new Date(asset.kitAssemblyDate).toLocaleDateString()}
                  </Text>
                </Stack>
              )}
              {asset.kitDisassemblyDate && (
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Disassembled on
                  </Text>
                  <Text size="sm">
                    {new Date(asset.kitDisassemblyDate).toLocaleDateString()}
                  </Text>
                </Stack>
              )}
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
