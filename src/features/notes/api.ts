import type { SubjectSlug } from '@/design/subjectPalette'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database'
import type { NoteKind, NoteRow, SummaryContent, SummaryLength, WorkedContent } from './types'

export type NoteListItem = Pick<NoteRow, 'id' | 'kind' | 'title' | 'chapter' | 'created_at'>

/** Notities (zonder inhoud) van één vak, nieuwste eerst. */
export async function fetchNotes(subject: SubjectSlug): Promise<NoteListItem[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, kind, title, chapter, created_at')
    .eq('subject', subject)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchNote(id: string): Promise<NoteRow | null> {
  const { data, error } = await supabase.from('notes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createNote(note: {
  subject: SubjectSlug
  kind: NoteKind
  title: string
  chapter: string | null
  length: SummaryLength | null
  content: SummaryContent | WorkedContent
}): Promise<string> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ ...note, content: note.content as unknown as Json })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function updateNoteMeta(id: string, meta: { title: string; chapter: string | null }) {
  const { error } = await supabase.from('notes').update(meta).eq('id', id)
  if (error) throw error
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}
