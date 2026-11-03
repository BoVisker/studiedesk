import { callFunction } from '@/lib/functions'

export type Video = { id: string; title: string; channel: string; thumb: string; published: string }
export type VideoResult = { videos: Video[]; fallback: string; source: string }

/** Zoek uitlegvideo's. Geeft altijd een fallback-zoeklink terug. */
export async function searchVideos(query: string) {
  return callFunction<VideoResult>('search-videos', { query })
}
