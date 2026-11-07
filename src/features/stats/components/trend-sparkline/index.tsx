import type { TrendLineValue } from "@/features/stats/compose-trend"
import type { TrendReading } from "@/features/stats/trend-math"

/**
 * The static signature move: the rolling mean as the orange line, raw readings as
 * hollow dot markers behind it, missing weeks left as gaps. No interactivity; the
 * accessible summary lives in the caller's copy.
 */
export type TrendSparklineProps = {
  readonly readings: readonly TrendReading[]
  readonly line: readonly TrendLineValue[]
  readonly ariaLabel: string
}

const VIEW_WIDTH = 320
const VIEW_HEIGHT = 132
const EDGE = 6
const ACCENT = "#f97316"

type ChartPoint = { readonly x: number; readonly y: number }

export function TrendSparkline({ readings, line, ariaLabel }: TrendSparklineProps) {
  const times = readings.map((reading) => reading.measuredAt.getTime())
  const weights = [
    ...readings.map((reading) => reading.weightKg),
    ...line.flatMap((value) => (value.valueKg === null ? [] : [value.valueKg])),
  ]

  if (times.length === 0 || weights.length === 0) {
    return <span className="sr-only">{ariaLabel}</span>
  }

  const minTime = Math.min(...times)
  const spanTime = Math.max(1, Math.max(...times) - minTime)
  const minWeight = Math.min(...weights)
  const spanWeight = Math.max(0.1, Math.max(...weights) - minWeight)

  const xOfTime = (time: number): number =>
    EDGE + ((time - minTime) / spanTime) * (VIEW_WIDTH - 2 * EDGE)

  const yOfWeight = (weightKg: number): number =>
    VIEW_HEIGHT - EDGE - ((weightKg - minWeight) / spanWeight) * (VIEW_HEIGHT - 2 * EDGE)

  const xOfLine = (value: TrendLineValue): number => xOfTime(Date.parse(`${value.dayKey}T00:00:00Z`))
  const pointOfLine = (value: TrendLineValue): ChartPoint =>
    value.valueKg === null
      ? { x: xOfLine(value), y: yOfWeight(minWeight) }
      : { x: xOfLine(value), y: yOfWeight(value.valueKg) }

  const format = (point: ChartPoint): string => `${point.x.toFixed(1)},${point.y.toFixed(1)}`

  const segments = collectRuns(line).map((run) => {
    const points = run.map(pointOfLine)
    const fillPath = [
      `M ${points[0].x.toFixed(1)} ${VIEW_HEIGHT}`,
      ...points.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
      `L ${points[points.length - 1].x.toFixed(1)} ${VIEW_HEIGHT}`,
      "Z",
    ].join(" ")

    return {
      key: run[0].dayKey,
      points: points.map(format).join(" "),
      fillPath,
    }
  })

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity=".24" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>

      {segments.map((segment) => (
        <path key={`fill-${segment.key}`} d={segment.fillPath} fill="url(#trend-fill)" stroke="none" />
      ))}

      {segments.map((segment) => (
        <polyline
          key={`line-${segment.key}`}
          points={segment.points}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {readings.map((reading) => (
        <circle
          key={reading.measuredAt.toISOString()}
          cx={xOfTime(reading.measuredAt.getTime()).toFixed(1)}
          cy={yOfWeight(reading.weightKg).toFixed(1)}
          r="3"
          fill="#fff"
          stroke={ACCENT}
          strokeWidth="2"
        />
      ))}
    </svg>
  )
}

/** Consecutive anchored windows; the gaps between runs are the drawn gaps. */
function collectRuns(
  line: readonly TrendLineValue[],
): ReadonlyArray<readonly [TrendLineValue, ...TrendLineValue[]]> {
  const runs: Array<readonly [TrendLineValue, ...TrendLineValue[]]> = []
  let run: TrendLineValue[] = []

  for (const value of line) {
    if (value.valueKg === null) {
      if (run.length >= 2) {
        runs.push(toRun(run))
      }
      run = []
      continue
    }

    run.push(value)
  }

  if (run.length >= 2) {
    runs.push(toRun(run))
  }

  return runs
}

function toRun(run: TrendLineValue[]): readonly [TrendLineValue, ...TrendLineValue[]] {
  return [run[0], ...run.slice(1)]
}
