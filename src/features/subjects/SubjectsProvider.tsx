import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/app/AuthProvider'
import { isSubjectSlug, subjectsBySlug, type SubjectDef } from '@/config/subjects'
import type { SubjectSlug } from '@/design/subjectPalette'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database'
import { defaultBlocks, resolveBlocks, type BlockSetting } from './blockSettings'

export type ChosenSubject = { def: SubjectDef; position: number; blocks: BlockSetting[] }

type Ctx = {
  /** null = nog aan het laden. */
  chosen: ChosenSubject[] | null
  error: boolean
  reload: () => Promise<void>
  /** Sla de vakkeuze op: nieuwe vakken krijgen standaardblokken, weggevinkte verdwijnen. */
  saveSelection: (slugs: SubjectSlug[]) => Promise<string | null>
  saveBlocks: (slug: SubjectSlug, blocks: BlockSetting[]) => Promise<string | null>
}

const SubjectsCtx = createContext<Ctx | null>(null)

export function SubjectsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [chosen, setChosen] = useState<ChosenSubject[] | null>(null)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.from('user_subjects').select('subject, position, blocks').order('position')
    if (error) {
      setError(true)
      setChosen((c) => c ?? [])
      return
    }
    setError(false)
    setChosen(
      data
        .filter((r) => isSubjectSlug(r.subject))
        .map((r) => {
          const def = subjectsBySlug[r.subject as SubjectSlug]
          return { def, position: r.position, blocks: resolveBlocks(def, r.blocks) }
        }),
    )
  }, [userId])

  useEffect(() => {
    setChosen(null)
    void reload()
  }, [reload])

  const saveSelection = useCallback(
    async (slugs: SubjectSlug[]) => {
      const current = new Set((chosen ?? []).map((c) => c.def.slug))
      const wanted = new Set(slugs)
      const removed = [...current].filter((s) => !wanted.has(s))
      const added = slugs.filter((s) => !current.has(s))

      if (removed.length) {
        const { error } = await supabase.from('user_subjects').delete().in('subject', removed)
        if (error) return 'Opslaan is niet gelukt. Probeer het opnieuw.'
      }
      // Volgorde = volgorde van de vakkenlijst in de config.
      const rows = slugs.map((slug, i) => ({
        subject: slug,
        position: i,
        ...(added.includes(slug) ? { blocks: defaultBlocks(subjectsBySlug[slug]) as unknown as Json } : {}),
      }))
      for (const row of rows) {
        const { error } = current.has(row.subject)
          ? await supabase.from('user_subjects').update({ position: row.position }).eq('subject', row.subject)
          : await supabase.from('user_subjects').insert(row)
        if (error) return 'Opslaan is niet gelukt. Probeer het opnieuw.'
      }
      await reload()
      return null
    },
    [chosen, reload],
  )

  const saveBlocks = useCallback(async (slug: SubjectSlug, blocks: BlockSetting[]) => {
    const { error } = await supabase
      .from('user_subjects')
      .update({ blocks: blocks as unknown as Json })
      .eq('subject', slug)
    if (error) return 'Opslaan is niet gelukt. Controleer je verbinding.'
    setChosen((list) => list?.map((c) => (c.def.slug === slug ? { ...c, blocks } : c)) ?? list)
    return null
  }, [])

  const value = useMemo(() => ({ chosen, error, reload, saveSelection, saveBlocks }), [chosen, error, reload, saveSelection, saveBlocks])
  return <SubjectsCtx.Provider value={value}>{children}</SubjectsCtx.Provider>
}

export function useSubjects() {
  const ctx = useContext(SubjectsCtx)
  if (!ctx) throw new Error('useSubjects buiten SubjectsProvider')
  return ctx
}
