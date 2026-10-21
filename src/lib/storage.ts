import { supabase, MEDIA_BUCKET } from './supabase'

// Shrinks big photos before upload (keeps the free Supabase tier healthy). Keeps transparency by using WebP.
async function compress(file: File, maxDim = 1920, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/webp', quality))
  } catch {
    return file
  }
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await compress(file)
  const isWebp = blob !== file && blob.type === 'image/webp'
  const ext = isWebp ? 'webp' : (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { cacheControl: '31536000', upsert: false, contentType: isWebp ? 'image/webp' : file.type })
  if (error) throw error
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

// Call after deleting a row so orphaned files don't pile up. Safe to call with null/undefined.
export async function deleteImageByUrl(url?: string | null): Promise<void> {
  if (!url) return
  const marker = `/object/public/${MEDIA_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(url.slice(idx + marker.length))
  await supabase.storage.from(MEDIA_BUCKET).remove([path])
}
