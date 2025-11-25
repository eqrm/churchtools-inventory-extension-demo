import { SimpleGrid, Card, Text, Badge, Group, Stack, AspectRatio, Image, Center } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { Asset } from '../../types/entities';
import { AssetStatusBadge } from './AssetStatusBadge';

interface AssetGalleryViewProps {
  assets: Asset[];
}

/**
 * Gallery view displaying assets as cards in a grid
 */
export function AssetGalleryView({ assets }: AssetGalleryViewProps) {
  if (assets.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Keine Assets gefunden
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
      {assets.map((asset) => {
        const mainImage = asset.mainImage ?? asset.photos?.find((photo) => photo.isMain)?.thumbnailUrl;

        return (
          <Card
            key={asset.id}
            component={Link}
            to={`/assets/${asset.id}`}
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            <Card.Section>
              <AspectRatio ratio={16 / 9}>
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={`${asset.name} main image`}
                    fit="cover"
                  />
                ) : (
                  <Center>
                    <IconPhoto size={48} style={{ color: 'var(--mantine-color-gray-4)' }} />
                  </Center>
                )}
              </AspectRatio>
            </Card.Section>

            <Stack gap="xs" mt="md">
              <Text fw={500} lineClamp={1}>
                {asset.name}
              </Text>
              <Badge variant="light" size="sm">
                {asset.assetNumber}
              </Badge>
              <Group gap="xs">
                <AssetStatusBadge status={asset.status} />
              </Group>
              {asset.location && (
                <Text size="sm" c="dimmed" lineClamp={1}>
                  📍 {asset.location}
                </Text>
              )}
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
