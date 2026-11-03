import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type ImageBlock = {
  type: 'image'
  source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }
}

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Paden moeten in de eigen tmp-map liggen; voorkomt dat iemand andermans pad meestuurt. */
export function validPaths(paths: unknown, userId: string, max = 6): paths is string[] {
  return (
    Array.isArray(paths) &&
    paths.length >= 1 &&
    paths.length <= max &&
    paths.every((p) => typeof p === 'string' && p.startsWith(`${userId}/tmp/`) && !p.includes('..'))
  )
}

/** Download via de user-client (RLS geldt) en zet om naar image-blocks. */
export async function loadImages(client: SupabaseClient, paths: string[]): Promise<ImageBlock[]> {
  const blocks: ImageBlock[] = []
  for (const p of paths) {
    const { data, error } = await client.storage.from('source-images').download(p)
    if (error || !data) throw new Error('image_not_found')
    const type = data.type || 'image/jpeg'
    if (!TYPES.has(type)) throw new Error('image_type')
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: type as ImageBlock['source']['media_type'], data: encodeBase64(new Uint8Array(await data.arrayBuffer())) },
    })
  }
  return blocks
}
