 
import { Container, Stack, Title, Text, Card, Grid, Group } from '@mantine/core';
import { IconBox, IconCategory, IconHistory, IconTrendingUp } from '@tabler/icons-react';
import { useAssets } from '../hooks/useAssets';
import { useCategories } from '../hooks/useCategories';
import { PrefixWarningCard } from '../components/dashboard/PrefixWarningCard';
import { useFeatureSettingsStore } from '../stores';

export function DashboardPage() {
  const { data: assets = [] } = useAssets();
  const { data: categories = [] } = useCategories();
  const maintenanceEnabled = useFeatureSettingsStore((state) => state.maintenanceEnabled);

  const availableAssets = assets.filter(a => a.status === 'available').length;
  const inUseAssets = assets.filter(a => a.status === 'in-use').length;
  const brokenAssets = assets.filter(a => a.status === 'broken' || a.status === 'in-repair').length;

  const StatCard = ({ icon, label, value, color }: { 
    icon: React.ReactNode; 
    label: string; 
    value: number; 
    color: string;
  }) => (
    <Card withBorder padding="lg">
      <Stack gap="xs">
        <Group justify="space-between">
          <div style={{ color }}>{icon}</div>
          <Text size="xl" fw={700}>{value}</Text>
        </Group>
        <Text size="sm" c="dimmed">{label}</Text>
      </Stack>
    </Card>
  );

  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Dashboard</Title>
          <Text size="lg" c="dimmed" mt="xs">
            Welcome to ChurchTools Inventory Management
          </Text>
        </div>

        <PrefixWarningCard />

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconBox size={28} />}
              label="Total Assets"
              value={assets.length}
              color="var(--mantine-color-blue-6)"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconCategory size={28} />}
              label="Categories"
              value={categories.length}
              color="var(--mantine-color-violet-6)"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconTrendingUp size={28} />}
              label="Available"
              value={availableAssets}
              color="var(--mantine-color-green-6)"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconHistory size={28} />}
              label="In Use"
              value={inUseAssets}
              color="var(--mantine-color-cyan-6)"
            />
          </Grid.Col>
        </Grid>

        <Card withBorder padding="lg">
          <Stack gap="md">
            <Title order={3}>Quick Start</Title>
            <Text size="sm">
              Get started by creating asset categories and adding your equipment to the inventory system.
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder padding="md">
                  <Stack gap="xs">
                    <Group>
                      <IconCategory size={20} />
                      <Text fw={600}>1. Create Categories</Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Define asset categories with custom fields for your equipment types.
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder padding="md">
                  <Stack gap="xs">
                    <Group>
                      <IconBox size={20} />
                      <Text fw={600}>2. Add Assets</Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Add your equipment with unique asset numbers and track their status.
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        {maintenanceEnabled && brokenAssets > 0 && (
          <Card withBorder padding="lg" bg="red.0">
            <Stack gap="xs">
              <Group>
                <IconHistory size={20} color="var(--mantine-color-red-6)" />
                <Text fw={600} c="red">Attention Required</Text>
              </Group>
              <Text size="sm">
                You have {brokenAssets} asset{brokenAssets !== 1 ? 's' : ''} that need{brokenAssets === 1 ? 's' : ''} repair or maintenance.
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
