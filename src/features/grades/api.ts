import type { SubjectSlug } from '@/design/subjectPalette'
import { supabase } from '@/lib/supabase'
import type { GradeInput } from '@/sources'
import type { Database } from '@/types/database'

type Row = Database['public']['Tables']['grades']['Row']
/** numeric komt als string of number terug; hier altijd number. */
export type Grade = Omit<Row, 'grade' | 'weight'> & { grade: number; weight: number }

const toGrade = (r: Row): Grade => ({ ...r, grade: Number(r.grade), weight: Number(r.weight) })

export async function fetchGrades(subject?: SubjectSlug): Promise<Grade[]> {
  let q = supabase.from('grades').select('*').order('graded_on', { ascending: true, nullsFirst: false }).order('created_at')
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error) throw error
  return data.map(toGrade)
}

export type GradeDraft = Pick<Grade, 'subject' | 'description' | 'grade' | 'weight' | 'graded_on' | 'counts'>

export async function saveGrade(draft: GradeDraft, id?: string) {
  const { error } = id
    ? await supabase.from('grades').update(draft).eq('id', id)
    : await supabase.from('grades').insert({ ...draft, source: 'manual' })
  if (error) throw error
}

export async function deleteGrade(id: string) {
  const { error } = await supabase.from('grades').delete().eq('id', id)
  if (error) throw error
}

/**
 * Importeer cijfers; regels met een (source, external_id) die al bestaat worden
 * overgeslagen. Geeft het aantal nieuw opgeslagen cijfers terug.
 */
export async function importGrades(rows: GradeInput[]): Promise<number> {
  if (!rows.length) return 0
  const { data, error } = await supabase
    .from('grades')
    .upsert(rows, { onConflict: 'user_id,source,external_id', ignoreDuplicates: true })
    .select('id')
  if (error) throw error
  return data.length
}
