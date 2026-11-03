import type { SubjectSlug } from '@/design/subjectPalette'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type TestRow = Database['public']['Tables']['tests']['Row']
export type TestDraft = { subject: SubjectSlug; title: string; test_date: string; effort: number }

export async function fetchTests(subject?: SubjectSlug): Promise<TestRow[]> {
  let q = supabase.from('tests').select('*').order('test_date')
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function saveTest(draft: TestDraft, id?: string) {
  const { error } = id
    ? await supabase.from('tests').update(draft).eq('id', id)
    : await supabase.from('tests').insert({ ...draft, source: 'manual' })
  if (error) throw error
}

export async function deleteTest(id: string) {
  const { error } = await supabase.from('tests').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCheckoffs(): Promise<Set<string>> {
  const { data, error } = await supabase.from('plan_checkoffs').select('item_key')
  if (error) throw error
  return new Set(data.map((r) => r.item_key))
}

/** Een leermoment af- of aanvinken. */
export async function setCheckoff(itemKey: string, done: boolean) {
  if (done) {
    const { error } = await supabase.from('plan_checkoffs').upsert({ item_key: itemKey }, { onConflict: 'user_id,item_key', ignoreDuplicates: true })
    if (error) throw error
  } else {
    const { error } = await supabase.from('plan_checkoffs').delete().eq('item_key', itemKey)
    if (error) throw error
  }
}
