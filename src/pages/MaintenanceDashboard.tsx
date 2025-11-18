import { Container, Stack, Title, Text, Group, Button } from '@mantine/core';
import { IconTool } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MaintenanceDashboard } from '../components/maintenance/MaintenanceDashboard';
import { routes } from '../router/routes';

export function MaintenanceDashboardPage() {
    const { t } = useTranslation('maintenance');

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <div>
                    <Title order={1}>{t('dashboardPage.title')}</Title>
                    <Text size="lg" c="dimmed" mt="xs">
                        {t('dashboardPage.description')}
                    </Text>
                </div>

                <MaintenanceDashboard />

                <Group justify="flex-start" gap="sm">
                    <Button
                        component={Link}
                        to={routes.maintenance.root()}
                        leftSection={<IconTool size={16} />}
                        variant="light"
                    >
                        {t('dashboardPage.openWorkspace')}
                    </Button>
                </Group>
            </Stack>
        </Container>
    );
}
