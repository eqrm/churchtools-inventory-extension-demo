# ChurchTools Inventory Extension - Component Documentation

**Version**: 1.0  
**Last Updated**: October 21, 2025  
**Audience**: Developers & Maintainers

---

## Table of Contents

1. [Overview](#overview)
2. [Asset Components](#asset-components)
3. [Booking Components](#booking-components)
4. [Kit Components](#kit-components)
5. [Stock Take Components](#stock-take-components)
6. [Maintenance Components](#maintenance-components)
7. [Common Components](#common-components)
8. [Layout Components](#layout-components)
9. [Hooks](#hooks)

---

## Overview

This document describes the React components in the ChurchTools Inventory Extension.

### Architecture

```
App.tsx
  ├── Shell (Layout)
  │   ├── Navigation
  │   └── Routes
  │       ├── Dashboard
  │       ├── AssetList
  │       ├── CategoryList
  │       ├── BookingCalendar
  │       └── ...
  └── Providers
      ├── QueryClientProvider
      ├── MantineProvider
      └── NotificationsProvider
```

### Tech Stack

- **React**: 18.x with hooks
- **TypeScript**: 5.x strict mode
- **Mantine**: 7.x UI library
- **TanStack Query**: 5.x data fetching
- **Zustand**: 4.x state management

---

## Asset Components

### AssetList

Main component for viewing and managing assets.

**File**: `src/components/assets/AssetList.tsx`

**Features**:
- Grid/table view toggle
- Advanced filtering
- Search by name/number
- Quick actions (edit, delete, view)
- Bulk operations
- Undo deletion (T225)

**Props**:
```typescript
interface AssetListProps {
  // No props - uses query params for state
}
```

**State**:
- `viewMode`: 'grid' | 'table'
- `selectedIds`: Set<string>
- `filters`: AssetFilters

**Hooks Used**:
- `useAssets(filters)` - Fetch assets
- `useDeleteAsset()` - Delete mutation
- `useUndoStore()` - Undo functionality

**Example**:
```tsx
import { AssetList } from './components/assets/AssetList';

<AssetList />
```

**Key Methods**:
```typescript
const handleDelete = async (id: string) => {
  // Store asset for undo
  const asset = assets.find(a => a.id === id);
  undoStore.addAction({
    type: 'delete-asset',
    entityId: id,
    entity: asset,
    description: `${asset.name} deleted`
  });
  
  // Delete with notification
  await deleteAsset.mutateAsync(id);
  
  // Show click-to-undo notification
  notifications.show({
    message: `${asset.name} deleted. Click to undo.`,
    onClick: async () => {
      await createAsset.mutateAsync(asset);
      undoStore.clearAction(id);
    }
  });
};
```

---

### AssetForm

Form for creating/editing assets.

**File**: `src/components/assets/AssetForm.tsx`

**Props**:
```typescript
interface AssetFormProps {
  asset?: Asset; // If editing
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features**:
- Auto-generated asset numbers
- Custom field rendering
- Photo upload (up to 5)
- Parent/child relationship selector
- Validation

**Hooks Used**:
- `useForm()` - Form state (Mantine)
- `useCreateAsset()` - Create mutation
- `useUpdateAsset()` - Update mutation
- `useCategories()` - Category options
- `useAssets()` - Parent asset options

**Example**:
```tsx
<AssetForm 
  asset={existingAsset}
  onSuccess={() => navigate('/assets')}
  onCancel={() => navigate('/assets')}
/>
```

**Form Schema**:
```typescript
const form = useForm({
  initialValues: {
    categoryId: '',
    name: '',
    assetNumber: '', // Auto-generated
    status: 'available',
    location: '',
    purchaseDate: null,
    purchasePrice: 0,
    photos: [],
    notes: '',
    customFields: {},
    parentAssetId: null
  },
  validate: {
    categoryId: (value) => !value ? 'Required' : null,
    name: (value) => !value ? 'Required' : null,
    assetNumber: (value) => !value ? 'Required' : null
  }
});
```

---

### AssetDetail

Detailed view of a single asset.

**File**: `src/components/assets/AssetDetail.tsx`

**Props**:
```typescript
interface AssetDetailProps {
  id: string;
}
```

**Features**:
- Full asset information display
- Photo gallery with lightbox
- Booking history
- Maintenance history
- QR code display
- Parent/child relationship tree
- Quick actions (edit, delete, regenerate barcode)

**Sections**:
1. **Header**: Name, status, asset number, QR code
2. **Details**: Purchase info, warranty, location
3. **Photos**: Gallery view
4. **Custom Fields**: Category-specific fields
5. **Relationships**: Parent/children if applicable
6. **Bookings**: Active and past bookings
7. **Maintenance**: Schedule and records

**Example**:
```tsx
<AssetDetail id="asset-123" />
```

---

### PhotoUpload

Component for uploading and managing asset photos.

**File**: `src/components/assets/PhotoUpload.tsx`

**Props**:
```typescript
interface PhotoUploadProps {
  photos: string[]; // Base64 data URLs
  onChange: (photos: string[]) => void;
  maxPhotos?: number; // Default: 5
}
```

**Features**:
- Drag-and-drop upload
- Preview thumbnails
- Reorder photos
- Remove photos
- Compression to max 1MB

**Example**:
```tsx
<PhotoUpload 
  photos={form.values.photos}
  onChange={(photos) => form.setFieldValue('photos', photos)}
  maxPhotos={5}
/>
```

**Implementation**:
```typescript
const handleFileUpload = async (files: File[]) => {
  const newPhotos: string[] = [];
  
  for (const file of files) {
    const base64 = await fileToBase64(file);
    const compressed = await compressImage(base64, 1024 * 1024); // 1MB
    newPhotos.push(compressed);
  }
  
  onChange([...photos, ...newPhotos].slice(0, maxPhotos));
};
```

---

## Booking Components

### BookingCalendar

Calendar view of all bookings.

**File**: `src/components/bookings/BookingCalendar.tsx`

**Features**:
- Monthly calendar view
- Booking display as events
- Color-coded by status
- Click to view details
- Click empty slot to create booking
- Drag to reschedule (future)

**Props**:
```typescript
interface BookingCalendarProps {
  // No props - uses query params
}
```

**State**:
- `currentMonth`: Date
- `selectedBooking`: Booking | null
- `filters`: BookingFilters

**Hooks Used**:
- `useBookings(filters)` - Fetch bookings
- `useBooking(id)` - Fetch single booking

**Example**:
```tsx
<BookingCalendar />
```

**Event Rendering**:
```typescript
const events = bookings.map(booking => ({
  id: booking.id,
  title: booking.asset?.name || 'Unknown',
  start: booking.startDate,
  end: booking.endDate,
  color: getStatusColor(booking.status),
  booking
}));
```

**Status Colors**:
- Pending: Gray
- Approved: Blue
- Active: Green
- Completed: Green (outlined)
- Overdue: Red
- Cancelled: Red (outlined)

---

### BookingForm

Form for creating/editing bookings.

**File**: `src/components/bookings/BookingForm.tsx`

**Props**:
```typescript
interface BookingFormProps {
  booking?: Booking; // If editing
  preselectedAssetId?: string;
  preselectedDates?: { start: Date; end: Date };
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features**:
- Asset/kit selector
- Date/time pickers
- Availability checking
- Conflict warnings
- Purpose and notes input

**Validation**:
- End date after start date
- Asset available for period
- Kit components all available

**Example**:
```tsx
<BookingForm 
  preselectedAssetId="asset-123"
  preselectedDates={{
    start: new Date('2025-10-25T09:00'),
    end: new Date('2025-10-25T17:00')
  }}
  onSuccess={() => navigate('/bookings')}
/>
```

**Availability Check**:
```typescript
const { data: available } = useQuery({
  queryKey: ['availability', assetId, startDate, endDate],
  queryFn: () => storageProvider.isAssetAvailable(assetId, startDate, endDate),
  enabled: !!(assetId && startDate && endDate)
});
```

---

### BookingDetail

Detailed view of a booking.

**File**: `src/components/bookings/BookingDetail.tsx`

**Props**:
```typescript
interface BookingDetailProps {
  id: string;
}
```

**Features**:
- Booking information display
- Asset/kit details
- Timeline (created → approved → active → completed)
- Actions based on status:
  - Pending: Approve/reject
  - Approved: Check out
  - Active: Check in
  - Any: Cancel

**Example**:
```tsx
<BookingDetail id="booking-123" />
```

---

### CheckInModal

Modal for checking in a booking (T241h).

**File**: `src/components/bookings/CheckInModal.tsx`

**Props**:
```typescript
interface CheckInModalProps {
  booking: Booking;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

**Features**:
- Damage reporting checkbox
- Damage notes textarea
- Photo upload for damage
- Creates maintenance record if damaged

**Example**:
```tsx
<CheckInModal 
  booking={booking}
  opened={checkInModalOpened}
  onClose={() => setCheckInModalOpened(false)}
  onSuccess={() => {
    notifications.show({ message: 'Checked in successfully' });
    navigate('/bookings');
  }}
/>
```

**Submit Logic**:
```typescript
const handleSubmit = async (values: CheckInFormValues) => {
  await checkIn.mutateAsync({
    id: booking.id,
    damaged: values.damaged,
    damageNotes: values.damageNotes,
    damagePhotos: values.damagePhotos
  });
  
  if (values.damaged) {
    notifications.show({
      title: 'Damage Reported',
      message: 'Maintenance record created, team notified',
      color: 'orange'
    });
  }
  
  onSuccess?.();
};
```

---

## Kit Components

### KitList

List view of all equipment kits.

**File**: `src/components/kits/KitList.tsx`

**Features**:
- Grid/table view
- Fixed vs flexible indicators
- Component count
- Quick actions
- Create new kit button

**Props**:
```typescript
interface KitListProps {
  // No props
}
```

**Example**:
```tsx
<KitList />
```

---

### KitForm

Form for creating/editing kits.

**File**: `src/components/kits/KitForm.tsx`

**Props**:
```typescript
interface KitFormProps {
  kit?: Kit; // If editing
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features**:
- Kit type selector (fixed/flexible)
- **Fixed**: Multi-select specific assets
- **Flexible**: Category + quantity pairs
- Validation

**Example**:
```tsx
<KitForm 
  onSuccess={() => navigate('/kits')}
  onCancel={() => navigate('/kits')}
/>
```

**Fixed Kit Form**:
```typescript
<MultiSelect
  label="Select Assets"
  data={assets.map(a => ({
    value: a.id,
    label: `${a.assetNumber} - ${a.name}`
  }))}
  value={form.values.componentIds}
  onChange={(ids) => form.setFieldValue('componentIds', ids)}
/>
```

**Flexible Kit Form**:
```typescript
{form.values.flexibleComponents.map((comp, index) => (
  <Group key={index}>
    <Select
      label="Category"
      data={categories}
      value={comp.categoryId}
      onChange={(val) => updateFlexibleComponent(index, 'categoryId', val)}
    />
    <NumberInput
      label="Quantity"
      value={comp.quantity}
      onChange={(val) => updateFlexibleComponent(index, 'quantity', val)}
      min={1}
    />
  </Group>
))}
```

---

### KitDetail

Detailed view of a kit.

**File**: `src/components/kits/KitDetail.tsx`

**Props**:
```typescript
interface KitDetailProps {
  id: string;
}
```

**Features**:
- Kit information
- Component list with status
- Availability status
- Booking history
- Quick book action

**Example**:
```tsx
<KitDetail id="kit-123" />
```

---

## Stock Take Components

### StockTakeList

List of all stock take sessions.

**File**: `src/components/stocktake/StockTakeList.tsx`

**Features**:
- Session list with progress
- Filter by status
- Create new session button
- View details/continue session

**Props**:
```typescript
interface StockTakeListProps {
  // No props
}
```

**Example**:
```tsx
<StockTakeList />
```

---

### StockTakePage

Active stock take session interface.

**File**: `src/components/stocktake/StockTakePage.tsx`

**Features**:
- Three scanning modes:
  - USB barcode scanner (auto-input)
  - Camera barcode scanner
  - Manual input
- Real-time progress
- Scanned assets list
- Duplicate scan prevention (T241b)
- Complete session action

**Props**:
```typescript
interface StockTakePageProps {
  id: string; // Session ID
}
```

**State**:
- `scanMode`: 'usb' | 'camera' | 'manual'
- `scannedAssets`: Asset[]
- `inputValue`: string
- `cameraActive`: boolean

**Example**:
```tsx
<StockTakePage id="session-123" />
```

**Scan Handler**:
```typescript
const handleScan = async (assetNumber: string) => {
  try {
    // Find asset by number
    const asset = await findAssetByNumber(assetNumber);
    
    // Add to session
    await addScan.mutateAsync({
      sessionId: session.id,
      assetId: asset.id
    });
    
    // Show success
    notifications.show({
      message: `Scanned: ${asset.name}`,
      color: 'green'
    });
    
  } catch (error) {
    if (error instanceof EdgeCaseError && error.duplicateScan) {
      // Show duplicate warning (T241b)
      const { scannedAt, scannedBy } = error.duplicateScan;
      notifications.show({
        title: 'Already Scanned',
        message: `Scanned ${formatDistanceToNow(scannedAt)} by ${scannedBy}`,
        color: 'yellow'
      });
    } else {
      notifications.show({
        title: 'Asset Not Found',
        message: `No asset with number: ${assetNumber}`,
        color: 'red'
      });
    }
  }
};
```

> **Note:** Offline queue helpers documented in T241d were removed in FR-007. Stock take scans now require an active network connection.

---

### BarcodeScanner

Camera barcode scanner component.

**File**: `src/components/stocktake/BarcodeScanner.tsx`

**Props**:
```typescript
interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onError?: (error: Error) => void;
  active: boolean;
}
```

**Features**:
- Camera access
- Real-time barcode detection
- Auto-scan on detection
- Error handling

**Example**:
```tsx
<BarcodeScanner 
  active={scanMode === 'camera'}
  onScan={handleScan}
  onError={(err) => console.error('Scanner error:', err)}
/>
```

**Implementation**:
Uses `@zxing/library` for barcode detection:
```typescript
const codeReader = new BrowserMultiFormatReader();

useEffect(() => {
  if (active) {
    codeReader.decodeFromVideoDevice(
      undefined, // Default camera
      videoRef.current,
      (result) => {
        if (result) {
          onScan(result.getText());
        }
      }
    );
  }
  
  return () => codeReader.reset();
}, [active]);
```

---

## Maintenance Components

### MaintenanceDashboard

Overview of maintenance schedules and records.

**File**: `src/components/maintenance/MaintenanceDashboard.tsx`

**Features**:
- Upcoming maintenance list
- Overdue alerts
- Recent records
- Quick record maintenance action

**Props**:
```typescript
interface MaintenanceDashboardProps {
  // No props
}
```

**Sections**:
1. **Overdue** (red): Past due date
2. **Due Soon** (yellow): Within 7 days
3. **Upcoming** (blue): Within 30 days
4. **Recent Records**: Last 10 completed

**Example**:
```tsx
<MaintenanceDashboard />
```

---

### MaintenanceScheduleForm

Form for creating maintenance schedules.

**File**: `src/components/maintenance/MaintenanceScheduleForm.tsx`

**Props**:
```typescript
interface MaintenanceScheduleFormProps {
  assetId?: string; // Pre-select asset
  schedule?: MaintenanceSchedule; // If editing
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features**:
- Asset selector
- Schedule type: time-based vs usage-based
- Interval configuration
- Maintenance type
- Description

**Example**:
```tsx
<MaintenanceScheduleForm 
  assetId="asset-123"
  onSuccess={() => navigate('/maintenance')}
/>
```

**Form Fields**:
```typescript
const form = useForm({
  initialValues: {
    assetId: '',
    scheduleType: 'time-based',
    intervalDays: 90, // For time-based
    usageHours: 100, // For usage-based
    maintenanceType: 'inspection',
    description: ''
  }
});
```

---

### MaintenanceRecordForm

Form for recording completed maintenance.

**File**: `src/components/maintenance/MaintenanceRecordForm.tsx`

**Props**:
```typescript
interface MaintenanceRecordFormProps {
  assetId?: string;
  scheduleId?: string; // If from schedule
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features**:
- Asset selector
- Maintenance type
- Date picker
- Performed by
- Cost input
- Notes
- Photos (optional)

**Example**:
```tsx
<MaintenanceRecordForm 
  assetId="asset-123"
  scheduleId="schedule-456"
  onSuccess={() => navigate('/maintenance')}
/>
```

---

## Common Components

### FilterBuilder

Advanced filtering component.

**File**: `src/components/common/FilterBuilder.tsx`

**Props**:
```typescript
interface FilterBuilderProps<T> {
  filters: FilterCondition<T>[];
  onChange: (filters: FilterCondition<T>[]) => void;
  availableFields: FilterField<T>[];
}
```

**Features**:
- Add/remove conditions
- Condition types: equals, contains, greater than, less than, is null, is not null
- AND/OR logic groups
- Save/load filter presets

**Example**:
```tsx
<FilterBuilder 
  filters={filters}
  onChange={setFilters}
  availableFields={[
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    { key: 'purchasePrice', label: 'Price', type: 'number' }
  ]}
/>
```

**Filter Condition**:
```typescript
interface FilterCondition<T> {
  field: keyof T;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'null' | 'notNull';
  value?: unknown;
  logic?: 'AND' | 'OR';
}
```

---

### SavedViewSelector

Component for managing saved filter views.

**File**: `src/components/common/SavedViewSelector.tsx`

**Props**:
```typescript
interface SavedViewSelectorProps {
  entityType: 'assets' | 'bookings' | 'kits';
  onSelect: (view: SavedView) => void;
}
```

**Features**:
- Dropdown of saved views
- Apply view
- Edit view
- Delete view
- Create new view from current filters

**Example**:
```tsx
<SavedViewSelector 
  entityType="assets"
  onSelect={(view) => applyFilters(view.filters)}
/>
```

---

### KeyboardShortcutsModal

Modal displaying all keyboard shortcuts (T226).

**File**: `src/components/common/KeyboardShortcutsModal.tsx`

**Props**:
```typescript
interface KeyboardShortcutsModalProps {
  opened: boolean;
  onClose: () => void;
}
```

**Features**:
- Platform detection (macOS vs Windows)
- 4 categories: Global, Navigation, Tables, Forms
- Visual Kbd components
- 11 shortcuts documented

**Example**:
```tsx
<KeyboardShortcutsModal 
  opened={shortcutsOpened}
  onClose={() => setShortcutsOpened(false)}
/>
```

**Shortcuts**:
| Category | Shortcut | Action |
|----------|----------|--------|
| Global | Alt+S | Open scanner |
| Global | Alt+N | Create new item |
| Global | Alt+K | Show shortcuts |
| Navigation | Alt+1 | Dashboard |
| Navigation | Alt+2 | Assets |
| Navigation | Alt+3 | Bookings |
| Tables | Ctrl+F | Focus search |
| Tables | Ctrl+R | Refresh |
| Forms | Ctrl+Enter | Submit |
| Forms | Escape | Cancel |
| Forms | Tab | Next field |

---

### EmptyState

Component for empty list states.

**File**: `src/components/common/EmptyState.tsx`

**Props**:
```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Example**:
```tsx
<EmptyState 
  title="No Assets Found"
  description="Start by creating your first asset"
  icon={<IconPackage size={48} />}
  action={{
    label: 'Create Asset',
    onClick: () => navigate('/assets/new')
  }}
/>
```

---

### ListLoadingSkeleton

Loading skeleton for list views.

**File**: `src/components/common/ListLoadingSkeleton.tsx`

**Props**:
```typescript
interface ListLoadingSkeletonProps {
  count?: number; // Number of skeleton items (default: 5)
  type?: 'grid' | 'table';
}
```

**Example**:
```tsx
{loading ? (
  <ListLoadingSkeleton count={10} type="grid" />
) : (
  <AssetGrid assets={assets} />
)}
```

---

## Layout Components

### Navigation

Main navigation sidebar.

**File**: `src/components/layout/Navigation.tsx`

**Features**:
- Logo and app name
- Navigation links with icons
- Active route highlighting
- Keyboard shortcuts menu item (T226)
- User menu (logout, settings)

**Props**:
```typescript
interface NavigationProps {
  // No props
}
```

**Nav Links**:
- Dashboard (IconHome)
- Assets (IconPackage)
- Categories (IconCategory)
- Bookings (IconCalendar)
- Kits (IconBoxMultiple)
- Stock Take (IconBarcode)
- Maintenance (IconTool)
- Reports (IconChartBar)
- Settings (IconSettings)
- Keyboard Shortcuts (IconKeyboard)

**Example**:
```tsx
<Navigation />
```

---

### Shell

Main layout shell.

**File**: `src/components/layout/Shell.tsx`

**Features**:
- AppShell from Mantine
- Navigation sidebar
- Main content area
- Responsive design
- Mobile hamburger menu

**Props**:
```typescript
interface ShellProps {
  children: React.ReactNode;
}
```

**Example**:
```tsx
<Shell>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    {/* ... other routes */}
  </Routes>
</Shell>
```

---

## Hooks

### useAssets

Fetch assets with optional filtering.

**File**: `src/hooks/useAssets.ts`

**Signature**:
```typescript
function useAssets(filters?: AssetFilters): UseQueryResult<Asset[], Error>
```

**Example**:
```typescript
const { data: assets, isLoading, error } = useAssets({
  categoryId: 'cat-123',
  status: 'available'
});
```

---

### useCreateAsset

Mutation for creating assets.

**File**: `src/hooks/useCreateAsset.ts`

**Signature**:
```typescript
function useCreateAsset(): UseMutationResult<Asset, Error, Omit<Asset, 'id'>>
```

**Example**:
```typescript
const createAsset = useCreateAsset();

const handleSubmit = async (values: AssetFormValues) => {
  await createAsset.mutateAsync(values);
  navigate('/assets');
};
```

---

### useUpdateAsset

Mutation for updating assets.

**File**: `src/hooks/useUpdateAsset.ts`

**Signature**:
```typescript
function useUpdateAsset(): UseMutationResult<Asset, Error, { id: string; data: Partial<Asset> }>
```

**Example**:
```typescript
const updateAsset = useUpdateAsset();

await updateAsset.mutateAsync({
  id: 'asset-123',
  data: { status: 'broken' }
});
```

---

### useDeleteAsset

Mutation for deleting assets.

**File**: `src/hooks/useDeleteAsset.ts`

**Signature**:
```typescript
function useDeleteAsset(): UseMutationResult<void, Error, string>
```

**Example**:
```typescript
const deleteAsset = useDeleteAsset();

await deleteAsset.mutateAsync('asset-123');
```

---

### useBookings

Fetch bookings with optional filtering.

**File**: `src/hooks/useBookings.ts`

**Signature**:
```typescript
function useBookings(filters?: BookingFilters): UseQueryResult<Booking[], Error>
```

**Example**:
```typescript
const { data: bookings } = useBookings({
  status: 'active',
  startDate: new Date()
});
```

---

### useCheckInBooking

Mutation for checking in bookings.

**File**: `src/hooks/useCheckInBooking.ts`

**Signature**:
```typescript
function useCheckInBooking(): UseMutationResult<
  Booking, 
  Error, 
  {
    id: string;
    damaged?: boolean;
    damageNotes?: string;
    damagePhotos?: string[];
  }
>
```

**Example**:
```typescript
const checkIn = useCheckInBooking();

await checkIn.mutateAsync({
  id: 'booking-123',
  damaged: true,
  damageNotes: 'Scratched lens',
  damagePhotos: ['data:image/jpeg;base64,...']
});
```

---

### useUndoStore

Zustand store for undo functionality (T225).

**File**: `src/stores/undoStore.ts`

**Signature**:
```typescript
interface UndoStore {
  actions: UndoAction[];
  addAction: (action: UndoAction) => void;
  removeAction: (entityId: string) => void;
  getAction: (entityId: string) => UndoAction | undefined;
  clearAction: (entityId: string) => void;
}

function useUndoStore(): UndoStore
```

**Example**:
```typescript
const undoStore = useUndoStore();

// Add action
undoStore.addAction({
  type: 'delete-asset',
  entityId: 'asset-123',
  entity: deletedAsset,
  description: 'Camera deleted'
});

// Get action
const action = undoStore.getAction('asset-123');

// Clear action (after undo)
undoStore.clearAction('asset-123');
```

---

> **Retired Hook:** `useOfflineQueue` was deleted alongside the offline sync effort. If queued operations return in the future, reintroduce the hook with the new persistence strategy.

---

## Best Practices

### Component Structure

```typescript
import { FC } from 'react';
import { Button } from '@mantine/core';
import { useAssets } from '../../hooks/useAssets';

interface MyComponentProps {
  id: string;
  onSuccess?: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ id, onSuccess }) => {
  // 1. Hooks
  const { data, isLoading } = useAssets();
  
  // 2. State
  const [opened, setOpened] = useState(false);
  
  // 3. Event handlers
  const handleClick = () => {
    // Logic
    onSuccess?.();
  };
  
  // 4. Early returns
  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;
  
  // 5. Render
  return (
    <div>
      {/* Content */}
    </div>
  );
};
```

### Error Handling

```typescript
const { data, isLoading, error } = useAssets();

if (error) {
  return (
    <Alert color="red" title="Error">
      {error instanceof Error ? error.message : 'An error occurred'}
    </Alert>
  );
}
```

### Form Validation

```typescript
const form = useForm({
  initialValues: { name: '' },
  validate: {
    name: (value) => {
      if (!value) return 'Name is required';
      if (value.length < 3) return 'Name must be at least 3 characters';
      return null;
    }
  }
});
```

### Loading States

```typescript
{isLoading ? (
  <ListLoadingSkeleton count={5} type="grid" />
) : assets.length === 0 ? (
  <EmptyState title="No assets found" />
) : (
  <AssetGrid assets={assets} />
)}
```

---

**End of Component Documentation**

For more information:
- [User Guide](user-guide.md) - End-user documentation
- [API Documentation](api.md) - Storage provider API
- [Mantine Documentation](https://mantine.dev/) - UI component library