// Plak-import: "term<scheiding>betekenis" per regel. De scheiding wordt
// automatisch herkend (tab, =, streepje, puntkomma, komma) of kan worden gekozen.

export type Separator = 'tab' | 'is' | 'streep' | 'puntkomma' | 'komma'
export type ParsedRow = { term: string; definition: string }
export type ParseResult = { rows: ParsedRow[]; separator: Separator | null; skipped: string[] }

export const separatorLabels: Record<Separator, string> = {
  tab: 'Tab',
  is: 'Is-teken (=)',
  streep: 'Streepje (-)',
  puntkomma: 'Puntkomma (;)',
  komma: 'Komma (,)',
}

const patterns: Record<Separator, RegExp> = {
  tab: /\t+/,
  is: /\s*=\s*/,
  // Streepje met spaties eromheen, zodat "e-mail" of "Jean-Luc" heel blijft.
  streep: /\s+[-–—]\s+|\s*[–—]\s*/,
  puntkomma: /\s*;\s*/,
  komma: /\s*,\s*/,
}

const ORDER: Separator[] = ['tab', 'is', 'streep', 'puntkomma', 'komma']

function cleanLine(line: string) {
  return line
    .replace(/^\s*(?:[-•*·]|\d{1,3}[.)])\s+/, '') // opsommingstekens en nummering
    .trim()
}

function splitFirst(line: string, sep: Separator): ParsedRow | null {
  const m = patterns[sep].exec(line)
  if (!m || m.index === 0) return null
  const term = line.slice(0, m.index).trim()
  const definition = line.slice(m.index + m[0].length).trim()
  return term && definition ? { term, definition } : null
}

export function detectSeparator(lines: string[]): Separator | null {
  if (!lines.length) return null
  for (const sep of ORDER) {
    const hits = lines.filter((l) => splitFirst(l, sep)).length
    if (hits / lines.length >= 0.6) return sep
  }
  return null
}

export function parsePasted(text: string, forced?: Separator): ParseResult {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean)
  const separator = forced ?? detectSeparator(lines)
  if (!separator) return { rows: [], separator: null, skipped: lines }
  const rows: ParsedRow[] = []
  const skipped: string[] = []
  for (const l of lines) {
    const r = splitFirst(l, separator)
    if (r) rows.push(r)
    else skipped.push(l)
  }
  return { rows, separator, skipped }
}
