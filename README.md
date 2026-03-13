# Phase 1 Survivor

**How Clinical Trials Really End**

An interactive data visualization site showing clinical trial completion, termination, and withdrawal rates across phases, modalities, and therapeutic areas.

[View Live Site](https://kstring99.github.io/phase1-survivor/)

## What It Shows

Most drugs that enter clinical trials never make it to market. This project visualizes that reality using data from [ClinicalTrials.gov](https://clinicaltrials.gov):

- **Success rate by phase** — Phase 2 is where most trials go to die
- **Success rate by intervention type** — Behavioral interventions outperform biologics
- **Heatmap** — 15 therapeutic areas × 4 trial phases
- **Timeline trends** — Are trials getting more successful over time? (Slowly, yes)

## Data Source

All data comes from the [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-api/api). The pipeline queries studies with terminal statuses (completed, terminated, withdrawn) and calculates aggregate rates by phase, intervention type, condition, and time period.

## Running the Pipeline

```bash
pip install -r requirements.txt
python3 data/pipeline.py
```

This fetches live data from ClinicalTrials.gov and writes JSON files to `docs/data/`. The site ships with sample data so it works without running the pipeline.

## Project Structure

```
phase1-survivor/
├── data/
│   └── pipeline.py          # Data fetching & processing
├── docs/                    # GitHub Pages root
│   ├── index.html
│   ├── css/style.css
│   ├── js/charts.js
│   └── data/                # JSON data for charts
│       ├── phase_rates.json
│       ├── modality_rates.json
│       ├── heatmap_data.json
│       └── timeline_data.json
├── requirements.txt
└── README.md
```

## Tech Stack

- **Data pipeline:** Python 3.12, requests, pandas
- **Frontend:** Vanilla HTML/CSS/JS + [Plotly.js](https://plotly.com/javascript/) (CDN)
- **Hosting:** GitHub Pages (serves from `docs/`)
- **Theme:** Dark (#1a1a2e), Inter font, responsive design

## Local Development

To preview the site locally:

```bash
cd docs
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).
