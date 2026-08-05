# DEA Analyzer Wiki

## What is the DEA Analyzer?

The DEA (Delivery Experience Accuracy) Analyzer is a browser-based analytics dashboard built for sortation center operations. It processes CSV exports from various operational systems and provides instant, actionable insights without sending any data to external servers.

**Deployed at:** https://canopy.fgbs.amazon.dev/apps/dea-analyze/

---

## Problem Statement

Sortation center teams deal with multiple data sources daily:
- Shipment-level data from QuickSight/ACES
- Jam/alarm exports from WCS/SCADA
- CPT miss trackers from spreadsheets
- Equipment configuration logs

Previously, analyzing these required manual cross-referencing in Excel, which was:
- Time-consuming (30-60 min per analysis)
- Error-prone (manual vlookups, pivot tables)
- Not shareable (each person's local spreadsheet)

The DEA Analyzer reduces this to **< 2 minutes**: upload CSVs, get instant analysis.

---

## Key Capabilities

### 1. Smart Auto-Detection
Upload any CSV — the app identifies the data type automatically by examining column headers. No manual configuration needed.

### 2. Multi-Source Correlation
The app automatically correlates data across sources:
- **Jams ↔ Equipment Changes**: Identifies equipment changes within ±30 minutes of jam events
- **Shipments → CPT Misses**: Derives CPT miss data from shipment-level detail
- **Packages → Chute Analysis**: Links missorts to specific chute configurations

### 3. Actionable Top Offender Analysis
Instead of raw data tables, the app surfaces:
- Top 5 chutes with most jams
- Routes with highest DEA miss rate
- Users making the most equipment changes
- Shifts with most CPT misses

### 4. Zero Data Exposure
All processing happens in the browser. Data is stored in `localStorage` and never transmitted anywhere.

---

## Data Flow

```
CSV File Upload
      │
      ▼
┌─────────────────┐
│  PapaParse       │  Parses CSV into rows
│  (client-side)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-Detect     │  Identifies data type from columns
│  Engine          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Type-Specific   │  Extracts relevant fields, cleans data
│  Parser          │  (dates, chute names, deduplication)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Store      │  In-memory JS object + localStorage
│  (D object)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Render Engine   │  KPI cards, Chart.js charts, HTML tables
│                  │  Correlation analysis, Top offenders
└─────────────────┘
```

---

## Supported Data Formats

### Shipment Level Detail
| Column | Required | Example |
|--------|----------|---------|
| amazon_barcode | ✅ | TBA932847561000 |
| first_slam_time | ✅ | 2024-03-15 06:23:11 |
| route | ✅ | CX-4521 |
| last_chute | | F12 |
| level_0 | | Good / Sortation |
| lumin_dea_level_1 | | On Time / FC Missort |
| dea_bucket | | Good - On Time |
| cpt | | 2024-03-15 08:00:00 |
| departure_time | | 2024-03-15 07:45:00 |

### Alarms / Jam History
| Column | Required | Example |
|--------|----------|---------|
| Active Time | ✅ | 2024-03-15 06:45:22 |
| Duration | ✅ | 45 |
| Description | ✅ | CHUTE 12 PHOTO BLOCKED |
| Area | | Zone A |

### Equipment Changes
| Column | Required | Example |
|--------|----------|---------|
| date | ✅ | 2024-03-15 |
| time | | 06:30:00 |
| user_id | ✅ | jsmith42 |
| change_made | ✅ | Chute F18 destination updated |
| type_of_change | ✅ | Divert Destination |
| current | | CX-7832 |
| previous | | CX-4521 |

### CPT Tracker
| Column | Required | Example |
|--------|----------|---------|
| lane | ✅ | CX-4521 |
| shift | | Day |
| date | ✅ | 2024-03-15 |
| cpt_time | | 08:00 |
| bucket | | Late to SLAM |
| location | | F12 |

### Package / Missort Detail
| Column | Required | Example |
|--------|----------|---------|
| amazon_barcode | ✅ | TBA932847561002 |
| slam_date | | 2024-03-15 |
| route | | CX-7832 |
| last_chute | | F18 |
| L0_bucket | ✅ | FC Missort |
| L1_bucket | | Wrong Route |
| L2_bucket | | Divert to Wrong Lane |

---

## How to Use

1. **Navigate** to the dashboard URL
2. **Click "Upload CSV"** or drag-and-drop files onto the page
3. **Upload multiple files** at once — the app handles them all
4. **Switch between tabs** to explore different analysis views:
   - **Overview**: High-level KPIs and summary charts
   - **Shipments**: Package-level DEA analysis
   - **Missorts**: Detailed missort breakdown by chute and bucket
   - **Jams**: Alarm history with duration analysis
   - **CPT**: Critical Pull Time miss analysis
   - **Equipment**: Configuration change audit log
5. **Data persists** across page refreshes (stored in browser)
6. **Click "Clear All"** to reset and start fresh

---

## Technical Details

- **Frontend**: Vanilla JavaScript (no React/Vue/Angular)
- **Charts**: Chart.js 4.x (UMD bundle, included locally)
- **CSV Parsing**: PapaParse 5.x (included locally)
- **Server**: Node.js 18 + Express.js (static file serving only)
- **Container**: Docker (node:18-alpine base)
- **Hosting**: Canopy (internal platform)
- **Bundle Size**: < 500KB total (HTML + JS + libs)

---

## Deployment Architecture

```
┌────────────────────────────┐
│       Canopy Platform       │
│  ┌──────────────────────┐  │
│  │   Docker Container    │  │
│  │   node:18-alpine      │  │
│  │                        │  │
│  │   Express.js (port    │  │
│  │   3000) serves static │  │
│  │   HTML/JS/CSS files   │  │
│  │                        │  │
│  │   /health endpoint    │  │
│  │   for health checks   │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

No database. No backend API. No data storage on server.
All analytics computed in the user's browser.
