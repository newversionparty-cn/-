#!/usr/bin/env python3
"""Parse ENCORE CSV files to generate industry dependencies and impacts JSON."""

import csv
import json
from pathlib import Path

def parse_encore_data():
    base_path = Path(__file__).parent.parent / "data" / "Updated ENCORE knowledge base September 2025" / "ENCORE files"

    # Parse dependency materiality ratings
    dep_file = base_path / "06. Dependency mat ratings.csv"
    pressure_file = base_path / "07. Pressure mat ratings.csv"

    industries = {}

    # Read dependency ratings
    with open(dep_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        # Ecosystem service names start from column 6
        ecosystem_services = header[6:]

        for row in reader:
            if len(row) < 6:
                continue
            isic_code = row[0]
            section = row[1]
            division = row[2]
            industry_name = row[4]  # ISIC Class

            if not industry_name or industry_name == 'ISIC Class':
                continue

            # Parse dependency ratings
            dependencies = []
            for i, rating in enumerate(row[6:], start=0):
                if i < len(ecosystem_services) and rating in ['VH', 'H', 'M'] and rating != 'ND':
                    dependencies.append({
                        'service': ecosystem_services[i].strip(),
                        'level': rating  # VH=Very High, H=High, M=Medium
                    })

            if industry_name not in industries:
                industries[industry_name] = {
                    'name': industry_name,
                    'section': section,
                    'division': division,
                    'isic_code': isic_code,
                    'dependencies': [],
                    'dependency_summary': []
                }

            # Add high/very high dependencies
            high_deps = [d['service'] for d in dependencies if d['level'] in ['VH', 'H']]
            if high_deps:
                industries[industry_name]['dependency_summary'] = high_deps[:5]  # Top 5

    # Read pressure ratings
    with open(pressure_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        pressure_services = header[6:]

        for row in reader:
            if len(row) < 6:
                continue
            industry_name = row[4]

            if industry_name not in industries:
                continue

            # Parse pressure ratings
            pressures = []
            for i, rating in enumerate(row[6:], start=0):
                if i < len(pressure_services) and rating in ['VH', 'H', 'M'] and rating != 'ND':
                    pressures.append({
                        'pressure': pressure_services[i].strip(),
                        'level': rating
                    })

            high_impacts = [p['pressure'] for p in pressures if p['level'] in ['VH', 'H']]
            industries[industry_name]['impact_summary'] = high_impacts[:5]  # Top 5

    # Convert to list and simplify
    result = []
    for ind in industries.values():
        result.append({
            'industry': ind['name'],
            'section': ind['section'],
            'dependencies': ind.get('dependency_summary', []),
            'impacts': ind.get('impact_summary', [])
        })

    # Group by section
    by_section = {}
    for item in result:
        section = item['section']
        if section not in by_section:
            by_section[section] = []
        by_section[section].append({
            'industry': item['industry'],
            'dependencies': item['dependencies'],
            'impacts': item['impacts']
        })

    output = {
        'version': 'Sept 2025',
        'source': 'ENCORE - encoreforcapital.org',
        'by_section': by_section,
        'industries': result
    }

    return output

if __name__ == '__main__':
    output = parse_encore_data()
    output_path = Path(__file__).parent.parent / 'data' / 'encore_industry_data.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Generated {output_path}")
    print(f"Total industries: {len(output['industries'])}")
