---
title: U.S. Electric Vehicle Market Share
date: 2026/4/15
description: State-level analysis of EV, PHEV, and hybrid adoption across all 50 states and D.C. California leads at 3.41% EV share, while the bottom states sit below 0.2%, a 20× gap.
tag: python, tableau, market-analysis
---

**Tools:** Python (pandas) in Jupyter, Tableau, Notion

[GitHub repo ↗](https://github.com/Mahabala-O/Analyzing-U.S.-Electric-Vehicle-Market-Share) · [Full report on Notion ↗](https://mahabala.notion.site/U-S-Electric-Vehicle-Market-Share-Analysis-Findings-Report-335e583fcafd8145b429eea97e5f18f4)

## The question

Where in the U.S. are people actually buying electric vehicles, and where should EV infrastructure investment go next?

## Approach

I cleaned state-level vehicle registration data for all 50 states and D.C., then calculated market share for battery EVs, plug-in hybrids, hybrids, and gasoline vehicles. From there I ranked states by adoption and compared California with the other large-population states (Texas, Florida, New York).

![U.S. EV registrations by state](https://raw.githubusercontent.com/Mahabala-O/Analyzing-U.S.-Electric-Vehicle-Market-Share/HEAD/images/us-ev-registrations-map.png)

## What I found

- **California leads at 3.41% EV adoption.** The lowest-adopting states are below 0.2%, a gap of about 20×.
- Adoption is concentrated in a small number of states. Nationally, gasoline vehicles still make up the overwhelming majority of the fleet.
- Texas, Florida, and New York have large populations, but all three trail California's EV share by a wide margin.

![Top states by EV adoption rate](https://raw.githubusercontent.com/Mahabala-O/Analyzing-U.S.-Electric-Vehicle-Market-Share/HEAD/images/top-states-ev-adoption-bar.png)

## Deliverables

A cleaned dataset and analysis notebook, an interactive Tableau workbook (map, rankings, and fleet composition), and a written findings report with infrastructure recommendations.
