# Routing Requirements

**Status**: Approved  
**References**: CHK033  
**Last Updated**: 2025-01-20

## Overview

This document defines the URL routing structure for the advanced inventory system, ensuring RESTful conventions, user-friendly URLs, and consistent navigation patterns.

## 1. RESTful Routing Principles

### 1.1 URL Structure

Follow RESTful conventions:
- **Collections**: Plural nouns (`/assets`, `/work-orders`)
- **Resources**: ID-based (`/assets/123`)
- **Actions**: Verb suffixes (`/kits/456/disassemble`)
- **Sub-resources**: Nested paths (`/assets/123/damage`)

### 1.2 Route Hierarchy

```
/                           # Dashboard
/assets                     # Asset list
/assets/:id                 # Asset detail
/assets/:id/edit            # Asset edit form
/assets/:id/damage          # Damage reports for asset
/assets/:id/damage/new      # Create damage report
/assets/:id/maintenance     # Maintenance history
/assets/:id/history         # Audit trail

/kits                       # Kit list
/kits/:id                   # Kit detail
/kits/:id/edit              # Kit edit form
/kits/:id/disassemble       # Kit disassembly workflow

/models                     # Asset model list
/models/:id                 # Model detail
/models/:id/edit            # Model edit form
/models/:id/assets          # Assets using this model

/assignments                # Assignment list
/assignments/:id            # Assignment detail
/assignments/:id/check-in   # Check-in workflow

/work-orders                # Work order list
/work-orders/:id            # Work order detail
/work-orders/:id/edit       # Work order edit form
/work-orders/:id/offers     # Offers for work order
/work-orders/:id/offers/new # Create offer

/maintenance                # Maintenance schedule
/maintenance/rules          # Maintenance rules
/maintenance/rules/:id      # Rule detail

/data-views                 # Saved data views
/data-views/:id             # Data view detail
/data-views/:id/edit        # Edit filters/settings

/settings                   # App settings
/settings/import            # Import settings/data
/settings/export            # Export settings/data
/settings/recently-deleted  # Soft-deleted entities

/undo-history               # Undo/redo history
```

## 2. Query Parameters

### 2.1 List Filters

Use query parameters for filtering, sorting, pagination:

```
/assets?status=Available
/assets?tags=camera,lighting
/assets?sort=name&order=asc
/assets?page=2&limit=50
/assets?search=projector
/assets?location=Room%20A
```

### 2.2 Standard Query Parameters

**Filtering**:
- `status`: Filter by status enum
- `tags`: Comma-separated tag list
- `location`: Filter by location
- `model`: Filter by model ID
- `search`: Full-text search query
- `createdAfter`: ISO 8601 date
- `createdBefore`: ISO 8601 date
- `deletedAt`: Show soft-deleted (null = active only)

**Sorting**:
- `sort`: Field name (e.g., `name`, `createdAt`, `status`)
- `order`: `asc` or `desc` (default: `desc` for dates, `asc` for names)

**Pagination**:
- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (default: 50, max: 100)

**View State**:
- `view`: Display mode (`list`, `grid`, `kanban`, `calendar`)
- `group`: Group by field (`status`, `location`, `model`)

### 2.3 Modal/Overlay State

Use query parameters for modal state (shareable URLs):

```
/assets?modal=create              # Open create asset modal
/assets?modal=edit&id=123         # Open edit modal for asset 123
/assets?modal=delete&id=456       # Open delete confirmation
/work-orders?modal=offer&id=789   # Open create offer modal
```

## 3. Breadcrumb Navigation

### 3.1 Breadcrumb Structure

Display hierarchical navigation:

```tsx
// Asset detail page
Home > Assets > Camera A

// Damage report
Home > Assets > Camera A > Damage Reports > Report #5

// Kit disassembly
Home > Kits > Lighting Kit > Disassemble

// Offer creation
Home > Work Orders > Repair Project > Create Offer
```

### 3.2 Breadcrumb Component

```tsx
import { Breadcrumbs, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;  // undefined for current page
}

function AppBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Breadcrumbs separator=">" mb="md">
      {items.map((item, index) => (
        <Anchor
          key={index}
          component={item.href ? Link : 'span'}
          to={item.href}
          size="sm"
          color={item.href ? 'blue' : 'dimmed'}
        >
          {item.label}
        </Anchor>
      ))}
    </Breadcrumbs>
  );
}

// Usage in Asset Detail page
const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Assets', href: '/assets' },
  { label: asset.name },  // Current page, no href
];
```

### 3.3 Auto-Generated Breadcrumbs

Use route configuration to auto-generate breadcrumbs:

```typescript
// router/routes.ts
export const routes = [
  {
    path: '/assets/:id/damage/:damageId',
    breadcrumb: (params: { id: string; damageId: string }) => [
      { label: 'Home', href: '/' },
      { label: 'Assets', href: '/assets' },
      { 
        label: async () => {
          const asset = await getAsset(params.id);
          return asset.name;
        }, 
        href: `/assets/${params.id}` 
      },
      { label: 'Damage Reports', href: `/assets/${params.id}/damage` },
      { 
        label: async () => {
          const damage = await getDamage(params.damageId);
          return `Report #${damage.id}`;
        }
      },
    ],
  },
];
```

## 4. Route Parameters

### 4.1 Parameter Naming

Use consistent parameter names:
- `:id`: Primary entity ID
- `:assetId`, `:kitId`, `:modelId`: Specific entity types (when nested)
- `:slug`: URL-friendly string (if implemented)

### 4.2 Parameter Validation

Validate route parameters:

```typescript
import { useParams, Navigate } from 'react-router-dom';
import { z } from 'zod';

const AssetParamsSchema = z.object({
  id: z.string().uuid(),  // ChurchTools UUIDs
});

function AssetDetailPage() {
  const params = useParams();
  const result = AssetParamsSchema.safeParse(params);
  
  if (!result.success) {
    return <Navigate to="/assets" replace />;
  }
  
  const { id } = result.data;
  // Fetch asset...
}
```

## 5. Router Configuration

### 5.1 React Router Setup

```typescript
// router/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from '@/components/layouts/RootLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'assets',
        children: [
          {
            index: true,
            element: <AssetListPage />,
          },
          {
            path: ':id',
            element: <AssetDetailPage />,
          },
          {
            path: ':id/edit',
            element: <AssetEditPage />,
          },
          {
            path: ':id/damage',
            children: [
              {
                index: true,
                element: <DamageListPage />,
              },
              {
                path: 'new',
                element: <DamageCreatePage />,
              },
              {
                path: ':damageId',
                element: <DamageDetailPage />,
              },
            ],
          },
        ],
      },
      // ... more routes
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

### 5.2 Lazy Loading

Split routes into code chunks:

```typescript
import { lazy } from 'react';

const AssetListPage = lazy(() => import('@/pages/AssetListPage'));
const AssetDetailPage = lazy(() => import('@/pages/AssetDetailPage'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AssetListPage />
</Suspense>
```

## 6. Navigation Utilities

### 6.1 Programmatic Navigation

```typescript
import { useNavigate } from 'react-router-dom';

function AssetForm() {
  const navigate = useNavigate();
  
  async function handleSubmit(data: AssetFormData) {
    const asset = await createAsset(data);
    navigate(`/assets/${asset.id}`);  // Navigate to detail
  }
  
  function handleCancel() {
    navigate(-1);  // Go back
  }
}
```

### 6.2 Route Builders

Create type-safe route builders:

```typescript
// router/routes.ts
export const routes = {
  dashboard: () => '/',
  
  assets: {
    list: () => '/assets',
    detail: (id: string) => `/assets/${id}`,
    edit: (id: string) => `/assets/${id}/edit`,
    damage: {
      list: (assetId: string) => `/assets/${assetId}/damage`,
      new: (assetId: string) => `/assets/${assetId}/damage/new`,
      detail: (assetId: string, damageId: string) => 
        `/assets/${assetId}/damage/${damageId}`,
    },
  },
  
  kits: {
    list: () => '/kits',
    detail: (id: string) => `/kits/${id}`,
    disassemble: (id: string) => `/kits/${id}/disassemble`,
  },
  
  workOrders: {
    list: () => '/work-orders',
    detail: (id: string) => `/work-orders/${id}`,
    offers: {
      list: (workOrderId: string) => `/work-orders/${workOrderId}/offers`,
      new: (workOrderId: string) => `/work-orders/${workOrderId}/offers/new`,
    },
  },
};

// Usage
<Link to={routes.assets.detail(asset.id)}>View Asset</Link>
navigate(routes.kits.disassemble(kit.id));
```

## 7. Deep Linking

### 7.1 Shareable URLs

All application states should be shareable via URL:

**Examples**:
```
# Filtered asset list
/assets?status=Broken&tags=camera

# Asset detail with modal open
/assets/123?modal=edit

# Work order with specific offer highlighted
/work-orders/456?offer=789

# Data view with custom filters
/assets?view=kanban&group=status&tags=lighting
```

### 7.2 URL State Persistence

Use query parameters for UI state that should survive refresh:

```typescript
import { useSearchParams } from 'react-router-dom';

function AssetListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = {
    status: searchParams.get('status'),
    tags: searchParams.getAll('tags'),
    search: searchParams.get('search') || '',
  };
  
  function updateFilters(newFilters: Partial<typeof filters>) {
    const params = new URLSearchParams(searchParams);
    
    if (newFilters.status) {
      params.set('status', newFilters.status);
    } else {
      params.delete('status');
    }
    
    setSearchParams(params);
  }
}
```

## 8. Error Pages

### 8.1 404 Not Found

```tsx
// pages/NotFoundPage.tsx
import { EmptyState } from '@/components/EmptyState';
import { IconAlertCircle } from '@tabler/icons-react';

function NotFoundPage() {
  const navigate = useNavigate();
  
  return (
    <EmptyState
      icon={<IconAlertCircle size={48} />}
      title="Page Not Found"
      description="The page you're looking for doesn't exist."
      action={
        <Button onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      }
    />
  );
}

// router/index.tsx
{
  path: '*',
  element: <NotFoundPage />,
}
```

### 8.2 403 Forbidden

```tsx
// pages/ForbiddenPage.tsx
function ForbiddenPage() {
  return (
    <EmptyState
      icon={<IconLock size={48} />}
      title="Access Denied"
      description="You don't have permission to access this page."
      action={
        <Button onClick={() => navigate(-1)}>
          Go Back
        </Button>
      }
    />
  );
}
```

## 9. Protected Routes

### 9.1 Permission Guard

```typescript
// router/guards/PermissionGuard.tsx
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionGuard({ 
  permission, 
  children 
}: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(permission)) {
    return <Navigate to="/forbidden" replace />;
  }
  
  return <>{children}</>;
}

// Usage
{
  path: 'assets/:id/edit',
  element: (
    <PermissionGuard permission="assets.write">
      <AssetEditPage />
    </PermissionGuard>
  ),
}
```

## 10. Back Button Handling

### 10.1 Smart Navigation

```typescript
function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  
  function handleBack() {
    // If navigated from within app, go back
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      // If direct link, go to logical parent
      const parentPath = getParentPath(location.pathname);
      navigate(parentPath);
    }
  }
  
  return (
    <Button onClick={handleBack} variant="subtle">
      <IconArrowLeft size={16} />
      Back
    </Button>
  );
}

function getParentPath(pathname: string): string {
  // /assets/123/damage/456 → /assets/123/damage
  // /assets/123/damage → /assets/123
  // /assets/123 → /assets
  // /assets → /
  const parts = pathname.split('/').filter(Boolean);
  parts.pop();
  return parts.length > 0 ? `/${parts.join('/')}` : '/';
}
```

## 11. Route Transitions

### 11.1 Page Transitions

```tsx
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

## 12. Testing Requirements

### 12.1 Route Tests

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '@/router';

test('navigates to asset detail page', () => {
  render(
    <MemoryRouter initialEntries={['/assets/123']}>
      <AppRouter />
    </MemoryRouter>
  );
  
  expect(screen.getByText(/Asset Detail/i)).toBeInTheDocument();
});

test('redirects invalid UUID to 404', () => {
  render(
    <MemoryRouter initialEntries={['/assets/invalid-id']}>
      <AppRouter />
    </MemoryRouter>
  );
  
  expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
});
```

### 12.2 Breadcrumb Tests

```typescript
test('displays correct breadcrumbs for nested page', () => {
  render(
    <MemoryRouter initialEntries={['/assets/123/damage/456']}>
      <AssetDamageDetailPage />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Home')).toBeInTheDocument();
  expect(screen.getByText('Assets')).toBeInTheDocument();
  expect(screen.getByText('Camera A')).toBeInTheDocument();
  expect(screen.getByText('Damage Reports')).toBeInTheDocument();
});
```

## 13. SEO Considerations

### 13.1 Page Titles

```typescript
import { Helmet } from 'react-helmet-async';

function AssetDetailPage() {
  const { id } = useParams();
  const { data: asset } = useAsset(id);
  
  return (
    <>
      <Helmet>
        <title>{asset.name} - Assets - ChurchTools Inventory</title>
      </Helmet>
      
      <div>...</div>
    </>
  );
}
```

## 14. Implementation Checklist

- [ ] Set up React Router v6 with nested routes
- [ ] Create route builder utilities (type-safe)
- [ ] Implement breadcrumb component with auto-generation
- [ ] Add query parameter helpers (filters, sorting, pagination)
- [ ] Create route guards (permissions, authentication)
- [ ] Implement 404 and 403 error pages
- [ ] Add route parameter validation (Zod schemas)
- [ ] Configure lazy loading for code splitting
- [ ] Add page transitions (optional, Framer Motion)
- [ ] Write route navigation tests
- [ ] Document all routes in API docs

## References

- CHK033: Navigation/routing consistency
- React Router v6: https://reactrouter.com/
- comprehensive-requirements.md
