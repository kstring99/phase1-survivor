#!/usr/bin/env python3
"""
Phase 1 Survivor — Clinical Trial Data Pipeline

Fetches clinical trial data from ClinicalTrials.gov API v2,
processes it into aggregate statistics, and outputs JSON files
for the frontend visualization.
"""

import json
import os
import time
from collections import defaultdict
from pathlib import Path

import pandas as pd
import requests

API_BASE = "https://clinicaltrials.gov/api/v2/studies"
OUTPUT_DIR = Path(__file__).parent.parent / "docs" / "data"

PHASES = ["PHASE1", "PHASE2", "PHASE3", "PHASE4"]
PHASE_LABELS = {"PHASE1": "Phase 1", "PHASE2": "Phase 2", "PHASE3": "Phase 3", "PHASE4": "Phase 4"}

COMPLETED_STATUSES = {"COMPLETED"}
FAILED_STATUSES = {"TERMINATED", "WITHDRAWN", "SUSPENDED"}
ALL_TERMINAL = COMPLETED_STATUSES | FAILED_STATUSES

CONDITIONS = [
    "cancer", "diabetes", "alzheimer", "heart failure",
    "asthma", "depression", "HIV", "hepatitis",
    "arthritis", "obesity", "hypertension", "stroke",
    "epilepsy", "parkinsons", "multiple sclerosis"
]

INTERVENTION_TYPES = ["DRUG", "BIOLOGICAL", "DEVICE", "PROCEDURE", "BEHAVIORAL", "OTHER"]

# Year ranges for timeline analysis
YEAR_RANGES = list(range(2004, 2025, 2))


def fetch_studies(params, max_pages=5):
    """Fetch studies from ClinicalTrials.gov API v2."""
    all_studies = []
    page_token = None

    for page in range(max_pages):
        req_params = {**params, "pageSize": 100}
        if page_token:
            req_params["pageToken"] = page_token

        try:
            resp = requests.get(API_BASE, params=req_params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except (requests.RequestException, json.JSONDecodeError) as e:
            print(f"  API error: {e}")
            break

        studies = data.get("studies", [])
        all_studies.extend(studies)

        page_token = data.get("nextPageToken")
        if not page_token:
            break

        time.sleep(0.3)  # Rate limiting

    return all_studies


def extract_study_info(study):
    """Extract relevant fields from a study record."""
    protocol = study.get("protocolSection", {})
    status_mod = protocol.get("statusModule", {})
    design_mod = protocol.get("designModule", {})
    arms_mod = protocol.get("armsInterventionsModule", {})
    id_mod = protocol.get("identificationModule", {})
    status_dates = status_mod.get("statusVerifiedDate", "")

    overall_status = status_mod.get("overallStatus", "UNKNOWN")
    phases = design_mod.get("phases", [])
    interventions = arms_mod.get("interventions", [])
    intervention_types = list({i.get("type", "OTHER") for i in interventions}) if interventions else ["OTHER"]

    start_date = status_mod.get("startDateStruct", {}).get("date", "")
    start_year = None
    if start_date:
        try:
            start_year = int(start_date.split("-")[0]) if "-" in start_date else int(start_date[:4])
        except (ValueError, IndexError):
            pass

    return {
        "status": overall_status,
        "phases": phases,
        "intervention_types": intervention_types,
        "start_year": start_year,
        "title": id_mod.get("briefTitle", ""),
    }


def compute_rates(studies_info):
    """Compute completion/termination/withdrawal rates from study info list."""
    terminal = [s for s in studies_info if s["status"] in ALL_TERMINAL]
    total = len(terminal)
    if total == 0:
        return {"completed": 0, "terminated": 0, "withdrawn": 0, "total": 0}

    completed = sum(1 for s in terminal if s["status"] in COMPLETED_STATUSES)
    terminated = sum(1 for s in terminal if s["status"] == "TERMINATED")
    withdrawn = sum(1 for s in terminal if s["status"] == "WITHDRAWN")

    return {
        "completed": round(completed / total * 100, 1),
        "terminated": round(terminated / total * 100, 1),
        "withdrawn": round(withdrawn / total * 100, 1),
        "total": total,
    }


def build_phase_data():
    """Build success rate by phase."""
    print("Fetching data by phase...")
    results = {}

    for phase in PHASES:
        print(f"  {PHASE_LABELS[phase]}...")
        studies = fetch_studies({
            "filter.overallStatus": "COMPLETED|TERMINATED|WITHDRAWN",
            "filter.advanced": f"AREA[Phase]{phase}",
            "countTotal": "true",
        }, max_pages=10)

        infos = [extract_study_info(s) for s in studies]
        rates = compute_rates(infos)
        results[PHASE_LABELS[phase]] = rates

    return results


def build_modality_data():
    """Build success rate by intervention type."""
    print("Fetching data by intervention type...")
    results = {}

    for itype in INTERVENTION_TYPES:
        print(f"  {itype}...")
        studies = fetch_studies({
            "filter.overallStatus": "COMPLETED|TERMINATED|WITHDRAWN",
            "filter.advanced": f"AREA[InterventionType]{itype}",
            "countTotal": "true",
        }, max_pages=8)

        infos = [extract_study_info(s) for s in studies]
        rates = compute_rates(infos)
        results[itype.title()] = rates

    return results


def build_heatmap_data():
    """Build therapeutic area x phase heatmap."""
    print("Fetching heatmap data (condition × phase)...")
    results = {}

    for condition in CONDITIONS:
        results[condition.title()] = {}
        for phase in PHASES:
            print(f"  {condition} / {PHASE_LABELS[phase]}...")
            studies = fetch_studies({
                "query.cond": condition,
                "filter.overallStatus": "COMPLETED|TERMINATED|WITHDRAWN",
                "filter.advanced": f"AREA[Phase]{phase}",
            }, max_pages=3)

            infos = [extract_study_info(s) for s in studies]
            rates = compute_rates(infos)
            results[condition.title()][PHASE_LABELS[phase]] = rates

    return results


def build_timeline_data():
    """Build timeline trend data."""
    print("Fetching timeline data...")
    results = {}

    for phase in PHASES:
        results[PHASE_LABELS[phase]] = {}
        for i, start_year in enumerate(YEAR_RANGES):
            end_year = YEAR_RANGES[i + 1] if i + 1 < len(YEAR_RANGES) else 2025
            period = f"{start_year}-{end_year}"
            print(f"  {PHASE_LABELS[phase]} / {period}...")

            studies = fetch_studies({
                "filter.overallStatus": "COMPLETED|TERMINATED|WITHDRAWN",
                "filter.advanced": f"AREA[Phase]{phase} AND AREA[StartDate]RANGE[{start_year}-01-01,{end_year}-01-01]",
            }, max_pages=5)

            infos = [extract_study_info(s) for s in studies]
            rates = compute_rates(infos)
            results[PHASE_LABELS[phase]][period] = rates

    return results


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Phase 1 Survivor — Data Pipeline")
    print("=" * 60)

    # Build all datasets
    phase_data = build_phase_data()
    modality_data = build_modality_data()
    heatmap_data = build_heatmap_data()
    timeline_data = build_timeline_data()

    # Write JSON files
    datasets = {
        "phase_rates.json": phase_data,
        "modality_rates.json": modality_data,
        "heatmap_data.json": heatmap_data,
        "timeline_data.json": timeline_data,
    }

    for filename, data in datasets.items():
        output_path = OUTPUT_DIR / filename
        with open(output_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Wrote {output_path}")

    print("\nDone! All data files written to docs/data/")


if __name__ == "__main__":
    main()
