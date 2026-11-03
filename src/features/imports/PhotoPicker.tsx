import { Camera, ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Alert, Button } from '@/components/ui'
import { compressImage } from '@/lib/images'

export type PickedPhoto = { id: string; blob: Blob; url: string }

type Props = { photos: PickedPhoto[]; onChange: (p: PickedPhoto[]) => void; max?: number }

// Camera-knop gebruikt `capture` (opent op mobiel direct de camera); de
// galerij-knop laat meerdere foto's tegelijk kiezen. De pagina ruimt de
// object-URL's op (het controlescherm gebruikt ze nog).
export function PhotoPicker({ photos, onChange, max = 6 }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    const room = max - photos.length
    const next: PickedPhoto[] = []
    let failed = 0
    for (const f of Array.from(files).slice(0, room)) {
      try {
        const blob = await compressImage(f)
        next.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) })
      } catch {
        failed++
      }
    }
    if (files.length > room) setError(`Maximaal ${max} foto's per keer.`)
    if (failed) setError(`${failed} ${failed === 1 ? 'foto kon' : "foto's konden"} niet worden gelezen. Probeer JPG of PNG.`)
    onChange([...photos, ...next])
    setBusy(false)
  }

  const remove = (id: string) => {
    const p = photos.find((x) => x.id === id)
    if (p) URL.revokeObjectURL(p.url)
    onChange(photos.filter((x) => x.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="accent" onClick={() => cameraRef.current?.click()} loading={busy} disabled={photos.length >= max}>
          <Camera className="size-4" aria-hidden="true" /> Foto maken
        </Button>
        <Button type="button" variant="outline" onClick={() => galleryRef.current?.click()} disabled={busy || photos.length >= max}>
          <ImagePlus className="size-4" aria-hidden="true" /> Uit galerij
        </Button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
      </div>
      {error && <Alert tone="warning">{error}</Alert>}
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Gekozen foto's">
          {photos.map((p, i) => (
            <li key={p.id} className="relative overflow-hidden rounded-xl border border-line bg-surface-2">
              <img src={p.url} alt={`Foto ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 text-xs text-on-ink">{i + 1}</span>
              <button type="button" onClick={() => remove(p.id)} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-ink/80 text-on-ink" aria-label={`Foto ${i + 1} verwijderen`}>
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
