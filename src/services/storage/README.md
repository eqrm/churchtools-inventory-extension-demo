# Storage Layer Documentation

This document describes the storage abstraction layer for the ChurchTools Inventory Extension, including the photo storage strategy and migration path.

## Overview

The storage layer provides a consistent interface for data persistence powered by the ChurchTools Custom Modules API. The design allows for future migration from base64-encoded photos to the ChurchTools Files module without breaking existing data.

---

## Storage Providers

### ChurchToolsProvider

Primary storage provider using ChurchTools Custom Modules API.

**Location**: `src/services/storage/ChurchToolsProvider.ts`

**Key Methods**:
- Asset CRUD: `getAssets()`, `getAsset()`, `createAsset()`, `updateAsset()`, `deleteAsset()`
- Category CRUD: `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`
- Booking CRUD: `getBookings()`, `createBooking()`, `updateBooking()`, `cancelBooking()`
- Kit CRUD: `getKits()`, `createKit()`, `updateKit()`, `deleteKit()`
- Stock Take: `getStockTakeSessions()`, `createStockTakeSession()`, `addStockTakeScan()`
- Maintenance: `getMaintenanceSchedules()`, `createMaintenanceRecord()`

## Photo Storage Abstraction

### Current Implementation: Base64 Encoding

**Status**: ✅ Implemented (Phase 1-12)

Photos are currently stored as base64-encoded data URLs directly in the asset JSON:

```typescript
interface Asset {
  id: string;
  name: string;
  // ... other fields
  photos: string[]; // Array of base64 data URLs
}

// Example photo format
const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...";
```

**Advantages**:
- ✅ Simple implementation
- ✅ No additional API calls
- ✅ Works with ChurchTools Custom Modules immediately
- ✅ Atomic operations (photo is part of asset data)

**Disadvantages**:
- ⚠️ Increases JSON payload size (~33% overhead)
- ⚠️ Not efficient for large images
- ⚠️ Limited to ChurchTools API size limits

---

### Future Implementation: ChurchTools Files Module

**Status**: 📋 Planned (Future Enhancement)

### IPhotoStorage Interface

The abstraction layer defines a common interface for photo storage:

```typescript
/**
 * Photo storage abstraction interface
 * Allows swapping between base64 and ChurchTools Files module
 */
export interface IPhotoStorage {
  /**
   * Upload a photo file
   * @param file - The photo file to upload
   * @returns Photo identifier (base64 string or file ID)
   */
  uploadPhoto(file: File): Promise<string>;

  /**
   * Delete a photo
   * @param id - Photo identifier (base64 string or file ID)
   */
  deletePhoto(id: string): Promise<void>;

  /**
   * Get accessible URL for a photo
   * @param id - Photo identifier
   * @returns URL or data URL to display the photo
   */
  getPhotoUrl(id: string): string;

  /**
   * Check if a photo ID is a legacy base64 format
   * @param id - Photo identifier to check
   */
  isBase64Photo(id: string): boolean;
}
```

---

### Implementation: Base64PhotoStorage (Current)

```typescript
/**
 * Base64 Photo Storage Implementation
 * Stores photos as base64-encoded data URLs
 */
export class Base64PhotoStorage implements IPhotoStorage {
  async uploadPhoto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String); // Returns data URL
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  async deletePhoto(_id: string): Promise<void> {
    // No-op for base64 (data is in asset JSON)
    return Promise.resolve();
  }

  getPhotoUrl(id: string): string {
    // Base64 data URL is already a valid URL
    return id;
  }

  isBase64Photo(id: string): boolean {
    return id.startsWith('data:image/');
  }
}
```

**Usage**:
```typescript
const photoStorage = new Base64PhotoStorage();

// Upload
const photoFile = fileInput.files[0];
const photoId = await photoStorage.uploadPhoto(photoFile);
// photoId = "data:image/jpeg;base64,..."

// Display
const url = photoStorage.getPhotoUrl(photoId);
// url = "data:image/jpeg;base64,..." (same as ID)
```

---

### Implementation: ChurchToolsPhotoStorage (Future)

```typescript
/**
 * ChurchTools Files Module Photo Storage
 * Stores photos using ChurchTools Files API
 */
export class ChurchToolsPhotoStorage implements IPhotoStorage {
  private apiClient: ChurchToolsApiClient;

  constructor(apiClient: ChurchToolsApiClient) {
    this.apiClient = apiClient;
  }

  async uploadPhoto(file: File): Promise<string> {
    // Upload to ChurchTools Files module
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', 'inventory');
    formData.append('domainId', 'photos');

    const response = await this.apiClient.uploadFile(formData);
    
    return response.id; // Returns file ID (e.g., "12345")
  }

  async deletePhoto(id: string): Promise<void> {
    // Delete from ChurchTools Files
    if (!this.isBase64Photo(id)) {
      await this.apiClient.deleteFile(id);
    }
  }

  getPhotoUrl(id: string): string {
    // Check if legacy base64 format
    if (this.isBase64Photo(id)) {
      return id; // Return data URL directly
    }
    
    // Return ChurchTools file URL
    return `${this.apiClient.baseUrl}/files/${id}`;
  }

  isBase64Photo(id: string): boolean {
    return id.startsWith('data:image/');
  }
}
```

**Usage**:
```typescript
const apiClient = new ChurchToolsApiClient(moduleId, apiToken);
const photoStorage = new ChurchToolsPhotoStorage(apiClient);

// Upload
const photoFile = fileInput.files[0];
const photoId = await photoStorage.uploadPhoto(photoFile);
// photoId = "12345" (file ID from ChurchTools)

// Display
const url = photoStorage.getPhotoUrl(photoId);
// url = "https://example.churchtools.de/files/12345"

// Backward compatibility with base64
const legacyPhotoId = "data:image/jpeg;base64,...";
const legacyUrl = photoStorage.getPhotoUrl(legacyPhotoId);
// legacyUrl = "data:image/jpeg;base64,..." (unchanged)
```

---

## Migration Strategy

### Phase 1: Current State (Implemented)
- ✅ Base64PhotoStorage in use
- ✅ Photos stored as data URLs in asset JSON
- ✅ No additional API calls needed

### Phase 2: Abstraction Layer (Future)
1. **Create IPhotoStorage interface** in `src/services/storage/IPhotoStorage.ts`
2. **Implement Base64PhotoStorage** (wrap existing logic)
3. **Implement ChurchToolsPhotoStorage** (new implementation)
4. **Add configuration** to switch between implementations

```typescript
// src/services/storage/photoStorageFactory.ts
export function createPhotoStorage(config: AppConfig): IPhotoStorage {
  if (config.features.useFilesModule) {
    return new ChurchToolsPhotoStorage(apiClient);
  }
  return new Base64PhotoStorage();
}
```

### Phase 3: Gradual Migration (Future)
1. **Feature flag**: Enable ChurchTools Files for new uploads only
   ```typescript
   const photoStorage = config.features.useFilesModule
     ? new ChurchToolsPhotoStorage(apiClient)
     : new Base64PhotoStorage();
   ```

2. **Dual read support**: Read both formats
   ```typescript
   getPhotoUrl(id: string): string {
     if (this.isBase64Photo(id)) {
       return id; // Legacy format
     }
     return `${this.baseUrl}/files/${id}`; // New format
   }
   ```

3. **Background migration**: Convert existing base64 photos
   ```typescript
   async migrateAssetPhotos(asset: Asset): Promise<Asset> {
     const migratedPhotos = [];
     
     for (const photoId of asset.photos) {
       if (this.isBase64Photo(photoId)) {
         // Convert base64 to File object
         const file = await dataUrlToFile(photoId, 'photo.jpg');
         
         // Upload to ChurchTools Files
         const newPhotoId = await this.uploadPhoto(file);
         
         migratedPhotos.push(newPhotoId);
       } else {
         migratedPhotos.push(photoId); // Already migrated
       }
     }
     
     return { ...asset, photos: migratedPhotos };
   }
   ```

4. **Cleanup**: Remove base64 support after migration complete

---

## Backward Compatibility Strategy

### Key Principles
1. **Never break existing data**: Always support reading legacy formats
2. **Gradual migration**: New uploads use new format, old data remains
3. **Transparent to users**: Migration happens in background
4. **Rollback-safe**: Can revert to base64 if needed

### Implementation Checklist
- [ ] Create IPhotoStorage interface
- [ ] Implement Base64PhotoStorage class
- [ ] Implement ChurchToolsPhotoStorage class
- [ ] Add feature flag for Files module
- [ ] Update AssetForm to use IPhotoStorage
- [ ] Add migration script for existing photos
- [ ] Test with mixed photo formats
- [ ] Document rollback procedure

---

## Testing Strategy

### Unit Tests
```typescript
describe('Base64PhotoStorage', () => {
  it('should convert File to base64 data URL', async () => {
    const storage = new Base64PhotoStorage();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const photoId = await storage.uploadPhoto(file);
    expect(photoId).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('should recognize base64 format', () => {
    const storage = new Base64PhotoStorage();
    expect(storage.isBase64Photo('data:image/jpeg;base64,...')).toBe(true);
    expect(storage.isBase64Photo('12345')).toBe(false);
  });
});

describe('ChurchToolsPhotoStorage', () => {
  it('should upload to Files module', async () => {
    const mockApi = { uploadFile: jest.fn().mockResolvedValue({ id: '123' }) };
    const storage = new ChurchToolsPhotoStorage(mockApi);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const photoId = await storage.uploadPhoto(file);
    expect(photoId).toBe('123');
  });

  it('should handle legacy base64 photos', () => {
    const storage = new ChurchToolsPhotoStorage(mockApi);
    const legacyUrl = storage.getPhotoUrl('data:image/jpeg;base64,...');
    expect(legacyUrl).toMatch(/^data:image/);
  });
});
```

### Integration Tests
- Upload photo in base64 mode
- Upload photo in Files module mode
- Display asset with mixed photo formats
- Migrate asset from base64 to Files
- Rollback from Files to base64

---

## Performance Considerations

### Base64 Photos
- **Pros**: Single API call, atomic updates
- **Cons**: Large payload (~33% overhead), slow for multiple photos

### ChurchTools Files
- **Pros**: Smaller JSON, better for many photos, reusable URLs
- **Cons**: Multiple API calls, cleanup required on delete

### Recommendations
1. Use base64 for **small photos** (< 100 KB)
2. Use Files module for **large photos** (> 100 KB)
3. Implement **lazy loading** for photo galleries
4. Add **image compression** before upload

---

## Security Considerations

1. **File Type Validation**: Only allow image formats (JPEG, PNG, WebP)
   ```typescript
   const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
   if (!ALLOWED_TYPES.includes(file.type)) {
     throw new Error('Invalid file type');
   }
   ```

2. **File Size Limits**: Prevent oversized uploads
   ```typescript
   const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
   if (file.size > MAX_SIZE) {
     throw new Error('File too large');
   }
   ```

3. **Access Control**: Ensure proper permissions for Files module
   ```typescript
   const response = await apiClient.uploadFile(formData, {
     permissions: 'module-inventory-admin',
   });
   ```

---

## API Reference

### Base64PhotoStorage

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `uploadPhoto(file)` | `File` | `Promise<string>` | Converts file to base64 data URL |
| `deletePhoto(id)` | `string` | `Promise<void>` | No-op (data in JSON) |
| `getPhotoUrl(id)` | `string` | `string` | Returns data URL |
| `isBase64Photo(id)` | `string` | `boolean` | Checks if ID is base64 format |

### ChurchToolsPhotoStorage

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `uploadPhoto(file)` | `File` | `Promise<string>` | Uploads to ChurchTools Files, returns file ID |
| `deletePhoto(id)` | `string` | `Promise<void>` | Deletes file from ChurchTools (if not base64) |
| `getPhotoUrl(id)` | `string` | `string` | Returns file URL or base64 data URL |
| `isBase64Photo(id)` | `string` | `boolean` | Checks if ID is legacy base64 format |

---

## Future Enhancements

1. **Image Optimization**
   - Automatic compression on upload
   - Generate thumbnails for galleries
   - WebP conversion for smaller files

2. **Caching Strategy**
   - Cache file URLs in IndexedDB
  - Prefetch photos for low-connectivity viewing
   - Progressive image loading

3. **Batch Operations**
   - Upload multiple photos at once
   - Batch migration of legacy photos
   - Bulk download for export

4. **Cloud Storage Integration**
   - AWS S3 support
   - Google Cloud Storage
   - Azure Blob Storage

---

**Last Updated**: November 16, 2025  
**Status**: Base64 implementation complete, Files module migration planned for future
