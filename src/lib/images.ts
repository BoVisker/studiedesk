// Foto's verkleinen in de browser vóór upload: sneller, goedkoper en minder
// data. 2000 px aan de lange kant houdt kleine boektekst leesbaar.
export const MAX_SIDE = 2000
export const JPEG_QUALITY = 0.85

export function targetSize(w: number, h: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(w, h))
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

export async function compressImage(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    // from-image: respecteer de EXIF-oriëntatie van telefoonfoto's.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('unsupported_image')
  }
  const { width, height } = targetSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('unsupported_image')
  ctx.fillStyle = '#fff' // transparante PNG's niet zwart laten worden
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('unsupported_image')
  return blob
}
