type IdLike = string | number;

const toId = (value: IdLike): string => value.toString();

/**
 * Route parameter types for query strings
 */
export interface RouteParams {
  status?: string;
  tags?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, unknown>): string {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      queryParams.set(key, value.join(','));
    } else {
      queryParams.set(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const routes = {
    dashboard: () => '/',
    categories: () => '/categories',
    assets: {
        list: (params?: RouteParams) => `/assets${params ? buildQueryString(params) : ''}`,
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

/**
 * Parse query parameters from URL
 */
export function parseQueryParams(search: string): RouteParams {
  const params = new URLSearchParams(search);
  const result: RouteParams = {};

  const status = params.get('status');
  if (status) {
    result.status = status;
  }

  const tags = params.get('tags');
  if (tags) {
    result.tags = tags.split(',');
  }

  const sort = params.get('sort');
  if (sort) {
    result.sort = sort;
  }

  const order = params.get('order');
  if (order === 'asc' || order === 'desc') {
    result.order = order;
  }

  const page = params.get('page');
  const parsedPage = page ? Number.parseInt(page, 10) : Number.NaN;
  if (!Number.isNaN(parsedPage)) {
    result.page = parsedPage;
  }

  const limit = params.get('limit');
  const parsedLimit = limit ? Number.parseInt(limit, 10) : Number.NaN;
  if (!Number.isNaN(parsedLimit)) {
    result.limit = parsedLimit;
  }

  const searchParam = params.get('search');
  if (searchParam) {
    result.search = searchParam;
  }

  const location = params.get('location');
  if (location) {
    result.location = location;
  }

  return result;
}

/**
 * Get breadcrumb segments from path
 */
export function getBreadcrumbs(path: string): Array<{ label: string; path: string }> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; path: string }> = [
    { label: 'Dashboard', path: '/' },
  ];

  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;

    // Skip UUID segments and action words
    if (
      segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
      segment === 'new' ||
      segment === 'edit'
    ) {
      return;
    }

    // Convert kebab-case to Title Case
    const label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbs.push({ label, path: currentPath });
  });

  return breadcrumbs;
}
