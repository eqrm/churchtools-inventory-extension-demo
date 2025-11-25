import { Container, Stack, Title, Text, Group, Button } from '@mantine/core';
import { IconTool } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { MaintenanceDashboard } from '../components/maintenance/MaintenanceDashboard';

export function MaintenanceDashboardPage() {
    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <div>
                    <Title order={1}>Maintenance Overview</Title>
                    <Text size="lg" c="dimmed" mt="xs">
                        Review maintenance workload, overdue tasks, and company assignments in one place.
                    </Text>
                </div>

                <MaintenanceDashboard />

                <Group justify="flex-start" gap="sm">
                    <Button
                        component={Link}
                        to="/maintenance"
                        leftSection={<IconTool size={16} />}
                        variant="light"
                    >
                        Open full maintenance workspace
                    </Button>
                </Group>
            </Stack>
        </Container>
    );
}
