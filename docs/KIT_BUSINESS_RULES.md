# Kit Business Rules

This document outlines the business rules for Equipment Kits, specifically regarding asset binding and property inheritance.

## 1. Kit Types

There are two types of kits:
- **Fixed Kits**: Bind specific assets that always travel together.
- **Flexible Kits**: Define requirements (e.g., "2x Microphone") that are fulfilled from a pool when the kit is booked.

## 2. Fixed Kit Binding Rules

### 2.1 Asset Selection
- Any asset can be bound to a fixed kit, provided it is:
  - Not marked as `deleted`.
  - Not a kit itself (nested kits are not supported).
  - Not already bound to another kit.

### 2.2 Binding Validation
- When adding an asset to a kit, the system checks if it is already bound to another kit.
- If an asset is already bound, it cannot be selected in the UI (filtered out or disabled).
- Backend validation enforces this rule and throws an error if violated.

### 2.3 Status & Availability
- Assets with any status (e.g., `available`, `broken`, `in_repair`) can be bound to a kit.
- If a non-available asset is selected, the UI displays a warning that the asset's status may be overwritten by the kit's status upon saving.

## 3. Property Inheritance

Fixed kits can enforce property inheritance on their bound assets. This ensures that all assets in the kit stay in sync.

### 3.1 Inheritable Properties
The following properties can be inherited:
- **Location**: The physical location of the asset.
- **Status**: The operational status (e.g., `available`, `broken`).
- **Tags**: Categorization tags.

### 3.2 Inheritance Logic
- When a property is marked for inheritance in the kit definition:
  - The kit's value for that property is propagated to all bound assets.
  - The bound assets' values are **overwritten** by the kit's value.
  - The property becomes **locked** on the asset, meaning it cannot be changed individually on the asset. It must be changed on the kit.

### 3.3 Propagation Triggers
Inheritance propagation occurs when:
- A kit is created with bound assets.
- A kit is updated (properties changed or assets added/removed).
- A kit is assembled (if it was previously disassembled).

### 3.4 Disassembly
- When a kit is **disassembled**:
  - All bound assets are detached from the kit.
  - Inheritance locks are removed.
  - Assets retain their current values but are no longer synchronized with the kit.

## 4. Completeness Status

- Fixed kits have a `completenessStatus` (`complete` or `incomplete`).
- This status is automatically calculated based on the status of bound assets.
- If any bound asset has a status of `broken`, the kit is marked as `incomplete`.
- Otherwise, it is `complete`.
