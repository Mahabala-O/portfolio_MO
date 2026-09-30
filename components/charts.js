import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

// Small, dependency-free chart kit for project pages. Colors come from the
// --viz-* tokens in styles/main.css, so every chart follows the light/dark
// toggle. Each <Figure> can carry a "Show data" table so no value is only
// reachable by hovering.

const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

const TipContext = createContext({ show() {}, hide() {} })
const useTip = () => useContext(TipContext)

export const pct = (value, digits = 0) => `${value.toFixed(digits)}%`
export const rate = (churned, total) => (churned / total) * 100

// Width of an element, measured after mount. SVG charts draw at the real
// pixel width so text stays a readable size on phones.
function useWidth(fallback = 560) {
  const ref = useRef(null)
  const [width, setWidth] = useState(fallback)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.round(el.clientWidth) || fallback)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fallback])
  return [ref, width]
}

export function Figure({ title, subtitle, legend, table, note, children }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)

  const api = {
    show(event, content, anchor) {
      const box = ref.current?.getBoundingClientRect()
      if (!box) return
      let x, y
      if (anchor) {
        x = anchor.x
        y = anchor.y
      } else if (event.type === 'focus' || event.clientX === undefined) {
        const r = event.currentTarget.getBoundingClientRect()
        x = r.left + r.width / 2 - box.left
        y = r.top - box.top
      } else {
        x = event.clientX - box.left
        y = event.clientY - box.top
      }
      setTip({ x, y, flip: x > box.width * 0.6, content })
    },
    hide() {
      setTip(null)
    }
  }

  return (
    <figure className="viz" ref={ref}>
      <figcaption>
        <span className="viz-title">{title}</span>
        {subtitle && <span className="viz-subtitle">{subtitle}</span>}
      </figcaption>
      {legend && <Legend items={legend} />}
      <TipContext.Provider value={api}>{children}</TipContext.Provider>
      {tip && (
        <div
          className="viz-tip"
          role="presentation"
          style={{
            left: tip.x,
            top: tip.y,
            transform: `translate(${tip.flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`
          }}
        >
          <TipContent {...tip.content} />
        </div>
      )}
      {note && <p className="viz-note">{note}</p>}
      {table && <DataTable {...table} />}
    </figure>
  )
}

function TipContent({ title, rows = [] }) {
  return (
    <>
      {title && <div className="viz-tip-title">{title}</div>}
      {rows.map((row) => (
        <div className="viz-tip-row" key={row.label}>
          {row.color && (
            <span className="viz-tip-key" style={{ background: row.color }} />
          )}
          <strong>{row.value}</strong>
          <span>{row.label}</span>
        </div>
      ))}
    </>
  )
}

export function Legend({ items }) {
  return (
    <ul className="viz-legend">
      {items.map(({ label, color, shape = 'box' }) => (
        <li key={label}>
          <span
            className={`viz-swatch viz-swatch-${shape}`}
            style={{ background: color }}
          />
          {label}
        </li>
      ))}
    </ul>
  )
}

function DataTable({ columns, rows, summary = 'Show data' }) {
  return (
    <details className="viz-data">
      <summary>{summary}</summary>
      <div className="viz-data-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// A row of headline numbers.
export function StatRow({ items }) {
  return (
    <dl className="viz-stats">
      {items.map(({ label, value, detail }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="viz-stat-value">{value}</dd>
          {detail && <dd className="viz-stat-detail">{detail}</dd>}
        </div>
      ))}
    </dl>
  )
}

// Horizontal bars. `emphasis(d)` picks which bars get the accent color; the
// rest are gray. `reference` draws one labeled vertical rule (an average).
export function BarChart({
  data,
  format = (v) => v,
  max,
  emphasis = () => true,
  reference,
  tip
}) {
  const t = useTip()
  const top = (max ?? Math.max(...data.map((d) => d.value))) * 1.18
  const x = (v) => `${(v / top) * 100}%`

  return (
    <div className="viz-bars">
      {reference && (
        <div className="viz-bar-row viz-ref-row" aria-hidden="true">
          <span />
          <span className="viz-bar-track">
            <span
              className="viz-ref-label"
              style={{ left: x(reference.value) }}
            >
              {reference.label}
            </span>
          </span>
        </div>
      )}
      {data.map((d) => (
        <div className="viz-bar-row" key={d.label}>
          <span className="viz-bar-label">{d.label}</span>
          <span
            className="viz-bar-track"
            onPointerMove={tip ? (e) => t.show(e, tip(d)) : undefined}
            onPointerLeave={tip ? t.hide : undefined}
          >
            {reference && (
              <span className="viz-ref" style={{ left: x(reference.value) }} />
            )}
            <span
              className="viz-bar"
              style={{
                width: x(d.value),
                background: emphasis(d)
                  ? 'var(--viz-accent)'
                  : 'var(--viz-gray)'
              }}
            />
            <span className="viz-bar-value">{format(d.value)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// Two values per row on one scale (e.g. monthly vs annual), joined by a line.
export function DotPlot({
  data,
  series,
  domain = [0, 100],
  ticks,
  format,
  tip
}) {
  const t = useTip()
  const x = (v) => `${((v - domain[0]) / (domain[1] - domain[0])) * 100}%`

  return (
    <div className="viz-dots">
      {data.map((d) => {
        const values = series.map((s) => d[s.key])
        const lo = Math.min(...values)
        const hi = Math.max(...values)
        const close = hi - lo < 6
        return (
          <div className="viz-bar-row" key={d.label}>
            <span className="viz-bar-label">{d.label}</span>
            <span
              className="viz-dot-track"
              onPointerMove={tip ? (e) => t.show(e, tip(d)) : undefined}
              onPointerLeave={tip ? t.hide : undefined}
            >
              {ticks.map((v) => (
                <span key={v} className="viz-grid" style={{ left: x(v) }} />
              ))}
              <span
                className="viz-dot-link"
                style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }}
              />
              {series.map((s) => (
                <span
                  key={s.key}
                  className="viz-dot"
                  style={{ left: x(d[s.key]), background: s.color }}
                />
              ))}
              {close ? (
                <span
                  className="viz-dot-value"
                  style={{ left: x(hi), marginLeft: 10 }}
                >
                  {format(hi)} both
                </span>
              ) : (
                <>
                  <span
                    className="viz-dot-value viz-dot-value-left"
                    style={{ left: x(lo) }}
                  >
                    {format(lo)}
                  </span>
                  <span
                    className="viz-dot-value"
                    style={{ left: x(hi), marginLeft: 10 }}
                  >
                    {format(hi)}
                  </span>
                </>
              )}
            </span>
          </div>
        )
      })}
      <div className="viz-bar-row viz-axis-row" aria-hidden="true">
        <span />
        <span className="viz-dot-track">
          {ticks.map((v) => (
            <span key={v} className="viz-tick" style={{ left: x(v) }}>
              {format(v)}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

// 100% stacked bars: each row is split into the given series.
export function StackedBars({ data, series, tip }) {
  const t = useTip()
  return (
    <div className="viz-stack">
      {data.map((d) => {
        const total = series.reduce((sum, s) => sum + d[s.key], 0)
        return (
          <div className="viz-bar-row" key={d.label}>
            <span className="viz-bar-label">
              {d.label}
              {d.caption && <small>{d.caption}</small>}
            </span>
            <span className="viz-stack-track">
              {series.map((s) => {
                const share = (d[s.key] / total) * 100
                if (!share) return null
                return (
                  <span
                    key={s.key}
                    className="viz-seg"
                    style={{
                      flexBasis: `${share}%`,
                      background: s.color,
                      color: s.ink
                    }}
                    onPointerMove={
                      tip ? (e) => t.show(e, tip(d, s, share)) : undefined
                    }
                    onPointerLeave={tip ? t.hide : undefined}
                  >
                    <span
                      className={
                        share < 22
                          ? 'viz-seg-label viz-seg-small'
                          : 'viz-seg-label'
                      }
                    >
                      {share >= 12 ? pct(share) : ''}
                    </span>
                  </span>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function niceTicks(max, count = 4) {
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
}

// Time series on one y-axis. The pointer snaps to the nearest month and the
// tooltip lists every series at that point.
export function LineChart({
  labels,
  series,
  height = 220,
  yMax,
  yFormat = (v) => v,
  xTicks,
  xFormat = (l) => l,
  bands = [],
  markers = []
}) {
  const t = useTip()
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)

  const pad = { top: 12, right: 12, bottom: 24, left: 44 }
  const w = width - pad.left - pad.right
  const h = height - pad.top - pad.bottom
  const top =
    yMax ??
    Math.max(...series.flatMap((s) => s.values.filter((v) => v != null)))
  const ticks = niceTicks(top)
  const yTop = ticks[ticks.length - 1] >= top ? ticks[ticks.length - 1] : top
  const x = (i) => pad.left + (i / (labels.length - 1)) * w
  const y = (v) => pad.top + h - (v / yTop) * h

  const path = (values) =>
    values
      .map((v, i) =>
        v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`
      )
      .reduce((d, p, i, all) => {
        if (!p) return d
        return d + (i === 0 || !all[i - 1] ? `M${p}` : `L${p}`)
      }, '')

  function onMove(event) {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    const i = Math.max(
      0,
      Math.min(
        labels.length - 1,
        Math.round(((px - pad.left) / w) * (labels.length - 1))
      )
    )
    setHover(i)
    const yAnchor = Math.min(
      ...series.map((s) => (s.values[i] == null ? height : y(s.values[i])))
    )
    const svgBox = ref.current.getBoundingClientRect()
    const figBox = ref.current.closest('figure').getBoundingClientRect()
    t.show(
      event,
      {
        title: xFormat(labels[i], true),
        rows: series
          .filter((s) => s.values[i] != null)
          .map((s) => ({
            label: s.label,
            value: yFormat(s.values[i], true),
            color: s.color
          }))
      },
      {
        x: svgBox.left - figBox.left + x(i),
        y: svgBox.top - figBox.top + yAnchor
      }
    )
  }

  return (
    <div ref={ref} className="viz-svg">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={series.map((s) => s.label).join(', ')}
        onPointerMove={onMove}
        onPointerLeave={() => {
          setHover(null)
          t.hide()
        }}
      >
        {bands.map((b) => (
          <g key={b.label}>
            <rect
              x={x(b.from)}
              y={pad.top}
              width={x(b.to) - x(b.from)}
              height={h}
              className="viz-band"
            />
            <text
              x={x(b.from) + 6}
              y={pad.top + h - 8}
              className="viz-band-label"
            >
              {b.label}
            </text>
          </g>
        ))}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={pad.left + w}
              y1={y(v)}
              y2={y(v)}
              className={v ? 'viz-gridline' : 'viz-baseline'}
            />
            <text
              x={pad.left - 8}
              y={y(v)}
              dy="0.32em"
              textAnchor="end"
              className="viz-axis-text"
            >
              {yFormat(v)}
            </text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 6}
            textAnchor="middle"
            className="viz-axis-text"
          >
            {xFormat(labels[i])}
          </text>
        ))}
        {series.map((s) => (
          <path
            key={s.label}
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {markers.map((m) => (
          <g key={m.label}>
            <circle
              cx={x(m.index)}
              cy={y(series[0].values[m.index])}
              r={4}
              fill={series[0].color}
              className="viz-ring"
            />
            <text
              x={x(m.index) + (m.dx ?? 0)}
              y={y(series[0].values[m.index]) + (m.dy ?? -12)}
              textAnchor={m.anchor ?? 'middle'}
              className="viz-annotation"
            >
              {m.label}
            </text>
          </g>
        ))}
        {hover != null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.top}
              y2={pad.top + h}
              className="viz-crosshair"
            />
            {series.map((s) =>
              s.values[hover] == null ? null : (
                <circle
                  key={s.label}
                  cx={x(hover)}
                  cy={y(s.values[hover])}
                  r={4}
                  fill={s.color}
                  className="viz-ring"
                />
              )
            )}
          </g>
        )}
      </svg>
    </div>
  )
}

// Scatter plot with a log or linear x-axis. Hovering finds the nearest point,
// so small dots don't need to be hit exactly.
export function ScatterPlot({
  points,
  height = 300,
  xLog = false,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xFormat = (v) => v,
  yFormat = (v) => v,
  xLabel,
  yLabel,
  reference,
  tip
}) {
  const t = useTip()
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)

  const pad = { top: 16, right: 16, bottom: 40, left: 44 }
  const w = width - pad.left - pad.right
  const h = height - pad.top - pad.bottom
  const sx = xLog ? Math.log10 : (v) => v
  const x = (v) =>
    pad.left +
    ((sx(v) - sx(xDomain[0])) / (sx(xDomain[1]) - sx(xDomain[0]))) * w
  const y = (v) =>
    pad.top + h - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * h

  function onMove(event) {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    const py = event.clientY - box.top
    let best = null
    let bestDist = 28 ** 2
    points.forEach((p, i) => {
      const d = (x(p.x) - px) ** 2 + (y(p.y) - py) ** 2
      if (d < bestDist) {
        best = i
        bestDist = d
      }
    })
    setHover(best)
    if (best == null) return t.hide()
    const p = points[best]
    const figBox = ref.current.closest('figure').getBoundingClientRect()
    t.show(event, tip(p), {
      x: box.left - figBox.left + x(p.x),
      y: box.top - figBox.top + y(p.y)
    })
  }

  const ordered = [...points].sort(
    (a, b) => Number(!!a.highlight) - Number(!!b.highlight)
  )

  return (
    <div ref={ref} className="viz-svg">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${yLabel} by ${xLabel}`}
        onPointerMove={onMove}
        onPointerLeave={() => {
          setHover(null)
          t.hide()
        }}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={pad.left + w}
              y1={y(v)}
              y2={y(v)}
              className={v === yDomain[0] ? 'viz-baseline' : 'viz-gridline'}
            />
            <text
              x={pad.left - 8}
              y={y(v)}
              dy="0.32em"
              textAnchor="end"
              className="viz-axis-text"
            >
              {yFormat(v)}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text
            key={v}
            x={x(v)}
            y={pad.top + h + 16}
            textAnchor="middle"
            className="viz-axis-text"
          >
            {xFormat(v)}
          </text>
        ))}
        <text
          x={pad.left + w}
          y={height - 4}
          textAnchor="end"
          className="viz-axis-title"
        >
          {xLabel} →
        </text>
        {reference && (
          <g>
            <line
              x1={pad.left}
              x2={pad.left + w}
              y1={y(reference.value)}
              y2={y(reference.value)}
              className="viz-refline"
            />
            <text
              x={pad.left + 4}
              y={y(reference.value) + 14}
              className="viz-annotation"
            >
              {reference.label}
            </text>
          </g>
        )}
        {ordered.map((p) => (
          <circle
            key={p.label}
            cx={x(p.x)}
            cy={y(p.y)}
            r={p.highlight ? 5 : 4}
            fill={p.highlight ? 'var(--viz-accent)' : 'var(--viz-gray)'}
            className="viz-ring"
          />
        ))}
        {points
          .filter((p) => p.tag && width >= (p.tagMinWidth ?? 0))
          .map((p) => {
            const [dx, dy, anchor] = {
              right: [8, 4, 'start'],
              left: [-8, 4, 'end'],
              above: [0, -10, 'middle'],
              below: [0, 16, 'middle']
            }[p.tagPosition ?? 'right']
            return (
              <text
                key={p.label}
                x={x(p.x) + dx}
                y={y(p.y) + dy}
                textAnchor={anchor}
                className={
                  p.highlight
                    ? 'viz-point-label viz-point-label-strong'
                    : 'viz-point-label'
                }
              >
                {p.tag}
              </text>
            )
          })}
        {hover != null && (
          <circle
            cx={x(points[hover].x)}
            cy={y(points[hover].y)}
            r={7}
            fill="none"
            className="viz-hover-ring"
          />
        )}
      </svg>
    </div>
  )
}

// U.S. tile map: one equal-sized square per state (and D.C.), so small
// states are as visible as large ones.
const TILES = {
  AK: [0, 0],
  ME: [11, 0],
  WI: [6, 1],
  VT: [10, 1],
  NH: [11, 1],
  WA: [1, 2],
  ID: [2, 2],
  MT: [3, 2],
  ND: [4, 2],
  MN: [5, 2],
  IL: [6, 2],
  MI: [7, 2],
  NY: [9, 2],
  MA: [10, 2],
  OR: [1, 3],
  NV: [2, 3],
  WY: [3, 3],
  SD: [4, 3],
  IA: [5, 3],
  IN: [6, 3],
  OH: [7, 3],
  PA: [8, 3],
  NJ: [9, 3],
  CT: [10, 3],
  RI: [11, 3],
  CA: [1, 4],
  UT: [2, 4],
  CO: [3, 4],
  NE: [4, 4],
  MO: [5, 4],
  KY: [6, 4],
  WV: [7, 4],
  VA: [8, 4],
  MD: [9, 4],
  DE: [10, 4],
  AZ: [2, 5],
  NM: [3, 5],
  KS: [4, 5],
  AR: [5, 5],
  TN: [6, 5],
  NC: [7, 5],
  SC: [8, 5],
  DC: [9, 5],
  OK: [4, 6],
  LA: [5, 6],
  MS: [6, 6],
  AL: [7, 6],
  GA: [8, 6],
  HI: [1, 7],
  TX: [4, 7],
  FL: [9, 7]
}

export function TileMap({ data, bins, tip }) {
  const t = useTip()
  const binOf = (v) => bins.findIndex((b) => v < b.below)
  return (
    <>
      <div className="viz-tiles">
        {data.map((d) => {
          const [col, row] = TILES[d.code]
          const bin = binOf(d.value)
          return (
            <span
              key={d.code}
              className={`viz-tile viz-seq-${bin}`}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
              onPointerMove={(e) => t.show(e, tip(d))}
              onPointerLeave={t.hide}
            >
              {d.code}
            </span>
          )
        })}
      </div>
      <ul className="viz-legend viz-legend-seq">
        {bins.map((b, i) => (
          <li key={b.label}>
            <span className={`viz-swatch viz-seq-${i}`} />
            {b.label}
          </li>
        ))}
      </ul>
    </>
  )
}
