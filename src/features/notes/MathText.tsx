import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'
import { cx } from '@/components/ui'
import { splitMath } from './splitMath'

// KaTeX escapet zelf alle invoer (trust staat uit), dus de HTML is veilig;
// gewone tekst gaat via React en wordt nooit als HTML gelezen.
function render(tex: string, display: boolean) {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' })
}

export function Formula({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => render(tex, display), [tex, display])
  return <span className={cx(display && 'block overflow-x-auto py-1', className)} dangerouslySetInnerHTML={{ __html: html }} />
}

/** Tekst met wiskunde tussen \( … \) of \[ … \]. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => splitMath(text), [text])
  return (
    <span className={className}>
      {parts.map((p, i) => (p.type === 'text' ? <span key={i}>{p.value}</span> : <Formula key={i} tex={p.value} display={p.display} />))}
    </span>
  )
}
