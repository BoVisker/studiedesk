import { ExternalLink, Play, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, cx, Spinner } from '@/components/ui'
import { subjectsBySlug } from '@/config/subjects'
import type { SubjectSlug } from '@/design/subjectPalette'
import { aiErrorMessage } from '@/lib/functions'
import { useOnline } from '@/lib/useOnline'
import { searchVideos, type Video } from './api'

/**
 * Zoek uitlegvideo's bij een vak. We tonen alleen zoekresultaten; een video
 * speelt pas als je er zelf op klikt (geen autoplay) en wordt ingesloten via
 * youtube-nocookie, zodat YouTube je niet volgt tot je echt speelt.
 */
export function VideoSearch({ subject }: { subject: SubjectSlug }) {
  const online = useOnline()
  const [topic, setTopic] = useState('')
  const [state, setState] = useState<'leeg' | 'bezig' | 'klaar' | 'fout'>('leeg')
  const [videos, setVideos] = useState<Video[]>([])
  const [fallback, setFallback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<Video | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setState('bezig')
    setError(null)
    const query = `${subjectsBySlug[subject].name} ${topic.trim()} uitleg`
    const res = await searchVideos(query)
    if (res.error !== null) {
      setState('fout')
      return setError(aiErrorMessage(res.error))
    }
    setVideos(res.data.videos)
    setFallback(res.data.fallback)
    setState('klaar')
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor={`video-${subject}`}>Onderwerp</label>
        <input
          id={`video-${subject}`}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Onderwerp, bijv. celdeling"
          maxLength={80}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
        />
        <Button type="submit" variant="accent" size="sm" loading={state === 'bezig'} disabled={!online || !topic.trim()}>
          <Search className="size-4" aria-hidden="true" /> Zoek
        </Button>
      </form>

      {!online && <p className="text-sm text-muted">Video's zoeken kan alleen met internet.</p>}
      {error && <Alert tone="error">{error}</Alert>}

      {state === 'bezig' && <div className="grid place-items-center py-6"><Spinner label="Zoeken…" /></div>}

      {state === 'klaar' && (
        <>
          {videos.length === 0 ? (
            <p className="text-sm text-muted">Geen video's gevonden. Zoek zelf verder op YouTube.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {videos.map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => setPlaying(v)} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-surface-2">
                    <span className="relative shrink-0">
                      {v.thumb ? (
                        <img src={v.thumb} alt="" loading="lazy" className="h-14 w-24 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-14 w-24 place-items-center rounded-lg bg-surface-2"><Play className="size-5 text-muted" aria-hidden="true" /></span>
                      )}
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="grid size-8 place-items-center rounded-full bg-ink/70 text-on-ink"><Play className="size-4" aria-hidden="true" /></span>
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium">{v.title}</span>
                      <span className="text-xs text-muted">{v.channel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fallback && (
            <a href={fallback} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
              <ExternalLink className="size-4" aria-hidden="true" /> Zoek verder op YouTube
            </a>
          )}
        </>
      )}

      {playing && <Player video={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}

function Player({ video, onClose }: { video: Video; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={video.title} className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" onClick={onClose}>
      <div className={cx('w-full max-w-2xl rounded-2xl bg-surface p-3 shadow-paper')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-medium">{video.title}</p>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Sluiten">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          {/* youtube-nocookie + geen autoplay: speelt pas na klik op de knop in de speler. */}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
            title={video.title}
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted">
          <span>{video.channel}</span>
          <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
            <ExternalLink className="size-4" aria-hidden="true" /> Op YouTube
          </a>
        </div>
      </div>
    </div>
  )
}
