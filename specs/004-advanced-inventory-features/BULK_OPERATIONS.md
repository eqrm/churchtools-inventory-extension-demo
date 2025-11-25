# Bulk Operations Requirements

**Status**: Approved  
**References**: CHK047, CHK055  
**Last Updated**: 2025-01-20

## Overview

This document defines bulk operation requirements for the advanced inventory system, enabling efficient management of multiple items with progress feedback, error handling, and keyboard shortcuts.

## 1. Supported Operations

### 1.1 Bulk Actions

**Asset Operations**:
- Change status (batch status update)
- Add tags (batch tag addition)
- Remove tags (batch tag removal)
- Update location (batch location update)
- Update model (batch model assignment)
- Delete (batch soft delete with confirmation)

**Kit Operations**:
- Add/remove child assets (batch kit membership)
- Update kit properties (propagate to children)
- Delete kits (batch soft delete)

**Work Order Operations**:
- Change status (batch status update)
- Assign to user/group (batch assignment)
- Delete (batch soft delete)

**Maintenance Operations**:
- Mark as completed (batch completion)
- Reschedule (batch date update)
- Delete (batch soft delete)

## 2. Operation Limits

### 2.1 Selection Limits

**Maximum Selection**: 1000 items at once
- UI shows warning at 900+ items
- Prevents performance degradation
- Enforced in selection UI

**Batch Processing**: 50 items per API call
- ChurchTools API requests processed in batches
- Reduces server load
- Enables progress tracking

**Timeout**: 60 seconds total operation time
- Abort remaining items after timeout
- Show partial success message
- Offer retry for failed items

### 2.2 Performance Targets

| Operation | Target Time | Max Items |
|-----------|-------------|-----------|
| Change status | <5s | 1000 |
| Add/remove tags | <5s | 1000 |
| Update location | <5s | 1000 |
| Delete | <10s | 1000 |
| Kit property propagation | <5s | 1000 |

## 3. UI Pattern

### 3.1 Selection State

**Multi-Select List**:
```tsx
import { Checkbox, Group, Text, Badge } from '@mantine/core';

function AssetListItem({ asset, selected, onToggle }) {
  return (
    <Group position="apart" p="sm">
      <Group>
        <Checkbox
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${asset.name}`}
        />
        <div>
          <Text size="sm" weight={500}>{asset.name}</Text>
          <Text size="xs" color="dimmed">{asset.location}</Text>
        </div>
      </Group>
      <Badge color="blue">{asset.status}</Badge>
    </Group>
  );
}
```

**Selection Toolbar**:
```tsx
import { Button, Menu } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';

function SelectionToolbar({ selectedCount, onAction }) {
  if (selectedCount === 0) return null;
  
  return (
    <Group position="apart" p="md" bg="blue.0">
      <Text size="sm" weight={500}>
        {selectedCount} selected
      </Text>
      
      <Menu position="bottom-end">
        <Menu.Target>
          <Button 
            variant="filled" 
            rightIcon={<IconChevronDown size={16} />}
          >
            Bulk Actions
          </Button>
        </Menu.Target>
        
        <Menu.Dropdown>
          <Menu.Item onClick={() => onAction('status')}>
            Change Status
          </Menu.Item>
          <Menu.Item onClick={() => onAction('tags-add')}>
            Add Tags
          </Menu.Item>
          <Menu.Item onClick={() => onAction('tags-remove')}>
            Remove Tags
          </Menu.Item>
          <Menu.Item onClick={() => onAction('location')}>
            Update Location
          </Menu.Item>
          
          <Menu.Divider />
          
          <Menu.Item 
            color="red" 
            onClick={() => onAction('delete')}
          >
            Delete Selected
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
```

### 3.2 Confirmation Modal

```tsx
import { Modal, Button, Group, Stack, Text, Select } from '@mantine/core';

interface BulkActionModalProps {
  opened: boolean;
  action: 'status' | 'tags-add' | 'location' | 'delete';
  selectedItems: Array<{ id: string; name: string }>;
  onConfirm: (params: any) => void;
  onCancel: () => void;
}

function BulkActionModal({ 
  opened, 
  action, 
  selectedItems, 
  onConfirm, 
  onCancel 
}: BulkActionModalProps) {
  const [params, setParams] = useState<any>({});
  
  const actionConfig = {
    status: {
      title: `Change Status for ${selectedItems.length} Assets?`,
      field: (
        <Select
          label="New Status"
          data={['Available', 'InUse', 'Broken', 'InRepair', 'Retired']}
          value={params.status}
          onChange={(value) => setParams({ status: value })}
        />
      ),
    },
    'tags-add': {
      title: `Add Tags to ${selectedItems.length} Assets?`,
      field: (
        <MultiSelect
          label="Tags to Add"
          data={availableTags}
          value={params.tags}
          onChange={(value) => setParams({ tags: value })}
        />
      ),
    },
    location: {
      title: `Update Location for ${selectedItems.length} Assets?`,
      field: (
        <TextInput
          label="New Location"
          value={params.location}
          onChange={(e) => setParams({ location: e.target.value })}
        />
      ),
    },
    delete: {
      title: `Delete ${selectedItems.length} Assets?`,
      field: null,
    },
  };
  
  const config = actionConfig[action];
  
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={config.title}
      centered
      size="md"
    >
      <Stack spacing="md">
        {config.field}
        
        <Text size="sm" color="dimmed">
          This will update:
        </Text>
        
        <Stack spacing="xs">
          {selectedItems.slice(0, 3).map(item => (
            <Text key={item.id} size="sm">
              • {item.name}
            </Text>
          ))}
          {selectedItems.length > 3 && (
            <Text size="sm" color="dimmed">
              ...and {selectedItems.length - 3} more
            </Text>
          )}
        </Stack>
        
        {action === 'delete' && (
          <Text size="sm" color="red">
            Items can be restored within 90 days.
          </Text>
        )}
        
        <Group position="right" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            color={action === 'delete' ? 'red' : 'blue'}
            onClick={() => onConfirm(params)}
          >
            {action === 'delete' ? 'Delete' : 'Update All'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

### 3.3 Progress Dialog

```tsx
import { Modal, Progress, Text, Stack, Button } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

interface BulkProgressModalProps {
  opened: boolean;
  total: number;
  completed: number;
  errors: number;
  currentItem?: string;
  onCancel?: () => void;
}

function BulkProgressModal({ 
  opened, 
  total, 
  completed, 
  errors,
  currentItem,
  onCancel 
}: BulkProgressModalProps) {
  const progress = (completed / total) * 100;
  const inProgress = completed < total;
  
  return (
    <Modal
      opened={opened}
      onClose={() => {}}  // Can't close during operation
      title={inProgress ? "Updating assets..." : "Update Complete"}
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={!inProgress}
      centered
    >
      <Stack spacing="md">
        <Progress 
          value={progress} 
          size="lg" 
          striped={inProgress}
          animate={inProgress}
          color={errors > 0 ? 'orange' : 'blue'}
        />
        
        <Group position="apart">
          <Text size="sm">
            {completed} of {total} items
          </Text>
          
          {errors > 0 && (
            <Text size="sm" color="red">
              <IconX size={14} style={{ verticalAlign: 'middle' }} />
              {' '}{errors} failed
            </Text>
          )}
          
          {completed === total && errors === 0 && (
            <Text size="sm" color="green">
              <IconCheck size={14} style={{ verticalAlign: 'middle' }} />
              {' '}All successful
            </Text>
          )}
        </Group>
        
        {currentItem && inProgress && (
          <Text size="xs" color="dimmed">
            Processing: {currentItem}
          </Text>
        )}
        
        {inProgress && onCancel && (
          <Button 
            variant="subtle" 
            color="red" 
            onClick={onCancel}
            fullWidth
          >
            Cancel Remaining
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
```

### 3.4 Results Summary

```tsx
interface BulkResultsModalProps {
  opened: boolean;
  onClose: () => void;
  results: {
    successful: Array<{ id: string; name: string }>;
    failed: Array<{ id: string; name: string; error: string }>;
  };
}

function BulkResultsModal({ opened, onClose, results }: BulkResultsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Bulk Operation Results"
      centered
      size="lg"
    >
      <Stack spacing="md">
        {results.successful.length > 0 && (
          <div>
            <Text size="sm" weight={500} color="green" mb="xs">
              <IconCheck size={16} style={{ verticalAlign: 'middle' }} />
              {' '}{results.successful.length} items updated successfully
            </Text>
          </div>
        )}
        
        {results.failed.length > 0 && (
          <div>
            <Text size="sm" weight={500} color="red" mb="xs">
              <IconX size={16} style={{ verticalAlign: 'middle' }} />
              {' '}{results.failed.length} items failed
            </Text>
            
            <Stack spacing="xs" mt="sm">
              {results.failed.map(item => (
                <Text key={item.id} size="xs" color="dimmed">
                  • {item.name}: {item.error}
                </Text>
              ))}
            </Stack>
          </div>
        )}
        
        <Group position="right" mt="md">
          {results.failed.length > 0 && (
            <Button variant="default" onClick={() => exportFailedItems(results.failed)}>
              Export Failed Items
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

## 4. Bulk Operation Service

### 4.1 Service Implementation

```typescript
// src/services/bulkOperationService.ts
export interface BulkOperationConfig {
  batchSize: number;        // Items per API call (default: 50)
  timeout: number;          // Total timeout in ms (default: 60000)
  onProgress?: (completed: number, total: number, errors: number) => void;
  onItemProcessed?: (item: any, success: boolean, error?: Error) => void;
}

export class BulkOperationService {
  private aborted = false;
  
  async executeBulkOperation<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    config: Partial<BulkOperationConfig> = {}
  ): Promise<BulkOperationResult<T, R>> {
    const fullConfig: BulkOperationConfig = {
      batchSize: 50,
      timeout: 60000,
      ...config,
    };
    
    this.aborted = false;
    const startTime = Date.now();
    
    const results: BulkOperationResult<T, R> = {
      successful: [],
      failed: [],
      aborted: false,
    };
    
    // Process in batches
    for (let i = 0; i < items.length; i += fullConfig.batchSize) {
      // Check timeout
      if (Date.now() - startTime > fullConfig.timeout) {
        results.aborted = true;
        break;
      }
      
      // Check if aborted by user
      if (this.aborted) {
        results.aborted = true;
        break;
      }
      
      const batch = items.slice(i, i + fullConfig.batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(item => operation(item))
      );
      
      // Collect results
      batchResults.forEach((result, index) => {
        const item = batch[index];
        
        if (result.status === 'fulfilled') {
          results.successful.push({
            item,
            result: result.value,
          });
          
          fullConfig.onItemProcessed?.(item, true);
        } else {
          results.failed.push({
            item,
            error: result.reason,
          });
          
          fullConfig.onItemProcessed?.(item, false, result.reason);
        }
        
        // Report progress
        const completed = results.successful.length + results.failed.length;
        fullConfig.onProgress?.(completed, items.length, results.failed.length);
      });
    }
    
    return results;
  }
  
  abort() {
    this.aborted = true;
  }
}

export interface BulkOperationResult<T, R> {
  successful: Array<{ item: T; result: R }>;
  failed: Array<{ item: T; error: Error }>;
  aborted: boolean;
}
```

### 4.2 Usage Example

```typescript
// Example: Bulk status update
async function bulkUpdateStatus(
  assetIds: string[],
  newStatus: AssetStatus
) {
  const bulkService = new BulkOperationService();
  
  // Show progress modal
  const [progressState, setProgressState] = useState({
    opened: true,
    total: assetIds.length,
    completed: 0,
    errors: 0,
  });
  
  const result = await bulkService.executeBulkOperation(
    assetIds,
    async (assetId) => {
      return await assetService.updateStatus(assetId, newStatus);
    },
    {
      batchSize: 50,
      timeout: 60000,
      onProgress: (completed, total, errors) => {
        setProgressState({
          opened: true,
          total,
          completed,
          errors,
        });
      },
    }
  );
  
  // Hide progress, show results
  setProgressState(prev => ({ ...prev, opened: false }));
  
  return result;
}
```

## 5. Error Handling

### 5.1 Error Recovery Strategies

**Partial Success**: Continue processing remaining items
- Log errors for each failed item
- Show summary of successful vs failed
- Offer "Retry Failed Items" action

**Full Failure**: All items failed (e.g., network down)
- Show error message
- Offer "Retry All" action
- Save operation state for later retry

**Item Locked**: Skip locked items with warning
- Asset has active assignment (can't change status)
- Kit has validation errors
- Work order already completed

**Network Error**: Pause and offer resume
- Detect offline state
- Queue remaining items
- Resume when connection restored

### 5.2 Validation Before Execution

```typescript
export async function validateBulkOperation(
  items: Asset[],
  action: 'status' | 'delete' | 'location'
): Promise<ValidationResult> {
  const errors: Array<{ item: Asset; reason: string }> = [];
  
  for (const item of items) {
    switch (action) {
      case 'status':
        if (item.currentAssignmentId && action === 'status') {
          errors.push({
            item,
            reason: 'Has active assignment',
          });
        }
        break;
        
      case 'delete':
        const canDelete = await assetService.canDelete(item.id);
        if (!canDelete.canDelete) {
          errors.push({
            item,
            reason: canDelete.reason || 'Cannot delete',
          });
        }
        break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: errors.length > 0 ? ['Some items cannot be processed'] : [],
  };
}
```

## 6. Keyboard Shortcuts

### 6.1 Selection Shortcuts

**Windows/Linux**:
- `Ctrl+A`: Select all visible items
- `Ctrl+Click`: Toggle individual item
- `Shift+Click`: Range selection (from last selected to clicked item)
- `Ctrl+D`: Deselect all
- `Escape`: Clear selection

**macOS**:
- `Cmd+A`: Select all visible items
- `Cmd+Click`: Toggle individual item
- `Shift+Click`: Range selection
- `Cmd+D`: Deselect all
- `Escape`: Clear selection

### 6.2 Implementation

```typescript
import { useHotkeys } from '@mantine/hooks';

function AssetListPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const visibleAssets = useFilteredAssets();
  
  // Select all
  useHotkeys([
    ['mod+A', (e) => {
      e.preventDefault();
      setSelectedIds(new Set(visibleAssets.map(a => a.id)));
    }],
    ['mod+D', (e) => {
      e.preventDefault();
      setSelectedIds(new Set());
    }],
    ['Escape', () => {
      setSelectedIds(new Set());
    }],
  ]);
  
  function handleShiftClick(clickedId: string) {
    if (!lastSelectedId) {
      toggleSelection(clickedId);
      return;
    }
    
    const startIndex = visibleAssets.findIndex(a => a.id === lastSelectedId);
    const endIndex = visibleAssets.findIndex(a => a.id === clickedId);
    
    const rangeIds = visibleAssets
      .slice(
        Math.min(startIndex, endIndex),
        Math.max(startIndex, endIndex) + 1
      )
      .map(a => a.id);
    
    setSelectedIds(prev => new Set([...prev, ...rangeIds]));
  }
  
  return (
    <div>
      {/* Asset list with selection handlers */}
    </div>
  );
}
```

## 7. Performance Optimizations

### 7.1 Virtual Scrolling

For lists >1000 items, use virtual scrolling:

```tsx
import { FixedSizeList } from 'react-window';

function LargeAssetList({ assets, selectedIds, onToggle }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={assets.length}
      itemSize={60}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <AssetListItem
            asset={assets[index]}
            selected={selectedIds.has(assets[index].id)}
            onToggle={() => onToggle(assets[index].id)}
          />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 7.2 Debounced Updates

Debounce rapid selection changes:

```typescript
import { useDebouncedValue } from '@mantine/hooks';

function SelectionToolbar({ selectedIds }) {
  const [debouncedIds] = useDebouncedValue(selectedIds, 300);
  
  // Use debouncedIds for expensive operations
  const selectedCount = debouncedIds.size;
  
  return (
    <Text>{selectedCount} selected</Text>
  );
}
```

## 8. Testing Requirements

### 8.1 Bulk Operation Tests

```typescript
test('processes 1000 items in batches', async () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: `item-${i}` }));
  const mockOperation = vi.fn().mockResolvedValue({ success: true });
  
  const service = new BulkOperationService();
  const result = await service.executeBulkOperation(items, mockOperation, {
    batchSize: 50,
  });
  
  expect(result.successful).toHaveLength(1000);
  expect(result.failed).toHaveLength(0);
  expect(mockOperation).toHaveBeenCalledTimes(1000);
});

test('handles partial failures', async () => {
  const items = [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ];
  
  const mockOperation = vi.fn()
    .mockResolvedValueOnce({ success: true })
    .mockRejectedValueOnce(new Error('Failed'))
    .mockResolvedValueOnce({ success: true });
  
  const service = new BulkOperationService();
  const result = await service.executeBulkOperation(items, mockOperation);
  
  expect(result.successful).toHaveLength(2);
  expect(result.failed).toHaveLength(1);
});
```

### 8.2 Keyboard Shortcut Tests

```typescript
test('selects all items with Ctrl+A', () => {
  render(<AssetListPage />);
  
  fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
  
  const checkboxes = screen.getAllByRole('checkbox');
  checkboxes.forEach(checkbox => {
    expect(checkbox).toBeChecked();
  });
});
```

## 9. Implementation Checklist

- [ ] Create BulkOperationService with batch processing
- [ ] Implement selection UI (checkboxes, toolbar, modals)
- [ ] Add progress dialog with cancel button
- [ ] Implement results summary modal
- [ ] Add validation before execution
- [ ] Implement keyboard shortcuts (Ctrl+A, Shift+Click, etc.)
- [ ] Add virtual scrolling for large lists
- [ ] Write tests for bulk operations and error handling
- [ ] Add error recovery (retry failed items)
- [ ] Document bulk operation patterns in developer guide

## References

- CHK047: Bulk operation requirements
- CHK055: Tag propagation performance
- comprehensive-requirements.md
