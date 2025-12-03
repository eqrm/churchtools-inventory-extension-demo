# ChurchTools Inventory Extension

A demo/experimental inventory management module for [ChurchTools](https://www.church.tools/) that enables churches to track physical assets, equipment, and supplies directly within their ChurchTools instance.

> ⚠️ **Demo/Experimental**: This extension uses ChurchTools' Custom Module key-value storage which has limitations (see [Storage Limitations](#storage-limitations)). A Supabase backend is planned for production use.

> 🤖 **100% AI-Generated**: This entire project—code, tests, documentation, and architecture—was generated using AI (GitHub Copilot / Claude). It serves as an experiment in AI-assisted development for ChurchTools extensions.

![Inventory Table View](images/Screenshot%202025-12-03%20at%2012.43.50.png)

## Features

### 📦 Asset Management
- **Asset Types** — Categorize assets (Electronics, Furniture, Building Equipment, etc.) with custom icons and colors
- **Individual Assets** — Track each item with unique asset numbers, barcodes (1D and QR), photos, and detailed information
- **Asset Groups** — Group identical items together (e.g., "Kupfer Stehlampe" with 4 units) with shared properties
- **Kits** — Bundle related assets together (e.g., "Kids Checkin Terminal" containing an iPad and label printer)

![Asset Detail View](images/Screenshot%202025-12-03%20at%2012.42.43.png)

### 🏷️ Organization
- **Locations** — Track where assets are stored or deployed
- **Status Tracking** — Available, In Use, Installed, Under Maintenance, etc.
- **Manufacturers & Models** — Associate assets with their manufacturer and model information
- **Tags** — Flexible tagging for custom categorization
- **Custom Fields** — Define additional fields per asset type

![Asset Types](images/Screenshot%202025-12-03%20at%2012.43.29.png)

### 📊 Stock Take
Perform inventory audits with barcode scanning support:
- Start stock take sessions for all assets or filtered subsets
- Scan assets via USB/Bluetooth barcode scanner or camera
- Update location, status, or condition notes during scanning
- Track progress and identify missing items

![Stock Take](images/Screenshot%202025-12-03%20at%2012.43.21.png)

### 📜 History & Audit Trail
- Track all changes to assets over time
- See who changed what and when
- Status change history with visual timeline

![Change History](images/Screenshot%202025-12-03%20at%2012.42.50.png)

### 🔖 Barcodes
- Automatic barcode generation (Code128 and QR codes)
- Print labels directly from asset detail view
- Scan barcodes to quickly find assets

### 📦 Kits & Groups
- **Kits** — Fixed or flexible bundles of assets that travel together
- **Asset Groups** — Multiple identical items managed as a group with inherited properties

![Kit Detail](images/Screenshot%202025-12-03%20at%2012.43.11.png)
![Asset Group](images/Screenshot%202025-12-03%20at%2012.43.00.png)

### 🔍 Views & Filtering
- Multiple view modes: Table, Gallery, Kanban, Calendar, List
- Filter by status, type, location, and more
- Sort and search across all assets

![Filtered View](images/Screenshot%202025-12-03%20at%2012.42.11.png)

## Storage Limitations

This extension uses ChurchTools' **Custom Module Key-Value Storage API** which was designed for simple configuration data, not as a full database. Key limitations include:

### Image Storage (Base64)
- Images are stored as Base64-encoded strings in the key-value store
- **10,000 character limit** per value means images must be heavily compressed
- Large photos are automatically resized and quality-reduced to fit
- This results in lower quality images than ideal

### Not a Real Database
- No relational queries or joins
- No indexing or efficient search
- All data loaded into memory
- Scalability concerns with large inventories (500+ assets may cause performance issues)

### Future Plans: Supabase Backend
We plan to migrate to **Supabase** as the backend storage solution, which will provide:
- Proper PostgreSQL database with relational queries
- Native file storage for images (no more Base64 limitations)
- Better performance and scalability
- Real-time sync capabilities
- Row-level security

## Getting Started

### Prerequisites
- Node.js 20.x (or version in `.nvmrc`)
- ChurchTools instance with Custom Module access
- Module key (`VITE_KEY`) and base URL (`VITE_BASE_URL`)

### Installation
```bash
# Clone the repository
git clone https://github.com/eqrm/churchtools-inventory-extension.git
cd churchtools-inventory-extension

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your ChurchTools details

# Start development server
npm run dev
```

The app runs on http://localhost:5173. Configure ChurchTools CORS to allow this origin.

### Dev Container
This repo includes VS Code dev container configuration. Open in VS Code and select **Reopen in Container** for a pre-configured development environment.

## Configuration

| Variable        | Description                                                   |
|-----------------|---------------------------------------------------------------|
| `VITE_KEY`      | Module key from ChurchTools (e.g., `inventory`)               |
| `VITE_BASE_URL` | Your ChurchTools URL (e.g., `https://example.church.tools`)   |

## Scripts

| Command                  | Purpose                                        |
|--------------------------|------------------------------------------------|
| `npm run dev`            | Start dev server with hot reload               |
| `npm run build`          | Production build                               |
| `npm run preview`        | Preview production build                       |
| `npm run lint`           | Run ESLint                                     |
| `npm test`               | Run Vitest unit tests                          |
| `npm run deploy`         | Build and package to `releases/`               |

## Tech Stack

- **React 18** + **TypeScript 5.x** (strict mode)
- **Vite 5** — Build tooling
- **Mantine UI v7** — Component library
- **TanStack Query v5** — Data fetching and caching
- **Zustand v4** — State management
- **ChurchTools Custom Modules API** — Backend storage (for now)

## Documentation

- [`docs/user-guide.md`](docs/user-guide.md) — End-user documentation
- [`docs/components.md`](docs/components.md) — Component reference
- [`docs/api.md`](docs/api.md) — API documentation

## Roadmap

- [ ] Supabase backend integration
- [ ] ChurchTools Files API for images
- [ ] Booking/reservation system
- [ ] Maintenance scheduling
- [ ] Export/import functionality
- [ ] Mobile-optimized views

## Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

## Support

- **ChurchTools Forum**: https://forum.church.tools
- **Issues**: https://github.com/eqrm/churchtools-inventory-extension/issues


