import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import type { Grade } from './api'
import { formatGrade, rollingAverages } from './calc'

// Elk cijfer als punt, het lopende gemiddelde als lijn, 5,5 als stippellijn.
// Kleuren komen uit de CSS-variabelen, dus licht/donker en het vak-accent werken vanzelf.
export function GradeChart({ grades }: { grades: Grade[] }) {
  const points = rollingAverages(grades).map((p, i) => ({
    i: i + 1,
    label: p.grade.description,
    date: p.grade.graded_on,
    grade: p.grade.grade,
    average: Math.round(p.average * 100) / 100,
  }))
  if (points.length < 2) return <p className="text-sm text-muted">De grafiek verschijnt vanaf twee meetellende cijfers.</p>

  return (
    <figure>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="i" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
            <YAxis domain={[1, 10]} ticks={[1, 4, 5.5, 7, 10]} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatGrade(v, v % 1 ? 1 : 0)} />
            <ReferenceLine y={5.5} stroke="var(--danger)" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }}
              labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string } | undefined)?.label ?? ''}
              formatter={(v, name) => [formatGrade(Number(v)), name === 'average' ? 'Gemiddelde' : 'Cijfer']}
            />
            <Line type="monotone" dataKey="average" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Scatter dataKey="grade" fill="var(--text)" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-sm text-muted">
        Punten: je cijfers in volgorde. Lijn: je gemiddelde na elk cijfer, nu {formatGrade(points.at(-1)!.average)}. Stippellijn: 5,5.
      </figcaption>
    </figure>
  )
}
