import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface AppRoute {
    path: string;
    Component: LazyExoticComponent<ComponentType<unknown>>;
}

const DashboardPage = lazy(() => import('../pages/DashboardPage').then(M => ({ default: M.DashboardPage })));
const CategoriesPage = lazy(() => import('../pages/CategoriesPage').then(M => ({ default: M.CategoriesPage })));
const AssetsPage = lazy(() => import('../pages/AssetsPage').then(M => ({ default: M.AssetsPage })));
const AssetDetailPage = lazy(() => import('../pages/AssetDetailPage').then(M => ({ default: M.AssetDetailPage })));
const AssetGroupsPage = lazy(() => import('../pages/AssetGroupsPage').then(M => ({ default: M.AssetGroupsPage })));
const AssetGroupDetailPage = lazy(() => import('../pages/AssetGroupDetailPage').then(M => ({ default: M.AssetGroupDetailPage })));
const BookingsPage = lazy(() => import('../pages/BookingsPage').then(M => ({ default: M.BookingsPage })));
const BookingDetailPage = lazy(() => import('../pages/BookingDetailPage').then(M => ({ default: M.BookingDetailPage })));
const BookingCalendarPage = lazy(() => import('../pages/BookingCalendarPage').then(M => ({ default: M.BookingCalendarPage })));
const KitsPage = lazy(() => import('../pages/KitsPage').then(M => ({ default: M.KitsPage })));
const KitDetailPage = lazy(() => import('../pages/KitDetailPage').then(M => ({ default: M.KitDetailPage })));
const StockTakePage = lazy(() => import('../pages/StockTakePage').then(M => ({ default: M.StockTakePage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then(M => ({ default: M.ReportsPage })));
const MaintenancePage = lazy(() => import('../pages/MaintenancePage').then(M => ({ default: M.MaintenancePage })));
const MaintenanceDashboardPage = lazy(() =>
    import('../pages/MaintenanceDashboard').then(M => ({ default: M.MaintenanceDashboardPage })),
);
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(M => ({ default: M.SettingsPage })));

export const appRoutes: AppRoute[] = [
    { path: '/', Component: DashboardPage },
    { path: '/categories', Component: CategoriesPage },
    { path: '/assets', Component: AssetsPage },
    { path: '/assets/:id', Component: AssetDetailPage },
    { path: '/asset-groups', Component: AssetGroupsPage },
    { path: '/asset-groups/:id', Component: AssetGroupDetailPage },
    { path: '/bookings', Component: BookingsPage },
    { path: '/bookings/:id', Component: BookingDetailPage },
    { path: '/bookings-calendar', Component: BookingCalendarPage },
    { path: '/kits', Component: KitsPage },
    { path: '/kits/:id', Component: KitDetailPage },
    { path: '/stock-take', Component: StockTakePage },
    { path: '/reports', Component: ReportsPage },
    { path: '/reports/:reportId', Component: ReportsPage },
    { path: '/maintenance', Component: MaintenancePage },
    { path: '/maintenance/dashboard', Component: MaintenanceDashboardPage },
    { path: '/settings', Component: SettingsPage },
];
