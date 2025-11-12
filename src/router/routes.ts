type IdLike = string | number;

const toId = (value: IdLike): string => value.toString();

export const routes = {
    dashboard: () => '/',
    categories: () => '/categories',
    assets: {
        list: () => '/assets',
        detail: (assetId: IdLike) => `/assets/${toId(assetId)}`,
        edit: (assetId: IdLike) => `/assets/${toId(assetId)}/edit`,
        history: (assetId: IdLike) => `/assets/${toId(assetId)}/history`,
        maintenance: (assetId: IdLike) => `/assets/${toId(assetId)}/maintenance`,
        damage: {
            list: (assetId: IdLike) => `/assets/${toId(assetId)}/damage`,
            create: (assetId: IdLike) => `/assets/${toId(assetId)}/damage/new`,
            detail: (assetId: IdLike, damageId: IdLike) => `/assets/${toId(assetId)}/damage/${toId(damageId)}`,
        },
    },
    assetGroups: {
        list: () => '/asset-groups',
        detail: (groupId: IdLike) => `/asset-groups/${toId(groupId)}`,
    },
    bookings: {
        list: () => '/bookings',
        detail: (bookingId: IdLike) => `/bookings/${toId(bookingId)}`,
        calendar: () => '/bookings/calendar',
        checkIn: (bookingId: IdLike) => `/bookings/${toId(bookingId)}/check-in`,
    },
    kits: {
        list: () => '/kits',
        detail: (kitId: IdLike) => `/kits/${toId(kitId)}`,
        edit: (kitId: IdLike) => `/kits/${toId(kitId)}/edit`,
        disassemble: (kitId: IdLike) => `/kits/${toId(kitId)}/disassemble`,
    },
    maintenance: {
        dashboard: () => '/maintenance/dashboard',
        root: () => '/maintenance',
        rules: {
            list: () => '/maintenance/rules',
            detail: (ruleId: IdLike) => `/maintenance/rules/${toId(ruleId)}`,
        },
        workOrders: {
            list: () => '/maintenance/work-orders',
            detail: (workOrderId: IdLike) => `/maintenance/work-orders/${toId(workOrderId)}`,
            edit: (workOrderId: IdLike) => `/maintenance/work-orders/${toId(workOrderId)}/edit`,
            offers: {
                list: (workOrderId: IdLike) => `/maintenance/work-orders/${toId(workOrderId)}/offers`,
                create: (workOrderId: IdLike) => `/maintenance/work-orders/${toId(workOrderId)}/offers/new`,
            },
        },
    },
    dataViews: {
        list: () => '/data-views',
        detail: (viewId: IdLike) => `/data-views/${toId(viewId)}`,
        edit: (viewId: IdLike) => `/data-views/${toId(viewId)}/edit`,
    },
    assignments: {
        list: () => '/assignments',
        detail: (assignmentId: IdLike) => `/assignments/${toId(assignmentId)}`,
        checkIn: (assignmentId: IdLike) => `/assignments/${toId(assignmentId)}/check-in`,
    },
    settings: {
        root: () => '/settings',
        import: () => '/settings/import',
        export: () => '/settings/export',
        recentlyDeleted: () => '/settings/recently-deleted',
    },
    undoHistory: () => '/undo-history',
} as const;

export type RouteBuilders = typeof routes;
