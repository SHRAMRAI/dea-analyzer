# DEA Analyzer - Sortation Operations Dashboard

> A real-time, client-side analytics dashboard for monitoring and analyzing sortation center operations including DEA (Delivery Experience Accuracy) performance, equipment jams, CPT (Critical Pull Time) misses, and package flow.

🔗 **[Live Demo (GitHub Pages)](https://shramrai.github.io/dea-analyzer/)** — Interactive dashboard pre-loaded with sample data

**Internal App:** [DEA Analyzer on Canopy](https://canopy.fgbs.amazon.dev/apps/dea-analyze/)

---

## Table of Contents

- [Why I Built This](#why-i-built-this)
- [What is DEA?](#what-is-dea)
- [Results & Impact](#results--impact)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technologies & Skills](#technologies--skills)
- [Data Sources](#data-sources)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Architecture Decisions](#architecture-decisions)

---

## Why I Built This

During my internship at an Amazon sortation center, I noticed operations teams spent **30-60 minutes per shift** manually cross-referencing Excel spreadsheets to diagnose package flow issues. They had data from 5+ different systems but no unified view. I built this tool to give them instant, actionable insights from a single dashboard.

---

## What is DEA?

**DEA (Delivery Experience Accuracy)** measures whether a package was sorted correctly and made it to the right delivery route on time. When a package is "DEA Good," it means:
- It was inducted into the sorter ✅
- Diverted to the correct chute ✅
- Loaded onto the right truck ✅
- Departed before the CPT (Critical Pull Time) deadline ✅

When any of those steps fail, it becomes a **DEA miss** — meaning the customer's package may arrive late.

### Why Do Missorts Happen?

| Root Cause | What Happens | Example |
|-----------|-------------|---------|
| **FC Missort** | Package diverted to wrong chute/route | Routing table is stale after a lane change |
| **Chute Missort** | Correct route but wrong physical chute | Equipment config points two routes to same chute |
| **Late to SLAM** | Package scanned too late | Induct backup or staffing gap delays processing |
| **Late to Divert** | Package stuck in sorter | Jam blocks the chute, package recirculates |
| **Equipment Jam** | Physical blockage on sorter | Oversized package wedges in chute |

### The Problem This Solves

Operations teams need to answer these questions every shift:
1. **"What's causing our DEA misses today?"** → Bucket breakdown shows if it's missorts, jams, or late processing
2. **"Which chutes keep jamming?"** → Top offender analysis pinpoints problem equipment
3. **"Did someone change a config that caused issues?"** → Equipment change log correlates with jam spikes
4. **"Are we going to miss CPT?"** → CPT tracker shows at-risk lanes before it's too late

Previously this required opening 4-5 spreadsheets, running vlookups, and building pivot tables manually. This dashboard does it in **seconds**.

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

## Results & Impact

| Metric | Before | After |
|--------|--------|-------|
| Time to diagnose DEA issues | 30-60 min (manual Excel) | **< 2 minutes** |
| Data sources cross-referenced | 1-2 at a time | **5 simultaneously** |
| Root cause identification | End of shift (reactive) | **Real-time (proactive)** |
| Jam-to-equipment correlation | Not done | **Automated (±30 min window)** |
| CPT miss visibility | After the fact | **Live tracking by lane** |

### Business Value
- **Reduced analysis time by 95%** — from 45 min average to under 2 minutes
- **Proactive problem solving** — teams identify jam patterns and configuration errors before they cascade
- **Data-driven shift handoffs** — outgoing shift can show incoming shift exactly what happened with evidence
- **Accountability** — equipment change audit trail shows who changed what and when

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

## Technologies & Skills

### Technical Skills Demonstrated

| Category | Skills |
|----------|--------|
| **Frontend Development** | Vanilla JavaScript (ES5/ES6), HTML5, CSS3, responsive design |
| **Data Visualization** | Chart.js (bar, doughnut, line charts), dynamic rendering |
| **Data Engineering** | CSV parsing, data normalization, deduplication, date handling |
| **Algorithm Design** | Auto-detection engine (pattern matching), correlation analysis, statistical aggregation |
| **DevOps** | Docker containerization, health checks, GitHub Actions CI/CD |
| **UX Design** | Dark theme UI, KPI cards, tabbed navigation, drag-and-drop |
| **Architecture** | Client-side processing, zero-trust data handling, localStorage persistence |

### Tools & Libraries

```
JavaScript (Vanilla)  ████████████████████  Core application logic
Chart.js 4.x         ████████████████      Interactive visualizations
PapaParse 5.x        ████████████          CSV parsing & streaming
Express.js           ████████              Static file serving
Docker               ████████              Container deployment
GitHub Actions       ██████                CI/CD pipeline
```

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

## Future Improvements

| Priority | Improvement | Value |
|----------|-------------|-------|
| 🔴 High | **Real-time data feed** — Connect to live data sources via API instead of CSV uploads | Eliminate manual export step entirely |
| 🔴 High | **Alert thresholds** — Configurable alerts when jam rate or miss rate exceeds targets | Proactive notification before problems escalate |
| 🟡 Medium | **Shift handoff report** — Auto-generate summary PDF at end of shift | Standardized communication between shifts |
| 🟡 Medium | **Historical trending** — Week-over-week and month-over-month comparisons | Track improvement over time |
| 🟡 Medium | **Multi-site support** — Compare performance across sortation centers | Identify best practices from top performers |
| 🟢 Nice-to-have | **Predictive jam detection** — ML model based on time-of-day, volume, and equipment age | Prevent jams before they happen |
| 🟢 Nice-to-have | **Mobile responsive** — Tablet-friendly view for floor managers walking the sort | Access insights without going to a desk |

---

## Architecture Decisions

### Why client-side only (no backend)?
**Decision:** All data processing happens in the browser. No data is sent to any server.

**Reasoning:**
- **Data sensitivity** — Sortation data contains package barcodes, routes, and employee IDs. Keeping it client-side means zero data exposure risk.
- **No infrastructure cost** — No database, no API server, no ongoing maintenance burden.
- **Instant deployment** — Just static files. Works on any hosting platform.
- **Offline capable** — Once loaded, works without internet (data persists in localStorage).

### Why Vanilla JavaScript (no React/Vue/Angular)?
**Decision:** Built with plain JavaScript, no framework.

**Reasoning:**
- **Zero build step** — No webpack, no npm build, no transpilation. Edit a file → deploy.
- **< 500KB total bundle** — The entire app loads faster than most framework boilerplate.
- **No dependency rot** — No package vulnerabilities to patch, no breaking upgrades.
- **Environment constraints** — Internal deployment platforms don't always support Node.js build pipelines.

### Why auto-detection over manual configuration?
**Decision:** The app guesses the file type from column headers instead of asking the user.

**Reasoning:**
- **Reduced friction** — Operations teams are busy. Every click/dropdown adds friction.
- **Error prevention** — Users selecting wrong file type leads to garbled data. Auto-detect eliminates that.
- **Flexibility** — Handles slight column name variations across different export sources (QuickSight vs ACES vs manual exports).

### Why Chart.js over D3.js?
**Decision:** Used Chart.js for all visualizations.

**Reasoning:**
- **80/20 rule** — Chart.js covers bar, doughnut, and line charts out of the box. D3 is overkill for this use case.
- **Bundle size** — Chart.js UMD is ~200KB. A comparable D3 setup would be larger and require more code.
- **Maintainability** — Chart.js has a declarative config API. D3 requires imperative SVG manipulation that's harder to maintain.

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
