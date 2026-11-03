// Splitst tekst in gewone tekst en wiskunde. Alleen \( … \) en \[ … \] tellen
// als wiskunde, zodat bedragen als "$5" gewoon tekst blijven.

export type Segment = { type: 'text'; value: string } | { type: 'math'; value: string; display: boolean }

const DELIMS = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g

export function splitMath(input: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of input.matchAll(DELIMS)) {
    if (m.index > last) out.push({ type: 'text', value: input.slice(last, m.index) })
    const display = m[2] !== undefined
    out.push({ type: 'math', value: (display ? m[2] : m[1]).trim(), display })
    last = m.index + m[0].length
  }
  if (last < input.length) out.push({ type: 'text', value: input.slice(last) })
  return out
}
