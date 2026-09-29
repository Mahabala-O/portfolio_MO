---
title: SaaS Revenue & Churn Analysis
date: 2026/5/6
description: End-to-end churn and revenue analysis for a B2B SaaS company, delivered as a board-ready package. Covers churn drivers, MRR trends, CLV:CAC, and an at-risk customer score (AUC 0.937).
tag: python, tableau, churn
---

**Role:** Business Analyst · **Context:** board meeting prep for a B2B SaaS company · **Tools:** Python (pandas, SciPy, scikit-learn), Tableau, Notion

[GitHub repo ↗](https://github.com/Mahabala-O/saas-revenue-churn-analysis) · [Full write-up on Notion ↗](https://mahabala.notion.site/SaaS-Revenue-Churn-Analysis-33de583fcafd8009a6d8e67e02d43719)

## The question

CloudTask Pro grew from 0 to 600 customers since 2022. Revenue grew steadily, but the board was worried about a persistently high churn rate. They wanted to know who is leaving, why, what each customer segment is worth, and which active customers are likely to leave next.

## What I found

**Churn.** The overall churn rate is 52.17%. The Starter plan is the only segment above average, at 70.51%. Annual-billing customers churn at 40.32%, compared with 60.51% for monthly, a 20-point gap. Budget cuts and "price too high" together account for about a third of all churn. Lower tiers mostly leave over price, and higher tiers mostly leave over missing product features.

**Revenue.** MRR grew from about $7K to about $290K on a strong linear trend (R² = 0.97, roughly +$6.5K per month). Monthly churn settled into a 2–6% range from mid-2023 onward.

**Unit economics.**

| Plan         | CLV     | CLV:CAC | Avg tenure |
| ------------ | ------- | ------- | ---------- |
| Enterprise   | $76,106 | 379×    | 25.5 mo    |
| Business     | $24,787 | 123×    | 19.0 mo    |
| Professional | $8,137  | 40.5×   | 16.4 mo    |
| Starter      | $2,016  | 10.0×   | 9.4 mo     |

Every plan clears the 3× benchmark. CAC is a blended average ($200.79), because the dataset has no plan-level CAC.

**At-risk customers.** Churned customers used 27% of features on average, compared with 55% for active customers, and their NPS was 3.0 versus 5.8. A composite risk score (50% feature usage, 30% NPS, 20% tenure) flags the 14 highest-risk accounts and reaches an **AUC of 0.937**.

## Recommendations

- Treat the Starter plan as the main churn problem and focus retention work there first.
- Push monthly customers toward annual billing. It is the clearest retention lever in the data.
- Use feature adoption as an early warning signal: 85 active customers (29.6%) already fall below the usage threshold.

## Deliverables

A Jupyter notebook with the full analysis, plus a Tableau story with four dashboards: MRR & churn trends, segment risk, CLV & profitability, and at-risk indicators.
