import { BarChart, Figure, ScatterPlot, StatRow, TileMap, pct } from '../charts'
import { fuelMix, states } from '../../lib/data/ev'

const TOTAL = states.reduce((sum, s) => sum + s.total, 0)
const TOTAL_EV = states.reduce((sum, s) => sum + s.ev, 0)
const NATIONAL = (TOTAL_EV / TOTAL) * 100

const withShare = states.map((s) => ({
  ...s,
  share: (s.ev / s.total) * 100,
  // EVs the state would need to reach the national average share
  gap: (NATIONAL / 100) * s.total - s.ev
}))
const byCode = Object.fromEntries(withShare.map((s) => [s.code, s]))

// The three states recommended on the project page
const PRIORITY = ['TX', 'OH', 'PA']

const millions = (n) => `${(n / 1e6).toFixed(1)}M`
const thousands = (n) => `${Math.round(n / 1000)}K`
const share = (v) => (v < 0.1 ? '<0.1%' : pct(v, v < 5 ? 2 : 1))

function stateTip(s) {
  return {
    title: s.name,
    rows: [
      { label: 'EV share', value: pct(s.share, 2) },
      { label: 'EVs', value: s.ev.toLocaleString('en-US') },
      { label: 'vehicles', value: millions(s.total) }
    ]
  }
}

export function EvStats() {
  const ca = byCode.CA
  const outside = ((TOTAL_EV - ca.ev) / (TOTAL - ca.total)) * 100
  const lowest = withShare.reduce((a, b) => (a.share < b.share ? a : b))
  return (
    <StatRow
      items={[
        {
          label: 'U.S. vehicles that are EVs',
          value: pct(NATIONAL, 2),
          detail: `${millions(TOTAL_EV)} of ${Math.round(TOTAL / 1e6)}M`
        },
        {
          label: 'Share of all EVs in California',
          value: pct((ca.ev / TOTAL_EV) * 100)
        },
        { label: 'EV share outside California', value: pct(outside, 2) },
        {
          label: `California vs ${lowest.name}`,
          value: `${Math.round(ca.share / lowest.share)}×`
        }
      ]}
    />
  )
}

export function FuelMixChart() {
  const data = fuelMix.map((d) => ({ ...d, value: (d.vehicles / TOTAL) * 100 }))
  return (
    <Figure
      title="What the U.S. fleet runs on"
      subtitle={`Share of ${Math.round(TOTAL / 1e6)} million registered vehicles by fuel type`}
      table={{
        columns: ['Fuel type', 'Vehicles', 'Share'],
        rows: data.map((d) => [
          d.label,
          d.vehicles.toLocaleString('en-US'),
          pct(d.value, 3)
        ])
      }}
    >
      <BarChart
        data={data}
        format={share}
        emphasis={(d) => d.label === 'Electric (EV)'}
        tip={(d) => ({
          title: d.label,
          rows: [
            { label: 'of vehicles', value: pct(d.value, 2) },
            { label: 'vehicles', value: d.vehicles.toLocaleString('en-US') }
          ]
        })}
      />
    </Figure>
  )
}

const BINS = [
  { below: 0.5, label: 'Under 0.5%' },
  { below: 1, label: '0.5–1%' },
  { below: 1.5, label: '1–1.5%' },
  { below: 2, label: '1.5–2%' },
  { below: Infinity, label: '2% or more' }
]

export function EvTileMap() {
  const ranked = [...withShare].sort((a, b) => b.share - a.share)
  return (
    <Figure
      title="EV share of registered vehicles by state"
      subtitle="Each square is a state (plus D.C.), placed roughly where it sits on the map"
      table={{
        columns: ['Rank', 'State', 'EV share', 'EVs', 'All vehicles'],
        rows: ranked.map((s, i) => [
          i + 1,
          s.name,
          pct(s.share, 2),
          s.ev.toLocaleString('en-US'),
          s.total.toLocaleString('en-US')
        ])
      }}
    >
      <TileMap
        data={withShare.map((s) => ({ ...s, value: s.share }))}
        bins={BINS}
        tip={stateTip}
      />
    </Figure>
  )
}

// Which states get a text label, where it sits, and (for the less important
// ones) the chart width below which the label is dropped to avoid crowding.
const TAGS = {
  CA: ['left'],
  TX: ['left'],
  OH: ['below'],
  PA: ['left'],
  FL: ['above'],
  WA: ['right', 480],
  DC: ['right', 480],
  GA: ['left', 480],
  MI: ['below', 480]
}

export function FleetScatter() {
  return (
    <Figure
      title="Big fleets, low EV share"
      subtitle="Each dot is a state. Blue dots are the three recommended states."
      table={{
        columns: ['State', 'Vehicles', 'EV share'],
        rows: [...withShare]
          .sort((a, b) => b.total - a.total)
          .map((s) => [s.name, millions(s.total), pct(s.share, 2)])
      }}
    >
      <ScatterPlot
        points={withShare.map((s) => ({
          label: s.code,
          x: s.total,
          y: s.share,
          highlight: PRIORITY.includes(s.code),
          tag: TAGS[s.code] ? s.code : null,
          tagPosition: TAGS[s.code]?.[0],
          tagMinWidth: TAGS[s.code]?.[1],
          state: s
        }))}
        xLog
        xDomain={[250e3, 50e6]}
        xTicks={[5e5, 1e6, 2e6, 5e6, 10e6, 20e6]}
        xFormat={(v) => `${v / 1e6}M`}
        xLabel="Registered vehicles (log scale)"
        yDomain={[0, 3.6]}
        yTicks={[0, 1, 2, 3]}
        yFormat={(v) => `${v}%`}
        yLabel="EV share"
        reference={{
          value: NATIONAL,
          label: `U.S. average ${pct(NATIONAL, 2)}`
        }}
        tip={(p) => stateTip(p.state)}
      />
    </Figure>
  )
}

export function GapChart() {
  const top = [...withShare].sort((a, b) => b.gap - a.gap).slice(0, 8)
  return (
    <Figure
      title="EVs short of the national average"
      subtitle={`How many more EVs each state would need to reach ${pct(NATIONAL, 2)}. Top 8 states.`}
      table={{
        columns: ['State', 'EVs short', 'EV share', 'Vehicles'],
        rows: [...withShare]
          .filter((s) => s.gap > 0)
          .sort((a, b) => b.gap - a.gap)
          .map((s) => [
            s.name,
            Math.round(s.gap).toLocaleString('en-US'),
            pct(s.share, 2),
            millions(s.total)
          ])
      }}
    >
      <BarChart
        data={top.map((s) => ({ ...s, label: s.name, value: s.gap }))}
        format={thousands}
        emphasis={(d) => PRIORITY.includes(d.code)}
        tip={(d) => ({
          title: d.name,
          rows: [
            {
              label: 'EVs short of average',
              value: Math.round(d.gap).toLocaleString('en-US')
            },
            { label: 'EV share', value: pct(d.share, 2) },
            { label: 'vehicles', value: millions(d.total) }
          ]
        })}
      />
    </Figure>
  )
}
