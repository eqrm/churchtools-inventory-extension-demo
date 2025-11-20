import { Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { Navigation } from '../components/layout/Navigation';
import { QuickScanModal } from '../components/scanner/QuickScanModal';
import { routes } from './routes';
import { useFeatureSettingsStore } from '../stores';
import { PlaceholderPage } from '../pages/PlaceholderPage';

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const CategoriesPage = lazy(() => import('../pages/CategoriesPage').then((module) => ({ default: module.CategoriesPage })));
const AssetsPage = lazy(() => import('../pages/AssetsPage').then((module) => ({ default: module.AssetsPage })));
const AssetDetailPage = lazy(() => import('../pages/AssetDetailPage').then((module) => ({ default: module.AssetDetailPage })));
const AssetGroupsPage = lazy(() => import('../pages/AssetGroupsPage').then((module) => ({ default: module.AssetGroupsPage })));
const AssetGroupDetailPage = lazy(() => import('../pages/AssetGroupDetailPage').then((module) => ({ default: module.AssetGroupDetailPage })));
const AssetModelsPage = lazy(() => import('../pages/AssetModelList').then((module) => ({ default: module.AssetModelList })));
const BookingsPage = lazy(() => import('../pages/BookingsPage').then((module) => ({ default: module.BookingsPage })));
const BookingDetailPage = lazy(() => import('../pages/BookingDetailPage').then((module) => ({ default: module.BookingDetailPage })));
const BookingCalendarPage = lazy(() => import('../pages/BookingCalendarPage').then((module) => ({ default: module.BookingCalendarPage })));
const KitsPage = lazy(() => import('../pages/KitsPage').then((module) => ({ default: module.KitsPage })));
const KitDetailPage = lazy(() => import('../pages/KitDetailPage').then((module) => ({ default: module.KitDetailPage })));
const StockTakePage = lazy(() => import('../pages/StockTakePage').then((module) => ({ default: module.StockTakePage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const MaintenancePage = lazy(() => import('../pages/MaintenancePage').then((module) => ({ default: module.MaintenancePage })));
const MaintenanceDashboardPage = lazy(() =>
    import('../pages/MaintenanceDashboard').then((module) => ({ default: module.MaintenanceDashboardPage })),
);
const MaintenanceCompaniesPage = lazy(() =>
    import('../pages/MaintenanceCompanies').then((module) => ({ default: module.MaintenanceCompanies })),
);
const MaintenanceRulesPage = lazy(() =>
    import('../pages/MaintenanceRules').then((module) => ({ default: module.MaintenanceRules })),
);
const WorkOrdersPage = lazy(() => import('../pages/WorkOrders').then((module) => ({ default: module.WorkOrders })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function LoadingFallback() {
    return (
        <Center h="100vh">
            <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Loading...</Text>
            </Stack>
        </Center>
    );
}

function withSuspense(element: ReactNode): ReactNode {
    return <Suspense fallback={<LoadingFallback />}>{element}</Suspense>;
}

type FeatureFlagKey = 'bookingsEnabled' | 'kitsEnabled' | 'maintenanceEnabled';

function FeatureGate({ feature, children }: { feature: FeatureFlagKey; children: ReactNode }) {
    const isEnabled = useFeatureSettingsStore((state) => {
        switch (feature) {
            case 'bookingsEnabled':
                return state.bookingsEnabled;
            case 'kitsEnabled':
                return state.kitsEnabled;
            case 'maintenanceEnabled':
                return state.maintenanceEnabled;
            default:
                return false;
        }
    });

    if (!isEnabled) {
        return <Navigate to={routes.dashboard()} replace />;
    }

    return <>{children}</>;
}

function RootLayout() {
    const [scanModalOpened, setScanModalOpened] = useState(false);
    const openScanModal = useCallback(() => {
        setScanModalOpened(true);
    }, []);
    const closeScanModal = useCallback(() => {
        setScanModalOpened(false);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
            const modifierPressed = isMac ? event.metaKey : event.altKey;

            if (modifierPressed && event.key.toLowerCase() === 's') {
                event.preventDefault();
                setScanModalOpened(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <Navigation onScanClick={openScanModal}>
            <>
                {withSuspense(<Outlet />)}
                <QuickScanModal opened={scanModalOpened} onClose={closeScanModal} />
            </>
        </Navigation>
    );
}

function buildRouter() {
    const baseUrlFromEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.['BASE_URL'];
    const normalizeBasename = (value?: string): string => {
        if (!value || value === '/') {
            return '/';
        }

        const trimmed = value.replace(/\/*$/, '');
        return trimmed.length > 0 ? trimmed : '/';
    };

    const basename = normalizeBasename(baseUrlFromEnv);

    return createBrowserRouter(
        [
            {
                path: routes.dashboard(),
                element: <RootLayout />,
                children: [
                    { index: true, element: withSuspense(<DashboardPage />) },
                    { path: routes.categories(), element: withSuspense(<CategoriesPage />) },
                    {
                        path: 'assets',
                        children: [
                            { index: true, element: withSuspense(<AssetsPage />) },
                            { path: ':id', element: withSuspense(<AssetDetailPage />) },
                            {
                                path: ':id/edit',
                                element: withSuspense(
                                    <PlaceholderPage title="Asset editing in progress" description="Tracked in upcoming tasks." />,
                                ),
                            },
                            {
                                path: ':id/damage',
                                children: [
                                    {
                                        index: true,
                                        element: withSuspense(
                                            <PlaceholderPage title="Damage reports list" description="Implementation pending." />,
                                        ),
                                    },
                                    {
                                        path: 'new',
                                        element: withSuspense(
                                            <PlaceholderPage title="Create damage report" description="Implementation pending." />,
                                        ),
                                    },
                                    {
                                        path: ':damageId',
                                        element: withSuspense(
                                            <PlaceholderPage title="Damage report detail" description="Implementation pending." />,
                                        ),
                                    },
                                ],
                            },
                            {
                                path: ':id/maintenance',
                                element: withSuspense(
                                    <PlaceholderPage title="Asset maintenance" description="Implementation pending." />,
                                ),
                            },
                            {
                                path: ':id/history',
                                element: withSuspense(
                                    <PlaceholderPage title="Asset history" description="Implementation pending." />,
                                ),
                            },
                        ],
                    },
                    {
                        path: 'asset-groups',
                        children: [
                            { index: true, element: withSuspense(<AssetGroupsPage />) },
                            { path: ':id', element: withSuspense(<AssetGroupDetailPage />) },
                        ],
                    },
                    {
                        path: 'models',
                        element: withSuspense(<AssetModelsPage />),
                    },
                    {
                        path: 'bookings',
                        element: (
                            <FeatureGate feature="bookingsEnabled">
                                {withSuspense(<BookingsPage />)}
                            </FeatureGate>
                        ),
                        children: [
                            {
                                path: ':id',
                                element: (
                                    <FeatureGate feature="bookingsEnabled">
                                        {withSuspense(<BookingDetailPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: 'calendar',
                                element: (
                                    <FeatureGate feature="bookingsEnabled">
                                        {withSuspense(<BookingCalendarPage />)}
                                    </FeatureGate>
                                ),
                            },
                        ],
                    },
                    {
                        path: 'kits',
                        element: (
                            <FeatureGate feature="kitsEnabled">
                                {withSuspense(<KitsPage />)}
                            </FeatureGate>
                        ),
                        children: [
                            {
                                path: ':id',
                                element: (
                                    <FeatureGate feature="kitsEnabled">
                                        {withSuspense(<KitDetailPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: ':id/edit',
                                element: (
                                    <FeatureGate feature="kitsEnabled">
                                        {withSuspense(
                                            <PlaceholderPage title="Edit kit" description="Implementation pending." />,
                                        )}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: ':id/disassemble',
                                element: (
                                    <FeatureGate feature="kitsEnabled">
                                        {withSuspense(
                                            <PlaceholderPage title="Disassemble kit" description="Implementation pending." />,
                                        )}
                                    </FeatureGate>
                                ),
                            },
                        ],
                    },
                    { path: 'stock-take', element: withSuspense(<StockTakePage />) },
                    {
                        path: 'reports',
                        children: [
                            { index: true, element: withSuspense(<ReportsPage />) },
                            {
                                path: ':reportId',
                                element: withSuspense(
                                    <PlaceholderPage title="Report detail" description="Implementation pending." />,
                                ),
                            },
                        ],
                    },
                    {
                        path: 'maintenance',
                        element: (
                            <FeatureGate feature="maintenanceEnabled">
                                {withSuspense(<MaintenancePage />)}
                            </FeatureGate>
                        ),
                        children: [
                            {
                                path: 'dashboard',
                                element: (
                                    <FeatureGate feature="maintenanceEnabled">
                                        {withSuspense(<MaintenanceDashboardPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: 'companies',
                                element: (
                                    <FeatureGate feature="maintenanceEnabled">
                                        {withSuspense(<MaintenanceCompaniesPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: 'rules',
                                element: (
                                    <FeatureGate feature="maintenanceEnabled">
                                        {withSuspense(<MaintenanceRulesPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: 'rules/:id',
                                element: (
                                    <FeatureGate feature="maintenanceEnabled">
                                        {withSuspense(<MaintenanceRulesPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: 'work-orders',
                                element: (
                                    <FeatureGate feature="maintenanceEnabled">
                                        {withSuspense(<WorkOrdersPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: 'work-orders/:id',
                                element: (
                                    <FeatureGate feature="maintenanceEnabled">
                                        {withSuspense(<WorkOrdersPage />)}
                                    </FeatureGate>
                                ),
                            },
                            {
                                path: 'work-orders/:id/edit',
                                element: (
                                    <FeatureGate feature="maintenanceEnabled">
                                        {withSuspense(<WorkOrdersPage />)}
                                    </FeatureGate>
                                ),
                            },
                        ],
                    },
                    { path: 'settings', element: withSuspense(<SettingsPage />) },
                    {
                        path: 'settings/import',
                        element: withSuspense(
                            <PlaceholderPage title="Import settings" description="Implementation pending." />,
                        ),
                    },
                    {
                        path: 'settings/export',
                        element: withSuspense(
                            <PlaceholderPage title="Export settings" description="Implementation pending." />,
                        ),
                    },
                    {
                        path: 'settings/recently-deleted',
                        element: withSuspense(
                            <PlaceholderPage title="Recently deleted" description="Implementation pending." />,
                        ),
                    },
                    {
                        path: 'undo-history',
                        element: withSuspense(
                            <PlaceholderPage title="Undo history" description="Implementation pending." />,
                        ),
                    },
                    { path: '*', element: <Navigate to={routes.dashboard()} replace /> },
                ],
            },
        ],
        {
            basename,
        },
    );
}

const router = buildRouter();

export function AppRouter() {
    return <RouterProvider router={router} />;
}
