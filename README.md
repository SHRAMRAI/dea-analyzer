# DEA Analyzer - Sortation Operations Dashboard

> A real-time, client-side analytics dashboard for monitoring and analyzing sortation center operations including DEA (Delivery Experience Accuracy) performance, equipment jams, CPT (Critical Pull Time) misses, and package flow.

**Live App:** [DEA Analyzer on Canopy](https://canopy.fgbs.amazon.dev/apps/dea-analyze/)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Data Sources](#data-sources)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Sample Data](#sample-data)
- [Tech Stack](#tech-stack)

---

## Overview

The DEA Analyzer is a web-based dashboard designed for sortation center operations teams. It provides instant insights by processing CSV exports from various operational systems. All data processing happens **client-side** (in the browser), meaning no data is sent to external servers — it stays on your machine.

The dashboard helps answer critical operational questions:
- **Where are packages being missorted?** (Chute-level breakdown)
- **What's causing DEA failures?** (L0/L1/L2 bucket analysis)
- **Are jams correlated with equipment changes?** (Jam ↔ Equipment correlation)
- **Which lanes are missing CPT?** (CPT miss trends and root causes)
- **What equipment changes were made and by whom?** (Audit trail)

---

## Key Features

### 📊 Multi-Tab Dashboard
| Tab | Purpose |
|-----|---------|
| **Overview** | High-level KPIs, trends, and data quality status |
| **Shipments** | DEA bucket breakdown, route analysis, chute performance |
| **Missorts/Packages** | Package-level detail with L0/L1/L2 bucket analysis |
| **Jams/Alarms** | Jam frequency, duration, top offending chutes, time patterns |
| **CPT** | Critical Pull Time miss analysis by lane, shift, and bucket |
| **Equipment** | Equipment configuration change log with user/system attribution |
| **Investigation** | Cross-reference tool for tracking packages across data sources |

### 🔍 Smart CSV Auto-Detection
Upload any CSV and the app automatically identifies the data type based on column headers:
- Shipment-level exports (QuickSight, ACES)
- Package/missort detail (PerfectMile, deep-dive exports)
- Alarm/jam history exports
- CPT tracker data
- Equipment change logs
- Bulk search results

### 📈 Interactive Visualizations
- Bar charts, doughnut charts, and trend lines (powered by Chart.js)
- Sortable tables with search/filter
- Top offender cards highlighting problem areas
- Date range validation across data sources

### 💾 Persistent Storage
- Data saved to browser `localStorage` — survives page refresh
- Manual clear button to reset all data
- Timestamp shows when data was last saved

### 🔗 Correlation Engine
- Automatically correlates jams with equipment changes (±30 min window)
- Derives CPT miss data from shipment-level detail when no separate tracker is uploaded
- Cross-references packages across bulk search and shipment data

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                      │
│                                                       │
│  ┌─────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │ CSV Drop │──▶│ PapaParse    │──▶│ Auto-Detect  │  │
│  │  Zone    │   │ (Parser)     │   │ Column Type  │  │
│  └─────────┘   └──────────────┘   └──────┬───────┘  │
│                                           │          │
│  ┌────────────────────────────────────────▼────────┐ │
│  │              Data Store (D object)               │ │
│  │  shipments[] | packages[] | alarms[] | cpt[]    │ │
│  │  equip[] | bulksearch[]                         │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                            │
│  ┌──────────────────────▼──────────────────────────┐ │
│  │           Rendering Engine                       │ │
│  │  Chart.js charts | HTML tables | KPI cards      │ │
│  │  Correlation analysis | Top offender ranking    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  localStorage (persistence across sessions)      │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │
         │ (static files served via)
         ▼
┌─────────────────────┐
│  Node.js + Express  │
│  (Static server)    │
│  Port 3000          │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Docker Container   │
│  (alpine-based)     │
│  Canopy Deployment  │
└─────────────────────┘
```

### Key Design Decisions

1. **Client-side processing only** — No backend data processing. All CSV parsing and analytics happen in the browser. This ensures data never leaves the user's machine.

2. **Auto-detection over configuration** — Instead of asking users to specify file types, the app intelligently detects data types from column headers using pattern matching.

3. **Deduplication on merge** — When uploading additional files, the app deduplicates records using composite keys (barcode + route + date) to prevent double-counting.

4. **Derived insights** — When only shipment data is available, the app automatically derives CPT miss analysis and missort data rather than requiring separate uploads.

---

## Data Sources

### 1. Shipment Level Detail
**Source:** QuickSight export, ACES shipment query  
**Key Columns:** `amazon_barcode`, `first_slam_time`, `route`, `last_chute`, `level_0`, `lumin_dea_level_1`, `dea_bucket`, `cpt`, `departure_time`

Provides the foundation for DEA analysis — every package processed through the sortation center with its routing, slam time, and DEA classification.

### 2. Package / Missort Detail
**Source:** PerfectMile dive-deep export, Missort tracking  
**Key Columns:** `amazon_barcode`, `slam_date`, `route`, `last_chute`, `L0_bucket`, `L1_bucket`, `L2_bucket`, `weight_class`

Detailed breakdown of missorted packages including which chute they were diverted to and the classification hierarchy.

### 3. Alarms / Jam History
**Source:** Sorter alarm export (WCS/SCADA)  
**Key Columns:** `Active Time`, `Duration`, `Description`, `Area`

Records of every jam event on the sorter with timestamp, duration, and affected location. Used to identify problem chutes and correlate with equipment changes.

### 4. CPT Tracker
**Source:** CPT miss tracking spreadsheet  
**Key Columns:** `lane`, `shift`, `date`, `cpt_time`, `bucket`, `location`

Tracks which lanes missed their Critical Pull Time, during which shift, and the root cause bucket.

### 5. Equipment Changes
**Source:** Equipment configuration log  
**Key Columns:** `date`, `time`, `user_id`, `change_made`, `type_of_change`, `current`, `previous`

Audit trail of all equipment configuration changes including divert destinations, chute assignments, and who made the change (human vs. system/automation).

### 6. Bulk Search Results
**Source:** Bulk package search tool  
**Key Columns:** `trackingId`, `nodeId`, `hasArrived`, `hasDeparted`, `isClosed`, `scheduledArrivalTime`

Package lifecycle data showing arrival/departure status at the facility, used for cross-referencing and investigation.

---

## How It Works

### Step 1: Upload CSVs
Drag and drop or click to upload one or more CSV files. The app auto-detects each file's type.

### Step 2: Auto-Detection
The detection engine examines column headers and matches against known patterns:
```
Columns contain "amazon_barcode" + "level_0" or "lumin_dea" → Shipments
Columns contain "type_of_change" + "change_made" → Equipment
Columns contain "Active Time" or "Duration" + "Area" → Alarms
Columns contain "lane" + "cpt" + "date" → CPT
Columns contain "trackingId" + "hasArrived" → Bulk Search
```

### Step 3: Data Processing
- Parse raw CSV rows into structured objects
- Convert dates (handles Excel serial numbers, various date formats)
- Clean chute names (e.g., `DFW7-FlatSorter-F77` → `F77`)
- Deduplicate against existing data

### Step 4: Analysis & Visualization
- **KPI Cards:** Total packages, DEA miss rate, jam count, avg jam duration
- **Charts:** Bucket distribution (doughnut), daily trends (bar), hourly patterns (line)
- **Tables:** Sortable detail views with search
- **Correlation:** Jams within 30 min of equipment changes are flagged
- **Top Offenders:** Ranked lists of worst-performing chutes, routes, lanes

### Step 5: Insights
The dashboard generates actionable intelligence:
- "Top 5 chutes with most jams"
- "Routes with highest DEA miss rate"
- "Equipment changes that preceded jam spikes"
- "Shifts with most CPT misses"

---

## Getting Started

### Prerequisites
- Node.js 18+ (for local development)
- Docker (for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/dea-analyzer.git
cd dea-analyzer

# Install dependencies
npm install

# Start the server
npm start

# Open in browser
# http://localhost:3000
```

### Using Sample Data
1. Start the app locally
2. Navigate to `http://localhost:3000`
3. Upload the sample CSV files from the `sample-data/` directory
4. Explore the dashboard tabs to see analysis results

---

## Deployment

### Docker

```bash
# Build the image
docker build -t dea-analyzer .

# Run the container
docker run -p 3000:3000 dea-analyzer
```

### Canopy (Internal)
The app is deployed on Canopy as a containerized web application:
- **Dockerfile** uses `node:18-alpine` base image
- **Health check** at `/health` endpoint
- **Port:** 3000
- Static file serving via Express.js

---

## Sample Data

The `sample-data/` directory contains example CSV files with **synthetic data** demonstrating the expected format for each data type:

| File | Records | Description |
|------|---------|-------------|
| `shipments_sample.csv` | 50 | Package-level shipment data with DEA buckets |
| `packages_sample.csv` | 30 | Missort detail with L0/L1/L2 classification |
| `alarms_sample.csv` | 40 | Sorter jam events with timestamps and durations |
| `cpt_sample.csv` | 25 | CPT miss records by lane and shift |
| `equipment_sample.csv` | 35 | Equipment configuration change audit log |

> ⚠️ **All data in sample files is synthetic/fake.** No real operational data is included.

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Vanilla JavaScript | No framework dependencies, fast loading |
| Charts | Chart.js (UMD bundle) | Interactive bar/doughnut/line charts |
| CSV Parsing | PapaParse | Robust CSV parsing with streaming |
| Server | Express.js | Minimal static file server |
| Container | Docker (Alpine) | Lightweight deployment |
| Platform | Canopy | Internal hosting |

### Why No Framework?
The app is intentionally built with vanilla JS to:
- Minimize bundle size (entire app loads in <500KB)
- Eliminate build steps — just serve static files
- Ensure compatibility with restricted environments
- Keep deployment simple (single Docker layer)

---

## Project Structure

```
dea-analyzer/
├── Dockerfile            # Container configuration
├── .dockerignore         # Files excluded from Docker build
├── package.json          # Node.js project metadata
├── index.js              # Express server (static file serving)
├── public/
│   ├── index.html        # Main dashboard HTML + CSS
│   ├── app.js            # Core application logic
│   ├── investigation.js  # Investigation tab (cross-reference tool)
│   ├── chart.umd.min.js  # Chart.js library
│   ├── papaparse.min.js  # PapaParse CSV library
│   ├── help.html         # Help/documentation page
│   └── missort_interactive.html  # Interactive missort analysis
├── sample-data/
│   ├── shipments_sample.csv
│   ├── packages_sample.csv
│   ├── alarms_sample.csv
│   ├── cpt_sample.csv
│   └── equipment_sample.csv
└── docs/
    └── wiki.md           # This documentation
```

---

## Contributing

1. Export your analysis CSVs from QuickSight/WCS/ACES
2. Upload to the dashboard
3. Identify trends and root causes
4. Take action (reassign chutes, fix equipment, adjust staffing)

---

## License

Internal tool — not for external distribution.

---

*Built for sortation operations teams to drive data-driven decision making at scale.*
