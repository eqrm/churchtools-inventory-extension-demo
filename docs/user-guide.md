# ChurchTools Inventory Management - User Guide

**Version**: 1.0  
**Last Updated**: October 21, 2025  
**Audience**: End Users (Church Staff, Volunteers, Equipment Managers)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Categories](#managing-categories)
4. [Managing Assets](#managing-assets)
5. [Booking System](#booking-system)
6. [Equipment Kits](#equipment-kits)
7. [Stock Take](#stock-take)
8. [Maintenance Management](#maintenance-management)
9. [Reports & Views](#reports--views)
10. [Settings](#settings)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Login

1. Open the ChurchTools Inventory Extension in your browser
2. You'll see the **Dashboard** with an overview of your inventory
3. Use the **sidebar navigation** to access different sections

### Navigation Overview

The sidebar menu provides access to:
- 🏠 **Dashboard** - Overview and statistics
- 📁 **Categories** - Organize asset types
- 📦 **Assets** - Manage individual items
- 📅 **Bookings** - Reserve equipment
- 📦 **Kits** - Group assets together
- 📋 **Stock Take** - Inventory audits
- ⚙️ **Settings** - System configuration
- ⌨️ **Keyboard Shortcuts** - View available shortcuts

### Quick Actions

- **Quick Scan**: Press `Alt+S` (Windows/Linux) or `⌘S` (macOS) anywhere to open the scanner
- **Create New**: Click the "+ New" buttons on each page
- **Search**: Use the search boxes to find items quickly

---

## Dashboard Overview

The Dashboard shows:

### 📊 **Key Statistics**
- **Total Assets**: Number of items in inventory
- **Available Assets**: Items ready to book
- **Active Bookings**: Currently checked out equipment
- **Overdue Bookings**: Items past return date

### 📈 **Recent Activity**
- Latest bookings
- Recent stock take sessions
- Upcoming maintenance

### ⚠️ **Alerts**
- Overdue bookings (red)
- Maintenance due soon (yellow)
- Low stock warnings (orange)

---

## Managing Categories

Categories organize your assets into logical groups (e.g., Cameras, Audio Equipment, Lighting).

### Creating a Category

1. Go to **Categories** in the sidebar
2. Click **"+ New Category"**
3. Fill in the form:
   - **Name**: e.g., "Cameras"
   - **Description**: Brief explanation
   - **Icon**: Choose a visual icon
   - **Custom Fields** (optional): Add fields like "Sensor Size", "Mount Type"
4. Click **"Create Category"**

### Using Category Templates

Speed up setup with pre-configured templates:

1. Click **"Use Template"** when creating a category
2. Choose from:
   - 📷 **Camera Equipment**
   - 🎤 **Audio Equipment**
   - 💡 **Lighting Equipment**
   - 🎸 **Musical Instruments**
   - 🖥️ **Tech Equipment**
3. Template includes pre-defined custom fields

### Custom Fields

Add category-specific fields to capture important details:

**Field Types**:
- **Text**: Serial numbers, notes
- **Number**: Weight, dimensions
- **Date**: Purchase date, warranty expiry
- **Select**: Dropdown options (e.g., condition)
- **Checkbox**: Yes/no values

**Example - Camera Category**:
- Sensor Size (Select): Full Frame, APS-C, Micro 4/3
- ISO Range (Text): e.g., "100-25600"
- Video Resolution (Select): 4K, 1080p, 720p

### Editing/Deleting Categories

- Click **"..."** menu → **"Edit"** to modify
- **Cannot delete** categories with existing assets
- First reassign or delete assets, then delete category

---

## Managing Assets

Assets are individual items in your inventory.

### Creating an Asset

1. Go to **Assets** in the sidebar
2. Click **"+ New Asset"**
3. Fill in required fields:
   - **Category**: Select from dropdown
   - **Name**: e.g., "Canon EOS R5"
   - **Asset Number**: Auto-generated (e.g., CAM-001)
   - **Status**: Available, In Use, Broken, etc.
4. Optional fields:
   - **Location**: Where it's stored
   - **Purchase Date & Price**: For records
   - **Warranty Expiry**: Get reminders
   - **Photos**: Add up to 5 images
   - **Notes**: Additional information
   - **Custom Fields**: Category-specific fields
5. Click **"Create Asset"**

### Asset Numbers

- **Automatically generated** with prefix (e.g., CAM-001, CAM-002)
- Format: `PREFIX-XXX` (3 digits)
- Configure prefix in **Settings** → **Asset Prefix**
- Used for barcode labels and quick identification

### Asset Statuses

- 🟢 **Available**: Ready to book
- 🔵 **In Use**: Currently booked
- 🟡 **Broken**: Needs repair
- 🟠 **In Repair**: Being fixed
- ⚫ **Installed**: Permanently installed
- 🔴 **Sold**: No longer owned
- ⚪ **Destroyed**: Written off

### Parent-Child Assets

Group related items (e.g., camera body with multiple lenses):

**Creating a Parent Asset**:
1. Create the main item (e.g., "Camera Kit")
2. Check **"This is a parent asset"**
3. Click **"Create Asset"**

**Adding Child Assets**:
1. Create child items (e.g., lenses)
2. Select **Parent Asset** from dropdown
3. Child assets inherit some properties

**Booking Parent Assets**:
- Booking parent automatically books all children
- Prevents double-booking of components

### Adding Photos

1. Click **"Add Photo"** in asset form
2. Select up to 5 images (JPEG, PNG)
3. Photos appear in asset detail page
4. Click photo to view full size

### Printing Barcode Labels

1. Open asset detail page
2. Click **"Print Label"** or **"Regenerate Barcode"**
3. Print using your browser's print function
4. Attach label to physical item
5. Use for quick scanning during stock take

### Filtering & Searching

**Search Bar**:
- Type name or asset number
- Real-time filtering

**Filter Panel**:
1. Click **"Filters"** button
2. Filter by:
   - Category
   - Status
   - Location
   - Custom field values
3. Click **"Apply Filters"**
4. Click **"Clear Filters"** to reset

**View Modes**:
- 📋 **Table**: Detailed list view
- 🎴 **Gallery**: Visual grid with photos
- 📊 **Kanban**: Organize by status
- 📅 **Calendar**: View by booking dates

### Deleting Assets

1. Click **"..."** menu → **"Delete"**
2. Confirm deletion
3. **10-second undo window**: Click notification to restore
4. **Parent assets**: Cannot delete if they have children with bookings

---

## Booking System

Reserve equipment for events, services, or projects.

### Creating a Booking

1. Go to **Bookings** in the sidebar
2. Click **"+ New Booking"**
3. Fill in the form:
   - **Asset**: Select equipment to book
   - **Start Date/Time**: When you need it
   - **End Date/Time**: When you'll return it
   - **Purpose**: Event name or reason
   - **Notes** (optional): Special requirements
4. Click **"Create Booking"**

### Booking Statuses

- 🟡 **Pending**: Awaiting approval
- 🟢 **Approved**: Confirmed reservation
- 🔵 **Active**: Currently checked out
- ✅ **Completed**: Returned successfully
- 🔴 **Overdue**: Past return date
- ⚫ **Cancelled**: Booking cancelled

### Calendar View

View all bookings on a calendar:

1. Go to **Bookings** → **Calendar View**
2. See all bookings by date
3. Click date to create new booking
4. Hover over booking to see details
5. Click booking to view/edit

### Checking Out Equipment

When borrower picks up equipment:

1. Open the booking
2. Click **"Check Out"** button
3. Status changes to **Active**
4. Record shows who checked it out and when

### Checking In Equipment

When equipment is returned:

1. Open the booking
2. Click **"Check In"** button
3. **Report damage** if needed:
   - Check "Report Damage"
   - Describe the damage
   - Upload photos (optional)
   - Asset status changes to "Broken"
   - Maintenance team gets notified
4. Status changes to **Completed**

### Handling Overdue Bookings

**System automatically**:
- Marks bookings as **Overdue** after end date
- Shows red warning on dashboard
- Sends notifications (if configured)

**Manual follow-up**:
1. Filter bookings by "Overdue" status
2. Contact borrower
3. Either:
   - Extend booking (edit end date)
   - Check in when returned
   - Cancel if needed

### Cancelling Bookings

1. Open the booking
2. Click **"Cancel"** button
3. Add cancellation reason
4. Asset becomes available again

---

## Equipment Kits

Group multiple assets into reusable kits (e.g., "Sunday Service Audio Kit").

### Types of Kits

**Fixed Kits**:
- Specific items (e.g., "Shure SM58 Mic #1")
- Always the same components
- Example: "Camera Kit A" with specific camera + specific lens

**Flexible Kits**:
- Any items from categories (e.g., "any 2 microphones")
- System picks available items when booking
- Example: "Basic Audio" with any 4 mics + any 2 cables

### Creating a Fixed Kit

1. Go to **Kits** → **"+ New Kit"**
2. Select **"Fixed Kit"**
3. Fill in details:
   - **Name**: e.g., "Sunday Worship Kit"
   - **Description**: What's included
4. Add components:
   - Click **"+ Add Component"**
   - Select specific asset
   - Repeat for all items
5. Click **"Create Kit"**

### Creating a Flexible Kit

1. Go to **Kits** → **"+ New Kit"**
2. Select **"Flexible Kit"**
3. Fill in details
4. Add component categories:
   - Click **"+ Add Component"**
   - Select category (e.g., "Microphones")
   - Set quantity (e.g., "4")
   - Repeat for all needed types
5. Click **"Create Kit"**

### Booking a Kit

1. Create a booking
2. Select the **Kit** instead of individual asset
3. For flexible kits:
   - System finds available items from each category
   - Shows what will be booked
   - If not enough available, shows error
4. All kit components are booked together
5. Check out entire kit at once

### Managing Kits

- **View Components**: Click kit to see what's included
- **Edit Kit**: Modify name, description, or components
- **Delete Kit**: Remove kit (assets remain)

---

## Stock Take

Perform physical inventory counts to verify assets.

### Starting a Stock Take Session

1. Go to **Stock Take** in the sidebar
2. Click **"+ New Session"**
3. Fill in details:
   - **Name**: e.g., "Q4 2025 Inventory Audit"
   - **Location** (optional): Specific area to count
   - **Category** (optional): Only count certain types
4. Click **"Start Session"**

### Scanning Assets

**Using USB/Bluetooth Barcode Scanner**:
1. Scanner input mode is active by default
2. Scan barcode labels on assets
3. Each scan adds to the session
4. See running count on screen

**Using Camera (Phone/Tablet)**:
1. Click **"Camera"** button
2. Allow camera access
3. Point camera at QR code/barcode
4. Automatic detection and scanning
5. Keep the device online so scans sync immediately

**Manual Entry**:
1. Type asset number in search field
2. Press Enter
3. Asset added to session

### Duplicate Scan Prevention

If you scan an asset twice:
- 🟡 Yellow warning notification
- Message shows when it was first scanned and by whom
- Count not incremented
- Helps prevent counting errors

> **Note:** Offline scan queueing was removed in FR-007. If connectivity drops, pause scanning until you are back online so every scan is recorded.

### Completing a Session

1. After scanning all assets, click **"Complete Session"**
2. System compares scans to database
3. Shows discrepancies:
   - ✅ **Found**: Scanned assets
   - ⚠️ **Missing**: Not scanned (lost?)
   - ❌ **Unexpected**: Scanned but not in database
4. Review and address issues
5. Mark session as **Finalized**

### Stock Take Reports

- View session history
- Export results to CSV
- Track missing items
- Generate audit reports

---

## Maintenance Management

Track repairs, servicing, and preventive maintenance.

### Viewing Maintenance Dashboard

1. Go to **Settings** → **Maintenance** (or from asset detail)
2. See overview:
   - 🔴 **Overdue**: Past due date
   - 🟡 **Due Soon**: Within 7 days
   - 🟢 **Upcoming**: Scheduled maintenance

### Creating Maintenance Schedules

**Time-Based Maintenance** (e.g., "Service every 6 months"):
1. Open asset detail page
2. Click **"Maintenance"** tab
3. Click **"+ New Schedule"**
4. Select **"Time-Based"**
5. Fill in:
   - **Type**: Service, Inspection, Calibration, etc.
   - **Interval**: Days between maintenance
   - **Description**: What needs to be done
6. Click **"Create Schedule"**

**Usage-Based Maintenance** (e.g., "Service every 100 hours"):
1. Follow same steps as time-based
2. Select **"Usage-Based"**
3. Enter **Usage Hours** threshold
4. System tracks asset usage from bookings
5. Alerts when threshold reached

### Recording Maintenance

**Manual Entry**:
1. Click **"+ Record Maintenance"**
2. Fill in:
   - **Asset**: Select item
   - **Type**: What was done
   - **Date**: When completed
   - **Cost** (optional): Service cost
   - **Notes**: Details and findings
   - **Next Due** (optional): Override auto-calculation
3. Click **"Save Record"**

**From Schedule**:
1. Click overdue/due item
2. Click **"Complete Maintenance"**
3. Add notes and cost
4. System auto-calculates next due date

### Maintenance Alerts

- Dashboard shows overdue maintenance
- Asset detail pages show maintenance status
- Email notifications (if configured)

---

## Reports & Views

Create custom views and generate reports.

### Saved Views

Save frequently used filters:

1. Apply filters to asset list
2. Click **"Save View"**
3. Name your view (e.g., "Available Cameras")
4. View appears in **"Saved Views"** menu
5. One-click to reload that filter combination

### Built-In Reports

**Asset Utilization**:
- See which assets are booked most
- Identify underutilized equipment
- Filter by date range and category

**Booking History**:
- View all bookings for an asset
- Track who used what and when
- Export to CSV for records

**Maintenance Compliance**:
- See maintenance schedule adherence
- Identify overdue items
- Track maintenance costs

**Stock Take Summary**:
- Compare sessions over time
- Track missing items
- Generate audit reports

### Exporting Data

1. Open any list or report
2. Click **"Export"** button
3. Choose format:
   - **CSV**: For Excel/Google Sheets
   - **PDF**: For printing
4. Download file

---

## Settings

Configure system-wide preferences.

### Asset Number Prefix

1. Go to **Settings** → **Asset Prefix**
2. Enter prefix (e.g., "AUD" for audio equipment)
3. See preview of next number
4. Click **"Save"**
5. **Warning**: Changing prefix affects new assets only

### Location Management

Pre-define storage locations:

1. Go to **Settings** → **Locations**
2. Click **"+ Add Location"**
3. Enter location name (e.g., "Storage Room A", "Tech Booth")
4. Location appears in dropdowns
5. See asset count per location
6. **Cannot delete** locations with assets

### User Preferences

- **Language**: Interface language (if multilingual)
- **Date Format**: DD/MM/YYYY or MM/DD/YYYY
- **Timezone**: For accurate booking times

---

## Keyboard Shortcuts

Speed up your workflow with shortcuts.

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+S` (Windows/Linux) | Open quick scanner |
| `⌘S` (macOS) | Open quick scanner |
| `Esc` | Close modals/drawers |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate between form fields |
| `Shift+Tab` | Navigate backwards |
| `Enter` | Submit forms |
| `↑` `↓` | Navigate table rows |

### Forms

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` (Windows/Linux) | Quick save |
| `⌘Enter` (macOS) | Quick save |

### Tables

| Shortcut | Action |
|----------|--------|
| `Click` | View item details |
| Click `⋮` menu | Open actions menu |

**View All Shortcuts**: Click **"Keyboard Shortcuts"** in the sidebar menu

---

## Troubleshooting

### Common Issues

#### "Asset not found" when scanning

**Causes**:
- Asset doesn't exist in database
- Barcode damaged or incorrect

**Solutions**:
1. Check asset number manually
2. Search for asset by name
3. Regenerate barcode label if damaged
4. Add asset if truly missing

---

#### Sync not updating

**Causes**:
- Device temporarily lost connection
- Session tab left idle for too long

**Solutions**:
1. Ensure Wi-Fi/mobile data is connected and stable
2. Refresh the page to rejoin the active session
3. Re-scan any barcodes that failed while offline (the UI shows a warning)
4. Export the session and contact support if records still differ

---

#### Camera not working for scanning

**Causes**:
- Camera permission denied
- HTTPS required for camera access
- Browser doesn't support camera

**Solutions**:
1. Allow camera access in browser settings
2. Ensure using HTTPS URL
3. Try different browser (Chrome recommended)
4. Use USB barcode scanner instead

---

#### Bookings show as overdue incorrectly

**Causes**:
- Wrong timezone setting
- System clock incorrect

**Solutions**:
1. Check timezone in Settings
2. Verify system time is correct
3. Refresh the page

---

#### Cannot delete category/asset

**Causes**:
- Assets exist in category
- Child assets have active bookings

**Solutions**:
1. For categories: First delete or move all assets
2. For parent assets: Complete/cancel child bookings first
3. Check for dependencies

---

#### Duplicate scan warning

**This is intentional!**
- Prevents counting same item twice
- Shows when item was first scanned
- Click notification to see details
- If legitimate, you can add manual note

---

### Getting Help

**Documentation**:
- This user guide
- [API Documentation](api.md) (for developers)
- [Component Documentation](components.md) (for developers)

**Support**:
- Contact your ChurchTools administrator
- Check ChurchTools community forums
- Report bugs on GitHub (if applicable)

**Tips**:
- Take screenshots of errors
- Note what you were doing when issue occurred
- Check browser console for error messages

---

## Best Practices

### Asset Management
- ✅ Use consistent naming conventions
- ✅ Add photos for visual identification
- ✅ Set up maintenance schedules proactively
- ✅ Print and attach barcode labels immediately
- ✅ Update status promptly (especially "Broken")

### Bookings
- ✅ Book equipment in advance
- ✅ Check in/out promptly
- ✅ Report damage immediately
- ✅ Add detailed purpose/notes
- ✅ Set realistic return dates

### Stock Takes
- ✅ Schedule regular sessions (quarterly recommended)
- ✅ Use barcode scanner for speed
- ✅ Investigate discrepancies promptly
- ✅ Update asset records after session
- ✅ Archive old session data

### Maintenance
- ✅ Create schedules for critical equipment
- ✅ Record all maintenance activities
- ✅ Track costs for budgeting
- ✅ Address overdue items quickly
- ✅ Use notes field for detailed findings

---

## Quick Reference Card

### Common Tasks

| Task | Steps |
|------|-------|
| **Add New Asset** | Assets → + New Asset → Fill form → Create |
| **Book Equipment** | Bookings → + New Booking → Select asset & dates → Create |
| **Start Stock Take** | Stock Take → + New Session → Start scanning |
| **Check Out** | Open booking → Check Out button |
| **Check In** | Open booking → Check In button → Report damage if needed |
| **Print Label** | Open asset → Print Label button |
| **Create Kit** | Kits → + New Kit → Add components → Create |
| **Save Filter View** | Apply filters → Save View → Name it |
| **Quick Scan** | Press Alt+S (or ⌘S) → Scan barcode |

---

**End of User Guide**

**Version**: 1.0  
**Last Updated**: October 21, 2025  
**Feedback**: Please report issues or suggestions to your administrator
