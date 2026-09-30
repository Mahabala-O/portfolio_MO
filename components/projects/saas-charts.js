import { useState } from 'react'

import {
  BarChart,
  DotPlot,
  Figure,
  LineChart,
  StackedBars,
  StatRow,
  pct,
  rate
} from '../charts'
import {
  months,
  planBilling,
  reasonsByPlan,
  segments,
  trend,
  usageBands
} from '../../lib/data/saas'

const ALL = segments.plan.reduce(
  (sum, d) => ({
    customers: sum.customers + d.customers,
    churned: sum.churned + d.churned
  }),
  { customers: 0, churned: 0 }
)
const AVERAGE = rate(ALL.churned, ALL.customers)

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
const monthLabel = (m, long) => {
  const [year, month] = m.split('-')
  return long ? `${MONTH_NAMES[month - 1]} ${year}` : year
}
const money = (v, long) =>
  long ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v / 1000)}K`
const count = (n) => n.toLocaleString('en-US')

export function SaasStats() {
  const last = months[months.length - 1]
  const yearAgo = months[months.length - 13]
  return (
    <StatRow
      items={[
        {
          label: 'Customers',
          value: count(ALL.customers),
          detail: 'since Jan 2022'
        },
        {
          label: 'Churned',
          value: pct(AVERAGE),
          detail: `${ALL.churned} customers`
        },
        {
          label: 'MRR, Dec 2025',
          value: money(last.mrr),
          detail: `up ${pct(rate(last.mrr - yearAgo.mrr, yearAgo.mrr))} in 2025`
        },
        { label: 'Risk score AUC', value: '0.94', detail: '1.0 is perfect' }
      ]}
    />
  )
}

const SEGMENT_TABS = [
  ['plan', 'Plan'],
  ['billing', 'Billing'],
  ['size', 'Company size'],
  ['region', 'Region'],
  ['channel', 'Channel'],
  ['industry', 'Industry']
]

export function ChurnBySegment() {
  const [tab, setTab] = useState('plan')
  const data = segments[tab].map((d) => ({
    ...d,
    value: rate(d.churned, d.customers)
  }))

  return (
    <Figure
      title="Churn rate by customer segment"
      subtitle={`Share of customers who have churned. Blue bars are above the ${pct(AVERAGE)} average.`}
      table={{
        columns: ['Segment', 'Group', 'Customers', 'Churned', 'Churn rate'],
        rows: SEGMENT_TABS.flatMap(([key, name]) =>
          segments[key].map((d) => [
            name,
            d.label,
            d.customers,
            d.churned,
            pct(rate(d.churned, d.customers), 1)
          ])
        )
      }}
    >
      <div className="viz-tabs" role="group" aria-label="Segment">
        {SEGMENT_TABS.map(([key, name]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {name}
          </button>
        ))}
      </div>
      <BarChart
        data={data}
        max={80}
        format={(v) => pct(v)}
        emphasis={(d) => d.value > AVERAGE}
        reference={{ value: AVERAGE, label: `Average ${pct(AVERAGE)}` }}
        tip={(d) => ({
          title: d.label,
          rows: [
            { label: 'churn rate', value: pct(d.value, 1) },
            { label: 'churned', value: `${d.churned} of ${d.customers}` }
          ]
        })}
      />
    </Figure>
  )
}

const BILLING_SERIES = [
  { key: 'monthly', label: 'Monthly billing', color: 'var(--viz-2)' },
  { key: 'annual', label: 'Annual billing', color: 'var(--viz-1)' }
]

export function BillingByPlan() {
  const data = planBilling.map((d) => ({
    label: d.plan,
    monthly: rate(d.monthly.churned, d.monthly.customers),
    annual: rate(d.annual.churned, d.annual.customers),
    raw: d
  }))
  return (
    <Figure
      title="Annual billing lowers churn within each plan"
      subtitle="Churn rate by plan and billing cycle"
      legend={BILLING_SERIES.map((s) => ({ ...s, shape: 'dot' }))}
      table={{
        columns: [
          'Plan',
          'Monthly: churned / customers',
          'Monthly rate',
          'Annual: churned / customers',
          'Annual rate'
        ],
        rows: data.map((d) => [
          d.label,
          `${d.raw.monthly.churned} / ${d.raw.monthly.customers}`,
          pct(d.monthly, 1),
          `${d.raw.annual.churned} / ${d.raw.annual.customers}`,
          pct(d.annual, 1)
        ])
      }}
    >
      <DotPlot
        data={data}
        series={BILLING_SERIES}
        domain={[0, 80]}
        ticks={[0, 20, 40, 60, 80]}
        format={(v) => pct(v)}
        tip={(d) => ({
          title: d.label,
          rows: BILLING_SERIES.map((s) => ({
            label: `${s.label.toLowerCase()} (${d.raw[s.key].customers} customers)`,
            value: pct(d[s.key], 1),
            color: s.color
          }))
        })}
      />
    </Figure>
  )
}

const REASON_SERIES = [
  {
    key: 'cost',
    label: 'Cost (budget cuts, price too high)',
    color: 'var(--viz-1)',
    ink: 'var(--viz-1-ink)'
  },
  {
    key: 'features',
    label: 'Missing features',
    color: 'var(--viz-2)',
    ink: 'var(--viz-2-ink)'
  },
  {
    key: 'other',
    label: 'All other reasons',
    color: 'var(--viz-gray)',
    ink: 'var(--viz-gray-ink)'
  }
]

export function ReasonsByPlan() {
  const data = reasonsByPlan.map((d) => {
    const total = Object.values(d).reduce(
      (sum, v) => (typeof v === 'number' ? sum + v : sum),
      0
    )
    const cost = d.budgetCuts + d.priceTooHigh
    return {
      label: d.plan,
      caption:
        total < 20 ? `${total} churned, small sample` : `${total} churned`,
      cost,
      features: d.missingFeatures,
      other: total - cost - d.missingFeatures,
      total,
      raw: d
    }
  })
  return (
    <Figure
      title="Cost drives churn on cheaper plans"
      subtitle="Why churned customers left, as a share of each plan's churn"
      legend={REASON_SERIES}
      note="All other reasons: company closed, no longer needed, poor support, switched to a competitor."
      table={{
        columns: [
          'Plan',
          'Budget cuts',
          'Price too high',
          'Missing features',
          'No longer needed',
          'Poor support',
          'Switched competitor',
          'Company closed'
        ],
        rows: data.map(({ label, raw }) => [
          label,
          raw.budgetCuts,
          raw.priceTooHigh,
          raw.missingFeatures,
          raw.noLongerNeeded,
          raw.poorSupport,
          raw.switchedCompetitor,
          raw.companyClosed
        ])
      }}
    >
      <StackedBars
        data={data}
        series={REASON_SERIES}
        tip={(d, s, share) => ({
          title: `${d.label}: ${s.label.split(' (')[0].toLowerCase()}`,
          rows: [
            {
              label: `${d[s.key]} of ${d.total} churned customers`,
              value: pct(share)
            }
          ]
        })}
      />
    </Figure>
  )
}

const JANUARIES = months.flatMap((m, i) => (m.month.endsWith('-01') ? [i] : []))

export function MrrChart() {
  const labels = months.map((m) => m.month)
  const start2025 = labels.indexOf('2025-01')
  return (
    <Figure
      title="Monthly recurring revenue"
      subtitle="Grew steadily for three years, then flattened in 2025"
      legend={[
        { label: 'MRR', color: 'var(--viz-accent)', shape: 'line' },
        {
          label: 'Linear trend (R² 0.97)',
          color: 'var(--viz-trend)',
          shape: 'line'
        }
      ]}
      table={{
        columns: ['Month', 'MRR', 'Active customers', 'New', 'Churned'],
        rows: months.map((m) => [
          monthLabel(m.month, true),
          money(m.mrr, true),
          m.active,
          m.new,
          m.churned
        ])
      }}
    >
      <LineChart
        labels={labels}
        xTicks={JANUARIES}
        xFormat={monthLabel}
        yFormat={money}
        bands={[
          { from: start2025, to: labels.length - 1, label: 'Growth slows' }
        ]}
        series={[
          {
            label: 'MRR',
            color: 'var(--viz-accent)',
            values: months.map((m) => (m.mrr ? m.mrr : null))
          },
          {
            label: 'linear trend',
            color: 'var(--viz-trend)',
            width: 1.5,
            values: months.map((m, i) =>
              i ? trend.intercept + trend.slope * i : null
            )
          }
        ]}
      />
    </Figure>
  )
}

export function ChurnRateChart() {
  const from = months.findIndex((m) => m.month === '2023-01')
  const shown = months.slice(from)
  const spike = shown.findIndex((m) => m.month === '2025-04')
  return (
    <Figure
      title="Monthly churn rate, 2023–2025"
      subtitle="Share of active customers lost each month"
      table={{
        columns: ['Month', 'Churn rate', 'Churned', 'Active at start'],
        rows: months.map((m) => [
          monthLabel(m.month, true),
          pct(m.churnRate, 2),
          m.churned,
          m.active
        ])
      }}
      note="2022 is left out: with under 100 customers, one or two cancellations swung the rate as high as 20%."
    >
      <LineChart
        labels={shown.map((m) => m.month)}
        xTicks={JANUARIES.filter((i) => i >= from).map((i) => i - from)}
        xFormat={monthLabel}
        yMax={8}
        yFormat={(v, long) => pct(v, long ? 1 : 0)}
        height={200}
        markers={[
          {
            index: spike,
            label: 'Apr–May 2025: 32 lost',
            anchor: 'end',
            dx: -8,
            dy: -2
          }
        ]}
        series={[
          {
            label: 'churn rate',
            color: 'var(--viz-accent)',
            values: shown.map((m) => m.churnRate)
          }
        ]}
      />
    </Figure>
  )
}

export function UsageChart() {
  const data = usageBands.map((d) => ({
    ...d,
    value: rate(d.churned, d.customers)
  }))
  return (
    <Figure
      title="Customers who use more of the product don't leave"
      subtitle="Churn rate by share of product features used"
      table={{
        columns: ['Features used', 'Customers', 'Churned', 'Churn rate'],
        rows: data.map((d) => [
          d.label,
          d.customers,
          d.churned,
          pct(d.value, 1)
        ])
      }}
    >
      <BarChart
        data={data}
        max={100}
        format={(v) => pct(v)}
        tip={(d) => ({
          title: `${d.label} of features used`,
          rows: [
            { label: 'churn rate', value: pct(d.value, 1) },
            { label: 'churned', value: `${d.churned} of ${d.customers}` }
          ]
        })}
      />
    </Figure>
  )
}
